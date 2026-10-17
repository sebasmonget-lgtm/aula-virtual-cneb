"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveAndConfirmFamilyInterview, familyInterviewAttachmentUrl,
  loadFamilyInterview, loadFamilyInterviewStatuses, loadStudentPedagogicalProfile, saveFamilyInterview,
  type FamilyInterview, type FamilyInterviewDetails, type FamilyInterviewStatus } from "@/src/lib/local-database";
import { SaveConfirmation, useSaveConfirmation } from "./save-confirmation";
import { AsyncButton, LoadingState } from "./workflow-ui";
import { InterviewAudioRecorder } from "./interview-audio-recorder";
import { hasFamilyInterviewAnswers, familyInterviewQuestionGroups, familyInterviewStructuredOptionsVersion, interviewLanguageOptions,
  interviewInterestOptions, interviewAutonomyOptions, interviewAutonomyLevels, interviewCommunicationOptions,
  interviewEmotionalSupportOptions, interviewSocialPlayOptions, interviewHomeActivityOptions,
  interviewCommunityOptions, interviewParticipationSupportOptions, interviewPreviousEducationOptions,
  interviewPreviousEducationTypeOptions, interviewLanguageLabel } from "@/src/lib/family-interview-contract.mjs";
import { familyContextLabels } from "@/src/lib/local-database";
import { displayPersonName } from "@/src/lib/person-name.mjs";
import { AyniMascot } from "./initial-journey-ui";
import { StudentPhoto } from "./student-photo";
import { countFamilyInterviewAnswers, familyInterviewAnswerFields } from "@/src/lib/family-interview-progress.mjs";
import { interviewOptionIds, toggleInterviewOption } from "@/src/lib/diagnostic-ui-flow.mjs";
import styles from "./interviews-workspace.module.css";
import { summarizeFamilyInterview } from "@/src/lib/family-interview-projection.mjs";

export function useFamilyInterviewStatusMap(refreshKey: string, enabled = true) {
  const [statuses, setStatuses] = useState<Record<string, FamilyInterviewStatus>>({});
  const [error, setError] = useState("");
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [answerCounts,setAnswerCounts]=useState<Record<string,number>>({});
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadFamilyInterviewStatuses().then(({ students }) => {
      if (active) { setStatuses(Object.fromEntries(students.map((item) => [item.student_id, item.status]))); setConfirmedIds(students.filter(item => item.has_confirmed_answers).map(item => item.student_id)); setAnswerCounts(Object.fromEntries(students.map(item=>[item.student_id,item.answered_questions??0]))); setLoaded(true); setError(""); }
    }).catch(() => { if (active) setError("No se pudo actualizar el estado de las entrevistas."); });
    return () => { active = false; };
  }, [refreshKey, enabled]);
  const updateInterview=useCallback((interview:FamilyInterview)=>{
    setStatuses(current=>({...current,[interview.student_id]:interview.status==="confirmed"?"confirmed":hasFamilyInterviewAnswers(interview.details)?"partial":"not_started"}));
    setAnswerCounts(current=>({...current,[interview.student_id]:countFamilyInterviewAnswers(interview.details)}));
  },[]);
  return { statuses, confirmedIds, answerCounts, loaded, error, updateInterview };
}
export function FamilyInterviewStatusBadge({ status }: { status?: FamilyInterviewStatus }) {
  if (!status) return null;
  const styles = {
    confirmed: "border-[#a8dbc1] bg-[#e6f7ed] text-[#176442]",
    partial: "border-[#ecd29a] bg-[#fff3db] text-[#88591d]",
    not_started: "border-[#d8e2ed] bg-[#f4f7fb] text-[#5a6d83]",
  };
  const labels = { confirmed: "Confirmada", partial: "En progreso", not_started: "Pendiente" };
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${styles[status]}`}>{labels[status]}</span>;
}
type TagField = "interest_tags" | "language_tags" | "communication_tags" | "emotional_support_tags" |
  "social_play_tags" | "home_activity_tags" | "community_tags" | "participation_support_tags";
type TextField = "interests" | "autonomy_context" | "communication_context" | "language_context" |
  "emotional_support_context" | "social_context" | "home_activity_example" | "family_community_context" |
  "family_community_enjoyed" | "participation_support_context" | "family_expectation" | "family_context" | "other_interest_text" | "other_language_text" | "other_community_text";

export type FamilyInterviewEditorHandle = { flush: () => Promise<boolean> };
export function FamilyInterviewEditor({ studentId, studentName: rawStudentName, onBack, onSaved, onNext, layout="wizard", ref }: {
  studentId: string; studentName: string; onBack?: () => void; onSaved?: (interview: FamilyInterview) => void;
  printContext?: { institution?: string; classroom?: string }; onNext?: () => void; layout?: "wizard" | "stacked"; ref?: Ref<FamilyInterviewEditorHandle>;
}) {
  const { confirmation, confirm } = useSaveConfirmation();
  const actionPending = useRef(false);
  const studentName = displayPersonName(rawStudentName);
  const [draft, setDraft] = useState<FamilyInterview | null>(null);
  const [confirmed, setConfirmed] = useState<FamilyInterview | null>(null);
  const [details, setDetails] = useState<FamilyInterviewDetails>({});
  const detailsRef = useRef(details);
  useEffect(() => { detailsRef.current = details; }, [details]);
  const [step, setStep] = useState(0);
  const savedText=useRef("");
  const autosave=useRef<Promise<void>|null>(null);
  const [autosaveRevision, setAutosaveRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed,setLoadFailed]=useState(false);
  const [loadRetry,setLoadRetry]=useState(0);
  const [busy, setBusy] = useState(false);
  const [autoSaving,setAutoSaving]=useState(false);
  const [savedSnapshot,setSavedSnapshot]=useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [activeAudioKeys, setActiveAudioKeys] = useState<string[]>([]);
  const audioBusy = activeAudioKeys.length > 0;
  const readOnly = Boolean(confirmed && !draft && !creatingVersion);
  const questions = familyInterviewQuestionGroups(studentName)[0].questions;

  useEffect(() => {
    let active = true;
    loadFamilyInterview(studentId).then((value) => {
      if (active) { setLoadFailed(false);setDraft(value.draft); setConfirmed(value.confirmed); setDetails(value.draft?.details ?? value.confirmed?.details ?? {}); savedText.current=JSON.stringify(value.draft?.details ?? value.confirmed?.details ?? {});setSavedSnapshot(JSON.stringify(value.draft?.details ?? value.confirmed?.details ?? {})); }
    }).catch((cause) => { if (active) {setLoadFailed(true);setError(cause instanceof Error ? cause.message : "No se pudo abrir la entrevista.");} })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentId,loadRetry]);
  useEffect(()=>{
    if(loading||loadFailed||readOnly||busy||audioBusy||JSON.stringify(details)===savedText.current)return;
    const timer=window.setTimeout(()=>{if(autosave.current)return;const value=detailsRef.current;setAutoSaving(true);setError("");
      autosave.current=saveFamilyInterview(studentId,value).then(result=>{setDraft(result);savedText.current=JSON.stringify(value);setSavedSnapshot(JSON.stringify(value));setMessage("Avance guardado automáticamente.");onSaved?.(result);setAutosaveRevision(v=>v+1);}).catch(()=>setError("No pude guardar automáticamente. Tus respuestas siguen aquí; al volver o terminar intentaré guardarlas.")).finally(()=>{autosave.current=null;setAutoSaving(false);});
    },900);return()=>window.clearTimeout(timer);
  },[details,loading,loadFailed,readOnly,busy,audioBusy,studentId,autosaveRevision,onSaved]);
  useEffect(() => {
    if (loading || loadFailed || readOnly) return;
    const guard = (event: BeforeUnloadEvent) => {
      if (JSON.stringify(detailsRef.current) === savedText.current && !autosave.current) return;
      event.preventDefault(); event.returnValue = "";
    };
    const navigation = (event: Event) => {
      if (JSON.stringify(detailsRef.current) === savedText.current && !autosave.current) return;
      if (!window.confirm("Hay respuestas pendientes de guardar. ¿Quieres salir sin guardarlas?")) event.preventDefault();
    };
    window.addEventListener("ayni-before-navigation", navigation);
    window.addEventListener("beforeunload", guard);
    return () => { window.removeEventListener("beforeunload", guard); window.removeEventListener("ayni-before-navigation", navigation); };
  }, [loading, loadFailed, readOnly]);
  const answerFields:Record<string,string[]>=familyInterviewAnswerFields;
  const optionLabels = new Map(Object.entries({interest_tags:interviewInterestOptions,social_play_tags:interviewSocialPlayOptions,home_activity_tags:interviewHomeActivityOptions,language_tags:interviewLanguageOptions,communication_tags:interviewCommunicationOptions,community_tags:interviewCommunityOptions,participation_support_tags:interviewParticipationSupportOptions}).flatMap(([field,options]) => options.map(o => [`${field}:${o.id}`, o.label])));
  const answerFor=(key:string)=>(answerFields[key]??[key]).flatMap(field=>{const v=(details as Record<string,unknown>)[field];return Array.isArray(v)?v.map(id=>optionLabels.get(`${field}:${id}`)??String(id)):typeof v==="string"&&v.trim()?[v]:[];}).join(" · ");
  const answered=questions.filter(q=>answerFor(q.key)).length;
  const changeText = (field: TextField, value: string) =>
    setDetails((current) => ({ ...current, [field]: value, structured_options_version: familyInterviewStructuredOptionsVersion }));
  function chips(field: TagField, options: readonly { id: string; label: string }[], label: string) {
    return <fieldset><legend className="text-sm font-semibold text-[#405a73]">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">{options.map((option) => {
        const selected = (details[field] ?? []).some(id=>interviewOptionIds(field,option.id).includes(id));
        return <button key={option.id} type="button" disabled={readOnly || busy} aria-pressed={selected}
          onClick={() => setDetails((current) => {
            const previous = current[field] ?? [];
            const next = toggleInterviewOption(previous,field,option.id);
            return { ...current, [field]: next, structured_options_version: familyInterviewStructuredOptionsVersion,
              ...(field === "language_tags" ? {
                primary_language_tag: next.includes(current.primary_language_tag ?? "") ? current.primary_language_tag : undefined,
                home_language_uses: current.home_language_uses?.filter((row) => next.includes(row.language_tag)),
                other_language_text: next.includes("other") ? current.other_language_text : undefined,
              } : {}),
              ...(field === "interest_tags" && !next.includes("other") ? { other_interest_text: undefined } : {}),
              ...(field === "community_tags" && !next.includes("other") ? { other_community_text: undefined } : {}) };
          })}
          className={`${styles.interviewChoice} inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium ${selected ? "border-[#087d96] bg-[#e4f7f9] text-[#075a6d]" : "border-[var(--ayni-panel-border)] bg-white text-[#405a73]"}`}><span className={`grid size-5 shrink-0 place-items-center rounded border ${selected?"border-[#087d96] bg-[#087d96] text-white":"border-[#8ba5b5]"}`} aria-hidden="true">{selected&&<Check className="size-4"/>}</span>{option.label}</button>;
      })}</div></fieldset>;
  }
  async function transcribeField(field: TextField, maxLength: number, text: string, saveNow: boolean) {
    if (text.length > maxLength) throw new Error(`La respuesta debe tener hasta ${maxLength} caracteres. Puedes acortarla antes de guardar.`);
    const updated = { ...detailsRef.current, [field]: text, structured_options_version: familyInterviewStructuredOptionsVersion };
    detailsRef.current = updated; setDetails(updated);
    if (saveNow) {
      await autosave.current;
      const result = await saveFamilyInterview(studentId, updated);
      savedText.current=JSON.stringify(updated);setSavedSnapshot(JSON.stringify(updated)); setDraft(result);
      setMessage("Respuesta guardada en borrador."); onSaved?.(result);
    }
  }
  function shortField(field: TextField, label: string, maxLength = 300) {
    return <div><label htmlFor={`family-${field}`} className="block text-sm font-semibold text-[#405a73]">{label}</label><div className="ayni-field-shell mt-2 flex items-start gap-2 rounded-xl border bg-white p-2">
      <textarea id={`family-${field}`} rows={layout === "stacked" ? 2 : 4} className={(layout === "stacked" ? "min-h-12 " : "min-h-24 ")+"min-w-0 flex-1 resize-y bg-transparent p-2 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#087d96]"}
        disabled={readOnly || busy} maxLength={maxLength} value={details[field] ?? ""}
        onChange={(event) => changeText(field, event.target.value)} />
      {!readOnly && <InterviewAudioRecorder disabled={busy} studentId={studentId} question={questions.find(q=>(answerFields[q.key]??[q.key]).includes(field))?.label ?? questions[step].label}
        currentText={details[field] ?? ""} onBusyChange={(active) => setActiveAudioKeys((current) => {
          if (current.includes(field) === active) return current;
          return active ? [...current, field] : current.filter((key) => key !== field);
        })} onTranscribed={(text, saveNow) => transcribeField(field, maxLength, text, saveNow)} />}</div>{layout === "stacked" && <small className={styles.counter}>{(details[field]??"").length}/{maxLength}</small>}</div>;
  }
  async function run(work: () => Promise<void>) {
    if (actionPending.current || busy || audioBusy) return;
    actionPending.current = true;
    setBusy(true); setError(""); setMessage("");
    try { await autosave.current; await work(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { actionPending.current = false; setBusy(false); }
  }
  async function saveDraft(exitAfter = false) {
    const result = await saveFamilyInterview(studentId, detailsRef.current); savedText.current=JSON.stringify(result.details);setSavedSnapshot(JSON.stringify(result.details));
    setDraft(result); setDetails(result.details); setMessage("Avance guardado. Puedes continuar después.");
    onSaved?.(result); if (exitAfter) onBack?.();
  }
  async function save() {
    const result = await saveAndConfirmFamilyInterview(studentId, details);
    setConfirmed(result); setDraft(null); setCreatingVersion(false); setDetails(result.details);
    savedText.current=JSON.stringify(result.details);setSavedSnapshot(JSON.stringify(result.details));
    setMessage(""); confirm("¡Entrevista confirmada!", `Las respuestas de ${studentName} quedaron guardadas.`); onSaved?.(result);
  }
  useImperativeHandle(ref,()=>({flush:async()=>{
    if(loading||busy||audioBusy||actionPending.current)return false;
    if(readOnly||loadFailed)return true;
    try{await autosave.current;if(JSON.stringify(detailsRef.current)!==savedText.current){actionPending.current=true;setBusy(true);await saveDraft();}return true;}
    catch(cause){setError(cause instanceof Error?cause.message:"No se pudo guardar el avance. Inténtalo de nuevo.");return false;}
    finally{actionPending.current=false;setBusy(false);}
  }}));
  function renderQuestion(question: typeof questions[number], index: number) { return <article key={question.key} className={layout === "stacked" ? styles.questionCard : "min-w-0 min-h-72 space-y-5 rounded-2xl border bg-white p-5"}>      <h3 className={styles.questionTitle}>{layout === "stacked" && <span>{index+1}</span>}{question.label}</h3>
      {question.hint && <p className="text-sm text-[#526b87]">{question.hint}</p>}
      {question.key === "interests" && <>{chips("interest_tags", interviewInterestOptions.filter(option=>option.id!=="nature"), "Intereses que reconoce la familia")}
        {details.interest_tags?.includes("other") && shortField("other_interest_text", "¿Qué otro interés?",200)}
        {shortField("interests", "Un ejemplo corto, si quieres")}</>}
      {question.key === "autonomy_context" && <><p className="text-sm text-[#526b87]">Marca solo las rutinas que quieras contar. Esto no es una prueba.</p>
        <div className="space-y-3">{interviewAutonomyOptions.map((item) => <fieldset key={item.id} className="rounded-xl border p-3"><legend className="font-semibold">{item.label}</legend>
          <div className="mt-2 flex flex-wrap gap-2">{interviewAutonomyLevels.map((level) => {
            const selected = details.autonomy_routines?.some((row) => row.id === item.id && row.level === level.id);
            return <button key={level.id} type="button" disabled={readOnly || busy} aria-pressed={Boolean(selected)}
              onClick={() => setDetails((v) => ({ ...v, autonomy_routines: [
                ...(v.autonomy_routines ?? []).filter((row) => row.id !== item.id),
                ...(!selected ? [{ id: item.id, level: level.id as "alone" | "sometimes" | "much_help" }] : []),
              ], structured_options_version: familyInterviewStructuredOptionsVersion }))}
              className={`${styles.interviewChoice} flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm ${selected ? "border-[#087d96] bg-[#e4f7f9]" : "border-[var(--ayni-panel-border)]"}`}><span className={`grid size-4 shrink-0 place-items-center rounded-full border ${selected?"border-[#087d96] bg-[#087d96] text-white":"border-[#71869d]"}`} aria-hidden="true">{selected&&<Check className="size-3"/>}</span>{level.label}</button>;
          })}</div></fieldset>)}</div>{shortField("autonomy_context", "¿Quieres comentar algo más? (opcional)")}</>}
      {question.key === "communication_context" && <>{chips("communication_tags", interviewCommunicationOptions, "¿Cómo suele comunicarse?")}
        {shortField("communication_context", "Algo más que quieras contar (opcional)")}
        {chips("language_tags", interviewLanguageOptions, "¿Qué lenguas escucha o usa en casa?")}
        {details.language_tags?.includes("other") && shortField("other_language_text", "¿Qué otra lengua?", 200)}
        {(details.language_tags ?? []).map((tag) => <label key={tag} className="block text-sm">¿Con quién escucha o usa {interviewLanguageLabel(tag, details.other_language_text).toLowerCase()}? (opcional)
          <input className="mt-2 min-h-11 w-full rounded-xl border px-3" disabled={readOnly} maxLength={100}
            value={details.home_language_uses?.find((row) => row.language_tag === tag)?.with_whom ?? ""}
            onChange={(e) => setDetails((v) => ({ ...v, structured_options_version: familyInterviewStructuredOptionsVersion, home_language_uses: [
              ...(v.home_language_uses ?? []).filter((row) => row.language_tag !== tag),
              ...(e.target.value.trim() ? [{ language_tag: tag, with_whom: e.target.value }] : []),
            ] }))} /></label>)}</>}
      {question.key === "emotional_support_context" && <>{chips("emotional_support_tags", interviewEmotionalSupportOptions, "¿Qué suele ayudarle?")}
        {shortField("emotional_support_context", "¿Cómo suele reaccionar? Un ejemplo breve (opcional)")}</>}
      {question.key === "social_context" && <>{chips("social_play_tags", interviewSocialPlayOptions, "Elige las formas de jugar que reconoces")}
        {shortField("social_context", "Un ejemplo, si quieres")}</>}
      {question.key === "home_activity_example" && <>{chips("home_activity_tags", interviewHomeActivityOptions, "Acciones que la familia ha visto en casa")}
        {shortField("home_activity_example", "Si quieres, cuéntanos un ejemplo")}</>}
      {question.key === "family_community_context" && <>{chips("community_tags", interviewCommunityOptions, "Temas, lugares o actividades de esas experiencias")}
        {details.community_tags?.includes("other") && shortField("other_community_text", "¿Qué otra actividad o lugar?", 200)}
        {shortField("family_community_context", "Algo más sobre su vida familiar o comunidad (opcional)")}
        {shortField("family_community_enjoyed", "¿Hay alguna experiencia que disfrute especialmente? (opcional)")}</>}
      {question.key === "participation_support_context" && <>{chips("participation_support_tags", interviewParticipationSupportOptions, "Apoyos que le ayudan, según la familia")}
        {shortField("participation_support_context", "Algo más que deberíamos saber (opcional)")}</>}
      {question.key === "family_expectation" && <><p className="text-sm text-[#526b87]">Tu deseo para este año es una expectativa familiar; no es una evaluación del niño.</p>
        {shortField("family_expectation", "Respuesta corta (opcional)")}</>}
</article>; }
  if (loading) return <LoadingState label="Abriendo entrevista..." />;
  if(loadFailed)return <div role="alert" className="rounded-xl border bg-white p-5"><p>{error}</p><Button variant="outline" className="mt-3" onClick={()=>{setLoading(true);setLoadFailed(false);setError("");setLoadRetry(value=>value+1);}}>Reintentar</Button></div>;
  return <section className={layout === "stacked" ? styles.interview : "diagnostic-panel space-y-4 p-4 md:p-6"}>
    {onBack && <Button variant="outline" className="diagnostic-back-button" disabled={busy || audioBusy} onClick={() => { if(readOnly) onBack(); else void run(() => saveDraft(true)); }}><ArrowLeft /> Volver a la lista de niños</Button>}
    <header className="flex items-center gap-4">{layout === "stacked" ? <StudentPhoto id={studentId} name={studentName} className={styles.headingPhoto}/> : <AyniMascot size="medium" pose="interview"/>}<div>
      <h2 className="text-base font-semibold">Entrevista de {studentName}</h2>
      <p className="mt-1 text-sm text-[#526b87]">Marca varias opciones o añade un ejemplo. Todas las respuestas son opcionales.</p>
      </div></header>
    {layout==="stacked"&&<p role="status" className={styles.interviewStatus} data-confirmed={readOnly}>{readOnly?"Entrevista confirmada":busy||autoSaving?"Guardando…":JSON.stringify(details)!==savedSnapshot?(error?"No se pudo guardar el avance":"Cambios pendientes de guardar"):hasFamilyInterviewAnswers(details)?"Borrador guardado · Falta confirmar":"Sin respuestas todavía"}</p>}
    {confirmed && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#e5f8ed] p-3 text-sm">
      <p>Entrevista confirmada · versión {confirmed.version}. {readOnly ? "Puedes corregirla; la versión anterior se conservará." : "Estás preparando una corrección."}</p>
      {readOnly && <Button variant="outline" onClick={() => setCreatingVersion(true)}>Corregir entrevista</Button>}
    </div>}
    {layout === "stacked" ? <div className={styles.questionList}>{questions.map(renderQuestion)}</div> : <>
    <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[#075a6d]">
      <span>Pregunta {step + 1} de {questions.length}</span><span>{answered}/{questions.length} con información</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-[#e0edf3]"><div className="h-full rounded-full bg-[#087d96]" style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]"><div className="min-w-0" aria-live="polite">
      {renderQuestion(questions[step],step)}
    <div className="flex items-center justify-between gap-3 pt-2">
      <Button variant="outline" disabled={step===0||busy||audioBusy} onClick={()=>setStep(v=>v-1)}><ArrowLeft/>Anterior</Button>
      <Button variant="outline" disabled={step === questions.length - 1 || busy || audioBusy} onClick={() => setStep(v => v + 1)}>Siguiente<ArrowRight/></Button>

    </div>
    </div><aside className="rounded-2xl bg-[#f1f7fa] p-5"><div className="flex items-center gap-3"><StudentPhoto id={studentId} name={studentName}/><p className="font-bold">{studentName}</p></div><h3 className="mt-5 font-bold">Respuestas ya registradas <span className="text-sm font-normal">{answered}/{questions.length}</span></h3><ul className="mt-3 space-y-2">{questions.map((q,i)=><li key={q.key}><button type="button" disabled={busy||audioBusy} aria-label={`${q.label}: ${answerFor(q.key)?"Con respuesta":"Sin respuesta"}`} aria-current={step===i?"step":undefined} className={`flex min-h-12 w-full items-start gap-3 rounded-xl p-3 text-left text-sm ${step===i?"bg-white":"hover:bg-white"}`} onClick={()=>setStep(i)}><span aria-hidden="true" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${answerFor(q.key)?"border-[#087d96] bg-[#087d96] text-white":"border-[#9fb8cc]"}`}>{answerFor(q.key)?"✓":""}</span><span><span className="block font-semibold">{["Intereses y gustos","Juego con otras personas","En casa","Lenguas y comunicación","Familia y comunidad","Acompañamiento"][i]}</span><span className="mt-1 line-clamp-1 block text-xs text-[#526b87]">{answerFor(q.key)?answerFor(q.key).length>48?answerFor(q.key).slice(0,45)+"…":answerFor(q.key):"Opcional"}</span></span></button></li>)}</ul></aside></div>
    </>}
    {!readOnly && <AsyncButton className="min-h-12 w-full sm:w-auto" busy={busy} disabled={audioBusy || !hasFamilyInterviewAnswers(details)} busyLabel="Guardando…" onClick={() => void run(save)}>Confirmar entrevista</AsyncButton>}
      {readOnly && onNext && <Button variant="outline" onClick={onNext}>{layout==="stacked"?"Entrevistar al siguiente niño":"Continuar con otro niño"}<ArrowRight/></Button>}
    <SaveConfirmation confirmation={confirmation}/>
    {confirmed && creatingVersion && <Button variant="ghost" disabled={busy} onClick={() => { setDetails(confirmed.details); }}>Restaurar datos confirmados</Button>}
    {(details.family_context || details.previous_education_status) && <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Información de la entrevista anterior</summary><p className="mt-3 text-sm">{details.family_context}</p><p className="mt-2 text-sm">Experiencias previas: {interviewPreviousEducationOptions.find((option) => option.id === details.previous_education_status)?.label} {interviewPreviousEducationTypeOptions.find((option) => option.id === details.previous_education_type)?.label}</p></details>}
    {details.structured_options_version !== 2 && (["language_context", "communication_emotional_context", "adaptation_context", "daily_routine_context", "family_expectations", "previous_education"] as const).some((key) => details[key]) && <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Respuestas de la entrevista anterior</summary>
      <div className="mt-3 space-y-2">{(["language_context", "communication_emotional_context", "adaptation_context", "daily_routine_context", "family_expectations", "previous_education"] as const)
        .filter((key) => details[key]).map((key) => <p key={key} className="text-sm"><strong>{familyContextLabels[key] ?? key}:</strong> {details[key]}</p>)}</div></details>}
    {(draft?.has_attachment || confirmed?.has_attachment) && <a className="text-sm font-semibold text-[#087d96] underline" href={familyInterviewAttachmentUrl(studentId)} target="_blank" rel="noreferrer">Ver respaldo privado</a>}
    {message && <p role="status" className="text-sm text-[#1e6040]">{message}</p>}
    {error && <div><p role="alert" className="text-sm text-red-700">{error}</p>{!readOnly&&JSON.stringify(details)!==savedSnapshot&&<Button variant="outline" disabled={busy||audioBusy||autoSaving} onClick={()=>void run(()=>saveDraft())}>Reintentar guardado</Button>}</div>}
  </section>;
}

/** The complete interview is loaded only when the teacher opens it. */
export function FamilyInformationPanel({ studentId, studentName, context }: {
  studentId: string; studentName: string; context: ({ version: number } & Record<string, string | number>) | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [refreshed, setRefreshed] = useState<{ studentId: string; context: typeof context } | null>(null);
  const [error, setError] = useState("");
  const summary = refreshed?.studentId === studentId ? refreshed.context : context;
  const familySummary = summarizeFamilyInterview(summary ?? {});
  if (expanded) return <FamilyInterviewEditor studentId={studentId} studentName={studentName} onBack={() => {
    setExpanded(false);
    void loadStudentPedagogicalProfile(studentId).then((profile) => { setRefreshed({ studentId, context: profile.family_interview_context }); setError(""); })
      .catch(() => setError("No se pudo actualizar el resumen. Vuelve a abrir el perfil para verlo."));
  }} />;
  const entries = Object.entries(summary ?? {}).filter(([key, value]) => key in familyContextLabels && typeof value === "string" && value.trim());
  return <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Información de la familia</h2>
    <p className="mt-1 text-sm text-[#526b87]">{summary ? `Entrevista confirmada · versión ${summary.version}. Información según la familia; la docente observa e interpreta por separado.` : "Todavía no hay una entrevista confirmada. Puedes completarla poco a poco."}</p>
    {familySummary && <p className="mt-3 rounded-xl bg-[#eaf7f5] p-3 text-sm">{familySummary}</p>}
    {entries.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{entries.map(([key, value]) => <div key={key} className="rounded-xl bg-[#f2f8fc] p-3"><p className="text-xs font-semibold text-[#526b87]">{familyContextLabels[key]}</p><p className="mt-1 whitespace-pre-wrap text-sm">{value}</p></div>)}</div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <Button className="mt-4" variant="outline" onClick={() => setExpanded(true)}>{summary ? "Ver entrevista completa" : "Abrir entrevista familiar"}</Button>
  </section>;
}
