"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { LoadingState, WorkflowFeedback } from "./workflow-ui";

type Source = { id: string; date: string; kind: "ordinary" | "activity"; observation: string | null;
  activity: string | null; criterion: string | null; media_available: boolean };
type Competency = { id: string; name: string; state: string; level: string | null;
  conclusion: string | null; next_opportunities: string[]; sources: Source[] };
type Trajectory = { diagnostic: { id: string; date: string; observation: string | null;
  situation: string | null; competency_ids: string[]; kind: string }[];
  timeline: { period: { id: string; label: string; starts_on: string; ends_on: string };
  competencies: Competency[] }[];
  pending_observations: { id: string; date: string; observation: string | null }[] };

const stateLabel = (state: string) => ({ confirmed: "Valoración confirmada", observation_pending: "Oportunidad de observación",
  insufficient_information: "Información insuficiente", pending: "Lista para revisión docente",
  needs_review: "Revisar información nueva", draft: "Borrador", level_pending: "Elegir valoración",
  conclusion_pending: "Falta conclusión descriptiva" }[state] ?? "Por revisar");

export function StudentTrajectory({ studentId, diagnosticCount }: { studentId: string; diagnosticCount: number }) {
  const [data, setData] = useState<Trajectory | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void apiFetch(`${localDatabaseApiUrl}/api/students/${studentId}/trajectory`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { const body = await response.json() as Trajectory & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "No se pudo cargar la trayectoria."); return body; })
      .then(body => { if (!controller.signal.aborted) setData(body); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar la trayectoria."); });
    return () => controller.abort();
  }, [studentId]);
  if (error) return <WorkflowFeedback tone="error">{error}</WorkflowFeedback>;
  if (!data) return <LoadingState label="Cargando trayectoria…" />;
  return <div className="space-y-4" aria-label="Trayectoria del estudiante">
    <section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-extrabold">Diagnóstico</h2>
      <p className="mt-1 text-sm text-[#526b87]">{data.diagnostic.length ? `${data.diagnostic.length} hechos iniciales registrados.` : diagnosticCount ? `${diagnosticCount} registros iniciales disponibles en Diagnóstico.` : "Aún no hay hechos iniciales registrados."}</p>
      {data.diagnostic.length > 0 && <ul className="mt-3 space-y-2">{data.diagnostic.map(item => <li key={`${item.kind}-${item.id}`} className="rounded-lg bg-[#f6f9fd] p-3 text-sm">
        <span className="text-xs text-[#526b87]">{item.date} · {item.situation ?? "Observación diagnóstica"}</span>
        {item.observation && <p className="whitespace-pre-wrap">{item.observation}</p>}
      </li>)}</ul>}</section>
    {data.timeline.map(({ period, competencies }) => <section key={period.id} className="rounded-2xl border bg-white p-5">
      <h2 className="text-lg font-extrabold">{period.label}</h2>
      <p className="text-xs text-[#526b87]">{period.starts_on} – {period.ends_on}</p>
      {competencies.length ? <div className="mt-3 space-y-3">{competencies.map(item => <article key={item.id} className="rounded-xl border border-[#d4e1ed] p-3">
        <h3 className="font-semibold">{item.name}</h3><p className="mt-1 text-sm text-[#526b87]">{stateLabel(item.state)} · {item.sources.length} {item.sources.length === 1 ? "registro" : "registros"}</p>
        {item.level && <p className="mt-1 text-sm font-semibold">Valoración docente: {item.level}</p>}
        {item.conclusion && <p className="mt-1 text-sm">{item.conclusion}</p>}
        {item.next_opportunities?.length > 0 && <p className="mt-1 text-sm text-[#526b87]">Próxima oportunidad acordada: {item.next_opportunities.join("; ")}</p>}
        {item.sources.length > 0 && <details className="mt-2"><summary className="cursor-pointer text-sm font-semibold text-[#07576c]">Ver hechos y fuentes</summary>
          <ul className="mt-2 space-y-2">{item.sources.map(source => <li key={source.id} className="rounded-lg bg-[#f6f9fd] p-2 text-sm">
            <span className="text-xs text-[#526b87]">{source.date} · {source.kind === "ordinary" ? "Observación docente" : "Evidencia de actividad"}</span>
            {source.observation && <p className="whitespace-pre-wrap">{source.observation}</p>}
            {source.criterion && <p className="text-xs text-[#526b87]">Criterio: {source.criterion}</p>}
            {source.media_available && <p className="text-xs text-[#526b87]">Archivo privado disponible en su registro.</p>}
          </li>)}</ul></details>}
      </article>)}</div> : <p className="mt-3 text-sm text-[#526b87]">Sin competencias trabajadas o evaluadas en este período.</p>}
    </section>)}
    {data.pending_observations.length > 0 && <section className="rounded-2xl border bg-[#eef8fc] p-5"><h2 className="text-lg font-extrabold">Observaciones por revisar</h2>
      <p className="mt-1 text-sm text-[#526b87]">No entran a una valoración hasta la decisión docente.</p>
      <ul className="mt-2 space-y-2">{data.pending_observations.map(item => <li key={item.id} className="rounded-lg bg-white p-2 text-sm">
        {item.date} · {item.observation ?? "Nota con archivo privado"}</li>)}</ul></section>}
  </div>;
}
