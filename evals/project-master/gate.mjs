/** Preregistered F2 gate. This module does not generate projects or choose a winner from incomplete data. */
export const DIMENSIONS = Object.freeze({
  coherence: 0.20, curriculum: 0.20, evidence_links: 0.20,
  calendar: 0.15, mediation: 0.15, edit_fidelity: 0.10,
});

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
};
const percentile = (values, fraction) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(fraction * sorted.length) - 1];
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const key = (row) => `${row.case_id}:${row.repetition}:${row.arm}`;

/** Rejects incomplete, non-blind or self-labelled evidence before any branch selection. */
export function validateBakeoffEvidence({ cases, runs, reviews, adjudications, validation_mode: mode }) {
  assert(["specialist", "provisional_independent"].includes(mode), "Validation mode must be declared.");
  assert(Array.isArray(cases) && cases.length >= 36, "F2 requires at least 36 cases.");
  const caseIds = new Set(cases.map((row) => row.id));
  assert(caseIds.size === cases.length, "Case IDs must be unique.");
  for (const kind of ["base", "qa_regression", "expert_hard"])
    assert(cases.filter((row) => row.kind === kind).length >= (kind === "base" ? 24 : 6), `F2 needs ${kind} cases.`);
  const baseCells = new Set(cases.filter((row) => row.kind === "base")
    .map((row) => `${row.age}:${row.period}:${row.context_variant}`));
  for (const age of [3, 4, 5]) for (const period of [1, 2, 3, 4]) for (const variant of ["baseline", "changed"])
    assert(baseCells.has(`${age}:${period}:${variant}`), `Missing 3×4×2 base cell: ${age}/${period}/${variant}`);
  for (const row of cases) {
    assert(["development", "blind_test"].includes(row.split), `Unassigned split: ${row.id}`);
    assert(row.source_hash && row.expected_contract_hash && row.calendar_hash && row.kb_hash,
      `Frozen source metadata missing: ${row.id}`);
    if (row.kind === "qa_regression") assert(row.qa_source && row.expected_outcome,
      `QA regression needs traceable source and expected outcome: ${row.id}`);
    if (row.kind === "expert_hard") assert(mode === "specialist" ? row.expert_case_adjudication_id :
      row.provisional_case_rationale, `Hard case lacks its declared review basis: ${row.id}`);
  }
  assert(cases.some((row) => row.kind === "expert_hard" && row.legacy), "Expert set must include legacy.");
  assert(Array.isArray(runs) && Array.isArray(reviews) && Array.isArray(adjudications), "F2 records are incomplete.");
  const runsByKey = new Map();
  const frozen = new Map();
  for (const row of runs) {
    assert(caseIds.has(row.case_id) && ["A", "B"].includes(row.arm) &&
      Number.isInteger(row.repetition) && row.repetition >= 1 && row.repetition <= 3,
    "Invalid F2 run identity.");
    assert(!runsByKey.has(key(row)), `Duplicate run: ${key(row)}`);
    assert(["valid", "invalid"].includes(row.status) && Number.isFinite(row.latency_ms) && row.latency_ms >= 0 &&
      Number.isFinite(row.input_tokens) && row.input_tokens >= 0 &&
      Number.isFinite(row.output_tokens) && row.output_tokens >= 0 &&
      Number.isFinite(row.cost_usd) && row.cost_usd >= 0 &&
      Number.isInteger(row.unknown_billed_attempts) && row.unknown_billed_attempts >= 0 &&
      Number.isInteger(row.retries) && row.retries >= 0 && row.retries <= 1,
    `Missing or invalid run metrics: ${key(row)}`);
    assert(row.provider_version && row.price_version && row.prompt_hash && row.output_schema_hash,
      `Run provenance missing: ${key(row)}`);
    const common = JSON.stringify([row.provider_version, row.price_version, row.output_schema_hash,
      row.input_hash, row.kb_hash, row.calendar_hash, row.retrieval_hash]);
    assert(row.input_hash && row.kb_hash && row.calendar_hash && row.retrieval_hash,
      `Input provenance missing: ${key(row)}`);
    const previous = frozen.get(`${row.case_id}:${row.repetition}`);
    assert(!previous || previous === common, `Arms differ in frozen input/provider/schema: ${key(row)}`);
    frozen.set(`${row.case_id}:${row.repetition}`, common);
    runsByKey.set(key(row), row);
  }
  for (const row of cases) for (const arm of ["A", "B"]) for (let repetition = 1; repetition <= 3; repetition++)
    assert(runsByKey.has(`${row.id}:${repetition}:${arm}`), `Missing run: ${row.id}:${repetition}:${arm}`);
  assert(runs.length === cases.length * 6, "F2 has extra runs outside the frozen dataset.");
  const reviewByRun = new Map();
  for (const review of reviews) {
    assert(runsByKey.has(review.run_key) && review.reviewer_id && review.blinded_output_id &&
      !["A", "B"].includes(review.visible_arm), "Review must refer to a blinded run.");
    assert(mode === "specialist" ? review.reviewer_kind === "human_specialist" :
      review.reviewer_kind === "independent_ai" && review.evaluator_run_id,
    `Review provenance does not match validation mode: ${review.run_key}`);
    for (const dimension of Object.keys(DIMENSIONS))
      assert(Number.isInteger(review.scores?.[dimension]) && review.scores[dimension] >= 0 &&
        review.scores[dimension] <= 4, `Invalid review score: ${review.run_key}/${dimension}`);
    assert(Number.isFinite(review.teacher_edit_minutes) && review.teacher_edit_minutes >= 0 &&
      Number.isInteger(review.teacher_edit_count) && review.teacher_edit_count >= 0,
    `Teacher edit metrics missing: ${review.run_key}`);
    const seen = reviewByRun.get(review.run_key) ?? [];
    assert(!seen.some((item) => item.reviewer_id === review.reviewer_id), "Duplicate reviewer for one run.");
    seen.push(review); reviewByRun.set(review.run_key, seen);
  }
  for (const row of runs) if (row.status === "valid")
    assert((reviewByRun.get(key(row)) ?? []).length >= 2, `Two independent reviews required: ${key(row)}`);
  for (const pair of reviewByRun.values()) assert(new Set(pair.map((item) => item.evaluator_run_id)).size === pair.length,
    "Independent reviews must have distinct execution IDs.");
  const adjudicated = new Set(adjudications.map((item) => item.run_key));
  for (const [runKey, pair] of reviewByRun) {
    const disagreement = Object.keys(DIMENSIONS).some((dimension) =>
      new Set(pair.map((item) => item.scores[dimension])).size > 1) ||
      new Set(pair.map((item) => Boolean(item.serious_curricular_veto))).size > 1;
    if (disagreement) assert(adjudicated.has(runKey), `Disagreement needs adjudication: ${runKey}`);
  }
  return { runsByKey, reviewByRun };
}

function armMetrics(arm, cases, runsByKey, reviewByRun, adjudications) {
  const rows = cases.flatMap((item) => [1, 2, 3].map((repetition) => runsByKey.get(`${item.id}:${repetition}:${arm}`)));
  const valid = rows.filter((row) => row.status === "valid");
  const adjudicationByRun = new Map(adjudications.map((item) => [item.run_key, item]));
  const reviewed = rows.map((row) => {
    if (row.status === "invalid") return { case_id: row.case_id, repetition: row.repetition,
      score: 0, scores: Object.fromEntries(Object.keys(DIMENSIONS).map((dimension) => [dimension, 0])),
      serious_curricular_veto: false, teacher_edit_count: 999, teacher_edit_minutes: 999 };
    const runKey = key(row), pair = reviewByRun.get(runKey);
    const adjudicated = adjudicationByRun.get(runKey);
    const scores = adjudicated?.scores ?? Object.fromEntries(Object.keys(DIMENSIONS).map((dimension) =>
      [dimension, mean(pair.map((item) => item.scores[dimension]))]));
    return { case_id: row.case_id, repetition: row.repetition, score: Object.entries(DIMENSIONS)
      .reduce((total, [dimension, weight]) => total + scores[dimension] * weight, 0), scores,
    serious_curricular_veto: adjudicated?.serious_curricular_veto ?? pair.some((item) => item.serious_curricular_veto),
    teacher_edit_count: mean(pair.map((item) => item.teacher_edit_count)),
    teacher_edit_minutes: mean(pair.map((item) => item.teacher_edit_minutes)) };
  });
  const dimensions = Object.fromEntries(Object.keys(DIMENSIONS).map((dimension) =>
    [dimension, mean(reviewed.map((item) => item.scores[dimension]))]));
  const expertIds = new Set(cases.filter((item) => item.kind === "expert_hard").map((item) => item.id));
  return { arm, valid_rate: valid.length / rows.length, count: rows.length, invalid: rows.length - valid.length,
    mean_score: mean(reviewed.map((item) => item.score)), dimensions,
    median_cost_usd: median(valid.map((item) => item.cost_usd)), p50_latency_ms: median(rows.map((item) => item.latency_ms)),
    p95_latency_ms: percentile(rows.map((item) => item.latency_ms), 0.95),
    mean_teacher_edits: mean(reviewed.map((item) => item.teacher_edit_count)),
    serious_expert_vetoes: reviewed.filter((item) => expertIds.has(item.case_id) && item.serious_curricular_veto).length,
    retries: rows.reduce((sum, item) => sum + item.retries, 0),
    input_tokens: rows.reduce((sum, item) => sum + item.input_tokens, 0),
    output_tokens: rows.reduce((sum, item) => sum + item.output_tokens, 0),
    total_cost_usd_lower_bound: rows.reduce((sum, item) => sum + item.cost_usd, 0),
    unknown_billed_attempts: rows.reduce((sum, item) => sum + item.unknown_billed_attempts, 0), reviewed };
}

function pairedBootstrap(a, b) {
  const aByKey = new Map(a.reviewed.map((item) => [`${item.case_id}:${item.repetition}`, item.score]));
  const differences = b.reviewed.map((item) => item.score - aByKey.get(`${item.case_id}:${item.repetition}`));
  let seed = 20260928;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const samples = Array.from({ length: 2000 }, () => mean(Array.from({ length: differences.length }, () =>
    differences[Math.floor(random() * differences.length)])));
  return { paired_mean_delta: mean(differences), bootstrap_95_percent_interval:
    [percentile(samples, 0.025), percentile(samples, 0.975)], bootstrap_seed: 20260928 };
}

/** Fail closed: no choice without full dataset, blinded review and preregistered thresholds. */
export function decideBakeoff(evidence) {
  const { runsByKey, reviewByRun } = validateBakeoffEvidence(evidence);
  const A = armMetrics("A", evidence.cases, runsByKey, reviewByRun, evidence.adjudications);
  const B = armMetrics("B", evidence.cases, runsByKey, reviewByRun, evidence.adjudications);
  const passing = (arm) => arm.valid_rate >= 0.98 && arm.serious_expert_vetoes === 0 &&
    evidence.risk_defects?.[arm.arm] === 0;
  assert(Number.isInteger(evidence.risk_defects?.A) && Number.isInteger(evidence.risk_defects?.B),
    "Authorization, privacy and history defects must be audited for both arms.");
  let winner = null;
  if (passing(A) && !passing(B)) winner = "A";
  if (passing(B) && !passing(A)) winner = "B";
  if (passing(A) && passing(B)) {
    const delta = B.mean_score - A.mean_score;
    const noDimensionDrop = Object.keys(DIMENSIONS).every((dimension) =>
      B.dimensions[dimension] >= A.dimensions[dimension] - 0.20);
    const efficiency = B.p95_latency_ms <= A.p95_latency_ms * 0.75 ||
      (A.median_cost_usd !== null && B.median_cost_usd !== null &&
        A.unknown_billed_attempts === 0 && B.unknown_billed_attempts === 0 &&
        B.median_cost_usd <= A.median_cost_usd * 0.75);
    winner = (delta >= 0.20 && noDimensionDrop) ||
      (Math.abs(delta) <= 0.20 && efficiency && B.mean_teacher_edits <= A.mean_teacher_edits) ? "B" : "A";
  }
  return { winner, gate_passed: winner !== null, A, B,
    paired_comparison: pairedBootstrap(A, B),
    validation_mode: evidence.validation_mode,
    human_validation_pending: evidence.validation_mode !== "specialist",
    reason: winner === null ? "Neither arm passed the preregistered safety/validity gate." :
      `Preregistered F2 rule selected ${winner}.` };
}
