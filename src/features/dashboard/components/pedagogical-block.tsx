"use client";

import Image from "next/image";
import styles from "./interviews-workspace.module.css";
import { Eye, Lightbulb, Play,Target,Search,Heart,Plus } from "lucide-react";
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
  return <article className="rounded-2xl border border-[#d8e8f0] bg-white p-4 sm:p-5">
    <h2 className="mb-3 text-xl font-bold text-[#172b52]">{block.title}</h2>
    <div className={styles.guidance}><section><Lightbulb size={26}/><div><h3>Qué hacer</h3><p className="whitespace-pre-line">{block.instruction}</p></div></section>{block.expected_actions&&<section><Play size={26}/><div><h3>Qué harán los niños</h3><p className="whitespace-pre-line">{block.expected_actions}</p></div></section>}{!!block.examples?.length&&<section><Eye size={26}/><div><h3>Por ejemplo</h3><ul>{block.examples.map(example=><li key={example}>{example}</li>)}</ul></div></section>}</div>
    {block.observations?.map(moment=><div key={moment.id} className={`${styles.criterion} mt-3`}><Target size={28}/><div className={styles.criterionBody}><div className={styles.criterionTitle}><h3>Criterio de observación</h3><strong>{moment.criterion}</strong></div><div className={styles.lookFor}><Search size={24} aria-hidden="true"/><div><h4>Qué debes mirar en este momento:</h4><p>{moment.expected_evidence||moment.criterion}</p></div><Image src="/project-illustrations/boy.webp" alt="" width={96} height={96} unoptimized className={styles.lookForIllustration}/></div>{moment.competency_name&&<div className={styles.relatedCompetency}><span><Heart size={17} aria-hidden="true"/>Competencia relacionada</span><p>{moment.competency_name}</p></div>}{onObserve&&<Button className={styles.primary} onClick={()=>onObserve(moment.id,block.id)}><Plus/>Registrar observación</Button>}</div></div>)}
  </article>;
}
