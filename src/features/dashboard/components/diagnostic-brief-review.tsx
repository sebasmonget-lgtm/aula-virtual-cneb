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
  useEffect(()=>{let live=true;loadDiagnosticReview().then(value=>{if(live)setSources(value);}).catch(()=>{if(live)setError("No pudimos recuperar el resumen. Puedes volver a observar o continuar sin confirmarlo.");});return()=>{live=false;};},[]);
  const observed=sources?new Set(sources.observations.map(row=>row.student_id)).size:0;
  const summary=sources?`Niños en el aula: ${sources.students.length}. Entrevistas familiares confirmadas: ${sources.derived_group_information.confirmed_interviews}. Niños con observaciones relacionadas con una competencia: ${observed}. Las entrevistas aportan contexto y los registros de observación conservan lo que ocurrió; no asignan niveles.`:"";
  async function confirm(){if(!sources||busy)return;setBusy(true);setError("");try{
    const draft=await prepareDiagnosticGroup();
    await saveDiagnosticGroup(draft.id,{strengths:note.trim(),needs:"",planning_priorities:summary+" Seguiremos recogiendo observaciones durante el año.",competency_priorities:[]});
    await confirmDiagnosticGroup(draft.id);onContinue();
  }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos confirmar el resumen.");}finally{setBusy(false);}}
  return <section className="space-y-5 rounded-2xl border border-[#d6e5ef] bg-white p-5 sm:p-7"><h2 className="text-2xl font-bold">Lo que conocemos de tu aula</h2>
    {!sources&&!error&&<LoadingState label="Reuniendo entrevistas y observaciones…"/>}
    {sources&&<><p className="leading-relaxed">{summary}</p><p className="text-sm text-[#526b87]">Los registros incompletos quedan pendientes de conocer mejor. Puedes seguir observando después de preparar Mi año.</p>
      <label className="block font-semibold">Algo que quieras añadir al resumen (opcional)<Textarea className="mt-2" maxLength={3000} value={note} disabled={busy} onChange={event=>setNote(event.target.value)} placeholder="Anota solo lo que observaste o una decisión para acompañar al grupo."/></label>
      <AsyncButton busy={busy} busyLabel="Confirmando resumen…" onClick={()=>void confirm()}>Confirmar resumen y continuar con Mi año</AsyncButton></>}
    {error&&<p role="alert">{error}</p>}<div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy} onClick={onBack}>Volver a la matriz</Button><Button variant="ghost" disabled={busy} onClick={onContinue}>Continuar sin confirmar el resumen</Button></div>
    <details onToggle={event=>setAdvanced(event.currentTarget.open)}><summary className="min-h-11 cursor-pointer py-3 font-semibold text-[#087d96]">Revisión individual y prioridades (opcional)</summary>{advanced&&<DiagnosticReview onObserve={onBack} onPlan={onContinue}/>}</details>
  </section>;
}
