"use client";

import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { correctSpontaneousClassification, loadSpontaneousObservations, spontaneousObservationMediaUrl,
  saveSpontaneousObservation, type LocalStudent, type PrivateMediaUpload, type SpontaneousObservation } from "@/src/lib/local-database";
import { AsyncButton, LoadingState } from "./workflow-ui";
import { MediaAttachmentInput } from "./media-attachment-input";

const moments = ["Juego libre", "Recreo", "Lonchera", "Asamblea", "Rutina", "Conversación", "Exploración", "Otro"];

function ClassificationChoices({ record, competencies, busy, onSave }: {
  record: SpontaneousObservation; competencies: { id: string; name: string }[]; busy: boolean;
  onSave: (ids: string[]) => void;
}) {
  const initial = record.classification_source === "teacher" ? record.competency_v4_ids : record.suggested_competency_v4_ids;
  const [selected, setSelected] = useState<string[]>(initial ?? []);
  return <div className="mt-3 space-y-2">
    <p className="text-xs font-semibold">Competencias relacionadas (puedes elegir varias)</p>
    {record.suggested_competency_v4_ids?.length > 0 && record.classification_source !== "teacher" &&
      <p className="text-xs text-[#526b87]">Sugerencias de IA: revisa si cada una se apoya en lo que observaste.</p>}
    <div className="grid gap-2 sm:grid-cols-2">{competencies.map((card) =>
      <label key={card.id} className="flex min-h-10 items-center gap-2 rounded-lg border bg-white px-2 py-1 text-xs">
        <input type="checkbox" checked={selected.includes(card.id)} disabled={busy} onChange={(event) =>
          setSelected((current) => event.target.checked ? [...current, card.id] : current.filter((id) => id !== card.id))} />
        <span>{card.name}{record.suggested_competency_v4_ids?.includes(card.id) && record.classification_source !== "teacher" ? " · sugerida" : ""}</span>
      </label>)}</div>
    <AsyncButton type="button" variant="outline" busy={busy} busyLabel="Guardando..." onClick={() => onSave(selected)}>
      {selected.length ? `Confirmar ${selected.length} competencia${selected.length === 1 ? "" : "s"}` : "Dejar sin clasificar"}
    </AsyncButton>
  </div>;
}

export function SpontaneousDiagnostic({ students, onSaved }: { students: LocalStudent[]; onSaved?: () => void }) {
  const [studentId, setStudentId] = useState("");
  const [contextLabel, setContextLabel] = useState("");
  const [note, setNote] = useState("");
  const [media, setMedia] = useState<PrivateMediaUpload | null>(null);
  const [supportStatus, setSupportStatus] = useState<"yes" | "no" | "unknown" | "">("");
  const [records, setRecords] = useState<SpontaneousObservation[] | null>(null);
  const [competencies, setCompetencies] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showRecent, setShowRecent] = useState(false);

  async function reload() { const result = await loadSpontaneousObservations(); setRecords(result.observations); setCompetencies(result.competencies); }
  useEffect(() => { loadSpontaneousObservations().then((result) => { setRecords(result.observations); setCompetencies(result.competencies); }).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudieron cargar las observaciones.")); }, []);
  useEffect(() => {
    if (!records?.some((record) => record.classification_status === "pending")) return;
    const timeout = window.setTimeout(() => { void reload().catch(() => setError("No se pudo actualizar la clasificación. Puedes volver a abrir esta sección.")); }, 2000);
    return () => window.clearTimeout(timeout);
  }, [records]);
  async function run(work: () => Promise<void>) {
    setBusy(true); setError(""); setMessage("");
    try { await work(); await reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }
  if (!records) return error ? <p role="alert">{error}</p> : <LoadingState label="Cargando observaciones..." />;
  return <section className="diagnostic-panel space-y-4 p-4 md:p-7">
    <div><h2 className="text-xl font-bold">Registrar lo que ocurrió</h2><p className="text-sm text-[#526b87]">Una observación breve del juego o la jornada. La IA puede sugerir competencias; tú decides cuáles corresponden.</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">¿A quién observaste?<select className="mt-1 min-h-11 w-full" value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">Elige un niño</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label><label className="text-sm font-semibold">¿Dónde ocurrió?<select className="mt-1 min-h-11 w-full" value={contextLabel} onChange={(event) => setContextLabel(event.target.value)}><option value="">Elige un momento</option>{moments.map((moment) => <option key={moment}>{moment}</option>)}</select></label></div>
    <label className="block text-sm font-semibold">¿Qué hizo o dijo?<Textarea className="mt-1 min-h-24" value={note} maxLength={4000} onChange={(event) => setNote(event.target.value)} placeholder="Por ejemplo: contó los vasos antes de repartirlos y dijo que faltaba uno" /></label>
    <MediaAttachmentInput studentId={studentId} context={contextLabel} media={media} onMedia={setMedia} onTranscribed={setNote} disabled={busy} />
    <fieldset className="space-y-2"><legend className="text-sm font-semibold">¿Necesitó apoyo? (opcional)</legend><div className="flex flex-wrap gap-2">{([ ["no", "No"], ["yes", "Sí"], ["unknown", "No puedo determinarlo"] ] as const).map(([value,label]) => <label key={value} className="flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm"><input type="radio" checked={supportStatus === value} onChange={() => setSupportStatus(value)} />{label}</label>)}</div></fieldset>
    <AsyncButton className="min-h-11" busy={busy} busyLabel="Guardando..." disabled={!studentId || !contextLabel || (!note.trim() && !media)} onClick={() => void run(async () => { await saveSpontaneousObservation({ studentId, contextLabel, observationText: note, media: media ?? undefined, ...(supportStatus ? { supportStatus } : {}) }); setNote(""); setMedia(null); setSupportStatus(""); setShowRecent(true); setMessage("Observación guardada. Revisa las competencias sugeridas antes de confirmarlas; no se asignó un nivel."); onSaved?.(); })}>Guardar observación</AsyncButton>
    {message && <p role="status" className="rounded-xl bg-[#e5f8ed] p-3 text-sm">{message}</p>}{error && <p role="alert" className="rounded-xl bg-[#fff1d6] p-3 text-sm">{error}</p>}
    {records.length > 0 && <details open={showRecent} onToggle={(event) => setShowRecent(event.currentTarget.open)} className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Observaciones recientes · {records.length}</summary><div className="mt-3 space-y-3">{records.map((record) => <article key={record.id} className="rounded-xl bg-[#f3f7fb] p-3"><p className="font-semibold">{students.find((student) => student.id === record.student_id)?.name} · {record.context_label}</p><p className="mt-1 text-sm">{record.observation_text || "Archivo adjunto sin nota escrita."}</p>{record.has_media && <a className="mt-1 inline-block text-sm underline" href={spontaneousObservationMediaUrl(record.id)} target="_blank" rel="noreferrer">Abrir {record.media_mime_type?.startsWith("audio/") ? "audio" : "foto"} privado</a>}<p className="mt-1 text-xs text-[#526b87]">{new Date(record.observed_at).toLocaleDateString("es-PE")} · {record.classification_status === "classified" ? "Competencias confirmadas por la docente" : record.classification_status === "pending" ? "Buscando sugerencias" : "Por revisar"}</p><ClassificationChoices key={`${record.id}:${record.classification_status}:${record.competency_v4_ids?.join(",")}:${record.suggested_competency_v4_ids?.join(",")}`} record={record} competencies={competencies} busy={busy} onSave={(ids) => void run(async () => { await correctSpontaneousClassification(record.id, ids); setMessage("Competencias guardadas sin cambiar la observación original."); onSaved?.(); })} /></article>)}</div></details>}
    <p className="text-xs text-[#526b87]">Una observación puede relacionarse con varias competencias. Esta organización no evalúa al niño ni asigna niveles.</p>
  </section>;
}
