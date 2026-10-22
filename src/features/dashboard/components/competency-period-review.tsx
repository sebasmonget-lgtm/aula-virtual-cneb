"use client";
import { assessmentDisplayText, EVALUATION_LEVELS } from "@/src/lib/assessment-display.mjs";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, ImageIcon, Search, Sparkles, ChartColumn, ArrowLeft, ArrowRight, BookOpen, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import styles from "./period-review.module.css";
import gradeStyles from "./achievement-colors.module.css";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { writeWorkspaceLocation } from "@/src/lib/workspace-location";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { AsyncButton, LoadingState, WorkflowFeedback } from "./workflow-ui";
import {PrivateEvidenceAttachment} from './private-evidence-attachment';
import {CompetencyIdentity,competencyTheme} from './competency-identity';

type Person={id:string;first_name:string;last_name:string;preferred_name:string|null};
type Row={student_id:string;competency_id:string;evidence_count:number;level:string|null;valuation_confirmed:boolean};
type Detail={previous_valuation?:{period_id:string;period_label:string;level:string|null;teacher_confirmed_at:string|null}|null;evaluation_guidance?:{age:number;focus:string|null;kind:string;note:string;source:{title:string;url:string};performances:{id:string;text:string;page:number}[]};evidence_fingerprint:string;draft:{revision:number;teacher_analysis:string;provisional_level:string|null;teacher_justification:string;details?:{information_status?:string;insufficiency_reason?:string|null}}|null;assessment:{achievement_level:string|null;details:{evidence_overview?:string;information_status?:string};teacher_justification:string|null}|null;timeline:{id:string;observed_on:string;activity_title:string;criterion_text:string;observation_text:string|null;media_url?:string|null}[]};
const snapshot = (analysis:string,level:string,reason:string) => JSON.stringify([analysis.trim(),level,reason.trim()]);
async function api<T>(path:string,body?:unknown):Promise<T>{const response=await apiFetch(localDatabaseApiUrl+path,{method:body===undefined?"GET":"POST",cache:"no-store",...(body===undefined?{}:{headers:{"content-type":"application/json"},body:JSON.stringify(body)})});const data=await response.json() as T & {message?:string;error?:string};if(!response.ok)throw new Error(data.message??data.error??"No pudimos guardar la evaluación.");return data;}
export function CompetencyPeriodReview({classroomId,periodId,students,scope,rows,closed,onChanged,onConfirmed,initialStudentId="",initialCompetencyId=""}:{classroomId:string;periodId:string;students:Person[];scope:{id:string;name:string}[];rows:Row[];closed:boolean;onChanged:()=>Promise<void>;onConfirmed?:(studentId:string,competencyId:string,level:string)=>void;initialStudentId?:string;initialCompetencyId?:string}){
  const [competencyId,setCompetencyId]=useState(initialCompetencyId),[studentId,setStudentId]=useState(initialStudentId),[detail,setDetail]=useState<Detail|null>(null);
  const [analysis,setAnalysis]=useState(""),[level,setLevel]=useState(""),[reason,setReason]=useState(""),[editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [busyAction,setBusyAction]=useState<"confirmation"|"draft"|null>(null);
  const [savedSnapshot,setSavedSnapshot]=useState("");
  const [search,setSearch]=useState(""),[rosterFilter,setRosterFilter]=useState("all");
  const [rosterOpen,setRosterOpen]=useState(false);
  useEffect(()=>{writeWorkspaceLocation("Evaluar",{student:studentId,competency:competencyId},true);},[studentId,competencyId]);
  const dirty = Boolean(detail && snapshot(analysis,level,reason)!==savedSnapshot);
  const allowLeave = useUnsavedWork(dirty,busy,"Hay cambios en esta valoración sin guardar. ¿Quieres descartarlos?");
  const prefetched=useRef(new Map<string,Promise<Detail>>());
  useEffect(()=>{prefetched.current.clear();},[classroomId,periodId]);
  const selectedPerson=students.find(row=>row.id===studentId);
  const selectedStudentName=selectedPerson?.preferred_name||selectedPerson?.first_name||"el niño observado";
  useEffect(()=>{
    if(!studentId||!competencyId)return;let active=true;
    const key=classroomId+':'+periodId+':'+competencyId+':'+studentId,cached=prefetched.current.get(key);prefetched.current.delete(key);
    (cached??api<Detail>(`/api/period-evaluations/detail?${new URLSearchParams({classroomId,periodId,studentId,competencyId})}`)).then(value=>{if(!active)return;const text=assessmentDisplayText(value.draft?.teacher_analysis??value.assessment?.details.evidence_overview??"",selectedStudentName),grade=value.draft?.provisional_level??value.assessment?.achievement_level??"",justification=value.draft?.teacher_justification??value.assessment?.teacher_justification??"";setDetail(value);setAnalysis(text);setLevel(grade);setReason(justification);setSavedSnapshot(snapshot(text,grade,justification));setEditing(false);setError("");}).catch(cause=>{if(active)setError(cause.message);});return()=>{active=false;};
  },[classroomId,periodId,studentId,competencyId,selectedStudentName]);
  const name=(id:string)=>{const student=students.find(row=>row.id===id);return student?`${student.preferred_name||student.first_name} ${student.last_name}`:"Niño del aula";};
  const pairs=rows.filter(row=>row.competency_id===competencyId),pending=rows.filter(row=>row.evidence_count>0&&!row.valuation_confirmed),current=pairs.find(row=>row.student_id===studentId);
  const needsReason=Boolean(detail&&(detail.timeline.length<3||detail.draft?.details?.information_status==="insufficient"||detail.assessment?.details.information_status==="insufficient"));
  const reviewed=pairs.filter(row=>row.valuation_confirmed).length;
  const visiblePairs=pairs.filter(row=>(rosterFilter==="all"||(rosterFilter==="confirmed"?row.valuation_confirmed:!row.valuation_confirmed))&&name(row.student_id).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").includes(search.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es")));
  const selectedIndex=visiblePairs.findIndex(row=>row.student_id===studentId);
  useEffect(()=>{
    if(!detail||closed||!competencyId)return;
    const next=rows.find(row=>row.competency_id===competencyId&&row.student_id!==studentId&&!row.valuation_confirmed&&row.evidence_count>0);
    if(!next)return;const key=classroomId+':'+periodId+':'+competencyId+':'+next.student_id;
    if(prefetched.current.has(key))return;
    const promise=api<Detail>(`/api/period-evaluations/detail?${new URLSearchParams({classroomId,periodId,studentId:next.student_id,competencyId})}`);
    prefetched.current.clear();prefetched.current.set(key,promise);
    window.setTimeout(()=>{if(prefetched.current.get(key)===promise)prefetched.current.delete(key);},60000);
    void promise.catch(()=>prefetched.current.delete(key));
  },[detail,closed,classroomId,periodId,competencyId,studentId,rows]);
  function selectStudent(id:string){if(id===studentId||!allowLeave())return;setStudentId(id);setDetail(null);setError("");setNotice("");setRosterOpen(false);}
  function choose(id:string){if(!allowLeave())return;setSearch("");setRosterFilter("all");setCompetencyId(id);const next=rows.find(row=>row.competency_id===id&&!row.valuation_confirmed&&row.evidence_count>0)??rows.find(row=>row.competency_id===id);setStudentId(next?.student_id??"");setDetail(null);setError("");setNotice("");}
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
    const saved=detail.draft?{draft_revision:detail.draft.revision}:await writeDraft();
    await api("/api/period-evaluations/save-and-confirm",{classroomId,periodId,studentId,competencyId,evidenceFingerprint:detail.evidence_fingerprint,expectedDraftRevision:saved.draft_revision,achievementLevel:level,teacherAnalysis:analysis,teacherJustification:reason,conclusionText:""});
    const next=pairs.find(row=>row.student_id!==studentId&&!row.valuation_confirmed&&row.evidence_count>0);
    if(onConfirmed)onConfirmed(studentId,competencyId,level);else await onChanged();
    prefetched.current.delete(classroomId+':'+periodId+':'+competencyId+':'+studentId);
    setSavedSnapshot(snapshot(analysis,level,reason));setNotice("Valoración guardada.");setDetail(null);setStudentId(next?.student_id??"");if(!next)setCompetencyId("");
  }catch(cause){setError((cause as Error).message);}finally{setBusy(false);setBusyAction(null);}}
  const previousValuation=detail&&<aside aria-label="Valoración del bimestre anterior" className={styles.previousValuation}><ClipboardList aria-hidden="true"/><div><p className="font-semibold">{detail.previous_valuation?.period_label??'Bimestre anterior'}</p><p>{detail.previous_valuation?.level?'Valoración anterior':detail.previous_valuation?'Sin valoración registrada':'Primer período del año'}</p></div>{detail.previous_valuation?.level&&<strong>{detail.previous_valuation.level}</strong>}</aside>;
  const ageGuidance=detail?.evaluation_guidance&&<aside className={styles.ageGuidance}><BookOpen aria-hidden="true"/><div><p className="font-semibold">Guía breve · {detail.evaluation_guidance.age} años</p><p>{detail.evaluation_guidance.focus??'Revisa el referente del ciclo y los criterios trabajados.'}</p></div></aside>;
  const previousRank=EVALUATION_LEVELS.findIndex(item=>item.value===detail?.previous_valuation?.level);
  const chosenRank=EVALUATION_LEVELS.findIndex(item=>item.value===level);
  return <div className="space-y-6">
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {notice&&<WorkflowFeedback tone="success">{notice}</WorkflowFeedback>}
    {!competencyId?<section aria-label="Competencias del bimestre" className={styles.competencyOverview}>
      <div className={styles.reviewIntro}><div><h2>¿Qué competencia revisamos?</h2><p>Las observaciones ya están guardadas. Ahora tú eliges y confirmas la valoración de cada niño.</p></div><p className={styles.reviewCount}><ChartColumn aria-hidden="true" size={20}/><span><strong>{pending.length}</strong> valoraciones por revisar</span></p></div>
      <div className={styles.competencyList}>{scope.map(card=>{const own=rows.filter(row=>row.competency_id===card.id),confirmed=own.filter(row=>row.valuation_confirmed).length,unobserved=own.filter(row=>!row.evidence_count&&!row.level).length;return <article key={card.id} className={styles.competencyRow} style={competencyTheme(card.id)}>
        <h3><CompetencyIdentity id={card.id} name={card.name}/></h3>
        <div className={styles.competencyProgress}><p><CheckCircle2 aria-hidden="true" size={15}/>{confirmed} de {own.length} valoraciones confirmadas</p><Progress aria-label={`Valoraciones confirmadas: ${card.name}`} value={own.length?confirmed/own.length*100:0} className="h-2"/>{unobserved>0&&<small>{unobserved} {unobserved===1?"niño sin observaciones":"niños sin observaciones"}</small>}</div>
        <Button variant="outline" aria-label={`Revisar ${card.name}`} onClick={()=>choose(card.id)}>Revisar<ArrowRight aria-hidden="true" className="size-4"/></Button>
      </article>;})}</div>{!scope.length&&<p className="mt-4">Todavía no hay competencias trabajadas en este período.</p>}
    </section>:<section className="space-y-4">
      <Button variant="ghost" disabled={busy} onClick={()=>{if(!allowLeave())return;setCompetencyId("");setStudentId("");setDetail(null);setNotice("");}}>← Competencias</Button>
      <h2 className={styles.selectedCompetency} style={competencyTheme(competencyId)}><CompetencyIdentity id={competencyId} name={scope.find(card=>card.id===competencyId)?.name??competencyId}/></h2>
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
            <span className="min-w-0"><span className="block break-words text-sm font-semibold">{name(row.student_id)}</span><span className={`mt-1 flex items-center gap-1 text-xs ${confirmed?"text-[#12634e]":"text-[#88520b]"}`}>{confirmed?<CheckCircle2 aria-hidden="true" className="size-3.5"/>:<Clock3 aria-hidden="true" className="size-3.5"/>}{confirmed?"Valoración confirmada":row.evidence_count?"Elegir valoración":"Sin observaciones"}</span></span>
          </button>;})}{!visiblePairs.length&&<p className="p-3 text-sm text-[#526b87]">No hay niños que coincidan con estos filtros.</p>}</div>
        </aside>
        <div className="min-w-0 space-y-4 rounded-2xl border bg-white p-4 sm:p-5">
      {!detail&&studentId&&!error&&<LoadingState label="Reuniendo sus evidencias…"/>}
      {!studentId&&<p className="p-4 text-[#526b87]">Selecciona un niño para revisar sus evidencias.</p>}
      {detail&&<><header className={styles.studentHeader}><h3 className="text-xl font-bold">{name(studentId)}</h3><span className={styles.studentCompetency} style={competencyTheme(competencyId)} title={scope.find(card=>card.id===competencyId)?.name}><CompetencyIdentity id={competencyId} name={scope.find(card=>card.id===competencyId)?.name??competencyId} compact/></span><div className="flex gap-1"><Button variant="outline" className="min-h-11" aria-label="Alumno anterior" disabled={busy||selectedIndex<=0} onClick={()=>selectStudent(visiblePairs[selectedIndex-1].student_id)}><ArrowLeft aria-hidden="true"/></Button><Button variant="outline" className="min-h-11" aria-label="Siguiente alumno" disabled={busy||selectedIndex<0||selectedIndex>=visiblePairs.length-1} onClick={()=>selectStudent(visiblePairs[selectedIndex+1].student_id)}><ArrowRight aria-hidden="true"/></Button></div></header>
        <section aria-label="Evidencias de aprendizaje" className="space-y-3"><h4 className="flex items-center gap-2 font-bold"><ImageIcon aria-hidden="true" className="size-5 text-[#087d96]"/>Evidencias de aprendizaje</h4>{detail.timeline.map(item=><article key={item.id} className={`rounded-xl border border-[var(--ayni-panel-border)] p-3 text-sm ${item.media_url?"grid items-start gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]":""}`}>{item.media_url&&<PrivateEvidenceAttachment key={item.id} path={item.media_url} compactPreview/>}<div className="min-w-0"><p className="text-xs font-medium text-[#526b87]">{new Date(`${item.observed_on}T12:00:00`).toLocaleDateString("es-PE")}</p><h5 className="mt-1 font-bold">{item.activity_title}</h5><p className="mt-3 whitespace-pre-wrap leading-relaxed">{item.observation_text||"Sin nota escrita."}</p>{item.criterion_text&&<p className="mt-3 rounded-lg bg-[#f3f7fb] p-3 text-[#526b87]"><b>Criterio:</b> {item.criterion_text}</p>}</div></article>)}</section>
        {!detail.timeline.length?<>{previousValuation}<WorkflowFeedback tone="info">Sin evidencia en este período. No es una valoración C. Sigue observando; no se exige una nota.</WorkflowFeedback>{detail.draft&&!detail.assessment&&<AsyncButton busy={busy&&busyAction==="confirmation"} busyLabel="Guardando…" disabled={closed||busy} onClick={()=>void saveObservationPending()}>Guardar pendiente de observación</AsyncButton>}</>:<>
          <section className="space-y-3 rounded-2xl bg-[#edf9fb] p-4"><h4 className="flex items-center gap-2 font-bold"><Sparkles aria-hidden="true" className="size-5 text-[#087d96]"/>Análisis de Ayni</h4>{current?.valuation_confirmed&&!editing?<p className="whitespace-pre-wrap text-sm leading-relaxed text-[#345372]">{analysis}</p>:<Textarea aria-label="Análisis de Ayni" className="min-h-32 bg-white text-sm leading-relaxed" disabled={closed||busy} placeholder="Escribe qué muestran las observaciones." value={analysis} onChange={event=>setAnalysis(event.target.value)}/>}</section>
          <h4 className="flex items-center gap-2 pt-2 font-bold"><ChartColumn aria-hidden="true" className="size-5 text-[#087d96]"/>Valoración docente</h4>
          <div className={styles.valuationReferences}>{previousValuation}{ageGuidance}</div>
          {current?.valuation_confirmed&&!editing?<><p className="rounded-xl bg-[#e5f6ee] p-3 font-semibold text-[#12634e]">Valoración confirmada: {detail.assessment?.achievement_level}</p>{reason&&<p className="whitespace-pre-wrap text-sm leading-relaxed text-[#526b87]">{reason}</p>}<Button variant="outline" disabled={closed} onClick={()=>setEditing(true)}>Corregir valoración</Button></>:<>
            {editing&&<WorkflowFeedback tone="info">Al cambiar esta valoración, su conclusión y el informe de este niño tendrán que prepararse de nuevo. Las versiones anteriores se conservan.</WorkflowFeedback>}
            {detail.draft?.details?.information_status==="insufficient"&&<WorkflowFeedback tone="info">Información insuficiente: {assessmentDisplayText(detail.draft.details.insufficiency_reason,name(studentId))}</WorkflowFeedback>}
            <fieldset disabled={closed||busy}><legend className="mb-3 text-sm font-semibold">Selecciona la valoración</legend><div className={styles.gradeOptions}>{EVALUATION_LEVELS.map(({value})=><label key={value} className={`${styles.gradeOption} ${gradeStyles.level}`} data-level={value} data-selected={level===value}><input className="sr-only" type="radio" name="achievement" checked={level===value} onChange={()=>setLevel(value)}/><b>{value}</b><span>{{AD:'Destacado',A:'Esperado',B:'En proceso',C:'En inicio'}[value]}</span></label>)}</div></fieldset>
            {previousRank>=0&&chosenRank>previousRank&&<WorkflowFeedback tone="info">La nota anterior fue {detail.previous_valuation?.level}. Revisa las evidencias y el contexto antes de confirmar una valoración menor. La decisión sigue siendo tuya.</WorkflowFeedback>}
            {detail.evaluation_guidance&&detail.evaluation_guidance.performances.length>0&&<details className="rounded-xl border px-3 text-sm"><summary className="min-h-11 cursor-pointer py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">Ver desempeños oficiales de {detail.evaluation_guidance.age} años</summary><ul className="list-disc space-y-3 pl-5 pb-3 leading-relaxed text-[#345372]">{detail.evaluation_guidance.performances.map(item=><li key={item.id}>{item.text} <span className="text-xs">(p. {item.page})</span></li>)}</ul><a href={detail.evaluation_guidance.source.url} target="_blank" rel="noreferrer" className="mb-3 inline-flex min-h-11 items-center rounded-lg border px-3 font-medium underline underline-offset-4">Programa Curricular de Educación Inicial · MINEDU</a></details>}
            {needsReason&&<label className="block text-sm font-semibold">Sustento de tu decisión con evidencia limitada<Textarea className="mt-1" disabled={closed||busy} value={reason} onChange={event=>setReason(event.target.value)}/></label>}
            {dirty&&<p role="status" className="text-sm text-[#526b87]">Cambios pendientes de guardar.</p>}
            <div className={styles.actionBar}><AsyncButton variant="outline" busyLabel="Guardando borrador…" busy={busy&&busyAction==="draft"} disabled={closed||busy||!dirty} onClick={()=>void saveDraft()}>Guardar borrador</AsyncButton>
            <AsyncButton busyLabel="Guardando…" busy={busy&&busyAction==="confirmation"} disabled={closed||busy||!level||!analysis.trim()||needsReason&&!reason.trim()} onClick={()=>void confirm()}>Guardar y siguiente</AsyncButton></div>
          </>}
        </>}
      </>}
        </div>
      </div>
    </section>}

  </div>;
}
