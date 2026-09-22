"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LocalStudent } from "@/src/lib/local-database";

export function AttendanceDialog({ open, onOpenChange, students, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; students: LocalStudent[]; onSave: (records: { studentId: string; status: "present" | "absent" | "late" | "excused" }[]) => Promise<void> }) {
  const [statuses, setStatuses] = useState<Record<string, "present" | "absent" | "late" | "excused">>({});
  const statusFor = (studentId: string) => statuses[studentId] ?? "present";
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>Asistencia de hoy</DialogTitle><DialogDescription>Todos empiezan como presentes. Ajusta solo lo necesario.</DialogDescription></DialogHeader><div className="space-y-2"><Button variant="outline" className="w-full" onClick={() => setStatuses({})}>Todos presentes</Button>{students.map((student) => <div key={student.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"><span className="font-semibold">{student.name}</span><div className="flex gap-1">{([['present','Presente'],['absent','Falta'],['late','Tarde'],['excused','Justificada']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => setStatuses((current) => ({ ...current, [student.id]: value }))} className={`min-h-9 rounded-lg px-2 text-xs font-semibold ${statusFor(student.id) === value ? "bg-[#087d96] text-white" : "bg-[#f1f5f9] text-[#526b87]"}`}>{label}</button>)}</div></div>)}</div><DialogFooter><Button onClick={() => void onSave(students.map((student) => ({ studentId: student.id, status: statusFor(student.id) })))}>Guardar asistencia</Button></DialogFooter></DialogContent></Dialog>;
}
