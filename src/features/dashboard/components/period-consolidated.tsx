"use client";

import { useEffect, useState } from "react";
import { FileDown, CheckCircle2, Clock3 } from "lucide-react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { Button } from "@/components/ui/button";
import { CompetencyIdentity,competencyTheme } from "./competency-identity";

type Row = {
  student_id: string;
  student_name: string;
  competency_id: string;
  competency_name: string;
  short_label?: string;
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
  const cellIndex=new Map(visible.map(row=>[`${row.student_id}:${row.competency_id}`,row]));
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
      <div><h2 id="consolidated-title" className="text-lg font-bold">Registro por competencia</h2></div>
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
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#526b87]"><span className="flex items-center gap-1"><CheckCircle2 aria-hidden="true" className="size-3.5 text-[#12634e]"/>Valoración confirmada</span><span className="flex items-center gap-1"><Clock3 aria-hidden="true" className="size-3.5 text-[#88520b]"/>Pendiente</span><span>Pulsa una celda para revisar su sustento.</span></p>
      <div tabIndex={0} role="region" aria-label="Tabla de evaluaciones, desplaza para ver las competencias" className="max-h-[65vh] overflow-auto overscroll-contain rounded-xl border focus-visible:outline-2 focus-visible:outline-[#087d96]">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm" style={{minWidth:180+visibleCompetencies.length*168}}>
          <thead className="sticky top-0 z-20 bg-[#eaf7fb]"><tr><th scope="col" className="sticky left-0 z-30 w-[180px] bg-[#eaf7fb] px-3 py-3">Niño / Niña</th>{visibleCompetencies.map(([id,name])=><th key={id} scope="col" aria-label={name} title={name} style={{...competencyTheme(id),background:'var(--competency-surface)'}} className="w-[168px] px-2 py-2 text-center align-middle text-xs font-semibold leading-snug"><CompetencyIdentity id={id} name={name} compact/></th>)}</tr></thead>
          <tbody>{visibleStudents.map(([id,name])=><tr key={id} className="group"><th scope="row" className="sticky left-0 z-10 border-t bg-white px-3 py-2 text-xs font-semibold group-hover:bg-[#f3f9fc]">{name}</th>{visibleCompetencies.map(([cid])=>{const row=cellIndex.get(`${id}:${cid}`);return <td key={cid} className="border-t p-1 text-center align-middle group-hover:bg-[#f8fbfd]">{row?<>
            <button type="button" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#e8f3f8] focus-visible:outline-2 focus-visible:outline-[#087d96]" onClick={()=>onReview(id,cid)} title={statusLabel[row.state]??row.state} aria-label={`Ver evaluación de ${name} en ${row.competency_name}: ${row.achievement_level??"Sin valoración"}. ${statusLabel[row.state]??row.state}`}>
              <span className={`inline-flex min-w-10 justify-center rounded-full px-2 py-1 font-bold ${row.valuation_confirmed?"bg-[#e0f4e8] text-[#155d49]":"bg-[#f1f5f9] text-[#526b87]"}`}>{row.achievement_level??"—"}</span>
              {row.valuation_confirmed?<CheckCircle2 aria-hidden="true" className="size-3.5 text-[#12634e]"/>:<Clock3 aria-hidden="true" className="size-3.5 text-[#88520b]"/>}
            </button>{showConclusions&&<p className="px-2 pb-2 text-left text-xs leading-relaxed whitespace-pre-wrap">{row.conclusion||"Conclusión pendiente"}</p>}
          </>:<span aria-label="Fuera del filtro" className="text-xs text-[#526b87]">—</span>}</td>;})}</tr>)}</tbody>
        </table>{!visible.length&&<p className="p-5 text-sm text-[#526b87]">No hay registros que coincidan con estos filtros.</p>}
      </div>
      <p className="text-xs leading-relaxed text-[#526b87]">El Excel respeta los filtros elegidos. Es un registro de Ayni; no es un archivo de carga a SIAGIE.</p>
    </>}
  </section>;
}
