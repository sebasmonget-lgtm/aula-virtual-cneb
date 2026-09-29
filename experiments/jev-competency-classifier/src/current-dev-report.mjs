import { summarizeArm } from "./luna-benchmark-score.mjs";

export const DEV_ARMS = ["CURRENT_V1_RAW", "CURRENT_V2_RAW", "CURRENT_V2_LUNA_CLEAN", "CURRENT_V2_LUNA_INTERPRET"];
const sum = (values) => values.every(Number.isFinite) ? values.reduce((a, b) => a + b, 0) : null;
const delta = (a, b) => a != null && b != null ? a - b : null;
export function summarizeCurrentDev(results, promotionConfig) {
  const rows = results.flatMap((run) => run.cases);
  const arms = Object.fromEntries(DEV_ARMS.map((arm) => {
    const cases = rows.map((row) => ({ id: row.id, expected: row.expected, score: row.arms[arm].score, outcome: row.arms[arm] }));
    const s = summarizeArm(cases);
    const calls = cases.flatMap((row) => row.outcome.calls);
    const luna = cases.flatMap((row) => row.outcome.luna ? [row.outcome.luna] : []);
    const tokens = (list, key) => ({ measured: list.reduce((n, call) => n + (Number.isFinite(call.usage?.[key]) ? call.usage[key] : 0), 0),
      missing_usage_calls: list.filter((call) => !Number.isFinite(call.usage?.[key])).length });
    return [arm, { ...s, exact_decision: s.total ? s.correct_total / s.total : null,
      expected_secondary_missing: cases.reduce((n, row) => n + row.expected.acceptable_secondary.filter((id) => !row.outcome.additional.includes(id)).length, 0),
      ungrounded_suggested_evidence: cases.filter((row) => row.outcome.primary && row.outcome.explanation && !row.outcome.evidence_grounded).length,
      jev_cost_usd: sum(cases.map((row) => row.outcome.cost_jev_usd)), luna_cost_usd: sum(cases.map((row) => row.outcome.cost_luna_usd)),
      jev_provider_reported_usd: calls.filter((call) => call.cost_source === "provider").reduce((n, call) => n + call.cost_usd, 0),
      jev_tariff_estimated_usd: calls.filter((call) => call.cost_source === "price_config").reduce((n, call) => n + call.cost_usd, 0),
      unknown_cost_calls: [...calls, ...luna].filter((call) => !Number.isFinite(call.cost_usd)).length,
      calls_per_observation: s.total ? (calls.length + luna.length) / s.total : null,
      jev_tokens: Object.fromEntries(["input_tokens", "output_tokens"].map((key) => [key, tokens(calls, key)])),
      luna_tokens: Object.fromEntries(["input_tokens", "output_tokens", "cached_input_tokens", "cache_write_tokens", "reasoning_tokens"].map((key) => [key, tokens(luna, key)])),
    }];
  }));
  const baseline = arms.CURRENT_V1_RAW;
  const deltas = Object.fromEntries(DEV_ARMS.slice(1).map((arm) => [arm, {
    acceptable_primary_accuracy: delta(arms[arm].acceptable_primary_accuracy, baseline.acceptable_primary_accuracy),
    false_abstentions: arms[arm].false_abstentions - baseline.false_abstentions,
    overclassification: arms[arm].missed_abstentions_overclassification - baseline.missed_abstentions_overclassification,
    privacy_fp: arms[arm].privacy_false_positives - baseline.privacy_false_positives,
    cost_usd: delta(arms[arm].cost_usd, baseline.cost_usd),
    cost_per_observation_usd: delta(arms[arm].cost_per_observation_usd, baseline.cost_per_observation_usd),
    cost_per_1000_usd: delta(arms[arm].cost_per_1000_usd, baseline.cost_per_1000_usd),
    latency_ms: delta(arms[arm].latency_average_ms, baseline.latency_average_ms),
  }]));
  const byRun = results.map((run) => ({ number: run.number, arms: Object.fromEntries(DEV_ARMS.map((arm) => [arm,
    summarizeArm(run.cases.map((row) => ({ id: row.id, expected: row.expected, score: row.arms[arm].score, outcome: row.arms[arm] })))])) }));
  const candidateReview = Object.fromEntries(DEV_ARMS.slice(1).map((arm) => {
    const values = byRun.map((run) => run.arms[arm].acceptable_primary_accuracy).filter(Number.isFinite);
    const range = values.length ? Math.max(...values) - Math.min(...values) : null;
    const checks = { three_runs: results.length === promotionConfig.required_runs,
      primary_improves: deltas[arm].acceptable_primary_accuracy >= promotionConfig.minimum_acceptable_accuracy_gain,
      no_more_false_abstentions: deltas[arm].false_abstentions <= promotionConfig.maximum_false_abstention_increase,
      no_more_privacy_fp: deltas[arm].privacy_fp <= promotionConfig.maximum_privacy_fp_increase,
      no_significant_overclassification_increase: arms[arm].denominators.abstention > 0 &&
        deltas[arm].overclassification / arms[arm].denominators.abstention <= promotionConfig.maximum_overclassification_rate_increase,
      stable_runs: range != null && range <= promotionConfig.maximum_accuracy_range_between_runs,
      no_provider_failures: arms[arm].provider_failures === 0,
      evidence_grounded: arms[arm].ungrounded_suggested_evidence === 0 };
    return [arm, { checks, accuracy_range: range,
      indicative_85_percent_target_met: arms[arm].acceptable_primary_accuracy >= promotionConfig.indicative_acceptable_accuracy_target,
      eligible_for_human_candidate_review: Object.values(checks).every(Boolean), automatic_promotion: false }];
  }));
  const diagnostics = Object.fromEntries(DEV_ARMS.map((arm) => [arm, {
    quantity_forma: rows.filter((row) => ["MAT_CANTIDAD", "MAT_FORMA"].includes(row.expected.primary) &&
      ["MAT_CANTIDAD", "MAT_FORMA"].includes(row.arms[arm].primary) && row.arms[arm].primary !== row.expected.primary && !row.expected.acceptable_primary.includes(row.arms[arm].primary)).map((row) => row.id),
    oral_reading: rows.filter((row) => ["COM_ORAL", "COM_LECTURA"].includes(row.expected.primary) &&
      ["COM_ORAL", "COM_LECTURA"].includes(row.arms[arm].primary) && row.arms[arm].primary !== row.expected.primary && !row.expected.acceptable_primary.includes(row.arms[arm].primary)).map((row) => row.id),
    forced_coexistence: rows.filter((row) => row.arms[arm].primary === "PS_CONVIVE" && row.arms[arm].score.overclassification).map((row) => row.id),
    correct_abstentions: rows.filter((row) => row.expected.should_abstain && row.arms[arm].score.success).map((row) => row.id),
    false_abstentions: rows.filter((row) => row.arms[arm].score.false_abstention).map((row) => row.id),
    false_privacy: rows.filter((row) => row.arms[arm].score.false_privacy_block).map((row) => row.id),
    emergent_writing: rows.filter((row) => row.coverage_tags.includes("escritura_emergente")).map((row) => ({ id: row.id, primary_correct: row.arms[arm].score.acceptable_primary_correct })),
    inquiry: rows.filter((row) => row.expected.primary === "CYT_INDAGA").map((row) => ({ id: row.id, primary_correct: row.arms[arm].score.acceptable_primary_correct })),
  }]));
  const physicalCalls = rows.flatMap((row) => DEV_ARMS.flatMap((arm) => [...row.arms[arm].calls, ...(row.arms[arm].luna ? [row.arms[arm].luna] : [])]));
  const physical = { calls: physicalCalls.length, total_cost_usd: sum(physicalCalls.map((call) => call.cost_usd)),
    known_cost_subtotal_usd: physicalCalls.reduce((n, call) => n + (Number.isFinite(call.cost_usd) ? call.cost_usd : 0), 0),
    unknown_cost_calls: physicalCalls.filter((call) => !Number.isFinite(call.cost_usd)).length };
  const paired = Object.fromEntries([
    ["v2_vs_v1", "CURRENT_V1_RAW", "CURRENT_V2_RAW"],
    ["clean_vs_v2_raw", "CURRENT_V2_RAW", "CURRENT_V2_LUNA_CLEAN"],
    ["interpret_vs_v2_raw", "CURRENT_V2_RAW", "CURRENT_V2_LUNA_INTERPRET"],
    ["interpret_vs_clean", "CURRENT_V2_LUNA_CLEAN", "CURRENT_V2_LUNA_INTERPRET"],
  ].map(([key, before, after]) => {
    const valid = rows.filter((row) => !row.expected.should_abstain && !row.expected.should_privacy_block &&
      ![before, after].some((arm) => row.arms[arm].score.reasons.some((reason) => ["classification_failed", "provider_partial_failure"].includes(reason))));
    const improved = valid.filter((row) => !row.arms[before].score.acceptable_primary_correct && row.arms[after].score.acceptable_primary_correct).map((row) => row.id);
    const worsened = valid.filter((row) => row.arms[before].score.acceptable_primary_correct && !row.arms[after].score.acceptable_primary_correct).map((row) => row.id);
    return [key, { before, after, corrected_primary: improved.length, introduced_primary_errors: worsened.length,
      net_primary_errors_corrected: improved.length - worsened.length, improved, worsened, compared_classification_repetitions: valid.length,
      acceptable_accuracy_gain: delta(arms[after].acceptable_primary_accuracy, arms[before].acceptable_primary_accuracy),
      incremental_cost_usd: delta(arms[after].cost_usd, arms[before].cost_usd),
      incremental_cost_per_1000_usd: delta(arms[after].cost_per_1000_usd, arms[before].cost_per_1000_usd),
      incremental_latency_ms: delta(arms[after].latency_average_ms, arms[before].latency_average_ms) }];
  }));
  return { arms, physical, deltas, paired_comparisons: paired, by_run: byRun, candidate_review: candidateReview, diagnostics,
    priority: ["acceptable_primary_accuracy", "false_abstentions", "overclassification", "privacy_fp"],
    secondary_metric: "exact_decision", automatic_promotion: false };
}

export function currentDevMarkdown(metadata, summary, results) {
  const usd = (n) => n == null ? "—" : "$" + n.toFixed(6);
  const pct = (n) => n == null ? "—" : (100 * n).toFixed(2) + "%";
  const fields = [["Acceptable primary accuracy", "acceptable_primary_accuracy", pct], ["Primary accuracy", "primary_accuracy", pct],
    ["False abstentions", "false_abstentions", String], ["Overclassification", "missed_abstentions_overclassification", String],
    ["Privacy FP", "privacy_false_positives", String], ["Secondary errors", "additional_incorrect", String],
    ["Expected secondary missing", "expected_secondary_missing", String], ["Exact decision (secundaria)", "exact_decision", pct],
    ["Costo total", "cost_usd", usd], ["Costo/obs", "cost_per_observation_usd", usd], ["Costo/100", "cost_per_100_usd", usd], ["Costo/1000", "cost_per_1000_usd", usd],
    ["Jev", "jev_cost_usd", usd], ["Luna", "luna_cost_usd", usd], ["Latencia ms", "latency_average_ms", (n) => n?.toFixed(0) ?? "—"],
    ["Evidencia sugerida no verificada", "ungrounded_suggested_evidence", String]];
  const lines = ["# CURRENT DEV: cuatro variantes", "", `Dataset: ${metadata.dataset}; SHA-256: ${metadata.dataset_sha256}.`,
    `Privacidad corregida común a A/B/C/D. V1 conserva su prompt, pero no equivale al filtro del baseline histórico. Origen del gold: ${metadata.adjudication?.gold_source ?? "unspecified"}. Codex adjudica DEV solo con autorización expresa; no representa gold humano independiente. Jev/Luna nunca adjudican las etiquetas. Priorizar primaria aceptable y errores de abstención/privacidad; exact decision es secundaria.`, "",
    "| Métrica | V1 RAW | V2 RAW | V2 Luna CLEAN | V2 Luna INTERPRET |", "|---|---:|---:|---:|---:|",
    ...fields.map(([label, key, format]) => `| ${label} | ${DEV_ARMS.map((arm) => format(summary.arms[arm][key])).join(" | ")} |`), "",
    "## Incrementos frente a V1 RAW", "", "```json", JSON.stringify(summary.deltas, null, 2), "```", "",
    "## Comparaciones pareadas: prompt, limpieza e interpretación", "", "Los errores corregidos/introducidos se cuentan por caso-repetición y primaria aceptable, excluyendo fallos del proveedor. No usar exact decision para esta comparación principal.", "", "```json", JSON.stringify(summary.paired_comparisons, null, 2), "```", "",
    "## Consumo y procedencia", "", "Jev usa costo del proveedor si existe; fallback tarifario separado. Luna usa tokens reales con tarifa congelada. Costo incompleto permanece desconocido. Ledger completo en raw-results.json.", "",
    `Total físico (Luna CLEAN e INTERPRET se ejecutan por separado): ${JSON.stringify(summary.physical)}`, "",
    ...DEV_ARMS.map((arm) => `- ${arm}: ${JSON.stringify({ jev_provider_reported_usd: summary.arms[arm].jev_provider_reported_usd,
      jev_tariff_estimated_usd: summary.arms[arm].jev_tariff_estimated_usd, unknown_cost_calls: summary.arms[arm].unknown_cost_calls,
      jev_tokens: summary.arms[arm].jev_tokens, luna_tokens: summary.arms[arm].luna_tokens })}`), "",
    "## Revisión de candidata (sin promoción automática)", "", "```json", JSON.stringify(summary.candidate_review, null, 2), "```", "",
    "## Diagnósticos específicos", "", "```json", JSON.stringify(summary.diagnostics, null, 2), "```", "",
    "## Casos por repetición", ""];
  for (const run of results) for (const row of run.cases) lines.push(`### ${row.id}, r${run.number}`, "",
    `Original: ${row.raw_observation}`, "", `Esperado: ${JSON.stringify(row.expected)}`, "",
    ...DEV_ARMS.map((arm) => `- ${arm}: ${JSON.stringify({ primary: row.arms[arm].primary, additional: row.arms[arm].additional,
      reasons: row.arms[arm].score.reasons, explanation: row.arms[arm].explanation ?? null, evidence_grounded: row.arms[arm].evidence_grounded ?? null })}`), "");
  lines.push("No abrir el test final hasta revisión explícita de una candidata. Datos y repeticiones permanecen independientes; no se optimiza para forzar 85%.", "");
  return lines.join("\n") + "\n";
}
