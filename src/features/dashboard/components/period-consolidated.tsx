"use client";

import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { Button } from "@/components/ui/button";

type Row = {
  student_id: string;
  student_name: string;
  competency_id: string;
  competency_name: string;
  area: string;
  achievement_level: string | null;
  conclusion: string;
  state: string;
};

const statusLabel: Record<string, string> = {
  confirmed: "Confirmada",
  conclusion_pending: "Falta confirmar conclusión",
  level_pending: "Falta valoración",
  needs_review: "Requiere revisión",
  observation_pending: "Pendiente de observación",
  no_evidence: "Sin evidencias",
  insufficient_information: "Información insuficiente",
  draft: "Borrador",
  pending: "Pendiente",
};

export function PeriodConsolidated({ classroomId, periodId, periodLabel, onReview }: {
  classroomId: string;
  periodId: string;
  periodLabel: string;
  onReview: (studentId: string, competencyId: string) => void;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [studentFilter, setStudentFilter] = useState("");
  const [competencyFilter, setCompetencyFilter] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const url = `${localDatabaseApiUrl}/api/period-evaluations/consolidated?classroomId=${encodeURIComponent(classroomId)}&periodId=${encodeURIComponent(periodId)}`;
    apiFetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo cargar el consolidado.");
        return response.json() as Promise<{ rows: Row[] }>;
      })
      .then((result) => { if (!controller.signal.aborted) { setRows(result.rows); setError(""); } })
      .catch(() => { if (!controller.signal.aborted) setError("No se pudo cargar el consolidado. Vuelve a intentarlo."); });
    return () => controller.abort();
  }, [classroomId, periodId, retry]);

  const students = [...new Map((rows ?? []).map((row) => [row.student_id, row.student_name])).entries()];
  const competencies = [...new Map((rows ?? []).map((row) => [row.competency_id, row.competency_name])).entries()];
  const visible = (rows ?? []).filter((row) =>
    (!studentFilter || row.student_id === studentFilter) && (!competencyFilter || row.competency_id === competencyFilter));
  const confirmed = visible.filter((row) => row.state === "confirmed").length;
  const exportQuery = `classroomId=${encodeURIComponent(classroomId)}&periodId=${encodeURIComponent(periodId)}${studentFilter ? `&studentId=${encodeURIComponent(studentFilter)}` : ""}${competencyFilter ? `&competencyId=${encodeURIComponent(competencyFilter)}` : ""}`;

  return <section className="space-y-4 rounded-2xl border bg-white p-5" aria-labelledby="consolidated-title">
    <div>
      <h3 id="consolidated-title" className="text-xl font-bold">Consolidado · {periodLabel}</h3>
      <p className="mt-1 text-sm text-[#526b87]">Una fila por niño y competencia trabajada. El nivel y la conclusión aparecen cuando la valoración está completa y confirmada. “—” indica que siguen pendientes.</p>
    </div>
    {error ? <div role="alert" className="rounded-xl bg-[#fff2d9] p-4 text-sm">{error} <Button type="button" variant="outline" className="ml-2" onClick={() => { setError(""); setRows(null); setRetry((value) => value + 1); }}>Reintentar</Button></div> : null}
    {!rows && !error ? <p role="status" className="text-sm text-[#526b87]">Cargando consolidado…</p> : null}
    {rows && <><div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Alumno<select className="mt-1 block min-h-11 w-full rounded-xl border bg-white px-3" value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}><option value="">Todos los alumnos</option>{students.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="text-sm font-semibold">Competencia<select className="mt-1 block min-h-11 w-full rounded-xl border bg-white px-3" value={competencyFilter} onChange={(event) => setCompetencyFilter(event.target.value)}><option value="">Todas las competencias</option>{competencies.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p>{confirmed} de {visible.length} valoraciones confirmadas en esta vista.</p><a href={`${localDatabaseApiUrl}/api/period-evaluations/consolidated.xlsx?${exportQuery}`} className="inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold text-[#07516a]"><FileDown className="mr-2 size-4" />Exportar Excel de Ayni</a></div>
      <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead className="bg-[#eaf7fb]"><tr><th scope="col" className="p-3">Alumno</th><th scope="col" className="p-3">Área y competencia</th><th scope="col" className="p-3 text-center">Nivel</th><th scope="col" className="p-3">Conclusión descriptiva</th><th scope="col" className="p-3">Estado</th><th scope="col" className="p-3">Acción</th></tr></thead><tbody>{visible.map((row) => <tr key={`${row.student_id}:${row.competency_id}`} className="border-t align-top"><th scope="row" className="p-3 font-semibold">{row.student_name}</th><td className="p-3"><span className="block text-xs text-[#526b87]">{row.area}</span>{row.competency_name}</td><td className="p-3 text-center font-bold">{row.state === "confirmed" ? row.achievement_level ?? "—" : "—"}</td><td className="max-w-lg p-3">{row.state === "confirmed" ? row.conclusion || "—" : "—"}</td><td className="p-3">{statusLabel[row.state] ?? row.state}</td><td className="p-3"><button type="button" className="min-h-11 font-semibold text-[#07576c] underline" onClick={() => onReview(row.student_id, row.competency_id)}>Revisar</button></td></tr>)}</tbody></table>{visible.length === 0 && <p className="p-4 text-sm text-[#526b87]">{rows.length ? "No hay competencias para estos filtros." : "Todavía no hay competencias trabajadas en este período."}</p>}</div>
      <p className="text-xs text-[#526b87]">Esta vista organiza datos de Ayni de forma similar al registro por competencia de SIAGIE. El Excel no es un archivo de carga a SIAGIE.</p>
    </>}
  </section>;
}
