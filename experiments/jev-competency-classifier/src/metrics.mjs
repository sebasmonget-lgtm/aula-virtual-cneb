import { NO_CLASSIFIABLE_ID } from "./constants.mjs";
import { decideClassification, rankedProbabilities, summarizeChoice } from "./decision-policy.mjs";

const mean = (numbers) => numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : null;
const quantile = (numbers, percentile) => {
  if (!numbers.length) return null; const sorted = [...numbers].sort((left, right) => left - right); const position = (sorted.length - 1) * percentile;
  const lower = Math.floor(position); const upper = Math.ceil(position); return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};
const percent = (numerator, denominator) => denominator ? numerator / denominator : null;
const expectedLabel = (item) => item.expected_competency_id ?? NO_CLASSIFIABLE_ID;
const rawChoice = (result) => rankedProbabilities(result.probabilities ?? {})[0]?.[0] ?? null;
const acceptedIds = (item) => new Set([item.expected_competency_id, ...(item.acceptable_secondary_ids ?? [])].filter(Boolean));
const acceptable = (item, id) => item.expected_competency_id == null ? id === NO_CLASSIFIABLE_ID : acceptedIds(item).has(id);

function classificationForPolicy(result, policy) {
  if (!result?.probabilities || result.status === "classification_failed") return null;
  const optionIds = new Set(Object.keys(result.probabilities));
  const choice = rawChoice(result);
  return decideClassification(summarizeChoice({ choice, confidence: result.model_confidence, probabilities: result.probabilities, optionIds }), policy);
}

function confusionEntries(pairs) {
  const matrix = {};
  for (const { item, result } of pairs) {
    const actual = rawChoice(result) ?? "CLASSIFICATION_FAILED"; const expected = expectedLabel(item);
    matrix[expected] ??= {}; matrix[expected][actual] = (matrix[expected][actual] ?? 0) + 1;
  }
  return matrix;
}

function mostConfused(matrix) {
  const entries = [];
  for (const [expected, predictions] of Object.entries(matrix)) for (const [predicted, count] of Object.entries(predictions)) if (expected !== predicted) entries.push({ expected, predicted, count });
  return entries.sort((left, right) => right.count - left.count || left.expected.localeCompare(right.expected)).slice(0, 10);
}

function breakdown(pairs, selector) {
  const groups = new Map();
  for (const pair of pairs) {
    const key = String(selector(pair.item)); const group = groups.get(key) ?? []; group.push(pair); groups.set(key, group);
  }
  return Object.fromEntries([...groups].map(([key, group]) => [key, { total: group.length, raw_top1_accuracy: percent(group.filter(({ item, result }) => rawChoice(result) === item.expected_competency_id).length, group.filter(({ item }) => item.expected_competency_id != null).length) }]));
}

export function sweepThresholds(pairs, basePolicy, thresholds = [0.5, 0.65, 0.75, 0.82, 0.9, 0.95]) {
  const evaluable = pairs.filter(({ result }) => result.status !== "classification_failed");
  return thresholds.map((threshold) => {
    const policy = { ...basePolicy, auto_accept_threshold: threshold };
    const accepted = evaluable.filter(({ result }) => classificationForPolicy(result, policy)?.status === "classified");
    const correct = accepted.filter(({ item, result }) => acceptable(item, rawChoice(result))).length;
    return { threshold, auto_accept_count: accepted.length, auto_accept_accuracy: percent(correct, accepted.length), auto_accept_coverage: percent(accepted.length, evaluable.length) };
  });
}

export function summarizeBenchmark({ cases, results, policy, pricing }) {
  const resultById = new Map(results.map((result) => [result.id, result]));
  const pairs = cases.map((item) => ({ item, result: resultById.get(item.id) ?? { status: "classification_failed", probabilities: {}, error_code: "missing_result" } }));
  const completed = pairs.filter(({ result }) => result.status !== "classification_failed");
  const labelled = completed.filter(({ item }) => item.expected_competency_id != null);
  const top1 = labelled.filter(({ item, result }) => rawChoice(result) === item.expected_competency_id).length;
  const top2 = labelled.filter(({ item, result }) => rankedProbabilities(result.probabilities).filter(([id]) => id !== NO_CLASSIFIABLE_ID).slice(0, 2).some(([id]) => id === item.expected_competency_id)).length;
  const unlabelled = completed.filter(({ item }) => item.expected_competency_id == null);
  const correctAbstentions = unlabelled.filter(({ result }) => rawChoice(result) === NO_CLASSIFIABLE_ID || result.status === "unclassified").length;
  const autoAccepted = completed.filter(({ result }) => result.status === "classified");
  const autoAcceptedCorrect = autoAccepted.filter(({ item, result }) => acceptable(item, rawChoice(result))).length;
  const correctFlags = completed.map(({ item, result }) => acceptable(item, rawChoice(result)));
  const confidenceCorrect = completed.filter((_, index) => correctFlags[index]).map(({ result }) => result.model_confidence).filter(Number.isFinite);
  const confidenceErrors = completed.filter((_, index) => !correctFlags[index]).map(({ result }) => result.model_confidence).filter(Number.isFinite);
  const apiPairs = completed.filter(({ result }) => result.usage && !result.cache_hit);
  const latency = apiPairs.map(({ result }) => result.latency_ms).filter(Number.isFinite);
  const usage = apiPairs.map(({ result }) => result.usage);
  const inputTokens = usage.reduce((sum, current) => sum + current.input_tokens, 0); const outputTokens = usage.reduce((sum, current) => sum + current.output_tokens, 0);
  const cost = inputTokens / 1_000_000 * pricing.input_usd_per_million + outputTokens / 1_000_000 * pricing.output_usd_per_million;
  const matrix = confusionEntries(completed);
  const incorrectCases = completed.filter(({ item, result }) => !acceptable(item, rawChoice(result))).map(({ item, result }) => ({ id: item.id, expected: expectedLabel(item), predicted: rawChoice(result), status: result.status, confidence: result.model_confidence, case_type: item.case_type }));
  const acceptedCorrect = autoAcceptedCorrect; const acceptedTotal = autoAccepted.length;
  const standardError = acceptedTotal ? Math.sqrt((acceptedCorrect / acceptedTotal) * (1 - acceptedCorrect / acceptedTotal) / acceptedTotal) : null;
  return {
    total: cases.length, completed: completed.length, failures: pairs.length - completed.length,
    statuses: Object.fromEntries(["classified", "review", "unclassified", "classification_failed"].map((status) => [status, pairs.filter(({ result }) => result.status === status).length])),
    top1_accuracy: percent(top1, labelled.length), top1_denominator: labelled.length, top2_accuracy: percent(top2, labelled.length), top2_denominator: labelled.length,
    abstention_accuracy: percent(correctAbstentions, unlabelled.length), abstention_denominator: unlabelled.length,
    auto_accept_accuracy: percent(autoAcceptedCorrect, autoAccepted.length), auto_accept_denominator: autoAccepted.length,
    auto_accept_coverage: percent(autoAccepted.length, completed.length), auto_accept_coverage_denominator: completed.length,
    auto_accept_accuracy_95_wald_interval: standardError == null ? null : [Math.max(0, percent(acceptedCorrect, acceptedTotal) - 1.96 * standardError), Math.min(1, percent(acceptedCorrect, acceptedTotal) + 1.96 * standardError)],
    confidence: { mean_correct: mean(confidenceCorrect), mean_error: mean(confidenceErrors), buckets: [0, 0.5, 0.65, 0.75, 0.82, 0.9, 1].slice(0, -1).map((from, index) => { const to = [0.5, 0.65, 0.75, 0.82, 0.9, 1][index]; const group = completed.filter(({ result }) => result.model_confidence >= from && (to === 1 ? result.model_confidence <= to : result.model_confidence < to)); return { from, to, total: group.length, accuracy: percent(group.filter(({ item, result }) => acceptable(item, rawChoice(result))).length, group.length) }; }) },
    latency_ms: { count: latency.length, min: latency.length ? Math.min(...latency) : null, average: mean(latency), p50: quantile(latency, 0.5), p95: quantile(latency, 0.95), max: latency.length ? Math.max(...latency) : null },
    usage: { input_tokens: inputTokens, output_tokens: outputTokens, incurred_cost_usd: cost, live_requests: apiPairs.length, cache_hits: completed.filter(({ result }) => result.cache_hit).length,
      projected_cost_usd: Object.fromEntries([100, 1000, 10000].map((count) => [count, completed.length ? cost / completed.length * count : null])) },
    confusion_matrix: matrix, most_confused: mostConfused(matrix), incorrect_cases: incorrectCases, thresholds: sweepThresholds(completed, policy),
    by_age: breakdown(completed, (item) => item.age), by_case_type: breakdown(completed, (item) => item.case_type),
  };
}

const asPercent = (value) => value == null ? "n/a" : `${(value * 100).toFixed(1)}%`;
const asUsd = (value) => value == null ? "n/a" : `$${value.toFixed(6)}`;
export function markdownReport(report, metadata) {
  const lines = ["# Resultado del benchmark Jev–CNEB", "", `- Proveedor: ${metadata.provider}`, `- Dataset: ${metadata.dataset}`, `- Casos: ${report.total}; completados: ${report.completed}; fallos: ${report.failures}`, `- Modelo solicitado: ${metadata.model_requested ?? "n/a"}`, `- Modelo efectivo: ${metadata.models_effective.join(", ") || "n/a"}`, `- Dataset provisional: ${metadata.provisional ? "sí" : "no"}`, "", "## Métricas", "", `- Top‑1: ${asPercent(report.top1_accuracy)} (${report.top1_denominator} casos con etiqueta)`, `- Top‑2: ${asPercent(report.top2_accuracy)} (${report.top2_denominator} casos con etiqueta)`, `- Abstención correcta: ${asPercent(report.abstention_accuracy)} (${report.abstention_denominator} casos sin competencia esperada)`, `- Auto-accept accuracy: ${asPercent(report.auto_accept_accuracy)} (${report.auto_accept_denominator} aceptados)`, `- Auto-accept coverage: ${asPercent(report.auto_accept_coverage)} (${report.auto_accept_coverage_denominator} casos evaluables)`, `- Intervalo Wald 95% de auto-accept: ${report.auto_accept_accuracy_95_wald_interval ? report.auto_accept_accuracy_95_wald_interval.map(asPercent).join(" a ") : "n/a"}`, "", "## Umbrales", "", "| Confidence | Autoaceptados | Precisión | Cobertura |", "| --- | ---: | ---: | ---: |", ...report.thresholds.map((item) => `| ${item.threshold} | ${item.auto_accept_count} | ${asPercent(item.auto_accept_accuracy)} | ${asPercent(item.auto_accept_coverage)} |`), "", "## Operación", "", `- Llamadas reales a API: ${report.usage.live_requests}; cache hits: ${report.usage.cache_hits}.`, `- Latencia API: ${report.latency_ms.count} llamadas; media ${report.latency_ms.average?.toFixed(1) ?? "n/a"} ms; p50 ${report.latency_ms.p50?.toFixed(1) ?? "n/a"} ms; p95 ${report.latency_ms.p95?.toFixed(1) ?? "n/a"} ms.`, `- Tokens API: ${report.usage.input_tokens} entrada; ${report.usage.output_tokens} salida.`, `- Costo incurrido: ${asUsd(report.usage.incurred_cost_usd)}.`, `- Proyección de costo: 100 ${asUsd(report.usage.projected_cost_usd[100])}; 1,000 ${asUsd(report.usage.projected_cost_usd[1000])}; 10,000 ${asUsd(report.usage.projected_cost_usd[10000])}.`, "", "## Confusiones principales", "", ...(report.most_confused.length ? report.most_confused.map((item) => `- ${item.expected} → ${item.predicted}: ${item.count}`) : ["- Sin confusiones registradas."]), "", "## Límite de interpretación", "", "Este reporte no constituye validación pedagógica definitiva si el dataset está marcado como provisional. Seleccionar umbrales en desarrollo y confirmarlos con un golden revisado e independiente."];
  lines.push("", "## Casos para revisar", "", ...(report.incorrect_cases.length ? report.incorrect_cases.slice(0, 20).map((item) => `- ${item.id}: esperado ${item.expected}; predicho ${item.predicted}; ${item.case_type}; confidence ${asPercent(item.confidence)}.`) : ["- Sin casos erróneos según las etiquetas disponibles."]));
  return `${lines.join("\n")}\n`;
}
