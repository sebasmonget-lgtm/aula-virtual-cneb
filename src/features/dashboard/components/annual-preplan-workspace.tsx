"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { List, LayoutGrid, RotateCcw } from "lucide-react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { buildAnnualCompetencyMap } from "@/src/lib/annual-competency-map.mjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AsyncButton, CompetencyChecklist, GenerationProgress, LoadingState, WorkflowFeedback } from "./workflow-ui";
import { AnnualPlanGenerator as LegacyAnnualPlanGenerator } from "./annual-plan-generator";
import { AnnualPersonalizationWorkspace } from "./annual-personalization-workspace";
import { AnnualYearMap } from "./annual-year-map";
import { buildEditableAnnualSchedule } from "@/src/lib/annual-plan-calendar.mjs";
import { insertAvailableAnnualRow, moveAnnualRow } from "@/src/lib/annual-year-map.mjs";
import { canLeaveWorkspace, useWorkspaceSubview, writeWorkspaceLocation } from "@/src/lib/workspace-location";
import { teacherIdeaPlacements } from "@/src/lib/annual-planning-preferences.mjs";
import { ideaMonths, type PlanningPreferences } from "./annual-teacher-ideas";

type Row = { proposal_id: string; experience_type: "project" | "unit"; title: string; period: string;
  month: number; duration_weeks: 2 | 3; rationale: string; purpose: string; primary_competency_ids: string[];
  source_interest_ids?: string[]; source_priority_ids?: string[]; source_context_ids?: string[];
  source_condition_ids?: string[]; source_teacher_decision?: boolean; source_group_profile?: boolean;
  source_teacher_idea_ids?: string[]; planning_origin?: "diagnosis" | "teacher_idea" | "calendar" | "teacher_decision";
  planned_start_date?: string; planned_end_date?: string; planned_instructional_days?: number };
type Preplan = { plan_format: "annual_preplan_v1"; title: string; school_year: string; proposed_experiences: Row[];
  planning_preferences?: PlanningPreferences; teacher_idea_feedback?: { idea_id: string; explanation: string }[];
  available_experiences?: Row[] };
type Plan = { id: string; version: number; revision: number; status: "draft" | "active" | "archived";
  proposal: Preplan | { plan_format?: string }; formal_ready?: boolean; supersedes_plan_id?: string | null;
  adjustment_label?: string | null; project_slots?: { slot_index: number; starts_on: string; ends_on: string; duration_weeks: number; proposal_id?: string }[] };
type Plans = { draft: Plan | null; active: Plan | null; archived: Plan[] };
type Block = { id?: string; type: string; label: string; start_date: string; end_date: string; editable: boolean; sort_order: number };
type Calendar = { school_year: number; blocks: Block[]; initial_stage: { duration_weeks: number } & Record<string, unknown>;
  exceptions?: { exception_date: string; is_instructional: boolean }[] };
type EffectiveCalendar = { days: { date: string; calendar_type: string; reason: string; is_instructional: boolean }[];
  blocks: Block[] };
type Context = { year: number; age: number; section: string; institution_name?: string; group_context?: string;
  diagnostic_group?: { strengths: string; needs: string; planning_priorities: string };
  confirmed_priorities?: { title: string; reason: string; importance: string; related_competency_ids: string[] }[];
  source_priority_review_id?: string | null; annual_planning_context?: { additional_notes?: string };
  context_v4?: { common_interests?: { label: string }[] }; calendar: Calendar };
type Competency = { id: string; name: string; has_age_performance?: boolean };
const months = ["", "", "", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const annualViews = ["map", "list"] as const;
const api = (path: string) => `${localDatabaseApiUrl}${path}`;
async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(api(path), init);
  const data = await response.json() as T & { error?: string; message?: string };
  if (!response.ok) throw new Error(data.message || data.error || "No pudimos completar la acción.");
  return data;
}
const body = (value: unknown): RequestInit => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
const monthLabel = (value: number) => months[value] ?? "Mes por definir";
const compactDate = (value: string) => new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "UTC" })
  .format(new Date(`${value}T00:00:00Z`));
const isPreplan = (plan: Plan | null | undefined): plan is Plan & { proposal: Preplan } => plan?.proposal?.plan_format === "annual_preplan_v1";

function PreplanTable({ rows, options, calendar, editable, onChange, onDevelop, editRequestId, onRetire, readOnlyLabel = "Confirmada", editorOnly = false, returnFocusRef, onEditorClose }: { rows: Row[]; options: Competency[]; calendar?: Calendar;
  editable: boolean; onChange: (rows: Row[]) => void; onDevelop?: (proposalId: string) => void;
  editRequestId?: string | null; onRetire?: (proposalId: string) => void; readOnlyLabel?: string; editorOnly?: boolean;
  returnFocusRef: RefObject<HTMLElement | null>; onEditorClose: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(editRequestId ?? null);
  const titleRef = useRef<HTMLInputElement>(null);
  const closeEditor = () => { setEditingId(null); onEditorClose(); };
  const editingIndex = rows.findIndex((item) => item.proposal_id === editingId);
  const editing = editingIndex < 0 ? null : rows[editingIndex];
  const tableSchedule = (() => { if (!calendar || !editable) return [];
    try { return buildEditableAnnualSchedule(calendar, rows).projects; } catch { return []; } })();
  const names = new Map(options.map((item) => [item.id, item.name]));
  const patch = (change: Partial<Row>) => editing && onChange(rows.map((item) => {
    if (item.proposal_id !== editing.proposal_id) return item;
    const material = ["title", "purpose", "primary_competency_ids", "rationale"].some((key) => key in change);
    if (!material) return { ...item, ...change };
    return { ...item, ...change, source_interest_ids: [], source_priority_ids: [], source_context_ids: [],
      source_condition_ids: [], source_group_profile: false, source_teacher_decision: true, planning_origin: "teacher_decision",
      rationale: "rationale" in change ? change.rationale ?? "" : item.source_teacher_decision
        ? item.rationale : "Ajuste de la docente sobre la propuesta inicial." };
  }));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    onChange(moveAnnualRow(rows, index, target));
  };
  return <><section hidden={editorOnly} className="space-y-4 rounded-2xl border border-[#d6e5ef] bg-white p-4 sm:p-5">
    <div><h2 className="text-xl font-extrabold text-[#172b52]">Lista de proyectos y unidades</h2>
      <p className="mt-1 text-sm text-[#526b87]">Propuestas de la versión seleccionada, en el mismo orden del mapa.</p></div>
    <div className="space-y-3 md:hidden">{rows.map((row, index) => <article key={row.proposal_id} className="rounded-xl border p-4">
      <p className="text-sm font-semibold text-[#087d96]">{String(index + 1).padStart(2, "0")} · {row.experience_type === "unit" ? "Unidad" : "Proyecto"}</p>
      <h3 className="mt-1 break-words text-base font-bold">{row.title || "Propuesta sin título"}</h3>
      <p className="mt-2 text-sm text-[#526b87]">{(tableSchedule[index] || (row.planned_start_date && row.planned_end_date))
        ? `${compactDate(tableSchedule[index]?.starts_on ?? row.planned_start_date ?? "")}–${compactDate(tableSchedule[index]?.ends_on ?? row.planned_end_date ?? "")}`
        : monthLabel(row.month)} · {row.duration_weeks} semanas · {row.period}</p>
      <div className="mt-3 flex flex-wrap gap-2">{editable ? <>
        <Button variant="outline" className="min-h-11" onClick={(event) => { returnFocusRef.current = event.currentTarget; setEditingId(row.proposal_id); }}>Editar</Button>
        <Button variant="ghost" className="min-h-11 min-w-11" aria-label={`Subir ${row.title}`} disabled={index === 0} onClick={() => move(index, -1)}>↑</Button>
        <Button variant="ghost" className="min-h-11 min-w-11" aria-label={`Bajar ${row.title}`} disabled={index === rows.length - 1} onClick={() => move(index, 1)}>↓</Button>
      </> : onDevelop ? <Button variant="outline" className="min-h-11" onClick={() => onDevelop(row.proposal_id)}>Desarrollar</Button> : <span className="text-sm">{readOnlyLabel}</span>}</div>
      <details className="mt-2 text-sm"><summary className="min-h-11 cursor-pointer py-3 font-semibold text-[#087d96]">Propósito, procedencia y competencias</summary>
        <p>{row.purpose}</p><p className="mt-2">{row.rationale}</p>{row.source_teacher_decision && <p className="mt-2">Propuesta ajustada o añadida por la docente.</p>}
        <p className="mt-2">{row.primary_competency_ids.map((id) => names.get(id) ?? id).join(" · ")}</p>
      </details>
    </article>)}</div>
    <div className="hidden overflow-x-auto rounded-xl border border-[#dce8f0] md:block"><table className="w-full min-w-[900px] border-collapse text-left text-sm">
      <thead className="bg-[#edf5fa] text-[#173352]"><tr>{["Proyecto / unidad", "Mes y duración", "¿Por qué?", "Competencias previstas", "Acción"].map((label) =>
        <th key={label} scope="col" className={`border-b border-[#dce8f0] px-4 py-3 font-bold ${label === "Acción" ? "sticky right-0 z-10 bg-[#edf5fa]" : ""}`}>{label}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.proposal_id} className="group h-20 border-b border-[#e3edf4] align-top even:bg-[#f9fcfe]">
        <td className="min-w-56 px-4 py-4"><span className="mr-2 rounded-md bg-[#e8f6fa] px-2 py-1 text-xs font-bold text-[#087d96]">{String(index + 1).padStart(2, "0")}</span><b>{row.title || "Propuesta sin título"}</b><p className="mt-1 text-xs text-[#526b87]">{row.experience_type === "unit" ? "Unidad" : "Proyecto"}</p></td>
        <td className="min-w-40 px-4 py-4">{(tableSchedule[index] || (row.planned_start_date && row.planned_end_date))
          ? <>{compactDate(tableSchedule[index]?.starts_on ?? row.planned_start_date ?? "") }–{compactDate(tableSchedule[index]?.ends_on ?? row.planned_end_date ?? "") }<p className="mt-1 text-xs text-[#526b87]">{row.planned_instructional_days ?? `${row.duration_weeks} semanas`} · {row.period}</p></>
          : <>{monthLabel(row.month)} · {row.duration_weeks} semanas<p className="mt-1 text-xs text-[#526b87]">{row.period}</p></>}</td>
        <td className="min-w-56 px-4 py-4 leading-relaxed"><details><summary className="cursor-pointer font-semibold text-[#087d96]">¿Por qué está en Mi año?</summary>
          <p className="mt-2">{row.rationale}</p>{row.source_teacher_decision && <p className="mt-1 text-xs">Propuesta ajustada o añadida por la docente.</p>}</details></td>
        <td className="min-w-56 px-4 py-4">{row.primary_competency_ids.map((id) => names.get(id) ?? id).join(" · ")}</td>
        <td className="sticky right-0 z-10 bg-white px-4 py-3 shadow-[-1px_0_0_#e3edf4] group-even:bg-[#f9fcfe]"><div className="flex flex-wrap gap-1">{editable && <><Button type="button" variant="outline" className="min-h-10" onClick={(event) => { returnFocusRef.current = event.currentTarget; setEditingId(row.proposal_id); }}>Editar</Button>
          <Button type="button" variant="ghost" size="sm" aria-label={`Subir ${row.title}`} disabled={index === 0} onClick={() => move(index, -1)}>↑</Button>
          <Button type="button" variant="ghost" size="sm" aria-label={`Bajar ${row.title}`} disabled={index === rows.length - 1} onClick={() => move(index, 1)}>↓</Button></>}
          {!editable && (onDevelop ? <Button type="button" variant="outline" className="min-h-10" onClick={() => onDevelop(row.proposal_id)}>Desarrollar</Button>
            : <span className="text-xs text-[#526b87]">{readOnlyLabel}</span>)}</div></td>
      </tr>)}</tbody></table></div>
    {editable && <div className="flex flex-wrap items-center justify-between gap-3"><Button type="button" variant="outline" className="min-h-11" disabled={rows.length >= 20}
      onClick={(event) => { returnFocusRef.current = event.currentTarget; const last = rows.at(-1); const created: Row = { proposal_id: crypto.randomUUID(), experience_type: "project", title: "",
        period: last?.period ?? "Bimestre 1", month: last?.month ?? 3, duration_weeks: 2, rationale: "", purpose: "", primary_competency_ids: [],
        source_interest_ids: [], source_priority_ids: [], source_context_ids: [], source_condition_ids: [], source_teacher_decision: true, planning_origin: "teacher_decision" };
        onChange([...rows, created]); setEditingId(created.proposal_id); }}>+ Agregar propuesta manual</Button>
      <p className="text-sm text-[#526b87]">Puedes editar, mover, eliminar o agregar propuestas. Al mover una, adopta el mes y la duración de ese lugar. Máximo 20 por la plantilla Word.</p></div>}
    </section><Dialog open={Boolean(editable && editing)} onOpenChange={(open) => { if (!open) closeEditor(); }}>
      {editing && <DialogContent showCloseButton={false} aria-describedby={undefined}
        className="inset-y-0 left-auto right-0 block h-full max-h-none w-full max-w-xl translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0 bg-white p-5 shadow-2xl sm:max-w-xl sm:p-7"
        onOpenAutoFocus={(event) => { event.preventDefault(); titleRef.current?.focus(); }}
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocusRef.current?.focus(); }}>
        <div className="flex items-center justify-between gap-3"><DialogTitle className="text-xl font-extrabold">Editar propuesta {editingIndex + 1}</DialogTitle><Button type="button" variant="outline" onClick={closeEditor}>Cerrar</Button></div>
        <div className="mt-5 space-y-4"><label className="block font-semibold">Proyecto o unidad<select className="mt-2 min-h-11 w-full rounded-lg border px-3" value={editing.experience_type} onChange={(event) => patch({ experience_type: event.target.value as Row["experience_type"] })}><option value="project">Proyecto</option><option value="unit">Unidad</option></select></label>
          <label className="block font-semibold">Título<Input ref={titleRef} className="mt-2" value={editing.title} onChange={(event) => patch({ title: event.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3"><label className="block font-semibold">Bimestre<select className="mt-2 min-h-11 w-full rounded-lg border px-3" value={editing.period} onChange={(event) => patch({ period: event.target.value })}>{[1,2,3,4].map((number) => <option key={number} value={`Bimestre ${number}`}>Bimestre {number}</option>)}</select></label>
            <label className="block font-semibold">Mes preferido<select className="mt-2 min-h-11 w-full rounded-lg border px-3" value={editing.month} onChange={(event) => patch({ month: Number(event.target.value) })}>{months.slice(3).map((label, index) => <option key={label} value={index + 3}>{label}</option>)}</select></label></div>
          <label className="block font-semibold">Duración<select className="mt-2 min-h-11 w-full rounded-lg border px-3" value={editing.duration_weeks} onChange={(event) => patch({ duration_weeks: Number(event.target.value) as 2 | 3 })}><option value={2}>2 semanas lectivas</option><option value={3}>3 semanas lectivas</option></select></label>
          <label className="block font-semibold">¿Por qué se propone?<Textarea className="mt-2" value={editing.rationale} onChange={(event) => patch({ rationale: event.target.value })} /></label>
          <label className="block font-semibold">Propósito breve<Textarea className="mt-2" value={editing.purpose} onChange={(event) => patch({ purpose: event.target.value })} /></label>
          <CompetencyChecklist label="Competencias previstas" value={editing.primary_competency_ids} options={options} onChange={(primary_competency_ids) => patch({ primary_competency_ids })} />
          <div className="flex flex-wrap gap-2"><Button type="button" onClick={closeEditor}>Listo</Button><Button type="button" variant="outline" disabled={rows.length <= 1} onClick={() => { if (onRetire) onRetire(editing.proposal_id); else onChange(rows.filter((item) => item.proposal_id !== editing.proposal_id)); closeEditor(); }}>{onRetire ? "Retirar a disponibles" : "Eliminar propuesta"}</Button></div></div>
      </DialogContent>}
    </Dialog></>;
}

const preparationModes = ["no", "yes"] as const;
export function AnnualPreplanWorkspace({ onConfirmed, onGoDiagnostic, onDevelop }: { onConfirmed?: () => void; onGoDiagnostic?: () => void;
  onDevelop?: (proposalId: string) => void }) {
  const [plans, setPlans] = useState<Plans | null>(null), [context, setContext] = useState<Context | null>(null);
  const [options, setOptions] = useState<Competency[]>([]), [selectedId, setSelectedId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Preplan | null>(null), [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [showLegacy, setShowLegacy] = useState(false);
  const [preparing, setPreparing] = useWorkspaceSubview("Planificar", "preparing", preparationModes, "no");
  const reviewNewEvidence = preparing === "yes";
  const setReviewNewEvidence = (value: boolean) => setPreparing(value ? "yes" : "no");
  const [effectiveCalendar, setEffectiveCalendar] = useState<EffectiveCalendar | null>(null);
  const [annualView, setAnnualView] = useWorkspaceSubview("Planificar", "annualView", annualViews, "map", false);
  const listOpen = annualView === "list";
  const setListOpen = (value: boolean) => setAnnualView(value ? "list" : "map");
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [editRequestId, setEditRequestId] = useState<string | null>(null);
  const editorTriggerRef = useRef<HTMLElement | null>(null);
  async function reload(select?: string) {
    const [loadedPlans, loadedContext, loadedOptions] = await Promise.all([
      json<Plans>("/api/annual-plans/current"), json<Context>("/api/ai/annual-plan/context"),
      json<{ competencies: Competency[] }>("/api/ai/competency-options?workflow=annual_plan")]);
    setPlans(loadedPlans); setContext(loadedContext); setOptions(loadedOptions.competencies);
    const current = [loadedPlans.draft, loadedPlans.active, ...loadedPlans.archived].find((item) => item?.id === select)
      ?? loadedPlans.draft ?? loadedPlans.active;
    setSelectedId(current?.id ?? null); setProposal(isPreplan(current) ? current.proposal : null);
    setSelectedProposalId((previous) => isPreplan(current) && current.proposal.proposed_experiences.some((row) => row.proposal_id === previous)
      ? previous : isPreplan(current) ? current.proposal.proposed_experiences[0]?.proposal_id ?? null : null);
  }
  useEffect(() => { let active = true; json<EffectiveCalendar>("/api/school-calendar").then((value) => {
    if (active) setEffectiveCalendar(value);
  }).catch(() => { if (active) setEffectiveCalendar(null); }); return () => { active = false; }; }, []);
  useEffect(() => { let alive = true; Promise.resolve().then(() => reload()).catch((cause) => { if (alive) setError(cause instanceof Error ? cause.message : "No pudimos abrir el plan."); })
    .finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const selected = [plans?.draft, plans?.active, ...(plans?.archived ?? [])].find((item) => item?.id === selectedId) ?? null;
  const editable = isPreplan(selected) && selected.status === "draft";
  const dirty = editable && proposal && JSON.stringify(proposal) !== JSON.stringify(selected.proposal);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const beforeNavigation = (event: Event) => {
      if (busy || !window.confirm("Tienes cambios pendientes en Mi año. Cancela para permanecer y guardarlos. ¿Quieres descartarlos y continuar?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("ayni-before-navigation", beforeNavigation);
    return () => { window.removeEventListener("beforeunload", beforeUnload); window.removeEventListener("ayni-before-navigation", beforeNavigation); };
  }, [dirty, busy]);
  const available = proposal?.available_experiences ?? [];
  const mapScheduleError = editable && proposal && context ? (() => { try { buildEditableAnnualSchedule(context.calendar, proposal.proposed_experiences); return ""; }
    catch (cause) { return cause instanceof Error ? cause.message : "Revisa las fechas del año."; } })() : "";
  const priorityMap = (context?.confirmed_priorities ?? []).flatMap((item) => item.related_competency_ids.map((competency_id) =>
    ({ competency_id, emphasis: item.importance === "higher" ? "prioritize" : item.importance === "observe_more" ? "observe_more" : "maintain", reason: item.reason })));
  const coverage = proposal ? buildAnnualCompetencyMap(proposal, options, priorityMap) : [];
  async function act(name: string, operation: () => Promise<void>) {
    if (busy) return; setBusy(name); setError(""); setNotice("");
    try { await operation(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos completar la acción."); }
    finally { setBusy(null); }
  }
  const save = () => void act("save", async () => { if (!selected || !proposal) return; const changed = await json<{ id: string }>(`/api/annual-preplans/${selected.id}`,
    { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ proposal, expectedRevision: selected.revision }) });
    await reload(changed.id); setNotice("Cambios guardados. Revisa la tabla y confirma cuando esté lista."); });
  const formalize = (id: string) => void act("formal", async () => { await json(`/api/annual-preplans/${id}/formalize`, body({}));
    await reload(id); setNotice("El Plan Anual formal está listo en Biblioteca → Mis documentos para revisar y descargar en Word."); });
  const confirm = () => void act("confirm", async () => { if (!selected || dirty) return;
    await json(`/api/annual-plans/${selected.id}/confirm`, body({ expectedRevision: selected.revision }));
    await reload(selected.id); onConfirmed?.();
    try { await json(`/api/annual-preplans/${selected.id}/formalize`, body({})); await reload(selected.id);
      setNotice("«Mi año» está confirmado y el Word formal está listo en Biblioteca → Mis documentos."); }
    catch (cause) { setError(`${cause instanceof Error ? cause.message : "No pudimos preparar el Word."} Tu año quedó confirmado; puedes reintentar el documento.`); }
  });
  const copy = () => void act("copy", async () => { if (!selected) return;
    const created = await json<{ id: string }>(`/api/annual-plans/${selected.id}/new-version`, body({ expectedRevision: selected.revision }));
    await reload(created.id); setNotice("Nueva versión en borrador. La versión vigente sigue disponible hasta que confirmes los cambios."); });
  const changeRows = (rows: Row[]) => { if (proposal) setProposal({ ...proposal, proposed_experiences: rows }); };
  const retire = (id: string) => { if (!proposal || proposal.proposed_experiences.length <= 1) return;
    const row = proposal.proposed_experiences.find((item) => item.proposal_id === id); if (!row) return;
    const next = proposal.proposed_experiences.filter((item) => item.proposal_id !== id);
    setProposal({ ...proposal, proposed_experiences: next, available_experiences: [...available, row] });
    setSelectedProposalId(next[0]?.proposal_id ?? null); };
  const restore = (id: string) => { if (!proposal || !context || proposal.proposed_experiences.length >= 20) return;
    const row = available.find((item) => item.proposal_id === id); if (!row) return;
    try { const next = insertAvailableAnnualRow(context.calendar, proposal.proposed_experiences, row); setProposal({ ...proposal, proposed_experiences: next,
      available_experiences: available.filter((item) => item.proposal_id !== id) }); setSelectedProposalId(id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No hay un tramo lectivo disponible para esta propuesta."); } };
  const replace = (id: string) => { if (!proposal || !selectedProposalId) return;
    const incoming = available.find((item) => item.proposal_id === id);
    const index = proposal.proposed_experiences.findIndex((item) => item.proposal_id === selectedProposalId);
    if (!incoming || index < 0) return;
    const outgoing = proposal.proposed_experiences[index];
    const next = [...proposal.proposed_experiences]; next[index] = { ...incoming, period: outgoing.period, month: outgoing.month,
      duration_weeks: outgoing.duration_weeks, planned_start_date: undefined, planned_end_date: undefined,
      planned_instructional_days: undefined };
    setProposal({ ...proposal, proposed_experiences: next, available_experiences: [...available.filter((item) => item.proposal_id !== id), outgoing] });
    setSelectedProposalId(id); };
  const move = (index: number, delta: number) => { if (!proposal) return; const next = moveAnnualRow(proposal.proposed_experiences, index, index + delta);
    changeRows(next); };
  const addManual = () => { if (!proposal || proposal.proposed_experiences.length >= 20) return;
    const last = proposal.proposed_experiences.at(-1); const id = crypto.randomUUID();
    const row: Row = { proposal_id: id, experience_type: "project", title: `Nueva propuesta ${proposal.proposed_experiences.length + 1}`,
      period: last?.period ?? "Bimestre 1", month: last?.month ?? 3, duration_weeks: 2,
      rationale: "Propuesta añadida por la docente.", purpose: "Por definir con la docente.",
      primary_competency_ids: last?.primary_competency_ids.slice(0, 1) ?? [], source_interest_ids: [],
      source_priority_ids: [], source_context_ids: [], source_condition_ids: [], source_teacher_decision: true, planning_origin: "teacher_decision" };
    setProposal({ ...proposal, proposed_experiences: [...proposal.proposed_experiences, row] });
    editorTriggerRef.current = document.activeElement as HTMLElement | null;
    setEditRequestId(id); setSelectedProposalId(id); };
  if (loading) return <LoadingState label="Abriendo Mi año..." />;
  if (showLegacy) return <div className="space-y-3"><Button variant="outline" onClick={() => setShowLegacy(false)}>← Volver a Mi año</Button><LegacyAnnualPlanGenerator onConfirmed={onConfirmed} onGoDiagnostic={onGoDiagnostic} /></div>;
  const showPreparation = !selected || reviewNewEvidence;
  return <section className="ayni-workflow !max-w-none space-y-4">{!showPreparation && <header className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1">
    <h1 className="text-3xl font-extrabold text-[#172b52]">Mi año{context?.year ? ` ${context.year}` : ""}</h1><p className="mt-2 max-w-xl text-[#526b87]">Selecciona una propuesta para revisar tu año.</p></div>
    {isPreplan(selected) && <div className="flex shrink-0 flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setListOpen(!listOpen)}>
      {listOpen ? <LayoutGrid className="size-4" /> : <List className="size-4" />}{listOpen ? "Ver mapa" : "Vista en lista"}</Button>
      {selected.status === "active" && !plans?.draft && <Button type="button" disabled={Boolean(busy) || reviewNewEvidence} onClick={copy}><RotateCcw className="size-4" /> Reorganizar</Button>}
      {editable && <span className="rounded-lg bg-[#eaf7f2] px-3 py-2 text-sm font-semibold text-[#176442]">Reorganización en borrador</span>}</div>}</header>}
    {error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}{notice && <WorkflowFeedback tone="success">{notice}</WorkflowFeedback>}
    {reviewNewEvidence && selected && <Button variant="ghost" className="min-h-11" onClick={() => setReviewNewEvidence(false)}>← Volver a Mi año</Button>}
    {showPreparation && context && <AnnualPersonalizationWorkspace competencies={options} calendar={context.calendar} refresh={reviewNewEvidence} replacingDraft={selected?.status === "draft" ? { id: selected.id, revision: selected.revision } : undefined} onCreated={async (id) => { await reload(id); writeWorkspaceLocation("Planificar", { preparing: "no", preparation: "" }, true);
      setNotice("Ya tienes doce propuestas iniciales. Revisa sus razones y ajusta lo necesario antes de confirmar."); }} />}
    {selected && !isPreplan(selected) && <section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Tienes un plan del formato anterior</h2><p className="mt-2 text-sm text-[#526b87]">La versión {selected.version} sigue guardada. Puedes abrirla o preparar un preplan nuevo con la tabla editable.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => setShowLegacy(true)}>Ver plan anterior</Button></div></section>}
    {!showPreparation && isPreplan(selected) && proposal && <><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#edf7fa] p-4"><p className="font-bold">{selected.status === "active" ? "Mi año vigente" : selected.status === "draft" ? "Mi año en revisión" : "Versión anterior"} · versión {selected.version}{dirty ? " · cambios sin guardar" : ""}</p>
      {selected.status === "active" && !plans?.draft && <Button variant="outline" disabled={Boolean(busy)} onClick={() => setReviewNewEvidence(!reviewNewEvidence)}>
        {reviewNewEvidence ? "Cerrar revisión" : "Revisar evidencia nueva"}</Button>}</div>

      {editable && <div className="flex flex-wrap items-center justify-between gap-2 [&_button]:min-h-11 [&_button]:whitespace-normal">{onGoDiagnostic && <Button variant="ghost" onClick={onGoDiagnostic}>Ver paso anterior</Button>}{dirty ? <AsyncButton busy={busy === "save"} busyLabel="Guardando..." disabled={Boolean(busy) || Boolean(mapScheduleError)} onClick={save}>Guardar cambios</AsyncButton>
        : <AsyncButton className="ml-auto" busy={busy === "confirm"} busyLabel="Confirmando y preparando Word..." disabled={Boolean(busy) || reviewNewEvidence} onClick={confirm}>Confirmar Mi año</AsyncButton>}
        {reviewNewEvidence && <p className="w-full text-sm">Termina o cierra la preparación de ideas antes de confirmar el mapa.</p>}
        {mapScheduleError && <p role="alert" className="w-full text-sm text-amber-800">{mapScheduleError} Mueve o retira una propuesta antes de guardar.</p>}
        <details className="w-full text-sm text-[#526b87]"><summary className="cursor-pointer py-2 font-semibold">Qué cambia al confirmar</summary><p>Los movimientos quedan en este borrador. Solo al confirmar cambiará el año vigente y Ayni desarrollará el documento formal.</p></details></div>}
      {context && !listOpen && <AnnualYearMap rows={proposal.proposed_experiences} available={available}
        calendar={context.calendar} effectiveCalendar={effectiveCalendar} slots={!dirty && selected.status === "active" ? selected.project_slots : []}
        preferPlannedDates={!dirty}
        selectedId={selectedProposalId} onSelect={setSelectedProposalId} editing={editable && !reviewNewEvidence}
        onMove={move} onRetire={retire} onRestore={restore} onReplace={replace}
        onEdit={(id) => { editorTriggerRef.current = document.activeElement as HTMLElement | null; setEditRequestId(id); }} onDevelop={selected.status === "active" ? onDevelop : undefined}
        onAddManual={addManual} competencies={options} />}
      {(listOpen || editRequestId) && <div className="space-y-3">
        <PreplanTable key={editRequestId ?? "list"} rows={proposal.proposed_experiences} options={options} calendar={context?.calendar} editable={editable && !reviewNewEvidence} readOnlyLabel={selected.status === "draft" ? "En revisión" : "Confirmada"}
          onDevelop={selected.status === "active" ? onDevelop : undefined} editRequestId={editRequestId} onRetire={retire}
          editorOnly={!listOpen} returnFocusRef={editorTriggerRef} onEditorClose={() => setEditRequestId(null)}
          onChange={changeRows} /></div>}
      {editable && <div><Button variant="outline" disabled={Boolean(busy) || Boolean(dirty)} onClick={() => { setReviewNewEvidence(!reviewNewEvidence); if (!reviewNewEvidence) writeWorkspaceLocation("Planificar", { preparation: "ideas" }, true); }}>{reviewNewEvidence ? "Cerrar preparación" : "Editar ideas y regenerar"}</Button>{dirty && <p className="mt-2 text-sm">Guarda los cambios del mapa antes de editar las ideas.</p>}</div>}
      {Boolean(proposal.planning_preferences?.teacher_ideas.length) && !reviewNewEvidence && <details className="space-y-3 rounded-xl border bg-white p-4"><summary className="min-h-11 cursor-pointer py-2 font-semibold">Cómo se consideraron tus ideas</summary>{teacherIdeaPlacements(proposal).map((idea: { id: string; title: string; outcome: string; requested_month: number | null; months: number[]; explanation: string }) => <div key={idea.id}><h3 className="font-semibold">{idea.title} · {idea.outcome === "incorporated" ? "Incorporada" : idea.outcome === "alternative" ? "Ubicación alternativa" : "Sin incorporar en el mapa"}</h3><p className="text-sm text-[#526b87]">{idea.requested_month ? `Mes solicitado: ${ideaMonths[idea.requested_month - 1]}. ` : "Sin mes solicitado. "}{idea.months.length ? `Ubicación actual en el mapa: ${idea.months.map((month) => ideaMonths[month - 1]).join(", ")}.` : ""}</p><p className="text-sm text-[#526b87]">Explicación de la propuesta inicial: {idea.explanation}</p></div>)}</details>}
      <details className="rounded-2xl border bg-white p-4"><summary className="cursor-pointer font-bold">Cobertura de competencias · {coverage.filter((item: { warnings: string[] }) => item.warnings.length).length} avisos</summary><p className="mt-1 text-sm text-[#526b87]">Ayni señala oportunidades previstas; puedes decidir cómo ajustarlas.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{coverage.filter((item: { warnings: string[] }) => item.warnings.length).map((item: { competency_id: string; competency_name: string; project_count: number; warnings: string[] }) => <p key={item.competency_id} className="rounded-lg bg-[#fff5e4] p-3 text-sm"><b>{item.competency_name}</b> · {item.project_count} {item.project_count === 1 ? "oportunidad" : "oportunidades"}<br />{item.warnings.join(" ")}</p>)}
          {!coverage.some((item: { warnings: string[] }) => item.warnings.length) && <p className="text-sm">Las competencias del aula tienen oportunidades previstas en este preplan.</p>}</div></details>
      {(busy === "confirm" || busy === "formal") && <GenerationProgress label="Preparando el documento formal" description="El plan está guardado. Ayni está desarrollando el Word; esto puede tardar varios minutos." />}
      {selected.status !== "draft" && <div className="rounded-2xl border bg-white p-4"><p className="font-bold">Word del plan anual</p><p className="mt-1 text-sm">{selected.formal_ready ? "Listo en Biblioteca → Mis documentos para revisar y descargar." : "Falta preparar el Word de esta versión. Cuando esté listo, lo encontrarás en Biblioteca → Mis documentos."}</p>
        {!selected.formal_ready && <div className="mt-3 flex justify-end"><AsyncButton busy={busy === "formal"} busyLabel="Preparando Word..." disabled={Boolean(busy)} onClick={() => formalize(selected.id)}>Preparar Word</AsyncButton></div>}</div>}
    </>}
    {!showPreparation && plans && (plans.draft || plans.active || plans.archived.length > 0) && <section className="rounded-2xl border bg-white p-4"><h2 className="font-bold">Versiones de Mi año</h2><div className="mt-3 flex flex-wrap gap-2">{[plans.draft, plans.active, ...plans.archived].filter((item): item is Plan => Boolean(item)).map((item) =>
      <Button key={item.id} disabled={reviewNewEvidence || Boolean(busy)} variant={item.id === selectedId ? "default" : "outline"} onClick={() => { if (item.id === selectedId || !canLeaveWorkspace()) return; setEditRequestId(null); setSelectedId(item.id); setProposal(isPreplan(item) ? item.proposal : null); }}>
        {item.adjustment_label ? `Reajuste ${item.adjustment_label}` : `Versión ${item.version}`} · {item.status === "active" ? "vigente" : item.status === "draft" ? "borrador" : "anterior"}</Button>)}</div></section>}
  </section>;
}
