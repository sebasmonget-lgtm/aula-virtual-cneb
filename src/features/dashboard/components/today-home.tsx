"use client";
import { newAyniFeatureEnabled } from "@/src/lib/new-ayni-feature-flag.mjs";


import { useEffect, useState } from "react";
import { Check, Clock3, Users, MoonStar, Sun, Sunrise, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { LocalDashboard } from "@/src/lib/local-database";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { displayDate } from "@/src/lib/display-date";
import { AsyncButton, WorkflowFeedback } from "./workflow-ui";
import { PastActivityReview } from "./past-activity-review";
import { ProjectActivitiesBrowser } from "./project-activities-browser";
import {TodayEmptyState} from "./today-empty-state";
import {teacherGreeting} from "@/src/lib/daily-dashboard-display.mjs";
import overview from "./daily-overview.module.css";
import {WorkshopLibrary} from './workshop-library';

type Block = LocalDashboard["today"]["blocks"][number];
type Execution = { scheduleEntryId: string; action: "start" | "complete" | "skip" | "keep_current" | "set_step"; stepIndex?: number; closureType?: "as_planned" | "note"; closureNote?: string };

export function TodayHome({ dashboard, refreshKey = 0, onCalendar, onConsultActivity, openEvidence, openAttendance, updateExecution, openActivity, onPlan, onPrepareActivity, onObserveWithoutActivity, onReplan, onReviewObservations,onActivitiesChanged }: {
  dashboard: LocalDashboard;
  refreshKey?: number;
  openEvidence: (block: Block) => void;
  openAttendance: () => void;
  updateExecution: (input: Execution) => Promise<void>;
  openActivity: (block: Block, start?: boolean) => Promise<void>;
  onPlan: (proposalId?:string) => void;
  onCalendar:()=>void;
  onConsultActivity:(id:string)=>void;
  onPrepareActivity: () => void;
  onObserveWithoutActivity: () => void;
  onReplan: () => void;
  onReviewObservations?: () => void;
  onActivitiesChanged?:()=>Promise<void>;
}) {
  const [clock,setClock]=useState(()=>new Date());
  const [choosingWorkshop,setChoosingWorkshop]=useState(false);
  const [upcomingPeriod,setUpcomingPeriod]=useState<{label:string;starts_on:string;ends_on:string}|null>(null);
  useEffect(()=>{const update=()=>setClock(new Date());const timer=window.setInterval(update,60000);document.addEventListener("visibilitychange",update);return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",update);};},[]);
  const modern=process.env.NEXT_PUBLIC_AYNI_EXPERIENCE!=="0";
  const [closing, setClosing] = useState(false);
  const [selected, setSelected] = useState<Block | null>(null);
  const [closureNote, setClosureNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bimester, setBimester] = useState<{ label: string; adjusted: boolean; ready: boolean; final: boolean; closed: boolean } | null>(null);
  const [teacherTasks, setTeacherTasks] = useState<{ pending_observation_count: number;
    next_activity: { date: string; title: string } | null; actions: { id: string; label: string }[] } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/period-evaluations/workspace`, { signal: controller.signal });
      if (!response.ok) return;
      const data = await response.json() as { today: string; years: { id: string }[]; classrooms: { id: string; school_year_id: string }[];
        periods: { id: string; school_year_id: string; label: string; starts_on:string;ends_on: string }[] };
      const classroom = data.classrooms.find((item) => item.school_year_id === data.years[0]?.id);
      const today = data.today;
      if(!controller.signal.aborted)setUpcomingPeriod(data.periods.filter(item=>item.school_year_id===classroom?.school_year_id&&item.starts_on>today).sort((a,b)=>a.starts_on.localeCompare(b.starts_on))[0]??null);
      const period = [...data.periods].reverse().find((item) => item.school_year_id === classroom?.school_year_id && item.ends_on < today);
      if (!classroom || !period) { if (!controller.signal.aborted) setBimester(null); return; }
      if(modern){if(!controller.signal.aborted)setBimester({label:period.label,adjusted:false,ready:false,final:false,closed:false});return;}
      const review = await apiFetch(`${localDatabaseApiUrl}/api/period-evaluations/replan?classroomId=${classroom.id}&periodId=${period.id}`, { signal: controller.signal });
      if (!review.ok) return;
      const result = await review.json() as { adjusted: boolean; plan: unknown; next_period: unknown;
        closure: { closed: boolean; current: boolean }; summary: { assessments_confirmed: number; assessments_total: number } };
      if (!controller.signal.aborted && result.plan) setBimester({ label: period.label, adjusted: result.adjusted,
        final: !result.next_period, closed: result.closure.closed && result.closure.current,
        ready: result.summary.assessments_total > 0 && result.summary.assessments_confirmed === result.summary.assessments_total });
    })().catch(() => {});
    return () => controller.abort();
  }, [modern, dashboard.today.date, refreshKey]);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_AYNI_F7_NAV !== "1") return;
    const controller = new AbortController();
    void apiFetch(`${localDatabaseApiUrl}/api/teacher/today`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("Hoy no disponible"); return await response.json() as {
        pending_observation_count: number; next_activity: { date: string; title: string } | null;
        actions: { id: string; label: string }[] }; })
      .then(data => { if (!controller.signal.aborted) setTeacherTasks(data); })
      .catch(() => {});
    return () => controller.abort();
  }, [dashboard.today.date, refreshKey]);
  const { today, profile, metrics } = dashboard;
  const journey = today.journey;
  const current = today.blocks.find((block) => block.id === journey.current_block_id);
  const next = today.blocks.find((block) => block.id === journey.next_block_id);
  const featured = current ?? next ?? today.blocks.at(-1);
  const greeting=teacherGreeting(clock);
  const GreetingIcon=greeting.period==="night"?MoonStar:greeting.period==="morning"?Sunrise:Sun;
  const emptyToday=!featured||!!today.calendar_exception&&!today.calendar_exception.is_instructional&&!today.blocks.some(block=>block.status==="active");
  const teacher = profile.teacher_name?.trim().split(/\s+/)[0] || "profesora";
  const canObserve = Boolean(featured?.activity_id && featured.criteria.length);
  const canObserveWithoutActivity = newAyniFeatureEnabled(process.env.NEXT_PUBLIC_AYNI_ORDINARY_OBSERVATIONS);
  const observe = () => canObserve && featured ? openEvidence(featured) : onObserveWithoutActivity();
  const status = (block: Block) => block.status === "completed" ? "Listo" : block.id === current?.id ? "Ahora" : block.display_status === "ready_to_close" ? "Por cerrar" : "Después";

  async function complete() {
    if (!featured || busy) return;
    setBusy(true); setError("");
    try { await updateExecution({ scheduleEntryId: featured.id, action: "complete", closureType: closureNote.trim() ? "note" : "as_planned", closureNote: closureNote.trim() || undefined }); setClosing(false); setClosureNote(""); }
    catch { setError("No se pudo guardar el cierre. Vuelve a intentarlo."); }
    finally { setBusy(false); }
  }
  async function primary() {
    if (!featured) return;
    setError("");
    try {
      if (journey.primary_action === "close_block") setClosing(true);
      else if(featured.block_type==='workshop'&&!featured.pedagogical_blocks?.length)setSelected(featured);
      else if (featured.activity_id) await openActivity(featured, journey.primary_action === "start_block");
      else setSelected(featured);
    } catch { setError("No se pudo abrir la actividad. Inténtalo de nuevo."); }
  }

  if(choosingWorkshop&&profile.classroom_id)return <WorkshopLibrary classroomId={profile.classroom_id} onBack={()=>setChoosingWorkshop(false)} onOpen={id=>{setChoosingWorkshop(false);onConsultActivity(id);}} onAdded={async id=>{await onActivitiesChanged?.();setChoosingWorkshop(false);onConsultActivity(id);}}/>;
  return <div className="mx-auto max-w-5xl space-y-6">
    <header className={overview.todayHeader}><div><div className={overview.greeting}><h1>{greeting.text}, {teacher}</h1><GreetingIcon aria-hidden="true" className={overview.greetingIcon}/></div><p className="mt-2 text-[#526b87]">{profile.age_label} · {profile.section} · {metrics.students_total} estudiantes</p></div><section className={overview.attendance} aria-label="Asistencia opcional"><Users aria-hidden="true"/><div><strong>Asistencia</strong><p>Opcional · {today.attendance.recorded_count} de {metrics.students_total} registrados</p></div><Button onClick={openAttendance}>Tomar asistencia</Button></section></header>
    {profile.classroom_id&&<section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#c9e4df] bg-[#eef8f2] p-5"><div><h2 className="text-lg font-extrabold text-[#172b52]">Talleres para tu aula</h2><p className="mt-1 text-sm text-[#365b73]">Elige por edad, tipo o competencia y añádelo a una jornada.</p></div><Button onClick={()=>setChoosingWorkshop(true)}><BookOpen size={19}/>Elegir taller</Button></section>}
    {modern&&!emptyToday&&bimester&&<div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#526b87]"><span>{bimester.label} terminó. Puedes consultar lo que viene.</span><Button variant="ghost" onClick={()=>onPlan()}>Ir a Mi año</Button></div>}
    {!modern&&bimester && <section className="rounded-[1.5rem] bg-[#e9f8f2] p-5"><h2 className="text-lg font-extrabold text-[#1c2e50]">{bimester.adjusted ? "✓ Plan reajustado" : bimester.final && bimester.closed ? "✓ Período final cerrado" : `Cierre de ${bimester.label}`}</h2>
      <p className="mt-1 text-sm text-[#526681]">{bimester.adjusted ? "Tu planificación actualizada está lista para continuar." : bimester.final && bimester.closed ? "El cierre del año quedó guardado." : bimester.ready ? bimester.final ? "Tus evaluaciones están listas para cerrar el año." : "Tus evaluaciones están listas. Revisemos qué conviene ajustar para el siguiente período." : "Revisa las valoraciones pendientes para cerrar el período."}</p>
      {!bimester.adjusted && !(bimester.final && bimester.closed) && <button className="mt-3 min-h-11 rounded-xl bg-[#0b7891] px-5 font-bold text-white" onClick={onReplan}>Comenzar revisión</button>}</section>}
    {emptyToday ? <TodayEmptyState today={today.date} reason={today.calendar_exception?.label.includes('gestión')?'Estás en semana de gestión.':today.calendar_exception?.label} onPlan={onPlan} onCalendar={onCalendar} onActivity={onConsultActivity} onObserve={canObserveWithoutActivity?onObserveWithoutActivity:undefined} plannedActivity={featured?.activity_id&&featured.status==='planned'?{id:featured.activity_id,title:featured.title}:undefined} period={upcomingPeriod}/> : featured ? <section className="rounded-[1.5rem] border border-[#bce3ec] bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#0b7891] px-4 py-1 text-xs font-extrabold text-white">{current ? "AHORA" : "PRÓXIMO"}</span><span className="text-sm font-semibold text-[#566883]">{featured.start_time.slice(0, 5)} – {featured.end_time.slice(0, 5)}</span></div><h2 className="mt-5 text-2xl font-extrabold leading-tight text-[#1c2e50]">{featured.title}</h2><p className="mt-1 font-semibold text-[#07576c]">{featured.block_type === "workshop" ? `Taller del día · ${featured.activity_details?.workshop_type ?? ""}` : featured.experience_title ?? "Jornada de aula"}</p>{featured.purpose && <p className="mt-3 text-[#566883]">{featured.purpose}</p>}<div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={() => void primary()} className="min-h-12 rounded-xl bg-[#0b7891] px-3 text-sm font-bold text-white hover:bg-[#08677d]">{journey.primary_action === "close_block" ? "Cerrar bloque" : featured.block_type === "workshop" ? "Ver taller" : featured.activity_id ? "Abrir actividad" : "Ver bloque"}</button><button type="button" onClick={observe} className="min-h-12 rounded-xl border border-[#0b7891] px-3 text-sm font-bold text-[#07576c]">{canObserve ? "Registrar evidencia" : canObserveWithoutActivity ? "Registrar observación" : "Preparar actividad"}</button></div>{featured.status === "active" && journey.primary_action !== "close_block" && <button type="button" onClick={() => setClosing(true)} className="mt-3 min-h-11 text-sm font-bold text-[#07576c]">¿Cómo salió esta actividad? →</button>}</section> : null}
    {onActivitiesChanged&&<PastActivityReview items={today.past_pending??[]} onSaved={onActivitiesChanged}/>}
    {!emptyToday&&featured?.activity_id&&modern&&<Button variant="outline" onClick={()=>void openActivity(featured,false).catch(()=>setError("No se pudo abrir la actividad. Inténtalo de nuevo."))}>Abrir actividad prevista</Button>}
    {!emptyToday&&featured?.activity_id&&featured.block_type!=="workshop"&&onActivitiesChanged&&process.env.NEXT_PUBLIC_AYNI_EXPERIENCE!=="0"&&<ProjectActivitiesBrowser key={featured.activity_id} activityId={featured.activity_id} today={today.date} onChanged={onActivitiesChanged}/>}
    {error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {teacherTasks && <section className="rounded-[1.5rem] border border-[#d4e1ed] bg-white p-5" aria-label="Para tener presente">
      <h2 className="text-xl font-extrabold text-[#1c2e50]">Para tener presente</h2>
      {teacherTasks.actions.length ? <div className="mt-3 space-y-2">{teacherTasks.actions.map(action =>
        <button key={action.id} type="button" onClick={() => action.id === "review_observations" ? onReviewObservations?.()
          : action.id === "review_period" ? onPlan() : onPrepareActivity()}
          className="block min-h-11 w-full rounded-xl border border-[#cbdbe8] px-4 py-2 text-left font-semibold text-[#07576c] hover:bg-[#e8f7fa]">
          {action.label}{action.id === "prepare_activity" && teacherTasks.next_activity
            ? ` · ${teacherTasks.next_activity.title} (${displayDate(teacherTasks.next_activity.date)})` : ""} →</button>)}</div>
        : <p className="mt-2 text-sm text-[#566883]">No hay tareas adicionales por revisar ahora.</p>}
    </section>}
    <div className="flex flex-wrap gap-3">{!emptyToday&&canObserve&&canObserveWithoutActivity&&<Button variant="ghost" className="min-h-11" onClick={onObserveWithoutActivity}>Registrar otra observación cotidiana</Button>}</div>
    {today.blocks.length > 0 && <section><h2 className="mb-3 text-xl font-extrabold text-[#1c2e50]">Tu jornada</h2><div className="space-y-2">{today.blocks.map((block) => <button key={block.id} type="button" onClick={() => block.block_type==='workshop'&&!block.pedagogical_blocks?.length?setSelected(block):block.activity_id ? void openActivity(block).catch(() => setError("No se pudo abrir la actividad.")) : setSelected(block)} className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-[#d4e1ed] bg-white p-4 text-left hover:border-[#8acbd8]"><span className="w-12 shrink-0 text-sm font-bold text-[#566883]">{block.start_time.slice(0, 5)}</span><span className="grid size-6 shrink-0 place-items-center text-[#0b7891]">{block.status === "completed" ? <Check className="size-4" /> : <Clock3 className="size-4" />}</span><span className="min-w-0 flex-1 truncate font-bold text-[#1c2e50]">{block.block_type === "workshop" ? "Taller · " : ""}{block.title}</span><span className="shrink-0 text-xs font-bold text-[#07576c]">{status(block)}</span></button>)}</div></section>}
    <Dialog open={closing} onOpenChange={setClosing}><DialogContent><DialogHeader><DialogTitle>¿Cómo salió?</DialogTitle><DialogDescription>El cierre queda guardado solo cuando tú lo confirmas.</DialogDescription></DialogHeader><Textarea value={closureNote} onChange={(event) => setClosureNote(event.target.value)} placeholder="Una nota breve, si la necesitas" />{error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}<DialogFooter><Button variant="outline" onClick={() => setClosing(false)}>Cancelar</Button><AsyncButton busy={busy} busyLabel="Guardando..." onClick={() => void complete()}>Guardar cierre</AsyncButton></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>{selected ? `${selected.start_time.slice(0, 5)} – ${selected.end_time.slice(0, 5)}` : ""}</DialogDescription></DialogHeader>{selected?.purpose && <p className="text-sm text-[#566883]">{selected.purpose}</p>}{selected?.block_type === "workshop" && <div className="space-y-2 text-sm">{([ ["opening","Inicio"], ["development","Desarrollo"], ["closure","Cierre"] ] as const).map(([field,label]) => selected.activity_details?.[field] ? <p key={field}><b>{label}:</b> {selected.activity_details[field]}</p> : null)}</div>}{selected?.materials?.length ? <p className="text-sm"><b>Materiales:</b> {selected.materials.join(", ")}</p> : null}<DialogFooter><Button onClick={() => setSelected(null)}>Cerrar</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
