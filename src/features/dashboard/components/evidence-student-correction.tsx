"use client";

import { useState } from "react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl, type LocalStudent, type StudentPedagogicalProfile } from "@/src/lib/local-database";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AsyncButton, WorkflowFeedback } from "./workflow-ui";

export function EvidenceStudentCorrection({ profile, students, onCorrected }: {
  profile: StudentPedagogicalProfile | null; students: LocalStudent[]; onCorrected: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [evidenceId, setEvidenceId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error">("success");
  const notes = profile?.recent_relevant_observations ?? [];
  const note = notes.find(item => item.id === evidenceId);
  if (!profile || !notes.length) return null;
  async function correct() {
    if (!note || !profile || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/evidences/${note.id}/reassign`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedStudentId: profile.student.id, expectedRevision: note.assignment_revision ?? 0, studentId, reason }),
      });
      const data = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.message ?? data.error ?? "No se pudo corregir el alumno.");
      setEvidenceId(""); setStudentId(""); setReason(""); setTone("success");
      setMessage("Alumno corregido. La observación y su fecha se conservaron con historial.");
      await onCorrected();
    } catch (error) { setTone("error"); setMessage(error instanceof Error ? error.message : "No se pudo corregir el alumno."); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto mb-5 max-w-4xl rounded-xl border bg-white p-4">
    <Button variant="outline" aria-expanded={open} onClick={() => setOpen(!open)}>Corregir alumno de una observación</Button>
    {open && <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">Solo observaciones sin adjuntos y sin valoración confirmada afectada. El texto y la fecha no cambian.</p>
      <label className="block text-sm font-semibold">Observación a corregir
        <select className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3" value={evidenceId} disabled={busy} onChange={event => setEvidenceId(event.target.value)}>
          <option value="">Elige una observación</option>
          {notes.map(item => <option key={item.id} value={item.id}>{item.activity_title} · {item.observation_text?.slice(0, 90) ?? "Sin nota escrita"}</option>)}
        </select>
      </label>
      {note && <p className="rounded-xl bg-[#f2f8fb] p-3 text-sm">{note.observation_text}</p>}
      <label className="block text-sm font-semibold">Alumno correcto
        <select className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3" value={studentId} disabled={busy} onChange={event => setStudentId(event.target.value)}>
          <option value="">Elige al alumno</option>
          {students.filter(item => item.id !== profile.student.id).map(item => <option key={item.id} value={item.id}>{item.full_name ?? item.name}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">Motivo de la corrección<Textarea className="mt-2" value={reason} onChange={event => setReason(event.target.value)} disabled={busy} maxLength={300} /></label>
      <AsyncButton busy={busy} busyLabel="Corrigiendo..." disabled={!note || !studentId || reason.trim().length < 8 || Boolean(note.media_available)} onClick={() => void correct()}>Guardar corrección de alumno</AsyncButton>
    </div>}
    {message && <div className="mt-3"><WorkflowFeedback tone={tone}>{message}</WorkflowFeedback></div>}
  </section>;
}
