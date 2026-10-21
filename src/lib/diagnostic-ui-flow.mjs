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
export function experienceCoverageOpportunities(experience, students, guided, free, coverage) {
  return experience.competencies.map(competency => {
    const counts = new Map(students.map(student => [student.id, 0]));
    const records = [
      ...guided.filter(record => record.competency_v4_id === competency.id && isRecordedObservation(record)),
      ...free.filter(record => record.competency_v4_ids?.includes(competency.id) && !['withdrawn','cancelled','voided','draft'].includes(record.observation_status)),
    ];
    if (coverage) for (const student of students) counts.set(student.id, coverage[`${student.id}:${competency.id}`] ?? 0);
    else for (const record of records) if (counts.has(record.student_id)) counts.set(record.student_id, counts.get(record.student_id) + 1);
    return {id:competency.id,name:competency.name,missing:[...counts.values()].filter(count=>count===0).length,few:[...counts.values()].filter(count=>count===1).length};
  }).filter(item=>item.missing>0||item.few>0).sort((a,b)=>b.missing-a.missing||b.few-a.few);
}

/** Compare coverage rates so experiences with more competencies do not get a head start. */
export function rankGuidedExperiences(experiences, students, guided, free, coverage) {
  return experiences.map((experience,index)=>{
    const opportunities=experienceCoverageOpportunities(experience,students,guided,free,coverage);
    const denominator=Math.max(1,experience.competencies.length*students.length);
    const studentIds=new Set(students.map(student=>student.id));
    const total=experience.competencies.reduce((sum,competency)=>sum+(coverage
      ? students.reduce((count,student)=>count+(coverage[`${student.id}:${competency.id}`]??0),0)
      : guided.filter(record=>studentIds.has(record.student_id)&&record.competency_v4_id===competency.id&&isRecordedObservation(record)).length
        +free.filter(record=>studentIds.has(record.student_id)&&record.competency_v4_ids?.includes(competency.id)&&!['withdrawn','cancelled','voided','draft'].includes(record.observation_status)).length),0);
    return {experience,opportunities,index,recordRate:total/denominator,missingRate:opportunities.reduce((sum,item)=>sum+item.missing,0)/denominator,fewRate:opportunities.reduce((sum,item)=>sum+item.few,0)/denominator};
  }).sort((a,b)=>b.missingRate-a.missingRate||b.fewRate-a.fewRate||a.recordRate-b.recordRate||a.index-b.index);
}

/** Availability is chosen for this visit, never inferred from a child's records. */
export function availableGuidedExperiences(experiences, digitalCreationAvailable=false) {
  return experiences.filter(experience=>!experience.required_resource || digitalCreationAvailable && experience.required_resource==='digital_creation');
}

export function experiencePriorityLabel(item) {
  if (item.missingRate === 1) return 'Sin observaciones en estas competencias';
  if (item.missingRate > 0) return 'Con algunas observaciones';
  if (item.fewRate > 0) return 'Con pocos registros';
  return 'Con registros en todas sus competencias';
}

export function guidedStudentsByCoverage(students, competencyId, coverage, query='', order=[]) {
  const positions=new Map(order.map((id,index)=>[id,index]));
  return students.filter(student=>student.name.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')))
    .map(student=>({student,count:coverage[`${student.id}:${competencyId}`]??0}))
    .sort((a,b)=>order.length
      ? (positions.get(a.student.id)??Infinity)-(positions.get(b.student.id)??Infinity)||a.student.name.localeCompare(b.student.name,'es')
      : a.count-b.count||a.student.name.localeCompare(b.student.name,'es'));
}

export const guidedExperienceIllustrations = {
  getting_to_know_us: 'planning_play', movement_and_art: 'movement', count_and_locate: 'numbers',
  explore_our_world: 'inquiry', stories_and_marks: 'storytelling', spanish_second_language: 'sharing', beliefs_and_care: 'heart',
  plan_try_review: 'planning_play', create_a_digital_message: 'storytelling',
};

/** Authored observation cues stay separate from examples and historical criteria. */
export function guidedObservationLookFor(criterion) {
  return criterion?.look_for?.trim() || 'Observa qué hace o dice durante el juego. Registra sus palabras o acciones y el apoyo que necesitó.';
}
