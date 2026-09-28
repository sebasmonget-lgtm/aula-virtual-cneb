import test from "node:test";
import assert from "node:assert/strict";
import { reducedExperiment } from "./reduced.mjs";
test("la selección reducida preserva éxitos, usa una repetición pareada y no hace llamadas", () => {
  const item = { id: "base", age: 3, period: 1, kind: "base" };
  const state = { cases: [item], runs: [1, 2, 3].flatMap((repetition) => ["A", "B"].map((arm) => ({
    case_id: item.id, repetition, arm, status: "valid", input_tokens: 100, output_tokens: 20,
    cost_usd: 0.01, latency_ms: 20, retries: 0, unknown_billed_attempts: 0, draft: { purpose: "Explorar" } }))) };
  const snapshot = JSON.stringify(state); const result = reducedExperiment(state);
  assert.equal(result.report.complete_cases, 1); assert.equal(result.report.complete_paired_repetitions_available, 3);
  assert.deepEqual(result.report.selected[0].repetitions, [1]);
  assert.equal(result.bundles.length, 2); assert.equal(JSON.stringify(state), snapshot);
  assert.equal(result.report.additional_spent_usd, 0); assert.equal(result.report.winner, null);
  assert.ok(result.bundles.every((item) => !Object.hasOwn(item, "arm")));
});
