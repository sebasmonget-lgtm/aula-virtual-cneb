import { randomUUID } from "node:crypto";
import { ageFilteredAnnualCurriculum } from "../src/lib/annual-preplan-service.mjs";
import { availableSheets, publicSheet, renderSheetPages, selectWorkshopSheet } from "../src/lib/workshop-sheet-catalog.mjs";
import { attachWorkshopSheetsWithJev, suggestWorkshopSheet } from "../src/lib/jev-workshop-sheet.mjs";
import { jevFeatureEnabled } from "../src/lib/jev-openrouter-decision.mjs";
import { confirmWorkshopMaster, generateWorkshopMaster, newWorkshopMasterDetails, validateWorkshopMaster } from "../src/lib/workshop-master-service.mjs";
import { VersionConflictError, httpStatusForError, publicErrorMessage, versionTransaction } from "../src/lib/version-integrity.mjs";

const publicMaster = (row) => row && ({ id: row.id, project_id: row.parent_project_id, status: row.status,
  revision: Number(row.revision), version: Number(row.version), details: row.details });

export function createWorkshopRouteHandler({ db, teacherId, readJson, send }) {
  async function ownedProject(id) {
    return (await db.query(`select p.*,c.section,c.context as classroom_context,c.castellano_l2_applicable,
      c.religion_applicable,ag.age_years as age,
      sy.owner_id,ap.proposal as annual_proposal from learning_experiences p
      join classrooms c on c.id=p.classroom_id join school_years sy on sy.id=c.school_year_id
      join age_grades ag on ag.id=c.age_grade_id left join annual_plans ap on ap.id=p.annual_plan_id
      where p.id=$1 and p.type in ('project','unit') and c.teacher_id=$2 and sy.owner_id=$2`, [id, teacherId])).rows[0] ?? null;
  }
  const currentMaster = async (projectId) => (await db.query(`select * from learning_experiences
    where parent_project_id=$1 and type='workshop' and status in ('draft','active')
    order by case status when 'draft' then 0 else 1 end,version desc limit 1`, [projectId])).rows[0] ?? null;
  return async function handle({ request, url, response, origin }) {
    if (!url.pathname.startsWith("/api/workshops/")) return false;
    const body = request.method === "GET" ? null : await readJson(request);
    const projectId = body?.projectId ?? url.searchParams.get("projectId");
    const project = await ownedProject(projectId);
    if (!project) { send(response, 404, { error: "Proyecto no disponible para esta aula." }, origin); return true; }
    try {
      const classroom = { id: project.classroom_id, age: Number(project.age), section: project.section,
        group_context: typeof project.classroom_context === "string" ? project.classroom_context : project.classroom_context?.group_context,
        diagnostic_summary: project.details?.diagnostic_summary,
        castellano_l2_applicable: project.castellano_l2_applicable, religion_applicable: project.religion_applicable };
      const cards = await ageFilteredAnnualCurriculum(classroom);
      if (request.method === "GET" && url.pathname === "/api/workshops/master") {
        send(response, 200, { project_id: project.id, master: publicMaster(await currentMaster(project.id)),
          route: (project.details.activity_route ?? []).map((item, index) => ({ index: index + 1,
            title: item.title, date: item.planned_date ?? item.date })),
          competencies: cards.map((card) => ({ id: card.id, name: card.official_name ?? card.name })) }, origin);
        return true;
      }
      if (request.method === "GET" && url.pathname === "/api/workshops/sheets") {
        const id = url.searchParams.get("competencyId");
        if (!cards.some((card) => card.id === id)) throw new Error("La competencia no corresponde a la edad del aula.");
        send(response, 200, { sheets: (await availableSheets({ age: classroom.age, competencyId: id })).map(publicSheet) }, origin);
        return true;
      }
      if (request.method === "GET" && url.pathname === "/api/workshops/sheets/preview") {
        const id = url.searchParams.get("competencyId"), sheetId = url.searchParams.get("sheetId");
        if (!cards.some((card) => card.id === id)) throw new Error("Competencia no disponible.");
        const sheet = (await availableSheets({ age: classroom.age, competencyId: id })).find((item) => item.id === sheetId);
        if (!sheet) { send(response, 404, { error: "Ficha no disponible." }, origin); return true; }
        const [image] = await renderSheetPages(sheet, { firstOnly: true });
        response.writeHead(200, { "content-type": "image/png", "cache-control": "private, max-age=3600",
          "x-content-type-options": "nosniff", ...(origin ? { "access-control-allow-origin": origin } : {}) });
        response.end(image); return true;
      }
      if (request.method === "POST" && url.pathname === "/api/workshops/master/generate") {
        if (project.details?.experience_contract === 1) throw new Error("Añade un taller desde la actividad del día que elijas.");
        if (project.status !== "active") throw new Error("Confirma primero el proyecto.");
        if (!["project-master-v1", "project-master-v2"].includes(project.details.flow_version))
          throw new Error("Este proyecto requiere un mapa de actividades confirmado.");
        const existing = await currentMaster(project.id);
        if (existing?.status === "draft") throw new VersionConflictError("Ya hay un borrador de talleres. Revísalo antes de generar otro.");
        const useJev = jevFeatureEnabled("workshop_sheet");
        if (useJev) classroom.jev_known_names = (await db.query(`select first_name,last_name,preferred_name
          from students where classroom_id=$1`, [classroom.id])).rows
          .flatMap((item) => [item.first_name,item.last_name,item.preferred_name]).filter(Boolean);
        const generated = await generateWorkshopMaster({ classroom, project, annualPlan: { proposal: project.annual_proposal }, cards,
          attachSheets: useJev ? attachWorkshopSheetsWithJev : undefined });
        const id = randomUUID();
        const saved = await versionTransaction(db, `workshop-master:${project.id}`, async (tx) => {
          const competing = (await tx.query(`select id from learning_experiences where parent_project_id=$1 and type='workshop' and status='draft'`, [project.id])).rows[0];
          if (competing) throw new VersionConflictError("Otro borrador de talleres ya está disponible.");
          return (await tx.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,
            status,details,parent_project_id,version,lineage_id,supersedes_experience_id,generation_metadata)
            values($1,$2,'workshop',$3,$4,$5,$6,'draft',$7::jsonb,$8,$9,$10,$11,$12::jsonb)
            returning *`, [id, project.classroom_id, `Talleres de ${project.title}`, project.purpose,
            project.starts_on, project.ends_on, JSON.stringify(newWorkshopMasterDetails(generated.proposal.items)), project.id,
            existing ? Number(existing.version) + 1 : 1, existing?.lineage_id ?? id, existing?.id ?? null,
            JSON.stringify(generated.metadata)])).rows[0];
        });
        send(response, 201, { master: publicMaster(saved) }, origin); return true;
      }
      if (request.method === "POST" && url.pathname === "/api/workshops/master/suggest-sheet") {
        const master = await currentMaster(project.id);
        if (!master || master.status !== "draft" || master.id !== body.masterId)
          throw new VersionConflictError("Abre el borrador de talleres para revisar la ficha.");
        if (Number(body.expectedRevision) !== Number(master.revision))
          throw new VersionConflictError("El borrador de talleres cambió. Vuelve a abrirlo.");
        const item = master.details?.items?.find((entry) => entry.index === Number(body.itemIndex));
        if (!item || !cards.some((card) => card.id === item.competency_id))
          throw new Error("El taller no tiene una competencia aplicable.");
        const names = (await db.query(`select first_name,last_name,preferred_name from students where classroom_id=$1`,
          [classroom.id])).rows.flatMap((entry) =>
          [entry.first_name,entry.last_name,entry.preferred_name]).filter(Boolean);
        const route = project.details.activity_route ?? [];
        const intention = [item.purpose, item.observation_focus, item.brief_outline,
          route[item.index - 1]?.title].filter(Boolean).join(" ");
        let suggested;
        if (jevFeatureEnabled("workshop_sheet")) {
          try { suggested = await suggestWorkshopSheet({ age: classroom.age, competencyId: item.competency_id,
            intention, topic: project.title, knownNames: names }); }
          catch { suggested = null; }
        }
        if (!suggested) {
          const sheet = await selectWorkshopSheet({ age: classroom.age, competencyId: item.competency_id,
            intention, topic: project.title });
          suggested = { sheet, reason: sheet ? "catalog_match" : "no_eligible_sheets" };
        }
        send(response, 200, { sheet: suggested.sheet ? publicSheet(suggested.sheet) : null,
          reason: suggested.reason }, origin); return true;
      }
      if (request.method === "PUT" && url.pathname === "/api/workshops/master") {
        const current = await currentMaster(project.id);
        if (!current || current.id !== body.masterId || current.status !== "draft") throw new VersionConflictError("El borrador cambió.");
        const items = validateWorkshopMaster({ items: body.items }, project.details.activity_route ?? [], cards.map((card) => card.id)).items;
        for (const item of items) {
          const sheets = await availableSheets({ age: classroom.age, competencyId: item.competency_id });
          if (item.sheet_id !== null && !sheets.some((sheet) => sheet.id === item.sheet_id))
            throw new Error("La ficha no pertenece a la edad o competencia del taller.");
        }
        const updated = (await db.query(`update learning_experiences set details=$1::jsonb
          where id=$2 and status='draft' and revision=$3 returning *`, [JSON.stringify(newWorkshopMasterDetails(items)), current.id,
          Number(body.expectedRevision)])).rows[0];
        if (!updated) throw new VersionConflictError("El borrador cambió. Vuelve a abrirlo.");
        send(response, 200, { master: publicMaster(updated) }, origin); return true;
      }
      if (request.method === "POST" && url.pathname === "/api/workshops/master/confirm") {
        const saved = await confirmWorkshopMaster(db, { teacherId, projectId: project.id, masterId: body.masterId,
          expectedRevision: Number(body.expectedRevision), age: classroom.age, applicableIds: cards.map((card) => card.id) });
        send(response, 200, { master: saved }, origin); return true;
      }
      send(response, 404, { error: "Acción de talleres no disponible." }, origin); return true;
    } catch (error) {
      send(response, httpStatusForError(error, 422),
        { error: publicErrorMessage(error, "No se pudieron preparar los talleres.") }, origin);
      return true;
    }
  };
}
