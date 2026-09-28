"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { attachFamilyInterview, saveAndConfirmFamilyInterview, familyInterviewAttachmentUrl,
  loadFamilyInterview, loadFamilyInterviewStatuses, loadStudentPedagogicalProfile, saveFamilyInterview,
  type FamilyInterview, type FamilyInterviewDetails,
  type FamilyInterviewAnswerKey, type FamilyInterviewStatus } from "@/src/lib/local-database";
import { AsyncButton, LoadingState } from "./workflow-ui";
import { InterviewAudioRecorder } from "./interview-audio-recorder";
import { buildFamilyInterviewPrintHtml } from "@/src/lib/family-interview-print.mjs";
import { familyInterviewQuestionGroups, interviewLanguageOptions, interviewInterestOptions, interviewPreviousEducationOptions, interviewPreviousEducationTypeOptions } from "@/src/lib/family-interview-contract.mjs";
import { familyContextLabels } from "@/src/lib/local-database";
import { displayPersonName } from "@/src/lib/person-name.mjs";

type Question = { key: FamilyInterviewAnswerKey; label: string; hint?: string; placeholder: string };

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

export function FamilyInterviewEditor({ studentId, studentName: rawStudentName, onBack, onSaved, printContext }: { studentId: string; studentName: string; onBack?: () => void; onSaved?: (interview: FamilyInterview) => void; printContext?: { institution?: string; classroom?: string } }) {
  const studentName = displayPersonName(rawStudentName);
  const [draft, setDraft] = useState<FamilyInterview | null>(null);
  const [confirmed, setConfirmed] = useState<FamilyInterview | null>(null);
  const [details, setDetails] = useState<FamilyInterviewDetails>({});
  const detailsRef = useRef(details);
  useEffect(() => { detailsRef.current = details; }, [details]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [activeAudioKeys, setActiveAudioKeys] = useState<string[]>([]);
  const audioBusy = activeAudioKeys.length > 0;
  const readOnly = Boolean(confirmed && !draft && !creatingVersion);

  useEffect(() => {
    let active = true;
    loadFamilyInterview(studentId).then((value) => { if (active) { setDraft(value.draft); setConfirmed(value.confirmed); setDetails(value.draft?.details ?? value.confirmed?.details ?? {}); } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudo abrir la entrevista."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentId]);

  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await work(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (audioBusy) return;
    const result = await saveAndConfirmFamilyInterview(studentId, details);
    setConfirmed(result); setDraft(null); setCreatingVersion(false); setDetails(result.details); setMessage("Entrevista guardada.");
    onSaved?.(result); onBack?.();
  }
  async function attach(file: File) {
    if (!draft && !confirmed) { setError("Guarda primero la entrevista antes de adjuntar el papel."); return; }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type) || file.size > 3_000_000) { setError("Adjunta un PDF, JPG o PNG de hasta 3 MB."); return; }
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

  function questionField(question: Question) {
    const tags = question.key === "language_context" ? { field: "language_tags" as const, options: interviewLanguageOptions }
      : question.key === "interests" ? { field: "interest_tags" as const, options: interviewInterestOptions } : null;
    return <div key={question.key} className="space-y-3"><p id={`interview-question-${question.key}`} className="text-base font-bold leading-snug text-[#19345b] sm:text-lg">{question.label}{question.hint && <span className="mt-1 block text-sm font-normal text-[#526b87]">{question.hint}</span>}</p>
      {tags && <fieldset><legend className="text-xs font-semibold text-[#526b87]">{question.key === "language_context" ? "Lenguas que usa o escucha (puedes elegir varias)" : "¿Qué temas le interesan? (puedes elegir varios)"}</legend><div className="mt-2 flex flex-wrap gap-2">{tags.options.map((option) => { const selected = (details[tags.field] ?? []).includes(option.id); return <button key={option.id} type="button" disabled={readOnly} aria-pressed={selected} onClick={() => setDetails((current) => {
        const wasSelected = (current[tags.field] ?? []).includes(option.id);
        const next = wasSelected ? (current[tags.field] ?? []).filter((id) => id !== option.id) : [...(current[tags.field] ?? []), option.id];
        return { ...current, [tags.field]: next,
          ...(tags.field === "language_tags" && wasSelected && current.primary_language_tag === option.id ? { primary_language_tag: undefined } : {}),
          ...(option.id === "other" && wasSelected ? { [tags.field === "language_tags" ? "other_language_text" : "other_interest_text"]: undefined } : {}) };
      })} className={`min-h-10 rounded-full border px-3 text-sm ${selected ? "border-[#087d96] bg-[#e4f7f9] text-[#075a6d]" : "border-[#d7e4ed] bg-white text-[#526b87]"}`}>{option.label}</button>; })}</div></fieldset>}
      {question.key === "language_context" && (details.language_tags?.length ?? 0) > 0 && <label className="block text-xs font-semibold text-[#526b87]">Lengua que utiliza principalmente (opcional)<select disabled={readOnly} className="mt-2 min-h-11 w-full rounded-xl border border-[#d7e4ed] bg-white px-3 text-sm" value={details.primary_language_tag ?? ""} onChange={(event) => setDetails((current) => ({ ...current, primary_language_tag: event.target.value || undefined }))}><option value="">Sin precisar</option>{interviewLanguageOptions.filter((option) => details.language_tags?.includes(option.id)).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>}
      {question.key === "language_context" && details.language_tags?.includes("other") && <label className="block text-xs font-semibold text-[#526b87]">¿Cuál otra lengua? (opcional)<input disabled={readOnly} maxLength={200} className="mt-2 min-h-11 w-full rounded-xl border border-[#d7e4ed] bg-white px-3 text-sm" value={details.other_language_text ?? ""} onChange={(event) => setDetails((current) => ({ ...current, other_language_text: event.target.value }))} /></label>}
      {question.key === "interests" && details.interest_tags?.includes("other") && <label className="block text-xs font-semibold text-[#526b87]">Otro interés (opcional)<input disabled={readOnly} maxLength={200} className="mt-2 min-h-11 w-full rounded-xl border border-[#d7e4ed] bg-white px-3 text-sm" value={details.other_interest_text ?? ""} onChange={(event) => setDetails((current) => ({ ...current, other_interest_text: event.target.value }))} /></label>}
      {question.key === "previous_education" && <fieldset><legend className="text-xs font-semibold text-[#526b87]">¿Tuvo experiencia educativa previa?</legend><div className="mt-2 flex flex-wrap gap-2">{interviewPreviousEducationOptions.map((option) => <button key={option.id} type="button" disabled={readOnly} aria-pressed={details.previous_education_status === option.id} onClick={() => setDetails((current) => {
        const next = current.previous_education_status === option.id ? undefined : option.id as FamilyInterviewDetails["previous_education_status"];
        return { ...current, previous_education_status: next, previous_education_type: next === "yes" ? current.previous_education_type : undefined };
      })} className={`min-h-10 rounded-full border px-3 text-sm ${details.previous_education_status === option.id ? "border-[#087d96] bg-[#e4f7f9] text-[#075a6d]" : "border-[#d7e4ed] bg-white text-[#526b87]"}`}>{option.label}</button>)}</div></fieldset>}
      {question.key === "previous_education" && details.previous_education_status === "yes" && <label className="block text-xs font-semibold text-[#526b87]">¿En qué espacio? (opcional)<select disabled={readOnly} className="mt-2 min-h-11 w-full rounded-xl border border-[#d7e4ed] bg-white px-3 text-sm" value={details.previous_education_type ?? ""} onChange={(event) => setDetails((current) => ({ ...current, previous_education_type: event.target.value as FamilyInterviewDetails["previous_education_type"] || undefined }))}><option value="">Sin precisar</option>{interviewPreviousEducationTypeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>}
      <label className="block text-xs font-semibold text-[#526b87]">{tags || question.key === "previous_education" ? "Comentario de la familia (opcional)" : "Respuesta de la familia"}<Textarea aria-describedby={`interview-question-${question.key}`} className="mt-2 min-h-24 bg-white text-base placeholder:italic placeholder:text-slate-400" disabled={readOnly} maxLength={2000} placeholder={readOnly ? undefined : question.placeholder} value={details[question.key] ?? ""} onChange={(event) => setDetails((current) => ({ ...current, [question.key]: event.target.value }))} /></label>
      {!readOnly && <InterviewAudioRecorder studentId={studentId} question={question.label} currentText={details[question.key] ?? ""} onBusyChange={(active) => setActiveAudioKeys((current) => {
        if (current.includes(question.key) === active) return current;
        return active ? [...current, question.key] : current.filter((key) => key !== question.key);
      })} onTranscribed={async (text, saveNow) => {
        const updated = { ...detailsRef.current, [question.key]: text };
        detailsRef.current = updated; setDetails(updated);
        if (saveNow) {
          setBusy(true);
          try { const result = await saveFamilyInterview(studentId, updated); setDraft(result); setCreatingVersion(false); setMessage("Respuesta guardada."); }
          catch { setError("La respuesta está en el cuadro de texto, pero no se pudo guardar. Pulsa «Guardar entrevista» para intentarlo de nuevo."); }
          finally { setBusy(false); }
        }
      }} />}
    </div>;
  }

  if (loading) return <LoadingState label="Abriendo entrevista..." />;
  return <section className="diagnostic-panel space-y-4 p-4 md:p-7">
    {onBack && <Button variant="outline" className="diagnostic-back-button" disabled={busy || audioBusy} onClick={onBack}><ArrowLeft /> Volver</Button>}
    <div><p className="text-sm font-semibold text-[#087d96]">Conocer al niño y su familia</p><h2 className="text-2xl font-extrabold">Conozcamos mejor a {studentName}</h2><p className="mt-1 text-sm text-[#526b87]">Esta información nos ayudará a acompañarlo/a durante sus primeras semanas y durante el año. Responde solo lo que consideres útil. Puedes dejar preguntas sin responder.</p><p className="mt-2 text-xs text-[#526b87]">Lo que comparte la familia es contexto para acompañar; no se considera una observación de competencia realizada por la docente.</p></div>
    {confirmed && <p className="rounded-xl bg-[#e5f8ed] p-3 text-sm">Entrevista confirmada · versión {confirmed.version}. {readOnly ? "Puedes corregir sus respuestas cuando lo necesites; la versión anterior se conservará." : draft ? "Hay una corrección en borrador; la versión anterior se conserva." : "Corrige las respuestas y guárdalas como una nueva versión."}</p>}
    <fieldset disabled={busy} className="space-y-4"><legend className="sr-only">Respuestas de la entrevista familiar</legend>{familyInterviewQuestionGroups(studentName).map((group, index) => <section key={group.title} aria-labelledby={`interview-group-${index}`} className="rounded-xl border bg-white p-4"><h3 id={`interview-group-${index}`} className="text-base font-bold">{group.title} <span className="font-normal text-[#526b87]">· {group.questions.length} preguntas opcionales</span></h3><div className="mt-5 max-w-3xl space-y-7">{group.questions.map((question) => questionField(question as Question))}</div></section>)}</fieldset>
    <div className="space-y-3 print:hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {readOnly ? <Button className="min-h-11 w-full sm:w-auto" onClick={() => setCreatingVersion(true)}>Corregir entrevista</Button> : <AsyncButton className="min-h-11 w-full sm:w-auto" busy={busy} busyLabel="Guardando..." disabled={audioBusy} onClick={() => void run(save)}><Save /> {creatingVersion ? "Guardar corrección" : "Guardar entrevista"}</AsyncButton>}
        {creatingVersion && <Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={busy || audioBusy} onClick={() => { setCreatingVersion(false); setDetails(confirmed?.details ?? {}); }}>Cancelar cambios</Button>}
      </div>
      <Button variant="ghost" className="min-h-11 w-full sm:w-auto" onClick={() => { if (!printInterview(studentName, details, printContext)) setError("El navegador bloqueó la hoja para imprimir. Permite ventanas emergentes para Ayni y vuelve a intentarlo."); }}><Printer /> Imprimir para papel</Button>
    </div>
    <label className="block text-sm font-semibold print:hidden">Adjuntar entrevista hecha en papel (opcional)<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="mt-2 block w-full" onChange={(event) => { const file = event.target.files?.[0]; if (file) void run(() => attach(file)); }} /></label>
    {(draft?.has_attachment || confirmed?.has_attachment) && <a className="text-sm font-semibold text-[#087d96] underline print:hidden" href={familyInterviewAttachmentUrl(studentId)} target="_blank" rel="noreferrer">Ver respaldo privado</a>}
    {message && <p role="status" className="text-sm text-[#1e6040] print:hidden">{message}</p>}{error && <p role="alert" className="text-sm text-red-700 print:hidden">{error}</p>}
    <p className="hidden text-xs print:block">Entrevista pedagógica · {studentName} · Fecha: __________________ · Docente: __________________</p>
  </section>;
}

/** Profile projection: the complete interview is loaded only when the teacher opens it. */
export function FamilyInformationPanel({ studentId, studentName, context }: { studentId: string; studentName: string; context: ({ version: number } & Record<string, string | number>) | null }) {
  const [expanded, setExpanded] = useState(false);
  const [refreshed, setRefreshed] = useState<{ studentId: string; context: typeof context } | null>(null);
  const [error, setError] = useState("");
  const summary = refreshed?.studentId === studentId ? refreshed.context : context;
  if (expanded) return <FamilyInterviewEditor studentId={studentId} studentName={studentName} onBack={() => {
    setExpanded(false);
    void loadStudentPedagogicalProfile(studentId).then((profile) => { setRefreshed({ studentId, context: profile.family_interview_context }); setError(""); })
      .catch(() => setError("No se pudo actualizar el resumen. Vuelve a abrir el perfil para verlo."));
  }} />;
  const entries = Object.entries(summary ?? {}).filter(([key, value]) => key in familyContextLabels && typeof value === "string" && value.trim());
  return <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Información de la familia</h2>
    <p className="mt-1 text-sm text-[#526b87]">{summary ? `Entrevista confirmada · versión ${summary.version}. Contexto informado por la familia para acompañar a ${studentName}; no es una evaluación de competencias.` : "Todavía no hay una entrevista confirmada. Puedes completarla poco a poco."}</p>
    {entries.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{entries.map(([key, value]) => <div key={key} className="rounded-xl bg-[#f2f8fc] p-3"><p className="text-xs font-semibold text-[#526b87]">{familyContextLabels[key]}</p><p className="mt-1 whitespace-pre-wrap text-sm">{value}</p></div>)}</div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <Button className="mt-4" variant="outline" onClick={() => setExpanded(true)}>{summary ? "Ver entrevista completa" : "Abrir entrevista familiar"}</Button>
  </section>;
}
