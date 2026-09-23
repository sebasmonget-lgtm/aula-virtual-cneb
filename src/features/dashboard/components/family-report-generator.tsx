"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { localDatabaseApiUrl, type LocalStudent } from "@/src/lib/local-database";
import { AsyncButton, EmptyState, LoadingState, ReadOnlyField, WorkflowFeedback } from "./workflow-ui";

type Conclusion = { period_start: string; period_end: string; information_status: "sufficient" | "insufficient"; conclusion_text: string; support_or_conditions: string[]; next_steps: string[] };
type Option = { competency_id: string; name: string; conclusions: Conclusion[] };
type Section = { competency_id: string; information_status: "sufficient" | "insufficient"; progress_summary: string; examples: string[]; support_or_conditions: string[]; next_steps: string[]; family_suggestions: string[]; insufficiency_note: string | null };
type Report = { introduction: string; sections: Section[]; closing_note: string };
type Stored = { id: string; period_start: string; period_end: string; version: number; selected_competency_ids: string[]; details: Report; status: "draft" | "active" | "archived"; teacher_confirmed_at: string | null };
type OptionsResponse = { calendar: { starts_on: string; ends_on: string }; period_start: string; period_end: string; competencies: Option[] };

const sectionLists = ["examples", "support_or_conditions", "next_steps", "family_suggestions"] as const;
const sectionLabels: Record<string, string> = { progress_summary: "Avances y fortalezas", examples: "Ejemplos concretos", support_or_conditions: "Apoyos y condiciones", next_steps: "Próximos pasos", family_suggestions: "Ideas cotidianas para acompañar en casa", insufficiency_note: "Cautela sobre información insuficiente" };
const splitLines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);

export function FamilyReportGenerator({ students, initialStudentId = "", onConclusion }: { students: LocalStudent[]; initialStudentId?: string; onConclusion?: (studentId: string) => void }) {
  const [studentId, setStudentId] = useState(initialStudentId);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [calendar, setCalendar] = useState<OptionsResponse["calendar"] | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [history, setHistory] = useState<Stored[]>([]);
  const [stored, setStored] = useState<Stored | null>(null);
  const [proposal, setProposal] = useState<Report | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState<"generate" | "save" | "confirm" | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");
  const readOnly = Boolean(stored && stored.status !== "draft");
  const selectionMatches = proposal?.sections.length === selectedIds.length && proposal.sections.every((section) => selectedIds.includes(section.competency_id));
  const hasUnsavedChanges = Boolean(stored && proposal && (generationId || JSON.stringify(proposal) !== JSON.stringify(stored.details) || JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...stored.selected_competency_ids].sort())));

  useEffect(() => {
    if (!studentId) return;
    let live = true;
    const query = new URLSearchParams({ studentId });
    if (periodStart) query.set("periodStart", periodStart);
    if (periodEnd) query.set("periodEnd", periodEnd);
    void (async () => {
      const response = await fetch(`${localDatabaseApiUrl}/api/family-reports/options?${query}`);
      const data = await response.json() as OptionsResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar las conclusiones confirmadas.");
      if (!live) return;
      setCalendar(data.calendar); setOptions(data.competencies); setLoadError(false); setMessage("");
      if (!periodStart || !periodEnd) { setPeriodStart(data.period_start); setPeriodEnd(data.period_end); return; }
      const records = await fetch(`${localDatabaseApiUrl}/api/family-reports?${query}`);
      const listed = await records.json() as { reports?: Stored[]; error?: string };
      if (!records.ok) throw new Error(listed.error ?? "No se pudieron cargar los informes.");
      if (!live) return;
      const reports = listed.reports ?? [];
      setHistory(reports);
      const current = reports.find((item) => item.status === "draft") ?? reports.find((item) => item.status === "active") ?? null;
      setStored(current); setProposal(current?.details ?? null); setSelectedIds(current?.selected_competency_ids ?? []); setGenerationId(null);
    })().catch((error: Error) => { if (live) { setLoadError(true); setOptions([]); setHistory([]); setStored(null); setProposal(null); setSelectedIds([]); setMessage(error.message); setMessageTone("error"); setLoadingOptions(false); } }).finally(() => { if (live && periodStart && periodEnd) setLoadingOptions(false); });
    return () => { live = false; };
  }, [studentId, periodStart, periodEnd, reload]);

  function resetEditor() { setStored(null); setProposal(null); setGenerationId(null); setSelectedIds([]); setHistory([]); setOptions([]); setLoadError(false); setMessage(""); }
  async function send(path: string, method: "POST" | "PUT", body?: object) {
    const response = await fetch(`${localDatabaseApiUrl}${path}`, { method, ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
    const data = await response.json() as Record<string, unknown> & { error?: string };
    if (!response.ok) throw new Error(data.error ?? "No se pudo completar la operación.");
    return data;
  }
  async function generate() {
    setBusy(true); setOperation("generate"); setMessage("");
    try {
      const result = await send("/api/ai/family-reports/generate", "POST", { studentId, periodStart, periodEnd, competencyIds: selectedIds });
      setProposal(result.proposal as Report); setGenerationId(result.generation_id as string);
      setMessage("Propuesta lista. Revísala y guárdala antes de confirmar."); setMessageTone("success");
    } catch (error) { setMessage((error as Error).message); setMessageTone("error"); } finally { setBusy(false); setOperation(null); }
  }
  async function save() {
    if (!proposal || !selectionMatches) return;
    setBusy(true); setOperation("save"); setMessage("");
    try {
      const result = stored
        ? await send(`/api/family-reports/${stored.id}`, "PUT", { proposal, ...(generationId ? { generationId } : {}) })
        : await send("/api/family-reports", "POST", { studentId, periodStart, periodEnd, competencyIds: selectedIds, proposal, generationId });
      const next: Stored = { id: result.id as string, period_start: periodStart, period_end: periodEnd, version: stored?.version ?? (Math.max(0, ...history.map((item) => item.version)) + 1), selected_competency_ids: [...selectedIds], details: proposal, status: "draft", teacher_confirmed_at: null };
      setStored(next); setHistory([next, ...history.filter((item) => item.id !== next.id)]); setGenerationId(null); setMessage("Borrador guardado."); setMessageTone("success");
    } catch (error) { setMessage((error as Error).message); setMessageTone("error"); } finally { setBusy(false); setOperation(null); }
  }
  async function confirm() {
    if (!stored || hasUnsavedChanges || !selectionMatches) return;
    setBusy(true); setOperation("confirm"); setMessage("");
    try {
      const result = await send(`/api/family-reports/${stored.id}/confirm`, "POST");
      const active: Stored = { ...stored, details: proposal ?? stored.details, status: "active", teacher_confirmed_at: result.teacher_confirmed_at as string };
      setStored(active); setHistory([active, ...history.filter((item) => item.id !== active.id).map((item) => item.status === "active" ? { ...item, status: "archived" as const } : item)]);
      setMessage("Informe confirmado. Esta versión es de solo lectura."); setMessageTone("success");
    } catch (error) { setMessage((error as Error).message); setMessageTone("error"); } finally { setBusy(false); setOperation(null); }
  }
  function editSection(index: number, field: keyof Section, text: string) {
    if (!proposal || readOnly) return;
    const sections = proposal.sections.map((section, itemIndex) => itemIndex === index ? { ...section, [field]: sectionLists.includes(field as typeof sectionLists[number]) ? splitLines(text) : field === "insufficiency_note" ? text || null : text } : section);
    setProposal({ ...proposal, sections });
  }

  return <section className="ayni-workflow space-y-5">
    <header><h2 className="text-xl font-extrabold">Informe a familias</h2><p className="mt-1 text-sm text-muted-foreground">Comparte conclusiones confirmadas con palabras claras para la familia.</p></header>
    <div className="ayni-panel space-y-4 p-4 sm:p-5"><label className="block">Niño<select value={studentId} onChange={(event) => { resetEditor(); setPeriodStart(""); setPeriodEnd(""); setStudentId(event.target.value); setLoadingOptions(Boolean(event.target.value)); }}><option value="">Selecciona un niño</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>
      {studentId && <div className="grid gap-3 sm:grid-cols-2"><label>Desde<input type="date" min={calendar?.starts_on} max={calendar?.ends_on} value={periodStart} onChange={(event) => { setPeriodStart(event.target.value); setProposal(null); setStored(null); setLoadingOptions(Boolean(event.target.value && periodEnd)); }} /></label><label>Hasta<input type="date" min={calendar?.starts_on} max={calendar?.ends_on} value={periodEnd} onChange={(event) => { setPeriodEnd(event.target.value); setProposal(null); setStored(null); setLoadingOptions(Boolean(periodStart && event.target.value)); }} /></label></div>}
      {studentId && <p className="text-xs text-[#526b87]">Las conclusiones deben quedar completamente dentro del periodo elegido.</p>}
    </div>
    {!studentId && <EmptyState title={students.length ? "Elige un niño para comenzar" : "Aún no hay niños en el aula"} description={students.length ? "Aquí podrás elegir las conclusiones que deseas comunicar a su familia." : "Añade alumnos desde Niños antes de preparar un informe."} />}
    {loadingOptions && <LoadingState label="Cargando conclusiones e informes..." />}
    {message && <WorkflowFeedback tone={messageTone}>{message}</WorkflowFeedback>}
    {loadError && <Button variant="outline" onClick={() => { setLoadingOptions(true); setReload((value) => value + 1); }}>Reintentar carga de informes</Button>}
    {studentId && periodStart && periodEnd && !loadingOptions && !loadError && <>
      {options.length === 0 ? <EmptyState title="Sin conclusiones para este periodo" description="Confirma primero una conclusión descriptiva dentro de las fechas seleccionadas." action={onConclusion && <Button variant="outline" onClick={() => onConclusion(studentId)}>Ir a conclusiones</Button>} /> : <fieldset className="ayni-panel space-y-3 p-4 sm:p-5"><legend className="sr-only">Competencias que deseas comunicar</legend><h3 className="font-bold">Competencias que deseas comunicar</h3><p className="text-sm text-[#526b87]">Selecciona las conclusiones que formarán parte del informe.</p>{options.map((option) => <label key={option.competency_id} className="ayni-choice block"><span className="flex items-center gap-3"><input type="checkbox" disabled={readOnly || busy} checked={selectedIds.includes(option.competency_id)} onChange={(event) => setSelectedIds(event.target.checked ? [...selectedIds, option.competency_id].sort() : selectedIds.filter((id) => id !== option.competency_id))} /><strong>{option.name}</strong></span>{option.conclusions.map((source, index) => <span key={`${source.period_start}-${index}`} className="mt-2 block pl-7 text-sm font-normal"><span className="block text-[#526b87]">{source.period_start} a {source.period_end} · {source.information_status === "insufficient" ? "Información insuficiente" : "Información suficiente"}</span><span className="mt-1 block">{source.conclusion_text}</span></span>)}</label>)}</fieldset>}
      {!readOnly && options.length > 0 && <div><AsyncButton busy={operation === "generate"} busyLabel="Preparando el informe..." disabled={busy || selectedIds.length === 0} onClick={() => void generate()}>{proposal ? "Regenerar informe" : "Generar propuesta"}</AsyncButton>{selectedIds.length === 0 && <p className="mt-2 text-xs text-[#526b87]">Selecciona al menos una competencia para generar el informe.</p>}</div>}
      {proposal && <div className="ayni-panel space-y-4 p-4 sm:p-6"><WorkflowFeedback tone={readOnly ? "success" : "info"}>{readOnly ? "Informe confirmado · solo lectura" : stored ? "Borrador del informe · revisa antes de confirmar" : "Propuesta de informe. Revísala antes de guardar."}</WorkflowFeedback>
        {readOnly ? <ReadOnlyField label="Introducción breve" value={proposal.introduction} /> : <label className="block">Introducción breve<Textarea disabled={busy} value={proposal.introduction} onChange={(event) => setProposal({ ...proposal, introduction: event.target.value })} /></label>}
        {proposal.sections.map((section, index) => <section key={section.competency_id} className="space-y-3 rounded-xl border bg-[#fbfdff] p-4"><h4 className="font-bold">{options.find((option) => option.competency_id === section.competency_id)?.name ?? "Competencia seleccionada"}</h4><p className="text-sm text-[#526b87]">{section.information_status === "insufficient" ? "Información insuficiente: conservar la cautela" : "Información confirmada"}</p>{Object.entries(sectionLabels).map(([field, label]) => { const value = Array.isArray(section[field as keyof Section]) ? section[field as keyof Section] as string[] : String(section[field as keyof Section] ?? ""); return readOnly ? <ReadOnlyField key={field} label={label} value={value} /> : <label className="block" key={field}>{label}<Textarea disabled={busy || field === "insufficiency_note" && section.information_status === "sufficient"} value={Array.isArray(value) ? value.join("\n") : value} onChange={(event) => editSection(index, field as keyof Section, event.target.value)} /></label>; })}</section>)}
        {readOnly ? <ReadOnlyField label="Nota final" value={proposal.closing_note} /> : <label className="block">Nota final<Textarea disabled={busy} value={proposal.closing_note} onChange={(event) => setProposal({ ...proposal, closing_note: event.target.value })} /></label>}
        {readOnly ? <Button variant="outline" onClick={() => { setStored(null); setProposal(null); setGenerationId(null); }}>Preparar nueva versión</Button> : <>{hasUnsavedChanges && <p className="text-sm text-[#526b87]">Guarda los cambios antes de confirmar.</p>}<div className="flex flex-wrap gap-2"><AsyncButton busy={operation === "save"} busyLabel="Guardando..." disabled={busy || !selectionMatches || !generationId && !stored} onClick={() => void save()}>{stored ? "Guardar cambios" : "Guardar borrador"}</AsyncButton><Button variant="outline" disabled={busy} onClick={() => { setProposal(stored?.details ?? null); setSelectedIds(stored?.selected_competency_ids ?? []); setGenerationId(null); }}>Descartar cambios</Button>{stored && <AsyncButton busy={operation === "confirm"} busyLabel="Confirmando..." disabled={busy || hasUnsavedChanges || !selectionMatches} onClick={() => void confirm()}>Confirmar informe</AsyncButton>}</div></>}
      </div>}
      {history.length > 0 && <section className="ayni-panel space-y-3 p-4 sm:p-5"><h3 className="font-bold">Versiones de este periodo</h3>{history.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-[#fbfdff] p-3"><span>Versión {item.version} · {item.status === "draft" ? "Borrador" : item.status === "active" ? "Confirmado" : "Histórico"}</span><Button variant="outline" onClick={() => { setStored(item); setProposal(item.details); setSelectedIds(item.selected_competency_ids); setGenerationId(null); }}>{item.status === "draft" ? "Abrir borrador" : "Ver informe"}</Button></article>)}</section>}
    </>}
  </section>;
}
