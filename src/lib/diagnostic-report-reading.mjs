/** Shared reader for a confirmed snapshot. No new assessment or source lookup. */
export function diagnosticCompetencyReading(snapshot,competencyId){
  const reading=Array.isArray(snapshot?.competency_readings)?snapshot.competency_readings.find(item=>item.competency_id===competencyId):null;
  if(!reading||typeof reading.summary!=='string'||typeof reading.next_step!=='string'||!Array.isArray(reading.source_record_ids))return null;
  const notes=(snapshot.observations??[]).filter(item=>reading.source_record_ids.includes(item.id)&&item.competency_id===competencyId);
  if(reading.source_record_ids.some(id=>!notes.some(note=>note.id===id)))return null;
  const children=new Set(notes.map(note=>note.student_id));
  if(reading.scope==='individual'&&children.size!==1||reading.scope==='subgroup'&&children.size<2)return null;
  return {competency_id:competencyId,summary:reading.summary,next_step:reading.next_step,scope:reading.scope,source_record_ids:[...reading.source_record_ids]};
}
export function diagnosticReportReadings(document){
  const snapshot=document?.content?.report_snapshot;
  return (Array.isArray(snapshot?.competency_readings)?snapshot.competency_readings:[]).map(item=>diagnosticCompetencyReading(snapshot,item.competency_id)).filter(item=>item!==null);
}
/** An excerpt remains literal; the ellipsis explicitly marks omitted words. */
export function diagnosticRecordExcerpt(text,limit=300){
  const value=String(text??'').trim();if(value.length<=limit)return value;
  const prefix=value.slice(0,limit),end=Math.max(prefix.lastIndexOf('. '),prefix.lastIndexOf('! '),prefix.lastIndexOf('? '));
  if(end>=limit/3)return prefix.slice(0,end+1)+' […]';
  const word=prefix.lastIndexOf(' ');return prefix.slice(0,word>0?word:limit)+' […]';
}
export const diagnosticReportPurpose='Conocer lo que muestran los registros de este corte para decidir cómo acompañar al grupo.';
