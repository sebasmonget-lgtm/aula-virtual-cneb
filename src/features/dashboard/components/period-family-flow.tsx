"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { PeriodBatchPanel } from "./period-batch-panel";
import { WorkflowFeedback } from "./workflow-ui";

type Props = Pick<ComponentProps<typeof PeriodBatchPanel>, "classroomId" | "periodId" | "students" | "competencies" | "disabled" | "onSaved" | "initialStudentId" | "onContinue"> & {
  readiness: { ready: boolean; pending_grades: number; pending_conclusions: number } | undefined;
  hasNotes: boolean;
  onCompleteGrades: () => void;
};

export function PeriodFamilyFlow({ readiness, hasNotes, onCompleteGrades, onContinue, ...panel }: Props) {
  if (!readiness) return <WorkflowFeedback tone="error">No pudimos comprobar las notas del bimestre. Vuelve a cargar la evaluación antes de preparar conclusiones.</WorkflowFeedback>;
  if (readiness.pending_grades > 0 || !hasNotes) return <section className="flex flex-col items-start gap-4 rounded-2xl border bg-white p-6 sm:flex-row sm:items-center sm:justify-between" aria-label="Notas pendientes">
    <div><h2 className="text-xl font-bold">{hasNotes || readiness.pending_grades > 0 ? "Primero completa las notas del bimestre" : "Aún no hay notas guardadas en este bimestre"}</h2>
    <p className="mt-2 text-[#526b87]">{readiness.pending_grades > 0 ? `Falta guardar o revisar ${readiness.pending_grades} ${readiness.pending_grades === 1 ? "nota" : "notas"}. Después podrás preparar las conclusiones.` : "Revisa las observaciones y guarda las valoraciones antes de preparar las conclusiones."}</p></div>
    <Button onClick={onCompleteGrades}>{readiness.pending_grades > 0 ? "Completar notas" : "Ir a Evaluación del bimestre"}</Button>
  </section>;

  return <div className="space-y-5">
    <PeriodBatchPanel key={`${panel.classroomId}:${panel.periodId}:conclusions`} {...panel} kind="conclusions" collapsible canPrepare pendingValuations={0}/>
    {readiness.ready
      ? <PeriodBatchPanel key={`${panel.classroomId}:${panel.periodId}:family`} {...panel} kind="family" onContinue={onContinue}/>
      : <p className="text-sm text-[#526b87]">Revisa y guarda las conclusiones para preparar los informes a familias.</p>}
  </div>;
}
