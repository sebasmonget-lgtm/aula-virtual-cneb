export function initialObservedPairs(guided, spontaneous) {
  return new Set([
    ...guided.filter(r=>!['draft','withdrawn','cancelled','voided','insufficient_information'].includes(r.observation_status) && (r.observation_text?.trim() || r.has_media || ['demonstrated','with_support','not_yet_demonstrated'].includes(r.observation_status))).map(r=>`${r.student_id}:${r.competency_v4_id}`),
    ...spontaneous.filter(r=>r.classification_source==='teacher' && !['draft','withdrawn','cancelled','voided'].includes(r.status) && (r.observation_text?.trim()||r.has_media)).flatMap(r=>r.competency_v4_ids.map(id=>`${r.student_id}:${id}`)),
  ]);
}
export function rankGuidedStudents(students,competencyId,pairs,query='') {
  const normalized=query.trim().toLocaleLowerCase('es');
  return students.filter(s=>s.name.toLocaleLowerCase('es').includes(normalized)).map((s,index)=>({...s,hasRecords:pairs.has(`${s.id}:${competencyId}`),index})).sort((a,b)=>Number(a.hasRecords)-Number(b.hasRecords)||a.index-b.index);
}
export function mergeGuidedObservation(workspace,record) {
  const observations=[record,...workspace.experience_observations.filter(r=>r.id!==record.id)];
  return {...workspace,experience_observations:observations,experience_coverage:workspace.experience_coverage.map(c=>{
    if(c.experience_id!==record.experience_id)return c;
    const own=observations.filter(r=>r.experience_id===c.experience_id),meaningful=own.filter(r=>['demonstrated','with_support','observed_without_judgment'].includes(r.observation_status));
    return {...c,students_with_records:new Set(own.map(r=>r.student_id)).size,students_with_information:new Set(meaningful.map(r=>r.student_id)).size,competency_coverage:c.competency_coverage.map(competency=>({...competency,students_with_information:new Set(meaningful.filter(r=>r.competency_v4_id===competency.competency_id).map(r=>r.student_id)).size}))};
  })};
}
