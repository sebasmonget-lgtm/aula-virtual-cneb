import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPeriodEvaluationRouteHandler } from "../../scripts/period-evaluation-routes.mjs";
import { defaultEvaluationPeriods } from "./period-evaluation-service.mjs";

const teacher = "00000000-0000-4000-8000-000000000001";
const otherTeacher = "00000000-0000-4000-8000-000000000002";
const year = "00000000-0000-4000-8000-000000000101";
const classId = "00000000-0000-4000-8000-000000000201";
const otherClass = "00000000-0000-4000-8000-000000000202";
const ageGrade = "00000000-0000-4000-8000-000000000301";
const studentA = "00000000-0000-4000-8000-000000000401";
const studentB = "00000000-0000-4000-8000-000000000402";
const activity = "00000000-0000-4000-8000-000000000501";
const criterion = "00000000-0000-4000-8000-000000000601";
const firstEvidence = "00000000-0000-4000-8000-000000000701";

const mockAnalysis = () => ({ competency_id: "COM_ORAL", information_status: "sufficient", evidence_overview: "En dos juegos explicó sus ideas y escuchó al grupo.", observable_patterns: ["Explicó una decisión."], strengths_and_advances: ["Compartió ideas."], support_needs: [], next_opportunities: ["Conversar en grupos pequeños."], teacher_questions: [], insufficiency_reason: null, caution: "La docente debe contrastar los registros.", suggested_level: "A", suggestion_reason: "En las dos observaciones explicó sus ideas." });
const mockConclusion = () => ({ competency_id: "COM_ORAL", information_status: "sufficient", conclusion_text: "Explica sus ideas durante el juego y escucha propuestas. Seguirá conversando en grupos pequeños.", progress_examples: ["Explicó una decisión."], support_or_conditions: [], next_steps: ["Dialogar en grupos pequeños."], insufficiency_reason: null, caution: "Revisado por la docente." });

test("períodos formales separan cuatro bimestres o tres trimestres", () => {
  const calendar = { starts_on: "2026-03-01", ends_on: "2026-12-31" };
  const blocks = [
    { type: "instructional", start_date: "2026-03-16", end_date: "2026-05-15" },
    { type: "instructional", start_date: "2026-05-25", end_date: "2026-07-24" },
    { type: "instructional", start_date: "2026-08-10", end_date: "2026-10-09" },
    { type: "instructional", start_date: "2026-10-19", end_date: "2026-12-18" },
  ];
  assert.equal(defaultEvaluationPeriods(calendar, blocks).length, 4);
  assert.equal(defaultEvaluationPeriods(calendar, blocks)[0].starts_on, "2026-03-16");
  assert.equal(defaultEvaluationPeriods(calendar, blocks, "trimester").length, 3);
});

test("la migración futura exige lectura propia y escritura mediante servidor", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/202609240001_evaluation_periods.sql", import.meta.url), "utf8");
  for (const table of ["evaluation_periods", "period_competency_scope", "period_closures"]) assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(sql, /for select to authenticated/);
  assert.match(sql, /revoke insert, update, delete on public\.competency_assessments, public\.competency_descriptive_conclusions from authenticated/);
  assert.match(sql, /El nivel definitivo requiere confirmación docente/);
});

async function fixture({ analysis = mockAnalysis() } = {}) {
  const db = await PGlite.create();
  await db.exec(`
    create table school_years(id uuid primary key,owner_id uuid,year integer,starts_on date,ends_on date);
    create table age_grades(id uuid primary key,age_years integer);
    create table classrooms(id uuid primary key,school_year_id uuid references school_years(id),teacher_id uuid,age_grade_id uuid references age_grades(id),section text,castellano_l2_applicable boolean default false,religion_applicable boolean default false);
    create table students(id uuid primary key,classroom_id uuid references classrooms(id),status text,first_name text,last_name text,preferred_name text);
    create table calendar_blocks(id uuid primary key,school_year_id uuid,type text,start_date date,end_date date);
    create table annual_plans(id uuid primary key,classroom_id uuid,status text,proposal jsonb);
    create table project_slots(id uuid primary key,annual_plan_id uuid,slot_index integer,starts_on date,ends_on date);
    create table learning_experiences(id uuid primary key,classroom_id uuid);
    create table activities(id uuid primary key,experience_id uuid references learning_experiences(id),occurs_on date,title text,status text);
    create table activity_criteria(id uuid primary key,activity_id uuid references activities(id),competency_v4_id text,criterion_text text,details jsonb,status text,performance_id uuid);
    create table performances(id uuid primary key,age_grade_id uuid,official_text text,source_ref text);
    create table evidences(id uuid primary key,student_id uuid references students(id),activity_id uuid references activities(id),criterion_id uuid references activity_criteria(id),observed_at timestamptz,observation_status text,observation_text text,media_path text);
    create table competency_assessments(id uuid primary key,student_id uuid references students(id),competency_v4_id text,period_start date,period_end date,version integer,source_evidence_ids jsonb,source_evidence_snapshot jsonb,details jsonb,generation_metadata jsonb,status text,teacher_confirmed_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
    create table competency_descriptive_conclusions(id uuid primary key,student_id uuid references students(id),competency_v4_id text,assessment_id uuid references competency_assessments(id),period_start date,period_end date,version integer,details jsonb,generation_metadata jsonb,source_assessment_snapshot jsonb,status text,teacher_confirmed_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
  `);
  const migration = await readFile(new URL("../../local-db/migrations/0036_evaluation_periods.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(await readFile(new URL("../../local-db/migrations/0041_period_assessment_drafts.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../../local-db/migrations/0042_period_closure_history.sql", import.meta.url), "utf8"));
  await db.query(`insert into school_years values($1,$2,2026,'2026-03-01','2026-12-31')`, [year, teacher]);
  await db.query(`insert into age_grades values($1,5)`, [ageGrade]);
  await db.query(`insert into classrooms values($1,$2,$3,$4,'Sala Amarilla',false,false),($5,$2,$6,$4,'Otra aula',false,false)`, [classId, year, teacher, ageGrade, otherClass, otherTeacher]);
  await db.query(`insert into students values($1,$2,'active','Ana','Pérez',null),($3,$2,'active','Luis','Rojas',null)`, [studentA, classId, studentB]);
  const blocks = [
    ["2026-03-16", "2026-05-15"], ["2026-05-25", "2026-07-24"],
    ["2026-08-10", "2026-10-09"], ["2026-10-19", "2026-12-18"],
  ];
  for (const [start, end] of blocks) await db.query(`insert into calendar_blocks values(gen_random_uuid(),$1,'instructional',$2::date,$3::date)`, [year, start, end]);
  await db.query(`insert into learning_experiences values(gen_random_uuid(),$1)`, [classId]);
  const experienceId = (await db.query(`select id from learning_experiences where classroom_id=$1`, [classId])).rows[0].id;
  await db.query(`insert into activities values($1,$2,'2026-04-10','Conversamos sobre nuestros juegos','active')`, [activity, experienceId]);
  await db.query(`insert into activity_criteria values($1,$2,'COM_ORAL','Explica una idea durante el juego','{}'::jsonb,'active',null)`, [criterion, activity]);
  for (const [id, date, note] of [[firstEvidence, "2026-04-10", "Propuso un juego y explicó su idea."], ["00000000-0000-4000-8000-000000000702", "2026-04-11", "Escuchó y respondió al grupo."]]) {
    await db.query(`insert into evidences(id,student_id,activity_id,criterion_id,observed_at,observed_on,observation_text) values($1,$2,$3,$4,'2026-06-01T12:00:00Z',$5::date,$6)`, [id, studentA, activity, criterion, date, note]);
  }
  const pending = new Map(), calls = [], responses = [];
  const handle = createPeriodEvaluationRouteHandler({ db, teacherId: teacher, readJson: async (request) => request.body, send: (_response, status, payload) => responses.push({ status, body: payload }), pending, metadataForAudit: (metadata) => metadata, refreshStudentContext: async () => {}, evidenceStorage: { read: async () => ({ data: Buffer.from("image"), mimeType: "image/png" }) }, createProvider: () => ({}), generate: async (input) => { calls.push(input); return { output: input.workflow === "assessment" ? analysis : mockConclusion(), metadata: { model: "mock" } }; } });
  async function call(method, route, body) {
    responses.length = 0;
    const response = { writeHead(status, headers) { this.status = status; this.headers = headers; }, end(data) { this.data = data; } };
    await handle({ request: { method, body }, url: new URL(`http://localhost${route}`), response, origin: null });
    return responses[0] ?? { status: response.status, body: response.data, headers: response.headers };
  }
  return { db, call, calls };
}

test("ficha única, nivel docente, cierre, salidas derivadas y cambio posterior de evidencia", async () => {
  const f = await fixture();
  try {
    const workspace = await f.call("GET", "/api/period-evaluations/workspace");
    assert.equal(workspace.status, 200);
    const period = workspace.body.periods[0];
    const query = `classroomId=${classId}&periodId=${period.id}`;
    const overview = await f.call("GET", `/api/period-evaluations/overview?${query}`);
    assert.equal(overview.status, 200, JSON.stringify(overview.body));
    assert.equal(overview.body.rows.length, 2);
    assert.equal(overview.body.rows.find((row) => row.student_id === studentB).state, "no_evidence");
    assert.equal(overview.body.rows.find((row) => row.student_id === studentA).evidence_count, 2);
    const detail = await f.call("GET", `/api/period-evaluations/detail?${query}&studentId=${studentA}&competencyId=COM_ORAL`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.timeline[0].observed_on, "2026-04-10");
    assert.equal(detail.body.timeline[0].criterion_id, criterion);
    const suggestion = await f.call("POST", "/api/period-evaluations/suggest", { classroomId: classId, periodId: period.id, studentId: studentA, competencyId: "COM_ORAL" });
    assert.equal(suggestion.status, 200);
    assert.equal(suggestion.body.analysis.suggested_level, "A");
    assert.equal(f.calls.length, 2);
    assert.equal(f.calls[1].student_context.teacher_confirmed_findings, undefined);
    assert.match(f.calls[1].teacher_request, /preliminar/);
    const decisionA = { classroomId: classId, periodId: period.id, studentId: studentA, competencyId: "COM_ORAL", evidenceFingerprint: detail.body.evidence_fingerprint, achievementLevel: "B", teacherAnalysis: "En distintos juegos explicó ideas y escuchó al grupo.", conclusionText: "Explica ideas en el juego y sigue aprendiendo a escuchar otras propuestas.", teacherJustification: "Mi revisión de los registros indica que sigue necesitando apoyo para escuchar." };
    assert.equal((await f.call("POST", "/api/period-evaluations/confirm", decisionA)).status, 422);
    assert.equal((await f.call("POST", "/api/period-evaluations/save-draft", { ...decisionA, provisionalLevel: decisionA.achievementLevel })).status, 200);
    const resumed = await f.call("GET", `/api/period-evaluations/detail?${query}&studentId=${studentA}&competencyId=COM_ORAL`);
    assert.equal(resumed.body.draft.provisional_level, "B");
    assert.equal(resumed.body.draft.suggested_level, "A");
    assert.equal((await f.db.query(`select achievement_level from competency_assessments where id=$1`,[resumed.body.draft.id])).rows[0].achievement_level,null);
    assert.equal((await f.call("POST", "/api/period-evaluations/confirm", {...decisionA,teacherAnalysis:"Cambio no guardado"})).status,422);
    const confirmed = await f.call("POST", "/api/period-evaluations/confirm", decisionA);
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
    const persisted = (await f.db.query(`select achievement_level,suggested_level,teacher_justification,level_confirmed_by from competency_assessments where id=$1`, [confirmed.body.assessment_id])).rows[0];
    assert.equal(persisted.achievement_level, "B"); assert.equal(persisted.suggested_level, "A"); assert.equal(persisted.level_confirmed_by, teacher); assert.match(persisted.teacher_justification, /sigue necesitando apoyo/);
    assert.equal((await f.call("POST", "/api/period-evaluations/close", { classroomId: classId, periodId: period.id })).status, 422);
    for (const [id, note] of [["00000000-0000-4000-8000-000000000703", "Explicó cómo jugar."], ["00000000-0000-4000-8000-000000000704", "Respondió a una propuesta."]]) await f.db.query(`insert into evidences(id,student_id,activity_id,criterion_id,observed_at,observed_on,observation_text) values($1,$2,$3,$4,now(),'2026-04-10',$5)`, [id, studentB, activity, criterion, note]);
    const second = await f.call("GET", `/api/period-evaluations/detail?${query}&studentId=${studentB}&competencyId=COM_ORAL`);
    const decisionB={ classroomId: classId, periodId: period.id, studentId: studentB, competencyId: "COM_ORAL", evidenceFingerprint: second.body.evidence_fingerprint, achievementLevel: "A", teacherAnalysis: "Explicó su juego y respondió a un compañero.", conclusionText: "Explica sus ideas y escucha propuestas durante el juego." };
    assert.equal((await f.call("POST","/api/period-evaluations/save-draft",{...decisionB,provisionalLevel:"A"})).status,200);
    const confirmedSecond = await f.call("POST", "/api/period-evaluations/confirm", decisionB);
    assert.equal(confirmedSecond.status, 200, JSON.stringify(confirmedSecond.body));
    const firstClose=await f.call("POST", "/api/period-evaluations/close", { classroomId: classId, periodId: period.id });
    assert.equal(firstClose.status, 200);
    assert.equal(firstClose.body.version,1);
    const originalManifest=(await f.db.query(`select manifest from period_closure_versions where id=$1`,[firstClose.body.id])).rows[0].manifest;
    assert.equal(originalManifest.entries.length,2);
    assert.ok(originalManifest.entries.some((entry)=>entry.assessment_id===confirmed.body.assessment_id && entry.achievement_level==="B"));
    const report = await f.call("GET", `/api/period-evaluations/progress-report?${query}&studentId=${studentA}`);
    assert.equal(report.status, 200); assert.equal(report.body.competencies[0].achievement_level, "B");
    const csv = await f.call("GET", `/api/period-evaluations/consolidated.csv?${query}`);
    assert.equal(csv.status, 200); assert.match(csv.body, /Ana Pérez/);
    await f.db.query(`update evidences set observation_text='Nota corregida' where id=$1`, [firstEvidence]);
    const stale = await f.call("GET", `/api/period-evaluations/overview?${query}`);
    assert.equal(stale.body.rows.find((row) => row.student_id === studentA).state, "needs_review");
    assert.equal(stale.body.closure.current, false);
    assert.equal((await f.call("GET", `/api/period-evaluations/progress-report?${query}&studentId=${studentA}`)).status, 422);
    assert.equal((await f.call("GET", `/api/period-evaluations/detail?classroomId=${otherClass}&periodId=${period.id}&studentId=${studentA}&competencyId=COM_ORAL`)).status, 422);
    const revised=await f.call("GET",`/api/period-evaluations/detail?${query}&studentId=${studentA}&competencyId=COM_ORAL`);
    const decisionV2={...decisionA,evidenceFingerprint:revised.body.evidence_fingerprint,teacherAnalysis:"La docente revisó la nota corregida y el conjunto de observaciones."};
    assert.equal((await f.call("POST","/api/period-evaluations/save-draft",{...decisionV2,provisionalLevel:"B"})).status,200);
    assert.equal((await f.call("POST","/api/period-evaluations/confirm",decisionV2)).status,200);
    const secondClose=await f.call("POST","/api/period-evaluations/close",{classroomId:classId,periodId:period.id});
    assert.equal(secondClose.status,200,JSON.stringify(secondClose.body));
    assert.equal(secondClose.body.version,2);
    assert.deepEqual((await f.db.query(`select manifest from period_closure_versions where id=$1`,[firstClose.body.id])).rows[0].manifest,originalManifest);
    await assert.rejects(f.db.query(`update period_closure_versions set manifest='{}'::jsonb where id=$1`,[firstClose.body.id]),/inmutable/);
  } finally { await f.db.close(); }
});

test("una competencia del plan anual aparece sin evidencias y se puede excluir con motivo", async () => {
  const f = await fixture();
  try {
    await f.db.query(`insert into annual_plans values(gen_random_uuid(),$1,'active',$2::jsonb)`, [classId, JSON.stringify({ proposed_experiences: [{ primary_competency_ids: ["MAT_CANTIDAD"], possible_secondary_competency_ids: [] }] })]);
    await f.db.query(`insert into project_slots values(gen_random_uuid(),(select id from annual_plans where classroom_id=$1),1,'2026-04-13','2026-04-24')`, [classId]);
    const period = (await f.call("GET", "/api/period-evaluations/workspace")).body.periods[0];
    const query = `classroomId=${classId}&periodId=${period.id}`;
    const overview = await f.call("GET", `/api/period-evaluations/overview?${query}`);
    assert.equal(overview.status, 200);
    assert.equal(overview.body.rows.filter((row) => row.competency_id === "MAT_CANTIDAD").length, 2);
    assert.ok(overview.body.rows.filter((row) => row.competency_id === "MAT_CANTIDAD").every((row) => row.state === "no_evidence"));
    const excluded = await f.call("POST", "/api/period-evaluations/scope", { classroomId: classId, periodId: period.id, competencyId: "MAT_CANTIDAD", included: false, reason: "La propuesta se reprogramó." });
    assert.equal(excluded.status, 200);
    const after = await f.call("GET", `/api/period-evaluations/overview?${query}`);
    assert.ok(after.body.rows.every((row) => row.competency_id !== "MAT_CANTIDAD"));
    const cannotHideObserved = await f.call("POST", "/api/period-evaluations/scope", { classroomId: classId, periodId: period.id, competencyId: "COM_ORAL", included: false, reason: "No se evaluó." });
    assert.equal(cannotHideObserved.status, 422);
  } finally { await f.db.close(); }
});

test("información insuficiente queda guardada sin nivel y no se convierte en C", async () => {
  const analysis = { ...mockAnalysis(), information_status: "insufficient", suggested_level: null, suggestion_reason: null, insufficiency_reason: "Los registros todavía no muestran oportunidades variadas.", evidence_overview: "Hay dos registros de una misma situación.", observable_patterns: [], strengths_and_advances: [], support_needs: [], next_opportunities: ["Observar en otros juegos."], teacher_questions: [] };
  const f = await fixture({ analysis });
  try {
    const period = (await f.call("GET", "/api/period-evaluations/workspace")).body.periods[0];
    const query = `classroomId=${classId}&periodId=${period.id}`;
    const suggestion = await f.call("POST", "/api/period-evaluations/suggest", { classroomId: classId, periodId: period.id, studentId: studentA, competencyId: "COM_ORAL" });
    assert.equal(suggestion.status, 200, JSON.stringify(suggestion.body));
    assert.equal(suggestion.body.analysis.suggested_level, null);
    assert.equal(f.calls.length, 1);
    const overview = await f.call("GET", `/api/period-evaluations/overview?${query}`);
    assert.equal(overview.body.rows.find((row) => row.student_id === studentA && row.competency_id === "COM_ORAL").state, "insufficient_information");
    const draft = (await f.db.query(`select status,achievement_level from competency_assessments where student_id=$1 and competency_v4_id='COM_ORAL'`, [studentA])).rows[0];
    assert.equal(draft.status, "draft"); assert.equal(draft.achievement_level, null);
  } finally { await f.db.close(); }
});
