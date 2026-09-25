"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmDiagnosticGroup, confirmDiagnosticStudentReview, loadDiagnosticReview, loadFamilyInterview,
  prepareDiagnosticGroup, prepareDiagnosticStudentReview, saveDiagnosticGroup, saveDiagnosticStudentReview,
  suggestDiagnosticGroup,
  saveMatrixDiagnosticObservation, spontaneousObservationMediaUrl,
  type DiagnosticGroupDetails, type DiagnosticReviewWorkspace, type DiagnosticStudentReviewDetails,
  type DiagnosticObservationStatus, type FamilyInterview, type FamilyInterviewAnswerKey,
} from "@/src/lib/local-database";
import { familyInterviewQuestionGroups, interviewInterestOptions, interviewLanguageOptions,
  interviewPreviousEducationTypeOptions } from "@/src/lib/family-interview-contract.mjs";
import { AsyncButton, LoadingState } from "./workflow-ui";
import { diagnosticReviewProgress } from "@/src/lib/diagnostic-review-progress.mjs";

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
  ["planning_priorities", "¿Qué tendrás en cuenta al planificar?", "Por ejemplo: Propondré juegos en grupos pequeños y momentos para escuchar las ideas de todos."],
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

export function DiagnosticReview({ onObserve, onPlan, onGroupConfirmed }: { onObserve: () => void; onPlan?: () => void; onGroupConfirmed?: () => void }) {
  const [workspace, setWorkspace] = useState<DiagnosticReviewWorkspace | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [focusCompetencyId, setFocusCompetencyId] = useState<string | null>(null);
  const [view, setView] = useState<"individual" | "group">("individual");
  const [interview, setInterview] = useState<FamilyInterview | null>(null);
  const [interviewError, setInterviewError] = useState("");
  const [draft, setDraft] = useState<DiagnosticStudentReviewDetails | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [groupDraft, setGroupDraft] = useState<DiagnosticGroupDetails | null>(null);
  const [groupDraftDirty, setGroupDraftDirty] = useState(false);
  const [matrixEditor, setMatrixEditor] = useState<MatrixObservationDraft | null>(null);
  const matrixEditorRef = useRef<HTMLDivElement>(null);
  const matrixSelection = matrixEditor ? `${matrixEditor.studentId}:${matrixEditor.competencyId}` : "";
  const [busy, setBusy] = useState(false);
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
    if (matrixSelection) matrixEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [matrixSelection]);

  const student = workspace?.students.find((item) => item.id === studentId);
  const studentReviews = workspace?.student_reviews.filter((item) => item.student_id === studentId) ?? [];
  const currentDraft = studentReviews.find((item) => item.status === "draft");
  const confirmed = studentReviews.find((item) => item.status === "confirmed");
  const observations = workspace?.observations.filter((item) => item.student_id === studentId) ?? [];
  const pendingObservations = workspace?.pending_observations.filter((item) => item.student_id === studentId) ?? [];
  const progress = workspace ? diagnosticReviewProgress(workspace) : null;
  const reviewedCount = progress?.reviewedCount ?? 0;
  const studentCount = progress?.studentCount ?? 0;
  const allReviewed = progress?.allReviewed ?? false;
  const nextStudent = workspace?.students.find((item) => item.id !== studentId && progress?.children.find((row) => row.studentId === item.id)?.status !== "reviewed");
  const groupReview = workspace?.group_reviews.find((item) => item.status === "draft");
  const groupConfirmed = workspace?.group_reviews.find((item) => item.status === "confirmed");
  const matrixCompetencies = workspace?.group_coverage ?? [];
  const competencyNames = new Map(workspace?.group_coverage.map((item) => [item.competency_id, item.competency_name]) ?? []);
  const matrixStudent = workspace?.students.find((item) => item.id === matrixEditor?.studentId);
  const matrixObservations = workspace?.observations.filter((item) => item.student_id === matrixEditor?.studentId && item.competency_v4_id === matrixEditor?.competencyId) ?? [];

  function openMatrixCell(id: string, competencyId: string) {
    if (matrixEditor?.studentId === id && matrixEditor.competencyId === competencyId) return;
    if (matrixEditor?.observationText.trim() && (matrixEditor.studentId !== id || matrixEditor.competencyId !== competencyId)) {
      setError("Guarda o cancela la observación que estás escribiendo antes de cambiar de celda."); return;
    }
    setMatrixEditor({ studentId: id, competencyId, contextLabel: "Aula", observationText: "" });
    setError(""); setMessage("");
  }

  function openStudent(id: string, competencyId: string | null = null) {
    if (draftDirty) { setError("Guarda el comentario antes de cambiar de niño."); return; }
    if (matrixEditor?.observationText.trim()) { setError("Guarda o cancela la observación antes de revisar al niño."); return; }
    setMatrixEditor(null);
    setStudentId(id); setFocusCompetencyId(competencyId); setDraft(null); setInterview(null); setInterviewError(""); setError(""); setMessage("");
  }
  function showGroup() {
    if (matrixEditor?.observationText.trim()) { setError("Guarda o cancela la observación antes de revisar el aula."); return; }
    setMatrixEditor(null); setView("group");
  }
  function leaveGroup(next: () => void) {
    if (groupDraftDirty) { setError("Guarda o descarta los cambios del resumen antes de salir."); return; }
    setError(""); next();
  }
  function leaveStudent(next: () => void) {
    if (busy) return;
    if (draftDirty) { setError("Guarda el comentario antes de continuar."); return; }
    setStudentId(null); setFocusCompetencyId(null); setDraft(null); setInterview(null); setInterviewError(""); next();
  }
  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await work(); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }

  if (!workspace) return error ? <p role="alert" className="rounded-xl bg-[#fff1d6] p-4">{error} <Button variant="outline" onClick={() => { setError(""); void reload().catch((cause) => setError(cause.message)); }}>Reintentar</Button></p> : <LoadingState label="Cargando revisión diagnóstica..." />;
  return <section className="diagnostic-panel space-y-5 p-4 md:p-7">
    <header><p className="text-sm font-bold text-[#087d96]">De las observaciones a tus decisiones</p><h2 className="mt-1 text-2xl font-extrabold">Resume lo que observaste</h2></header>
    {error && <p role="alert" className="rounded-xl bg-[#fff1d6] p-3 text-sm">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-[#e5f8ed] p-3 text-sm">{message}</p>}

    {view === "individual" && !student && <div className="space-y-4">
      <div className="rounded-2xl bg-[#eef8fb] p-4"><p className="font-bold">{reviewedCount} de {studentCount} niños revisados</p><p className="mt-1 text-sm text-[#426079]">Toca una celda para anotar lo que viste. Abre al niño para escribir su comentario diagnóstico.</p></div>
      {matrixEditor && matrixStudent && <div ref={matrixEditorRef} className="scroll-mt-24 space-y-4 rounded-2xl border-2 border-[#87cbd9] bg-[#f8fcfd] p-4 sm:p-5">
        <div><p className="text-sm font-bold text-[#087d96]">Nueva observación</p><h3 className="mt-1 text-lg font-bold">{matrixStudent.name}{matrixEditor.competencyId ? ` · ${competencyNames.get(matrixEditor.competencyId)}` : ""}</h3><p className="mt-1 text-sm text-[#526b87]">Escribe solo lo que hizo o dijo; la competencia organiza el registro, no indica un nivel de logro.</p></div>
        {!matrixEditor.competencyId && <label className="block text-sm font-semibold">Competencia<select className="mt-1 min-h-11 w-full" value={matrixEditor.competencyId} onChange={(event) => setMatrixEditor({ ...matrixEditor, competencyId: event.target.value })}><option value="">Elige una competencia</option>{matrixCompetencies.map((item) => <option key={item.competency_id} value={item.competency_id}>{item.competency_name}</option>)}</select></label>}
        <label className="block text-sm font-semibold">¿Dónde ocurrió?<select className="mt-1 min-h-11 w-full" value={matrixEditor.contextLabel} onChange={(event) => setMatrixEditor({ ...matrixEditor, contextLabel: event.target.value })}>{observationMoments.map((moment) => <option key={moment}>{moment}</option>)}</select></label>
        <label className="block text-sm font-semibold">¿Qué hizo o dijo?<Textarea className="mt-1 min-h-28 bg-white" maxLength={4000} value={matrixEditor.observationText} onChange={(event) => setMatrixEditor({ ...matrixEditor, observationText: event.target.value })} placeholder="Por ejemplo: Eligió bloques y explicó cómo quería construir una casa." /></label>
        {matrixObservations.length > 0 && <p className="text-xs text-[#526b87]">Ya hay {matrixObservations.length} {matrixObservations.length === 1 ? "observación" : "observaciones"} en esta celda. La nueva nota se añadirá sin borrar las anteriores.</p>}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"><AsyncButton className="min-h-11 w-full sm:w-auto" busy={busy} busyLabel="Guardando..." disabled={!matrixEditor.competencyId || !matrixEditor.observationText.trim()} onClick={() => void action(async () => { await saveMatrixDiagnosticObservation(matrixEditor); setMatrixEditor(null); setMessage("Observación guardada. Ya aparece en el mapa y podrás verla al revisar al niño."); })}>Guardar observación</AsyncButton><Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={busy} onClick={() => { setMatrixEditor(null); setError(""); }}>Cancelar</Button></div>
      </div>}
      {matrixCompetencies.length > 0 && <div className="hidden space-y-3 lg:block">
        <h3 className="text-xl font-bold">Mapa de observaciones</h3><p className="text-sm text-[#526b87]">Desliza la tabla hacia los lados para ver todas las competencias.</p>
        <div className="overflow-x-auto rounded-2xl border border-[#d6e5ef] bg-white"><table className="w-full min-w-max border-collapse text-left text-sm">
          <thead className="bg-[#eef8fb]"><tr><th scope="col" className="sticky left-0 z-10 min-w-44 border-b border-r border-[#d6e5ef] bg-[#eef8fb] p-3">Niño</th>{matrixCompetencies.map((competency) => <th scope="col" key={competency.competency_id} className="min-w-44 max-w-52 border-b border-[#d6e5ef] p-3 align-bottom font-semibold">{competency.competency_name}</th>)}<th scope="col" className="min-w-40 border-b border-[#d6e5ef] p-3">Comentario</th></tr></thead>
          <tbody>{workspace.students.map((child) => {
            const childDraft = workspace.student_reviews.find((row) => row.student_id === child.id && row.status === "draft");
            const childConfirmed = workspace.student_reviews.find((row) => row.student_id === child.id && row.status === "confirmed" && row.is_current);
            return <tr key={child.id} className="border-b border-[#e6eef5] last:border-b-0"><th scope="row" className="sticky left-0 z-10 border-r border-[#d6e5ef] bg-white p-3 font-bold">{child.name}</th>{matrixCompetencies.map((competency) => {
              const cellObservations = workspace.observations.filter((row) => row.student_id === child.id && row.competency_v4_id === competency.competency_id);
              const latest = cellObservations.at(-1);
              const preview = latest?.observation_text?.trim() || (latest ? `Sin nota escrita · ${latest.aspect_prompt}` : "");
              return <td key={competency.competency_id} className="w-56 max-w-56 p-2"><button type="button" aria-label={`${child.name}, ${competency.competency_name}: ${latest ? preview : "sin observaciones"}. Añadir observación.`} title={latest ? preview : "Añadir observación"} onClick={() => openMatrixCell(child.id, competency.competency_id)} className={`min-h-12 w-full rounded-lg px-3 py-2 text-left hover:bg-[#ccecf2] focus-visible:outline-2 focus-visible:outline-[#087d96] ${latest ? "bg-[#e3f5f8] text-[#075d70]" : "border border-dashed border-[#bad4e2] bg-[#f4f9fc] font-semibold text-[#087d96]"}`}>{latest ? <><span className="line-clamp-3 break-words text-xs leading-relaxed">{preview}</span>{cellObservations.length > 1 && <span className="mt-1 block text-xs font-semibold">+{cellObservations.length - 1} {cellObservations.length === 2 ? "observación más" : "observaciones más"}</span>}</> : <span className="text-xs">+ Anotar</span>}</button></td>;
            })}<td className="p-2"><button type="button" onClick={() => openStudent(child.id)} className={`min-h-12 w-full rounded-lg px-3 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-[#087d96] ${childConfirmed ? "bg-[#e5f8ed] text-[#17653d]" : childDraft ? "bg-[#fff2d4] text-[#735116]" : "bg-[#e3f5f8] text-[#075d70]"}`}>{childConfirmed ? "✓ Revisado" : childDraft ? "Continuar" : "Revisar niño"}</button></td></tr>;
          })}</tbody>
        </table></div>
      </div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">{workspace.students.map((child) => {
        const childDraft = workspace.student_reviews.find((row) => row.student_id === child.id && row.status === "draft");
        const childConfirmed = workspace.student_reviews.find((row) => row.student_id === child.id && row.status === "confirmed" && row.is_current);
        const count = workspace.observations.filter((row) => row.student_id === child.id).length + workspace.pending_observations.filter((row) => row.student_id === child.id).length;
        return <article key={child.id} className="rounded-2xl border border-[#d6e5ef] bg-white p-4"><h3 className="font-bold">{childConfirmed ? "✓ " : ""}{child.name}</h3><p className="mt-1 text-sm text-[#526b87]">{count} {count === 1 ? "observación" : "observaciones"} · {childConfirmed ? "Revisado" : childDraft ? "Borrador" : "Por revisar"}</p><div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Button className="min-h-11 w-full sm:w-auto" onClick={() => openStudent(child.id)}>Revisar niño <ArrowRight /></Button><Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => openMatrixCell(child.id, "")}>+ Anotar observación</Button></div></article>;
      })}</div>
      {allReviewed && <Button className="min-h-12 w-full text-base sm:w-auto" onClick={showGroup}>Revisar aula <ArrowRight /></Button>}
      {!allReviewed && groupConfirmed && <Button variant="outline" className="min-h-12" onClick={showGroup}>Ver resumen de aula anterior</Button>}
    </div>}

    {view === "individual" && student && <div className="space-y-5">
      <Button variant="outline" className="diagnostic-back-button" onClick={() => leaveStudent(() => {})}><ArrowLeft /> Ver todos los niños</Button>
      <div className="rounded-2xl bg-[#eef8fb] p-4"><h3 className="text-xl font-bold">Revisar a {student.name}</h3><p className="mt-1 text-sm text-[#426079]">Entrevista + observaciones → tu comentario diagnóstico</p></div>
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
      <section className="space-y-3 rounded-2xl border border-[#87cbd9] bg-white p-4"><h4 className="text-lg font-bold">3 · Tu comentario sobre {student.name}</h4>
        {confirmed && <div className={`rounded-xl p-3 ${confirmed.is_current ? "bg-[#f0faf4]" : "bg-[#fff5df]"}`}><p className="font-semibold">{confirmed.is_current ? "✓ Comentario confirmado" : "Hay información nueva para revisar"}</p><p className="mt-1 text-sm">{confirmed.details.comment_text}</p></div>}
        {!draft && <Button className="min-h-12 w-full text-base sm:w-auto" disabled={busy} onClick={() => {
          if (currentDraft) { setDraft(currentDraft.details); return; }
          void action(async () => { const prepared = await prepareDiagnosticStudentReview(student.id); setDraft(prepared.details); setMessage("Escribe tu comentario con la información que acabas de revisar."); });
        }}>{currentDraft ? "Continuar mi comentario" : confirmed ? "Actualizar mi comentario" : "Escribir mi comentario"} <ArrowRight /></Button>}
        {draft && <div className="space-y-3 rounded-xl bg-[#f8fcfd] p-4">
          {draftDirty && <p className="text-sm font-semibold text-[#075d70]">Tienes cambios sin guardar.</p>}
          <fieldset className="space-y-2"><legend className="font-semibold">Con lo visto hasta ahora...</legend>{([["information_available", "Puedo escribir una primera idea"], ["insufficient_information", "Necesito observar más"]] as const).map(([value, label]) => <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#d6e5ef] bg-white p-3"><input type="radio" name="student-diagnostic-information" checked={draft.information_status === value} onChange={() => { setDraft({ ...draft, information_status: value }); setDraftDirty(true); }} /><span>{label}</span></label>)}</fieldset>
          <label className="block font-semibold">¿Qué conoces de {student.name} y qué te gustaría seguir observando?<Textarea className="mt-2 min-h-32 bg-white" placeholder="Por ejemplo: En el juego eligió materiales y explicó su interés. La familia cuenta que también le gusta construir en casa. Seguiré observando cómo comparte sus ideas con otros niños." value={draft.comment_text} maxLength={3000} onChange={(event) => { setDraft({ ...draft, comment_text: event.target.value }); setDraftDirty(true); }} /></label>
          <p className="text-xs text-[#526b87]">Distingue lo que contó la familia de lo que viste tú. No asignes niveles de logro.</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"><AsyncButton className="min-h-12 w-full sm:w-auto" busy={busy} busyLabel="Confirmando..." disabled={!currentDraft || !draft.comment_text.trim()} onClick={() => void action(async () => { await saveDiagnosticStudentReview(currentDraft!.id, draft); await confirmDiagnosticStudentReview(currentDraft!.id); setDraft(null); setDraftDirty(false); setMessage("Comentario confirmado. Continúa con el siguiente niño."); })}>Confirmar y seguir</AsyncButton><AsyncButton variant="outline" className="min-h-12 w-full sm:w-auto" busy={busy} busyLabel="Guardando..." disabled={!currentDraft || !draft.comment_text.trim()} onClick={() => void action(async () => { await saveDiagnosticStudentReview(currentDraft!.id, draft); setDraftDirty(false); setMessage("Borrador guardado. Puedes continuar después."); })}>Guardar para después</AsyncButton></div>
          <Button variant="ghost" className="min-h-11" disabled={busy || draftDirty} onClick={() => void action(async () => { const prepared = await prepareDiagnosticStudentReview(student.id); setDraft(prepared.details); setMessage("Fuentes actualizadas. Revisa los datos antes de confirmar."); })}>Actualizar fuentes</Button>
        </div>}
      </section>
      {(confirmed?.is_current && nextStudent || allReviewed) && <div className="border-t border-[#d6e5ef] pt-4">
        {confirmed?.is_current && nextStudent && <Button className="min-h-12 w-full text-base sm:w-auto" onClick={() => leaveStudent(() => openStudent(nextStudent.id))}>Revisar a {nextStudent.name} <ArrowRight /></Button>}
        {allReviewed && <Button className="min-h-12 w-full text-base sm:w-auto" onClick={() => leaveStudent(() => setView("group"))}>Revisar aula <ArrowRight /></Button>}
      </div>}
    </div>}

    {view === "group" && <div className="space-y-4"><h3 className="text-xl font-bold">Revisar aula</h3><p className="text-sm text-[#526b87]">{reviewedCount} de {studentCount} niños con comentario confirmado y vigente.</p>
      {!allReviewed && <p className="rounded-xl bg-[#fff5df] p-3 text-sm">Revisa el comentario de cada niño antes de preparar el resumen del aula.</p>}
      {groupConfirmed && <section className={`rounded-xl border p-4 ${groupConfirmed.is_current ? "border-[#b5dfc8] bg-[#f0faf4]" : "border-[#e7c989] bg-[#fff8e7]"}`}><h4 className="font-bold">Decisiones de la docente · versión {groupConfirmed.version}{groupConfirmed.is_current ? " · confirmadas y vigentes" : " · requieren revisión"}</h4><dl className="mt-2 space-y-2 text-sm"><div><dt className="font-semibold">Fortalezas</dt><dd>{groupConfirmed.details.strengths || "Sin registrar"}</dd></div><div><dt className="font-semibold">Necesidades</dt><dd>{groupConfirmed.details.needs || "Sin registrar"}</dd></div><div><dt className="font-semibold">Prioridades</dt><dd>{groupConfirmed.details.planning_priorities || "Sin registrar"}</dd></div></dl>{Boolean(groupConfirmed.details.competency_priorities?.length) && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{groupConfirmed.details.competency_priorities?.map((item) => <li key={item.competency_id}><b>{competencyNames.get(item.competency_id) ?? item.competency_id}:</b> {item.reason}</li>)}</ul>}{!groupConfirmed.is_current && <p className="mt-3 text-sm font-semibold">Hay entrevistas, observaciones o comentarios nuevos. Revisa y confirma el diagnóstico antes del plan anual.</p>}</section>}
      <section className="rounded-xl border border-[#d6e5ef] bg-[#f6fafc] p-4"><h4 className="font-bold">Información que Ayni detecta</h4><p className="mt-1 text-xs text-[#526b87]">Son datos para revisar; no son conclusiones ni prioridades confirmadas.</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><div><p className="text-sm font-semibold">Intereses contados por las familias</p><p className="text-xs text-[#526b87]">{workspace?.derived_group_information?.confirmed_interviews ?? 0} entrevistas confirmadas</p>{workspace?.derived_group_information?.interests.length ? <ul className="mt-2 list-disc pl-5 text-sm">{workspace.derived_group_information.interests.slice(0, 6).map((item) => <li key={item.key}>{item.label} · {item.count} {item.count === 1 ? "familia" : "familias"}</li>)}</ul> : <p className="mt-2 text-sm">Todavía no hay intereses frecuentes registrados en las entrevistas confirmadas.</p>}</div><div><p className="text-sm font-semibold">Competencias que conviene seguir observando</p><p className="text-xs text-[#526b87]">Sin registro significa información insuficiente, no dificultad.</p>{workspace?.derived_group_information?.observation_gaps.length ? <ul className="mt-2 max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm">{workspace.derived_group_information.observation_gaps.map((item) => <li key={item.competency_id}>{item.competency_name} · faltan registros de {item.children_without_observations} de {studentCount}</li>)}</ul> : <p className="mt-2 text-sm">Hay registros en todas las competencias aplicables.</p>}</div></div></section>
      {allReviewed && !groupDraft && <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {groupConfirmed?.is_current && onPlan && <Button className="min-h-12 w-full text-base sm:w-auto" onClick={onPlan}>Continuar al plan anual <ArrowRight /></Button>}
        <Button variant={groupConfirmed?.is_current && onPlan ? "outline" : "default"} className="min-h-12 w-full text-base sm:w-auto" disabled={busy} onClick={() => {
          void action(async () => { const prepared = await prepareDiagnosticGroup(); setGroupDraft(prepared.details); setGroupDraftDirty(false); setMessage("Revisión del aula preparada con los comentarios confirmados."); });
        }}>{groupReview ? "Continuar borrador del aula" : groupConfirmed ? "Corregir resumen del aula" : "Escribir resumen del aula"}</Button>
      </div>}
      {allReviewed && groupDraft && <div className="space-y-4 rounded-2xl border border-[#c7e4ec] bg-[#f8fcfd] p-4"><h4 className="text-lg font-bold">Tu resumen del aula</h4>
        {!groupDraftDirty && ![groupDraft.strengths, groupDraft.needs, groupDraft.planning_priorities].some((value) => value.trim()) && groupReview && <AsyncButton variant="outline" className="min-h-12 w-full sm:w-auto" busy={busy} busyLabel="Preparando propuesta..." onClick={() => void action(async () => { const suggestion = await suggestDiagnosticGroup(groupReview.id); setGroupDraft(suggestion.details); setGroupDraftDirty(true); setMessage("Ayni preparó una propuesta. Revísala y cambia lo que necesites antes de confirmar."); })}>Sugerir resumen con Ayni</AsyncButton>}
        {groupSummaryPrompts.map(([field, label, example]) => <label key={field} className="block font-semibold">{label}<Textarea className="mt-2 bg-white placeholder:italic placeholder:text-[#8292a8]" maxLength={3000} placeholder={example} value={groupDraft[field]} onChange={(event) => { setGroupDraft({ ...groupDraft, [field]: event.target.value }); setGroupDraftDirty(true); }} /></label>)}
        <section className="rounded-xl border bg-white p-4"><h5 className="font-bold">Competencias que orientarían el plan</h5><p className="mt-1 text-sm text-[#526b87]">Revisa estas prioridades del grupo. Una falta de registros indica que conviene observar, no una dificultad de todos los niños.</p>
          <div className="mt-3 space-y-3">{(groupDraft.competency_priorities ?? []).map((item, index) => <div key={item.competency_id} className="rounded-xl border p-3"><p className="font-semibold">{competencyNames.get(item.competency_id) ?? item.competency_id}</p><select aria-label={`Enfoque de ${competencyNames.get(item.competency_id) ?? item.competency_id}`} className="mt-2 min-h-11 w-full rounded-lg border px-3" value={item.emphasis} onChange={(event) => { const next = [...(groupDraft.competency_priorities ?? [])]; next[index] = { ...item, emphasis: event.target.value as typeof item.emphasis }; setGroupDraft({ ...groupDraft, competency_priorities: next }); setGroupDraftDirty(true); }}><option value="prioritize">Dar más oportunidades</option><option value="maintain">Seguir aprovechando</option><option value="observe_more">Conocer mejor primero</option></select><Textarea className="mt-2 bg-white" aria-label={`Motivo de ${competencyNames.get(item.competency_id) ?? item.competency_id}`} maxLength={500} value={item.reason} onChange={(event) => { const next = [...(groupDraft.competency_priorities ?? [])]; next[index] = { ...item, reason: event.target.value }; setGroupDraft({ ...groupDraft, competency_priorities: next }); setGroupDraftDirty(true); }} /><Button type="button" variant="ghost" onClick={() => { setGroupDraft({ ...groupDraft, competency_priorities: (groupDraft.competency_priorities ?? []).filter((_, i) => i !== index) }); setGroupDraftDirty(true); }}>Quitar competencia</Button></div>)}</div>
          <label className="mt-3 block text-sm font-semibold">Añadir competencia<select className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3" value="" onChange={(event) => { if (!event.target.value) return; setGroupDraft({ ...groupDraft, competency_priorities: [...(groupDraft.competency_priorities ?? []), { competency_id: event.target.value, emphasis: "observe_more", reason: "Revisar con las observaciones del grupo." }] }); setGroupDraftDirty(true); }}><option value="">Elige una competencia</option>{matrixCompetencies.filter((item) => !(groupDraft.competency_priorities ?? []).some((priority) => priority.competency_id === item.competency_id)).map((item) => <option key={item.competency_id} value={item.competency_id}>{item.competency_name}</option>)}</select></label>
        </section>
        <p className="text-sm text-[#526b87]">Escribe patrones del aula sin nombrar niños. Solo lo confirmado orientará el plan.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"><AsyncButton className="min-h-12 w-full sm:w-auto" busy={busy} busyLabel="Confirmando..." disabled={!groupReview} onClick={() => void action(async () => { await saveDiagnosticGroup(groupReview!.id, groupDraft); await confirmDiagnosticGroup(groupReview!.id); setGroupDraft(null); setGroupDraftDirty(false); onGroupConfirmed?.(); setMessage("Resumen del aula confirmado."); })}>Confirmar resumen</AsyncButton><AsyncButton variant="outline" className="min-h-12 w-full sm:w-auto" busy={busy} busyLabel="Guardando..." disabled={!groupReview} onClick={() => void action(async () => { await saveDiagnosticGroup(groupReview!.id, groupDraft); setGroupDraft(null); setGroupDraftDirty(false); setMessage("Borrador del aula guardado. Puedes retomarlo después."); })}>Guardar para después</AsyncButton></div>
        <Button variant="ghost" className="min-h-11" disabled={busy} onClick={() => { setGroupDraft(null); setGroupDraftDirty(false); setError(""); }}>{groupDraftDirty ? "Descartar cambios sin guardar" : "Cerrar editor"}</Button>
      </div>}
      <div className="flex flex-wrap items-center gap-3 border-t border-[#d6e5ef] pt-4">
        <Button variant="outline" className="diagnostic-back-button" onClick={() => leaveGroup(() => setView("individual"))}><ArrowLeft /> Ver comentarios de los niños</Button>
        <Button variant="ghost" className="min-h-11" onClick={() => leaveGroup(onObserve)}>Volver a observar</Button>
      </div>
    </div>}
    {view === "individual" && <Button variant="outline" className="diagnostic-back-button" onClick={() => leaveStudent(onObserve)}><ArrowLeft /> Volver a observar</Button>}
  </section>;
}
