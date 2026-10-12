"use client";

import { Eye, Lightbulb, Play } from "lucide-react";
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
  return <article className="rounded-2xl border border-[#d8e8f0] bg-white p-5 sm:p-6">
    <h2 className="text-xl font-bold text-[#172b52]">{block.title}</h2>
    <div className="mt-4 space-y-4">
      <section><h3 className="font-semibold text-[#07576c]">Haz esto</h3><p className="mt-1 whitespace-pre-line leading-relaxed text-[#294d6d]">{block.instruction}</p></section>
      {block.expected_actions && <section><h3 className="font-semibold text-[#246554]">Se espera que los niños…</h3><p className="mt-1 whitespace-pre-line leading-relaxed text-[#294d6d]">{block.expected_actions}</p></section>}
      {!!block.examples?.length && <section><h3 className="font-semibold text-[#655185]">Por ejemplo…</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-[#294d6d]">{block.examples.map(example => <li key={example}>{example}</li>)}</ul></section>}
      {block.observations?.map(moment => <section key={moment.id} className="rounded-xl bg-[#fff4df] p-4">
        <h3 className="flex items-center gap-2 font-bold text-[#805819]"><Eye className="size-5" /> Momento para observar</h3>
        {moment.competency_name && <p className="mt-2 text-sm text-[#805819]">{moment.competency_name}</p>}
        <p className="mt-2 font-semibold text-[#614515]">Criterio</p><p className="mt-1 text-[#614515]">{moment.criterion}</p>
        {moment.expected_evidence && <><p className="mt-3 font-semibold text-[#614515]">Evidencia esperada</p><p className="mt-1 text-[#614515]">{moment.expected_evidence}</p></>}
        {onObserve && <Button className="mt-4 min-h-11" onClick={() => onObserve(moment.id, block.id)}>Registrar observación</Button>}
      </section>)}
    </div>
  </article>;
}
