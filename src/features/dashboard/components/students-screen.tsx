"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { importPilotStudents, loadStudentPedagogicalProfile, type LocalDashboard, type LocalStudent, type StudentPedagogicalProfile } from "@/src/lib/local-database";
import { recommendedStudentGuidance, studentCompetencyGuidance } from "@/src/lib/student-guidance.mjs";
import { AsyncButton, EmptyState, NextStepCard, PageIntro, ScreenSkeleton, WorkflowFeedback, WorkflowTabs } from "./workflow-ui";

type ReviewStage = "assessment" | "conclusion" | "family_report";

const statusLabels = {
  demonstrated: "Lo demostró",
  with_support: "Con apoyo",
  not_yet_demonstrated: "Aún no",
  insufficient_information: "No pude determinarlo",
} as const;

export function StudentsScreen({ students, onImported, onEvaluate, onPlan }: { students: LocalStudent[]; onImported: (dashboard: LocalDashboard) => void; onEvaluate?: (studentId: string, stage: ReviewStage, competencyId: string) => void; onPlan?: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentPedagogicalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [csv, setCsv] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importTone, setImportTone] = useState<"success" | "error">("success");
  const visibleStudents = useMemo(() => students.filter((student) => student.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [students, query]);

  async function addStudents(useCsv: boolean) {
    setImportBusy(true); setImportMessage("");
    try {
      const dashboard = await importPilotStudents(useCsv ? { csv } : { students: [{ firstName, lastName, preferredName }] });
      onImported(dashboard); setFirstName(""); setLastName(""); setPreferredName(""); setCsv("");
      setImportMessage("Niños añadidos al aula."); setImportTone("success");
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

  if (selectedId) return <StudentProfile profile={profile} loading={loading} error={profileError} onBack={() => { setSelectedId(null); setProfile(null); setProfileError(""); }} onEvaluate={onEvaluate} onPlan={onPlan} />;
  return <section className="ayni-workflow space-y-5">
    <PageIntro eyebrow="Aula activa" title="Niños" description="Consulta sus registros y acompaña el progreso de cada niño." />
    <label className="ayni-panel flex min-h-12 items-center gap-2 px-4 text-[#60718a]"><Search className="size-5" aria-hidden="true" /><span className="sr-only">Buscar niño</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar niño" className="min-w-0 flex-1 border-0 bg-transparent outline-none" /></label>
    <div className="space-y-2">{visibleStudents.length ? visibleStudents.map((student) => <button key={student.id} type="button" onClick={() => { setProfile(null); setLoading(true); setSelectedId(student.id); }} className="ayni-panel flex min-h-16 w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:border-[#8fd4dc] hover:bg-[#f3fcfc] hover:shadow-sm active:translate-y-px"><span className="min-w-0 font-bold">{student.name}</span><span className="shrink-0 text-sm font-semibold text-[#087d96]">Ver perfil →</span></button>) : <EmptyState title={students.length ? "No encontramos niños" : "Aún no hay niños en el aula"} description={students.length ? "Prueba con otro nombre en la búsqueda." : "Añade un niño para empezar a acompañar su progreso."} />}</div>
    <details className="ayni-panel p-4 sm:p-5" open={students.length === 0}>
      <summary className="cursor-pointer font-bold text-[#126177]">Añadir niños al aula</summary>
      <div className="mt-4 space-y-4">
      <h2 className="font-bold">Añadir niños</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <label>Nombre<input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
        <label>Apellido<input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
        <label>Nombre preferido <span className="font-normal text-muted-foreground">(opcional)</span><input value={preferredName} onChange={(event) => setPreferredName(event.target.value)} /></label>
      </div>
      <AsyncButton busy={importBusy} busyLabel="Añadiendo..." disabled={!firstName.trim() || !lastName.trim()} onClick={() => void addStudents(false)}>Añadir niño</AsyncButton>
      <details className="rounded-xl border bg-[#fbfdff] p-3"><summary className="font-semibold">Importar varios desde CSV</summary><p className="mt-2 text-sm text-muted-foreground">Encabezado: first_name,last_name,preferred_name. Una fila por niño; máximo 40 por importación.</p><Textarea className="mt-2" aria-label="Niños en formato CSV" value={csv} onChange={(event) => setCsv(event.target.value)} placeholder={'first_name,last_name,preferred_name\nMaría,López,María'} /><AsyncButton className="mt-2" variant="outline" busy={importBusy} busyLabel="Importando..." disabled={!csv.trim()} onClick={() => void addStudents(true)}>Importar CSV</AsyncButton></details>
      {importMessage && <WorkflowFeedback tone={importTone}>{importMessage}</WorkflowFeedback>}
      </div>
    </details>
  </section>;
}

function StudentProfile({ profile, loading, error, onBack, onEvaluate, onPlan }: { profile: StudentPedagogicalProfile | null; loading: boolean; error: string; onBack: () => void; onEvaluate?: (studentId: string, stage: ReviewStage, competencyId: string) => void; onPlan?: () => void }) {
  const [tab, setTab] = useState<"Resumen" | "Competencias" | "Evidencias" | "Diagnóstico">("Resumen");
  if (loading || !profile) return <section className="mx-auto max-w-4xl space-y-3"><Button variant="ghost" onClick={onBack}><ArrowLeft /> Volver a Niños</Button>{error ? <WorkflowFeedback tone="error">{error}</WorkflowFeedback> : <ScreenSkeleton />}</section>;
  const { student, competencies, recent_relevant_observations: evidence, diagnosis } = profile;
  const recommendation = recommendedStudentGuidance(competencies);
  function continueFrom(competency: StudentPedagogicalProfile["competencies"][number]) {
    const guidance = studentCompetencyGuidance(competency);
    if (guidance.action === "evidence") { setTab("Evidencias"); return; }
    if (guidance.action && competency.competency_v4_id) onEvaluate?.(student.id, guidance.action as ReviewStage, competency.competency_v4_id);
  }
  return <section className="mx-auto max-w-4xl space-y-5"><Button variant="ghost" className="-ml-3" onClick={onBack}><ArrowLeft /> Volver a Niños</Button><header className="rounded-3xl bg-[linear-gradient(135deg,#ffffff,#e9fbfb)] p-6"><p className="text-sm font-semibold text-[#087d96]">Perfil pedagógico</p><h1 className="mt-1 text-3xl font-extrabold">{student.name}</h1><p className="mt-2 text-sm text-[#526b87]">{student.section} · {student.age_years} años · {student.school_year}</p></header>{recommendation ? <NextStepCard title={recommendation.action === "evidence" ? "Sigue observando" : recommendation.action === "assessment" ? "Evidencias para analizar" : recommendation.action === "conclusion" ? "Análisis confirmado" : "Conclusión confirmada"} description={recommendation.competency.competency_text} action={recommendation.action === "evidence" ? "Ver observaciones" : recommendation.action === "assessment" ? "Preparar análisis" : recommendation.action === "conclusion" ? "Preparar conclusión" : "Preparar informe"} onAction={() => continueFrom(recommendation.competency)} /> : onPlan && <EmptyState title="Prepara nuevas observaciones" description="Aún no hay registros actuales suficientes para analizar una competencia. Puedes revisar los registros anteriores o preparar una actividad." action={<Button onClick={onPlan}>Ir a Planificar</Button>} />}<WorkflowTabs label="Secciones del perfil" value={tab} onChange={setTab} tabs={[{ id: "Resumen", label: "Resumen" }, { id: "Competencias", label: "Competencias" }, { id: "Evidencias", label: "Evidencias" }, { id: "Diagnóstico", label: "Diagnóstico" }]} />{tab === "Resumen" && <article className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Registros de {student.name}</h2><p className="mt-2 text-sm text-[#526b87]">{evidence.length ? `${evidence.length} ${evidence.length === 1 ? "observación disponible" : "observaciones disponibles"}. Puedes revisarlas antes de continuar.` : "Aún no hay observaciones registradas."}</p>{evidence.length > 0 && <Button variant="outline" className="mt-4" onClick={() => setTab("Evidencias")}>Ver observaciones</Button>}</article>}{tab === "Competencias" && <div className="space-y-3">{competencies.length ? competencies.map((competency) => <article key={competency.competency_key} className="rounded-2xl border bg-white p-5"><h2 className="font-extrabold">{competency.competency_text}</h2><p className="mt-2 text-sm text-[#526b87]">{competency.evidence_count} {competency.evidence_count === 1 ? "evidencia" : "evidencias"} · Última observación: {competency.last_observed_at ? new Date(competency.last_observed_at).toLocaleDateString("es-PE") : "—"}</p><p className="mt-2 text-sm font-semibold text-[#287163]">{studentCompetencyGuidance(competency).label}</p><div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">{Object.entries(statusLabels).map(([status, label]) => <p key={status}><span className="font-semibold">{label}</span> {competency.observations[status as keyof typeof competency.observations]}</p>)}</div>{studentCompetencyGuidance(competency).action && <Button variant="outline" className="mt-4" onClick={() => continueFrom(competency)}>{studentCompetencyGuidance(competency).action === "evidence" ? "Ver observaciones" : studentCompetencyGuidance(competency).action === "assessment" ? "Preparar análisis" : studentCompetencyGuidance(competency).action === "conclusion" ? "Preparar conclusión" : "Preparar informe"}</Button>}</article>) : <Empty message="Aún no hay evidencias con marca observacional para mostrar una trayectoria." />}</div>}{tab === "Evidencias" && <div className="space-y-2">{evidence.length ? evidence.map((item) => <article key={item.id} className="rounded-2xl border bg-white p-4"><p className="font-bold">{item.activity_title}</p><p className="mt-1 text-sm text-[#526b87]">{item.criterion_text} · {item.observation_status ? statusLabels[item.observation_status] : "Registro anterior · sin marca observacional"}</p>{item.observation_text && <p className="mt-2 text-sm">{item.observation_text}</p>}<p className="mt-2 text-xs text-muted-foreground">{new Date(item.observed_at).toLocaleDateString("es-PE")}{item.media_available ? " · recurso adjunto disponible" : ""}</p></article>) : <Empty message="Aún no hay evidencias registradas." />}</div>}{tab === "Diagnóstico" && <div className="space-y-2">{diagnosis.length ? diagnosis.map((item) => <article key={`${item.competency_id}-${item.updated_at}`} className="rounded-2xl border bg-white p-4"><p className="font-semibold">{item.teacher_confirmed ? "Confirmado por la docente" : "Borrador de diagnóstico"}</p>{item.teacher_interpretation && <p className="mt-2 text-sm text-[#526b87]">{item.teacher_interpretation}</p>}</article>) : <Empty message="No hay registros de diagnóstico para este niño." />}</div>}</section>;
}

function Empty({ message }: { message: string }) { return <EmptyState title="Sin registros todavía" description={message} />; }
