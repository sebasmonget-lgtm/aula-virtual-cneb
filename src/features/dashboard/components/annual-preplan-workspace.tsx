"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { buildAnnualCompetencyMap } from "@/src/lib/annual-competency-map.mjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AsyncButton, CompetencyChecklist, GenerationProgress, LoadingState, WorkflowFeedback } from "./workflow-ui";
import { AnnualPlanGenerator as LegacyAnnualPlanGenerator } from "./annual-plan-generator";
import { AnnualPersonalizationWorkspace } from "./annual-personalization-workspace";

type Row = { proposal_id: string; experience_type: "project" | "unit"; title: string; period: string;
  month: number; duration_weeks: 2 | 3; rationale: string; purpose: string; primary_competency_ids: string[];
  source_interest_ids?: string[]; source_priority_ids?: string[]; source_context_ids?: string[];
  source_condition_ids?: string[]; source_teacher_decision?: boolean; source_group_profile?: boolean;
  planned_start_date?: string; planned_end_date?: string; planned_instructional_days?: number };
type Preplan = { plan_format: "annual_preplan_v1"; title: string; school_year: string; proposed_experiences: Row[] };
type Plan = { id: string; version: number; revision: number; status: "draft" | "active" | "archived";
  proposal: Preplan | { plan_format?: string }; formal_ready?: boolean; supersedes_plan_id?: string | null;
  adjustment_label?: string | null };
type Plans = { draft: Plan | null; active: Plan | null; archived: Plan[] };
type Block = { id?: string; type: string; label: string; start_date: string; end_date: string; editable: boolean; sort_order: number };
type Calendar = { blocks: Block[]; initial_stage: { duration_weeks: number } & Record<string, unknown> };
type Context = { year: number; age: number; section: string; institution_name?: string; group_context?: string;
  diagnostic_group?: { strengths: string; needs: string; planning_priorities: string };
  confirmed_priorities?: { title: string; reason: string; importance: string; related_competency_ids: string[] }[];
  source_priority_review_id?: string | null; annual_planning_context?: { additional_notes?: string };
  context_v4?: { common_interests?: { label: string }[] }; calendar: Calendar };
type Competency = { id: string; name: string; has_age_performance?: boolean };
const months = ["", "", "", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
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

function PreplanTable({ rows, options, editable, onChange, onDevelop }: { rows: Row[]; options: Competency[];
  editable: boolean; onChange: (rows: Row[]) => void; onDevelop?: (proposalId: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingIndex = rows.findIndex((item) => item.proposal_id === editingId);
  const editing = editingIndex < 0 ? null : rows[editingIndex];
  const names = new Map(options.map((item) => [item.id, item.name]));
  const patch = (change: Partial<Row>) => editing && onChange(rows.map((item) => {
    if (item.proposal_id !== editing.proposal_id) return item;
    const material = ["title", "purpose", "primary_competency_ids", "rationale"].some((key) => key in change);
    if (!material) return { ...item, ...change };
    return { ...item, ...change, source_interest_ids: [], source_priority_ids: [], source_context_ids: [],
      source_condition_ids: [], source_group_profile: false, source_teacher_decision: true,
      rationale: "rationale" in change ? change.rationale ?? "" : item.source_teacher_decision
        ? item.rationale : "Ajuste de la docente sobre la propuesta inicial." };
  }));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    const sourceTime = { period: rows[index].period, month: rows[index].month, duration_weeks: rows[index].duration_weeks };
    const targetTime = { period: rows[target].period, month: rows[target].month, duration_weeks: rows[target].duration_weeks };
    next[index] = { ...rows[target], ...sourceTime };
    next[target] = { ...rows[index], ...targetTime };
    onChange(next);
  };
  return <section className="space-y-4 rounded-2xl border border-[#d6e5ef] bg-white p-4 sm:p-5">
    <div><h2 className="text-xl font-extrabold text-[#172b52]">Lista de proyectos y unidades</h2>
      <p className="mt-1 text-sm text-[#526b87]">Son propuestas iniciales. Puedes cambiarlas antes de confirmar «Mi año».</p></div>
    <div className="overflow-x-auto rounded-xl border border-[#dce8f0]"><table className="w-full min-w-[900px] border-collapse text-left text-sm">
      <thead className="bg-[#edf5fa] text-[#173352]"><tr>{["Proyecto / unidad", "Mes y duración", "¿Por qué?", "Competencias previstas", "Acción"].map((label) =>
        <th key={label} scope="col" className={`border-b border-[#dce8f0] px-4 py-3 font-bold ${label === "Acción" ? "sticky right-0 z-10 bg-[#edf5fa]" : ""}`}>{label}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.proposal_id} className="group h-20 border-b border-[#e3edf4] align-top even:bg-[#f9fcfe]">
        <td className="min-w-56 px-4 py-4"><span className="mr-2 rounded-md bg-[#e8f6fa] px-2 py-1 text-xs font-bold text-[#087d96]">{String(index + 1).padStart(2, "0")}</span><b>{row.title || "Propuesta sin título"}</b><p className="mt-1 text-xs text-[#526b87]">{row.experience_type === "unit" ? "Unidad" : "Proyecto"}</p></td>
        <td className="min-w-40 px-4 py-4">{row.planned_start_date && row.planned_end_date
          ? <>{compactDate(row.planned_start_date)}–{compactDate(row.planned_end_date)}<p className="mt-1 text-xs text-[#526b87]">{row.planned_instructional_days} días de clase · {row.period}</p></>
          : <>{monthLabel(row.month)} · {row.duration_weeks} semanas<p className="mt-1 text-xs text-[#526b87]">{row.period}</p></>}</td>
        <td className="min-w-56 px-4 py-4 leading-relaxed"><details><summary className="cursor-pointer font-semibold text-[#087d96]">¿Por qué está en Mi año?</summary>
          <p className="mt-2">{row.rationale}</p>{row.source_teacher_decision && <p className="mt-1 text-xs">Propuesta ajustada o añadida por la docente.</p>}</details></td>
        <td className="min-w-56 px-4 py-4">{row.primary_competency_ids.map((id) => names.get(id) ?? id).join(" · ")}</td>
        <td className="sticky right-0 z-10 bg-white px-4 py-3 shadow-[-1px_0_0_#e3edf4] group-even:bg-[#f9fcfe]"><div className="flex flex-wrap gap-1">{editable && <><Button type="button" variant="outline" className="min-h-10" onClick={() => setEditingId(row.proposal_id)}>Editar</Button>
          <Button type="button" variant="ghost" size="sm" aria-label={`Subir ${row.title}`} disabled={index === 0} onClick={() => move(index, -1)}>↑</Button>
          <Button type="button" variant="ghost" size="sm" aria-label={`Bajar ${row.title}`} disabled={index === rows.length - 1} onClick={() => move(index, 1)}>↓</Button></>}
          {!editable && (onDevelop ? <Button type="button" variant="outline" className="min-h-10" onClick={() => onDevelop(row.proposal_id)}>Desarrollar</Button>
            : <span className="text-xs text-[#526b87]">Confirmada</span>)}</div></td>
      </tr>)}</tbody></table></div>
    {editable && <div className="flex flex-wrap items-center justify-between gap-3"><Button type="button" variant="outline" className="min-h-11" disabled={rows.length >= 20}
      onClick={() => { const last = rows.at(-1); const created: Row = { proposal_id: crypto.randomUUID(), experience_type: "project", title: "",
        period: last?.period ?? "Bimestre 1", month: last?.month ?? 3, duration_weeks: 2, rationale: "", purpose: "", primary_competency_ids: [],
        source_interest_ids: [], source_priority_ids: [], source_context_ids: [], source_condition_ids: [], source_teacher_decision: true };
        onChange([...rows, created]); setEditingId(created.proposal_id); }}>+ Agregar propuesta manual</Button>
      <p className="text-sm text-[#526b87]">Puedes editar, mover, eliminar o agregar propuestas. Al mover una, adopta el mes y la duración de ese lugar. Máximo 20 por la plantilla Word.</p></div>}
    {editable && editing && <div role="dialog" aria-modal="true" aria-label={`Editar ${editing.title || "propuesta"}`} className="fixed inset-0 z-50 flex justify-end bg-[#10233a]/45">
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-extrabold">Editar propuesta {editingIndex + 1}</h3><Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cerrar</Button></div>
        <div className="mt-5 space-y-4"><label className="block font-semibold">Proyecto o unidad<select className="mt-2 min-h-11 w-full rounded-lg border px-3" value={editing.experience_type} onChange={(event) => patch({ experience_type: event.target.value as Row["experience_type"] })}><option value="project">Proyecto</option><option value="unit">Unidad</option></select></label>
          <label className="block font-semibold">Título<Input className="mt-2" value={editing.title} onChange={(event) => patch({ title: event.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3"><label className="block font-semibold">Bimestre<select className="mt-2 min-h-11 w-full rounded-lg border px-3" value={editing.period} onChange={(event) => patch({ period: event.target.value })}>{[1,2,3,4].map((number) => <option key={number} value={`Bimestre ${number}`}>Bimestre {number}</option>)}</select></label>
            <label className="block font-semibold">Mes preferido<select className="mt-2 min-h-11 w-full rounded-lg border px-3" value={editing.month} onChange={(event) => patch({ month: Number(event.target.value) })}>{months.slice(3).map((label, index) => <option key={label} value={index + 3}>{label}</option>)}</select></label></div>
          <label className="block font-semibold">Duración<select className="mt-2 min-h-11 w-full rounded-lg border px-3" value={editing.duration_weeks} onChange={(event) => patch({ duration_weeks: Number(event.target.value) as 2 | 3 })}><option value={2}>2 semanas lectivas</option><option value={3}>3 semanas lectivas</option></select></label>
          <label className="block font-semibold">¿Por qué se propone?<Textarea className="mt-2" value={editing.rationale} onChange={(event) => patch({ rationale: event.target.value })} /></label>
          <label className="block font-semibold">Propósito breve<Textarea className="mt-2" value={editing.purpose} onChange={(event) => patch({ purpose: event.target.value })} /></label>
          <CompetencyChecklist label="Competencias previstas" value={editing.primary_competency_ids} options={options} onChange={(primary_competency_ids) => patch({ primary_competency_ids })} />
          <div className="flex flex-wrap gap-2"><Button type="button" onClick={() => setEditingId(null)}>Listo</Button><Button type="button" variant="outline" disabled={rows.length <= 1} onClick={() => { onChange(rows.filter((item) => item.proposal_id !== editing.proposal_id)); setEditingId(null); }}>Eliminar propuesta</Button></div></div></div></div>}
  </section>;
}

export function AnnualPreplanWorkspace({ onConfirmed, onGoDiagnostic, onDevelop }: { onConfirmed?: () => void; onGoDiagnostic?: () => void;
  onDevelop?: (proposalId: string) => void }) {
  const [plans, setPlans] = useState<Plans | null>(null), [context, setContext] = useState<Context | null>(null);
  const [options, setOptions] = useState<Competency[]>([]), [selectedId, setSelectedId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Preplan | null>(null), [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [showLegacy, setShowLegacy] = useState(false);
  const [reviewNewEvidence, setReviewNewEvidence] = useState(false);
  async function reload(select?: string) {
    const [loadedPlans, loadedContext, loadedOptions] = await Promise.all([
      json<Plans>("/api/annual-plans/current"), json<Context>("/api/ai/annual-plan/context"),
      json<{ competencies: Competency[] }>("/api/ai/competency-options?workflow=annual_plan")]);
    setPlans(loadedPlans); setContext(loadedContext); setOptions(loadedOptions.competencies);
    const current = [loadedPlans.draft, loadedPlans.active, ...loadedPlans.archived].find((item) => item?.id === select)
      ?? loadedPlans.draft ?? loadedPlans.active;
    setSelectedId(current?.id ?? null); setProposal(isPreplan(current) ? current.proposal : null);
  }
  useEffect(() => { let alive = true; Promise.resolve().then(() => reload()).catch((cause) => { if (alive) setError(cause instanceof Error ? cause.message : "No pudimos abrir el plan."); })
    .finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const selected = [plans?.draft, plans?.active, ...(plans?.archived ?? [])].find((item) => item?.id === selectedId) ?? null;
  const editable = isPreplan(selected) && selected.status === "draft";
  const dirty = editable && proposal && JSON.stringify(proposal) !== JSON.stringify(selected.proposal);
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
  if (loading) return <LoadingState label="Abriendo Mi año..." />;
  if (showLegacy) return <div className="space-y-3"><Button variant="outline" onClick={() => setShowLegacy(false)}>← Volver a Mi año</Button><LegacyAnnualPlanGenerator onConfirmed={onConfirmed} onGoDiagnostic={onGoDiagnostic} /></div>;
  return <section className="ayni-workflow space-y-5"><header><p className="text-sm font-semibold text-[#087d96]">Paso 4 de 6 · Plan anual</p>
    <h1 className="text-3xl font-extrabold text-[#172b52]">Mi año</h1><p className="mt-2 text-[#526b87]">Organiza las propuestas del año. Puedes ajustarlas y confirmar una nueva versión cuando cambie el grupo.</p></header>
    {error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}{notice && <WorkflowFeedback tone="success">{notice}</WorkflowFeedback>}
    {(!selected || reviewNewEvidence) && context && <AnnualPersonalizationWorkspace competencies={options} calendar={context.calendar} refresh={reviewNewEvidence} onCreated={async (id) => { await reload(id); setReviewNewEvidence(false);
      setNotice("Ya tienes doce propuestas iniciales. Revisa sus razones y ajusta lo necesario antes de confirmar."); }} />}
    {selected && !isPreplan(selected) && <section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Tienes un plan del formato anterior</h2><p className="mt-2 text-sm text-[#526b87]">La versión {selected.version} sigue guardada. Puedes abrirla o preparar un preplan nuevo con la tabla editable.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => setShowLegacy(true)}>Ver plan anterior</Button></div></section>}
    {isPreplan(selected) && proposal && <><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#edf7fa] p-4"><p className="font-bold">{selected.status === "active" ? "Mi año vigente" : selected.status === "draft" ? "Mi año en revisión" : "Versión anterior"} · versión {selected.version}</p>
      {selected.status === "active" && !plans?.draft && <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={Boolean(busy)} onClick={() => setReviewNewEvidence((value) => !value)}>
        {reviewNewEvidence ? "Cerrar revisión" : "Revisar evidencia nueva"}</Button><Button variant="outline" disabled={Boolean(busy)} onClick={copy}>Preparar nueva versión</Button></div>}</div>
      <PreplanTable rows={proposal.proposed_experiences} options={options} editable={editable}
        onDevelop={selected.status === "active" ? onDevelop : undefined}
        onChange={(rows) => setProposal({ ...proposal, proposed_experiences: rows })} />
      <section className="rounded-2xl border bg-white p-4"><h2 className="font-bold">Cobertura de competencias</h2><p className="mt-1 text-sm text-[#526b87]">Ayni señala oportunidades previstas; puedes decidir cómo ajustarlas.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{coverage.filter((item: { warnings: string[] }) => item.warnings.length).map((item: { competency_id: string; competency_name: string; project_count: number; warnings: string[] }) => <p key={item.competency_id} className="rounded-lg bg-[#fff5e4] p-3 text-sm"><b>{item.competency_name}</b> · {item.project_count} {item.project_count === 1 ? "oportunidad" : "oportunidades"}<br />{item.warnings.join(" ")}</p>)}
          {!coverage.some((item: { warnings: string[] }) => item.warnings.length) && <p className="text-sm">Las competencias del aula tienen oportunidades previstas en este preplan.</p>}</div></section>
      {editable && <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-white p-4">{onGoDiagnostic && <Button variant="outline" onClick={onGoDiagnostic}>Ver paso anterior</Button>}{dirty ? <AsyncButton busy={busy === "save"} busyLabel="Guardando..." disabled={Boolean(busy)} onClick={save}>Guardar cambios</AsyncButton>
        : <AsyncButton className="ml-auto" busy={busy === "confirm"} busyLabel="Confirmando y preparando Word..." disabled={Boolean(busy)} onClick={confirm}>Confirmar Mi año</AsyncButton>}
        <p className="w-full text-sm text-[#526b87]">Al confirmar, Ayni desarrollará el documento formal a partir de esta versión.</p></div>}
      {(busy === "confirm" || busy === "formal") && <GenerationProgress label="Preparando el documento formal" description="El plan está guardado. Ayni está desarrollando el Word; esto puede tardar varios minutos." />}
      {selected.status !== "draft" && <div className="rounded-2xl border bg-white p-4"><p className="font-bold">Word del plan anual</p><p className="mt-1 text-sm">{selected.formal_ready ? "Listo en Biblioteca → Mis documentos para revisar y descargar." : "Falta preparar el Word de esta versión. Cuando esté listo, lo encontrarás en Biblioteca → Mis documentos."}</p>
        {!selected.formal_ready && <div className="mt-3 flex justify-end"><AsyncButton busy={busy === "formal"} busyLabel="Preparando Word..." disabled={Boolean(busy)} onClick={() => formalize(selected.id)}>Preparar Word</AsyncButton></div>}</div>}
    </>}
    {plans && (plans.draft || plans.active || plans.archived.length > 0) && <section className="rounded-2xl border bg-white p-4"><h2 className="font-bold">Versiones de Mi año</h2><div className="mt-3 flex flex-wrap gap-2">{[plans.draft, plans.active, ...plans.archived].filter((item): item is Plan => Boolean(item)).map((item) =>
      <Button key={item.id} variant={item.id === selectedId ? "default" : "outline"} onClick={() => { setSelectedId(item.id); setProposal(isPreplan(item) ? item.proposal : null); }}>
        {item.adjustment_label ? `Reajuste ${item.adjustment_label}` : `Versión ${item.version}`} · {item.status === "active" ? "vigente" : item.status === "draft" ? "borrador" : "anterior"}</Button>)}</div></section>}
  </section>;
}
