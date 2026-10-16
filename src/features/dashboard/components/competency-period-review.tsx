"use client";
import { assessmentDisplayText, assessmentReanalysisWarning } from "@/src/lib/assessment-display.mjs";
import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { writeWorkspaceLocation } from "@/src/lib/workspace-location";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { AsyncButton, LoadingState, WorkflowFeedback } from "./workflow-ui";
import { PeriodBatchPanel } from "./period-batch-panel";
import {PrivateEvidenceAttachment} from './private-evidence-attachment';

type Person={id:string;first_name:string;last_name:string;preferred_name:string|null};
type Row={student_id:string;competency_id:string;evidence_count:number;level:string|null;valuation_confirmed:boolean};
type Detail={evidence_fingerprint:string;draft:{revision:number;teacher_analysis:string;provisional_level:string|null;teacher_justification:string;details?:{information_status?:string;insufficiency_reason?:string|null}}|null;assessment:{achievement_level:string|null;details:{evidence_overview?:string;information_status?:string};teacher_justification:string|null}|null;timeline:{id:string;observed_on:string;activity_title:string;criterion_text:string;observation_text:string|null;media_url?:string|null}[]};
const snapshot = (analysis:string,level:string,reason:string) => JSON.stringify([analysis.trim(),level,reason.trim()]);
async function api<T>(path:string,body?:unknown):Promise<T>{const response=await apiFetch(localDatabaseApiUrl+path,{method:body===undefined?"GET":"POST",cache:"no-store",...(body===undefined?{}:{headers:{"content-type":"application/json"},body:JSON.stringify(body)})});const data=await response.json() as T & {message?:string;error?:string};if(!response.ok)throw new Error(data.message??data.error??"No pudimos guardar la evaluación.");return data;}
export function CompetencyPeriodReview({classroomId,periodId,students,scope,rows,closed,onChanged,onContinue,initialStudentId="",initialCompetencyId=""}:{classroomId:string;periodId:string;students:Person[];scope:{id:string;name:string}[];rows:Row[];closed:boolean;onChanged:()=>Promise<void>;onContinue:()=>void;initialStudentId?:string;initialCompetencyId?:string}){
  const [competencyId,setCompetencyId]=useState(initialCompetencyId),[studentId,setStudentId]=useState(initialStudentId),[detail,setDetail]=useState<Detail|null>(null);
  const [analysis,setAnalysis]=useState(""),[level,setLevel]=useState(""),[reason,setReason]=useState(""),[editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [busyAction,setBusyAction]=useState<"analysis"|"confirmation"|"draft"|null>(null);
  const [batchRevision,setBatchRevision]=useState(0);
  const [savedSnapshot,setSavedSnapshot]=useState("");
  const [reloadRevision,setReloadRevision]=useState(0);
  const [confirmAnalysis,setConfirmAnalysis]=useState(false);
  useEffect(()=>{writeWorkspaceLocation("Evaluar",{student:studentId,competency:competencyId},true);},[studentId,competencyId]);
  const dirty = Boolean(detail && snapshot(analysis,level,reason)!==savedSnapshot);
  const allowLeave = useUnsavedWork(dirty,busy,"Hay cambios en esta valoración sin guardar. ¿Quieres descartarlos?");
  const selectedPerson=students.find(row=>row.id===studentId);
  const selectedStudentName=selectedPerson?.preferred_name||selectedPerson?.first_name||"el niño observado";
  useEffect(()=>{
    if(!studentId||!competencyId)return;let active=true;
    api<Detail>(`/api/period-evaluations/detail?${new URLSearchParams({classroomId,periodId,studentId,competencyId})}`).then(value=>{if(!active)return;const text=assessmentDisplayText(value.draft?.teacher_analysis??value.assessment?.details.evidence_overview??"",selectedStudentName),grade=value.draft?.provisional_level??value.assessment?.achievement_level??"",justification=value.draft?.teacher_justification??value.assessment?.teacher_justification??"";setDetail(value);setAnalysis(text);setLevel(grade);setReason(justification);setSavedSnapshot(snapshot(text,grade,justification));setEditing(false);setError("");}).catch(cause=>{if(active)setError(cause.message);});return()=>{active=false;};
  },[classroomId,periodId,studentId,competencyId,reloadRevision,selectedStudentName]);
  const name=(id:string)=>{const student=students.find(row=>row.id===id);return student?`${student.preferred_name||student.first_name} ${student.last_name}`:"Niño del aula";};
  const pairs=rows.filter(row=>row.competency_id===competencyId),pending=rows.filter(row=>row.evidence_count>0&&!row.valuation_confirmed),current=pairs.find(row=>row.student_id===studentId);
  const relevant=rows.filter(row=>row.evidence_count>0||row.level);
  const needsReason=Boolean(detail&&(detail.timeline.length<3||detail.draft?.details?.information_status==="insufficient"||detail.assessment?.details.information_status==="insufficient"));
  function choose(id:string){if(!allowLeave())return;setCompetencyId(id);const next=rows.find(row=>row.competency_id===id&&!row.valuation_confirmed&&row.evidence_count>0)??rows.find(row=>row.competency_id===id);setStudentId(next?.student_id??"");setDetail(null);setError("");setNotice("");}
  async function analyze(acknowledged=false){if(!detail||!detail.timeline.length||busy||closed)return;
    const warning=assessmentReanalysisWarning({level,reason,analysis});
    if(warning&&!acknowledged){setConfirmAnalysis(true);return;}
    setConfirmAnalysis(false);
    setBusy(true);setBusyAction("analysis");setError("");setNotice("");try{
    let acknowledgedRevision=detail.draft?.revision;
    if(dirty||!detail.draft)acknowledgedRevision=(await writeDraft()).draft_revision;
    await api("/api/period-evaluations/suggest",{classroomId,periodId,studentId,competencyId,acknowledgedRevision,force:acknowledged});
    await onChanged();setReloadRevision(value=>value+1);setNotice("Análisis listo. Revisa las evidencias y elige tú la valoración.");
  }catch(cause){setError((cause as Error).message);}finally{setBusy(false);setBusyAction(null);}}
  async function saveObservationPending(){if(!detail?.draft||detail.timeline.length||busy||closed)return;setBusy(true);setBusyAction("confirmation");setError("");setNotice("");try{
    await api("/api/period-evaluations/save-draft",{classroomId,periodId,studentId,competencyId,evidenceFingerprint:detail.evidence_fingerprint,expectedDraftRevision:detail.draft.revision,provisionalLevel:null,teacherAnalysis:"No hay observaciones atribuidas a esta competencia. Se necesitan nuevas oportunidades de observación.",teacherJustification:"Mantengo pendiente la observación, sin asignar una valoración.",conclusionText:""});
    await onChanged();setNotice("Pendiente de observación guardado, sin valoración.");
  }catch(cause){setError((cause as Error).message);}finally{setBusy(false);setBusyAction(null);}}
  async function writeDraft(){
    if(!detail)throw new Error("Primero abre las evidencias de este niño.");
    const saved=await api<{draft_revision:number}>("/api/period-evaluations/save-draft",{classroomId,periodId,studentId,competencyId,evidenceFingerprint:detail.evidence_fingerprint,expectedDraftRevision:detail.draft?.revision??null,provisionalLevel:level||null,teacherAnalysis:analysis,teacherJustification:reason,conclusionText:""});
    setDetail({...detail,draft:{...detail.draft,revision:saved.draft_revision,teacher_analysis:analysis,provisional_level:level||null,teacher_justification:reason}});
    setSavedSnapshot(snapshot(analysis,level,reason));return saved;
  }
  async function saveDraft(){if(!detail||busy||closed)return;setBusy(true);setBusyAction("draft");setError("");setNotice("");try{
    await writeDraft();setNotice("Borrador guardado. La valoración todavía no está confirmada.");
  }catch(cause){setError((cause as Error).message);}finally{setBusy(false);setBusyAction(null);}}
  async function confirm(){if(!detail||busy||closed)return;setBusy(true);setBusyAction("confirmation");setError("");setNotice("");try{
    const saved=await writeDraft();
    await api("/api/period-evaluations/confirm",{classroomId,periodId,studentId,competencyId,evidenceFingerprint:detail.evidence_fingerprint,expectedDraftRevision:saved.draft_revision,achievementLevel:level,teacherAnalysis:analysis,teacherJustification:reason,conclusionText:""});
    const next=pairs.find(row=>row.student_id!==studentId&&!row.valuation_confirmed&&row.evidence_count>0);
    await onChanged();setBatchRevision(value=>value+1);setNotice("Valoración confirmada por ti.");setDetail(null);setStudentId(next?.student_id??"");if(!next)setCompetencyId("");
  }catch(cause){setError((cause as Error).message);}finally{setBusy(false);setBusyAction(null);}}
  return <div className="space-y-6">
    <AlertDialog open={confirmAnalysis} onOpenChange={setConfirmAnalysis}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Antes de volver a analizar</AlertDialogTitle><AlertDialogDescription>{assessmentReanalysisWarning({level,reason,analysis})}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Conservar mi borrador</AlertDialogCancel><AlertDialogAction onClick={()=>void analyze(true)}>Continuar con el análisis</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
    {notice&&<WorkflowFeedback tone="success">{notice}</WorkflowFeedback>}
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {!competencyId?<section><p className="text-[#526b87]">{pending.length} valoraciones por confirmar · {rows.filter(row=>!row.evidence_count&&!row.level).length} pendientes de observación.</p><div className="mt-4 divide-y divide-[#d6e5ef]">{scope.map(card=>{const own=rows.filter(row=>row.competency_id===card.id),count=own.filter(row=>row.evidence_count>0&&!row.valuation_confirmed).length;return <div key={card.id} className="flex items-center justify-between gap-3 py-4"><div><h3 className="font-semibold">{card.name}</h3><p className="text-sm text-[#526b87]">{count} por confirmar · {own.filter(row=>!row.evidence_count&&!row.level).length} pendientes de observación</p></div><Button variant="outline" onClick={()=>choose(card.id)}>Revisar</Button></div>;})}</div>{!scope.length&&<p className="mt-4">Todavía no hay competencias trabajadas en este período.</p>}</section>:<section className="space-y-4">
      <Button variant="ghost" disabled={busy} onClick={()=>{if(!allowLeave())return;setCompetencyId("");setStudentId("");setDetail(null);setNotice("");}}>← Competencias</Button>
      <h2 className="text-xl font-bold">{scope.find(card=>card.id===competencyId)?.name}</h2><p className="text-sm text-[#526b87]">{pairs.filter(row=>row.valuation_confirmed).length} de {pairs.length} revisados</p>
      <label className="block text-sm font-semibold">Niño<select disabled={busy} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3" value={studentId} onChange={event=>{if(event.target.value===studentId||!allowLeave())return;setStudentId(event.target.value);setDetail(null);setNotice("");}}><option value="">Selecciona un niño</option>{pairs.map(row=><option key={row.student_id} value={row.student_id}>{name(row.student_id)} · {row.valuation_confirmed?"Confirmado":row.evidence_count?"Por confirmar":"Sin evidencia"}</option>)}</select></label>
      {!detail&&studentId&&!error&&<LoadingState label="Reuniendo sus evidencias…"/>}
      {detail&&<><h3 className="text-lg font-bold">{name(studentId)}</h3><div className="space-y-3">{detail.timeline.map(item=><article key={item.id} className="border-b border-[#d6e5ef] pb-3 text-sm"><p className="font-semibold">{new Date(`${item.observed_on}T12:00:00`).toLocaleDateString("es-PE")} · {item.activity_title}</p><p className="mt-1 text-[#526b87]">{item.criterion_text}</p><p className="mt-2 whitespace-pre-wrap">{item.observation_text||"Sin nota escrita."}</p>{item.media_url&&<PrivateEvidenceAttachment path={item.media_url}/>}</article>)}</div>
        {!detail.timeline.length?<><WorkflowFeedback tone="info">Sin evidencia en este período. No es una valoración C. Sigue observando; no se exige una nota.</WorkflowFeedback>{detail.draft&&!detail.assessment&&<AsyncButton busy={busy&&busyAction==="confirmation"} busyLabel="Guardando…" disabled={closed||busy} onClick={()=>void saveObservationPending()}>Guardar pendiente de observación</AsyncButton>}</>:<>
          {detail.timeline.length<3&&<p className="text-sm text-[#526b87]">Hay pocas evidencias. Esto no significa automáticamente una dificultad.</p>}
          {current?.valuation_confirmed&&!editing?<><p className="font-semibold">Valoración confirmada: {detail.assessment?.achievement_level}</p><Button variant="outline" disabled={closed} onClick={()=>setEditing(true)}>Corregir valoración</Button></>:<>
            {editing&&<WorkflowFeedback tone="info">Al cambiar esta valoración, su conclusión y el informe de este niño tendrán que prepararse de nuevo. Las versiones anteriores se conservan.</WorkflowFeedback>}
            <AsyncButton variant="outline" busy={busy&&busyAction==="analysis"} busyLabel="Analizando…" disabled={closed||busy} onClick={()=>void analyze()}>Analizar evidencias</AsyncButton>
            {detail.draft?.details?.information_status==="insufficient"&&<WorkflowFeedback tone="info">Información insuficiente: {assessmentDisplayText(detail.draft.details.insufficiency_reason,name(studentId))}</WorkflowFeedback>}
            <label className="block text-sm font-semibold">¿Qué muestran estas evidencias?<Textarea className="mt-1" disabled={closed||busy} value={analysis} onChange={event=>setAnalysis(event.target.value)}/></label>
            <fieldset disabled={closed||busy}><legend className="mb-2 text-sm font-semibold">Valoración que confirmas</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["AD","Logro destacado"],["A","Logro esperado"],["B","En proceso"],["C","En inicio"]].map(([value,label])=><label key={value} className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border px-3 ${level===value?"border-[#087d96] bg-[#eaf7fb]":"bg-white"}`}><input type="radio" name="achievement" checked={level===value} onChange={()=>setLevel(value)}/><span><b>{value}</b><small className="block">{label}</small></span></label>)}</div></fieldset>
            {needsReason&&<label className="block text-sm font-semibold">Sustento de tu decisión con evidencia limitada<Textarea className="mt-1" disabled={closed||busy} value={reason} onChange={event=>setReason(event.target.value)}/></label>}
            {dirty&&<p role="status" className="text-sm text-[#526b87]">Cambios pendientes de guardar.</p>}
            <div className="flex flex-wrap gap-2"><AsyncButton variant="outline" busyLabel="Guardando borrador…" busy={busy&&busyAction==="draft"} disabled={closed||busy||!dirty} onClick={()=>void saveDraft()}>Guardar borrador</AsyncButton>
            <AsyncButton busyLabel="Guardando…" busy={busy&&busyAction==="confirmation"} disabled={closed||busy||!level||!analysis.trim()||needsReason&&!reason.trim()} onClick={()=>void confirm()}>Confirmar y siguiente</AsyncButton></div>
          </>}
        </>}
      </>}
    </section>}
    {relevant.length>0&&relevant.every(row=>row.valuation_confirmed)&&<PeriodBatchPanel key={`${classroomId}:${periodId}:conclusions:${batchRevision}`} classroomId={classroomId} periodId={periodId} kind="conclusions" students={students} competencies={scope} disabled={closed} onSaved={onChanged} onContinue={onContinue}/>}
  </div>;
}
