"use client";

import {useEffect,useState} from 'react';
import {ArrowLeft,FileText} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {useUnsavedWork} from '@/src/lib/use-unsaved-work';
import {confirmDiagnosticGroup,loadDiagnosticGeneration,loadDiagnosticReview,prepareDiagnosticGroup,saveDiagnosticGroup,startRecoverableDiagnostic,type DiagnosticGeneration,type DiagnosticGroupDetails,type DiagnosticReviewWorkspace} from '@/src/lib/local-database';
import {hasDiagnosticDocumentText,prepareDiagnosticDocumentDraft} from '@/src/lib/diagnostic-document-preparation.mjs';
import {AsyncButton,LoadingState,WorkflowFeedback} from './workflow-ui';
import {DiagnosticCompetencyReadings} from './diagnostic-competency-readings';

const fields=[['strengths','Fortalezas del grupo'],['needs','Dónde acompañar más'],['planning_priorities','Qué tendremos en cuenta al planificar']] as const;
export function DiagnosticDocumentPreparation({onBack,onConfirmed}:{onBack:()=>void;onConfirmed:(id:string)=>void}){
 const [workspace,setWorkspace]=useState<DiagnosticReviewWorkspace|null>(null),[draftId,setDraftId]=useState('');
 const [draft,setDraft]=useState<DiagnosticGroupDetails|null>(null),[job,setJob]=useState<DiagnosticGeneration|null>(null);
 const [busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState('');
 const allowLeave=useUnsavedWork(dirty,busy);
 useEffect(()=>{let active=true;loadDiagnosticReview().then(value=>{if(active){setWorkspace(value);setError('');}}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No pudimos leer los registros.');});return()=>{active=false;};},[]);
 const pending=Boolean(job&&['queued','processing'].includes(job.status));
 useEffect(()=>{
  if(!draftId||!pending)return;
  let active=true,timer:ReturnType<typeof setTimeout>|undefined;
  async function poll(){
   let delay=5000;
   try{
    const next=await loadDiagnosticGeneration(draftId);if(!active)return;setJob(next);setError('');
    if(next.status==='ready'&&next.details){setDraft(current=>current??next.details!);return;}
    if(!['queued','processing'].includes(next.status))return;
    delay=Math.max(5000,Math.min(30000,next.retryAfterMs));
   }catch(cause){if(!active)return;const status=(cause as {status?:number})?.status;if(status&&status<500){setJob(null);setError(cause instanceof Error?cause.message:'No pudimos consultar el diagnóstico.');return;}setError('No pudimos consultar el avance. Volveremos a intentarlo sin generar otra propuesta.');}
   if(active)timer=setTimeout(()=>void poll(),delay);
  }
  timer=setTimeout(()=>void poll(),5000);return()=>{active=false;if(timer)clearTimeout(timer);};
 },[draftId,pending]);
 async function prepare(){
  if(busy||pending)return;setBusy(true);setError('');
  try{
   const result=await prepareDiagnosticDocumentDraft({prepare:prepareDiagnosticGroup,load:loadDiagnosticGeneration,start:startRecoverableDiagnostic},{allowRetry:job?.canRetry===true,acceptPotentialRepeat:job?.requiresRepeatConsent===true});
   setDraftId(result.draftId);setJob(result.job);if(result.details)setDraft(result.details);
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo preparar el diagnóstico. Puedes volver a intentarlo.');}
  finally{setBusy(false);}
 }
 async function save(confirm:boolean){
  if(!draft||!draftId||busy)return;setBusy(true);setError('');
  try{await saveDiagnosticGroup(draftId,draft);if(confirm)await confirmDiagnosticGroup(draftId);setDirty(false);if(confirm)onConfirmed(draftId);else onBack();}
  catch(cause){setError(cause instanceof Error?cause.message:'No se pudo guardar. Tus cambios siguen aquí.');}
  finally{setBusy(false);}
 }
 return <section className="space-y-5 rounded-2xl border border-[var(--ayni-panel-border)] bg-white p-5 sm:p-7" aria-label="Preparar documento diagnóstico">
  <Button variant="outline" className="min-h-11" disabled={busy} onClick={()=>{if(allowLeave())onBack();}}><ArrowLeft/>Volver a Documentos</Button>
  <header className="max-w-2xl"><h2 className="text-2xl font-bold text-[#172b52]">Evaluación diagnóstica</h2><p className="mt-2 leading-relaxed text-[#526b87]">Ayni reúne las entrevistas y observaciones guardadas. Revisa la propuesta antes de confirmar tu documento.</p></header>
  {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
  {!workspace&&!error&&<LoadingState label="Consultando los registros de tu aula…"/>}
  {!workspace&&error&&<Button variant="outline" onClick={()=>{setError('');void loadDiagnosticReview().then(setWorkspace).catch(cause=>setError(cause instanceof Error?cause.message:'No pudimos leer los registros.'));}}>Reintentar consulta</Button>}
  {workspace&&!draft&&<div className="space-y-3"><p className="text-sm text-[#526b87]">{workspace.students.length} niños · {workspace.derived_group_information?.confirmed_interviews??0} entrevistas confirmadas · {new Set([...workspace.observations,...workspace.pending_observations].map(row=>row.id)).size} observaciones registradas</p><AsyncButton busy={busy} busyLabel="Guardando solicitud…" disabled={!workspace.students.length||pending} className="min-h-12 whitespace-normal" onClick={()=>void prepare()}><FileText/>{pending?'Preparando diagnóstico…':job?.requiresRepeatConsent?'Volver a generar el diagnóstico':job?.canRetry?'Reintentar preparación':workspace.group_reviews.some(row=>row.status==='draft')?'Continuar diagnóstico':'Preparar diagnóstico con Ayni'}</AsyncButton>
   {job?.message&&<p role="status" className="max-w-2xl text-sm leading-relaxed text-[#426079]">{job.message}</p>}
   {pending&&<p className="text-sm text-[#526b87]">Puedes salir y volver. La preparación queda guardada.</p>}
  </div>}
  {workspace&&draft&&<div className="space-y-5"><p className="text-sm text-[#526b87]">Puedes corregir el texto. Este diagnóstico no asigna notas.</p>{fields.map(([key,label])=><label key={key} className="block font-semibold text-[#172b52]">{label}<Textarea className="mt-2 min-h-28 font-normal leading-relaxed" maxLength={3000} disabled={busy} value={draft[key]} onChange={event=>{setDraft({...draft,[key]:event.target.value});setDirty(true);}}/></label>)}
   <DiagnosticCompetencyReadings readings={draft.competency_readings} coverage={workspace.group_coverage} disabled={busy} onChange={readings=>{setDraft({...draft,competency_readings:readings});setDirty(true);}}/>
   <div className="flex flex-col gap-3 border-t border-[var(--ayni-panel-border)] pt-5 sm:flex-row sm:justify-end"><AsyncButton variant="outline" className="min-h-12 whitespace-normal" busy={busy} busyLabel="Guardando…" onClick={()=>void save(false)}>Guardar para después</AsyncButton><AsyncButton className="min-h-12 whitespace-normal" busy={busy} busyLabel="Guardando…" disabled={!hasDiagnosticDocumentText(draft)} onClick={()=>void save(true)}>Confirmar documento diagnóstico</AsyncButton></div>
  </div>}
 </section>;
}
