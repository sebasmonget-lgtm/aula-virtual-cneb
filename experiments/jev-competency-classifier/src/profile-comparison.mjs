import { NO_CLASSIFIABLE_ID } from "./constants.mjs";

const ranked = (scores) => Object.entries(scores ?? {}).sort(([leftId, left], [rightId, right]) => right - left || leftId.localeCompare(rightId));
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

export function proposals(result, method, { threshold = 0.8, secondMargin = null, minimumSufficiency = null } = {}) {
  if (!result || result.status === "classification_failed") return [];
  if (minimumSufficiency != null && result.sufficiency_probability != null && result.sufficiency_probability < minimumSufficiency) return [];
  if (method === "parallel-noul") return ranked(result.competency_scores).filter(([, score]) => score >= threshold).map(([id]) => id);
  if (method === "hybrid") return result.proposed_competency_ids ?? [];
  if (result.status === "unclassified" || !result.proposed_competency_id) return [];
  const ids = [result.proposed_competency_id];
  const second = result.secondary_candidate;
  if (secondMargin != null && second?.competency_id !== NO_CLASSIFIABLE_ID && Number.isFinite(second?.probability) && result.top1_probability - second.probability <= secondMargin) ids.push(second.competency_id);
  return [...new Set(ids)];
}

export function evaluateCases(cases, rows, applicability, { method, profile, threshold = 0.8, secondMargin = null, minimumSufficiency = null }) {
  const byId = new Map(rows.filter((row) => row.method === method && row.profile === profile).map((row) => [row.id, row.result]));
  const applicable = new Map(applicability.map((entry) => [entry.id, entry.primary_applicable]));
  const evaluable = cases.filter((item) => applicable.get(item.id));
  const completed = evaluable.filter((item) => byId.has(item.id) && byId.get(item.id).status !== "classification_failed");
  const labelled = completed.filter((item) => item.expected_competency_id);
  const abstain = completed.filter((item) => !item.expected_competency_id);
  let primaryTop1 = 0; let primaryIncluded = 0; let admissible = 0; let abstainCorrect = 0; let extraLabels = 0; let proposedLabels = 0; let secondaryShown = 0;
  const mistaken = [];
  for (const item of completed) {
    const result = byId.get(item.id);
    const predicted = proposals(result, method, { threshold, secondMargin, minimumSufficiency });
    const allowed = new Set([item.expected_competency_id, ...item.acceptable_secondary_ids].filter(Boolean));
    const extra = predicted.filter((id) => !allowed.has(id));
    proposedLabels += predicted.length;
    extraLabels += extra.length;
    if (item.expected_competency_id) {
      const top = method === "choice" ? ranked(result.probabilities)[0]?.[0] : ranked(result.competency_scores)[0]?.[0];
      if (top === item.expected_competency_id) primaryTop1 += 1;
      if (predicted.includes(item.expected_competency_id)) primaryIncluded += 1;
      if (item.acceptable_secondary_ids.some((id) => predicted.includes(id))) secondaryShown += 1;
      if (predicted.includes(item.expected_competency_id) && !extra.length) admissible += 1;
      else mistaken.push({ id: item.id, expected: item.expected_competency_id, predicted, extra });
    } else if (!predicted.length) { abstainCorrect += 1; admissible += 1; }
    else mistaken.push({ id: item.id, expected: null, predicted, extra });
  }
  const live = rows.filter((row) => row.method === method && row.profile === profile && row.result?.usage && !row.result.cache_hit);
  const costUsd = live.reduce((sum, row) => sum + (row.result.usage.cost_usd ?? 0), 0);
  return {
    method, profile, threshold: method === "parallel-noul" ? threshold : null, second_margin: method === "choice" ? secondMargin : null, minimum_sufficiency: minimumSufficiency,
    eligible: evaluable.length, completed: completed.length, failures: evaluable.length - completed.length, labelled: labelled.length, abstain: abstain.length,
    primary_top1: primaryTop1, primary_in_proposals: primaryIncluded, admissible_cases: admissible, correct_abstentions: abstainCorrect,
    proposed_labels: proposedLabels, extra_labels: extraLabels, secondary_shown: secondaryShown, average_proposals: completed.length ? proposedLabels / completed.length : null,
    live_requests: live.length, cost_usd: costUsd, average_latency_ms: mean(live.map((row) => row.result.latency_ms).filter(Number.isFinite)), mistaken,
  };
}
