"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LocalStudent } from "@/src/lib/local-database";
import { AsyncButton, WorkflowFeedback } from "./workflow-ui";

export function AttendanceDialog({ open, onOpenChange, students, onSave,records=[], date, calendarException }: { open: boolean; onOpenChange: (open: boolean) => void; students: LocalStudent[]; date?: string; calendarException?: { label: string; is_instructional: boolean } | null; records?:{studentId:string;status:"present"|"absent"|"late"|"excused"}[]; onSave: (records: { studentId: string; status: "present" | "absent" | "late" | "excused" }[]) => Promise<void> }) {
  const [statuses, setStatuses] = useState<Record<string, "present" | "absent" | "late" | "excused">>(()=>Object.fromEntries(records.map(row=>[row.studentId,row.status])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const weekend = date && [0,6].includes(new Date(`${date}T12:00:00Z`).getUTCDay());
  const dayNotice = calendarException?.is_instructional === false ? `${calendarException.label}: el calendario indica que hoy no hay clases.` : weekend && !calendarException?.is_instructional ? "Hoy es fin de semana y no hay clases previstas." : "";
  const statusFor = (studentId: string) => statuses[studentId] ?? "present";
  async function save() {
    if (saving) return;
    setSaving(true); setError("");
    try { await onSave(students.map((student) => ({ studentId: student.id, status: statusFor(student.id) }))); }
    catch { setError("No se pudo guardar la asistencia. Vuelve a intentarlo."); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-3xl"><DialogHeader><DialogTitle>Asistencia de hoy</DialogTitle><DialogDescription>Revisa la asistencia de hoy. Los niños sin registro empiezan como presentes; ajusta lo necesario.</DialogDescription></DialogHeader>{dayNotice && <WorkflowFeedback tone="info">{dayNotice} Registra asistencia solo si tu aula tiene una jornada especial hoy.</WorkflowFeedback>}<div className="space-y-2"><Button variant="outline" className="w-full" disabled={saving} onClick={() => setStatuses({})}>Todos presentes</Button>{students.map((student) => <fieldset key={student.id} className="min-w-0 rounded-xl border bg-white p-3 sm:flex sm:items-center sm:justify-between sm:gap-4"><legend className="sr-only">Estado de asistencia de {student.name}</legend><span className="mb-2 block font-semibold text-[#172b52] sm:mb-0">{student.name}</span><div className="grid shrink-0 grid-cols-2 gap-1 sm:grid-cols-4">{([['present','Presente'],['absent','Falta'],['late','Tarde'],['excused','Justificada']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={statusFor(student.id) === value} disabled={saving} onClick={() => setStatuses((current) => ({ ...current, [student.id]: value }))} className={`min-h-11 rounded-lg px-2 text-xs font-semibold hover:bg-[#e8f6fb] ${statusFor(student.id) === value ? "bg-[#087d96] text-white hover:bg-[#076d82]" : "border border-[#c1dce5] bg-[#f4fbfd] text-[#294e6b]"}`}>{label}</button>)}</div></fieldset>)}</div>{error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}<DialogFooter><AsyncButton busy={saving} busyLabel="Guardando asistencia..." onClick={() => void save()}>Guardar asistencia</AsyncButton></DialogFooter></DialogContent></Dialog>;
}
