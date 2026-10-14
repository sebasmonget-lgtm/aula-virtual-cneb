"use client";
import {useEffect,useState} from "react";
import {Button} from "@/components/ui/button";
import {apiFetch,apiJson} from "@/src/lib/ayni-api-fetch";
import {localDatabaseApiUrl} from "@/src/lib/local-database";
import {DocumentContent,type OpenDocument} from "./documents-screen";
import {LoadingState,WorkflowFeedback} from "./workflow-ui";

/** Consultation shares the saved document renderer and never exposes generation or editing. */
export function ActivityConsultation({id,onBack}:{id:string;onBack:()=>void}){
  const [document,setDocument]=useState<OpenDocument|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{const controller=new AbortController();void apiFetch(`${localDatabaseApiUrl}/api/documents/activity/${id}`,{signal:controller.signal}).then(async response=>{
    const value=await apiJson<{document?:OpenDocument;error?:string}>(response);if(!response.ok||!value.document)throw new Error(value.error??'No pudimos abrir la actividad guardada.');return value.document;
  }).then(value=>{if(!controller.signal.aborted){setDocument(value);setError('');}}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});return()=>controller.abort();},[id,retry]);
  return <section className="mx-auto max-w-4xl space-y-4"><Button variant="outline" onClick={onBack}>← Volver a Mi año</Button><p className="text-sm text-[#526b87]">Actividad completa · Consulta</p>{error?<WorkflowFeedback tone="error">{error}<Button variant="outline" onClick={()=>setRetry(value=>value+1)}>Reintentar</Button></WorkflowFeedback>:document?<DocumentContent document={document}/>:<LoadingState label="Abriendo la actividad guardada…"/>}</section>;
}
