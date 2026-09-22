"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { localDatabaseApiUrl, type LocalStudent } from "@/src/lib/local-database";

type AssessmentOption = { id: string; competency_name: string; competency_v4_id: string; period_start: string; period_end: string; information_status: "sufficient" | "insufficient"; evidence_overview: string; strengths_and_advances: string[]; support_needs: string[]; next_opportunities: string[] };
type Evidence = { observed_on: string; activity_title: string; criterion_text: string; observation_status: string; observation_note: string | null };
type Conclusion = { competency_id: string; information_status: "sufficient" | "insufficient"; conclusion_text: string; progress_examples: string[]; support_or_conditions: string[]; next_steps: string[]; insufficiency_reason: string | null; caution: string };
type Stored = { id: string; status: "draft" | "active" | "archived"; details: Conclusion; teacher_confirmed_at: string | null; version: number };
const arrays = ["progress_examples", "support_or_conditions", "next_steps"] as const;
const labels: Record<string, string> = { conclusion_text: "Conclusión descriptiva", progress_examples: "Ejemplos de progreso", support_or_conditions: "Apoyos o condiciones", next_steps: "Próximos pasos", insufficiency_reason: "Razón de información insuficiente", caution: "Cautela docente" };

export function DescriptiveConclusionGenerator({ students }: { students: LocalStudent[] }) {
  const [studentId, setStudentId] = useState("");
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [assessmentId, setAssessmentId] = useState("");
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [teacherNotes, setTeacherNotes] = useState("");
  const [stored, setStored] = useState<Stored | null>(null);
  const [proposal, setProposal] = useState<Conclusion | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = assessments.find((item) => item.id === assessmentId);
  const readOnly = stored?.status === "active";

  useEffect(() => {
    if (!studentId) return;
    let live = true;
    void fetch(`${localDatabaseApiUrl}/api/descriptive-conclusions/options?studentId=${encodeURIComponent(studentId)}`).then(async (response) => {
      if (!response.ok) throw new Error("No se pudieron cargar los análisis confirmados.");
      return response.json() as Promise<{ assessments: AssessmentOption[] }>;
    }).then((data) => { if (live) { setAssessments(data.assessments); setAssessmentId(data.assessments[0]?.id ?? ""); } }).catch((error: Error) => { if (live) setMessage(error.message); });
    return () => { live = false; };
  }, [studentId]);

  useEffect(() => {
    if (!studentId || !assessmentId) return;
    let live = true;
    const query = new URLSearchParams({ studentId, assessmentId });
    void Promise.all([
      fetch(`${localDatabaseApiUrl}/api/descriptive-conclusions?${query}`).then((response) => response.json() as Promise<{ conclusions?: Stored[]; error?: string }>),
      fetch(`${localDatabaseApiUrl}/api/descriptive-conclusions/context?assessmentId=${encodeURIComponent(assessmentId)}`).then((response) => response.json() as Promise<{ evidence?: Evidence[]; error?: string }>),
    ]).then(([records, context]) => {
      if (!live) return;
      if (records.error || context.error) throw new Error(records.error ?? context.error);
      const current = records.conclusions?.find((item) => item.status === "draft") ?? records.conclusions?.find((item) => item.status === "active") ?? null;
      setStored(current); setProposal(current?.details ?? null); setGenerationId(null); setEvidence(context.evidence ?? []);
    }).catch((error: Error) => { if (live) setMessage(error.message); });
    return () => { live = false; };
  }, [studentId, assessmentId]);

  async function generate() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${localDatabaseApiUrl}/api/ai/descriptive-conclusions/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ studentId, assessmentId, teacherNotes }) });
      const data = await response.json() as { proposal: Conclusion; generation_id: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo preparar la conclusión.");
      setProposal(data.proposal); setGenerationId(data.generation_id);
      setMessage("Propuesta de conclusión. Revísala antes de confirmar.");
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function save() {
    if (!proposal) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${localDatabaseApiUrl}${stored ? `/api/descriptive-conclusions/${stored.id}` : "/api/descriptive-conclusions"}`, { method: stored ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(stored ? { proposal, ...(generationId ? { generationId } : {}) } : { studentId, assessmentId, proposal, generationId }) });
      const data = await response.json() as { id: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la conclusión.");
      setStored({ id: data.id, status: "draft", details: proposal, teacher_confirmed_at: null, version: stored?.version ?? 1 });
      setGenerationId(null); setMessage("Borrador guardado.");
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function confirm() {
    if (!stored || generationId) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${localDatabaseApiUrl}/api/descriptive-conclusions/${stored.id}/confirm`, { method: "POST" });
      const data = await response.json() as { teacher_confirmed_at: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo confirmar la conclusión.");
      setStored({ ...stored, status: "active", teacher_confirmed_at: data.teacher_confirmed_at });
      setMessage("Conclusión confirmada por la docente.");
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  function edit(field: string, text: string) {
    if (!proposal) return;
    const value = arrays.includes(field as typeof arrays[number]) ? text.split("\n").map((line) => line.trim()).filter(Boolean) : field === "insufficiency_reason" ? text || null : text;
    setProposal({ ...proposal, [field]: value });
  }

  return <section className="space-y-4">
    <h2 className="text-xl font-bold">Conclusiones descriptivas</h2>
    <select aria-label="Niño" value={studentId} onChange={(event) => { setStudentId(event.target.value); setAssessmentId(""); setAssessments([]); setEvidence([]); setTeacherNotes(""); setMessage(""); setStored(null); setProposal(null); }}><option value="">Selecciona un niño</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select>
    {studentId && assessments.length === 0 && <p>Confirma primero el análisis de evidencias de esta competencia.</p>}
    {assessments.length > 0 && <select aria-label="Competencia con análisis confirmado" value={assessmentId} onChange={(event) => { setAssessmentId(event.target.value); setTeacherNotes(""); setMessage(""); setStored(null); setProposal(null); }}><option value="">Selecciona una competencia</option>{assessments.map((item) => <option key={item.id} value={item.id}>{item.competency_name} · {item.period_start} a {item.period_end}</option>)}</select>}
    {selected && <><p className="font-semibold">{selected.competency_name}</p><p>Periodo: {selected.period_start} a {selected.period_end}</p><p>Análisis confirmado: {selected.information_status === "sufficient" ? "Información suficiente" : "Información insuficiente"}</p><p>{selected.evidence_overview}</p><p>{evidence.length} evidencias de soporte.</p>
      <ul className="space-y-2">{evidence.map((item, index) => <li key={`${item.observed_on}-${index}`} className="rounded-xl border p-3">{new Date(item.observed_on).toLocaleDateString("es-PE")} · {item.activity_title} · {item.criterion_text} · {item.observation_status}{item.observation_note && <p>{item.observation_note}</p>}</li>)}</ul>
      <label className="block">Nota docente opcional<Textarea disabled={readOnly || busy} value={teacherNotes} onChange={(event) => setTeacherNotes(event.target.value)} /></label>
      {message && <p role="status">{message}</p>}
      {!proposal ? <Button disabled={busy || evidence.length === 0} onClick={() => void generate()}>Preparar conclusión descriptiva</Button> : <div className="space-y-3"><p>{readOnly ? "Conclusión confirmada · solo lectura" : "Propuesta de conclusión. Revísala antes de confirmar."}</p><p>Estado de información: {proposal.information_status === "sufficient" ? "suficiente" : "insuficiente"}</p>
        {Object.keys(labels).map((field) => <label className="block" key={field}>{labels[field]}<Textarea disabled={readOnly || busy || field === "insufficiency_reason" && proposal.information_status === "sufficient"} value={Array.isArray(proposal[field as keyof Conclusion]) ? (proposal[field as keyof Conclusion] as string[]).join("\n") : String(proposal[field as keyof Conclusion] ?? "")} onChange={(event) => edit(field, event.target.value)} /></label>)}
        {readOnly ? <Button variant="outline" disabled={busy} onClick={() => { setStored(null); setProposal(null); setGenerationId(null); }}>Preparar nueva versión</Button> : <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void save()}>{stored ? "Guardar cambios" : "Guardar borrador"}</Button><Button variant="outline" disabled={busy} onClick={() => void generate()}>Regenerar</Button><Button variant="outline" disabled={busy} onClick={() => { setProposal(stored?.details ?? null); setGenerationId(null); }}>Descartar</Button>{stored && <Button disabled={busy || Boolean(generationId)} onClick={() => void confirm()}>Confirmar conclusión</Button>}</div>}
      </div>}
    </>}
  </section>;
}
