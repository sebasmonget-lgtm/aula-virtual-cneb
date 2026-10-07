import { randomUUID } from "node:crypto";
import { generateDirectWorkshop, validateWorkshopDay } from "../src/lib/workshop-master-service.mjs";
import { versionTransaction, assertRevision, expectedRevision, publicErrorMessage, httpStatusForError, VersionConflictError } from "../src/lib/version-integrity.mjs";
import { assertActivityScheduleMutable, lockClassroomSchedule, limaToday } from "../src/lib/activity-schedule-integrity.mjs";

export async function handleDirectWorkshop({ request, url, response, origin, db, annualPlanningContext, readJson, send, pending, generate = generateDirectWorkshop, today = limaToday() }) {
  const match = /^\/api\/activities\/([0-9a-f-]{36})\/workshop\/(generate|confirm)$/i.exec(url.pathname);
  if (!match || request.method !== "POST") return false;
  try {
    const [, id, action] = match, body = await readJson(request), context = await annualPlanningContext();
    const main = context && (await db.query(`select a.*,e.classroom_id,e.starts_on as project_starts_on,e.ends_on as project_ends_on,e.details as project_details from activities a
      join learning_experiences e on e.id=a.experience_id where a.id=$1 and e.classroom_id=$2
      and e.status='active' and e.type in ('project','unit') and a.status='active'`, [id, context.id])).rows[0];
    if (!main || main.project_details?.experience_contract !== 1) throw new Error("Abre una actividad confirmada del recorrido nuevo.");
    assertRevision(main, expectedRevision(body.expectedRevision));
    const date = main.occurs_on instanceof Date ? main.occurs_on.toISOString().slice(0, 10) : String(main.occurs_on).slice(0, 10);
    await assertActivityScheduleMutable(db, { ...main, occurs_on: date }, today);
    if (action === "generate") {
      if (typeof body.preference !== "string" || body.preference.length > 1000) throw new Error("Escribe una preferencia breve o déjala vacía.");
      const existing = (await db.query(`select id from activities where linked_main_activity_id=$1 and status in ('draft','active')`, [id])).rows[0];
      if (existing) throw new Error("Este día ya tiene un taller. Puedes consultar el taller guardado.");
      const names = (await db.query(`select first_name,last_name,preferred_name from students where classroom_id=$1`, [context.id])).rows.flatMap(row => [row.first_name,row.last_name,row.preferred_name]).filter(Boolean);
      const result = await generate({ age: context.age, activity: main, materials: main.preparation?.materials ?? [], preference: body.preference, names });
      const generationId = randomUUID();
      await pending.set(generationId, { workflow: "direct_workshop", classroom_id: context.id, activity_id: id, revision: main.revision, proposal: result.proposal, metadata: result.metadata });
      send(response, 200, { ...result, generation_id: generationId }, origin); return true;
    }
    const generation = await pending.get(body.generationId);
    if (!generation || generation.workflow !== "direct_workshop" || generation.classroom_id !== context.id || generation.activity_id !== id)
      throw new Error("La propuesta no corresponde a este día.");
    if (Number(generation.revision) !== Number(main.revision)) throw new VersionConflictError("La actividad cambió. Revisa el taller otra vez.");
    const proposal = body.proposal;
    validateWorkshopDay(proposal, { competency_id: main.details.competency_id, workshop_type: generation.proposal.workshop_type, sheet_id: null });
    const workshopId = await versionTransaction(db, `daily-pair:${main.experience_id}:${date}`, async tx => {
      await lockClassroomSchedule(tx, context.id);
      const locked = (await tx.query(`select * from activities where id=$1 and status='active' for update`, [id])).rows[0];
      if (!locked) throw new VersionConflictError("La actividad ya no está disponible.");
      assertRevision(locked, expectedRevision(body.expectedRevision));
      await assertActivityScheduleMutable(tx, { ...locked, occurs_on: date }, today);
      if ((await tx.query(`select id from activities where linked_main_activity_id=$1 and status in ('draft','active')`, [id])).rows.length)
        throw new VersionConflictError("Este día ya tiene un taller guardado.");
      let collection = (await tx.query(`select * from learning_experiences where parent_project_id=$1 and type='workshop' and status='active' for update`, [main.experience_id])).rows[0];
      if (collection && collection.details?.schema !== "direct-workshops-v1") throw new Error("Este proyecto conserva talleres históricos. Consúltalos antes de añadir otro.");
      if (!collection) {
        collection = { id: randomUUID(), details: { schema: "direct-workshops-v1", items: [] } };
        await tx.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,parent_project_id)
          values($1,$2,'workshop','Talleres solicitados','Recursos opcionales de cada día',$3::date,$4::date,'active',$5::jsonb,$6)`,
          [collection.id,context.id,main.project_starts_on,main.project_ends_on,JSON.stringify(collection.details),main.experience_id]);
      }
      // The container stays immutable. Each requested day lives in its own confirmed activity.
      const index = Number((await tx.query(`select coalesce(max(workshop_item_index),0)+1 as next from activities where experience_id=$1`,[collection.id])).rows[0].next), workshopId = randomUUID();
      await tx.query(`insert into activities(id,experience_id,occurs_on,planned_date,title,purpose,sequence,preparation,adaptations,status,details,generation_metadata,linked_main_activity_id,workshop_item_index,teacher_confirmed_at)
        values($1,$2,$3::date,$3::date,$4,$5,'[]'::jsonb,$6::jsonb,'[]'::jsonb,'active',$7::jsonb,$8::jsonb,$9,$10,now())`,
        [workshopId,collection.id,date,proposal.title,proposal.purpose,JSON.stringify({materials:proposal.materials}),JSON.stringify(proposal),JSON.stringify(generation.metadata),id,index]);
      await tx.query(`insert into activity_criteria(id,activity_id,competency_v4_id,criterion_text,details,status,teacher_confirmed_at)
        values($1,$2,$3,$4,$5::jsonb,'active',now())`, [randomUUID(),workshopId,proposal.competency_id,proposal.criterion_or_observation_focus,
          JSON.stringify({competency_id:proposal.competency_id,criterion_text:proposal.criterion_or_observation_focus,expected_evidence:proposal.evidence_expected,observation_focus:[proposal.criterion_or_observation_focus]} )]);
      return workshopId;
    });
    await pending.delete(body.generationId); send(response, 200, { id: workshopId, confirmed: true }, origin);
  } catch (error) { send(response, httpStatusForError(error, 422), { error: publicErrorMessage(error) }, origin); }
  return true;
}
