"use client";

import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { correctSpontaneousClassification, loadSpontaneousObservations,
  saveSpontaneousObservation, type LocalStudent, type SpontaneousObservation } from "@/src/lib/local-database";
import { AsyncButton, LoadingState } from "./workflow-ui";

const moments = ["Juego libre", "Recreo", "Lonchera", "Asamblea", "Rutina", "Conversación", "Exploración", "Otro"];

export function SpontaneousDiagnostic({ students, onSaved }: { students: LocalStudent[]; onSaved?: () => void }) {
  const [studentId, setStudentId] = useState("");
  const [contextLabel, setContextLabel] = useState("");
  const [note, setNote] = useState("");
  const [supportStatus, setSupportStatus] = useState<"yes" | "no" | "unknown" | "">("");
  const [records, setRecords] = useState<SpontaneousObservation[] | null>(null);
  const [competencies, setCompetencies] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function reload() { const result = await loadSpontaneousObservations(); setRecords(result.observations); setCompetencies(result.competencies); }
  useEffect(() => { loadSpontaneousObservations().then((result) => { setRecords(result.observations); setCompetencies(result.competencies); }).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudieron cargar las observaciones.")); }, []);
  useEffect(() => {
    if (!records?.some((record) => record.classification_status === "pending")) return;
    const timeout = window.setTimeout(() => { void loadSpontaneousObservations().then((result) => { setRecords(result.observations); setCompetencies(result.competencies); }).catch(() => setError("No se pudo actualizar la clasificación. Puedes volver a abrir esta sección.")); }, 2000);
    return () => window.clearTimeout(timeout);
  }, [records]);
  async function run(work: () => Promise<void>) {
    setBusy(true); setError(""); setMessage("");
    try { await work(); await reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }
  if (!records) return error ? <p role="alert">{error}</p> : <LoadingState label="Cargando observaciones..." />;
  return <section className="diagnostic-panel space-y-4 p-4 md:p-7">
    <div><h2 className="text-xl font-bold">Registrar lo que ocurrió</h2><p className="text-sm text-[#526b87]">Una observación breve del juego o la jornada. Guárdala ahora; podrás organizarla después.</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">¿A quién observaste?<select className="mt-1 min-h-11 w-full" value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">Elige un niño</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label><label className="text-sm font-semibold">¿Dónde ocurrió?<select className="mt-1 min-h-11 w-full" value={contextLabel} onChange={(event) => setContextLabel(event.target.value)}><option value="">Elige un momento</option>{moments.map((moment) => <option key={moment}>{moment}</option>)}</select></label></div>
    <label className="block text-sm font-semibold">¿Qué hizo o dijo?<Textarea className="mt-1 min-h-24" value={note} maxLength={4000} onChange={(event) => setNote(event.target.value)} placeholder="Por ejemplo: contó los vasos antes de repartirlos y dijo que faltaba uno" /></label>
    <fieldset className="space-y-2"><legend className="text-sm font-semibold">¿Necesitó apoyo? (opcional)</legend><div className="flex flex-wrap gap-2">{([ ["no", "No"], ["yes", "Sí"], ["unknown", "No puedo determinarlo"] ] as const).map(([value,label]) => <label key={value} className="flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm"><input type="radio" checked={supportStatus === value} onChange={() => setSupportStatus(value)} />{label}</label>)}</div></fieldset>
    <AsyncButton className="min-h-11" busy={busy} busyLabel="Guardando..." disabled={!studentId || !contextLabel || !note.trim()} onClick={() => void run(async () => { await saveSpontaneousObservation({ studentId, contextLabel, observationText: note, ...(supportStatus ? { supportStatus } : {}) }); setNote(""); setSupportStatus(""); setMessage("Observación guardada. La competencia puede organizarse después; no se asignó un nivel."); onSaved?.(); })}>Guardar observación</AsyncButton>
    {message && <p role="status" className="rounded-xl bg-[#e5f8ed] p-3 text-sm">{message}</p>}{error && <p role="alert" className="rounded-xl bg-[#fff1d6] p-3 text-sm">{error}</p>}
    {records.length > 0 && <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Observaciones recientes · {records.length}</summary><div className="mt-3 space-y-3">{records.map((record) => <article key={record.id} className="rounded-xl bg-[#f3f7fb] p-3"><p className="font-semibold">{students.find((student) => student.id === record.student_id)?.name} · {record.context_label}</p><p className="mt-1 text-sm">{record.observation_text}</p><p className="mt-1 text-xs text-[#526b87]">{new Date(record.observed_at).toLocaleDateString("es-PE")} · {record.classification_status === "classified" ? `Organizada ${record.classification_source === "teacher" ? "por la docente" : "automáticamente"}` : "Por revisar"}</p><label className="mt-2 block text-xs font-semibold">Competencia relacionada (opcional)<select className="mt-1 w-full text-sm" value={record.competency_v4_id ?? ""} disabled={busy} onChange={(event) => void run(async () => { await correctSpontaneousClassification(record.id, event.target.value || null); setMessage("Competencia corregida sin cambiar la observación original."); })}><option value="">Por revisar</option>{competencies.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label></article>)}</div></details>}
    <p className="text-xs text-[#526b87]">La competencia es una organización revisable, no una evaluación del niño. Si no hay clasificación confiable, la observación permanece por revisar.</p>
  </section>;
}
