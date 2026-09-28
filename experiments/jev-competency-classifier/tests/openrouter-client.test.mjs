import test from "node:test";
import assert from "node:assert/strict";
import { createOpenRouterClient } from "../src/openrouter-client.mjs";
import { createJevCompetencyClassifier } from "../src/jev-classifier.mjs";
import { loadKnowledgeBase } from "../src/kb-loader.mjs";
import { cacheKey } from "../src/cache.mjs";

const config = { classifier_version: "openrouter-test", auto_accept_threshold: 0.82, review_threshold: 0.5, minimum_margin: 0.15, maximum_unclassifiable_probability_for_auto_accept: 0.2, maximum_observation_characters: 2000, timeout_ms: 15000 };

test("OpenRouter envía una decisión Jev y normaliza el costo real", async () => {
  const knowledgeBase = await loadKnowledgeBase();
  let calls = 0;
  const classifier = createJevCompetencyClassifier({ knowledgeBase, config, gateway: "openrouter", apiKey: "test-key", useCache: false, fetchImpl: async (url, options) => {
    calls += 1;
    assert.equal(url, "https://openrouter.ai/api/alpha/decisions");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.authorization, "Bearer test-key");
    const request = JSON.parse(options.body);
    assert.equal(request.model, "typesafe/jev-1.13");
    assert.equal(request.questions.competency.type, "choice");
    assert.equal(request.state.observation, "Contó los vasos antes de repartirlos.");
    const ids = Object.keys(request.questions.competency.criteria);
    const probabilities = Object.fromEntries(ids.map((id) => [id, id === "MAT_CANTIDAD" ? 0.95 : id === "NO_CLASIFICABLE" ? 0.01 : 0.04 / (ids.length - 2)]));
    return new Response(JSON.stringify({ model: "typesafe/jev-1.13-20260917", answers: { competency: { type: "choice", choice: "MAT_CANTIDAD", confidence: 0.96, probabilities } }, usage: { input_tokens: 357, output_tokens: 38, cost: 0.000014994 } }), { status: 200 });
  } });
  const result = await classifier.classifyObservation({ age: 5, observation: "Contó los vasos antes de repartirlos." });
  assert.equal(calls, 1);
  assert.equal(result.status, "classified");
  assert.equal(result.primary_competency_id, "MAT_CANTIDAD");
  assert.equal(result.model_effective, "typesafe/jev-1.13-20260917");
  assert.equal(result.usage.cost_usd, 0.000014994);
});

test("OpenRouter informa errores de autenticación sin devolver el token", async () => {
  const client = createOpenRouterClient({ apiKey: "test-key", fetchImpl: async () => new Response("{}", { status: 401 }) });
  await assert.rejects(client.systemOne({}), (error) => error.code === "auth" && !error.message.includes("test-key"));
});

test("la clave de caché distingue la observación y la pasarela", () => {
  const base = { gateway: "openrouter", input: { age: 5, observation: "Contó vasos" } };
  assert.notEqual(cacheKey(base), cacheKey({ ...base, input: { age: 5, observation: "Contó platos" } }));
  assert.notEqual(cacheKey(base), cacheKey({ ...base, gateway: "typesafe" }));
});

test("noul paralelo consulta todas las competencias aplicables en una sola petición y conserva varias propuestas", async () => {
  const knowledgeBase = await loadKnowledgeBase();
  let calls = 0;
  const classifier = createJevCompetencyClassifier({ knowledgeBase, config: { ...config, noul_positive_threshold: 0.8, noul_review_threshold: 0.5 }, method: "parallel-noul", gateway: "openrouter", apiKey: "test-key", useCache: false, fetchImpl: async (_url, options) => {
    calls += 1;
    const request = JSON.parse(options.body);
    assert.equal(request.state.observation, "Contó vasos y explicó a su compañero por qué faltaba uno.");
    assert.ok(Object.keys(request.questions).length > 2);
    assert.ok(Object.values(request.questions).every((question) => question.type === "noul" && question.criteria.true && question.criteria.false));
    assert.ok(!request.questions.PS_RELIGION);
    const answers = Object.fromEntries(Object.keys(request.questions).map((id) => [id, { type: "noul", noul: id === "MAT_CANTIDAD" ? 0.94 : id === "COM_ORAL" ? 0.88 : 0.05 }]));
    return new Response(JSON.stringify({ model: "typesafe/jev-1.13-20260917", answers, usage: { input_tokens: 500, output_tokens: 100, cost: 0.0001 } }), { status: 200 });
  } });
  const result = await classifier.classifyObservation({ age: 5, observation: "Contó vasos y explicó a su compañero por qué faltaba uno." });
  assert.equal(calls, 1);
  assert.equal(result.status, "review");
  assert.deepEqual(result.proposed_competency_ids, ["MAT_CANTIDAD", "COM_ORAL"]);
  assert.equal(result.primary_competency_id, null);
  assert.equal(result.model_confidence, null);
});

test("una respuesta noul incompleta falla cerrada", async () => {
  const knowledgeBase = await loadKnowledgeBase();
  const classifier = createJevCompetencyClassifier({ knowledgeBase, config, method: "parallel-noul", gateway: "openrouter", apiKey: "test-key", useCache: false, fetchImpl: async () => new Response(JSON.stringify({ model: "test", answers: { MAT_CANTIDAD: { type: "noul", noul: 0.9 } }, usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 }) });
  const result = await classifier.classifyObservation({ age: 5, observation: "Contó vasos." });
  assert.equal(result.status, "classification_failed");
  assert.equal(result.error_code, "invalid_response");
});

test("focused envía clasificación y suficiencia en una llamada y bloquea autoaceptación insuficiente", async () => {
  const knowledgeBase = await loadKnowledgeBase();
  let calls = 0;
  const classifier = createJevCompetencyClassifier({ knowledgeBase, config: { ...config, minimum_sufficiency_for_auto_accept: 0.8 }, method: "choice", criteriaProfile: "focused", gateway: "openrouter", apiKey: "test-key", useCache: false, fetchImpl: async (_url, options) => {
    calls += 1;
    const request = JSON.parse(options.body);
    assert.equal(request.questions.evidence_sufficient.type, "noul");
    assert.equal(request.questions.competency.type, "choice");
    const ids = Object.keys(request.questions.competency.criteria);
    const probabilities = Object.fromEntries(ids.map((id) => [id, id === "MAT_CANTIDAD" ? 0.95 : id === "NO_CLASIFICABLE" ? 0.01 : 0.04 / (ids.length - 2)]));
    return new Response(JSON.stringify({ model: "jev-test", answers: { competency: { type: "choice", choice: "MAT_CANTIDAD", confidence: 0.98, probabilities }, evidence_sufficient: { type: "noul", noul: 0.3 } }, usage: { input_tokens: 500, output_tokens: 50 } }), { status: 200 });
  } });
  const result = await classifier.classifyObservation({ age: 5, observation: "Contó cinco." });
  assert.equal(calls, 1);
  assert.equal(result.status, "review");
  assert.equal(result.primary_competency_id, null);
  assert.equal(result.proposed_competency_id, "MAT_CANTIDAD");
  assert.equal(result.sufficiency_probability, 0.3);
});

test("focused noul requiere respuesta de suficiencia y admite varias competencias", async () => {
  const knowledgeBase = await loadKnowledgeBase();
  let includeGate = true;
  const classifier = createJevCompetencyClassifier({ knowledgeBase, config, method: "parallel-noul", criteriaProfile: "focused", gateway: "openrouter", apiKey: "test-key", useCache: false, fetchImpl: async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.equal(request.questions.evidence_sufficient.type, "noul");
    const answers = Object.fromEntries(Object.keys(request.questions).filter((id) => includeGate || id !== "evidence_sufficient").map((id) => [id, { type: "noul", noul: id === "MAT_CANTIDAD" ? 0.92 : id === "COM_ORAL" ? 0.86 : id === "evidence_sufficient" ? 0.94 : 0.05 }]));
    return new Response(JSON.stringify({ model: "jev-test", answers, usage: { input_tokens: 500, output_tokens: 70 } }), { status: 200 });
  } });
  const input = { age: 5, observation: "Contó los platos y explicó el faltante." };
  const valid = await classifier.classifyObservation(input);
  assert.deepEqual(valid.proposed_competency_ids, ["MAT_CANTIDAD", "COM_ORAL"]);
  assert.equal(valid.sufficiency_probability, 0.94);
  includeGate = false;
  const invalid = await classifier.classifyObservation(input);
  assert.equal(invalid.status, "classification_failed");
});
