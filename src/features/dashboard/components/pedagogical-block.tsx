"use client";

import Image from "next/image";
import guide from "./activity-guide.module.css";
import {readingSentences,activityReadingStages} from "@/src/lib/activity-reading-content.mjs";
import {AnnualCompetencies} from "./annual-project-preview";
import { Eye, Lightbulb, Play,Target,Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PedagogicalBlockData = { id: string; title: string; instruction: string;
  expected_actions?: string; examples?: string[];
  observations?: { id: string; competency_id?: string; competency_name?: string | null; criterion: string; expected_evidence?: string | null }[] };

export function PedagogicalBlock({ block, onObserve, compact = false, position }: { block: PedagogicalBlockData; onObserve?: (criterionId: string, momentId: string) => void; compact?: boolean; position?: number }) {
  if (compact) return <article className="space-y-3 rounded-xl border border-[#d8e8f0] bg-white p-4">
    <h3 className="text-lg font-bold text-[#172b52]">{position ? `${position}. ` : ""}{block.title}</h3>
    <section className="rounded-lg bg-[#e8f5fa] p-3 text-sm text-[#294d6d]"><h4 className="mb-1 flex items-center gap-2 font-bold text-[#07576c]"><Play aria-hidden="true" className="size-4"/>Qué hacer</h4><p className="whitespace-pre-line leading-relaxed">{block.instruction}</p>{block.expected_actions && <p className="mt-2 whitespace-pre-line">{block.expected_actions}</p>}</section>
    {!!block.examples?.length && <section className="rounded-lg bg-[#f0eafb] p-3 text-sm text-[#594477]"><h4 className="mb-1 flex items-center gap-2 font-bold"><Lightbulb aria-hidden="true" className="size-4"/>Por ejemplo…</h4><ul className="list-disc space-y-1 pl-5">{block.examples.map(example=><li key={example}>{example}</li>)}</ul></section>}
    {block.observations?.map(moment=><section key={moment.id} className="rounded-lg bg-[#fff4df] p-3 text-sm text-[#614515]">
      <h4 className="mb-2 flex items-center gap-2 font-bold"><Eye aria-hidden="true" className="size-4"/>Momento para observar</h4>
      {moment.competency_name && <p className="mb-1">Competencia: {moment.competency_name}</p>}
      {moment.expected_evidence && <p className="mb-2">Evidencia esperada: {moment.expected_evidence}</p>}
      <p><strong>Criterio:</strong> {moment.criterion}</p>
      {onObserve && <Button className="mt-2 min-h-11" onClick={()=>onObserve(moment.id,block.id)}>Registrar observación</Button>}
    </section>)}
  </article>;
  const children=activityReadingStages(block.expected_actions) as {introduction:string;stages:{label:string;text:string}[]};
  return <article className={guide.moment}>
    <h2>{position?`${position}. `:''}{block.title}</h2>
    <div className={guide.columns}>
      <section className={guide.teacher}><h3><Lightbulb/>Qué hacer</h3><ol>{(readingSentences(block.instruction) as string[]).map((text,index)=><li key={index}><span>{index+1}</span><p>{text}</p></li>)}</ol></section>
      {block.expected_actions&&<section className={guide.children}><h3><Play/>Qué harán los niños</h3>{children.introduction&&<p>{children.introduction}</p>}{children.stages.map((stage,index)=><div key={stage.label} className={guide.childStage}><div><h4>{stage.label}</h4><p>{stage.text}</p></div><Image src={`/project-illustrations/${['planning_play','ideas','sharing'][index%3]}.webp`} alt="" width={88} height={88} unoptimized/></div>)}</section>}
      {!!block.observations?.length&&<section className={guide.observe}><h3><Eye/>Qué observar</h3>{block.observations.map(item=><div key={item.id} className={guide.criterion}><h4><Target size={20}/>Criterio de observación</h4><p>{item.criterion}</p>{item.competency_id&&<AnnualCompetencies ids={[item.competency_id]} names={new Map([[item.competency_id,item.competency_name??item.competency_id]])}/>}<h4 className="mt-4">Qué evidencia puedes registrar</h4><p>{item.expected_evidence||item.criterion}</p>{onObserve&&<Button className="mt-4 h-auto min-h-11 w-full whitespace-normal" onClick={()=>onObserve(item.id,block.id)}><Plus size={18}/>Registrar observación guiada</Button>}</div>)}</section>}
      {!!block.examples?.length&&<section className={guide.examples}><h3>Por ejemplo</h3><ul className="list-disc space-y-2 pl-5">{block.examples.map(example=><li key={example}>{example}</li>)}</ul></section>}
    </div>
  </article>;
}
