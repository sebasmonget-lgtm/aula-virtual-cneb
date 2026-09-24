"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { localDatabaseApiUrl } from "@/src/lib/local-database";

type CoverageRow={student_id:string;competency_id:string;planned:boolean;evidence_count:number;last_observation:string|null;activity_count:number;evaluation_status:"evaluada"|"informacion_insuficiente"|"pendiente"|"sin_registro"};
type Coverage={rows:CoverageRow[];by_competency:{competency_id:string;competency_name:string;planned:boolean;activity_count:number;students_with_evidence:number;students_without_record:number;evidence_count:number}[];by_student:{student_id:string;student_name:string;with_evidence:number;without_record:number;evaluated:number;pending:number}[]};
const status=(row:CoverageRow)=>row.evaluation_status==="evaluada"?"Evaluada":row.evaluation_status==="informacion_insuficiente"?"Información insuficiente":row.evidence_count?"Pendiente de evaluar":row.planned?"Pendiente de observar":"Sin registro";

export function PedagogicalCoverage({classroomId,periodId,onPlan,onPrepareActivity}:{classroomId:string;periodId:string;onPlan?:()=>void;onPrepareActivity?:()=>void}){
  const [loaded,setLoaded]=useState<{key:string;coverage:Coverage}|null>(null);
  const [loadError,setLoadError]=useState<{key:string;message:string}|null>(null);
  const [competencyId,setCompetencyId]=useState("");
  const [view,setView]=useState<"competency"|"student">("competency");
  const [revision,setRevision]=useState(0);
  const key=`${classroomId}:${periodId}:${revision}`;
  const coverage=loaded?.key===key?loaded.coverage:null;
  const error=loadError?.key===key?loadError.message:"";
  useEffect(()=>{const controller=new AbortController();
    fetch(`${localDatabaseApiUrl}/api/period-evaluations/coverage?${new URLSearchParams({classroomId,periodId})}`,{signal:controller.signal,cache:"no-store"})
      .then(async(response)=>{const value=await response.json() as Coverage&{error?:string};if(!response.ok)throw new Error(value.error??"No se pudo cargar la cobertura.");return value;})
      .then((value)=>{setLoaded({key,coverage:value});setLoadError(null);}).catch((cause)=>{if(!controller.signal.aborted)setLoadError({key,message:cause instanceof Error?cause.message:"No se pudo cargar la cobertura."});});
    return()=>controller.abort();},[classroomId,periodId,key]);
  const visible=coverage?.rows.filter((row)=>!competencyId||row.competency_id===competencyId)??[];
  return <section className="space-y-4 rounded-2xl border bg-white p-5"><div><h3 className="text-xl font-bold">Cobertura pedagógica</h3><p className="mt-1 text-sm text-[#526b87]">Muestra lo registrado hasta ahora. “Sin registro” no describe el aprendizaje del niño.</p></div>
    <div className="flex flex-wrap gap-2"><Button variant={view==="competency"?"default":"outline"} onClick={()=>setView("competency")}>Por competencia</Button><Button variant={view==="student"?"default":"outline"} onClick={()=>setView("student")}>Por niño</Button><Button variant="outline" onClick={()=>setRevision((value)=>value+1)}>Actualizar</Button></div>
    {error&&<p role="alert" className="rounded-xl bg-[#fff2d9] p-3 text-sm">{error}</p>}
    {!coverage&&!error&&<p>Cargando cobertura…</p>}
    {coverage&&<><label className="block text-sm font-semibold">Competencia<select className="mt-1 block min-h-11 w-full rounded-xl border bg-white px-3" value={competencyId} onChange={(event)=>setCompetencyId(event.target.value)}><option value="">Todas</option>{coverage.by_competency.map((item)=><option key={item.competency_id} value={item.competency_id}>{item.competency_name}</option>)}</select></label>
      {view==="competency"?<div className="space-y-3">{coverage.by_competency.filter((item)=>!competencyId||item.competency_id===competencyId).map((item)=>{const children=visible.filter((row)=>row.competency_id===item.competency_id);return <article key={item.competency_id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h4 className="font-bold">{item.competency_name}</h4><span className="text-sm text-[#526b87]">{item.planned?"Prevista en el período":"Aún no prevista"}</span></div><p className="mt-2 text-sm">{item.students_with_evidence} con registros · {item.students_without_record} sin registro · {item.activity_count} actividades con criterio</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e9f1f5]"><div className="h-full bg-[#087d96]" style={{width:`${children.length?item.students_with_evidence/children.length*100:0}%`}} /></div><ul className="mt-3 grid gap-2 sm:grid-cols-2">{children.map((row)=><li key={row.student_id} className="rounded-lg bg-[#f5f9fc] p-2 text-sm"><b>{coverage.by_student.find((student)=>student.student_id===row.student_id)?.student_name}</b><span className="block text-[#526b87]">{status(row)} · {row.evidence_count} registros{row.last_observation?` · Última: ${row.last_observation}`:""}</span></li>)}</ul></article>;})}</div>
        :<div className="space-y-3">{coverage.by_student.map((student)=><article key={student.student_id} className="rounded-xl border p-4"><h4 className="font-bold">{student.student_name}</h4><p className="mt-1 text-sm">{student.with_evidence} competencias con registros · {student.without_record} sin registro · {student.evaluated} evaluadas · {student.pending} previstas pendientes</p><ul className="mt-3 grid gap-2 sm:grid-cols-2">{visible.filter((row)=>row.student_id===student.student_id).map((row)=><li key={row.competency_id} className="rounded-lg bg-[#f5f9fc] p-2 text-sm"><b>{coverage.by_competency.find((item)=>item.competency_id===row.competency_id)?.competency_name}</b><span className="block text-[#526b87]">{status(row)} · {row.evidence_count} registros{row.last_observation?` · Última: ${row.last_observation}`:""}</span></li>)}</ul></article>)}</div>}
      <div className="flex flex-wrap gap-2">{onPlan&&<Button variant="outline" onClick={onPlan}>Ver planificación</Button>}{onPrepareActivity&&<Button onClick={onPrepareActivity}>Preparar actividad</Button>}</div>
    </>}
  </section>;
}
