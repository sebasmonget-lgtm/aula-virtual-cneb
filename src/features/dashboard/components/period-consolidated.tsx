"use client";

import { useEffect, useState } from "react";
import { FileDown, CheckCircle2, Clock3 } from "lucide-react";
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
  valuation_confirmed: boolean;
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
  const [statusFilter,setStatusFilter]=useState("all");
  const [showConclusions,setShowConclusions]=useState(false);
  const [downloading,setDownloading]=useState(false);

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
  const filtered = (rows ?? []).filter((row) => (!studentFilter || row.student_id === studentFilter) && (!competencyFilter || row.competency_id === competencyFilter));
  const visible = filtered.filter(row=>statusFilter==="all"||(statusFilter==="complete"?row.state==="confirmed":row.state!=="confirmed"));
  const confirmed = visible.filter((row) => row.valuation_confirmed).length;
  const visibleStudents=students.filter(([id])=>visible.some(row=>row.student_id===id));
  const visibleCompetencies=competencies.filter(([id])=>(!competencyFilter||id===competencyFilter)&&visible.some(row=>row.competency_id===id));
  const exportQuery = `classroomId=${encodeURIComponent(classroomId)}&periodId=${encodeURIComponent(periodId)}${studentFilter ? `&studentId=${encodeURIComponent(studentFilter)}` : ""}${competencyFilter ? `&competencyId=${encodeURIComponent(competencyFilter)}` : ""}${statusFilter!=="all"?`&status=${statusFilter}`:""}`;
  async function downloadExcel(){setDownloading(true);setError("");try{
    const response=await apiFetch(`${localDatabaseApiUrl}/api/period-evaluations/consolidated.xlsx?${exportQuery}`,{cache:"no-store"});
    if(!response.ok)throw new Error("No pudimos descargar el Excel. Vuelve a intentarlo.");
    const url=URL.createObjectURL(await response.blob()),link=document.createElement("a");
    link.href=url;link.download=`Consolidado - ${periodLabel.replace(/[\\/:*?"<>|]/g,"")}.xlsx`;
    document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(cause){setError((cause as Error).message);}finally{setDownloading(false);}}

  return <section className="min-w-0 space-y-4 rounded-2xl border bg-white p-4 sm:p-5" aria-labelledby="consolidated-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h3 id="consolidated-title" className="text-xl font-bold">Registro de evaluaciones · {periodLabel}</h3><p className="mt-1 text-sm text-[#526b87]">Cada fila es un niño o niña; cada columna, una competencia.</p></div>
      <Button variant="outline" disabled={!rows||downloading} onClick={()=>void downloadExcel()}><FileDown aria-hidden="true" className="mr-2 size-4"/>{downloading?"Descargando…":"Exportar Excel de Ayni"}</Button>
    </div>
    {error&&<div role="alert" className="rounded-xl bg-[#fff2d9] p-4 text-sm">{error} <Button type="button" variant="outline" className="ml-2" onClick={()=>{setError("");setRows(null);setRetry(value=>value+1);}}>Reintentar</Button></div>}
    {!rows&&!error&&<p role="status" className="text-sm text-[#526b87]">Cargando consolidado…</p>}
    {rows&&<>
      <div className="grid items-end gap-4 rounded-xl bg-[#f5f9fc] p-3 md:grid-cols-2 xl:grid-cols-[1fr_1.2fr_auto]">
        <label className="min-w-0 text-sm font-semibold">Niño o niña<select className="mt-1 block min-h-11 w-full rounded-xl border bg-white px-3" value={studentFilter} onChange={event=>setStudentFilter(event.target.value)}><option value="">Todos los niños</option>{students.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        <label className="min-w-0 text-sm font-semibold">Competencia<select className="mt-1 block min-h-11 w-full rounded-xl border bg-white px-3" value={competencyFilter} onChange={event=>setCompetencyFilter(event.target.value)}><option value="">Todas las competencias</option>{competencies.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        <fieldset className="min-w-0"><legend className="mb-1 text-sm font-semibold">Registro</legend><div className="flex flex-wrap gap-1">{[["all","Todos"],["pending","Pendientes"],["complete","Completos"]].map(([value,label])=><button key={value} type="button" aria-pressed={statusFilter===value} onClick={()=>setStatusFilter(value)} className={`min-h-11 rounded-xl px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087d96] ${statusFilter===value?"bg-[#087d96] text-white":"bg-white text-[#345372] hover:bg-[#e3eef5]"}`}>{label}</button>)}</div></fieldset>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p role="status" className="tabular-nums">{confirmed} de {visible.length} valoraciones confirmadas en esta vista.</p><label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold"><input className="size-4 accent-[#087d96]" type="checkbox" checked={showConclusions} onChange={event=>setShowConclusions(event.target.checked)}/>Mostrar conclusiones descriptivas</label></div>
      <p className="text-xs text-[#526b87]">Un registro completo tiene valoración y conclusión confirmadas. Desliza la tabla para ver más competencias.</p>
      <div tabIndex={0} role="region" aria-label="Tabla de evaluaciones, desplaza para ver las competencias" className="max-h-[65vh] overflow-auto overscroll-contain rounded-xl border focus-visible:outline-2 focus-visible:outline-[#087d96]">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm" style={{minWidth:200+visibleCompetencies.length*220}}>
          <thead className="sticky top-0 z-20 bg-[#eaf7fb]"><tr><th scope="col" className="sticky left-0 z-30 w-[200px] bg-[#eaf7fb] p-4">Niño / Niña</th>{visibleCompetencies.map(([id,name])=><th key={id} scope="col" className="w-[220px] p-4 text-center align-top font-semibold leading-snug">{name}</th>)}</tr></thead>
          <tbody>{visibleStudents.map(([id,name])=><tr key={id} className="group"><th scope="row" className="sticky left-0 z-10 border-t bg-white p-4 font-semibold group-hover:bg-[#f3f9fc]">{name}</th>{visibleCompetencies.map(([cid])=>{const row=visible.find(item=>item.student_id===id&&item.competency_id===cid);return <td key={cid} className="border-t p-3 text-center align-top group-hover:bg-[#f8fbfd]">{row?<>
            <span className={`inline-flex min-w-12 justify-center rounded-full px-3 py-1 font-bold ${row.valuation_confirmed?"bg-[#e0f4e8] text-[#155d49]":"bg-[#f1f5f9] text-[#526b87]"}`}>{row.achievement_level??"—"}</span>
            <span className={`mt-2 flex items-center justify-center gap-1 text-xs ${row.valuation_confirmed?"text-[#12634e]":"text-[#526b87]"}`}>{row.valuation_confirmed?<CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0"/>:<Clock3 aria-hidden="true" className="size-3.5 shrink-0"/>}{statusLabel[row.state]??row.state}</span>
            {showConclusions&&<p className="mt-2 whitespace-pre-wrap text-left text-sm leading-relaxed">{row.conclusion||"Conclusión pendiente"}</p>}
            <button type="button" className="mt-1 min-h-11 rounded-lg px-2 font-semibold text-[#07576c] underline underline-offset-4 hover:bg-[#eaf7fb] focus-visible:outline-2 focus-visible:outline-[#087d96]" onClick={()=>onReview(id,cid)} aria-label={`Ver evaluación de ${name} en ${row.competency_name}`}>Ver detalle</button>
          </>:<span className="text-xs text-[#526b87]">Fuera del filtro</span>}</td>;})}</tr>)}</tbody>
        </table>{!visible.length&&<p className="p-5 text-sm text-[#526b87]">No hay registros que coincidan con estos filtros.</p>}
      </div>
      <p className="text-xs leading-relaxed text-[#526b87]">Los niveles se corrigen desde su evaluación. El Excel incluye los filtros elegidos; es un registro de Ayni, no un archivo de carga a SIAGIE.</p>
    </>}
  </section>;
}
