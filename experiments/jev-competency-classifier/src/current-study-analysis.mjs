import { scoreOutcome, summarizeArm } from "./luna-benchmark-score.mjs";
export const sumKnown = (values) => values.every(Number.isFinite) ? values.reduce((a, b) => a + b, 0) : null;
const categories = { MAT_CANTIDAD: "Cantidad vs Forma", MAT_FORMA: "Cantidad vs Forma", COM_ORAL: "Oral vs Lectura",
  COM_LECTURA: "Oral vs Lectura", PS_CONVIVE: "Convivencia", CYT_INDAGA: "Indagación", COM_ESCRITURA: "Escritura",
  COM_ARTE: "Arte", PSICO_MOTRICIDAD: "Motricidad" };
export function analyzeStudyArm(results, arm) {
  const rows = results.flatMap((run) => run.cases.map((row) => ({ run: run.number, ...row, outcome: row.arms[arm] })));
  const scored = rows.map((row) => ({ ...row, score: scoreOutcome(row.expected, row.outcome) }));
  const summary = summarizeArm(scored);
  const byId = new Map();
  for (const row of scored) { if (!byId.has(row.id)) byId.set(row.id, []); byId.get(row.id).push(row); }
  const primaryKey = (row) => JSON.stringify([row.outcome.status, row.outcome.primary]);
  const fullKey = (row) => JSON.stringify([row.outcome.status, row.outcome.primary, [...row.outcome.additional].sort()]);
  const unstablePrimary = [...byId].filter(([, cases]) => new Set(cases.map(primaryKey)).size > 1).map(([id]) => id);
  const unstable = [...byId].filter(([, cases]) => new Set(cases.map(fullKey)).size > 1).map(([id]) => id);
  const errors = scored.flatMap((row) => {
    const s = row.score, o = row.outcome, e = row.expected, types = [];
    if (!e.should_abstain && !e.should_privacy_block && o.primary && !s.acceptable_primary_correct) types.push("wrong_primary");
    if (s.false_abstention) types.push("false_abstention");
    if (s.overclassification) types.push("overclassification");
    if (s.false_privacy_block) types.push("false_privacy");
    if (s.missed_privacy_block) types.push("missed_privacy");
    if (s.additional_incorrect) types.push("unnecessary_secondary");
    if (e.acceptable_secondary.some((id) => !o.additional.includes(id))) types.push("missed_secondary");
    if (unstable.includes(row.id)) types.push("unstable_output");
    if (o.status === "classification_failed" || s.reasons.includes("provider_partial_failure")) types.push("provider_failure");
    if (!types.length) return [];
    return [{ id: row.id, run: row.run, category: e.should_privacy_block ? "Privacidad" : e.should_abstain ? "Abstención" : categories[e.primary] ?? e.primary,
      observation: row.raw_observation, gold: e, response: { status: o.status, primary: o.primary, secondary: o.additional },
      evidence: o.explanation?.evidence ?? null, reason: o.explanation?.reason ?? null, evidence_grounded: o.evidence_grounded ?? null,
      types, provider_error: o.error_code ?? null }];
  });
  const calls = scored.flatMap((row) => [...row.outcome.calls, ...(row.outcome.luna ? [row.outcome.luna] : [])]);
  return { summary, unstable_primary_ids: unstablePrimary, unstable_output_ids: unstable,
    accuracy_by_run: results.map((run) => summarizeArm(scored.filter((row) => row.run === run.number)).acceptable_primary_accuracy),
    errors, calls: calls.length, unknown_cost_calls: calls.filter((call) => !Number.isFinite(call.cost_usd)).length,
    known_cost_subtotal_usd: calls.reduce((n, call) => n + (Number.isFinite(call.cost_usd) ? call.cost_usd : 0), 0),
    effective_models: Object.fromEntries([...new Set(calls.map((call) => call.model_effective ?? "not_reported"))].map((model) => [model, calls.filter((call) => (call.model_effective ?? "not_reported") === model).length])),
    jev_cost_usd: sumKnown(scored.map((row) => row.outcome.cost_jev_usd)),
    luna_cost_usd: sumKnown(scored.map((row) => row.outcome.cost_luna_usd)),
    jev_provider_cost_usd: scored.flatMap((row) => row.outcome.calls).filter((call) => call.cost_source === "provider").reduce((n, call) => n + call.cost_usd, 0),
    jev_tariff_cost_usd: scored.flatMap((row) => row.outcome.calls).filter((call) => call.cost_source === "price_config").reduce((n, call) => n + call.cost_usd, 0),
    tokens: ["jev", "luna"].reduce((out, provider) => {
      const list = scored.flatMap((row) => provider === "jev" ? row.outcome.calls : row.outcome.luna ? [row.outcome.luna] : []);
      out[provider] = Object.fromEntries(["input_tokens", "output_tokens", "cached_input_tokens", "reasoning_tokens"].map((key) => [key, {
        measured: list.reduce((n, call) => n + (Number.isFinite(call.usage?.[key]) ? call.usage[key] : 0), 0),
        missing_calls: list.filter((call) => !Number.isFinite(call.usage?.[key])).length }])); return out;
    }, {}),
    missing_latency_observations: scored.filter((row) => !Number.isFinite(row.outcome.total_latency_ms)).length,
    cases: [...byId].map(([id, cases]) => ({ id, gold: cases[0].expected, observations: cases.map((row) => ({ run: row.run,
      primary: row.outcome.primary, secondary: row.outcome.additional, acceptable_correct: row.score.acceptable_primary_correct, decision_correct: row.score.success })) })) };
}
export function rankedCandidates(candidates) {
  return [...candidates].sort((a, b) => b.analysis.summary.acceptable_primary_accuracy - a.analysis.summary.acceptable_primary_accuracy ||
    a.analysis.summary.false_abstentions - b.analysis.summary.false_abstentions ||
    a.analysis.summary.missed_abstentions_overclassification - b.analysis.summary.missed_abstentions_overclassification ||
    (a.analysis.summary.privacy_false_positives + a.analysis.summary.missed_privacy_blocks) - (b.analysis.summary.privacy_false_positives + b.analysis.summary.missed_privacy_blocks) ||
    a.analysis.unstable_primary_ids.length - b.analysis.unstable_primary_ids.length ||
    (a.analysis.summary.latency_average_ms ?? Infinity) - (b.analysis.summary.latency_average_ms ?? Infinity) ||
    (a.analysis.summary.cost_per_observation_usd ?? Infinity) - (b.analysis.summary.cost_per_observation_usd ?? Infinity));
}
export function pairedClusterInterval(results, before, after, iterations = 3000) {
  const map = new Map();
  for (const run of results) for (const row of run.cases) {
    if (row.expected.should_abstain || row.expected.should_privacy_block) continue;
    const diff = Number(scoreOutcome(row.expected, row.arms[after]).acceptable_primary_correct) - Number(scoreOutcome(row.expected, row.arms[before]).acceptable_primary_correct);
    if (!map.has(row.id)) map.set(row.id, []); map.get(row.id).push(diff);
  }
  const means = [...map.values()].map((values) => values.reduce((a, b) => a + b, 0) / values.length);
  if (!means.length) return { cases: 0, gain: null, lower_95: null, upper_95: null };
  let seed = 20260928;
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    let total = 0;
    for (let j = 0; j < means.length; j++) { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; total += means[Math.floor(seed / 4294967296 * means.length)]; }
    samples.push(total / means.length);
  }
  samples.sort((a, b) => a - b);
  return { cases: means.length, gain: means.reduce((a, b) => a + b, 0) / means.length,
    lower_95: samples[Math.floor(iterations * .025)], upper_95: samples[Math.floor(iterations * .975)], iterations,
    method: "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV" };
}
export function errorMarkdown(version, arm, analysis) {
  const testFinal = version === "TEST_FINAL";
  const lines = [`# Errores ${testFinal ? "TEST" : "DEV"} ${version} / ${arm}`, "", `${testFinal ? "Gold entregado por el usuario, congelado antes de DEV; no se adjudicó ni ajustó en esta corrida." : "Gold Codex fijado antes de proveedores."} Primaria aceptable es el criterio principal; adicionales se informan aparte. V1 no genera evidence/reason: ausentes, sin explicación sintética atribuida al modelo.`, "",
    `Casos con primaria inestable: ${analysis.unstable_primary_ids.join(", ") || "ninguno"}.`, ""];
  for (const category of ["Cantidad vs Forma", "Oral vs Lectura", "Convivencia", "Indagación", "Escritura", "Arte", "Motricidad", "Abstención", "Privacidad"]) {
    lines.push(`## ${category}`, "");
    const errors = analysis.errors.filter((error) => error.category === category);
    if (!errors.length) lines.push("Sin incidencias registradas.", "");
    for (const error of errors) lines.push(`### ${error.id}, repetición ${error.run}`, "", error.observation, "",
      `Gold: ${JSON.stringify(error.gold)}`, "", `Respuesta: ${JSON.stringify(error.response)}`, "",
      `Evidence: ${error.evidence || "no disponible"}`, "", `Reason: ${error.reason || "no disponible"}`, "",
      `Tipo: ${error.types.join(", ")}; evidence_grounded: ${error.evidence_grounded ?? "no disponible"}.`, "");
  }
  return lines.map((line) => line.trimEnd()).join("\n").trimEnd() + "\n";
}
