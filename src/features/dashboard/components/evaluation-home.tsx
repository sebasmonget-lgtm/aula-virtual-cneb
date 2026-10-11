"use client";

import { useEffect, useState } from "react";
import { BookOpen, TableProperties, Users } from "lucide-react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { readWorkspaceParams, writeWorkspaceLocation } from "@/src/lib/workspace-location";
import { selectEvaluationPeriod } from "@/src/lib/evaluation-period-selection.mjs";
import { localDatabaseApiUrl, type LocalDashboard } from "@/src/lib/local-database";
import { LoadingState, WorkflowFeedback } from "./workflow-ui";

type EvaluationView = "student" | "conclusions" | "family" | "coverage" | "consolidated";
type Row = { student_id: string; competency_id: string; competency_name: string; evidence_count: number; state: string; valuation_confirmed:boolean };
type Overview = { students: { id: string; first_name: string; last_name: string; preferred_name: string | null }[]; rows: Row[] };
type Workspace = { today:string;years: { id: string; year: number }[]; classrooms: { id: string; school_year_id: string }[]; periods: { id: string; school_year_id: string; label: string; starts_on: string; ends_on: string }[] };
type Target = { studentId: string; competencyId: string };

async function json<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await apiFetch(`${localDatabaseApiUrl}${url}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("No pudimos cargar el avance de evaluación.");
  return response.json() as Promise<T>;
}

export function EvaluationHome({ onPeriod }: {
  dashboard: LocalDashboard;
  onPeriod: (view: EvaluationView, target?: Target) => void;
  onReplan: () => void;
}) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [activePeriod, setActivePeriod] = useState<Workspace["periods"][number] | null>(null);
  const [availablePeriods, setAvailablePeriods] = useState<Workspace["periods"]>([]);
  const [requestedPeriodId, setRequestedPeriodId] = useState("");
  const [today, setToday] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    json<Workspace>("/api/period-evaluations/workspace", controller.signal).then(async (workspace) => {
      if (controller.signal.aborted) return;
      const params = readWorkspaceParams("Evaluar");
      const year = workspace.years.find(item => item.id === params.get("year")) ?? workspace.years[0];
      const classroom = workspace.classrooms.find(item => item.id === params.get("classroom") && item.school_year_id === year?.id) ?? workspace.classrooms.find((item) => item.school_year_id === year?.id);
      const now = workspace.today;
      const periods = workspace.periods.filter((item) => item.school_year_id === year?.id);
      const period = selectEvaluationPeriod(periods, now, requestedPeriodId || params.get("period"));
      setAvailablePeriods(periods); setToday(now);
      if (!classroom || !period) { setOverview(null); setActivePeriod(null); return; }
      setActivePeriod(period);
      writeWorkspaceLocation("Evaluar", {year: year.id, classroom: classroom.id, period: period.id}, true);
      const result = await json<Overview>(`/api/period-evaluations/overview?classroomId=${classroom.id}&periodId=${period.id}`, controller.signal);
      if (!controller.signal.aborted) setOverview(result);
    }).then(() => { if (!controller.signal.aborted) setError(""); })
      .catch(() => { if (!controller.signal.aborted) setError("No pudimos cargar el avance de evaluación."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry, requestedPeriodId]);

  const candidates=(overview?.rows??[]).filter(row=>row.evidence_count>0&&!row.valuation_confirmed);
  const unobserved=(overview?.rows??[]).filter(row=>!row.evidence_count&&!row.valuation_confirmed);
  const actions = [
    {title:"Evaluación del período",subtitle:overview&&!loading&&!error?`${candidates.length} valoraciones por confirmar · ${unobserved.length} pendientes de observación`:"Revisa lo observado y confirma tus valoraciones",Icon:BookOpen,act:()=>onPeriod("student")},
    {title:"Informe a familias",subtitle:"Prepara todos los informes y revisa las excepciones",Icon:Users,act:()=>onPeriod("family")},
    {title:"Consolidado",subtitle:"Valoraciones, conclusiones, Excel y cierre",Icon:TableProperties,act:()=>onPeriod("consolidated")},
  ];
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-extrabold tracking-tight text-[#1c2e50]">Evaluar</h1><p className="mt-1 text-[#566883]">Ayni organiza la evidencia; tú confirmas la evaluación.</p></header>
    {activePeriod && <p className="text-sm font-semibold">{activePeriod.label} · {new Date(`${activePeriod.starts_on}T12:00:00`).toLocaleDateString("es-PE")} a {new Date(`${activePeriod.ends_on}T12:00:00`).toLocaleDateString("es-PE")}</p>}
    {activePeriod && availablePeriods.length > 1 && <label className="block text-sm font-semibold">Período que quieres revisar<select disabled={loading} className="mt-2 min-h-11 w-full max-w-sm rounded-lg border bg-white px-3" value={activePeriod.id} onChange={event=>{setLoading(true);setOverview(null);setRequestedPeriodId(event.target.value);}}>{availablePeriods.map(period=><option key={period.id} value={period.id}>{period.label}</option>)}</select></label>}
    {activePeriod && !loading && activePeriod.ends_on < today && <p className="text-sm text-[#526b87]">Estás revisando un período terminado. Puedes elegir otro cuando lo necesites.</p>}
    {!loading&&!error&&!activePeriod&&<WorkflowFeedback tone="info">Todavía no hay un período disponible para evaluar en esta aula.</WorkflowFeedback>}
    {loading ? <LoadingState label="Revisando el avance..." /> : error ? <div className="space-y-2"><WorkflowFeedback tone="error">{error}</WorkflowFeedback><button type="button" className="font-bold text-[#0b7891] underline" onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Reintentar</button></div> : null}
    <section className="divide-y divide-[#d6e5ef]">{actions.map(({title,subtitle,Icon,act})=><button key={title} type="button" disabled={loading||Boolean(error)||!overview} onClick={act} className="flex min-h-24 w-full items-center gap-4 py-5 text-left hover:bg-[#f5f9fc] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#087d96]"><Icon aria-hidden="true" className="size-7 shrink-0 text-[#087d96]"/><span className="min-w-0 flex-1"><strong className="block text-lg">{title}</strong><span className="mt-1 block text-sm text-[#526b87]">{subtitle}</span></span><span aria-hidden="true" className="text-[#087d96]">→</span></button>)}</section>
  </div>;
}
