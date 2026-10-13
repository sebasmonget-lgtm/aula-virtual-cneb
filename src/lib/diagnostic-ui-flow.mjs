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
export function compareObservationDates(a, b, order='newest') {
  const left = instant(a.observed_at ?? a.date), right = instant(b.observed_at ?? b.date);
  if (left !== right) {
    if(left===-Infinity)return 1;
    if(right===-Infinity)return -1;
    return (right > left ? 1 : -1)*(order==='oldest'?-1:1);
  }
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
    const counts = new Map(students.map(student => [student.id, 0]));
    const records = [
      ...guided.filter(record => record.competency_v4_id === competency.id && isRecordedObservation(record)),
      ...free.filter(record => record.competency_v4_ids?.includes(competency.id) && !['withdrawn','cancelled','voided','draft'].includes(record.observation_status)),
    ];
    for (const record of records) if (counts.has(record.student_id)) counts.set(record.student_id, counts.get(record.student_id) + 1);
    return {id:competency.id,name:competency.name,missing:[...counts.values()].filter(count=>count===0).length,few:[...counts.values()].filter(count=>count===1).length};
  }).filter(item=>item.missing>0||item.few>0).sort((a,b)=>b.missing-a.missing||b.few-a.few);
}

/** Compare coverage rates so experiences with more competencies do not get a head start. */
export function rankGuidedExperiences(experiences, students, guided, free) {
  return experiences.map((experience,index)=>{
    const opportunities=experienceCoverageOpportunities(experience,students,guided,free);
    const denominator=Math.max(1,experience.competencies.length*students.length);
    return {experience,opportunities,index,missingRate:opportunities.reduce((sum,item)=>sum+item.missing,0)/denominator,fewRate:opportunities.reduce((sum,item)=>sum+item.few,0)/denominator};
  }).sort((a,b)=>b.missingRate-a.missingRate||b.fewRate-a.fewRate||a.index-b.index);
}

export const guidedExperienceIllustrations = {
  getting_to_know_us: 'planning_play', movement_and_art: 'movement', count_and_locate: 'numbers',
  explore_our_world: 'inquiry', stories_and_marks: 'storytelling', spanish_second_language: 'sharing', beliefs_and_care: 'heart',
};

/** Teacher-facing examples supplement the versioned criterion; no official text is changed. */
export function guidedObservationLookFor(criterion) {
  const examples=(criterion?.examples??[]).map(text=>text.replace(/[.]$/,'').replace(/^./,letter=>letter.toLocaleLowerCase('es')));
  return examples.length ? `Fíjate si el niño o la niña ${examples.join('; si ')}.` : `Observa qué hace o dice durante el juego y registra un ejemplo concreto.`;
}
