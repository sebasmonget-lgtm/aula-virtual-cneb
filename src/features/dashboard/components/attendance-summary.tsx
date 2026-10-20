"use client";
import {useEffect,useState} from "react";
import {CalendarCheck,ChevronDown} from "lucide-react";
import {Button} from "@/components/ui/button";
import {apiFetch,apiJson} from "@/src/lib/ayni-api-fetch";
import {localDatabaseApiUrl} from "@/src/lib/local-database";
import {WorkflowFeedback} from "./workflow-ui";

type Counts={id?:string;name?:string;status?:string;present:number;late:number;absent:number;excused:number;attended:number;recorded:number;total:number;pending:number;percentage:number|null};
type Summary={label:string;from:string;to:string;as_of:string;instructional_days:number;periods:{id:string;label:string}[];children:Counts[];totals:Counts};
const percent=(value:number|null)=>value===null?"Sin registros":`${new Intl.NumberFormat('es-PE',{maximumFractionDigits:2}).format(value)} %`;
export function AttendanceSummary(){
  const [open,setOpen]=useState(false),[period,setPeriod]=useState(''),[child,setChild]=useState(''),[data,setData]=useState<Summary|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[loading,setLoading]=useState(false);
  useEffect(()=>{if(!open)return;const controller=new AbortController();
    void apiFetch(`${localDatabaseApiUrl}/api/attendance/summary${period?`?attendancePeriod=${encodeURIComponent(period)}`:''}`,{signal:controller.signal})
      .then(async response=>{const value=await apiJson<Summary&{error?:string}>(response);if(!response.ok)throw new Error(value.error??'No pudimos abrir la asistencia.');if(!controller.signal.aborted)setData(value);})
      .catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'No pudimos abrir la asistencia.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
  },[open,period,retry]);
  return <section className="rounded-2xl border border-[#c3e1df] bg-[#f0faf6] p-5 shadow-[var(--ayni-panel-shadow)]" aria-label="Resumen de asistencia">
    <button className="flex min-h-11 w-full items-center gap-3 text-left font-bold text-[#172b52]" onClick={()=>{if(!open){setLoading(true);setError('');}setOpen(value=>!value);}} aria-expanded={open}><CalendarCheck className="text-[#087d96]"/>Asistencia del aula<ChevronDown className={`ml-auto transition-transform ${open?'rotate-180':''}`}/></button>
    {open&&<div className="mt-4 space-y-4">
      {data&&<div className="flex flex-wrap gap-4"><label className="text-sm font-semibold">Período<select className="mt-1 block min-h-11 rounded-xl border bg-white px-3" value={period} onChange={event=>{setLoading(true);setError('');setPeriod(event.target.value);}}><option value="">Año escolar</option>{data.periods.map(row=><option key={row.id} value={row.id}>{row.label}</option>)}</select></label><label className="text-sm font-semibold">Niño o niña<select className="mt-1 block min-h-11 max-w-full rounded-xl border bg-white px-3" value={child} onChange={event=>setChild(event.target.value)}><option value="">Todos</option>{data.children.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label></div>}
      {loading&&<p role="status">Consultando la asistencia…</p>}
      {error&&<WorkflowFeedback tone="error">{error}<Button variant="outline" onClick={()=>{setLoading(true);setError('');setRetry(value=>value+1);}}>Volver a consultar</Button></WorkflowFeedback>}
      {data&&!loading&&!error&&<>
        <div className="grid gap-3 sm:grid-cols-3">{[[String(data.instructional_days),'Días de clase transcurridos'],[percent(data.totals.percentage),'Asistencia registrada del aula'],[String(data.totals.pending),'Registros por completar']].map(([value,label])=><div key={label} className="rounded-xl border border-[#d1e5de] bg-white p-4"><strong className="block text-xl text-[#172b52]">{value}</strong><span className="text-sm text-[#365b73]">{label}</span></div>)}</div>
        <p className="text-sm leading-relaxed text-[#365b73]">Presente + tarde, dividido entre los días de clase transcurridos. Se excluyen feriados, fines de semana, gestión y días sin clases. Los porcentajes son provisionales mientras falten registros.</p>
        <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-[#e3f2f4]"><tr>{['Niño / niña','Asistió','Faltó','Justificada','Por registrar','Asistencia'].map(label=><th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{data.children.filter(row=>!child||row.id===child).map(row=><tr key={row.id} className="border-t"><th className="min-w-44 px-3 py-3 font-semibold">{row.name}{row.status!=='active'&&<small className="block font-normal">Retirado · conserva sus registros</small>}</th><td className="px-3 py-3">{row.attended}<small className="block text-[#526b87]">{row.late} tarde</small></td><td className="px-3 py-3">{row.absent}</td><td className="px-3 py-3">{row.excused}</td><td className="px-3 py-3">{row.pending}</td><td className="whitespace-nowrap px-3 py-3 font-semibold">{percent(row.percentage)}</td></tr>)}</tbody></table></div>
        <p className="text-xs text-[#526b87]">Corte: {data.as_of}. Los días sin registro no se convierten en faltas. La referencia es el calendario del aula; no supone fechas de matrícula o retiro que no se hayan registrado.</p>
      </>}
    </div>}
  </section>;
}
