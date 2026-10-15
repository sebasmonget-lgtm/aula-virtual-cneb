"use client";
import {useEffect,useState} from "react";
import {ArrowLeft,ArrowRight,Download,PencilLine} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {apiFetch,apiJson} from "@/src/lib/ayni-api-fetch";
import {localDatabaseApiUrl} from "@/src/lib/local-database";
import {loadLocalDashboard,updateLocalExecution} from "@/src/lib/local-database";
import type {LocalDashboard} from '@/src/lib/local-database';
import {writeWorkspaceLocation} from "@/src/lib/workspace-location";
import type {OpenDocument} from "./documents-screen";
import {ActivityReadingView} from './activity-reading-view';
import {OrdinaryObservationDialog} from './ordinary-observation-dialog';
import styles from './activity-reading.module.css';
import {LoadingState,WorkflowFeedback} from "./workflow-ui";

/** Consultation shares the saved document renderer and never exposes generation or editing. */
export function ActivityConsultation({id,onBack,activities=[],onActivity,inToday=false,onStarted}:{onStarted?:(dashboard:LocalDashboard)=>void;inToday?:boolean;id:string;onBack:()=>void;activities?:{id:string;title:string}[];onActivity?:(id:string)=>void}){
  const [document,setDocument]=useState<OpenDocument|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const [dashboard,setDashboard]=useState<LocalDashboard|null>(null),[starting,setStarting]=useState(false),[observing,setObserving]=useState(false);
  const [downloading,setDownloading]=useState(false),[downloadError,setDownloadError]=useState('');
  const [actionError,setActionError]=useState('');
  const siblings=activities.length?activities:document?.project_activities??[];
  const block=dashboard?.today.blocks.find(block=>block.activity_id===id)??null,position=siblings.findIndex(item=>item.id===id);
  useEffect(()=>{let live=true;void loadLocalDashboard().then(value=>{if(live)setDashboard(value);}).catch(()=>{});return()=>{live=false;};},[id]);
  async function start(){if(!block||starting)return;setStarting(true);try{if(block.status==='planned')await updateLocalExecution({scheduleEntryId:block.id,action:'start'});writeWorkspaceLocation('Hoy',{activity:id});}catch(cause){setActionError(cause instanceof Error?cause.message:'No pudimos iniciar la actividad.');}finally{setStarting(false);}}
  async function developToday(){if(starting)return;setStarting(true);setActionError('');try{
    const next=await updateLocalExecution({activityId:id,action:'start_today'});setDashboard(next);onStarted?.(next);
  }catch(cause){setActionError(cause instanceof Error?cause.message:'No pudimos iniciar la actividad en Hoy.');}finally{setStarting(false);}}
  useEffect(()=>{const controller=new AbortController();void apiFetch(`${localDatabaseApiUrl}/api/documents/activity/${id}`,{signal:controller.signal}).then(async response=>{
    const value=await apiJson<{document?:OpenDocument;error?:string}>(response);if(!response.ok||!value.document)throw new Error(value.error??'No pudimos abrir la actividad guardada.');return value.document;
  }).then(value=>{if(!controller.signal.aborted){setDocument(value);setError('');}}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});return()=>controller.abort();},[id,retry]);
  async function download(){if(downloading)return;setDownloading(true);setDownloadError('');try{
    const response=await apiFetch(`${localDatabaseApiUrl}/api/documents/activity/${id}/download`);
    if(!response.ok)throw new Error('No pudimos descargar el Word. Inténtalo otra vez.');
    const blob=await response.blob(),url=URL.createObjectURL(blob),link=window.document.createElement('a');
    link.href=url;link.download=response.headers.get('content-disposition')?.match(/filename="([^"\\/]+)"/)?.[1]??`actividad-${id}.docx`;
    window.document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(cause){setDownloadError(cause instanceof Error?cause.message:'No pudimos descargar el Word.');}finally{setDownloading(false);}}
  return <section className="mx-auto max-w-6xl space-y-4"><Button variant="outline" disabled={starting||downloading} onClick={onBack}><ArrowLeft size={18}/>{inToday?"Volver a Hoy":"Volver a Mi año"}</Button><p className="text-sm text-[#526b87]">{inToday&&!block?"Consulta · Conservamos su fecha programada. Si decides trabajarla hoy, pulsa «Desarrollar hoy».":"Actividad completa · Consulta"}</p>
    {error?<WorkflowFeedback tone="error">{error}<Button variant="outline" onClick={()=>setRetry(value=>value+1)}>Reintentar</Button></WorkflowFeedback>:document?<>
      <ActivityReadingView document={document} position={position>=0?position+1:undefined} total={siblings.length} actions={<>
        {block&&['planned','active'].includes(block.status)&&<Button disabled={starting} onClick={()=>void start()}>{starting?'Abriendo…':block.status==='active'?'Continuar esta actividad':'Iniciar esta actividad ahora'}<ArrowRight size={18}/></Button>}
        {!block&&!inToday&&!document.actual_execution_date&&document.status==='active'&&<Button onClick={()=>writeWorkspaceLocation('Hoy',{activity:id})}>Desarrollar en Hoy<ArrowRight size={18}/></Button>}
        {!block&&inToday&&!document.actual_execution_date&&document.status==='active'&&<Button disabled={starting} onClick={()=>void developToday()}>{starting?'Abriendo actividad…':'Desarrollar hoy'}<ArrowRight size={18}/></Button>}
        {!!block?.criteria.length&&<Button variant="outline" disabled={starting} onClick={()=>setObserving(true)}><PencilLine size={18}/>Registrar observación</Button>}
        <Button variant="outline" disabled={downloading} onClick={()=>void download()}><Download size={18}/>{downloading?'Descargando…':'Descargar Word'}</Button>
      </>}/>
      {actionError&&<WorkflowFeedback tone="error">{actionError}</WorkflowFeedback>}
      {downloadError&&<WorkflowFeedback tone="error">{downloadError}</WorkflowFeedback>}
      {!!onActivity&&position>=0&&siblings.length>1&&<nav className={styles.footer} aria-label="Actividades del proyecto"><Button variant="outline" disabled={position===0||downloading||starting} onClick={()=>onActivity(siblings[position-1].id)}><ArrowLeft size={18}/>Actividad anterior</Button><Button disabled={position===siblings.length-1||downloading||starting} onClick={()=>onActivity(siblings[position+1].id)}>Siguiente actividad<ArrowRight size={18}/></Button></nav>}
    </>:<LoadingState label="Abriendo la actividad guardada…"/>}
    {observing&&block&&dashboard&&<OrdinaryObservationDialog students={dashboard.students} activity={{id,title:block.title,criteria:block.criteria,initialCriterionId:block.criteria[0]?.id}} onClose={()=>setObserving(false)}/>}
  </section>;
}
