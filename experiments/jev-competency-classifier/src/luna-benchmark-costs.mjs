import { ARMS, summarizeBenchmark } from "./luna-benchmark-score.mjs";

const sum = (values) => values.reduce((a, b) => a + b, 0);
const completeSum = (values) => values.length && values.every(Number.isFinite) ? sum(values) : values.length ? null : 0;
const divide = (a, b) => a != null && b > 0 ? a / b : null;
const difference = (a, b) => a != null && b != null ? a - b : null;
const mean = (values) => values.length ? sum(values) / values.length : null;
const usd = (value) => value == null ? "—" : `$${value.toFixed(6)}`;
const number = (value, digits = 2) => value == null ? "—" : value.toFixed(digits);

function providerCost(call) {
  const usage = call.usage;
  return Number.isFinite(usage?.cost_usd) ? usage.cost_usd : Number.isFinite(usage?.cost) ? usage.cost : null;
}

function tokenTotals(calls, keys) {
  return Object.fromEntries(keys.map((key) => [key, {
    measured: sum(calls.map((call) => call.usage?.[key]).filter(Number.isFinite)),
    missing_usage_calls: calls.filter((call) => !Number.isFinite(call.usage?.[key])).length,
  }]));
}

function spending(calls) {
  const reported = calls.filter((call) => providerCost(call) != null);
  const estimated = calls.filter((call) => providerCost(call) == null && Number.isFinite(call.cost_usd));
  const unknown = calls.filter((call) => !Number.isFinite(call.cost_usd));
  return { calls: calls.length, total_usd: completeSum(calls.map((call) => call.cost_usd)),
    known_subtotal_usd: sum(calls.map((call) => call.cost_usd).filter(Number.isFinite)),
    provider_reported_usd: sum(reported.map(providerCost)), provider_reported_calls: reported.length,
    tariff_estimated_usd: sum(estimated.map((call) => call.cost_usd)), tariff_estimated_calls: estimated.length,
    unknown_cost_calls: unknown.length };
}

// Post-processing only: no provider requests, model, prompts, thresholds or gold changes.
export function analyzeBenchmarkCosts(raw, scenarios) {
  const rows = raw.results.flatMap((run) => run.cases.map((item) => ({ run: run.number, ...item })));
  const summary = summarizeBenchmark(raw.results);
  const ledger = [];
  for (const row of rows) {
    if (row.luna) ledger.push({ id: `${row.run}/${row.id}/LUNA`, run: row.run, case_id: row.id,
      provider: "Luna", shared_between_luna_arms: true, ...row.luna });
    for (const arm of ARMS) for (const [index, call] of (row.arms[arm]?.calls ?? []).entries())
      ledger.push({ id: `${row.run}/${row.id}/${arm}/${index + 1}`, run: row.run, case_id: row.id,
        provider: "Jev", arm, ...call });
  }
  const physicalJev = ledger.filter((call) => call.provider === "Jev");
  const physicalLuna = ledger.filter((call) => call.provider === "Luna");
  const arms = Object.fromEntries(ARMS.map((arm) => {
    const outcomes = rows.filter((row) => row.arms[arm]).map((row) => row.arms[arm]);
    const metrics = summary.arms[arm];
    const jev = outcomes.flatMap((outcome) => outcome.calls ?? []);
    const luna = outcomes.flatMap((outcome) => outcome.luna ? [outcome.luna] : []);
    const jevSpending = spending(jev), lunaSpending = spending(luna);
    const count = outcomes.length;
    const active = outcomes.filter((outcome) => outcome.status !== "privacy_blocked").length;
    const calls = jev.length + luna.length;
    const knownLatencies = outcomes.map((outcome) => outcome.total_latency_ms).filter(Number.isFinite);
    return [arm, { ...metrics, cost_basis: count ? jevSpending.unknown_cost_calls + lunaSpending.unknown_cost_calls ? "incomplete" :
      jevSpending.tariff_estimated_calls || luna.length ? "provider_and_or_measured_usage_tariff" : "provider_reported" : "not_executed",
      jev: jevSpending, luna: lunaSpending,
      jev_tokens: tokenTotals(jev, ["input_tokens", "output_tokens"]),
      luna_tokens: tokenTotals(luna, ["input_tokens", "cached_input_tokens", "cache_write_tokens", "output_tokens", "reasoning_tokens"]),
      active_observations: active, privacy_blocked_observations: count - active,
      calls_total: calls, calls_per_observation: divide(calls, count), calls_per_active_observation: divide(calls, active),
      jev_calls_per_observation: divide(jev.length, count), luna_calls_per_observation: divide(luna.length, count),
      jev_cost_per_observation_usd: count ? divide(jevSpending.total_usd, count) : null,
      luna_cost_per_observation_usd: count ? divide(lunaSpending.total_usd, count) : null,
      cost_per_correct_primary_usd: divide(metrics.cost_usd, Math.round((metrics.acceptable_primary_accuracy ?? 0) * metrics.denominators.classified)),
      decision_accuracy: divide(metrics.correct_total, count),
      latency_measured_observations: knownLatencies.length,
      latency_active_average_ms: mean(outcomes.filter((outcome) => outcome.status !== "privacy_blocked")
        .map((outcome) => outcome.total_latency_ms).filter(Number.isFinite)),
      luna_latency_average_ms: mean(luna.map((call) => call.latency_ms).filter(Number.isFinite)),
    }];
  }));
  const deltas = Object.fromEntries(["CURRENT", "PARALLEL"].map((method) => {
    const a = arms[`${method}_RAW`], b = arms[`${method}_LUNA`];
    const paired = rows.filter((row) => row.arms[`${method}_RAW`] && row.arms[`${method}_LUNA`]);
    const completePairs = paired.length === rows.length && a.total === b.total && a.total > 0;
    if (!completePairs) return [method, { status: "incomplete_pairs", comparable_pairs: paired.length }];
    const delta = summary.deltas[method];
    const net = delta.improved - delta.worsened;
    const primaryGain = difference(b.acceptable_primary_accuracy, a.acceptable_primary_accuracy);
    const decisionGain = difference(b.decision_accuracy, a.decision_accuracy);
    return [method, { ...delta, status: "compared", comparable_pairs: paired.length,
      percentage_cost_increase: divide(delta.cost_usd, a.cost_usd) == null ? null : delta.cost_usd / a.cost_usd * 100,
      luna_component_usd: b.luna.total_usd,
      jev_component_change_usd: difference(b.jev.total_usd, a.jev.total_usd),
      net_errors_corrected: net, additional_cost_per_net_error_corrected_usd: net > 0 ? divide(delta.cost_usd, net) : null,
      acceptable_accuracy_gain_percentage_points: primaryGain == null ? null : primaryGain * 100,
      decision_accuracy_gain_percentage_points: decisionGain == null ? null : decisionGain * 100,
      // One common measured benchmark cohort; keep its size explicit. Do not extrapolate accuracy beyond 100%.
      acceptable_accuracy_percentage_points_per_additional_usd: delta.cost_usd > 0 && primaryGain != null ? primaryGain * 100 / delta.cost_usd : null,
      decision_accuracy_percentage_points_per_additional_usd: delta.cost_usd > 0 && decisionGain != null ? decisionGain * 100 / delta.cost_usd : null,
      acceptable_accuracy_pp_per_additional_usd_at_1000_observations: delta.cost_per_1000_usd > 0 && primaryGain != null ? primaryGain * 100 / delta.cost_per_1000_usd : null,
      decision_accuracy_pp_per_additional_usd_at_1000_observations: delta.cost_per_1000_usd > 0 && decisionGain != null ? decisionGain * 100 / delta.cost_per_1000_usd : null,
      net_correct_decisions_per_additional_usd: delta.cost_usd > 0 ? net / delta.cost_usd : null,
      paired_latency_additional_ms: mean(paired.map((row) => difference(row.arms[`${method}_LUNA`].total_latency_ms,
        row.arms[`${method}_RAW`].total_latency_ms)).filter(Number.isFinite)),
    }];
  }));
  const candidates = ARMS.filter((arm) => arms[arm].cost_per_correct_classification_usd != null && arms[arm].total === rows.length);
  const pareto = candidates.filter((arm) => !candidates.some((other) => other !== arm &&
    arms[other].cost_per_observation_usd <= arms[arm].cost_per_observation_usd &&
    arms[other].decision_accuracy >= arms[arm].decision_accuracy &&
    (arms[other].cost_per_observation_usd < arms[arm].cost_per_observation_usd || arms[other].decision_accuracy > arms[arm].decision_accuracy)));
  const sorted = candidates.toSorted((a, b) => arms[a].cost_per_correct_classification_usd - arms[b].cost_per_correct_classification_usd);
  const jev = spending(physicalJev), luna = spending(physicalLuna);
  return { metadata: raw.metadata, benchmark_status: raw.status, currency: scenarios.currency,
    observations_unique: new Set(rows.map((row) => row.id)).size, observations_repeated: rows.length,
    planned_observations_repeated: raw.metadata.preflight?.cases * raw.metadata.options?.runs || rows.length,
    physical: { total_usd: jev.total_usd == null || luna.total_usd == null ? null : jev.total_usd + luna.total_usd,
      known_subtotal_usd: jev.known_subtotal_usd + luna.known_subtotal_usd,
      jev, luna, calls_total: ledger.length,
      luna_tokens: tokenTotals(physicalLuna, ["input_tokens", "cached_input_tokens", "cache_write_tokens", "output_tokens", "reasoning_tokens"]) },
    arms, deltas, scenarios,
    monthly: scenarios.teachers.flatMap((teachers) => scenarios.observations_per_teacher_per_day.map((perDay) => {
      const monthly = teachers * perDay * scenarios.school_days_per_month;
      return { teachers, observations_per_teacher_per_day: perDay, observations_month_total: monthly,
        projected_cost_usd: Object.fromEntries(ARMS.map((arm) => [arm,
          arms[arm].cost_per_observation_usd == null ? null : arms[arm].cost_per_observation_usd * monthly])) };
    })),
    effectiveness: { criterion: "Menor costo por clasificación correcta completa según gold; abstenciones y bloqueos no cuentan como clasificación correcta. Revisar también accuracy y frontera de Pareto.",
      lowest_cost_per_correct_classification: raw.status === "completed" ? sorted[0] ?? null : null,
      pareto_frontier_cost_vs_decision_accuracy: pareto, ranking: sorted }, ledger };
}

export function costAnalysisMarkdown(report) {
  const { arms, physical } = report;
  const lines = ["# Costos y efectividad: Luna + Jev", "",
    `Dataset: ${report.metadata.dataset}; SHA-256: ${report.metadata.dataset_fingerprint}. Estado: ${report.benchmark_status}.`,
    `${report.observations_unique} casos únicos; ${report.observations_repeated}/${report.planned_observations_repeated} casos-repetición. Moneda: USD.`, "",
    "## Fuentes y alcance", "",
    "Jev: monto de usage.cost/cost_usd cuando el proveedor lo informa. Si falta, estimación tarifaria con tokens medidos, separada debajo. Luna: tokens reales de usage valorados con la tarifa congelada en metadata/config; es cálculo tarifario, no importe facturado informado por OpenAI. Costo desconocido se conserva como desconocido, nunca cero.", "",
    "Las columnas Luna y Jev de la primera tabla son USD por observación. La media incluye bloqueos de privacidad (cero llamadas); también se informa la media de llamadas/latencia entre casos sin bloqueo. El costo por clasificación correcta exige primaria aceptable y secundarias exactas del gold; excluye abstenciones/bloqueos. Se conserva una métrica alternativa de primaria aceptable.", "",
    "| Método | Costo/obs | Costo/100 | Costo/1000 | Luna | Jev | Latencia ms |",
    "|---|---:|---:|---:|---:|---:|---:|",
    ...ARMS.map((arm) => { const a = arms[arm]; return `| ${arm} | ${usd(a.cost_per_observation_usd)} | ${usd(a.cost_per_100_usd)} | ${usd(a.cost_per_1000_usd)} | ${usd(a.luna_cost_per_observation_usd)} | ${usd(a.jev_cost_per_observation_usd)} | ${number(a.latency_average_ms, 0)} |`; }), "",
    "## Totales, aciertos y llamadas por brazo", "",
    "| Método | Total benchmark | Total Jev | Total Luna | Clasif. correctas | USD/clasif. correcta | USD/primaria correcta | Primaria aceptable | Decisión exacta | Llamadas/obs | Llamadas/obs sin bloqueo |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...ARMS.map((arm) => { const a = arms[arm]; return `| ${arm} | ${usd(a.cost_usd)} | ${usd(a.jev.total_usd)} | ${usd(a.luna.total_usd)} | ${a.correct_classifications} | ${usd(a.cost_per_correct_classification_usd)} | ${usd(a.cost_per_correct_primary_usd)} | ${number(a.acceptable_primary_accuracy == null ? null : a.acceptable_primary_accuracy * 100)}% | ${number(a.decision_accuracy == null ? null : a.decision_accuracy * 100)}% | ${number(a.calls_per_observation)} | ${number(a.calls_per_active_observation)} |`; }), "",
    "## Desembolso físico del benchmark", "",
    `Total: ${usd(physical.total_usd)}; subtotal conocido: ${usd(physical.known_subtotal_usd)}. Jev: ${usd(physical.jev.total_usd)}; Luna: ${usd(physical.luna.total_usd)}. ${physical.calls_total} llamadas físicas (${physical.jev.calls} Jev y ${physical.luna.calls} Luna).`,
    "Luna se ejecuta una vez por caso-repetición y se reutiliza en los dos métodos. Cada brazo Luna atribuye su costo completo para proyectar su adopción; sumar los cuatro brazos contaría Luna dos veces.", "",
    "## Trazabilidad de costos y tokens", "",
    "| Método | Jev: USD proveedor (llamadas) | Jev: USD estimado tarifa (llamadas) | Jev sin costo | Luna sin costo | Jev entrada/salida | Luna entrada/salida | Luna caché / escritura / reasoning |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
    ...ARMS.map((arm) => { const a = arms[arm], j = a.jev, l = a.luna_tokens;
      return `| ${arm} | ${usd(j.provider_reported_usd)} (${j.provider_reported_calls}) | ${usd(j.tariff_estimated_usd)} (${j.tariff_estimated_calls}) | ${j.unknown_cost_calls} | ${a.luna.unknown_cost_calls} | ${a.jev_tokens.input_tokens.measured} / ${a.jev_tokens.output_tokens.measured} | ${l.input_tokens.measured} / ${l.output_tokens.measured} | ${l.cached_input_tokens.measured} / ${l.cache_write_tokens.measured} / ${l.reasoning_tokens.measured} |`; }), "",
    "Los tokens son sumas medidas, no hipótesis. Campos ausentes y usage completo por llamada están en cost-analysis.json (ledger); reasoning es subconjunto de salida, no se cobra otra vez. Los tokens Luna atribuidos a cada brazo están compartidos físicamente. Totales Luna físicos:",
    `\`${JSON.stringify(physical.luna_tokens)}\``, "",
    "Tarifas utilizadas, USD por millón de tokens (configuración central; se conserva snapshot en el reporte):", "",
    "```json", JSON.stringify(report.metadata.pricing, null, 2), "```", "",
    "## Costo incremental y eficacia de Luna", "",
    "| Método | Δ costo total | Incremento % | Δ USD/1000 obs | Luna total | Δ Jev total | Mejorados / empeorados / neto | USD/error corregido bruto | USD/error corregido neto | Δ accuracy primaria pp | pp primaria / USD adicional | Δ decisión pp | pp decisión / USD adicional | Δ latencia ms | Luna media ms |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...["CURRENT", "PARALLEL"].map((method) => { const d = report.deltas[method];
      if (d.status !== "compared") return `| ${method}: pares incompletos | — | — | — | — | — | — | — | — | — | — | — | — | — | — |`;
      return `| ${method} | ${usd(d.cost_usd)} | ${number(d.percentage_cost_increase)}% | ${usd(d.cost_per_1000_usd)} | ${usd(d.luna_component_usd)} | ${usd(d.jev_component_change_usd)} | ${d.improved} / ${d.worsened} / ${d.net_errors_corrected} | ${usd(d.additional_cost_per_error_corrected_usd)} | ${usd(d.additional_cost_per_net_error_corrected_usd)} | ${number(d.acceptable_accuracy_gain_percentage_points)} | ${number(d.acceptable_accuracy_percentage_points_per_additional_usd)} | ${number(d.decision_accuracy_gain_percentage_points)} | ${number(d.decision_accuracy_percentage_points_per_additional_usd)} | ${number(d.paired_latency_additional_ms, 0)} | ${number(arms[`${method}_LUNA`].luna_latency_average_ms, 0)} |`; }), "",
    "pp = puntos porcentuales. La ganancia por USD de la tabla usa el incremento del gasto de esta cohorte, con su tamaño declarado; no significa crecimiento ilimitado de accuracy. Error corregido bruto cuenta IMPROVED; neto descuenta WORSENED. Sin errores corregidos, costo conocido o incremento positivo, la eficiencia correspondiente no es calculable. Δ costo incluye tanto Luna como el cambio de consumo Jev al recibir el texto procesado. Δ latencia es comparación pareada; Luna media mide solo su etapa.", "",
    "Para comparar eficiencia con una exposición común de 1,000 observaciones (costo extrapolado, accuracy medida sin cambio):",
    ...["CURRENT", "PARALLEL"].map((method) => `- ${method}: ${number(report.deltas[method].acceptable_accuracy_pp_per_additional_usd_at_1000_observations)} pp de primaria aceptable por USD adicional; ${number(report.deltas[method].decision_accuracy_pp_per_additional_usd_at_1000_observations)} pp de decisión exacta por USD adicional.`), "",
    "## Proyección mensual (estimación, no gasto medido)", "",
    report.scenarios.projection_note,
    `Días lectivos: ${report.scenarios.school_days_per_month}. Obs/día es por profesora; Obs/mes es el total de todas las profesoras.`, "",
    "| Profesores | Obs/día | Obs/mes | CURRENT_RAW | CURRENT_LUNA | PARALLEL_RAW | PARALLEL_LUNA |",
    "|---:|---:|---:|---:|---:|---:|---:|",
    ...report.monthly.map((row) => `| ${row.teachers} | ${row.observations_per_teacher_per_day} | ${row.observations_month_total} | ${ARMS.map((arm) => usd(row.projected_cost_usd[arm])).join(" | ")} |`), "",
    "## Relación costo/efectividad", "",
    report.effectiveness.criterion,
    `Mejor según ese criterio: **${report.effectiveness.lowest_cost_per_correct_classification ?? "no determinable"}**. Frontera de Pareto costo/decisión exacta: ${report.effectiveness.pareto_frontier_cost_vs_decision_accuracy.join(", ") || "no determinable"}.`,
    "La comparación describe este gold y estas repeticiones; no demuestra generalización. Los bloqueos falsos y errores de proveedor siguen contando como fallos. Un costo menor con menor accuracy puede exigir una decisión docente sobre el intercambio. Los resultados por repetición y los errores concretos están en summary.json/comparison.md. No se modificaron prompts ni arquitectura de inferencia.", ""];
  return `${lines.join("\n")}\n`;
}

export function monthlyCostCsv(report) {
  return ["teachers,observations_per_teacher_per_day,observations_month_total," + ARMS.join(","),
    ...report.monthly.map((row) => [row.teachers, row.observations_per_teacher_per_day, row.observations_month_total,
      ...ARMS.map((arm) => row.projected_cost_usd[arm] ?? "")].join(","))].join("\n") + "\n";
}
