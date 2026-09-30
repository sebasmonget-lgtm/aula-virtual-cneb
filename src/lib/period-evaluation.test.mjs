import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPeriodEvaluationRouteHandler } from "../../scripts/period-evaluation-routes.mjs";
import { defaultEvaluationPeriods } from "./period-evaluation-service.mjs";
import { loadPlanningFeedback,planningFeedbackText } from "./planning-feedback.mjs";
import { projectPeriodClosureDocument } from "./period-closure-history.mjs";
import { loadAssessmentMasterSources } from "../../scripts/assessment-master-routes.mjs";

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
const firstPeriod = "00000000-0000-4000-8000-000000000801";

const mockAnalysis = () => ({ competency_id: "COM_ORAL", information_status: "sufficient", evidence_overview: "En dos juegos explicó sus ideas y escuchó al grupo.", observable_patterns: ["Explicó una decisión."], strengths_and_advances: ["Compartió ideas."], support_needs: [], next_opportunities: ["Conversar en grupos pequeños."], teacher_questions: [], insufficiency_reason: null, caution: "La docente debe contrastar los registros." });
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
  const onlyAntecedent=await f.call("GET",`/api/period-evaluations/detail?classroomId=${classId}&periodId=${period.id}&studentId=${studentB}&competencyId=COM_ORAL`);
  assert.equal(onlyAntecedent.body.evidence_count,0);
  assert.equal(onlyAntecedent.body.timeline.length,0);
  assert.equal(onlyAntecedent.body.diagnostic_antecedents.length,1);
  assert.equal(onlyAntecedent.body.state,"observation_pending");
  await f.db.query(`insert into diagnostic_experience_observations values(gen_random_uuid(),$1,$2,'COM_ORAL','2026-03-12T12:00:00Z','Explicó otra idea.','demonstrated','asamblea','Asamblea de marzo','Cuenta una idea')`,[classId,studentA]);
  const withBoth=await f.call("GET",`/api/period-evaluations/detail?classroomId=${classId}&periodId=${period.id}&studentId=${studentA}&competencyId=COM_ORAL`);
  assert.equal(withBoth.body.evidence_count,2);
  assert.equal(withBoth.body.timeline.length,2);
  assert.equal(withBoth.body.diagnostic_antecedents.length,1);
  const today=await f.call("GET",`/api/period-evaluations/observe-today?activityId=${activity}`);
  assert.equal(today.status,200,JSON.stringify(today.body));
  assert.ok(today.body.suggestions.some((item)=>item.student_id===studentB&&item.reason));
  assert.equal((await f.call("GET",`/api/period-evaluations/observe-today?activityId=${"00000000-0000-4000-8000-000000000999"}`)).status,404);
  assert.equal((await f.call("GET",`/api/period-evaluations/coverage?classroomId=${otherClass}&periodId=${period.id}`)).status,422);
});

test("contexto para planificar verifica docente, aula y período y no expone expedientes",async()=>{
  const f=await fixture();
  const period=(await f.call("GET","/api/period-evaluations/workspace")).body.periods[0];
  const feedback=await loadPlanningFeedback(f.db,{teacherId:teacher,classroomId:classId,periodId:period.id});
  assert.equal(feedback.students_total,2);
  assert.equal(feedback.confirmed_assessments,0);
  assert.doesNotMatch(JSON.stringify(feedback),/Ana|Luis|Pérez|Rojas|Propuso un juego/);
  assert.ok(feedback.suggested_adjustments.every((item)=>item.reason&&item.suggestion));
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

async function fixture({ analysis = mockAnalysis(), jsonbPending = false } = {}) {
  const db = await PGlite.create();
  await db.exec(`
    create table school_years(id uuid primary key,owner_id uuid,year integer,starts_on date,ends_on date);
    create table age_grades(id uuid primary key,age_years integer);
    create table classrooms(id uuid primary key,school_year_id uuid references school_years(id),teacher_id uuid,age_grade_id uuid references age_grades(id),section text,castellano_l2_applicable boolean default false,religion_applicable boolean default false);
    create table students(id uuid primary key,classroom_id uuid references classrooms(id),status text,first_name text,last_name text,preferred_name text);
    create table calendar_blocks(id uuid primary key,school_year_id uuid,type text,start_date date,end_date date);
    create table annual_plans(id uuid primary key,classroom_id uuid,status text,proposal jsonb);
    create table project_slots(id uuid primary key,annual_plan_id uuid,slot_index integer,starts_on date,ends_on date);
    create table learning_experiences(id uuid primary key,classroom_id uuid,status text,starts_on date,ends_on date,revision integer default 1,details jsonb default '{}'::jsonb);
    create table activities(id uuid primary key,experience_id uuid references learning_experiences(id),occurs_on date,title text,status text,revision integer default 1,details jsonb default '{}'::jsonb);
    create table activity_criteria(id uuid primary key,activity_id uuid references activities(id),competency_v4_id text,criterion_text text,details jsonb,status text,performance_id uuid,revision integer default 1);
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
    create table experience_formal_contents(id uuid primary key,experience_id uuid);
    alter table classrooms add column institution_name text not null default 'Jardín de prueba';
    alter table competency_assessments add column revision bigint not null default 1;
    create function test_bump_revision() returns trigger as $$ begin new.revision=old.revision+1;return new;end $$ language plpgsql;
    create trigger assessment_revision before update on competency_assessments for each row execute function test_bump_revision();`);
  await db.exec(await readFile(new URL("../../local-db/migrations/0054_assessment_masters.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../../local-db/migrations/0057_period_assessment_closure.sql", import.meta.url), "utf8"));
  await db.exec(`create table diagnostic_experience_observations(id uuid primary key,classroom_id uuid,student_id uuid,
    competency_v4_id text,observed_at timestamptz,observation_text text,observation_status text,experience_id text,
    experience_title_snapshot text,aspect_prompt_snapshot text);
    create table diagnostic_spontaneous_observations(id uuid primary key,classroom_id uuid,student_id uuid,
    competency_v4_ids text[],observed_at timestamptz,observation_text text,context_label text,support_status text,
    classification_status text);`);
  await db.exec(`create table class_schedule_entries(id uuid primary key,classroom_id uuid,activity_id uuid);
    create table daily_execution_logs(id uuid primary key,schedule_entry_id uuid,execution_date date,status text);`);
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
  await db.query(`insert into evaluation_periods(id,school_year_id,kind,ordinal,label,starts_on,ends_on) values($1,$2,'bimester',1,'Bimestre 1','2026-03-16','2026-05-15')`,[firstPeriod,year]);
  for (const [ordinal,start,end] of [[2,"2026-05-25","2026-07-24"],[3,"2026-08-10","2026-10-09"],[4,"2026-10-19","2026-12-18"]])
    await db.query(`insert into evaluation_periods(id,school_year_id,kind,ordinal,label,starts_on,ends_on) values(gen_random_uuid(),$1,'bimester',$2,$3,$4::date,$5::date)`,[year,ordinal,`Bimestre ${ordinal}`,start,end]);
  await db.query(`insert into learning_experiences(id,classroom_id,status,starts_on,ends_on,details) values(gen_random_uuid(),$1,'active','2026-03-16','2026-05-15',$2::jsonb)`, [classId,JSON.stringify({flow_version:"project-master-v2",project_master:{activity_blueprints:[]}})]);
  const experienceId = (await db.query(`select id from learning_experiences where classroom_id=$1`, [classId])).rows[0].id;
  await db.query(`insert into activities(id,experience_id,occurs_on,title,status,details) values($1,$2,'2026-04-10','Conversamos sobre nuestros juegos','active',$3::jsonb)`, [activity, experienceId,JSON.stringify({purpose:"Comunicar ideas durante el juego."})]);
  await db.query(`insert into activity_criteria(id,activity_id,competency_v4_id,criterion_text,details,status,performance_id) values($1,$2,'COM_ORAL','Explica una idea durante el juego',$3::jsonb,'active',null)`, [criterion, activity,JSON.stringify({expected_evidence:"Explicación oral",observation_focus:["Relación entre su idea y el juego"]})]);
  for (const [id, date, note] of [[firstEvidence, "2026-04-10", "Propuso un juego y explicó su idea."], ["00000000-0000-4000-8000-000000000702", "2026-04-11", "Escuchó y respondió al grupo."]]) {
    await db.query(`insert into evidences(id,student_id,activity_id,criterion_id,observed_at,observed_on,observation_text) values($1,$2,$3,$4,'2026-06-01T12:00:00Z',$5::date,$6)`, [id, studentA, activity, criterion, date, note]);
  }
  const currentContext = { source_fingerprint: "confirmed-classroom-context-1" };
  const masterSource=await loadAssessmentMasterSources(db,{id:classId,school_year_id:year,context_v4:currentContext},{id:firstPeriod,label:"Bimestre 1",starts_on:"2026-03-16",ends_on:"2026-05-15"});
  const masterDetails={period_summary:"Se trabajó la comunicación oral en situaciones de juego.",competencies:[{competency_id:"COM_ORAL",short_label:"Se comunica",area:"Comunicación",assessment_focus:"Cómo explica ideas en las situaciones propuestas.",criteria_worked:["Explica sus ideas."],relevant_evidence:["Explicaciones registradas."],patterns_to_consider:["Respuestas en distintas oportunidades."],progress_signals:["Amplía sus explicaciones."],support_signals:["Necesita preguntas abiertas."],insufficient_information_rules:["Una respuesta aislada no es suficiente."],contradiction_handling:"Conservar diferencias y consultar a la docente.",context_considerations:["Apoyos ofrecidos."],teacher_questions:["¿Ocurrió en otra situación?"],prohibited_inferences:["No calificar una observación aislada."],assessment_guidance:"Revisar el conjunto antes de valorar."}]};
  await db.query(`insert into assessment_masters(id,classroom_id,evaluation_period_id,version,status,details,source_snapshot,created_by,teacher_confirmed_at) values(gen_random_uuid(),$1,$2,1,'active',$3::jsonb,$4::jsonb,$5,now())`,[classId,firstPeriod,JSON.stringify(masterDetails),JSON.stringify(masterSource.snapshot),teacher]);
  const pending = new Map(), calls = [];
  if (jsonbPending) pending.set = async (key, value) => {
    const copy = (await db.query('select $1::jsonb as payload', [JSON.stringify(value)])).rows[0].payload;
    return Map.prototype.set.call(pending, key, copy);
  };
  // This reduced-schema fixture exercises the historical period routes; the F5–F8
  // ordinary-observation source has its own tests and tables in the full schema.
  const handle = createPeriodEvaluationRouteHandler({ db, teacherId: teacher, includeOrdinary: false, loadClassroomContext: async () => currentContext, readJson: async (request) => request.body, send: (response, status, payload) => { response.result={status,body:payload}; }, pending, metadataForAudit: (metadata) => metadata, refreshStudentContext: async () => {}, evidenceStorage: { read: async () => ({ data: Buffer.from("image"), mimeType: "image/png" }) }, createProvider: () => ({}), generate: async (input) => { calls.push(input); return { output: input.workflow === "assessment" ? analysis : mockConclusion(), metadata: { model: "mock" } }; } });
  async function call(method, route, body) {
    const response = { writeHead(status, headers) { this.status = status; this.headers = headers; }, end(data) { this.data = data; } };
    await handle({ request: { method, body }, url: new URL(`http://localhost${route}`), response, origin: null });
    return response.result ?? { status: response.status, body: response.data, headers: response.headers };
  }
  return { db, call, calls, currentContext, pending };
}

test("conclusión confirma snapshot recargado de JSONB pero rechaza valores cambiados", async () => {
  const f = await fixture({ jsonbPending: true });
  try {
    await f.db.query("update evidences set observation_text='Ana escucha a Luis y propone alternar.' where id=$1",[firstEvidence]);
    const base = { classroomId: classId, periodId: firstPeriod, studentId: studentA, competencyId: "COM_ORAL" };
    const detail = (await f.call("GET", `/api/period-evaluations/detail?classroomId=${classId}&periodId=${firstPeriod}&studentId=${studentA}&competencyId=COM_ORAL`)).body;
    const decision = { ...base, evidenceFingerprint: detail.evidence_fingerprint, provisionalLevel: "B", achievementLevel: "B",
      teacherAnalysis: "Explica sus ideas en dos situaciones con apoyos diferentes.", teacherJustification: "Dos registros contextualizados, contrastados por la docente.", expectedDraftRevision: null };
    const saved = await f.call("POST", "/api/period-evaluations/save-draft", decision);
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    const assessment = await f.call("POST", "/api/period-evaluations/confirm", { ...decision, expectedDraftRevision: saved.body.draft_revision });
    assert.equal(assessment.status, 200, JSON.stringify(assessment.body));
    await confirmGeneratedConclusion(f, firstPeriod, studentA);
    assert.doesNotMatch(JSON.stringify(f.calls.find(item=>item.workflow==='descriptive_conclusion')), /\b(?:Ana|Luis|Pérez|Rojas)\b/);
    const another = await f.call("POST", "/api/period-evaluations/conclusion/suggest", base);
    const item = f.pending.get(another.body.generation_id);
    item.source_assessment_snapshot.achievement_level = "A";
    const stale = await f.call("POST", "/api/period-evaluations/conclusion/confirm", { ...base, generationId: another.body.generation_id, proposal: another.body.proposal });
    assert.equal(stale.status, 409, JSON.stringify(stale.body));
    assert.equal((await f.db.query("select count(*)::int as n from competency_descriptive_conclusions where status='active'")).rows[0].n, 1);
  } finally { await f.db.close(); }
});

test("el análisis reutiliza la huella completa del aula y rechaza cambios reales de contexto", async () => {
  const f = await fixture();
  try {
    const selection = { classroomId: classId, periodId: firstPeriod, studentId: studentA, competencyId: "COM_ORAL" };
    await f.db.query("update evidences set observation_text='Ana escucha a Luis Rojas y acuerdan turnos.' where id=$1", [firstEvidence]);
    const current = await f.call("POST", "/api/period-evaluations/suggest", selection);
    assert.equal(current.status, 200, JSON.stringify(current.body));
    assert.equal(f.calls.length, 1);
    assert.doesNotMatch(JSON.stringify(f.calls[0]), /\b(?:Ana|Luis|Pérez|Rojas)\b/);
    f.currentContext.source_fingerprint = "confirmed-classroom-context-2";
    const stale = await f.call("POST", "/api/period-evaluations/suggest", selection);
    assert.equal(stale.status, 422);
    assert.match(stale.body.error, /marco de evaluación requiere revisión/);
    assert.equal(f.calls.length, 1, "no facturar una llamada con marco obsoleto");
  } finally { await f.db.close(); }
});

test("revisar una valoración confirmada conserva el historial y exige reconfirmar antes de cerrar", async () => {
  const f = await fixture();
  try {
    const query = `classroomId=${classId}&periodId=${firstPeriod}`;
    const base = { classroomId: classId, periodId: firstPeriod, studentId: studentA, competencyId: "COM_ORAL" };
    const detail = (await f.call("GET", `/api/period-evaluations/detail?${query}&studentId=${studentA}&competencyId=COM_ORAL`)).body;
    const first = { ...base, evidenceFingerprint: detail.evidence_fingerprint, expectedDraftRevision: null,
      provisionalLevel: "B", achievementLevel: "B", teacherAnalysis: "Explica una idea con preguntas de apoyo.", conclusionText: "" };
    const saved = await f.call("POST", "/api/period-evaluations/save-draft", first);
    const confirmed = await f.call("POST", "/api/period-evaluations/confirm", { ...first, expectedDraftRevision: saved.body.draft_revision });
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
    await confirmGeneratedConclusion(f, firstPeriod, studentA);
    const before = (await f.call("GET", `/api/period-evaluations/overview?${query}`)).body;
    assert.equal(before.progress.competencies_complete, 1);
    const proposal = await f.call("POST", "/api/period-evaluations/conclusion/suggest", base);
    const revised = { ...first, teacherAnalysis: "Explica una idea en un juego; en otro responde a propuestas del grupo." };
    const revision = await f.call("POST", "/api/period-evaluations/save-draft", revised);
    assert.equal(revision.status, 200, JSON.stringify(revision.body));
    const reviewing = (await f.call("GET", `/api/period-evaluations/overview?${query}`)).body;
    assert.equal(reviewing.rows.find((row) => row.student_id === studentA).state, "draft");
    assert.equal(reviewing.progress.competencies_complete, 0);
    assert.notEqual(reviewing.closure.source_fingerprint, before.closure.source_fingerprint);
    assert.equal((await f.db.query("select status from competency_assessments where id=$1", [confirmed.body.assessment_id])).rows[0].status, "active");
    assert.equal((await f.call("POST", "/api/period-evaluations/conclusion/suggest", base)).status, 409);
    assert.equal((await f.call("POST", "/api/period-evaluations/conclusion/confirm", { ...base, generationId: proposal.body.generation_id, proposal: proposal.body.proposal })).status, 409);
    const second = await f.call("POST", "/api/period-evaluations/confirm", { ...revised, expectedDraftRevision: revision.body.draft_revision });
    assert.equal(second.status, 200, JSON.stringify(second.body));
    assert.notEqual(second.body.assessment_id, confirmed.body.assessment_id);
    const history = (await f.db.query("select id,status,details from competency_assessments where student_id=$1 and status in ('active','archived')", [studentA])).rows;
    assert.equal(history.find((row) => row.id === confirmed.body.assessment_id).status, "archived");
    assert.equal(history.find((row) => row.id === confirmed.body.assessment_id).details.evidence_overview, first.teacherAnalysis);
    assert.equal(history.filter((row) => row.status === "active").length, 1);
    assert.equal((await f.db.query("select count(*)::int as n from competency_descriptive_conclusions where status='active'")).rows[0].n, 0);
    await confirmGeneratedConclusion(f, firstPeriod, studentA);
    assert.equal((await f.call("GET", `/api/period-evaluations/overview?${query}`)).body.progress.competencies_complete, 1);
  } finally { await f.db.close(); }
});

test("la ficha permite revisión versionada y no edita silenciosamente la valoración confirmada", async () => {
  const ui = await readFile(new URL("../features/dashboard/components/period-evaluation.tsx", import.meta.url), "utf8");
  assert.match(ui, /Revisar valoración/);
  assert.match(ui, /readOnly=\{assessmentReadOnly\}/);
  assert.match(ui, /!assessmentReadOnly&&<label/);
  assert.match(ui, /assessmentReadOnly&&<section/);
});

async function confirmGeneratedConclusion(f, periodId, studentId, competencyId = "COM_ORAL") {
  const base = { classroomId: classId, periodId, studentId, competencyId };
  const generated = await f.call("POST", "/api/period-evaluations/conclusion/suggest", base);
  assert.equal(generated.status, 200, JSON.stringify(generated.body));
  const confirmed = await f.call("POST", "/api/period-evaluations/conclusion/confirm", {
    ...base,
    generationId: generated.body.generation_id,
    proposal: generated.body.proposal,
  });
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
  return confirmed.body;
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
    assert.equal(overview.body.rows.find((row) => row.student_id === studentB).state, "observation_pending");
    assert.equal(overview.body.rows.find((row) => row.student_id === studentA).evidence_count, 2);
    const detail = await f.call("GET", `/api/period-evaluations/detail?${query}&studentId=${studentA}&competencyId=COM_ORAL`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.timeline[0].observed_on, "2026-04-10");
    assert.equal(detail.body.timeline[0].criterion_id, criterion);
    const suggestion = await f.call("POST", "/api/period-evaluations/suggest", { classroomId: classId, periodId: period.id, studentId: studentA, competencyId: "COM_ORAL" });
    assert.equal(suggestion.status, 200);
    assert.equal(Object.hasOwn(suggestion.body.analysis, "suggested_level"), false);
    assert.equal(f.calls.length, 1);
    assert.doesNotMatch(JSON.stringify(f.calls[0]),/teacher_confirmed_findings/);
    assert.match(f.calls[0].teacher_request, /Assessment Master confirmado/);
    const decisionA = { classroomId: classId, periodId: period.id, studentId: studentA, competencyId: "COM_ORAL", evidenceFingerprint: detail.body.evidence_fingerprint, achievementLevel: "B", teacherAnalysis: "En distintos juegos explicó ideas y escuchó al grupo.", conclusionText: "", teacherJustification: "Mi revisión de los registros indica que sigue necesitando apoyo para escuchar." };
    assert.equal((await f.call("POST", "/api/period-evaluations/confirm", {...decisionA,expectedDraftRevision:suggestion.body.draft_revision})).status, 422);
    assert.equal((await f.call("POST", "/api/period-evaluations/save-draft", { ...decisionA, expectedDraftRevision:suggestion.body.draft_revision, provisionalLevel: decisionA.achievementLevel })).status, 200);
    const resumed = await f.call("GET", `/api/period-evaluations/detail?${query}&studentId=${studentA}&competencyId=COM_ORAL`);
    assert.equal(resumed.body.draft.provisional_level, "B");
    assert.equal(Object.hasOwn(resumed.body.draft, "suggested_level"), false);
    assert.equal((await f.db.query(`select achievement_level from competency_assessments where id=$1`,[resumed.body.draft.id])).rows[0].achievement_level,null);
    assert.equal((await f.call("POST", "/api/period-evaluations/confirm", {...decisionA,expectedDraftRevision:resumed.body.draft.revision,teacherAnalysis:"Cambio no guardado"})).status,422);
    const confirmed = await f.call("POST", "/api/period-evaluations/confirm", {...decisionA,expectedDraftRevision:resumed.body.draft.revision});
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
    const persisted = (await f.db.query(`select achievement_level,suggested_level,teacher_justification,level_confirmed_by from competency_assessments where id=$1`, [confirmed.body.assessment_id])).rows[0];
    assert.equal(persisted.achievement_level, "B"); assert.equal(persisted.suggested_level, null); assert.equal(persisted.level_confirmed_by, teacher); assert.match(persisted.teacher_justification, /sigue necesitando apoyo/);
    await confirmGeneratedConclusion(f, period.id, studentA);
    const incomplete=await f.call("GET",`/api/period-evaluations/overview?${query}`);
    assert.equal(incomplete.body.progress.observation_pending, 1);
    for (const [id, note] of [["00000000-0000-4000-8000-000000000703", "Explicó cómo jugar."], ["00000000-0000-4000-8000-000000000704", "Respondió a una propuesta."]]) await f.db.query(`insert into evidences(id,student_id,activity_id,criterion_id,observed_at,observed_on,observation_text) values($1,$2,$3,$4,now(),'2026-04-10',$5)`, [id, studentB, activity, criterion, note]);
    const second = await f.call("GET", `/api/period-evaluations/detail?${query}&studentId=${studentB}&competencyId=COM_ORAL`);
    const decisionB={ classroomId: classId, periodId: period.id, studentId: studentB, competencyId: "COM_ORAL", evidenceFingerprint: second.body.evidence_fingerprint, achievementLevel: "A", teacherAnalysis: "Explicó su juego y respondió a un compañero.", conclusionText: "" };
    const savedSecond=await f.call("POST","/api/period-evaluations/save-draft",{...decisionB,expectedDraftRevision:null,provisionalLevel:"A"});
    assert.equal(savedSecond.status,200,JSON.stringify(savedSecond.body));
    const confirmedSecond = await f.call("POST", "/api/period-evaluations/confirm", {...decisionB,expectedDraftRevision:savedSecond.body.draft_revision});
    assert.equal(confirmedSecond.status, 200, JSON.stringify(confirmedSecond.body));
    await confirmGeneratedConclusion(f, period.id, studentB);
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
    await confirmGeneratedConclusion(f, period.id, studentA);
    const beforeSecondClose=await f.call("GET",`/api/period-evaluations/overview?${query}`);
    const secondClose=await f.call("POST","/api/period-evaluations/close",{classroomId:classId,periodId:period.id,
      expectedCurrentVersionId:beforeSecondClose.body.closure.current_version_id,expectedSourceFingerprint:beforeSecondClose.body.closure.source_fingerprint});
    assert.equal(secondClose.status,200,JSON.stringify(secondClose.body));
    assert.equal(secondClose.body.version,2);
    assert.deepEqual((await f.db.query(`select manifest from period_closure_versions where id=$1`,[firstClose.body.id])).rows[0].manifest,originalManifest);
    await assert.rejects(f.db.query(`update period_closure_versions set manifest='{}'::jsonb where id=$1`,[firstClose.body.id]),/inmutable/);
  } finally { await f.db.close(); }
});

test("una competencia solo prevista en Mi año no crea valoraciones obligatorias", async () => {
  const f = await fixture();
  try {
    await f.db.query(`insert into annual_plans values(gen_random_uuid(),$1,'active',$2::jsonb)`, [classId, JSON.stringify({ proposed_experiences: [{ primary_competency_ids: ["MAT_CANTIDAD"], possible_secondary_competency_ids: [] }] })]);
    await f.db.query(`insert into project_slots values(gen_random_uuid(),(select id from annual_plans where classroom_id=$1),1,'2026-04-13','2026-04-24')`, [classId]);
    const period = (await f.call("GET", "/api/period-evaluations/workspace")).body.periods[0];
    const query = `classroomId=${classId}&periodId=${period.id}`;
    const overview = await f.call("GET", `/api/period-evaluations/overview?${query}`);
    assert.equal(overview.status, 200);
    assert.equal(overview.body.rows.filter((row) => row.competency_id === "MAT_CANTIDAD").length, 0);
    const excluded = await f.call("POST", "/api/period-evaluations/scope", { classroomId: classId, periodId: period.id, competencyId: "MAT_CANTIDAD", included: false, reason: "La propuesta se reprogramó." });
    assert.equal(excluded.status, 200);
    const after = await f.call("GET", `/api/period-evaluations/overview?${query}`);
    assert.ok(after.body.rows.every((row) => row.competency_id !== "MAT_CANTIDAD"));
    const cannotHideObserved = await f.call("POST", "/api/period-evaluations/scope", { classroomId: classId, periodId: period.id, competencyId: "COM_ORAL", included: false, reason: "No se evaluó." });
    assert.equal(cannotHideObserved.status, 422);
  } finally { await f.db.close(); }
});

test("H34: un borrador docente iniciado no se puede ocultar retirando la competencia", async () => {
  const f = await fixture();
  try {
    const period = (await f.call("GET", "/api/period-evaluations/workspace")).body.periods[0];
    const target = { classroomId: classId, periodId: period.id, competencyId: "MAT_CANTIDAD" };
    assert.equal((await f.call("POST", "/api/period-evaluations/scope", { ...target, included: true })).status, 200);
    const detail = (await f.call("GET", `/api/period-evaluations/detail?classroomId=${classId}&periodId=${period.id}&studentId=${studentA}&competencyId=MAT_CANTIDAD`)).body;
    const draft = await f.call("POST", "/api/period-evaluations/save-draft", { ...target, studentId: studentA,
      evidenceFingerprint: detail.evidence_fingerprint, expectedDraftRevision: null,
      teacherAnalysis: "Faltan oportunidades de observación.", conclusionText: "" });
    assert.equal(draft.status, 200, JSON.stringify(draft.body));
    const excluded = await f.call("POST", "/api/period-evaluations/scope", { ...target, included: false, reason: "Se reconsideró." });
    assert.equal(excluded.status, 422);
    const overview = (await f.call("GET", `/api/period-evaluations/overview?classroomId=${classId}&periodId=${period.id}`)).body;
    assert.equal(overview.rows.find((row) => row.student_id === studentA && row.competency_id === "MAT_CANTIDAD").state, "insufficient_information");
  } finally { await f.db.close(); }
});

test("información insuficiente queda guardada sin nivel y no se convierte en C", async () => {
  const analysis = { ...mockAnalysis(), information_status: "insufficient", insufficiency_reason: "Los registros todavía no muestran oportunidades variadas.", evidence_overview: "Hay dos registros de una misma situación.", observable_patterns: [], strengths_and_advances: [], support_needs: [], next_opportunities: ["Observar en otros juegos."], teacher_questions: [] };
  const f = await fixture({ analysis });
  try {
    const period = (await f.call("GET", "/api/period-evaluations/workspace")).body.periods[0];
    const query = `classroomId=${classId}&periodId=${period.id}`;
    const suggestion = await f.call("POST", "/api/period-evaluations/suggest", { classroomId: classId, periodId: period.id, studentId: studentA, competencyId: "COM_ORAL" });
    assert.equal(suggestion.status, 200, JSON.stringify(suggestion.body));
    assert.equal(Object.hasOwn(suggestion.body.analysis, "suggested_level"), false);
    assert.equal(f.calls.length, 1);
    const overview = await f.call("GET", `/api/period-evaluations/overview?${query}`);
    assert.equal(overview.body.rows.find((row) => row.student_id === studentA && row.competency_id === "COM_ORAL").state, "insufficient_information");
    const draft = (await f.db.query(`select status,achievement_level from competency_assessments where student_id=$1 and competency_v4_id='COM_ORAL'`, [studentA])).rows[0];
    assert.equal(draft.status, "draft"); assert.equal(draft.achievement_level, null);
  } finally { await f.db.close(); }
});

test("una observación sustantiva admite valoración docente justificada sin umbral automático", async () => {
  const f=await fixture();
  try {
    await f.db.query(`delete from evidences where id=$1`,["00000000-0000-4000-8000-000000000702"]);
    const period=(await f.call("GET","/api/period-evaluations/workspace")).body.periods[0];
    const query=`classroomId=${classId}&periodId=${period.id}&studentId=${studentA}&competencyId=COM_ORAL`;
    const detail=(await f.call("GET",`/api/period-evaluations/detail?${query}`)).body;
    assert.equal(detail.state,"pending");
    const input={classroomId:classId,periodId:period.id,studentId:studentA,competencyId:"COM_ORAL",
      evidenceFingerprint:detail.evidence_fingerprint,expectedDraftRevision:null,
      teacherAnalysis:"Durante el juego explicó con detalle su propuesta y respondió a las preguntas del grupo.",
      conclusionText:"",
      achievementLevel:"A",provisionalLevel:"A",
      teacherJustification:"La descripción concreta de esta situación permite valorar la comunicación observada."};
    const saved=await f.call("POST","/api/period-evaluations/save-draft",input);
    assert.equal(saved.status,200,JSON.stringify(saved.body));
    const confirmed=await f.call("POST","/api/period-evaluations/confirm",{...input,expectedDraftRevision:saved.body.draft_revision});
    assert.equal(confirmed.status,200,JSON.stringify(confirmed.body));
    assert.equal((await f.call("GET",`/api/period-evaluations/detail?${query}`)).body.state,"conclusion_pending");
    await confirmGeneratedConclusion(f, period.id, studentA);
    assert.equal((await f.call("GET",`/api/period-evaluations/detail?${query}`)).body.state,"confirmed");
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
      teacherAnalysis:"Explicó ideas en dos juegos.",conclusionText:"",expectedDraftRevision:null};
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
      teacherAnalysis:"Comparó ideas durante el juego.",conclusionText:"",
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
      await confirmGeneratedConclusion(f, period.id, id);
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

async function completedPeriodActivity(db, period, competencyId = "COM_ORAL") {
  const experienceId = (await db.query(`insert into learning_experiences(id,classroom_id,status,starts_on,ends_on)
    values(gen_random_uuid(),$1,'active',$2::date,$3::date) returning id`,[classId,period.starts_on,period.ends_on])).rows[0].id;
  const activityId = (await db.query(`insert into activities(id,experience_id,occurs_on,title,status)
    values(gen_random_uuid(),$1,$2::date,'Actividad QA','active') returning id`,[experienceId,period.starts_on])).rows[0].id;
  await db.query(`insert into activity_criteria(id,activity_id,competency_v4_id,criterion_text,details,status)
    values(gen_random_uuid(),$1,$2,'Criterio QA','{}'::jsonb,'active')`,[activityId,competencyId]);
  const scheduleId=(await db.query(`insert into class_schedule_entries(id,classroom_id,activity_id)
    values(gen_random_uuid(),$1,$2) returning id`,[classId,activityId])).rows[0].id;
  await db.query(`insert into daily_execution_logs(id,schedule_entry_id,execution_date,status)
    values(gen_random_uuid(),$1,$2::date,'completed')`,[scheduleId,period.starts_on]);
  return activityId;
}

test("H34: una actividad trabajada sin evidencia queda pendiente de observación y una prevista sola no entra al scope",async()=>{
  const f=await fixture();
  try {
    const period=(await f.call("GET","/api/period-evaluations/workspace")).body.periods[1];
    await completedPeriodActivity(f.db,period,"MAT_CANTIDAD");
    const overview=await f.call("GET",`/api/period-evaluations/overview?classroomId=${classId}&periodId=${period.id}`);
    assert.equal(overview.status,200,JSON.stringify(overview.body));
    assert.deepEqual(overview.body.scope.map((item)=>item.id),["MAT_CANTIDAD"]);
    assert.equal(overview.body.progress.observation_pending,2);
    assert.ok(overview.body.rows.every((row)=>row.state==="observation_pending"&&row.level===null));
  } finally {await f.db.close();}
});

test("H34: AD puede cerrar sin conclusión, conserva el pendiente y lo prioriza después",async()=>{
  const f=await fixture();
  try {
    const periods=(await f.call("GET","/api/period-evaluations/workspace")).body.periods;
    const base={classroomId:classId,periodId:periods[0].id,studentId:studentA,competencyId:"COM_ORAL"};
    const detail=(await f.call("GET",`/api/period-evaluations/detail?classroomId=${classId}&periodId=${periods[0].id}&studentId=${studentA}&competencyId=COM_ORAL`)).body;
    assert.equal(detail.state,"pending","la evidencia queda lista para decisión docente sin letra automática");
    const decision={...base,evidenceFingerprint:detail.evidence_fingerprint,expectedDraftRevision:null,
      provisionalLevel:"AD",achievementLevel:"AD",teacherAnalysis:"La docente revisó dos observaciones de comunicación.",conclusionText:""};
    const saved=await f.call("POST","/api/period-evaluations/save-draft",decision);
    assert.equal(saved.status,200,JSON.stringify(saved.body));
    const confirmed=await f.call("POST","/api/period-evaluations/confirm",{...decision,expectedDraftRevision:saved.body.draft_revision});
    assert.equal(confirmed.status,200,JSON.stringify(confirmed.body));
    const overview=(await f.call("GET",`/api/period-evaluations/overview?classroomId=${classId}&periodId=${periods[0].id}`)).body;
    assert.equal(overview.rows.find((row)=>row.student_id===studentA).state,"confirmed");
    assert.equal(overview.rows.find((row)=>row.student_id===studentA).conclusion,null);
    assert.equal(overview.rows.find((row)=>row.student_id===studentB).state,"observation_pending");
    assert.equal(overview.progress.competencies_resolved,2);
    const closed=await f.call("POST","/api/period-evaluations/close",{...base,
      expectedCurrentVersionId:overview.closure.current_version_id,expectedSourceFingerprint:overview.closure.source_fingerprint});
    assert.equal(closed.status,200,JSON.stringify(closed.body));
    const manifest=(await f.db.query(`select manifest from period_closure_versions where id=$1`,[closed.body.id])).rows[0].manifest;
    assert.equal(manifest.entries.length,1);
    assert.equal(manifest.entries[0].achievement_level,"AD");
    assert.equal(manifest.pending_entries.length,1);
    assert.equal(manifest.pending_entries[0].student_id,studentB);
    const csv=await f.call("GET",`/api/period-evaluations/consolidated.csv?classroomId=${classId}&periodId=${periods[0].id}`);
    assert.equal(csv.status,200);
    assert.match(String(csv.body),/observation_pending/);
    const nextActivity=await completedPeriodActivity(f.db,periods[1]);
    const next=await f.call("GET",`/api/period-evaluations/observe-today?activityId=${nextActivity}`);
    assert.equal(next.status,200,JSON.stringify(next.body));
    assert.equal(next.body.suggestions[0].student_id,studentB);
    assert.equal(next.body.suggestions[0].reason_code,"prior_period_pending");
  } finally {await f.db.close();}
});

test("H34: evidencia aún sin revisión docente queda sin letra en cierre intermedio",async()=>{
  const f=await fixture();
  try {
    const period=(await f.call("GET","/api/period-evaluations/workspace")).body.periods[0];
    const overview=(await f.call("GET",`/api/period-evaluations/overview?classroomId=${classId}&periodId=${period.id}`)).body;
    assert.equal(overview.rows.find((row)=>row.student_id===studentA).state,"pending");
    assert.equal(overview.progress.review_pending,1);
    const closed=await f.call("POST","/api/period-evaluations/close",{classroomId:classId,periodId:period.id,
      expectedCurrentVersionId:overview.closure.current_version_id,expectedSourceFingerprint:overview.closure.source_fingerprint});
    assert.equal(closed.status,200,JSON.stringify(closed.body));
    const manifest=(await f.db.query('select manifest from period_closure_versions where id=$1',[closed.body.id])).rows[0].manifest;
    assert.equal(manifest.entries.length,0);
    assert.equal(manifest.pending_entries.length,2);
    assert.match(manifest.pending_entries.find((row)=>row.student_id===studentA).reason,/pendiente de revisión docente/);
    assert.equal((await f.db.query("select count(*)::int as n from competency_assessments where status='active'")).rows[0].n,0);
  } finally {await f.db.close();}
});

for(const level of ["A","B","C"]) test(`H34: ${level} requiere conclusión descriptiva`,async()=>{
  const f=await fixture();
  try {
    const detail=(await f.call("GET",`/api/period-evaluations/detail?classroomId=${classId}&periodId=${firstPeriod}&studentId=${studentA}&competencyId=COM_ORAL`)).body;
    const decision={classroomId:classId,periodId:firstPeriod,studentId:studentA,competencyId:"COM_ORAL",
      evidenceFingerprint:detail.evidence_fingerprint,expectedDraftRevision:null,provisionalLevel:level,
      achievementLevel:level,teacherAnalysis:"La docente revisó el conjunto de observaciones.",conclusionText:""};
    const saved=await f.call("POST","/api/period-evaluations/save-draft",decision);
    assert.equal(saved.status,200,JSON.stringify(saved.body));
    assert.equal((await f.call("POST","/api/period-evaluations/confirm",{...decision,expectedDraftRevision:saved.body.draft_revision})).status,200);
    assert.equal((await f.call("GET",`/api/period-evaluations/detail?classroomId=${classId}&periodId=${firstPeriod}&studentId=${studentA}&competencyId=COM_ORAL`)).body.state,"conclusion_pending");
    await confirmGeneratedConclusion(f,firstPeriod,studentA);
    assert.equal((await f.call("GET",`/api/period-evaluations/detail?classroomId=${classId}&periodId=${firstPeriod}&studentId=${studentA}&competencyId=COM_ORAL`)).body.state,"confirmed");
  } finally {await f.db.close();}
});

test("H34: P1–P3 cierran con pendientes sin notas inventadas; P4 bloquea los nunca valorados",async()=>{
  const f=await fixture();
  try {
    const periods=(await f.call("GET","/api/period-evaluations/workspace")).body.periods;
    await f.db.query(`delete from evidences where student_id=$1`,[studentA]);
    for(const period of periods){
      await completedPeriodActivity(f.db,period);
      const overview=(await f.call("GET",`/api/period-evaluations/overview?classroomId=${classId}&periodId=${period.id}`)).body;
      assert.equal(overview.progress.observation_pending,2);
      assert.ok(overview.rows.every((row)=>row.level===null));
      const result=await f.call("POST","/api/period-evaluations/close",{classroomId:classId,periodId:period.id,
        expectedCurrentVersionId:overview.closure.current_version_id,expectedSourceFingerprint:overview.closure.source_fingerprint});
      if(Number(period.ordinal)<4) assert.equal(result.status,200,`P${period.ordinal}: ${JSON.stringify(result.body)}`);
      else {assert.equal(result.status,422);assert.match(result.body.error,/cierre anual.*nunca tuvieron una valoración/);}
    }
    assert.equal((await f.db.query(`select count(*)::int as n from period_closure_versions where classroom_id=$1`,[classId])).rows[0].n,3);
    assert.equal((await f.db.query(`select count(*)::int as n from competency_assessments where status='active'`)).rows[0].n,0);
  } finally {await f.db.close();}
});
