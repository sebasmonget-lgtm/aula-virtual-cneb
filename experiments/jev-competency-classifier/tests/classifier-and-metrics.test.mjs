import test from "node:test";
import assert from "node:assert/strict";
import { createFakeClassifier } from "../src/fake-classifier.mjs";
import { loadKnowledgeBase } from "../src/kb-loader.mjs";
import { summarizeBenchmark } from "../src/metrics.mjs";

const config = { classifier_version: "test", auto_accept_threshold: 0.82, review_threshold: 0.5, minimum_margin: 0.15, maximum_unclassifiable_probability_for_auto_accept: 0.2, maximum_observation_characters: 2000 };
test("el fake normaliza una respuesta choice sin red", async () => {
  const kb = await loadKnowledgeBase();
  const fake = createFakeClassifier({ knowledgeBase: kb, config, responder: async ({ plan }) => ({ model: "jev-test", usage: { input_tokens: 10, output_tokens: 2 }, answers: { competency: { type: "choice", choice: "MAT_CANTIDAD", confidence: 0.95, probabilities: Object.fromEntries([...plan.optionIds].map((id) => [id, id === "MAT_CANTIDAD" ? 0.95 : id === "NO_CLASIFICABLE" ? 0.01 : 0.04 / (plan.optionIds.size - 2)])) } } }) });
  const result = await fake.classifyObservation({ age: 5, observation: "Contó vasos." });
  assert.equal(result.status, "classified"); assert.equal(result.primary_competency_id, "MAT_CANTIDAD");
});

test("las métricas calculan precisión y cobertura de autoaceptación", () => {
  const cases = [{ id: "a", age: 5, expected_competency_id: "MAT_CANTIDAD", acceptable_secondary_ids: [], case_type: "clear" }, { id: "b", age: 4, expected_competency_id: null, acceptable_secondary_ids: [], case_type: "poor" }];
  const base = { classifier_version: "test", knowledge_base_version: "4", criteria_fingerprint: "x", model_confidence: 0.9, top1_probability: 0.9, top2_probability: 0.08, top1_top2_margin: 0.82, unclassifiable_probability: 0.02, model_requested: "test", model_effective: "test", usage: { input_tokens: 10, output_tokens: 1 }, latency_ms: 5, cache_hit: false };
  const results = [{ id: "a", ...base, status: "classified", primary_competency_id: "MAT_CANTIDAD", proposed_competency_id: "MAT_CANTIDAD", probabilities: { MAT_CANTIDAD: 0.9, COM_ORAL: 0.08, NO_CLASIFICABLE: 0.02 } }, { id: "b", ...base, status: "unclassified", primary_competency_id: null, proposed_competency_id: null, probabilities: { MAT_CANTIDAD: 0.1, COM_ORAL: 0.1, NO_CLASIFICABLE: 0.8 } }];
  const report = summarizeBenchmark({ cases, results, policy: config, pricing: { input_usd_per_million: 0.042, output_usd_per_million: 0 } });
  assert.equal(report.top1_accuracy, 1); assert.equal(report.abstention_accuracy, 1); assert.equal(report.auto_accept_coverage, 0.5);
});
