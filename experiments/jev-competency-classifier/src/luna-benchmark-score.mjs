export const ARMS = ["CURRENT_RAW", "CURRENT_LUNA", "PARALLEL_RAW", "PARALLEL_LUNA"];
const rate = (numerator, denominator) => denominator ? numerator / denominator : null;
const average = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const fmt = (value) => value == null ? "—" : `${(value * 100).toFixed(1)} %`;
const usd = (value) => value == null ? "desconocido" : `$${value.toFixed(6)}`;

export function scoreOutcome(expected, outcome) {
  const selected = [outcome?.primary, ...(outcome?.additional ?? [])].filter(Boolean);
  const primaryAccepted = [expected.primary, ...expected.acceptable_primary].filter(Boolean);
  const blocked = outcome?.status === "privacy_blocked";
  const failed = !outcome || outcome.status === "classification_failed";
  const partialFailure = !failed && outcome?.calls?.some((call) => call.status && call.status !== "ok");
  const privacyTp = blocked && expected.should_privacy_block;
  const privacyFp = blocked && !expected.should_privacy_block;
  const missedPrivacy = expected.should_privacy_block && !blocked;
  const falseAbstention = !expected.should_abstain && !expected.should_privacy_block && !blocked && !failed && !selected.length;
  const overclassification = expected.should_abstain && !blocked && !failed && selected.length > 0;
  const primaryCorrect = !failed && !blocked && Boolean(expected.primary && outcome.primary === expected.primary);
  const acceptableCorrect = !failed && !blocked && !expected.should_abstain && primaryAccepted.includes(outcome.primary);
  const top2Correct = !failed && !blocked && !expected.should_abstain &&
    (outcome.ranked ?? selected).slice(0, 2).some((id) => primaryAccepted.includes(id));
  const allowedSecondary = new Set(expected.acceptable_secondary);
  const additionalCorrect = (outcome?.additional ?? []).filter((id) => allowedSecondary.has(id)).length;
  const additionalIncorrect = (outcome?.additional ?? []).filter((id) => !allowedSecondary.has(id)).length;
  const exactMatch = expected.acceptable_secondary.length && !failed && !blocked && acceptableCorrect &&
    additionalIncorrect === 0 && expected.acceptable_secondary.every((id) => outcome.additional.includes(id));
  const success = expected.should_privacy_block ? privacyTp : expected.should_abstain ?
    !failed && !blocked && !selected.length : !failed && !blocked && acceptableCorrect &&
    additionalIncorrect === 0 && (!expected.acceptable_secondary.length || exactMatch);
  const reasons = [
    ...(failed ? ["classification_failed"] : []),
    ...(partialFailure ? ["provider_partial_failure"] : []),
    ...(privacyFp ? ["false_privacy_block"] : []),
    ...(missedPrivacy ? ["missed_privacy_block"] : []),
    ...(falseAbstention ? ["false_abstention"] : []),
    ...(overclassification ? ["false_classification"] : []),
    ...(!success && !failed && !blocked && !expected.should_abstain && !expected.should_privacy_block && !falseAbstention ? ["wrong_classification"] : []),
  ];
  return { success, primary_correct: primaryCorrect, acceptable_primary_correct: acceptableCorrect,
    top2_correct: top2Correct, exact_match: Boolean(exactMatch), false_abstention: falseAbstention,
    overclassification: Boolean(overclassification), privacy_true_positive: privacyTp,
    false_privacy_block: privacyFp, missed_privacy_block: missedPrivacy,
    additional_correct: additionalCorrect, additional_incorrect: additionalIncorrect,
    discussable: expected.discussable, reasons };
}

export function compareCase(raw, luna) {
  if (!raw || !luna || raw.status === "classification_failed" || luna.status === "classification_failed" ||
    raw.score.reasons?.includes("provider_partial_failure") || luna.score.reasons?.includes("provider_partial_failure")) return "UNDETERMINED";
  if (raw.score.success === luna.score.success) return "SAME";
  return luna.score.success ? "IMPROVED" : "WORSENED";
}

function costOf(outcome, key) {
  if (!outcome) return null;
  return outcome[key];
}

export function summarizeArm(rows) {
  const total = rows.length;
  const eligible = rows.filter((row) => !row.expected.should_privacy_block && !row.expected.should_abstain);
  const strict = eligible.filter((row) => row.expected.primary != null);
  const abstain = rows.filter((row) => row.expected.should_abstain && !row.expected.should_privacy_block);
  const paired = rows.filter((row) => row.expected.acceptable_secondary.length && !row.expected.should_privacy_block);
  const counts = (field) => rows.filter((row) => row.score?.[field]).length;
  const knownCosts = rows.map((row) => costOf(row.outcome, "total_cost_usd"));
  const costsComplete = knownCosts.every((value) => Number.isFinite(value));
  const totalCost = total && costsComplete ? knownCosts.reduce((sum, value) => sum + value, 0) : null;
  const latencies = rows.map((row) => row.outcome?.total_latency_ms).filter(Number.isFinite);
  const correct = counts("success");
  const correctClassifications = eligible.filter((row) => row.score?.success).length;
  const uniqueCases = new Set(rows.map((row) => row.id)).size;
  const confusion = {};
  if (uniqueCases >= 10) for (const row of rows) {
    const expected = row.expected.should_privacy_block ? "PRIVACY" : row.expected.should_abstain ? "NO_CLASIFICABLE" :
      row.expected.primary ?? row.expected.acceptable_primary.join("|");
    const predicted = row.outcome?.status === "classification_failed" ? "API_FAILURE" :
      row.outcome?.status === "privacy_blocked" ? "PRIVACY" : row.outcome?.primary ?? "NO_CLASIFICABLE";
    confusion[expected] ??= {}; confusion[expected][predicted] = (confusion[expected][predicted] ?? 0) + 1;
  }
  return {
    total, primary_accuracy: rate(strict.filter((row) => row.score?.primary_correct).length, strict.length),
    acceptable_primary_accuracy: rate(eligible.filter((row) => row.score?.acceptable_primary_correct).length, eligible.length),
    top2_accuracy: rate(eligible.filter((row) => row.score?.top2_correct).length, eligible.length),
    exact_match: rate(paired.filter((row) => row.score?.exact_match).length, paired.length),
    denominators: { primary: strict.length, classified: eligible.length, abstention: abstain.length, exact: paired.length },
    false_abstentions: counts("false_abstention"), missed_abstentions_overclassification: counts("overclassification"),
    correct_abstentions: abstain.filter((row) => row.score?.success).length,
    privacy_true_positives: counts("privacy_true_positive"), privacy_false_positives: counts("false_privacy_block"),
    missed_privacy_blocks: counts("missed_privacy_block"),
    additional_correct: rows.reduce((n, row) => n + (row.score?.additional_correct ?? 0), 0),
    additional_incorrect: rows.reduce((n, row) => n + (row.score?.additional_incorrect ?? 0), 0),
    discussable_cases: counts("discussable"), errors_total: total - correct, correct_total: correct,
    provider_failures: rows.filter((row) => row.outcome?.status === "classification_failed" ||
      row.score?.reasons.includes("provider_partial_failure")).length,
    cost_usd: totalCost, cost_per_observation_usd: totalCost == null ? null : totalCost / total,
    cost_per_100_usd: totalCost == null ? null : totalCost / total * 100,
    cost_per_1000_usd: totalCost == null ? null : totalCost / total * 1000,
    cost_per_correct_usd: totalCost == null || !correct ? null : totalCost / correct,
    correct_classifications: correctClassifications,
    cost_per_correct_classification_usd: totalCost == null || !correctClassifications ? null : totalCost / correctClassifications,
    latency_average_ms: average(latencies), confusion_matrix: uniqueCases >= 10 ? confusion : null,
  };
}

export function summarizeBenchmark(results) {
  const arms = Object.fromEntries(ARMS.map((arm) => [arm, summarizeArm(results.flatMap((run) =>
    run.cases.filter((item) => item.arms[arm]).map((item) => ({ id: item.id, expected: item.expected, outcome: item.arms[arm], score: item.arms[arm].score }))))]));
  const deltas = {};
  for (const method of ["CURRENT", "PARALLEL"]) {
    const raw = arms[`${method}_RAW`], luna = arms[`${method}_LUNA`];
    if (!raw.total || !luna.total) { deltas[method] = { status: "not_compared" }; continue; }
    deltas[method] = {
      primary_accuracy: luna.primary_accuracy == null || raw.primary_accuracy == null ? null : luna.primary_accuracy - raw.primary_accuracy,
      acceptable_accuracy: luna.acceptable_primary_accuracy == null || raw.acceptable_primary_accuracy == null ? null : luna.acceptable_primary_accuracy - raw.acceptable_primary_accuracy,
      false_abstentions: luna.false_abstentions - raw.false_abstentions,
      overclassification: luna.missed_abstentions_overclassification - raw.missed_abstentions_overclassification,
      false_privacy_blocks: luna.privacy_false_positives - raw.privacy_false_positives,
      cost_usd: luna.cost_usd == null || raw.cost_usd == null ? null : luna.cost_usd - raw.cost_usd,
      cost_per_observation_usd: luna.cost_per_observation_usd == null || raw.cost_per_observation_usd == null ? null : luna.cost_per_observation_usd - raw.cost_per_observation_usd,
      cost_per_100_usd: luna.cost_per_100_usd == null || raw.cost_per_100_usd == null ? null : luna.cost_per_100_usd - raw.cost_per_100_usd,
      cost_per_1000_usd: luna.cost_per_1000_usd == null || raw.cost_per_1000_usd == null ? null : luna.cost_per_1000_usd - raw.cost_per_1000_usd,
      latency_ms: luna.latency_average_ms == null || raw.latency_average_ms == null ? null : luna.latency_average_ms - raw.latency_average_ms,
      improved: results.flatMap((run) => run.cases).filter((item) => item.comparison?.[method] === "IMPROVED").length,
      worsened: results.flatMap((run) => run.cases).filter((item) => item.comparison?.[method] === "WORSENED").length,
    };
    deltas[method].additional_cost_per_error_corrected_usd = deltas[method].cost_usd == null || !deltas[method].improved ? null :
      deltas[method].cost_usd / deltas[method].improved;
  }
  return { arms, deltas };
}

function tableRow(label, summary, property, format = String) {
  return `| ${label} | ${ARMS.map((arm) => summary.arms[arm][property] == null ? "—" : format(summary.arms[arm][property])).join(" | ")} |`;
}

export function comparisonMarkdown(metadata, results, summary) {
  const rows = results.flatMap((run) => run.cases.map((item) => ({ run: run.number, ...item })));
  const lines = ["# Benchmark Luna + Jev", "", `Dataset: ${metadata.dataset}; huella SHA-256: ${metadata.dataset_fingerprint}.`,
    `Repeticiones: ${results.length}. CURRENT: ${metadata.current_method}; PARALLEL: parallel-noul.`,
    "La mejora se decide con las etiquetas docentes, no con otro modelo. El costo desconocido no se reemplaza por cero.", "",
    "Cada repetición es una llamada nueva al mismo caso; no aumenta el número de observaciones independientes. Luna se reutiliza entre métodos en cada repetición: el costo por brazo incluye Luna completa para comparar su adopción; el desembolso real total la cuenta una sola vez.", "",
    "| Métrica | CURRENT RAW | CURRENT LUNA | PARALLEL RAW | PARALLEL LUNA |", "| --- | ---: | ---: | ---: | ---: |",
    tableRow("Precisión primaria", summary, "primary_accuracy", fmt),
    tableRow("Primaria aceptable", summary, "acceptable_primary_accuracy", fmt),
    tableRow("Top 2", summary, "top2_accuracy", fmt),
    tableRow("Abstenciones falsas", summary, "false_abstentions"),
    tableRow("Clasificaciones indebidas", summary, "missed_abstentions_overclassification"),
    tableRow("Bloqueos de privacidad falsos", summary, "privacy_false_positives"),
    tableRow("Costo por 100", summary, "cost_per_100_usd", usd),
    tableRow("Latencia media ms", summary, "latency_average_ms", (n) => n.toFixed(0)),
    "", "## Cambio al añadir Luna", "",
    ...["CURRENT", "PARALLEL"].map((method) => {
      const delta = summary.deltas[method];
      if (delta.status === "not_compared") return `- ${method}: no comparado; falta un brazo.`;
      return `- ${method}: primaria ${fmt(delta.primary_accuracy)}, aceptable ${fmt(delta.acceptable_accuracy)}, ` +
        `abstenciones falsas ${delta.false_abstentions >= 0 ? "+" : ""}${delta.false_abstentions}, ` +
        `clasificaciones indebidas ${delta.overclassification >= 0 ? "+" : ""}${delta.overclassification}, ` +
        `bloqueos falsos ${delta.false_privacy_blocks >= 0 ? "+" : ""}${delta.false_privacy_blocks}, ` +
        `costo incremental ${usd(delta.cost_usd)}, latencia incremental ${delta.latency_ms?.toFixed(0) ?? "—"} ms; ` +
        `mejorados ${delta.improved}, empeorados ${delta.worsened}; costo por error corregido ${usd(delta.additional_cost_per_error_corrected_usd)}.`;
    }), ""];
  for (const [status, title] of [["IMPROVED", "Casos mejorados por Luna"], ["WORSENED", "Casos empeorados por Luna"],
    ["SAME", "Casos sin cambios"], ["UNDETERMINED", "Comparaciones incompletas"]]) {
    const matches = rows.flatMap((item) => ["CURRENT", "PARALLEL"].flatMap((method) =>
      item.comparison?.[method] === status ? [`- ${item.id}, repetición ${item.run}, ${method}.`] : []));
    lines.push(`## ${title}`, "", ...(matches.length ? matches : ["Ninguno."]), "");
  }
  lines.push("## Errores restantes", "", ...rows.flatMap((item) => ["CURRENT_LUNA", "PARALLEL_LUNA"].flatMap((arm) =>
    item.arms[arm]?.score?.reasons.length ? [`- ${item.id}, repetición ${item.run}, ${arm}: ${item.arms[arm].score.reasons.join(", ")}.`] : [])), "", "## Casos", "");
  for (const item of rows) {
    lines.push(`### ${item.id} · repetición ${item.run}`, "", `Original: ${item.raw_observation}`, "",
      `Luna: ${item.luna?.clean_observation ?? "—"}`, "",
      `Interpretación: ${item.luna?.brief_interpretation ?? "—"}`, "",
      `Esperado: ${JSON.stringify(item.expected)}`, "", ...ARMS.map((arm) =>
        `- ${arm}: ${item.arms[arm] ? `${item.arms[arm].status}; ${[item.arms[arm].primary, ...(item.arms[arm].additional ?? [])].filter(Boolean).join(", ") || "ninguna"}; ${item.arms[arm].score?.reasons.join(", ") || "sin error"}` : "no ejecutado"}.`),
      `- Luna en CURRENT: ${item.comparison?.CURRENT ?? "—"}; en PARALLEL: ${item.comparison?.PARALLEL ?? "—"}.`, "");
  }
  return `${lines.join("\n")}\n`;
}

export function errorsMarkdown(results) {
  const errors = results.flatMap((run) => run.cases.flatMap((item) => ARMS.flatMap((arm) =>
    item.arms[arm]?.score?.reasons.length ? [`- Repetición ${run.number}, ${item.id}, ${arm}: ${item.arms[arm].score.reasons.join(", ")}.`] : [])));
  return `# Errores del benchmark\n\n${errors.length ? errors.join("\n") : "Sin errores según las etiquetas disponibles."}\n`;
}
