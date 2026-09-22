"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LocalStudent } from "@/src/lib/local-database";
import { AsyncButton, WorkflowFeedback } from "./workflow-ui";

export function AttendanceDialog({ open, onOpenChange, students, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; students: LocalStudent[]; onSave: (records: { studentId: string; status: "present" | "absent" | "late" | "excused" }[]) => Promise<void> }) {
  const [statuses, setStatuses] = useState<Record<string, "present" | "absent" | "late" | "excused">>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const statusFor = (studentId: string) => statuses[studentId] ?? "present";
  async function save() {
    if (saving) return;
    setSaving(true); setError("");
    try { await onSave(students.map((student) => ({ studentId: student.id, status: statusFor(student.id) }))); }
    catch { setError("No se pudo guardar la asistencia. Vuelve a intentarlo."); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>Asistencia de hoy</DialogTitle><DialogDescription>Todos empiezan como presentes. Ajusta solo lo necesario.</DialogDescription></DialogHeader><div className="space-y-2"><Button variant="outline" className="w-full" disabled={saving} onClick={() => setStatuses({})}>Todos presentes</Button>{students.map((student) => <div key={student.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"><span className="font-semibold">{student.name}</span><div className="flex flex-wrap gap-1">{([['present','Presente'],['absent','Falta'],['late','Tarde'],['excused','Justificada']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={statusFor(student.id) === value} disabled={saving} onClick={() => setStatuses((current) => ({ ...current, [student.id]: value }))} className={`min-h-11 rounded-lg px-2 text-xs font-semibold hover:bg-[#e8f6fb] ${statusFor(student.id) === value ? "bg-[#087d96] text-white hover:bg-[#076d82]" : "bg-[#f1f5f9] text-[#526b87]"}`}>{label}</button>)}</div></div>)}</div>{error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}<DialogFooter><AsyncButton busy={saving} busyLabel="Guardando asistencia..." onClick={() => void save()}>Guardar asistencia</AsyncButton></DialogFooter></DialogContent></Dialog>;
}
