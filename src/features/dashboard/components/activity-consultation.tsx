"use client";
import {useEffect,useState} from "react";
import {Button} from "@/components/ui/button";
import {apiFetch,apiJson} from "@/src/lib/ayni-api-fetch";
import {localDatabaseApiUrl} from "@/src/lib/local-database";
import {loadLocalDashboard,updateLocalExecution} from "@/src/lib/local-database";
import {writeWorkspaceLocation} from "@/src/lib/workspace-location";
import {DocumentContent,type OpenDocument} from "./documents-screen";
import {LoadingState,WorkflowFeedback} from "./workflow-ui";

/** Consultation shares the saved document renderer and never exposes generation or editing. */
export function ActivityConsultation({id,onBack}:{id:string;onBack:()=>void}){
  const [document,setDocument]=useState<OpenDocument|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const [block,setBlock]=useState<{id:string;status:string}|null>(null),[starting,setStarting]=useState(false);
  useEffect(()=>{let live=true;void loadLocalDashboard().then(value=>{if(live)setBlock(value.today.blocks.find(block=>block.activity_id===id)??null);}).catch(()=>{});return()=>{live=false;};},[id]);
  async function start(){if(!block||starting)return;setStarting(true);try{if(block.status==='planned')await updateLocalExecution({scheduleEntryId:block.id,action:'start'});writeWorkspaceLocation('Hoy',{activity:id});}catch(cause){setError(cause instanceof Error?cause.message:'No pudimos iniciar la actividad.');}finally{setStarting(false);}}
  useEffect(()=>{const controller=new AbortController();void apiFetch(`${localDatabaseApiUrl}/api/documents/activity/${id}`,{signal:controller.signal}).then(async response=>{
    const value=await apiJson<{document?:OpenDocument;error?:string}>(response);if(!response.ok||!value.document)throw new Error(value.error??'No pudimos abrir la actividad guardada.');return value.document;
  }).then(value=>{if(!controller.signal.aborted){setDocument(value);setError('');}}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});return()=>controller.abort();},[id,retry]);
  return <section className="mx-auto max-w-4xl space-y-4"><div className="flex flex-wrap justify-between gap-3"><Button variant="outline" disabled={starting} onClick={onBack}>← Volver a Mi año</Button>{block&&['planned','active'].includes(block.status)&&<Button disabled={starting} onClick={()=>void start()}>{starting?'Abriendo…':block.status==='active'?'Continuar esta actividad':'Iniciar esta actividad ahora'}</Button>}</div><p className="text-sm text-[#526b87]">Actividad completa · Consulta</p>{error?<WorkflowFeedback tone="error">{error}<Button variant="outline" onClick={()=>setRetry(value=>value+1)}>Reintentar</Button></WorkflowFeedback>:document?<DocumentContent document={document}/>:<LoadingState label="Abriendo la actividad guardada…"/>}</section>;
}
