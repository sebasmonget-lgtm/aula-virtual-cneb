"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { loadDiagnosticReview, prepareDiagnosticGroup, startRecoverableDiagnostic, loadDiagnosticGeneration, saveDiagnosticGroup, confirmDiagnosticGroup, type DiagnosticReviewWorkspace, type DiagnosticGroupDetails, type DiagnosticGeneration } from "@/src/lib/local-database";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
import { AsyncButton, LoadingState } from "./workflow-ui";
import {DiagnosticCompetencyReadings} from './diagnostic-competency-readings';

export type SummaryHandle={flush:()=>Promise<boolean>};
const fields=[['strengths','Lo que conocemos de tu grupo'],['needs','Lo que conviene seguir observando'],['planning_priorities','Qué tendremos en cuenta al planificar']] as const;
const editable=(d:DiagnosticGroupDetails):DiagnosticGroupDetails=>({strengths:d.strengths??'',needs:d.needs??'',planning_priorities:d.planning_priorities??'',competency_priorities:d.competency_priorities??[],...(d.competency_readings?{competency_readings:d.competency_readings}:{})});
export const DiagnosticBriefReview=forwardRef<SummaryHandle,{onBack:()=>void;onContinue:()=>void}>(function DiagnosticBriefReview({onBack,onContinue},ref){
  const [sources,setSources]=useState<DiagnosticReviewWorkspace|null>(null),[details,setDetails]=useState<DiagnosticGroupDetails|null>(null);
  const [operation,setOperation]=useState<'suggest'|'continue'|null>(null),[status,setStatus]=useState<'saved'|'pending'|'saving'|'error'>('saved'),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const [claims,setClaims]=useState<NonNullable<DiagnosticGroupDetails['claims']>>([]);
  const [waiting,setWaiting]=useState(false),[prepared,setPrepared]=useState<DiagnosticGroupDetails|null>(null);
  const [generationId,setGenerationId]=useState(''),[generation,setGeneration]=useState<DiagnosticGeneration|null>(null),[generationTick,setGenerationTick]=useState(0),[generationError,setGenerationError]=useState('');
  const latest=useRef<DiagnosticGroupDetails|null>(null),saved=useRef(''),draftId=useRef(''),queue=useRef<Promise<boolean>|null>(null),lock=useRef(false),alive=useRef(true);
  const dirty=!!details&&JSON.stringify(details)!==saved.current;
  useUnsavedWork(dirty,operation==='continue'||status==='saving');
  useEffect(()=>{alive.current=true;let active=true;loadDiagnosticReview().then(value=>{if(!active)return;
    const draft=value.group_reviews.find(row=>row.status==='draft'),review=draft??value.group_reviews.find(row=>row.status==='confirmed');
    const initial=editable(review?.details??{strengths:value.brief.text,needs:'',planning_priorities:'',competency_priorities:[]});
    if(draft)draftId.current=draft.id;setGenerationId(draft?.id??'');
    setWaiting(draft?.ai_state==='queued'||draft?.ai_state==='processing');
    setPrepared(draft?.is_current&&draft.ai_suggestion&&JSON.stringify(editable(draft.ai_suggestion))!==JSON.stringify(initial)?draft.ai_suggestion:null);
    latest.current=initial;saved.current=review?JSON.stringify(initial):'';setDetails(initial);setStatus(review?'saved':'pending');setSources(value);setClaims(review?.ai_suggestion?.claims??[]);setError('');
  }).catch(()=>{if(active)setError('No pudimos recuperar tu resumen. Reintenta; tus correcciones guardadas se conservan.');});return()=>{active=false;alive.current=false;};},[revision]);
  useEffect(()=>{
    if(!generationId)return;
    let active=true,timer:ReturnType<typeof setTimeout>|undefined;
    const poll=async()=>{
      let delay=5000;
      try{
        const result=await loadDiagnosticGeneration(generationId);if(!active)return;
        setGeneration(result);setGenerationError('');setWaiting(['queued','processing'].includes(result.status));
        if(result.status==='ready'&&result.details){
          setPrepared(JSON.stringify(editable(result.details))!==JSON.stringify(latest.current)?result.details:null);
        }
        if(!['queued','processing'].includes(result.status))return;
        delay=Math.max(5000,Math.min(30000,result.retryAfterMs));
      }catch(cause){
        if(!active)return;
        const httpStatus=(cause as {status?:number})?.status;
        if(httpStatus&&httpStatus<500){setWaiting(false);setGenerationError(cause instanceof Error?cause.message:'Actualiza el borrador para continuar.');return;}
        setGenerationError('No pudimos consultar el avance. Volveremos a intentarlo sin generar otro resumen.');
      }
      if(active)timer=setTimeout(()=>void poll(),delay);
    };
    void poll();return()=>{active=false;if(timer)clearTimeout(timer);};
  },[generationId,generationTick]);
  async function flush():Promise<boolean>{
    if(queue.current)return queue.current;
    queue.current=Promise.resolve().then(async()=>{try{
      while(latest.current&&JSON.stringify(latest.current)!==saved.current){
        setStatus('saving');setError('');const value=latest.current;
        if(!draftId.current)draftId.current=(await prepareDiagnosticGroup()).id;
        await saveDiagnosticGroup(draftId.current,value);saved.current=JSON.stringify(value);
      }
      if(alive.current)setStatus('saved');return true;
    }catch(cause){if(alive.current){setStatus('error');setError(cause instanceof Error?cause.message:'No se pudo guardar. Tu texto sigue aquí.');}return false;}finally{queue.current=null;}});
    return queue.current;
  }
  useImperativeHandle(ref,()=>({flush}));
  useEffect(()=>{if(!dirty||operation||status==='error')return;const timer=setTimeout(()=>void flush(),700);return()=>clearTimeout(timer);});
  function change(value:DiagnosticGroupDetails){latest.current=value;setDetails(value);setStatus('pending');setError('');}
  async function suggest(){if(lock.current||!sources)return;lock.current=true;setOperation('suggest');setError('');try{
    if(!await flush())return;const draft=await prepareDiagnosticGroup();draftId.current=draft.id;
    // A new version must preserve the teacher's current corrections even if AI fails.
    if(latest.current&&JSON.stringify(editable(draft.details))!==JSON.stringify(latest.current))await saveDiagnosticGroup(draft.id,latest.current);
    const result=await startRecoverableDiagnostic(draft.id,generation?.draftId===draft.id&&generation.requiresRepeatConsent);
    // The server stores the result independently; an unmounted editor must not overwrite newer corrections.
    if(!alive.current)return;
    setGenerationId(draft.id);setGeneration(result);setGenerationError('');setWaiting(['queued','processing'].includes(result.status));
    if(result.status==='ready'&&result.details)setPrepared(result.details);
  }catch(cause){setError(cause instanceof Error?cause.message:'Ayni no pudo terminar el resumen. Puedes continuar con tus palabras.');}finally{
    if(alive.current&&draftId.current){setGenerationId(draftId.current);setGenerationTick(value=>value+1);}
    lock.current=false;setOperation(null);
  }}
  async function advance(){if(lock.current||!latest.current)return;lock.current=true;setOperation('continue');setError('');try{
    if(!await flush())return;
    const existing=sources?.group_reviews.find(row=>row.status==='confirmed'&&row.is_current&&JSON.stringify(editable(row.details))===JSON.stringify(latest.current));
    if(!draftId.current&&!existing){draftId.current=(await prepareDiagnosticGroup()).id;await saveDiagnosticGroup(draftId.current,latest.current);}
    if(draftId.current){await confirmDiagnosticGroup(draftId.current);draftId.current='';}onContinue();
  }catch(cause){setError(cause instanceof Error?cause.message:'No pudimos continuar a Mi año. Tu resumen guardado se conserva.');}finally{lock.current=false;setOperation(null);}}
  if(!sources||!details)return <section className="space-y-4">{error?<><p role="alert">{error}</p><Button onClick={()=>setRevision(value=>value+1)}>Reintentar</Button></>:<LoadingState label="Recuperando tu resumen del aula…"/>}</section>;
  const incomplete=sources.derived_group_information.confirmed_interviews<sources.students.length||new Set(sources.observations.map(row=>row.student_id)).size<sources.students.length;
  return <section className="min-w-0 space-y-5 rounded-2xl border border-[var(--ayni-panel-border)] bg-white p-5 sm:p-7" aria-label="Tu resumen del aula">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">Tu resumen del aula</h2><span role="status" className="text-sm text-[#526b87]">{status==='saving'?'Guardando…':status==='pending'?'Cambios pendientes':status==='error'?'No se pudo guardar':'Cambios guardados'}</span></div>
    <p className="max-w-prose text-sm text-[#526b87]">Revisa lo que conocemos y añade lo que te ayude a planificar. Tus correcciones se guardan automáticamente.</p>
    {incomplete&&<p className="rounded-xl bg-[#eef6fa] p-3 text-sm">Puedes continuar ahora. Con más entrevistas y observaciones, la personalización de Mi año será más completa.</p>}
    <div><h3 className="font-bold">Intereses contados por las familias</h3>{sources.derived_group_information.interests.length?<ul className="mt-2 flex flex-wrap gap-2">{sources.derived_group_information.interests.map(item=><li key={item.key} className="rounded-lg bg-[#e5f4ee] px-3 py-2 text-sm">{item.label} · {item.count} {item.count===1?'familia':'familias'}</li>)}</ul>:<p className="mt-2 text-sm text-[#526b87]">Los intereses aparecerán aquí al confirmar las entrevistas familiares.</p>}</div>
    <AsyncButton variant="outline" busy={operation==='suggest'} busyLabel="Guardando tu solicitud…" disabled={!!operation||waiting||status==='saving'} onClick={()=>void suggest()}><Sparkles size={18}/>{generation?.canRetry?'Volver a generar':'Preparar resumen con Ayni'}</AsyncButton>
    {waiting&&<div role="status" className="space-y-3 rounded-xl bg-[#eef6fa] p-3"><p>Ayni sigue preparando tu resumen. Puedes salir y volver; tu texto está guardado y no iniciaremos otra generación.</p><Button variant="outline" disabled={status==='saving'||!!operation} onClick={()=>void flush().then(ok=>{if(ok)setRevision(value=>value+1);})}>Consultar estado del resumen</Button></div>}
    {prepared&&<div className="space-y-3 rounded-xl bg-[#e5f4ee] p-3"><p>Ayni terminó una propuesta que quedó guardada. Puedes usarla y editarla; tus palabras actuales se conservan hasta que la elijas.</p><Button variant="outline" disabled={!!operation||status==='saving'} onClick={()=>{change(editable(prepared));setClaims(prepared.claims??[]);setPrepared(null);void flush();}}>Usar el resumen preparado</Button></div>}
    {!waiting&&generation?.message&&generation.status!=='ready'&&generation.status!=='idle'&&<p role="status" className="rounded-xl bg-[#eef6fa] p-3 text-sm">{generation.message}</p>}
    {generationError&&<p role="alert" className="rounded-xl bg-[#fff1df] p-3 text-sm">{generationError}</p>}
    {operation==='suggest'&&<p role="status" className="text-sm text-[#526b87]">Estamos leyendo la información disponible. La propuesta aparecerá cuando termine correctamente; tus datos actuales siguen guardados.</p>}
    {fields.map(([field,label])=><label key={field} className="block font-semibold">{label}<Textarea className="mt-2 min-h-24 font-normal leading-relaxed" maxLength={3000} value={details[field]} disabled={!!operation} onChange={event=>change({...details,[field]:event.target.value})}/></label>)}
    <DiagnosticCompetencyReadings readings={details.competency_readings} coverage={sources.group_coverage} disabled={!!operation} onChange={readings=>change({...details,competency_readings:readings})}/>
    <details className="text-sm"><summary className="min-h-11 cursor-pointer py-3">Fuentes e historial del resumen</summary><p>{sources.derived_group_information.confirmed_interviews} entrevistas confirmadas y {sources.observations.length} registros de observación. Las entrevistas aportan contexto familiar; no acreditan logros.</p>{claims.length>0&&<ul className="mt-3 space-y-3">{claims.map((claim,index)=><li key={index}>{claim.text}<span className="mt-1 block text-[#526b87]">{claim.sources.map(source=>`${source.child.replace('child_','Niño ')} · ${source.source_type==='family_reported_context'?'según la familia':source.source_type==='teacher_interpretation'?'comentario docente':'observación directa'}`).join('; ')}</span></li>)}</ul>}{sources.group_reviews.filter(row=>row.status==='confirmed').map(row=><div key={row.id} className="mt-3 border-t pt-3"><strong>Versión {row.version}</strong><p className="whitespace-pre-wrap">{[row.details.strengths,row.details.needs,row.details.planning_priorities].filter(Boolean).join('\n')}</p></div>)}</details>
    {error&&<div role="alert" className="space-y-2 rounded-xl bg-[#fff1df] p-3"><p>{error}</p>{status==='error'&&<Button variant="outline" onClick={()=>void flush()}>Reintentar guardado</Button>}</div>}
    <div className="flex flex-wrap justify-between gap-3 border-t border-[var(--ayni-panel-border)] pt-4"><Button variant="outline" disabled={operation==='continue'||status==='saving'} onClick={()=>void flush().then(ok=>{if(ok)onBack();})}>Volver a entrevistas y observaciones</Button><AsyncButton busy={operation==='continue'} busyLabel="Preparando el paso a Mi año…" disabled={!!operation||waiting||!details.strengths.trim()} onClick={()=>void advance()}>Continuar a Mi año<ArrowRight/></AsyncButton></div>
  </section>;
});
