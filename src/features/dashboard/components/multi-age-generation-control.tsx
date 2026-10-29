'use client';

import { useEffect, useRef, useState } from 'react';
import {createPortal} from 'react-dom';
import { Button } from '@/components/ui/button';
import { multiAgeAppRequest as api } from '@/src/lib/multi-age-app-client';
import type { ActivityBlueprint, AnnualProposal, DiagnosticFinding } from '@/src/lib/multi-age-app-types';
import { AnnualPreparationProgress } from './annual-preparation-progress';
import { LoadingState,WorkflowFeedback } from './workflow-ui';
import {multiAgeGenerationFailureMessage} from '@/src/lib/multi-age-generation-failure.mjs';
import {documentAnnualPreparationProgress} from '@/src/lib/document-generator-annual-progress.mjs';

export type GenerationResult = { output?: AnnualProposal | {findings:DiagnosticFinding[]}; proposal?: ActivityBlueprint; proposals?:ActivityBlueprint[]; sourceFingerprint:string; teacherConfirmed:false };
type Job={id:string;status:string;kind:string;input:Record<string,unknown>;attempts:number;providerMode:string;errorCode:string|null;result?:GenerationResult|null;sourceFingerprint?:string;updatedAt?:string;createdAt?:string};
export function MultiAgeGenerationControl({kind,input,sourceKey,mode,onReview,disabled=false,annualPresentation=false,onStatusChange,beforeStart,consumedJobId,autoApply=false,startLabel,startVisible=true,portalTarget}:{kind:'diagnostic'|'annual'|'activity'|'activity_batch';input:Record<string,unknown>;sourceKey:string;mode:'off'|'fixture'|'openai';onReview:(result:GenerationResult,id:string)=>void|Promise<void>;disabled?:boolean;annualPresentation?:boolean;onStatusChange?:(status:string)=>void;beforeStart?:()=>Promise<void>;consumedJobId?:string;autoApply?:boolean;startLabel?:string;startVisible?:boolean;portalTarget?:HTMLElement|null}) {
  const [job,setJob]=useState<Job|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loadedLookup,setLoadedLookup]=useState(''),[lookupFailed,setLookupFailed]=useState(false),[lookupAttempt,setLookupAttempt]=useState(0);
  const signature=JSON.stringify(input);
  const [starting,setStarting]=useState(false);
  const [saving,setSaving]=useState(false),[saveRetry,setSaveRetry]=useState(0),savedAttempt=useRef<string|null>(null),review=useRef(onReview);
  useEffect(()=>{review.current=onReview;},[onReview]);
  const lookupKey=JSON.stringify([signature,sourceKey,kind,mode,lookupAttempt,consumedJobId]),checking=mode!=='off'&&loadedLookup!==lookupKey;
  const jobId=job?.id,jobStatus=job?.status;
  useEffect(()=>{
    if(mode==='off')return;
    let live=true;const target=JSON.parse(signature) as Record<string,unknown>;
    api<{jobs:Job[]}>(`/generation?classroomId=${encodeURIComponent(String(target.classroomId))}`).then(async data=>{
      let restored=data.jobs.find(j=>j.kind===kind&&j.providerMode===mode&&Object.entries(target).every(([key,value])=>JSON.stringify(j.input[key])===JSON.stringify(value)))??null;
      // A saved draft already owns this result; do not present it as awaiting review again.
      if(restored?.id===consumedJobId)restored=null;
      if(restored?.status==='ready')restored=await api<Job>(`/generation/${restored.id}`);
      if(live){setJob(restored);setLoadedLookup(lookupKey);setLookupFailed(false);setError('');}
    }).catch(()=>{if(live){setLoadedLookup(lookupKey);setLookupFailed(true);setError('No se pudo consultar la preparación guardada.');}});
    return()=>{live=false;};
  },[signature,lookupKey,kind,mode,consumedJobId]);
  useEffect(()=>{onStatusChange?.(starting||saving?'preparing':checking?'loading':lookupFailed?'unavailable':job?.status??'idle');},[starting,saving,checking,lookupFailed,job?.status,onStatusChange]);
  useEffect(()=>{
    if(!autoApply||!job||job.status!=='ready'||!job.result||checking||disabled||savedAttempt.current===job.id)return;
    savedAttempt.current=job.id;setSaving(true);setError('');
    void Promise.resolve().then(()=>review.current(job.result!,job.id)).catch(cause=>setError(cause instanceof Error?cause.message:'No pudimos guardar Mi año. Puedes volver a intentarlo sin generarlo otra vez.')).finally(()=>setSaving(false));
  },[autoApply,job,checking,disabled,saveRetry]);
  useEffect(()=>{
    if(!jobId||!jobStatus||!['queued','running'].includes(jobStatus))return;
    let live=true;const id=jobId;
    const timer=setInterval(()=>{api<Job>(`/generation/${id}`).then(value=>{if(live){setJob(value);setError('');}}).catch(()=>{if(live)setError('La preparación está guardada; no se pudo consultar su avance.');});},1500);
    return()=>{live=false;clearInterval(timer);};
  },[jobId,jobStatus]);
  async function act(action:'start'|'retry'|'review') {
    if(busy)return;setBusy(true);setStarting(action!=='review');setError('');
    try {
      if(action==='review'&&job){const loaded=await api<Job>(`/generation/${job.id}`);setJob(loaded);if(loaded.status!=='ready'||!loaded.result||loaded.providerMode!==mode)throw new Error('Las fuentes o el proveedor cambiaron. Prepara una propuesta nueva.');await onReview(loaded.result,loaded.id);}
      else if(action==='retry'&&job){if(job.status==='interrupted'&&!window.confirm('La llamada anterior pudo generar consumo aunque no llegó su respuesta. ¿Quieres volver a solicitarla?'))return;setJob(await api<Job>(`/generation/${job.id}/retry`,{}));}
      else {await beforeStart?.();setJob(await api<Job>('/generation',{kind,...input}));}
    }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo preparar la propuesta.');}
    finally{setBusy(false);setStarting(false);}
  }
  if(mode==='off')return <p className="text-sm text-[#596c82]">La asistencia de IA está desactivada. Puedes continuar con la revisión manual.</p>;
  const pending=job&&['queued','running'].includes(job.status);
  if(annualPresentation&&checking&&!starting)return <LoadingState label="Consultando la preparación guardada…"/>;
  if(autoApply&&saving)return <LoadingState label="Guardando Mi año…"/>;
  if(annualPresentation&&(pending||starting))return <AnnualPreparationProgress showSteps={false} job={documentAnnualPreparationProgress(job,{starting})} generating disabled onContinue={()=>{}} onRefresh={()=>setLookupAttempt(n=>n+1)}/>;
  const content=<div className={annualPresentation?'space-y-3':'space-y-3 rounded-xl border border-[#d0dee8] bg-white p-4'}>
    {mode==='fixture'&&<p className="text-sm text-[#596c82]">Simulación local: no llama a IA ni consume saldo. La propuesta requiere tu revisión.</p>}
    {annualPresentation&&!autoApply&&job?.status==='ready'&&<WorkflowFeedback tone="success">Tu propuesta de Mi año está lista. Ábrela para revisarla antes de guardarla o confirmarla.</WorkflowFeedback>}
    {pending?<p role="status">{job.status==='queued'?'Preparación guardada; esperando su turno…':'Ayni está preparando una propuesta con las fuentes guardadas…'} Puedes salir y volver.</p>:<div className={`flex flex-wrap gap-3 ${annualPresentation?'justify-end':''}`}>
      {job?.status==='ready'?(autoApply?error&&<Button disabled={disabled} onClick={()=>{savedAttempt.current=null;setSaveRetry(n=>n+1);}}>Volver a guardar Mi año</Button>:<Button variant={annualPresentation?'default':'outline'} disabled={busy||disabled||checking||lookupFailed} onClick={()=>void act('review')}>{annualPresentation?'Revisar Mi año':kind==='activity_batch'?'Revisar lote guardado':'Revisar propuesta guardada'}</Button>):startVisible&&(!job||job.status==='stale')&&<Button variant={annualPresentation?'default':'outline'} disabled={busy||disabled||checking||lookupFailed} onClick={()=>void act('start')}>{busy?'Preparando…':annualPresentation?(startLabel??'Crear Mi año'):kind==='activity_batch'?'Preparar lote con Ayni':'Preparar propuesta con Ayni'}</Button>}
      {job&&['failed','interrupted'].includes(job.status)&&job.attempts<3&&<Button variant="outline" disabled={busy||disabled} onClick={()=>void act('retry')}>Reintentar preparación</Button>}
    </div>}
    {job?.status==='stale'&&<p>{annualPresentation?'La preparación anterior usa información o instrucciones que cambiaron. Puedes preparar una nueva; lo confirmado se conserva.':'Las fuentes cambiaron. La versión anterior no se aplicará.'}</p>}
    {job?.status==='failed'&&<p role="alert">{multiAgeGenerationFailureMessage(job.errorCode)}</p>}
    {job&&['failed','interrupted'].includes(job.status)&&job.attempts>=3&&<p>Se agotaron los tres intentos de esta preparación. Puedes continuar con la revisión manual.</p>}
    {job?.status==='interrupted'&&<p>La respuesta quedó sin confirmar tras una interrupción. Revisa antes de solicitar otro intento; puede haber consumo previo.</p>}
    {error&&<p role="alert">{error}</p>}
    {lookupFailed&&<Button variant="outline" onClick={()=>setLookupAttempt(n=>n+1)}>Actualizar preparación</Button>}
    {!annualPresentation&&<p className="text-sm text-[#596c82]">Abrir o preparar una propuesta no confirma diagnósticos, actividades ni valoraciones.</p>}
  </div>;
  return portalTarget?createPortal(content,portalTarget):content;
}
