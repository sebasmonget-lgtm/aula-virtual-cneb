/** Counts are recording coverage, never achievement levels. Missing counts stay unknown. */
export function prioritizeObservationStudents(students,records=[]){
 const counts=new Map(records.map(row=>[row.student_id,Number.isInteger(row.record_count)&&row.record_count>=0?row.record_count:null]));
 return students.map(student=>({...student,observation_count:counts.get(student.id)??null})).sort((a,b)=>(a.observation_count??Infinity)-(b.observation_count??Infinity)||(a.full_name??a.name).localeCompare(b.full_name??b.name,'es',{numeric:true}));
}
export const observationCountTone=count=>count===0?'none':count===1?'one':count>=2?'multiple':'unknown';
