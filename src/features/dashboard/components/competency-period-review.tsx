"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { AsyncButton, LoadingState, WorkflowFeedback } from "./workflow-ui";
import { PeriodBatchPanel } from "./period-batch-panel";

type Person={id:string;first_name:string;last_name:string;preferred_name:string|null};
type Row={student_id:string;competency_id:string;evidence_count:number;level:string|null;valuation_confirmed:boolean};
type Detail={evidence_fingerprint:string;draft:{revision:number;teacher_analysis:string;provisional_level:string|null;teacher_justification:string}|null;assessment:{achievement_level:string|null;details:{evidence_overview?:string;information_status?:string};teacher_justification:string|null}|null;timeline:{id:string;observed_on:string;activity_title:string;criterion_text:string;observation_text:string|null}[]};
async function api<T>(path:string,body?:unknown):Promise<T>{const response=await apiFetch(localDatabaseApiUrl+path,{method:body===undefined?"GET":"POST",cache:"no-store",...(body===undefined?{}:{headers:{"content-type":"application/json"},body:JSON.stringify(body)})});const data=await response.json() as T & {message?:string;error?:string};if(!response.ok)throw new Error(data.message??data.error??"No pudimos guardar la evaluación.");return data;}
export function CompetencyPeriodReview({classroomId,periodId,students,scope,rows,closed,onChanged,onContinue,initialStudentId="",initialCompetencyId=""}:{classroomId:string;periodId:string;students:Person[];scope:{id:string;name:string}[];rows:Row[];closed:boolean;onChanged:()=>Promise<void>;onContinue:()=>void;initialStudentId?:string;initialCompetencyId?:string}){
  const [competencyId,setCompetencyId]=useState(initialCompetencyId),[studentId,setStudentId]=useState(initialStudentId),[detail,setDetail]=useState<Detail|null>(null);
  const [analysis,setAnalysis]=useState(""),[level,setLevel]=useState(""),[reason,setReason]=useState(""),[editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  useEffect(()=>{
    if(!studentId||!competencyId)return;let active=true;
    api<Detail>(`/api/period-evaluations/detail?${new URLSearchParams({classroomId,periodId,studentId,competencyId})}`).then(value=>{if(!active)return;setDetail(value);setAnalysis(value.draft?.teacher_analysis??value.assessment?.details.evidence_overview??"");setLevel(value.draft?.provisional_level??value.assessment?.achievement_level??"");setReason(value.draft?.teacher_justification??value.assessment?.teacher_justification??"");setEditing(false);setError("");}).catch(cause=>{if(active)setError(cause.message);});return()=>{active=false;};
  },[classroomId,periodId,studentId,competencyId,rows]);
  const name=(id:string)=>{const student=students.find(row=>row.id===id);return student?`${student.preferred_name||student.first_name} ${student.last_name}`:"Niño del aula";};
  const pairs=rows.filter(row=>row.competency_id===competencyId),pending=rows.filter(row=>!row.valuation_confirmed),current=pairs.find(row=>row.student_id===studentId);
  const relevant=rows.filter(row=>row.evidence_count>0||row.level);
  function choose(id:string){setCompetencyId(id);const next=rows.find(row=>row.competency_id===id&&!row.valuation_confirmed&&row.evidence_count>0)??rows.find(row=>row.competency_id===id);setStudentId(next?.student_id??"");setDetail(null);setError("");}
  async function confirm(){if(!detail)return;setBusy(true);setError("");setNotice("");try{
    const saved=await api<{draft_revision:number}>("/api/period-evaluations/save-draft",{classroomId,periodId,studentId,competencyId,evidenceFingerprint:detail.evidence_fingerprint,expectedDraftRevision:detail.draft?.revision??null,provisionalLevel:level,teacherAnalysis:analysis,teacherJustification:reason,conclusionText:""});
    await api("/api/period-evaluations/confirm",{classroomId,periodId,studentId,competencyId,evidenceFingerprint:detail.evidence_fingerprint,expectedDraftRevision:saved.draft_revision,achievementLevel:level,teacherAnalysis:analysis,teacherJustification:reason,conclusionText:""});
    const next=pairs.find(row=>row.student_id!==studentId&&!row.valuation_confirmed&&row.evidence_count>0);
    await onChanged();setNotice("Valoración confirmada por ti.");setDetail(null);setStudentId(next?.student_id??"");if(!next)setCompetencyId("");
  }catch(cause){setError((cause as Error).message);try{await onChanged();}catch{/* Keep the current input for recovery. */}}finally{setBusy(false);}}
  return <div className="space-y-6">
    {notice&&<WorkflowFeedback tone="success">{notice}</WorkflowFeedback>}
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {!competencyId?<section><h2 className="text-xl font-bold">Evaluación del bimestre</h2><p className="mt-2 text-[#526b87]">{pending.length} evaluaciones por confirmar. Cada evaluación corresponde a un niño y una competencia.</p><div className="mt-4 divide-y divide-[#d6e5ef]">{scope.map(card=>{const own=rows.filter(row=>row.competency_id===card.id),count=own.filter(row=>!row.valuation_confirmed).length;return <div key={card.id} className="flex items-center justify-between gap-3 py-4"><div><h3 className="font-semibold">{card.name}</h3><p className="text-sm text-[#526b87]">{count} por confirmar · {own.filter(row=>!row.evidence_count).length} sin evidencia</p></div><Button variant="outline" onClick={()=>choose(card.id)}>Revisar</Button></div>;})}</div>{!scope.length&&<p className="mt-4">Todavía no hay competencias trabajadas en este período.</p>}</section>:<section className="space-y-4">
      <Button variant="ghost" disabled={busy} onClick={()=>{setCompetencyId("");setStudentId("");setDetail(null);}}>← Competencias</Button>
      <h2 className="text-xl font-bold">{scope.find(card=>card.id===competencyId)?.name}</h2><p className="text-sm text-[#526b87]">{pairs.filter(row=>row.valuation_confirmed).length} de {pairs.length} revisados</p>
      <label className="block text-sm font-semibold">Niño<select disabled={busy} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3" value={studentId} onChange={event=>{setStudentId(event.target.value);setDetail(null);}}><option value="">Selecciona un niño</option>{pairs.map(row=><option key={row.student_id} value={row.student_id}>{name(row.student_id)} · {row.valuation_confirmed?"Confirmado":row.evidence_count?"Por confirmar":"Sin evidencia"}</option>)}</select></label>
      {!detail&&studentId&&!error&&<LoadingState label="Reuniendo sus evidencias…"/>}
      {detail&&<><h3 className="text-lg font-bold">{name(studentId)}</h3><div className="space-y-3">{detail.timeline.map(item=><article key={item.id} className="border-b border-[#d6e5ef] pb-3 text-sm"><p className="font-semibold">{new Date(`${item.observed_on}T12:00:00`).toLocaleDateString("es-PE")} · {item.activity_title}</p><p className="mt-1 text-[#526b87]">{item.criterion_text}</p><p className="mt-2 whitespace-pre-wrap">{item.observation_text||"Sin nota escrita."}</p></article>)}</div>
        {!detail.timeline.length?<WorkflowFeedback tone="info">Sin evidencia en este período. No es una valoración C. Sigue observando; no se exige una nota.</WorkflowFeedback>:<>
          {detail.timeline.length<3&&<p className="text-sm text-[#526b87]">Hay pocas evidencias. Esto no significa automáticamente una dificultad.</p>}
          {current?.valuation_confirmed&&!editing?<><p className="font-semibold">Valoración confirmada: {detail.assessment?.achievement_level}</p><Button variant="outline" disabled={closed} onClick={()=>setEditing(true)}>Corregir valoración</Button></>:<>
            {editing&&<WorkflowFeedback tone="info">Al cambiar esta valoración, su conclusión y el informe de este niño tendrán que prepararse de nuevo. Las versiones anteriores se conservan.</WorkflowFeedback>}
            <label className="block text-sm font-semibold">¿Qué muestran estas evidencias?<Textarea className="mt-1" disabled={closed||busy} value={analysis} onChange={event=>setAnalysis(event.target.value)}/></label>
            <fieldset disabled={closed||busy}><legend className="mb-2 text-sm font-semibold">Valoración que confirmas</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["AD","Logro destacado"],["A","Logro esperado"],["B","En proceso"],["C","En inicio"]].map(([value,label])=><label key={value} className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border px-3 ${level===value?"border-[#087d96] bg-[#eaf7fb]":"bg-white"}`}><input type="radio" name="achievement" checked={level===value} onChange={()=>setLevel(value)}/><span><b>{value}</b><small className="block">{label}</small></span></label>)}</div></fieldset>
            {(detail.timeline.length<3||detail.assessment?.details.information_status==="insufficient")&&<label className="block text-sm font-semibold">Sustento de tu decisión con pocas evidencias<Textarea className="mt-1" disabled={closed||busy} value={reason} onChange={event=>setReason(event.target.value)}/></label>}
            <AsyncButton busyLabel="Guardando…" busy={busy} disabled={closed||!level||!analysis.trim()||(detail.timeline.length<3||detail.assessment?.details.information_status==="insufficient")&&!reason.trim()} onClick={()=>void confirm()}>Confirmar y siguiente</AsyncButton>
          </>}
        </>}
      </>}
    </section>}
    {relevant.length>0&&relevant.every(row=>row.valuation_confirmed)&&<PeriodBatchPanel key={`${classroomId}:${periodId}:conclusions`} classroomId={classroomId} periodId={periodId} kind="conclusions" students={students} competencies={scope} disabled={closed} onSaved={onChanged} onContinue={onContinue}/>}
  </div>;
}
