"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { attachFamilyInterview, saveAndConfirmFamilyInterview, familyInterviewAttachmentUrl,
  loadFamilyInterview, loadFamilyInterviewStatuses, loadStudentPedagogicalProfile, saveFamilyInterview,
  type FamilyInterview, type FamilyInterviewDetails, type FamilyInterviewStatus } from "@/src/lib/local-database";
import { AsyncButton, LoadingState } from "./workflow-ui";
import { InterviewAudioRecorder } from "./interview-audio-recorder";
import { buildFamilyInterviewPrintHtml } from "@/src/lib/family-interview-print.mjs";
import { familyInterviewQuestionGroups, familyInterviewStructuredOptionsVersion, interviewLanguageOptions,
  interviewInterestOptions, interviewAutonomyOptions, interviewAutonomyLevels, interviewCommunicationOptions,
  interviewEmotionalSupportOptions, interviewSocialPlayOptions, interviewHomeActivityOptions,
  interviewCommunityOptions, interviewParticipationSupportOptions, interviewPreviousEducationOptions,
  interviewPreviousEducationTypeOptions } from "@/src/lib/family-interview-contract.mjs";
import { familyContextLabels } from "@/src/lib/local-database";
import { displayPersonName } from "@/src/lib/person-name.mjs";
import { AyniMascot } from "./initial-journey-ui";
import { StudentPhoto } from "./student-photo";
import { summarizeFamilyInterview } from "@/src/lib/family-interview-projection.mjs";

export function useFamilyInterviewStatusMap(refreshKey: string, enabled = true) {
  const [statuses, setStatuses] = useState<Record<string, FamilyInterviewStatus>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadFamilyInterviewStatuses().then(({ students }) => {
      if (active) { setStatuses(Object.fromEntries(students.map((item) => [item.student_id, item.status]))); setError(""); }
    }).catch(() => { if (active) setError("No se pudo actualizar el estado de las entrevistas."); });
    return () => { active = false; };
  }, [refreshKey, enabled]);
  return { statuses, error };
}
export function FamilyInterviewStatusBadge({ status }: { status?: FamilyInterviewStatus }) {
  if (!status) return null;
  const styles = {
    confirmed: "border-[#a8dbc1] bg-[#e6f7ed] text-[#176442]",
    partial: "border-[#ecd29a] bg-[#fff3db] text-[#88591d]",
    not_started: "border-[#d8e2ed] bg-[#f4f7fb] text-[#5a6d83]",
  };
  const labels = { confirmed: "Entrevista confirmada", partial: "Entrevista en curso", not_started: "Sin respuestas" };
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${styles[status]}`}>{labels[status]}</span>;
}
function printInterview(name: string, details: FamilyInterviewDetails, context?: { institution?: string; classroom?: string }) {
  const sheet = window.open("", "_blank");
  if (!sheet) return false;
  sheet.document.write(buildFamilyInterviewPrintHtml(name, details, familyInterviewQuestionGroups(name), context));
  sheet.document.close();
  return true;
}
type TagField = "interest_tags" | "language_tags" | "communication_tags" | "emotional_support_tags" |
  "social_play_tags" | "home_activity_tags" | "community_tags" | "participation_support_tags";
type TextField = "interests" | "autonomy_context" | "communication_context" | "language_context" |
  "emotional_support_context" | "social_context" | "home_activity_example" | "family_community_context" |
  "family_community_enjoyed" | "participation_support_context" | "family_expectation" | "family_context" | "other_interest_text" | "other_language_text" | "other_community_text";

export function FamilyInterviewEditor({ studentId, studentName: rawStudentName, onBack, onSaved, printContext }: {
  studentId: string; studentName: string; onBack?: () => void; onSaved?: (interview: FamilyInterview) => void;
  printContext?: { institution?: string; classroom?: string };
}) {
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
  const [busy, setBusy] = useState(false);
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
      if (active) { setDraft(value.draft); setConfirmed(value.confirmed); setDetails(value.draft?.details ?? value.confirmed?.details ?? {}); savedText.current=JSON.stringify(value.draft?.details ?? value.confirmed?.details ?? {}); }
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudo abrir la entrevista."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentId]);
  useEffect(()=>{
    if(loading||readOnly||busy||audioBusy||JSON.stringify(details)===savedText.current)return;
    const timer=window.setTimeout(()=>{if(autosave.current)return;const value=detailsRef.current;
      autosave.current=saveFamilyInterview(studentId,value).then(result=>{setDraft(result);savedText.current=JSON.stringify(value);setMessage("Avance guardado automáticamente.");setAutosaveRevision(v=>v+1);}).catch(()=>setError("No pude guardar automáticamente. Tus respuestas siguen aquí; al volver o terminar intentaré guardarlas.")).finally(()=>{autosave.current=null;});
    },900);return()=>window.clearTimeout(timer);
  },[details,loading,readOnly,busy,audioBusy,studentId,autosaveRevision]);
  useEffect(() => {
    if (loading || readOnly) return;
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
  }, [loading, readOnly]);
  const answerFields:Record<string,string[]>={interests:["interest_tags","interests","other_interest_text"],social_context:["social_play_tags","social_context"],home_activity_example:["home_activity_tags","home_activity_example"],communication_context:["language_tags","language_context","communication_tags","communication_context","other_language_text"],family_community_context:["community_tags","family_community_context","family_community_enjoyed","other_community_text"],participation_support_context:["participation_support_tags","participation_support_context"]};
  const optionLabels = new Map(Object.entries({interest_tags:interviewInterestOptions,social_play_tags:interviewSocialPlayOptions,home_activity_tags:interviewHomeActivityOptions,language_tags:interviewLanguageOptions,communication_tags:interviewCommunicationOptions,community_tags:interviewCommunityOptions,participation_support_tags:interviewParticipationSupportOptions}).flatMap(([field,options]) => options.map(o => [`${field}:${o.id}`, o.label])));
  const answerFor=(key:string)=>(answerFields[key]??[key]).flatMap(field=>{const v=(details as Record<string,unknown>)[field];return Array.isArray(v)?v.map(id=>optionLabels.get(`${field}:${id}`)??String(id)):typeof v==="string"&&v.trim()?[v]:[];}).join(" · ");
  const answered=questions.filter(q=>answerFor(q.key)).length;
  const changeText = (field: TextField, value: string) =>
    setDetails((current) => ({ ...current, [field]: value, structured_options_version: familyInterviewStructuredOptionsVersion }));
  function chips(field: TagField, options: readonly { id: string; label: string }[], label: string) {
    return <fieldset><legend className="text-sm font-semibold text-[#405a73]">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">{options.map((option) => {
        const selected = (details[field] ?? []).includes(option.id);
        return <button key={option.id} type="button" disabled={readOnly || busy} aria-pressed={selected}
          onClick={() => setDetails((current) => {
            const previous = current[field] ?? [];
            const next = previous.includes(option.id) ? previous.filter((id) => id !== option.id) : [...previous, option.id];
            return { ...current, [field]: next, structured_options_version: familyInterviewStructuredOptionsVersion,
              ...(field === "language_tags" ? {
                primary_language_tag: next.includes(current.primary_language_tag ?? "") ? current.primary_language_tag : undefined,
                home_language_uses: current.home_language_uses?.filter((row) => next.includes(row.language_tag)),
                other_language_text: next.includes("other") ? current.other_language_text : undefined,
              } : {}),
              ...(field === "interest_tags" && !next.includes("other") ? { other_interest_text: undefined } : {}),
              ...(field === "community_tags" && !next.includes("other") ? { other_community_text: undefined } : {}) };
          })}
          className={`min-h-11 rounded-full border px-4 text-sm font-medium ${selected ? "border-[#087d96] bg-[#e4f7f9] text-[#075a6d]" : "border-[#d7e4ed] bg-white text-[#405a73]"}`}>{option.label}</button>;
      })}</div></fieldset>;
  }
  async function transcribeField(field: TextField, maxLength: number, text: string, saveNow: boolean) {
    if (text.length > maxLength) throw new Error(`La respuesta debe tener hasta ${maxLength} caracteres. Puedes acortarla antes de guardar.`);
    const updated = { ...detailsRef.current, [field]: text, structured_options_version: familyInterviewStructuredOptionsVersion };
    detailsRef.current = updated; setDetails(updated);
    if (saveNow) {
      await autosave.current;
      const result = await saveFamilyInterview(studentId, updated);
      savedText.current = JSON.stringify(updated); setDraft(result);
      setMessage("Respuesta guardada en borrador."); onSaved?.(result);
    }
  }
  function shortField(field: TextField, label: string, maxLength = 300) {
    return <div><label htmlFor={`family-${field}`} className="block text-sm font-semibold text-[#405a73]">{label}</label><div className="mt-2 flex items-start gap-2 rounded-xl border border-[#d7e4ed] bg-white p-2">
      <textarea id={`family-${field}`} className="min-h-24 min-w-0 flex-1 resize-y bg-transparent p-2 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#087d96]"
        disabled={readOnly || busy} maxLength={maxLength} value={details[field] ?? ""}
        onChange={(event) => changeText(field, event.target.value)} />
      {!readOnly && <InterviewAudioRecorder disabled={busy} studentId={studentId} question={questions[step].label}
        currentText={details[field] ?? ""} onBusyChange={(active) => setActiveAudioKeys((current) => {
          if (current.includes(field) === active) return current;
          return active ? [...current, field] : current.filter((key) => key !== field);
        })} onTranscribed={(text, saveNow) => transcribeField(field, maxLength, text, saveNow)} />}</div></div>;
  }
  async function run(work: () => Promise<void>) {
    if (busy || audioBusy) return;
    setBusy(true); setError(""); setMessage("");
    try { await autosave.current; await work(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }
  async function saveDraft(exitAfter = false) {
    const result = await saveFamilyInterview(studentId, detailsRef.current); savedText.current=JSON.stringify(detailsRef.current);
    setDraft(result); setDetails(result.details); setMessage("Avance guardado. Puedes continuar después.");
    onSaved?.(result); if (exitAfter) onBack?.();
  }
  async function save() {
    const result = await saveAndConfirmFamilyInterview(studentId, details);
    setConfirmed(result); setDraft(null); setCreatingVersion(false); setDetails(result.details);
    setMessage("Entrevista guardada."); onSaved?.(result); onBack?.();
  }
  async function attach(file: File) {
    if (!draft && !confirmed) { setError("Guarda primero la entrevista antes de adjuntar el papel."); return; }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type) || file.size > 3_000_000) {
      setError("Adjunta un PDF, JPG o PNG de hasta 3 MB."); return;
    }
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
      reader.readAsDataURL(file);
    });
    const updated = await attachFamilyInterview(studentId, file.type, base64);
    if (updated.status === "confirmed") setConfirmed(updated); else setDraft(updated);
    setMessage("Respaldo privado adjuntado. No se extrajo información del archivo.");
  }
  if (loading) return <LoadingState label="Abriendo entrevista..." />;
  return <section className="diagnostic-panel space-y-4 p-4 md:p-6">
    {onBack && <Button variant="outline" className="diagnostic-back-button" disabled={busy || audioBusy} onClick={() => { if(readOnly) onBack(); else void run(() => saveDraft(true)); }}><ArrowLeft /> Volver a entrevistar a otro alumno</Button>}
    <header className="flex items-center gap-4"><AyniMascot size="medium" pose="interview"/><div>
      <h2 className="text-base font-semibold">Conozcamos a la familia de {studentName}</h2>
      <p className="mt-1 hidden text-sm text-[#526b87] sm:block">Todas las respuestas son opcionales. Puedes volver después.</p>
      </div></header>
    {confirmed && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#e5f8ed] p-3 text-sm">
      <p>Entrevista confirmada · versión {confirmed.version}. {readOnly ? "Puedes corregirla; la versión anterior se conservará." : "Estás preparando una corrección."}</p>
      {readOnly && <Button variant="outline" onClick={() => setCreatingVersion(true)}>Corregir entrevista</Button>}
    </div>}
    <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[#075a6d]">
      <span>Pregunta {step + 1} de {questions.length}</span><span>{answered}/{questions.length} con información</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-[#e0edf3]"><div className="h-full rounded-full bg-[#087d96]" style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]"><article className="min-w-0 min-h-72 space-y-5 rounded-2xl border bg-white p-5" aria-live="polite">
      <h3 className="text-xl font-bold leading-snug sm:text-2xl text-[#19345b]">{questions[step].label}</h3>
      {questions[step].hint && <p className="text-sm text-[#526b87]">{questions[step].hint}</p>}
      {questions[step].key === "interests" && <>{chips("interest_tags", interviewInterestOptions, "Elige lo que más le guste")}
        {details.interest_tags?.includes("other") && shortField("other_interest_text", "¿Qué otro interés?",200)}
        {shortField("interests", "Un ejemplo corto, si quieres")}</>}
      {questions[step].key === "autonomy_context" && <><p className="text-sm text-[#526b87]">Marca solo las rutinas que quieras contar. Esto no es una prueba.</p>
        <div className="space-y-3">{interviewAutonomyOptions.map((item) => <fieldset key={item.id} className="rounded-xl border p-3"><legend className="font-semibold">{item.label}</legend>
          <div className="mt-2 flex flex-wrap gap-2">{interviewAutonomyLevels.map((level) => {
            const selected = details.autonomy_routines?.some((row) => row.id === item.id && row.level === level.id);
            return <button key={level.id} type="button" disabled={readOnly || busy} aria-pressed={Boolean(selected)}
              onClick={() => setDetails((v) => ({ ...v, autonomy_routines: [
                ...(v.autonomy_routines ?? []).filter((row) => row.id !== item.id),
                ...(!selected ? [{ id: item.id, level: level.id as "alone" | "sometimes" | "much_help" }] : []),
              ], structured_options_version: familyInterviewStructuredOptionsVersion }))}
              className={`min-h-10 rounded-full border px-3 text-sm ${selected ? "border-[#087d96] bg-[#e4f7f9]" : "border-[#d7e4ed]"}`}>{level.label}</button>;
          })}</div></fieldset>)}</div>{shortField("autonomy_context", "¿Quieres comentar algo más? (opcional)")}</>}
      {questions[step].key === "communication_context" && <>{chips("communication_tags", interviewCommunicationOptions, "¿Cómo suele comunicarse?")}
        {shortField("communication_context", "Algo más que quieras contar (opcional)")}
        {chips("language_tags", interviewLanguageOptions, "¿Qué idiomas escucha o usa en casa?")}
        {details.language_tags?.includes("other") && shortField("other_language_text", "¿Cuál otro idioma?", 200)}
        {(details.language_tags ?? []).map((tag) => <label key={tag} className="block text-sm">¿Con quién usa {interviewLanguageOptions.find((item) => item.id === tag)?.label.toLowerCase()}? (opcional)
          <input className="mt-2 min-h-11 w-full rounded-xl border px-3" disabled={readOnly} maxLength={100}
            value={details.home_language_uses?.find((row) => row.language_tag === tag)?.with_whom ?? ""}
            onChange={(e) => setDetails((v) => ({ ...v, structured_options_version: familyInterviewStructuredOptionsVersion, home_language_uses: [
              ...(v.home_language_uses ?? []).filter((row) => row.language_tag !== tag),
              ...(e.target.value.trim() ? [{ language_tag: tag, with_whom: e.target.value }] : []),
            ] }))} /></label>)}</>}
      {questions[step].key === "emotional_support_context" && <>{chips("emotional_support_tags", interviewEmotionalSupportOptions, "¿Qué suele ayudarle?")}
        {shortField("emotional_support_context", "¿Cómo suele reaccionar? Un ejemplo breve (opcional)")}</>}
      {questions[step].key === "social_context" && <>{chips("social_play_tags", interviewSocialPlayOptions, "Elige las formas de jugar que reconoces")}
        {shortField("social_context", "Un ejemplo, si quieres")}</>}
      {questions[step].key === "home_activity_example" && <>{chips("home_activity_tags", interviewHomeActivityOptions, "¿Qué has notado en sus juegos?")}
        {shortField("home_activity_example", "Si quieres, cuéntanos un ejemplo")}</>}
      {questions[step].key === "family_community_context" && <>{chips("community_tags", interviewCommunityOptions, "Personas, lugares y actividades cercanas")}
        {details.community_tags?.includes("other") && shortField("other_community_text", "¿Qué otra actividad o lugar?", 200)}
        {shortField("family_community_context", "Algo más sobre su vida familiar o comunidad (opcional)")}
        {shortField("family_community_enjoyed", "¿Hay alguna experiencia que disfrute especialmente? (opcional)")}</>}
      {questions[step].key === "participation_support_context" && <><p className="text-sm text-[#526b87]">Pregunta opcional. No necesitas compartir información privada.</p>
        {chips("participation_support_tags", interviewParticipationSupportOptions, "¿Qué le ayuda a participar?")}
        {shortField("participation_support_context", "Algo más que deberíamos saber (opcional)")}</>}
      {questions[step].key === "family_expectation" && <><p className="text-sm text-[#526b87]">Tu deseo para este año es una expectativa familiar; no es una evaluación del niño.</p>
        {shortField("family_expectation", "Respuesta corta (opcional)")}</>}
    <div className="flex items-center justify-between gap-3 pt-2">
      <Button variant="outline" disabled={step===0||busy||audioBusy} onClick={()=>setStep(v=>v-1)}><ArrowLeft/>Anterior</Button>
      {step<questions.length-1?<Button className="min-h-12 bg-[#dfb447] px-6 text-[#352909] hover:bg-[#cfa139]" disabled={busy||audioBusy} onClick={()=>setStep(v=>v+1)}>Siguiente<ArrowRight/></Button>:readOnly?<Button onClick={onBack}>Volver a alumnos</Button>:<AsyncButton className="min-h-12 bg-[#dfb447] text-[#352909] hover:bg-[#cfa139]" busy={busy} disabled={audioBusy} busyLabel="Guardando…" onClick={()=>void run(save)}>Finalizar entrevista</AsyncButton>}
    </div>
    </article><aside className="rounded-2xl bg-[#f1f7fa] p-5"><div className="flex items-center gap-3"><StudentPhoto id={studentId} name={studentName}/><p className="font-bold">{studentName}</p></div><h3 className="mt-5 font-bold">Respuestas ya registradas <span className="text-sm font-normal">{answered}/{questions.length}</span></h3><ul className="mt-3 space-y-2">{questions.map((q,i)=><li key={q.key}><button type="button" disabled={busy||audioBusy} aria-label={`${q.label}: ${answerFor(q.key)?"Con respuesta":"Sin respuesta"}`} aria-current={step===i?"step":undefined} className={`flex min-h-12 w-full items-start gap-3 rounded-xl p-3 text-left text-sm ${step===i?"bg-white":"hover:bg-white"}`} onClick={()=>setStep(i)}><span aria-hidden="true" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${answerFor(q.key)?"border-[#087d96] bg-[#087d96] text-white":"border-[#9fb8cc]"}`}>{answerFor(q.key)?"✓":""}</span><span><span className="block font-semibold">{["Intereses y gustos","Juego con otras personas","En casa","Lenguas y comunicación","Familia y comunidad","Acompañamiento"][i]}</span><span className="mt-1 line-clamp-1 block text-xs text-[#526b87]">{answerFor(q.key)?answerFor(q.key).length>48?answerFor(q.key).slice(0,45)+"…":answerFor(q.key):"Opcional"}</span></span></button></li>)}</ul></aside></div>
    {confirmed && creatingVersion && <Button variant="ghost" disabled={busy} onClick={() => { setCreatingVersion(false); setDetails(confirmed?.details ?? {}); }}>Cancelar cambios</Button>}
    {(details.family_context || details.previous_education_status) && <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Información de la entrevista anterior</summary><p className="mt-3 text-sm">{details.family_context}</p><p className="mt-2 text-sm">Experiencias previas: {interviewPreviousEducationOptions.find((option) => option.id === details.previous_education_status)?.label} {interviewPreviousEducationTypeOptions.find((option) => option.id === details.previous_education_type)?.label}</p></details>}
    {details.structured_options_version !== 2 && (["language_context", "communication_emotional_context", "adaptation_context", "daily_routine_context", "family_expectations", "previous_education"] as const).some((key) => details[key]) && <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Respuestas de la entrevista anterior</summary>
      <div className="mt-3 space-y-2">{(["language_context", "communication_emotional_context", "adaptation_context", "daily_routine_context", "family_expectations", "previous_education"] as const)
        .filter((key) => details[key]).map((key) => <p key={key} className="text-sm"><strong>{familyContextLabels[key] ?? key}:</strong> {details[key]}</p>)}</div></details>}
    <details className="print:hidden"><summary className="cursor-pointer py-2 text-sm text-[#526b87]">Entrevista en papel (opcional)</summary>
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button variant="ghost" onClick={() => { if (!printInterview(studentName, details, printContext)) setError("El navegador bloqueó la hoja para imprimir."); }}><Printer /> Imprimir para papel</Button>
      <label className="text-sm font-semibold">Adjuntar entrevista hecha en papel (opcional)
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="mt-2 block w-full" onChange={(event) => {
          const file = event.target.files?.[0]; if (file) void run(() => attach(file));
        }} /></label>
    </div>
    </details>
    {(draft?.has_attachment || confirmed?.has_attachment) && <a className="text-sm font-semibold text-[#087d96] underline" href={familyInterviewAttachmentUrl(studentId)} target="_blank" rel="noreferrer">Ver respaldo privado</a>}
    {message && <p role="status" className="text-sm text-[#1e6040]">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
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
