"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { correctSpontaneousClassification, loadSpontaneousObservations, spontaneousObservationMediaUrl,
  saveSpontaneousObservation, suggestSpontaneousCompetenciesWithAyni,
  type LocalStudent, type PrivateMediaUpload, type SpontaneousObservation } from "@/src/lib/local-database";
import { AsyncButton, LoadingState } from "./workflow-ui";
import { MediaAttachmentInput } from "./media-attachment-input";
import { DictationRecorder } from "./dictation-recorder";
import { displayPersonName } from "@/src/lib/person-name.mjs";
import { buildObservationRecommendation, observationRecommendationMessage } from "@/src/lib/observation-recommendation.mjs";

const moments = ["Juego libre", "Recreo", "Lonchera", "Asamblea", "Rutina", "Conversación", "Exploración", "Otro"];

function ClassificationRecommendation({ record, competencies, busy, onSave, onRetry }: {
  record: SpontaneousObservation; competencies: { id: string; name: string }[]; busy: boolean;
  onSave: (ids: string[]) => Promise<boolean>; onRetry: () => Promise<boolean>;
}) {
  const recommendation = buildObservationRecommendation(record, competencies);
  const [editing, setEditing] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<string[] | null>(null);
  const selected: string[] = selectedDraft ?? recommendation.initialSelection;
  const isTeacherChoice = record.classification_source === "teacher";
  return <div className="mt-3 space-y-3 rounded-xl border border-[#c9e4e9] bg-white p-4">
    <p className="flex items-center gap-2 text-sm font-bold text-[#075d70]"><Sparkles className="size-4" />{isTeacherChoice ? "Competencias de esta observación" : "Recomendación de Ayni"}</p>
    {isTeacherChoice ? recommendation.confirmed.length > 0
      ? <ul className="space-y-1 text-sm font-semibold">{recommendation.confirmed.map((card: { id: string; name: string }) => <li key={card.id}>{card.name}</li>)}</ul>
      : <p className="text-sm text-[#526b87]">{observationRecommendationMessage(recommendation.state)}</p>
      : recommendation.state === "suggested" && recommendation.primary
        ? <><p className="text-base font-semibold text-[#172b52]">{recommendation.primary.name}</p>
          {recommendation.additional.length > 0 && <p className="text-sm text-[#526b87]">También podría relacionarse con: {recommendation.additional.map((card: { name: string }) => card.name).join("; ")}.</p>}</>
        : <p role="status" className="flex items-start gap-2 text-sm text-[#526b87]">{recommendation.state === "pending" && <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" />}{observationRecommendationMessage(recommendation.state)}</p>}
    {!editing && <div className="flex flex-wrap gap-2">
      {!isTeacherChoice && recommendation.state === "suggested" && recommendation.primary && <AsyncButton type="button" busy={busy} busyLabel="Guardando..." onClick={() => void onSave([recommendation.primary.id])}>Usar recomendación</AsyncButton>}
      <Button type="button" variant="outline" disabled={busy} aria-expanded={editing} onClick={() => { setSelectedDraft(recommendation.initialSelection); setEditing(true); }}><Pencil className="size-4" />Cambiar o agregar competencia</Button>
      {recommendation.state === "unavailable" && record.observation_text?.trim() && <AsyncButton type="button" variant="ghost" busy={busy} busyLabel="Ayni está revisando…" onClick={() => void onRetry()}>Reintentar con Ayni</AsyncButton>}
    </div>}
    {editing && <fieldset disabled={busy} className="space-y-3">
      <legend className="text-sm font-semibold">Elige una o varias competencias</legend>
      <div className="grid gap-2 sm:grid-cols-2">{competencies.map((card) =>
        <label key={card.id} className="flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-sm">
          <input type="checkbox" checked={selected.includes(card.id)} onChange={(event) => setSelectedDraft(event.target.checked ? [...selected, card.id] : selected.filter((id) => id !== card.id))} />
          <span>{card.name}</span>
        </label>)}</div>
      <div className="flex flex-wrap gap-2"><AsyncButton type="button" busy={busy} busyLabel="Guardando..." onClick={() => void onSave(selected).then((saved) => { if (saved) { setEditing(false); setSelectedDraft(null); } })}>{selected.length ? "Guardar competencias" : "Dejar sin clasificar"}</AsyncButton><Button type="button" variant="outline" disabled={busy} onClick={() => { setEditing(false); setSelectedDraft(null); }}>Cancelar</Button></div>
    </fieldset>}
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
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [recordingRevision, setRecordingRevision] = useState(0);
  const audioBusy = recordingBusy || mediaBusy;
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function reload() { const result = await loadSpontaneousObservations(); setRecords(result.observations); setCompetencies(result.competencies); }
  useEffect(() => { loadSpontaneousObservations().then((result) => { setRecords(result.observations); setCompetencies(result.competencies); }).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudieron cargar las observaciones.")); }, []);
  useEffect(() => {
    if (!records?.some((record) => record.classification_status === "pending")) return;
    const timeout = window.setTimeout(() => { void reload().catch(() => setError("No se pudo actualizar la clasificación. Puedes volver a abrir esta sección.")); }, 2000);
    return () => window.clearTimeout(timeout);
  }, [records]);
  async function run(work: () => Promise<void>) {
    if (busy || audioBusy) return false;
    setBusy(true); setError(""); setMessage("");
    try { await work(); await reload(); return true; } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
      await reload().catch(() => {});
      return false;
    }
    finally { setBusy(false); }
  }
  if (!records) return error ? <p role="alert">{error}</p> : <LoadingState label="Cargando observaciones..." />;
  return <section className="diagnostic-panel space-y-4 p-4 md:p-7">
    <div><h2 className="text-xl font-bold">Registrar lo que ocurrió</h2><p className="text-sm text-[#526b87]">Escribe o dicta lo que hizo o dijo. Ayni te recomendará una competencia al guardar.</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">¿A quién observaste?<select className="mt-1 min-h-11 w-full" disabled={busy || audioBusy} value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">Elige un niño</option>{students.map((student) => <option key={student.id} value={student.id}>{displayPersonName(student.name)}</option>)}</select></label><label className="text-sm font-semibold">¿Dónde ocurrió?<select className="mt-1 min-h-11 w-full" disabled={busy || audioBusy} value={contextLabel} onChange={(event) => setContextLabel(event.target.value)}><option value="">Elige un momento</option>{moments.map((moment) => <option key={moment}>{moment}</option>)}</select></label></div>
    <label className="block text-sm font-semibold">¿Qué hizo o dijo?<Textarea className="mt-1 min-h-24" disabled={busy} value={note} maxLength={4000} onChange={(event) => setNote(event.target.value)} placeholder="Por ejemplo: contó los vasos antes de repartirlos y dijo que faltaba uno" /></label>
    <DictationRecorder key={`${studentId}:${recordingRevision}`} studentId={studentId} context={contextLabel} currentText={note} disabled={busy || mediaBusy || !contextLabel} onBusyChange={setRecordingBusy} onTranscribed={(text) => setNote(text)} />
    <MediaAttachmentInput studentId={studentId} context={contextLabel} media={media} onMedia={setMedia} onTranscribed={setNote} disabled={busy || recordingBusy} onBusyChange={setMediaBusy} />
    <fieldset className="space-y-2" disabled={busy || audioBusy}><legend className="text-sm font-semibold">¿Necesitó apoyo? (opcional)</legend><div className="flex flex-wrap gap-2">{([ ["no", "No"], ["yes", "Sí"], ["unknown", "No puedo determinarlo"] ] as const).map(([value,label]) => <label key={value} className="flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm"><input type="radio" checked={supportStatus === value} onChange={() => setSupportStatus(value)} />{label}</label>)}</div></fieldset>
    <AsyncButton className="min-h-11" busy={busy} busyLabel="Guardando..." disabled={audioBusy || !studentId || !contextLabel || (!note.trim() && !media)} onClick={() => void run(async () => { await saveSpontaneousObservation({ studentId, contextLabel, observationText: note, media: media ?? undefined, ...(supportStatus ? { supportStatus } : {}) }); setNote(""); setMedia(null); setSupportStatus(""); setRecordingRevision((value) => value + 1); setMessage("Observación guardada."); onSaved?.(); })}>Guardar observación</AsyncButton>
    {message && <p role="status" className="rounded-xl bg-[#e5f8ed] p-3 text-sm">{message}</p>}{error && <p role="alert" className="rounded-xl bg-[#fff1d6] p-3 text-sm">{error}</p>}
    {records.length > 0 && <section aria-labelledby="spontaneous-observations-title" className="space-y-3 border-t pt-4"><h3 id="spontaneous-observations-title" className="text-lg font-bold">Observaciones recientes · {records.length}</h3>{records.map((record) => <article key={record.id} className="rounded-2xl bg-[#f3f7fb] p-4"><h4 className="font-semibold">{displayPersonName(students.find((student) => student.id === record.student_id)?.name ?? "")} · {record.context_label}</h4><p className="mt-2 text-sm leading-relaxed">{record.observation_text || "Archivo adjunto sin nota escrita."}</p>{record.has_media && <a className="mt-1 inline-block text-sm underline" href={spontaneousObservationMediaUrl(record.id)} target="_blank" rel="noreferrer">Abrir {record.media_mime_type?.startsWith("audio/") ? "audio" : "foto"} privado</a>}<p className="mt-2 text-xs text-[#526b87]">{new Date(record.observed_at).toLocaleDateString("es-PE")}</p><ClassificationRecommendation record={record} competencies={competencies} busy={busy || audioBusy} onRetry={() => run(async () => { const result = await suggestSpontaneousCompetenciesWithAyni(record.id); setMessage(observationRecommendationMessage(result.recommendation_state)); })} onSave={(ids) => run(async () => { await correctSpontaneousClassification(record.id, ids); setMessage("Competencias guardadas."); onSaved?.(); })} /></article>)}</section>}
    <p className="text-xs text-[#526b87]">Una observación puede relacionarse con varias competencias. Esta organización no evalúa al niño ni asigna niveles.</p>
  </section>;
}
