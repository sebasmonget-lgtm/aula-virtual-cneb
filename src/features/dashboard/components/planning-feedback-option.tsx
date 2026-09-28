"use client";
import { apiFetch } from "@/src/lib/ayni-api-fetch";

import { useEffect, useState } from "react";
import { localDatabaseApiUrl } from "@/src/lib/local-database";

type Feedback={period_label:string;students_total:number;confirmed_assessments:number;competencies:{competency_id:string;competency_name:string;confirmed_assessments:number;students_without_record:number;students_without_grade?:number;levels?:Record<string,number>;support_needs:string[];next_opportunities:string[]}[];suggested_adjustments:{competency_id:string;reason:string;suggestion:string}[]};
type Period={id:string;label:string};

export function PlanningFeedbackOption({value,onChange}:{value:string|null;onChange:(periodId:string|null)=>void}){
  const [periods,setPeriods]=useState<Period[]>([]);
  const [feedback,setFeedback]=useState<Feedback|null>(null);
  const [previewPeriodId,setPreviewPeriodId]=useState("");
  const [error,setError]=useState("");
  useEffect(()=>{const controller=new AbortController();apiFetch(`${localDatabaseApiUrl}/api/planning-feedback`,{signal:controller.signal,cache:"no-store"})
    .then(async(response)=>{const data=await response.json() as {periods:Period[];feedback:Feedback|null;error?:string};if(!response.ok)throw new Error(data.error??"No se pudo cargar el contexto.");return data;})
    .then((data)=>{setPeriods(data.periods);setFeedback(data.feedback);setPreviewPeriodId(data.periods[0]?.id??"");})
    .catch((cause)=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"No se pudo cargar el contexto.");});return()=>controller.abort();},[]);
  async function selectPeriod(id:string){setPreviewPeriodId(id);onChange(null);if(!id)return;try{const response=await apiFetch(`${localDatabaseApiUrl}/api/planning-feedback?periodId=${encodeURIComponent(id)}`,{cache:"no-store"});const data=await response.json() as {feedback:Feedback;error?:string};if(!response.ok)throw new Error(data.error??"No se pudo cargar el contexto.");setFeedback(data.feedback);setError("");}catch(cause){setFeedback(null);setError(cause instanceof Error?cause.message:"No se pudo cargar el contexto.");}}
  if(!periods.length&&!error)return null;
  return <section className="rounded-xl border bg-[#f5f9fc] p-4 text-sm"><h3 className="font-bold">Lo que muestran las evaluaciones del grupo</h3><p className="mt-1 text-[#526b87]">Puedes usar este resumen para orientar la propuesta. No cambiará ningún plan ni actividad guardada.</p>{error&&<p role="alert" className="mt-2 text-red-700">{error}</p>}
    {periods.length>0&&<><label className="mt-3 block font-semibold">Período<select className="mt-1 block min-h-11 w-full rounded-xl border bg-white px-3" value={previewPeriodId} onChange={(event)=>void selectPeriod(event.target.value)}>{periods.map((period)=><option key={period.id} value={period.id}>{period.label}</option>)}</select></label>
      {feedback&&<><p className="mt-3">{feedback.confirmed_assessments} valoraciones confirmadas · {feedback.students_total} niños en el aula</p><ul className="mt-2 list-disc space-y-1 pl-5">{feedback.competencies.map((item)=><li key={item.competency_id}><b>{item.competency_name}</b>: {item.students_without_record} sin registro del período · {item.students_without_grade??"—"} sin valoración · AD: {item.levels?.AD??"—"}, A: {item.levels?.A??"—"}, B: {item.levels?.B??"—"}, C: {item.levels?.C??"—"}{item.support_needs.length?` · Apoyos compartidos: ${item.support_needs.join("; ")}`:""}{item.next_opportunities.length?` · Oportunidades: ${item.next_opportunities.join("; ")}`:""}</li>)}</ul>{feedback.suggested_adjustments.length>0&&<div className="mt-3 rounded-xl bg-white p-3"><b>Ideas para próximas propuestas</b><ul className="mt-1 list-disc space-y-1 pl-5">{feedback.suggested_adjustments.map((item,index)=><li key={`${item.competency_id}:${index}`}>{item.reason} {item.suggestion}</li>)}</ul><p className="mt-2 text-[#526b87]">Son sugerencias. Ayni no cambia el plan automáticamente.</p></div>}<label className="mt-3 flex items-center gap-2 font-semibold"><input type="checkbox" checked={value===previewPeriodId} onChange={(event)=>onChange(event.target.checked?previewPeriodId:null)}/>Usar este resumen al preparar la propuesta</label></>}
    </>}
  </section>;
}
