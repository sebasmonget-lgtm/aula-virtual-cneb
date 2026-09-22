"use client";

import { ArrowLeft, ArrowRight, BookOpen, Camera, CheckCircle2, ClipboardList, Package } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LocalDashboard } from "@/src/lib/local-database";

type ActivityBlock = LocalDashboard["today"]["blocks"][number];

export function ActivityRunView({ block, onBack, onEvidence, onStepChange, onComplete }: {
  block: ActivityBlock;
  onBack: () => void;
  onEvidence: () => void;
  onStepChange: (stepIndex: number) => Promise<void>;
  onComplete: () => Promise<void>;
}) {
  const [showComplete, setShowComplete] = useState(false);
  const steps = block.steps;
  const currentStepIndex = Math.min(Math.max(block.current_step_index ?? 0, 0), Math.max(steps.length - 1, 0));
  const hasSteps = steps.length > 0;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex >= steps.length - 1;
  const evidenceLabels = { drawing: "Guardar dibujo", oral: "Registrar comentario", movement: "Registrar movimiento", photo: "Tomar foto", production: "Guardar producción", observation: "Registrar observación" } as const;
  const evidenceLabel = block.criteria[0]?.evidence_kind ? evidenceLabels[block.criteria[0].evidence_kind] : "Registrar evidencia";

  return <section className="mx-auto max-w-3xl space-y-5">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-[#126177]"><ArrowLeft className="size-4" /> Volver a mi jornada</button>
    <article className="diagnostic-panel overflow-hidden border-[#c5edf0] bg-[linear-gradient(135deg,#ffffff,#e9fbfb)] p-5 md:p-7">
      <p className="text-sm font-semibold text-[#087d96]">{block.experience_title ?? (block.block_type === "workshop" ? "Taller" : "Actividad")}</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{block.title}</h1>
      {block.purpose && <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#526b87]">{block.purpose}</p>}
      {block.materials.length > 0 && <div className="mt-5"><p className="mb-2 flex items-center gap-2 text-sm font-bold"><Package className="size-4 text-[#087d96]" /> Materiales</p><div className="flex flex-wrap gap-2">{block.materials.map((material) => <span key={material} className="rounded-full bg-white px-3 py-2 text-sm font-medium text-[#315a78] shadow-sm">{material}</span>)}</div></div>}
    </article>
    <article className="diagnostic-panel p-5 md:p-7">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ClipboardList className="size-5 text-[#087d96]" /><h2 className="text-xl font-extrabold">{hasSteps ? `Paso ${currentStepIndex + 1} de ${steps.length}` : "Pasos guiados"}</h2></div>{hasSteps && <span className="rounded-full bg-[#e8f6fb] px-3 py-1 text-sm font-bold text-[#126177]">{currentStepIndex + 1}/{steps.length}</span>}</div>
      <p className="mt-5 min-h-20 text-lg leading-relaxed text-[#294d6d]">{hasSteps ? steps[currentStepIndex] : "Esta actividad no tiene pasos breves registrados todavía."}</p>
      {hasSteps && <div className="mt-6 grid gap-3 sm:grid-cols-2"><Button variant="outline" className="h-12" disabled={isFirst} onClick={() => onStepChange(currentStepIndex - 1)}><ArrowLeft /> Anterior</Button><Button className="h-12" disabled={isLast} onClick={() => onStepChange(currentStepIndex + 1)}>Siguiente <ArrowRight /></Button></div>}
    </article>
    <div className="grid gap-3 sm:grid-cols-2"><Button variant="outline" className="h-12 border-[#87bdcb] text-[#126177]" disabled={!block.criteria.length} onClick={onEvidence}><Camera /> {evidenceLabel}</Button><Button className="h-12" onClick={onComplete}><CheckCircle2 /> Terminar actividad</Button></div>
    {hasSteps && <div><Button variant="ghost" className="text-[#126177]" onClick={() => setShowComplete((visible) => !visible)}><BookOpen /> {showComplete ? "Ocultar actividad completa" : "Ver actividad completa"}</Button>{showComplete && <ol className="mt-2 space-y-2 rounded-2xl border bg-white p-4 text-sm text-[#315a78]">{steps.map((step, index) => <li key={`${index}-${step}`} className="flex gap-3"><span className="font-bold text-[#087d96]">{index + 1}</span><span>{step}</span></li>)}</ol>}</div>}
    <p className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4" /> La evidencia es opcional y puedes volver a la actividad completa cuando lo necesites.</p>
  </section>;
}
