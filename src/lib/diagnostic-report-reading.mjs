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

/** Project factual dates without changing the confirmed snapshot or its sources. */
export function diagnosticObservedDay(value){
  const raw=String(value??'');if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
  const instant=new Date(raw);if(!raw||Number.isNaN(instant.getTime()))return '';
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(instant);
}
const dayLabel=value=>value?`${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`:'';
export function diagnosticReportPeriod(document,context={}){
  const snapshot=document?.content?.report_snapshot??{};
  const days=(snapshot.observations??[]).map(row=>diagnosticObservedDay(row.observed_at)).filter(Boolean).sort();
  const plannedStart=diagnosticObservedDay(snapshot.initial_collection_period?.starts_on??context.diagnostic_period_start);
  const plannedEnd=diagnosticObservedDay(snapshot.initial_collection_period?.ends_on??context.diagnostic_period_end);
  const from=days[0]??'',to=days.at(-1)??'';
  const bounded=plannedStart&&plannedEnd&&plannedStart<=plannedEnd;
  const kind=!days.length?'undated':!bounded?'cut':from>=plannedStart&&to<=plannedEnd?'initial':from>plannedEnd?'update':to<plannedStart?'prior':'mixed';
  const title=kind==='update'?'Actualización diagnóstica':kind==='mixed'?'Evaluación diagnóstica · Registros de distintos momentos':kind==='prior'?'Evaluación diagnóstica · Registros previos al recojo inicial':'Evaluación diagnóstica';
  const note=kind==='update'?'Este informe actualiza lo que conocemos del aula con registros posteriores al recojo inicial; no describe cómo empezó el grupo en marzo.':kind==='mixed'?'Este corte reúne registros de distintos momentos. No deben interpretarse todos como observaciones del inicio del año.':kind==='prior'?'Estos registros son anteriores al recojo inicial previsto; no acreditan que ese recojo se haya realizado.':!days.length?'Aún faltan observaciones fechadas del aula.':'Las conclusiones se refieren a las situaciones registradas y pueden actualizarse con nuevas observaciones.';
  // A year-independent phrase also works for initial stages outside March.
  const scopeNote=kind==='update'?note.replace('en marzo','al comenzar el año'):note;
  return {kind,title,from,to,plannedStart,plannedEnd,periodLabel:kind==='initial'?'Período de recojo inicial previsto':'Período de los registros revisados',
    startsOn:kind==='initial'?plannedStart:from,endsOn:kind==='initial'?plannedEnd:to,
    recordsLabel:from?`Registros revisados: del ${dayLabel(from)} al ${dayLabel(to)}.`:'Aún no hay registros fechados.',
    initialPeriodLabel:bounded?`Recojo inicial previsto: del ${dayLabel(plannedStart)} al ${dayLabel(plannedEnd)}.`:'',scopeNote};
}

/** Split only explicit forward-looking sentences already confirmed by the teacher.
 * No keyword-to-competency inference or new child-specific recommendation is made. */
export function diagnosticStudentFollowup(child){
  const text=typeof child?.teacher_comment==='string'?child.teacher_comment.trim():'';
  const sentences=[...new Intl.Segmenter('es',{granularity:'sentence'}).segment(text)].map(row=>row.segment.trim()).filter(Boolean);
  const future=/^(?:Conviene\b|Se (?:le |les )?(?:ofrecer[aá]n?|propondr[aá]n?|mantendr[aá]n?|invitar[aá]n?)(?=\s|[.,;:]|$)|(?:Ofreceremos|Propondremos|Mantendremos|Invitaremos)\b)/iu;
  const next=sentences.filter(sentence=>future.test(sentence));
  return {comment:next.length?sentences.filter(sentence=>!future.test(sentence)).join(' '):text,nextStep:next.join(' ')};
}
export function diagnosticReportFollowups(document){
  const children=document?.content?.report_snapshot?.children;
  return (Array.isArray(children)?children:[]).map(child=>({studentId:child.student_id,name:child.name,...diagnosticStudentFollowup(child)}));
}
