"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  BookOpen, CalendarDays, Check, ChevronRight, ClipboardCheck, Database, FileText,
  Camera, CheckCircle2, Clock3, Home, Library, Menu, MessageCircle, MoreHorizontal, Plus, Search,
  Settings2, Sparkles, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  createLocalEvidence, loadLocalDashboard, type LocalDashboard, type LocalStudent,
} from "@/src/lib/local-database";
import { GuidedDiagnostic, InstitutionProfile } from "./profile-and-diagnostic";

const nav = [
  ["Hoy", Home], ["Planificar", CalendarDays], ["Niños", Users],
  ["Evaluar", ClipboardCheck], ["Documentos", FileText], ["Biblioteca", Library],
  ["Perfil", Settings2],
] as const;

const fallbackStudents: LocalStudent[] = [
  ["1", "Alessia"], ["2", "Benjamín"], ["3", "Camila"],
  ["4", "Diego"], ["5", "Emilia"], ["6", "Fabián"],
].map(([id, name]) => ({ id, name }));

export function TeacherWorkspace() {
  const [active, setActive] = useState("Hoy");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [studentId, setStudentId] = useState("3");
  const [note, setNote] = useState("");
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
        setDatabaseState("connected");
      })
      .catch(() => setDatabaseState("offline"));
    return () => controller.abort();
  }, []);

  async function saveEvidence() {
    if (!note.trim()) return;
    setSaved(true);
    setSaveError("");
    try {
      if (!dashboard) throw new Error("Inicia la base local para guardar información.");
      await createLocalEvidence({
        studentId,
        activityId: dashboard.activity.id,
        criterionId: dashboard.activity.criterion_id,
        observationText: note,
      });
      setDashboard(await loadLocalDashboard());
      window.setTimeout(() => {
        setEvidenceOpen(false);
        setSaved(false);
        setNote("");
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
    }
  }

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
            <Button variant="ghost" size="icon" aria-label="Buscar"><Search /></Button>
            <div className="grid size-9 place-items-center rounded-full bg-[#d9eaf4] text-sm font-bold text-[#155a78]">{profile?.teacher_name?.split(" ").map((part) => part[0]).slice(0, 2).join("") ?? "MR"}</div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1450px] px-4 pb-24 pt-6 md:px-7 md:pt-8">
          {active === "Perfil" ? dashboard ? <InstitutionProfile dashboard={dashboard} onSaved={setDashboard} /> : <p role={databaseState === "offline" ? "alert" : "status"} className="text-sm text-muted-foreground">{databaseState === "offline" ? "No se pudo conectar con la base local. Inicia npm run db:local y vuelve a cargar la página." : "Cargando perfil..."}</p> :
          active === "Evaluar" ? dashboard ? <GuidedDiagnostic dashboard={dashboard} /> : <p role={databaseState === "offline" ? "alert" : "status"} className="text-sm text-muted-foreground">{databaseState === "offline" ? "No se pudo conectar con la base local. Inicia npm run db:local y vuelve a cargar la página." : "Cargando evaluación diagnóstica..."}</p> : <>
          {active === "Hoy" && <TodayScreen dashboard={dashboard} openEvidence={() => setEvidenceOpen(true)} />}
          <div className={active === "Hoy" ? "hidden" : ""}>
          <section className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div><p className="mb-1 text-sm font-semibold text-[#087d96]">{active}</p><h1 className="text-3xl font-bold tracking-[-0.035em] md:text-4xl">Buenos días, profesora {profile?.teacher_name?.split(" ")[0] ?? "Marisol"}</h1><p className="mt-2 max-w-2xl text-base text-muted-foreground">Esto es lo más importante para tu jornada de hoy.</p></div>
            <Button className="h-11 rounded-xl px-5 shadow-sm"><Plus /> Nueva experiencia</Button>
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
                  <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Competencia principal</p><p className="mt-1.5 font-semibold">{activity?.competency_text ?? "Indaga mediante métodos científicos"}</p></div>
                  <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evidencia esperada</p><p className="mt-1.5 text-sm leading-relaxed">{activity?.criterion_text ?? "Explica con sus palabras qué cree que necesita una semilla."}</p></div>
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button className="h-11 flex-1 rounded-xl"><BookOpen /> Abrir actividad <ChevronRight /></Button>
                  <EvidenceDialog open={evidenceOpen} onOpenChange={closeEvidence} students={students} studentId={studentId} setStudentId={setStudentId} note={note} setNote={setNote} saved={saved} saveError={saveError} saveEvidence={saveEvidence} activityTitle={activity?.title ?? "¿Qué necesitan las plantas para crecer?"} databaseConnected={databaseState === "connected"} />
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-[#e4dff7] bg-[#f5f0ff] p-5 shadow-[0_12px_35px_rgba(36,69,112,.04)]">
                <div className="mb-4 flex items-center justify-between"><div className="grid size-10 place-items-center rounded-xl bg-[#e6dafc]"><Sparkles className="size-5 text-[#7652bc]" /></div><span className="rounded-full bg-white px-2.5 py-1 text-xs text-[#684d9c]">Sugerencia</span></div>
                <h2 className="text-xl font-bold">Tu asistente encontró una conexión</h2><p className="mt-2 text-sm leading-relaxed text-[#5e6385]">Ayer el grupo preguntó por qué algunas hojas cambian de color. Puedes retomarlo en el cierre de hoy.</p>
                <Button variant="outline" className="mt-4 w-full border-[#d9cdec] bg-white text-[#5e468f]"><MessageCircle /> Ver sugerencia</Button>
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

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-white px-2 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Navegación rápida">
          {nav.slice(0, 4).map(([label, Icon]) => <button key={label} onClick={() => setActive(label)} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${active === label ? "text-[#087d96]" : "text-muted-foreground"}`}><Icon className="size-5" /><span>{label}</span></button>)}
        </nav>
      </SidebarInset>
    </SidebarProvider>
  );
}

function TodayScreen({ dashboard, openEvidence }: { dashboard: LocalDashboard | null; openEvidence: () => void }) {
  const today = dashboard?.today;
  const active = today?.blocks.find((block) => block.status === "active");
  const next = today?.blocks.find((block) => block.status === "planned");
  const featured = active ?? next ?? today?.blocks.at(-1);
  const action = featured?.block_type === "workshop" ? "Guardar dibujo" : "Registrar evidencia";
  return <div className="mx-auto max-w-4xl space-y-5">
    <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[#087d96]">Hoy</p><h1 className="text-3xl font-extrabold tracking-tight">{today?.date ?? "Cargando día..."}</h1></div><span className="rounded-full bg-[#e8f6fb] px-3 py-2 text-sm font-semibold text-[#126177]">{dashboard?.profile.age_label} · {dashboard?.profile.section}</span></div>
    {!today?.blocks.length ? <section className="diagnostic-panel p-6"><Clock3 className="mb-3 text-[#087d96]" /><h2 className="text-xl font-bold">Configura el horario</h2><Button className="mt-4">Configurar horario</Button></section> : <>
      {featured && <section className="diagnostic-panel overflow-hidden p-5 md:p-7"><div className="flex items-center justify-between gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${featured.status === "active" ? "bg-[#d8f3f4] text-[#087d96]" : featured.status === "completed" ? "bg-[#edf1f6] text-[#66758e]" : "bg-[#fff0c7] text-[#926329]"}`}>{featured.status === "active" ? "AHORA" : featured.status === "completed" ? "REALIZADO" : "PRÓXIMO"}</span><span className="text-sm font-semibold text-[#47617f]">{featured.start_time.slice(0,5)} – {featured.end_time.slice(0,5)}</span></div><h2 className="mt-4 text-2xl font-extrabold">{featured.title}</h2>{featured.experience_title && <p className="mt-1 text-sm text-muted-foreground">{featured.experience_title}</p>}{featured.materials.length > 0 && <p className="mt-5 rounded-xl bg-[#f0f4fb] px-4 py-3 text-sm"><strong>Materiales</strong> · {featured.materials.join(" · ")}</p>}<div className="mt-5 flex flex-wrap gap-3"><Button variant="outline">Ver {featured.block_type === "workshop" ? "taller" : "actividad"}</Button>{featured.activity_id && <Button onClick={openEvidence}><Camera /> {action}</Button>}{featured.status === "completed" && <Button variant="outline"><CheckCircle2 /> ¿Cómo salió?</Button>}</div></section>}
      <section className="diagnostic-panel p-5"><h2 className="text-lg font-extrabold">Horario</h2><div className="mt-3 space-y-2">{today.blocks.map((block) => <div key={block.id} className="flex items-center gap-3 rounded-xl px-3 py-3 odd:bg-[#f7f9fc]"><span className="w-22 text-sm font-semibold text-[#47617f]">{block.start_time.slice(0,5)}</span><span className={`size-2 rounded-full ${block.status === "active" ? "bg-[#087d96]" : block.status === "completed" ? "bg-[#b8c4d4]" : "bg-[#e6ae44]"}`} /><span className="min-w-0 flex-1 truncate font-medium">{block.title}</span><span className="text-xs text-muted-foreground">{block.block_type === "workshop" ? "Taller" : ""}</span></div>)}</div></section>
      <section className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#fff8ef] p-5"><p className="text-sm font-bold">Pendientes</p><p className="mt-2 text-sm text-[#55657c]">{dashboard?.metrics.evidences_week ?? 0} evidencias esta semana</p></div><div className="rounded-2xl bg-[#edf8f3] p-5"><p className="text-sm font-bold">Aula</p><p className="mt-2 text-sm text-[#35675f]">{dashboard?.metrics.students_observed ?? 0}/{dashboard?.metrics.students_total ?? 0} observados</p></div></section>
    </>}
  </div>;
}

function Metric({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) {
  return <article className="rounded-2xl border bg-white p-5"><p className="text-sm font-medium text-muted-foreground">{label}</p><div className="mt-3 flex items-end justify-between"><p className="text-3xl font-bold">{value}</p><span className={`text-xs font-semibold ${warning ? "text-[#b96b1e]" : "text-[#087d96]"}`}>{detail}</span></div></article>;
}

function EvidenceDialog({ open, onOpenChange, students, studentId, setStudentId, note, setNote, saved, saveError, saveEvidence, activityTitle, databaseConnected }: {
  open: boolean; onOpenChange: (open: boolean) => void; students: LocalStudent[]; studentId: string; setStudentId: (id: string) => void;
  note: string; setNote: (value: string) => void; saved: boolean; saveError: string; saveEvidence: () => void;
  activityTitle: string; databaseConnected: boolean;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger asChild><Button variant="outline" className="h-11 flex-1 rounded-xl border-[#87bdcb] text-[#126177]"><ClipboardCheck /> Registrar evidencia</Button></DialogTrigger>
    <DialogContent className="rounded-2xl p-0 sm:max-w-xl">
      <DialogHeader className="border-b px-6 py-5"><DialogTitle>Registrar evidencia</DialogTitle><DialogDescription>Actividad: {activityTitle}</DialogDescription></DialogHeader>
      <div className="space-y-5 px-6 py-1">
        {!databaseConnected && <p className="rounded-xl bg-[#fff1d6] px-4 py-3 text-sm text-[#784a17]">La base local no está iniciada. Puedes revisar el formulario, pero debes ejecutar <strong>npm run db:local</strong> para guardar.</p>}
        <fieldset><legend className="mb-2 text-sm font-semibold">¿A quién observaste?</legend><div className="flex flex-wrap gap-2">{students.map((student) => <button key={student.id} type="button" onClick={() => setStudentId(student.id)} className={`rounded-full border px-3 py-2 text-sm font-medium transition ${studentId === student.id ? "border-[#087d96] bg-[#e8f6fb] text-[#126177]" : "bg-white hover:bg-muted"}`}>{studentId === student.id && <Check className="mr-1 inline size-3.5" />}{student.name}</button>)}</div></fieldset>
        <div><label htmlFor="evidence-note" className="mb-2 block text-sm font-semibold">¿Qué hizo o dijo?</label><Textarea id="evidence-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej.: Camila comparó dos macetas y dijo que la que estaba cerca de la ventana creció más..." className="min-h-28 resize-none" /><p className="mt-2 text-xs text-muted-foreground">Describe solo lo que observaste. Podrás interpretarlo después al evaluar.</p></div>
        {saveError && <p role="alert" className="text-sm font-medium text-destructive">{saveError}</p>}
      </div>
      <DialogFooter className="border-t px-6 py-4"><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={!note.trim() || saved || !studentId} onClick={saveEvidence}>{saved ? <><Check /> Evidencia guardada</> : "Guardar evidencia"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
