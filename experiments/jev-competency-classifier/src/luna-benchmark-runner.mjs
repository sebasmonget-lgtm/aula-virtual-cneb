import { inferenceInput } from "./luna-benchmark-dataset.mjs";
import { jevObservationFromLuna } from "./luna-client.mjs";
import { compareCase, scoreOutcome } from "./luna-benchmark-score.mjs";

function sumCosts(calls) {
  return calls.every((call) => Number.isFinite(call.cost_usd)) ? calls.reduce((n, call) => n + call.cost_usd, 0) : null;
}

function outcome(raw, luna = null) {
  if (raw.status === "privacy_blocked") return { status: "privacy_blocked", primary: null, additional: [], ranked: [],
    calls: [], jev_call_count: 0, cost_luna_usd: 0, cost_jev_usd: 0, total_cost_usd: 0,
    total_latency_ms: 0, luna: null };
  const calls = raw.calls ?? [];
  const costJev = sumCosts(calls);
  const costLuna = luna ? luna.cost_usd : 0;
  return { ...raw, jev_call_count: calls.length, cost_luna_usd: costLuna, cost_jev_usd: costJev,
    total_cost_usd: costJev == null || costLuna == null ? null : costJev + costLuna,
    total_latency_ms: raw.latency_ms == null ? null : raw.latency_ms + (luna?.latency_ms ?? 0),
    luna: luna ? { usage: luna.usage, latency_ms: luna.latency_ms, cost_usd: luna.cost_usd,
      model_requested: luna.model_requested, model_effective: luna.model_effective } : null };
}

function failed(error, luna = null) {
  return outcome({ status: "classification_failed", primary: null, additional: [], ranked: [], calls: [],
    latency_ms: null, error_code: error?.message ?? "unknown" }, luna);
}

function fatalReason(result) {
  const providerFailure = result.calls?.find((call) => /http_(401|402|403|429)/u.test(call.status));
  return providerFailure?.status ?? (/HTTP (401|402|403|429)|insufficient_credits|auth|rate_limited/u.test(result.error_code ?? "") ? result.error_code : null);
}

export function plannedCalls({ cases, runs, methods = "both", includeLuna = true, currentCalls = 2 }) {
  const methodCount = methods === "both" ? 2 : 1;
  const jevPerInput = (methods === "both" || methods === "current" ? currentCalls : 0) +
    (methods === "both" || methods === "parallel" ? 1 : 0);
  return { cases, runs, arms: methodCount * (includeLuna ? 2 : 1),
    luna_calls_max: cases * runs * Number(includeLuna),
    jev_calls_max: cases * runs * jevPerInput * (includeLuna ? 2 : 1) };
}

export async function runLunaBenchmark({ cases, runs = 1, methods = "both", includeLuna = true,
  adapters, lunaClient, onProgress = async () => {}, onCase = async () => {} }) {
  if (![1, 3, 5].includes(runs)) throw new Error("--runs debe ser 1, 3 o 5.");
  if (!["both", "current", "parallel"].includes(methods)) throw new Error("Métodos inválidos.");
  const results = [];
  const total = cases.length * runs;
  let completed = 0, actualLunaCost = 0, actualJevCost = 0, unknownCosts = 0;
  for (let number = 1; number <= runs; number++) {
    const run = { number, cases: [] };
    results.push(run);
    for (const item of cases) {
      const input = inferenceInput(item);
      const row = { id: item.id, raw_observation: item.raw_observation, expected: item.expected,
        sanitized_observation: input.observation, luna: null, arms: {}, comparison: {} };
      const enabled = methods === "both" ? ["CURRENT", "PARALLEL"] : [methods.toUpperCase()];
      let stopReason = null;
      if (input.privacy_blocked) {
        for (const method of enabled) {
          row.arms[`${method}_RAW`] = outcome({ status: "privacy_blocked" });
          if (includeLuna) row.arms[`${method}_LUNA`] = outcome({ status: "privacy_blocked" });
        }
      } else {
        for (const method of enabled) {
          if (stopReason) { row.arms[`${method}_RAW`] = failed(new Error("not_attempted_provider_stop")); continue; }
          try { row.arms[`${method}_RAW`] = outcome(await adapters[method.toLowerCase()]({
            age: input.age, observation: input.observation, applicability: input.applicability })); }
          catch (error) { row.arms[`${method}_RAW`] = failed(error); }
          stopReason = fatalReason(row.arms[`${method}_RAW`]);
        }
        let luna;
        if (includeLuna && !stopReason) {
          try { luna = await lunaClient.clean({ age: input.age, type: input.type,
            context: input.context, observation: input.observation });
            row.luna = { clean_observation: luna.clean_observation,
              brief_interpretation: luna.brief_interpretation, uncertainty: luna.uncertainty,
              usage: luna.usage, latency_ms: luna.latency_ms, cost_usd: luna.cost_usd,
              model_requested: luna.model_requested, model_effective: luna.model_effective };
            if (Number.isFinite(luna.cost_usd)) actualLunaCost += luna.cost_usd;
            else unknownCosts++;
          } catch (error) {
            row.luna_error = error.message;
            row.luna = error.billing ?? { usage: null, cost_usd: null, latency_ms: null };
            if (Number.isFinite(row.luna.cost_usd)) actualLunaCost += row.luna.cost_usd;
            else unknownCosts++;
            if (/HTTP (401|402|403|429)/u.test(error.message)) stopReason = error.message;
          }
          for (const method of enabled) {
            if (!luna || stopReason) { row.arms[`${method}_LUNA`] = failed(new Error(row.luna_error ?? "not_attempted_provider_stop"), row.luna); continue; }
            const transformed = jevObservationFromLuna(luna);
            try { row.arms[`${method}_LUNA`] = outcome(await adapters[method.toLowerCase()]({
              age: input.age, observation: transformed, applicability: input.applicability }), luna); }
            catch (error) { row.arms[`${method}_LUNA`] = failed(error, luna); }
            stopReason = fatalReason(row.arms[`${method}_LUNA`]);
          }
        }
      }
      for (const arm of Object.keys(row.arms)) {
        row.arms[arm].score = scoreOutcome(item.expected, row.arms[arm]);
        for (const call of row.arms[arm].calls ?? []) {
          if (Number.isFinite(call.cost_usd)) actualJevCost += call.cost_usd;
          else unknownCosts++;
        }
      }
      if (includeLuna) for (const method of enabled)
        row.comparison[method] = compareCase(row.arms[`${method}_RAW`], row.arms[`${method}_LUNA`]);
      run.cases.push(row);
      completed++;
      await onCase({ results, completed, total, actual_cost_usd: actualLunaCost + actualJevCost, unknown_cost_calls: unknownCosts });
      await onProgress({ completed, total, actual_cost_usd: actualLunaCost + actualJevCost, unknown_cost_calls: unknownCosts });
      if (stopReason) throw new Error(`Proveedor detenido: ${stopReason}`);
    }
  }
  return { results, actual_cost_usd: actualLunaCost + actualJevCost,
    actual_luna_cost_usd: actualLunaCost, actual_jev_cost_usd: actualJevCost, unknown_cost_calls: unknownCosts };
}
