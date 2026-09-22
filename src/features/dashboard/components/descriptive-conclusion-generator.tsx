"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { localDatabaseApiUrl, type LocalStudent } from "@/src/lib/local-database";
import { AsyncButton, EmptyState, LoadingState, ReadOnlyField, WorkflowFeedback } from "./workflow-ui";

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
  const [operation, setOperation] = useState<"generate" | "save" | "confirm" | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [optionsError, setOptionsError] = useState(false);
  const [contextError, setContextError] = useState(false);
  const [optionsReload, setOptionsReload] = useState(0);
  const [contextReload, setContextReload] = useState(0);
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");
  const selected = assessments.find((item) => item.id === assessmentId);
  const readOnly = stored?.status === "active";
  const hasUnsavedChanges = Boolean(stored && proposal && (generationId || JSON.stringify(proposal) !== JSON.stringify(stored.details)));

  useEffect(() => {
    if (!studentId) return;
    let live = true;
    void fetch(`${localDatabaseApiUrl}/api/descriptive-conclusions/options?studentId=${encodeURIComponent(studentId)}`).then(async (response) => {
      if (!response.ok) throw new Error("No se pudieron cargar los análisis confirmados.");
      return response.json() as Promise<{ assessments: AssessmentOption[] }>;
    }).then((data) => { if (live) { setAssessments(data.assessments); setAssessmentId(data.assessments[0]?.id ?? ""); setLoadingContext(Boolean(data.assessments[0]?.id)); setOptionsError(false); setMessage(""); } }).catch((error: Error) => { if (live) { setOptionsError(true); setAssessments([]); setMessage(error.message); setMessageTone("error"); } }).finally(() => { if (live) setLoadingOptions(false); });
    return () => { live = false; };
  }, [studentId, optionsReload]);

  useEffect(() => {
    if (!studentId || !assessmentId) return;
    let live = true;
    const query = new URLSearchParams({ studentId, assessmentId });
    void Promise.all([
      fetch(`${localDatabaseApiUrl}/api/descriptive-conclusions?${query}`).then((response) => { if (!response.ok) throw new Error("No se pudieron cargar las conclusiones."); return response.json() as Promise<{ conclusions?: Stored[]; error?: string }>; }),
      fetch(`${localDatabaseApiUrl}/api/descriptive-conclusions/context?assessmentId=${encodeURIComponent(assessmentId)}`).then((response) => { if (!response.ok) throw new Error("No se pudieron cargar las evidencias de soporte."); return response.json() as Promise<{ evidence?: Evidence[]; error?: string }>; }),
    ]).then(([records, context]) => {
      if (!live) return;
      if (records.error || context.error) throw new Error(records.error ?? context.error);
      const current = records.conclusions?.find((item) => item.status === "draft") ?? records.conclusions?.find((item) => item.status === "active") ?? null;
      setStored(current); setProposal(current?.details ?? null); setGenerationId(null); setEvidence(context.evidence ?? []);
      setContextError(false); setMessage("");
    }).catch((error: Error) => { if (live) { setContextError(true); setStored(null); setProposal(null); setEvidence([]); setMessage(error.message); setMessageTone("error"); } }).finally(() => { if (live) setLoadingContext(false); });
    return () => { live = false; };
  }, [studentId, assessmentId, contextReload]);

  async function generate() {
    setBusy(true); setOperation("generate"); setMessage("");
    try {
      const response = await fetch(`${localDatabaseApiUrl}/api/ai/descriptive-conclusions/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ studentId, assessmentId, teacherNotes }) });
      const data = await response.json() as { proposal: Conclusion; generation_id: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo preparar la conclusión.");
      setProposal(data.proposal); setGenerationId(data.generation_id);
      setMessage("Propuesta de conclusión. Revísala antes de confirmar."); setMessageTone("success");
    } catch (error) { setMessage((error as Error).message); setMessageTone("error"); } finally { setBusy(false); setOperation(null); }
  }
  async function save() {
    if (!proposal) return;
    setBusy(true); setOperation("save"); setMessage("");
    try {
      const response = await fetch(`${localDatabaseApiUrl}${stored ? `/api/descriptive-conclusions/${stored.id}` : "/api/descriptive-conclusions"}`, { method: stored ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(stored ? { proposal, ...(generationId ? { generationId } : {}) } : { studentId, assessmentId, proposal, generationId }) });
      const data = await response.json() as { id: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la conclusión.");
      setStored({ id: data.id, status: "draft", details: proposal, teacher_confirmed_at: null, version: stored?.version ?? 1 });
      setGenerationId(null); setMessage("Borrador guardado."); setMessageTone("success");
    } catch (error) { setMessage((error as Error).message); setMessageTone("error"); } finally { setBusy(false); setOperation(null); }
  }
  async function confirm() {
    if (!stored || hasUnsavedChanges) return;
    setBusy(true); setOperation("confirm"); setMessage("");
    try {
      const response = await fetch(`${localDatabaseApiUrl}/api/descriptive-conclusions/${stored.id}/confirm`, { method: "POST" });
      const data = await response.json() as { teacher_confirmed_at: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo confirmar la conclusión.");
      setStored({ ...stored, status: "active", teacher_confirmed_at: data.teacher_confirmed_at });
      setMessage("Conclusión confirmada por la docente."); setMessageTone("success");
    } catch (error) { setMessage((error as Error).message); setMessageTone("error"); } finally { setBusy(false); setOperation(null); }
  }
  function edit(field: string, text: string) {
    if (!proposal) return;
    const value = arrays.includes(field as typeof arrays[number]) ? text.split("\n").map((line) => line.trim()).filter(Boolean) : field === "insufficiency_reason" ? text || null : text;
    setProposal({ ...proposal, [field]: value });
  }

  return <section className="ayni-workflow space-y-5">
    <header><h2 className="text-xl font-extrabold">Conclusiones descriptivas</h2><p className="mt-1 text-sm text-muted-foreground">Resume el progreso a partir de un análisis confirmado y conserva la revisión docente.</p></header>
    <div className="ayni-panel grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
      <label>Niño<select value={studentId} onChange={(event) => { setStudentId(event.target.value); setLoadingOptions(Boolean(event.target.value)); setOptionsError(false); setContextError(false); setAssessmentId(""); setAssessments([]); setEvidence([]); setTeacherNotes(""); setMessage(""); setStored(null); setProposal(null); }}><option value="">Selecciona un niño</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>
      {studentId && !optionsError && <label>Competencia con análisis confirmado<select disabled={loadingOptions || assessments.length === 0} value={assessmentId} onChange={(event) => { setAssessmentId(event.target.value); setLoadingContext(Boolean(event.target.value)); setContextError(false); setTeacherNotes(""); setMessage(""); setStored(null); setProposal(null); }}><option value="">Selecciona una competencia</option>{assessments.map((item) => <option key={item.id} value={item.id}>{item.competency_name} · {item.period_start} a {item.period_end}</option>)}</select></label>}
    </div>
    {!studentId && <EmptyState title={students.length ? "Elige un niño para comenzar" : "Aún no hay niños en el aula"} description={students.length ? "Aquí aparecerán sus análisis confirmados para preparar una conclusión." : "Añade alumnos desde Niños para revisar su progreso."} />}
    {loadingOptions && <LoadingState label="Cargando análisis confirmados..." />}
    {studentId && !loadingOptions && !optionsError && assessments.length === 0 && <EmptyState title="Todavía no hay análisis confirmados" description="Confirma un análisis de evidencias para poder redactar la conclusión descriptiva." />}
    {message && <WorkflowFeedback tone={messageTone}>{message}</WorkflowFeedback>}
    {optionsError && <Button variant="outline" onClick={() => { setLoadingOptions(true); setOptionsReload((value) => value + 1); }}>Reintentar carga de análisis</Button>}
    {selected && <div className="space-y-5">
      <div className="ayni-panel space-y-3 p-4 sm:p-5"><h3 className="font-bold">{selected.competency_name}</h3><p className="text-sm text-[#526b87]">Periodo: {selected.period_start} a {selected.period_end} · {selected.information_status === "sufficient" ? "Información suficiente" : "Información insuficiente"}</p><p className="text-sm">{selected.evidence_overview}</p></div>
      {contextError && <Button variant="outline" onClick={() => { setLoadingContext(true); setContextReload((value) => value + 1); }}>Reintentar carga de evidencias</Button>}
      {loadingContext ? <LoadingState label="Cargando evidencias de soporte..." /> : !contextError && <div className="ayni-panel space-y-3 p-4 sm:p-5"><h3 className="font-bold">Evidencias de soporte · {evidence.length}</h3>{evidence.length ? <ul className="space-y-2">{evidence.map((item, index) => <li key={`${item.observed_on}-${index}`} className="rounded-xl border bg-[#fbfdff] p-3 text-sm"><p className="font-semibold">{new Date(item.observed_on).toLocaleDateString("es-PE")} · {item.activity_title}</p><p className="mt-1 text-[#526b87]">{item.criterion_text} · {item.observation_status}</p>{item.observation_note && <p className="mt-2">{item.observation_note}</p>}</li>)}</ul> : <EmptyState title="Sin evidencias de soporte" description="Revisa el análisis confirmado o registra nuevas observaciones desde una actividad." />}</div>}
      {!readOnly && <label className="block">Nota docente opcional<Textarea disabled={busy} value={teacherNotes} onChange={(event) => setTeacherNotes(event.target.value)} /></label>}
      {!proposal ? <AsyncButton busy={operation === "generate"} busyLabel="Redactando la conclusión..." disabled={busy || loadingContext || contextError || evidence.length === 0} onClick={() => void generate()}>Preparar conclusión descriptiva</AsyncButton> : <div className="ayni-panel space-y-4 p-4 sm:p-6"><WorkflowFeedback tone={readOnly ? "success" : "info"}>{readOnly ? "Conclusión confirmada · solo lectura" : stored ? "Borrador de conclusión · revisa antes de confirmar" : "Propuesta de conclusión. Revísala antes de guardar."}</WorkflowFeedback><p className="text-sm font-semibold">Estado de información: {proposal.information_status === "sufficient" ? "suficiente" : "insuficiente"}</p>
        {Object.keys(labels).map((field) => { const value = Array.isArray(proposal[field as keyof Conclusion]) ? proposal[field as keyof Conclusion] as string[] : String(proposal[field as keyof Conclusion] ?? ""); return readOnly ? <ReadOnlyField key={field} label={labels[field]} value={value} /> : <label className="block" key={field}>{labels[field]}<Textarea disabled={busy || field === "insufficiency_reason" && proposal.information_status === "sufficient"} value={Array.isArray(value) ? value.join("\n") : value} onChange={(event) => edit(field, event.target.value)} /></label>; })}
        {readOnly ? <Button variant="outline" onClick={() => { setStored(null); setProposal(null); setGenerationId(null); }}>Preparar nueva versión</Button> : <>{hasUnsavedChanges && <p className="text-sm text-[#526b87]">Guarda los cambios antes de confirmar.</p>}<div className="flex flex-wrap gap-2"><AsyncButton busy={operation === "save"} busyLabel="Guardando..." disabled={busy} onClick={() => void save()}>{stored ? "Guardar cambios" : "Guardar borrador"}</AsyncButton><AsyncButton variant="outline" busy={operation === "generate"} busyLabel="Regenerando..." disabled={busy} onClick={() => void generate()}>Regenerar</AsyncButton><Button variant="outline" disabled={busy} onClick={() => { setProposal(stored?.details ?? null); setGenerationId(null); }}>Descartar cambios</Button>{stored && <AsyncButton busy={operation === "confirm"} busyLabel="Confirmando..." disabled={busy || hasUnsavedChanges} onClick={() => void confirm()}>Confirmar conclusión</AsyncButton>}</div></>}
      </div>}
    </div>}
  </section>;
}
