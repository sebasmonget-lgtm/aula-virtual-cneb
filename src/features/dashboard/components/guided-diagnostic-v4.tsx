"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ClipboardCheck, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  loadDiagnostics, saveDiagnosticExperienceObservation,
  type DiagnosticWorkspace, type LocalDashboard, type ObservationStatus,
} from "@/src/lib/local-database";
import { AsyncButton, LoadingState } from "./workflow-ui";
import { DiagnosticReview } from "./diagnostic-review-v4";

type Filter = "all" | "without" | "with" | "today";
const states: { value: ObservationStatus; label: string }[] = [
  { value: "demonstrated", label: "Lo mostró" },
  { value: "with_support", label: "Lo mostró con apoyo" },
  { value: "not_yet_demonstrated", label: "Aún no se observó" },
  { value: "insufficient_information", label: "Información insuficiente" },
];

function isToday(value: string) { return new Date(value).toDateString() === new Date().toDateString(); }

export function GuidedDiagnostic({ dashboard, onPlan, onStudents }: {
  dashboard: LocalDashboard; onPlan?: () => void; onStudents?: () => void;
}) {
  const [data, setData] = useState<DiagnosticWorkspace | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [experienceId, setExperienceId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [aspectId, setAspectId] = useState("");
  const [status, setStatus] = useState<ObservationStatus | "">("");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => { loadDiagnostics().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar el diagnóstico.")); }, []);
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
    setStudentId(id); setAspectId(""); setStatus(""); setNote(""); setError(""); setFeedback("");
  }
  async function save() {
    if (!studentId || !experienceId || !aspectId || !status || working) return;
    setWorking(true); setError("");
    try {
      const updated = await saveDiagnosticExperienceObservation({ studentId, experienceId, aspectId, observationStatus: status, observationText: note });
      setData(updated); setStudentId(null); setFilter("all");
      setFeedback("Observación registrada. Puedes elegir a otro niño o volver a registrar al mismo.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setWorking(false); }
  }

  if (error && !data) return <p role="alert" className="rounded-xl bg-[#fff1d6] p-4">{error}</p>;
  if (!data) return <LoadingState label="Cargando diagnóstico..." />;
  if (!data.students.length) return <section className="diagnostic-panel space-y-3 p-5"><h1 className="text-2xl font-bold">Primero, conoce a tu grupo</h1><p className="text-sm text-[#526b87]">Agrega a las niñas y los niños del aula para comenzar.</p>{onStudents && <Button onClick={onStudents}>Agregar niños <ArrowRight className="size-4" /></Button>}</section>;

  return <div className="diagnostic-shell space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e9ddff] text-[#7652bc]"><ClipboardCheck /></span><div><p className="text-sm font-semibold text-[#087d96]">Paso 3 de 6 · Conocer al grupo</p><h1 className="text-2xl font-extrabold text-[#172b52]">Evaluación diagnóstica</h1><p className="text-sm text-[#61718e]">Observa, registra y continúa cuando puedas.</p></div></div>
      <span className="rounded-full bg-[#edf5fb] px-4 py-2 text-sm font-semibold text-[#1b5175]">{data.classroom.age_years} años · {data.classroom.section}</span>
    </header>
    <nav className="flex gap-2" aria-label="Pasos del diagnóstico">{["Aula", "Observar", "Revisar"].map((label, index) => <button key={label} type="button" onClick={() => { setStep((index + 1) as 1 | 2 | 3); setStudentId(null); }} className={`min-h-11 flex-1 rounded-xl px-2 text-sm font-semibold ${step === index + 1 ? "bg-[#087d96] text-white" : "bg-[#edf3f9] text-[#405c7e]"}`}>{index + 1}. {label}</button>)}</nav>

    {step === 1 && <section className="diagnostic-panel space-y-4 p-5 md:p-7">
      <h2 className="text-xl font-bold">Tu aula está lista</h2>
      <p>{dashboard.profile.institution_name} · {data.classroom.section} · {data.students.length} niños</p>
      <p className="text-sm text-[#526b87]">Elige una experiencia. Te mostraremos qué observar y a todos los niños del aula. Puedes registrar a uno, a varios o continuar otro día.</p>
      <Button className="min-h-12" onClick={() => setStep(2)}>Ver experiencias <ArrowRight /></Button>
    </section>}

    {step === 2 && !experience && <section className="diagnostic-panel space-y-4 p-5 md:p-7">
      <div><h2 className="text-xl font-bold">¿Qué experiencia realizaste?</h2><p className="mt-1 text-sm text-[#526b87]">Son ideas para observar en el juego y la jornada; puedes volver a cualquiera otro día.</p></div>
      <div className="grid gap-3 md:grid-cols-2">{data.experiences.map((item) => {
        const progress = data.experience_coverage.find((value) => value.experience_id === item.id);
        return <button key={item.id} type="button" onClick={() => selectExperience(item.id)} className="min-h-28 rounded-2xl border border-[#dce9f2] bg-white p-4 text-left hover:border-[#087d96] hover:bg-[#f4fbfd] focus-visible:outline-2 focus-visible:outline-[#087d96]"><span className="font-bold text-[#172b52]">{item.title}</span><span className="mt-1 block text-sm text-[#526b87]">{item.explanation}</span><span className="mt-2 block text-xs font-semibold text-[#087d96]">{progress?.students_with_records ?? 0} de {data.students.length} niños con registros</span></button>;
      })}</div>
    </section>}

    {step === 2 && experience && !student && <section className="diagnostic-panel space-y-5 p-4 md:p-7">
      <Button variant="ghost" onClick={() => { setExperienceId(null); setFilter("all"); }}><ArrowLeft /> Experiencias</Button>
      <div><h2 className="text-2xl font-extrabold">{experience.title}</h2><p className="mt-2 text-[#526b87]">{experience.explanation}</p></div>
      <div className="rounded-2xl bg-[#eef8fb] p-4"><h3 className="font-bold">Hoy puedes fijarte en:</h3><ul className="mt-2 space-y-1 text-sm">{experience.aspects.map((aspect) => <li key={aspect.id}>• {aspect.prompt}</li>)}</ul><p className="mt-3 text-xs text-[#426079]">Relacionado con: {experience.competencies.map((item) => item.name).join(" · ")}</p></div>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-bold">Niños del aula</h3><p className="text-sm text-[#526b87]">{coverage?.students_with_records ?? 0} de {data.students.length} con algún registro en esta experiencia. Esto indica cobertura, no nivel de logro.</p></div><Button variant="outline" onClick={() => setStep(3)}>Revisar avance <ArrowRight /></Button></div>
      <div className="flex flex-wrap gap-2" aria-label="Filtrar niños">{([
        ["all", "Todos"], ["without", "Sin observaciones"], ["with", "Con observaciones"], ["today", "Observados hoy"],
      ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 rounded-full border px-3 text-sm font-semibold ${filter === value ? "border-[#087d96] bg-[#dff3f7] text-[#075d70]" : "border-[#dbe6ef] bg-white text-[#435a78]"}`}>{label}</button>)}</div>
      {feedback && <p role="status" className="rounded-xl bg-[#e5f8ed] p-3 text-sm text-[#1e6040]">✓ {feedback}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleStudents.map((item) => {
        const own = records.filter((record) => record.student_id === item.id);
        const today = own.some((record) => isToday(record.observed_at));
        return <button key={item.id} type="button" onClick={() => selectStudent(item.id)} className="min-h-20 rounded-2xl border border-[#dce9f2] bg-white p-4 text-left hover:border-[#087d96] hover:bg-[#f4fbfd] focus-visible:outline-2 focus-visible:outline-[#087d96]"><span className="block text-base font-bold">{item.name}</span><span className="mt-1 block text-sm text-[#526b87]">{own.length === 0 ? "Sin observaciones en esta experiencia" : `${own.length} ${own.length === 1 ? "observación" : "observaciones"}`}</span>{today && <span className="mt-1 block text-xs font-semibold text-[#087d96]">✓ Observación registrada hoy</span>}</button>;
      })}</div>
      {visibleStudents.length === 0 && <p className="rounded-xl bg-[#f3f7fb] p-4 text-sm">No hay niños en este filtro. Puedes volver a “Todos”.</p>}
    </section>}

    {step === 2 && experience && student && <section className="diagnostic-panel space-y-5 p-4 md:p-7">
      <Button variant="ghost" onClick={() => setStudentId(null)}><ArrowLeft /> Todos los niños</Button>
      <div><p className="text-sm font-semibold text-[#087d96]">{experience.title}</p><h2 className="text-2xl font-extrabold">{student.name}</h2><p className="mt-1 text-sm text-[#526b87]">Registra solo lo que observaste. Puedes añadir más de una observación de este niño.</p></div>
      <fieldset className="space-y-2"><legend className="font-bold">¿Qué observaste?</legend>{experience.aspects.map((aspect) => <label key={aspect.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 ${aspectId === aspect.id ? "border-[#087d96] bg-[#e8f7fa]" : "border-[#dce9f2]"}`}><input type="radio" name="diagnostic-aspect" checked={aspectId === aspect.id} onChange={() => setAspectId(aspect.id)} /><span><span className="block font-semibold">{aspect.prompt}</span><span className="block text-xs text-[#526b87]">{aspect.competency_name}</span></span></label>)}</fieldset>
      <fieldset className="space-y-2"><legend className="font-bold">¿Qué ocurrió?</legend><div className="grid gap-2 sm:grid-cols-2">{states.map((item) => <label key={item.value} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border p-3 text-left text-sm ${status === item.value ? "border-[#087d96] bg-[#e8f7fa] font-bold" : "border-[#dce9f2]"}`}><input type="radio" name="diagnostic-status" checked={status === item.value} onChange={() => setStatus(item.value)} />{item.label}</label>)}</div></fieldset>
      <label className="block text-sm font-semibold">¿Qué hizo o dijo? <span className="font-normal text-[#526b87]">(opcional)</span><Textarea className="mt-2 min-h-24" maxLength={4000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Escribe una frase con lo que realmente viste o escuchaste" /></label>
      <p className="text-xs text-[#526b87]">“Aún no se observó”: hubo oportunidad, pero esa actuación no apareció. “Información insuficiente”: lo registrado no permite interpretarla. Un niño sin registro permanece sin información.</p>
      {error && <p role="alert" className="rounded-xl bg-[#fff1d6] p-3 text-sm">{error}</p>}
      <AsyncButton className="min-h-12 w-full sm:w-auto" busy={working} busyLabel="Guardando..." disabled={!aspectId || !status} onClick={() => void save()}><Save /> Guardar observación</AsyncButton>
    </section>}

    {step === 3 && <DiagnosticReview onObserve={() => { setStep(2); setStudentId(null); }} onPlan={onPlan} />}
  </div>;
}
