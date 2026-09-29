export const V24_PILOT_TARGET = 30;

/** Input contains only classifier metadata and curricular IDs, never child data or notes. */
export function summarizeSpontaneousV24Pilot(rows, events) {
  const statusCount = (status) => rows.filter((row) => row.classifier_status === status).length;
  const suggested = statusCount("suggested"), abstained = statusCount("abstained");
  const completed = suggested + abstained;
  const attempted = rows.filter((row) => row.classifier_attempt_count > 0 ||
    ["suggested","abstained","failed"].includes(row.classifier_status)).length;
  const attemptCalls = rows.reduce((sum,row) => sum + Math.max(row.classifier_attempt_count ?? 0,
    ["suggested","abstained","failed"].includes(row.classifier_status) ? 1 : 0),0);
  const technicalFailed = rows.filter((row) => row.classifier_technical_failure_count > 0 ||
    row.classifier_status === "failed").length;
  const technicalFailureAttempts = rows.reduce((sum,row) => sum + Math.max(row.classifier_technical_failure_count ?? 0,
    row.classifier_status === "failed" ? 1 : 0),0);
  const reviewed = rows.filter((row) => row.classifier_status === "suggested" &&
    ["confirmed", "changed", "rejected"].includes(row.teacher_action));
  const actionCount = (action) => reviewed.filter((row) => row.teacher_action === action).length;
  const direct = actionCount("confirmed"), changed = actionCount("changed"), rejected = actionCount("rejected");
  const countBy = (values) => Object.fromEntries([...new Set(values.filter(Boolean))].sort()
    .map((id) => [id,values.filter((value) => value === id).length]));
  const matrix = new Map();
  for (const row of reviewed) {
    if (!row.suggested || !row.confirmed) continue;
    const key = `${row.suggested}\u0000${row.confirmed}`;
    matrix.set(key,(matrix.get(key) ?? 0) + 1);
  }
  const correctionMatrix = [...matrix].map(([key,count]) => {
    const [suggestedCompetency,confirmedCompetency] = key.split("\u0000");
    return { suggested_competency: suggestedCompetency, confirmed_competency: confirmedCompetency, count };
  }).sort((a,b) => b.count - a.count || a.suggested_competency.localeCompare(b.suggested_competency) ||
    a.confirmed_competency.localeCompare(b.confirmed_competency));
  const suggestedCounts = countBy(rows.filter((row) => row.classifier_status === "suggested").map((row) => row.suggested));
  const confirmedCounts = countBy(rows.filter((row) => row.teacher_action && row.confirmed).map((row) => row.confirmed));
  const changedToward = countBy(reviewed.filter((row) => row.teacher_action === "changed").map((row) => row.confirmed));
  const changedFrom = countBy(reviewed.filter((row) => row.teacher_action === "changed").map((row) => row.suggested));
  const distribution = [...new Set([...Object.keys(suggestedCounts),...Object.keys(confirmedCounts),
    ...Object.keys(changedToward),...Object.keys(changedFrom)])].sort().map((id) => ({
    competency: id, suggested: suggestedCounts[id] ?? 0, confirmed: confirmedCounts[id] ?? 0,
    changed_toward: changedToward[id] ?? 0, changed_from: changedFrom[id] ?? 0,
  }));
  const latencies = rows.map((row) => row.classifier_latency_ms).filter((value) => Number.isInteger(value) && value >= 0)
    .sort((a,b) => a-b);
  const percentile = (p) => latencies.length ? latencies[Math.ceil(p * latencies.length) - 1] : null;
  const eventsByObservation = new Map();
  for (const event of events) eventsByObservation.set(event.observation_id,
    (eventsByObservation.get(event.observation_id) ?? 0) + 1);
  return {
    classifier_version: "CURRENT_V2_4_RAW", observations: rows.length,
    classifier: { attempted, attempt_calls: attemptCalls, suggested, abstained,
      privacy_blocked: statusCount("privacy_blocked"), technical_failed: technicalFailed,
      technical_failure_attempts: technicalFailureAttempts, pending_classifier: statusCount("pending"),
      completed_classifier_attempts: completed, missing_text: statusCount("missing_text"),
      disabled: statusCount("disabled"),
      technical_error_codes: countBy(rows.filter((row) => row.classifier_status === "failed")
        .map((row) => row.classifier_error_code)) },
    review: { suggestions_total: suggested, suggestions_reviewed: reviewed.length,
      suggestions_pending_review: suggested - reviewed.length,
      direct_confirmations: direct, changed, rejected,
      saved_without_competency: rows.filter((row) => row.teacher_action === "saved_without_competency").length,
      decision_events_recorded: events.length,
      observations_with_multiple_decisions: [...eventsByObservation.values()].filter((value) => value > 1).length,
      reviewed_without_event: reviewed.filter((row) => !eventsByObservation.has(row.id)).length },
    rates: { direct_confirmation_rate_reviewed: reviewed.length ? direct / reviewed.length : null,
      review_completion_rate: suggested ? reviewed.length / suggested : null,
      changed_rate_reviewed: reviewed.length ? changed / reviewed.length : null,
      rejected_rate_reviewed: reviewed.length ? rejected / reviewed.length : null,
      abstention_rate: completed ? abstained / completed : null,
      direct_confirmation_rate_all_suggestions: suggested ? direct / suggested : null },
    correction_matrix: correctionMatrix, distribution,
    latency_ms: { count: latencies.length,
      mean: latencies.length ? latencies.reduce((sum,value) => sum+value,0) / latencies.length : null,
      p50: percentile(0.5), p95: percentile(0.95) },
    pilot: { target: V24_PILOT_TARGET, attempted, reviewed_suggestions: reviewed.length,
      remaining_to_target: Math.max(0,V24_PILOT_TARGET-attempted) },
  };
}
