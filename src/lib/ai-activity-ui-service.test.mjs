import test from "node:test";
import assert from "node:assert/strict";
import { buildTeacherActivityGenerationInput, generateTeacherActivity, ActivityGenerationUIError, teacherMessageForActivityGenerationError } from "./ai-activity-ui-service.mjs";

const classroom = { id: "classroom-5", section: "Sala Amarilla", age: 5 };
const request = { activityPurpose: "Explorar cambios de sombra.", context: "El grupo juega con linternas.", materials: ["linternas", "papel"] };
const proposal = { title: "Sombras", purpose: "Explorar", meaningful_situation: "Situación", teacher_preparation: "Preparar", child_actions: "Explorar", mediation: "Preguntar", evidence_opportunities: "Observar", closure_or_continuity: "Cerrar", competency_status: "unconfirmed", competency_id: null };
const plan = { execution: "generation", provider: "openai", model: "gpt-5.6-terra", reasoning_effort: "low" };

test("A y H: prepara activity sin competencia con aula y materiales precargados", () => {
  const input = buildTeacherActivityGenerationInput({ request, classroom });
  assert.equal(input.age, 5);
  assert.equal(input.classroom_context.section, "Sala Amarilla");
  assert.deepEqual(input.classroom_context.materials, ["linternas", "papel"]);
  assert.equal(input.competency_ids, undefined);
});

test("B: conserva exactamente una competencia confirmada", () => {
  const input = buildTeacherActivityGenerationInput({ request: { ...request, competencyId: "CYT_INDAGA" }, classroom });
  assert.deepEqual(input.competency_ids, ["CYT_INDAGA"]);
});

test("genera solo activity, conserva metadata interna y no envía datos privados", async () => {
  let providerRequest;
  const result = await generateTeacherActivity({
    request: { ...request, photo_path: "/private/photo.jpg", evidence: { media: "binary" } },
    classroom,
    resolvePlan: () => plan,
    createProvider: (receivedPlan) => ({ id: receivedPlan.provider }),
    generate: async (input, options) => {
      providerRequest = input;
      assert.equal(options.executionPlan.model, "gpt-5.6-terra");
      return { output: proposal, metadata: { workflow: "activity", model: "gpt-5.6-terra", response_id: "resp_mock", usage: { input_tokens: 1 }, execution_plan: plan }, provenance: { knowledge_unit_ids: ["unit-1"] } };
    },
  });
  assert.equal(result.proposal.competency_status, "unconfirmed");
  assert.equal(result.internalMetadata.response_id, "resp_mock");
  assert.doesNotMatch(JSON.stringify(providerRequest), /private|binary|photo_path/);
});

test("rechaza propósito ausente, workflows alternos y mapea errores amigables", async () => {
  assert.throws(() => buildTeacherActivityGenerationInput({ request: {}, classroom }), ActivityGenerationUIError);
  await assert.rejects(
    () => generateTeacherActivity({ request, classroom, resolvePlan: () => ({ execution: "code" }) }),
    (error) => error instanceof ActivityGenerationUIError,
  );
  assert.equal(teacherMessageForActivityGenerationError({ reason: "rate_limited" }), "El servicio está ocupado. Inténtalo nuevamente en unos momentos.");
  assert.equal(teacherMessageForActivityGenerationError({ reason: "authentication_failed" }), "No se pudo acceder al servicio de IA.");
});
