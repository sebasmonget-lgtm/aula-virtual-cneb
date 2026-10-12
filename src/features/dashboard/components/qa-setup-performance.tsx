"use client";
import { useRef, useState } from "react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
type Report={scenario:string;metrics:Record<string,number>;idempotent:boolean;rolledBack:boolean;temporaryLogosRemoved:boolean;calendarDayInserts:number;httpMs:number;serverTiming:string|null};
export function QASetupPerformance(){
  const [busy,setBusy]=useState(""),[reports,setReports]=useState<Report[]>([]),[error,setError]=useState("");
  const running=useRef(false);
  async function run(){
    if(running.current||reports.length)return;
    running.current=true;
    setError("");
    try{
      for(const scenario of ["before-logo","after-logo","after-basic"]){
        setBusy(scenario);
        const start=performance.now();
        const response=await apiFetch(`${localDatabaseApiUrl}/api/qa/setup-benchmark`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scenario})});
        const value=await response.json() as Omit<Report,"httpMs"|"serverTiming">&{error?:string};
        if(!response.ok)throw new Error(value.error??"La medición no pudo completarse.");
        const report={...value,httpMs:performance.now()-start,serverTiming:response.headers.get("server-timing")} as Report;
        setReports(current=>[...current,report]);
        console.info("ayni_setup_qa_measurement",JSON.stringify(report));
        if(!report.rolledBack||!report.temporaryLogosRemoved||!report.idempotent)throw new Error("Revisar la conservación antes de continuar.");
      }
    }catch(e){setError(e instanceof Error?e.message:"No se pudo medir.");}finally{running.current=false;setBusy("");}
  }
  return <details className="mt-2">
    <summary className="cursor-pointer rounded-lg px-2 py-3 hover:bg-amber-100 focus-visible:outline-2">Medición del guardado · solo QA</summary>
    <p>Compara el recorrido anterior y el corregido con aulas temporales que se revierten. Conserva el aula actual. Retira únicamente los dos logos ficticios de esta prueba.</p>
    <button type="button" disabled={Boolean(busy)||reports.length>0} onClick={()=>void run()} className="mt-3 min-h-11 cursor-pointer rounded-lg border border-amber-800 bg-white px-4 font-semibold hover:bg-amber-100 active:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{busy?`Midiendo ${busy}…`:"Medir con datos ficticios"}</button>
    {reports.length>0&&<div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Prueba</th><th>HTTP</th><th>Guardado</th><th>Calendario</th><th>Logo</th><th>SQL + red</th></tr></thead><tbody>{reports.map(r=><tr key={r.scenario}>{[r.scenario,...[r.httpMs,r.metrics.save,r.metrics.calendar,r.metrics.logo_upload,r.metrics.db_query].map(n=>`${((n??0)/1000).toFixed(2)} s`)].map((value,i)=><td className="border-t border-amber-200 p-2" key={i}>{value}</td>)}</tr>)}</tbody></table></div>}
    {reports.length===3&&!error&&<p role="status" className="mt-2">Pruebas revertidas. Sin duplicados. Logos ficticios retirados.</p>}
    {error&&<p role="alert" className="mt-2">{error}</p>}
  </details>;
}
