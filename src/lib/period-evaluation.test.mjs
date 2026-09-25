import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPeriodEvaluationRouteHandler } from "../../scripts/period-evaluation-routes.mjs";
import { defaultEvaluationPeriods } from "./period-evaluation-service.mjs";
import { loadPlanningFeedback,planningFeedbackText } from "./planning-feedback.mjs";
import { projectPeriodClosureDocument } from "./period-closure-history.mjs";

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

test("cobertura deriva registros por niño y competencia sin convertir ausencias en niveles", async () => {
  const f=await fixture();
  const period=(await f.call("GET","/api/period-evaluations/workspace")).body.periods[0];
  const result=await f.call("GET",`/api/period-evaluations/coverage?classroomId=${classId}&periodId=${period.id}`);
  assert.equal(result.status,200,JSON.stringify(result.body));
  const observed=result.body.rows.find((row)=>row.student_id===studentA&&row.competency_id==="COM_ORAL");
  const unobserved=result.body.rows.find((row)=>row.student_id===studentB&&row.competency_id==="COM_ORAL");
  assert.equal(observed.evidence_count,2);
  assert.equal(observed.activity_count,1);
  assert.equal(unobserved.evidence_count,0);
  assert.equal(unobserved.coverage_state,"no_records");
  assert.equal(unobserved.assessment_state,"not_assessed");
  assert.equal(unobserved.planned,true);
  assert.ok(result.body.by_competency.length>1);
  await f.db.query(`insert into diagnostic_experience_observations values(gen_random_uuid(),$1,$2,'COM_ORAL','2026-04-12T12:00:00Z','Contó su idea en la asamblea.','demonstrated','asamblea','Asamblea','Cuenta una idea')`,[classId,studentB]);
  const updated=await f.call("GET",`/api/period-evaluations/coverage?classroomId=${classId}&periodId=${period.id}`);
  const diagnosticCell=updated.body.rows.find((row)=>row.student_id===studentB&&row.competency_id==="COM_ORAL");
  assert.equal(diagnosticCell.coverage_state,"building_evidence");
  assert.equal(diagnosticCell.diagnostic_count,1);
  assert.equal(diagnosticCell.evidence_count,0);
  assert.equal(diagnosticCell.assessment_state,"not_assessed");
  const history=await f.call("GET",`/api/period-evaluations/coverage/detail?classroomId=${classId}&periodId=${period.id}&studentId=${studentB}&competencyId=COM_ORAL`);
  assert.equal(history.status,200,JSON.stringify(history.body));
  assert.equal(history.body.timeline[0].source_type,"diagnostic_guided");
  assert.equal((await f.call("GET",`/api/period-evaluations/coverage?classroomId=${otherClass}&periodId=${period.id}`)).status,422);
});

test("contexto para planificar verifica docente, aula y período y no expone expedientes",async()=>{
  const f=await fixture();
  const period=(await f.call("GET","/api/period-evaluations/workspace")).body.periods[0];
  const feedback=await loadPlanningFeedback(f.db,{teacherId:teacher,classroomId:classId,periodId:period.id});
  assert.equal(feedback.students_total,2);
  assert.equal(feedback.confirmed_assessments,0);
  assert.doesNotMatch(JSON.stringify(feedback),/Ana|Luis|Pérez|Rojas|Propuso un juego|observación/);
  assert.match(planningFeedbackText(feedback),/sin registro/);
  await assert.rejects(()=>loadPlanningFeedback(f.db,{teacherId:otherTeacher,classroomId:classId,periodId:period.id}),/Aula no disponible/);
  await assert.rejects(()=>loadPlanningFeedback(f.db,{teacherId:teacher,classroomId:otherClass,periodId:period.id}),/Aula no disponible/);
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
  await db.exec(`create table profiles(user_id uuid primary key,display_name text);
    create table institution_profiles(owner_user_id uuid primary key,display_name text,ugel text);
    alter table classrooms add column institution_name text not null default 'Jardín de prueba';
    alter table competency_assessments add column revision bigint not null default 1;
    create function test_bump_revision() returns trigger as $$ begin new.revision=old.revision+1;return new;end $$ language plpgsql;
    create trigger assessment_revision before update on competency_assessments for each row execute function test_bump_revision();`);
  await db.exec(`create table diagnostic_experience_observations(id uuid primary key,classroom_id uuid,student_id uuid,
    competency_v4_id text,observed_at timestamptz,observation_text text,observation_status text,experience_id text,
    experience_title_snapshot text,aspect_prompt_snapshot text);
    create table diagnostic_spontaneous_observations(id uuid primary key,classroom_id uuid,student_id uuid,
    competency_v4_ids text[],observed_at timestamptz,observation_text text,context_label text,support_status text,
    classification_status text);`);
  await db.query(`insert into profiles values($1,'Docente de prueba'),($2,'Otra docente')`,[teacher,otherTeacher]);
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
  const pending = new Map(), calls = [];
  const handle = createPeriodEvaluationRouteHandler({ db, teacherId: teacher, readJson: async (request) => request.body, send: (response, status, payload) => { response.result={status,body:payload}; }, pending, metadataForAudit: (metadata) => metadata, refreshStudentContext: async () => {}, evidenceStorage: { read: async () => ({ data: Buffer.from("image"), mimeType: "image/png" }) }, createProvider: () => ({}), generate: async (input) => { calls.push(input); return { output: input.workflow === "assessment" ? analysis : mockConclusion(), metadata: { model: "mock" } }; } });
  async function call(method, route, body) {
    const response = { writeHead(status, headers) { this.status = status; this.headers = headers; }, end(data) { this.data = data; } };
    await handle({ request: { method, body }, url: new URL(`http://localhost${route}`), response, origin: null });
    return response.result ?? { status: response.status, body: response.data, headers: response.headers };
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
    assert.equal((await f.call("POST", "/api/period-evaluations/confirm", {...decisionA,expectedDraftRevision:suggestion.body.draft_revision})).status, 422);
    assert.equal((await f.call("POST", "/api/period-evaluations/save-draft", { ...decisionA, expectedDraftRevision:suggestion.body.draft_revision, provisionalLevel: decisionA.achievementLevel })).status, 200);
    const resumed = await f.call("GET", `/api/period-evaluations/detail?${query}&studentId=${studentA}&competencyId=COM_ORAL`);
    assert.equal(resumed.body.draft.provisional_level, "B");
    assert.equal(resumed.body.draft.suggested_level, "A");
    assert.equal((await f.db.query(`select achievement_level from competency_assessments where id=$1`,[resumed.body.draft.id])).rows[0].achievement_level,null);
    assert.equal((await f.call("POST", "/api/period-evaluations/confirm", {...decisionA,expectedDraftRevision:resumed.body.draft.revision,teacherAnalysis:"Cambio no guardado"})).status,422);
    const confirmed = await f.call("POST", "/api/period-evaluations/confirm", {...decisionA,expectedDraftRevision:resumed.body.draft.revision});
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
    const persisted = (await f.db.query(`select achievement_level,suggested_level,teacher_justification,level_confirmed_by from competency_assessments where id=$1`, [confirmed.body.assessment_id])).rows[0];
    assert.equal(persisted.achievement_level, "B"); assert.equal(persisted.suggested_level, "A"); assert.equal(persisted.level_confirmed_by, teacher); assert.match(persisted.teacher_justification, /sigue necesitando apoyo/);
    const incomplete=await f.call("GET",`/api/period-evaluations/overview?${query}`);
    assert.equal((await f.call("POST", "/api/period-evaluations/close", { classroomId: classId, periodId: period.id,
      expectedCurrentVersionId:incomplete.body.closure.current_version_id,expectedSourceFingerprint:incomplete.body.closure.source_fingerprint })).status, 422);
    for (const [id, note] of [["00000000-0000-4000-8000-000000000703", "Explicó cómo jugar."], ["00000000-0000-4000-8000-000000000704", "Respondió a una propuesta."]]) await f.db.query(`insert into evidences(id,student_id,activity_id,criterion_id,observed_at,observed_on,observation_text) values($1,$2,$3,$4,now(),'2026-04-10',$5)`, [id, studentB, activity, criterion, note]);
    const second = await f.call("GET", `/api/period-evaluations/detail?${query}&studentId=${studentB}&competencyId=COM_ORAL`);
    const decisionB={ classroomId: classId, periodId: period.id, studentId: studentB, competencyId: "COM_ORAL", evidenceFingerprint: second.body.evidence_fingerprint, achievementLevel: "A", teacherAnalysis: "Explicó su juego y respondió a un compañero.", conclusionText: "Explica sus ideas y escucha propuestas durante el juego." };
    const savedSecond=await f.call("POST","/api/period-evaluations/save-draft",{...decisionB,expectedDraftRevision:null,provisionalLevel:"A"});
    assert.equal(savedSecond.status,200,JSON.stringify(savedSecond.body));
    const confirmedSecond = await f.call("POST", "/api/period-evaluations/confirm", {...decisionB,expectedDraftRevision:savedSecond.body.draft_revision});
    assert.equal(confirmedSecond.status, 200, JSON.stringify(confirmedSecond.body));
    const beforeFirstClose=await f.call("GET",`/api/period-evaluations/overview?${query}`);
    const firstClose=await f.call("POST", "/api/period-evaluations/close", { classroomId: classId, periodId: period.id,
      expectedCurrentVersionId:beforeFirstClose.body.closure.current_version_id,expectedSourceFingerprint:beforeFirstClose.body.closure.source_fingerprint });
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
    const savedV2=await f.call("POST","/api/period-evaluations/save-draft",{...decisionV2,expectedDraftRevision:revised.body.draft?.revision??null,provisionalLevel:"B"});
    assert.equal(savedV2.status,200,JSON.stringify(savedV2.body));
    assert.equal((await f.call("POST","/api/period-evaluations/confirm",{...decisionV2,expectedDraftRevision:savedV2.body.draft_revision})).status,200);
    const beforeSecondClose=await f.call("GET",`/api/period-evaluations/overview?${query}`);
    const secondClose=await f.call("POST","/api/period-evaluations/close",{classroomId:classId,periodId:period.id,
      expectedCurrentVersionId:beforeSecondClose.body.closure.current_version_id,expectedSourceFingerprint:beforeSecondClose.body.closure.source_fingerprint});
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

test("dos confirmaciones de la misma revisión dejan una sola evaluación oficial", async () => {
  const f=await fixture();
  try {
    const period=(await f.call("GET","/api/period-evaluations/workspace")).body.periods[0];
    const query=`classroomId=${classId}&periodId=${period.id}&studentId=${studentA}&competencyId=COM_ORAL`;
    const detail=(await f.call("GET",`/api/period-evaluations/detail?${query}`)).body;
    const body={classroomId:classId,periodId:period.id,studentId:studentA,competencyId:"COM_ORAL",
      evidenceFingerprint:detail.evidence_fingerprint,achievementLevel:"A",provisionalLevel:"A",
      teacherAnalysis:"Explicó ideas en dos juegos.",conclusionText:"Explica sus ideas y escucha las propuestas del grupo.",expectedDraftRevision:null};
    const saved=await f.call("POST","/api/period-evaluations/save-draft",body);
    assert.equal(saved.status,200,JSON.stringify(saved.body));
    const attempts=await Promise.all([1,2].map(()=>f.call("POST","/api/period-evaluations/confirm",{
      ...body,expectedDraftRevision:saved.body.draft_revision})));
    assert.deepEqual(attempts.map((x)=>x.status).sort(),[200,409]);
    assert.equal(attempts.find((x)=>x.status===409).body.error,"version_conflict");
    const count=(await f.db.query(`select count(*)::int as n from competency_assessments where student_id=$1 and evaluation_period_id=$2 and status='active'`,[studentA,period.id])).rows[0].n;
    assert.equal(count,1);
  } finally {await f.db.close();}
});

test("evidencia posterior invalida la huella y dos cierres simultáneos crean solo una versión", async () => {
  const f=await fixture();
  try {
    const period=(await f.call("GET","/api/period-evaluations/workspace")).body.periods[0];
    const base={classroomId:classId,periodId:period.id,competencyId:"COM_ORAL",achievementLevel:"A",provisionalLevel:"A",
      teacherAnalysis:"Comparó ideas durante el juego.",conclusionText:"Explica sus ideas en las conversaciones del aula.",
      teacherJustification:"La docente revisó el contexto y confirmó esta valoración preliminar."};
    const detailA=(await f.call("GET",`/api/period-evaluations/detail?classroomId=${classId}&periodId=${period.id}&studentId=${studentA}&competencyId=COM_ORAL`)).body;
    const stale={...base,studentId:studentA,evidenceFingerprint:detailA.evidence_fingerprint,expectedDraftRevision:null};
    const savedA=await f.call("POST","/api/period-evaluations/save-draft",stale);
    assert.equal(savedA.status,200,JSON.stringify(savedA.body));
    await f.db.query(`insert into evidences(id,student_id,activity_id,criterion_id,observed_at,observed_on,observation_text)
      values(gen_random_uuid(),$1,$2,$3,now(),'2026-04-12','Nueva observación')`,[studentA,activity,criterion]);
    const invalid=await f.call("POST","/api/period-evaluations/confirm",{...stale,expectedDraftRevision:savedA.body.draft_revision});
    assert.equal(invalid.status,409,JSON.stringify(invalid.body));
    assert.equal(invalid.body.error,"version_conflict");
    assert.equal((await f.db.query(`select count(*)::int as n from competency_assessments where student_id=$1 and status='active'`,[studentA])).rows[0].n,0);
    for(const id of [studentA,studentB]) {
      if(id===studentB) await f.db.query(`insert into evidences(id,student_id,activity_id,criterion_id,observed_at,observed_on,observation_text)
        values(gen_random_uuid(),$1,$2,$3,now(),'2026-04-12','Explicó una idea')`,[id,activity,criterion]);
      const detail=(await f.call("GET",`/api/period-evaluations/detail?classroomId=${classId}&periodId=${period.id}&studentId=${id}&competencyId=COM_ORAL`)).body;
      const body={...base,studentId:id,evidenceFingerprint:detail.evidence_fingerprint,expectedDraftRevision:detail.draft?.revision??null};
      const saved=await f.call("POST","/api/period-evaluations/save-draft",body);
      assert.equal(saved.status,200,JSON.stringify(saved.body));
      const confirmed=await f.call("POST","/api/period-evaluations/confirm",{...body,expectedDraftRevision:saved.body.draft_revision});
      assert.equal(confirmed.status,200,JSON.stringify(confirmed.body));
    }
    await f.db.query(`insert into institution_profiles(owner_user_id,display_name,ugel) values($1,'Jardín del cierre','UGEL 01')`,[teacher]);
    const overview=(await f.call("GET",`/api/period-evaluations/overview?classroomId=${classId}&periodId=${period.id}`)).body;
    const closure={classroomId:classId,periodId:period.id,expectedCurrentVersionId:overview.closure.current_version_id,
      expectedSourceFingerprint:overview.closure.source_fingerprint};
    const attempts=await Promise.all([1,2].map(()=>f.call("POST","/api/period-evaluations/close",closure)));
    assert.deepEqual(attempts.map((x)=>x.status).sort(),[200,409],JSON.stringify(attempts));
    assert.equal((await f.db.query(`select count(*)::int as n from period_closure_versions where evaluation_period_id=$1`,[period.id])).rows[0].n,1);
    const manifest=(await f.db.query(`select manifest from period_closure_versions where evaluation_period_id=$1`,[period.id])).rows[0].manifest;
    assert.equal(manifest.context.teacher_id,teacher);
    assert.equal(manifest.context.teacher_name,"Docente de prueba");
    assert.equal(manifest.context.institution_name,"Jardín del cierre");
    assert.equal(manifest.context.ugel,"UGEL 01");
    assert.equal(manifest.context.section,"Sala Amarilla");
    assert.equal(manifest.context.school_year,2026);
    assert.ok(manifest.context.closed_at);
    assert.equal(manifest.entries.length,2);
    await f.db.query(`update institution_profiles set display_name='Nombre posterior',ugel='UGEL 99' where owner_user_id=$1`,[teacher]);
    const projection=projectPeriodClosureDocument({id:attempts.find((x)=>x.status===200).body.id,version:1,
      manifest,label:"Período cambiado",starts_on:"2027-01-01",ends_on:"2027-02-01",confirmed_at:new Date(),
      year:2027,section:"Sección posterior",institution_name:"Nombre posterior",confirmed_by:teacher});
    assert.equal(projection.institution_name,"Jardín del cierre");
    assert.equal(projection.ugel,"UGEL 01");
    assert.equal(projection.title,`Cierre de evaluación · ${period.label}`);
    assert.equal(projection.period_start,"2026-03-16");
  } finally {await f.db.close();}
});
