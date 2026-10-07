"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { loadDiagnosticReview, prepareDiagnosticGroup, saveDiagnosticGroup, confirmDiagnosticGroup, type DiagnosticReviewWorkspace } from "@/src/lib/local-database";
import { AsyncButton, LoadingState } from "./workflow-ui";
import { DiagnosticReview } from "./diagnostic-review-v4";

export function DiagnosticBriefReview({onBack,onContinue}:{onBack:()=>void;onContinue:()=>void}) {
  const [sources,setSources]=useState<DiagnosticReviewWorkspace|null>(null),[note,setNote]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[advanced,setAdvanced]=useState(false);
  useEffect(()=>{let live=true;loadDiagnosticReview().then(value=>{if(live){setSources(value);setNote(value.group_reviews.find(row=>row.status==="confirmed"&&row.is_current)?.details.strengths||value.brief.text);}}).catch(()=>{if(live)setError("No pudimos recuperar el resumen. Puedes volver a observar o continuar sin confirmarlo.");});return()=>{live=false;};},[]);
  const observed=sources?new Set(sources.observations.map(row=>row.student_id)).size:0;
  const summary=sources?`Niños en el aula: ${sources.students.length}. Entrevistas familiares confirmadas: ${sources.derived_group_information.confirmed_interviews}. Niños con observaciones relacionadas con una competencia: ${observed}. Las entrevistas aportan contexto y los registros de observación conservan lo que ocurrió; no asignan niveles.`:"";
  async function confirm(){if(!sources||busy)return;setBusy(true);setError("");try{
    const draft=await prepareDiagnosticGroup();
    await saveDiagnosticGroup(draft.id,{strengths:note.trim(),needs:"",planning_priorities:"Seguiremos recogiendo observaciones durante el año.",competency_priorities:[]});
    await confirmDiagnosticGroup(draft.id);onContinue();
  }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos confirmar el resumen.");}finally{setBusy(false);}}
  return <section className="space-y-5 rounded-2xl border border-[#d6e5ef] bg-white p-5 sm:p-7"><h2 className="text-2xl font-bold">Lo que Ayni conoce de tu grupo</h2>
    {!sources&&!error&&<LoadingState label="Reuniendo entrevistas y observaciones…"/>}
    {sources&&<><label className="block font-semibold">Así estoy entendiendo a tu grupo<Textarea className="mt-2 min-h-64 font-normal leading-relaxed" maxLength={3000} value={note} disabled={busy} onChange={event=>setNote(event.target.value)} placeholder="Anota solo lo que observaste o una decisión para acompañar al grupo."/></label>
      <p className="text-sm text-[#526b87]">Puedes corregir o añadir algo importante. Al confirmar se guarda una fotografía de estas fuentes; los registros posteriores no la reescriben.</p>
      <details className="text-sm"><summary className="min-h-11 cursor-pointer py-3">Fuentes utilizadas</summary><p>{summary}</p><p className="mt-2">{sources.brief.source_refs.length} registros citados en esta síntesis.</p></details>
      <AsyncButton busy={busy} busyLabel="Confirmando resumen…" disabled={!note.trim()} onClick={()=>void confirm()}>Confirmar resumen y continuar con Mi año</AsyncButton></>}
    {error&&<p role="alert">{error}</p>}<div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy} onClick={onBack}>Volver al diagnóstico</Button><Button variant="ghost" disabled={busy} onClick={onContinue}>Crear Mi año con lo que ya tengo</Button></div>
    <details onToggle={event=>setAdvanced(event.currentTarget.open)}><summary className="min-h-11 cursor-pointer py-3 font-semibold text-[#087d96]">Revisión individual y prioridades (opcional)</summary>{advanced&&<DiagnosticReview onObserve={onBack} onPlan={onContinue}/>}</details>
  </section>;
}
