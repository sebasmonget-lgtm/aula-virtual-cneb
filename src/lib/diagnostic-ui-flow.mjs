/** Presentation aliases preserve all historical interview IDs. */
export function interviewOptionIds(field, id) {
  return field === 'interest_tags' && id === 'plants' ? ['plants', 'nature'] : [id];
}
export function toggleInterviewOption(values, field, id) {
  const aliases = interviewOptionIds(field, id);
  return values.some(value => aliases.includes(value))
    ? values.filter(value => !aliases.includes(value)) : [...values, id];
}
export const observationMoment = value => value?.trim() || 'Sin momento indicado';
const instant = value => { const result = value ? Date.parse(value) : NaN; return Number.isFinite(result) ? result : -Infinity; };
/** Undated records follow dated ones; IDs provide a deterministic tie break. */
export function compareObservationDates(a, b) {
  const left = instant(a.observed_at ?? a.date), right = instant(b.observed_at ?? b.date);
  if (left !== right) return right > left ? 1 : -1;
  return String(b.id).localeCompare(String(a.id));
}
export function isRecordedObservation(record) {
  return !['draft','withdrawn','cancelled','voided','insufficient_information'].includes(record.observation_status)
    && Boolean(record.observation_text?.trim() || record.has_media);
}
export function experienceCoverageGaps(experience, students, guided, free) {
  return experience.competencies.filter(competency => {
    const children = new Set([
      ...guided.filter(record => record.competency_v4_id === competency.id && isRecordedObservation(record)),
      ...free.filter(record => record.competency_v4_ids?.includes(competency.id)),
    ].map(record => record.student_id));
    return students.some(student => !children.has(student.id));
  }).length;
}

/** Counts coverage opportunities, never attainment or difficulties. */
export function experienceCoverageOpportunities(experience, students, guided, free) {
  return experience.competencies.map(competency => {
    const children = new Set([
      ...guided.filter(record => record.competency_v4_id === competency.id && isRecordedObservation(record)),
      ...free.filter(record => record.competency_v4_ids?.includes(competency.id)),
    ].map(record => record.student_id));
    return {id:competency.id,name:competency.name,missing:students.filter(student=>!children.has(student.id)).length};
  }).filter(item=>item.missing>0).sort((a,b)=>b.missing-a.missing);
}
