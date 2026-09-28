"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl, type LocalStudent, type PrivateMediaUpload } from "@/src/lib/local-database";
import { AsyncButton, WorkflowFeedback } from "./workflow-ui";
import { DictationRecorder } from "./dictation-recorder";
import { preparePrivateMedia } from "./media-attachment-input";

type SavedObservation = { id: string; student_id: string; raw_text: string | null; corrected_text?: string | null; source_revision: number; status: string };

export function OrdinaryObservationDialog({ students, activity, onClose }: {
  students: LocalStudent[]; activity: { id: string; title: string } | null; onClose: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [rawText, setRawText] = useState("");
  const [photo, setPhoto] = useState<PrivateMediaUpload | null>(null);
  const [clientRequestId, setClientRequestId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<SavedObservation | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [correctedText, setCorrectedText] = useState("");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<SavedObservation[] | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const student = students.find((item) => item.id === studentId);

  async function save(text = rawText, fromDictation = false) {
    if (!studentId || (!text.trim() && !photo) || saving || (recordingBusy && !fromDictation) || preparingPhoto) return;
    setSaving(true); setMessage("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/ordinary-observations`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId, clientRequestId, sourceKind: activity ? "guided" : "spontaneous",
          activityId: activity?.id ?? null, rawText: text || null,
          photo: photo ? { base64: photo.base64, mimeType: photo.mimeType } : null }),
      });
      const data = await response.json() as { error?: string; observation: SavedObservation };
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la observación.");
      setRawText(text);
      setSaved(data.observation);
      setMessage("Observación guardada para el alumno seleccionado.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar."); }
    finally { setSaving(false); }
  }

  async function revise(action: "correct" | "void") {
    if (!saved || saving) return;
    setSaving(true); setMessage("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/ordinary-observations/${saved.id}/revisions`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, correctedText, reason, expectedRevision: saved.source_revision }),
      });
      const data = await response.json() as { error?: string; observation: SavedObservation };
      if (!response.ok) throw new Error(data.error || "No se pudo revisar la observación.");
      setSaved({ ...data.observation, corrected_text: action === "correct" ? correctedText : saved.corrected_text });
      setEditMode(false); setReason("");
      setMessage(action === "void" ? "Observación anulada; el original queda en el historial." : "Corrección guardada; el original permanece intacto.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo revisar."); }
    finally { setSaving(false); }
  }

  function startAnother() {
    setStudentId(""); setRawText(""); setPhoto(null); setSaved(null); setEditMode(false);
    setCorrectedText(""); setReason(""); setMessage(""); setHistory(null); setClientRequestId(crypto.randomUUID());
  }

  async function loadHistory() {
    setHistoryBusy(true); setMessage("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/ordinary-observations`);
      const data = await response.json() as { error?: string; observations: SavedObservation[] };
      if (!response.ok) throw new Error(data.error || "No se pudo abrir el historial.");
      setHistory(data.observations);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo abrir el historial."); }
    finally { setHistoryBusy(false); }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !saving && !recordingBusy) onClose(); }}>
    <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden rounded-2xl p-0 sm:max-w-xl">
      <DialogHeader className="shrink-0 border-b px-6 py-5">
        <DialogTitle>Registrar observación</DialogTitle>
        <DialogDescription>{activity ? `Durante: ${activity.title}` : "Una observación espontánea, sin elegir competencia."}</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-4">
        <fieldset disabled={Boolean(saved) || saving || recordingBusy}>
          <legend className="mb-2 text-base font-semibold">Alumno observado <span className="text-red-700">*</span></legend>
          <div className="flex flex-wrap gap-2">{students.map((item) => <button key={item.id} type="button"
            aria-pressed={studentId === item.id} onClick={() => setStudentId(item.id)}
            className={`min-h-11 rounded-xl border px-3 py-2 text-sm ${studentId === item.id ? "border-[#087d96] bg-[#e8f6fb] font-semibold" : "bg-white hover:border-[#087d96]"}`}>
            {studentId === item.id && <Check className="mr-1 inline size-4" />}{item.name}</button>)}</div>
          {!studentId && <p className="mt-2 text-sm text-[#7a3c12]">Selecciona al alumno antes de escribir, dictar o guardar.</p>}
        </fieldset>
        {history && <section className="rounded-xl border bg-[#f6f9fd] p-3">
          <h3 className="font-semibold">Observaciones guardadas</h3>
          {history.length === 0 ? <p className="mt-2 text-sm">Todavía no hay observaciones.</p> :
            <div className="mt-2 max-h-44 space-y-2 overflow-y-auto">{history.slice(0, 20).map((item) =>
              <button key={item.id} type="button" className="block w-full rounded-lg border bg-white p-2 text-left text-sm hover:border-[#087d96]"
                onClick={() => { setSaved(item); setStudentId(item.student_id); setHistory(null); setEditMode(false); setMessage(""); }}>
                <span className="font-semibold">{students.find((child) => child.id === item.student_id)?.name ?? "Alumno"} · {item.status === "corrected" ? "Corregida" : item.status === "voided" ? "Anulada" : "Guardada"}</span>
                <span className="mt-1 block truncate">{item.corrected_text ?? item.raw_text ?? "Foto"}</span>
              </button>)}</div>}
        </section>}
        {!saved ? <>
          <div><label htmlFor="ordinary-raw-text" className="mb-2 block font-semibold">¿Qué ocurrió?</label>
            <Textarea id="ordinary-raw-text" value={rawText} onChange={(event) => setRawText(event.target.value)}
              disabled={!studentId || saving || recordingBusy} maxLength={4000} className="min-h-32 bg-white"
              placeholder="Describe lo que viste o escuchaste; no hace falta elegir una competencia." /></div>
          {studentId && <DictationRecorder key={studentId} studentId={studentId} purpose="raw_observation"
            rawTranscript context={activity?.title ?? "Observación espontánea"} currentText={rawText}
            disabled={saving} onBusyChange={setRecordingBusy}
            onTranscribed={async (text, saveNow) => { setRawText(text); if (saveNow) await save(text, true); }} />}
          <div><label htmlFor="ordinary-photo" className="mb-2 block text-sm font-semibold">Foto privada <span className="font-normal">(opcional)</span></label>
            <input id="ordinary-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
              disabled={!studentId || saving || recordingBusy || preparingPhoto} className="block w-full text-sm"
              onChange={async (event) => { const file = event.currentTarget.files?.[0]; if (!file) return;
                setPreparingPhoto(true); setMessage(""); try { setPhoto(await preparePrivateMedia(file)); }
                catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo preparar la foto."); }
                finally { setPreparingPhoto(false); } }} />
            {photo && <p className="mt-2 text-sm">Foto lista: {photo.name} <button type="button" className="underline" onClick={() => setPhoto(null)}>Quitar</button></p>}
          </div>
        </> : <section className="rounded-xl border bg-[#f6f9fd] p-4">
          <p className="font-semibold">{student?.name} · {saved.status === "voided" ? "Anulada" : saved.status === "corrected" ? "Corregida" : "Guardada"}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{saved.raw_text ?? "Foto sin texto"}</p>
          {saved.corrected_text && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-2 text-sm"><b>Revisión docente:</b> {saved.corrected_text}</p>}
          <p className="mt-2 text-xs text-muted-foreground">El texto original y el alumno asociado no se modifican por una corrección.</p>
          {saved.status !== "voided" && !editMode && <Button type="button" variant="outline" className="mt-3" onClick={() => { setCorrectedText(saved.raw_text ?? ""); setEditMode(true); }}>Corregir o anular</Button>}
          {editMode && <div className="mt-3 space-y-3">
            <label className="block text-sm font-semibold">Texto corregido<Textarea value={correctedText} onChange={(event) => setCorrectedText(event.target.value)} maxLength={4000} className="mt-1 bg-white" /></label>
            <label className="block text-sm font-semibold">Motivo de la revisión<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3" /></label>
            <div className="flex flex-wrap gap-2"><AsyncButton busy={saving} busyLabel="Guardando..." disabled={!correctedText.trim() || reason.trim().length < 3} onClick={() => void revise("correct")}>Guardar corrección</AsyncButton>
              <Button variant="outline" disabled={saving || reason.trim().length < 3} onClick={() => void revise("void")}>Anular observación</Button>
              <Button variant="ghost" onClick={() => setEditMode(false)}>Cancelar</Button></div>
          </div>}
        </section>}
        {message && <WorkflowFeedback tone={saved && !editMode ? "success" : "error"}>{message}</WorkflowFeedback>}
      </div>
      <DialogFooter className="shrink-0 border-t px-6 py-4">
        <Button variant="ghost" onClick={onClose} disabled={saving || recordingBusy}>Cerrar</Button>
        {!saved && <AsyncButton variant="outline" busy={historyBusy} busyLabel="Cargando..." disabled={saving || recordingBusy}
          onClick={() => void loadHistory()}>Ver observaciones</AsyncButton>}
        {saved ? <Button variant="outline" onClick={startAnother}>Registrar otra</Button> :
          <AsyncButton busy={saving} busyLabel="Guardando..." disabled={!studentId || (!rawText.trim() && !photo) || recordingBusy || preparingPhoto}
            onClick={() => void save()}>Guardar observación</AsyncButton>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
