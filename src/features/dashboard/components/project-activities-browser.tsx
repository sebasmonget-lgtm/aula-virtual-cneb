"use client";
import { useEffect,useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { displayDate } from "@/src/lib/display-date";
import { WorkflowFeedback } from "./workflow-ui";
type Activity={id:string;revision:number;title:string;occurs_on:string;details:Record<string,string>};
export function ProjectActivitiesBrowser({activityId,today,onChanged}:{activityId:string;today:string;onChanged:()=>Promise<void>}){
  const [activities,setActivities]=useState<Activity[]>([]),[opened,setOpened]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{const controller=new AbortController();void apiFetch(`${localDatabaseApiUrl}/api/activities/${activityId}/companions`,{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();return response.json() as Promise<{activities:Activity[]}>;}).then(value=>{if(!controller.signal.aborted)setActivities(value.activities);}).catch(()=>{});return()=>controller.abort();},[activityId]);
  async function read(){setBusy(true);setError("");try{const response=await apiFetch(`${localDatabaseApiUrl}/api/activities/${activityId}/companions`);
    if(!response.ok)throw new Error("No pudimos abrir las actividades del proyecto.");const value=await response.json() as {activities:Activity[]};setActivities(value.activities);setOpened(true);
  }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos abrir las actividades.");}finally{setBusy(false);}}
  async function swap(other:Activity){const current=activities.find(item=>item.id===activityId);if(!current)return;
    if(!window.confirm(`¿Quieres usar hoy «${other.title}»? «${current.title}» quedará para el ${displayDate(other.occurs_on)}. Se conservan los criterios y el proyecto.`))return;
    setBusy(true);setError("");try{const response=await apiFetch(`${localDatabaseApiUrl}/api/activities/swap-dates`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({activityId:current.id,otherActivityId:other.id,expectedRevision:current.revision,otherExpectedRevision:other.revision})});
      const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||"No pudimos intercambiar las actividades.");await onChanged();setOpened(false);
    }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos guardar el intercambio.");}finally{setBusy(false);}}
  const ordinal=activities.findIndex(item=>item.id===activityId)+1;
  return <section className="space-y-3">{ordinal>0&&<p className="text-sm text-[#526b87]">Actividad {ordinal} de {activities.length} del proyecto</p>}<Button variant="outline" disabled={busy} onClick={()=>opened?setOpened(false):void read()}>{opened?"Cerrar otras actividades":"Ver otras actividades del proyecto"}</Button>
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {opened&&<ol className="space-y-3">{activities.map((item,index)=><li key={item.id}><details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-semibold">{index+1} de {activities.length} · {item.title} · {displayDate(item.occurs_on)}</summary><div className="mt-4 space-y-3">{([['purpose','Propósito'],['child_actions','Acciones de los niños'],['mediation','Mediación'],['evaluation_criterion','Criterio'],['expected_evidence','Evidencia esperada'],['closure_or_continuity','Cierre o continuidad']] as const).map(([field,label])=><p className="whitespace-pre-wrap text-sm" key={field}><b>{label}:</b> {item.details[field]}</p>)}
      {item.id!==activityId&&item.occurs_on>today&&activities.some(current=>current.id===activityId&&current.occurs_on===today)&&<Button disabled={busy} onClick={()=>void swap(item)}>Usar esta actividad hoy</Button>}
      {item.occurs_on<today&&<p className="text-sm text-[#526b87]">Actividad anterior · se conserva su registro.</p>}
    </div></details></li>)}</ol>}
  </section>;
}
