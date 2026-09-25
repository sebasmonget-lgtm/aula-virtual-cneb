import { AYNI_HEURISTICS } from "./ayni-heuristics.mjs";

export const COVERAGE_STATES = Object.freeze(["no_records", "observe_more", "building_evidence", "varied_evidence"]);
export const ASSESSMENT_STATES = Object.freeze(["not_assessed", "draft", "confirmed", "needs_review"]);

const day = (value) => value == null ? null : String(value instanceof Date ? value.toISOString() : value).slice(0, 10);
const dayDistance = (later, earlier) => Math.floor((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86_400_000);
const situation = (row) => row.situation_id ?? row.activity_id ?? row.experience_id ?? row.context_label ?? `record:${row.id}`;

export function assessmentState(row) {
  if (row?.state === "needs_review") return "needs_review";
  if (row?.assessment?.status === "active") return "confirmed";
  if (row?.draft || row?.state === "draft") return "draft";
  return "not_assessed";
}

export function coverageForRecords(records, { today = new Date().toISOString().slice(0, 10), policy = AYNI_HEURISTICS } = {}) {
  const valid = records.filter((row) => day(row.observed_on ?? row.observed_at));
  const dates = valid.map((row) => day(row.observed_on ?? row.observed_at));
  const last = dates.sort().at(-1) ?? null;
  const recent = valid.filter((row) => {
    const distance = dayDistance(today, day(row.observed_on ?? row.observed_at));
    return distance >= 0 && distance <= policy.coverage_recent_days;
  });
  const situationCount = new Set(valid.map(situation)).size;
  const recentSituationCount = new Set(recent.map(situation)).size;
  const recentDateCount = new Set(recent.map((row) => day(row.observed_on ?? row.observed_at))).size;
  const coverageState = !valid.length ? "no_records" : !recent.length ? "observe_more"
    : recentSituationCount >= policy.varied_min_situations && recentDateCount >= policy.varied_min_dates
      ? "varied_evidence" : "building_evidence";
  return { coverage_state: coverageState, record_count: valid.length, last_observed_on: last,
    situation_count: situationCount, recent_situation_count: recentSituationCount, recent_date_count: recentDateCount };
}

export function observeTodaySuggestions(students, records, competencyId, criterionFocusKeys = [], options = {}) {
  const { today = new Date().toISOString().slice(0, 10), policy = AYNI_HEURISTICS } = options;
  return students.map((student) => {
    const own = records.filter((row) => row.student_id === student.id && row.competency_id === competencyId);
    const coverage = coverageForRecords(own, { today, policy });
    const focusMissing = criterionFocusKeys.some((key) => !own.some((row) => row.criterion_focus_key === key));
    const stale = coverage.last_observed_on && dayDistance(today, coverage.last_observed_on) > policy.coverage_recent_days;
    const rank = !own.length ? 0 : coverage.situation_count === 1 ? 1 : stale ? 2 : focusMissing ? 3 : 4;
    const reason = ["Aún no tenemos registros de esta competencia.", "Solo tenemos registros de una situación.",
      "La última observación fue hace varias semanas.", "No hay un registro del foco que trabajaremos hoy.",
      "Ya hay registros recientes en distintas situaciones."][rank];
    return { student_id: student.id, student_name: student.name, competency_id: competencyId, reason,
      reason_code: ["no_records", "one_situation", "stale", "criterion_gap", "varied"][rank],
      coverage_state: coverage.coverage_state, last_observed_on: coverage.last_observed_on, rank };
  }).sort((a, b) => a.rank - b.rank || (a.last_observed_on ?? "").localeCompare(b.last_observed_on ?? "")
    || a.student_name.localeCompare(b.student_name, "es") || a.student_id.localeCompare(b.student_id))
    .slice(0, policy.observe_today_limit);
}
