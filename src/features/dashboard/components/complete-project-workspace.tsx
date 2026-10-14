"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {Button} from "@/components/ui/button";
import {apiFetch,apiJson} from "@/src/lib/ayni-api-fetch";
import {localDatabaseApiUrl} from "@/src/lib/local-database";
import {displayDate} from "@/src/lib/display-date";
import {readWorkspaceParams,writeWorkspaceLocation,useWorkspaceParam} from "@/src/lib/workspace-location";
import {AnnualProjectPreview} from "./annual-project-preview";
import {ProjectChangeChat} from "./project-change-chat";
import {PreparationProgress,type PreparationJob} from "./preparation-progress";
import {ActivityConsultation} from "./activity-consultation";
import {LoadingState,WorkflowFeedback} from "./workflow-ui";
import {useUnsavedWork} from "@/src/lib/use-unsaved-work";
import type {ChangeProposal} from "./annual-proposal-change-dialog";
type Plan={id:string;status:string;revision:number;proposal:{proposed_experiences:ChangeProposal[];curriculum_reference?:{id:string;name:string}[];resolved_calendar?:{projects:{proposal_id:string|null}[]}}};
type SavedActivity={id:string;title:string;date:string;state:string};
const activityParam=(value:string)=>/^[0-9a-f-]{36}$/i.test(value)?value:undefined;
async function api<T>(path:string,body?:unknown):Promise<T>{
  const response=await apiFetch(localDatabaseApiUrl+path,body===undefined?undefined:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const value=await apiJson<T&{error?:string;message?:string}>(response);
  if(!response.ok)throw new Error(value.message??value.error??"No pudimos recuperar el proyecto.");return value;
}
async function readPreparation(proposalId:string,id?:string){
  const [plans,jobs,saved]=await Promise.all([
    api<{draft:Plan|null;active:Plan|null}>('/api/annual-plans/current'),api<{jobs:PreparationJob[]}>('/api/preparation/current'),
    api<{project:{id:string}|null;activities:SavedActivity[]}>(`/api/preparation/proposals/${proposalId}/activities`),
  ]);
  const plan=[plans.draft,plans.active].find(plan=>plan?.id===id)??(plans.draft?.proposal.proposed_experiences.some(row=>row.proposal_id===proposalId)?plans.draft:plans.active);
  const job=jobs.jobs.find(item=>item.complete_project&&item.proposal_id===proposalId&&(item.annual_plan_id===plan?.id||item.project_id===saved.project?.id&&plan?.status==='active'))??null;
  return {plan:plan??null,hasConfirmed:!!plans.active,job,activities:saved.activities};
}
export function CompleteProjectWorkspace({proposalId,onGoAnnual,onGoToday,onConfirmed,embedded=false,planId,onRequireConfirmation,onPlanChanged}:{
  proposalId:string;onGoAnnual?:()=>void;onGoToday?:()=>void;onConfirmed?:()=>void;embedded?:boolean;planId?:string;onRequireConfirmation?:()=>void;onPlanChanged?:(id:string)=>Promise<void>;
}){
  const [plan,setPlan]=useState<Plan|null>(null),[job,setJob]=useState<PreparationJob|null>(null),[chat,setChat]=useState(false);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const [hasConfirmed,setHasConfirmed]=useState(false),ready=useRef(false);
  const [activities,setActivities]=useState<SavedActivity[]>([]);
  const [accepting,setAccepting]=useState(()=>!embedded||readWorkspaceParams("Planificar").get("prepareProject")===proposalId);
  const [consultId,setConsultId]=useWorkspaceParam("Planificar","activityConsult","",activityParam);
  useUnsavedWork(false,busy);
  const load=useCallback(async(id?:string)=>{const data=await readPreparation(proposalId,id??planId);setPlan(data.plan);setHasConfirmed(data.hasConfirmed);setJob(data.job);setActivities(data.activities);},[proposalId,planId]);
  useEffect(()=>{let live=true;void readPreparation(proposalId,planId).then(data=>{
    if(live){setPlan(data.plan);setHasConfirmed(data.hasConfirmed);setJob(data.job);setActivities(data.activities);}
  }).catch(cause=>{if(live)setError(cause.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[proposalId,planId]);
  const proposal=plan?.proposal.proposed_experiences.find(row=>row.proposal_id===proposalId);
  const names=new Map(plan?.proposal.curriculum_reference?.map(card=>[card.id,card.name])??[]);
  async function accept(){if(busy||!plan)return;setBusy(true);setError("");try{
    setJob(await api<PreparationJob>('/api/preparation/projects/complete',{annualPlanId:plan.id,expectedRevision:Number(plan.revision),proposalId,accepted:true}));
  }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos iniciar la preparación. Tu proyecto sigue guardado.");}finally{setBusy(false);}}
  if(loading)return <LoadingState label="Abriendo tu proyecto…"/>;
  if(consultId)return <ActivityConsultation key={consultId} id={consultId} onBack={()=>setConsultId('')}/>;
  return <section className="ayni-workflow space-y-5">
    {!embedded&&<header><h1 className="text-3xl font-extrabold text-[#172b52]">Preparar proyecto</h1><p className="mt-2 text-[#526b87]">Revisa la propuesta. Si ya está como quieres, Ayni preparará todas sus actividades.</p></header>}
    {error&&<WorkflowFeedback tone="error">{error}<Button className="mt-2" variant="outline" onClick={()=>{setError('');void load().catch(cause=>setError(cause.message));}}>Recuperar lo guardado</Button></WorkflowFeedback>}
    {proposal&&plan&&<><AnnualProjectPreview row={proposal} index={(plan.proposal.resolved_calendar?.projects.findIndex(slot=>slot.proposal_id===proposalId)??plan.proposal.proposed_experiences.indexOf(proposal))+1} names={names} disabled={busy}
      onPrepare={job?undefined:()=>{if(plan.status==='draft'&&!hasConfirmed){onRequireConfirmation?.();return;}if(accepting)void accept();else{setAccepting(true);writeWorkspaceLocation("Planificar",{prepareProject:proposalId});}}}
      prepareLabel={accepting?"Aceptar proyecto y preparar actividades":"Preparar proyecto"} canChange={!job||!!job.approved_at} onChange={()=>setChat(true)}/>
      {!job&&accepting&&<p className="text-sm text-[#47658b]">Se preparará una actividad completa para cada día lectivo. Los materiales de la propuesta son sugeridos; comprueba su disponibilidad.</p>}</>}
    {job&&!job.approved_at&&<PreparationProgress key={job.id} id={job.id} onGoToday={onGoToday} onProjectReady={()=>{
      if(!ready.current){ready.current=true;void load().then(()=>onConfirmed?.()).catch(cause=>setError(cause.message));}
    }}/>}
    {!!activities.length&&<section className="overflow-hidden rounded-2xl border bg-white" aria-label="Actividades del proyecto">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4"><h2 className="font-bold text-[#172b52]">{activities.length} actividades guardadas</h2>{onGoToday&&<Button onClick={onGoToday}>Ir a Hoy</Button>}</div>
      <ol className="divide-y">{activities.map(item=><li key={item.id}><button type="button" className="grid min-h-16 w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-[#edf7fa] focus-visible:outline-2 focus-visible:outline-[#087d96] sm:grid-cols-[9rem_1fr_auto]" onClick={()=>setConsultId(item.id)}>
        <span className="text-sm text-[#526b87]">{displayDate(item.date)}</span><strong className="row-start-2 break-words text-sm text-[#172b52] sm:row-start-auto">{item.title}</strong><span className="col-start-2 row-span-2 row-start-1 rounded-full bg-[#e9f7f7] px-3 py-1 text-xs text-[#07576c] sm:col-start-auto sm:row-span-1">{item.state}</span>
      </button></li>)}</ol>
    </section>}
    {!proposal&&!error&&<p>Este proyecto no está en la versión actual. Vuelve a Mi año para elegirlo.</p>}
    {chat&&proposal&&plan&&<ProjectChangeChat planId={plan.id} row={proposal} index={(plan.proposal.resolved_calendar?.projects.findIndex(slot=>slot.proposal_id===proposalId)??0)+1} names={names} hasConfirmedYear={hasConfirmed}
      futureProjectId={job?.approved_at?job.project_id??undefined:undefined} onPrepared={next=>{ready.current=false;setJob(next);}} onClose={()=>setChat(false)} onApplied={async id=>{await load(id);await onPlanChanged?.(id);}}/>}
    {!embedded&&<footer><Button variant="outline" disabled={busy} onClick={onGoAnnual}>← Volver a Mi año</Button></footer>}
  </section>;
}
