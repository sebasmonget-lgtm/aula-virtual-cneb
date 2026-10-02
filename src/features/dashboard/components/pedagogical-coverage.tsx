"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { displayDate } from "@/src/lib/display-date";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { countNoun, diagnosticAntecedentLabel, periodEvidenceLabel } from "@/src/lib/record-language";

type CoverageState = "no_records" | "observe_more" | "building_evidence" | "varied_evidence";
type AssessmentState = "not_assessed" | "draft" | "confirmed" | "needs_review";
type CoverageRow = { student_id: string; competency_id: string; planned: boolean; coverage_state: CoverageState;
  assessment_state: AssessmentState; record_count: number; evidence_count: number; diagnostic_count: number;
  last_observed_on: string | null; situation_count: number; activity_count: number };
type Coverage = { rows: CoverageRow[];
  by_competency: { competency_id: string; competency_name: string; planned: boolean; activity_count: number;
    students_with_evidence: number; students_without_record: number; evidence_count: number }[];
  by_student: { student_id: string; student_name: string; with_evidence: number; without_record: number;
    evaluated: number; pending: number }[] };
type Detail = { student_id: string; competency_id: string; assessment_state: AssessmentState; timeline: {
  id: string; source_type: "activity_evidence" | "diagnostic_guided" | "diagnostic_spontaneous";
  observed_on: string; situation_title: string; criterion_text: string | null;
  observation_text: string | null; media_available: boolean }[] };

const coverageLabel: Record<CoverageState, string> = {
  no_records: "Sin registros en este período", observe_more: "Conviene observar", building_evidence: "Evidencia en construcción",
  varied_evidence: "Evidencia variada",
};
const assessmentLabel: Record<AssessmentState, string> = {
  not_assessed: "Sin valoración", draft: "Borrador de evaluación", confirmed: "Valoración confirmada",
  needs_review: "Requiere revisión",
};
const colors: Record<CoverageState, string> = {
  no_records: "bg-[#eef2f6]", observe_more: "bg-[#fff3dd]", building_evidence: "bg-[#eaf4fc]",
  varied_evidence: "bg-[#e3f3f4]",
};

export function PedagogicalCoverage({ classroomId, periodId, onPlan, onPrepareActivity, onReview }: {
  classroomId: string; periodId: string; onPlan?: () => void; onPrepareActivity?: () => void;
  onReview?: (studentId: string, competencyId: string) => void;
}) {
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [selection, setSelection] = useState<{ studentId: string; competencyId: string } | null>(null);
  const [competencyId, setCompetencyId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`${localDatabaseApiUrl}/api/period-evaluations/coverage?${new URLSearchParams({ classroomId, periodId })}`,
      { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const data = await response.json() as Coverage & { error?: string }; if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la cobertura."); return data; })
      .then(setCoverage).catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar la cobertura."); });
    return () => controller.abort();
  }, [classroomId, periodId, revision]);
  async function openCell(studentId: string, nextCompetencyId: string) {
    setSelection({ studentId, competencyId: nextCompetencyId }); setDetail(null); setError("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/period-evaluations/coverage/detail?${new URLSearchParams({ classroomId, periodId, studentId, competencyId: nextCompetencyId })}`, { cache: "no-store" });
      const data = await response.json() as Detail & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo abrir el historial.");
      setDetail(data as Detail);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo abrir el historial."); }
  }
  const selectedCompetencyId = competencyId || coverage?.by_competency[0]?.competency_id || "";
  const competencies = showAll ? coverage?.by_competency ?? [] : coverage?.by_competency.filter((item) => item.competency_id === selectedCompetencyId) ?? [];
  const selectedCompetency = coverage?.by_competency.find((item) => item.competency_id === selectedCompetencyId);
  const chosenStudent = coverage?.by_student.find((item) => item.student_id === selection?.studentId);
  const chosenCompetency = coverage?.by_competency.find((item) => item.competency_id === selection?.competencyId);
  const chosenRow = coverage?.rows.find((row) => row.student_id === selection?.studentId && row.competency_id === selection?.competencyId);
  return <section className="space-y-4 rounded-2xl border bg-white p-4 sm:p-5">
    <div><h3 className="text-xl font-bold">Seguimiento del aula</h3><p className="mt-1 text-sm text-[#526b87]">Mira los registros de cada niño por competencia. La valoración es una decisión aparte de la profesora; faltar registros no significa bajo logro.</p></div>
    <div className="flex flex-wrap items-end gap-2"><label className="min-w-48 flex-1 text-sm font-semibold">Competencia<select className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3" value={selectedCompetencyId} onChange={(event) => { setCompetencyId(event.target.value); setSelection(null); setDetail(null); }} disabled={showAll}>{coverage?.by_competency.map((item) => <option key={item.competency_id} value={item.competency_id}>{item.competency_name}</option>)}</select></label><Button variant="outline" onClick={() => setRevision((value) => value + 1)}>Actualizar</Button></div>
    <Button variant="ghost" onClick={() => { setShowAll((value) => !value); setSelection(null); setDetail(null); }}>{showAll ? "Volver a una competencia" : "Ver todas las competencias"}</Button>
    {error && <p role="alert" className="rounded-xl bg-[#fff3dd] p-3 text-sm">{error}</p>}
    {!coverage && !error && <p>Cargando seguimiento…</p>}
    {coverage && selectedCompetency && !showAll && <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[680px] border-collapse text-left text-sm"><thead><tr className="bg-[#eaf5fa]"><th scope="col" className="p-3">Niño</th><th scope="col" className="p-3">Cobertura</th><th scope="col" className="p-3">Última observación</th><th scope="col" className="p-3">Situaciones</th><th scope="col" className="p-3">Evaluación</th></tr></thead><tbody>{coverage.by_student.map((student) => { const row = coverage.rows.find((item) => item.student_id === student.student_id && item.competency_id === selectedCompetencyId); return row && <tr key={student.student_id} className="border-t"><th scope="row" className="p-3 font-semibold">{student.student_name}</th><td className="p-2"><button type="button" className={`w-full rounded-xl border p-3 text-left font-semibold hover:border-[#087d96] ${colors[row.coverage_state]}`} onClick={() => void openCell(student.student_id, selectedCompetencyId)} aria-label={`Abrir historial de ${student.student_name} en ${selectedCompetency.competency_name}`}><span>{coverageLabel[row.coverage_state]}</span><span className="mt-1 block text-xs font-normal">{periodEvidenceLabel(row.evidence_count)} · {diagnosticAntecedentLabel(row.diagnostic_count)} en el período</span></button></td><td className="p-3">{row.last_observed_on ? displayDate(row.last_observed_on) : "—"}</td><td className="p-3">{countNoun(row.situation_count,"situación","situaciones")}</td><td className="p-3">{assessmentLabel[row.assessment_state]}</td></tr>; })}</tbody></table></div>}
    {coverage && showAll && <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead><tr className="bg-[#eaf5fa]"><th scope="col" className="sticky left-0 z-10 min-w-40 border-b bg-[#eaf5fa] p-3">Niño</th>{competencies.map((item) => <th scope="col" key={item.competency_id} className="min-w-48 border-b p-3 align-bottom">{item.competency_name}</th>)}</tr></thead><tbody>{coverage.by_student.map((student) => <tr key={student.student_id} className="border-b last:border-0"><th scope="row" className="sticky left-0 z-10 bg-white p-3 font-semibold">{student.student_name}</th>{competencies.map((competency) => { const row = coverage.rows.find((item) => item.student_id === student.student_id && item.competency_id === competency.competency_id); return <td key={competency.competency_id} className="p-2 align-top">{row && <button type="button" className={`min-h-24 w-full rounded-xl border p-3 text-left hover:border-[#087d96] focus-visible:outline-2 focus-visible:outline-[#087d96] ${colors[row.coverage_state]}`} onClick={() => void openCell(student.student_id, competency.competency_id)} aria-label={`${student.student_name}, ${competency.competency_name}: ${coverageLabel[row.coverage_state]}; ${assessmentLabel[row.assessment_state]}. Abrir historial.`}><span className="block font-semibold">{coverageLabel[row.coverage_state]}</span><span className="mt-1 block text-xs">{periodEvidenceLabel(row.evidence_count)} · {diagnosticAntecedentLabel(row.diagnostic_count)} · {countNoun(row.situation_count,"situación","situaciones")}{row.last_observed_on ? ` · ${displayDate(row.last_observed_on)}` : ""}</span><span className="mt-2 block border-t border-current/10 pt-1 text-xs font-semibold">Evaluación: {assessmentLabel[row.assessment_state]}</span></button>}</td>; })}</tr>)}</tbody></table></div>}
    {selection && <div className="scroll-mt-24 rounded-xl border border-[#b9dce7] bg-[#f8fcfd] p-4" aria-live="polite"><div className="flex items-start justify-between gap-2"><div><h4 className="font-bold">{chosenStudent?.student_name} · {chosenCompetency?.competency_name}</h4><p className="mt-1 text-sm">Cobertura: {chosenRow ? coverageLabel[chosenRow.coverage_state] : "—"} · Evaluación: {detail ? assessmentLabel[detail.assessment_state] : "Cargando…"}</p></div><Button variant="ghost" onClick={() => { setSelection(null); setDetail(null); }}>Cerrar</Button></div>
      {detail && <><p className="mt-3 text-xs text-[#526b87]">Las observaciones diagnósticas dan contexto. Solo las evidencias de actividad sustentan la valoración del período.</p>{detail.timeline.length ? <div className="mt-3 space-y-4">{["diagnostic","activity_evidence"].map((group) => { const items = detail.timeline.filter((item) => group === "diagnostic" ? item.source_type !== "activity_evidence" : item.source_type === "activity_evidence"); return <section key={group}><h5 className="font-semibold">{group === "diagnostic" ? "Antecedentes diagnósticos" : "Evidencias de este período"}</h5>{items.length ? <ul className="mt-2 space-y-2">{items.map((item) => <li key={`${item.source_type}:${item.id}`} className="rounded-lg border bg-white p-3 text-sm"><b>{displayDate(item.observed_on)} · {item.situation_title}</b>{item.criterion_text && <p className="mt-1 text-[#526b87]">{item.criterion_text}</p>}<p className="mt-2">{item.observation_text || "Registro sin nota escrita."}</p>{item.media_available && item.source_type === "activity_evidence" && <a className="mt-1 inline-block font-semibold text-[#087d96] underline" href={`${localDatabaseApiUrl}/api/period-evaluations/evidence/${item.id}/media`} target="_blank" rel="noreferrer">Abrir adjunto</a>}</li>)}</ul> : <p className="mt-2 text-sm">{group === "diagnostic" ? "Sin antecedentes diagnósticos registrados." : "Aún no hay evidencias registradas en este período."}</p>}</section>; })}</div> : <p className="mt-3 text-sm">Aún no hay observaciones de esta competencia.</p>}{onReview && chosenRow?.planned && <Button className="mt-3" variant="outline" onClick={() => onReview(selection.studentId, selection.competencyId)}>Abrir ficha de evaluación</Button>}</>}
    </div>}
    <div className="flex flex-wrap gap-2">{onPlan && <Button variant="outline" onClick={onPlan}>Ver planificación</Button>}{onPrepareActivity && <Button onClick={onPrepareActivity}>Preparar actividad</Button>}</div>
  </section>;
}
