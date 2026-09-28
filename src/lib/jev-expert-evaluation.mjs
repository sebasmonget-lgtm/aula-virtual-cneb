export function validateExpertDecisionCase(value, allowedIds) {
  const allowed = new Set(allowedIds);
  const validIds = (ids) => Array.isArray(ids) && new Set(ids).size === ids.length && ids.every((id) => allowed.has(id));
  if (!value || value.label_status !== "expert_adjudicated" || value.dataset_origin === "synthetic" ||
      ![3, 4, 5].includes(value.age) || typeof value.observation !== "string" ||
      !value.observation.trim() || value.observation.length > 4_000 ||
      !Array.isArray(value.independent_labels) || value.independent_labels.length < 2 ||
      new Set(value.independent_labels.map((label) => label.reviewer_code)).size !== value.independent_labels.length ||
      value.independent_labels.some((label) => !/^[A-Za-z0-9_-]{2,30}$/.test(label.reviewer_code ?? "") ||
        label.independent !== true || !validIds(label.competency_ids)) ||
      !validIds(value.adjudicated_competency_ids))
    throw new Error("El caso requiere dos etiquetas expertas independientes y un conjunto adjudicado.");
  return value;
}

export function summarizeDecisionComparison(cases) {
  const summarize = (key) => {
    let exact = 0, falsePositives = 0, falseNegatives = 0, noneExact = 0, multipleExact = 0;
    for (const item of cases) {
      const expected = new Set(item.expected), actual = new Set(item[key]);
      const matches = expected.size === actual.size && [...expected].every((id) => actual.has(id));
      if (matches) exact++;
      if (!expected.size && matches) noneExact++;
      if (expected.size > 1 && matches) multipleExact++;
      falsePositives += [...actual].filter((id) => !expected.has(id)).length;
      falseNegatives += [...expected].filter((id) => !actual.has(id)).length;
    }
    return { exact, false_positives: falsePositives, false_negatives: falseNegatives,
      none_exact: noneExact, multiple_exact: multipleExact };
  };
  return { total: cases.length, without_competency: cases.filter((item) => !item.expected.length).length,
    multiple_competencies: cases.filter((item) => item.expected.length > 1).length,
    current: summarize("current"), jev: summarize("jev") };
}
