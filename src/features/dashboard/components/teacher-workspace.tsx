"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  BookOpen, CalendarDays, Check, ChevronRight, ClipboardCheck, Database, FileText,
  Camera, CheckCircle2, Clock3, Home, Library, Menu, MoreHorizontal, Play,
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
  createLocalEvidence, loadLocalDashboard, saveLocalAttendance, updateLocalExecution, type ActivityCriterion, type LocalDashboard, type LocalStudent, type ObservationStatus,
} from "@/src/lib/local-database";
import { GuidedDiagnostic, InstitutionProfile } from "./profile-and-diagnostic";
import { StudentsScreen } from "./students-screen";
import { ActivityRunView } from "./activity-run-view";
import { AttendanceDialog } from "./attendance-dialog";
import { ParentActivityGenerator } from "./parent-activity-generator";
import { AnnualPlanGenerator } from "./annual-plan-generator";
import { LearningExperienceGenerator } from "./learning-experience-generator";
import { AssessmentGenerator } from "./assessment-generator";
import { DescriptiveConclusionGenerator } from "./descriptive-conclusion-generator";

const nav = [
  ["Hoy", Home], ["Planificar", CalendarDays], ["Niños", Users],
  ["Evaluar", ClipboardCheck], ["Documentos", FileText], ["Biblioteca", Library],
  ["Perfil", Settings2],
] as const;

const mobileNav = [
  ["Hoy", "Hoy", Home], ["Plan", "Planificar", CalendarDays], ["Diagnóstico", "Evaluar", ClipboardCheck],
  ["Alumnos", "Niños", Users], ["Más", "Perfil", MoreHorizontal],
] as const;

const fallbackStudents: LocalStudent[] = [
  ["1", "Alessia"], ["2", "Benjamín"], ["3", "Camila"],
  ["4", "Diego"], ["5", "Emilia"], ["6", "Fabián"],
].map(([id, name]) => ({ id, name }));

export function TeacherWorkspace() {
  const [active, setActive] = useState("Hoy");
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
  const [saveError, setSaveError] = useState("");
  const [dashboard, setDashboard] = useState<LocalDashboard | null>(null);
  const [databaseState, setDatabaseState] = useState<"checking" | "connected" | "offline">("checking");
  const today = useMemo(() => new Intl.DateTimeFormat("es-PE", {
    weekday: "long", day: "numeric", month: "long",
  }).format(new Date()), []);

  useEffect(() => {
    const controller = new AbortController();
    loadLocalDashboard(controller.signal)
      .then((data) => {
        setDashboard(data);
        setStudentId(data.students[2]?.id ?? data.students[0]?.id ?? "");
        setCriterionId(data.activity?.criteria[0]?.id ?? "");
        setDatabaseState("connected");
      })
      .catch(() => setDatabaseState("offline"));
    return () => controller.abort();
  }, []);

  async function saveEvidence(andNext = false) {
    if (!criterionId || !observationStatus) return;
    setSaved(true);
    setSaveError("");
    try {
      if (!dashboard) throw new Error("Inicia la base local para guardar información.");
      await createLocalEvidence({
        studentId,
        activityId: evidenceContext?.activityId ?? dashboard.activity.id,
        criterionId,
        observationStatus,
        observationText: note || undefined,
        photo: photo ? { base64: photo.base64, mimeType: photo.mimeType } : undefined,
      });
      setDashboard(await loadLocalDashboard());
      if (andNext) {
        setSaved(false);
        setNote("");
        setObservationStatus("");
        setPhoto(null);
        const currentIndex = students.findIndex((student) => student.id === studentId);
        const nextStudent = students[currentIndex + 1];
        if (nextStudent) setStudentId(nextStudent.id);
        else setSaveError("Último niño de la lista. Puedes cerrar o elegir otro estudiante.");
      } else window.setTimeout(() => {
        setEvidenceOpen(false);
        setSaved(false);
        setNote("");
        setPhoto(null);
      }, 850);
    } catch (error) {
      setSaved(false);
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar la evidencia.");
    }
  }

  const students = dashboard?.students ?? fallbackStudents;
  const profile = dashboard?.profile;
  const activity = dashboard?.activity;
  const metrics = dashboard?.metrics;

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
                    <SidebarMenuButton asChild isActive={active === label} className="h-11 rounded-xl px-3 text-[15px] data-[active=true]:bg-[#d8f0f4] data-[active=true]:font-semibold data-[active=true]:text-[#126177]">
                      <button type="button" onClick={() => setActive(label)}><Icon /><span>{label}</span></button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <div className="rounded-xl border border-[#dce6f4] bg-white p-3">
            <p className="text-sm font-semibold">{profile?.section ?? "Sala Amarilla"} · {profile?.age_label ?? "5 años"}</p>
            <p className="mt-1 text-xs text-[#63748d]">{profile?.school_year ?? 2026} · {metrics?.students_total ?? 6} estudiantes</p>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-[#e7edf7] bg-white/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" aria-label="Abrir menú"><Menu /></SidebarTrigger>
            <div><p className="text-sm font-semibold capitalize md:text-base">{today}</p><p className="hidden text-xs text-muted-foreground sm:block">{profile?.institution_name ?? "Jardín Los Girasoles"} · {profile?.section ?? "Sala Amarilla"}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex ${databaseState === "connected" ? "bg-[#e5f1ee] text-[#1f625c]" : databaseState === "offline" ? "bg-[#fff1d6] text-[#8a5418]" : "bg-muted text-muted-foreground"}`}>
              <Database className="size-3.5" />
              {databaseState === "connected" ? "Base local conectada" : databaseState === "offline" ? "Modo demostración" : "Conectando"}
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-[#d9eaf4] text-sm font-bold text-[#155a78]">{profile?.teacher_name?.split(" ").map((part) => part[0]).slice(0, 2).join("") ?? "MR"}</div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1450px] px-4 pb-24 pt-6 md:px-7 md:pt-8">
          {active === "Perfil" ? dashboard ? <InstitutionProfile dashboard={dashboard} onSaved={setDashboard} /> : <p role={databaseState === "offline" ? "alert" : "status"} className="text-sm text-muted-foreground">{databaseState === "offline" ? "No se pudo conectar con la base local. Inicia npm run db:local y vuelve a cargar la página." : "Cargando perfil..."}</p> :
          active === "Evaluar" ? dashboard ? <EvaluationArea dashboard={dashboard} students={students} /> : <p role={databaseState === "offline" ? "alert" : "status"} className="text-sm text-muted-foreground">{databaseState === "offline" ? "No se pudo conectar con la base local. Inicia npm run db:local y vuelve a cargar la página." : "Cargando evaluación diagnóstica..."}</p> :
          active === "Niños" ? <StudentsScreen students={students} /> : active === "Planificar" ? dashboard ? <PlanningArea /> : <p role={databaseState === "offline" ? "alert" : "status"} className="text-sm text-muted-foreground">{databaseState === "offline" ? "No se pudo conectar con la base local. Inicia npm run db:local y vuelve a cargar la página." : "Cargando planificación..."}</p> : <>
          {activityRunBlock ? <ActivityRunView block={activityRunBlock} onBack={() => setActivityRunBlockId(null)} onEvidence={() => openEvidenceFor(activityRunBlock)} onStepChange={async (stepIndex) => updateExecution({ scheduleEntryId: activityRunBlock.id, action: "set_step", stepIndex })} onComplete={async () => { await updateExecution({ scheduleEntryId: activityRunBlock.id, action: "complete", closureType: "as_planned" }); setActivityRunBlockId(null); }} /> : active === "Hoy" && <TodayScreen dashboard={dashboard} openEvidence={openEvidenceFor} openAttendance={() => setAttendanceOpen(true)} updateExecution={updateExecution} openActivity={openActivity} />}
          <div className={activityRunBlock || active === "Hoy" ? "hidden" : ""}>
          <section className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div><p className="mb-1 text-sm font-semibold text-[#087d96]">{active}</p><h1 className="text-3xl font-bold tracking-[-0.035em] md:text-4xl">Buenos días, profesora {profile?.teacher_name?.split(" ")[0] ?? "Marisol"}</h1><p className="mt-2 max-w-2xl text-base text-muted-foreground">Esto es lo más importante para tu jornada de hoy.</p></div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,.75fr)]">
            <section className="overflow-hidden rounded-2xl border bg-card shadow-[0_10px_35px_rgba(36,69,112,.05)]">
              <div className="flex items-center justify-between border-b px-5 py-4 md:px-6">
                <div className="flex items-center gap-3"><span className="rounded-full bg-[#e8f6fb] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#087d96]">Actividad de hoy</span><span className="text-sm text-muted-foreground">9:00 a. m.</span></div>
                <Button variant="ghost" size="icon" aria-label="Más opciones"><MoreHorizontal /></Button>
              </div>
              <div className="p-5 md:p-7">
                <div className="mb-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="text-sm font-medium text-muted-foreground">Proyecto · {activity?.experience_title ?? "Los secretos de nuestro jardín"}</p><h2 className="mt-1 max-w-2xl text-2xl font-bold tracking-tight md:text-3xl">{activity?.title ?? "¿Qué necesitan las plantas para crecer?"}</h2></div>
                  <div className="shrink-0 rounded-xl bg-[#f0f4fb] px-4 py-3 text-center"><p className="text-2xl font-bold">45</p><p className="text-xs text-muted-foreground">minutos</p></div>
                </div>
                <div className="grid gap-3 border-y py-5 sm:grid-cols-2">
                  <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Competencia principal</p><p className="mt-1.5 font-semibold">{activity?.criteria[0]?.competency_text ?? "Indaga mediante métodos científicos"}</p></div>
                  <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evidencia que podría verse</p><p className="mt-1.5 text-sm leading-relaxed">{activity?.criteria[0]?.details?.expected_evidence ?? activity?.criteria[0]?.criterion_text ?? "Sin criterio activo para observar."}</p></div>
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button className="h-11 flex-1 rounded-xl" disabled={!dashboard?.today.blocks.some((block) => block.activity_id === activity?.id)} onClick={() => { const block = dashboard?.today.blocks.find((item) => item.activity_id === activity?.id); if (block) void openActivity(block); }}><BookOpen /> Abrir actividad <ChevronRight /></Button>
                  <Button variant="outline" className="h-11 flex-1 rounded-xl border-[#87bdcb] text-[#126177]" onClick={() => { if (!activity?.id || !activity.criteria.length) return; setEvidenceContext({ activityId: activity.id, criteria: activity.criteria, title: activity.title }); setCriterionId(activity.criteria[0].id); setObservationStatus(""); setEvidenceOpen(true); }}><ClipboardCheck /> Registrar evidencia</Button>
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-[#e4dff7] bg-[#f5f0ff] p-5 shadow-[0_12px_35px_rgba(36,69,112,.04)]">
                <div className="mb-4 flex items-center justify-between"><div className="grid size-10 place-items-center rounded-xl bg-[#e6dafc]"><Sparkles className="size-5 text-[#7652bc]" /></div><span className="rounded-full bg-white px-2.5 py-1 text-xs text-[#684d9c]">Sugerencia</span></div>
                <h2 className="text-xl font-bold">Tu asistente encontró una conexión</h2><p className="mt-2 text-sm leading-relaxed text-[#5e6385]">Ayer el grupo preguntó por qué algunas hojas cambian de color. Puedes retomarlo en el cierre de hoy.</p>
                <p className="mt-4 text-sm font-medium text-[#5e468f]">Sugerencia disponible para considerar durante el cierre.</p>
              </section>
              <section className="rounded-2xl border bg-white p-5">
                <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Pendientes de esta semana</h2><span className="text-sm font-bold text-[#b96b1e]">3</span></div>
                <ul className="space-y-3 text-sm">
                  {["Completar diagnóstico de 2 niños", "Revisar materiales del viernes", "Confirmar feriado local"].map((item, index) => <li key={item} className="flex items-start gap-3"><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${index === 0 ? "bg-[#fff1d6] text-[#9a5a12]" : "bg-muted text-muted-foreground"}`}>{index + 1}</span><span className="pt-0.5 leading-snug">{item}</span></li>)}
                </ul>
              </section>
            </aside>
          </div>

          <section className="mt-6 grid gap-4 sm:grid-cols-3">
            <Metric label="Observaciones esta semana" value={String(metrics?.evidences_week ?? 0)} detail={`${metrics?.students_observed ?? 0} estudiantes`} />
            <Metric label="Cobertura de observación" value={`${metrics?.students_observed ?? 0}/${metrics?.students_total ?? 6}`} detail={`${Math.max((metrics?.students_total ?? 6) - (metrics?.students_observed ?? 0), 0)} por observar`} warning />
            <article className="paper-grid rounded-2xl border bg-white p-5"><p className="text-sm font-medium text-muted-foreground">Próxima fecha importante</p><p className="mt-3 text-xl font-bold">Día de la Primavera</p><p className="mt-1 text-sm text-muted-foreground">23 de septiembre</p></article>
          </section>
          </div></>}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#e1e9f2] bg-white/96 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Navegación rápida">
          {mobileNav.map(([label, destination, Icon]) => <button key={label} onClick={() => setActive(destination)} className={`flex min-h-17 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active === destination ? "text-[#087d96]" : "text-[#60718a]"}`}><Icon className={`size-5 ${active === destination ? "fill-current/10" : ""}`} /><span>{label}</span></button>)}
        </nav>
      </SidebarInset>
      <AttendanceDialog open={attendanceOpen} onOpenChange={setAttendanceOpen} students={students} onSave={markAttendance} />
      <EvidenceDialog open={evidenceOpen} onOpenChange={closeEvidence} students={students} studentId={studentId} setStudentId={setStudentId} criterionId={criterionId} setCriterionId={setCriterionId} criteria={evidenceContext?.criteria ?? activity?.criteria ?? []} observationStatus={observationStatus} setObservationStatus={setObservationStatus} note={note} setNote={setNote} photo={photo} setPhoto={setPhoto} saved={saved} saveError={saveError} saveEvidence={saveEvidence} activityTitle={evidenceContext?.title ?? activity?.title ?? "Actividad"} databaseConnected={databaseState === "connected"} />
    </SidebarProvider>
  );
}

function TodayScreen({ dashboard, openEvidence, openAttendance, updateExecution, openActivity }: {
  dashboard: LocalDashboard | null;
  openEvidence: (block: LocalDashboard["today"]["blocks"][number]) => void;
  openAttendance: () => void;
  updateExecution: (input: { scheduleEntryId: string; action: "start" | "complete" | "skip" | "keep_current" | "set_step"; stepIndex?: number; closureType?: "as_planned" | "note"; closureNote?: string }) => Promise<void>;
  openActivity: (block: LocalDashboard["today"]["blocks"][number], start?: boolean) => Promise<void>;
}) {
  const [closing, setClosing] = useState(false);
  const [closureNote, setClosureNote] = useState("");
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

  return <div className="mx-auto max-w-4xl space-y-5">
    <div className="rounded-3xl bg-[radial-gradient(circle_at_85%_30%,#d9f6f5,transparent_32%),linear-gradient(135deg,#ffffff,#edf9ff)] px-5 py-6 md:px-7"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-[#087d96]">Mi día de hoy</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">{today?.date ?? "Cargando día..."}</h1></div><span className="rounded-2xl bg-white/80 px-3 py-2 text-sm font-semibold text-[#126177]">{dashboard?.profile.age_label} · {dashboard?.profile.section}</span></div></div>
    {isNoClasses ? <section className="diagnostic-panel bg-[#f7f4ff] p-6"><CalendarDays className="mb-3 text-[#7554aa]" /><h2 className="text-xl font-bold">{today?.calendar_exception?.label ?? "No hay clases hoy"}</h2><p className="mt-2 text-sm text-[#5b6680]">La jornada queda libre de actividades y evidencias.</p></section> : !today?.blocks.length ? <section className="diagnostic-panel p-6"><Clock3 className="mb-3 text-[#087d96]" /><h2 className="text-xl font-bold">Horario aún no configurado</h2><p className="mt-2 text-sm text-muted-foreground">Podrás organizarlo cuando el módulo de horario esté disponible.</p></section> : <>
      {featured && <section className="diagnostic-panel overflow-hidden border-[#c5edf0] bg-[linear-gradient(135deg,#ffffff,#e9fbfb)] p-5 md:p-7"><div className="flex items-center justify-between gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${current ? "bg-[#087d96] text-white" : "bg-[#fff0c7] text-[#926329]"}`}>{isClosure ? "CIERRE" : current ? "AHORA" : "PRÓXIMO"}</span><span className="text-sm font-semibold text-[#47617f]">{featured.start_time.slice(0,5)} – {featured.end_time.slice(0,5)}</span></div><p className="mt-4 text-sm text-[#37658d]">{featured.experience_title ?? (featured.block_type === "workshop" ? "Taller programado" : "Jornada de aula")}</p><h2 className="mt-1 text-2xl font-extrabold">{featured.title}</h2>{featured.purpose && <p className="mt-2 text-sm leading-relaxed text-[#526b87]">{featured.purpose}</p>}<div className="mt-5 grid gap-3 sm:grid-cols-2">{isAttendance ? <Button className="h-12" onClick={openAttendance}><Users /> {primaryLabel}</Button> : journey?.primary_action === "start_block" && featured.activity_id ? <Button className="h-12" onClick={() => void openActivity(featured, true)}><Play /> {primaryLabel}</Button> : journey?.primary_action === "continue_block" && featured.activity_id ? <Button className="h-12" onClick={() => void openActivity(featured)}><Play /> {primaryLabel}</Button> : isClosure ? <Button className="h-12" onClick={() => setClosing(true)}><CheckCircle2 /> ¿Cómo salió?</Button> : featured.activity_id ? <Button className="h-12" onClick={() => void openActivity(featured)}><Play /> Abrir actividad</Button> : <p className="rounded-xl border bg-white px-4 py-3 text-sm text-[#526b87]">Bloque sin actividad guiada.</p>}{journey?.primary_action === "continue_block" && featured.activity_id && featured.criteria.length > 0 && <Button variant="outline" className="h-12" onClick={() => openEvidence(featured)}><Camera /> Registrar evidencia</Button>}{isReadyToClose && <Button variant="outline" className="h-12" onClick={() => setClosing(true)}><CheckCircle2 /> ¿Cómo salió?</Button>}</div>{(current?.current_override || isClosure) && <Button variant="ghost" className="mt-3 h-10 text-[#126177]" onClick={() => updateExecution({ scheduleEntryId: featured.id, action: "keep_current" })}>Mantener como actual</Button>}</section>}
      <section className="diagnostic-panel p-4 md:p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Mi jornada</h2><Clock3 className="size-5 text-[#087d96]" /></div><div className="mt-3 space-y-2">{today.blocks.map((block) => <div key={block.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${block.id === featured?.id ? "border-[#bce9ee] bg-[#f0fbfc]" : "border-[#edf1f7] bg-white"}`}><span className="w-12 text-sm font-bold text-[#315575]">{block.start_time.slice(0,5)}</span><span className={`size-2.5 rounded-full ${block.display_status === "active" ? "bg-[#087d96]" : block.display_status === "ready_to_close" || block.status === "completed" ? "bg-[#b8c4d4]" : "bg-[#e6ae44]"}`} /><span className="min-w-0 flex-1 truncate font-semibold">{block.title}</span>{block.block_type === "workshop" && <span className="rounded-full bg-[#eee4ff] px-2 py-1 text-xs font-semibold text-[#7554aa]">Taller</span>}</div>)}</div></section>
      <section className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#fff8ef] p-5"><p className="text-sm font-bold">Asistencia</p><p className="mt-2 text-sm text-[#55657c]">{today.attendance.recorded ? "Registrada para hoy" : "Pendiente de registrar"}</p></div><div className="rounded-2xl bg-[#edf8f3] p-5"><p className="text-sm font-bold">Aula</p><p className="mt-2 text-sm text-[#35675f]">{dashboard?.metrics.students_observed ?? 0}/{dashboard?.metrics.students_total ?? 0} observados</p></div></section>
    </>}
    <Dialog open={closing} onOpenChange={setClosing}><DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>¿Cómo salió?</DialogTitle><DialogDescription>El cierre es opcional y no modifica la planificación sin tu confirmación.</DialogDescription></DialogHeader><div className="grid gap-3"><Button onClick={async () => { if (featured) await updateExecution({ scheduleEntryId: featured.id, action: "complete", closureType: "as_planned" }); setClosing(false); }}><CheckCircle2 /> Todo según lo previsto</Button><Textarea value={closureNote} onChange={(event) => setClosureNote(event.target.value)} placeholder="Agregar una observación breve (opcional)" className="min-h-24" /></div><DialogFooter><Button variant="ghost" onClick={() => setClosing(false)}>Cancelar</Button><Button variant="outline" disabled={!closureNote.trim()} onClick={async () => { if (featured) await updateExecution({ scheduleEntryId: featured.id, action: "complete", closureType: "note", closureNote }); setClosureNote(""); setClosing(false); }}>Guardar cierre</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Metric({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) {
  return <article className="rounded-2xl border bg-white p-5"><p className="text-sm font-medium text-muted-foreground">{label}</p><div className="mt-3 flex items-end justify-between"><p className="text-3xl font-bold">{value}</p><span className={`text-xs font-semibold ${warning ? "text-[#b96b1e]" : "text-[#087d96]"}`}>{detail}</span></div></article>;
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

function EvidenceDialog({ open, onOpenChange, students, studentId, setStudentId, criterionId, setCriterionId, criteria, observationStatus, setObservationStatus, note, setNote, photo, setPhoto, saved, saveError, saveEvidence, activityTitle, databaseConnected }: {
  open: boolean; onOpenChange: (open: boolean) => void; students: LocalStudent[]; studentId: string; setStudentId: (id: string) => void;
  criterionId: string; setCriterionId: (id: string) => void; criteria: ActivityCriterion[]; observationStatus: ObservationStatus | ""; setObservationStatus: (value: ObservationStatus) => void;
  note: string; setNote: (value: string) => void; photo: { base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; name: string } | null; setPhoto: (photo: { base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; name: string } | null) => void; saved: boolean; saveError: string; saveEvidence: (andNext?: boolean) => void;
  activityTitle: string; databaseConnected: boolean;
}) {
  const criterion = criteria.find((item) => item.id === criterionId) ?? criteria[0];
  const scopeLabel = criterion?.details?.evidence_scope === "group" ? "Grupal" : criterion?.details?.evidence_scope === "mixed" ? "Individual y grupal" : "Individual";
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="rounded-2xl p-0 sm:max-w-xl">
      <DialogHeader className="border-b px-6 py-5"><DialogTitle>Registrar evidencia</DialogTitle><DialogDescription>Actividad: {activityTitle}</DialogDescription></DialogHeader>
      <div className="space-y-5 px-6 py-1">
        {!databaseConnected && <p className="rounded-xl bg-[#fff1d6] px-4 py-3 text-sm text-[#784a17]">La base local no está iniciada. Puedes revisar el formulario, pero debes ejecutar <strong>npm run db:local</strong> para guardar.</p>}
        <fieldset><legend className="mb-2 text-sm font-semibold">¿A quién observaste?</legend><div className="flex flex-wrap gap-2">{students.map((student) => <button key={student.id} type="button" onClick={() => setStudentId(student.id)} className={`rounded-full border px-3 py-2 text-sm font-medium transition ${studentId === student.id ? "border-[#087d96] bg-[#e8f6fb] text-[#126177]" : "bg-white hover:bg-muted"}`}>{studentId === student.id && <Check className="mr-1 inline size-3.5" />}{student.name}</button>)}</div></fieldset>
        {criteria.length > 1 && <fieldset><legend className="mb-2 text-sm font-semibold">¿Qué criterio observaste?</legend><div className="space-y-2">{criteria.map((item) => <button key={item.id} type="button" onClick={() => setCriterionId(item.id)} className={`w-full rounded-xl border p-3 text-left text-sm ${criterionId === item.id ? "border-[#087d96] bg-[#e8f6fb]" : "bg-white"}`}><span className="font-semibold">{item.criterion_text}</span><span className="mt-1 block text-xs text-[#526b87]">{item.competency_text}</span></button>)}</div></fieldset>}
        {criterion && <section className="rounded-xl bg-[#edf8f3] p-4 text-sm"><p className="text-xs font-bold uppercase tracking-wider">Criterio</p><p className="font-semibold">{criterion.criterion_text}</p>{criterion.details?.expected_evidence && <><p className="mt-3 text-xs font-bold uppercase tracking-wider">Evidencia que podría verse</p><p>{criterion.details.expected_evidence}</p></>}{criterion.details?.observation_focus?.length ? <><p className="mt-3 text-xs font-bold uppercase tracking-wider">En qué fijarse</p><ul className="list-disc pl-5">{criterion.details.observation_focus.map((item) => <li key={item}>{item}</li>)}</ul></> : null}{criterion.details?.acceptable_evidence_variations?.length ? <><p className="mt-3 text-xs font-bold uppercase tracking-wider">Aceptar también</p><ul className="list-disc pl-5">{criterion.details.acceptable_evidence_variations.map((item) => <li key={item}>{item}</li>)}</ul></> : null}{criterion.details?.teacher_caution && <p className="mt-3 rounded bg-white p-2"><b>Nota pedagógica:</b> {criterion.details.teacher_caution}</p>}<p className="mt-3 text-xs">Alcance: {scopeLabel}</p>{criterion.details?.evidence_scope === "group" && <p className="mt-2 rounded bg-[#fff8ef] p-2">Esta situación fue pensada principalmente para observación grupal. Registra evidencia individual solo si observaste directamente a este niño.</p>}</section>}
        <fieldset><legend className="mb-2 text-sm font-semibold">¿Cómo mostró este criterio?</legend><div className="grid gap-2 sm:grid-cols-2">{([['demonstrated','Lo mostró'],['with_support','Lo mostró con apoyo'],['not_yet_demonstrated','Aún no se observó'],['insufficient_information','No tengo información suficiente']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => setObservationStatus(value)} className={`min-h-11 rounded-xl border px-3 text-left text-sm font-semibold ${observationStatus === value ? "border-[#087d96] bg-[#087d96] text-white" : "bg-white text-[#315a78]"}`}>{label}</button>)}</div><p className="mt-2 text-xs text-muted-foreground">Esta es una observación de esta situación, no una calificación final.</p></fieldset>
        <div><label htmlFor="evidence-note" className="mb-2 block text-sm font-semibold">Nota breve <span className="font-normal text-muted-foreground">(opcional)</span></label><Textarea id="evidence-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej.: Camila comparó dos macetas y dijo que la que estaba cerca de la ventana creció más..." className="min-h-24 resize-none" /></div>
        <div><label htmlFor="evidence-photo" className="mb-2 block text-sm font-semibold">Foto <span className="font-normal text-muted-foreground">(opcional)</span></label><input id="evidence-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="block w-full text-sm" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { setPhoto(await preparePhoto(file)); } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo preparar la foto.'); event.currentTarget.value = ''; } }} />{photo && <p className="mt-2 text-xs font-medium text-[#126177]">Foto lista: {photo.name} <button type="button" className="underline" onClick={() => setPhoto(null)}>Quitar</button></p>}<p className="mt-1 text-xs text-muted-foreground">La foto se guarda solo en este equipo y no se envía a IA.</p></div>
        {saveError && <p role="alert" className="text-sm font-medium text-destructive">{saveError}</p>}
      </div>
      <DialogFooter className="border-t px-6 py-4"><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="outline" disabled={!criterionId || !observationStatus || saved || !studentId} onClick={() => saveEvidence(true)}>Guardar y siguiente</Button><Button disabled={!criterionId || !observationStatus || saved || !studentId} onClick={() => saveEvidence()}>{saved ? <><Check /> Evidencia guardada</> : "Guardar evidencia"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function EvaluationArea({ dashboard, students }: { dashboard: LocalDashboard; students: LocalStudent[] }) {
  const [tab, setTab] = useState<"diagnostic" | "assessment" | "conclusion">("diagnostic");
  return <><div className="mb-5 flex flex-wrap gap-3">
    <Button variant={tab === "diagnostic" ? "default" : "outline"} onClick={() => setTab("diagnostic")}>Diagnóstico</Button>
    <Button variant={tab === "assessment" ? "default" : "outline"} onClick={() => setTab("assessment")}>Análisis de evidencias</Button>
    <Button variant={tab === "conclusion" ? "default" : "outline"} onClick={() => setTab("conclusion")}>Conclusiones descriptivas</Button>
  </div>{tab === "diagnostic" ? <GuidedDiagnostic dashboard={dashboard} /> : tab === "assessment" ? <AssessmentGenerator students={students} /> : <DescriptiveConclusionGenerator students={students} />}</>;
}
function PlanningArea() {
 const [tab,setTab]=useState<"annual"|"experiences"|"activities">("annual");
 return <><div className="mb-5 flex flex-wrap gap-3"><Button variant={tab==="annual"?"default":"outline"} onClick={()=>setTab("annual")}>Plan anual</Button><Button variant={tab==="experiences"?"default":"outline"} onClick={()=>setTab("experiences")}>Proyectos y unidades</Button><Button variant={tab==="activities"?"default":"outline"} onClick={()=>setTab("activities")}>Actividades</Button></div>{tab==="annual"?<AnnualPlanGenerator />:tab==="experiences"?<LearningExperienceGenerator />:<ParentActivityGenerator />}</>;
}
