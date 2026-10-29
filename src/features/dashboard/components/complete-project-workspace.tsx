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
type Plan={id:string;status:string;revision:number;document_context?:{teacher_name?:string};proposal:{proposed_experiences:(ChangeProposal&{teacher_protected?:boolean})[];available_experiences?:ChangeProposal[];curriculum_reference?:{id:string;name:string}[];resolved_calendar?:{projects:{proposal_id:string|null;slot_id:string;starts_on:string;ends_on:string;index:number}[]}}};
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
    api<{today:string;project:{id:string}|null;prepared_current:boolean;can_replace:boolean;can_restore:boolean;blocked_dates:string[];activities:SavedActivity[]}>(`/api/preparation/proposals/${proposalId}/activities`),
  ]);
  const plan=[plans.draft,plans.active].find(plan=>plan?.id===id)??(plans.draft?.proposal.proposed_experiences.some(row=>row.proposal_id===proposalId)?plans.draft:plans.active);
  const samePrepared=plan?.status==='draft'&&JSON.stringify(plan.proposal.proposed_experiences.find(row=>row.proposal_id===proposalId))===JSON.stringify(plans.active?.proposal.proposed_experiences.find(row=>row.proposal_id===proposalId));
  const job=jobs.jobs.find(item=>item.complete_project&&item.proposal_id===proposalId&&(item.annual_plan_id===plan?.id||saved.prepared_current&&item.project_id===saved.project?.id&&(plan?.status==='active'||samePrepared)))??null;
  return {today:saved.today,plan:plan??null,hasConfirmed:!!plans.active,job,projectId:saved.project?.id??null,canReplace:saved.can_replace,canRestore:saved.can_restore,blockedDates:saved.blocked_dates??[],activities:saved.activities};
}
export function CompleteProjectWorkspace({documentsOnly=false,proposalId,onGoAnnual,onGoToday,onConfirmed,embedded=false,planId,onRequireConfirmation,onPlanChanged}:{
  documentsOnly?:boolean;proposalId:string;onGoAnnual?:()=>void;onGoToday?:()=>void;onConfirmed?:()=>void;embedded?:boolean;planId?:string;onRequireConfirmation?:()=>void;onPlanChanged?:(id:string)=>Promise<void>;
}){
  const [plan,setPlan]=useState<Plan|null>(null),[job,setJob]=useState<PreparationJob|null>(null),[chat,setChat]=useState(false);
  const [reviewBeforePrepare,setReviewBeforePrepare]=useState(false);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const [hasConfirmed,setHasConfirmed]=useState(false),ready=useRef(false);
  const [today,setToday]=useState("");
  const [reuseOpen,setReuseOpen]=useState(false),[reuseSlot,setReuseSlot]=useState("");
  const [restore,setRestore]=useState<ChangeProposal|null>(null);
  const [savedProjectId,setSavedProjectId]=useState<string|null>(null);
  const [canReplace,setCanReplace]=useState(false),[canRestore,setCanRestore]=useState(false);
  const [activities,setActivities]=useState<SavedActivity[]>([]);
  const [calendarOpen,setCalendarOpen]=useState(false),[calendar,setCalendar]=useState<ProjectCalendarDay[]>([]),[selectedDates,setSelectedDates]=useState<string[]>([]);
  const calendarPanel=useRef<HTMLElement>(null),[calendarBaseline,setCalendarBaseline]=useState<string[]>([]);
  const [detail,setDetail]=useWorkspaceParam("Planificar","projectDetail","",value=>value==='open'?value:undefined);
  const [consultId,setConsultId]=useWorkspaceParam("Planificar","activityConsult","",activityParam);
  useUnsavedWork(calendarOpen&&JSON.stringify(selectedDates)!==JSON.stringify(calendarBaseline),busy);
  useEffect(()=>{if(calendarOpen){calendarPanel.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});calendarPanel.current?.focus({preventScroll:true});}},[calendarOpen]);
  const load=useCallback(async(id?:string)=>{const data=await readPreparation(proposalId,id??planId);setToday(data.today);setPlan(data.plan);setHasConfirmed(data.hasConfirmed);setJob(data.job);setActivities(data.activities);setCanReplace(data.canReplace);setCanRestore(data.canRestore);setSavedProjectId(data.projectId);},[proposalId,planId]);
  useEffect(()=>{let live=true;void readPreparation(proposalId,planId).then(data=>{
    if(live){setToday(data.today);setPlan(data.plan);setHasConfirmed(data.hasConfirmed);setJob(data.job);setActivities(data.activities);setCanReplace(data.canReplace);setCanRestore(data.canRestore);setSavedProjectId(data.projectId);}
  }).catch(cause=>{if(live)setError(cause.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[proposalId,planId]);
  const proposal=plan?.proposal.proposed_experiences.find(row=>row.proposal_id===proposalId);
  const projectMaterials=proposal?.materials??[];
  const past=!!today&&!!proposal?.planned_end_date&&proposal.planned_end_date<today;
  const futureSlots=plan?.proposal.resolved_calendar?.projects.filter(slot=>slot.starts_on>=today&&!plan.proposal.proposed_experiences.find(row=>row.proposal_id===slot.proposal_id)?.teacher_protected)??[];
  async function reuseProposal(){if(!plan||!proposal||busy||!reuseSlot)return;setBusy(true);setError('');try{
    const outgoing=plan.proposal.resolved_calendar?.projects.find(slot=>slot.slot_id===reuseSlot)?.proposal_id;
    const target=plan.status==='draft'?plan:await api<Plan>(`/api/annual-journey/${plan.id}/copy`,{expectedRevision:plan.revision,proposalId:outgoing});
    const next=await api<Plan>(`/api/annual-journey/${target.id}/structure`,{expectedRevision:target.revision,action:{kind:'reuse',proposalId,targetSlotId:reuseSlot}});
    const incoming=next.proposal.resolved_calendar?.projects.find(slot=>slot.slot_id===reuseSlot)?.proposal_id;
    if(incoming){const period=next.proposal.proposed_experiences.find(row=>row.proposal_id===incoming)?.period?.replace('Bimestre ','');writeWorkspaceLocation('Planificar',{annualProposal:incoming,annualPeriod:period??'current'});}await onPlanChanged?.(next.id);setReuseOpen(false);
  }catch(cause){setError(cause instanceof Error?cause.message:'No pudimos usar esta propuesta.');}finally{setBusy(false);}}
  const names=new Map(plan?.proposal.curriculum_reference?.map(card=>[card.id,card.name])??[]);
  async function prepare(){if(busy||!plan||!proposal)return;if(new Set(proposal.primary_competency_ids).size<2){setChat(true);setError('Completa las dos competencias de esta propuesta con Ayni antes de preparar. Conservamos el proyecto guardado.');return;}if(plan.status==='draft'&&!hasConfirmed){onRequireConfirmation?.();return;}setBusy(true);setError('');try{
    const [data,availability]=await Promise.all([api<{days:ProjectCalendarDay[];today:string}>(`/api/school-calendar?from=${proposal.planned_start_date}&to=${proposal.planned_end_date}`),api<{blocked_dates:string[]}>(`/api/preparation/proposals/${proposalId}/activities`)]);
    const days=data.days.map(day=>({...day,is_instructional:day.is_instructional&&day.date>=data.today&&!availability.blocked_dates.includes(day.date),reason:availability.blocked_dates.includes(day.date)?'Actividad con trabajo registrado: se conserva':day.reason}));const dates=days.filter(day=>day.is_instructional).map(day=>day.date);setCalendar(days);setSelectedDates(dates);setCalendarBaseline(dates);setCalendarOpen(true);
  }catch(cause){setError(cause instanceof Error?cause.message:'No pudimos abrir el calendario.');}finally{setBusy(false);}}
  async function accept(){if(busy||!plan)return;setBusy(true);setError("");try{
    setJob(await api<PreparationJob>('/api/preparation/projects/complete',{annualPlanId:plan.id,expectedRevision:Number(plan.revision),proposalId,accepted:true,selectedDates}));setCalendarOpen(false);
  }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos iniciar la preparación. Tu proyecto sigue guardado.");}finally{setBusy(false);}}
  async function restoreProposal(item:ChangeProposal){if(!plan||busy)return;setBusy(true);setError('');try{
    const target=plan.status==='draft'?plan:await api<Plan>(`/api/annual-journey/${plan.id}/copy`,{expectedRevision:plan.revision,proposalId});
    const slot=target.proposal.resolved_calendar?.projects.find(item=>item.proposal_id===proposalId) as {slot_id?:string}|undefined;
    if(!slot?.slot_id)throw Error('El tramo cambió. Actualiza Mi año.');
    await api(`/api/annual-journey/${target.id}/structure`,{expectedRevision:target.revision,restoreLibrary:true,action:{kind:'place',proposalId:item.proposal_id,targetSlotId:slot.slot_id}});
    writeWorkspaceLocation('Planificar',{annualProposal:item.proposal_id});await onPlanChanged?.(target.id);setRestore(null);
  }catch(cause){setError(cause instanceof Error?cause.message:'No pudimos usar esta propuesta.');}finally{setBusy(false);}}
  if(loading)return <LoadingState label="Abriendo tu proyecto…"/>;
  if(consultId)return <ActivityConsultation documentsOnly={documentsOnly} key={consultId} id={consultId} activities={activities} onActivity={setConsultId} onBack={()=>setConsultId('')}/>;
  if(detail&&proposal&&plan)return <ProjectDetailView projectId={savedProjectId} row={proposal} index={plan.proposal.resolved_calendar?.projects.find(slot=>slot.proposal_id===proposalId)?.index??plan.proposal.proposed_experiences.indexOf(proposal)+1} names={names} onBack={()=>setDetail('')} onChange={past?undefined:()=>setChat(true)} changeDialog={chat?<ProjectChangeChat planId={plan.id} row={proposal} index={(plan.proposal.resolved_calendar?.projects.find(slot=>slot.proposal_id===proposalId)?.index??plan.proposal.proposed_experiences.indexOf(proposal)+1)} names={names} hasConfirmedYear={hasConfirmed} teacherName={plan.document_context?.teacher_name} futureProjectId={savedProjectId&&!canReplace?savedProjectId:undefined} onPrepared={setJob} onClose={()=>{setChat(false);setReviewBeforePrepare(false);}} onApplied={async id=>{await load(id);await onPlanChanged?.(id);}}/>:null}/>;
  return <section className="min-w-0 space-y-5">
    {!embedded&&<header><h1 className="text-3xl font-extrabold text-[#172b52]">Preparar proyecto</h1><p className="mt-2 text-[#526b87]">Revisa la propuesta. Si ya está como quieres, Ayni preparará todas sus actividades.</p></header>}
    {error&&<WorkflowFeedback tone="error">{error}<Button className="mt-2" variant="outline" onClick={()=>{setError('');void load().catch(cause=>setError(cause.message));}}>Recuperar lo guardado</Button></WorkflowFeedback>}
    <div className={`grid min-w-0 items-start gap-5 ${plan?.proposal.available_experiences?.length&&!calendarOpen?'xl:grid-cols-[minmax(0,1fr)_18rem]':''}`}>
    {proposal&&plan&&<><AnnualProjectPreview row={proposal} index={(plan.proposal.resolved_calendar?.projects.findIndex(slot=>slot.proposal_id===proposalId)??plan.proposal.proposed_experiences.indexOf(proposal))+1} names={names} disabled={busy}
      onDetails={()=>setDetail('open')} onPrepare={past||job||calendarOpen?undefined:()=>{setReviewBeforePrepare(true);setChat(true);}} canChange={!past&&!calendarOpen&&(!job||!!job.approved_at)} onChange={()=>setChat(true)}/></>}
    {!!plan?.proposal.available_experiences?.length&&!calendarOpen&&<aside className="rounded-2xl border bg-white p-4" aria-label="Biblioteca de proyectos"><h2 className="font-bold text-[#172b52]">Otras propuestas</h2><p className="mt-1 text-sm text-[#526b87]">Elige otra para los días disponibles. Tu trabajo queda guardado.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">{plan.proposal.available_experiences.map(item=><article key={item.proposal_id} className="min-w-0 border-t pt-4"><div className="flex items-center gap-3"><ProjectPictogram project={item} className="size-16 shrink-0"/><h3 className="break-words font-bold text-[#172b52]">{item.title}</h3></div><AnnualCompetencies ids={item.primary_competency_ids} names={names}/><Button variant="outline" disabled={busy||!canRestore} className="mt-3 w-full" onClick={()=>setRestore(item)}>Usar esta propuesta</Button></article>)}</div>{restore&&<div className="mt-3 rounded-xl bg-[#edf7fa] p-3"><p>¿Usar «{restore.title}» en lugar de «{proposal?.title}»? Conservaremos las actividades ya realizadas y sus observaciones. Después confirmarás los días disponibles para preparar la propuesta recuperada.</p><div className="mt-3 flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={()=>setRestore(null)}>Cancelar</Button><Button disabled={busy} onClick={()=>void restoreProposal(restore)}>Usar esta propuesta</Button></div></div>}</aside>}
    </div>
    {!job&&calendarOpen&&<section ref={calendarPanel} tabIndex={-1} className="scroll-mt-6 rounded-2xl border border-[#bce3ec] bg-white p-4 outline-none sm:p-5" aria-label="Días del proyecto"><h2 className="text-xl font-bold text-[#172b52]">Confirma los días de tu proyecto</h2><p className="mt-2 text-sm text-[#526b87]">Marca solo los días en que trabajarán. Ayni preparará una actividad por cada día elegido.</p>{projectMaterials.length>0&&<div className="my-4 rounded-xl border border-[#bce3ec] bg-[#edf7fa] p-4"><h3 className="font-bold">Materiales del proyecto</h3><ul className="my-2 list-disc pl-5 text-sm">{projectMaterials.map(resource=><li key={resource}>{resource}</li>)}</ul><p className="text-sm">Al preparar el proyecto, confirmas que contarás con estos materiales. Si necesitas cambiarlos, vuelve al proyecto y cuéntaselo a Ayni.</p></div>}<ProjectCalendarReview days={calendar} selectedDates={selectedDates} onChange={setSelectedDates} disabled={busy}/><div className="mt-4 flex flex-wrap justify-between gap-3"><Button variant="outline" disabled={busy} onClick={()=>setCalendarOpen(false)}>Volver al proyecto</Button><Button className="h-auto min-h-11 whitespace-normal" disabled={busy||!selectedDates.length} onClick={()=>void accept()}>{busy?'Iniciando preparación…':`Confirmar días y preparar ${selectedDates.length} ${selectedDates.length===1?'actividad':'actividades'}`}</Button></div></section>}
    {job&&!job.approved_at&&<PreparationProgress key={job.id} id={job.id} onGoToday={onGoToday} onProjectReady={()=>{
      if(!ready.current){ready.current=true;void load().then(()=>onConfirmed?.()).catch(cause=>setError(cause.message));}
    }}/>}
    {past&&<section className="rounded-2xl border border-[var(--ayni-panel-border)] bg-[#edf7fa] p-4"><p className="text-sm text-[#365773]">Proyecto pasado · Solo consulta.</p>{!!futureSlots.length&&<Button variant="outline" className="mt-3" onClick={()=>setReuseOpen(!reuseOpen)}>Usar en un tramo futuro</Button>}
      {reuseOpen&&<div className="mt-3 space-y-3"><label className="block text-sm font-semibold">¿En qué tramo?<select className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3" value={reuseSlot} onChange={event=>setReuseSlot(event.target.value)}><option value="">Elige un tramo futuro</option>{futureSlots.map(slot=><option key={slot.slot_id} value={slot.slot_id}>Tramo {slot.index} · {displayDate(slot.starts_on)} – {displayDate(slot.ends_on)}</option>)}</select></label><p className="text-sm">Crearemos una copia. La propuesta de ese tramo quedará en Biblioteca.</p><Button disabled={busy||!reuseSlot} onClick={()=>void reuseProposal()}>Usar en este tramo</Button></div>}
    </section>}

    {!!activities.length&&<section className="overflow-hidden rounded-2xl border bg-white" aria-label="Actividades del proyecto">
      <h2 className="p-4 font-bold text-[#172b52]">{activities.length} {activities.length===1?'actividad guardada':'actividades guardadas'}</h2>
      <ol className="divide-y">{activities.map(item=><li key={item.id} className="grid min-h-24 items-center gap-3 px-4 py-4 sm:grid-cols-[9rem_1fr_auto]">
        <span className="text-sm text-[#526b87]">{displayDate(item.date)}</span><div className="min-w-0"><strong className="break-words text-sm text-[#172b52]">{item.title}</strong><AnnualCompetencies ids={item.competency_ids??[]} names={names}/></div><div className="flex flex-wrap items-center gap-2 sm:justify-end"><span className="rounded-full bg-[#e9f7f7] px-3 py-1 text-xs text-[#07576c]">{item.state}</span>{!documentsOnly&&<Button variant="outline" className="text-sm" onClick={()=>writeWorkspaceLocation('Hoy',{activity:item.id})}>Ver en Hoy</Button>}<Button variant="outline" className="text-sm" onClick={()=>setConsultId(item.id)}>Ver detalles</Button></div>
      </li>)}</ol>
    </section>}
    {!proposal&&!error&&<p>Este proyecto no está en la versión actual. Vuelve a Mi año para elegirlo.</p>}
    {chat&&proposal&&plan&&<ProjectChangeChat onContinue={reviewBeforePrepare?()=>{setChat(false);setReviewBeforePrepare(false);void prepare();}:undefined} planId={plan.id} row={proposal} index={(plan.proposal.resolved_calendar?.projects.findIndex(slot=>slot.proposal_id===proposalId)??0)+1} names={names} hasConfirmedYear={hasConfirmed}
      teacherName={plan.document_context?.teacher_name} futureProjectId={savedProjectId&&!canReplace?savedProjectId:undefined} onPrepared={next=>{ready.current=false;setJob(next);}} onClose={()=>{setChat(false);setReviewBeforePrepare(false);}} onApplied={async id=>{await load(id);await onPlanChanged?.(id);}}/>}
    {!embedded&&<footer><Button variant="outline" disabled={busy} onClick={onGoAnnual}>← Volver a Mi año</Button></footer>}
  </section>;
}
