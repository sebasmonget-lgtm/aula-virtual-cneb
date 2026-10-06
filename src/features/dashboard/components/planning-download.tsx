"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { WorkflowFeedback } from "./workflow-ui";
type Job={id:string;kind:string;status:string;completed:number;total:number;parts:string[][];error?:string};
async function request<T=Job>(path:string,body?:unknown):Promise<T>{const response=await apiFetch(`${localDatabaseApiUrl}${path}`,body?{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}:{cache:"no-store"});const result=await response.json() as T & {error?:string};if(!response.ok)throw Error(result.error??"No pudimos preparar la descarga.");return result;}
export function PlanningDownload(){
  const [job,setJob]=useState<Job|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{let live=true;void request<{jobs:Job[]}>("/api/preparation/current").then(value=>{if(live)setJob(value.jobs.find((j:Job)=>j.kind==="document_export")??null);}).catch(()=>{});return()=>{live=false;};},[]);
  const jobId=job?.id,status=job?.status;
  useEffect(()=>{if(!jobId||!["running","queued"].includes(status??""))return;let live=true;let timer:ReturnType<typeof setTimeout>;const poll=async()=>{try{const next=await request(`/api/preparation/${jobId}`);if(live){setJob(next);if(["queued","running"].includes(next.status))timer=setTimeout(poll,2000);}}catch(cause){if(live)setError((cause as Error).message);}};timer=setTimeout(poll,1000);return()=>{live=false;clearTimeout(timer);};},[jobId,status]);
  async function prepare(){setBusy(true);setError("");try{setJob(await request("/api/documents/export",{}));}catch(cause){setError((cause as Error).message);}finally{setBusy(false);}}
  async function download(ids:string[],part:number){setBusy(true);setError("");try{const response=await apiFetch(`${localDatabaseApiUrl}/api/documents/artifacts/zip`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({artifactIds:ids})});if(!response.ok)throw Error((await response.json() as {error?:string}).error??"No pudimos descargar esta parte.");const url=URL.createObjectURL(await response.blob());const link=document.createElement("a");link.href=url;link.download=`ayni-planificacion-parte-${part}.zip`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(cause){setError((cause as Error).message);}finally{setBusy(false);}}
  return <section className="space-y-3 border-t border-[#d6e5ef] pt-5"><h2 className="text-lg font-bold">Tu planificación completa</h2><p className="text-sm text-[#526b87]">Documentos confirmados e históricos, organizados en cuatro carpetas. Puedes salir y volver durante la preparación.</p>
    <Button disabled={busy||!!job&&["queued","running"].includes(job.status)} onClick={()=>void prepare()}>{job&&["queued","running"].includes(job.status)?`Preparando ${job.completed} de ${job.total} documentos…`:"Preparar descarga completa"}</Button>
    {job?.status==="failed"&&<><WorkflowFeedback tone="error">{job.completed} de {job.total} documentos guardados. {job.error}</WorkflowFeedback><Button variant="outline" disabled={busy} onClick={()=>{setError("");void request(`/api/preparation/${job.id}/retry`,{}).then(setJob).catch(cause=>setError(cause.message));}}>Reintentar los documentos pendientes</Button></>}
    {job?.status==="succeeded"&&<div className="flex flex-wrap gap-3">{job.parts.map((ids,index)=><Button key={index} variant="outline" disabled={busy} onClick={()=>void download(ids,index+1)}>Descargar {job.parts.length>1?`parte ${index+1} de ${job.parts.length}`:"planificación"} · {ids.length} documentos</Button>)}</div>}
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
  </section>;
}
