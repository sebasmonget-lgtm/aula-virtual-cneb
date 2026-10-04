"use client";
import { StudentPhoto, StudentPhotoEditor, EnrollmentPhoto, uploadStudentPhoto } from "./student-photo";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { importPilotStudents, loadStudentPedagogicalProfile, type LocalDashboard, type LocalStudent, type PrivateMediaUpload, type StudentPedagogicalProfile } from "@/src/lib/local-database";
import { recommendedStudentGuidance, studentCompetencyGuidance } from "@/src/lib/student-guidance.mjs";
import { AsyncButton, EmptyState, LoadingState, NextStepCard, ScreenSkeleton, WorkflowFeedback, WorkflowTabs, WorkflowTabPanel } from "./workflow-ui";
import { FamilyInformationPanel, FamilyInterviewStatusBadge, useFamilyInterviewStatusMap } from "./family-interview-v4";
import { EvidenceStudentCorrection } from "./evidence-student-correction";
import { StudentTrajectory } from "./student-trajectory";

const f8TrajectoryEnabled = process.env.NEXT_PUBLIC_AYNI_F8_TRAJECTORY === "1";

const statusLabels = {
  demonstrated: "Lo demostró",
  with_support: "Con apoyo",
  not_yet_demonstrated: "Aún no",
  insufficient_information: "No pude determinarlo",
  observed_without_judgment: "Descripción docente",
} as const;

export function StudentsScreen({ students, onImported, onEvaluate, onPlan, onDiagnostic }: { students: LocalStudent[]; onImported: (dashboard: LocalDashboard) => void; onEvaluate?: (studentId: string, competencyId: string) => void; onPlan?: () => void; onDiagnostic?: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentPedagogicalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [photo,setPhoto]=useState<PrivateMediaUpload|null>(null);
  const [photoBusy,setPhotoBusy]=useState(false);
  const [photoRetry,setPhotoRetry]=useState<{id:string;media:PrivateMediaUpload}|null>(null);
  const [csv, setCsv] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importAction, setImportAction] = useState<"single" | "csv">("single");
  const [importMessage, setImportMessage] = useState("");
  const [importTone, setImportTone] = useState<"success" | "error">("success");
  const [addOpen, setAddOpen] = useState(students.length === 0);
  const [filter, setFilter] = useState<"all" | "unobserved" | "evidence">("all");
  const { statuses: interviewStatuses } = useFamilyInterviewStatusMap(`${selectedId ?? "list"}:${students.map((item) => item.id).join(",")}`, students.length > 0);
  const visibleStudents = useMemo(() => students.filter((student) =>
    (student.full_name ?? student.name).toLocaleLowerCase("es-PE").includes(query.toLocaleLowerCase("es-PE")) &&
    (filter === "all" || (filter === "unobserved" ? !student.evidence_count : Boolean(student.evidence_count))),
  ), [students, query, filter]);
  const observedCount = students.filter((student) => Boolean(student.evidence_count)).length;
  const recordSummary = (student: LocalStudent) => {
    const records = student.evidence_count ?? 0;
    const competencies = student.competency_count ?? 0;
    if (!records) return "";
    return `${records} ${records === 1 ? "evidencia" : "evidencias"} · ${competencies ? `${competencies} ${competencies === 1 ? "competencia" : "competencias"}` : "sin competencia vinculada"}`;
  };

  async function addStudents(useCsv: boolean) {
    if (importBusy || photoBusy) return;
    setImportAction(useCsv ? "csv" : "single"); setImportBusy(true); setImportMessage("");
    try {
      const dashboard = await importPilotStudents(useCsv ? { csv } : { students: [{ firstName, lastName, preferredName, birthDate }] });
      setFirstName(""); setLastName(""); setPreferredName(""); setBirthDate(""); setCsv("");
      setImportMessage(useCsv ? "Lista de alumnos importada al aula." : "Alumno añadido al aula."); setImportTone("success");
      if(!useCsv && photo){const added=dashboard.students.find(s=>!students.some(old=>old.id===s.id));if(added){setPhoto(null);try{await uploadStudentPhoto(added.id,photo);setPhotoRetry(null);}catch{setPhotoRetry({id:added.id,media:photo});setImportMessage("Alumno añadido. La foto aún no se guardó; puedes reintentar sin inscribirlo de nuevo.");setImportTone("error");}}}
      onImported(dashboard);
    } catch (error) { setImportMessage(error instanceof Error ? error.message : "No se pudieron añadir los niños."); setImportTone("error"); }
    finally { setImportBusy(false); }
  }

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    loadStudentPedagogicalProfile(selectedId).then((nextProfile) => {
      if (active) setProfile(nextProfile);
    }).catch(() => {
      if (active) setProfileError("No se pudo cargar el perfil. Vuelve a intentarlo.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [selectedId]);

  if (selectedId) return <><EvidenceStudentCorrection profile={profile} students={students} onCorrected={async () => { setProfile(await loadStudentPedagogicalProfile(selectedId)); }} /><StudentProfile profile={profile} loading={loading} error={profileError} onBack={() => { setSelectedId(null); setProfile(null); setProfileError(""); }} onEvaluate={onEvaluate} onPlan={onPlan} /></>;
  return <section className="mx-auto max-w-5xl space-y-5">
    <header className="flex items-start justify-between gap-3"><div><h1 className="text-3xl font-extrabold tracking-tight text-[#1c2e50]">Mi aula</h1><p className="mt-1 text-[#566883]">Tus niños y sus registros</p></div><button type="button" onClick={() => setAddOpen((open) => !open)} aria-expanded={addOpen} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#0b7891] bg-white px-4 font-bold text-[#07576c]"><Plus className="size-4" /> Añadir alumno</button></header>
    <div className="grid grid-cols-3 gap-2"><div className="rounded-2xl bg-[#eaf5fd] p-3"><strong className="block text-2xl text-[#0b7891]">{students.length}</strong><span className="text-xs font-semibold text-[#536681]">niños</span></div><div className="rounded-2xl bg-[#eaf8f2] p-3"><strong className="block text-2xl text-[#287561]">{observedCount}</strong><span className="text-xs font-semibold text-[#536681]">con evidencias de actividad</span></div><div className="rounded-2xl bg-[#fff4df] p-3"><strong className="block text-2xl text-[#a16917]">{students.length - observedCount}</strong><span className="text-xs font-semibold text-[#536681]">sin evidencias de actividad</span></div></div>
    <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-input bg-white px-4 text-[#60718a] focus-within:ring-[3px] focus-within:ring-ring/50"><Search className="size-5" aria-hidden="true" /><span className="sr-only">Buscar niño</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar niño" className="min-w-0 flex-1 border-0 bg-transparent text-[#1c2e50] outline-none" /></label>
    <div className="flex flex-wrap gap-2" aria-label="Filtrar niños">{([["all", "Todos"], ["unobserved", "Por observar"], ["evidence", "Con evidencias"]] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${filter === id ? "bg-[#0b7891] text-white" : "border border-input bg-white text-[#315575]"}`}>{label}</button>)}</div>
    {addOpen && <section className="rounded-[1.3rem] border border-[#d4e1ed] bg-white p-5 sm:p-6" aria-labelledby="add-students-title">
      <h2 id="add-students-title" className="text-lg font-extrabold text-[#1c2e50]">Añadir niños al aula</h2>
      <p className="mt-1 text-sm text-[#526b87]">Escribe el nombre y apellido. El nombre preferido y la fecha de nacimiento son opcionales.</p>
      <form className="mt-5" aria-busy={importBusy && importAction === "single"} onSubmit={(event) => { event.preventDefault(); void addStudents(false); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="student-first-name" className="block text-sm font-semibold text-[#244260]">Nombre <span className="text-[#9a4050]" aria-hidden="true">*</span><Input id="student-first-name" className="mt-2" value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="off" required /></label>
          <label htmlFor="student-last-name" className="block text-sm font-semibold text-[#244260]">Apellido <span className="text-[#9a4050]" aria-hidden="true">*</span><Input id="student-last-name" className="mt-2" value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="off" required /></label>
          <label htmlFor="student-preferred-name" className="block text-sm font-semibold text-[#244260]">Nombre preferido <span className="font-normal text-[#526b87]">(opcional)</span><Input id="student-preferred-name" className="mt-2" value={preferredName} onChange={(event) => setPreferredName(event.target.value)} autoComplete="off" /></label>
          <label htmlFor="student-birth-date" className="block text-sm font-semibold text-[#244260]">Fecha de nacimiento <span className="font-normal text-[#526b87]">(opcional)</span><Input id="student-birth-date" type="date" className="mt-2" max={new Date().toISOString().slice(0, 10)} value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
        </div>
        <EnrollmentPhoto media={photo} onChange={setPhoto} onBusy={setPhotoBusy} disabled={importBusy||photoBusy}/>
        <AsyncButton type="submit" className="mt-4 min-h-11" busy={importBusy && importAction === "single"} busyLabel="Añadiendo niño…" disabled={importBusy || photoBusy || !firstName.trim() || !lastName.trim()}>Añadir niño</AsyncButton>
      </form>
      <details className="mt-4">
        <summary className="ml-auto w-fit rounded-lg border border-input bg-white px-3 py-2 text-xs font-semibold text-[#244260]">Importar lista CSV</summary>
        <div className="mt-3 rounded-xl border border-[#a9bdce] bg-[#f7faff] p-4">
          <label htmlFor="students-csv" className="block text-sm font-semibold text-[#244260]">Lista de niños en CSV</label>
          <p id="students-csv-help" className="mt-1 text-sm text-[#526b87]">Encabezado: first_name,last_name,preferred_name. Puedes añadir birth_date como cuarta columna (AAAA-MM-DD). Máximo 40 alumnos.</p>
          <Textarea id="students-csv" className="mt-2 min-h-32" aria-describedby="students-csv-help" value={csv} onChange={(event) => setCsv(event.target.value)} placeholder={'first_name,last_name,preferred_name\nMaría,López,María'} />
          <AsyncButton type="button" className="mt-3 min-h-11" variant="outline" busy={importBusy && importAction === "csv"} busyLabel="Importando niños…" disabled={importBusy || !csv.trim()} onClick={() => void addStudents(true)}>Importar CSV</AsyncButton>
        </div>
      </details>
      {importBusy && <div className="mt-4"><LoadingState label={importAction === "csv" ? "Importando la lista de niños…" : "Guardando al niño en el aula…"} /></div>}
      {importMessage && <div className="mt-4"><WorkflowFeedback tone={importTone}>{importMessage}</WorkflowFeedback></div>}
      {photoRetry&&<Button disabled={importBusy} className="mt-3" variant="outline" onClick={()=>{setImportBusy(true);void uploadStudentPhoto(photoRetry.id,photoRetry.media).then(()=>{setPhotoRetry(null);setImportTone("success");setImportMessage("Foto privada guardada.");}).catch(()=>setImportMessage("La foto sigue pendiente. El alumno ya está inscrito.")).finally(()=>setImportBusy(false));}}>Reintentar guardar foto</Button>}
      {importTone === "success" && importMessage && onDiagnostic && <Button className="mt-3 min-h-11" onClick={onDiagnostic}>Continuar: evaluación diagnóstica</Button>}
    </section>}
    <div className="space-y-2">{visibleStudents.length ? visibleStudents.map((student) => <button key={student.id} type="button" onClick={() => { setProfile(null); setLoading(true); setSelectedId(student.id); }} className="flex min-h-24 w-full items-center gap-3 rounded-[1.3rem] border border-[#d4e1ed] bg-white p-4 text-left hover:border-[#8acbd8] hover:shadow-sm"><StudentPhoto id={student.id} name={student.full_name ?? student.name}/><span className="min-w-0 flex-1"><strong className="block truncate text-[#1c2e50]">{student.full_name ?? student.name}</strong>{Boolean(student.evidence_count) && <small className="mt-1 block text-[#566883]">{recordSummary(student)}</small>}<FamilyInterviewStatusBadge status={interviewStatuses[student.id]} /></span><span className="shrink-0 text-right"><span className={`block rounded-full px-2 py-1 text-xs font-bold ${student.evidence_count ? "bg-[#eaf8f2] text-[#287561]" : "bg-[#fff4df] text-[#9a641a]"}`}>{student.evidence_count ? "Con evidencias" : "Sin evidencias de actividad"}</span><span className="mt-2 block text-xs font-bold text-[#07576c]">Ver perfil →</span></span></button>) : <EmptyState title={students.length ? "No encontramos niños" : "Aún no hay niños en el aula"} description={students.length ? "Prueba con otro nombre o filtro." : "Añade un niño para empezar a acompañar su progreso."} />}</div>
  </section>;
}

function StudentProfile({ profile, loading, error, onBack, onEvaluate, onPlan }: { profile: StudentPedagogicalProfile | null; loading: boolean; error: string; onBack: () => void; onEvaluate?: (studentId: string, competencyId: string) => void; onPlan?: () => void }) {
  const [tab, setTab] = useState<"Trayectoria" | "Resumen" | "Familia" | "Competencias" | "Evidencias" | "Diagnóstico">(f8TrajectoryEnabled ? "Trayectoria" : "Resumen");
  if (loading || !profile) return <section className="mx-auto max-w-4xl space-y-3"><Button variant="ghost" onClick={onBack}><ArrowLeft /> Volver a Niños</Button>{error ? <WorkflowFeedback tone="error">{error}</WorkflowFeedback> : <ScreenSkeleton />}</section>;
  const { student, competencies, recent_relevant_observations: evidence, diagnosis, diagnostic_observations: diagnosticObservations } = profile;
  const recommendation = recommendedStudentGuidance(competencies);
  function continueFrom(competency: StudentPedagogicalProfile["competencies"][number]) {
    const guidance = studentCompetencyGuidance(competency);
    if (guidance.action === "evidence") { setTab("Evidencias"); return; }
    if (guidance.action && competency.competency_v4_id) onEvaluate?.(student.id, competency.competency_v4_id);
  }
  return <section className="mx-auto max-w-4xl space-y-5"><Button variant="ghost" className="-ml-3" onClick={onBack}><ArrowLeft /> Volver a Niños</Button><header className="rounded-3xl bg-[linear-gradient(135deg,#ffffff,#e9fbfb)] p-6"><p className="text-sm font-semibold text-[#087d96]">Perfil pedagógico</p><h1 className="mt-1 text-3xl font-extrabold">{student.name}</h1><p className="mt-2 text-sm text-[#526b87]">{student.section} · {student.age_years} años · {student.school_year}</p><StudentPhotoEditor id={student.id} name={student.name}/>{student.birth_date && <p className="mt-1 text-sm text-[#526b87]">Fecha de nacimiento: {student.birth_date.split("-").reverse().join("/")}</p>}</header>{recommendation ? <NextStepCard title={recommendation.action === "evidence" ? "Sigue observando" : "Revisar evaluación del período"} description={recommendation.competency.competency_text} action={recommendation.action === "evidence" ? "Ver observaciones" : "Abrir evaluación"} onAction={() => continueFrom(recommendation.competency)} /> : onPlan && <EmptyState title="Prepara nuevas observaciones" description="Puedes revisar el diagnóstico o preparar una actividad para seguir observando y reunir evidencias de actividad." action={<Button onClick={onPlan}>Ir a Planificar</Button>} />}<WorkflowTabs id="student-profile" label="Secciones del perfil" value={tab} onChange={setTab} tabs={[...(f8TrajectoryEnabled ? [{ id: "Trayectoria" as const, label: "Trayectoria" }] : []), { id: "Resumen", label: "Resumen" }, { id: "Familia", label: "Familia" }, { id: "Competencias", label: f8TrajectoryEnabled ? "Vista avanzada" : "Competencias" }, { id: "Evidencias", label: "Evidencias" }, { id: "Diagnóstico", label: "Diagnóstico" }]} /><WorkflowTabPanel id="student-profile" value={tab}>{tab === "Trayectoria" && <StudentTrajectory studentId={student.id} diagnosticCount={diagnosticObservations.length} />}{tab === "Resumen" && <article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Evidencias de actividad de {student.name}</h2><p className="mt-2 text-sm text-[#526b87]">{evidence.length ? `${evidence.length} ${evidence.length === 1 ? "evidencia de actividad disponible" : "evidencias de actividad disponibles"}. Puedes revisarlas antes de continuar.` : "Aún no hay evidencias de actividad registradas."}</p>{profile.family_interview_context && <p className="mt-2 text-sm">Entrevista familiar confirmada · versión {profile.family_interview_context.version}</p>}{diagnosticObservations.length > 0 && <p className="mt-2 text-sm">{diagnosticObservations.length} observaciones diagnósticas disponibles.</p>}{profile.confirmed_student_diagnostic_review && <p className="mt-2 text-sm font-semibold text-[#17653d]">{profile.confirmed_student_diagnostic_review.is_current ? "✓ Comentario diagnóstico confirmado por la docente" : "Comentario diagnóstico anterior · hay información nueva por revisar"}</p>}{evidence.length > 0 && <Button variant="outline" className="mt-4" onClick={() => setTab("Evidencias")}>Ver observaciones</Button>}</article>}{tab === "Familia" && <div className="space-y-3"><FamilyInformationPanel studentId={student.id} studentName={student.name} context={profile.family_interview_context} /></div>}{tab === "Competencias" && <div className="space-y-3">{competencies.length ? competencies.map((competency) => <article key={competency.competency_key} className="rounded-2xl border bg-white p-5"><h2 className="font-extrabold">{competency.competency_text}</h2><p className="mt-2 text-sm text-[#526b87]">{competency.evidence_count} {competency.evidence_count === 1 ? "evidencia" : "evidencias"} · Última observación: {competency.last_observed_at ? new Date(competency.last_observed_at).toLocaleDateString("es-PE") : "—"}</p><p className="mt-2 text-sm font-semibold text-[#287163]">{studentCompetencyGuidance(competency).label}</p><div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">{Object.values(competency.observations).some((count) => count > 0) && Object.entries(competency.observations).map(([status, count]) => <p key={status}><span className="font-semibold">{statusLabels[status as keyof typeof statusLabels]}</span> {count}</p>)}</div>{studentCompetencyGuidance(competency).action && <Button variant="outline" className="mt-4" onClick={() => continueFrom(competency)}>{studentCompetencyGuidance(competency).action === "evidence" ? "Ver observaciones" : "Abrir evaluación"}</Button>}</article>) : <Empty message="Aún no hay evidencias de actividad registradas." />}</div>}{tab === "Evidencias" && <div className="space-y-2">{evidence.length ? evidence.map((item) => <article key={item.id} className="rounded-2xl border bg-white p-4"><p className="font-bold">{item.activity_title}</p><p className="mt-1 text-sm text-[#526b87]">{item.criterion_text} · {item.observation_status ? statusLabels[item.observation_status] : "Observación registrada"}</p>{item.observation_text && <p className="mt-2 text-sm">{item.observation_text}</p>}<p className="mt-2 text-xs text-muted-foreground">{new Date(item.observed_at).toLocaleDateString("es-PE")}{item.media_available ? " · recurso adjunto disponible" : ""}</p></article>) : <Empty message="Aún no hay evidencias de actividad registradas." />}</div>}{tab === "Diagnóstico" && <DiagnosticHistory observations={diagnosticObservations} diagnosis={diagnosis} confirmed={profile.confirmed_diagnostic_reviews} studentReview={profile.confirmed_student_diagnostic_review} />}</WorkflowTabPanel></section>;
}

function Empty({ message }: { message: string }) { return <EmptyState title="Sin información registrada" description={message} />; }

function DiagnosticHistory({ observations, diagnosis, confirmed, studentReview }: {
  observations: StudentPedagogicalProfile["diagnostic_observations"];
  diagnosis: StudentPedagogicalProfile["diagnosis"];
  confirmed: StudentPedagogicalProfile["confirmed_diagnostic_reviews"];
  studentReview: StudentPedagogicalProfile["confirmed_student_diagnostic_review"];
}) {
  if (!observations.length && !diagnosis.length && !confirmed.length && !studentReview) return <Empty message="No hay registros de diagnóstico para este niño." />;
  return <div className="space-y-2">
    {studentReview && <article className="rounded-2xl border border-[#b5dfc8] bg-[#f0faf4] p-4">
      <p className="font-bold">Comentario diagnóstico de la docente · versión {studentReview.version}{studentReview.is_current ? "" : " · requiere actualización"}</p>
      <p className="mt-1 text-xs text-[#526b87]">{studentReview.information_status === "insufficient_information" ? "Necesita más observación" : "Primera idea disponible"} · Confirmado el {new Date(studentReview.teacher_confirmed_at).toLocaleDateString("es-PE")}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{studentReview.comment_text}</p>
    </article>}
    {confirmed.length > 0 && <details className="rounded-2xl border bg-white p-4"><summary className="cursor-pointer font-semibold">Revisiones anteriores por competencia</summary><div className="mt-3 space-y-2">{confirmed.map((item) => <article key={item.id} className="rounded-2xl border border-[#b5dfc8] bg-[#f0faf4] p-4">
      <p className="font-semibold">{item.competency_name} · Diagnóstico revisado</p>
      <p className="mt-1 text-xs text-[#526b87]">{item.information_status === "insufficient_information" ? "Información insuficiente" : "Información inicial disponible"} · Confirmado por la docente el {new Date(item.teacher_confirmed_at).toLocaleDateString("es-PE")}</p>
      <p className="mt-2 text-sm">{item.summary_text}</p>
      {item.next_observation && <p className="mt-2 text-sm text-[#526b87]">Para seguir observando: {item.next_observation}</p>}
    </article>)}</div></details>}
    {observations.map((item) => <article key={item.id} className="rounded-2xl border bg-white p-4">
      <p className="font-semibold">{item.competency_name ?? "Competencia por revisar"}</p>
      <p className="mt-1 text-sm text-[#526b87]">{statusLabels[item.observation_status]} · {new Date(item.observed_at).toLocaleDateString("es-PE")}</p>
      {item.observation_text && <p className="mt-2 text-sm">{item.observation_text}</p>}
    </article>)}
    {diagnosis.map((item) => <article key={`${item.competency_id}-${item.updated_at}`} className="rounded-2xl border bg-white p-4">
      <p className="font-semibold">{item.teacher_confirmed ? "Confirmado por la docente" : "Borrador de diagnóstico anterior"}</p>
      {item.teacher_interpretation && <p className="mt-2 text-sm text-[#526b87]">{item.teacher_interpretation}</p>}
    </article>)}
  </div>;
}
