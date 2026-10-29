'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {multiAgeAppRequest as api,multiAgeDownloadUrl} from '@/src/lib/multi-age-app-client';
import type {MultiAgeAppState} from '@/src/lib/multi-age-app-types';
import {AnnualProjectPreview} from './annual-project-preview';
import {ProjectDetailView} from './project-detail-view';
import {generatorProjectDetail} from './generator-project-detail';
import {ProjectCalendarReview,type ProjectCalendarDay} from './project-calendar-review';
import {PreparationProgress,type PreparationJob} from './preparation-progress';
import {LoadingState,WorkflowFeedback} from './workflow-ui';
import {ProjectZipDownload} from './project-zip-download';
import {GeneratorActivityGuide} from './generator-activity-guide';
import {MultiAgeConversation} from './multi-age-conversation';
import {displayDate} from '@/src/lib/display-date';

type Workspace=NonNullable<MultiAgeAppState['workspace']>;
type Planning=NonNullable<MultiAgeAppState['planning']>;
/** Data/operations adapter; the proposal, calendar and complete-project progress are current Ayni UI. */
export function GeneratorProjectWorkspace({w,planning,slotId,onRefresh,onDocuments,aiMode}:{w:Workspace;planning:Planning;slotId:string;onRefresh:()=>Promise<void>;onDocuments:()=>void;aiMode:'off'|'fixture'|'openai'}){
 const plan=planning.plans.find(p=>p.status==='active'),index=plan?.proposal.proposals.findIndex(p=>p.slot_id===slotId)??-1,row=plan?.proposal.proposals[index],slot=planning.calendar.projects.find(p=>p.slot_id===slotId);
 const project=(w.projects??[]).find(p=>p.annual_plan_id===plan?.id&&p.annual_slot_id===slotId);
 const [calendarOpen,setCalendarOpen]=useState(false),[dates,setDates]=useState<string[]>([]),[job,setJob]=useState<PreparationJob|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[details,setDetails]=useState(false);
 const guard=useRef(false),calendarRef=useRef<HTMLElement>(null);
 const [activityId,setActivityId]=useState<string|null>(null);
 const [chatReady,setChatReady]=useState(false),[chatBusy,setChatBusy]=useState(false),[projectConversationRevision,setProjectConversationRevision]=useState(0);
 const availableDatesKey=JSON.stringify(slot?.instructional_dates.filter(date=>!project?.activities.some(a=>a.occurs_on===date))??[]);
 const path=`/document-project?classroomId=${w.classroom.id}&annualPlanId=${plan?.id}&annualSlotId=${slotId}`;
 const read=useCallback(()=>api<PreparationJob|null>(path),[path]);
 useEffect(()=>{let live=true;read().then(value=>{if(live){setJob(value);setDates(JSON.parse(availableDatesKey) as string[]);}}).catch(cause=>{if(live)setError(cause.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[read,availableDatesKey]);
 useEffect(()=>{if(calendarOpen)calendarRef.current?.scrollIntoView({block:'start',behavior:'instant'});},[calendarOpen]);
 const names=new Map<string,string>(planning.coverage.flatMap(g=>g.competencies.map(c=>[c.id,c.name] as [string,string])));
 if(!plan||!row||!slot)return <WorkflowFeedback>Abre un proyecto de Mi año para prepararlo.</WorkflowFeedback>;
 if(activityId&&project)return <GeneratorActivityGuide key={activityId} id={activityId} activities={project.activities} onBack={()=>setActivityId(null)} onActivity={setActivityId}/>;
 if(details)return <ProjectDetailView projectId={null} row={generatorProjectDetail(row,slot,`Bimestre ${w.periods.findIndex(p=>slot.starts_on>=p.starts_on&&slot.starts_on<=p.ends_on)+1}`)} index={index+1} names={names} onBack={()=>setDetails(false)}/>;
 const existing=new Set(project?.activities.map(a=>a.occurs_on)??[]);
 const calendar:ProjectCalendarDay[]=[];
 for(let date=new Date(slot.starts_on+'T12:00:00Z');date<=new Date(slot.ends_on+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+1)){
  const day=date.toISOString().slice(0,10),available=slot.instructional_dates.includes(day)&&!existing.has(day);
  calendar.push({date:day,is_instructional:available,calendar_type:available?'instructional_day':'excluded',reason:existing.has(day)?'Actividad guardada: se conserva':available?'Día lectivo del proyecto':'Día sin clase en el calendario de Mi año'});
 }
 function prepare(){setDates(calendar.filter(d=>d.is_instructional).map(d=>d.date));setCalendarOpen(true);}
 async function accept(){if(guard.current)return;guard.current=true;setBusy(true);setError('');try{
  const value=await api<PreparationJob>('/document-project/start',{classroomId:w.classroom.id,annualPlanId:plan!.id,annualSlotId:slotId,expectedPlanRevision:plan!.revision,selectedDates:dates,teacherConfirmed:true,...(!project?{projectConversationRevision}:{})});setJob(value);setCalendarOpen(false);
 }catch(cause){setError(cause instanceof Error?cause.message:'No pudimos iniciar la preparación. Lo guardado se conserva.');}finally{guard.current=false;setBusy(false);}}
 return <section className="min-w-0 space-y-5">
  <header><h1 className="text-3xl font-extrabold text-[#172b52]">{project?'Tu proyecto':row.title}</h1><p className="mt-2 text-[#526b87]">{project?'Tus actividades y documentos se guardan aquí.':'Conversemos sobre este proyecto antes de preparar sus actividades.'}</p></header>
  {loading&&<LoadingState label="Abriendo tu proyecto…"/>}
  {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
  {!loading&&!job&&!project&&!calendarOpen&&<><MultiAgeConversation documentsOnly onReadyChange={setChatReady} footer={chatReady?<Button disabled={busy||chatBusy||!projectConversationRevision||aiMode==='off'} onClick={prepare}>Generar proyecto</Button>:undefined} classroomId={w.classroom.id} annualPlanId={plan.id} annualSlotId={slotId} mode={aiMode} onDecision={onRefresh} onBusyChange={setChatBusy} onRevisionChange={setProjectConversationRevision}/><p className="text-sm text-[#526b87]">Primero planificaremos el proyecto con los niños en el aula. Las demás actividades serán una propuesta que podrás adaptar a sus ideas.</p></>}
  {(project||job||calendarOpen)&&<AnnualProjectPreview row={{proposal_id:row.slot_id,title:project?.title??row.title,purpose:project?.purpose??row.purpose,period:`Bimestre ${w.periods.findIndex(p=>slot.starts_on>=p.starts_on&&slot.starts_on<=p.ends_on)+1}`,duration_weeks:slot.instructional_dates.length>10?3:2,primary_competency_ids:[...new Set(row.opportunities.map(o=>o.competency_id))],planned_start_date:slot.starts_on,planned_end_date:slot.ends_on,planned_instructional_days:slot.instructional_dates.length,children_actions:generatorProjectDetail(row,slot,'').children_actions}} index={index+1} names={names} disabled={busy||loading} canChange={false} onChange={()=>{}} onDetails={()=>setDetails(v=>!v)} onPrepare={job||calendarOpen||!calendar.some(d=>d.is_instructional)?undefined:prepare}/>}
  {!job&&calendarOpen&&<section ref={calendarRef} tabIndex={-1} className="scroll-mt-6 rounded-2xl border border-[#bce3ec] bg-white p-4 outline-none sm:p-5" aria-label="Días del proyecto"><h2 className="text-xl font-bold text-[#172b52]">Elige los días de tu proyecto</h2><p className="mt-2 text-sm text-[#526b87]">Prepararemos una actividad para cada día elegido, con las competencias de cada edad.</p><ProjectCalendarReview days={calendar} selectedDates={dates} onChange={setDates} disabled={busy}/><div className="mt-4 flex flex-wrap justify-between gap-3"><Button variant="outline" disabled={busy} onClick={()=>setCalendarOpen(false)}>Volver al proyecto</Button><Button className="h-auto min-h-11 whitespace-normal" disabled={busy||!dates.length} onClick={()=>void accept()}>{busy?'Iniciando preparación…':`Preparar ${dates.length} ${dates.length===1?'actividad':'actividades'}`}</Button></div></section>}
  {job&&<PreparationProgress id={job.id} adapter={{read:async()=>{const value=await read();if(!value)throw new Error('No se pudo recuperar la preparación.');return value;},retry:acceptPotentialRepeat=>api('/document-project/retry',{classroomId:w.classroom.id,preparationId:job.id,acceptPotentialRepeat})}} onProjectReady={()=>void onRefresh()}/>}
  {project&&<section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Actividades del proyecto</h2><div className="flex flex-wrap items-start gap-3"><Button asChild><a href={multiAgeDownloadUrl(`/documents/project/${project.id}.docx`)}>Descargar proyecto Word</a></Button><ProjectZipDownload url={multiAgeDownloadUrl(`/documents/project/${project.id}/bundle.zip`)}/></div></div><ol className="divide-y rounded-2xl border bg-white">{project.activities.map(a=><li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">{a.position}. {a.title}</p><p className="text-sm text-[#526b87]">{displayDate(a.occurs_on)}</p></div><Button variant="outline" onClick={()=>setActivityId(a.id)}>Ver guía de la actividad</Button></li>)}</ol><Button variant="outline" onClick={onDocuments}>Ver en Documentos</Button></section>}
 </section>;
}
