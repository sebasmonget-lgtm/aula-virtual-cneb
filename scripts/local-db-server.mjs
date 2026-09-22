import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { resolveDailyState } from "../src/lib/daily-state.mjs";
import { isValidStepIndex } from "../src/lib/activity-runner.mjs";
import { buildStudentPedagogicalContext, refreshStudentContextSnapshot } from "../src/lib/student-context-service.mjs";
import { buildClassroomStatistics } from "../src/lib/statistics-service.mjs";
import { loadKnowledgeBaseV4 } from "../src/lib/knowledge-base-v4.mjs";
import { cardIsApplicable } from "../src/lib/ai-context-builder-v4.mjs";
import { generateTeacherActivity } from "../src/lib/ai-activity-ui-service.mjs";
import { generateTeacherAnnualPlan } from "../src/lib/ai-annual-plan-ui-service.mjs";
import { generateTeacherLearningExperience } from "../src/lib/ai-learning-experience-ui-service.mjs";
import { nextAnnualPlanVersion, safeAnnualGenerationMetadata } from "../src/lib/annual-plan-persistence.mjs";
import { validateLearningExperienceProposal } from "../src/lib/learning-experience-validation.mjs";
import { normalizeActivityMaterials, publicActivityParent, validateActivityV4 } from "../src/lib/activity-v4-validation.mjs";
import { validateCriterionEvidenceV4 } from "../src/lib/criterion-evidence-validation.mjs";
import { generateCriterionEvidence } from "../src/lib/ai-criterion-evidence-ui-service.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, ".local", "pgdata");
const migrationsDir = path.join(root, "local-db", "migrations");
const assetsDir = path.join(root, ".local", "assets");
const evidenceAssetsDir = path.join(assetsDir, "evidences");
const port = Number(process.env.AYNI_LOCAL_DB_PORT ?? 8788);
const teacherId = "00000000-0000-4000-8000-000000000001";
// Local-only handoff: production must replace this map with durable, access-controlled audit records.
const pendingAIGenerations = new Map();
const corsMethods = "GET,POST,PUT,OPTIONS";
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
const exportTables = [
  "profiles", "curriculum_source_documents", "curriculum_versions", "levels", "cycles", "age_grades", "curriculum_areas",
  "competencies", "capacities", "standards", "performances", "transversal_approaches", "school_years", "classrooms",
  "institution_assets", "institution_profiles", "students", "learning_experiences",
  "activities", "activity_criteria", "evidences", "competency_observation_guides",
  "document_templates", "document_versions", "diagnostic_sessions",
  "diagnostic_entries", "observation_references", "student_observations",
  "class_schedule_entries", "daily_execution_logs", "attendance_records", "calendar_exceptions", "student_context_snapshots", "annual_plans", "annual_plan_competencies", "annual_plan_changes",
];

await mkdir(path.dirname(dataDir), { recursive: true });
await mkdir(assetsDir, { recursive: true });
await mkdir(evidenceAssetsDir, { recursive: true });
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
    "access-control-allow-methods": corsMethods,
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
    if (body.length > 4_200_000) throw new Error("El contenido excede el límite permitido.");
  }
  return JSON.parse(body || "{}");
}

async function dashboard() {
  const activityResult = await db.query(`
    select a.id, a.title, a.purpose, a.occurs_on, e.title as experience_title,
           coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'criterion_text', c.criterion_text,
             'competency_id', c.competency_id, 'competency_text', co.official_text,
             'performance_id', c.performance_id, 'evidence_kind', c.evidence_kind) order by c.display_order) filter (where c.id is not null), '[]'::jsonb) as criteria
      from activities a
      join learning_experiences e on e.id = a.experience_id
      left join activity_criteria c on c.activity_id = a.id
      left join competencies co on co.id = c.competency_id
     group by a.id, e.title
     order by a.occurs_on desc
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
  const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const today = dateFormatter.format(new Date());
  const now = timeFormatter.format(new Date());
  const classroomResult = await db.query(`select id from classrooms where teacher_id = $1 and status = 'active' limit 1`, [teacherId]);
  const classroomId = classroomResult.rows[0]?.id;
  const attendanceResult = await db.query(`
    select count(*)::int as recorded_count from attendance_records
     where classroom_id = $1 and attendance_date = $2::date
  `, [classroomId, today]);
  const exceptionResult = await db.query(`
    select type, label, is_instructional from calendar_exceptions
     where classroom_id = $1 and exception_date = $2::date limit 1
  `, [classroomId, today]);
  const todayBlocks = await db.query(`
    select se.id, se.start_time::text, se.end_time::text, se.block_type, coalesce(se.title, a.title) as title,
           se.activity_id, a.purpose, le.title as experience_title,
           coalesce(criteria.criteria, '[]'::jsonb) as criteria,
           coalesce(a.preparation->'materials', '[]'::jsonb) as materials, coalesce(a.preparation->'steps', '[]'::jsonb) as steps,
           coalesce(del.status, 'planned') as status, coalesce(del.current_override, false) as current_override,
           least(coalesce(del.current_step_index, 0), greatest(coalesce(jsonb_array_length(a.preparation->'steps'), 0) - 1, 0))::int as current_step_index,
           del.closure_type, del.teacher_closure_note
      from class_schedule_entries se
      join classrooms cl on cl.id = se.classroom_id
      left join activities a on a.id = se.activity_id
      left join learning_experiences le on le.id = a.experience_id
      left join lateral (
        select jsonb_agg(jsonb_build_object('id', ac.id, 'criterion_text', ac.criterion_text,
          'competency_id', ac.competency_id, 'competency_text', co.official_text,
          'performance_id', ac.performance_id, 'evidence_kind', ac.evidence_kind) order by ac.display_order) as criteria
        from activity_criteria ac join competencies co on co.id = ac.competency_id
        where ac.activity_id = a.id
      ) criteria on true
      left join daily_execution_logs del on del.schedule_entry_id = se.id and del.execution_date = $2::date
     where cl.teacher_id = $1 and (se.scheduled_on = $2::date or (se.scheduled_on is null and se.weekday = extract(dow from $2::date)))
     order by se.start_time, se.sort_order
  `, [teacherId, today]);
  const rawBlocks = todayBlocks.rows.map((block) => ({ ...block, materials: block.materials ?? [], steps: block.steps ?? [], criteria: block.criteria ?? [] }));
  const attendanceRecorded = Number(attendanceResult.rows[0]?.recorded_count ?? 0) > 0;
  const calendarException = exceptionResult.rows[0] ?? null;
  const journey = resolveDailyState({ now, scheduleEntries: rawBlocks, attendanceRecorded, calendarException });
  const blocks = rawBlocks.map((block) => ({
    ...block,
    display_status: block.id === journey.currentBlock?.id ? "active" : block.status === "planned" && now >= block.end_time.slice(0, 5) ? "ready_to_close" : block.status,
  }));

  return {
    activity: activityResult.rows[0],
    today: {
      date: today, now, blocks, attendance: { recorded: attendanceRecorded, recorded_count: Number(attendanceResult.rows[0]?.recorded_count ?? 0) },
      calendar_exception: calendarException,
      journey: { mode: journey.mode, current_block_id: journey.currentBlock?.id ?? null, next_block_id: journey.nextBlock?.id ?? null, primary_action: journey.primaryAction, pending_items: journey.pendingItems },
    },
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

async function studentProfile(studentId) {
  const allowed = await db.query(`
    select s.id from students s join classrooms c on c.id = s.classroom_id
     where s.id = $1 and c.teacher_id = $2
  `, [studentId, teacherId]);
  if (!allowed.rows.length) return null;
  const context = await buildStudentPedagogicalContext(db, studentId);
  const snapshot = (await db.query(`select generated_at, source_updated_at from student_context_snapshots
    where student_id = $1 and version = 1`, [studentId])).rows[0] ?? null;
  return { ...context, snapshot };
}

async function activeClassroomForActivityGeneration() {
  return (await db.query(`select c.id, c.section, ag.age_years as age
    from classrooms c join age_grades ag on ag.id = c.age_grade_id
    where c.teacher_id = $1 and c.status = 'active' limit 1`, [teacherId])).rows[0] ?? null;
}


async function annualPlanningContext() {
  const row = (await db.query(`select c.id, c.section, c.context, c.castellano_l2_applicable, c.religion_applicable, ag.age_years as age, sy.id as school_year_id, sy.year, sy.starts_on, sy.ends_on, cv.id as curriculum_version_id, ip.display_name as institution_name
    from classrooms c join age_grades ag on ag.id=c.age_grade_id join school_years sy on sy.id=c.school_year_id join curriculum_versions cv on cv.active=true left join institution_profiles ip on ip.owner_user_id=c.teacher_id
    where c.teacher_id=$1 and c.status='active' limit 1`, [teacherId])).rows[0];
  if (!row) return null;
  const diagnostic = await db.query(`select de.teacher_interpretation from diagnostic_entries de join diagnostic_sessions ds on ds.id=de.session_id where ds.classroom_id=$1 and de.teacher_confirmed=true and de.teacher_interpretation is not null`, [row.id]);
  return { ...row, calendar: { school_year: row.year, starts_on: row.starts_on, ends_on: row.ends_on }, group_context: row.context?.group_context || row.context || `Aula ${row.section} de ${row.age} años`, school_context: row.institution_name || undefined, diagnostic_summary: diagnostic.rows.map((item) => item.teacher_interpretation).filter(Boolean).join(" ") || undefined, language_context: row.castellano_l2_applicable ? { castellano_l2_applicable: true } : undefined };
}
async function activityGenerationOptions() {
  return competencyOptionsForWorkflow("activity");
}
async function competencyOptionsForWorkflow(workflow) {
  const classroom = await annualPlanningContext();
  if (!classroom || !["annual_plan", "project", "unit", "activity"].includes(workflow)) return { age: null, competencies: [] };
  const knowledgeBase = await loadKnowledgeBaseV4();
  const age = String(classroom.age);
  const applicability = { castellanoL2Applicable: classroom.castellano_l2_applicable === true, religionApplicable: classroom.religion_applicable === true };
  return { age: classroom.age, competencies: knowledgeBase.competencyCards
    .filter((card) => card.runtime_selectable_by_age?.[age] && cardIsApplicable(card, applicability))
    .map((card) => ({ id: card.id, name: card.official_name })) };
}
async function applicableCompetencyIds(workflow, classroom) {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const applicability = { castellanoL2Applicable: classroom.castellano_l2_applicable === true, religionApplicable: classroom.religion_applicable === true };
  return new Set(knowledgeBase.competencyCards.filter((card) => card.runtime_selectable_by_age?.[String(classroom.age)] && cardIsApplicable(card, applicability)).map((card) => card.id));
}
function validateExperienceDates(body, context) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.startsOn ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(body.endsOn ?? "") || body.startsOn > body.endsOn || body.startsOn < context.starts_on || body.endsOn > context.ends_on) throw new Error("Las fechas deben estar dentro del año escolar y en orden válido.");
}
async function activeLearningExperience(id, classroomId) {
  return (await db.query(`select * from learning_experiences where id=$1 and classroom_id=$2 and status='active' and type in ('project','unit')`, [id, classroomId])).rows[0] ?? null;
}
async function activityParentContext(experience) {
  const prior = (await db.query(`select occurs_on,title,purpose,details->>'closure_or_continuity' as closure_or_continuity from activities where experience_id=$1 and status='active' order by occurs_on desc limit 5`, [experience.id])).rows;
  return publicActivityParent(experience, prior);
}
async function activityAllowedCompetencies(experience, classroom) {
  const parentIds = new Set([...(experience.details?.primary_competency_ids ?? []), ...(experience.details?.possible_secondary_competency_ids ?? [])]);
  const applicable = await applicableCompetencyIds("activity", classroom);
  return new Set([...parentIds].filter((id) => applicable.has(id)));
}
async function validateStoredActivityCriterion(current, classroom) {
  const competencyId = current.activity_details?.competency_id;
  if (current.activity_details?.competency_status !== "confirmed" || !competencyId || current.competency_v4_id !== competencyId) {
    throw new Error("El criterio ya no corresponde a esta actividad.");
  }
  const allowed = await activityAllowedCompetencies({ details: current.parent_details }, classroom);
  if (!allowed.has(competencyId)) throw new Error("El criterio ya no corresponde a esta actividad.");
}
function validateActivityDate(occursOn, experience, classroom) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occursOn ?? "") || occursOn < String(experience.starts_on).slice(0,10) || occursOn > String(experience.ends_on).slice(0,10) || occursOn < classroom.starts_on || occursOn > classroom.ends_on) throw new Error("La fecha debe estar dentro de la experiencia y del año escolar.");
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
      "access-control-allow-methods": corsMethods,
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
    if (request.method === "GET" && url.pathname.startsWith("/api/students/")) {
      const studentId = url.pathname.split("/").at(-1);
      const profile = await studentProfile(studentId);
      if (!profile) {
        send(response, 404, { error: "Niño no encontrado en el aula activa." }, origin);
        return;
      }
      send(response, 200, profile, origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/statistics") {
      const classroom = (await db.query(`select id from classrooms where teacher_id = $1 and status = 'active' limit 1`, [teacherId])).rows[0];
      send(response, 200, await buildClassroomStatistics(db, classroom.id), origin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/ai/annual-plan/context") {
      const context = await annualPlanningContext(); send(response, context ? 200 : 404, context ?? { error: "No se encontró un aula activa." }, origin); return;
    }
    if (request.method === "POST" && url.pathname === "/api/ai/annual-plan/generate") {
      const classroom = await annualPlanningContext(); if (!classroom) { send(response, 404, { error: "No se encontró un aula activa." }, origin); return; }
      try {
        const generated = await generateTeacherAnnualPlan({ classroom, request: await readJson(request) });
        const generationId = randomUUID();
        pendingAIGenerations.set(generationId, { workflow: generated.internalMetadata.workflow, metadata: safeAnnualGenerationMetadata(generated.internalMetadata), classroom_id: classroom.id, createdAt: Date.now() });
        send(response, 200, { proposal: generated.proposal, generation_id: generationId }, origin);
      } catch (error) { send(response, 422, { error: error?.message || "No pudimos generar una propuesta válida." }, origin); } return;
    }
    if (request.method === "POST" && url.pathname === "/api/annual-plans") {
      const context = await annualPlanningContext(); const body = await readJson(request);
      if (!context || !body.proposal) { send(response, 400, { error: "Falta propuesta o aula activa." }, origin); return; }
      const existingId = typeof body.planId === "string" ? body.planId : null;
      const pending = typeof body.generationId === "string" ? pendingAIGenerations.get(body.generationId) : null;
      if (!existingId && (!pending || pending.classroom_id !== context.id || pending.workflow !== "annual_plan")) { send(response, 422, { error: "La generación anual ya no está disponible. Genera nuevamente el borrador." }, origin); return; }
      await db.exec("begin");
      try {
        if (existingId) {
          const updated = await db.query(`update annual_plans set proposal=$1::jsonb, updated_at=now() where id=$2 and classroom_id=$3 and school_year_id=$4 and status='draft' returning id`, [JSON.stringify(body.proposal), existingId, context.id, context.school_year_id]);
          if (!updated.rows[0]) throw new Error("Borrador anual no disponible.");
          await db.exec("commit"); send(response, 200, { id: existingId, status: "draft" }, origin); return;
        }
        const latest = await db.query(`select coalesce(max(version), 0) as max_version from annual_plans where classroom_id=$1 and school_year_id=$2`, [context.id, context.school_year_id]);
        const version = nextAnnualPlanVersion(Number(latest.rows[0].max_version)); const id = randomUUID();
        await db.query(`insert into annual_plans (id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,generation_metadata) values ($1,$2,$3,$4,$5,'draft',$6::jsonb,$7::jsonb)`, [id, context.id, context.school_year_id, context.curriculum_version_id, version, JSON.stringify(body.proposal), JSON.stringify(pending?.metadata ?? {})]);
        await db.exec("commit");
        if (pending) pendingAIGenerations.delete(body.generationId);
        send(response, 200, { id, version, status: "draft" }, origin);
      } catch (error) { await db.exec("rollback"); send(response, 422, { error: error?.message || "No se pudo guardar el borrador." }, origin); }
      return;
    }
    if (request.method === "POST" && url.pathname.startsWith("/api/annual-plans/") && url.pathname.endsWith("/confirm")) {
      const id = url.pathname.split("/")[3];
      await db.exec("begin");
      try {
        const draft = await db.query(`select id,classroom_id,school_year_id from annual_plans where id=$1 and classroom_id in (select id from classrooms where teacher_id=$2) and status='draft'`, [id, teacherId]);
        if (!draft.rows[0]) throw new Error("Plan anual no disponible para confirmar.");
        await db.query(`update annual_plans set status='archived', updated_at=now() where classroom_id=$1 and school_year_id=$2 and status='active'`, [draft.rows[0].classroom_id, draft.rows[0].school_year_id]);
        const result = await db.query(`update annual_plans set status='active', teacher_confirmed_at=now(), updated_at=now() where id=$1 and status='draft' returning id,status,version`, [id]);
        await db.exec("commit"); send(response, 200, result.rows[0], origin);
      } catch (error) { await db.exec("rollback"); send(response, 404, { error: error?.message || "Plan anual no disponible para confirmar." }, origin); }
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/annual-plans/current") {
      const context = await annualPlanningContext();
      if (!context) { send(response, 404, { error: "No se encontró un aula activa." }, origin); return; }
      const plans = (await db.query(`select id,version,status,proposal,created_at,updated_at from annual_plans where classroom_id=$1 and school_year_id=$2 order by version desc`, [context.id, context.school_year_id])).rows;
      send(response, 200, { active: plans.find((plan) => plan.status === "active") ?? null, draft: plans.find((plan) => plan.status === "draft") ?? null, archived: plans.filter((plan) => plan.status === "archived") }, origin); return;
    }
    if (request.method === "GET" && url.pathname === "/api/learning-experiences") {
      const context = await annualPlanningContext(); if (!context) { send(response, 404, { error: "No se encontró un aula activa." }, origin); return; }
      const experiences = (await db.query(`select id,type,title,purpose,starts_on,ends_on,status,annual_plan_id,origin,planning_reason,source_proposal_index,details,teacher_confirmed_at from learning_experiences where classroom_id=$1 order by created_at desc`, [context.id])).rows;
      send(response, 200, { experiences }, origin); return;
    }
    if (request.method === "GET" && url.pathname === "/api/ai/competency-options") {
      send(response, 200, await competencyOptionsForWorkflow(url.searchParams.get("workflow") ?? ""), origin); return;
    }
    if (request.method === "POST" && url.pathname === "/api/ai/learning-experiences/generate") {
      const classroom = await annualPlanningContext(); if (!classroom) { send(response, 404, { error: "No se encontró un aula activa." }, origin); return; }
      try {
        const body = await readJson(request); let parent = null;
        if (body.origin === "planned") {
          parent = (await db.query(`select id,proposal from annual_plans where id=$1 and classroom_id=$2 and status='active'`, [body.annualPlanId, classroom.id])).rows[0];
          const source = parent?.proposal?.proposed_experiences?.[body.sourceProposalIndex];
          if (!source || source.experience_type !== body.workflow) throw new Error("La propuesta anual activa no coincide con esta experiencia.");
          const contextKey = body.workflow === "project" ? "project_trigger_or_interest" : "learning_need_or_context";
          Object.assign(body, { [contextKey]: body[contextKey]?.trim() || source.context_or_trigger, competency_ids: body.competency_ids ?? source.primary_competency_ids, planned_experience: { title: source.title, period: source.period, rationale: source.rationale, context_or_trigger: source.context_or_trigger, primary_competency_ids: source.primary_competency_ids, possible_secondary_competency_ids: source.possible_secondary_competency_ids, expected_evidence_categories: source.expected_evidence_categories, flexibility_notes: source.flexibility_notes, annual_plan_id: parent.id, source_proposal_index: body.sourceProposalIndex } });
        }
        const generated = await generateTeacherLearningExperience({ classroom, request: body }); const generationId = randomUUID();
        pendingAIGenerations.set(generationId, { workflow: generated.internalMetadata.workflow, classroom_id: classroom.id, metadata: safeAnnualGenerationMetadata(generated.internalMetadata), createdAt: Date.now(), parent: parent ? { annual_plan_id: parent.id, source_proposal_index: body.sourceProposalIndex } : null });
        send(response, 200, { proposal: generated.proposal, generation_id: generationId }, origin);
      } catch (error) { send(response, 422, { error: error?.message || "No se pudo generar la experiencia." }, origin); } return;
    }
    if (request.method === "POST" && url.pathname === "/api/learning-experiences") {
      const context = await annualPlanningContext(); const body = await readJson(request); const pending = typeof body.generationId === "string" ? pendingAIGenerations.get(body.generationId) : null;
      if (!context || !body.proposal || !["project", "unit"].includes(body.type) || !pending || pending.classroom_id !== context.id || pending.workflow !== body.type) { send(response, 422, { error: "Falta una generación válida de proyecto o unidad." }, origin); return; }
      const originType = body.origin === "emergent" ? "emergent" : "planned"; const proposalIndex = originType === "planned" && Number.isInteger(body.sourceProposalIndex) ? body.sourceProposalIndex : null;
      if (originType === "planned" && (!body.annualPlanId || proposalIndex === null)) { send(response, 422, { error: "Falta la propuesta de origen del plan anual." }, origin); return; }
      if (originType === "emergent" && !cleanText(body.planningReason, 500)) { send(response, 422, { error: "Explica la razón de esta experiencia emergente." }, origin); return; }
      try { validateExperienceDates(body, context); validateLearningExperienceProposal(body.type, body.proposal, await applicableCompetencyIds(body.type, context)); } catch (error) { send(response, 422, { error: error.message }, origin); return; }
      if (originType === "planned") {
        const parent = (await db.query(`select proposal from annual_plans where id=$1 and classroom_id=$2 and status='active'`, [body.annualPlanId, context.id])).rows[0];
        const source = parent?.proposal?.proposed_experiences?.[proposalIndex];
        if (!source || source.experience_type !== body.type) { send(response, 422, { error: "La propuesta anual activa no coincide con esta experiencia." }, origin); return; }
      }
      try { const id = randomUUID(); await db.query(`insert into learning_experiences (id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,origin,planning_reason,source_proposal_index,generation_metadata) values ($1,$2,$3,$4,$5,$6::date,$7::date,'draft',$8::jsonb,$9,$10,$11,$12,$13::jsonb)`, [id, context.id, body.type, body.proposal.title, body.proposal.purpose, body.startsOn, body.endsOn, JSON.stringify(body.proposal), body.annualPlanId ?? null, originType, body.planningReason ?? null, proposalIndex, JSON.stringify(pending.metadata)]); pendingAIGenerations.delete(body.generationId); send(response, 200, { id, status: "draft" }, origin); } catch (error) { send(response, 422, { error: error?.message || "No se pudo guardar la experiencia." }, origin); } return;
    }
    if (request.method === "PUT" && url.pathname.startsWith("/api/learning-experiences/")) {
      const id = url.pathname.split("/")[3]; const context = await annualPlanningContext(); const body = await readJson(request);
      const current = context && (await db.query(`select * from learning_experiences where id=$1 and classroom_id=$2 and status='draft'`, [id, context.id])).rows[0];
      if (!current) { send(response, 404, { error: "Borrador no disponible para editar." }, origin); return; }
      try { validateExperienceDates(body, context); validateLearningExperienceProposal(current.type, body.proposal, await applicableCompetencyIds(current.type, context)); if (current.origin === "emergent" && !cleanText(body.planningReason, 500)) throw new Error("Explica la razón de esta experiencia emergente."); await db.query(`update learning_experiences set title=$1,purpose=$2,starts_on=$3::date,ends_on=$4::date,details=$5::jsonb,planning_reason=$6 where id=$7`, [body.proposal.title, body.proposal.purpose, body.startsOn, body.endsOn, JSON.stringify(body.proposal), current.origin === "emergent" ? body.planningReason : current.planning_reason, id]); send(response, 200, { id, status: "draft" }, origin); } catch (error) { send(response, 422, { error: error.message }, origin); } return;
    }
    if (request.method === "POST" && url.pathname.startsWith("/api/learning-experiences/") && url.pathname.endsWith("/confirm")) {
      const id = url.pathname.split("/")[3]; const context = await annualPlanningContext(); const current = context && (await db.query(`select * from learning_experiences where id=$1 and classroom_id=$2 and status='draft'`, [id, context.id])).rows[0];
      if (!current) { send(response, 404, { error: "Experiencia no disponible para confirmar." }, origin); return; }
      try {
        validateExperienceDates({ startsOn: String(current.starts_on).slice(0,10), endsOn: String(current.ends_on).slice(0,10) }, context); validateLearningExperienceProposal(current.type, current.details, await applicableCompetencyIds(current.type, context));
        if (current.origin === "emergent" && !cleanText(current.planning_reason, 500)) throw new Error("Explica la razón de esta experiencia emergente.");
        if (current.origin === "planned") { const parent = (await db.query(`select proposal from annual_plans where id=$1 and classroom_id=$2 and status='active'`, [current.annual_plan_id, context.id])).rows[0]; const source = parent?.proposal?.proposed_experiences?.[current.source_proposal_index]; if (!source || source.experience_type !== current.type) throw new Error("La propuesta anual activa no coincide con esta experiencia."); }
        const result = await db.query(`update learning_experiences set status='active', teacher_confirmed_at=now() where id=$1 returning id,status,teacher_confirmed_at`, [id]); send(response, 200, result.rows[0], origin);
      } catch (error) { send(response, 422, { error: error.message }, origin); } return;
    }
    if (request.method === "GET" && url.pathname === "/api/activities") {
      const context = await annualPlanningContext(); const experience = context && await activeLearningExperience(url.searchParams.get("experienceId"), context.id);
      if (!experience) { send(response, 404, { error: "Experiencia confirmada no disponible." }, origin); return; }
      const activities = (await db.query(`select id,occurs_on,title,purpose,status,details,preparation,teacher_confirmed_at from activities where experience_id=$1 order by occurs_on`, [experience.id])).rows; send(response, 200, { experience: await activityParentContext(experience), activities }, origin); return;
    }
    if (request.method === "POST" && url.pathname === "/api/ai/activities/generate") {
      const context = await annualPlanningContext(); const body = await readJson(request); const experience = context && await activeLearningExperience(body.experienceId, context.id);
      if (!experience) { send(response, 422, { error: "Selecciona un Project o Unit confirmado." }, origin); return; }
      const allowed = await activityAllowedCompetencies(experience, context);
      if (body.competencyId && !allowed.has(body.competencyId)) { send(response, 422, { error: "La competencia no pertenece a la experiencia." }, origin); return; }
      try { const generated = await generateTeacherActivity({ request: body, classroom: context, learningExperience: await activityParentContext(experience) }); const generationId = randomUUID(); pendingAIGenerations.set(generationId, { workflow: "activity", classroom_id: context.id, learning_experience_id: experience.id, metadata: safeAnnualGenerationMetadata(generated.internalMetadata), createdAt: Date.now() }); send(response, 200, { proposal: generated.proposal, generation_id: generationId }, origin); } catch (error) { send(response, 422, { error: error.message || "No se pudo generar la actividad." }, origin); } return;
    }
    if (request.method === "POST" && url.pathname === "/api/activities") {
      const context = await annualPlanningContext(); const body = await readJson(request); const experience = context && await activeLearningExperience(body.experienceId, context.id); const pending = pendingAIGenerations.get(body.generationId);
      if (!experience || !pending || pending.workflow !== "activity" || pending.classroom_id !== context.id || pending.learning_experience_id !== experience.id) { send(response, 422, { error: "La generación de actividad no corresponde a esta experiencia." }, origin); return; }
      try { validateActivityDate(body.occursOn, experience, context); validateActivityV4(body.proposal, await activityAllowedCompetencies(experience, context)); const id=randomUUID(); await db.query(`insert into activities (id,experience_id,occurs_on,title,purpose,sequence,preparation,adaptations,status,details,generation_metadata) values ($1,$2,$3::date,$4,$5,'[]'::jsonb,$6::jsonb,'[]'::jsonb,'draft',$7::jsonb,$8::jsonb)`, [id,experience.id,body.occursOn,body.proposal.title,body.proposal.purpose,JSON.stringify({materials: normalizeActivityMaterials(body.materials)}),JSON.stringify(body.proposal),JSON.stringify(pending.metadata)]); pendingAIGenerations.delete(body.generationId); send(response,200,{id,status:"draft"},origin); } catch(error) { send(response,422,{error:error.message},origin); } return;
    }
    if (request.method === "PUT" && url.pathname.startsWith("/api/activities/")) {
      const id=url.pathname.split("/")[3]; const context=await annualPlanningContext(); const body=await readJson(request); const current=context&&(await db.query(`select a.*,e.classroom_id,e.status as experience_status,e.details as experience_details,e.starts_on as experience_starts_on,e.ends_on as experience_ends_on from activities a join learning_experiences e on e.id=a.experience_id where a.id=$1 and e.classroom_id=$2 and a.status='draft'`,[id,context.id])).rows[0];
      if(!current||current.experience_status!=="active"){send(response,404,{error:"Borrador no disponible."},origin);return;} const pending=typeof body.generationId==="string"?pendingAIGenerations.get(body.generationId):null; if(body.generationId&&(!pending||pending.workflow!=="activity"||pending.classroom_id!==context.id||pending.learning_experience_id!==current.experience_id)){send(response,422,{error:"La regeneración no corresponde a esta actividad."},origin);return;} try { const parent={ details: current.experience_details }; validateActivityDate(body.occursOn,{starts_on:current.experience_starts_on,ends_on:current.experience_ends_on},context); validateActivityV4(body.proposal,await activityAllowedCompetencies(parent,context)); const values=[body.occursOn,body.proposal.title,body.proposal.purpose,JSON.stringify(body.proposal),JSON.stringify({materials:normalizeActivityMaterials(body.materials)})]; if(pending){await db.query(`update activities set occurs_on=$1::date,title=$2,purpose=$3,details=$4::jsonb,preparation=$5::jsonb,generation_metadata=$6::jsonb,updated_at=now() where id=$7`,[...values,JSON.stringify(pending.metadata),id]);pendingAIGenerations.delete(body.generationId);}else await db.query(`update activities set occurs_on=$1::date,title=$2,purpose=$3,details=$4::jsonb,preparation=$5::jsonb,updated_at=now() where id=$6`,[...values,id]);send(response,200,{id,status:"draft"},origin);}catch(error){send(response,422,{error:error.message},origin);}return;
    }
    if (request.method === "POST" && url.pathname.startsWith("/api/activities/") && url.pathname.endsWith("/confirm")) {
      const id=url.pathname.split("/")[3]; const context=await annualPlanningContext(); const current=context&&(await db.query(`select a.*,e.classroom_id,e.status as experience_status,e.details as experience_details,e.starts_on as experience_starts_on,e.ends_on as experience_ends_on from activities a join learning_experiences e on e.id=a.experience_id where a.id=$1 and e.classroom_id=$2 and a.status='draft'`,[id,context.id])).rows[0]; if(!current||current.experience_status!=="active"){send(response,404,{error:"Actividad no disponible."},origin);return;}try{validateActivityDate(String(current.occurs_on).slice(0,10),{starts_on:current.experience_starts_on,ends_on:current.experience_ends_on},context);validateActivityV4(current.details,await activityAllowedCompetencies({details:current.experience_details},context));const result=await db.query(`update activities set status='active',teacher_confirmed_at=now(),updated_at=now() where id=$1 returning id,status,teacher_confirmed_at`,[id]);send(response,200,result.rows[0],origin);}catch(error){send(response,422,{error:error.message},origin);}return;
    }
    if (request.method === "GET" && url.pathname === "/api/activity-criteria") {
      const context=await annualPlanningContext();const activity=context&&(await db.query(`select a.*,e.details as experience_details,e.title as experience_title,e.purpose as experience_purpose from activities a join learning_experiences e on e.id=a.experience_id where a.id=$1 and e.classroom_id=$2 and a.status='active'`,[url.searchParams.get("activityId"),context.id])).rows[0];if(!activity){send(response,404,{error:"Actividad confirmada no disponible."},origin);return;}const criteria=(await db.query(`select id,activity_id,competency_v4_id,criterion_text,details,status,teacher_confirmed_at from activity_criteria where activity_id=$1 and competency_v4_id=$2 order by created_at desc`,[activity.id,activity.details?.competency_id])).rows;send(response,200,{activity:{id:activity.id,title:activity.title,details:activity.details},criteria},origin);return;
    }
    if(request.method==="POST"&&url.pathname==="/api/ai/activity-criteria/generate"){
      const context=await annualPlanningContext();const body=await readJson(request);const activity=context&&(await db.query(`select a.*,e.id as parent_id,e.type as parent_type,e.title as parent_title,e.purpose as parent_purpose,e.details as parent_details from activities a join learning_experiences e on e.id=a.experience_id where a.id=$1 and e.classroom_id=$2 and a.status='active'`,[body.activityId,context.id])).rows[0];if(!activity||activity.details?.competency_status!=="confirmed"||!activity.details?.competency_id){send(response,422,{error:"Confirma la competencia de la actividad antes de preparar el criterio."},origin);return;}const allowed=await activityAllowedCompetencies({details:activity.parent_details},context);if(!allowed.has(activity.details.competency_id)){send(response,422,{error:"El criterio ya no corresponde a esta actividad."},origin);return;}try{const generated=await generateCriterionEvidence({classroom:context,activity,parent:{id:activity.parent_id,type:activity.parent_type,title:activity.parent_title,purpose:activity.parent_purpose,details:activity.parent_details},note:cleanText(body.note,1000)});const generationId=randomUUID();pendingAIGenerations.set(generationId,{workflow:"criterion_and_evidence",classroom_id:context.id,activity_id:activity.id,competency_v4_id:activity.details.competency_id,metadata:safeAnnualGenerationMetadata(generated.internalMetadata),createdAt:Date.now()});send(response,200,{proposal:generated.proposal,generation_id:generationId},origin);}catch(error){send(response,422,{error:"No pudimos generar un criterio válido."},origin);}return;
    }
    if(request.method==="POST"&&url.pathname==="/api/activity-criteria"){
      const context=await annualPlanningContext();const body=await readJson(request);const pending=pendingAIGenerations.get(body.generationId);const activity=context&&(await db.query(`select a.*,e.details as parent_details from activities a join learning_experiences e on e.id=a.experience_id where a.id=$1 and e.classroom_id=$2 and a.status='active'`,[body.activityId,context.id])).rows[0];if(!activity||!pending||pending.workflow!=="criterion_and_evidence"||pending.classroom_id!==context.id||pending.activity_id!==activity.id||pending.competency_v4_id!==activity.details?.competency_id){send(response,422,{error:"El criterio ya no corresponde a esta actividad."},origin);return;}try{const allowed=await activityAllowedCompetencies({details:activity.parent_details},context);if(activity.details?.competency_status!=="confirmed"||!allowed.has(activity.details.competency_id))throw new Error("El criterio ya no corresponde a esta actividad.");validateCriterionEvidenceV4(body.proposal,activity.details.competency_id);const existing=(await db.query(`select id,status from activity_criteria where activity_id=$1 and competency_v4_id=$2`,[activity.id,activity.details.competency_id])).rows[0];if(existing?.status==='active')throw new Error("Esta actividad ya tiene un criterio confirmado.");const id=existing?.id??randomUUID();if(existing)await db.query(`update activity_criteria set criterion_text=$1,details=$2::jsonb,generation_metadata=$3::jsonb,updated_at=now() where id=$4`,[body.proposal.criterion_text,JSON.stringify(body.proposal),JSON.stringify(pending.metadata),id]);else await db.query(`insert into activity_criteria(id,activity_id,competency_id,competency_v4_id,performance_id,criterion_text,details,generation_metadata,status) values($1,$2,null,$3,null,$4,$5::jsonb,$6::jsonb,'draft')`,[id,activity.id,activity.details.competency_id,body.proposal.criterion_text,JSON.stringify(body.proposal),JSON.stringify(pending.metadata)]);pendingAIGenerations.delete(body.generationId);send(response,200,{id,status:"draft"},origin);}catch(error){send(response,422,{error:error.message},origin);}return;
    }
    if(request.method==="PUT"&&url.pathname.startsWith("/api/activity-criteria/")){
      const id=url.pathname.split("/")[3],context=await annualPlanningContext(),body=await readJson(request);const current=context&&(await db.query(`select ac.*,a.details as activity_details,e.classroom_id,e.details as parent_details from activity_criteria ac join activities a on a.id=ac.activity_id join learning_experiences e on e.id=a.experience_id where ac.id=$1 and e.classroom_id=$2 and ac.status='draft' and a.status='active'`,[id,context.id])).rows[0];if(!current){send(response,404,{error:"Criterio no disponible."},origin);return;}const pending=body.generationId&&pendingAIGenerations.get(body.generationId);if(body.generationId&&(!pending||pending.workflow!=="criterion_and_evidence"||pending.activity_id!==current.activity_id||pending.classroom_id!==context.id||pending.competency_v4_id!==current.competency_v4_id)){send(response,422,{error:"El criterio ya no corresponde a esta actividad."},origin);return;}try{await validateStoredActivityCriterion(current,context);validateCriterionEvidenceV4(body.proposal,current.activity_details.competency_id);if(pending){await db.query(`update activity_criteria set criterion_text=$1,details=$2::jsonb,generation_metadata=$3::jsonb,updated_at=now() where id=$4`,[body.proposal.criterion_text,JSON.stringify(body.proposal),JSON.stringify(pending.metadata),id]);pendingAIGenerations.delete(body.generationId)}else await db.query(`update activity_criteria set criterion_text=$1,details=$2::jsonb,updated_at=now() where id=$3`,[body.proposal.criterion_text,JSON.stringify(body.proposal),id]);send(response,200,{id,status:"draft"},origin)}catch(error){send(response,422,{error:error.message},origin)}return;
    }
    if(request.method==="POST"&&url.pathname.startsWith("/api/activity-criteria/")&&url.pathname.endsWith("/confirm")){
      const id=url.pathname.split("/")[3],context=await annualPlanningContext();const current=context&&(await db.query(`select ac.*,a.details as activity_details,e.classroom_id,e.details as parent_details from activity_criteria ac join activities a on a.id=ac.activity_id join learning_experiences e on e.id=a.experience_id where ac.id=$1 and e.classroom_id=$2 and ac.status='draft' and a.status='active'`,[id,context.id])).rows[0];if(!current){send(response,404,{error:"Criterio no disponible."},origin);return;}try{await validateStoredActivityCriterion(current,context);validateCriterionEvidenceV4(current.details,current.activity_details.competency_id);const result=await db.query(`update activity_criteria set status='active',teacher_confirmed_at=now(),updated_at=now() where id=$1 returning id,status,teacher_confirmed_at`,[id]);send(response,200,result.rows[0],origin)}catch(error){send(response,422,{error:error.message},origin)}return;
    }
    if (request.method === "GET" && url.pathname === "/api/ai/activity/options") {
      send(response, 200, await activityGenerationOptions(), origin);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/ai/activity/generate") {
      const classroom = await activeClassroomForActivityGeneration();
      if (!classroom) {
        send(response, 403, { error: "No se encontró un aula activa para generar la actividad." }, origin);
        return;
      }
      const body = await readJson(request);
      try {
        const generated = await generateTeacherActivity({ request: body, classroom });
        // Metadata and provenance stay on the server boundary for future audit storage; the UI receives only the validated proposal.
        send(response, 200, { proposal: generated.proposal }, origin);
      } catch (error) {
        send(response, 422, { error: error?.message || "No pudimos preparar la actividad." }, origin);
      }
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
      await refreshStudentContextSnapshot(db, body.studentId);
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
      const observationStatuses = new Set(["demonstrated", "with_support", "not_yet_demonstrated", "insufficient_information"]);
      if (!body.studentId || !body.activityId || !body.criterionId || !observationStatuses.has(body.observationStatus)) {
        send(response, 400, { error: "Selecciona estudiante, actividad, criterio y marca observacional." }, origin);
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
      let mediaPath = null;
      if (body.photo) {
        const allowedMedia = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
        const extension = allowedMedia.get(body.photo.mimeType);
        const encoded = typeof body.photo.base64 === "string" ? body.photo.base64 : "";
        if (!extension || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
          send(response, 400, { error: "La foto debe ser JPEG, PNG o WebP." }, origin);
          return;
        }
        const bytes = Buffer.from(encoded, "base64");
        if (!bytes.length || bytes.length > 3_000_000) {
          send(response, 400, { error: "La foto debe pesar como máximo 3 MB." }, origin);
          return;
        }
        const filename = `${randomUUID()}.${extension}`;
        await writeFile(path.join(evidenceAssetsDir, filename), bytes);
        mediaPath = `.local/assets/evidences/${filename}`;
      }
      const result = await db.query(`
        insert into evidences (
          id, student_id, activity_id, criterion_id, type,
          observation_text, observation_status, media_path, source, created_by
        ) values ($1, $2, $3, $4, 'observation', $5, $6, $7, 'teacher', $8)
        returning id, student_id, observation_text, observation_status, media_path, observed_at
      `, [randomUUID(), body.studentId, body.activityId, body.criterionId, observation || null, body.observationStatus, mediaPath, teacherId]);
      await refreshStudentContextSnapshot(db, body.studentId);
      send(response, 201, { evidence: result.rows[0] }, origin);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/attendance") {
      const body = await readJson(request);
      const records = Array.isArray(body.records) ? body.records : [];
      const allowedStatuses = new Set(["present", "absent", "late", "excused"]);
      const classroom = (await db.query(`select id from classrooms where teacher_id = $1 and status = 'active' limit 1`, [teacherId])).rows[0];
      const currentStudents = (await db.query(`select id from students where classroom_id = $1 and status = 'active'`, [classroom.id])).rows;
      const permittedIds = new Set(currentStudents.map((student) => student.id));
      if (!records.length || records.some((record) => !permittedIds.has(record.studentId) || !allowedStatuses.has(record.status))) {
        send(response, 400, { error: "La asistencia contiene estudiantes o estados no válidos." }, origin);
        return;
      }
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      await db.exec("begin");
      try {
        for (const record of records) await db.query(`insert into attendance_records
          (id, classroom_id, student_id, attendance_date, status, recorded_by)
          values ($1,$2,$3,$4::date,$5,$6)
          on conflict (student_id, attendance_date) do update set status = excluded.status, recorded_at = now(), recorded_by = excluded.recorded_by
        `, [randomUUID(), classroom.id, record.studentId, today, record.status, teacherId]);
        await db.exec("commit");
      } catch (error) {
        await db.exec("rollback");
        throw error;
      }
      send(response, 200, { dashboard: await dashboard() }, origin);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/today/execution") {
      const body = await readJson(request);
      const action = body.action;
      const allowedActions = new Set(["start", "complete", "skip", "keep_current", "set_step"]);
      if (!body.scheduleEntryId || !allowedActions.has(action)) {
        send(response, 400, { error: "La acción de jornada no es válida." }, origin);
        return;
      }
      const entry = (await db.query(`select se.id, coalesce(jsonb_array_length(a.preparation->'steps'), 0)::int as total_steps from class_schedule_entries se join classrooms c on c.id = se.classroom_id left join activities a on a.id = se.activity_id where se.id = $1 and c.teacher_id = $2`, [body.scheduleEntryId, teacherId])).rows[0];
      if (!entry) {
        send(response, 403, { error: "El bloque no pertenece al aula activa." }, origin);
        return;
      }
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      if (action === "set_step" && !isValidStepIndex(body.stepIndex, entry.total_steps)) {
        send(response, 400, { error: "El paso no pertenece a esta actividad." }, origin);
        return;
      }
      const status = action === "complete" ? "completed" : action === "skip" ? "skipped" : action === "set_step" ? "active" : "active";
      const closureType = action === "complete" ? (body.closureType === "note" ? "note" : "as_planned") : action === "skip" ? "cancelled" : null;
      const closureNote = cleanText(body.closureNote, 800) || null;
      await db.query(`insert into daily_execution_logs
        (id, schedule_entry_id, execution_date, status, actual_started_at, actual_ended_at, teacher_closure_note, closure_type, current_override, current_step_index)
        values ($1,$2,$3::date,$4,case when $4 = 'active' then now() else null end,case when $4 in ('completed','skipped') then now() else null end,$5,$6,$7,$8)
        on conflict (schedule_entry_id, execution_date) do update set
          status = excluded.status, actual_started_at = coalesce(daily_execution_logs.actual_started_at, excluded.actual_started_at),
          actual_ended_at = excluded.actual_ended_at, teacher_closure_note = excluded.teacher_closure_note,
          closure_type = excluded.closure_type, current_override = excluded.current_override,
          current_step_index = case when $9 = 'set_step' then excluded.current_step_index else daily_execution_logs.current_step_index end
      `, [randomUUID(), entry.id, today, status, closureNote, closureType, action === "keep_current", body.stepIndex ?? 0, action]);
      send(response, 200, { dashboard: await dashboard() }, origin);
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






