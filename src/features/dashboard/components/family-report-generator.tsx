"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { localDatabaseApiUrl, type LocalStudent } from "@/src/lib/local-database";

type Conclusion = { period_start: string; period_end: string; information_status: "sufficient" | "insufficient"; conclusion_text: string; support_or_conditions: string[]; next_steps: string[] };
type Option = { competency_id: string; name: string; conclusions: Conclusion[] };
type Section = { competency_id: string; information_status: "sufficient" | "insufficient"; progress_summary: string; examples: string[]; support_or_conditions: string[]; next_steps: string[]; family_suggestions: string[]; insufficiency_note: string | null };
type Report = { introduction: string; sections: Section[]; closing_note: string };
type Stored = { id: string; period_start: string; period_end: string; version: number; selected_competency_ids: string[]; details: Report; status: "draft" | "active" | "archived"; teacher_confirmed_at: string | null };
type OptionsResponse = { calendar: { starts_on: string; ends_on: string }; period_start: string; period_end: string; competencies: Option[] };

const sectionLists = ["examples", "support_or_conditions", "next_steps", "family_suggestions"] as const;
const sectionLabels: Record<string, string> = { progress_summary: "Avances y fortalezas", examples: "Ejemplos concretos", support_or_conditions: "Apoyos y condiciones", next_steps: "Próximos pasos", family_suggestions: "Ideas cotidianas para acompañar en casa", insufficiency_note: "Cautela sobre información insuficiente" };
const splitLines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);

export function FamilyReportGenerator({ students }: { students: LocalStudent[] }) {
  const [studentId, setStudentId] = useState("");
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
  const readOnly = Boolean(stored && stored.status !== "draft");
  const selectionMatches = proposal?.sections.length === selectedIds.length && proposal.sections.every((section) => selectedIds.includes(section.competency_id));

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
      setCalendar(data.calendar); setOptions(data.competencies);
      if (!periodStart || !periodEnd) { setPeriodStart(data.period_start); setPeriodEnd(data.period_end); return; }
      const records = await fetch(`${localDatabaseApiUrl}/api/family-reports?${query}`);
      const listed = await records.json() as { reports?: Stored[]; error?: string };
      if (!records.ok) throw new Error(listed.error ?? "No se pudieron cargar los informes.");
      if (!live) return;
      const reports = listed.reports ?? [];
      setHistory(reports);
      const current = reports.find((item) => item.status === "draft") ?? reports.find((item) => item.status === "active") ?? null;
      setStored(current); setProposal(current?.details ?? null); setSelectedIds(current?.selected_competency_ids ?? []); setGenerationId(null);
    })().catch((error: Error) => { if (live) setMessage(error.message); });
    return () => { live = false; };
  }, [studentId, periodStart, periodEnd]);

  function resetEditor() { setStored(null); setProposal(null); setGenerationId(null); setSelectedIds([]); setHistory([]); setOptions([]); setMessage(""); }
  async function send(path: string, method: "POST" | "PUT", body?: object) {
    const response = await fetch(`${localDatabaseApiUrl}${path}`, { method, ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
    const data = await response.json() as Record<string, unknown> & { error?: string };
    if (!response.ok) throw new Error(data.error ?? "No se pudo completar la operación.");
    return data;
  }
  async function generate() {
    setBusy(true); setMessage("");
    try {
      const result = await send("/api/ai/family-reports/generate", "POST", { studentId, periodStart, periodEnd, competencyIds: selectedIds });
      setProposal(result.proposal as Report); setGenerationId(result.generation_id as string);
      setMessage("Propuesta lista. Revísala y guárdala antes de confirmar.");
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function save() {
    if (!proposal || !selectionMatches) return;
    setBusy(true); setMessage("");
    try {
      const result = stored
        ? await send(`/api/family-reports/${stored.id}`, "PUT", { proposal, ...(generationId ? { generationId } : {}) })
        : await send("/api/family-reports", "POST", { studentId, periodStart, periodEnd, competencyIds: selectedIds, proposal, generationId });
      const next: Stored = { id: result.id as string, period_start: periodStart, period_end: periodEnd, version: stored?.version ?? (Math.max(0, ...history.map((item) => item.version)) + 1), selected_competency_ids: [...selectedIds], details: proposal, status: "draft", teacher_confirmed_at: null };
      setStored(next); setHistory([next, ...history.filter((item) => item.id !== next.id)]); setGenerationId(null); setMessage("Borrador guardado.");
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function confirm() {
    if (!stored || generationId || !selectionMatches) return;
    setBusy(true); setMessage("");
    try {
      const result = await send(`/api/family-reports/${stored.id}/confirm`, "POST");
      const active: Stored = { ...stored, details: proposal ?? stored.details, status: "active", teacher_confirmed_at: result.teacher_confirmed_at as string };
      setStored(active); setHistory([active, ...history.filter((item) => item.id !== active.id).map((item) => item.status === "active" ? { ...item, status: "archived" as const } : item)]);
      setMessage("Informe confirmado. Esta versión es de solo lectura.");
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  function editSection(index: number, field: keyof Section, text: string) {
    if (!proposal || readOnly) return;
    const sections = proposal.sections.map((section, itemIndex) => itemIndex === index ? { ...section, [field]: sectionLists.includes(field as typeof sectionLists[number]) ? splitLines(text) : field === "insufficiency_note" ? text || null : text } : section);
    setProposal({ ...proposal, sections });
  }

  return <section className="space-y-5">
    <h2 className="text-xl font-bold">Informe a familias</h2>
    <p className="text-sm text-muted-foreground">Comunica solo conclusiones descriptivas que ya confirmó la docente. El informe no vuelve a evaluar al niño.</p>
    <label className="block">Niño<select className="ml-2 rounded border p-2" value={studentId} onChange={(event) => { resetEditor(); setPeriodStart(""); setPeriodEnd(""); setStudentId(event.target.value); }}><option value="">Selecciona un niño</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>
    {studentId && <div className="flex flex-wrap gap-3"><label>Desde <input type="date" className="rounded border p-2" min={calendar?.starts_on} max={calendar?.ends_on} value={periodStart} onChange={(event) => { setPeriodStart(event.target.value); setProposal(null); setStored(null); }} /></label><label>Hasta <input type="date" className="rounded border p-2" min={calendar?.starts_on} max={calendar?.ends_on} value={periodEnd} onChange={(event) => { setPeriodEnd(event.target.value); setProposal(null); setStored(null); }} /></label></div>}
    {message && <p role="status">{message}</p>}
    {studentId && periodStart && periodEnd && <><p className="text-sm">Las conclusiones deben estar completamente dentro del periodo elegido.</p>
      {options.length === 0 ? <p>No hay conclusiones descriptivas confirmadas para este periodo.</p> : <fieldset className="space-y-3"><legend className="font-semibold">Competencias que deseas comunicar</legend>{options.map((option) => <label key={option.competency_id} className="block rounded-xl border p-3"><input type="checkbox" disabled={readOnly || busy} checked={selectedIds.includes(option.competency_id)} onChange={(event) => setSelectedIds(event.target.checked ? [...selectedIds, option.competency_id].sort() : selectedIds.filter((id) => id !== option.competency_id))} /> <strong>{option.name}</strong>{option.conclusions.map((source, index) => <div key={`${source.period_start}-${index}`} className="mt-2 pl-5 text-sm"><p>{source.period_start} a {source.period_end} · {source.information_status === "insufficient" ? "Información insuficiente" : "Información suficiente"}</p><p>{source.conclusion_text}</p></div>)}</label>)}</fieldset>}
      {!readOnly && <Button disabled={busy || selectedIds.length === 0} onClick={() => void generate()}>{proposal ? "Regenerar informe" : "Generar propuesta"}</Button>}
      {proposal && <div className="space-y-4 rounded-2xl border p-5"><h3 className="font-semibold">{readOnly ? "Informe confirmado · solo lectura" : stored ? "Borrador del informe" : "Propuesta para revisar"}</h3>
        <label className="block">Introducción breve<Textarea disabled={readOnly || busy} value={proposal.introduction} onChange={(event) => setProposal({ ...proposal, introduction: event.target.value })} /></label>
        {proposal.sections.map((section, index) => <section key={section.competency_id} className="space-y-3 rounded-xl border p-4"><h4 className="font-semibold">{options.find((option) => option.competency_id === section.competency_id)?.name ?? "Competencia seleccionada"}</h4><p className="text-sm">{section.information_status === "insufficient" ? "Información insuficiente: conservar la cautela" : "Información confirmada"}</p>{Object.entries(sectionLabels).map(([field, label]) => <label className="block" key={field}>{label}<Textarea disabled={readOnly || busy || field === "insufficiency_note" && section.information_status === "sufficient"} value={Array.isArray(section[field as keyof Section]) ? (section[field as keyof Section] as string[]).join("\n") : String(section[field as keyof Section] ?? "")} onChange={(event) => editSection(index, field as keyof Section, event.target.value)} /></label>)}</section>)}
        <label className="block">Nota final<Textarea disabled={readOnly || busy} value={proposal.closing_note} onChange={(event) => setProposal({ ...proposal, closing_note: event.target.value })} /></label>
        {readOnly ? <Button variant="outline" disabled={busy} onClick={() => { setStored(null); setProposal(null); setGenerationId(null); }}>Preparar nueva versión</Button> : <div className="flex flex-wrap gap-2"><Button disabled={busy || !selectionMatches || !generationId && !stored} onClick={() => void save()}>{stored ? "Guardar cambios" : "Guardar borrador"}</Button><Button variant="outline" disabled={busy} onClick={() => { setProposal(stored?.details ?? null); setSelectedIds(stored?.selected_competency_ids ?? []); setGenerationId(null); }}>Descartar cambios</Button>{stored && <Button disabled={busy || Boolean(generationId) || !selectionMatches} onClick={() => void confirm()}>Confirmar informe</Button>}</div>}
      </div>}
      {history.length > 0 && <section className="space-y-2"><h3 className="font-semibold">Versiones de este periodo</h3>{history.map((item) => <article key={item.id} className="flex items-center justify-between rounded border p-3"><span>Versión {item.version} · {item.status === "draft" ? "Borrador" : item.status === "active" ? "Confirmado" : "Histórico"}</span><Button variant="outline" onClick={() => { setStored(item); setProposal(item.details); setSelectedIds(item.selected_competency_ids); setGenerationId(null); }}>{item.status === "draft" ? "Abrir borrador" : "Ver informe"}</Button></article>)}</section>}
    </>}
  </section>;
}
