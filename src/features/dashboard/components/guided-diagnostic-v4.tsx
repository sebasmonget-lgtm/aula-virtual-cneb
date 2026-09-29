"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  loadDiagnostics, loadClassroomContext, saveDiagnosticExperienceObservation,
  type DiagnosticWorkspace, type LocalDashboard, type PublicClassroomContext,
} from "@/src/lib/local-database";
import { AsyncButton, LoadingState } from "./workflow-ui";
import { DiagnosticReview } from "./diagnostic-review-v4";
import { FamilyInterviewEditor, FamilyInterviewStatusBadge, useFamilyInterviewStatusMap } from "./family-interview-v4";
import { SpontaneousDiagnostic } from "./spontaneous-diagnostic-v4";
import { displayPersonName } from "@/src/lib/person-name.mjs";
import { DictationRecorder } from "./dictation-recorder";

type Filter = "all" | "without" | "with" | "today";
function isToday(value: string) { return new Date(value).toDateString() === new Date().toDateString(); }

export function GuidedDiagnostic({ dashboard, onPlan, onStudents, initialStep = 1 }: {
  dashboard: LocalDashboard; onPlan?: () => void; onStudents?: () => void; initialStep?: 1 | 2 | 3;
}) {
  const [data, setData] = useState<DiagnosticWorkspace | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [experienceId, setExperienceId] = useState<string | null>(null);
  const [interviewStudentId, setInterviewStudentId] = useState<string | null>(null);
  const [observationMode, setObservationMode] = useState<"guided" | "spontaneous">("guided");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [aspectId, setAspectId] = useState("");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [working, setWorking] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [interviewFeedback, setInterviewFeedback] = useState("");
  const [classroomContext, setClassroomContext] = useState<PublicClassroomContext | null>(null);
  const { statuses: interviewStatuses, error: interviewStatusError } = useFamilyInterviewStatusMap(`${interviewStudentId ?? "list"}:${data?.students.map((item) => item.id).join(",") ?? ""}`, Boolean(data?.students.length));

  useEffect(() => { loadDiagnostics().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar el diagnóstico.")); }, []);
  useEffect(() => {
    if (interviewStudentId || step !== 1) return;
    let cancelled = false;
    loadClassroomContext().then((value) => { if (!cancelled) setClassroomContext(value); }).catch(() => { if (!cancelled) setClassroomContext(null); });
    return () => { cancelled = true; };
  }, [interviewStudentId, step]);
  const experience = data?.experiences.find((item) => item.id === experienceId);
  const student = data?.students.find((item) => item.id === studentId);
  const records = useMemo(() => data?.experience_observations.filter((item) => item.experience_id === experienceId) ?? [], [data, experienceId]);
  const coverage = data?.experience_coverage.find((item) => item.experience_id === experienceId);
  const visibleStudents = (data?.students ?? []).filter((item) => {
    const own = records.filter((record) => record.student_id === item.id);
    if (filter === "without") return own.length === 0;
    if (filter === "with") return own.length > 0;
    if (filter === "today") return own.some((record) => isToday(record.observed_at));
    return true;
  });

  function selectExperience(id: string) {
    setExperienceId(id); setStudentId(null); setFilter("all"); setFeedback(""); setError("");
  }
  function selectStudent(id: string) {
    setStudentId(id); setAspectId(""); setNote(""); setError(""); setFeedback("");
  }
  async function save() {
    if (!studentId || !experienceId || !aspectId || !note.trim() || working || audioBusy) return;
    setWorking(true); setError("");
    try {
      const updated = await saveDiagnosticExperienceObservation({ studentId, experienceId, aspectId, observationStatus: "observed_without_judgment", observationText: note });
      setData(updated); setStudentId(null); setFilter("all");
      setFeedback("Observación registrada. Puedes elegir a otro niño o volver a registrar al mismo.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setWorking(false); }
  }

  if (error && !data) return <p role="alert" className="rounded-xl bg-[#fff1d6] p-4">{error}</p>;
  if (!data) return <LoadingState label="Cargando diagnóstico..." />;
  if (!data.students.length) return <section className="diagnostic-panel space-y-3 p-5"><h1 className="text-2xl font-bold">Primero, conoce a tu grupo</h1><p className="text-sm text-[#526b87]">Agrega a las niñas y los niños del aula para comenzar.</p>{onStudents && <Button onClick={onStudents}>Agregar niños <ArrowRight className="size-4" /></Button>}</section>;

  const interviewStatusKnown = data.students.every((item) => Boolean(interviewStatuses[item.id]));
  const confirmedInterviews = data.students.filter((item) => interviewStatuses[item.id] === "confirmed").length;
  const observedChildren = data.step_progress?.observed_student_count ?? 0;
  const diagnosticSteps = [
    { label: "Conocer", done: interviewStatusKnown && confirmedInterviews === data.students.length, status: interviewStatusKnown ? `${confirmedInterviews}/${data.students.length} entrevistas` : interviewStatusError ? "Sin actualizar" : "Cargando..." },
    { label: "Observar", done: observedChildren === data.students.length, status: `${observedChildren}/${data.students.length} niños` },
    { label: "Resumir", done: data.step_progress?.group_review_confirmed ?? false, status: data.step_progress?.group_review_confirmed ? "Confirmado" : "Pendiente" },
  ];

  return <div className="diagnostic-shell space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e9ddff] text-[#7652bc]"><ClipboardCheck /></span><div><p className="text-sm font-semibold text-[#087d96]">Conocer al grupo</p><h1 className="text-2xl font-extrabold text-[#172b52]">Diagnóstico</h1><p className="text-sm text-[#61718e]">Observa, registra y continúa cuando puedas.</p></div></div>
      <span className="rounded-full bg-[#edf5fb] px-4 py-2 text-sm font-semibold text-[#1b5175]">{data.classroom.age_years} años · {data.classroom.section}</span>
    </header>
    <nav className="grid grid-cols-3 gap-2" aria-label="Pasos del diagnóstico">{diagnosticSteps.map((item, index) => <button key={item.label} type="button" disabled={working || audioBusy} aria-current={step === index + 1 ? "step" : undefined} title={`${item.label}: ${item.status}`} onClick={() => { setStep((index + 1) as 1 | 2 | 3); setStudentId(null); setInterviewStudentId(null); }} className={`min-h-16 rounded-xl px-2 py-2 text-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087d96] ${step === index + 1 ? "bg-[#087d96] text-white" : item.done ? "border border-[#a8dbc1] bg-[#e6f7ed] text-[#176442]" : "bg-[#edf3f9] text-[#405c7e]"}`}><span className="flex items-center justify-center gap-1"><span>{index + 1}. {item.label}</span>{item.done && <span role="img" aria-label="Listo" className="grid size-5 shrink-0 place-items-center rounded-full bg-[#208653] text-white"><Check className="size-3.5" /></span>}</span><span className={`mt-0.5 block text-[11px] font-medium ${step === index + 1 ? "text-white/90" : item.done ? "text-[#176442]" : "text-[#61718e]"}`}>{item.status}</span></button>)}</nav>
    {error && !student && <p role="alert" className="rounded-xl bg-[#fff1d6] p-3 text-sm">{error}</p>}

    {step === 1 && interviewStudentId && <FamilyInterviewEditor studentId={interviewStudentId} studentName={data.students.find((item) => item.id === interviewStudentId)?.name ?? "este niño"} printContext={{ institution: dashboard.profile.institution_name, classroom: data.classroom.section }} onSaved={() => setInterviewFeedback("Entrevista guardada. Puedes entrevistar a otro niño.")} onBack={() => setInterviewStudentId(null)} />}
    {step === 1 && !interviewStudentId && <section className="diagnostic-panel space-y-4 p-5 md:p-7">
      <h2 className="text-xl font-bold">Conoce a cada niño y su familia</h2>
      <p>{dashboard.profile.institution_name} · {data.classroom.section} · {data.students.length} niños</p>
      <p className="text-sm text-[#526b87]">Registra una entrevista breve si ya conversaste con la familia. Puedes responder solo lo necesario o imprimirla para hacerla en papel.</p>
      {interviewFeedback && <p role="status" className="rounded-xl bg-[#e5f8ed] p-3 text-sm text-[#176442]">{interviewFeedback}</p>}
      {interviewStatusError && <p role="alert" className="text-sm text-[#88591d]">{interviewStatusError}</p>}
      <div className="grid gap-2 sm:grid-cols-2">{data.students.map((item) => <button key={item.id} type="button" className={`flex min-h-16 items-center justify-between gap-2 rounded-xl border p-3 text-left font-semibold hover:border-[#087d96] ${interviewStatuses[item.id] === "confirmed" ? "border-[#a8dbc1] bg-[#f0faf4]" : interviewStatuses[item.id] === "partial" ? "border-[#ecd29a] bg-[#fff9ec]" : "bg-white"}`} onClick={() => setInterviewStudentId(item.id)}><span>Entrevista de {displayPersonName(item.name)} →</span><FamilyInterviewStatusBadge status={interviewStatuses[item.id]} /></button>)}</div>
      {classroomContext && <div className="rounded-2xl bg-[#eef8fb] p-4 text-sm text-[#294b64]" aria-label="Panorama del grupo">
        <h3 className="font-bold text-[#172b52]">Así vamos conociendo al grupo</h3>
        <p className="mt-1">{classroomContext.confirmed_interviews} de {classroomContext.students_total} entrevistas confirmadas. Las respuestas de cada familia permanecen en el perfil de su niño.</p>
        {classroomContext.common_interests.length > 0 && <p className="mt-2">Intereses frecuentes: {classroomContext.common_interests.map((item) => item.label.toLowerCase()).join(", ")}.</p>}
        {classroomContext.languages.length > 0 && <p className="mt-1">Lenguas informadas por varias familias: {classroomContext.languages.map((item) => item.label).join(", ")}.</p>}
        {classroomContext.primary_languages.length > 0 && <p className="mt-1">Lenguas principales frecuentes: {classroomContext.primary_languages.map((item) => item.label).join(", ")}.</p>}
        {classroomContext.confirmed_diagnostic_summary && <p className="mt-2">Síntesis diagnóstica confirmada: {classroomContext.confirmed_diagnostic_summary}</p>}
        <p className="mt-2 text-xs">Se muestran solo patrones suficientemente frecuentes. Las entrevistas aportan contexto; no son observaciones de la docente ni niveles de logro.</p>
      </div>}
      <div className="flex justify-end"><Button className="min-h-12" onClick={() => setStep(2)}>Continuar a observar <ArrowRight /></Button></div>
    </section>}

    {step === 2 && !experience && <div className="space-y-2">
      <div role="group" aria-label="Forma de observar" className="relative grid grid-cols-2 rounded-2xl border border-[#c9dce9] bg-[#edf4f9] p-1.5 shadow-sm">
        <span aria-hidden="true" className={`pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/2)] rounded-xl bg-[#087d96] shadow-sm motion-safe:transition-transform motion-safe:duration-300 ${observationMode === "spontaneous" ? "translate-x-full" : "translate-x-0"}`} />
        <button type="button" aria-pressed={observationMode === "guided"} onClick={() => setObservationMode("guided")} className={`relative z-10 min-h-16 rounded-xl px-2 py-3 text-center text-sm font-bold leading-tight sm:text-base ${observationMode === "guided" ? "text-white" : "text-[#294966] hover:text-[#087d96]"} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087d96]`}>Experiencias guiadas</button>
        <button type="button" aria-pressed={observationMode === "spontaneous"} onClick={() => setObservationMode("spontaneous")} className={`relative z-10 min-h-16 rounded-xl px-2 py-3 text-center text-sm font-bold leading-tight sm:text-base ${observationMode === "spontaneous" ? "text-white" : "text-[#294966] hover:text-[#087d96]"} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087d96]`}>Observación espontánea</button>
      </div>
      <p className="px-1 text-sm text-[#526b87]">{observationMode === "guided" ? "Elige un juego sugerido y anota lo que observaste." : "Anota algo que ocurrió durante el juego o la jornada."}</p>
    </div>}
    {step === 2 && !experience && observationMode === "spontaneous" && <SpontaneousDiagnostic students={data.students} onSaved={() => { void loadDiagnostics().then(setData).catch(() => setError("La observación se guardó, pero no se pudo actualizar el avance. Recarga la pantalla.")); }} />}
    {step === 2 && !experience && observationMode === "guided" && <section className="diagnostic-panel space-y-4 p-5 md:p-7">
      <div><h2 className="text-xl font-bold">¿Qué experiencia realizaste?</h2><p className="mt-1 text-sm text-[#526b87]">Son ideas para observar en el juego y la jornada; puedes volver a cualquiera otro día.</p></div>
      {data.experiences.some((item) => item.catalog_status === "development_fixture") && <p className="rounded-xl bg-[#fff5df] p-3 text-sm">Guías de desarrollo: todavía no son la batería pedagógica definitiva de Ayni.</p>}
      <div className="grid gap-3 md:grid-cols-2">{data.experiences.map((item) => {
        const progress = data.experience_coverage.find((value) => value.experience_id === item.id);
        return <button key={item.id} type="button" onClick={() => selectExperience(item.id)} className="min-h-28 rounded-2xl border border-[#dce9f2] bg-white p-4 text-left hover:border-[#087d96] hover:bg-[#f4fbfd] focus-visible:outline-2 focus-visible:outline-[#087d96]"><span className="font-bold text-[#172b52]">{item.title}</span><span className="mt-1 block text-sm text-[#526b87]">{item.explanation}</span><span className="mt-2 block text-xs font-semibold text-[#087d96]">{progress?.students_with_records ?? 0} de {data.students.length} niños con registros</span></button>;
      })}</div>
    </section>}

    {step === 2 && experience && !student && <section className="diagnostic-panel space-y-5 p-4 md:p-7">
      <Button variant="outline" className="diagnostic-back-button" onClick={() => { setExperienceId(null); setFilter("all"); }}><ArrowLeft /> Volver a experiencias</Button>
      <div><h2 className="text-2xl font-extrabold">{experience.title}</h2><p className="mt-3 text-sm font-bold text-[#087d96]">1. Prepara el juego</p><p className="mt-1 text-[#526b87]">{experience.teacher_instructions}</p></div>
      <div><h3 className="text-lg font-bold">2. Mientras juegan, observa</h3><p className="mt-1 text-sm text-[#526b87]">Estas son ideas para orientar tu mirada. No tienes que observarlas todas ni registrar a todos los niños hoy.</p>
        <ul className="mt-3 divide-y divide-[#e3ebf2]">{experience.aspects.map((aspect) => <li key={aspect.id} className="py-3"><p className="font-semibold text-[#173b58]">{aspect.label}</p><p className="text-sm text-[#526b87]">{aspect.prompt}</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#526b87]">{aspect.examples.map((example) => <li key={example}>{example}</li>)}</ul></li>)}</ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-bold">3. Elige a un niño y anota lo que viste</h3><p className="text-sm text-[#526b87]">Toca su nombre cuando ocurra algo que quieras recordar. {coverage?.students_with_records ?? 0} de {data.students.length} con algún registro.</p></div><Button variant="outline" className="min-h-12" onClick={() => setStep(3)}>Pasar a resumir <ArrowRight /></Button></div>
      <div className="flex flex-wrap gap-2" aria-label="Filtrar niños">{([
        ["all", "Todos"], ["without", "Sin observaciones"], ["with", "Con observaciones"], ["today", "Observados hoy"],
      ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 rounded-full border px-3 text-sm font-semibold ${filter === value ? "border-[#087d96] bg-[#dff3f7] text-[#075d70]" : "border-[#dbe6ef] bg-white text-[#435a78]"}`}>{label}</button>)}</div>
      {feedback && <p role="status" className="rounded-xl bg-[#e5f8ed] p-3 text-sm text-[#1e6040]">✓ {feedback}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleStudents.map((item) => {
        const own = records.filter((record) => record.student_id === item.id);
        const today = own.some((record) => isToday(record.observed_at));
        return <button key={item.id} type="button" onClick={() => selectStudent(item.id)} className="min-h-20 rounded-2xl border border-[#dce9f2] bg-white p-4 text-left hover:border-[#087d96] hover:bg-[#f4fbfd] focus-visible:outline-2 focus-visible:outline-[#087d96]"><span className="block text-base font-bold">{displayPersonName(item.name)}</span><span className="mt-1 block text-sm text-[#526b87]">{own.length === 0 ? "Sin observaciones en esta experiencia" : `${own.length} ${own.length === 1 ? "observación" : "observaciones"}`}</span>{today && <span className="mt-1 block text-xs font-semibold text-[#087d96]">✓ Observación registrada hoy</span>}</button>;
      })}</div>
      {visibleStudents.length === 0 && <p className="rounded-xl bg-[#f3f7fb] p-4 text-sm">No hay niños en este filtro. Puedes volver a “Todos”.</p>}
      <details className="border-t border-[#e3ebf2] pt-3 text-sm"><summary className="cursor-pointer font-semibold text-[#426079]">Relación curricular · {experience.competencies.length} {experience.competencies.length === 1 ? "competencia" : "competencias"}</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-[#526b87]">{experience.competencies.map((item) => <li key={item.id}>{item.name}</li>)}</ul></details>
    </section>}

    {step === 2 && experience && student && <section className="diagnostic-panel space-y-5 p-4 md:p-7">
      <Button variant="outline" className="diagnostic-back-button" disabled={working || audioBusy} onClick={() => setStudentId(null)}><ArrowLeft /> Volver a todos los niños</Button>
      <div><p className="text-sm font-semibold text-[#087d96]">{experience.title}</p><h2 className="text-2xl font-extrabold">{displayPersonName(student.name)}</h2><p className="mt-1 text-sm text-[#526b87]">Registra solo lo que observaste. Puedes añadir más de una observación de este niño.</p></div>
      <fieldset className="space-y-2" disabled={working || audioBusy}><legend className="font-bold">¿Con qué aspecto se relaciona?</legend><p className="text-sm text-[#526b87]">Elige uno para organizar tu nota; no estás calificando al niño.</p>{experience.aspects.map((aspect) => <label key={aspect.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 ${aspectId === aspect.id ? "border-[#087d96] bg-[#e8f7fa]" : "border-[#dce9f2]"}`}><input type="radio" name="diagnostic-aspect" checked={aspectId === aspect.id} onChange={() => setAspectId(aspect.id)} /><span className="font-semibold">{aspect.label}</span></label>)}</fieldset>
      <label className="block text-sm font-semibold">¿Qué hizo o dijo?<span className="mt-1 block font-normal text-[#526b87]">Puedes anotar qué hizo, qué dijo, cómo lo hizo o si necesitó ayuda.</span><Textarea className="mt-2 min-h-24" disabled={working} maxLength={4000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej.: Probó saltar los bloques varias veces y cambió la distancia después de no lograrlo." /></label>
      <DictationRecorder key={`${student.id}:${experience.id}`} studentId={student.id} context={`${experience.title}: ${experience.aspects.find((aspect) => aspect.id === aspectId)?.prompt ?? "observación durante el juego"}`} currentText={note} disabled={working} onBusyChange={setAudioBusy} onTranscribed={(text) => setNote(text)} />
      <p className="text-xs text-[#526b87]">Es una nota de observación. Podrás interpretarla más adelante.</p>
      {error && <p role="alert" className="rounded-xl bg-[#fff1d6] p-3 text-sm">{error}</p>}
      <AsyncButton className="min-h-12 w-full sm:w-auto" busy={working} busyLabel="Guardando..." disabled={audioBusy || !aspectId || !note.trim()} onClick={() => void save()}><Save /> Guardar observación</AsyncButton>
    </section>}

    {step === 3 && <DiagnosticReview onObserve={() => { setStep(2); setStudentId(null); }} onPlan={onPlan} onObservationSaved={() => { void loadDiagnostics().then(setData).catch(() => setError("La observación se guardó, pero no se pudo actualizar el avance. Recarga la pantalla.")); }} onGroupConfirmed={() => setData((current) => current ? { ...current, step_progress: { ...current.step_progress, group_review_confirmed: true } } : current)} />}
  </div>;
}
