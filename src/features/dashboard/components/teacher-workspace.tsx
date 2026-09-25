"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  BookOpen, CalendarDays, Check, ClipboardCheck, Database,
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
import { loadPlanningJourney, loadStartingGuidance } from "@/src/lib/planning-journey.mjs";
import { InstitutionProfile } from "./profile-and-diagnostic";
import { GuidedDiagnostic } from "./guided-diagnostic-v4";
import { StudentsScreen } from "./students-screen";
import { ActivityRunView } from "./activity-run-view";
import { AttendanceDialog } from "./attendance-dialog";
import { ParentActivityGenerator } from "./parent-activity-generator";
import { AnnualPlanGenerator } from "./annual-plan-generator";
import { ResourceLibraryScreen } from "./resource-library-screen";
import { PlanningHome } from "./planning-home";
import { EvaluationHome } from "./evaluation-home";
import { TodayHome } from "./today-home";
import { MediaAttachmentInput } from "./media-attachment-input";
import type { LibraryResource } from "@/src/lib/library-resource";
import { LearningExperienceGenerator } from "./learning-experience-generator";
import { PeriodEvaluation } from "./period-evaluation";
import { PlanningFeedbackOption } from "./planning-feedback-option";
import { PilotSetup } from "./pilot-setup";
import { AsyncButton, LoadingState, NextStepCard, PageIntro, ScreenSkeleton, WorkflowFeedback } from "./workflow-ui";

const nav = [
  ["Hoy", Home], ["Planificar", CalendarDays], ["Aula", Users],
  ["Evaluar", ClipboardCheck], ["Biblioteca", BookOpen],
] as const;

const mobileNav = [
  ["Hoy", "Hoy", Home], ["Planificar", "Planificar", CalendarDays], ["Aula", "Aula", Users],
  ["Evaluar", "Evaluar", ClipboardCheck], ["Biblioteca", "Biblioteca", BookOpen],
] as const;
const sentenceCase = (value: string) => value.charAt(0).toLocaleUpperCase("es-PE") + value.slice(1);

export function TeacherWorkspace() {
  const [active, setActive] = useState("Hoy");
  const navigationTouched = useRef(false);
  const [evaluationTarget, setEvaluationTarget] = useState<{ studentId: string; competencyId: string } | null>(null);
  const [planningTarget, setPlanningTarget] = useState<"activities" | null>(null);
  const [selectedResource, setSelectedResource] = useState<LibraryResource | null>(null);
  const [libraryFilter, setLibraryFilter] = useState<"for-you" | "workshops">("for-you");
  const [evaluationEntry, setEvaluationEntry] = useState<"home" | "diagnostic">("home");
  const [diagnosticInitialStep, setDiagnosticInitialStep] = useState<1 | 2 | 3>(1);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceRevision, setEvidenceRevision] = useState(0);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [activityRunBlockId, setActivityRunBlockId] = useState<string | null>(null);
  const [evidenceContext, setEvidenceContext] = useState<{ activityId: string; criteria: ActivityCriterion[]; title: string } | null>(null);
  const [studentId, setStudentId] = useState("3");
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
          if (!controller.signal.aborted && !navigationTouched.current) setActive(guidance.startingSection === "Niños" ? "Aula" : guidance.startingSection);
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
    if (!criterionId || (!note.trim() && !photo && !audio) || savingEvidence || saved) return;
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

  function navigate(section: string) { navigationTouched.current = true; setStarting(false); if (section !== "Planificar") { setPlanningTarget(null); setSelectedResource(null); } if (section === "Evaluar") { setEvaluationTarget(null); setEvaluationEntry("home"); setDiagnosticInitialStep(1); } setActive(section); }

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
    if (!block.activity_id || !block.criteria.length) return;
    if (suggestedStudentId && dashboard?.students.some((student) => student.id === suggestedStudentId)) setStudentId(suggestedStudentId);
    setEvidenceContext({ activityId: block.activity_id, criteria: block.criteria, title: block.title });
    setCriterionId(block.criteria[0].id);
    setPhoto(null);
    setAudio(null);
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

      <SidebarInset className="min-w-0 bg-[#f7faff]">
        <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between bg-[#f7faff]/95 px-4 backdrop-blur md:border-b md:border-[#e7edf7] md:bg-white/95 md:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#e8f7fa] text-[#0b7891] md:hidden"><BookOpen className="size-5" aria-hidden="true" /></span>
            <div className="md:hidden"><p className="text-xl font-extrabold leading-tight text-[#1c2e50]">Ayni Aula</p><p className="text-xs text-[#60718a]">{active === "Biblioteca" ? "Materiales reutilizables" : active === "Aula" ? "Tus niños y su seguimiento" : active === "Evaluar" ? "Evidencias y decisiones" : active === "Planificar" ? "Tu diagnóstico y el CNEB" : "Tu aliada en Inicial"}</p></div>
            <div className="hidden md:block"><p className="text-sm font-semibold md:text-base">{sentenceCase(today)}</p><p className="text-xs text-muted-foreground">{profile?.institution_name ?? "Institución por configurar"} · {profile?.section ?? "Aula"}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex ${databaseState === "connected" ? "bg-[#e5f1ee] text-[#1f625c]" : "bg-muted text-muted-foreground"}`}>
              <Database className="size-3.5" />
              {databaseState === "connected" ? "Base conectada" : "Conectando"}
            </div>
            <button type="button" title="Abrir perfil" aria-label="Abrir perfil" onClick={() => navigate("Perfil")} className="grid size-10 place-items-center rounded-full bg-[#d9eaf4] text-sm font-bold text-[#155a78] hover:bg-[#c4e3f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087d96]">{profile?.teacher_name?.split(" ").map((part) => part[0]).slice(0, 2).join("") ?? ""}</button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1450px] px-4 pb-28 pt-4 md:px-7 md:pt-8">
          {guidanceError && <div className="mb-4 flex flex-wrap items-center gap-3"><WorkflowFeedback tone="error">No pudimos comprobar cuál es tu siguiente paso.</WorkflowFeedback><Button variant="outline" onClick={() => { setGuidanceError(false); setRetry((value) => value + 1); }}>Reintentar</Button></div>}
          {starting ? <ScreenSkeleton /> : active === "Perfil" ? dashboard ? <InstitutionProfile dashboard={dashboard} onSaved={setDashboard} /> : <ScreenSkeleton /> :
          active === "Biblioteca" ? dashboard ? <ResourceLibraryScreen age={dashboard.profile.age_years} initialFilter={libraryFilter} onUse={(resource) => { setSelectedResource(resource); setPlanningTarget("activities"); navigate("Planificar"); }} /> : <ScreenSkeleton /> :
          active === "Evaluar" ? dashboard ? <EvaluationArea dashboard={dashboard} initialTarget={evaluationTarget} initialSection={evaluationEntry} initialDiagnosticStep={diagnosticInitialStep} onPlan={() => { setPlanningTarget(null); navigate("Planificar"); }} onPrepareActivity={() => { setPlanningTarget("activities"); navigate("Planificar"); }} onStudents={() => navigate("Aula")} /> : <ScreenSkeleton /> :
          active === "Aula" ? dashboard ? <StudentsScreen students={students} onImported={setDashboard} onDiagnostic={() => { navigate("Evaluar"); setEvaluationEntry("diagnostic"); }} onEvaluate={(studentId, competencyId) => { navigate("Evaluar"); setEvaluationTarget({ studentId, competencyId }); }} onPlan={() => navigate("Planificar")} /> : <ScreenSkeleton /> : active === "Planificar" ? dashboard ? <PlanningArea dashboard={dashboard} initialTab={planningTarget} selectedResource={selectedResource} onGoToday={() => navigate("Hoy")} onGoDiagnostic={() => { navigate("Evaluar"); setEvaluationEntry("diagnostic"); }} onGoStudents={() => navigate("Aula")} onGoWorkshops={() => { setLibraryFilter("workshops"); navigate("Biblioteca"); }} /> : <ScreenSkeleton /> : <>
          {activityRunBlock ? <ActivityRunView block={activityRunBlock} evidenceRevision={evidenceRevision} onBack={() => setActivityRunBlockId(null)} onEvidence={(suggestedStudentId) => openEvidenceFor(activityRunBlock,suggestedStudentId)} onStepChange={async (stepIndex) => updateExecution({ scheduleEntryId: activityRunBlock.id, action: "set_step", stepIndex })} onComplete={async () => { await updateExecution({ scheduleEntryId: activityRunBlock.id, action: "complete", closureType: "as_planned" }); setActivityRunBlockId(null); }} /> : active === "Hoy" && (dashboard ? <TodayHome dashboard={dashboard} openEvidence={openEvidenceFor} openAttendance={() => setAttendanceOpen(true)} updateExecution={updateExecution} openActivity={openActivity} onPlan={() => navigate("Planificar")} onPrepareActivity={() => { setPlanningTarget("activities"); navigate("Planificar"); }} onDiagnostic={() => { navigate("Evaluar"); setEvaluationEntry("diagnostic"); setDiagnosticInitialStep(2); }} /> : <ScreenSkeleton />)}
          </>}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#e1e9f2] bg-white/97 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(24,45,80,.05)] backdrop-blur md:hidden" aria-label="Navegación rápida">
          {mobileNav.map(([label, destination, Icon]) => <button key={label} type="button" aria-current={active === destination ? "page" : undefined} onClick={() => { if (destination === "Biblioteca") setLibraryFilter("for-you"); navigate(destination); }} className={`group mx-0.5 flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] active:bg-[#d8f0f4] ${active === destination ? "text-[#087d96]" : "text-[#60718a]"}`}><span className={`grid h-7 w-11 place-items-center rounded-lg ${active === destination ? "bg-[#dff3f6]" : "group-hover:bg-[#edf6fa]"}`}><Icon className="size-5" /></span><span>{label}</span></button>)}
        </nav>
      </SidebarInset>
      <AttendanceDialog open={attendanceOpen} onOpenChange={setAttendanceOpen} students={students} onSave={markAttendance} />
      <EvidenceDialog open={evidenceOpen} onOpenChange={closeEvidence} students={students} studentId={studentId} setStudentId={setStudentId} criterionId={criterionId} setCriterionId={setCriterionId} criteria={evidenceContext?.criteria ?? activity?.criteria ?? []} note={note} setNote={setNote} photo={photo} setPhoto={setPhoto} audio={audio} setAudio={setAudio} saved={saved} saving={savingEvidence} saveError={saveError} saveEvidence={saveEvidence} activityTitle={evidenceContext?.title ?? activity?.title ?? "Actividad"} databaseConnected={databaseState === "connected"} />
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
    <DialogContent className="rounded-2xl p-0 sm:max-w-xl">
      <DialogHeader className="border-b px-6 py-5"><DialogTitle>Registrar evidencia</DialogTitle><DialogDescription>Actividad: {activityTitle}</DialogDescription></DialogHeader>
      <div className="space-y-5 px-6 py-1">
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
      <DialogFooter className="border-t px-6 py-4"><Button variant="ghost" onClick={() => onOpenChange(false)}>{saved ? "Cerrar" : "Cancelar"}</Button><AsyncButton variant="outline" busy={saving} busyLabel="Guardando..." disabled={!criterionId || (!note.trim() && !photo && !audio) || saved || !studentId || preparingPhoto} onClick={() => saveEvidence(true)}>Guardar y siguiente</AsyncButton><AsyncButton busy={saving} busyLabel="Guardando..." disabled={!criterionId || (!note.trim() && !photo && !audio) || saved || !studentId || preparingPhoto} onClick={() => saveEvidence()}>Guardar observación</AsyncButton></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function EvaluationArea({ dashboard, initialTarget, initialSection, initialDiagnosticStep, onPlan, onPrepareActivity, onStudents }: { dashboard: LocalDashboard; initialTarget: { studentId: string; competencyId: string } | null; initialSection: "home" | "diagnostic"; initialDiagnosticStep: 1 | 2 | 3; onPlan: () => void; onPrepareActivity: () => void; onStudents: () => void }) {
  const [section, setSection] = useState<"home" | "diagnostic" | "period">(initialTarget ? "period" : initialSection);
  const [target, setTarget] = useState(initialTarget);
  const [periodView, setPeriodView] = useState<"student" | "family" | "coverage">("student");
  return <section className="mx-auto max-w-5xl space-y-5">
    {section === "home" ? <EvaluationHome dashboard={dashboard} onDiagnostic={() => setSection("diagnostic")} onPeriod={(view, nextTarget) => { setTarget(nextTarget ?? null); setPeriodView(view); setSection("period"); }} /> : <>
      <Button variant="ghost" className="-ml-3 min-h-11 text-[#07576c]" onClick={() => setSection("home")}>← Volver a Evaluar</Button>
      {section === "diagnostic" ? <GuidedDiagnostic dashboard={dashboard} initialStep={initialDiagnosticStep} onPlan={onPlan} onStudents={onStudents} /> : <PeriodEvaluation key={`${target?.studentId ?? "all"}:${target?.competencyId ?? "all"}:${periodView}`} initialStudentId={target?.studentId} initialCompetencyId={target?.competencyId} initialView={periodView} onPlan={onPlan} onPrepareActivity={onPrepareActivity} />}
    </>}
  </section>;
}
function PlanningArea({ dashboard, initialTab, selectedResource, onGoToday, onGoDiagnostic, onGoStudents, onGoWorkshops }: { dashboard: LocalDashboard; initialTab?:"activities"|null; selectedResource: LibraryResource | null; onGoToday: () => void; onGoDiagnostic: () => void; onGoStudents: () => void; onGoWorkshops: () => void }) {
  const [tab, setTab] = useState<"home" | "diagnostic" | "annual" | "experiences" | "activities">(initialTab??"home");
  const [feedbackPeriodId,setFeedbackPeriodId]=useState<string|null>(null);
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
      setProgressError(false);
    }).catch(() => { if (live) setProgressError(true); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [initialTab]);

  async function refreshJourney() {
    try { const next = await loadPlanningJourney(localDatabaseApiUrl); setJourney(next); setProgressError(false); }
    catch { setJourney(null); setProgressError(true); }
  }

  if (tab === "home") return <section className="mx-auto max-w-5xl">{loading ? <LoadingState label="Buscando dónde continuar..." /> : progressError || !journey ? <div className="space-y-3"><WorkflowFeedback tone="error">No se pudo cargar tu planificación.</WorkflowFeedback><Button variant="outline" onClick={() => void refreshJourney()}>Reintentar</Button></div> : <PlanningHome journey={journey} dashboard={dashboard} onOpen={(step) => { if (step === "diagnostic") onGoDiagnostic(); else setTab(step); }} onWorkshops={onGoWorkshops} />}</section>;

  return <section className="mx-auto max-w-5xl space-y-5">
    <Button variant="ghost" className="-ml-3 min-h-11 text-[#07576c]" onClick={() => setTab("home")}>← Volver a Planificar</Button>
    <PageIntro eyebrow="Organiza el aprendizaje" title="Planificar" description={journey?.mode==="ongoing_cycle"?"Ajusta proyectos y actividades según lo que observas en el aula.":"Avanza un paso a la vez. Puedes guardar y continuar después."} icon={CalendarDays} />
    {loading ? <LoadingState label="Buscando dónde continuar..." /> : progressError ? <div className="space-y-2"><WorkflowFeedback tone="error">No se pudo comprobar dónde continuar. Tus datos guardados no se han perdido.</WorkflowFeedback><Button variant="outline" onClick={() => void refreshJourney()}>Reintentar carga del avance</Button></div> : <>
      {journey?.mode==="ongoing_cycle"?<div className="rounded-xl bg-[#eaf7fb] p-4"><p className="font-bold">Trabajo cotidiano</p><p className="mt-1 text-sm">Planificar ↔ Hoy ↔ Evidencias ↔ Evaluar. Vuelve a ajustar cuando observes algo nuevo.</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={()=>setTab("annual")}>Plan anual</Button><Button variant="outline" onClick={()=>setTab("experiences")}>Proyecto o unidad</Button><Button variant="outline" onClick={()=>setTab("activities")}>Actividad</Button></div></div>:<><p className="text-sm text-[#526b87]">✓ 1. Aula configurada · {journey?.studentCount ? `✓ 2. ${journey.studentCount} alumnos registrados` : "2. Añadir alumnos: pendiente"}</p>
      <ol className="ayni-journey" aria-label="Siguientes pasos del recorrido">{steps.map((step, index) => {
        const saved = journey && (step.id === "diagnostic" ? journey.diagnostic : step.id === "annual" ? journey.annual : step.id === "experiences" ? journey.experience : journey.activity);
        const hasConfirmed = journey && (step.id === "diagnostic" ? journey.diagnostic === "reviewed" : step.id === "annual" ? journey.hasConfirmedAnnual : step.id === "experiences" ? journey.hasConfirmedExperience : journey.hasConfirmedActivity);
        return <li key={step.id} aria-current={tab === step.id ? "step" : undefined} className={saved === "confirmed" || saved === "reviewed" ? "is-complete" : saved === "draft" || saved === "in_progress" ? "is-draft" : ""}>
          <span>{saved === "confirmed" || saved === "reviewed" ? <Check aria-hidden="true" /> : index + 3}</span><small>{step.label}</small>
          <em>{saved === "reviewed" ? "Revisado" : saved === "in_progress" ? "En curso" : saved === "confirmed" ? "Confirmado" : saved === "draft" ? hasConfirmed ? "Confirmado + borrador" : "Borrador" : saved === "pending" ? "Pendiente" : ""}</em>
        </li>;
      })}</ol></>}
      {(tab==="experiences"||tab==="activities")&&<PlanningFeedbackOption value={feedbackPeriodId} onChange={setFeedbackPeriodId}/>}
      {tab === "activities" && selectedResource && <div className="rounded-2xl bg-[#edf8f4] p-4 text-sm text-[#1c554b]"><b>Recurso elegido: {selectedResource.title}</b><p className="mt-1">Elige un proyecto o unidad. Ayni incorporará el contexto y los materiales del recurso a la actividad para que puedas revisarlos.</p></div>}
      {tab === "diagnostic" ? (status !== "reviewed" ? <NextStepCard title={journey?.studentCount ? "Primero, conoce a tu grupo" : "Primero, agrega a los niños"} description={journey?.studentCount ? "Revisa el diagnóstico inicial y guarda tu decisión antes de preparar el plan anual." : "Necesitas la lista del aula para registrar el diagnóstico inicial."} action={journey?.studentCount ? "Ir a evaluación diagnóstica" : "Agregar niños"} onAction={journey?.studentCount ? onGoDiagnostic : onGoStudents} /> : null) : tab === "annual" ? <AnnualPlanGenerator onConfirmed={() => void refreshJourney()} onGoDiagnostic={onGoDiagnostic} /> : tab === "experiences" ? <LearningExperienceGenerator ongoing={journey?.mode==="ongoing_cycle"} feedbackPeriodId={feedbackPeriodId} onConfirmed={() => void refreshJourney()} /> : <ParentActivityGenerator ongoing={journey?.mode==="ongoing_cycle"} feedbackPeriodId={feedbackPeriodId} initialResource={selectedResource} onConfirmed={() => void refreshJourney()} onGoToday={onGoToday} />}
      {journey?.mode!=="ongoing_cycle"&&(status === "confirmed" || status === "reviewed") && stepIndex < steps.length - 1 && <NextStepCard title={tab === "diagnostic" ? "Revisión inicial guardada" : `${steps[stepIndex].label} listo`} description={tab === "diagnostic" ? "Puedes preparar el plan anual con la información disponible y seguir observando después." : "Ya puedes avanzar. Tu trabajo quedó guardado y podrás volver a verlo."} action={`Continuar: ${steps[stepIndex + 1].label}`} onAction={() => { setTab(steps[stepIndex + 1].id); void refreshJourney(); }} />}
      {tab === "annual" && status === "draft" && journey?.hasConfirmedAnnual && <Button variant="outline" onClick={() => setTab("experiences")}>Seguir con el plan confirmado anterior</Button>}
      {tab === "experiences" && status === "draft" && journey?.hasConfirmedExperience && <Button variant="outline" onClick={() => setTab("activities")}>Preparar actividad de una experiencia confirmada</Button>}
      {stepIndex > 0 && <nav className="ayni-step-actions" aria-label="Volver en la planificación"><Button variant="outline" onClick={() => setTab(steps[stepIndex - 1].id)}>Ver paso anterior</Button></nav>}
    </>}
  </section>;
}
