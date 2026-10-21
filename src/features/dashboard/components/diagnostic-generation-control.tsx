"use client";

import {useCallback,useEffect,useState} from 'react';
import {AsyncButton} from './workflow-ui';
import {loadDiagnosticGeneration,startRecoverableDiagnostic,type DiagnosticGeneration,type DiagnosticGroupDetails} from '@/src/lib/local-database';

/** A ready proposal is applied only by a teacher action; polling never replaces typed text. */
export function DiagnosticGenerationControl({draftId,disabled,onReady}:{draftId:string;disabled:boolean;onReady:(details:DiagnosticGroupDetails)=>void}){
 const [job,setJob]=useState<DiagnosticGeneration|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=useCallback(()=>loadDiagnosticGeneration(draftId),[draftId]);
 useEffect(()=>{
   let active=true,timer:ReturnType<typeof setTimeout>|undefined;
   const poll=async()=>{
     let delay=5000;
     try{
       const next=await load();if(!active)return;setJob(next);setError('');
       if(!['queued','processing'].includes(next.status))return;
       delay=Math.max(5000,Math.min(30000,next.retryAfterMs));
     }catch(cause){
       if(!active)return;
       const status=(cause as {status?:number})?.status;
       if(status&&status<500){setJob(null);setError(cause instanceof Error?cause.message:'Actualiza el borrador para continuar.');return;}
       setError('No pudimos consultar el avance. Volveremos a intentarlo sin generar otra propuesta.');
     }
     if(active)timer=setTimeout(()=>void poll(),delay);
   };
   void poll();return()=>{active=false;if(timer)clearTimeout(timer);};
 },[load,job?.status==='queued'||job?.status==='processing']);
 async function start(){
   if(busy||disabled)return;setBusy(true);setError('');
   try{setJob(await startRecoverableDiagnostic(draftId,job?.requiresRepeatConsent===true));}
   catch(cause){setError(cause instanceof Error?cause.message:'No se pudo iniciar la propuesta.');}
   finally{setBusy(false);}
 }
 const pending=job&&['queued','processing'].includes(job.status);
 return <div className="max-w-xl space-y-2">
   {job?.status==='ready'&&job.details
     ? <AsyncButton variant="outline" className="min-h-11 whitespace-normal" busyLabel="Abriendo propuesta..." disabled={disabled} onClick={()=>onReady(job.details!)}>Revisar propuesta de Ayni</AsyncButton>
     : <AsyncButton variant="outline" className="min-h-11 whitespace-normal" busy={busy} disabled={disabled||!!pending} busyLabel="Guardando solicitud..." onClick={()=>void start()}>{pending?'Preparando propuesta...':job?.canRetry?'Volver a generar':'Sugerir resumen con Ayni'}</AsyncButton>}
   {job?.message&&<p role="status" className="text-sm leading-relaxed text-[#426079]">{job.message}</p>}
   {error&&<p role="alert" className="text-sm leading-relaxed text-[#a62431]">{error}</p>}
 </div>;
}
