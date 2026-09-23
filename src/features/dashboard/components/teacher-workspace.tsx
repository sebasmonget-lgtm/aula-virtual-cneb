"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  BookOpen, CalendarDays, Check, ChevronRight, ClipboardCheck, Database, FileText,
  Camera, CheckCircle2, Clock3, Home, Menu, Play,
  Settings2, Sparkles, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  createLocalEvidence, loadLocalDashboard, loadPilotSetup, localDatabaseApiUrl, saveLocalAttendance, updateLocalExecution, type ActivityCriterion, type LocalDashboard, type LocalStudent, type ObservationStatus,
} from "@/src/lib/local-database";
import { loadPlanningJourney, loadStartingGuidance } from "@/src/lib/planning-journey.mjs";
import { InstitutionProfile } from "./profile-and-diagnostic";
import { GuidedDiagnostic } from "./guided-diagnostic-v4";
import { StudentsScreen } from "./students-screen";
import { ActivityRunView } from "./activity-run-view";
import { AttendanceDialog } from "./attendance-dialog";
import { ParentActivityGenerator } from "./parent-activity-generator";
import { AnnualPlanGenerator } from "./annual-plan-generator";
import { LearningExperienceGenerator } from "./learning-experience-generator";
import { AssessmentGenerator } from "./assessment-generator";
import { DescriptiveConclusionGenerator } from "./descriptive-conclusion-generator";
import { FamilyReportGenerator } from "./family-report-generator";
import { PilotSetup } from "./pilot-setup";
import { AsyncButton, LoadingState, NextStepCard, PageIntro, ScreenSkeleton, WorkflowFeedback, WorkflowTabs } from "./workflow-ui";

const nav = [
  ["Hoy", Home], ["Planificar", CalendarDays], ["Niños", Users],
  ["Evaluar", ClipboardCheck], ["Perfil", Settings2],
] as const;

const mobileNav = [
  ["Hoy", "Hoy", Home], ["Plan", "Planificar", CalendarDays], ["Evaluar", "Evaluar", ClipboardCheck],
  ["Niños", "Niños", Users], ["Perfil", "Perfil", Settings2],
] as const;
const sentenceCase = (value: string) => value.charAt(0).toLocaleUpperCase("es-PE") + value.slice(1);

export function TeacherWorkspace() {
  const [active, setActive] = useState("Hoy");
  const navigationTouched = useRef(false);
  const [evaluationTarget, setEvaluationTarget] = useState<{ studentId: string; stage: "assessment" | "conclusion" | "family_report"; competencyId: string } | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [activityRunBlockId, setActivityRunBlockId] = useState<string | null>(null);
  const [evidenceContext, setEvidenceContext] = useState<{ activityId: string; criteria: ActivityCriterion[]; title: string } | null>(null);
  const [studentId, setStudentId] = useState("3");
  const [criterionId, setCriterionId] = useState("");
  const [observationStatus, setObservationStatus] = useState<ObservationStatus | "">("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<{ base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; name: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [dashboard, setDashboard] = useState<LocalDashboard | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [databaseState, setDatabaseState] = useState<"checking" | "connected" | "offline">("checking");
  const [guidanceError, setGuidanceError] = useState(false);
  const [starting, setStarting] = useState(true);
  const [needsFirstDiagnostic, setNeedsFirstDiagnostic] = useState(false);
  const [retry, setRetry] = useState(0);
  const today = useMemo(() => new Intl.DateTimeFormat("es-PE", {
    weekday: "long", day: "numeric", month: "long",
  }).format(new Date()), []);

  useEffect(() => {
    const controller = new AbortController();
    loadPilotSetup().then((setup) => {
      if (!setup.configured) { setNeedsSetup(true); setDatabaseState("connected"); return null; }
      return loadLocalDashboard(controller.signal);
    })
      .then(async (data) => {
        if (!data) return;
        setDashboard(data);
        setStudentId(data.students[2]?.id ?? data.students[0]?.id ?? "");
        setCriterionId(data.activity?.criteria[0]?.id ?? "");
        setDatabaseState("connected");
        try {
          const guidance = await loadStartingGuidance(localDatabaseApiUrl);
          if (!controller.signal.aborted && !navigationTouched.current) setActive(guidance.startingSection);
          if (!controller.signal.aborted) {
            setNeedsFirstDiagnostic(!guidance.plans.active && !guidance.plans.draft && guidance.diagnostic !== "reviewed");
            setGuidanceError(false);
          }
        } catch { if (!controller.signal.aborted) setGuidanceError(true); }
        finally { if (!controller.signal.aborted) setStarting(false); }
      })
      .catch(() => { setDatabaseState("offline"); setStarting(false); });
    return () => controller.abort();
  }, [retry]);

  async function saveEvidence(andNext = false) {
    if (!criterionId || !observationStatus || savingEvidence || saved) return;
    setSavingEvidence(true);
    setSaveError("");
    try {
      if (!dashboard) throw new Error("Inicia la base local para guardar información.");
      await createLocalEvidence({
        studentId,
        activityId: evidenceContext?.activityId ?? dashboard.activity?.id ?? "",
        criterionId,
        observationStatus,
        observationText: note || undefined,
        photo: photo ? { base64: photo.base64, mimeType: photo.mimeType } : undefined,
      });
      setDashboard(await loadLocalDashboard());
      setSaved(true);
      if (andNext) {
        setSaved(false);
        setNote("");
        setObservationStatus("");
        setPhoto(null);
        const currentIndex = students.findIndex((student) => student.id === studentId);
        const nextStudent = students[currentIndex + 1];
        if (nextStudent) setStudentId(nextStudent.id);
        else setSaveError("Último niño de la lista. Puedes cerrar o elegir otro estudiante.");
      }
    } catch (error) {
      setSaved(false);
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar la evidencia.");
    } finally {
      setSavingEvidence(false);
    }
  }

  const students = dashboard?.students ?? [];
  const profile = dashboard?.profile;
  const activity = dashboard?.activity;
  const metrics = dashboard?.metrics;

  function navigate(section: string) { navigationTouched.current = true; setStarting(false); setActive(section); }

  function closeEvidence(open: boolean) {
    setEvidenceOpen(open);
    if (!open) {
      setSaveError("");
      setEvidenceOpen(false);
      setSaved(false);
      setNote("");
      setObservationStatus("");
      setPhoto(null);
    }
  }

  async function markAttendance(records: { studentId: string; status: "present" | "absent" | "late" | "excused" }[]) {
    setDashboard(await saveLocalAttendance(records));
    setAttendanceOpen(false);
  }

  async function updateExecution(input: { scheduleEntryId: string; action: "start" | "complete" | "skip" | "keep_current" | "set_step"; stepIndex?: number; closureType?: "as_planned" | "note"; closureNote?: string }) {
    setDashboard(await updateLocalExecution(input));
  }

  function openEvidenceFor(block: LocalDashboard["today"]["blocks"][number]) {
    if (!block.activity_id || !block.criteria.length) return;
    setEvidenceContext({ activityId: block.activity_id, criteria: block.criteria, title: block.title });
    setCriterionId(block.criteria[0].id);
    setObservationStatus("");
    setPhoto(null);
    setEvidenceOpen(true);
  }

  async function openActivity(block: LocalDashboard["today"]["blocks"][number], start = false) {
    if (!block.activity_id) return;
    if (start) await updateExecution({ scheduleEntryId: block.id, action: "start" });
    setActivityRunBlockId(block.id);
  }

  const activityRunBlock = dashboard?.today.blocks.find((block) => block.id === activityRunBlockId) ?? null;

  if (needsSetup) return <PilotSetup onReady={(ready) => { setDashboard(ready); setNeedsSetup(false); setDatabaseState("connected"); setNeedsFirstDiagnostic(true); navigate("Niños"); }} />;
  if (databaseState === "offline") return <main className="mx-auto max-w-xl space-y-4 p-6"><h1 className="text-2xl font-bold">No se pudo conectar con el aula</h1><p>Inicia la base local y vuelve a intentarlo. Tus borradores guardados seguirán disponibles.</p><Button onClick={() => { setDatabaseState("checking"); setRetry((value) => value + 1); }}>Reintentar</Button></main>;

  return (
    <SidebarProvider style={{ "--sidebar-width": "13.5rem" } as CSSProperties}>
      <Sidebar collapsible="offcanvas" className="border-r border-[#e4eaf3] text-[#19345b]">
        <SidebarHeader className="px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#d9f2ef] text-[#138b8b]">
              <BookOpen className="size-5" aria-hidden="true" />
            </div>
            <div><p className="text-xl font-extrabold leading-tight tracking-tight">Ayni Aula</p><p className="text-xs text-[#63748d]">Tu aliada en Inicial</p></div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {nav.map(([label, Icon]) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton asChild isActive={active === label} className="h-11 rounded-xl px-3 text-[15px] transition-colors hover:bg-[#eaf6f9] focus-visible:ring-2 data-[active=true]:bg-[#087d96] data-[active=true]:font-semibold data-[active=true]:text-white">
                      <button type="button" aria-current={active === label ? "page" : undefined} onClick={() => navigate(label)}><Icon /><span>{label}</span></button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <div className="rounded-xl border border-[#dce6f4] bg-white p-3">
            <p className="text-sm font-semibold">{profile?.section ?? "Aula"} · {profile?.age_label ?? "Edad por configurar"}</p>
            <p className="mt-1 text-xs text-[#63748d]">{profile?.school_year ?? "Año sin configurar"} · {metrics?.students_total ?? 0} estudiantes</p>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-[#e7edf7] bg-white/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" aria-label="Abrir menú"><Menu /></SidebarTrigger>
            <div><p className="text-sm font-semibold md:text-base">{sentenceCase(today)}</p><p className="hidden text-xs text-muted-foreground sm:block">{profile?.institution_name ?? "Institución por configurar"} · {profile?.section ?? "Aula"}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex ${databaseState === "connected" ? "bg-[#e5f1ee] text-[#1f625c]" : "bg-muted text-muted-foreground"}`}>
              <Database className="size-3.5" />
              {databaseState === "connected" ? "Base local conectada" : "Conectando"}
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-[#d9eaf4] text-sm font-bold text-[#155a78]">{profile?.teacher_name?.split(" ").map((part) => part[0]).slice(0, 2).join("") ?? ""}</div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1450px] px-4 pb-24 pt-6 md:px-7 md:pt-8">
          {guidanceError && <div className="mb-4 flex flex-wrap items-center gap-3"><WorkflowFeedback tone="error">No pudimos comprobar cuál es tu siguiente paso.</WorkflowFeedback><Button variant="outline" onClick={() => { setGuidanceError(false); setRetry((value) => value + 1); }}>Reintentar</Button></div>}
          {starting ? <ScreenSkeleton /> : active === "Perfil" ? dashboard ? <InstitutionProfile dashboard={dashboard} onSaved={setDashboard} /> : <ScreenSkeleton /> :
          active === "Evaluar" ? dashboard ? <EvaluationArea dashboard={dashboard} students={students} initialTarget={evaluationTarget} focused={needsFirstDiagnostic} onPlan={() => { setNeedsFirstDiagnostic(false); navigate("Planificar"); }} onStudents={() => navigate("Niños")} /> : <ScreenSkeleton /> :
          active === "Niños" ? dashboard ? <StudentsScreen students={students} onImported={setDashboard} onDiagnostic={() => navigate("Evaluar")} onEvaluate={(studentId, stage, competencyId) => { setEvaluationTarget({ studentId, stage, competencyId }); navigate("Evaluar"); }} onPlan={() => navigate("Planificar")} /> : <ScreenSkeleton /> : active === "Planificar" ? dashboard ? <PlanningArea onGoToday={() => navigate("Hoy")} onGoDiagnostic={() => navigate("Evaluar")} onGoStudents={() => navigate("Niños")} /> : <ScreenSkeleton /> : <>
          {activityRunBlock ? <ActivityRunView block={activityRunBlock} onBack={() => setActivityRunBlockId(null)} onEvidence={() => openEvidenceFor(activityRunBlock)} onStepChange={async (stepIndex) => updateExecution({ scheduleEntryId: activityRunBlock.id, action: "set_step", stepIndex })} onComplete={async () => { await updateExecution({ scheduleEntryId: activityRunBlock.id, action: "complete", closureType: "as_planned" }); setActivityRunBlockId(null); }} /> : active === "Hoy" && (dashboard ? <TodayScreen dashboard={dashboard} openEvidence={openEvidenceFor} openAttendance={() => setAttendanceOpen(true)} updateExecution={updateExecution} openActivity={openActivity} onPlan={() => navigate("Planificar")} /> : <ScreenSkeleton />)}
          </>}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#e1e9f2] bg-white/97 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(24,45,80,.05)] backdrop-blur md:hidden" aria-label="Navegación rápida">
          {mobileNav.map(([label, destination, Icon]) => <button key={label} type="button" aria-current={active === destination ? "page" : undefined} onClick={() => navigate(destination)} className={`group mx-0.5 flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] active:bg-[#d8f0f4] ${active === destination ? "text-[#087d96]" : "text-[#60718a]"}`}><span className={`grid h-7 w-11 place-items-center rounded-lg ${active === destination ? "bg-[#dff3f6]" : "group-hover:bg-[#edf6fa]"}`}><Icon className="size-5" /></span><span>{label}</span></button>)}
        </nav>
      </SidebarInset>
      <AttendanceDialog open={attendanceOpen} onOpenChange={setAttendanceOpen} students={students} onSave={markAttendance} />
      <EvidenceDialog open={evidenceOpen} onOpenChange={closeEvidence} students={students} studentId={studentId} setStudentId={setStudentId} criterionId={criterionId} setCriterionId={setCriterionId} criteria={evidenceContext?.criteria ?? activity?.criteria ?? []} observationStatus={observationStatus} setObservationStatus={setObservationStatus} note={note} setNote={setNote} photo={photo} setPhoto={setPhoto} saved={saved} saving={savingEvidence} saveError={saveError} saveEvidence={saveEvidence} activityTitle={evidenceContext?.title ?? activity?.title ?? "Actividad"} databaseConnected={databaseState === "connected"} />
    </SidebarProvider>
  );
}

function TodayScreen({ dashboard, openEvidence, openAttendance, updateExecution, openActivity, onPlan }: {
  dashboard: LocalDashboard | null;
  openEvidence: (block: LocalDashboard["today"]["blocks"][number]) => void;
  openAttendance: () => void;
  updateExecution: (input: { scheduleEntryId: string; action: "start" | "complete" | "skip" | "keep_current" | "set_step"; stepIndex?: number; closureType?: "as_planned" | "note"; closureNote?: string }) => Promise<void>;
  openActivity: (block: LocalDashboard["today"]["blocks"][number], start?: boolean) => Promise<void>;
  onPlan: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const [closureNote, setClosureNote] = useState("");
  const [closingBusy, setClosingBusy] = useState(false);
  const [closingError, setClosingError] = useState("");
  const today = dashboard?.today;
  const journey = today?.journey;
  const current = today?.blocks.find((block) => block.id === journey?.current_block_id);
  const next = today?.blocks.find((block) => block.id === journey?.next_block_id);
  const featured = current ?? next ?? today?.blocks.at(-1);
  const isNoClasses = journey?.mode === "no_classes";
  const isAttendance = journey?.primary_action === "attendance";
  const isClosure = journey?.primary_action === "close_block";
  const isReadyToClose = !isClosure && featured?.status === "active";
  const primaryLabel = isAttendance ? "Marcar asistencia" : journey?.primary_action === "start_block" ? "Iniciar actividad" : journey?.primary_action === "continue_block" ? "Continuar actividad" : featured?.block_type === "workshop" ? "Ver taller" : featured?.activity_id ? "Registrar evidencia" : "Ver bloque";
  async function complete(closureType: "as_planned" | "note") {
    if (!featured || closingBusy) return;
    setClosingBusy(true); setClosingError("");
    try { await updateExecution({ scheduleEntryId: featured.id, action: "complete", closureType, ...(closureType === "note" ? { closureNote } : {}) }); setClosureNote(""); setClosing(false); }
    catch { setClosingError("No se pudo guardar el cierre. Vuelve a intentarlo."); }
    finally { setClosingBusy(false); }
  }

  return <div className="mx-auto max-w-4xl space-y-5">
    <div className="rounded-3xl bg-[radial-gradient(circle_at_85%_30%,#d9f6f5,transparent_32%),linear-gradient(135deg,#ffffff,#edf9ff)] px-5 py-6 md:px-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-[#087d96]">Mi día de hoy</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">{today?.date ? sentenceCase(new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${today.date}T12:00:00`))) : "Cargando día..."}</h1></div><span className="w-fit rounded-2xl bg-white/85 px-3 py-2 text-sm font-semibold text-[#126177]">{dashboard?.profile.age_label} · {dashboard?.profile.section}</span></div></div>
    {isNoClasses ? <section className="diagnostic-panel bg-[#f7f4ff] p-6"><CalendarDays className="mb-3 text-[#7554aa]" /><h2 className="text-xl font-bold">{today?.calendar_exception?.label ?? "No hay clases hoy"}</h2><p className="mt-2 text-sm text-[#5b6680]">La jornada queda libre de actividades y evidencias.</p></section> : !today?.blocks.length ? <section className="diagnostic-panel p-6"><Clock3 className="mb-3 text-[#087d96]" /><h2 className="text-xl font-bold">Hoy aún no hay actividades programadas</h2><p className="mt-2 text-sm text-muted-foreground">Revisa tu planificación o prepara la próxima actividad. El horario aparecerá aquí cuando esté listo.</p><Button className="mt-4" onClick={onPlan}>Continuar en Planificar <ChevronRight /></Button></section> : <>
      {featured && <section className="diagnostic-panel overflow-hidden border-[#c5edf0] bg-[linear-gradient(135deg,#ffffff,#e9fbfb)] p-5 md:p-7"><div className="flex items-center justify-between gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${current ? "bg-[#087d96] text-white" : "bg-[#fff0c7] text-[#926329]"}`}>{isClosure ? "CIERRE" : current ? "AHORA" : "PRÓXIMO"}</span><span className="text-sm font-semibold text-[#47617f]">{featured.start_time.slice(0,5)} – {featured.end_time.slice(0,5)}</span></div><p className="mt-4 text-sm text-[#37658d]">{featured.experience_title ?? (featured.block_type === "workshop" ? "Taller programado" : "Jornada de aula")}</p><h2 className="mt-1 text-2xl font-extrabold">{featured.title}</h2>{featured.purpose && <p className="mt-2 text-sm leading-relaxed text-[#526b87]">{featured.purpose}</p>}<div className="mt-5 grid gap-3 sm:grid-cols-2">{isAttendance ? <Button className="h-12" onClick={openAttendance}><Users /> {primaryLabel}</Button> : journey?.primary_action === "start_block" && featured.activity_id ? <Button className="h-12" onClick={() => void openActivity(featured, true)}><Play /> {primaryLabel}</Button> : journey?.primary_action === "continue_block" && featured.activity_id ? <Button className="h-12" onClick={() => void openActivity(featured)}><Play /> {primaryLabel}</Button> : isClosure ? <Button className="h-12" onClick={() => setClosing(true)}><CheckCircle2 /> ¿Cómo salió?</Button> : featured.activity_id ? <Button className="h-12" onClick={() => void openActivity(featured)}><Play /> Abrir actividad</Button> : <p className="rounded-xl border bg-white px-4 py-3 text-sm text-[#526b87]">Bloque sin actividad guiada.</p>}{journey?.primary_action === "continue_block" && featured.activity_id && featured.criteria.length > 0 && <Button variant="outline" className="h-12" onClick={() => openEvidence(featured)}><Camera /> Registrar evidencia</Button>}{isReadyToClose && <Button variant="outline" className="h-12" onClick={() => setClosing(true)}><CheckCircle2 /> ¿Cómo salió?</Button>}</div>{(current?.current_override || isClosure) && <Button variant="ghost" className="mt-3 h-10 text-[#126177]" onClick={() => updateExecution({ scheduleEntryId: featured.id, action: "keep_current" })}>Mantener como actual</Button>}</section>}
      <section className="diagnostic-panel p-4 md:p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Mi jornada</h2><Clock3 className="size-5 text-[#087d96]" /></div><div className="mt-3 space-y-2">{today.blocks.map((block) => <div key={block.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${block.id === featured?.id ? "border-[#bce9ee] bg-[#f0fbfc]" : "border-[#edf1f7] bg-white"}`}><span className="w-12 text-sm font-bold text-[#315575]">{block.start_time.slice(0,5)}</span><span className={`size-2.5 rounded-full ${block.display_status === "active" ? "bg-[#087d96]" : block.display_status === "ready_to_close" || block.status === "completed" ? "bg-[#b8c4d4]" : "bg-[#e6ae44]"}`} /><span className="min-w-0 flex-1 truncate font-semibold">{block.title}</span>{block.block_type === "workshop" && <span className="rounded-full bg-[#eee4ff] px-2 py-1 text-xs font-semibold text-[#7554aa]">Taller</span>}</div>)}</div></section>
      <section className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#fff8ef] p-5"><p className="text-sm font-bold">Asistencia</p><p className="mt-2 text-sm text-[#55657c]">{today.attendance.recorded ? "Registrada para hoy" : "Pendiente de registrar"}</p></div><div className="rounded-2xl bg-[#edf8f3] p-5"><p className="text-sm font-bold">Aula</p><p className="mt-2 text-sm text-[#35675f]">{dashboard?.metrics.students_observed ?? 0}/{dashboard?.metrics.students_total ?? 0} observados</p></div></section>
    </>}
    <Dialog open={closing} onOpenChange={setClosing}><DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>¿Cómo salió?</DialogTitle><DialogDescription>El cierre es opcional y no modifica la planificación sin tu confirmación.</DialogDescription></DialogHeader><div className="grid gap-3"><AsyncButton busy={closingBusy} busyLabel="Guardando cierre..." onClick={() => void complete("as_planned")}><CheckCircle2 /> Todo según lo previsto</AsyncButton><Textarea disabled={closingBusy} value={closureNote} onChange={(event) => setClosureNote(event.target.value)} placeholder="Agregar una observación breve (opcional)" className="min-h-24" />{closingError && <WorkflowFeedback tone="error">{closingError}</WorkflowFeedback>}</div><DialogFooter><Button variant="ghost" disabled={closingBusy} onClick={() => setClosing(false)}>Cancelar</Button><AsyncButton variant="outline" busy={closingBusy} busyLabel="Guardando cierre..." disabled={!closureNote.trim()} onClick={() => void complete("note")}>Guardar cierre</AsyncButton></DialogFooter></DialogContent></Dialog>
  </div>;
}

async function preparePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('La foto debe ser JPEG, PNG o WebP.');
  const source = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('No se pudo leer la foto.')); reader.readAsDataURL(file); });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => { const element = new Image(); element.onload = () => resolve(element); element.onerror = () => reject(new Error('No se pudo procesar la foto.')); element.src = source; });
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
  const base64 = dataUrl.split(',')[1] ?? '';
  if (base64.length > 4_000_000) throw new Error('La foto sigue siendo demasiado grande. Elige una imagen más ligera.');
  return { base64, mimeType: 'image/jpeg' as const, name: file.name };
}

function EvidenceDialog({ open, onOpenChange, students, studentId, setStudentId, criterionId, setCriterionId, criteria, observationStatus, setObservationStatus, note, setNote, photo, setPhoto, saved, saving, saveError, saveEvidence, activityTitle, databaseConnected }: {
  open: boolean; onOpenChange: (open: boolean) => void; students: LocalStudent[]; studentId: string; setStudentId: (id: string) => void;
  criterionId: string; setCriterionId: (id: string) => void; criteria: ActivityCriterion[]; observationStatus: ObservationStatus | ""; setObservationStatus: (value: ObservationStatus) => void;
  note: string; setNote: (value: string) => void; photo: { base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; name: string } | null; setPhoto: (photo: { base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; name: string } | null) => void; saved: boolean; saveError: string; saveEvidence: (andNext?: boolean) => void;
  activityTitle: string; databaseConnected: boolean; saving: boolean;
}) {
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const criterion = criteria.find((item) => item.id === criterionId) ?? criteria[0];
  const scopeLabel = criterion?.details?.evidence_scope === "group" ? "Grupal" : criterion?.details?.evidence_scope === "mixed" ? "Individual y grupal" : "Individual";
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="rounded-2xl p-0 sm:max-w-xl">
      <DialogHeader className="border-b px-6 py-5"><DialogTitle>Registrar evidencia</DialogTitle><DialogDescription>Actividad: {activityTitle}</DialogDescription></DialogHeader>
      <div className="space-y-5 px-6 py-1">
        {!databaseConnected && <p className="rounded-xl bg-[#fff1d6] px-4 py-3 text-sm text-[#784a17]">La base local no está iniciada. Puedes revisar el formulario, pero debes ejecutar <strong>npm run db:local</strong> para guardar.</p>}
        <fieldset><legend className="mb-2 text-sm font-semibold">¿A quién observaste?</legend><div className="flex flex-wrap gap-2">{students.map((student) => <button key={student.id} type="button" aria-pressed={studentId === student.id} onClick={() => setStudentId(student.id)} className={`min-h-11 rounded-full border px-3 py-2 text-sm font-medium transition hover:border-[#9bcbd7] hover:bg-[#f0f9fc] ${studentId === student.id ? "border-[#087d96] bg-[#e8f6fb] text-[#126177]" : "bg-white"}`}>{studentId === student.id && <Check className="mr-1 inline size-3.5" />}{student.name}</button>)}</div></fieldset>
        {criteria.length > 1 && <fieldset><legend className="mb-2 text-sm font-semibold">¿Qué criterio observaste?</legend><div className="space-y-2">{criteria.map((item) => <button key={item.id} type="button" aria-pressed={criterionId === item.id} onClick={() => setCriterionId(item.id)} className={`min-h-11 w-full rounded-xl border p-3 text-left text-sm hover:border-[#9bcbd7] hover:bg-[#f0f9fc] ${criterionId === item.id ? "border-[#087d96] bg-[#e8f6fb]" : "bg-white"}`}><span className="font-semibold">{item.criterion_text}</span><span className="mt-1 block text-xs text-[#526b87]">{item.competency_text}</span></button>)}</div></fieldset>}
        {criterion && <section className="rounded-xl bg-[#edf8f3] p-4 text-sm"><p className="text-xs font-bold uppercase tracking-wider">Criterio</p><p className="font-semibold">{criterion.criterion_text}</p>{criterion.details?.expected_evidence && <><p className="mt-3 text-xs font-bold uppercase tracking-wider">Evidencia que podría verse</p><p>{criterion.details.expected_evidence}</p></>}{criterion.details?.observation_focus?.length ? <><p className="mt-3 text-xs font-bold uppercase tracking-wider">En qué fijarse</p><ul className="list-disc pl-5">{criterion.details.observation_focus.map((item) => <li key={item}>{item}</li>)}</ul></> : null}{criterion.details?.acceptable_evidence_variations?.length ? <><p className="mt-3 text-xs font-bold uppercase tracking-wider">Aceptar también</p><ul className="list-disc pl-5">{criterion.details.acceptable_evidence_variations.map((item) => <li key={item}>{item}</li>)}</ul></> : null}{criterion.details?.teacher_caution && <p className="mt-3 rounded bg-white p-2"><b>Nota pedagógica:</b> {criterion.details.teacher_caution}</p>}<p className="mt-3 text-xs">Alcance: {scopeLabel}</p>{criterion.details?.evidence_scope === "group" && <p className="mt-2 rounded bg-[#fff8ef] p-2">Esta situación fue pensada principalmente para observación grupal. Registra evidencia individual solo si observaste directamente a este niño.</p>}</section>}
        <fieldset><legend className="mb-2 text-sm font-semibold">¿Cómo mostró este criterio?</legend><div className="grid gap-2 sm:grid-cols-2">{([['demonstrated','Lo mostró'],['with_support','Lo mostró con apoyo'],['not_yet_demonstrated','Aún no se observó'],['insufficient_information','No tengo información suficiente']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={observationStatus === value} onClick={() => setObservationStatus(value)} className={`min-h-11 rounded-xl border px-3 text-left text-sm font-semibold hover:border-[#9bcbd7] hover:bg-[#e8f6fb] ${observationStatus === value ? "border-[#087d96] bg-[#087d96] text-white hover:bg-[#076d82]" : "bg-white text-[#315a78]"}`}>{label}</button>)}</div><p className="mt-2 text-xs text-muted-foreground">Esta es una observación de esta situación, no una calificación final.</p></fieldset>
        <div><label htmlFor="evidence-note" className="mb-2 block text-sm font-semibold">Nota breve <span className="font-normal text-muted-foreground">(opcional)</span></label><Textarea id="evidence-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej.: Camila comparó dos macetas y dijo que la que estaba cerca de la ventana creció más..." className="min-h-24 resize-none" /></div>
        <div><label htmlFor="evidence-photo" className="mb-2 block text-sm font-semibold">Foto <span className="font-normal text-muted-foreground">(opcional)</span></label><input id="evidence-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={preparingPhoto || saving || saved} className="block w-full text-sm" onChange={async (event) => { const input = event.currentTarget; const file = input.files?.[0]; if (!file) return; setPhotoError(""); setPreparingPhoto(true); try { setPhoto(await preparePhoto(file)); } catch (error) { setPhotoError(error instanceof Error ? error.message : "No se pudo preparar la foto."); input.value = ""; } finally { setPreparingPhoto(false); } }} />{preparingPhoto && <LoadingState label="Preparando foto..." />}{photoError && <WorkflowFeedback tone="error">{photoError}</WorkflowFeedback>}{photo && <p className="mt-2 text-xs font-medium text-[#126177]">Foto lista: {photo.name} <button type="button" className="underline" onClick={() => setPhoto(null)}>Quitar</button></p>}<p className="mt-1 text-xs text-muted-foreground">La foto se guarda solo en este equipo y no se envía a IA.</p></div>
        {saved && <WorkflowFeedback tone="success">Evidencia guardada. Puedes cerrar esta ventana.</WorkflowFeedback>}
        {saveError && <WorkflowFeedback tone="error">{saveError}</WorkflowFeedback>}
      </div>
      <DialogFooter className="border-t px-6 py-4"><Button variant="ghost" onClick={() => onOpenChange(false)}>{saved ? "Cerrar" : "Cancelar"}</Button><AsyncButton variant="outline" busy={saving} busyLabel="Guardando..." disabled={!criterionId || !observationStatus || saved || !studentId || preparingPhoto} onClick={() => saveEvidence(true)}>Guardar y siguiente</AsyncButton><AsyncButton busy={saving} busyLabel="Guardando..." disabled={!criterionId || !observationStatus || saved || !studentId || preparingPhoto} onClick={() => saveEvidence()}>Guardar evidencia</AsyncButton></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function EvaluationArea({ dashboard, students, initialTarget, focused, onPlan, onStudents }: { dashboard: LocalDashboard; students: LocalStudent[]; initialTarget: { studentId: string; stage: "assessment" | "conclusion" | "family_report"; competencyId: string } | null; focused: boolean; onPlan: () => void; onStudents: () => void }) {
  const [tab, setTab] = useState<"diagnostic" | "assessment" | "conclusion" | "family_report">(initialTarget?.stage ?? "diagnostic");
  const [target, setTarget] = useState(initialTarget);
  return <section className="mx-auto max-w-5xl space-y-5">
    <PageIntro eyebrow="Acompañamiento pedagógico" title="Evaluar" description="Conoce el desarrollo de cada niño a partir de evidencias reales y decisiones confirmadas por ti." icon={ClipboardCheck} />
    {!focused && <WorkflowTabs label="Secciones de Evaluar" value={tab} onChange={setTab} tabs={[
      { id: "diagnostic", label: "Diagnóstico", icon: ClipboardCheck },
      { id: "assessment", label: "Análisis de evidencias", shortLabel: "Análisis", icon: Sparkles },
      { id: "conclusion", label: "Conclusiones descriptivas", shortLabel: "Conclusiones", icon: FileText },
      { id: "family_report", label: "Informe a familias", shortLabel: "Informe", icon: BookOpen },
    ]} />}
    {tab === "diagnostic" ? <GuidedDiagnostic dashboard={dashboard} onPlan={onPlan} onStudents={onStudents} /> : tab === "assessment" ? <AssessmentGenerator students={students} initialStudentId={target?.studentId} initialCompetencyId={target?.competencyId} onNext={(studentId, competencyId) => { setTarget({ studentId, competencyId, stage: "conclusion" }); setTab("conclusion"); }} onPlan={onPlan} /> : tab === "conclusion" ? <DescriptiveConclusionGenerator students={students} initialStudentId={target?.studentId} initialCompetencyId={target?.competencyId} onNext={(studentId, competencyId) => { setTarget({ studentId, competencyId, stage: "family_report" }); setTab("family_report"); }} onAssessment={(studentId) => { setTarget({ studentId, competencyId: "", stage: "assessment" }); setTab("assessment"); }} /> : <FamilyReportGenerator students={students} initialStudentId={target?.studentId} onConclusion={(studentId) => { setTarget({ studentId, competencyId: "", stage: "conclusion" }); setTab("conclusion"); }} />}
  </section>;
}
function PlanningArea({ onGoToday, onGoDiagnostic, onGoStudents }: { onGoToday: () => void; onGoDiagnostic: () => void; onGoStudents: () => void }) {
  const [tab, setTab] = useState<"diagnostic" | "annual" | "experiences" | "activities">("annual");
  const [journey, setJourney] = useState<Awaited<ReturnType<typeof loadPlanningJourney>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressError, setProgressError] = useState(false);
  const steps = [{ id: "diagnostic" as const, label: "Diagnóstico" }, { id: "annual" as const, label: "Plan anual" }, { id: "experiences" as const, label: "Proyecto o unidad" }, { id: "activities" as const, label: "Actividad" }];
  const stepIndex = steps.findIndex((step) => step.id === tab);
  const status = journey && (tab === "diagnostic" ? journey.diagnostic : tab === "annual" ? journey.annual : tab === "experiences" ? journey.experience : journey.activity);

  useEffect(() => {
    let live = true;
    loadPlanningJourney(localDatabaseApiUrl).then((next) => {
      if (!live) return;
      setJourney(next);
      setTab(next.recommended);
      setProgressError(false);
    }).catch(() => { if (live) setProgressError(true); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  async function refreshJourney() {
    try { const next = await loadPlanningJourney(localDatabaseApiUrl); setJourney(next); if (!journey) setTab(next.recommended); setProgressError(false); }
    catch { setJourney(null); setProgressError(true); }
  }

  return <section className="mx-auto max-w-5xl space-y-5">
    <PageIntro eyebrow="Organiza el aprendizaje" title="Planificar" description="Avanza un paso a la vez. Puedes guardar y continuar después." icon={CalendarDays} />
    {loading ? <LoadingState label="Buscando dónde continuar..." /> : progressError ? <div className="space-y-2"><WorkflowFeedback tone="error">No se pudo comprobar dónde continuar. Tus datos guardados no se han perdido.</WorkflowFeedback><Button variant="outline" onClick={() => void refreshJourney()}>Reintentar carga del avance</Button></div> : <>
      <p className="text-sm text-[#526b87]">✓ 1. Aula configurada · {journey?.studentCount ? `✓ 2. ${journey.studentCount} alumnos registrados` : "2. Añadir alumnos: pendiente"}</p>
      <ol className="ayni-journey" aria-label="Siguientes pasos del recorrido">{steps.map((step, index) => {
        const saved = journey && (step.id === "diagnostic" ? journey.diagnostic : step.id === "annual" ? journey.annual : step.id === "experiences" ? journey.experience : journey.activity);
        const hasConfirmed = journey && (step.id === "diagnostic" ? journey.diagnostic === "reviewed" : step.id === "annual" ? journey.hasConfirmedAnnual : step.id === "experiences" ? journey.hasConfirmedExperience : journey.hasConfirmedActivity);
        return <li key={step.id} aria-current={tab === step.id ? "step" : undefined} className={saved === "confirmed" || saved === "reviewed" ? "is-complete" : saved === "draft" || saved === "in_progress" ? "is-draft" : ""}>
          <span>{saved === "confirmed" || saved === "reviewed" ? <Check aria-hidden="true" /> : index + 3}</span><small>{step.label}</small>
          <em>{saved === "reviewed" ? "Revisado" : saved === "in_progress" ? "En curso" : saved === "confirmed" ? "Confirmado" : saved === "draft" ? hasConfirmed ? "Confirmado + borrador" : "Borrador" : saved === "pending" ? "Pendiente" : ""}</em>
        </li>;
      })}</ol>
      {tab === "diagnostic" ? (status !== "reviewed" ? <NextStepCard title={journey?.studentCount ? "Primero, conoce a tu grupo" : "Primero, agrega a los niños"} description={journey?.studentCount ? "Revisa el diagnóstico inicial y guarda tu decisión antes de preparar el plan anual." : "Necesitas la lista del aula para registrar el diagnóstico inicial."} action={journey?.studentCount ? "Ir a evaluación diagnóstica" : "Agregar niños"} onAction={journey?.studentCount ? onGoDiagnostic : onGoStudents} /> : null) : tab === "annual" ? <AnnualPlanGenerator onConfirmed={() => void refreshJourney()} /> : tab === "experiences" ? <LearningExperienceGenerator onConfirmed={() => void refreshJourney()} /> : <ParentActivityGenerator onConfirmed={() => void refreshJourney()} onGoToday={onGoToday} />}
      {(status === "confirmed" || status === "reviewed") && stepIndex < steps.length - 1 && <NextStepCard title={tab === "diagnostic" ? "Revisión inicial guardada" : `${steps[stepIndex].label} listo`} description={tab === "diagnostic" ? "Puedes preparar el plan anual con la información disponible y seguir observando después." : "Ya puedes avanzar. Tu trabajo quedó guardado y podrás volver a verlo."} action={`Continuar: ${steps[stepIndex + 1].label}`} onAction={() => { setTab(steps[stepIndex + 1].id); void refreshJourney(); }} />}
      {tab === "annual" && status === "draft" && journey?.hasConfirmedAnnual && <Button variant="outline" onClick={() => setTab("experiences")}>Seguir con el plan confirmado anterior</Button>}
      {tab === "experiences" && status === "draft" && journey?.hasConfirmedExperience && <Button variant="outline" onClick={() => setTab("activities")}>Preparar actividad de una experiencia confirmada</Button>}
      {stepIndex > 0 && <nav className="ayni-step-actions" aria-label="Volver en la planificación"><Button variant="outline" onClick={() => setTab(steps[stepIndex - 1].id)}>Ver paso anterior</Button></nav>}
    </>}
  </section>;
}
