"use client";
import { assessmentDisplayText, assessmentReanalysisWarning } from "@/src/lib/assessment-display.mjs";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, ImageIcon, Search, Sparkles, ChartColumn, ArrowLeft, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import styles from "./period-review.module.css";
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
  const [search,setSearch]=useState(""),[rosterFilter,setRosterFilter]=useState("all");
  const [rosterOpen,setRosterOpen]=useState(false);
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
  const reviewed=pairs.filter(row=>row.valuation_confirmed).length;
  const visiblePairs=pairs.filter(row=>(rosterFilter==="all"||(rosterFilter==="confirmed"?row.valuation_confirmed:!row.valuation_confirmed))&&name(row.student_id).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").includes(search.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es")));
  const selectedIndex=visiblePairs.findIndex(row=>row.student_id===studentId);
  function selectStudent(id:string){if(id===studentId||!allowLeave())return;setStudentId(id);setDetail(null);setError("");setNotice("");setRosterOpen(false);}
  function choose(id:string){if(!allowLeave())return;setSearch("");setRosterFilter("all");setCompetencyId(id);const next=rows.find(row=>row.competency_id===id&&!row.valuation_confirmed&&row.evidence_count>0)??rows.find(row=>row.competency_id===id);setStudentId(next?.student_id??"");setDetail(null);setError("");setNotice("");}
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
      <h2 className="text-xl font-bold leading-snug sm:text-2xl">{scope.find(card=>card.id===competencyId)?.name}</h2>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border bg-white p-4">
        <p className="font-semibold tabular-nums">{reviewed} de {pairs.length} niños revisados</p>
        <Progress aria-label="Niños con valoración confirmada" value={pairs.length?reviewed/pairs.length*100:0} className="h-3 min-w-24 flex-1"/>
        <span className="rounded-xl bg-[#fff4df] px-3 py-2 text-sm font-semibold text-[#88520b]">{pairs.length-reviewed} pendientes</span>
        <span className="rounded-xl bg-[#e5f6ee] px-3 py-2 text-sm font-semibold text-[#12634e]">{reviewed} {reviewed===1?"confirmado":"confirmados"}</span>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <button type="button" aria-expanded={rosterOpen} aria-controls="evaluation-roster" onClick={()=>setRosterOpen(!rosterOpen)} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border bg-white p-3 text-left text-sm font-semibold lg:hidden">{studentId?name(studentId):"Seleccionar niño o niña"}<span className="text-[#087d96]">{rosterOpen?"Cerrar lista":"Cambiar niño"}</span></button>
        <aside id="evaluation-roster" aria-label="Estudiantes de la competencia" className={`${rosterOpen?"block":"hidden"} min-w-0 rounded-2xl border bg-white p-3 lg:sticky lg:top-24 lg:block`}>
          <h3 className="px-1 py-2 font-bold">Estudiantes ({pairs.length})</h3>
          <label className="relative block"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#526b87]"/><Input aria-label="Buscar niño o niña" className="min-h-11 pl-9" placeholder="Buscar niño o niña…" value={search} onChange={event=>setSearch(event.target.value)}/></label>
          <div className="my-3 flex flex-wrap gap-1" aria-label="Filtrar estudiantes">{[["all","Todos",pairs.length],["pending","Pendientes",pairs.length-reviewed],["confirmed","Confirmados",reviewed]].map(([value,label,count])=><button key={value} type="button" aria-pressed={rosterFilter===value} onClick={()=>setRosterFilter(String(value))} className={`min-h-11 rounded-xl px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087d96] ${rosterFilter===value?"bg-[#087d96] text-white":"bg-[#f1f6fa] text-[#345372] hover:bg-[#e3eef5]"}`}>{label} ({count})</button>)}</div>
          <div className="max-h-64 space-y-1 overflow-y-auto overscroll-contain lg:max-h-[58vh]">{visiblePairs.map((row,index)=>{const confirmed=row.valuation_confirmed;return <button key={row.student_id} type="button" disabled={busy} aria-pressed={studentId===row.student_id} onClick={()=>selectStudent(row.student_id)} className={`flex min-h-16 w-full items-center gap-3 rounded-xl p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#087d96] disabled:opacity-60 ${studentId===row.student_id?"bg-[#e4f3f9] ring-1 ring-inset ring-[#acd7e5]":"hover:bg-[#f3f8fb]"}`}>
            <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-full font-bold ${index%3===0?"bg-[#ece5fb] text-[#6442a0]":index%3===1?"bg-[#fff0d3] text-[#88520b]":"bg-[#dff3eb] text-[#12634e]"}`}>{name(row.student_id).split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("")}</span>
            <span className="min-w-0"><span className="block break-words text-sm font-semibold">{name(row.student_id)}</span><span className={`mt-1 flex items-center gap-1 text-xs ${confirmed?"text-[#12634e]":"text-[#88520b]"}`}>{confirmed?<CheckCircle2 aria-hidden="true" className="size-3.5"/>:<Clock3 aria-hidden="true" className="size-3.5"/>}{confirmed?"Confirmado":row.evidence_count?"Por confirmar":"Sin evidencia"}</span></span>
          </button>;})}{!visiblePairs.length&&<p className="p-3 text-sm text-[#526b87]">No hay niños que coincidan con estos filtros.</p>}</div>
        </aside>
        <div className="min-w-0 space-y-4 rounded-2xl border bg-white p-4 sm:p-5">
      {!detail&&studentId&&!error&&<LoadingState label="Reuniendo sus evidencias…"/>}
      {!studentId&&<p className="p-4 text-[#526b87]">Selecciona un niño para revisar sus evidencias.</p>}
      {detail&&<><header className={styles.studentHeader}><h3 className="text-xl font-bold">{name(studentId)}</h3><span className={`rounded-xl px-3 py-2 text-xs font-semibold ${current?.valuation_confirmed?"bg-[#e5f6ee] text-[#12634e]":"bg-[#fff4df] text-[#88520b]"}`}>{current?.valuation_confirmed?"Valoración confirmada":"Pendiente de revisión docente"}</span><div className="flex gap-1"><Button variant="outline" className="min-h-11" aria-label="Alumno anterior" disabled={busy||selectedIndex<=0} onClick={()=>selectStudent(visiblePairs[selectedIndex-1].student_id)}><ArrowLeft aria-hidden="true"/></Button><Button variant="outline" className="min-h-11" aria-label="Siguiente alumno" disabled={busy||selectedIndex<0||selectedIndex>=visiblePairs.length-1} onClick={()=>selectStudent(visiblePairs[selectedIndex+1].student_id)}><ArrowRight aria-hidden="true"/></Button></div></header>
        <section aria-label="Evidencias de aprendizaje" className="space-y-3"><h4 className="flex items-center gap-2 font-bold"><ImageIcon aria-hidden="true" className="size-5 text-[#087d96]"/>Evidencias de aprendizaje</h4>{detail.timeline.map(item=><article key={item.id} className={`rounded-xl border border-[var(--ayni-panel-border)] p-3 text-sm ${item.media_url?"grid items-start gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]":""}`}>{item.media_url&&<PrivateEvidenceAttachment key={item.id} path={item.media_url} compactPreview/>}<div className="min-w-0"><p className="text-xs font-medium text-[#526b87]">{new Date(`${item.observed_on}T12:00:00`).toLocaleDateString("es-PE")}</p><h5 className="mt-1 font-bold">{item.activity_title}</h5><p className="mt-3 whitespace-pre-wrap leading-relaxed">{item.observation_text||"Sin nota escrita."}</p>{item.criterion_text&&<p className="mt-3 rounded-lg bg-[#f3f7fb] p-3 text-[#526b87]"><b>Criterio:</b> {item.criterion_text}</p>}</div></article>)}</section>
        {!detail.timeline.length?<><WorkflowFeedback tone="info">Sin evidencia en este período. No es una valoración C. Sigue observando; no se exige una nota.</WorkflowFeedback>{detail.draft&&!detail.assessment&&<AsyncButton busy={busy&&busyAction==="confirmation"} busyLabel="Guardando…" disabled={closed||busy} onClick={()=>void saveObservationPending()}>Guardar pendiente de observación</AsyncButton>}</>:<>
          <section className="space-y-3 rounded-2xl bg-[#edf9fb] p-4"><h4 className="flex items-center gap-2 font-bold"><Sparkles aria-hidden="true" className="size-5 text-[#087d96]"/>Lo que observa Ayni</h4>{current?.valuation_confirmed&&!editing&&analysis?<p className="whitespace-pre-wrap text-sm leading-relaxed text-[#345372]">{analysis}</p>:!analysis?<p className="text-sm text-[#345372]">Puedes solicitar un análisis de las evidencias. Tú decides la valoración.</p>:null}{(!current?.valuation_confirmed||editing)&&<><AsyncButton variant="outline" busy={busy&&busyAction==="analysis"} busyLabel="Analizando…" disabled={closed||busy} onClick={()=>void analyze()}>Analizar evidencias</AsyncButton><label className="block text-sm font-semibold">¿Qué muestran estas evidencias?<Textarea className="mt-2 bg-white" disabled={closed||busy} value={analysis} onChange={event=>setAnalysis(event.target.value)}/></label></>}{detail.timeline.length<3&&<p className="rounded-xl bg-[#e3eff8] p-3 text-sm text-[#345372]">Hay pocas evidencias. Esto no significa automáticamente una dificultad.</p>}</section>
          <h4 className="flex items-center gap-2 pt-2 font-bold"><ChartColumn aria-hidden="true" className="size-5 text-[#087d96]"/>Valoración docente</h4>
          {current?.valuation_confirmed&&!editing?<><p className="rounded-xl bg-[#e5f6ee] p-3 font-semibold text-[#12634e]">Valoración confirmada: {detail.assessment?.achievement_level}</p>{reason&&<p className="whitespace-pre-wrap text-sm leading-relaxed text-[#526b87]">{reason}</p>}<Button variant="outline" disabled={closed} onClick={()=>setEditing(true)}>Corregir valoración</Button></>:<>
            {editing&&<WorkflowFeedback tone="info">Al cambiar esta valoración, su conclusión y el informe de este niño tendrán que prepararse de nuevo. Las versiones anteriores se conservan.</WorkflowFeedback>}
            {detail.draft?.details?.information_status==="insufficient"&&<WorkflowFeedback tone="info">Información insuficiente: {assessmentDisplayText(detail.draft.details.insufficiency_reason,name(studentId))}</WorkflowFeedback>}
            <fieldset disabled={closed||busy}><legend className="mb-2 text-sm font-semibold">Valoración que confirmas</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["AD","Logro destacado"],["A","Logro esperado"],["B","En proceso"],["C","En inicio"]].map(([value,label])=><label key={value} className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border px-3 ${level===value?"border-[#087d96] bg-[#eaf7fb]":"bg-white"}`}><input type="radio" name="achievement" checked={level===value} onChange={()=>setLevel(value)}/><span><b>{value}</b><small className="block">{label}</small></span></label>)}</div></fieldset>
            {needsReason&&<label className="block text-sm font-semibold">Sustento de tu decisión con evidencia limitada<Textarea className="mt-1" disabled={closed||busy} value={reason} onChange={event=>setReason(event.target.value)}/></label>}
            {dirty&&<p role="status" className="text-sm text-[#526b87]">Cambios pendientes de guardar.</p>}
            <div className={styles.actionBar}><AsyncButton variant="outline" busyLabel="Guardando borrador…" busy={busy&&busyAction==="draft"} disabled={closed||busy||!dirty} onClick={()=>void saveDraft()}>Guardar borrador</AsyncButton>
            <AsyncButton busyLabel="Guardando…" busy={busy&&busyAction==="confirmation"} disabled={closed||busy||!level||!analysis.trim()||needsReason&&!reason.trim()} onClick={()=>void confirm()}>Confirmar y siguiente</AsyncButton></div>
          </>}
        </>}
      </>}
        </div>
      </div>
    </section>}
    {relevant.length>0&&relevant.every(row=>row.valuation_confirmed)&&<PeriodBatchPanel key={`${classroomId}:${periodId}:conclusions:${batchRevision}`} classroomId={classroomId} periodId={periodId} kind="conclusions" students={students} competencies={scope} disabled={closed} onSaved={onChanged} onContinue={onContinue}/>}
  </div>;
}
