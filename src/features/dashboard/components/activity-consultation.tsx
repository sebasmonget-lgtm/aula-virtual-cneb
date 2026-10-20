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
import {ActivityRunView} from './activity-run-view';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import styles from './activity-reading.module.css';
import {LoadingState,WorkflowFeedback} from "./workflow-ui";

/** Consultation shares the saved document renderer and never exposes generation or editing. */
export function ActivityConsultation({id,onBack,activities=[],onActivity,inToday=false,onStarted}:{onStarted?:(dashboard:LocalDashboard)=>void;inToday?:boolean;id:string;onBack:()=>void;activities?:{id:string;title:string}[];onActivity?:(id:string)=>void}){
  const [document,setDocument]=useState<OpenDocument|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const [dashboard,setDashboard]=useState<LocalDashboard|null>(null),[starting,setStarting]=useState(false),[observing,setObserving]=useState(false);
  const [downloading,setDownloading]=useState(false),[downloadError,setDownloadError]=useState('');
  const [actionError,setActionError]=useState('');
  const [confirmStart,setConfirmStart]=useState(false);
  const [observationContext,setObservationContext]=useState<{criterionId?:string;momentId?:string;free?:boolean}|null>(null);
  const pastProject=!!document?.experience_ends_on&&!!dashboard&&document.experience_ends_on<dashboard.today.date;
  const siblings=activities.length?activities:document?.project_activities??[];
  const block=dashboard?.today.blocks.find(block=>block.activity_id===id)??null,position=siblings.findIndex(item=>item.id===id);
  useEffect(()=>{let live=true;void loadLocalDashboard().then(value=>{if(live)setDashboard(value);}).catch(()=>{});return()=>{live=false;};},[id]);
  async function start(){if(!block||starting)return;setStarting(true);try{if(block.status==='planned')await updateLocalExecution({scheduleEntryId:block.id,action:'start'});writeWorkspaceLocation('Hoy',{activity:id});}catch(cause){setActionError(cause instanceof Error?cause.message:'No pudimos iniciar la actividad.');}finally{setStarting(false);}}
  async function developToday(){if(starting)return;setStarting(true);setActionError('');try{
    const next=await updateLocalExecution({activityId:id,action:'start_today'});setConfirmStart(false);setDashboard(next);onStarted?.(next);
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
  if(inToday&&document?.guide&&dashboard){
    const guide=document.guide;
    const previewBlock:LocalDashboard['today']['blocks'][number]={id:'consultation',activity_id:id,title:document.title,purpose:String(document.content.purpose??''),experience_title:document.experience_title??null,activity_details:{workshop_catalog:document.content.workshop_catalog&&typeof document.content.workshop_catalog==='object'&&'id' in document.content.workshop_catalog&&typeof document.content.workshop_catalog.id==='string'?{id:document.content.workshop_catalog.id}:undefined,teacher_preparation:typeof document.content.teacher_preparation==='string'?document.content.teacher_preparation:undefined,resources:Array.isArray(document.content.resources)?document.content.resources as {id:string;title:string;url:string}[]:undefined,workshop_type:typeof document.content.workshop_type==='string'?document.content.workshop_type:undefined},
      materials_source:String(document.content.materials_source??'activity'),materials:Array.isArray(document.content.materials)?document.content.materials as string[]:[],steps:[],criteria:guide.criteria.map(item=>({...item,competency_text:document.competencies?.find(card=>card.id===item.competency_v4_id)?.name??item.competency_v4_id??''})),pedagogical_blocks:guide.pedagogical_blocks,
      start_time:'',end_time:'',block_type:'activity',status:'planned',display_status:'planned',current_override:false,current_step_index:0,closure_type:null};
    const canStart=!pastProject&&document.status==='active'&&(!document.actual_execution_date||document.actual_execution_date===dashboard.today.date)&&!['completed','skipped'].includes(block?.status??'');
    return <><ActivityRunView key={id} block={previewBlock} evidenceRevision={0} onBack={onBack} preview onEvidence={(_studentId,criterionId,momentId)=>setObservationContext({criterionId,momentId})} onFreeObservation={()=>setObservationContext({free:true})} onStepChange={async()=>{}} onComplete={async()=>{}} starting={starting}
      onStart={canStart?()=>{if(document.occurs_on!==dashboard.today.date)setConfirmStart(true);else void developToday();}:undefined}
      actions={<><Button variant="outline" disabled={downloading} onClick={()=>void download()}><Download size={18}/>Descargar Word</Button>{!canStart&&<p className="text-sm">{pastProject?'Proyecto pasado · Puedes consultar su guía.':'Esta actividad ya tiene trabajo registrado. Puedes consultar su guía.'}</p>}</>}/>
      {(actionError||downloadError)&&<WorkflowFeedback tone="error">{actionError||downloadError}</WorkflowFeedback>}
      {observationContext&&<OrdinaryObservationDialog students={dashboard.students} activity={{id,title:document.title,criteria:previewBlock.criteria,initialCriterionId:observationContext.criterionId,momentId:observationContext.momentId,free:observationContext.free}} onClose={()=>setObservationContext(null)}/>}
      <Dialog open={confirmStart} onOpenChange={value=>{if(!starting)setConfirmStart(value);}}><DialogContent><DialogHeader><DialogTitle>¿Desarrollar esta actividad hoy?</DialogTitle><DialogDescription>Esta actividad está programada para otra fecha. Registraremos que la desarrollas hoy y conservaremos su fecha prevista.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={starting} onClick={()=>setConfirmStart(false)}>Cancelar</Button><Button disabled={starting} onClick={()=>void developToday()}>{starting?'Abriendo…':'Sí, desarrollar hoy'}</Button></DialogFooter></DialogContent></Dialog></>;
  }
  return <section className="mx-auto max-w-6xl space-y-4"><Button variant="outline" disabled={starting||downloading} onClick={onBack}><ArrowLeft size={18}/>{inToday?"Volver a Hoy":"Volver a Mi año"}</Button><p className="text-sm text-[#526b87]">{inToday&&!block?"Consulta · Conservamos su fecha programada. Si decides trabajarla hoy, pulsa «Desarrollar hoy».":"Actividad completa · Consulta"}</p>
    {error?<WorkflowFeedback tone="error">{error}<Button variant="outline" onClick={()=>setRetry(value=>value+1)}>Reintentar</Button></WorkflowFeedback>:document?<>
      <ActivityReadingView document={document} position={position>=0?position+1:undefined} total={siblings.length} actions={<>
        {!pastProject&&block&&['planned','active'].includes(block.status)&&<Button disabled={starting} onClick={()=>void start()}>{starting?'Abriendo…':block.status==='active'?'Continuar esta actividad':'Iniciar esta actividad ahora'}<ArrowRight size={18}/></Button>}
        {!block&&!inToday&&!document.actual_execution_date&&document.status==='active'&&<Button onClick={()=>writeWorkspaceLocation('Hoy',{activity:id})}>Desarrollar en Hoy<ArrowRight size={18}/></Button>}
        {!pastProject&&!block&&inToday&&!document.actual_execution_date&&document.status==='active'&&<Button disabled={starting} onClick={()=>void developToday()}>{starting?'Abriendo actividad…':'Desarrollar hoy'}<ArrowRight size={18}/></Button>}
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
