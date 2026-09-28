import { DIMENSIONS } from "./gate.mjs";
import { sha256 } from "./cases.mjs";

const key = (row) => `${row.case_id}:${row.repetition}:${row.arm}`;
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2 : null;
};
const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.ceil(p * sorted.length) - 1] : null;
};
export function reducedExperiment(state) {
  const available = state.runs.filter((row) => row.status === "valid");
  const valid = new Map(available.map((row) => [key(row), row]));
  const complete = state.cases.map((item) => ({ item,
    repetitions: [1, 2, 3].filter((rep) => valid.has(`${item.id}:${rep}:A`) && valid.has(`${item.id}:${rep}:B`)) }))
    .filter((item) => item.repetitions.length);
  // Select by availability/demographics, never by scores, cost, wording or latency.
  // One paired repetition/case minimizes the additional blind-review cost. Existing extra runs remain intact.
  const selected = complete.map(({ item, repetitions }) => ({ case_id: item.id, age: item.age,
    period: item.period, kind: item.kind, repetitions: repetitions.slice(0, 1) }));
  // Smallest completion plan adds age 5 and an available hard case. No new B output is needed.
  const targets = ["base-5-p4-baseline", "hard-holiday"].filter((caseId) => !selected.some((item) => item.case_id === caseId)).map((caseId) => {
    const row = available.filter((run) => run.case_id === caseId).sort((a, b) => a.repetition - b.repetition)[0];
    if (!row) return null;
    return { case_id: caseId, repetition: row.repetition,
      missing_arm: valid.has(`${caseId}:${row.repetition}:A`) ? "B" : "A" };
  }).filter(Boolean);
  const rows = selected.flatMap((item) => item.repetitions.flatMap((rep) =>
    [valid.get(`${item.case_id}:${rep}:A`), valid.get(`${item.case_id}:${rep}:B`)]));
  const metrics = Object.fromEntries(["A", "B"].map((arm) => {
    const subset = rows.filter((row) => row.arm === arm);
    const all = state.runs.filter((row) => row.arm === arm);
    return [arm, { outputs_in_balanced_subset: subset.length,
      input_tokens: subset.reduce((sum, row) => sum + row.input_tokens, 0),
      output_tokens: subset.reduce((sum, row) => sum + row.output_tokens, 0),
      cost_usd_lower_bound: subset.reduce((sum, row) => sum + row.cost_usd, 0),
      median_cost_usd: median(subset.map((row) => row.cost_usd)),
      p50_latency_ms: median(subset.map((row) => row.latency_ms)),
      p95_latency_ms: percentile(subset.map((row) => row.latency_ms), 0.95),
      retries: subset.reduce((sum, row) => sum + row.retries, 0),
      unknown_billed_attempts: subset.reduce((sum, row) => sum + row.unknown_billed_attempts, 0),
      full_attempted_outputs: all.length, full_provider_failures: all.filter((row) => row.status !== "valid").length,
      teacher_edit_count: null, teacher_edit_minutes: null, rubric_scores: null }];
  }));
  const bundles = rows.map((row) => {
    const blindId = sha256(`reduced-blind:${key(row)}`).slice(0, 24);
    const item = state.cases.find((item) => item.id === row.case_id);
    return { blind_id: blindId, case: { age: item.age, period: item.period,
      proposal: item.annual_proposal, decisions: item.teacher_decisions,
      classroom_context: item.classroom_context, instructional_dates: item.dates },
      project: row.draft };
  }).sort((a, b) => a.blind_id.localeCompare(b.blind_id));
  return { report: { protocol: "f2-reduced-cost-control-v1", source_fingerprint: sha256(state),
    valid_preserved: available.length, complete_cases: complete.length,
    complete_paired_repetitions_available: complete.reduce((sum, row) => sum + row.repetitions.length, 0),
    selected, completion_plan: targets, target_complete_cases: selected.length + targets.length,
    max_repetitions_per_case: 2, selected_repetitions_per_case: 1,
    additional_budget_usd: 3, additional_spent_usd: 0, rubric: DIMENSIONS,
    metrics, reviews_status: "pending_external_credit_balance_exhausted", winner: null, fallback: "A",
    limitations: ["Only available complete pairs; not the full matrix or certified curriculum accuracy.",
      "Availability-selected subset is not age/period balanced factorial coverage; original provider failures remain separately reported.",
      "Two current-agent masked passes are not independent specialists; correction counts are estimates, not measured teacher work.",
      "The two authorized A completions have output caps for budget safety. No additional repeats; historical runs remain unchanged."] }, bundles };
}
