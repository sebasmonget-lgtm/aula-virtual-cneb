"use client";
import { useEffect,useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { displayDate } from "@/src/lib/display-date";
import { WorkflowFeedback } from "./workflow-ui";
type Activity={id:string;revision:number;title:string;occurs_on:string;details:Record<string,string>};
export function ProjectActivitiesBrowser({activityId,today}:{activityId:string;today:string;onChanged:()=>Promise<void>}){
  const [activities,setActivities]=useState<Activity[]>([]),[opened,setOpened]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{const controller=new AbortController();void apiFetch(`${localDatabaseApiUrl}/api/activities/${activityId}/companions`,{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();return response.json() as Promise<{activities:Activity[]}>;}).then(value=>{if(!controller.signal.aborted)setActivities(value.activities);}).catch(()=>{});return()=>controller.abort();},[activityId]);
  async function read(){setBusy(true);setError("");try{const response=await apiFetch(`${localDatabaseApiUrl}/api/activities/${activityId}/companions`);
    if(!response.ok)throw new Error("No pudimos abrir las actividades del proyecto.");const value=await response.json() as {activities:Activity[]};setActivities(value.activities);setOpened(true);
  }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos abrir las actividades.");}finally{setBusy(false);}}
  return <section className="space-y-3"><Button variant="outline" disabled={busy} onClick={()=>opened?setOpened(false):void read()}>{opened?"Cerrar otras actividades":"Ver otras actividades preparadas"}</Button>
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {opened&&<ol className="space-y-3">{activities.map((item)=><li key={item.id}><details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-semibold">{item.title} · {displayDate(item.occurs_on)}</summary><div className="mt-4 space-y-3">{([['purpose','Propósito'],['child_actions','Acciones de los niños'],['mediation','Mediación'],['evaluation_criterion','Criterio'],['expected_evidence','Evidencia esperada'],['closure_or_continuity','Cierre o continuidad']] as const).map(([field,label])=><p className="whitespace-pre-wrap text-sm" key={field}><b>{label}:</b> {item.details[field]}</p>)}
      {item.occurs_on<today&&<p className="text-sm text-[#526b87]">Actividad anterior · se conserva su registro.</p>}
    </div></details></li>)}</ol>}
  </section>;
}
