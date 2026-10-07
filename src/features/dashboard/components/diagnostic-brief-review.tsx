"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { loadDiagnosticReview, prepareDiagnosticGroup, suggestDiagnosticGroup, saveDiagnosticGroup, confirmDiagnosticGroup, type DiagnosticReviewWorkspace, type DiagnosticGroupDetails } from "@/src/lib/local-database";
import { AsyncButton, LoadingState } from "./workflow-ui";

export function DiagnosticBriefReview({onBack,onContinue}:{onBack:()=>void;onContinue:()=>void}) {
  const [sources,setSources]=useState<DiagnosticReviewWorkspace|null>(null),[note,setNote]=useState("");
  const [operation,setOperation]=useState<"suggest"|"confirm"|null>(null),[error,setError]=useState("");
  const busy=operation!==null;
  const [claims,setClaims]=useState<NonNullable<DiagnosticGroupDetails["claims"]>>([]);
  useEffect(()=>{let live=true;loadDiagnosticReview().then(value=>{if(live){
    const review=value.group_reviews.find(row=>row.status==="draft"&&row.is_current)??value.group_reviews.find(row=>row.status==="confirmed"&&row.is_current);
    setSources(value);setNote(review?.details.strengths||[review?.ai_suggestion?.strengths,review?.ai_suggestion?.needs,review?.ai_suggestion?.planning_priorities].filter(Boolean).join("\n\n")||value.brief.text);
    setClaims(review?.ai_suggestion?.claims??[]);
  }}).catch(()=>{if(live)setError("No pudimos recuperar el resumen. Puedes volver a observar o continuar sin confirmarlo.");});return()=>{live=false;};},[]);
  const observed=sources?new Set(sources.observations.map(row=>row.student_id)).size:0;
  const summary=sources?`Niños en el aula: ${sources.students.length}. Entrevistas familiares confirmadas: ${sources.derived_group_information.confirmed_interviews}. Niños con observaciones relacionadas con una competencia: ${observed}. Las entrevistas aportan contexto y los registros de observación conservan lo que ocurrió; no asignan niveles.`:"";
  async function suggest(){if(!sources||busy)return;setOperation("suggest");setError("");try{
    const draft=await prepareDiagnosticGroup();
    const result=await suggestDiagnosticGroup(draft.id);
    setNote([result.details.strengths,result.details.needs,result.details.planning_priorities].filter(Boolean).join("\n\n"));
    setClaims(result.details.claims??[]);
  }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos preparar la síntesis. Puedes corregir el resumen con tus palabras.");}finally{setOperation(null);}}
  async function confirm(){if(!sources||busy)return;setOperation("confirm");setError("");try{
    const draft=await prepareDiagnosticGroup();
    await saveDiagnosticGroup(draft.id,{strengths:note.trim(),needs:"",planning_priorities:"Seguiremos recogiendo observaciones durante el año.",competency_priorities:[]});
    await confirmDiagnosticGroup(draft.id);onContinue();
  }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos confirmar el resumen.");}finally{setOperation(null);}}
  return <section className="space-y-5 rounded-2xl border border-[#d6e5ef] bg-white p-5 sm:p-7"><h2 className="text-2xl font-bold">Lo que Ayni conoce de tu grupo</h2>
    {!sources&&!error&&<LoadingState label="Reuniendo entrevistas y observaciones…"/>}
    {sources&&<><AsyncButton variant="outline" disabled={busy} busy={operation==="suggest"} busyLabel="Leyendo entrevistas y observaciones…" onClick={()=>void suggest()}>Preparar síntesis con Ayni</AsyncButton><label className="block font-semibold">Así estoy entendiendo a tu grupo<Textarea className="mt-2 min-h-64 font-normal leading-relaxed" maxLength={3000} value={note} disabled={busy} onChange={event=>setNote(event.target.value)} placeholder="Anota solo lo que observaste o una decisión para acompañar al grupo."/></label>
      <p className="text-sm text-[#526b87]">Puedes corregir o añadir algo importante. Al confirmar se guarda la información usada en este resumen; los registros posteriores no la reescriben.</p>
      <details className="text-sm"><summary className="min-h-11 cursor-pointer py-3">Fuentes utilizadas</summary><p>{summary}</p>{claims.length>0&&<p className="mt-2">Estas fuentes corresponden a la síntesis propuesta por Ayni. Tus correcciones se conservan aparte.</p>}{claims.length>0?<ul className="mt-3 space-y-4">{claims.map((claim,index)=><li key={index}><p>{claim.text}</p><p className="mt-1 text-[#526b87]">{claim.scope==="planning_decision"?"Propuesta para planificar. ":claim.scope==="information_gap"?"Información por completar o interpretar. ":""}{claim.sources.map(source=>`${source.child.replace("child_","Niño ")} · ${source.source_type==="family_reported_context"?"según la familia":source.source_type==="teacher_interpretation"?"comentario docente":"observación directa"}`).join("; ")}</p></li>)}</ul>:<p className="mt-2">El resumen inicial se elaboró con {sources.brief.source_refs.length} registros. Prepara la síntesis con Ayni para revisar las fuentes de cada afirmación.</p>}</details>
      <AsyncButton busy={operation==="confirm"} busyLabel="Confirmando resumen…" disabled={busy||!note.trim()} onClick={()=>void confirm()}>Confirmar resumen y continuar con Mi año</AsyncButton></>}
    {error&&<p role="alert">{error}</p>}<div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy} onClick={onBack}>Volver al diagnóstico</Button><Button variant="ghost" disabled={busy} onClick={onContinue}>Crear Mi año con lo que ya tengo</Button></div>
  </section>;
}
