import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { ASSESSMENT_OUTPUT_SCHEMA, generateAIWorkflowV4, InvalidAIGenerationError } from "./ai-generation-v4.mjs";
import { assessmentSourceSnapshot, buildAssessmentInput, loadAssessmentEvidence, sameEvidenceSourceSnapshot, sanitizeEvidenceForAssessment, validateAssessmentProposal } from "./assessment-v4-service.mjs";
import { createAssessmentRouteHandler } from "../../scripts/assessment-routes.mjs";

const studentId = "00000000-0000-4000-8000-000000000111";
const otherStudentId = "00000000-0000-4000-8000-000000000112";
const classroomId = "00000000-0000-4000-8000-000000000211";
const activityId = "00000000-0000-4000-8000-000000000311";
const criterionId = "00000000-0000-4000-8000-000000000411";
const evidenceId = "00000000-0000-4000-8000-000000000511";
const evidenceId2 = "00000000-0000-4000-8000-000000000512";
const periodStart = "2026-03-01", periodEnd = "2026-09-22";
const proposal = (status = "insufficient") => ({ competency_id: "COM_ORAL", information_status: status, evidence_overview: "En las situaciones observadas se comunicó con apoyo.", observable_patterns: ["Expresó una idea con apoyo."], strengths_and_advances: ["Compartió una idea."], support_needs: ["Más oportunidades de diálogo."], next_opportunities: ["Conversar en grupo pequeño."], teacher_questions: ["¿En qué situaciones participa?"], insufficiency_reason: status === "insufficient" ? "Se requiere observar más situaciones." : null, caution: "Revisar con la docente." });

test("assessment routing, schema y provider reciben una sola tarjeta", async () => {
  const plan = resolveAIExecutionPlan({ workflow: "assessment" });
  assert.equal(plan.model, "gpt-5.6-sol"); assert.equal(plan.reasoning_effort, "medium");
  assert.equal(ASSESSMENT_OUTPUT_SCHEMA.id, "assessment-v1"); assert.equal(ASSESSMENT_OUTPUT_SCHEMA.additionalProperties, false);
  let captured;
  const evidence = [{ observed_on: "2026-09-20T12:00:00.000Z", activity_title: "Actividad", criterion_text: "Expresa ideas", observation_status: "with_support", observation_note: "Dijo algo", media_available: true }];
  const input = buildAssessmentInput({ age: 5, competencyId: "COM_ORAL", evidenceHistory: evidence });
  const result = await generateAIWorkflowV4(input, { provider: { id: "mock", async generate(request) { captured = request; return proposal(); } } });
  assert.equal(captured.workflow, "assessment"); assert.equal(captured.ai_context_bundle.curriculum.competency_cards.length, 1);
  assert.equal(captured.ai_context_bundle.curriculum.competency_cards[0].id, "COM_ORAL");
  assert.equal(result.validation.schema, "assessment-v1");
  assert.equal(captured.ai_context_bundle.context.student.id, "current_student");
});

test("assessment-v1 valida estructura, estado, competencia, niveles y cantidad de evidencia", () => {
  assert.deepEqual(validateAssessmentProposal(proposal(), "COM_ORAL", 1), proposal());
  assert.deepEqual(validateAssessmentProposal(proposal("sufficient"), "COM_ORAL", 2), proposal("sufficient"));
  assert.deepEqual(validateAssessmentProposal(proposal(), "COM_ORAL", 3), proposal());
  for (const bad of [
    { ...proposal(), competency_id: "OTHER" }, { ...proposal(), extra: true },
    { ...proposal(), observable_patterns: "texto" }, { ...proposal(), observable_patterns: [""] },
    { ...proposal(), insufficiency_reason: null }, { ...proposal("sufficient"), insufficiency_reason: "Texto" },
    { ...proposal("sufficient"), evidence_overview: "Nivel AD en la competencia." },
    { ...proposal(), caution: "Nota 18." }, { ...proposal(), support_needs: ["90% de logro"] },
  ]) assert.throws(() => validateAssessmentProposal(bad, "COM_ORAL", 2), JSON.stringify(bad));
  assert.throws(() => validateAssessmentProposal(proposal("sufficient"), "COM_ORAL", 1));
});

test("provider no puede devolver salida inválida", async () => {
  const input = buildAssessmentInput({ age: 5, competencyId: "COM_ORAL", evidenceHistory: [{ observation_note: "Evidencia" }] });
  await assert.rejects(() => generateAIWorkflowV4(input, { provider: { async generate() { return proposal("sufficient"); } } }), InvalidAIGenerationError);
});

test("sanitización solo afecta copia provider y elimina identidad y rutas", () => {
  const original = { id: evidenceId, observed_at: "2026-09-20T12:00:00Z", observation_status: "with_support", observation_text: "ANA Pérez habló con Ana.", activity_title: "Relato de Ana", criterion_text: "Escuchar a Pérez", media_path: "/private/foto.jpg", photo: "base64", media_available: true };
  const copy = sanitizeEvidenceForAssessment(original, ["Ana", "Pérez"]);
  assert.equal(original.observation_text, "ANA Pérez habló con Ana.");
  assert.equal(copy.observation_note, "[estudiante] [estudiante] habló con [estudiante].");
  assert.doesNotMatch(JSON.stringify(copy), /Ana|Pérez|private|base64|00000000/);
  assert.equal(copy.media_available, true);
});

test("snapshot estable por orden/fecha y sensible a toda fuente relevante", () => {
  const a = { id: evidenceId, observed_at: new Date("2026-09-20T12:00:00Z"), observation_status: "with_support", observation_text: "Dijo algo", media_available: false, activity_title: "Actividad", criterion_text: "Expresa ideas", details: { expected_evidence: "Habla" } };
  const b = { ...a, id: evidenceId2 };
  const snapshot = assessmentSourceSnapshot([a, b]);
  assert.equal(snapshot[0].fingerprint.length, 64);
  assert.equal(JSON.stringify(snapshot).includes("Dijo algo"), false);
  assert.equal(sameEvidenceSourceSnapshot(snapshot, assessmentSourceSnapshot([b, { ...a, observed_at: "2026-09-20T12:00:00.000Z" }])), true);
  assert.equal(sameEvidenceSourceSnapshot(snapshot, assessmentSourceSnapshot([a])), false);
  assert.equal(sameEvidenceSourceSnapshot(snapshot, assessmentSourceSnapshot([a, b, { ...a, id: "new" }])), false);
  for (const change of [
    { observation_status: "demonstrated" }, { observation_text: "Otro texto" }, { observed_at: "2026-09-21T12:00:00Z" },
    { media_available: true }, { criterion_text: "Otro criterio" }, { details: { expected_evidence: "Otro" } }, { activity_title: "Otra actividad" },
  ]) assert.equal(sameEvidenceSourceSnapshot(snapshot, assessmentSourceSnapshot([{ ...a, ...change }, b])), false, JSON.stringify(change));
});

async function fixture({ twoEvidence = false } = {}) {
  const db = await PGlite.create();
  await db.exec(`create table students(id uuid primary key,classroom_id uuid not null,status text not null,first_name text,last_name text,preferred_name text);
    create table activities(id uuid primary key,title text);
    create table activity_criteria(id uuid primary key,activity_id uuid,competency_v4_id text,criterion_text text,details jsonb);
    create table evidences(id uuid primary key,student_id uuid,activity_id uuid,criterion_id uuid,observed_at timestamptz,observation_status text,observation_text text,media_path text);
    create table competency_assessments(id uuid primary key,student_id uuid,competency_v4_id text,period_start date,period_end date,version integer,source_evidence_ids jsonb,source_evidence_snapshot jsonb,details jsonb,generation_metadata jsonb,status text,teacher_confirmed_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());`);
  await db.query(`insert into students values ($1,$2,'active','Ana','Pérez','Anita'),($3,$2,'active','Otro','Niño',null)`, [studentId, classroomId, otherStudentId]);
  await db.query(`insert into activities values($1,'Relato de Ana')`, [activityId]);
  await db.query(`insert into activity_criteria values($1,$2,'COM_ORAL','Expresión de Ana','{"expected_evidence":"Ana cuenta algo"}'::jsonb)`, [criterionId, activityId]);
  await db.query(`insert into evidences values($1,$2,$3,$4,'2026-09-20T12:00:00Z','with_support','Ana contó algo',null)`, [evidenceId, studentId, activityId, criterionId]);
  if (twoEvidence) await db.query(`insert into evidences values($1,$2,$3,$4,'2026-09-21T12:00:00Z','insufficient_information','Anita escuchó',null)`, [evidenceId2, studentId, activityId, criterionId]);
  const pending = new Map(), captures = [], responses = [];
  const handler = createAssessmentRouteHandler({ db, annualPlanningContext: async () => ({ id: classroomId, age: 5, castellano_l2_applicable: false, religion_applicable: false, calendar: { starts_on: "2026-03-01", ends_on: "2026-12-31" } }), readJson: async (request) => request.body, send: (_res, status, body) => responses.push({ status, body }), pending, metadataForAudit: (value) => value, refreshStudentContext: async (database, id) => captures.push({ refreshed: id }), createProvider: () => ({}), generate: async (input) => { captures.push({ input }); return { output: proposal(), metadata: { model: "mock" } }; } });
  async function call(method, pathname, body) { responses.length = 0; await handler({ request: { method, body }, url: new URL(`http://localhost${pathname}`), response: {}, origin: null }); return responses[0]; }
  return { db, pending, captures, call };
}

test("API filtra estudiante/competencia/periodo y no llama IA sin evidencia", async () => {
  const f = await fixture();
  const rows = await loadAssessmentEvidence(f.db, { studentId: otherStudentId, competencyId: "COM_ORAL", periodStart, periodEnd }); assert.equal(rows.length, 0);
  assert.equal((await loadAssessmentEvidence(f.db, { studentId, competencyId: "OTHER", periodStart, periodEnd })).length, 0);
  assert.equal((await loadAssessmentEvidence(f.db, { studentId, competencyId: "COM_ORAL", periodStart, periodEnd: "2026-09-19" })).length, 0);
  assert.equal((await f.call("POST", "/api/ai/assessments/generate", { studentId: otherStudentId, competencyId: "COM_ORAL", periodStart, periodEnd })).status, 422);
  assert.equal(f.captures.length, 0);
  assert.equal((await f.call("POST", "/api/ai/assessments/generate", { studentId, competencyId: "NO_CARD", periodStart, periodEnd })).status, 422);
  assert.equal((await f.call("POST", "/api/ai/assessments/generate", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd })).status, 200);
  assert.equal(f.captures.length, 1);
  const payload = JSON.stringify(f.captures[0].input);
  assert.doesNotMatch(payload, /\b(?:Ana|Anita|Pérez)\b|00000000|media_path|fingerprint|source_evidence|generation_metadata/);
  assert.match(payload, /current_student/);
});

test("API manual PUT conserva fuentes y metadata; regeneración reemplaza y consume pending", async () => {
  const f = await fixture({ twoEvidence: true });
  const generated = await f.call("POST", "/api/ai/assessments/generate", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd });
  const saved = await f.call("POST", "/api/assessments", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd, proposal: generated.body.proposal, generationId: generated.body.generation_id });
  assert.equal(saved.status, 200); assert.equal(f.pending.has(generated.body.generation_id), false);
  const before = (await f.db.query(`select * from competency_assessments where id=$1`, [saved.body.id])).rows[0];
  const manual = { ...proposal(), evidence_overview: "Revisión docente." };
  assert.equal((await f.call("PUT", `/api/assessments/${saved.body.id}`, { proposal: manual })).status, 200);
  const after = (await f.db.query(`select * from competency_assessments where id=$1`, [saved.body.id])).rows[0];
  assert.deepEqual(after.generation_metadata, before.generation_metadata); assert.deepEqual(after.source_evidence_snapshot, before.source_evidence_snapshot);
  assert.equal((await f.call("PUT", `/api/assessments/${saved.body.id}`, { proposal, generationId: "wrong" })).status, 422);
  const next = await f.call("POST", "/api/ai/assessments/generate", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd });
  const item = f.pending.get(next.body.generation_id); item.metadata = { model: "second" };
  assert.equal((await f.call("PUT", `/api/assessments/${saved.body.id}`, { proposal: proposal(), generationId: next.body.generation_id })).status, 200);
  const regenerated = (await f.db.query(`select * from competency_assessments where id=$1`, [saved.body.id])).rows[0];
  assert.equal(regenerated.generation_metadata.model, "second"); assert.equal(f.pending.has(next.body.generation_id), false);
  assert.deepEqual(regenerated.source_evidence_snapshot, item.source_evidence_snapshot);
});

test("confirmación rechaza fuentes cambiadas; archiva solo mismo periodo y active es inmutable", async () => {
  const f = await fixture();
  const generated = await f.call("POST", "/api/ai/assessments/generate", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd });
  const saved = await f.call("POST", "/api/assessments", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd, proposal: proposal(), generationId: generated.body.generation_id });
  await f.db.query(`update evidences set observation_text='Cambio' where id=$1`, [evidenceId]);
  assert.equal((await f.call("POST", `/api/assessments/${saved.body.id}/confirm`)).status, 409);
  await f.db.query(`update evidences set observation_text='Ana contó algo' where id=$1`, [evidenceId]);
  assert.equal((await f.call("POST", `/api/assessments/${saved.body.id}/confirm`)).status, 200);
  assert.equal(f.captures.at(-1).refreshed, studentId);
  assert.equal((await f.call("PUT", `/api/assessments/${saved.body.id}`, { proposal: proposal() })).status, 422);
  const read = await f.call("GET", `/api/assessments?studentId=${studentId}&competencyId=COM_ORAL`);
  assert.equal(read.body.assessments[0].status, "active");
  assert.doesNotMatch(JSON.stringify(read.body), /generation_metadata|source_evidence_ids|fingerprint|response_id|tokens/);
  const context = await f.call("GET", `/api/assessments/context?studentId=${studentId}&competencyId=COM_ORAL&periodStart=${periodStart}&periodEnd=${periodEnd}`);
  assert.equal(context.body.timeline.length, 1);
  assert.equal(context.body.latest_confirmed.status, "active");
});

test("confirmación versionada archiva active del mismo periodo y conserva otro periodo", async () => {
  const f = await fixture();
  const first = await f.call("POST", "/api/ai/assessments/generate", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd });
  const old = await f.call("POST", "/api/assessments", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd, proposal: proposal(), generationId: first.body.generation_id });
  assert.equal((await f.call("POST", `/api/assessments/${old.body.id}/confirm`)).status, 200);
  const otherId = "00000000-0000-4000-8000-000000000799";
  await f.db.query(`insert into competency_assessments(id,student_id,competency_v4_id,period_start,period_end,version,source_evidence_ids,source_evidence_snapshot,details,generation_metadata,status,teacher_confirmed_at) values($1,$2,'COM_ORAL','2026-03-01','2026-04-30',1,'[]','[]',$3::jsonb,'{}','active',now())`, [otherId, studentId, JSON.stringify(proposal())]);
  const second = await f.call("POST", "/api/ai/assessments/generate", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd });
  const newest = await f.call("POST", "/api/assessments", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd, proposal: proposal(), generationId: second.body.generation_id });
  assert.notEqual(newest.body.id, old.body.id);
  assert.equal((await f.call("POST", `/api/assessments/${newest.body.id}/confirm`)).status, 200);
  const rows = (await f.db.query(`select id,status,version from competency_assessments order by version,id`)).rows;
  assert.equal(rows.find((row) => row.id === old.body.id).status, "archived");
  assert.equal(rows.find((row) => row.id === newest.body.id).status, "active");
  assert.equal(rows.find((row) => row.id === newest.body.id).version, 2);
  assert.equal(rows.find((row) => row.id === otherId).status, "active");
});

test("legacy y competencia especial inaplicable no entran en opciones ni generación", async () => {
  const f = await fixture();
  const legacyId = "00000000-0000-4000-8000-000000000499";
  const extraEvidence = "00000000-0000-4000-8000-000000000599";
  await f.db.query(`insert into activity_criteria values($1,$2,null,'Criterio legacy','{}'::jsonb)`, [legacyId, activityId]);
  await f.db.query(`insert into evidences values($1,$2,$3,$4,'2026-09-20T12:00:00Z','demonstrated','Legacy',null)`, [extraEvidence, studentId, activityId, legacyId]);
  await f.db.query(`insert into activity_criteria values($1,$2,'CAST_L2_ORAL','Criterio L2','{}'::jsonb)`, ["00000000-0000-4000-8000-000000000498", activityId]);
  const options = await f.call("GET", `/api/assessments/options?studentId=${studentId}`);
  assert.deepEqual(options.body.competencies.map((item) => item.competency_v4_id), ["COM_ORAL"]);
  assert.equal((await f.call("POST", "/api/ai/assessments/generate", { studentId, competencyId: "CAST_L2_ORAL", periodStart, periodEnd })).status, 422);
  assert.equal((await f.call("GET", `/api/assessments?studentId=${otherStudentId}&competencyId=COM_ORAL`)).status, 200);
  assert.equal((await f.call("GET", `/api/assessments?studentId=00000000-0000-4000-8000-999999999999&competencyId=COM_ORAL`)).status, 422);
});

test("un fallo de escritura conserva pending y un fallo al confirmar revierte la transacción", async () => {
  const f = await fixture();
  const first = await f.call("POST", "/api/ai/assessments/generate", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd });
  const saved = await f.call("POST", "/api/assessments", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd, proposal: proposal(), generationId: first.body.generation_id });
  const second = await f.call("POST", "/api/ai/assessments/generate", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd });
  const query = f.db.query.bind(f.db);
  f.db.query = async (sql, params) => {
    if (sql.includes("update competency_assessments set details=")) throw new Error("Fallo simulado");
    return query(sql, params);
  };
  assert.equal((await f.call("PUT", `/api/assessments/${saved.body.id}`, { proposal: proposal(), generationId: second.body.generation_id })).status, 422);
  assert.equal(f.pending.has(second.body.generation_id), true);
  f.db.query = query;
  assert.equal((await f.call("POST", `/api/assessments/${saved.body.id}/confirm`)).status, 200);
  const third = await f.call("POST", "/api/ai/assessments/generate", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd });
  const draft = await f.call("POST", "/api/assessments", { studentId, competencyId: "COM_ORAL", periodStart, periodEnd, proposal: proposal(), generationId: third.body.generation_id });
  f.db.query = async (sql, params) => {
    if (sql.includes("set status='active',teacher_confirmed_at")) throw new Error("Fallo simulado");
    return query(sql, params);
  };
  assert.equal((await f.call("POST", `/api/assessments/${draft.body.id}/confirm`)).status, 422);
  f.db.query = query;
  const statuses = (await f.db.query(`select id,status from competency_assessments`)).rows;
  assert.equal(statuses.find((row) => row.id === saved.body.id).status, "active");
  assert.equal(statuses.find((row) => row.id === draft.body.id).status, "draft");
});
