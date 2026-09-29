import test from "node:test";
import assert from "node:assert/strict";
import { analyzeStudyArm, rankedCandidates, pairedClusterInterval } from "../src/current-study-analysis.mjs";
const expected = { primary: "MAT_CANTIDAD", acceptable_primary: ["MAT_CANTIDAD", "MAT_FORMA"], acceptable_secondary: [],
  should_abstain: false, should_privacy_block: false };
function outcome(primary, secondary = []) { return { status: "review", primary, additional: secondary, calls: [],
  cost_jev_usd: 0, cost_luna_usd: 0, total_cost_usd: 0, total_latency_ms: 1 }; }
const results = [1, 2, 3].map((number) => ({ number, cases: [{ id: "S1", raw_observation: "Sintético", expected,
  arms: { A: outcome(number === 1 ? null : "MAT_CANTIDAD"), B: outcome("MAT_FORMA", ["COM_ORAL"]) } }] }));
test("errores aceptan alternativa, separan secundaria de primaria y detectan inestabilidad", () => {
  const a = analyzeStudyArm(results, "A"), b = analyzeStudyArm(results, "B");
  assert.equal(a.summary.false_abstentions, 1); assert.deepEqual(a.unstable_primary_ids, ["S1"]);
  assert.equal(b.summary.acceptable_primary_accuracy, 1);
  assert.ok(b.errors.every((row) => row.types.includes("unnecessary_secondary") && !row.types.includes("wrong_primary")));
  assert.equal(rankedCandidates([{ name: "A", analysis: a }, { name: "B", analysis: b }])[0].name, "B");
  const interval = pairedClusterInterval(results, "A", "B");
  assert.equal(interval.cases, 1); assert.equal(interval.gain, 1 / 3);
});
