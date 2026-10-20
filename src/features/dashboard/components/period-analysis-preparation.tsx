"use client";
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Sparkles} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Progress} from '@/components/ui/progress';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {apiFetch,apiJson} from '@/src/lib/ayni-api-fetch';
import {localDatabaseApiUrl} from '@/src/lib/local-database';
import {evaluationNeedsEarlyWarning,evaluationConfirmationSeconds} from '@/src/lib/evaluation-preparation.mjs';
import {AsyncButton,LoadingState,WorkflowFeedback} from './workflow-ui';

type Job={id:string;status:string;revision:number;total:number;completed:number;error:string|null};
async function api<T>(path:string,body?:unknown):Promise<T>{
  const response=await apiFetch(localDatabaseApiUrl+path,{method:body===undefined?'GET':'POST',cache:'no-store',...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
  const value=await apiJson<T&{message?:string;error?:string}>(response);if(!response.ok)throw Error(value.message??value.error??'No pudimos consultar la preparación. Vuelve a consultar el avance.');return value;
}
export function PeriodAnalysisPreparation({classroomId,periodId,periodLabel,today,endsOn,eligibleCount,closed,onChanged,children}:{classroomId:string;periodId:string;periodLabel:string;today:string;endsOn:string;eligibleCount:number;closed:boolean;onChanged:()=>Promise<void>;children:ReactNode}){
  const [job,setJob]=useState<Job|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[review,setReview]=useState(false);
  const [confirmEarly,setConfirmEarly]=useState(false),[seconds,setSeconds]=useState(5);
  const delivered=useRef('');
  const scope={classroomId,periodId},query=new URLSearchParams({...scope,kind:'analysis'}).toString();
  useEffect(()=>{let active=true;void api<{job:Job|null}>(`/api/period-evaluations/batches?${query}`).then(value=>{if(active)setJob(value.job);}).catch(cause=>{if(active)setError(cause.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[query]);
  useEffect(()=>{
    if(!confirmEarly)return;
    const deadline=Date.now()+5000;
    const timer=window.setInterval(()=>setSeconds(evaluationConfirmationSeconds(deadline)),200);
    return()=>window.clearInterval(timer);
  },[confirmEarly]);
  useEffect(()=>{
    if(job?.status!=='ready'||delivered.current===job.id)return;
    delivered.current=job.id;setReview(true);void onChanged().catch(()=>setError('Los análisis están guardados. Recarga para actualizar el resumen.'));
  },[job,onChanged]);
  useEffect(()=>{
    if(!job||job.status!=='queued'||busy||closed||error)return;
    let active=true;
    void api<Job>(`/api/period-evaluations/batches/${job.id}/run`,{classroomId,periodId}).then(value=>{if(active)setJob(value);}).catch(async cause=>{
      if(!active)return;setError(cause.message);
      try{const current=await api<Job>(`/api/period-evaluations/batches/${job.id}?${query}`);if(active){setJob(current);if(['queued','running','ready'].includes(current.status))setError('');}}catch{/* Keep the saved job visible until its server state can be checked. */}
    });
    return()=>{active=false;};
  },[job,busy,closed,error,classroomId,periodId,query]);
  useEffect(()=>{
    if(job?.status!=='running')return;
    let active=true,checking=false;const timer=window.setInterval(()=>{
      if(checking)return;checking=true;
      void api<Job>(`/api/period-evaluations/batches/${job.id}?${query}`).then(value=>{if(active){setJob(value);setError('');}}).catch(cause=>{if(active)setError(cause.message);}).finally(()=>{checking=false;});
    },2500);
    return()=>{active=false;window.clearInterval(timer);};
  },[job,query]);
  async function prepare(){
    if(busy||closed)return;setConfirmEarly(false);setBusy(true);setError('');
    try{setJob(await api<Job>('/api/period-evaluations/batches',{...scope,kind:'analysis',refresh:true,acknowledgeEarly:true}));}
    catch(cause){setError((cause as Error).message);}finally{setBusy(false);}
  }
  async function resume(){
    if(!job||busy||closed)return;setBusy(true);setError('');
    try{setJob(await api<Job>(`/api/period-evaluations/batches/${job.id}/run`,{...scope,retryUncertain:true}));}
    catch(cause){setError((cause as Error).message);}finally{setBusy(false);}
  }
  if(review)return <>{error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}{children}</>;
  const running=job&&['queued','running'].includes(job.status),stale=job?.status==='stale';
  return <section aria-label="Preparar evaluación del bimestre" className="space-y-4 rounded-2xl border bg-white p-4 sm:p-6">
    <div className="flex items-start gap-3"><Sparkles aria-hidden="true" className="mt-1 size-6 shrink-0 text-[#087d96]"/><div><h2 className="text-xl font-bold">{job&&['paused','uncertain'].includes(job.status)?'Quedan análisis pendientes':'Preparemos la evaluación'}</h2><p className="mt-2 max-w-prose text-sm leading-relaxed text-[#345372]">Ayni resume lo observado. Tú eliges la nota.</p></div></div>
    {loading?<LoadingState label="Consultando los análisis guardados…"/>:<>
      {job&&!stale&&<div className="space-y-2" aria-live="polite"><p className="text-sm font-semibold tabular-nums">{job.completed} de {job.total} análisis guardados</p><Progress aria-label="Análisis guardados" value={job.total?100*job.completed/job.total:0}/>{running&&<LoadingState label="Preparando análisis. Puedes salir y volver."/>}</div>}
      {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
      {job?.error&&<WorkflowFeedback tone="info">{job.error}</WorkflowFeedback>}
      {!eligibleCount&&<p className="text-sm text-[#526b87]">No hay observaciones para analizar en {periodLabel}. Puedes elegir otro bimestre arriba.</p>}
      <div className="flex flex-wrap gap-3">
        {!running&&(!job||stale)&&<AsyncButton busy={busy} busyLabel="Preparando…" disabled={closed||!eligibleCount} onClick={()=>{if(evaluationNeedsEarlyWarning(today,endsOn)){setSeconds(5);setConfirmEarly(true);}else void prepare();}}>{stale?'Actualizar análisis':'Preparar análisis'}</AsyncButton>}
        {job&&(['paused','uncertain'].includes(job.status)||Boolean(error))&&<AsyncButton variant="outline" busy={busy} busyLabel="Consultando…" disabled={closed} onClick={()=>void resume()}>Retomar análisis pendientes</AsyncButton>}
        <Button variant="outline" disabled={busy||Boolean(running)} onClick={()=>setReview(true)}>Ver observaciones</Button>
      </div>
    </>}
    <AlertDialog open={confirmEarly} onOpenChange={setConfirmEarly}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>El bimestre aún no termina</AlertDialogTitle><AlertDialogDescription>¿Preparar los análisis con lo observado hasta hoy?</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel variant="default" autoFocus>Cancelar y volver</AlertDialogCancel><AlertDialogAction variant="outline" disabled={seconds>0} onClick={()=>void prepare()}>{seconds>0?`Continuar de todos modos (${seconds} s)`:'Continuar de todos modos'}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </section>;
}
