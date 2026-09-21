import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, ".local", "pgdata");
const migrationsDir = path.join(root, "local-db", "migrations");
const assetsDir = path.join(root, ".local", "assets");
const port = Number(process.env.AYNI_LOCAL_DB_PORT ?? 8788);
const teacherId = "00000000-0000-4000-8000-000000000001";
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
const exportTables = [
  "profiles", "curriculum_versions", "levels", "age_grades", "curriculum_areas",
  "competencies", "performances", "school_years", "classrooms",
  "institution_assets", "institution_profiles", "students", "learning_experiences",
  "activities", "activity_criteria", "evidences", "competency_observation_guides",
  "document_templates", "document_versions", "diagnostic_sessions",
  "diagnostic_entries", "observation_references", "student_observations",
];

await mkdir(path.dirname(dataDir), { recursive: true });
await mkdir(assetsDir, { recursive: true });
const db = await PGlite.create(dataDir);
await migrate();

async function migrate() {
  await db.exec(`create table if not exists local_schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  )`);

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const applied = await db.query("select 1 from local_schema_migrations where version = $1", [file]);
    if (applied.rows.length) continue;
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await db.exec("begin");
    try {
      await db.exec(sql);
      await db.query("insert into local_schema_migrations(version) values ($1)", [file]);
      await db.exec("commit");
    } catch (error) {
      await db.exec("rollback");
      throw error;
    }
  }
}

function send(response, status, payload, origin) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
  if (origin && allowedOrigins.has(origin)) headers["access-control-allow-origin"] = origin;
  response.writeHead(status, headers);
  response.end(JSON.stringify(payload));
}

function sendAsset(response, status, body, mimeType, origin) {
  const headers = {
    "content-type": mimeType,
    "cache-control": "private, max-age=60",
    "x-content-type-options": "nosniff",
  };
  if (origin && allowedOrigins.has(origin)) headers["access-control-allow-origin"] = origin;
  response.writeHead(status, headers);
  response.end(body);
}

function cleanText(value, maximum = 200) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function safeHex(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value : fallback;
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 20_000) throw new Error("El contenido excede el límite permitido.");
  }
  return JSON.parse(body || "{}");
}

async function dashboard() {
  const activityResult = await db.query(`
    select a.id, a.title, a.purpose, a.occurs_on, e.title as experience_title,
           c.id as criterion_id, c.criterion_text,
           co.official_text as competency_text
      from activities a
      join learning_experiences e on e.id = a.experience_id
      join activity_criteria c on c.activity_id = a.id
      join competencies co on co.id = c.competency_id
     order by a.occurs_on desc, c.display_order asc
     limit 1
  `);
  const studentsResult = await db.query(`
    select id, coalesce(preferred_name, first_name) as name
      from students
     where status = 'active'
     order by coalesce(preferred_name, first_name)
  `);
  const metricsResult = await db.query(`
    select
      (select count(*)::int from students where status = 'active') as students_total,
      (select count(*)::int from evidences where observed_at >= now() - interval '7 days') as evidences_week,
      (select count(distinct student_id)::int from evidences) as students_observed
  `);
  const profileResult = await db.query(`
    select p.display_name as teacher_name, ip.display_name as institution_name,
           ip.institution_code, ip.district, ip.ugel, ip.director_name,
           ip.logo_asset_id, c.section, ag.label as age_label, ag.age_years,
           ia.original_path as logo_path, sy.year as school_year
      from profiles p
      join classrooms c on c.teacher_id = p.user_id
      join school_years sy on sy.id = c.school_year_id
      join age_grades ag on ag.id = c.age_grade_id
      left join institution_profiles ip on ip.owner_user_id = p.user_id
      left join institution_assets ia on ia.id = ip.logo_asset_id
     where p.user_id = $1
     limit 1
  `, [teacherId]);

  return {
    activity: activityResult.rows[0],
    students: studentsResult.rows,
    metrics: metricsResult.rows[0],
    profile: profileResult.rows[0] ? {
      ...profileResult.rows[0],
      logo_url: profileResult.rows[0].logo_asset_id
        ? `http://127.0.0.1:${port}/api/assets/${profileResult.rows[0].logo_asset_id}`
        : null,
    } : null,
  };
}

async function diagnosticWorkspace() {
  const classroomResult = await db.query(`
    select c.id, c.section, ag.age_years
      from classrooms c join age_grades ag on ag.id = c.age_grade_id
     where c.teacher_id = $1 and c.status = 'active' limit 1
  `, [teacherId]);
  const classroom = classroomResult.rows[0];
  const students = (await db.query(`
    select id, coalesce(preferred_name, first_name) as name
      from students where classroom_id = $1 and status = 'active'
     order by coalesce(preferred_name, first_name)
  `, [classroom.id])).rows;
  const guides = (await db.query(`
    select g.id, g.competency_id, g.short_meaning, g.suggested_contexts,
           g.observe_for, g.suggested_actions, g.caution_text,
           c.official_text as competency_text, ca.name as area_name
      from competency_observation_guides g
      join competencies c on c.id = g.competency_id
      join curriculum_areas ca on ca.id = c.area_id
     where g.age = $1 and g.is_active = true
     order by ca.name, c.official_text
  `, [classroom.age_years])).rows;
  const references = (await db.query(`
    select r.id, r.guide_id, r.short_observable_text, r.performance_ids,
           r.evidence_recommendation, r.sort_order, g.competency_id,
           bool_and(p.source_ref <> 'seed-local-no-oficial') as official_verified
      from observation_references r
      join competency_observation_guides g on g.id = r.guide_id
      join lateral jsonb_array_elements_text(r.performance_ids) pid on true
      join performances p on p.id = pid.value::uuid and p.competency_id = g.competency_id
     where r.is_active = true and r.reviewed_at is not null
       and g.is_active = true and g.age = $1 and p.age_grade_id = (
         select id from age_grades where age_years = $1 limit 1
       )
     group by r.id, g.competency_id
     having count(*) = jsonb_array_length(r.performance_ids)
     order by r.sort_order
  `, [classroom.age_years])).rows;
  const sessionResult = await db.query(`
    select id, title, status, started_at from diagnostic_sessions
     where classroom_id = $1 and status = 'active'
     order by started_at desc limit 1
  `, [classroom.id]);
  const session = sessionResult.rows[0] ?? null;
  const entries = session ? (await db.query(`
    select de.id, de.student_id, de.competency_id, de.observation_context,
           de.observation_text, de.teacher_interpretation,
           de.teacher_confirmed, de.status, de.updated_at
      from diagnostic_entries de where de.session_id = $1
  `, [session.id])).rows : [];
  const observations = session ? (await db.query(`
    select so.id, so.diagnostic_entry_id, so.reference_id, so.status,
           so.note, so.observed_at, de.student_id, de.competency_id
      from student_observations so
      join diagnostic_entries de on de.id = so.diagnostic_entry_id
     where de.session_id = $1
  `, [session.id])).rows : [];
  return { classroom, students, guides, references, session, entries, observations };
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

  if (origin && !allowedOrigins.has(origin)) {
    send(response, 403, { error: "Origen no permitido." });
    return;
  }
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": origin ?? "http://localhost:5173",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    response.end();
    return;
  }

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      send(response, 200, { ok: true, engine: "pglite", storage: ".local/pgdata" }, origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/dashboard") {
      send(response, 200, await dashboard(), origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/export") {
      if (origin) {
        send(response, 403, { error: "Exportación solo desde el equipo local." }, origin);
        return;
      }
      const tables = {};
      for (const table of exportTables) tables[table] = (await db.query(`select * from ${table}`)).rows;
      send(response, 200, { format: "ayni-supabase-transfer-v1", exportedAt: new Date().toISOString(), tables });
      return;
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/assets/")) {
      const assetId = url.pathname.split("/").at(-1);
      const assetResult = await db.query(`
        select original_path, mime_type from institution_assets
         where id = $1 and owner_user_id = $2 and type = 'logo'
      `, [assetId, teacherId]);
      if (!assetResult.rows.length) {
        send(response, 404, { error: "Logo no encontrado." }, origin);
        return;
      }
      const filePath = path.resolve(root, assetResult.rows[0].original_path);
      if (!filePath.startsWith(path.resolve(assetsDir) + path.sep)) {
        send(response, 403, { error: "Ruta de logo no permitida." }, origin);
        return;
      }
      sendAsset(response, 200, await readFile(filePath), assetResult.rows[0].mime_type, origin);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/profile") {
      const body = await readJson(request);
      const teacherName = cleanText(body.teacherName, 100);
      const institutionName = cleanText(body.institutionName, 200);
      const section = cleanText(body.section, 80);
      if (teacherName.length < 2 || institutionName.length < 2 || section.length < 1) {
        send(response, 400, { error: "Completa docente, institución y sección." }, origin);
        return;
      }
      const classroom = (await db.query("select id from classrooms where teacher_id = $1 and status = 'active' limit 1", [teacherId])).rows[0];
      const institution = (await db.query("select id, logo_asset_id from institution_profiles where owner_user_id = $1", [teacherId])).rows[0];
      let logoAssetId = institution?.logo_asset_id ?? null;
      if (body.createLogo) {
        const initials = cleanText(body.logoInitials, 3).toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ0-9]/g, "") || "AA";
        const primary = safeHex(body.logoPrimary, "#173d3a");
        const accent = safeHex(body.logoAccent, "#f6c85f");
        const assetId = randomUUID();
        const relativePath = `.local/assets/${assetId}.svg`;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="116" fill="${primary}"/><circle cx="392" cy="120" r="54" fill="${accent}"/><path d="M120 342c82-8 137-58 156-151 55 54 73 114 51 181-69 30-138 20-207-30Z" fill="${accent}" opacity=".95"/><text x="126" y="280" font-family="Arial,sans-serif" font-size="132" font-weight="700" fill="white">${escapeXml(initials)}</text></svg>`;
        await writeFile(path.join(assetsDir, `${assetId}.svg`), svg, "utf8");
        await db.query(`insert into institution_assets
          (id, owner_user_id, type, original_path, normalized_path, mime_type, width, height)
          values ($1, $2, 'logo', $3, $3, 'image/svg+xml', 512, 512)`, [assetId, teacherId, relativePath]);
        logoAssetId = assetId;
      }
      await db.exec("begin");
      try {
        await db.query("update profiles set display_name = $1, updated_at = now() where user_id = $2", [teacherName, teacherId]);
        await db.query("update classrooms set institution_name = $1, section = $2 where id = $3", [institutionName, section, classroom.id]);
        await db.query(`update institution_profiles set display_name = $1, institution_code = $2,
          district = $3, ugel = $4, director_name = $5, logo_asset_id = $6, updated_at = now()
          where owner_user_id = $7`, [institutionName, cleanText(body.institutionCode, 40) || null,
          cleanText(body.district, 100) || null, cleanText(body.ugel, 100) || null,
          cleanText(body.directorName, 120) || null, logoAssetId, teacherId]);
        await db.exec("commit");
      } catch (error) {
        await db.exec("rollback");
        throw error;
      }
      send(response, 200, { dashboard: await dashboard() }, origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/diagnostics") {
      send(response, 200, await diagnosticWorkspace(), origin);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/diagnostics") {
      const body = await readJson(request);
      const context = cleanText(body.observationContext, 240);
      const observation = cleanText(body.observationText, 4000);
      const interpretation = cleanText(body.teacherInterpretation, 2000);
      const status = body.referenceStatus;
      const allowedStatuses = new Set(["observed", "with_support", "not_observed_yet", "need_more_information"]);
      if (!body.studentId || !body.competencyId || !body.referenceId || !allowedStatuses.has(status)) {
        send(response, 400, { error: "Selecciona estudiante, referente y estado observacional." }, origin);
        return;
      }
      const allowed = await db.query(`
        select s.classroom_id, r.guide_id from students s
        join classrooms c on c.id = s.classroom_id
        join age_grades ag on ag.id = c.age_grade_id
        join competency_observation_guides g on g.competency_id = $2 and g.age = ag.age_years and g.is_active = true
        join observation_references r on r.guide_id = g.id and r.id = $3 and r.is_active = true and r.reviewed_at is not null
        where s.id = $1 and c.teacher_id = $4 and
          jsonb_array_length(r.performance_ids) > 0 and not exists (
            select 1 from jsonb_array_elements_text(r.performance_ids) pid
            left join performances p on p.id = pid.value::uuid and p.competency_id = g.competency_id
              and p.age_grade_id = c.age_grade_id
            where p.id is null
          )
      `, [body.studentId, body.competencyId, body.referenceId, teacherId]);
      if (!allowed.rows.length) {
        send(response, 403, { error: "La selección no pertenece al aula o guía activa." }, origin);
        return;
      }
      let session = (await db.query(`select id from diagnostic_sessions where classroom_id = $1 and status = 'active' order by started_at desc limit 1`, [allowed.rows[0].classroom_id])).rows[0];
      if (!session) {
        session = { id: randomUUID() };
        await db.query(`insert into diagnostic_sessions (id, classroom_id, title, created_by)
          values ($1, $2, $3, $4)`, [session.id, allowed.rows[0].classroom_id, `Diagnóstico inicial ${new Date().getFullYear()}`, teacherId]);
      }
      const confirmed = body.teacherConfirmed === true;
      const existing = (await db.query(`select id from diagnostic_entries where session_id = $1 and student_id = $2 and competency_id = $3`, [session.id, body.studentId, body.competencyId])).rows[0];
      const entryId = existing?.id ?? randomUUID();
      await db.exec("begin");
      try {
      await db.query(`insert into diagnostic_entries
        (id, session_id, student_id, competency_id, guide_id, observation_context,
         observation_text, teacher_interpretation, teacher_confirmed, status)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        on conflict (session_id, student_id, competency_id) do update set
          guide_id = excluded.guide_id, observation_context = excluded.observation_context,
          observation_text = excluded.observation_text, teacher_interpretation = excluded.teacher_interpretation,
          teacher_confirmed = excluded.teacher_confirmed, status = excluded.status, updated_at = now()
      `, [entryId, session.id, body.studentId, body.competencyId, allowed.rows[0].guide_id,
        context || "Observación en aula", observation || null, interpretation || null, confirmed, confirmed ? "confirmed" : "draft"]);
      await db.query(`insert into student_observations
        (id, diagnostic_entry_id, reference_id, status, note, author_id)
        values ($1,$2,$3,$4,$5,$6)
        on conflict (diagnostic_entry_id, reference_id) do update set
          status = excluded.status, note = excluded.note, observed_at = now()
      `, [randomUUID(), entryId, body.referenceId, status, observation || null, teacherId]);
      await db.exec("commit");
      } catch (error) {
        await db.exec("rollback");
        throw error;
      }
      send(response, 201, { workspace: await diagnosticWorkspace() }, origin);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/evidences") {
      const body = await readJson(request);
      const observation = typeof body.observationText === "string" ? body.observationText.trim() : "";
      if (!body.studentId || !body.activityId || !body.criterionId || !observation) {
        send(response, 400, { error: "Faltan estudiante, actividad, criterio u observación." }, origin);
        return;
      }
      if (observation.length > 4000) {
        send(response, 400, { error: "La observación no puede superar 4000 caracteres." }, origin);
        return;
      }
      const allowed = await db.query(`
        select 1
          from students s
          join classrooms cl on cl.id = s.classroom_id
          join learning_experiences le on le.classroom_id = cl.id
          join activities a on a.experience_id = le.id
          join activity_criteria ac on ac.activity_id = a.id
         where s.id = $1 and a.id = $2 and ac.id = $3 and cl.teacher_id = $4
      `, [body.studentId, body.activityId, body.criterionId, teacherId]);
      if (!allowed.rows.length) {
        send(response, 403, { error: "El registro no pertenece al aula local activa." }, origin);
        return;
      }
      const result = await db.query(`
        insert into evidences (
          id, student_id, activity_id, criterion_id, type,
          observation_text, source, created_by
        ) values ($1, $2, $3, $4, 'observation', $5, 'teacher', $6)
        returning id, student_id, observation_text, observed_at
      `, [randomUUID(), body.studentId, body.activityId, body.criterionId, observation, teacherId]);
      send(response, 201, { evidence: result.rows[0] }, origin);
      return;
    }
    send(response, 404, { error: "Ruta local no encontrada." }, origin);
  } catch (error) {
    console.error(error);
    send(response, 500, { error: "La base local no pudo completar la operación." }, origin);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Ayni local database ready at http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    server.close();
    await db.close();
    process.exit(0);
  });
}
