/** Inputs must come from classroom-scoped, persisted diagnostic endpoints. */
export function initialDiagnosticProgress({ students, interviews, spontaneous, guided, legacy }) {
  const active = new Set(students.map(student => student.id));
  const interviewed = new Set(interviews.filter(row => active.has(row.student_id) && row.has_confirmed_answers).map(row => row.student_id));
  const observed = new Set([
    ...spontaneous.filter(row => active.has(row.student_id) && !['draft', 'withdrawn', 'cancelled', 'voided'].includes(row.status) && (row.observation_text?.trim() || row.has_media)),
    ...guided.filter(row => active.has(row.student_id) && !['draft', 'withdrawn', 'cancelled', 'voided', 'insufficient_information'].includes(row.observation_status) && (row.observation_text?.trim() || ['demonstrated', 'with_support', 'not_yet_demonstrated'].includes(row.observation_status))),
    ...legacy.filter(row => active.has(row.student_id) && !['draft', 'withdrawn', 'cancelled', 'voided', 'insufficient_information'].includes(row.status) && (row.note?.trim() || ['demonstrated', 'with_support', 'not_yet_demonstrated'].includes(row.status))),
  ].map(row => row.student_id));
  return { total: active.size, interviewed: interviewed.size, observed: observed.size, complete: active.size > 0 && interviewed.size === active.size && observed.size === active.size };
}
