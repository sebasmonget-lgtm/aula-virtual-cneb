"use client";

import { ArrowLeft, CheckCircle2, Package } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { LocalDashboard } from "@/src/lib/local-database";
import { AsyncButton, WorkflowFeedback } from "./workflow-ui";
import { PedagogicalBlock } from "./pedagogical-block";

type ActivityBlock = LocalDashboard["today"]["blocks"][number];

export function ActivityRunView({ block, onBack, onEvidence, onComplete }: {
  block: ActivityBlock; evidenceRevision: number; onBack: () => void;
  onEvidence: (studentId?: string, criterionId?: string, momentId?: string) => void;
  onStepChange: (stepIndex: number) => Promise<void>;
  onComplete: (note?: string) => Promise<void>;
}) {
  const [closing, setClosing] = useState(false), [busy, setBusy] = useState(false);
  const [note, setNote] = useState(""), [error, setError] = useState("");
  async function finish() {
    if (busy) return; setBusy(true); setError("");
    try { await onComplete(note.trim() || undefined); }
    catch { setError("No se pudo cerrar la actividad. Vuelve a intentarlo."); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-3xl space-y-5">
    <Button variant="ghost" onClick={onBack}><ArrowLeft /> Volver a mi jornada</Button>
    <header className="rounded-2xl bg-[#e9f7f7] p-5 sm:p-7">
      <h1 className="text-3xl font-bold text-[#172b52]">{block.title}</h1>
      {block.day_progress && block.day_progress.position > 0 && <p className="mt-2 text-sm font-semibold text-[#07576c]">Día {block.day_progress.position} de {block.day_progress.total}</p>}
      {block.experience_title && <p className="mt-2 font-semibold text-[#07576c]">{block.experience_title}</p>}
      {block.purpose && <p className="mt-3 leading-relaxed text-[#294d6d]">{block.purpose}</p>}
      {!!block.materials.length && <details className="mt-4"><summary className="min-h-11 cursor-pointer font-semibold text-[#07576c]"><Package className="mr-2 inline size-4" /> Materiales</summary><p className="mt-2 text-[#294d6d]">{block.materials.join(" · ")}</p></details>}
    </header>
    {block.pedagogical_blocks?.length ? block.pedagogical_blocks.map(part => <PedagogicalBlock key={part.id} block={part} onObserve={(criterionId, momentId) => onEvidence(undefined, criterionId, momentId)} />)
      : <WorkflowFeedback tone="info">Esta actividad aún no tiene una guía registrada. Puedes consultar su documento.</WorkflowFeedback>}
    {error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {closing ? <section className="space-y-3 rounded-2xl border bg-white p-5">
      <label className="block font-semibold">¿Quieres recordar algo? (opcional)<Textarea className="mt-2" maxLength={800} value={note} onChange={event => setNote(event.target.value)} placeholder="Por ejemplo: mañana retomaremos la comparación de las semillas." /></label>
      <div className="flex flex-wrap gap-3"><AsyncButton busy={busy} busyLabel="Terminando…" onClick={() => void finish()}>Terminar actividad</AsyncButton><Button variant="outline" disabled={busy} onClick={() => setClosing(false)}>Seguir con la actividad</Button></div>
    </section> : <Button className="min-h-12" onClick={() => setClosing(true)}><CheckCircle2 /> Terminar actividad</Button>}
  </section>;
}
