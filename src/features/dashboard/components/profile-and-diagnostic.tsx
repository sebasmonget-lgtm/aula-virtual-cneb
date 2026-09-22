"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, ClipboardCheck, Heart, Lightbulb, Save, School, Sparkles, Users } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  loadDiagnostics, saveDiagnosticObservation, saveLocalProfile,
  type DiagnosticWorkspace, type LocalDashboard,
} from "@/src/lib/local-database";
import { AsyncButton, LoadingState, WorkflowFeedback } from "./workflow-ui";

const states = [
  ["observed", "Lo observé"],
  ["with_support", "Con apoyo / parcialmente"],
  ["not_observed_yet", "Aún no lo observé"],
  ["need_more_information", "Necesito más información"],
] as const;

function Field({ label, value, onChange, placeholder = "" }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string;
}) {
  return <label className="block text-sm font-semibold text-[#233c64]">{label}
    <Input className="mt-2 h-11 rounded-xl bg-white" value={value} placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)} />
  </label>;
}

export function InstitutionProfile({ dashboard, onSaved }: {
  dashboard: LocalDashboard; onSaved: (data: LocalDashboard) => void;
}) {
  const p = dashboard.profile;
  const [teacherName, setTeacherName] = useState(p.teacher_name);
  const [institutionName, setInstitutionName] = useState(p.institution_name);
  const [section, setSection] = useState(p.section);
  const [institutionCode, setInstitutionCode] = useState(p.institution_code ?? "");
  const [district, setDistrict] = useState(p.district ?? "");
  const [ugel, setUgel] = useState(p.ugel ?? "");
  const [directorName, setDirectorName] = useState(p.director_name ?? "");
  const [logoInitials, setLogoInitials] = useState("AA");
  const [logoPrimary, setLogoPrimary] = useState("#087d96");
  const [logoAccent, setLogoAccent] = useState("#e9ddff");
  const [createLogo, setCreateLogo] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setWorking(true); setMessage("");
    try {
      const result = await saveLocalProfile({ teacherName, institutionName, section, institutionCode,
        district, ugel, directorName, createLogo, logoInitials, logoPrimary, logoAccent });
      onSaved(result); setCreateLogo(false); setMessage("Perfil guardado en la base local.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally { setWorking(false); }
  }

  return <div className="space-y-6">
    <div><p className="text-sm font-semibold text-[#087d96]">Configuración</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Perfil institucional</h1><p className="mt-2 text-muted-foreground">Estos datos aparecerán prellenados en diagnósticos y documentos.</p></div>
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="diagnostic-panel p-5 md:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Institución" value={institutionName} onChange={setInstitutionName} />
          <Field label="Docente" value={teacherName} onChange={setTeacherName} />
          <Field label="Sección" value={section} onChange={setSection} />
          <Field label="Código modular" value={institutionCode} onChange={setInstitutionCode} placeholder="Opcional" />
          <Field label="Distrito" value={district} onChange={setDistrict} placeholder="Opcional" />
          <Field label="UGEL" value={ugel} onChange={setUgel} placeholder="Opcional" />
          <Field label="Dirección" value={directorName} onChange={setDirectorName} placeholder="Nombre de la directora o director" />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3"><AsyncButton busy={working} busyLabel="Guardando perfil..." onClick={save}><Save /> Guardar perfil</AsyncButton>{message && <WorkflowFeedback tone={message.startsWith("Perfil guardado") ? "success" : "error"}>{message}</WorkflowFeedback>}</div>
      </section>
      <aside className="rounded-2xl border border-[#dce9f2] bg-[#eef8fb] p-5">
        <div className="flex items-center gap-3"><div className="grid size-16 place-items-center overflow-hidden rounded-2xl bg-[#087d96] text-white">{p.logo_url ? <Image unoptimized src={p.logo_url} alt="Logo institucional" width={64} height={64} className="size-full object-cover" /> : <School className="size-8" />}</div><div><p className="font-bold">Logo institucional</p><p className="text-xs text-muted-foreground">Generado localmente y editable</p></div></div>
        <p className="mt-4 text-sm text-muted-foreground">Crea una marca sencilla con iniciales y colores. No envía imágenes a ningún servicio externo.</p>
        <label className="mt-5 flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={createLogo} onChange={(event) => setCreateLogo(event.target.checked)} /> Crear nuevo logo al guardar</label>
        {createLogo && <div className="mt-4 space-y-4">
          <Field label="Iniciales (máximo 3)" value={logoInitials} onChange={setLogoInitials} />
          <div className="flex gap-5 text-sm"><label>Color base <input type="color" value={logoPrimary} onChange={(event) => setLogoPrimary(event.target.value)} className="ml-2 align-middle" /></label><label>Acento <input type="color" value={logoAccent} onChange={(event) => setLogoAccent(event.target.value)} className="ml-2 align-middle" /></label></div>
        </div>}
      </aside>
    </div>
  </div>;
}

export function GuidedDiagnostic({ dashboard }: { dashboard: LocalDashboard }) {
  const [data, setData] = useState<DiagnosticWorkspace | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [guideId, setGuideId] = useState<string | null>(null);
  const [studentIndex, setStudentIndex] = useState(0);
  const [referenceId, setReferenceId] = useState("");
  const [referenceStatus, setReferenceStatus] = useState<string>("");
  const [observationContext, setObservationContext] = useState("");
  const [observationText, setObservationText] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { loadDiagnostics().then(setData).catch((cause) => setError(cause.message)); }, []);
  const selectedGuide = data?.guides.find((guide) => guide.id === guideId);
  const references = useMemo(() => data?.references.filter((reference) => reference.guide_id === guideId) ?? [], [data, guideId]);
  const student = data?.students[studentIndex];
  const usefulStudents = new Set(data?.observations.filter((item) => item.status === "observed" || item.status === "with_support").map((item) => item.student_id) ?? []);

  function openGuide(id: string) {
    setGuideId(id); setReferenceId(""); setReferenceStatus(""); setObservationText(""); setObservationContext(""); setMessage("");
    setStep(2);
  }

  async function save(next: boolean) {
    if (!selectedGuide || !student || !referenceId || !referenceStatus) return;
    setWorking(true); setError(""); setMessage("");
    try {
      setData(await saveDiagnosticObservation({ studentId: student.id, competencyId: selectedGuide.competency_id,
        referenceId, referenceStatus, observationContext, observationText, teacherInterpretation: "", teacherConfirmed: false }));
      setMessage("Registro guardado. Puedes continuar después.");
      if (next && data && studentIndex < data.students.length - 1) {
        setStudentIndex(studentIndex + 1); setReferenceStatus(""); setObservationText(""); setObservationContext("");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setWorking(false); }
  }

  if (error && !data) return <p role="alert" className="rounded-xl bg-[#fff1d6] p-4">{error}</p>;
  if (!data) return <LoadingState label="Cargando diagnóstico..." />;

  return <div className="diagnostic-shell space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4"><span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-[#e9ddff] text-[#7652bc]"><ClipboardCheck className="size-6" /></span><div><h1 className="text-2xl font-extrabold tracking-tight text-[#172b52] md:text-[30px]">Evaluación Diagnóstica</h1><p className="text-sm text-[#61718e]">Conoce a tus estudiantes para una mejor planificación</p></div></div>
      <div className="flex items-center gap-2 rounded-full bg-[#edf5fb] px-4 py-2 text-sm font-semibold text-[#1b5175]"><Users className="size-4" /> Aula: {data.classroom.age_years} años · {data.classroom.section}</div>
    </div>
    <div className="flex flex-wrap items-center gap-2" aria-label="Pasos del diagnóstico">{["Datos generales", "Competencias", "Resultados", "Conclusiones"].map((label, index) => <button key={label} onClick={() => { setStep(index + 1); setGuideId(null); }} className={`flex items-center gap-2 rounded-full px-2 py-2 text-xs font-semibold transition sm:text-sm ${step === index + 1 ? "text-[#173b67]" : "text-[#72809a]"}`}><span className={`grid size-8 place-items-center rounded-full ${step === index + 1 ? "bg-[#087d96] text-white shadow-[0_3px_9px_#087d9644]" : index + 1 < step ? "bg-[#1a9a9a] text-white" : "bg-[#e9eef6] text-[#4a5b76]"}`}>{index + 1 < step ? <Check className="size-4" /> : index + 1}</span><span className="hidden sm:inline">{label}</span><span className="sm:hidden">{label.split(" ")[0]}</span></button>)}</div>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_250px]">
    <div className="space-y-4">
    {step === 1 && <section className="diagnostic-panel p-5 md:p-6">
      <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#d8f3f7] text-[#087d96]"><School className="size-5" /></span><h2 className="text-xl font-extrabold">Datos generales</h2></div>
      <p className="mt-2 text-sm text-muted-foreground">Información precargada desde tu perfil y aula. Puedes editarla en Perfil.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        ["Institución educativa", dashboard.profile.institution_name], ["Nivel", "Inicial"],
        ["Edad del aula", `${data.classroom.age_years} años`], ["Sección", data.classroom.section],
        ["Docente", dashboard.profile.teacher_name], ["Año", String(dashboard.profile.school_year)],
        ["Estudiantes", String(data.students.length)], ["Competencias disponibles", String(data.guides.length)],
      ].map(([label, value]) => <div key={label}><p className="mb-1 text-xs font-semibold text-[#314e75]">{label}</p><div className="diagnostic-field min-h-11 text-sm font-medium">{value}</div></div>)}</div>
      <div className="mt-5 rounded-xl bg-[#e9f7ff] p-4"><p className="flex items-center gap-2 font-bold"><span className="grid size-7 place-items-center rounded-lg bg-[#b9eafa] text-[#087d96]"><Users className="size-4" /></span> Propósito de la evaluación diagnóstica</p><p className="mt-2 text-sm leading-relaxed text-[#49647f]">Conocer las características, intereses, fortalezas y necesidades de aprendizaje de las niñas y los niños para orientar la planificación pedagógica del año.</p></div>
    </section>}
    {step === 1 && <section className="diagnostic-panel p-5 md:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e8ddff] text-[#7951bc]"><BookOpen className="size-5" /></span><h2 className="text-lg font-extrabold">Competencias y registro de información</h2></div><Button variant="outline" size="sm" onClick={() => setStep(2)}>Ver todas <ArrowRight className="size-4" /></Button></div><CompetencyList data={data} onOpen={openGuide} /></section>}
    {step === 2 && !selectedGuide && <section className="diagnostic-panel p-5 md:p-6"><div className="mb-4 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#e8ddff] text-[#7951bc]"><BookOpen className="size-5" /></span><h2 className="text-xl font-extrabold">Competencias</h2></div><CompetencyList data={data} onOpen={openGuide} /><div className="mt-5 flex justify-end"><Button variant="outline" onClick={() => setStep(3)}>Revisar resultados <ArrowRight /></Button></div></section>}
    {step === 2 && selectedGuide && <section className="diagnostic-panel p-5 md:p-7">
      <Button variant="ghost" onClick={() => setGuideId(null)}><ArrowLeft /> Competencias</Button>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#087d96]">Inicial · {data.classroom.age_years} años · {data.classroom.section}</p><h2 className="mt-1 text-2xl font-bold">{selectedGuide.competency_text}</h2>
      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-[#eaf6fb] p-3"><Button variant="ghost" size="icon" aria-label="Alumno anterior" disabled={studentIndex === 0} onClick={() => setStudentIndex(studentIndex - 1)}><ArrowLeft /></Button><span className="text-center font-semibold">{student?.name} <span className="block text-xs font-normal text-muted-foreground">{studentIndex + 1} de {data.students.length}</span></span><Button variant="ghost" size="icon" aria-label="Alumno siguiente" disabled={studentIndex === data.students.length - 1} onClick={() => setStudentIndex(studentIndex + 1)}><ArrowRight /></Button></div>
      <details className="mt-5 rounded-xl border bg-[#f8fbff] p-4"><summary className="flex cursor-pointer items-center gap-2 font-semibold"><BookOpen className="size-4 text-[#087d96]" /> ¿Cómo observar? <ChevronDown className="ml-auto size-4" /></summary><p className="mt-3 text-sm">{selectedGuide.short_meaning}</p><p className="mt-2 text-sm text-muted-foreground">Situaciones: {selectedGuide.suggested_contexts.join(" · ")}</p><p className="mt-2 text-xs text-[#8a5418]">{selectedGuide.caution_text}</p></details>
      <div className="mt-6 space-y-3"><h3 className="font-bold">Qué observar</h3>{references.map((reference) => <div key={reference.id} className={`rounded-xl border p-4 transition-colors hover:border-[#9bcbd7] ${referenceId === reference.id ? "border-[#6eb9ca] bg-[#f0f9fc]" : ""}`}><label className="flex cursor-pointer gap-3"><input type="radio" name="reference" checked={referenceId === reference.id} onChange={() => setReferenceId(reference.id)} /><span className="font-medium">{reference.short_observable_text}</span></label>{referenceId === reference.id && <div className="mt-4 grid gap-2 sm:grid-cols-2">{states.map(([value, label]) => <button key={value} type="button" aria-pressed={referenceStatus === value} onClick={() => setReferenceStatus(value)} className={`min-h-11 rounded-xl border px-3 py-3 text-left text-sm hover:border-[#9bcbd7] hover:bg-[#e8f6fb] ${referenceStatus === value ? "border-[#087d96] bg-[#daf3f7] font-semibold" : "bg-white"}`}>{referenceStatus === value && <Check className="mr-1 inline size-4" />}{label}</button>)}</div>}</div>)}</div>
      <div className="mt-5 grid gap-4"><Field label="Contexto (opcional)" value={observationContext} onChange={setObservationContext} placeholder="Ej.: exploración en el jardín" /><label className="text-sm font-semibold">Observación docente (opcional)<Textarea className="mt-2 min-h-24" value={observationText} onChange={(event) => setObservationText(event.target.value)} placeholder="Qué hizo o dijo, sin inferir un nivel" /></label></div>
      <p className="mt-4 rounded-xl bg-[#fff8e7] p-3 text-xs text-[#86571d]">{references.some((item) => !item.official_verified) ? "Catálogo ilustrativo local: falta sustituir el desempeño de muestra por texto CNEB oficial validado antes de producción." : "Referentes vinculados a desempeños oficiales revisados."} Foto, voz y video no son obligatorios; su carga aún no está habilitada.</p>
      {message && <p role="status" className="mt-3 text-sm text-[#1f625c]">{message}</p>}{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="sticky bottom-16 mt-5 flex flex-wrap gap-3 border-t bg-white py-4 md:bottom-0"><AsyncButton busy={working} busyLabel="Guardando..." onClick={() => save(false)} disabled={!referenceId || !referenceStatus}><Save /> Guardar</AsyncButton><AsyncButton variant="outline" busy={working} busyLabel="Guardando..." onClick={() => save(true)} disabled={!referenceId || !referenceStatus}>Guardar y siguiente <ArrowRight /></AsyncButton></div>
    </section>}
    {step === 3 && <section className="diagnostic-panel p-5 md:p-7"><h2 className="text-xl font-bold">Resultados observados</h2><p className="mt-2 text-muted-foreground">{usefulStudents.size}/{data.students.length} estudiantes con al menos una marca útil. “Aún no lo observé” y “Necesito más información” no cuentan como resultado negativo.</p><div className="mt-5 space-y-3">{data.guides.map((guide) => { const count = new Set(data.observations.filter((item) => item.competency_id === guide.competency_id && ["observed", "with_support"].includes(item.status)).map((item) => item.student_id)).size; return <div key={guide.id} className="rounded-xl bg-[#f1f6fb] p-4"><p className="font-semibold">{guide.competency_text}</p><p className="mt-1 text-sm text-muted-foreground">Cobertura útil: {count}/{data.students.length} estudiantes</p></div>; })}</div></section>}
    {step === 4 && <section className="diagnostic-panel p-5 md:p-7"><div className="flex items-center gap-3"><Sparkles className="text-[#7951bc]" /><h2 className="text-xl font-bold">Conclusiones</h2></div><p className="mt-3 text-muted-foreground">Las conclusiones y prioridades del plan anual requieren suficiente información y confirmación de la docente. No se generan a partir de una sola marca.</p><p className="mt-4 rounded-xl bg-[#fff8e7] p-4 text-sm">Esta etapa permanece pendiente de un catálogo oficial validado y una síntesis revisable. Ninguna valoración se envía al plan anual automáticamente.</p></section>}
    </div>
    <aside className="space-y-3">
      <div className="rounded-2xl bg-[#fff8ef] p-5"><div className="flex items-center gap-2"><Lightbulb className="size-6 text-[#e7a526]" /><h2 className="font-extrabold">¿Cómo funciona?</h2></div><ol className="mt-4 space-y-4 text-sm text-[#465b77]">{["Revisa los datos generales ya precargados.", "Registra actuaciones por competencia y estudiante.", "Comprueba la cobertura y lo que falta observar.", "Revisa las conclusiones antes de planificar."].map((item, index) => <li key={item} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#087d96] text-xs font-bold text-white">{index + 1}</span>{item}</li>)}</ol></div>
      <div className="rounded-2xl bg-[#edf8f3] p-5"><h2 className="flex items-center gap-2 font-extrabold"><School className="size-5 text-[#23966a]" />Recuerda</h2><p className="mt-3 text-sm leading-relaxed text-[#275e56]">No necesitas tener toda la información hoy. Puedes guardar y continuar después.</p></div>
      <div className="rounded-2xl bg-[#fff0f5] p-5"><h2 className="flex items-center gap-2 font-extrabold"><Heart className="size-5 text-[#e86091]" />Aquí para apoyarte</h2><p className="mt-3 text-sm leading-relaxed text-[#77546a]">Abre “¿Cómo observar?” para consultar una microguía breve al registrar cada competencia.</p></div>
    </aside>
    </div>
  </div>;
}

function CompetencyList({ data, onOpen }: { data: DiagnosticWorkspace; onOpen: (guideId: string) => void }) {
  if (!data.guides.length) return <p className="rounded-xl bg-[#fff1d6] p-4 text-sm">No hay guías revisadas para esta edad. Carga el catálogo CNEB antes de registrar.</p>;
  return <div className="overflow-hidden rounded-xl border border-[#e1e8f4]">
    <div className="hidden grid-cols-[minmax(0,1fr)_130px_145px_100px] gap-3 bg-[#f0f4fa] px-4 py-3 text-xs font-bold text-[#314a71] md:grid"><span>Competencia</span><span>Estado</span><span>Registros</span><span>Acciones</span></div>
    {data.guides.map((guide, index) => {
      const useful = new Set(data.observations.filter((item) => item.competency_id === guide.competency_id && ["observed", "with_support"].includes(item.status)).map((item) => item.student_id)).size;
      const available = data.references.some((reference) => reference.guide_id === guide.id);
      const percent = data.students.length ? useful / data.students.length * 100 : 0;
      return <div key={guide.id} className="grid gap-3 border-t border-[#e9eef6] bg-white px-4 py-3 first:border-0 md:grid-cols-[minmax(0,1fr)_130px_145px_100px] md:items-center">
        <div className="flex min-w-0 items-center gap-3"><span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${["bg-[#f48ac0]", "bg-[#79a7e7]", "bg-[#65bba0]", "bg-[#817fe7]"][index % 4]}`}>{index + 1}</span><div><p className="text-sm font-semibold leading-snug">{guide.competency_text}</p><p className="text-xs text-muted-foreground md:hidden">{guide.area_name}</p></div></div>
        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${useful ? "bg-[#fff0c7] text-[#926329]" : "bg-[#edf0f6] text-[#66758e]"}`}>{useful ? "En registro" : "No iniciada"}</span>
        <div><p className="text-xs font-semibold">{useful} / {data.students.length}</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e9edf4]"><div className="h-full rounded-full bg-[#53b9b4]" style={{ width: `${percent}%` }} /></div></div>
        <Button variant="outline" size="sm" className="w-fit border-[#cbd9eb] text-[#164b75]" onClick={() => onOpen(guide.id)} disabled={!available}>Registrar <ArrowRight className="size-3" /></Button>
      </div>;
    })}
  </div>;
}
