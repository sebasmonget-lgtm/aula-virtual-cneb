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
  const [showConclusions,setShowConclusions]=useState(false);

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
      <p className="mt-1 text-sm text-[#526b87]">Cada fila representa un niño y cada columna una competencia. Consulta la evaluación para revisar el sustento; los niveles se corrigen en su origen.</p>
    </div>
    {error ? <div role="alert" className="rounded-xl bg-[#fff2d9] p-4 text-sm">{error} <Button type="button" variant="outline" className="ml-2" onClick={() => { setError(""); setRows(null); setRetry((value) => value + 1); }}>Reintentar</Button></div> : null}
    {!rows && !error ? <p role="status" className="text-sm text-[#526b87]">Cargando consolidado…</p> : null}
    {rows && <><div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Alumno<select className="mt-1 block min-h-11 w-full rounded-xl border bg-white px-3" value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}><option value="">Todos los alumnos</option>{students.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="text-sm font-semibold">Competencia<select className="mt-1 block min-h-11 w-full rounded-xl border bg-white px-3" value={competencyFilter} onChange={(event) => setCompetencyFilter(event.target.value)}><option value="">Todas las competencias</option>{competencies.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p>{confirmed} de {visible.length} valoraciones confirmadas en esta vista.</p><a href={`${localDatabaseApiUrl}/api/period-evaluations/consolidated.xlsx?${exportQuery}`} className="inline-flex min-h-11 items-center rounded-xl border px-4 font-semibold text-[#07516a]"><FileDown className="mr-2 size-4" />Exportar Excel de Ayni</a></div>
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={showConclusions} onChange={event=>setShowConclusions(event.target.checked)}/>Mostrar conclusiones descriptivas</label>
      <div className="max-h-[65vh] overflow-auto rounded-xl border"><table className="w-full min-w-max border-separate border-spacing-0 text-left text-sm"><thead className="sticky top-0 z-20 bg-[#eaf7fb]"><tr><th scope="col" className="sticky left-0 z-30 min-w-40 bg-[#eaf7fb] p-3">Niño</th>{competencies.filter(([id])=>!competencyFilter||id===competencyFilter).map(([id,name])=><th key={id} scope="col" className="max-w-56 p-3 text-center">{name}</th>)}</tr></thead><tbody>{students.filter(([id])=>!studentFilter||id===studentFilter).map(([id,name])=><tr key={id}><th scope="row" className="sticky left-0 z-10 border-t bg-white p-3">{name}</th>{competencies.filter(([cid])=>!competencyFilter||cid===competencyFilter).map(([cid])=>{const row=visible.find(item=>item.student_id===id&&item.competency_id===cid);return <td key={cid} className="max-w-72 border-t p-3 text-center align-top"><b>{row?.achievement_level??"—"}</b>{showConclusions&&<p className="mt-2 whitespace-normal text-left text-sm">{row?.conclusion||"Conclusión pendiente"}</p>}<span className="mt-1 block text-xs text-[#526b87]">{row?statusLabel[row.state]??row.state:"Sin registro"}</span><button type="button" className="mt-1 min-h-11 px-2 font-semibold text-[#07576c] underline" onClick={()=>onReview(id,cid)} aria-label={`Ver evaluación de ${name} en ${row?.competency_name??cid}`}>Ver evaluación</button></td>;})}</tr>)}</tbody></table>{!visible.length&&<p className="p-4 text-sm text-[#526b87]">Todavía no hay competencias trabajadas para esta vista.</p>}</div>
      <p className="text-xs text-[#526b87]">Esta vista organiza datos de Ayni de forma similar al registro por competencia de SIAGIE. El Excel no es un archivo de carga a SIAGIE.</p>
    </>}
  </section>;
}
