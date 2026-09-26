"use client";

import { useEffect, useState } from "react";
import { BookOpen, ClipboardCheck, FileText, Users } from "lucide-react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl, type LocalDashboard } from "@/src/lib/local-database";
import { LoadingState, WorkflowFeedback } from "./workflow-ui";

type EvaluationView = "student" | "family" | "coverage";
type Row = { student_id: string; competency_id: string; competency_name: string; evidence_count: number; state: string };
type Overview = { students: { id: string; first_name: string; last_name: string; preferred_name: string | null }[]; rows: Row[] };
type Workspace = { years: { id: string; year: number }[]; classrooms: { id: string; school_year_id: string }[]; periods: { id: string; school_year_id: string; label: string; starts_on: string; ends_on: string }[] };
type Target = { studentId: string; competencyId: string };

async function json<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await apiFetch(`${localDatabaseApiUrl}${url}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("No pudimos cargar el avance de evaluación.");
  return response.json() as Promise<T>;
}

export function EvaluationHome({ dashboard, onDiagnostic, onPeriod, onReplan }: {
  dashboard: LocalDashboard;
  onDiagnostic: () => void;
  onPeriod: (view: EvaluationView, target?: Target) => void;
  onReplan: () => void;
}) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [diagnostic, setDiagnostic] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [replan, setReplan] = useState<{ label: string; adjusted: boolean; final: boolean; closed: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      json<{ reviewed: boolean; observation_count: number }>("/api/diagnostics/progress", controller.signal),
      json<Workspace>("/api/period-evaluations/workspace", controller.signal),
    ]).then(async ([progress, workspace]) => {
      setDiagnostic(progress.reviewed ? "Revisado" : progress.observation_count > 0 ? "En curso" : "Por empezar");
      const year = workspace.years[0];
      const classroom = workspace.classrooms.find((item) => item.school_year_id === year?.id);
      const now = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const periods = workspace.periods.filter((item) => item.school_year_id === year?.id);
      const period = periods.find((item) => item.starts_on <= now && item.ends_on >= now) ?? periods[0];
      if (!classroom || !period) { setOverview(null); return; }
      setOverview(await json<Overview>(`/api/period-evaluations/overview?classroomId=${classroom.id}&periodId=${period.id}`, controller.signal));
      const ended = [...periods].reverse().find((item) => item.ends_on < now);
      if (ended) {
        try {
          const review = await json<{ adjusted: boolean; plan: unknown; next_period: unknown;
            closure: { closed: boolean; current: boolean } }>(`/api/period-evaluations/replan?classroomId=${classroom.id}&periodId=${ended.id}`, controller.signal);
          if (review.plan) setReplan({ label: ended.label, adjusted: review.adjusted,
            final: !review.next_period, closed: review.closure.closed && review.closure.current });
        } catch { if (!controller.signal.aborted) setReplan(null); }
      }
    }).then(() => setError(""))
      .catch(() => { if (!controller.signal.aborted) setError("No pudimos cargar el avance de evaluación."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const candidates = (overview?.rows ?? []).filter((row) => row.evidence_count > 0 && row.state !== "confirmed");
  const covered = new Set((overview?.rows ?? []).filter((row) => row.evidence_count > 0).map((row) => row.student_id)).size;
  const total = overview?.students.length ?? dashboard.metrics.students_total;
  const confirmed = (overview?.rows ?? []).filter((row) => row.state === "confirmed").length;
  const nameOf = (id: string) => {
    const student = overview?.students.find((item) => item.id === id);
    return student ? `${student.preferred_name || student.first_name} ${student.last_name}` : "Niño del aula";
  };
  const actions = [
    { title: "Diagnóstico", subtitle: diagnostic, Icon: ClipboardCheck, tint: "bg-[#e8f7fa] text-[#0b7891]", act: onDiagnostic },
    { title: "Analizar evidencias", subtitle: `${candidates.length} ${candidates.length === 1 ? "ficha por revisar" : "fichas por revisar"}`, Icon: BookOpen, tint: "bg-[#f1eaff] text-[#7952b8]", act: () => onPeriod("student", candidates[0] ? { studentId: candidates[0].student_id, competencyId: candidates[0].competency_id } : undefined) },
    { title: "Conclusiones", subtitle: `${confirmed} ${confirmed === 1 ? "valoración confirmada" : "valoraciones confirmadas"}`, Icon: FileText, tint: "bg-[#fff2d8] text-[#ad741f]", act: () => onPeriod("student") },
    { title: "Informe a familias", subtitle: "Desde valoraciones confirmadas", Icon: Users, tint: "bg-[#e9f8f2] text-[#287561]", act: () => onPeriod("family") },
  ];

  return <div className="space-y-6">
    <header><h1 className="text-3xl font-extrabold tracking-tight text-[#1c2e50]">Evaluar</h1><p className="mt-1 text-[#566883]">Ayni organiza la evidencia; tú confirmas la evaluación.</p></header>
    {loading ? <LoadingState label="Revisando el avance..." /> : error ? <div className="space-y-2"><WorkflowFeedback tone="error">{error}</WorkflowFeedback><button type="button" className="font-bold text-[#0b7891] underline" onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Reintentar</button></div> : null}
    {replan && <section className="rounded-2xl bg-[#e9f8f2] p-5"><h2 className="font-extrabold text-[#1c2e50]">{replan.adjusted ? "✓ Plan reajustado" : replan.final && replan.closed ? "✓ Período final cerrado" : `Cierre de ${replan.label}`}</h2><p className="mt-1 text-sm text-[#526681]">{replan.adjusted ? "La nueva versión de tu plan está guardada." : replan.final && replan.closed ? "El cierre del año quedó guardado." : "Cierra el período y revisa juntos los próximos pasos."}</p>{!replan.adjusted && !(replan.final && replan.closed) && <button type="button" onClick={onReplan} className="mt-3 min-h-11 rounded-xl bg-[#0b7891] px-5 font-bold text-white">Comenzar revisión</button>}</section>}
    <section><h2 className="mb-3 text-xl font-extrabold text-[#1c2e50]">¿Qué quieres hacer?</h2><div className="grid grid-cols-2 gap-3">{actions.map(({ title, subtitle, Icon, tint, act }) => <button key={title} type="button" onClick={act} className="flex min-h-32 flex-col items-start rounded-[1.3rem] border border-[#d4e1ed] bg-white p-4 text-left hover:border-[#8acbd8] hover:shadow-sm"><span className={`grid size-10 place-items-center rounded-xl ${tint}`}><Icon className="size-5" /></span><b className="mt-2 leading-tight text-[#1c2e50]">{title}</b><small className="mt-1 text-[#536681]">{subtitle}</small><span className="mt-auto pt-2 text-sm font-bold text-[#07576c]">Abrir →</span></button>)}</div></section>
    <section><h2 className="mb-3 text-xl font-extrabold text-[#1c2e50]">Pendientes recomendados</h2>{candidates.length ? <div className="space-y-2">{candidates.slice(0, 3).map((row) => <article key={`${row.student_id}:${row.competency_id}`} className="flex items-end justify-between gap-3 rounded-2xl border border-[#d4e1ed] bg-white p-4"><div><h3 className="font-extrabold text-[#1c2e50]">{nameOf(row.student_id)}</h3><p className="mt-1 text-sm text-[#566883]">{row.competency_name}</p><span className="mt-3 inline-block rounded-full bg-[#f1eaff] px-3 py-1 text-xs font-bold text-[#7952b8]">{row.evidence_count} {row.evidence_count === 1 ? "evidencia" : "evidencias"}</span></div><button type="button" onClick={() => onPeriod("student", { studentId: row.student_id, competencyId: row.competency_id })} className="min-h-11 shrink-0 rounded-xl bg-[#e8f7fa] px-4 text-sm font-bold text-[#07576c]">Revisar</button></article>)}</div> : <div className="rounded-2xl border border-[#d4e1ed] bg-white p-5 text-sm text-[#566883]">{overview ? "No hay fichas con evidencias pendientes de revisión en este período." : "Configura el período desde Evaluación del período para ver sus pendientes."}<button type="button" onClick={() => onPeriod("student")} className="mt-2 block min-h-11 font-bold text-[#07576c]">Abrir evaluación →</button></div>}</section>
    <aside className="rounded-[1.4rem] bg-[#eef8fc] p-5"><h2 className="font-extrabold text-[#1c2e50]">Cobertura del aula</h2><p className="mt-1 text-sm text-[#566883]">{covered} de {total} niños con registros en el período seleccionado</p><div className="mt-4 h-3 overflow-hidden rounded-full bg-[#dfe9f1]"><div className="h-full rounded-full bg-[#0b7891]" style={{ width: `${total ? Math.round(100 * covered / total) : 0}%` }} /></div><button type="button" onClick={() => onPeriod("coverage")} className="mt-3 min-h-11 font-bold text-[#07576c]">Ver cobertura →</button></aside>
  </div>;
}
