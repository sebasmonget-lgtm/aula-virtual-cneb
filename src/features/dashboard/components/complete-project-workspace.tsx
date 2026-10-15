"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {Button} from "@/components/ui/button";
import {apiFetch,apiJson} from "@/src/lib/ayni-api-fetch";
import {localDatabaseApiUrl} from "@/src/lib/local-database";
import {displayDate} from "@/src/lib/display-date";
import {useWorkspaceParam,writeWorkspaceLocation} from "@/src/lib/workspace-location";
import {ProjectCalendarReview,type ProjectCalendarDay} from "./project-calendar-review";
import {AnnualProjectPreview,AnnualCompetencies} from "./annual-project-preview";
import {ProjectChangeChat} from "./project-change-chat";
import {PreparationProgress,type PreparationJob} from "./preparation-progress";
import {ProjectPictogram} from "./project-pictogram";
import {ProjectDetailView} from "./project-detail-view";
import {ActivityConsultation} from "./activity-consultation";
import {LoadingState,WorkflowFeedback} from "./workflow-ui";
import {useUnsavedWork} from "@/src/lib/use-unsaved-work";
import type {ChangeProposal} from "./annual-proposal-change-dialog";
type Plan={id:string;status:string;revision:number;document_context?:{teacher_name?:string};proposal:{proposed_experiences:ChangeProposal[];available_experiences?:ChangeProposal[];curriculum_reference?:{id:string;name:string}[];resolved_calendar?:{projects:{proposal_id:string|null}[]}}};
type SavedActivity={id:string;title:string;date:string;state:string;competency_ids:string[]};
const activityParam=(value:string)=>/^[0-9a-f-]{36}$/i.test(value)?value:undefined;
async function api<T>(path:string,body?:unknown):Promise<T>{
  const response=await apiFetch(localDatabaseApiUrl+path,body===undefined?undefined:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const value=await apiJson<T&{error?:string;message?:string}>(response);
  if(!response.ok)throw new Error(value.message??value.error??"No pudimos recuperar el proyecto.");return value;
}
async function readPreparation(proposalId:string,id?:string){
  const [plans,jobs,saved]=await Promise.all([
    api<{draft:Plan|null;active:Plan|null}>('/api/annual-plans/current'),api<{jobs:PreparationJob[]}>('/api/preparation/current'),
    api<{project:{id:string}|null;can_replace:boolean;activities:SavedActivity[]}>(`/api/preparation/proposals/${proposalId}/activities`),
  ]);
  const plan=[plans.draft,plans.active].find(plan=>plan?.id===id)??(plans.draft?.proposal.proposed_experiences.some(row=>row.proposal_id===proposalId)?plans.draft:plans.active);
  const samePrepared=plan?.status==='draft'&&JSON.stringify(plan.proposal.proposed_experiences.find(row=>row.proposal_id===proposalId))===JSON.stringify(plans.active?.proposal.proposed_experiences.find(row=>row.proposal_id===proposalId));
  const job=jobs.jobs.find(item=>item.complete_project&&item.proposal_id===proposalId&&(item.annual_plan_id===plan?.id||item.project_id===saved.project?.id&&(plan?.status==='active'||samePrepared)))??null;
  return {plan:plan??null,hasConfirmed:!!plans.active,job,projectId:saved.project?.id??null,canReplace:saved.can_replace,activities:saved.activities};
}
export function CompleteProjectWorkspace({proposalId,onGoAnnual,onGoToday,onConfirmed,embedded=false,planId,onRequireConfirmation,onPlanChanged}:{
  proposalId:string;onGoAnnual?:()=>void;onGoToday?:()=>void;onConfirmed?:()=>void;embedded?:boolean;planId?:string;onRequireConfirmation?:()=>void;onPlanChanged?:(id:string)=>Promise<void>;
}){
  const [plan,setPlan]=useState<Plan|null>(null),[job,setJob]=useState<PreparationJob|null>(null),[chat,setChat]=useState(false);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const [hasConfirmed,setHasConfirmed]=useState(false),ready=useRef(false);
  const [restore,setRestore]=useState<ChangeProposal|null>(null);
  const [savedProjectId,setSavedProjectId]=useState<string|null>(null);
  const [canReplace,setCanReplace]=useState(false);
  const [activities,setActivities]=useState<SavedActivity[]>([]);
  const [calendarOpen,setCalendarOpen]=useState(false),[calendar,setCalendar]=useState<ProjectCalendarDay[]>([]),[selectedDates,setSelectedDates]=useState<string[]>([]);
  const calendarPanel=useRef<HTMLElement>(null),[calendarBaseline,setCalendarBaseline]=useState<string[]>([]);
  const [detail,setDetail]=useWorkspaceParam("Planificar","projectDetail","",value=>value==='open'?value:undefined);
  const [consultId,setConsultId]=useWorkspaceParam("Planificar","activityConsult","",activityParam);
  useUnsavedWork(calendarOpen&&JSON.stringify(selectedDates)!==JSON.stringify(calendarBaseline),busy);
  useEffect(()=>{if(calendarOpen){calendarPanel.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});calendarPanel.current?.focus({preventScroll:true});}},[calendarOpen]);
  const load=useCallback(async(id?:string)=>{const data=await readPreparation(proposalId,id??planId);setPlan(data.plan);setHasConfirmed(data.hasConfirmed);setJob(data.job);setActivities(data.activities);setCanReplace(data.canReplace);setSavedProjectId(data.projectId);},[proposalId,planId]);
  useEffect(()=>{let live=true;void readPreparation(proposalId,planId).then(data=>{
    if(live){setPlan(data.plan);setHasConfirmed(data.hasConfirmed);setJob(data.job);setActivities(data.activities);setCanReplace(data.canReplace);setSavedProjectId(data.projectId);}
  }).catch(cause=>{if(live)setError(cause.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[proposalId,planId]);
  const proposal=plan?.proposal.proposed_experiences.find(row=>row.proposal_id===proposalId);
  const names=new Map(plan?.proposal.curriculum_reference?.map(card=>[card.id,card.name])??[]);
  async function prepare(){if(busy||!plan||!proposal)return;if(new Set(proposal.primary_competency_ids).size<2){setChat(true);setError('Completa las dos competencias de esta propuesta con Ayni antes de preparar. Conservamos el proyecto guardado.');return;}if(plan.status==='draft'&&!hasConfirmed){onRequireConfirmation?.();return;}setBusy(true);setError('');try{
    const data=await api<{days:ProjectCalendarDay[];today:string}>(`/api/school-calendar?from=${proposal.planned_start_date}&to=${proposal.planned_end_date}`);
    const days=data.days.map(day=>({...day,is_instructional:day.is_instructional&&day.date>=data.today}));const dates=days.filter(day=>day.is_instructional).map(day=>day.date);setCalendar(days);setSelectedDates(dates);setCalendarBaseline(dates);setCalendarOpen(true);
  }catch(cause){setError(cause instanceof Error?cause.message:'No pudimos abrir el calendario.');}finally{setBusy(false);}}
  async function accept(){if(busy||!plan)return;setBusy(true);setError("");try{
    setJob(await api<PreparationJob>('/api/preparation/projects/complete',{annualPlanId:plan.id,expectedRevision:Number(plan.revision),proposalId,accepted:true,selectedDates}));setCalendarOpen(false);
  }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos iniciar la preparación. Tu proyecto sigue guardado.");}finally{setBusy(false);}}
  async function restoreProposal(item:ChangeProposal){if(!plan||busy)return;setBusy(true);setError('');try{
    const target=plan.status==='draft'?plan:await api<Plan>(`/api/annual-journey/${plan.id}/copy`,{expectedRevision:plan.revision,proposalId});
    const slot=target.proposal.resolved_calendar?.projects.find(item=>item.proposal_id===proposalId) as {slot_id?:string}|undefined;
    if(!slot?.slot_id)throw Error('El tramo cambió. Actualiza Mi año.');
    await api(`/api/annual-journey/${target.id}/structure`,{expectedRevision:target.revision,action:{kind:'place',proposalId:item.proposal_id,targetSlotId:slot.slot_id}});
    writeWorkspaceLocation('Planificar',{annualProposal:item.proposal_id});await onPlanChanged?.(target.id);setRestore(null);
  }catch(cause){setError(cause instanceof Error?cause.message:'No pudimos usar esta propuesta.');}finally{setBusy(false);}}
  if(loading)return <LoadingState label="Abriendo tu proyecto…"/>;
  if(consultId)return <ActivityConsultation key={consultId} id={consultId} activities={activities} onActivity={setConsultId} onBack={()=>setConsultId('')}/>;
  if(detail&&proposal&&plan)return <ProjectDetailView projectId={savedProjectId} row={proposal} names={names} onBack={()=>setDetail('')} onChange={()=>setChat(true)} changeDialog={chat?<ProjectChangeChat planId={plan.id} row={proposal} index={1} names={names} hasConfirmedYear={hasConfirmed} teacherName={plan.document_context?.teacher_name} futureProjectId={savedProjectId&&!canReplace?savedProjectId:undefined} onPrepared={setJob} onClose={()=>setChat(false)} onApplied={async id=>{await load(id);await onPlanChanged?.(id);}}/>:null}/>;
  return <section className="min-w-0 space-y-5">
    {!embedded&&<header><h1 className="text-3xl font-extrabold text-[#172b52]">Preparar proyecto</h1><p className="mt-2 text-[#526b87]">Revisa la propuesta. Si ya está como quieres, Ayni preparará todas sus actividades.</p></header>}
    {error&&<WorkflowFeedback tone="error">{error}<Button className="mt-2" variant="outline" onClick={()=>{setError('');void load().catch(cause=>setError(cause.message));}}>Recuperar lo guardado</Button></WorkflowFeedback>}
    <div className={`grid min-w-0 items-start gap-5 ${plan?.proposal.available_experiences?.length&&!calendarOpen?'xl:grid-cols-[minmax(0,1fr)_18rem]':''}`}>
    {proposal&&plan&&<><AnnualProjectPreview row={proposal} index={(plan.proposal.resolved_calendar?.projects.findIndex(slot=>slot.proposal_id===proposalId)??plan.proposal.proposed_experiences.indexOf(proposal))+1} names={names} disabled={busy}
      onDetails={()=>setDetail('open')} onPrepare={job||calendarOpen?undefined:()=>void prepare()} canChange={!calendarOpen&&(!job||!!job.approved_at)} onChange={()=>setChat(true)}/></>}
    {!!plan?.proposal.available_experiences?.length&&!calendarOpen&&<aside className="rounded-2xl border bg-white p-4" aria-label="Biblioteca de proyectos"><h2 className="font-bold text-[#172b52]">Otras propuestas guardadas</h2><p className="mt-1 text-sm text-[#526b87]">Puedes recuperar una propuesta para este tramo. Conservaremos la actual.</p>{savedProjectId&&!canReplace&&<p className="mt-2 text-sm">Este proyecto ya tiene días pasados o trabajo registrado. Conservamos su historia; puedes ajustar sus próximos días con Ayni.</p>}<div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">{plan.proposal.available_experiences.map(item=><article key={item.proposal_id} className="min-w-0 border-t pt-4"><div className="flex items-center gap-3"><ProjectPictogram project={item} className="size-16 shrink-0"/><h3 className="break-words font-bold text-[#172b52]">{item.title}</h3></div><AnnualCompetencies ids={item.primary_competency_ids} names={names}/><Button variant="outline" disabled={busy||!!savedProjectId&&!canReplace} className="mt-3 w-full" onClick={()=>setRestore(item)}>Usar esta propuesta</Button></article>)}</div>{restore&&<div className="mt-3 rounded-xl bg-[#edf7fa] p-3"><p>¿Usar «{restore.title}» en lugar de «{proposal?.title}»? Las fechas se conservan. Después confirmarás los días para preparar sus actividades.</p><div className="mt-3 flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={()=>setRestore(null)}>Cancelar</Button><Button disabled={busy} onClick={()=>void restoreProposal(restore)}>Usar esta propuesta</Button></div></div>}</aside>}
    </div>
    {!job&&calendarOpen&&<section ref={calendarPanel} tabIndex={-1} className="scroll-mt-6 rounded-2xl border border-[#bce3ec] bg-white p-4 outline-none sm:p-5" aria-label="Días del proyecto"><h2 className="text-xl font-bold text-[#172b52]">Confirma los días de tu proyecto</h2><p className="mt-2 text-sm text-[#526b87]">Marca solo los días en que trabajarán. Ayni preparará una actividad por cada día elegido.</p><ProjectCalendarReview days={calendar} selectedDates={selectedDates} onChange={setSelectedDates} disabled={busy}/><div className="mt-4 flex flex-wrap justify-between gap-3"><Button variant="outline" disabled={busy} onClick={()=>setCalendarOpen(false)}>Volver al proyecto</Button><Button className="h-auto min-h-11 whitespace-normal" disabled={busy||!selectedDates.length} onClick={()=>void accept()}>{busy?'Iniciando preparación…':`Confirmar días y preparar ${selectedDates.length} actividades`}</Button></div></section>}
    {job&&!job.approved_at&&<PreparationProgress key={job.id} id={job.id} onGoToday={onGoToday} onProjectReady={()=>{
      if(!ready.current){ready.current=true;void load().then(()=>onConfirmed?.()).catch(cause=>setError(cause.message));}
    }}/>}
    {proposal&&new Set(proposal.primary_competency_ids).size<2&&<WorkflowFeedback tone="info">Esta propuesta anterior tiene una competencia. {canReplace||!savedProjectId?'Complétala con Ayni antes de una nueva preparación.':'Conservamos sus criterios y registros históricos; los nuevos proyectos deben incluir al menos dos competencias.'}<Button variant="outline" className="mt-2" onClick={()=>setChat(true)}>Revisar con Ayni</Button></WorkflowFeedback>}
    {!!activities.length&&<section className="overflow-hidden rounded-2xl border bg-white" aria-label="Actividades del proyecto">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4"><h2 className="font-bold text-[#172b52]">{activities.length} actividades guardadas</h2>{onGoToday&&<Button onClick={onGoToday}>Ir a Hoy</Button>}</div>
      <ol className="divide-y">{activities.map(item=><li key={item.id}><button type="button" className="grid min-h-16 w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-[#edf7fa] focus-visible:outline-2 focus-visible:outline-[#087d96] sm:grid-cols-[9rem_1fr_auto]" onClick={()=>setConsultId(item.id)}>
        <span className="text-sm text-[#526b87]">{displayDate(item.date)}</span><span className="row-start-2 min-w-0 sm:row-start-auto"><strong className="break-words text-sm text-[#172b52]">{item.title}</strong><AnnualCompetencies ids={item.competency_ids??[]} names={names}/></span><span className="col-start-2 row-span-2 row-start-1 rounded-full bg-[#e9f7f7] px-3 py-1 text-xs text-[#07576c] sm:col-start-auto sm:row-span-1">{item.state}</span>
      </button></li>)}</ol>
    </section>}
    {!proposal&&!error&&<p>Este proyecto no está en la versión actual. Vuelve a Mi año para elegirlo.</p>}
    {chat&&proposal&&plan&&<ProjectChangeChat planId={plan.id} row={proposal} index={(plan.proposal.resolved_calendar?.projects.findIndex(slot=>slot.proposal_id===proposalId)??0)+1} names={names} hasConfirmedYear={hasConfirmed}
      teacherName={plan.document_context?.teacher_name} futureProjectId={savedProjectId&&!canReplace?savedProjectId:undefined} onPrepared={next=>{ready.current=false;setJob(next);}} onClose={()=>setChat(false)} onApplied={async id=>{await load(id);await onPlanChanged?.(id);}}/>}
    {!embedded&&<footer><Button variant="outline" disabled={busy} onClick={onGoAnnual}>← Volver a Mi año</Button></footer>}
  </section>;
}
