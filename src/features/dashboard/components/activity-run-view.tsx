"use client";

import { ArrowLeft, ArrowRight, Package } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import type { LocalDashboard } from "@/src/lib/local-database";
import { WorkflowFeedback } from "./workflow-ui";
import { PedagogicalBlock } from "./pedagogical-block";
import {AnnualCompetencies} from './annual-project-preview';
import {WorkshopResources} from './workshop-resources';
import {FreeObservationButton} from "./free-observation-button";
import {ProjectPictogram} from './project-pictogram';

function subscribeReadingPosition(update:()=>void){
  window.addEventListener('ayni:guide-reading',update);
  return ()=>window.removeEventListener('ayni:guide-reading',update);
}

type ActivityBlock = LocalDashboard["today"]["blocks"][number];

export function ActivityRunView({ block, onBack, onEvidence, onFreeObservation, preview=false, actions, navigation, backLabel='Volver a mi jornada', beforeMoment }: {
  block: ActivityBlock; evidenceRevision: number; onBack: () => void;
  onEvidence: (studentId?: string, criterionId?: string, momentId?: string) => void;
  onFreeObservation?: () => void; preview?: boolean; actions?: React.ReactNode; navigation?: React.ReactNode; backLabel?:string; beforeMoment?:React.ReactNode;
}) {
  const parts=block.pedagogical_blocks??[];
  const readingKey=`ayni:guide-reading:${block.activity_id??block.id}`;
  const [selectedMoment,setSelectedMoment]=useState<number|null>(null);
  const storedMoment=useSyncExternalStore(subscribeReadingPosition,()=>{
    try { return sessionStorage.getItem(readingKey); } catch { return null; }
  },()=>null);
  const saved=selectedMoment??Number(storedMoment??0);
  const moment=Number.isInteger(saved)?Math.max(0,Math.min(saved,parts.length-1)):0;
  function moveTo(index:number){
    setSelectedMoment(index);
    // Device-local reading position only; never writes execution or observation data.
    try { sessionStorage.setItem(readingKey,String(index));window.dispatchEvent(new Event('ayni:guide-reading')); } catch {}
  }
  const current=parts[moment];
  return <section className="mx-auto max-w-6xl space-y-5">
    <Button variant="ghost" onClick={onBack}><ArrowLeft /> {backLabel}</Button>
    <header className="flex items-start gap-4 rounded-2xl bg-[#e9f7f7] p-5 sm:p-7">
      <div className="min-w-0 flex-1"><h1 className="text-3xl font-bold text-[#172b52]">{block.title}</h1>
      {block.day_progress && block.day_progress.position > 0 && <p className="mt-2 text-sm font-semibold text-[#07576c]">Día {block.day_progress.position} de {block.day_progress.total}</p>}
      {block.activity_details?.workshop_type?<p className="mt-2 font-semibold text-[#07576c]">Taller · {block.activity_details.workshop_type}</p>:block.experience_title && block.experience_title!==block.title && <p className="mt-2 font-semibold text-[#07576c]">{block.experience_title}</p>}
      {block.purpose && <p className="mt-3 leading-relaxed text-[#294d6d]">{block.purpose}</p>}
      <AnnualCompetencies ids={block.criteria.map(item=>item.competency_v4_id??item.competency_id??'').filter(Boolean)} names={new Map(block.criteria.map(item=>[item.competency_v4_id??item.competency_id??'',item.competency_text]))}/>
      <div className="mt-3 flex flex-wrap gap-2">{actions}</div></div>
      <div className="hidden shrink-0 sm:block"><ProjectPictogram project={{title:block.experience_title??block.title,purpose:block.purpose??'',primary_competency_ids:block.criteria.map(item=>item.competency_v4_id??'')}} className="size-32"/></div>
    </header>
    {block.teacher_closure_note&&<section className="rounded-2xl border border-[#b8ccde] bg-white p-5"><h2 className="font-bold text-[#172b52]">Nota guardada anteriormente</h2><p className="mt-2 whitespace-pre-line text-[#294d6d]">{block.teacher_closure_note}</p></section>}
    {navigation}
    <div className="grid gap-4 md:grid-cols-2">
      {block.activity_details?.teacher_preparation&&<section className="rounded-2xl border border-[#cce4f1] bg-[#edf7fa] p-5 shadow-[var(--ayni-panel-shadow)]"><h2 className="font-bold text-[#172b52]">Antes de empezar</h2><p className="mt-3 whitespace-pre-line leading-relaxed text-[#294d6d]">{block.activity_details.teacher_preparation}</p></section>}
      <section className="rounded-2xl border border-[#f5dfb1] bg-[#fff8e7] p-5 shadow-[var(--ayni-panel-shadow)]"><h2 className="flex items-center gap-2 font-bold text-[#172b52]"><Package size={22}/>{block.materials_source==='project'?'Materiales del proyecto':'Materiales'}</h2>{!!block.materials.length&&<ul className="mt-3 flex flex-wrap gap-2">{block.materials.map((item,index)=><li key={index} className="rounded-lg bg-white px-3 py-2 text-sm text-[#614515]">{item}</li>)}</ul>}<div className="mt-4 flex flex-wrap items-center gap-3"><WorkshopResources resources={block.activity_details?.resources} workshopId={block.activity_details?.workshop_catalog?.id} age={block.activity_details?.workshop_catalog?.age}/></div></section>
      {beforeMoment}
    </div>
    {current?<><p className="text-sm font-semibold text-[#526b87]">Momento {moment+1} de {parts.length}</p><PedagogicalBlock key={current.id} block={current} headingActions={!preview&&onFreeObservation?<FreeObservationButton onClick={onFreeObservation}/>:undefined} onObserve={preview?undefined:(criterionId,momentId)=>onEvidence(undefined,criterionId,momentId)}/><nav className="flex flex-wrap justify-between gap-3" aria-label="Momentos de la actividad"><Button variant="outline" disabled={moment===0} onClick={()=>moveTo(moment-1)}><ArrowLeft size={18}/>Momento anterior</Button><Button disabled={moment===parts.length-1} onClick={()=>moveTo(moment+1)}>Siguiente momento<ArrowRight size={18}/></Button></nav></>:<WorkflowFeedback tone="info">Esta actividad aún no tiene una guía registrada. Puedes consultar su documento.</WorkflowFeedback>}
  </section>;
}
