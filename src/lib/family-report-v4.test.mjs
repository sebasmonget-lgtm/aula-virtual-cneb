import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { FAMILY_REPORT_OUTPUT_SCHEMA, generateAIWorkflowV4, InvalidAIGenerationError } from "./ai-generation-v4.mjs";
import { buildFamilyReportInput, conclusionSourceSnapshot, sameConclusionSourceSnapshot, selectConfirmedConclusions, validateFamilyReport, validateFamilyReportPeriod } from "./family-report-v4-service.mjs";
import { createFamilyReportRouteHandler } from "../../scripts/family-report-routes.mjs";

const classroomId = "00000000-0000-4000-8000-000000000211";
const studentId = "00000000-0000-4000-8000-000000000111";
const otherStudentId = "00000000-0000-4000-8000-000000000112";
const oralId = "00000000-0000-4000-8000-000000000711";
const mathId = "00000000-0000-4000-8000-000000000712";
const start = "2026-03-01", end = "2026-09-22";
const sourceDetails = (competencyId, informationStatus = "sufficient") => ({ competency_id: competencyId, information_status: informationStatus, conclusion_text: informationStatus === "sufficient" ? "Ana conversó y explicó lo que observó." : "Se observaron pocas situaciones para describir un avance sostenido.", progress_examples: informationStatus === "sufficient" ? ["Ana explicó una idea."] : [], support_or_conditions: ["Con preguntas abiertas."], next_steps: ["Ofrecer otra oportunidad de conversación."], insufficiency_reason: informationStatus === "insufficient" ? "Faltan otras situaciones." : null, caution: "Comunicar con prudencia." });
const section = (competencyId, informationStatus = "sufficient") => ({ competency_id: competencyId, information_status: informationStatus, progress_summary: informationStatus === "sufficient" ? "En situaciones observadas compartió sus ideas." : "La información observada aún es limitada.", examples: informationStatus === "sufficient" ? ["Explicó su idea al grupo."] : [], support_or_conditions: ["Las preguntas abiertas facilitaron la conversación."], next_steps: ["Ofrecer nuevos momentos de diálogo."], family_suggestions: ["Conversar sobre lo que observa en casa."], insufficiency_note: informationStatus === "insufficient" ? "Se necesitan más situaciones para comprender su progreso." : null });
const report = (ids = ["COM_ORAL"], statuses = {}) => ({ introduction: "Compartimos algunos avances observados durante este periodo.", sections: ids.map((id) => section(id, statuses[id] ?? "sufficient")), closing_note: "Seguiremos observando y acompañando juntos." });
const url = (path) => `http://localhost${path}`;

async function fixture({ oralStatus = "active", mathStatus = "active", oralInformation = "sufficient" } = {}) {
  const db = await PGlite.create();
  await db.exec(`create table students(id uuid primary key,classroom_id uuid not null,status text not null,first_name text,last_name text,preferred_name text);
    create table competency_descriptive_conclusions(id uuid primary key,student_id uuid,competency_v4_id text,period_start date,period_end date,version integer,details jsonb,status text,teacher_confirmed_at timestamptz,updated_at timestamptz default now());`);
  await db.exec(await readFile(new URL("../../local-db/migrations/0022_family_reports.sql", import.meta.url), "utf8"));
  await db.query(`insert into students values($1,$2,'active','Ana','Pérez','Anita'),($3,$2,'active','Otro','Niño',null)`, [studentId, classroomId, otherStudentId]);
  for (const [id, competencyId, status, details] of [[oralId, "COM_ORAL", oralStatus, sourceDetails("COM_ORAL", oralInformation)], [mathId, "MAT_CANTIDAD", mathStatus, sourceDetails("MAT_CANTIDAD")]]) {
    await db.query(`insert into competency_descriptive_conclusions(id,student_id,competency_v4_id,period_start,period_end,version,details,status,teacher_confirmed_at) values($1,$2,$3,$4::date,$5::date,1,$6::jsonb,$7,$8::timestamptz)`, [id, studentId, competencyId, start, end, JSON.stringify(details), status, status === "active" ? "2026-09-22T12:00:00Z" : null]);
  }
  const pending = new Map(), captures = [], responses = [];
  const context = { id: classroomId, age: 5, castellano_l2_applicable: false, religion_applicable: false, calendar: { starts_on: "2026-03-01", ends_on: "2026-12-20" } };
  const handler = createFamilyReportRouteHandler({ db, annualPlanningContext: async () => context, readJson: async (request) => request.body, send: (_res, status, body) => responses.push({ status, body }), pending, metadataForAudit: (value) => value, createProvider: (plan) => { captures.push({ plan }); return {}; }, generate: async (input) => { captures.push({ input }); return { output: report(input.competency_ids, Object.fromEntries(input.student_context.teacher_confirmed_findings.map((finding) => [finding.competency_id, finding.information_status]))), metadata: { model: "mock", secret: "audit-only" } }; } });
  async function call(method, path, body) { responses.length = 0; await handler({ request: { method, body }, url: new URL(url(path)), response: {}, origin: null }); return responses[0]; }
  async function generate(ids = ["COM_ORAL"]) { return call("POST", "/api/ai/family-reports/generate", { studentId, periodStart: start, periodEnd: end, competencyIds: ids }); }
  async function save(generated, ids = ["COM_ORAL"]) { return call("POST", "/api/family-reports", { studentId, periodStart: start, periodEnd: end, competencyIds: ids, proposal: generated.body.proposal, generationId: generated.body.generation_id }); }
  return { db, call, generate, save, captures, pending, context };
}

test("router Terra/low y schema strict family-report-v1; bundle usa solo competencias elegidas", async () => {
  const plan = resolveAIExecutionPlan({ workflow: "family_report", task: "generation" });
  assert.equal(plan.model, "gpt-5.6-terra"); assert.equal(plan.reasoning_effort, "low");
  assert.equal(FAMILY_REPORT_OUTPUT_SCHEMA.id, "family-report-v1"); assert.equal(FAMILY_REPORT_OUTPUT_SCHEMA.additionalProperties, false);
  assert.equal(FAMILY_REPORT_OUTPUT_SCHEMA.properties.sections.items.additionalProperties, false);
  const conclusions = [{ competency_v4_id: "COM_ORAL", period_start: start, period_end: end, details: sourceDetails("COM_ORAL") }, { competency_v4_id: "MAT_CANTIDAD", period_start: start, period_end: end, details: sourceDetails("MAT_CANTIDAD") }];
  const input = buildFamilyReportInput({ age: 5, competencyIds: ["COM_ORAL"], conclusions, knownNames: ["Ana"] });
  let request;
  const generated = await generateAIWorkflowV4(input, { provider: { async generate(value) { request = value; return report(); } } });
  assert.equal(generated.validation.schema, "family-report-v1"); assert.equal(request.execution_plan.model, "gpt-5.6-terra");
  assert.deepEqual(request.ai_context_bundle.curriculum.competency_cards.map((card) => card.id), ["COM_ORAL"]);
  assert.deepEqual(request.ai_context_bundle.context.student.teacher_confirmed_findings.map((finding) => finding.competency_id), ["COM_ORAL"]);
  assert.deepEqual(request.ai_context_bundle.provenance.competency_ids, ["COM_ORAL"]);
  assert.ok(request.ai_context_bundle.knowledge.semantic_units.length <= 7);
  assert.ok(request.ai_context_bundle.knowledge.source_claims.length <= 3);
  assert.deepEqual(await generateAIWorkflowV4(input, { provider: { async generate() { return report(); } } }).then((value) => value.output), generated.output);
  const multiInput = buildFamilyReportInput({ age: 5, competencyIds: ["COM_ORAL", "MAT_CANTIDAD"], conclusions, knownNames: ["Ana"] });
  let multiRequest;
  await generateAIWorkflowV4(multiInput, { provider: { async generate(value) { multiRequest = value; return report(["COM_ORAL", "MAT_CANTIDAD"]); } } });
  assert.deepEqual(multiRequest.ai_context_bundle.curriculum.competency_cards.map((card) => card.id).sort(), ["COM_ORAL", "MAT_CANTIDAD"]);
  assert.ok(multiRequest.ai_context_bundle.knowledge.semantic_units.length <= 7);
  assert.ok(multiRequest.ai_context_bundle.knowledge.source_claims.length <= 3);
});

test("schema impide competencias ajenas, información falsa, notas, rankings y recomendaciones clínicas", async () => {
  const snapshot = [{ competency_id: "COM_ORAL", information_status: "insufficient" }];
  assert.deepEqual(validateFamilyReport(report(["COM_ORAL"], { COM_ORAL: "insufficient" }), ["COM_ORAL"], snapshot), report(["COM_ORAL"], { COM_ORAL: "insufficient" }));
  for (const bad of [
    { ...report(), extra: true }, report(["MAT_CANTIDAD"]), { ...report(), sections: [] },
    { ...report(), sections: [{ ...section("COM_ORAL"), information_status: "sufficient" }] },
    { ...report(), sections: [{ ...section("COM_ORAL"), family_suggestions: ["Solicitar terapia."] }] },
    { ...report(), sections: [{ ...section("COM_ORAL"), progress_summary: "Nivel AD." }] },
    { ...report(), sections: [{ ...section("COM_ORAL"), progress_summary: "Nota 18/20." }] },
    { ...report(), sections: [{ ...section("COM_ORAL"), progress_summary: "Obtuvo 18 puntos." }] },
    { ...report(), sections: [{ ...section("COM_ORAL"), progress_summary: "Comparado con sus compañeros avanza más." }] },
    { ...report(), sections: [{ ...section("COM_ORAL"), progress_summary: "Está mejor que otros niños." }] },
    { ...report(), sections: [{ ...section("COM_ORAL"), progress_summary: "Supera el promedio del salón." }] },
  ]) assert.throws(() => validateFamilyReport(bad, ["COM_ORAL"], snapshot));
  const input = buildFamilyReportInput({ age: 5, competencyIds: ["COM_ORAL"], conclusions: [{ competency_v4_id: "COM_ORAL", period_start: start, period_end: end, details: sourceDetails("COM_ORAL") }] });
  await assert.rejects(() => generateAIWorkflowV4(input, { provider: { async generate() { return report(["MAT_CANTIDAD"]); } } }), InvalidAIGenerationError);
});

test("periodos y snapshots detectan cambio de contenido, estado y versión", () => {
  const calendar = { starts_on: start, ends_on: "2026-12-20" };
  validateFamilyReportPeriod(start, end, calendar);
  for (const [first, last] of [["2026-02-28", end], [start, "2026-12-21"], [end, start], ["2026-99-99", end]]) assert.throws(() => validateFamilyReportPeriod(first, last, calendar));
  const row = { id: oralId, competency_v4_id: "COM_ORAL", period_start: start, period_end: end, version: 1, details: sourceDetails("COM_ORAL"), status: "active", teacher_confirmed_at: "2026-09-22T12:00:00Z", updated_at: "2026-09-22T12:01:00Z" };
  const snapshot = conclusionSourceSnapshot([row]); assert.equal(snapshot[0].details_hash.length, 64);
  assert.equal(sameConclusionSourceSnapshot(snapshot, conclusionSourceSnapshot([{ ...row, details: Object.fromEntries(Object.entries(row.details).reverse()) }])), true);
  assert.equal(sameConclusionSourceSnapshot(snapshot, conclusionSourceSnapshot([{ ...row, details: { ...row.details, conclusion_text: "Cambio." } }])), false);
  assert.equal(sameConclusionSourceSnapshot(snapshot, conclusionSourceSnapshot([{ ...row, version: 2 }])), false);
  assert.deepEqual(selectConfirmedConclusions([row, { ...row, id: mathId, status: "draft" }], ["COM_ORAL"], start, end).map((item) => item.id), [oralId]);
  assert.throws(() => selectConfirmedConclusions([{ ...row, status: "draft" }], ["COM_ORAL"], start, end));
});

test("opciones solo muestran conclusiones confirmadas del niño y periodo; selección explícita", async () => {
  const f = await fixture({ mathStatus: "draft" });
  const options = await f.call("GET", `/api/family-reports/options?studentId=${studentId}&periodStart=${start}&periodEnd=${end}`);
  assert.equal(options.status, 200); assert.deepEqual(options.body.competencies.map((item) => item.competency_id), ["COM_ORAL"]);
  assert.doesNotMatch(JSON.stringify(options.body), /00000000|generation_metadata|fingerprint|tokens/);
  assert.equal((await f.generate(["MAT_CANTIDAD"])).status, 422);
  assert.equal((await f.generate([])).status, 422);
  assert.equal((await f.call("GET", `/api/family-reports/options?studentId=${otherStudentId}&periodStart=${start}&periodEnd=${end}`)).body.competencies.length, 0);
  assert.equal((await f.call("POST", "/api/ai/family-reports/generate", { studentId: otherStudentId, periodStart: start, periodEnd: end, competencyIds: ["COM_ORAL"] })).status, 422);
  assert.equal((await f.call("POST", "/api/ai/family-reports/generate", { studentId, periodStart: start, periodEnd: "2026-04-01", competencyIds: ["COM_ORAL"] })).status, 422);
});

test("aplicabilidad L2 depende del aula y una fuente insuficiente conserva la incertidumbre", async () => {
  const f = await fixture({ oralInformation: "insufficient" });
  const l2Id = "00000000-0000-4000-8000-000000000713";
  await f.db.query(`insert into competency_descriptive_conclusions(id,student_id,competency_v4_id,period_start,period_end,version,details,status,teacher_confirmed_at) values($1,$2,'CAST_L2_ORAL',$3::date,$4::date,1,$5::jsonb,'active',now())`, [l2Id, studentId, start, end, JSON.stringify(sourceDetails("CAST_L2_ORAL"))]);
  assert.equal((await f.generate(["CAST_L2_ORAL"])).status, 422);
  const hidden = await f.call("GET", `/api/family-reports/options?studentId=${studentId}&periodStart=${start}&periodEnd=${end}`);
  assert.equal(hidden.body.competencies.some((item) => item.competency_id === "CAST_L2_ORAL"), false);
  f.context.castellano_l2_applicable = true;
  const available = await f.call("GET", `/api/family-reports/options?studentId=${studentId}&periodStart=${start}&periodEnd=${end}`);
  assert.equal(available.body.competencies.some((item) => item.competency_id === "CAST_L2_ORAL"), true);
  assert.equal((await f.generate(["CAST_L2_ORAL"])).status, 200);
  const generated = await f.generate(["COM_ORAL"]);
  assert.equal(generated.body.proposal.sections[0].information_status, "insufficient");
  assert.ok(generated.body.proposal.sections[0].insufficiency_note);
  assert.equal((await f.save(generated)).status, 200);
  assert.equal((await f.call("PUT", `/api/family-reports/${(await f.call("GET", `/api/family-reports?studentId=${studentId}&periodStart=${start}&periodEnd=${end}`)).body.reports[0].id}`, { proposal: report() })).status, 422);
});

test("proveedor recibe hallazgos confirmados anonimizados, nunca fuentes internas, rutas ni fotos", async () => {
  const f = await fixture();
  await f.db.query(`update competency_descriptive_conclusions set details=$1::jsonb where id=$2`, [JSON.stringify({ ...sourceDetails("COM_ORAL"), conclusion_text: `Ana observó /private/photo.jpg y ${studentId}`, progress_examples: ["Anita explicó algo."] }), oralId]);
  const generated = await f.generate(["COM_ORAL"]); assert.equal(generated.status, 200);
  const input = f.captures.find((item) => item.input).input;
  const payload = JSON.stringify(input);
  assert.match(payload, /current_student/);
  assert.doesNotMatch(payload, /\b(?:Ana|Anita|Pérez)\b|00000000|photo\.jpg|base64|generation_metadata|source_conclusion_ids|fingerprint|audit-only/);
  assert.deepEqual(input.competency_ids, ["COM_ORAL"]);
  const pending = f.pending.get(generated.body.generation_id);
  assert.deepEqual(pending.source_conclusion_ids, [oralId]); assert.equal(pending.source_conclusion_snapshot[0].details_hash.length, 64);
  assert.doesNotMatch(JSON.stringify(generated.body), /audit-only|source_conclusion_snapshot|00000000/);
  assert.equal(f.captures.find((item) => item.plan).plan.model, "gpt-5.6-terra");
});

test("draft reabre tras reload; edición manual conserva auditoría; regeneración cambia metadata y mantiene ID", async () => {
  const f = await fixture();
  const first = await f.generate(), saved = await f.save(first); assert.equal(saved.status, 200);
  const opened = await f.call("GET", `/api/family-reports?studentId=${studentId}&periodStart=${start}&periodEnd=${end}`);
  assert.equal(opened.body.reports[0].status, "draft"); assert.deepEqual(opened.body.reports[0].selected_competency_ids, ["COM_ORAL"]);
  assert.doesNotMatch(JSON.stringify(opened.body), /generation_metadata|source_conclusion_ids|source_conclusion_snapshot|response_id|tokens|audit-only/);
  const before = (await f.db.query(`select * from family_reports where id=$1`, [saved.body.id])).rows[0];
  assert.equal((await f.call("PUT", `/api/family-reports/${saved.body.id}`, { proposal: { ...report(), introduction: "Edición docente." } })).status, 200);
  const edited = (await f.db.query(`select * from family_reports where id=$1`, [saved.body.id])).rows[0];
  assert.deepEqual(edited.generation_metadata, before.generation_metadata); assert.deepEqual(edited.source_conclusion_snapshot, before.source_conclusion_snapshot);
  assert.equal((await f.call("PUT", `/api/family-reports/${saved.body.id}`, { proposal: report(), generationId: "wrong" })).status, 422);
  const second = await f.generate(["COM_ORAL", "MAT_CANTIDAD"]); assert.equal(second.status, 200);
  f.pending.get(second.body.generation_id).metadata = { model: "second" };
  assert.equal((await f.call("PUT", `/api/family-reports/${saved.body.id}`, { proposal: second.body.proposal, generationId: second.body.generation_id })).status, 200);
  const after = (await f.db.query(`select * from family_reports where id=$1`, [saved.body.id])).rows[0];
  assert.equal(after.generation_metadata.model, "second"); assert.deepEqual(after.selected_competency_ids, ["COM_ORAL", "MAT_CANTIDAD"]);
  assert.equal((await f.db.query(`select count(*)::int as count from family_reports`)).rows[0].count, 1);
});

test("fuente modificada o archivada bloquea confirmación; regenerar renueva snapshot", async () => {
  const f = await fixture(), generated = await f.generate(), saved = await f.save(generated);
  await f.db.query(`update competency_descriptive_conclusions set details=jsonb_set(details,'{conclusion_text}','"Cambio confirmado"') where id=$1`, [oralId]);
  assert.equal((await f.call("POST", `/api/family-reports/${saved.body.id}/confirm`)).status, 409);
  const refreshed = await f.generate(); assert.equal(refreshed.status, 200);
  assert.equal((await f.call("PUT", `/api/family-reports/${saved.body.id}`, { proposal: refreshed.body.proposal, generationId: refreshed.body.generation_id })).status, 200);
  await f.db.query(`update competency_descriptive_conclusions set status='archived' where id=$1`, [oralId]);
  assert.equal((await f.call("POST", `/api/family-reports/${saved.body.id}/confirm`)).status, 422);
  assert.equal((await f.db.query(`select status from family_reports where id=$1`, [saved.body.id])).rows[0].status, "draft");
});

test("pending no acepta otra selección ni fuentes cambiadas antes del primer guardado", async () => {
  const f = await fixture(), generated = await f.generate();
  const wrong = await f.call("POST", "/api/family-reports", { studentId, periodStart: start, periodEnd: end, competencyIds: ["MAT_CANTIDAD"], proposal: generated.body.proposal, generationId: generated.body.generation_id, generation_metadata: { model: "forged" } });
  assert.equal(wrong.status, 422); assert.equal(f.pending.has(generated.body.generation_id), true);
  await f.db.query(`update competency_descriptive_conclusions set details=jsonb_set(details,'{next_steps}','["Nuevo paso confirmado"]'::jsonb) where id=$1`, [oralId]);
  assert.equal((await f.save(generated)).status, 422);
  assert.equal((await f.db.query(`select count(*)::int as count from family_reports`)).rows[0].count, 0);
  assert.equal(f.pending.has(generated.body.generation_id), true);
});

test("confirmación versiona y archiva solo el mismo periodo; active es inmutable", async () => {
  const f = await fixture(), first = await f.generate(), old = await f.save(first);
  assert.equal((await f.call("POST", `/api/family-reports/${old.body.id}/confirm`)).status, 200);
  assert.equal((await f.call("PUT", `/api/family-reports/${old.body.id}`, { proposal: report() })).status, 422);
  const second = await f.generate(), newer = await f.save(second); assert.notEqual(newer.body.id, old.body.id);
  assert.equal((await f.call("POST", `/api/family-reports/${newer.body.id}/confirm`)).status, 200);
  const rows = (await f.db.query(`select id,status,version from family_reports order by version`)).rows;
  assert.deepEqual(rows.map((item) => [item.status, item.version]), [["archived", 1], ["active", 2]]);
  const listing = await f.call("GET", `/api/family-reports?studentId=${studentId}&periodStart=${start}&periodEnd=${end}`);
  assert.equal(listing.body.reports.length, 2); assert.equal(listing.body.reports[0].status, "active");
});

test("índices evitan duplicados y rollback preserva informe activo si falla confirmación", async () => {
  const f = await fixture(), first = await f.generate(), old = await f.save(first);
  assert.equal((await f.call("POST", `/api/family-reports/${old.body.id}/confirm`)).status, 200);
  const second = await f.generate(), draft = await f.save(second);
  await assert.rejects(() => f.db.query(`insert into family_reports(id,student_id,period_start,period_end,version,details,status) values('00000000-0000-4000-8000-000000000899',$1,$2::date,$3::date,99,'{}'::jsonb,'draft')`, [studentId, start, end]));
  const original = f.db.query.bind(f.db);
  f.db.query = async (sql, params) => { if (sql.includes("set status='active',teacher_confirmed_at")) throw new Error("Fallo simulado"); return original(sql, params); };
  assert.equal((await f.call("POST", `/api/family-reports/${draft.body.id}/confirm`)).status, 422);
  f.db.query = original;
  const rows = (await f.db.query(`select status from family_reports order by version`)).rows;
  assert.deepEqual(rows.map((item) => item.status), ["active", "draft"]);
});

test("migraciones y UI incluyen RLS, estados de recarga y editor solo lectura", async () => {
  const [local, supabase, ui, workspace, studentContext] = await Promise.all([
    readFile(new URL("../../local-db/migrations/0022_family_reports.sql", import.meta.url), "utf8"),
    readFile(new URL("../../supabase/migrations/202609220019_family_reports.sql", import.meta.url), "utf8"),
    readFile(new URL("../features/dashboard/components/family-report-generator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/dashboard/components/teacher-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("./student-context-service.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(local, /source_conclusion_snapshot/); assert.match(local, /where status = 'draft'/);
  assert.match(supabase, /enable row level security/); assert.match(supabase, /public\.owns_student\(student_id\)/);
  assert.match(ui, /api\/family-reports\/options/); assert.match(ui, /api\/family-reports\?/); assert.match(ui, /solo lectura/); assert.match(ui, /Confirmar informe/);
  assert.match(workspace, /Informe a familias/);
  assert.doesNotMatch(studentContext, /from family_reports/);
});
