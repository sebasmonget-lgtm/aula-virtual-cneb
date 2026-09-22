import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { buildEvidenceCaptureContext, validateEvidenceCaptureV4 } from "./evidence-capture-v4.mjs";

const valid = { studentId: "student", activityId: "activity", criterionId: "criterion", observationStatus: "demonstrated" };

test("A-B: evidence_capture se resuelve en código sin provider", () => {
  const plan = resolveAIExecutionPlan({ workflow: "evidence_capture" });
  assert.equal(plan.execution, "code"); assert.equal(plan.provider, null); assert.equal(plan.model, null);
});
test("K-M: valida estados, IDs, nota opcional y límite de observación", () => {
  assert.equal(validateEvidenceCaptureV4(valid).observationText, "");
  assert.throws(() => validateEvidenceCaptureV4({ ...valid, observationStatus: "AD" }));
  assert.throws(() => validateEvidenceCaptureV4({ ...valid, observationText: "x".repeat(4001) }));
});
test("P-Q: contexto conserva expected distinto de observed y scope sin bulk", () => {
  const context = buildEvidenceCaptureContext({ activity: { id: "a", title: "Sombras" }, student: { id: "s" }, criterion: { id: "c", competency_v4_id: "CYT_INDAGA", criterion_text: "Compara", details: { expected_evidence: "Explica", observation_focus: ["Luz"], acceptable_evidence_variations: ["Señala"], evidence_scope: "group" } } });
  assert.equal(context.criterion.expected_evidence, "Explica"); assert.equal(context.criterion.evidence_scope, "group"); assert.equal(Object.hasOwn(context, "observation_text"), false);
});
test("C-J, N-O, R, S-T y Y: servidor exige relación activa, coherencia v4, foto válida y no usa IA", async () => {
  const source = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  const route = source.slice(source.indexOf('url.pathname === "/api/evidences"'), source.indexOf('url.pathname === "/api/attendance"'));
  assert.match(route, /validateEvidenceCaptureV4/); assert.match(route, /a\.status = 'active'/); assert.match(route, /ac\.status = 'active'/); assert.match(route, /competency_v4_id/); assert.match(route, /activity_details\?\.competency_id !== criterion\.competency_v4_id/); assert.match(route, /image\/jpeg/); assert.match(route, /3_000_000/); assert.doesNotMatch(route, /pendingAIGenerations|generateAIWorkflowV4|OpenAI|insert into evidences[\s\S]*insert into evidences/i);
});
test("U-X: dashboard y StudentContext conservan competencias v4 sin UUID inventado", async () => {
  const [server, context, ui] = await Promise.all([readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8"), readFile(new URL("./student-context-service.mjs", import.meta.url), "utf8"), readFile(new URL("../features/dashboard/components/teacher-workspace.tsx", import.meta.url), "utf8")]);
  assert.match(server, /c\.status = 'active'/); assert.match(server, /ac\.status = 'active'/); assert.match(server, /competency_v4_id/); assert.match(context, /v4:/); assert.match(context, /competency_v4_id/); assert.match(context, /media_available/); assert.match(ui, /Evidencia que podría verse/); assert.match(ui, /Esta es una observación de esta situación, no una calificación final/); assert.match(ui, /observación grupal/);
});
