"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight,CalendarDays,Info,BookOpen,TableProperties,Users } from "lucide-react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { readWorkspaceParams, writeWorkspaceLocation } from "@/src/lib/workspace-location";
import { selectEvaluationPeriod } from "@/src/lib/evaluation-period-selection.mjs";
import { localDatabaseApiUrl, type LocalDashboard } from "@/src/lib/local-database";
import { LoadingState, WorkflowFeedback } from "./workflow-ui";

import styles from "./evaluation-home.module.css";

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
  const [noticeDismissed,setNoticeDismissed]=useState("");
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

  const observedRows=(overview?.rows??[]).filter(row=>row.evidence_count>0);
  const observedStudents=new Set(observedRows.map(row=>row.student_id)).size;
  const observedCompetencies=new Set(observedRows.map(row=>row.competency_id)).size;
  const actions = [
    {title:"Evaluación del bimestre",subtitle:"Revisa las observaciones y elige las notas",Icon:BookOpen,act:()=>onPeriod("student")},
    {title:"Informe a familias",subtitle:"Prepara todos los informes y revisa las excepciones",Icon:Users,act:()=>onPeriod("family")},
    {title:"Consolidado",subtitle:"Valoraciones, conclusiones, Excel y cierre",Icon:TableProperties,act:()=>onPeriod("consolidated")},
  ];
  return <div className={styles.page}>
    <header className={styles.hero}><span className={styles.heroIcon}><BookOpen aria-hidden="true"/></span><div className={styles.heroCopy}><h1>Evaluar</h1><p>Revisa sus aprendizajes y elige las notas.</p><span className={styles.encouragement}>Acompañamos sus primeros aprendizajes</span></div><Image src="/project-illustrations/friendship.webp" width={220} height={220} unoptimized alt="" aria-hidden="true" className={styles.heroImage}/></header>
    {activePeriod&&<section className={styles.period} aria-label="Período de evaluación"><div className={styles.periodRow}><p><CalendarDays aria-hidden="true"/><strong>{activePeriod.label} · {new Date(`${activePeriod.starts_on}T12:00:00`).toLocaleDateString("es-PE")} a {new Date(`${activePeriod.ends_on}T12:00:00`).toLocaleDateString("es-PE")}</strong></p>{availablePeriods.length>1&&<label>Período que quieres revisar<select disabled={loading} value={activePeriod.id} onChange={event=>{setLoading(true);setOverview(null);setRequestedPeriodId(event.target.value);}}>{availablePeriods.map(period=><option key={period.id} value={period.id}>{period.label}</option>)}</select></label>}</div>
      {!loading&&activePeriod.ends_on<today&&noticeDismissed!==activePeriod.id&&<div className={styles.notice}><Info aria-hidden="true" size={20}/><p>Estás revisando un período terminado. Puedes elegir otro cuando lo necesites.</p><button type="button" aria-label="Cerrar aviso del período" onClick={()=>setNoticeDismissed(activePeriod.id)}>×</button></div>}
    </section>}
    {!loading&&!error&&!activePeriod&&<WorkflowFeedback tone="info">Todavía no hay un período disponible para evaluar en esta aula.</WorkflowFeedback>}
    {loading ? <LoadingState label="Revisando el avance..." /> : error ? <div className="space-y-2"><WorkflowFeedback tone="error">{error}</WorkflowFeedback><button type="button" className="font-bold text-[#0b7891] underline" onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Reintentar</button></div> : null}
    <section className={styles.actions} aria-label="Opciones de evaluación">{actions.map(({title,subtitle,Icon,act},index)=><button key={title} type="button" disabled={loading||Boolean(error)||!overview} onClick={act} className={`${styles.action} ${[styles.mint,styles.lilac,styles.sand][index]}`}><span className={styles.actionIcon}><Icon aria-hidden="true"/></span><span className={styles.actionCopy}><strong>{title}</strong><span>{subtitle}</span>{index===0&&overview&&!loading&&!error&&<span className={styles.counts}><span><Users aria-hidden="true"/>{observedStudents} {observedStudents===1?"niño con observaciones":"niños con observaciones"}</span><span><BookOpen aria-hidden="true"/>{observedCompetencies} {observedCompetencies===1?"competencia observada":"competencias observadas"}</span></span>}</span><Image src={['/ayni-interview-v2.webp','/project-illustrations/parents.webp','/ayni-thinking-v2.webp'][index]} width={220} height={150} unoptimized alt="" aria-hidden="true" className={styles.actionImage}/><span className={styles.arrow}><ArrowRight aria-hidden="true"/></span></button>)}</section>
  </div>;
}
