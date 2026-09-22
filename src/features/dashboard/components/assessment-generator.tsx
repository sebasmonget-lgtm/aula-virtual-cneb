"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { localDatabaseApiUrl, type LocalStudent } from "@/src/lib/local-database";

type Option = { competency_v4_id: string; name: string; evidence_count: number };
type Proposal = { competency_id: string; information_status: "sufficient" | "insufficient"; evidence_overview: string; observable_patterns: string[]; strengths_and_advances: string[]; support_needs: string[]; next_opportunities: string[]; teacher_questions: string[]; insufficiency_reason: string | null; caution: string };
type Stored = { id: string; period_start: string; period_end: string; version: number; details: Proposal; status: "draft" | "active" | "archived"; teacher_confirmed_at: string | null; evidence_count: number };
type TimelineItem = { observed_on: string; activity_title: string; criterion_text: string; observation_status: string; observation_note: string | null; media_available: boolean };
const arrays = ["observable_patterns", "strengths_and_advances", "support_needs", "next_opportunities", "teacher_questions"] as const;
const labels: Record<string, string> = { evidence_overview: "Panorama de evidencias", observable_patterns: "Patrones observables", strengths_and_advances: "Fortalezas y avances", support_needs: "Apoyos necesarios", next_opportunities: "Próximas oportunidades", teacher_questions: "Preguntas para la docente", insufficiency_reason: "Razón de información insuficiente", caution: "Cautela docente" };

export function AssessmentGenerator({ students }: { students: LocalStudent[] }) {
  const [studentId, setStudentId] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [competencyId, setCompetencyId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [stored, setStored] = useState<Stored | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [latest, setLatest] = useState<Stored | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const readOnly = stored?.status === "active";
  const selected = options.find((item) => item.competency_v4_id === competencyId);

  useEffect(() => {
    if (!studentId) return;
    let live = true;
    void fetch(`${localDatabaseApiUrl}/api/assessments/options?studentId=${encodeURIComponent(studentId)}`).then(async (response) => {
      if (!response.ok) throw new Error("No se pudieron cargar las competencias.");
      return response.json() as Promise<{ competencies: Option[]; calendar: { starts_on: string; ends_on: string } }>;
    }).then((data) => { if (live) { setOptions(data.competencies); setStart(data.calendar.starts_on.slice(0, 10)); setEnd(data.calendar.ends_on.slice(0, 10)); } }).catch((error: Error) => { if (live) setMessage(error.message); });
    return () => { live = false; };
  }, [studentId]);

  useEffect(() => {
    if (!studentId || !competencyId || !start || !end) return;
    let live = true;
    const query = new URLSearchParams({ studentId, competencyId, periodStart: start, periodEnd: end });
    void Promise.all([
      fetch(`${localDatabaseApiUrl}/api/assessments?studentId=${encodeURIComponent(studentId)}&competencyId=${encodeURIComponent(competencyId)}`).then((response) => response.json() as Promise<{ assessments?: Stored[] }>),
      fetch(`${localDatabaseApiUrl}/api/assessments/context?${query}`).then((response) => response.json() as Promise<{ timeline?: TimelineItem[]; latest_confirmed?: Stored }>),
    ]).then(([records, context]) => {
      if (!live) return;
      const matches = (records.assessments ?? []).filter((item) => item.period_start === start && item.period_end === end);
      const current = matches.find((item) => item.status === "draft") ?? matches.find((item) => item.status === "active") ?? null;
      setStored(current);
      setProposal(current?.details ?? null);
      setGenerationId(null);
      setTimeline(context.timeline ?? []);
      setLatest(context.latest_confirmed ?? null);
    }).catch((error: Error) => { if (live) setMessage(error.message); });
    return () => { live = false; };
  }, [studentId, competencyId, start, end]);

  useEffect(() => {
    if (!studentId || !competencyId) return;
    let live = true;
    void fetch(`${localDatabaseApiUrl}/api/assessments?studentId=${encodeURIComponent(studentId)}&competencyId=${encodeURIComponent(competencyId)}`).then((response) => response.json() as Promise<{ assessments?: Stored[] }>).then((data) => {
      if (!live) return;
      const current = data.assessments?.find((item) => item.status === "draft") ?? data.assessments?.find((item) => item.status === "active");
      if (current) { setStart(current.period_start); setEnd(current.period_end); }
    });
    return () => { live = false; };
  }, [studentId, competencyId]);

  async function generate() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${localDatabaseApiUrl}/api/ai/assessments/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ studentId, competencyId, periodStart: start, periodEnd: end }) });
      const data = await response.json() as { error?: string; proposal: Proposal; generation_id: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo preparar el análisis.");
      setProposal(data.proposal); setGenerationId(data.generation_id);
      setMessage("Propuesta de análisis. Revísala antes de confirmar.");
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function save() {
    if (!proposal) return;
    setBusy(true); setMessage("");
    try {
      const endpoint = stored ? `/api/assessments/${stored.id}` : "/api/assessments";
      const body = stored ? { proposal, ...(generationId ? { generationId } : {}) } : { studentId, competencyId, periodStart: start, periodEnd: end, proposal, generationId };
      const response = await fetch(`${localDatabaseApiUrl}${endpoint}`, { method: stored ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json() as { error?: string; id: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar el borrador.");
      setStored({ id: data.id, period_start: start, period_end: end, version: stored?.version ?? 1, details: proposal, status: "draft", teacher_confirmed_at: null, evidence_count: timeline.length });
      setGenerationId(null); setMessage("Borrador guardado.");
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function confirm() {
    if (!stored || !proposal || generationId) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${localDatabaseApiUrl}/api/assessments/${stored.id}/confirm`, { method: "POST" });
      const data = await response.json() as { error?: string; teacher_confirmed_at: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo confirmar el análisis.");
      setStored({ ...stored, status: "active", teacher_confirmed_at: data.teacher_confirmed_at });
      setLatest({ ...stored, status: "active", teacher_confirmed_at: data.teacher_confirmed_at });
      setMessage("Análisis confirmado por la docente.");
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  function update(field: string, text: string) {
    if (!proposal) return;
    const value = arrays.includes(field as typeof arrays[number]) ? text.split("\n").map((line) => line.trim()).filter(Boolean) : field === "insufficiency_reason" ? text || null : text;
    setProposal({ ...proposal, [field]: value });
  }

  return <section className="space-y-4">
    <h2 className="text-xl font-bold">Análisis de evidencias</h2>
    <select aria-label="Niño" value={studentId} onChange={(event) => { setStudentId(event.target.value); setCompetencyId(""); setOptions([]); setStored(null); setProposal(null); setTimeline([]); }}><option value="">Selecciona un niño</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select>
    {studentId && <select aria-label="Competencia" value={competencyId} onChange={(event) => { setCompetencyId(event.target.value); setStored(null); setProposal(null); }}><option value="">Selecciona una competencia v4</option>{options.map((option) => <option key={option.competency_v4_id} value={option.competency_v4_id}>{option.name} · {option.evidence_count} evidencias</option>)}</select>}
    {competencyId && <><p className="font-semibold">{selected?.name}</p><div className="flex gap-2"><label>Desde <input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>Hasta <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label></div><p>{timeline.length} evidencias en este periodo.</p>
      {latest && <p>Último análisis confirmado: {latest.period_start} a {latest.period_end} · {latest.details.information_status === "sufficient" ? "Información suficiente" : "Información insuficiente"}</p>}
      <div className="space-y-2"><h3 className="font-semibold">Cronología de evidencias</h3>{timeline.map((item, index) => <article key={`${item.observed_on}-${index}`} className="rounded-xl border p-3"><p>{new Date(item.observed_on).toLocaleDateString("es-PE")} · {item.activity_title}</p><p>{item.criterion_text} · {item.observation_status}</p>{item.observation_note && <p>{item.observation_note}</p>}{item.media_available && <p>Recurso adjunto disponible</p>}</article>)}</div>
      {message && <p role="status">{message}</p>}
      {!proposal ? <Button disabled={busy || timeline.length === 0} onClick={() => void generate()}>Analizar evidencias con IA</Button> : <div className="space-y-3"><p>{readOnly ? "Análisis confirmado · solo lectura" : stored ? "Borrador de análisis · revisa antes de confirmar" : "Propuesta de análisis. Revísala antes de confirmar."}</p><p>{proposal.information_status === "sufficient" ? "Información suficiente" : "Información todavía insuficiente"}</p>
        {Object.keys(labels).map((field) => <label key={field} className="block">{labels[field]}<Textarea disabled={readOnly || busy || field === "insufficiency_reason" && proposal.information_status === "sufficient"} value={Array.isArray(proposal[field as keyof Proposal]) ? (proposal[field as keyof Proposal] as string[]).join("\n") : String(proposal[field as keyof Proposal] ?? "")} onChange={(event) => update(field, event.target.value)} /></label>)}
        {readOnly ? <Button variant="outline" disabled={busy} onClick={() => { setStored(null); setProposal(null); setGenerationId(null); }}>Preparar nueva versión</Button> : <div className="flex flex-wrap gap-2"><Button disabled={busy || !proposal} onClick={() => void save()}>{stored ? "Guardar cambios" : "Guardar borrador"}</Button><Button variant="outline" disabled={busy} onClick={() => void generate()}>Regenerar</Button><Button variant="outline" disabled={busy} onClick={() => { setProposal(stored?.details ?? null); setGenerationId(null); }}>Descartar cambios</Button>{stored && <Button disabled={busy || Boolean(generationId)} onClick={() => void confirm()}>Confirmar análisis</Button>}</div>}
      </div>}
    </>}
  </section>;
}
