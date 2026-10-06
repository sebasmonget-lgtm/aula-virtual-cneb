"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, apiJson } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { displayDate } from "@/src/lib/display-date";
import { WorkflowFeedback } from "./workflow-ui";

export type PreparationJob={id:string;kind:"project"|"activity_block";status:string;project_id:string|null;proposal_id?:string|null;annual_plan_id?:string|null;stage:string;completed:number;total:number;approved_at:string|null;error:string|null};
type ReviewActivity={id:string;revision:number;occurs_on:string;details:Record<string,unknown>;preparation?:{materials?:string[]};workshop?:{details:Record<string,unknown>}};
async function request<T>(path:string,body?:unknown):Promise<T>{
  const response=await apiFetch(`${localDatabaseApiUrl}${path}`,body===undefined?undefined:{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const result=await apiJson<T & {error?:string}>(response);if(!response.ok)throw new Error(result.error||"No pudimos recuperar el avance.");return result;
}
const fields=[["purpose","Propósito"],["meaningful_situation","Situación significativa"],["teacher_preparation","Preparación docente"],["child_actions","Acciones de los niños"],["mediation","Mediación"],["evaluation_criterion","Criterio"],["expected_evidence","Evidencia esperada"],["evidence_opportunities","Oportunidades para observar"],["closure_or_continuity","Cierre o continuidad"]] as const;
export function PreparationProgress({id,onProjectReady,names={}}:{id:string;onProjectReady?:(projectId:string)=>void;names?:Record<string,string>}){
  const [job,setJob]=useState<PreparationJob|null>(null),[activities,setActivities]=useState<ReviewActivity[]>([]),[reviewed,setReviewed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const delivered=useRef(false),readyCallback=useRef(onProjectReady);
  const [pollRevision,setPollRevision]=useState(0);
  useEffect(()=>{readyCallback.current=onProjectReady;},[onProjectReady]);
  useEffect(()=>{let live=true;let timer:ReturnType<typeof setTimeout>;
    const read=async()=>{try{
      const current=await request<PreparationJob>(`/api/preparation/${id}`);if(!live)return;setJob(current);setError("");
      if(current.kind==="project"&&current.status==="succeeded"&&current.project_id&&!delivered.current){delivered.current=true;readyCallback.current?.(current.project_id);}
      if(current.kind==="activity_block"&&current.status==="succeeded"){
        const review=await request<{activities:ReviewActivity[]}>(`/api/preparation/${id}/review`);if(live)setActivities(review.activities);
      }
      if(live&&["queued","running"].includes(current.status))timer=setTimeout(()=>void read(),2500);
    }catch(cause){if(live){setError(cause instanceof Error?cause.message:"No pudimos recuperar el avance.");timer=setTimeout(()=>void read(),5000);}}};
    void read();return()=>{live=false;clearTimeout(timer);};
  },[id,pollRevision]);
  async function retry(){if(busy||!job)return;
    if(job.status==="uncertain"&&!window.confirm("La última llamada pudo completarse sin dejar una respuesta guardada. ¿Quieres reintentar lo pendiente aunque pueda repetir esa llamada?"))return;
    setBusy(true);setError("");try{setJob(await request<PreparationJob>(`/api/preparation/${id}/retry`,{acceptPotentialRepeat:job.status==="uncertain"}));
      setPollRevision(value=>value+1);
    }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos reintentar.");}finally{setBusy(false);}}
  async function approve(){setBusy(true);setError("");try{setJob(await request<PreparationJob>(`/api/preparation/${id}/approve`,{reviewed,activities:activities.map(item=>({id:item.id,expectedRevision:item.revision}))}));}
    catch(cause){setReviewed(false);setError(cause instanceof Error?cause.message:"No pudimos confirmar el bloque.");}finally{setBusy(false);}}
  return <section className="space-y-4 rounded-xl border bg-white p-5" aria-label="Preparación del proyecto">
    <h2 className="text-xl font-bold">{job?.approved_at?"Tus actividades están confirmadas":job?.status==="succeeded"?"Preparación lista para revisar":"Estamos preparando tu proyecto"}</h2>
    <p role="status" aria-live="polite">{job?.kind==="activity_block"?`${job.completed} de ${job.total} actividades listas`:({structure:"Preparando la estructura",criteria:"Preparando los criterios",calendar:"Organizando los días",master:"Preparando el Plan Maestro",ready:"Plan Maestro listo"}[job?.stage??"structure"])}</p>
    {job&&["queued","running"].includes(job.status)&&<p className="text-sm text-[#526b87]">Puedes salir y volver. El trabajo continúa en Ayni y el avance queda guardado.</p>}
    {(job?.error||error)&&<WorkflowFeedback tone="error">{error||job?.error}</WorkflowFeedback>}
    {job&&["failed","uncertain"].includes(job.status)&&<Button disabled={busy} onClick={()=>void retry()}>Reintentar lo pendiente</Button>}
    {activities.length>0&&<div className="space-y-3">{activities.map((item,index)=><details key={item.id} className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">{index+1}. {String(item.details.title)} · {displayDate(item.occurs_on)}</summary>
      <div className="mt-4 space-y-3"><p className="text-sm font-semibold">{names[String(item.details.competency_id)]??"Competencia prevista en el proyecto"}</p>
        {fields.map(([field,label])=>item.details[field]?<p className="whitespace-pre-wrap text-sm" key={field}><b>{label}:</b> {String(item.details[field])}</p>:null)}
        {!!item.preparation?.materials?.length&&<p className="text-sm"><b>Materiales:</b> {item.preparation.materials.join(" · ")}</p>}
        {Array.isArray(item.details.additional_criteria)&&item.details.additional_criteria.map((criterion:{competency_id:string;criterion_text:string;expected_evidence:string},i:number)=><p className="text-sm" key={i}><b>{names[criterion.competency_id]??"Competencia adicional"}:</b> {criterion.criterion_text} · {criterion.expected_evidence}</p>)}
        {item.workshop&&<div className="space-y-2"><h3 className="font-semibold">Taller del día</h3>{["title","purpose","criterion_or_observation_focus","opening","development","closure","evidence_expected","materials"].map(field=><p className="whitespace-pre-wrap text-sm" key={field}>{Array.isArray(item.workshop?.details[field])?(item.workshop.details[field] as string[]).join(" · "):String(item.workshop?.details[field]??"")}</p>)}</div>}
      </div></details>)}</div>}
    {job?.kind==="activity_block"&&job.status==="succeeded"&&!job.approved_at&&activities.length===job.total&&<div className="space-y-3"><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)} disabled={busy}/>Revisé las actividades y confirmo el bloque completo.</label><Button disabled={busy||!reviewed} onClick={()=>void approve()}>Confirmar todas las actividades</Button></div>}
  </section>;
}
