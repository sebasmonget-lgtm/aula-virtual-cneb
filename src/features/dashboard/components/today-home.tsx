"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Camera, Check, ClipboardCheck, Clock3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { LocalDashboard } from "@/src/lib/local-database";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { AsyncButton, WorkflowFeedback } from "./workflow-ui";

type Block = LocalDashboard["today"]["blocks"][number];
type Execution = { scheduleEntryId: string; action: "start" | "complete" | "skip" | "keep_current" | "set_step"; stepIndex?: number; closureType?: "as_planned" | "note"; closureNote?: string };

export function TodayHome({ dashboard, openEvidence, openAttendance, updateExecution, openActivity, onPlan, onPrepareActivity, onDiagnostic, onReplan }: {
  dashboard: LocalDashboard;
  openEvidence: (block: Block) => void;
  openAttendance: () => void;
  updateExecution: (input: Execution) => Promise<void>;
  openActivity: (block: Block, start?: boolean) => Promise<void>;
  onPlan: () => void;
  onPrepareActivity: () => void;
  onDiagnostic: () => void;
  onReplan: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const [selected, setSelected] = useState<Block | null>(null);
  const [closureNote, setClosureNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bimester, setBimester] = useState<{ label: string; adjusted: boolean; ready: boolean; final: boolean; closed: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/period-evaluations/workspace`, { signal: controller.signal });
      if (!response.ok) return;
      const data = await response.json() as { years: { id: string }[]; classrooms: { id: string; school_year_id: string }[];
        periods: { id: string; school_year_id: string; label: string; ends_on: string }[] };
      const classroom = data.classrooms.find((item) => item.school_year_id === data.years[0]?.id);
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const period = [...data.periods].reverse().find((item) => item.school_year_id === classroom?.school_year_id && item.ends_on < today);
      if (!classroom || !period) return;
      const review = await apiFetch(`${localDatabaseApiUrl}/api/period-evaluations/replan?classroomId=${classroom.id}&periodId=${period.id}`, { signal: controller.signal });
      if (!review.ok) return;
      const result = await review.json() as { adjusted: boolean; plan: unknown; next_period: unknown;
        closure: { closed: boolean; current: boolean }; summary: { assessments_confirmed: number; assessments_total: number } };
      if (!controller.signal.aborted && result.plan) setBimester({ label: period.label, adjusted: result.adjusted,
        final: !result.next_period, closed: result.closure.closed && result.closure.current,
        ready: result.summary.assessments_total > 0 && result.summary.assessments_confirmed === result.summary.assessments_total });
    })().catch(() => {});
    return () => controller.abort();
  }, []);
  const { today, profile, metrics } = dashboard;
  const journey = today.journey;
  const current = today.blocks.find((block) => block.id === journey.current_block_id);
  const next = today.blocks.find((block) => block.id === journey.next_block_id);
  const featured = current ?? next ?? today.blocks.at(-1);
  const greeting = Number(today.now.slice(0, 2)) < 12 ? "Buenos días" : Number(today.now.slice(0, 2)) < 19 ? "Buenas tardes" : "Buenas noches";
  const teacher = profile.teacher_name?.trim().split(/\s+/)[0] ?? "profesora";
  const canObserve = Boolean(featured?.activity_id && featured.criteria.length);
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
      if (journey.primary_action === "attendance") openAttendance();
      else if (journey.primary_action === "close_block") setClosing(true);
      else if (featured.activity_id) await openActivity(featured, journey.primary_action === "start_block");
      else setSelected(featured);
    } catch { setError("No se pudo abrir la actividad. Inténtalo de nuevo."); }
  }

  return <div className="mx-auto max-w-5xl space-y-6">
    <header><h1 className="text-3xl font-extrabold tracking-tight text-[#1c2e50]">{greeting}, {teacher}</h1><p className="mt-1 text-[#566883]">{profile.age_label} · {profile.section} · {metrics.students_total} estudiantes</p></header>
    {bimester && <section className="rounded-[1.5rem] bg-[#e9f8f2] p-5"><h2 className="text-lg font-extrabold text-[#1c2e50]">{bimester.adjusted ? "✓ Plan reajustado" : bimester.final && bimester.closed ? "✓ Período final cerrado" : `Cierre de ${bimester.label}`}</h2>
      <p className="mt-1 text-sm text-[#526681]">{bimester.adjusted ? "Tu planificación actualizada está lista para continuar." : bimester.final && bimester.closed ? "El cierre del año quedó guardado." : bimester.ready ? bimester.final ? "Tus evaluaciones están listas para cerrar el año." : "Tus evaluaciones están listas. Revisemos qué conviene ajustar para el siguiente período." : "Revisa las valoraciones pendientes para cerrar el período."}</p>
      {!bimester.adjusted && !(bimester.final && bimester.closed) && <button className="mt-3 min-h-11 rounded-xl bg-[#0b7891] px-5 font-bold text-white" onClick={onReplan}>Comenzar revisión</button>}</section>}
    {today.calendar_exception && !today.calendar_exception.is_instructional ? <section className="rounded-[1.5rem] border border-[#d4e1ed] bg-white p-5"><CalendarDays className="size-7 text-[#0b7891]" /><h2 className="mt-3 text-xl font-extrabold">{today.calendar_exception.label}</h2><p className="mt-1 text-sm text-[#566883]">Hoy no hay jornada lectiva programada.</p></section> : featured ? <section className="rounded-[1.5rem] border border-[#bce3ec] bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#0b7891] px-4 py-1 text-xs font-extrabold text-white">{current ? "AHORA" : "PRÓXIMO"}</span><span className="text-sm font-semibold text-[#566883]">{featured.start_time.slice(0, 5)} – {featured.end_time.slice(0, 5)}</span></div><h2 className="mt-5 text-2xl font-extrabold leading-tight text-[#1c2e50]">{featured.title}</h2><p className="mt-1 font-semibold text-[#07576c]">{featured.experience_title ?? (featured.block_type === "workshop" ? "Taller" : "Jornada de aula")}</p>{featured.purpose && <p className="mt-3 text-[#566883]">{featured.purpose}</p>}<div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={() => void primary()} className="min-h-12 rounded-xl bg-[#0b7891] px-3 text-sm font-bold text-white hover:bg-[#08677d]">{journey.primary_action === "attendance" ? "Marcar asistencia" : journey.primary_action === "close_block" ? "Cerrar bloque" : featured.activity_id ? "Abrir actividad" : "Ver bloque"}</button><button type="button" onClick={() => canObserve ? openEvidence(featured) : onDiagnostic()} className="min-h-12 rounded-xl border border-[#0b7891] px-3 text-sm font-bold text-[#07576c]">{canObserve ? "Registrar evidencia" : "Observar"}</button></div>{featured.status === "active" && journey.primary_action !== "close_block" && <button type="button" onClick={() => setClosing(true)} className="mt-3 min-h-11 text-sm font-bold text-[#07576c]">¿Cómo salió esta actividad? →</button>}</section> : <section className="rounded-[1.5rem] border border-[#d4e1ed] bg-white p-5"><Clock3 className="size-7 text-[#0b7891]" /><h2 className="mt-3 text-xl font-extrabold">Hoy no hay actividades programadas</h2><p className="mt-1 text-sm text-[#566883]">Puedes preparar la próxima actividad desde Planificar.</p><Button className="mt-4" onClick={onPlan}>Ir a Planificar</Button></section>}
    {error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    <section><h2 className="mb-3 text-xl font-extrabold text-[#1c2e50]">Acciones rápidas</h2><div className="grid grid-cols-3 gap-2"><button type="button" onClick={openAttendance} className="min-h-28 rounded-2xl bg-[#eaf8f2] p-3 text-left"><Users className="size-5 text-[#287561]" /><b className="mt-2 block text-sm text-[#1c2e50]">Asistencia</b><small className="mt-2 block text-[#287561]">{today.attendance.recorded_count}/{metrics.students_total} registrados</small></button><button type="button" onClick={() => canObserve && featured ? openEvidence(featured) : onDiagnostic()} className="min-h-28 rounded-2xl bg-[#fff4df] p-3 text-left"><ClipboardCheck className="size-5 text-[#a16917]" /><b className="mt-2 block text-sm text-[#1c2e50]">Observar</b><small className="mt-2 block text-[#926329]">{canObserve ? "Anotar evidencia" : "Anotar observación"}</small></button><button type="button" onClick={() => canObserve && featured ? openEvidence(featured) : onPrepareActivity()} className="min-h-28 rounded-2xl bg-[#f1eaff] p-3 text-left"><Camera className="size-5 text-[#7952b8]" /><b className="mt-2 block text-sm text-[#1c2e50]">Foto</b><small className="mt-2 block text-[#7952b8]">{canObserve ? "Adjuntar evidencia" : "Preparar actividad"}</small></button></div></section>
    {today.blocks.length > 0 && <section><h2 className="mb-3 text-xl font-extrabold text-[#1c2e50]">Tu jornada</h2><div className="space-y-2">{today.blocks.map((block) => <button key={block.id} type="button" onClick={() => block.activity_id ? void openActivity(block).catch(() => setError("No se pudo abrir la actividad.")) : setSelected(block)} className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-[#d4e1ed] bg-white p-4 text-left hover:border-[#8acbd8]"><span className="w-12 shrink-0 text-sm font-bold text-[#566883]">{block.start_time.slice(0, 5)}</span><span className="grid size-6 shrink-0 place-items-center text-[#0b7891]">{block.status === "completed" ? <Check className="size-4" /> : <Clock3 className="size-4" />}</span><span className="min-w-0 flex-1 truncate font-bold text-[#1c2e50]">{block.title}</span><span className="shrink-0 text-xs font-bold text-[#07576c]">{status(block)}</span></button>)}</div></section>}
    <aside className="rounded-[1.4rem] bg-[#edf9f5] p-5"><h2 className="font-extrabold text-[#286c5c]">Ayni te sugiere</h2><p className="mt-1 text-sm text-[#566883]">{metrics.students_total - metrics.students_observed > 0 ? `${metrics.students_total - metrics.students_observed} niños aún no tienen evidencias registradas. Puedes seguir observando durante las actividades.` : "Todos los niños tienen al menos una evidencia registrada. Sigue observando según lo que ocurra en el aula."}</p></aside>
    <Dialog open={closing} onOpenChange={setClosing}><DialogContent><DialogHeader><DialogTitle>¿Cómo salió?</DialogTitle><DialogDescription>El cierre queda guardado solo cuando tú lo confirmas.</DialogDescription></DialogHeader><Textarea value={closureNote} onChange={(event) => setClosureNote(event.target.value)} placeholder="Una nota breve, si la necesitas" />{error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}<DialogFooter><Button variant="outline" onClick={() => setClosing(false)}>Cancelar</Button><AsyncButton busy={busy} busyLabel="Guardando..." onClick={() => void complete()}>Guardar cierre</AsyncButton></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>{selected ? `${selected.start_time.slice(0, 5)} – ${selected.end_time.slice(0, 5)}` : ""}</DialogDescription></DialogHeader>{selected?.purpose && <p className="text-sm text-[#566883]">{selected.purpose}</p>}{selected?.materials?.length ? <p className="text-sm"><b>Materiales:</b> {selected.materials.join(", ")}</p> : null}<DialogFooter><Button onClick={() => setSelected(null)}>Cerrar</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
