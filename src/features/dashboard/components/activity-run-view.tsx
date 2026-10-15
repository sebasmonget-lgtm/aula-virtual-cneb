"use client";

import { ArrowLeft, ArrowRight,CheckCircle2, Package,PencilLine,Play } from "lucide-react";
import { useState } from "react";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { LocalDashboard } from "@/src/lib/local-database";
import { AsyncButton, WorkflowFeedback } from "./workflow-ui";
import { PedagogicalBlock } from "./pedagogical-block";
import {AnnualCompetencies} from './annual-project-preview';
import {ProjectPictogram} from './project-pictogram';

type ActivityBlock = LocalDashboard["today"]["blocks"][number];

export function ActivityRunView({ block, onBack, onEvidence, onFreeObservation, onComplete,onStepChange,preview=false,onStart,starting=false,actions }: {
  block: ActivityBlock; evidenceRevision: number; onBack: () => void;
  onEvidence: (studentId?: string, criterionId?: string, momentId?: string) => void;
  onFreeObservation?:()=>void;preview?:boolean;onStart?:()=>void;starting?:boolean;actions?:React.ReactNode;
  onStepChange: (stepIndex: number) => Promise<void>;
  onComplete: (note?: string) => Promise<void>;
}) {
  const [moment,setMoment]=useState(preview?0:block.current_step_index??0);
  const parts=block.pedagogical_blocks??[],current=parts[moment];
  const [closing, setClosing] = useState(false), [busy, setBusy] = useState(false);
  const [note, setNote] = useState(""), [error, setError] = useState("");
  const allowLeave=useUnsavedWork(Boolean(note.trim()),busy);
  async function advance(){if(busy||moment>=parts.length-1)return;setBusy(true);setError('');try{if(!preview&&moment+1>(block.current_step_index??0))await onStepChange(moment+1);setMoment(value=>value+1);}catch{setError('No pudimos guardar el avance. Inténtalo otra vez.');}finally{setBusy(false);}}
  async function finish() {
    if (busy||preview||moment!==parts.length-1) return; setBusy(true); setError("");
    try { await onComplete(note.trim() || undefined); }
    catch { setError("No se pudo cerrar la actividad. Vuelve a intentarlo."); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-6xl space-y-5">
    <Button variant="ghost" onClick={()=>{if(allowLeave())onBack();}}><ArrowLeft /> Volver a mi jornada</Button>
    <header className="flex items-start gap-4 rounded-2xl bg-[#e9f7f7] p-5 sm:p-7">
      <div className="min-w-0 flex-1"><h1 className="text-3xl font-bold text-[#172b52]">{block.title}</h1>
      {block.day_progress && block.day_progress.position > 0 && <p className="mt-2 text-sm font-semibold text-[#07576c]">Día {block.day_progress.position} de {block.day_progress.total}</p>}
      {block.experience_title && <p className="mt-2 font-semibold text-[#07576c]">{block.experience_title}</p>}
      {block.purpose && <p className="mt-3 leading-relaxed text-[#294d6d]">{block.purpose}</p>}
      <AnnualCompetencies ids={block.criteria.map(item=>item.competency_v4_id??item.competency_id??'').filter(Boolean)} names={new Map(block.criteria.map(item=>[item.competency_v4_id??item.competency_id??'',item.competency_text]))}/>
      {preview&&onStart&&<div className="mt-4 space-y-3"><p className="text-sm text-[#294d6d]">Puedes revisar los momentos. Para registrar lo que ocurra, comienza la actividad.</p><Button disabled={starting} onClick={onStart}><Play size={18}/>{starting?'Abriendo…':'Desarrollar ahora'}</Button></div>}
      <div className="mt-3 flex flex-wrap gap-2">{actions}</div></div>
      <ProjectPictogram project={{title:block.experience_title??block.title,purpose:block.purpose??'',primary_competency_ids:block.criteria.map(item=>item.competency_v4_id??'')}} className="hidden size-32 shrink-0 sm:block"/>
    </header>
    {!!block.materials.length&&<section className="rounded-2xl border border-[#f5dfb1] bg-[#fff8e7] p-4"><h2 className="flex items-center gap-2 font-bold text-[#172b52]"><Package size={22}/>{block.materials_source==='project'?'Materiales del proyecto':'Materiales'}</h2><ul className="mt-2 flex flex-wrap gap-2">{block.materials.map((item,index)=><li key={index} className="rounded-lg bg-white px-3 py-2 text-sm text-[#614515]">{item}</li>)}</ul></section>}
    {!preview&&<div className="flex flex-wrap items-center gap-3">{!!block.criteria.length&&!current?.observations?.length&&<Button onClick={()=>onEvidence(undefined,block.criteria[0].id)}><PencilLine size={18}/>Registrar observación guiada</Button>}{onFreeObservation&&<Button variant="outline" onClick={onFreeObservation}><PencilLine size={18}/>Observación libre</Button>}</div>}
    {current?<><p className="text-sm font-semibold text-[#526b87]">Momento {moment+1} de {parts.length}</p><PedagogicalBlock key={current.id} block={current} onObserve={preview?undefined:(criterionId,momentId)=>onEvidence(undefined,criterionId,momentId)}/><nav className="flex flex-wrap justify-between gap-3" aria-label="Momentos de la actividad"><Button variant="outline" disabled={moment===0||busy} onClick={()=>setMoment(value=>value-1)}><ArrowLeft size={18}/>Momento anterior</Button><Button disabled={moment===parts.length-1||busy} onClick={()=>void advance()}>Siguiente momento<ArrowRight size={18}/></Button></nav></>:<WorkflowFeedback tone="info">Esta actividad aún no tiene una guía registrada. Puedes consultar su documento.</WorkflowFeedback>}
    {error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {!preview&&(closing ? <section className="space-y-3 rounded-2xl border bg-white p-5">
      <label className="block font-semibold">¿Quieres recordar algo? (opcional)<Textarea className="mt-2" maxLength={800} value={note} onChange={event => setNote(event.target.value)} placeholder="Por ejemplo: mañana retomaremos la comparación de las semillas." /></label>
      <div className="flex flex-wrap gap-3"><AsyncButton busy={busy} busyLabel="Terminando…" onClick={() => void finish()}>Terminar actividad</AsyncButton><Button variant="outline" disabled={busy} onClick={() => { if(allowLeave()){setClosing(false);setNote("");} }}>Seguir con la actividad</Button></div>
    </section> : <div><Button className="min-h-12" disabled={!parts.length||moment!==parts.length-1||busy} onClick={() => setClosing(true)}><CheckCircle2 /> Terminar actividad</Button>{moment<parts.length-1&&<p className="mt-2 text-sm text-[#526b87]">Podrás terminar después de llegar al último momento.</p>}</div>)}
  </section>;
}
