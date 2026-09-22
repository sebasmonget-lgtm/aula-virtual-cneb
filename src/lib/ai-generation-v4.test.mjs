import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { MissingWorkflowContextError } from "./ai-context-builder-v4.mjs";
import { AIProvider, generateAIWorkflowV4, InvalidAIGenerationError } from "./ai-generation-v4.mjs";

class MockAIProvider extends AIProvider {
  constructor(response) {
    super({ id: "mock", model: "deterministic-test" });
    this.response = response;
    this.requests = [];
  }

  async generate(request) {
    this.requests.push(request);
    return typeof this.response === "function" ? this.response(request) : this.response;
  }
}

const activityFields = {
  title: "Sombras que cambian",
  purpose: "Explorar cómo cambia una sombra.",
  meaningful_situation: "El grupo quiere saber por qué su sombra se mueve.",
  teacher_preparation: "Linternas, espacio seguro y materiales disponibles.",
  child_actions: "Prueban, observan y comparten hallazgos.",
  mediation: "La docente pregunta según lo que observan.",
  evidence_opportunities: "Explican qué cambió y cómo lo probaron.",
  closure_or_continuity: "Comparan hallazgos y continúan otro día.",
};

const confirmedInput = {
  workflow: "activity",
  age: 5,
  teacher_request: "Preparar exploración de sombras.",
  activity_purpose: "Explorar cambios de sombra.",
  competency_ids: ["COM_ORAL"],
  classroom_context: { id: "class-5", materials: ["linternas"], private_path: "/private/class" },
  evidence: { criterion_id: "criterion-1", observed_status: "demonstrated", photo_path: "/private/photo.jpg", media: "binary" },
};

test("A: genera una activity de 5 años con competencia confirmada", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const provider = new MockAIProvider({ ...activityFields, competency_status: "confirmed", competency_id: "COM_ORAL" });
  const result = await generateAIWorkflowV4(confirmedInput, { provider, knowledgeBase });

  assert.equal(result.output.competency_status, "confirmed");
  assert.equal(result.output.competency_id, "COM_ORAL");
  assert.equal(result.validation.status, "valid");
  assert.equal(result.metadata.workflow, "activity");
  assert.deepEqual(result.provenance, provider.requests[0].ai_context_bundle.provenance);
  assert.equal(provider.requests[0].ai_context_bundle.context.workflow_inputs.activity_purpose, "Explorar cambios de sombra.");
  assert.ok(Object.isFrozen(provider.requests[0].ai_context_bundle));
});

test("B: genera una activity sin competencia confirmada y la declara unconfirmed", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const provider = new MockAIProvider({ ...activityFields, competency_status: "unconfirmed", competency_id: null });
  const result = await generateAIWorkflowV4({
    workflow: "activity", age: 4, teacher_request: "Preparar exploración de agua.", activity_purpose: "Explorar recipientes con agua.",
  }, { provider, knowledgeBase });

  assert.equal(result.output.competency_status, "unconfirmed");
  assert.equal(result.output.competency_id, null);
});

test("C: propaga MissingWorkflowContextError", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const provider = new MockAIProvider({ ...activityFields, competency_status: "unconfirmed", competency_id: null });
  await assert.rejects(
    () => generateAIWorkflowV4({ workflow: "activity", age: 5, teacher_request: "Preparar actividad." }, { provider, knowledgeBase }),
    MissingWorkflowContextError,
  );
  assert.equal(provider.requests.length, 0);
});

test("D y E: rechaza respuesta mal formada o competencia inventada", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const malformed = new MockAIProvider({ ...activityFields, competency_status: "confirmed", competency_id: "COM_ORAL" });
  delete malformed.response.title;
  await assert.rejects(
    () => generateAIWorkflowV4(confirmedInput, { provider: malformed, knowledgeBase }),
    (error) => error instanceof InvalidAIGenerationError && error.reason === "activity_schema_mismatch",
  );
  const invented = new MockAIProvider({ ...activityFields, competency_status: "confirmed", competency_id: "INVENTED" });
  await assert.rejects(
    () => generateAIWorkflowV4(confirmedInput, { provider: invented, knowledgeBase }),
    (error) => error instanceof InvalidAIGenerationError && error.reason === "activity_competency_outside_bundle",
  );
  const unparseable = new MockAIProvider("respuesta sin JSON");
  await assert.rejects(
    () => generateAIWorkflowV4(confirmedInput, { provider: unparseable, knowledgeBase }),
    (error) => error instanceof InvalidAIGenerationError && error.reason === "provider_response_not_parseable",
  );
});

test("F y G: mismo mock es determinista y conserva provenance", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const response = JSON.stringify({ ...activityFields, competency_status: "confirmed", competency_id: "COM_ORAL" });
  const first = await generateAIWorkflowV4(confirmedInput, { provider: new MockAIProvider(response), knowledgeBase });
  const second = await generateAIWorkflowV4(confirmedInput, { provider: new MockAIProvider(response), knowledgeBase });
  assert.deepEqual(first, second);
  assert.ok(first.provenance.knowledge_unit_ids.length > 0);
});

test("H: el provider solo recibe AIContextBundle sin datos privados", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const provider = new MockAIProvider({ ...activityFields, competency_status: "confirmed", competency_id: "COM_ORAL" });
  await generateAIWorkflowV4(confirmedInput, { provider, knowledgeBase });
  const serializedRequest = JSON.stringify(provider.requests[0]);
  assert.doesNotMatch(serializedRequest, /private_path|photo_path|private\/photo|binary/);
  assert.deepEqual(Object.keys(provider.requests[0]).sort(), ["ai_context_bundle", "output_schema", "workflow"]);
});

test("la capa de generación no importa Jev, proveedores concretos, HTTP ni PDFs", async () => {
  const source = await readFile(new URL("./ai-generation-v4.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /jev-decision|\.pdf|fetch\(|https?:|openai|gpt|anthropic/i);
  assert.match(source, /prepareAIRequestV4/);
});
