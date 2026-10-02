"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { AsyncButton, GenerationProgress, LoadingState, WorkflowFeedback } from "./workflow-ui";
import { AnnualTeacherIdeas, type PlanningPreferences } from "./annual-teacher-ideas";
import { useWorkspaceSubview } from "@/src/lib/workspace-location";

type Interest = { id: string; label: string; source_refs?: unknown[]; source_kinds?: string[] };
type Priority = { id: string; title: string; reason: string; related_competency_ids: string[];
  importance: "higher" | "normal" | "observe_more"; evidence_status: string; source_refs?: unknown[] };
type Opportunity = { id: string; text: string; source_kind?: string; source_refs?: unknown[] };
type Condition = { id: string; kind: string; value: string };
type Details = { group_profile: string; interests: Interest[]; priorities: Priority[];
  context_opportunities: Opportunity[]; classroom_conditions: Condition[];
  evidence_coverage: { students?: number; interviews?: number; observed_students?: number; observations?: number };
  needs_more_observation: string[]; additional_notes: string;
  planning_preferences?: PlanningPreferences;
  suggested_changes?: { new_interests: string[]; new_context: string[]; new_priorities?: string[];
    group_profile_changed?: boolean; new_observations: number } };
type Review = { id: string; status: "draft" | "confirmed"; version: number; details: Details; sources_changed?: boolean; snapshot: string };
type Competency = { id: string; name: string };
type Calendar = { blocks: { id?: string; label: string; start_date: string; end_date: string; editable: boolean; type: string }[];
  initial_stage: { duration_weeks: number } & Record<string, unknown> };
const conditionOptions = [
  ["spaces", "Espacios del aula"], ["outdoors", "Patio y espacios exteriores"],
  ["materials", "Materiales"], ["technology", "Tecnología"], ["schedule", "Horarios"],
  ["family_support", "Apoyo de familias"], ["restrictions", "Restricciones"],
  ["institutional_projects", "Proyectos institucionales"], ["events", "Eventos del colegio"],
  ["other", "Otra condición"],
] as const;
const preparationStages = ["review", "ideas"] as const;
class PersonalizationRequestError extends Error {
  constructor(message: string, readonly reason?: string, readonly draftId?: string) { super(message); }
}
const post = async <T,>(path: string, value: unknown): Promise<T> => {
  const response = await apiFetch(`${localDatabaseApiUrl}${path}`, { method: "POST",
    headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
  const data = await response.json() as T & { error?: string; reason?: string; draft_id?: string };
  if (!response.ok) throw new PersonalizationRequestError(data.error || "No se pudo completar la acción.", data.reason, data.draft_id);
  return data;
};

export function AnnualPersonalizationWorkspace({ onCreated, competencies, calendar, refresh = false, replacingDraft }: {
  onCreated: (id: string) => Promise<void>; competencies: Competency[]; calendar: Calendar; refresh?: boolean; replacingDraft?: { id: string; revision: number } }) {
  const [review, setReview] = useState<Review | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [editedCalendar, setEditedCalendar] = useState<Calendar>(calendar);
  const [savedCalendar, setSavedCalendar] = useState<Calendar>(calendar);
  const [stage, setStage] = useWorkspaceSubview("Planificar", "preparation", preparationStages, "review", false);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const [existingDraftId, setExistingDraftId] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const dirty = Boolean(review && details && JSON.stringify(details) !== JSON.stringify(review.details));
  const calendarDirty = JSON.stringify(editedCalendar) !== JSON.stringify(savedCalendar);
  useEffect(() => {
    if (!dirty && !calendarDirty && !busy) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const beforeNavigation = (event: Event) => {
      if (busy || !window.confirm("Tienes cambios pendientes. Guarda la revisión antes de salir. ¿Quieres salir sin guardar?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("ayni-before-navigation", beforeNavigation);
    return () => { window.removeEventListener("beforeunload", beforeUnload); window.removeEventListener("ayni-before-navigation", beforeNavigation); };
  }, [dirty, calendarDirty, busy]);
  useEffect(() => { if (error) { errorRef.current?.focus(); errorRef.current?.scrollIntoView({ block: "center" }); } }, [error]);
  useEffect(() => { let live = true;
    post<Review>("/api/annual-personalization/prepare", { refresh }).then((value) => {
      if (live) { setReview(value); setDetails(value.details); }
    }).catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : "No se pudo analizar el aula."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; }; }, [refresh]);
  if (loading) return <LoadingState label="Ayni está organizando la evidencia del aula…" />;
  if (!review || !details) return <div><WorkflowFeedback tone="error">{error || "No se pudo preparar el aula."}</WorkflowFeedback><Button className="mt-3" onClick={() => window.location.reload()}>Volver a intentar</Button></div>;
  const reportError = (cause: unknown, fallback: string) => {
    setConflict(cause instanceof PersonalizationRequestError && (cause.reason === "conflict" || cause.reason === "not_found"));
    setError(cause instanceof Error ? cause.message : fallback);
  };
  const recoverReview = async () => {
    if (dirty && !window.confirm("La revisión cambió en otra pestaña. ¿Quieres abrir la versión guardada y descartar los cambios de esta pestaña?")) return;
    setBusy(true);
    try { const next = await post<Review>("/api/annual-personalization/prepare", {});
      setReview(next); setDetails(next.details); setConfirmed([]); setEditing(null); setConflict(false); setError("");
      setNotice("Se abrió la última revisión guardada. Puedes continuar desde aquí.");
    } catch (cause) { reportError(cause, "No se pudo abrir la revisión."); } finally { setBusy(false); }
  };
  const set = (change: Partial<Details>) => { setDetails({ ...details, ...change }); setConfirmed([]); setNotice(""); };
  const mark = (key: string) => { setConfirmed((value) => value.includes(key) ? value : [...value, key]); setEditing(null); };
  const card = (key: string, title: string, summary: React.ReactNode, editor: React.ReactNode) =>
    <section key={key} className="rounded-2xl border border-[#d6e5ef] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-extrabold text-[#172b52]">{title}</h2>
        {(review.status === "confirmed" || confirmed.includes(key)) && <span className={`rounded-full px-3 py-1 text-xs font-bold ${review.status === "confirmed" ? "bg-[#e6f7ed] text-[#176442]" : "bg-[#edf4fa] text-[#3d5874]"}`}>{review.status === "confirmed" ? "Confirmado" : "Revisado"}</span>}</div>
      {editing === key ? <div className="mt-3 space-y-3">{editor}<div className="flex gap-2"><Button onClick={() => mark(key)}>Listo</Button>
        <Button variant="outline" onClick={() => setEditing(null)}>Cerrar</Button></div></div>
        : <><div className="mt-2 text-sm leading-relaxed text-[#3d5874]">{summary}</div><div className="mt-4 flex gap-2">
          {review.status === "draft" && <><Button variant="outline" onClick={() => mark(key)}>Marcar revisado</Button>
          <Button variant="ghost" onClick={() => setEditing(key)}>Editar</Button></>}</div></>}</section>;
  const updatePriority = (index: number, change: Partial<Priority>) => set({ priorities: details.priorities.map((item, i) =>
    i === index ? { ...item, ...change, teacher_modified: true } as Priority : item) });
  const updateProposal = async () => {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const next = await post<Review>("/api/annual-personalization/prepare", { refresh: true, details, expectedSnapshot: review.snapshot });
      setReview(next); setDetails(next.details); setConfirmed([]); setEditing(null);
      setNotice("Revisión guardada con los registros actuales. Tus correcciones se conservaron. Revisa la síntesis antes de crear Mi año.");
    } catch (cause) { reportError(cause, "No se pudo actualizar la propuesta. Inténtalo de nuevo."); }
    finally { setBusy(false); }
  };
  const saveReview = async () => {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const next = await post<Review>("/api/annual-personalization/save", { id: review.id, details: stage === "ideas" ? { ...details, planning_preferences: details.planning_preferences ?? { version: 1, teacher_ideas: [] } } : details, expectedSnapshot: review.snapshot });
      setReview(next); setDetails(next.details);
      setNotice(`Revisión guardada como borrador. La decisión del aula aún no está confirmada.${calendarDirty ? " Las fechas pendientes se guardarán al generar propuestas." : ""}`);
    } catch (cause) { reportError(cause, "No se pudo guardar la revisión."); }
    finally { setBusy(false); }
  };
  const create = async () => { if (busy) return; setBusy(true); setGenerating(true); setError(""); setNotice("");
    try { if (calendarDirty) {
        const response = await apiFetch(`${localDatabaseApiUrl}/api/annual-calendar`, { method: "PUT",
          headers: { "content-type": "application/json" }, body: JSON.stringify({ ...editedCalendar, forPreplan: true }) });
        if (!response.ok) { const payload = await response.json() as { error?: string };
          throw new Error(payload.error || "No se pudo guardar el calendario."); }
        setSavedCalendar(editedCalendar);
      }
      if (review.status === "draft") {
        const next = await post<Review>("/api/annual-personalization/confirm", { id: review.id, details: { ...details, planning_preferences: details.planning_preferences ?? { version: 1, teacher_ideas: [] } }, expectedSnapshot: review.snapshot });
        setReview(next); setDetails(next.details);
      }
      const response = await post<{ id: string }>("/api/annual-preplan/generate", replacingDraft ? { replaceDraftId: replacingDraft.id, expectedRevision: replacingDraft.revision } : {});
      await onCreated(response.id);
    } catch (cause) {
      if (cause instanceof PersonalizationRequestError && cause.reason === "stale") setReview((value) => value ? { ...value, sources_changed: true } : value);
      if (cause instanceof PersonalizationRequestError && cause.draftId) setExistingDraftId(cause.draftId);
      reportError(cause, "No se pudo crear Mi año. Inténtalo de nuevo.");
    }
    finally { setBusy(false); setGenerating(false); } };
  const changeStage = (next: "review" | "ideas") => setStage(next);
  const openNewReview = async () => { setBusy(true); setError("");
    try { const next = await post<Review>("/api/annual-personalization/prepare", { refresh: true }); setReview(next); setDetails(next.details); setConfirmed([]); }
    catch (cause) { reportError(cause, "No se pudo abrir una nueva revisión."); } finally { setBusy(false); }
  };
  const coverage = details.evidence_coverage;
  if (stage === "ideas") return <div className="space-y-4" aria-busy={busy}><fieldset disabled={busy} className="min-w-0 space-y-4">
    <Button variant="ghost" onClick={() => changeStage("review")}>← Volver a Así entendí tu aula</Button>
    <AnnualTeacherIdeas ideas={details.planning_preferences?.teacher_ideas ?? []} readOnly={review.status === "confirmed"}
      onChange={(teacher_ideas) => set({ planning_preferences: { version: 1, teacher_ideas } })} />
    {notice && <WorkflowFeedback tone="success">{notice}</WorkflowFeedback>}
    {review.sources_changed && <WorkflowFeedback>Hay registros nuevos. Actualiza la propuesta del aula antes de generar Mi año.</WorkflowFeedback>}
    {replacingDraft && <p className="text-sm text-[#526b87]">Regenerar reemplazará las propuestas de este borrador. El plan vigente se conserva hasta que confirmes la nueva versión.</p>}
    <p className="text-sm font-semibold text-[#526b87]">{dirty || calendarDirty ? "Cambios pendientes de guardar" : review.status === "confirmed" ? "Preparación confirmada y guardada" : "Borrador guardado · pendiente de confirmación"}</p>
    <div ref={errorRef} tabIndex={-1}>{error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
      {conflict && <Button className="mt-3 mr-3" variant="outline" onClick={() => void recoverReview()}>Abrir revisión guardada</Button>}
      {review.sources_changed && !conflict && <Button className="mt-3 mr-3" variant="outline" onClick={() => void updateProposal()}>Actualizar propuesta</Button>}
      {review.status === "draft" ? <Button className="mt-3 mr-3" variant="outline" onClick={() => void saveReview()}>Guardar ideas</Button> : <Button className="mt-3 mr-3" variant="outline" onClick={() => void openNewReview()}>Editar ideas</Button>}
      {existingDraftId ? <Button className="mt-3" onClick={() => void onCreated(existingDraftId)}>Continuar borrador existente</Button> : <AsyncButton className="mt-3" busy={busy} busyLabel={generating ? "Preparando propuestas…" : "Guardando…"} disabled={review.sources_changed || conflict || (details.planning_preferences?.teacher_ideas ?? []).some((idea) => !idea.title.trim())} onClick={() => void create()}>
        {details.planning_preferences?.teacher_ideas.length ? replacingDraft ? "Guardar y regenerar propuestas" : "Guardar y generar propuestas" : replacingDraft ? "Regenerar sin agregar ideas" : "Todavía no tengo ideas / Continuar sin agregar"}</AsyncButton>}
    </div></fieldset>{busy && (generating ? <GenerationProgress label="Preparando tu año" description="Ayni está organizando las propuestas. Espera a que termine para continuar." /> : <LoadingState label="Guardando la preparación…" />)}</div>;
  return <div className="space-y-4" aria-busy={busy}><header><p className="text-sm font-semibold text-[#087d96]">Antes de crear Mi año</p>
    <h1 className="text-3xl font-extrabold text-[#172b52]">Así entendí tu aula</h1>
    <p className="mt-2 text-sm text-[#526b87]">Ayni organizó la evidencia disponible. Revisa o corrige lo que influirá en tus propuestas del año.</p></header>
    {notice && <WorkflowFeedback tone="success">{notice}</WorkflowFeedback>}
    {review.sources_changed && <WorkflowFeedback>Hay registros nuevos desde esta propuesta. Actualízala para revisarlos; tus correcciones se conservarán.</WorkflowFeedback>}
    <fieldset disabled={busy} aria-label="Revisión del aula" className="min-w-0 space-y-4">
    {refresh && details.suggested_changes && <p className="rounded-xl bg-[#fff7e8] p-3 text-sm">
      Desde la decisión anterior hay {details.suggested_changes.new_observations} observaciones nuevas.
      {details.suggested_changes.new_interests.length > 0 && ` Nuevos intereses posibles: ${details.suggested_changes.new_interests.join(", ")}.`}
      {details.suggested_changes.new_context.length > 0 && ` Nuevas oportunidades: ${details.suggested_changes.new_context.join(", ")}.`}
      {Boolean(details.suggested_changes.new_priorities?.length) && ` Prioridades para revisar: ${details.suggested_changes.new_priorities?.join(", ")}.`}
      {details.suggested_changes.group_profile_changed && " Ayni propone actualizar la síntesis del grupo."}
      {details.suggested_changes.new_observations === 0 && !details.suggested_changes.new_interests.length && !details.suggested_changes.new_context.length
        && !details.suggested_changes.new_priorities?.length && !details.suggested_changes.group_profile_changed
        && " Puedes actualizar condiciones o decisiones si cambió la realidad del aula."}</p>}
    <p className="rounded-xl bg-[#edf7fa] p-3 text-sm">{coverage.observations
      ? `Síntesis basada en ${coverage.observations} ${coverage.observations === 1 ? "observación" : "observaciones"} y ${coverage.interviews ?? 0} ${coverage.interviews === 1 ? "entrevista confirmada" : "entrevistas confirmadas"}.`
      : "Hay aspectos que seguiremos observando durante las primeras semanas."} Ningún dato pendiente se interpreta como dificultad.</p>
    {card("group", "Tu grupo", <p>{details.group_profile}</p>,
      <label className="block text-sm font-semibold">Cómo es y cómo participa el grupo
        <Textarea className="mt-2 min-h-28" value={details.group_profile} onChange={(event) => set({ group_profile: event.target.value })} /></label>)}
    {card("interests", "Lo que les interesa", details.interests.length
      ? <div className="flex flex-wrap gap-2">{details.interests.map((item) => <span key={item.id} className="rounded-full bg-[#e8f6fa] px-3 py-1">{item.label}</span>)}</div>
      : <p>Aún no hay un interés recurrente identificado. Puedes agregar alguno que conozcas.</p>,
      <div className="space-y-2">{details.interests.map((item) => <div key={item.id} className="flex gap-2">
        <Input aria-label="Interés" value={item.label} onChange={(event) => set({ interests: details.interests.map((row) =>
          row.id === item.id ? { ...row, label: event.target.value, source_refs: [] } : row) })} />
        <Button variant="ghost" onClick={() => set({ interests: details.interests.filter((row) => row.id !== item.id) })}>Quitar</Button></div>)}
        <Button variant="outline" onClick={() => set({ interests: [...details.interests, { id: crypto.randomUUID(), label: "", source_refs: [] }] })}>Agregar interés</Button></div>)}
    {card("priorities", "Lo que conviene priorizar", details.priorities.length
      ? <ol className="space-y-2">{details.priorities.map((item) => <li key={item.id}><b>{item.title}</b> · {item.related_competency_ids.map((id) => competencies.find((card) => card.id === id)?.name ?? id).join(", ")}
        <p>{item.reason}</p><span className="text-xs">Fuente: {item.source_refs?.length ? "registros o decisión docente confirmada" : "decisión docente"}. {item.importance === "observe_more" ? "Necesitamos observar más." : "Hay evidencia para una primera propuesta."}</span></li>)}</ol>
      : <p>Aún necesitamos observar más para justificar prioridades específicas. El plan incluirá oportunidades para seguir conociendo al grupo.</p>,
      <div className="space-y-4">{details.priorities.map((item, index) => <div key={item.id} className="space-y-2 rounded-xl border p-3">
        <Input aria-label={`Prioridad ${index + 1}`} value={item.title} onChange={(event) => updatePriority(index, { title: event.target.value })} />
        <Textarea aria-label={`Motivo de prioridad ${index + 1}`} value={item.reason} onChange={(event) => updatePriority(index, { reason: event.target.value })} />
        <select aria-label={`Competencia de prioridad ${index + 1}`} className="min-h-11 w-full rounded-lg border bg-white px-3"
          value={item.related_competency_ids[0] ?? ""} onChange={(event) => updatePriority(index, { related_competency_ids: [event.target.value] })}>
          <option value="">Elige una competencia</option>{competencies.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
        <select aria-label={`Estado de prioridad ${index + 1}`} className="min-h-11 w-full rounded-lg border bg-white px-3"
          value={item.importance} onChange={(event) => updatePriority(index, { importance: event.target.value as Priority["importance"] })}>
          <option value="higher">Dar más oportunidades</option><option value="normal">Aprovechar fortaleza</option><option value="observe_more">Seguir observando</option></select>
        <div className="flex gap-2"><Button variant="ghost" aria-label={`Subir prioridad ${index + 1}`} disabled={index === 0} onClick={() => { const next = [...details.priorities]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; set({ priorities: next }); }}><ArrowUp aria-hidden="true" /></Button>
          <Button variant="ghost" aria-label={`Bajar prioridad ${index + 1}`} disabled={index === details.priorities.length - 1} onClick={() => { const next = [...details.priorities]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; set({ priorities: next }); }}><ArrowDown aria-hidden="true" /></Button>
          <Button variant="ghost" onClick={() => set({ priorities: details.priorities.filter((row) => row.id !== item.id) })}>Quitar</Button></div></div>)}
        <Button variant="outline" disabled={details.priorities.length >= 6} onClick={() => set({ priorities: [...details.priorities,
          { id: crypto.randomUUID(), title: "", reason: "", related_competency_ids: [], importance: "higher", evidence_status: "teacher_entry", source_refs: [] }] })}>Agregar prioridad</Button></div>)}
    {card("context", "Su contexto y oportunidades", details.context_opportunities.length
      ? <ul className="list-disc pl-5">{details.context_opportunities.map((item) => <li key={item.id}>{item.source_kind?.includes("family") ? "La familia cuenta: " : item.source_kind?.includes("observation") ? "En las observaciones se aprecia: " : "Contexto del aula: "}{item.text}</li>)}</ul>
      : <p>Aún no se identificaron oportunidades del entorno. Puedes añadir las que conozcas.</p>,
      <div className="space-y-2">{details.context_opportunities.map((item) => <div key={item.id} className="flex gap-2">
        <Input aria-label="Oportunidad del entorno" value={item.text} onChange={(event) => set({ context_opportunities: details.context_opportunities.map((row) =>
          row.id === item.id ? { ...row, text: event.target.value, source_kind: "teacher_entry", source_refs: [] } : row) })} />
        <Button variant="ghost" onClick={() => set({ context_opportunities: details.context_opportunities.filter((row) => row.id !== item.id) })}>Quitar</Button></div>)}
        <Button variant="outline" onClick={() => set({ context_opportunities: [...details.context_opportunities,
          { id: crypto.randomUUID(), text: "", source_kind: "teacher_entry", source_refs: [] }] })}>Agregar oportunidad</Button></div>)}
    {card("conditions", "Condiciones reales para planificar", details.classroom_conditions.length
      ? <ul className="list-disc pl-5">{details.classroom_conditions.map((item) => <li key={item.id}>{item.value}</li>)}</ul>
      : <p>Ayni aún no conoce tus espacios, materiales u horarios. Completa solo lo que afectará el plan.</p>,
      <div className="grid gap-3 sm:grid-cols-2">{conditionOptions.map(([kind, label]) => <label key={kind} className="text-sm font-semibold">{label}
        <Input className="mt-2" value={details.classroom_conditions.find((item) => item.kind === kind)?.value ?? ""}
          onChange={(event) => { const existing = details.classroom_conditions.filter((item) => item.kind !== kind);
            set({ classroom_conditions: event.target.value ? [...existing, { id: kind, kind, value: event.target.value }] : existing }); }} /></label>)}
        <label className="block text-sm font-semibold sm:col-span-2">Semanas iniciales de acogida
          <select className="mt-2 min-h-11 w-full rounded-lg border bg-white px-3" value={editedCalendar.initial_stage.duration_weeks}
            onChange={(event) => setEditedCalendar({ ...editedCalendar, initial_stage: { ...editedCalendar.initial_stage, duration_weeks: Number(event.target.value) } })}>
            {[1,2,3,4].map((value) => <option key={value} value={value}>{value} {value === 1 ? "semana" : "semanas"}</option>)}</select></label>
        <details className="sm:col-span-2"><summary className="cursor-pointer text-sm font-semibold">Revisar fechas lectivas del colegio</summary>
          <div className="mt-2 space-y-2">{editedCalendar.blocks.map((block, index) => <div key={block.id ?? index} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_10rem_10rem]">
            <span>{block.label}</span><Input type="date" aria-label={`Inicio de ${block.label}`} disabled={!block.editable} value={block.start_date}
              onChange={(event) => setEditedCalendar({ ...editedCalendar, blocks: editedCalendar.blocks.map((item, i) => i === index ? { ...item, start_date: event.target.value } : item) })} />
            <Input type="date" aria-label={`Fin de ${block.label}`} disabled={!block.editable} value={block.end_date}
              onChange={(event) => setEditedCalendar({ ...editedCalendar, blocks: editedCalendar.blocks.map((item, i) => i === index ? { ...item, end_date: event.target.value } : item) })} /></div>)}</div></details>
        <label className="block text-sm font-semibold sm:col-span-2">Algo más que quieras considerar · opcional
          <Textarea className="mt-2" value={details.additional_notes} onChange={(event) => set({ additional_notes: event.target.value })} /></label></div>)}
    {details.needs_more_observation.length > 0 && <p className="rounded-xl bg-[#fff7e8] p-3 text-sm">{details.needs_more_observation.join(" ")}</p>}
    <div className="rounded-2xl border bg-white p-4"><p className="text-sm text-[#526b87]">{review.status === "draft" ? "Los bloques revisados aún no están confirmados. Puedes guardar la revisión. Al generar propuestas confirmarás los cinco bloques como una sola versión y guardarás las fechas pendientes." : "La decisión del aula está confirmada. Puedes crear Mi año o abrir una nueva revisión."}</p>
      <p className="mt-2 text-sm" role="status">{dirty || calendarDirty ? "Cambios pendientes de guardar" : review.status === "confirmed" ? "Confirmado y guardado" : "Borrador guardado · pendiente de confirmación"}</p>
      {error && <div ref={errorRef} tabIndex={-1} className="mt-3"><WorkflowFeedback tone="error">{error}</WorkflowFeedback></div>}
      {conflict ? <Button className="mt-3 mr-3" variant="outline" onClick={() => void recoverReview()}>Abrir revisión guardada</Button> : (review.sources_changed || error) && !existingDraftId && <Button className="mt-3 mr-3" variant="outline" onClick={() => void updateProposal()}>Actualizar propuesta</Button>}
      {existingDraftId && <Button className="mt-3 mr-3" onClick={() => void onCreated(existingDraftId)}>Continuar borrador existente</Button>}
      {review.status === "draft" && <Button className="mt-3 mr-3 min-h-12" variant="outline" onClick={() => void saveReview()}>Guardar revisión</Button>}
      {review.status === "confirmed" && <Button className="mt-3" variant="outline" disabled={busy} onClick={() => void openNewReview()}>Editar la decisión confirmada</Button>}
      <AsyncButton className="mt-3 min-h-12" disabled={review.sources_changed || conflict || Boolean(existingDraftId)} busy={busy} busyLabel="Guardando…" onClick={() => changeStage("ideas")}>Crear mi año</AsyncButton></div>
    </fieldset>
    {busy && <LoadingState label="Guardando la revisión…" />}
  </div>;
}
