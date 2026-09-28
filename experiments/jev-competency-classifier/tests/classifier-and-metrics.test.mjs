import test from "node:test";
import assert from "node:assert/strict";
import { createFakeClassifier } from "../src/fake-classifier.mjs";
import { loadKnowledgeBase } from "../src/kb-loader.mjs";
import { summarizeBenchmark, summarizeParallelBenchmark } from "../src/metrics.mjs";
import { normalizeHybridResult } from "../src/result.mjs";

const config = { classifier_version: "test", auto_accept_threshold: 0.82, review_threshold: 0.5, minimum_margin: 0.15, maximum_unclassifiable_probability_for_auto_accept: 0.2, maximum_observation_characters: 2000 };
test("híbrido compone choice y nouls independientes para varias propuestas", () => {
  const result = normalizeHybridResult({ response: { model: "typesafe/jev-1.13-test",
    usage: { input_tokens: 20, output_tokens: 4 }, answers: {
      competency: { type: "choice", choice: "A", confidence: 0.45,
        probabilities: { A: 0.6, B: 0.3, NO_CLASIFICABLE: 0.1 } },
      A: { type: "noul", noul: 0.6 }, B: { type: "noul", noul: 0.9 } } },
  plan: { profile: "compact", optionIds: new Set(["A", "B", "NO_CLASIFICABLE"]),
    criteriaFingerprint: "x" }, questionIds: new Set(["A", "B"]),
  policy: { ...config, noul_positive_threshold: 0.8 }, classifierVersion: "test",
  knowledgeBaseVersion: "4", latencyMs: 1, modelRequested: "typesafe/jev-1.13" });
  assert.deepEqual(result.proposed_competency_ids, ["A", "B"]);
  assert.equal(result.status, "review");
});
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
  assert.equal(report.auto_accept_primary_accuracy, 1);
  assert.ok(report.auto_accept_accuracy_95_wilson_interval[0] < 1);
});

test("el reporte separa alternativa plausible de primaria estricta y respeta el filtro de suficiencia", () => {
  const cases = [{ id: "a", expected_competency_id: "PS_RELIGION", acceptable_secondary_ids: ["COM_ORAL"], case_type: "ambiguous" }, { id: "b", expected_competency_id: "MAT_CANTIDAD", acceptable_secondary_ids: [], case_type: "short" }];
  const results = [
    { id: "a", status: "classified", probabilities: { COM_ORAL: 0.94, PS_RELIGION: 0.05, NO_CLASIFICABLE: 0.01 }, model_confidence: 0.96, sufficiency_probability: 0.95, usage: { input_tokens: 10, output_tokens: 1 }, latency_ms: 5 },
    { id: "b", status: "review", probabilities: { MAT_CANTIDAD: 0.95, COM_ORAL: 0.04, NO_CLASIFICABLE: 0.01 }, model_confidence: 0.98, sufficiency_probability: 0.2, usage: { input_tokens: 10, output_tokens: 1 }, latency_ms: 5 },
  ];
  const report = summarizeBenchmark({ cases, results, policy: { ...config, minimum_sufficiency_for_auto_accept: 0.8 }, pricing: { input_usd_per_million: 0.042, output_usd_per_million: 0 } });
  assert.equal(report.auto_accept_accuracy, 1);
  assert.equal(report.auto_accept_primary_accuracy, 0);
  assert.equal(report.auto_accept_coverage, 0.5);
  assert.equal(report.low_sufficiency_count, 1);
  assert.equal(report.thresholds[0].auto_accept_count, 1);
});

test("la métrica multietiqueta distingue secundaria sola de primaria y secundaria juntas", () => {
  const cases = [{ id: "a", expected_competency_id: "PS_CONVIVE", acceptable_secondary_ids: ["COM_ORAL"] }, { id: "b", expected_competency_id: "MAT_CANTIDAD", acceptable_secondary_ids: ["COM_ORAL"] }];
  const results = [{ id: "a", status: "review", proposed_competency_ids: ["COM_ORAL"], competency_scores: { COM_ORAL: 0.9, PS_CONVIVE: 0.7 }, usage: { input_tokens: 10, output_tokens: 1 }, latency_ms: 5 }, { id: "b", status: "review", proposed_competency_ids: ["MAT_CANTIDAD", "COM_ORAL"], competency_scores: { MAT_CANTIDAD: 0.9, COM_ORAL: 0.85 }, usage: { input_tokens: 10, output_tokens: 1 }, latency_ms: 5 }];
  const report = summarizeParallelBenchmark({ cases, results, pricing: { input_usd_per_million: 0.042, output_usd_per_million: 0 } });
  assert.equal(report.secondary_in_proposals, 2);
  assert.equal(report.primary_and_secondary_in_proposals, 1);
  assert.equal(report.multiple_proposals, 1);
});
