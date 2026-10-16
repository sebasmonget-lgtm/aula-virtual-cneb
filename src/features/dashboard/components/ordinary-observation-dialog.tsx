"use client";

import { useEffect, useState } from "react";
import { Check,Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
import { currentObservationText, pendingObservationWork } from "@/src/lib/observation-work.mjs";
import { localDatabaseApiUrl, type ActivityCriterion, type LocalStudent, type PrivateMediaUpload } from "@/src/lib/local-database";
import { AsyncButton, WorkflowFeedback } from "./workflow-ui";
import { DictationRecorder } from "./dictation-recorder";
import { MediaAttachmentInput } from "./media-attachment-input";
import {StudentPhoto} from './student-photo';
import {AnnualCompetencies} from './annual-project-preview';
import {ObservationCompetencyPicker,type ObservationCompetency} from "./observation-competency-picker";
import {prioritizeObservationStudents,observationCountTone} from "@/src/lib/observation-student-priority.mjs";
import {loadSpontaneousObservations} from "@/src/lib/local-database";
import {OrdinaryReviewDialog} from './ordinary-review-dialog';

type SavedObservation = { id: string; student_id: string; raw_text: string | null; corrected_text?: string | null; source_revision: number; status: string };

export function OrdinaryObservationDialog({ students, activity, onClose }: {
  students: LocalStudent[]; activity: { id: string; title: string; criteria: ActivityCriterion[]; initialStudentId?: string; initialCriterionId?: string; momentId?: string;free?:boolean } | null; onClose: () => void;
}) {
  const [studentId, setStudentId] = useState(activity?.initialStudentId ?? "");
  const [criterionId, setCriterionId] = useState(activity?.free?'':activity?.initialCriterionId ?? "");
  const [search,setSearch]=useState(''),[review,setReview]=useState(false);
  const guided=!!activity&&!activity.free;
  const [priorityState,setPriorityState]=useState<{key:string;records:{student_id:string;record_count?:number}[];error:string}|null>(null);
  const [coverageRevision,setCoverageRevision]=useState(0);

  const [freeItems,setFreeItems]=useState<ObservationCompetency[]>([]),[freeIds,setFreeIds]=useState<string[]>([]),[freeDecision,setFreeDecision]=useState(false),[freeSuggested,setFreeSuggested]=useState(false),[freePending,setFreePending]=useState(false),[suggesting,setSuggesting]=useState(false),[freeError,setFreeError]=useState("");
  useEffect(()=>{if(guided)return;let live=true;void loadSpontaneousObservations().then(value=>{if(live)setFreeItems(value.competencies);}).catch(()=>{if(live)setFreeError("No pudimos cargar las competencias. Tu observación puede guardarse sin elegir una.");});return()=>{live=false;};},[guided]);
  const competencyId = guided?activity?.criteria.find(item => item.id === criterionId)?.competency_v4_id:undefined;
  const priorityKey=`${activity?.id}:${competencyId}:${coverageRevision}`;
  const priority=priorityState?.key===priorityKey?priorityState.records:[];
  const priorityError=priorityState?.key===priorityKey?priorityState.error:'';
  const priorityLoading=Boolean(activity&&competencyId&&priorityState?.key!==priorityKey);
  useEffect(() => {
    if (!activity || !competencyId) return;
    const controller = new AbortController();
    void apiFetch(`${localDatabaseApiUrl}/api/period-evaluations/observe-today?activityId=${encodeURIComponent(activity.id)}&competencyId=${encodeURIComponent(competencyId)}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json() as Promise<{students?:{student_id:string;has_evidence:boolean;record_count?:number}[]}>; })
      .then(value => { if (!controller.signal.aborted) { setPriorityState({key:priorityKey,records:value.students??[],error:""}); } })
      .catch(() => { if (!controller.signal.aborted) {setPriorityState({key:priorityKey,records:[],error:"No pudimos comprobar los registros de esta competencia. Puedes elegir a cualquier niño."});} });
    return () => controller.abort();
  }, [activity, competencyId,priorityKey]);
  const [rawText, setRawText] = useState("");
  const [photo, setPhoto] = useState<PrivateMediaUpload | null>(null);
  const [clientRequestId, setClientRequestId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error">("success");
  const [saved, setSaved] = useState<SavedObservation | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [correctedText, setCorrectedText] = useState("");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<SavedObservation[] | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const student = students.find((item) => item.id === studentId);
  const blocked = saving || recordingBusy || preparingPhoto || suggesting;
  const dirty = freePending || pendingObservationWork({ saved, rawText, photo, editMode, correctedText, reason });
  const allowLeave = useUnsavedWork(dirty, blocked, "Esta observación tiene cambios sin guardar. ¿Quieres descartarlos?");
  const close = () => { if (allowLeave()) onClose(); };

  const captureStudents: (LocalStudent & {observation_count:number|null})[] = guided
    ? prioritizeObservationStudents(students,priority)
    : students.map(item=>({...item,observation_count:null}));
  function updateRaw(text:string){
    setRawText(text);
    if(freeSuggested){setFreeIds([]);setFreeDecision(false);setFreeSuggested(false);}
  }
  function chooseStudent(id:string){if(id===studentId)return;if(!allowLeave())return;setStudentId(id);setRawText('');setPhoto(null);setFreeIds([]);setFreeDecision(false);setFreeSuggested(false);setClientRequestId(crypto.randomUUID());setMessage('');}
  async function suggestFree(){if(!studentId||!rawText.trim()||blocked)return;setSuggesting(true);setFreeError('');try{
    const response=await apiFetch(`${localDatabaseApiUrl}/api/diagnostics/spontaneous-observations/preview`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId,contextLabel:'Observación libre',observationText:rawText})});
    const data=await response.json() as {competency_ids?:string[];error?:string};if(!response.ok)throw Error(data.error??'Puedes elegir una competencia manualmente.');
    setFreeIds((data.competency_ids??[]).slice(0,2));setFreeDecision(true);setFreeSuggested(true);
  }catch(cause){setFreeError(cause instanceof Error?cause.message:'No pudimos obtener la sugerencia. Puedes guardar tu observación.');}finally{setSuggesting(false);}}
  async function confirmFree(observation:SavedObservation,ids=freeIds){
    const historyResponse=await apiFetch(`${localDatabaseApiUrl}/api/ordinary-observations/${observation.id}/attributions`,{cache:'no-store'});
    const history=await historyResponse.json() as {latest?:{version:number;state:string;raw_revision:number;confirmed_competency_ids:string[]};error?:string};if(!historyResponse.ok)throw Error(history.error??'No pudimos revisar las competencias.');
    if(history.latest?.raw_revision===observation.source_revision&&['confirmed','unclassified'].includes(history.latest.state)&&JSON.stringify([...history.latest.confirmed_competency_ids].sort())===JSON.stringify([...ids].sort())){setFreePending(false);return;}
    const response=await apiFetch(`${localDatabaseApiUrl}/api/ordinary-observations/${observation.id}/attributions`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({expectedVersion:history.latest?.version??0,competencyIds:ids,criterionIds:[],reason:'Decisión docente al guardar la observación libre'})});
    const data=await response.json() as {error?:string};if(!response.ok)throw Error(data.error??'No pudimos confirmar las competencias.');setFreePending(false);
  }
  async function retryFree(){if(!saved||blocked)return;setSaving(true);setMessage('');try{await confirmFree(saved);setFeedbackTone('success');setMessage('Competencias confirmadas.');}catch{setFeedbackTone('error');setMessage('Tu observación está guardada. Falta confirmar sus competencias; puedes volver a intentarlo.');}finally{setSaving(false);}}
  async function save(text = rawText, fromDictation = false) {
    if (!studentId || (!text.trim() && !photo) || saving || (recordingBusy && !fromDictation) || preparingPhoto) return;
    const useFreeDecision=freeDecision&&(!freeSuggested||text===rawText);
    setSaving(true); setMessage("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/ordinary-observations`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId, clientRequestId, sourceKind: guided ? "guided" : "spontaneous",
          activityId: activity?.id ?? null, criterionId: guided?criterionId || null:null, momentId: guided?activity?.momentId ?? null:null, rawText: text || null,
          automaticSuggestion:!guided&&!useFreeDecision,
          photo: photo ? { base64: photo.base64, mimeType: photo.mimeType } : null }),
      });
      const data = await response.json() as { error?: string; observation: SavedObservation };
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la observación.");
      setRawText(text);
      setSaved(data.observation);
      if(!guided&&useFreeDecision){setFreePending(true);try{await confirmFree(data.observation);}catch{setFeedbackTone("error");setMessage("Tu observación está guardada. Falta confirmar sus competencias; puedes volver a intentarlo.");return;}}
      setCoverageRevision(value=>value+1);
      setFeedbackTone("success"); setMessage("Observación guardada para el niño seleccionado.");
    } catch (error) { setFeedbackTone("error"); setMessage(error instanceof Error ? error.message : "No se pudo guardar. Tu texto sigue aquí; vuelve a intentarlo."); }
    finally { setSaving(false); }
  }

  async function revise(action: "correct" | "void") {
    if (!saved || saving) return;
    setSaving(true); setMessage("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/ordinary-observations/${saved.id}/revisions`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, correctedText, reason, expectedRevision: saved.source_revision }),
      });
      const data = await response.json() as { error?: string; observation: SavedObservation };
      if (!response.ok) throw new Error(data.error || "No se pudo revisar la observación.");
      setSaved({ ...data.observation, corrected_text: action === "correct" ? correctedText : saved.corrected_text });
      setFreeDecision(false);setFreePending(false);
      setEditMode(false); setReason("");setCoverageRevision(value=>value+1);
      setFeedbackTone("success");
      setMessage(action === "void" ? "Observación anulada; el original queda en el historial." : "Corrección guardada; el original permanece intacto. Revisa y confirma sus competencias para usar esta versión en Evaluar.");
    } catch (error) { setFeedbackTone("error"); setMessage(error instanceof Error ? error.message : "No se pudo revisar."); }
    finally { setSaving(false); }
  }

  function startAnother() {
    if (!allowLeave()) return;
    setStudentId(""); setCriterionId(guided?activity?.initialCriterionId ?? "":''); setRawText(""); setPhoto(null); setSaved(null); setEditMode(false);setSearch('');
    setFreeIds([]);setFreeDecision(false);setFreeSuggested(false);setFreePending(false);setFreeError("");setCorrectedText(""); setReason(""); setMessage(""); setHistory(null); setClientRequestId(crypto.randomUUID());
  }

  async function loadHistory() {
    setHistoryBusy(true); setMessage("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/ordinary-observations`);
      const data = await response.json() as { error?: string; observations: SavedObservation[] };
      if (!response.ok) throw new Error(data.error || "No se pudo abrir el historial.");
      setHistory(data.observations);
    } catch (error) { setFeedbackTone("error"); setMessage(error instanceof Error ? error.message : "No se pudo abrir el historial."); }
    finally { setHistoryBusy(false); }
  }

  if(review&&saved)return <OrdinaryReviewDialog students={students} initialObservationId={saved.id} onClose={()=>{setReview(false);setFreeDecision(false);setCoverageRevision(value=>value+1);}}/>;
  return <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
    <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden rounded-2xl p-0 sm:max-w-3xl">
      <DialogHeader className="shrink-0 border-b px-6 py-5">
        <DialogTitle>{guided?'Registrar observación guiada':'Registrar observación libre'}</DialogTitle>
        <DialogDescription>{activity ? `Durante: ${activity.title}` : "Escribe o dicta lo que viste o escuchaste."}</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-4">
        <fieldset disabled={Boolean(saved) || blocked}>
          <legend className="mb-2 text-base font-semibold">¿A quién observaste? <span className="text-red-700">*</span></legend>
          <input aria-label="Buscar niño o niña" placeholder="Buscar niño o niña…" value={search} onChange={event=>setSearch(event.target.value)} className="mb-3 min-h-11 w-full rounded-xl border bg-white px-3 text-sm"/>
          <div className="max-h-64 overflow-y-auto pr-1">
          {priorityError && <p role="status" className="mb-2 text-sm">{priorityError}</p>}
          {guided&&competencyId&&<p className="mb-3 text-xs text-[#526b87]">{priorityLoading?'Consultando registros…':'Primero aparecen quienes tienen menos registros. Los colores indican cantidad, no nivel de aprendizaje.'}</p>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{captureStudents.filter(item=>(item.full_name??item.name).toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).map(item=>{const count=item.observation_count,tone=observationCountTone(count);const colors={none:'bg-[#f3f5f7] border-[#d7dfe5]',one:'bg-[#fff7dc] border-[#e9d9a3]',multiple:'bg-[#e8f7ef] border-[#bcded0]',unknown:'bg-white border-[#d7dfe5]'};return <button key={item.id} type="button" aria-pressed={studentId===item.id} onClick={()=>chooseStudent(item.id)} className={`flex min-h-20 items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm ${colors[tone as keyof typeof colors]} ${studentId===item.id?'outline-2 outline-[#087d96] font-semibold':'hover:border-[#087d96]'}`}><StudentPhoto id={item.id} name={item.name}/><span className="min-w-0 break-words">{studentId===item.id&&<Check className="mr-1 inline size-4"/>}{item.full_name??item.name}{guided&&competencyId&&<small className="mt-1 block font-normal text-[#365773]">{count===null?'Registros sin consultar':`${count} obs.`}</small>}</span></button>;})}</div>
          </div>
          {!studentId && <p className="mt-2 text-sm text-[#7a3c12]">Elige un niño para escribir o dictar tu observación.</p>}
        </fieldset>
        {!saved&&guided&&criterionId&&<section className="rounded-xl bg-[#f4efff] p-3 text-sm"><b>Criterio de observación:</b><p className="mt-1">{activity?.criteria.find(item=>item.id===criterionId)?.criterion_text}</p>{competencyId&&<AnnualCompetencies ids={[competencyId]} names={new Map(activity?.criteria.map(item=>[item.competency_v4_id??'',item.competency_text])??[])}/>}</section>}
        {!saved&&!guided&&<p className="rounded-xl bg-[#edf9f4] p-3 text-sm">Observación libre · Puedes elegir otra competencia o dejarla sin competencia. La actividad no determina tu selección.</p>}
        {!saved && guided && !activity?.initialCriterionId && activity && activity.criteria.length > 0 && <div>
          <label htmlFor="ordinary-criterion" className="mb-2 block text-sm font-semibold">Criterio observado <span className="font-normal">(opcional)</span></label>
          <select id="ordinary-criterion" value={criterionId} onChange={(event) => setCriterionId(event.target.value)}
            disabled={!studentId || saving || recordingBusy||suggesting} className="min-h-11 w-full rounded-xl border bg-white px-3">
            <option value="">Todavía no elijo un criterio</option>
            {activity.criteria.map((item) => <option key={item.id} value={item.id}>{item.criterion_text}</option>)}
          </select>
          {criterionId && <p className="mt-1 text-xs text-muted-foreground">El criterio elegido por ti quedará confirmado para esta observación.</p>}
        </div>}
        {history && <section className="rounded-xl border bg-[#f6f9fd] p-3">
          <h3 className="font-semibold">Observaciones guardadas</h3>
          {history.length === 0 ? <p className="mt-2 text-sm">Todavía no hay observaciones.</p> :
            <div className="mt-2 max-h-44 space-y-2 overflow-y-auto">{history.slice(0, 20).map((item) =>
              <button key={item.id} type="button" className="block w-full rounded-lg border bg-white p-2 text-left text-sm hover:border-[#087d96]"
                disabled={blocked} onClick={() => { if (!allowLeave()) return; setSaved(item); setStudentId(item.student_id); setHistory(null); setEditMode(false); setMessage(""); }}>
                <span className="font-semibold">{students.find((child) => child.id === item.student_id)?.name ?? "Alumno"} · {item.status === "corrected" ? "Corregida" : item.status === "voided" ? "Anulada" : "Guardada"}</span>
                <span className="mt-1 block truncate">{item.corrected_text ?? item.raw_text ?? "Foto"}</span>
              </button>)}</div>}
        </section>}
        {!saved ? <>
          <div><label htmlFor="ordinary-raw-text" className="mb-2 block font-semibold">¿Qué observaste?</label>
            <Textarea id="ordinary-raw-text" value={rawText} onChange={(event) => updateRaw(event.target.value)}
              disabled={!studentId || saving || recordingBusy||suggesting} maxLength={4000} className="min-h-32 bg-white"
              placeholder="Cuenta qué hizo o dijo, con un ejemplo concreto." /></div>
          {studentId && <DictationRecorder key={studentId} iconOnly autoTranscribe studentId={studentId} purpose="raw_observation" rawTranscript context={guided?activity?.title??'Observación guiada':'Observación libre'} currentText={rawText} disabled={saving||suggesting} onBusyChange={setRecordingBusy} onTranscribed={async(text,saveNow)=>{updateRaw(text);if(saveNow)await save(text,true);}}/>}
          <div className="rounded-xl bg-[#edf7ff] p-4"><MediaAttachmentInput key={studentId} studentId={studentId} context={guided?activity?.title??'Observación guiada':'Observación libre'} media={photo} onMedia={setPhoto} onTranscribed={()=>{}} onBusyChange={setPreparingPhoto} disabled={!studentId||saving||recordingBusy||suggesting} photoOnly buttonInputs/></div>
          {!guided&&<section className="space-y-3 rounded-xl border border-[#d6e5ef] bg-[#f6faff] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">Competencias relacionadas (opcional)</h3><Button variant="outline" disabled={blocked||!studentId||!rawText.trim()} onClick={()=>void suggestFree()}><Sparkles size={18}/>{suggesting?'Buscando sugerencia…':'Ayni sugiere'}</Button></div><p className="text-sm text-[#526b87]">Elige hasta dos competencias. Revisa la sugerencia antes de guardar. La foto no se analiza.</p>{freeSuggested&&<p role="status" className="text-sm text-[#25624e]">{freeIds.length?'Sugerencia lista. Puedes cambiarla o quitarla; la confirmarás al guardar.':'No hay una competencia clara. Puedes guardar sin elegir una.'}</p>}{freeError&&<p role="status" className="text-sm">{freeError}</p>}<ObservationCompetencyPicker items={freeItems} selected={freeIds} onChange={ids=>{setFreeIds(ids);setFreeDecision(true);setFreeSuggested(false);}} disabled={blocked||!studentId} compact/><Button variant="ghost" disabled={blocked||!studentId} onClick={()=>{setFreeIds([]);setFreeDecision(true);setFreeSuggested(false);}}>Dejar sin competencia</Button></section>}

        </> : <section className="rounded-xl border bg-[#f6f9fd] p-4">
          <p className="font-semibold">{student?.name} · {saved.status === "voided" ? "Anulada" : saved.status === "corrected" ? "Corregida" : "Guardada"}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{currentObservationText(saved) || "Foto sin texto"}</p>
          {!guided&&freePending&&<Button className="mt-3" disabled={blocked} onClick={()=>void retryFree()}>Confirmar competencias elegidas</Button>}{!guided&&freeDecision&&!freePending&&<div className="mt-3"><AnnualCompetencies ids={freeIds} names={new Map(freeItems.map(item=>[item.id,item.name]))}/><p className="text-xs text-[#526b87]">{freeIds.length?'Competencias confirmadas por ti.':'Guardada sin competencia.'}</p></div>}{(!guided||saved.status==='corrected')&&saved.status!=='voided'&&<Button variant="outline" className="mt-3 whitespace-normal" onClick={()=>setReview(true)}>Revisar o cambiar competencias</Button>}
          {saved.corrected_text != null && <details className="mt-3 text-sm"><summary className="min-h-11 cursor-pointer py-2">Ver texto original</summary><p className="whitespace-pre-wrap">{saved.raw_text ?? "Foto sin texto"}</p></details>}
          <p className="mt-2 text-xs text-muted-foreground">El texto original y el alumno asociado no se modifican por una corrección.</p>
          {saved.status !== "voided" && !editMode && <Button type="button" variant="outline" className="mt-3" onClick={() => { setCorrectedText(currentObservationText(saved)); setEditMode(true); }}>Corregir o anular</Button>}
          {editMode && <div className="mt-3 space-y-3">
            <label className="block text-sm font-semibold">Texto corregido<Textarea value={correctedText} onChange={(event) => setCorrectedText(event.target.value)} maxLength={4000} className="mt-1 bg-white" /></label>
            <label className="block text-sm font-semibold">Motivo de la revisión<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3" /></label>
            <div className="flex flex-wrap gap-2"><AsyncButton busy={saving} busyLabel="Guardando..." disabled={!correctedText.trim() || reason.trim().length < 3} onClick={() => void revise("correct")}>Guardar corrección</AsyncButton>
              <Button variant="outline" disabled={saving || reason.trim().length < 3} onClick={() => void revise("void")}>Anular observación</Button>
              <Button variant="ghost" disabled={blocked} onClick={() => { if (allowLeave()) { setEditMode(false); setReason(""); } }}>Cancelar</Button></div>
          </div>}
        </section>}
        {!saved && dirty && <p role="status" className="text-sm text-[#526b87]">Sin guardar · Tu observación se conserva mientras esta ventana esté abierta.</p>}
        {message && <WorkflowFeedback tone={feedbackTone}>{message}</WorkflowFeedback>}
      </div>
      <DialogFooter className="shrink-0 border-t px-6 py-4">
        <Button variant="ghost" onClick={close} disabled={blocked}>Cerrar</Button>
        {!saved && <AsyncButton variant="outline" busy={historyBusy} busyLabel="Cargando..." disabled={saving || recordingBusy}
          onClick={() => void loadHistory()}>Ver observaciones</AsyncButton>}
        {saved ? <Button variant="outline" disabled={blocked} onClick={startAnother}>Registrar otra</Button> :
          <AsyncButton busy={saving} busyLabel="Guardando..." disabled={!studentId || (!rawText.trim() && !photo) || recordingBusy || preparingPhoto || suggesting}
            onClick={() => void save()}>{!guided&&freeDecision?freeIds.length?"Guardar y confirmar competencias":"Guardar sin competencia":"Guardar observación"}</AsyncButton>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
