"use client";
import { useEffect,useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { writeWorkspaceLocation } from "@/src/lib/workspace-location";
import { LoadingState,WorkflowFeedback } from "./workflow-ui";
type Period={id:string;school_year_id:string;label:string;ends_on:string};
type Review={annual_plan_id:string|null;annual_revision:number|null;rule:string;interests_note:string;competencies:{competency_id:string;name:string;planned_opportunities:number;worked_opportunities:number;students_with_evidence:number;students_without_evidence:number;confirmed_assessments:number;support_decisions:number;interpretation:string;continuity:string}[]};
async function request<T>(path:string,body?:unknown):Promise<T>{const response=await apiFetch(`${localDatabaseApiUrl}${path}`,body===undefined?undefined:{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const value=await response.json() as T&{error?:string};if(!response.ok)throw new Error(value.error||"No pudimos completar la revisión.");return value;}
export function PeriodFutureReview({onEvaluation,onFinish}:{onEvaluation:()=>void;onFinish:()=>void}){
  const [periods,setPeriods]=useState<Period[]|null>(null),[selected,setSelected]=useState(""),[review,setReview]=useState<Review|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{let live=true;void request<{years:{id:string}[];classrooms:{school_year_id:string}[];periods:Period[]}>("/api/period-evaluations/workspace").then(value=>{if(!live)return;
    const schoolYear=value.classrooms[0]?.school_year_id,available=value.periods.filter(period=>period.school_year_id===schoolYear),today=new Date().toLocaleDateString("en-CA",{timeZone:"America/Lima"});
    setPeriods(available);setSelected([...available].reverse().find(period=>period.ends_on<today)?.id??available[0]?.id??"");
  }).catch(cause=>{if(live)setError(cause.message);});return()=>{live=false;};},[]);
  async function analyze(){setBusy(true);setError("");try{setReview(await request<Review>(`/api/period-review?periodId=${selected}`));}catch(cause){setError(cause instanceof Error?cause.message:"No pudimos revisar el período.");}finally{setBusy(false);}}
  async function propose(){if(!review?.annual_plan_id)return;setBusy(true);setError("");try{
    const current=await request<{active:{proposal:{journey_version?:number}};draft:{id:string;supersedes_plan_id:string}|null}>("/api/annual-plans/current");
    let draft=current.draft;
    if(draft&&draft.supersedes_plan_id!==review.annual_plan_id)throw new Error("Ya tienes otro borrador. Revísalo en Mi año antes de proponer un cambio.");
    if(!draft)draft=await request<{id:string;supersedes_plan_id:string}>(current.active.proposal.journey_version===2?`/api/annual-journey/${review.annual_plan_id}/copy`:`/api/annual-plans/${review.annual_plan_id}/new-version`,{expectedRevision:review.annual_revision});
    writeWorkspaceLocation("Planificar",{tab:"annual",annualPlan:draft.id,reviewPeriod:selected});
  }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos abrir la propuesta.");}finally{setBusy(false);}}
  if(!periods&&!error)return <LoadingState label="Abriendo la revisión del período…"/>;
  return <section className="space-y-5"><h1 className="text-3xl font-bold">Revisar el período con Ayni</h1><p>Podemos revisar lo que conociste del aula y las oportunidades que ya están previstas para decidir si conviene cambiar un proyecto futuro.</p>
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    <label className="block font-semibold">Período<select className="ml-3 min-h-11 rounded-lg border px-3" value={selected} disabled={busy} onChange={event=>{setSelected(event.target.value);setReview(null);}}>{periods?.map(period=><option key={period.id} value={period.id}>{period.label}</option>)}</select></label>
    {!review&&<div className="flex flex-wrap gap-3"><Button disabled={busy||!selected} onClick={()=>void analyze()}>Revisar con Ayni</Button><Button variant="outline" onClick={onFinish}>Mantener Mi año como está</Button></div>}
    {review&&<><p className="text-sm text-[#526b87]">{review.rule} Se cuentan actividades y ejecución registradas en Ayni; el trabajo externo sin registro puede completar tu revisión docente.</p>
      <div className="space-y-4">{review.competencies.map(item=><article key={item.competency_id} className="space-y-2 rounded-xl border bg-white p-5"><h2 className="text-lg font-bold">{item.name}</h2><p className="text-sm">{item.planned_opportunities} oportunidades previstas · {item.worked_opportunities} actividades realizadas · {item.students_with_evidence} niños con evidencia · {item.confirmed_assessments} valoraciones confirmadas</p>
        <p className="text-sm">{item.interpretation}. {item.students_without_evidence} niños sin evidencia de esta competencia en el período.</p><p className="text-sm font-semibold text-[#07576c]">{item.continuity}</p>
      </article>)}</div><p className="text-sm">{review.interests_note}</p><div className="flex flex-wrap gap-3"><Button disabled={busy||!review.annual_plan_id} onClick={()=>void propose()}>Proponer un proyecto nuevo</Button><Button variant="outline" onClick={onEvaluation}>Revisar valoraciones y cierre</Button><Button variant="ghost" onClick={onFinish}>Mantener Mi año como está</Button></div><p className="text-sm text-[#526b87]">La propuesta se guarda en Biblioteca. Tú eliges si reemplaza un proyecto futuro y confirmas la nueva versión de Mi año.</p></>}
  </section>;
}
