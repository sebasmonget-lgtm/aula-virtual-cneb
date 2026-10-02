"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmDiagnosticGroup, confirmDiagnosticStudentReview, loadDiagnosticReview, loadFamilyInterview,
  prepareDiagnosticGroup, prepareDiagnosticStudentReview, saveDiagnosticGroup, saveDiagnosticStudentReview,
  suggestDiagnosticGroup,
  prepareDiagnosticPriorities, suggestDiagnosticPriorities, saveDiagnosticPriorities, confirmDiagnosticPriorities,
  saveMatrixDiagnosticObservation, spontaneousObservationMediaUrl,
  type DiagnosticGroupDetails, type DiagnosticPriorityDetails, type DiagnosticReviewWorkspace, type DiagnosticStudentReviewDetails,
  type DiagnosticObservationStatus, type FamilyInterview, type FamilyInterviewAnswerKey,
} from "@/src/lib/local-database";
import { familyInterviewQuestionGroups, interviewInterestOptions, interviewLanguageOptions,
  interviewPreviousEducationTypeOptions } from "@/src/lib/family-interview-contract.mjs";
import { AsyncButton, LoadingState } from "./workflow-ui";
import { diagnosticReviewProgress } from "@/src/lib/diagnostic-review-progress.mjs";
import { DictationRecorder } from "./dictation-recorder";
import { displayPersonName } from "@/src/lib/person-name.mjs";

function DiagnosticNavigation({ backLabel, onBack, disabled, children }: {
  backLabel: string; onBack: () => void; disabled: boolean; children: ReactNode;
}) {
  return <nav aria-label="Continuar el diagnóstico" className="flex items-stretch justify-between gap-3 border-t border-[#d6e5ef] pt-5">
    <Button variant="outline" className="h-auto min-h-12 min-w-0 flex-1 whitespace-normal sm:flex-none" disabled={disabled} onClick={onBack}><ArrowLeft className="shrink-0" />{backLabel}</Button>
    <div className="flex min-w-0 flex-1 justify-end sm:flex-none">{children}</div>
  </nav>;
}

const navigationButtonClass = "h-auto min-h-12 w-full min-w-0 whitespace-normal sm:w-auto";
const newPriority = () => ({ title: "", reason: "", related_competency_ids: [] as string[], importance: "higher" as const });
const editablePriorities = (details: DiagnosticPriorityDetails): DiagnosticPriorityDetails =>
  details.priorities.length ? details : { priorities: [newPriority()] };
const scrollToDiagnostic = (element: HTMLElement | null) => element?.scrollIntoView({
  behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start",
});

const statusText: Record<DiagnosticObservationStatus, string> = {
  demonstrated: "Lo mostró", with_support: "Lo mostró con apoyo",
  not_yet_demonstrated: "Aún no se observó", insufficient_information: "Información insuficiente",
  observed_without_judgment: "Observación registrada",
};

const interviewSummaryLabels: Record<FamilyInterviewAnswerKey, string> = {
  family_context: "Quiénes le acompañan",
  language_context: "Lenguas en casa",
  interests: "Intereses",
  autonomy_context: "Autonomía",
  communication_emotional_context: "Cómo expresa lo que siente",
  social_context: "Relación y juego",
  adaptation_context: "Qué le da seguridad",
  previous_education: "Experiencias previas",
  daily_routine_context: "Rutinas y cuidados",
  family_expectations: "Expectativas de la familia",
};

type MatrixObservationDraft = { studentId: string; competencyId: string; contextLabel: string; observationText: string };
const observationMoments = ["Aula", "Juego libre", "Asamblea", "Patio", "Recreo", "Lonchera", "Otro momento"];
const groupSummaryPrompts = [
  ["strengths", "¿Qué fortalezas observaste?", "Por ejemplo: En los juegos, varios niños expresan sus ideas y comparten materiales."],
  ["needs", "¿Qué necesita más acompañamiento?", "Por ejemplo: Algunos niños necesitan más oportunidades para conversar y resolver desacuerdos con apoyo."],
  ["planning_priorities", "¿Qué ideas o temas te gustaría desarrollar este año? (opcional)", "Anota algunas ideas, no hace falta completar todo el año. Por ejemplo: juegos con agua, el mercado del barrio o cuentos inventados. También puedes indicar cómo acompañar al grupo."],
] as const;

function interviewAnswer(interview: FamilyInterview, key: FamilyInterviewAnswerKey) {
  const details = interview.details;
  const written = details[key]?.trim();
  if (written) return written;
  if (key === "language_context") return details.language_tags?.map((id) =>
    interviewLanguageOptions.find((item) => item.id === id)?.label ?? details.other_language_text ?? id).join(", ") ?? "";
  if (key === "interests") return details.interest_tags?.map((id) =>
    interviewInterestOptions.find((item) => item.id === id)?.label ?? details.other_interest_text ?? id).join(", ") ?? "";
  if (key === "previous_education" && details.previous_education_status) {
    const previous = { yes: "Sí", no: "No", unknown: "Sin precisar" }[details.previous_education_status];
    const place = interviewPreviousEducationTypeOptions.find((item) => item.id === details.previous_education_type)?.label;
    return place ? `${previous} · ${place}` : previous;
  }
  return "";
}

export function DiagnosticReview({ onObserve, onPlan, onGroupConfirmed, onObservationSaved }: { onObserve: () => void; onPlan?: () => void; onGroupConfirmed?: () => void; onObservationSaved?: () => void }) {
  const [workspace, setWorkspace] = useState<DiagnosticReviewWorkspace | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [focusCompetencyId, setFocusCompetencyId] = useState<string | null>(null);
  const [view, setView] = useState<"individual" | "group" | "priorities">("individual");
  const [interview, setInterview] = useState<FamilyInterview | null>(null);
  const [interviewError, setInterviewError] = useState("");
  const [draft, setDraft] = useState<DiagnosticStudentReviewDetails | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [groupDraft, setGroupDraft] = useState<DiagnosticGroupDetails | null>(null);
  const [groupDraftDirty, setGroupDraftDirty] = useState(false);
  const [priorityDraft, setPriorityDraft] = useState<DiagnosticPriorityDetails | null>(null);
  const [priorityDraftId, setPriorityDraftId] = useState<string | null>(null);
  const [priorityDirty, setPriorityDirty] = useState(false);
  const [matrixEditor, setMatrixEditor] = useState<MatrixObservationDraft | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const matrixEditorRef = useRef<HTMLDivElement>(null);
  const studentReviewRef = useRef<HTMLDivElement>(null);
  const matrixSelection = matrixEditor ? `${matrixEditor.studentId}:${matrixEditor.competencyId}` : "";
  const [busy, setBusy] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [groupAudioField, setGroupAudioField] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function reload() { setWorkspace(await loadDiagnosticReview()); }
  useEffect(() => { loadDiagnosticReview().then(setWorkspace).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar la revisión.")); }, []);
  useEffect(() => {
    if (!studentId) return;
    let active = true;
    loadFamilyInterview(studentId).then((result) => { if (active) setInterview(result.confirmed); })
      .catch(() => { if (active) setInterviewError("No se pudo cargar la entrevista familiar."); });
    return () => { active = false; };
  }, [studentId]);
  useEffect(() => {
    if (matrixSelection) scrollToDiagnostic(matrixEditorRef.current);
  }, [matrixSelection]);
  useEffect(() => { if (studentId) scrollToDiagnostic(studentReviewRef.current); }, [studentId]);
  useEffect(() => { scrollToDiagnostic(panelRef.current); }, [view]);

  const student = workspace?.students.find((item) => item.id === studentId);
  const studentReviews = workspace?.student_reviews.filter((item) => item.student_id === studentId) ?? [];
  const currentDraft = studentReviews.find((item) => item.status === "draft");
  const confirmed = studentReviews.find((item) => item.status === "confirmed");
  const observations = workspace?.observations.filter((item) => item.student_id === studentId) ?? [];
  const pendingObservations = workspace?.pending_observations.filter((item) => item.student_id === studentId) ?? [];
  const progress = workspace ? diagnosticReviewProgress(workspace) : null;
  const reviewedCount = progress?.reviewedCount ?? 0;
  const studentCount = progress?.studentCount ?? 0;
  const groupReview = workspace?.group_reviews.find((item) => item.status === "draft");
  const groupConfirmed = workspace?.group_reviews.find((item) => item.status === "confirmed");
  const priorityConfirmed = workspace?.priority_reviews.find((item) => item.status === "confirmed" && item.group_review_id === groupConfirmed?.id);
  const matrixCompetencies = workspace?.group_coverage ?? [];
  const competencyNames = new Map(workspace?.group_coverage.map((item) => [item.competency_id, item.competency_name]) ?? []);
  const matrixStudent = workspace?.students.find((item) => item.id === matrixEditor?.studentId);
  const matrixObservations = workspace?.observations.filter((item) => item.student_id === matrixEditor?.studentId && item.competency_v4_id === matrixEditor?.competencyId) ?? [];
  const hasGroupText = groupDraft && [groupDraft.strengths, groupDraft.needs, groupDraft.planning_priorities].some((value) => value.trim());
  const validPriorityDraft = Boolean(priorityDraft) && priorityDraft!.priorities.every((item) =>
    item.title.trim() && item.reason.trim() && item.related_competency_ids.length >= 1 && item.related_competency_ids.length <= 4);

  function openMatrixCell(id: string, competencyId: string) {
    if (busy || audioBusy || draftDirty) return;
    if (matrixEditor?.studentId === id && matrixEditor.competencyId === competencyId) return;
    if (matrixEditor?.observationText.trim() && (matrixEditor.studentId !== id || matrixEditor.competencyId !== competencyId)) {
      setError("Guarda o cancela la observación que estás escribiendo antes de cambiar de celda."); return;
    }
    setMatrixEditor({ studentId: id, competencyId, contextLabel: "Aula", observationText: "" });
    setError(""); setMessage("");
  }

  function openStudent(id: string, competencyId: string | null = null) {
    if (busy || audioBusy) return;
    if (draftDirty) { setError("Guarda el comentario antes de cambiar de niño."); return; }
    if (matrixEditor?.observationText.trim()) { setError("Guarda o cancela la observación antes de revisar al niño."); return; }
    if (studentId === id) { leaveStudent(() => {}); return; }
    setMatrixEditor(null);
    setStudentId(id); setFocusCompetencyId(competencyId); setDraft(null); setInterview(null); setInterviewError(""); setError(""); setMessage("");
  }
  function showGroup() {
    if (busy || audioBusy) return;
    if (draftDirty) { setError("Guarda o descarta el comentario antes de continuar."); return; }
    if (matrixEditor?.observationText.trim()) { setError("Guarda o cancela la observación antes de revisar el aula."); return; }
    setMatrixEditor(null); leaveStudent(() => setView("group"));
  }
  function leaveGroup(next: () => void) {
    if (busy || audioBusy) return;
    if (groupDraftDirty) { setError("Guarda o descarta los cambios del resumen antes de salir."); return; }
    if (priorityDirty) { setError("Guarda o descarta los cambios de prioridades antes de salir."); return; }
    setError(""); next();
  }
  async function openPriorities() {
    if (!groupConfirmed) return;
    if (priorityConfirmed) { setPriorityDraft(null); setPriorityDraftId(null); setPriorityDirty(false); setView("priorities"); return; }
    await action(async () => {
      const prepared = await prepareDiagnosticPriorities();
      setPriorityDraft(editablePriorities(prepared.details));
      setPriorityDraftId(prepared.id);
      setPriorityDirty(false);
      setView("priorities");
    });
  }
  function leaveStudent(next: () => void) {
    if (busy || audioBusy) return;
    if (draftDirty) { setError("Guarda el comentario antes de continuar."); return; }
    setStudentId(null); setFocusCompetencyId(null); setDraft(null); setInterview(null); setInterviewError(""); next();
  }
  function returnToObserve() {
    if (matrixEditor?.observationText.trim()) { setError("Guarda o cancela la observación antes de volver."); return; }
    leaveStudent(onObserve);
  }
  function updatePriority(index: number, changes: Partial<DiagnosticPriorityDetails["priorities"][number]>) {
    if (!priorityDraft || busy || audioBusy) return;
    const rows = [...priorityDraft.priorities];
    rows[index] = { ...rows[index], ...changes };
    setPriorityDraft({ priorities: rows }); setPriorityDirty(true);
  }
  async function action(work: () => Promise<void>) {
    if (busy || audioBusy) return;
    setBusy(true); setError(""); setMessage("");
    try { await work(); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }

  if (!workspace) return error ? <p role="alert" className="rounded-xl bg-[#fff1d6] p-4">{error} <Button variant="outline" onClick={() => { setError(""); void reload().catch((cause) => setError(cause.message)); }}>Reintentar</Button></p> : <LoadingState label="Cargando revisión diagnóstica..." />;
  return <section ref={panelRef} className="diagnostic-panel scroll-mt-24 space-y-5 p-4 md:p-7">
    <header><p className="text-sm font-bold text-[#087d96]">De las observaciones a tus decisiones</p><h2 className="mt-1 text-2xl font-extrabold">Resume lo que observaste</h2></header>
    {error && <p role="alert" className="rounded-xl bg-[#fff1d6] p-3 text-sm">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-[#e5f8ed] p-3 text-sm">{message}</p>}

    {view === "individual" && <div className="space-y-4">
      <div className="rounded-2xl bg-[#eef8fb] p-4"><p className="font-bold">Mapa de observaciones del aula</p><p className="mt-1 text-sm text-[#426079]">Toca una celda para añadir una observación. Debajo puedes consultar los registros de cada niño y, si deseas, agregar un comentario.</p></div>
      {matrixEditor && matrixStudent && <div ref={matrixEditorRef} className="scroll-mt-24 space-y-4 rounded-2xl border-2 border-[#87cbd9] bg-[#f8fcfd] p-4 sm:p-5">
        <div><p className="text-sm font-bold text-[#087d96]">Nueva observación</p><h3 className="mt-1 text-lg font-bold">{displayPersonName(matrixStudent.name)}{matrixEditor.competencyId ? ` · ${competencyNames.get(matrixEditor.competencyId)}` : ""}</h3><p className="mt-1 text-sm text-[#526b87]">Escribe solo lo que hizo o dijo; la competencia organiza el registro, no indica un nivel de logro.</p></div>
        {!matrixEditor.competencyId && <label className="block text-sm font-semibold">Competencia<select className="mt-1 min-h-11 w-full" value={matrixEditor.competencyId} onChange={(event) => setMatrixEditor({ ...matrixEditor, competencyId: event.target.value })}><option value="">Elige una competencia</option>{matrixCompetencies.map((item) => <option key={item.competency_id} value={item.competency_id}>{item.competency_name}</option>)}</select></label>}
        <label className="block text-sm font-semibold">¿Dónde ocurrió?<select className="mt-1 min-h-11 w-full" value={matrixEditor.contextLabel} onChange={(event) => setMatrixEditor({ ...matrixEditor, contextLabel: event.target.value })}>{observationMoments.map((moment) => <option key={moment}>{moment}</option>)}</select></label>
        <label className="block text-sm font-semibold">¿Qué hizo o dijo?<Textarea className="mt-1 min-h-28 bg-white" maxLength={4000} value={matrixEditor.observationText} onChange={(event) => setMatrixEditor({ ...matrixEditor, observationText: event.target.value })} placeholder="Por ejemplo: Eligió bloques y explicó cómo quería construir una casa." /></label>
        <DictationRecorder key={`${matrixEditor.studentId}:${matrixEditor.competencyId}`} studentId={matrixEditor.studentId} purpose="raw_observation" rawTranscript context={`${matrixEditor.contextLabel}: ${competencyNames.get(matrixEditor.competencyId) ?? "observación"}`} currentText={matrixEditor.observationText} disabled={busy} onBusyChange={setAudioBusy} onTranscribed={(text) => setMatrixEditor((current) => current ? { ...current, observationText: text } : current)} />
        {matrixObservations.length > 0 && <p className="text-xs text-[#526b87]">Ya hay {matrixObservations.length} {matrixObservations.length === 1 ? "observación" : "observaciones"} en esta celda. La nueva nota se añadirá sin borrar las anteriores.</p>}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"><AsyncButton className="min-h-11 w-full sm:w-auto" busy={busy} busyLabel="Guardando..." disabled={!matrixEditor.competencyId || !matrixEditor.observationText.trim()} onClick={() => void action(async () => { await saveMatrixDiagnosticObservation(matrixEditor); onObservationSaved?.(); setMatrixEditor(null); setMessage("Observación guardada. Ya aparece en el mapa y podrás verla al revisar al niño."); })}>Guardar observación</AsyncButton><Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={busy} onClick={() => { setMatrixEditor(null); setError(""); }}>Cancelar</Button></div>
      </div>}
      {matrixCompetencies.length > 0 && <div className="hidden space-y-3 lg:block">
        <h3 className="text-xl font-bold">Mapa de observaciones</h3><p className="text-sm text-[#526b87]">Desliza la tabla hacia los lados para ver todas las competencias.</p>
        <div className="overflow-x-auto rounded-2xl border border-[#d6e5ef] bg-white"><table className="w-full min-w-max border-collapse text-left text-sm">
          <thead className="bg-[#eef8fb]"><tr><th scope="col" className="sticky left-0 z-10 min-w-44 border-b border-r border-[#d6e5ef] bg-[#eef8fb] p-3">Niño</th>{matrixCompetencies.map((competency) => <th scope="col" key={competency.competency_id} className="min-w-44 max-w-52 border-b border-[#d6e5ef] p-3 align-bottom font-semibold">{competency.competency_name}</th>)}</tr></thead>
          <tbody>{workspace.students.map((child) => {
            return <tr key={child.id} className="border-b border-[#e6eef5] last:border-b-0"><th scope="row" className="sticky left-0 z-10 border-r border-[#d6e5ef] bg-white p-3 font-bold">{displayPersonName(child.name)}</th>{matrixCompetencies.map((competency) => {
              const cellObservations = workspace.observations.filter((row) => row.student_id === child.id && row.competency_v4_id === competency.competency_id);
              const latest = cellObservations.at(-1);
              const preview = latest?.observation_text?.trim() || (latest ? `Sin nota escrita · ${latest.aspect_prompt}` : "");
              return <td key={competency.competency_id} className="w-56 max-w-56 p-2"><button type="button" disabled={busy || audioBusy || draftDirty} aria-label={`${displayPersonName(child.name)}, ${competency.competency_name}: ${latest ? preview : "sin observaciones"}. Añadir observación.`} title={latest ? preview : "Añadir observación"} onClick={() => openMatrixCell(child.id, competency.competency_id)} className={`min-h-12 w-full rounded-lg px-3 py-2 text-left hover:bg-[#ccecf2] focus-visible:outline-2 focus-visible:outline-[#087d96] disabled:opacity-60 ${latest ? "bg-[#e3f5f8] text-[#075d70]" : "border border-dashed border-[#bad4e2] bg-[#f4f9fc] font-semibold text-[#087d96]"}`}>{latest ? <><span className="line-clamp-3 break-words text-xs leading-relaxed">{preview}</span>{cellObservations.length > 1 && <span className="mt-1 block text-xs font-semibold">+{cellObservations.length - 1} {cellObservations.length === 2 ? "observación más" : "observaciones más"}</span>}</> : <span className="text-xs">+ Anotar</span>}</button></td>;
            })}</tr>;
          })}</tbody>
        </table></div>
      </div>}
      <section aria-labelledby="optional-child-comments" className="space-y-3">
        <header><h3 id="optional-child-comments" className="text-xl font-bold">Registros y comentarios de cada niño <span className="text-sm font-normal text-[#526b87]">(opcional)</span></h3><p className="mt-1 text-sm text-[#526b87]">Puedes continuar al resumen del aula sin escribir comentarios individuales.</p></header>
        <div className="grid gap-3 sm:grid-cols-2">{workspace.students.map((child) => {
        const childDraft = workspace.student_reviews.find((row) => row.student_id === child.id && row.status === "draft");
        const childConfirmed = workspace.student_reviews.find((row) => row.student_id === child.id && row.status === "confirmed" && row.is_current);
        const count = new Set([...workspace.observations, ...workspace.pending_observations].filter((row) => row.student_id === child.id).map((row) => row.id)).size;
        return <article key={child.id} className={`rounded-2xl border p-4 ${studentId === child.id ? "border-[#087d96] bg-[#eef8fb]" : "border-[#d6e5ef] bg-white"}`}><button type="button" aria-expanded={studentId === child.id} aria-controls="optional-student-review" disabled={busy || audioBusy} className="flex min-h-12 w-full items-center justify-between gap-3 text-left" onClick={() => openStudent(child.id)}><span><span className="block font-bold">{displayPersonName(child.name)}</span><span className="mt-1 block text-sm text-[#526b87]">{count} {count === 1 ? "observación" : "observaciones"}{childConfirmed ? " · Comentario guardado" : childDraft?.details.comment_text ? " · Comentario en borrador" : ""}</span></span><span className="text-sm font-semibold text-[#087d96]">{studentId === child.id ? "Cerrar" : "Ver registros"}</span></button><Button variant="outline" className="mt-3 min-h-11 w-full whitespace-normal sm:w-auto" disabled={busy || audioBusy} onClick={() => openMatrixCell(child.id, "")}>+ Añadir observación</Button></article>;
      })}</div></section>
    </div>}

    {view === "individual" && student && <div id="optional-student-review" ref={studentReviewRef} className="scroll-mt-28 space-y-5 rounded-2xl border border-[#d6e5ef] p-4">
      <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#eef8fb] p-4"><h3 className="text-xl font-bold">Registros de {displayPersonName(student.name)}</h3><Button variant="outline" disabled={busy || audioBusy} onClick={() => leaveStudent(() => {})}>Cerrar</Button></div>
      <section className="space-y-3 rounded-2xl border border-[#d6e5ef] bg-white p-4"><h4 className="text-lg font-bold">1 · Lo que contó la familia</h4><p className="text-xs text-[#526b87]">Es contexto familiar; no es una observación de la docente.</p>
        {interviewError && <p role="alert" className="text-sm text-[#a33c37]">{interviewError}</p>}
        {!interview && !interviewError && <p className="text-sm text-[#526b87]">Sin entrevista confirmada o cargando entrevista.</p>}
        {interview && familyInterviewQuestionGroups(student.name).map((group) => {
          const answers = group.questions.map(({ key }) => ({ key: key as FamilyInterviewAnswerKey,
            answer: interviewAnswer(interview, key as FamilyInterviewAnswerKey) })).filter((item) => item.answer);
          return answers.length ? <div key={group.title} className="pt-1"><h5 className="font-semibold text-[#075d70]">{group.title}</h5>
            <ul className="mt-2 list-disc space-y-2 pl-6 marker:text-[#087d96]">{answers.map(({ key, answer }) => <li key={key} className="pl-1 leading-relaxed"><span className="font-semibold">{interviewSummaryLabels[key]}:</span> {answer}</li>)}</ul>
          </div> : null;
        })}
      </section>
      <section className="space-y-3 rounded-2xl border border-[#d6e5ef] bg-white p-4"><h4 className="text-lg font-bold">2 · Lo que observaste</h4>
        {observations.length === 0 && pendingObservations.length === 0 && <p className="rounded-xl bg-[#f1f6fb] p-3 text-sm">Aún no hay observaciones docentes. Puedes dejar constancia de que necesitas observar más.</p>}
        <ul className="list-disc space-y-3 pl-6 marker:text-[#087d96]">{[...observations.map((row) => ({ id: row.id, competencyId: row.competency_v4_id, observedAt: row.observed_at,
          title: row.experience_title, prompt: row.aspect_prompt, status: statusText[row.observation_status], text: row.observation_text, legacy: row.experience_id === "legacy", hasMedia: row.has_media })),
          ...pendingObservations.map((row) => ({ id: row.id, competencyId: null, observedAt: row.observed_at,
            title: "Observación espontánea", prompt: row.context_label, status: "Aún sin competencia", text: row.observation_text, legacy: false, hasMedia: row.has_media }))]
          .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()).map((row) => <li key={`${row.id}:${row.competencyId ?? "pending"}`} className={`pl-1 text-sm leading-relaxed ${focusCompetencyId && row.competencyId === focusCompetencyId ? "text-[#075d70]" : ""}`}><span className="font-semibold">{new Date(row.observedAt).toLocaleDateString("es-PE")} · {row.title}</span><span className="block text-[#526b87]">{row.legacy ? "Registro anterior" : row.competencyId ? competencyNames.get(row.competencyId) : "Sin competencia asignada"} · {row.status}</span><span className="block">{row.prompt}</span>{row.text && <span className="block">“{row.text}”</span>}{row.hasMedia && <a className="block text-[#075d70] underline" href={spontaneousObservationMediaUrl(row.id)} target="_blank" rel="noreferrer">Abrir archivo privado</a>}</li>)}
        </ul>
      </section>
      <section className="space-y-3 rounded-2xl border border-[#87cbd9] bg-white p-4"><h4 className="text-lg font-bold">Tu comentario sobre {displayPersonName(student.name)} <span className="text-sm font-normal text-[#526b87]">(opcional)</span></h4>
        {confirmed && <div className={`rounded-xl p-3 ${confirmed.is_current ? "bg-[#f0faf4]" : "bg-[#fff5df]"}`}><p className="font-semibold">{confirmed.is_current ? "✓ Comentario confirmado" : "Hay información nueva para revisar"}</p><p className="mt-1 text-sm">{confirmed.details.comment_text}</p></div>}
        {!draft && <Button className="min-h-12 w-full text-base sm:w-auto" disabled={busy || audioBusy} onClick={() => {
          if (currentDraft) { setDraft(currentDraft.details); return; }
          void action(async () => { const prepared = await prepareDiagnosticStudentReview(student.id); setDraft(prepared.details); setMessage("Escribe tu comentario con la información que acabas de revisar."); });
        }}>{currentDraft?.details.comment_text ? "Continuar mi comentario" : confirmed ? "Editar comentario" : "Agregar comentario de la docente"}</Button>}
        {draft && <div className="space-y-3 rounded-xl bg-[#f8fcfd] p-4">
          {draftDirty && <p className="text-sm font-semibold text-[#075d70]">Tienes cambios sin guardar.</p>}
          <fieldset disabled={busy || audioBusy} className="space-y-2"><legend className="font-semibold">Con lo visto hasta ahora...</legend>{([["information_available", "Puedo escribir una primera idea"], ["insufficient_information", "Necesito observar más"]] as const).map(([value, label]) => <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#d6e5ef] bg-white p-3"><input type="radio" name="student-diagnostic-information" checked={draft.information_status === value} onChange={() => { setDraft({ ...draft, information_status: value }); setDraftDirty(true); }} /><span>{label}</span></label>)}</fieldset>
          <label className="block font-semibold">¿Qué conoces de {displayPersonName(student.name)} y qué te gustaría seguir observando?<Textarea disabled={busy || audioBusy} className="mt-2 min-h-32 bg-white" placeholder="Por ejemplo: En el juego eligió materiales y explicó su interés. La familia cuenta que también le gusta construir en casa. Seguiré observando cómo comparte sus ideas con otros niños." value={draft.comment_text} maxLength={3000} onChange={(event) => { setDraft({ ...draft, comment_text: event.target.value }); setDraftDirty(true); }} /></label>
          <DictationRecorder studentId={student.id} purpose="teacher_comment" context="Comentario opcional de la docente" currentText={draft.comment_text} disabled={busy} onBusyChange={setAudioBusy} onTranscribed={(text) => { setDraft({ ...draft, comment_text: text }); setDraftDirty(true); }} />
          <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" className="min-h-11" disabled={busy || audioBusy} onClick={() => { setDraft(null); setDraftDirty(false); setError(""); }}>Cancelar edición</Button><AsyncButton className="min-h-12 whitespace-normal" busy={busy} busyLabel="Guardando..." disabled={audioBusy || !currentDraft || !draft.comment_text.trim()} onClick={() => void action(async () => { await saveDiagnosticStudentReview(currentDraft!.id, draft); await confirmDiagnosticStudentReview(currentDraft!.id); setDraft(null); setDraftDirty(false); setMessage("Comentario guardado."); })}>Guardar comentario</AsyncButton></div>
          {confirmed && !confirmed.is_current && <Button variant="outline" className="min-h-11 whitespace-normal" disabled={busy || audioBusy || draftDirty} onClick={() => void action(async () => { const prepared = await prepareDiagnosticStudentReview(student.id); setDraft(prepared.details); setMessage("Fuentes actualizadas."); })}>Actualizar información del comentario</Button>}
        </div>}
      </section>
    </div>}

    {view === "group" && <div className="space-y-4"><h3 className="text-2xl font-extrabold">Así está mi grupo</h3><p className="text-sm text-[#526b87]">{studentCount} niños en el aula · {reviewedCount} con comentario guardado y vigente. Los comentarios individuales son opcionales.</p>
      {groupConfirmed && <section className={`rounded-xl border p-4 ${groupConfirmed.is_current ? "border-[#b5dfc8] bg-[#f0faf4]" : "border-[#e7c989] bg-[#fff8e7]"}`}><h4 className="font-bold">Visión confirmada por la docente · versión {groupConfirmed.version}</h4><dl className="mt-2 space-y-2 text-sm"><div><dt className="font-semibold">Fortalezas</dt><dd>{groupConfirmed.details.strengths || "Sin registrar"}</dd></div><div><dt className="font-semibold">Necesidades de acompañamiento</dt><dd>{groupConfirmed.details.needs || "Sin registrar"}</dd></div><div><dt className="font-semibold">Qué tendremos en cuenta</dt><dd>{groupConfirmed.details.planning_priorities || "Sin registrar"}</dd></div></dl>{!groupConfirmed.is_current && <p className="mt-3 text-sm font-semibold">Hay información nueva. Puedes preparar otra versión de esta visión cuando lo consideres necesario.</p>}</section>}
      <section className="space-y-5 rounded-xl border border-[#d6e5ef] bg-[#f6fafc] p-4 sm:p-5"><h4 className="text-lg font-bold">Información del aula</h4><div><p className="font-semibold">Intereses contados por las familias</p><p className="text-sm text-[#526b87]">{workspace.derived_group_information?.confirmed_interviews ?? 0} entrevistas confirmadas</p>{workspace.derived_group_information?.interests.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{workspace.derived_group_information.interests.map((item) => <li key={item.key}>{item.label} · {item.count} {item.count === 1 ? "familia" : "familias"}</li>)}</ul> : <p className="mt-2 text-sm">Todavía no hay intereses frecuentes registrados en las entrevistas confirmadas.</p>}</div><div><p className="font-semibold">Competencias con registros pendientes</p><p className="text-sm text-[#526b87]">Sin registro significa información insuficiente, no dificultad.</p>{workspace.derived_group_information?.observation_gaps.length ? <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed">{workspace.derived_group_information.observation_gaps.map((item) => <li key={item.competency_id}>{item.competency_name} · faltan registros de {item.children_without_observations} de {studentCount} niños</li>)}</ul> : <p className="mt-2 text-sm">Hay registros en todas las competencias aplicables.</p>}</div></section>
      {!groupDraft && <div>
        <Button variant={groupConfirmed ? "outline" : "default"} className="min-h-12 w-full whitespace-normal text-base sm:w-auto" disabled={busy || audioBusy} onClick={() => {
          void action(async () => { const prepared = await prepareDiagnosticGroup(); setGroupDraft(prepared.details); setGroupDraftDirty(false); setMessage(""); });
        }}>{groupReview ? "Continuar borrador del aula" : groupConfirmed ? "Corregir resumen del aula" : "Escribir resumen del aula"}</Button>
      </div>}
      {groupDraft && <div className="space-y-5 rounded-2xl border border-[#c7e4ec] bg-[#f8fcfd] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-lg font-bold">Tu resumen del aula</h4>
        {!groupDraftDirty && !hasGroupText && groupReview && <AsyncButton variant="outline" className="min-h-11 whitespace-normal" busy={busy} disabled={audioBusy} busyLabel="Preparando propuesta..." onClick={() => void action(async () => { const suggestion = await suggestDiagnosticGroup(groupReview.id); setGroupDraft(suggestion.details); setGroupDraftDirty(true); setMessage("Revisa la propuesta de Ayni antes de continuar."); })}>Sugerir resumen con Ayni</AsyncButton>}</div>
        {groupSummaryPrompts.map(([field, label, example]) => <div key={field} className="space-y-2"><label className="block text-lg font-semibold">{label}<Textarea disabled={busy || audioBusy} className="mt-2 min-h-28 bg-white placeholder:italic placeholder:text-[#8292a8]" maxLength={3000} placeholder={example} value={groupDraft[field]} onChange={(event) => { setGroupDraft({ ...groupDraft, [field]: event.target.value }); setGroupDraftDirty(true); }} /></label><DictationRecorder classroomScope purpose="group_summary" context={label} currentText={groupDraft[field]} disabled={busy || (audioBusy && groupAudioField !== field)} onBusyChange={(recording) => { setAudioBusy(recording); setGroupAudioField(recording ? field : null); }} onTranscribed={(text) => { setGroupDraft((current) => current ? { ...current, [field]: text } : current); setGroupDraftDirty(true); }} /></div>)}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d6e5ef] pt-4"><Button variant="ghost" className="min-h-11 whitespace-normal" disabled={busy || audioBusy} onClick={() => { setGroupDraft(null); setGroupDraftDirty(false); setError(""); }}>{groupDraftDirty ? "Descartar cambios" : "Cerrar editor"}</Button><AsyncButton variant="outline" className="min-h-11 whitespace-normal" busy={busy} busyLabel="Guardando..." disabled={audioBusy || !groupReview || !hasGroupText} onClick={() => void action(async () => { await saveDiagnosticGroup(groupReview!.id, groupDraft); setGroupDraft(null); setGroupDraftDirty(false); setMessage("Resumen guardado como borrador."); })}>Guardar para después</AsyncButton></div>
      </div>}
      <DiagnosticNavigation backLabel="Volver al mapa" disabled={busy || audioBusy} onBack={() => leaveGroup(() => setView("individual"))}>
        {groupDraft ? <AsyncButton className={navigationButtonClass} busy={busy} busyLabel="Guardando..." disabled={audioBusy || !groupReview || !hasGroupText} onClick={() => void action(async () => {
          await saveDiagnosticGroup(groupReview!.id, groupDraft); await confirmDiagnosticGroup(groupReview!.id);
          setGroupDraft(null); setGroupDraftDirty(false); setMessage("Resumen confirmado.");
          const prepared = await prepareDiagnosticPriorities(); setPriorityDraftId(prepared.id); setPriorityDraft(editablePriorities(prepared.details)); setPriorityDirty(false); setView("priorities");
        })}>Confirmar y continuar <ArrowRight className="shrink-0" /></AsyncButton> : groupConfirmed && <AsyncButton className={navigationButtonClass} busy={busy} busyLabel="Abriendo..." onClick={() => void openPriorities()}>{priorityConfirmed ? "Ver prioridades del año" : "Continuar a prioridades"}<ArrowRight className="shrink-0" /></AsyncButton>}
      </DiagnosticNavigation>
    </div>}
    {view === "priorities" && groupConfirmed && <div className="space-y-4">
      <header><h3 className="text-2xl font-extrabold">Prioridades del año</h3><p className="mt-1 text-sm text-[#526b87]">¿Qué merece más atención en tu aula? Escribe una idea, cuenta por qué y elige la competencia relacionada. Trabajaremos todas las competencias durante el año.</p></header>
      <div className="rounded-xl border border-[#d6e5ef] bg-[#f6fafc] p-4"><p className="font-bold">Punto de partida confirmado</p><p className="mt-2 text-sm">{groupConfirmed.details.strengths} {groupConfirmed.details.needs}</p></div>
      {priorityConfirmed && !priorityDraft && <section className="rounded-xl border border-[#b5dfc8] bg-[#f0faf4] p-4"><h4 className="font-bold">Prioridades confirmadas · versión {priorityConfirmed.version}</h4>
        <ul className="mt-3 space-y-3">{priorityConfirmed.details.priorities.map((item, index) => <li key={index} className="rounded-lg bg-white p-3"><b>{item.title}</b><p className="text-sm">{item.reason}</p><p className="mt-1 text-xs text-[#526b87]">{item.related_competency_ids.map((id) => competencyNames.get(id) ?? id).join(" · ")}</p></li>)}</ul>
        <Button variant="outline" className="mt-4 min-h-12 whitespace-normal" disabled={busy || audioBusy} onClick={() => void action(async () => { const prepared = await prepareDiagnosticPriorities(); setPriorityDraftId(prepared.id); setPriorityDraft(editablePriorities(prepared.details)); setPriorityDirty(false); })}>Editar prioridades en una nueva versión</Button>
      </section>}
      {!priorityConfirmed && !priorityDraft && <Button className="min-h-12" disabled={busy} onClick={() => void openPriorities()}>Revisar prioridades <ArrowRight /></Button>}
      {priorityDraft && <section className="space-y-4 rounded-xl border border-[#c7e4ec] bg-[#f8fcfd] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-lg font-bold">Lo que queremos acompañar este año</h4>
        {!priorityDirty && priorityDraft.priorities.every((item) => !item.title.trim() && !item.reason.trim()) && priorityDraftId && <AsyncButton variant="outline" busy={busy} busyLabel="Preparando..." onClick={() => void action(async () => { const suggestion = await suggestDiagnosticPriorities(priorityDraftId); setPriorityDraft(editablePriorities(suggestion.details)); setPriorityDirty(true); setMessage("Revisa la propuesta de Ayni antes de confirmar."); })}>Sugerir con Ayni</AsyncButton>}</div>
        {priorityDraft.priorities.map((item, index) => <div key={index} className="space-y-4 rounded-xl border bg-white p-4"><h5 className="text-lg font-bold text-[#075d70]">Prioridad {index + 1}</h5>
          <label className="block font-semibold">1. ¿Qué quieres acompañar?<Input disabled={busy || audioBusy} className="mt-2 bg-white placeholder:text-[#8292a8]" placeholder="Por ejemplo: Que los niños expresen sus ideas y escuchen a sus compañeros." value={item.title} maxLength={180} onChange={(event) => updatePriority(index, { title: event.target.value })} /></label>
          <label className="block font-semibold">2. ¿Qué observaste para elegirlo?<Textarea disabled={busy || audioBusy} className="mt-2 min-h-24 bg-white placeholder:italic placeholder:text-[#8292a8]" placeholder="Por ejemplo: En la asamblea varios niños necesitaron apoyo para esperar su turno y contar lo que pensaban." value={item.reason} maxLength={500} onChange={(event) => updatePriority(index, { reason: event.target.value })} /></label>
          <label className="block font-semibold">3. ¿Con qué competencia se relaciona?<select disabled={busy || audioBusy} className="mt-2 min-h-12 w-full rounded-lg border bg-white px-3 text-sm" value={item.related_competency_ids[0] ?? ""} onChange={(event) => updatePriority(index, { related_competency_ids: event.target.value ? [event.target.value, ...item.related_competency_ids.slice(1).filter((id) => id !== event.target.value)] : [] })}><option value="">Elige una competencia</option>{matrixCompetencies.map((card) => <option key={card.competency_id} value={card.competency_id}>{card.competency_name}</option>)}</select></label>
          {item.related_competency_ids.length > 0 && <details className="rounded-xl border border-[#d6e5ef] bg-[#f8fcfd] p-3"><summary className="cursor-pointer text-sm font-semibold text-[#075d70]">Añadir otra competencia (opcional){item.related_competency_ids.length > 1 ? ` · ${item.related_competency_ids.length - 1} añadidas` : ""}</summary><fieldset disabled={busy || audioBusy} className="mt-3 grid gap-2 sm:grid-cols-2">{matrixCompetencies.filter((card) => card.competency_id !== item.related_competency_ids[0]).map((card) => <label key={card.competency_id} className="flex min-h-11 items-start gap-2 rounded-lg border bg-white p-2 text-sm"><input type="checkbox" className="mt-1" checked={item.related_competency_ids.includes(card.competency_id)} disabled={!item.related_competency_ids.includes(card.competency_id) && item.related_competency_ids.length >= 4} onChange={(event) => updatePriority(index, { related_competency_ids: event.target.checked ? [...item.related_competency_ids, card.competency_id] : item.related_competency_ids.filter((id) => id !== card.competency_id) })} />{card.competency_name}</label>)}</fieldset></details>}
          <label className="block font-semibold">¿Cómo lo acompañaremos?<select disabled={busy || audioBusy} className="mt-2 min-h-12 w-full rounded-lg border bg-white px-3 text-sm" value={item.importance} onChange={(event) => updatePriority(index, { importance: event.target.value as typeof item.importance })}><option value="higher">Daremos más oportunidades para practicar</option><option value="normal">Seguiremos aprovechando esta fortaleza</option><option value="observe_more">Primero observaremos para conocer mejor</option></select></label>
          <div className="flex justify-end"><Button variant="ghost" disabled={busy || audioBusy} onClick={() => { setPriorityDraft({ priorities: priorityDraft.priorities.filter((_, i) => i !== index) }); setPriorityDirty(true); }}>Quitar prioridad</Button></div>
        </div>)}
        {!priorityDraft.priorities.length && <p className="rounded-xl bg-white p-4 text-sm text-[#526b87]">Sin prioridades específicas por ahora. Puedes confirmar así y seguir trabajando todas las competencias, o agregar una prioridad.</p>}
        <div className="flex flex-wrap justify-between gap-3 border-t border-[#d6e5ef] pt-4"><Button variant="outline" className="min-h-11" disabled={busy || audioBusy || priorityDraft.priorities.length >= 6} onClick={() => { setPriorityDraft({ priorities: [...priorityDraft.priorities, newPriority()] }); setPriorityDirty(true); }}>+ Agregar otra prioridad</Button><AsyncButton variant="outline" busy={busy} busyLabel="Guardando..." disabled={!priorityDraftId || !validPriorityDraft} onClick={() => void action(async () => { await saveDiagnosticPriorities(priorityDraftId!, priorityDraft); setPriorityDirty(false); setMessage("Borrador de prioridades guardado."); })}>Guardar para después</AsyncButton></div>
        {priorityDirty && <Button variant="ghost" disabled={busy} onClick={() => { const saved = workspace.priority_reviews.find((row) => row.id === priorityDraftId); if (saved) setPriorityDraft(editablePriorities(saved.details)); setPriorityDirty(false); setError(""); }}>Descartar cambios sin guardar</Button>}
      </section>}
      <DiagnosticNavigation backLabel="Así está mi grupo" disabled={busy || audioBusy} onBack={() => leaveGroup(() => setView("group"))}>
        {priorityDraft ? <AsyncButton className={navigationButtonClass} busy={busy} busyLabel="Confirmando..." disabled={!priorityDraftId || !validPriorityDraft} onClick={() => void action(async () => { await saveDiagnosticPriorities(priorityDraftId!, priorityDraft); await confirmDiagnosticPriorities(priorityDraftId!); setPriorityDraft(null); setPriorityDraftId(null); setPriorityDirty(false); onGroupConfirmed?.(); setMessage("Prioridades confirmadas. Ya puedes preparar el plan anual."); })}>Confirmar prioridades <ArrowRight className="shrink-0" /></AsyncButton> : priorityConfirmed && onPlan && <Button className={navigationButtonClass} disabled={busy || audioBusy} onClick={onPlan}>Continuar al plan anual <ArrowRight className="shrink-0" /></Button>}
      </DiagnosticNavigation>
    </div>}
    {view === "individual" && <DiagnosticNavigation backLabel="Volver a observar" disabled={busy || audioBusy} onBack={returnToObserve}><Button className={navigationButtonClass} disabled={busy || audioBusy} onClick={showGroup}>Revisar aula <ArrowRight className="shrink-0" /></Button></DiagnosticNavigation>}
  </section>;
}
