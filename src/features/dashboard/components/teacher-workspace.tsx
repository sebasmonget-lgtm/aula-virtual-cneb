"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import NextImage from "next/image";
import {
  BookOpen, CalendarDays, CalendarRange, Check, ClipboardCheck, Database,
  Home, Users,
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
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  createLocalEvidence, loadLocalDashboard, loadPilotSetup, localDatabaseApiUrl, saveLocalAttendance, updateLocalExecution, type ActivityCriterion, type LocalDashboard, type LocalStudent, type PrivateMediaUpload,
} from "@/src/lib/local-database";
import { canOpenPlanningStep, loadPlanningJourney, loadStartingGuidance } from "@/src/lib/planning-journey.mjs";
import { InstitutionProfile } from "./profile-and-diagnostic";
import { GuidedDiagnostic } from "./guided-diagnostic-v4";
import { StudentsScreen } from "./students-screen";
import { ActivityRunView } from "./activity-run-view";
import { AttendanceDialog } from "./attendance-dialog";
import { ParentActivityGenerator } from "./parent-activity-generator";
import { AnnualPreplanWorkspace } from "./annual-preplan-workspace";
import { ResourceLibraryScreen } from "./resource-library-screen";
import { PlanningHome } from "./planning-home";
import { EvaluationHome } from "./evaluation-home";
import { TodayHome } from "./today-home";
import { displayDate } from "@/src/lib/display-date";
import { MediaAttachmentInput } from "./media-attachment-input";
import type { LibraryResource } from "@/src/lib/library-resource";
import { ProjectDevelopmentWorkspace as LegacyProjectDevelopmentWorkspace } from "./project-development-workspace";
import { SimpleProjectWorkspace } from "./simple-project-workspace";
import { OrdinaryObservationDialog } from "./ordinary-observation-dialog";
import { OrdinaryReviewDialog } from "./ordinary-review-dialog";
import { DocumentsScreen } from "./documents-screen";
import { destinationFromHash, hashForDestination, primaryDestination } from "@/src/lib/teacher-navigation.mjs";
import { canLeaveWorkspace, useWorkspaceSubview, writeWorkspaceLocation } from "@/src/lib/workspace-location";

const ProjectDevelopmentWorkspace = process.env.NEXT_PUBLIC_AYNI_PROJECT_SIMPLE === "1"
  ? SimpleProjectWorkspace : LegacyProjectDevelopmentWorkspace;
import { SchoolCalendarScreen } from "./school-calendar-screen";
import { PeriodEvaluation } from "./period-evaluation";
import { BimesterReplan } from "./bimester-replan";
import { PlanningFeedbackOption } from "./planning-feedback-option";
import { PilotSetup } from "./pilot-setup";
import { AsyncButton, LoadingState, NextStepCard, ScreenSkeleton, WorkflowFeedback } from "./workflow-ui";

const nav = [
  ["Hoy", Home], ["Calendario", CalendarRange], ["Planificar", CalendarDays], ["Aula", Users],
  ["Evaluar", ClipboardCheck], ["Biblioteca", BookOpen],
] as const;

const mobileNav = [
  ["Hoy", "Hoy", Home], ["Planificar", "Planificar", CalendarDays], ["Aula", "Aula", Users],
  ["Evaluar", "Evaluar", ClipboardCheck], ["Biblioteca", "Biblioteca", BookOpen],
] as const;
const f7Nav = [["Hoy", "Hoy", Home], ["Planificar", "Planificar", CalendarDays],
  ["Mi aula", "Aula", Users], ["Biblioteca", "Biblioteca", BookOpen]] as const;
const f7Enabled = process.env.NEXT_PUBLIC_AYNI_F7_NAV === "1";
const sentenceCase = (value: string) => value.charAt(0).toLocaleUpperCase("es-PE") + value.slice(1);
const planningTabs = ["home", "diagnostic", "annual", "experiences", "activities"] as const;
const evaluationSections = ["home", "period", "replan"] as const;
const evaluationViews = ["student", "conclusions", "family", "coverage", "consolidated"] as const;

export function TeacherWorkspace() {
  const [active, setActive] = useState("Hoy");
  const navigationTouched = useRef(false);
  const [evaluationTarget, setEvaluationTarget] = useState<{ studentId: string; competencyId: string } | null>(null);
  const [planningTarget, setPlanningTarget] = useState<"activities" | "diagnostic" | null>(null);
  const [calendarActivity, setCalendarActivity] = useState<{ id: string; experience_id: string } | null>(null);
  const [selectedResource, setSelectedResource] = useState<LibraryResource | null>(null);
  const [libraryFilter, setLibraryFilter] = useState<"for-you" | "workshops">("for-you");
  const [evaluationEntry, setEvaluationEntry] = useState<"home" | "replan">("home");
  const [diagnosticInitialStep, setDiagnosticInitialStep] = useState<1 | 2 | 3>(1);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceRevision, setEvidenceRevision] = useState(0);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [activityRunBlockId, setActivityRunBlockId] = useState<string | null>(null);
  const [evidenceContext, setEvidenceContext] = useState<{ activityId: string; criteria: ActivityCriterion[]; title: string } | null>(null);
  const [studentId, setStudentId] = useState("");
  const [ordinaryContext, setOrdinaryContext] = useState<{ id: string; title: string; criteria: ActivityCriterion[] } | null | undefined>(undefined);
  const [ordinaryReviewOpen, setOrdinaryReviewOpen] = useState(false);
  const [criterionId, setCriterionId] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<{ base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; name: string } | null>(null);
  const [audio, setAudio] = useState<PrivateMediaUpload | null>(null);
  const [saved, setSaved] = useState(false);
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [dashboard, setDashboard] = useState<LocalDashboard | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [databaseState, setDatabaseState] = useState<"checking" | "connected" | "offline">("checking");
  const [guidanceError, setGuidanceError] = useState(false);
  const [starting, setStarting] = useState(true);
  const [retry, setRetry] = useState(0);
  const today = useMemo(() => new Intl.DateTimeFormat("es-PE", {
    weekday: "long", day: "numeric", month: "long",
  }).format(new Date()), []);

  useEffect(() => {
    let acceptedHash = window.location.hash;
    const syncHash = (event?: Event) => {
      if ((event?.type === "popstate" || event?.type === "hashchange") && window.location.hash !== acceptedHash && !canLeaveWorkspace()) {
        window.history.pushState(null, "", acceptedHash || window.location.pathname);
        window.dispatchEvent(new Event("ayni-location-change")); return;
      }
      acceptedHash = window.location.hash;
      const destination = destinationFromHash(window.location.hash);
      if (destination) { navigationTouched.current = true; if (destination === "Diagnóstico") { setPlanningTarget("diagnostic"); setActive("Planificar"); } else setActive(destination); setStarting(false); }
    };
    syncHash();
    window.addEventListener("popstate", syncHash);
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("ayni-location-change", syncHash);
    return () => { window.removeEventListener("popstate", syncHash); window.removeEventListener("hashchange", syncHash); window.removeEventListener("ayni-location-change", syncHash); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadPilotSetup().then((setup) => {
      if (!setup.configured) { setNeedsSetup(true); setDatabaseState("connected"); return null; }
      return loadLocalDashboard(controller.signal);
    })
      .then(async (data) => {
        if (!data) return;
        setDashboard(data);
        setStudentId("");
        setCriterionId(data.activity?.criteria[0]?.id ?? "");
        setDatabaseState("connected");
        try {
          const guidance = await loadStartingGuidance(localDatabaseApiUrl);
          if (!controller.signal.aborted && !navigationTouched.current) {
            if (guidance.startingSection === "Diagnóstico") { setPlanningTarget("diagnostic"); setDiagnosticInitialStep(1); setActive("Planificar"); }
            else setActive(guidance.startingSection === "Niños" ? "Aula" : guidance.startingSection);
          }
          if (!controller.signal.aborted) {
            setGuidanceError(false);
          }
        } catch { if (!controller.signal.aborted) setGuidanceError(true); }
        finally { if (!controller.signal.aborted) setStarting(false); }
      })
      .catch(() => { setDatabaseState("offline"); setStarting(false); });
    return () => controller.abort();
  }, [retry]);

  async function saveEvidence(andNext = false) {
    if (!studentId || !criterionId || (!note.trim() && !photo && !audio) || savingEvidence || saved) return;
    setSavingEvidence(true);
    setSaveError("");
    try {
      if (!dashboard) throw new Error("Inicia la base local para guardar información.");
      await createLocalEvidence({
        studentId,
        activityId: evidenceContext?.activityId ?? dashboard.activity?.id ?? "",
        criterionId,
        observationText: note || undefined,
        photo: photo ? { base64: photo.base64, mimeType: photo.mimeType } : undefined,
        media: audio ?? undefined,
      });
      setDashboard(await loadLocalDashboard());
      setEvidenceRevision((revision) => revision + 1);
      setSaved(true);
      if (andNext) {
        setSaved(false);
        setNote("");
        setPhoto(null);
        setAudio(null);
        setStudentId("");
        setSaveError("Elige explícitamente al siguiente alumno antes de guardar otra observación.");
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
  const selectedNavigation = f7Enabled && active !== "Biblioteca" ? primaryDestination(active) : active;

  function navigate(section: string) { if (!canLeaveWorkspace()) return; navigationTouched.current = true; setStarting(false); if (section !== "Planificar") { setPlanningTarget(null); setSelectedResource(null); setCalendarActivity(null); } if (section === "Evaluar") { setEvaluationTarget(null); setEvaluationEntry("home"); } setActive(section); const hash = hashForDestination(section); if (hash && destinationFromHash(window.location.hash) !== section) { window.history.pushState(null, "", hash); window.dispatchEvent(new Event("ayni-location-change")); } }
  function openDiagnostic(initialStep: 1 | 2 | 3 = 1) { setPlanningTarget("diagnostic"); setDiagnosticInitialStep(initialStep); navigate("Planificar"); }

  function closeEvidence(open: boolean) {
    setEvidenceOpen(open);
    if (!open) {
      setSaveError("");
      setEvidenceOpen(false);
      setSaved(false);
      setNote("");
      setPhoto(null);
      setAudio(null);
    }
  }

  async function markAttendance(records: { studentId: string; status: "present" | "absent" | "late" | "excused" }[]) {
    setDashboard(await saveLocalAttendance(records));
    setAttendanceOpen(false);
  }

  async function updateExecution(input: { scheduleEntryId: string; action: "start" | "complete" | "skip" | "keep_current" | "set_step"; stepIndex?: number; closureType?: "as_planned" | "note"; closureNote?: string }) {
    setDashboard(await updateLocalExecution(input));
  }

  function openEvidenceFor(block: LocalDashboard["today"]["blocks"][number], suggestedStudentId?: string) {
    if (process.env.NEXT_PUBLIC_AYNI_ORDINARY_OBSERVATIONS === "1" && block.activity_id) {
      setOrdinaryContext({ id: block.activity_id, title: block.title, criteria: block.criteria }); return;
    }
    if (!block.activity_id || !block.criteria.length) return;
    setStudentId("");
    if (suggestedStudentId && dashboard?.students.some((student) => student.id === suggestedStudentId)) setStudentId(suggestedStudentId);
    setEvidenceContext({ activityId: block.activity_id, criteria: block.criteria, title: block.title });
    setCriterionId(block.criteria[0].id);
    setPhoto(null);
    setAudio(null);
    setEvidenceOpen(true);
  }

  function openPlannedEvidence({ activityId, title, criterion }: { activityId: string; title: string; criterion: ActivityCriterion }) {
    setStudentId("");
    setEvidenceContext({ activityId, title, criteria: [criterion] });
    setCriterionId(criterion.id);
    setNote(""); setPhoto(null); setAudio(null); setSaved(false); setSaveError("");
    setEvidenceOpen(true);
  }

  async function openActivity(block: LocalDashboard["today"]["blocks"][number], start = false) {
    if (!block.activity_id) return;
    if (start) await updateExecution({ scheduleEntryId: block.id, action: "start" });
    setActivityRunBlockId(block.id);
  }

  const activityRunBlock = dashboard?.today.blocks.find((block) => block.id === activityRunBlockId) ?? null;

  if (needsSetup) return <PilotSetup onReady={(ready) => { setDashboard(ready); setNeedsSetup(false); setDatabaseState("connected"); navigate("Aula"); }} />;
  if (databaseState === "offline") return <main className="mx-auto max-w-xl space-y-4 p-6"><h1 className="text-2xl font-bold">No se pudo conectar con el aula</h1><p>Inicia la base local y vuelve a intentarlo. Tus borradores guardados seguirán disponibles.</p><Button onClick={() => { setDatabaseState("checking"); setRetry((value) => value + 1); }}>Reintentar</Button></main>;

  return (
    <SidebarProvider style={{ "--sidebar-width": "13.5rem" } as CSSProperties}>
      <a href="#ayni-main" onClick={(event) => { event.preventDefault(); document.getElementById("ayni-main")?.focus(); }} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-[#07576c] focus:shadow-lg">Saltar al contenido</a>
      <Sidebar collapsible="offcanvas" className="border-r border-[#e4eaf3] text-[#19345b]">
        <SidebarHeader className="px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <NextImage src="/favicon.svg" alt="" width={40} height={40} className="size-10 rounded-xl" />
            <div><p className="text-xl font-extrabold leading-tight tracking-tight">Ayni Aula</p><p className="text-xs text-[#63748d]">Tu aliada en Inicial</p></div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <nav aria-label="Navegación principal"><SidebarMenu className="gap-1.5">
                {(f7Enabled ? f7Nav : nav.map(([label, Icon]) => [label, label, Icon] as const)).map(([label, destination, Icon]) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton asChild isActive={selectedNavigation === destination} className="h-11 rounded-xl px-3 text-[15px] transition-colors hover:bg-[#eaf6f9] focus-visible:ring-2 data-[active=true]:bg-[#087d96] data-[active=true]:font-semibold data-[active=true]:text-white">
                      <button type="button" aria-current={selectedNavigation === destination ? "page" : undefined} onClick={() => navigate(destination)}><Icon /><span>{label}</span></button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu></nav>
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

      <SidebarInset className="min-w-0 bg-[#f7faff]">
        <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between bg-[#f7faff]/95 px-4 backdrop-blur md:border-b md:border-[#e7edf7] md:bg-white/95 md:px-8">
          <div className="flex items-center gap-3">
            <NextImage src="/favicon.svg" alt="" width={44} height={44} className="size-11 rounded-2xl md:hidden" />
            <div className="md:hidden"><p className="text-xl font-extrabold leading-tight text-[#1c2e50]">Ayni Aula</p><p className="text-xs text-[#60718a]">{active === "Documentos" || active === "Biblioteca" ? "Tus documentos, ideas y materiales" : active === "Calendario" ? "Tu año, proyectos y actividades" : active === "Aula" ? "Tus niños y su seguimiento" : active === "Evaluar" ? "Evidencias y decisiones" : active === "Planificar" ? "Diagnóstico, proyectos y actividades" : "Tu aliada en Inicial"}</p></div>
            <div className="hidden md:block"><p className="text-sm font-semibold md:text-base">{sentenceCase(today)}</p><p className="text-xs text-muted-foreground">{profile?.institution_name ?? "Institución por configurar"} · {profile?.section ?? "Aula"}</p></div>
          </div>
          <div className="flex items-center gap-2">
            {process.env.NEXT_PUBLIC_AYNI_ORDINARY_OBSERVATIONS === "1" && (active === "Hoy" || active === "Aula") &&
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setOrdinaryContext(null)}>Registrar observación</Button>}
            {process.env.NEXT_PUBLIC_AYNI_CURRICULAR_REVIEW === "1" && (active === "Hoy" || active === "Aula") &&
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setOrdinaryReviewOpen(true)}>Revisar observaciones</Button>}
            {!f7Enabled && <button type="button" aria-label="Calendario" title="Calendario" aria-current={active === "Calendario" ? "page" : undefined} onClick={() => navigate("Calendario")} className={`grid size-11 place-items-center rounded-xl focus-visible:outline-2 focus-visible:outline-[#087d96] md:hidden ${active === "Calendario" ? "bg-[#dff3f6] text-[#087d96]" : "text-[#60718a] hover:bg-[#edf6fa]"}`}><CalendarRange className="size-5" /></button>}
            <div className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex ${databaseState === "connected" ? "bg-[#e5f1ee] text-[#1f625c]" : "bg-muted text-muted-foreground"}`}>
              <Database className="size-3.5" />
              {databaseState === "connected" ? "Base conectada" : "Conectando"}
            </div>
            <button type="button" title="Abrir perfil" aria-label="Abrir perfil" onClick={() => navigate("Perfil")} className="grid size-10 place-items-center rounded-full bg-[#d9eaf4] text-sm font-bold text-[#155a78] hover:bg-[#c4e3f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087d96]">{profile?.teacher_name?.split(" ").map((part) => part[0]).slice(0, 2).join("") ?? ""}</button>
          </div>
        </header>

        <main id="ayni-main" tabIndex={-1} className="mx-auto w-full max-w-[1450px] px-4 pb-28 pt-4 md:px-7 md:pt-8">
          {dashboard?.today.qa_clock && <p role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">QA · reloj de prueba de la jornada: {displayDate(dashboard.today.qa_clock.date)} · {dashboard.today.qa_clock.time}. No cambia la fecha del equipo ni los cierres.</p>}
          {guidanceError && <div className="mb-4 flex flex-wrap items-center gap-3"><WorkflowFeedback tone="error">No pudimos comprobar cuál es tu siguiente paso.</WorkflowFeedback><Button variant="outline" onClick={() => { setGuidanceError(false); setRetry((value) => value + 1); }}>Reintentar</Button></div>}
          {starting ? <ScreenSkeleton /> : active === "Perfil" ? dashboard ? <InstitutionProfile dashboard={dashboard} onSaved={setDashboard} /> : <ScreenSkeleton /> :
          active === "Documentos" ? <DocumentsScreen onPlan={() => navigate("Planificar")} /> :
          active === "Calendario" ? <SchoolCalendarScreen onOpenPlanning={() => navigate("Planificar")} onOpenActivity={(item) => { setCalendarActivity(item); setPlanningTarget("activities"); navigate("Planificar"); }} /> : active === "Biblioteca" ? dashboard ? <ResourceLibraryScreen onPlan={() => navigate("Planificar")} age={dashboard.profile.age_years} initialFilter={libraryFilter} onUse={(resource) => { setSelectedResource(resource); setPlanningTarget("activities"); navigate("Planificar"); }} /> : <ScreenSkeleton /> :
          active === "Evaluar" ? dashboard ? <EvaluationArea dashboard={dashboard} initialTarget={evaluationTarget} initialSection={evaluationEntry} onPlan={() => { setPlanningTarget(null); navigate("Planificar"); }} onPrepareActivity={() => { setPlanningTarget("activities"); navigate("Planificar"); }} onToday={() => navigate("Hoy")} /> : <ScreenSkeleton /> :
          active === "Aula" ? dashboard ? <><div className="mx-auto mb-4 flex max-w-5xl flex-wrap gap-2">{f7Enabled && <><Button variant="outline" onClick={() => openDiagnostic()}>Diagnóstico</Button><Button variant="outline" onClick={() => navigate("Evaluar")}>Evaluación</Button>{process.env.NEXT_PUBLIC_AYNI_CURRICULAR_REVIEW === "1" && <Button variant="outline" onClick={() => setOrdinaryReviewOpen(true)}>Observaciones por revisar</Button>}</>}</div><StudentsScreen students={students} onImported={setDashboard} onDiagnostic={() => openDiagnostic()} onEvaluate={(studentId, competencyId) => { navigate("Evaluar"); setEvaluationTarget({ studentId, competencyId }); }} onPlan={() => navigate("Planificar")} /></> : <ScreenSkeleton /> : active === "Planificar" ? dashboard ? <PlanningArea dashboard={dashboard} initialTab={planningTarget} initialActivity={calendarActivity} diagnosticInitialStep={diagnosticInitialStep} selectedResource={selectedResource} onGoToday={() => navigate("Hoy")} onRecordEvidence={openPlannedEvidence} onGoStudents={() => navigate("Aula")} onGoWorkshops={() => { setLibraryFilter("workshops"); navigate("Biblioteca"); }} onGoCalendar={() => navigate("Calendario")} onGoLibrary={() => { setLibraryFilter("for-you"); navigate("Biblioteca"); }} /> : <ScreenSkeleton /> : <>
          {activityRunBlock ? <ActivityRunView block={activityRunBlock} evidenceRevision={evidenceRevision} onBack={() => setActivityRunBlockId(null)} onEvidence={(suggestedStudentId) => openEvidenceFor(activityRunBlock,suggestedStudentId)} onStepChange={async (stepIndex) => updateExecution({ scheduleEntryId: activityRunBlock.id, action: "set_step", stepIndex })} onComplete={async () => { await updateExecution({ scheduleEntryId: activityRunBlock.id, action: "complete", closureType: "as_planned" }); setActivityRunBlockId(null); }} /> : active === "Hoy" && (dashboard ? <TodayHome dashboard={dashboard} refreshKey={evidenceRevision} openEvidence={openEvidenceFor} openAttendance={() => setAttendanceOpen(true)} updateExecution={updateExecution} openActivity={openActivity} onPlan={() => navigate("Planificar")} onPrepareActivity={() => { setPlanningTarget("activities"); navigate("Planificar"); }} onObserveWithoutActivity={() => process.env.NEXT_PUBLIC_AYNI_ORDINARY_OBSERVATIONS === "1" ? setOrdinaryContext(null) : (setPlanningTarget("activities"), navigate("Planificar"))} onReplan={() => { navigate("Evaluar"); setEvaluationEntry("replan"); }} onReviewObservations={() => setOrdinaryReviewOpen(true)} /> : <ScreenSkeleton />)}
          </>}
        </main>

        <nav className={`fixed inset-x-0 bottom-0 z-30 grid ${f7Enabled ? "grid-cols-4" : "grid-cols-5"} border-t border-[#e1e9f2] bg-white/97 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(24,45,80,.05)] backdrop-blur md:hidden`} aria-label="Navegación rápida">
          {(f7Enabled ? f7Nav : mobileNav).map(([label, destination, Icon]) => <button key={label} type="button" aria-current={selectedNavigation === destination ? "page" : undefined} onClick={() => { if (destination === "Biblioteca") setLibraryFilter("for-you"); navigate(destination); }} className={`group mx-0.5 flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] active:bg-[#d8f0f4] ${selectedNavigation === destination ? "text-[#087d96]" : "text-[#60718a]"}`}><span className={`grid h-7 w-11 place-items-center rounded-lg ${selectedNavigation === destination ? "bg-[#dff3f6]" : "group-hover:bg-[#edf6fa]"}`}><Icon className="size-5" /></span><span>{label}</span></button>)}
        </nav>
      </SidebarInset>
      <AttendanceDialog open={attendanceOpen} onOpenChange={setAttendanceOpen} students={students} onSave={markAttendance} />
      <EvidenceDialog open={evidenceOpen} onOpenChange={closeEvidence} students={students} studentId={studentId} setStudentId={setStudentId} criterionId={criterionId} setCriterionId={setCriterionId} criteria={evidenceContext?.criteria ?? activity?.criteria ?? []} note={note} setNote={setNote} photo={photo} setPhoto={setPhoto} audio={audio} setAudio={setAudio} saved={saved} saving={savingEvidence} saveError={saveError} saveEvidence={saveEvidence} activityTitle={evidenceContext?.title ?? activity?.title ?? "Actividad"} databaseConnected={databaseState === "connected"} />
      {ordinaryContext !== undefined && <OrdinaryObservationDialog students={students} activity={ordinaryContext} onClose={() => setOrdinaryContext(undefined)} />}
      {ordinaryReviewOpen && <OrdinaryReviewDialog students={students} onClose={() => { setOrdinaryReviewOpen(false); setEvidenceRevision(value => value + 1); }} />}
    </SidebarProvider>
  );
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

function EvidenceDialog({ open, onOpenChange, students, studentId, setStudentId, criterionId, setCriterionId, criteria, note, setNote, photo, setPhoto, audio, setAudio, saved, saving, saveError, saveEvidence, activityTitle, databaseConnected }: {
  open: boolean; onOpenChange: (open: boolean) => void; students: LocalStudent[]; studentId: string; setStudentId: (id: string) => void;
  criterionId: string; setCriterionId: (id: string) => void; criteria: ActivityCriterion[];
  note: string; setNote: (value: string) => void; photo: { base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; name: string } | null; setPhoto: (photo: { base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; name: string } | null) => void; audio: PrivateMediaUpload | null; setAudio: (value: PrivateMediaUpload | null) => void; saved: boolean; saveError: string; saveEvidence: (andNext?: boolean) => void;
  activityTitle: string; databaseConnected: boolean; saving: boolean;
}) {
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const criterion = criteria.find((item) => item.id === criterionId) ?? criteria[0];
  const scopeLabel = criterion?.details?.evidence_scope === "group" ? "Grupal" : criterion?.details?.evidence_scope === "mixed" ? "Individual y grupal" : "Individual";
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden rounded-2xl p-0 sm:max-w-xl">
      <DialogHeader className="shrink-0 border-b px-6 py-5"><DialogTitle>Registrar evidencia</DialogTitle><DialogDescription>Actividad: {activityTitle}</DialogDescription></DialogHeader>
      <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-1">
        {!databaseConnected && <p className="rounded-xl bg-[#fff1d6] px-4 py-3 text-sm text-[#784a17]">La base local no está iniciada. Puedes revisar el formulario, pero debes ejecutar <strong>npm run db:local</strong> para guardar.</p>}
        <fieldset><legend className="mb-2 text-sm font-semibold">¿A quién observaste?</legend><div className="flex flex-wrap gap-2">{students.map((student) => <button key={student.id} type="button" aria-pressed={studentId === student.id} onClick={() => setStudentId(student.id)} className={`min-h-11 rounded-full border px-3 py-2 text-sm font-medium transition hover:border-[#9bcbd7] hover:bg-[#f0f9fc] ${studentId === student.id ? "border-[#087d96] bg-[#e8f6fb] text-[#126177]" : "bg-white"}`}>{studentId === student.id && <Check className="mr-1 inline size-3.5" />}{student.name}</button>)}</div></fieldset>
        {criteria.length > 1 && <fieldset><legend className="mb-2 text-sm font-semibold">¿Qué criterio observaste?</legend><div className="space-y-2">{criteria.map((item) => <button key={item.id} type="button" aria-pressed={criterionId === item.id} onClick={() => setCriterionId(item.id)} className={`min-h-11 w-full rounded-xl border p-3 text-left text-sm hover:border-[#9bcbd7] hover:bg-[#f0f9fc] ${criterionId === item.id ? "border-[#087d96] bg-[#e8f6fb]" : "bg-white"}`}><span className="font-semibold">{item.criterion_text}</span><span className="mt-1 block text-xs text-[#526b87]">{item.competency_text}</span></button>)}</div></fieldset>}
        {criterion && <section className="rounded-xl bg-[#edf8f3] p-4 text-sm"><p className="text-xs font-bold uppercase tracking-wider">Criterio</p><p className="font-semibold">{criterion.criterion_text}</p>{criterion.details?.expected_evidence && <><p className="mt-3 text-xs font-bold uppercase tracking-wider">Evidencia que podría verse</p><p>{criterion.details.expected_evidence}</p></>}{criterion.details?.observation_focus?.length ? <><p className="mt-3 text-xs font-bold uppercase tracking-wider">En qué fijarse</p><ul className="list-disc pl-5">{criterion.details.observation_focus.map((item) => <li key={item}>{item}</li>)}</ul></> : null}{criterion.details?.acceptable_evidence_variations?.length ? <><p className="mt-3 text-xs font-bold uppercase tracking-wider">Aceptar también</p><ul className="list-disc pl-5">{criterion.details.acceptable_evidence_variations.map((item) => <li key={item}>{item}</li>)}</ul></> : null}{criterion.details?.teacher_caution && <p className="mt-3 rounded bg-white p-2"><b>Nota pedagógica:</b> {criterion.details.teacher_caution}</p>}<p className="mt-3 text-xs">Alcance: {scopeLabel}</p>{criterion.details?.evidence_scope === "group" && <p className="mt-2 rounded bg-[#fff8ef] p-2">Esta situación fue pensada principalmente para observación grupal. Registra evidencia individual solo si observaste directamente a este niño.</p>}</section>}
        <div><label htmlFor="evidence-note" className="mb-2 block text-sm font-semibold">¿Qué hizo o dijo el niño?</label><Textarea id="evidence-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej.: Comparó dos macetas y explicó cuál recibió más luz." className="min-h-24 resize-none" /><p className="mt-2 text-xs text-muted-foreground">Describe lo observado. Puedes adjuntar una foto si ayuda; no necesitas marcar un nivel de logro. Escribe una nota o adjunta una foto para guardar.</p></div>
        <div><label htmlFor="evidence-photo" className="mb-2 block text-sm font-semibold">Foto <span className="font-normal text-muted-foreground">(opcional)</span></label><input id="evidence-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={preparingPhoto || saving || saved} className="block w-full text-sm" onChange={async (event) => { const input = event.currentTarget; const file = input.files?.[0]; if (!file) return; setPhotoError(""); setPreparingPhoto(true); try { setPhoto(await preparePhoto(file)); setAudio(null); } catch (error) { setPhotoError(error instanceof Error ? error.message : "No se pudo preparar la foto."); input.value = ""; } finally { setPreparingPhoto(false); } }} />{preparingPhoto && <LoadingState label="Preparando foto..." />}{photoError && <WorkflowFeedback tone="error">{photoError}</WorkflowFeedback>}{photo && <p className="mt-2 text-xs font-medium text-[#126177]">Foto lista: {photo.name} <button type="button" className="underline" onClick={() => setPhoto(null)}>Quitar</button></p>}<p className="mt-1 text-xs text-muted-foreground">La foto se guarda privada y no se envía a IA.</p></div>
        <MediaAttachmentInput audioOnly studentId={studentId} context={criterion?.criterion_text ?? activityTitle} media={audio} onMedia={(value) => { setAudio(value); if (value) setPhoto(null); }} onTranscribed={setNote} disabled={saving || saved} />
        {saved && <WorkflowFeedback tone="success">Evidencia guardada. Puedes cerrar esta ventana.</WorkflowFeedback>}
        {saveError && <WorkflowFeedback tone="error">{saveError}</WorkflowFeedback>}
      </div>
      <DialogFooter className="shrink-0 border-t px-6 py-4"><Button variant="ghost" onClick={() => onOpenChange(false)}>{saved ? "Cerrar" : "Cancelar"}</Button><AsyncButton variant="outline" busy={saving} busyLabel="Guardando..." disabled={!criterionId || (!note.trim() && !photo && !audio) || saved || !studentId || preparingPhoto} onClick={() => saveEvidence(true)}>Guardar y siguiente</AsyncButton><AsyncButton busy={saving} busyLabel="Guardando..." disabled={!criterionId || (!note.trim() && !photo && !audio) || saved || !studentId || preparingPhoto} onClick={() => saveEvidence()}>Guardar observación</AsyncButton></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function EvaluationArea({ dashboard, initialTarget, initialSection, onPlan, onPrepareActivity, onToday }: { dashboard: LocalDashboard; initialTarget: { studentId: string; competencyId: string } | null; initialSection: "home" | "replan"; onPlan: () => void; onPrepareActivity: () => void; onToday: () => void }) {
  const [section, setSection] = useWorkspaceSubview("Evaluar", "section", evaluationSections, initialTarget ? "period" : initialSection);
  const [target, setTarget] = useState(initialTarget);
  const [periodView, setPeriodView] = useWorkspaceSubview("Evaluar", "entry", evaluationViews, "student");
  return <section className="mx-auto max-w-5xl space-y-5">
    {section === "home" ? <EvaluationHome dashboard={dashboard} onReplan={() => setSection("replan")} onPeriod={(view, nextTarget) => { setTarget(nextTarget ?? null); setPeriodView(view); setSection("period"); writeWorkspaceLocation("Evaluar", { view, student: nextTarget?.studentId ?? "", competency: nextTarget?.competencyId ?? "" }, true); }} /> : <>
      <Button variant="ghost" className="-ml-3 min-h-11 text-[#07576c]" onClick={() => setSection("home")}>← Volver a Evaluar</Button>
      {section === "replan" ? <BimesterReplan onEvaluation={() => setSection("period")} onFinish={onToday} /> : <PeriodEvaluation key={`${target?.studentId ?? "all"}:${target?.competencyId ?? "all"}:${periodView}`} initialStudentId={target?.studentId} initialCompetencyId={target?.competencyId} initialView={periodView} onPlan={onPlan} onPrepareActivity={onPrepareActivity} />}
    </>}
  </section>;
}
function PlanningArea({ dashboard, initialTab, initialActivity, diagnosticInitialStep, selectedResource, onGoToday, onRecordEvidence, onGoStudents, onGoWorkshops, onGoCalendar, onGoLibrary }: { dashboard: LocalDashboard; initialTab?:"activities"|"diagnostic"|null; initialActivity?:{id:string;experience_id:string}|null; diagnosticInitialStep:1|2|3; selectedResource: LibraryResource | null; onGoToday: () => void; onRecordEvidence: (input: { activityId: string; title: string; criterion: ActivityCriterion }) => void; onGoStudents: () => void; onGoWorkshops: () => void; onGoCalendar: () => void; onGoLibrary: () => void }) {
  const [tab, setTab] = useWorkspaceSubview("Planificar", "tab", planningTabs, initialTab??"home");
  const [diagnosticStep, setDiagnosticStep] = useState<1 | 2 | 3>(diagnosticInitialStep);
  const [projectProposalId, setProjectProposalId] = useState<string | null>(null);
  const [activitySelection, setActivitySelection] = useState<{ experienceId: string; routeItemId: string } | null>(null);
  const [feedbackPeriodId,setFeedbackPeriodId]=useState<string|null>(null);
  const [journey, setJourney] = useState<Awaited<ReturnType<typeof loadPlanningJourney>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressError, setProgressError] = useState(false);
  const onGoDiagnostic = () => { setDiagnosticStep(1); setTab("diagnostic"); };
  const steps = [{ id: "diagnostic" as const, label: "Diagnóstico" }, { id: "annual" as const, label: "Plan anual" }, { id: "experiences" as const, label: "Proyecto o unidad" }, { id: "activities" as const, label: "Actividad" }];
  const stepIndex = steps.findIndex((step) => step.id === tab);
  const status = journey && (tab === "diagnostic" ? journey.diagnostic : tab === "annual" ? journey.annual : tab === "experiences" ? journey.experience : journey.activity);

  useEffect(() => {
    let live = true;
    loadPlanningJourney(localDatabaseApiUrl).then((next) => {
      if (!live) return;
      setJourney(next);
      setProgressError(false);
    }).catch(() => { if (live) setProgressError(true); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [initialTab]);

  async function refreshJourney() {
    try { const next = await loadPlanningJourney(localDatabaseApiUrl); setJourney(next); setProgressError(false); }
    catch { setJourney(null); setProgressError(true); }
  }

  if (tab === "home") return <section className="mx-auto max-w-5xl space-y-4">{f7Enabled && <div className="flex flex-wrap gap-2" aria-label="Herramientas de planificación"><Button variant="outline" onClick={onGoCalendar}>Calendario</Button><Button variant="outline" onClick={onGoLibrary}>Biblioteca</Button></div>}{loading ? <LoadingState label="Buscando dónde continuar..." /> : progressError || !journey ? <div className="space-y-3"><WorkflowFeedback tone="error">No se pudo cargar tu planificación.</WorkflowFeedback><Button variant="outline" onClick={() => void refreshJourney()}>Reintentar</Button></div> : <PlanningHome journey={journey} dashboard={dashboard} onOpen={(step) => { if (!canOpenPlanningStep(journey, step)) return; if (step === "diagnostic") onGoDiagnostic(); else setTab(step); }} onWorkshops={onGoWorkshops} />}</section>;

  return <section className={`mx-auto space-y-5 ${tab === "annual" ? "max-w-7xl" : "max-w-5xl"}`}>
    <nav aria-label="Ubicación en planificación" className="flex flex-wrap items-center gap-2 text-sm"><Button variant="ghost" className="-ml-3 min-h-11 text-[#07576c]" onClick={() => setTab("home")}>← Planificar</Button><span aria-hidden="true">/</span><span className="font-semibold text-[#172b52]">{tab === "annual" ? "Mi año" : tab === "experiences" ? "Proyecto o unidad" : tab === "activities" ? "Actividades del proyecto" : "Diagnóstico"}</span></nav>
    {loading ? <LoadingState label="Buscando dónde continuar..." /> : progressError ? <div className="space-y-2"><WorkflowFeedback tone="error">No se pudo comprobar dónde continuar. Tus datos guardados no se han perdido.</WorkflowFeedback><Button variant="outline" onClick={() => void refreshJourney()}>Reintentar carga del avance</Button></div> : <>
      {tab === "activities" && selectedResource && <div className="rounded-2xl bg-[#edf8f4] p-4 text-sm text-[#1c554b]"><b>Recurso elegido: {selectedResource.title}</b><p className="mt-1">Elige un proyecto o unidad. Ayni incorporará el contexto y los materiales del recurso a la actividad para que puedas revisarlos.</p></div>}
      {journey && !canOpenPlanningStep(journey, tab) && !(tab === "activities" && initialActivity) ? <NextStepCard title="Completa el paso anterior" description={tab === "annual" ? "Agrega al menos un niño para preparar tu año." : tab === "experiences" ? "Confirma primero el plan anual." : "Confirma primero un proyecto o unidad."} action={tab === "annual" ? "Agregar niños" : tab === "experiences" ? "Abrir plan anual" : "Abrir proyecto o unidad"} onAction={tab === "annual" ? onGoStudents : () => setTab(tab === "experiences" ? "annual" : "experiences")} /> : tab === "diagnostic" ? (journey?.studentCount ? <GuidedDiagnostic dashboard={dashboard} initialStep={diagnosticStep} onPlan={() => { setTab("annual"); void refreshJourney(); }} onStudents={onGoStudents} /> : <NextStepCard title="Primero, agrega a los niños" description="Necesitas la lista del aula para registrar el diagnóstico inicial." action="Agregar niños" onAction={onGoStudents} />) : tab === "annual" ? <AnnualPreplanWorkspace onConfirmed={() => void refreshJourney()} onGoDiagnostic={onGoDiagnostic}
        onDevelop={(proposalId) => { setProjectProposalId(proposalId); setTab("experiences"); }} /> : tab === "experiences" ? <ProjectDevelopmentWorkspace initialProposalId={projectProposalId} feedbackPeriodId={feedbackPeriodId}
        onConfirmed={() => void refreshJourney()} onGoAnnual={() => { setProjectProposalId(null); setTab("annual"); void refreshJourney(); }}
        onDevelopActivity={(experienceId, routeItemId) => {
          setActivitySelection({ experienceId, routeItemId }); setTab("activities"); }} /> : <ParentActivityGenerator ongoing={journey?.mode==="ongoing_cycle"} feedbackPeriodId={feedbackPeriodId} initialResource={selectedResource}
        initialExperienceId={initialActivity?.experience_id ?? activitySelection?.experienceId} initialRouteItemId={activitySelection?.routeItemId} initialActivityId={initialActivity?.id}
        onConfirmed={() => void refreshJourney()} onGoToday={onGoToday} onRecordEvidence={onRecordEvidence} />}
      {journey?.mode!=="ongoing_cycle"&&(status === "confirmed" || status === "reviewed") && stepIndex < steps.length - 1 && <NextStepCard title={tab === "diagnostic" ? "Revisión inicial guardada" : `${steps[stepIndex].label} listo`} description={tab === "diagnostic" ? "Puedes preparar el plan anual con la información disponible y seguir observando después." : "Ya puedes avanzar. Tu trabajo quedó guardado y podrás volver a verlo."} action={`Continuar: ${steps[stepIndex + 1].label}`} onAction={() => { setTab(steps[stepIndex + 1].id); void refreshJourney(); }} />}
      {tab === "annual" && status === "draft" && journey?.hasConfirmedAnnual && <Button variant="outline" onClick={() => setTab("experiences")}>Seguir con el plan confirmado anterior</Button>}
      {tab === "experiences" && status === "draft" && journey?.hasConfirmedExperience && <Button variant="outline" onClick={() => setTab("activities")}>Preparar actividad de una experiencia confirmada</Button>}
      <details className="text-sm"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-[#07576c]">Tu recorrido y otras etapas</summary><div className="mt-2">
      {journey?.mode==="ongoing_cycle"?<div className="flex flex-wrap gap-2 rounded-xl bg-[#eaf7fb] p-3 text-sm"><span className="mr-auto font-semibold">Ir a:</span><Button variant="outline" onClick={()=>setTab("annual")}>Mi año</Button><Button variant="outline" onClick={()=>setTab("experiences")}>Proyectos</Button><Button variant="outline" onClick={()=>setTab("activities")}>Actividades y talleres</Button></div>:<><p className="text-sm text-[#526b87]">✓ 1. Aula configurada · {journey?.studentCount ? `✓ 2. ${journey.studentCount} alumnos registrados` : "2. Añadir alumnos: pendiente"}</p>
      <ol className="ayni-journey" aria-label="Siguientes pasos del recorrido">{steps.map((step, index) => {
        const saved = journey && (step.id === "diagnostic" ? journey.diagnostic : step.id === "annual" ? journey.annual : step.id === "experiences" ? journey.experience : journey.activity);
        const hasConfirmed = journey && (step.id === "diagnostic" ? journey.diagnostic === "reviewed" : step.id === "annual" ? journey.hasConfirmedAnnual : step.id === "experiences" ? journey.hasConfirmedExperience : journey.hasConfirmedActivity);
        return <li key={step.id} aria-current={tab === step.id ? "step" : undefined} className={saved === "confirmed" || saved === "reviewed" ? "is-complete" : saved === "draft" || saved === "in_progress" ? "is-draft" : ""}>
          {step.id === "diagnostic" ? <button type="button" className="ayni-journey-link" onClick={onGoDiagnostic} aria-label="Volver al diagnóstico para revisarlo o cambiarlo">
            <span>{saved === "confirmed" || saved === "reviewed" ? <Check aria-hidden="true" /> : index + 3}</span><small>{step.label}</small>
          </button> : <><span>{saved === "confirmed" || saved === "reviewed" ? <Check aria-hidden="true" /> : index + 3}</span><small>{step.label}</small></>}
          <em>{saved === "reviewed" ? "Revisado" : saved === "in_progress" ? "En curso" : saved === "confirmed" ? "Confirmado" : saved === "draft" ? hasConfirmed ? "Confirmado + borrador" : "Borrador" : saved === "pending" ? "Pendiente" : ""}</em>
        </li>;
      })}</ol></>}
      </div></details>
      {(tab==="experiences"||tab==="activities")&&<PlanningFeedbackOption value={feedbackPeriodId} onChange={setFeedbackPeriodId}/>}
      {stepIndex > 0 && tab !== "annual" && <nav className="ayni-step-actions" aria-label="Volver en la planificación"><Button variant="outline" onClick={() => setTab(steps[stepIndex - 1].id)}>Ver paso anterior</Button></nav>}
    </>}
  </section>;
}
