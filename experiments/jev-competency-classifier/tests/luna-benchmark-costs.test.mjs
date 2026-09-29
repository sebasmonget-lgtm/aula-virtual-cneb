import test from "node:test";
import assert from "node:assert/strict";
import { analyzeBenchmarkCosts, costAnalysisMarkdown, monthlyCostCsv } from "../src/luna-benchmark-costs.mjs";
import { scoreOutcome } from "../src/luna-benchmark-score.mjs";

const scenarios = { currency: "USD", school_days_per_month: 20,
  observations_per_teacher_per_day: [10, 20, 40], teachers: [1, 10, 50, 100], projection_note: "Estimación" };
const expected = { primary: "MAT_CANTIDAD", acceptable_primary: [], acceptable_secondary: [],
  should_abstain: false, should_privacy_block: false };
function fixture() {
  const luna = { cost_usd: 0.02, latency_ms: 200, usage: { input_tokens: 100, output_tokens: 20,
    cached_input_tokens: 0, cache_write_tokens: 0, reasoning_tokens: 5 } };
  function outcome(useLuna, correct, cost, calls = 1) {
    const value = { status: "review", primary: correct ? "MAT_CANTIDAD" : "COM_ARTE", additional: [],
      calls: Array.from({ length: calls }, () => ({ cost_usd: cost / calls,
        usage: { cost: cost / calls, input_tokens: 1000, output_tokens: 100 } })),
      cost_jev_usd: cost, cost_luna_usd: useLuna ? luna.cost_usd : 0,
      total_cost_usd: cost + (useLuna ? luna.cost_usd : 0), total_latency_ms: useLuna ? 320 : 100,
      luna: useLuna ? luna : null };
    value.score = scoreOutcome(expected, value);
    return value;
  }
  return { status: "completed", metadata: { dataset: "fixture", pricing: {}, preflight: { cases: 1 }, options: { runs: 1 } },
    results: [{ number: 1, cases: [{ id: "A", expected, luna,
      arms: { CURRENT_RAW: outcome(false, false, 0.1, 2), CURRENT_LUNA: outcome(true, true, 0.12, 2),
        PARALLEL_RAW: outcome(false, true, 0.05), PARALLEL_LUNA: outcome(true, true, 0.06) },
      comparison: { CURRENT: "IMPROVED", PARALLEL: "SAME" } }] }] };
}

test("ledger cuenta Luna física una vez y atribuye una completa por brazo; todos los escenarios", () => {
  const report = analyzeBenchmarkCosts(fixture(), scenarios);
  assert.ok(Math.abs(report.physical.total_usd - 0.35) < 1e-12);
  assert.equal(report.physical.calls_total, 7);
  assert.equal(report.arms.CURRENT_LUNA.calls_per_observation, 3);
  assert.equal(report.arms.PARALLEL_LUNA.calls_per_observation, 2);
  assert.equal(report.arms.CURRENT_LUNA.luna_tokens.output_tokens.measured, 20);
  assert.equal(report.physical.luna_tokens.output_tokens.measured, 20);
  assert.equal(report.monthly.length, 12);
  assert.equal(report.monthly[0].observations_month_total, 200);
  assert.equal(report.monthly.at(-1).observations_month_total, 80000);
  assert.equal(report.monthly[0].projected_cost_usd.PARALLEL_RAW, 10);
  assert.equal(report.effectiveness.lowest_cost_per_correct_classification, "PARALLEL_RAW");
  assert.ok(Math.abs(report.deltas.CURRENT.percentage_cost_increase - 40) < 1e-10);
  assert.ok(Math.abs(report.deltas.CURRENT.additional_cost_per_error_corrected_usd - 0.04) < 1e-10);
  assert.ok(Math.abs(report.deltas.CURRENT.acceptable_accuracy_percentage_points_per_additional_usd - 2500) < 1e-8);
  assert.equal(report.deltas.CURRENT.paired_latency_additional_ms, 220);
  assert.equal(report.deltas.PARALLEL.additional_cost_per_error_corrected_usd, null);
  assert.match(costAnalysisMarkdown(report), /Proyección mensual/);
  assert.equal(monthlyCostCsv(report).trim().split("\n").length, 13);
});

test("costo desconocido no se sustituye por cero; estimado y proveedor se separan", () => {
  const raw = fixture();
  const arm = raw.results[0].cases[0].arms.CURRENT_LUNA;
  arm.calls[0].usage = { input_tokens: 1000, output_tokens: 100 };
  arm.calls[1].usage = null; arm.calls[1].cost_usd = null;
  arm.total_cost_usd = null;
  const report = analyzeBenchmarkCosts(raw, scenarios);
  assert.equal(report.arms.CURRENT_LUNA.jev.tariff_estimated_usd, 0.06);
  assert.equal(report.arms.CURRENT_LUNA.jev.unknown_cost_calls, 1);
  assert.equal(report.arms.CURRENT_LUNA.cost_usd, null);
  assert.equal(report.physical.total_usd, null);
  assert.equal(report.monthly[0].projected_cost_usd.CURRENT_LUNA, null);
  assert.equal(report.deltas.CURRENT.percentage_cost_increase, null);
});

test("bloqueos se incluyen a cero sin crear llamadas; fallos detienen recomendación", () => {
  const raw = fixture();
  const blocked = { id: "B", expected, luna: null, arms: {}, comparison: { CURRENT: "SAME", PARALLEL: "SAME" } };
  for (const arm of Object.keys(raw.results[0].cases[0].arms)) {
    const value = { status: "privacy_blocked", calls: [], total_cost_usd: 0, total_latency_ms: 0, primary: null, additional: [] };
    value.score = scoreOutcome(expected, value); blocked.arms[arm] = value;
  }
  raw.results[0].cases.push(blocked);
  const report = analyzeBenchmarkCosts(raw, scenarios);
  assert.equal(report.arms.CURRENT_LUNA.calls_per_observation, 1.5);
  assert.equal(report.arms.CURRENT_LUNA.calls_per_active_observation, 3);
  assert.equal(report.arms.CURRENT_LUNA.privacy_blocked_observations, 1);
  raw.status = "stopped";
  assert.equal(analyzeBenchmarkCosts(raw, scenarios).effectiveness.lowest_cost_per_correct_classification, null);
});

test("brazos ausentes no generan deltas ni costos mensuales", () => {
  const raw = fixture(); delete raw.results[0].cases[0].arms.CURRENT_LUNA;
  const report = analyzeBenchmarkCosts(raw, scenarios);
  assert.equal(report.deltas.CURRENT.status, "incomplete_pairs");
  assert.equal(report.monthly[0].projected_cost_usd.CURRENT_LUNA, null);
});
