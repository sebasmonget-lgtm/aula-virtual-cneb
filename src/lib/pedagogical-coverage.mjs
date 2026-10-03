import { assessmentState, coverageForRecords } from "./evidence-coverage.mjs";

/** Diagnostic records are factual context; criterion-linked evidence remains distinct. */
export async function loadDiagnosticCoverageRecords(db, classroomId, period) {
  const guided = (await db.query(`select o.id,o.student_id,o.competency_v4_id as competency_id,
      o.observed_at,o.observation_text,o.observation_status,o.experience_id as situation_id,
      coalesce(o.experience_title_snapshot,'Observación diagnóstica') as situation_title,
      o.aspect_prompt_snapshot as criterion_text
    from diagnostic_experience_observations o join students s on s.id=o.student_id
    where o.classroom_id=$1 and s.classroom_id=$1 and s.status='active'
      and o.observed_at::date between $2::date and $3::date`,
    [classroomId, period.starts_on, period.ends_on])).rows.map((row) => ({ ...row, source_type: "diagnostic_guided" }));
  const spontaneous = (await db.query(`select o.id,o.student_id,o.competency_v4_ids,o.observed_at,
      o.observation_text,o.context_label,o.support_status
    from effective_diagnostic_spontaneous_observations o join students s on s.id=o.student_id
    where o.classroom_id=$1 and s.classroom_id=$1 and s.status='active' and o.classification_status='classified'
      and o.observed_at::date between $2::date and $3::date`,
    [classroomId, period.starts_on, period.ends_on])).rows.flatMap((row) => (row.competency_v4_ids ?? []).map((id) => ({
      id: row.id, student_id: row.student_id, competency_id: id, observed_at: row.observed_at,
      observation_text: row.observation_text, observation_status: row.support_status,
      situation_id: `spontaneous:${row.context_label}`, situation_title: row.context_label,
      criterion_text: null, source_type: "diagnostic_spontaneous",
    })));
  return [...guided, ...spontaneous];
}

/** Read-only projection. Missing records never imply a low achievement level. */
export function projectPedagogicalCoverage({ students, cards, model, diagnosticRecords = [], activityCounts = new Map(), today }) {
  const planned = new Set(model.scope);
  const sourceByKey = new Map(model.rows.map((row) => [`${row.student_id}:${row.competency_v4_id}`, row]));
  const diagnosticByKey = new Map();
  for (const record of diagnosticRecords) {
    const key = `${record.student_id}:${record.competency_id}`;
    diagnosticByKey.set(key, [...(diagnosticByKey.get(key) ?? []), record]);
  }
  const rows = cards.flatMap((card) => students.map((student) => {
    const key = `${student.id}:${card.id}`;
    const source = sourceByKey.get(key);
    const evidence = source?.sourceRows ?? [];
    const diagnostic = diagnosticByKey.get(key) ?? [];
    const coverage = coverageForRecords([...evidence, ...diagnostic], today ? { today } : undefined);
    return { student_id: student.id, competency_id: card.id, planned: planned.has(card.id),
      ...coverage, assessment_state: assessmentState(source), evidence_count: evidence.length,
      diagnostic_count: diagnostic.length, last_observation: coverage.last_observed_on,
      activity_count: activityCounts.get(card.id) ?? 0 };
  }));
  return { rows, by_competency: cards.map((card) => {
    const selected = rows.filter((row) => row.competency_id === card.id);
    return { competency_id: card.id, competency_name: card.official_name, planned: planned.has(card.id),
      activity_count: activityCounts.get(card.id) ?? 0,
      students_with_evidence: selected.filter((row) => row.record_count > 0).length,
      students_without_record: selected.filter((row) => row.record_count === 0).length,
      evidence_count: selected.reduce((sum, row) => sum + row.evidence_count, 0) };
  }), by_student: students.map((student) => {
    const selected = rows.filter((row) => row.student_id === student.id);
    return { student_id: student.id, student_name: [student.preferred_name || student.first_name, student.last_name].filter(Boolean).join(" "),
      with_evidence: selected.filter((row) => row.record_count > 0).length,
      without_record: selected.filter((row) => row.record_count === 0).length,
      evaluated: selected.filter((row) => row.assessment_state === "confirmed").length,
      pending: selected.filter((row) => row.planned && row.assessment_state !== "confirmed").length };
  }) };
}
