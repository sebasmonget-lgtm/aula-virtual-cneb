import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { DESCRIPTIVE_CONCLUSION_OUTPUT_SCHEMA, generateAIWorkflowV4, InvalidAIGenerationError } from "./ai-generation-v4.mjs";
import { assessmentSourceSnapshot, loadAssessmentEvidence } from "./assessment-v4-service.mjs";
import { buildDescriptiveConclusionInput, sameAssessmentSnapshot, sourceAssessmentSnapshot, validateDescriptiveConclusion } from "./descriptive-conclusion-v4-service.mjs";
import { createDescriptiveConclusionRouteHandler } from "../../scripts/descriptive-conclusion-routes.mjs";
import { buildStudentPedagogicalContext } from "./student-context-service.mjs";

const classroomId = "00000000-0000-4000-8000-000000000211";
const studentId = "00000000-0000-4000-8000-000000000111";
const otherStudentId = "00000000-0000-4000-8000-000000000112";
const assessmentId = "00000000-0000-4000-8000-000000000611";
const activityId = "00000000-0000-4000-8000-000000000311";
const criterionId = "00000000-0000-4000-8000-000000000411";
const evidenceId = "00000000-0000-4000-8000-000000000511";
const evidenceId2 = "00000000-0000-4000-8000-000000000512";
const periodStart = "2026-03-01", periodEnd = "2026-09-22";
const assessmentDetails = { competency_id: "COM_ORAL", information_status: "sufficient", evidence_overview: "Ana compartió sus ideas en dos ocasiones.", observable_patterns: ["Ana habló con apoyo."], strengths_and_advances: ["Expresó una idea."], support_needs: ["Apoyo con preguntas."], next_opportunities: ["Conversar en grupo pequeño."], teacher_questions: [], insufficiency_reason: null, caution: "Revisar con la docente." };
const conclusion = (status = "sufficient") => ({ competency_id: "COM_ORAL", information_status: status, conclusion_text: status === "sufficient" ? "En las situaciones observadas compartió ideas y escuchó al grupo." : "En las situaciones observadas aún hay información limitada para describir un avance sostenido.", progress_examples: status === "sufficient" ? ["Explicó su propuesta."] : [], support_or_conditions: ["Con preguntas abiertas."], next_steps: ["Ofrecer nuevas conversaciones."], insufficiency_reason: status === "insufficient" ? "Se necesita observar más situaciones." : null, caution: "Revisar con la docente antes de comunicar." });

test("descriptive_conclusion usa Sol/medium, schema strict y una tarjeta en el provider", async () => {
  const plan = resolveAIExecutionPlan({ workflow: "descriptive_conclusion", task: "generation" });
  assert.equal(plan.model, "gpt-5.6-sol"); assert.equal(plan.reasoning_effort, "medium");
  assert.equal(DESCRIPTIVE_CONCLUSION_OUTPUT_SCHEMA.id, "descriptive-conclusion-v1");
  assert.equal(DESCRIPTIVE_CONCLUSION_OUTPUT_SCHEMA.additionalProperties, false);
  let captured;
  const input = buildDescriptiveConclusionInput({ age: 5, competencyId: "COM_ORAL", assessment: { details: assessmentDetails }, evidenceRows: [{ observed_at: "2026-09-20T12:00:00Z", activity_title: "Relato", criterion_text: "Expresa ideas", observation_status: "with_support", observation_text: "Contó algo" }] });
  const result = await generateAIWorkflowV4(input, { provider: { id: "mock", async generate(request) { captured = request; return conclusion(); } } });
  assert.equal(captured.workflow, "descriptive_conclusion"); assert.equal(captured.ai_context_bundle.curriculum.competency_cards.length, 1);
  assert.equal(captured.ai_context_bundle.curriculum.competency_cards[0].id, "COM_ORAL");
  assert.equal(result.validation.schema, "descriptive-conclusion-v1");
  assert.equal(captured.execution_plan.model, "gpt-5.6-sol");
  assert.equal(captured.ai_context_bundle.context.student.id, "current_student");
});

test("conclusión rechaza campos extra, otra competencia, notas, comparaciones y falsa certeza", async () => {
  assert.deepEqual(validateDescriptiveConclusion(conclusion(), "COM_ORAL", "sufficient"), conclusion());
  assert.deepEqual(validateDescriptiveConclusion(conclusion("insufficient"), "COM_ORAL", "insufficient"), conclusion("insufficient"));
  for (const bad of [
    { ...conclusion(), extra: true }, { ...conclusion(), competency_id: "OTHER" },
    { ...conclusion(), information_status: "insufficient" }, { ...conclusion(), progress_examples: "texto" },
    { ...conclusion(), conclusion_text: "" }, { ...conclusion(), conclusion_text: "Nivel AD." },
    { ...conclusion(), caution: "Nota 18." }, { ...conclusion(), next_steps: ["90% de logro"] },
    { ...conclusion(), conclusion_text: "Comparado con sus compañeros está mejor." },
    { ...conclusion(), conclusion_text: "Es incapaz de conversar." },
    { ...conclusion(), conclusion_text: "Siempre responde mejor que otros niños." },
    { ...conclusion(), conclusion_text: "Texto oficial MINEDU." },
  ]) assert.throws(() => validateDescriptiveConclusion(bad, "COM_ORAL", "sufficient"), JSON.stringify(bad));
  assert.throws(() => validateDescriptiveConclusion({ ...conclusion("insufficient"), insufficiency_reason: null }, "COM_ORAL", "insufficient"));
  assert.throws(() => validateDescriptiveConclusion({ ...conclusion("insufficient"), conclusion_text: "Logró plenamente la competencia.", progress_examples: ["Progreso firme."] }, "COM_ORAL", "insufficient"));
  const input = buildDescriptiveConclusionInput({ age: 5, competencyId: "COM_ORAL", assessment: { details: assessmentDetails }, evidenceRows: [{ observed_at: "2026-09-20T12:00:00Z", observation_status: "with_support" }] });
  await assert.rejects(() => generateAIWorkflowV4(input, { provider: { async generate() { return { ...conclusion(), competency_id: "OTHER" }; } } }), InvalidAIGenerationError);
});

test("snapshot del assessment es estable y detecta versión, contenido y timestamps", () => {
  const base = { id: assessmentId, version: 1, updated_at: new Date("2026-09-22T12:00:00Z"), teacher_confirmed_at: new Date("2026-09-22T11:00:00Z"), details: assessmentDetails };
  const snapshot = sourceAssessmentSnapshot(base);
  assert.equal(snapshot.details_hash.length, 64);
  assert.doesNotMatch(JSON.stringify(snapshot), /Ana|evidence_overview/);
  assert.equal(sameAssessmentSnapshot(snapshot, sourceAssessmentSnapshot({ ...base, updated_at: "2026-09-22T12:00:00.000Z" })), true);
  assert.equal(sameAssessmentSnapshot(snapshot, sourceAssessmentSnapshot({ ...base, details: Object.fromEntries(Object.entries(assessmentDetails).reverse()) })), true);
  for (const changed of [{ version: 2 }, { updated_at: "2026-09-22T12:01:00Z" }, { teacher_confirmed_at: "2026-09-22T11:01:00Z" }, { details: { ...assessmentDetails, evidence_overview: "Otro texto" } }]) assert.equal(sameAssessmentSnapshot(snapshot, sourceAssessmentSnapshot({ ...base, ...changed })), false);
});

async function fixture({ status = "active", informationStatus = "sufficient" } = {}) {
  const db = await PGlite.create();
  await db.exec(`create table students(id uuid primary key,classroom_id uuid not null,status text not null,first_name text,last_name text,preferred_name text);
    create table activities(id uuid primary key,title text);
    create table activity_criteria(id uuid primary key,activity_id uuid,competency_v4_id text,criterion_text text,details jsonb);
    create table evidences(id uuid primary key,student_id uuid,activity_id uuid,criterion_id uuid,observed_at timestamptz,observation_status text,observation_text text,media_path text);
    create table competency_assessments(id uuid primary key,student_id uuid,competency_v4_id text,period_start date,period_end date,version integer,source_evidence_ids jsonb,source_evidence_snapshot jsonb,details jsonb,generation_metadata jsonb,status text,teacher_confirmed_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());`);
  const migration = await readFile(new URL("../../local-db/migrations/0021_competency_descriptive_conclusions.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.query(`insert into students values($1,$2,'active','Ana','Pérez','Anita'),($3,$2,'active','Otro','Niño',null)`, [studentId, classroomId, otherStudentId]);
  await db.query(`insert into activities values($1,'Relato de Ana')`, [activityId]);
  await db.query(`insert into activity_criteria values($1,$2,'COM_ORAL','Expresión de Ana','{"expected_evidence":"Ana cuenta algo"}'::jsonb)`, [criterionId, activityId]);
  await db.query(`insert into evidences values($1,$2,$3,$4,'2026-09-20T12:00:00Z','with_support','Ana contó algo','/private/photo.jpg'),($5,$2,$3,$4,'2026-09-21T12:00:00Z','insufficient_information','Anita escuchó',null)`, [evidenceId, studentId, activityId, criterionId, evidenceId2]);
  const rows = await loadAssessmentEvidence(db, { studentId, competencyId: "COM_ORAL", periodStart, periodEnd });
  const details = { ...assessmentDetails, information_status: informationStatus, insufficiency_reason: informationStatus === "insufficient" ? "Pocas situaciones observadas." : null };
  await db.query(`insert into competency_assessments(id,student_id,competency_v4_id,period_start,period_end,version,source_evidence_ids,source_evidence_snapshot,details,generation_metadata,status,teacher_confirmed_at) values($1,$2,'COM_ORAL',$3::date,$4::date,1,$5::jsonb,$6::jsonb,$7::jsonb,'{"secret":"metadata"}'::jsonb,$8,$9::timestamptz)`, [assessmentId, studentId, periodStart, periodEnd, JSON.stringify(rows.map((row) => row.id)), JSON.stringify(assessmentSourceSnapshot(rows)), JSON.stringify(details), status, status === "active" ? "2026-09-22T12:00:00Z" : null]);
  const pending = new Map(), captures = [], responses = [];
  const handler = createDescriptiveConclusionRouteHandler({ db, annualPlanningContext: async () => ({ id: classroomId, age: 5, castellano_l2_applicable: false, religion_applicable: false }), readJson: async (request) => request.body, send: (_res, statusCode, body) => responses.push({ status: statusCode, body }), pending, metadataForAudit: (value) => value, refreshStudentContext: async (_database, id) => captures.push({ refreshed: id }), createProvider: () => ({}), generate: async (input) => { captures.push({ input }); return { output: conclusion(informationStatus), metadata: { model: "mock" } }; } });
  async function call(method, pathname, body) { responses.length = 0; await handler({ request: { method, body }, url: new URL(`http://localhost${pathname}`), response: {}, origin: null }); return responses[0]; }
  return { db, call, pending, captures };
}

test("precondición exige assessment confirmado del niño, competencia y aula", async () => {
  const draft = await fixture({ status: "draft" });
  assert.equal((await draft.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId })).status, 422);
  assert.equal(draft.captures.length, 0);
  const f = await fixture();
  assert.equal((await f.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId: otherStudentId, assessmentId })).status, 422);
  assert.equal((await f.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId: "00000000-0000-4000-8000-000000000999" })).status, 422);
  await f.db.query(`update competency_assessments set competency_v4_id='NO_CARD' where id=$1`, [assessmentId]);
  assert.equal((await f.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId })).status, 422);
  const otherClass = await fixture();
  await otherClass.db.query(`update students set classroom_id='00000000-0000-4000-8000-999999999999' where id=$1`, [studentId]);
  assert.equal((await otherClass.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId })).status, 422);
});

test("provider recibe assessment y evidencias seguras sin identidad, foto ni metadata", async () => {
  const f = await fixture();
  const legacyCriterion = "00000000-0000-4000-8000-000000000499";
  await f.db.query(`insert into activity_criteria values($1,$2,null,'Legacy','{}'::jsonb)`, [legacyCriterion, activityId]);
  await f.db.query(`insert into evidences values('00000000-0000-4000-8000-000000000599',$1,$2,$3,'2026-09-20T12:00:00Z','demonstrated','Legacy',null)`, [studentId, activityId, legacyCriterion]);
  await f.db.query(`insert into competency_descriptive_conclusions(id,student_id,competency_v4_id,assessment_id,period_start,period_end,version,details,generation_metadata,source_assessment_snapshot,status,teacher_confirmed_at) values('00000000-0000-4000-8000-000000000898',$1,'COM_ORAL',$2,'2026-01-01','2026-02-28',1,$3::jsonb,'{}','{}','active',now())`, [studentId, assessmentId, JSON.stringify({ ...conclusion(), conclusion_text: "Ana participó antes." })]);
  const generated = await f.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId, teacherNotes: `Ana observó ${studentId} /private/photo.jpg` });
  assert.equal(generated.status, 200);
  const payload = JSON.stringify(f.captures[0].input);
  assert.match(payload, /current_student/);
  assert.match(payload, /teacher_confirmed_findings/);
  assert.doesNotMatch(payload, /\b(?:Ana|Anita|Pérez)\b|00000000|media_path|photo\.jpg|base64|generation_metadata|source_evidence_ids|source_assessment_snapshot|fingerprint|secret/);
  assert.equal(f.captures[0].input.multiple_evidence_records.length, 2);
  assert.equal(f.captures[0].input.prior_conclusion, "[estudiante] participó antes.");
  assert.equal(f.captures[0].input.multiple_evidence_records[1].observation_status, "insufficient_information");
  let providerBundle;
  await generateAIWorkflowV4(f.captures[0].input, { provider: { async generate(request) { providerBundle = request.ai_context_bundle; return conclusion(); } } });
  assert.doesNotMatch(JSON.stringify(providerBundle), /\b(?:Ana|Anita|Pérez)\b|00000000|media_path|photo\.jpg|base64|generation_metadata|source_evidence_ids|source_assessment_snapshot|fingerprint|secret/);
  assert.equal(providerBundle.curriculum.competency_cards.length, 1);
  assert.equal(providerBundle.context.student.teacher_confirmed_findings.information_status, "sufficient");
  const pending = f.pending.get(generated.body.generation_id);
  assert.equal(pending.student_id, studentId);
  assert.equal(pending.assessment_id, assessmentId);
  assert.ok(pending.source_assessment_snapshot.details_hash);
});

test("GET es seguro; draft reabre, manual conserva metadata y regeneración reemplaza snapshot", async () => {
  const f = await fixture();
  const generated = await f.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId });
  const saved = await f.call("POST", "/api/descriptive-conclusions", { studentId, assessmentId, proposal: generated.body.proposal, generationId: generated.body.generation_id });
  assert.equal(saved.status, 200); assert.equal(f.pending.has(generated.body.generation_id), false);
  const opened = await f.call("GET", `/api/descriptive-conclusions?studentId=${studentId}&assessmentId=${assessmentId}`);
  assert.equal(opened.body.conclusions[0].status, "draft");
  assert.doesNotMatch(JSON.stringify(opened.body), /generation_metadata|source_assessment_snapshot|secret|fingerprint|response_id|tokens/);
  const before = (await f.db.query(`select * from competency_descriptive_conclusions where id=$1`, [saved.body.id])).rows[0];
  assert.equal((await f.call("PUT", `/api/descriptive-conclusions/${saved.body.id}`, { proposal: { ...conclusion(), conclusion_text: "Edición docente." } })).status, 200);
  const edited = (await f.db.query(`select * from competency_descriptive_conclusions where id=$1`, [saved.body.id])).rows[0];
  assert.deepEqual(edited.generation_metadata, before.generation_metadata); assert.deepEqual(edited.source_assessment_snapshot, before.source_assessment_snapshot);
  assert.equal((await f.call("PUT", `/api/descriptive-conclusions/${saved.body.id}`, { proposal: conclusion(), generationId: "wrong" })).status, 422);
  const next = await f.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId });
  const item = f.pending.get(next.body.generation_id); item.metadata = { model: "second" };
  assert.equal((await f.call("PUT", `/api/descriptive-conclusions/${saved.body.id}`, { proposal: conclusion(), generationId: next.body.generation_id })).status, 200);
  const after = (await f.db.query(`select * from competency_descriptive_conclusions where id=$1`, [saved.body.id])).rows[0];
  assert.equal(after.generation_metadata.model, "second"); assert.deepEqual(after.source_assessment_snapshot, item.source_assessment_snapshot);
  assert.equal(f.pending.has(next.body.generation_id), false);
});

test("confirmación detecta cambio/archivo de assessment y versiona por periodo", async () => {
  const f = await fixture();
  const generated = await f.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId });
  const saved = await f.call("POST", "/api/descriptive-conclusions", { studentId, assessmentId, proposal: conclusion(), generationId: generated.body.generation_id });
  await f.db.query(`update competency_assessments set details=jsonb_set(details,'{evidence_overview}','"Cambiado"') where id=$1`, [assessmentId]);
  assert.equal((await f.call("POST", `/api/descriptive-conclusions/${saved.body.id}/confirm`)).status, 409);
  await f.db.query(`update competency_assessments set details=$1::jsonb,updated_at=now() where id=$2`, [JSON.stringify(assessmentDetails), assessmentId]);
  const refreshed = await f.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId });
  assert.equal((await f.call("PUT", `/api/descriptive-conclusions/${saved.body.id}`, { proposal: conclusion(), generationId: refreshed.body.generation_id })).status, 200);
  assert.equal((await f.call("POST", `/api/descriptive-conclusions/${saved.body.id}/confirm`)).status, 200);
  assert.equal(f.captures.at(-1).refreshed, studentId);
  assert.equal((await f.call("PUT", `/api/descriptive-conclusions/${saved.body.id}`, { proposal: conclusion() })).status, 422);
  const active = await f.call("GET", `/api/descriptive-conclusions?studentId=${studentId}&assessmentId=${assessmentId}`);
  assert.equal(active.body.conclusions[0].status, "active");
  const next = await f.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId });
  const newer = await f.call("POST", "/api/descriptive-conclusions", { studentId, assessmentId, proposal: conclusion(), generationId: next.body.generation_id });
  assert.notEqual(newer.body.id, saved.body.id);
  assert.equal((await f.call("POST", `/api/descriptive-conclusions/${newer.body.id}/confirm`)).status, 200);
  const rows = (await f.db.query(`select id,status,version from competency_descriptive_conclusions order by version`)).rows;
  assert.equal(rows.find((row) => row.id === saved.body.id).status, "archived");
  assert.equal(rows.find((row) => row.id === newer.body.id).version, 2);
  await f.db.query(`update competency_assessments set status='archived' where id=$1`, [assessmentId]);
  assert.equal((await f.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId })).status, 422);
});

test("assessment insuficiente obliga conclusión prudente y razón explícita", async () => {
  const f = await fixture({ informationStatus: "insufficient" });
  const generated = await f.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId });
  assert.equal(generated.status, 200);
  assert.equal(generated.body.proposal.information_status, "insufficient");
  assert.equal((await f.call("POST", "/api/descriptive-conclusions", { studentId, assessmentId, proposal: conclusion(), generationId: generated.body.generation_id })).status, 422);
  assert.equal((await f.call("POST", "/api/descriptive-conclusions", { studentId, assessmentId, proposal: generated.body.proposal, generationId: generated.body.generation_id })).status, 200);
});

test("pending incorrecto no se consume; evidencia cambiada impide confirmar", async () => {
  const f = await fixture();
  const generated = await f.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId });
  assert.equal((await f.call("POST", "/api/descriptive-conclusions", { studentId, assessmentId, proposal: conclusion(), generationId: "wrong" })).status, 422);
  assert.equal(f.pending.has(generated.body.generation_id), true);
  const saved = await f.call("POST", "/api/descriptive-conclusions", { studentId, assessmentId, proposal: conclusion(), generationId: generated.body.generation_id });
  await f.db.query(`update evidences set observation_text='Cambiado' where id=$1`, [evidenceId]);
  assert.equal((await f.call("POST", `/api/descriptive-conclusions/${saved.body.id}/confirm`)).status, 422);
  assert.equal((await f.db.query(`select status from competency_descriptive_conclusions where id=$1`, [saved.body.id])).rows[0].status, "draft");
});

test("confirmación archiva solo mismo periodo y rollback conserva ambos estados", async () => {
  const f = await fixture();
  const first = await f.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId });
  const old = await f.call("POST", "/api/descriptive-conclusions", { studentId, assessmentId, proposal: conclusion(), generationId: first.body.generation_id });
  await assert.rejects(() => f.db.query(`insert into competency_descriptive_conclusions(id,student_id,competency_v4_id,assessment_id,period_start,period_end,version,details,generation_metadata,source_assessment_snapshot,status) values('00000000-0000-4000-8000-000000000897',$1,'COM_ORAL',$2,$3::date,$4::date,9,$5::jsonb,'{}','{}','draft')`, [studentId, assessmentId, periodStart, periodEnd, JSON.stringify(conclusion())]));
  assert.equal((await f.call("POST", `/api/descriptive-conclusions/${old.body.id}/confirm`)).status, 200);
  await assert.rejects(() => f.db.query(`insert into competency_descriptive_conclusions(id,student_id,competency_v4_id,assessment_id,period_start,period_end,version,details,generation_metadata,source_assessment_snapshot,status) values('00000000-0000-4000-8000-000000000896',$1,'COM_ORAL',$2,$3::date,$4::date,9,$5::jsonb,'{}','{}','active')`, [studentId, assessmentId, periodStart, periodEnd, JSON.stringify(conclusion())]));
  const other = "00000000-0000-4000-8000-000000000899";
  await f.db.query(`insert into competency_descriptive_conclusions(id,student_id,competency_v4_id,assessment_id,period_start,period_end,version,details,generation_metadata,source_assessment_snapshot,status,teacher_confirmed_at) values($1,$2,'COM_ORAL',$3,'2026-03-01','2026-04-30',1,$4::jsonb,'{}','{}','active',now())`, [other, studentId, assessmentId, JSON.stringify(conclusion())]);
  const second = await f.call("POST", "/api/ai/descriptive-conclusions/generate", { studentId, assessmentId });
  const draft = await f.call("POST", "/api/descriptive-conclusions", { studentId, assessmentId, proposal: conclusion(), generationId: second.body.generation_id });
  const query = f.db.query.bind(f.db);
  f.db.query = async (sql, params) => {
    if (sql.includes("set status='active',teacher_confirmed_at")) throw new Error("Fallo simulado");
    return query(sql, params);
  };
  assert.equal((await f.call("POST", `/api/descriptive-conclusions/${draft.body.id}/confirm`)).status, 422);
  f.db.query = query;
  let rows = (await f.db.query(`select id,status from competency_descriptive_conclusions`)).rows;
  assert.equal(rows.find((row) => row.id === old.body.id).status, "active");
  assert.equal(rows.find((row) => row.id === draft.body.id).status, "draft");
  assert.equal((await f.call("POST", `/api/descriptive-conclusions/${draft.body.id}/confirm`)).status, 200);
  rows = (await f.db.query(`select id,status from competency_descriptive_conclusions`)).rows;
  assert.equal(rows.find((row) => row.id === old.body.id).status, "archived");
  assert.equal(rows.find((row) => row.id === other).status, "active");
});

test("StudentContext conserva únicamente la conclusión confirmada segura", async () => {
  const db = { async query(sql) {
    if (sql.includes("from students s join classrooms")) return { rows: [{ id: studentId, name: "Ana", first_name: "Ana", last_name: "Pérez", section: "A", age_years: 5, school_year: 2026 }] };
    if (sql.includes("from activity_criteria ac")) return { rows: [{ competency_key: "v4:COM_ORAL", competency_id: null, competency_v4_id: "COM_ORAL", competency_text: null, evidence_count: 2, demonstrated: 1, with_support: 1, not_yet_demonstrated: 0, insufficient_information: 0, last_observed_at: "2026-09-21" }] };
    if (sql.includes("from evidences e join activities")) return { rows: [] };
    if (sql.includes("from competency_assessments")) return { rows: [] };
    if (sql.includes("from competency_descriptive_conclusions")) return { rows: [{ id: "conclusion-1", competency_v4_id: "COM_ORAL", period_start: periodStart, period_end: periodEnd, details: { ...conclusion(), extra_secret: "not-public" }, generation_metadata: { api_key: "not-public" }, teacher_confirmed_at: "2026-09-22T12:00:00Z" }] };
    if (sql.includes("from diagnostic_entries")) return { rows: [] };
    throw new Error(`unexpected query: ${sql}`);
  } };
  const context = await buildStudentPedagogicalContext(db, studentId);
  assert.equal(context.competencies[0].teacher_confirmed_conclusion.conclusion_text, conclusion().conclusion_text);
  assert.equal(context.confirmed_period_conclusions.length, 1);
  assert.doesNotMatch(JSON.stringify(context.competencies[0].teacher_confirmed_conclusion), /metadata|secret|response_id|tokens/);
});

test("interfaz y migración sostienen reload, solo lectura y RLS", async () => {
  const [ui, workspace, migration] = await Promise.all([
    readFile(new URL("../features/dashboard/components/descriptive-conclusion-generator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/dashboard/components/teacher-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../supabase/migrations/202609220018_competency_descriptive_conclusions.sql", import.meta.url), "utf8"),
  ]);
  assert.match(ui, /api\/descriptive-conclusions\?/);
  assert.match(ui, /status === "draft"/);
  assert.match(ui, /status === "active"/);
  assert.match(ui, /solo lectura/);
  assert.match(ui, /Confirmar conclusión/);
  assert.match(workspace, /Conclusiones descriptivas/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /public\.owns_student\(student_id\)/);
  assert.match(migration, /where status = 'draft'/);
  assert.match(migration, /where status = 'active'/);
});
