"use client";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { AsyncButton } from "./workflow-ui";

type Workshop = { title:string; purpose:string; development:string; opening:string; closure:string; criterion_or_observation_focus:string; materials:string[] };
export function DirectWorkshopPanel({activityId,expectedRevision}:{activityId:string;expectedRevision:number}) {
  const [open,setOpen]=useState(false),[preference,setPreference]=useState("");
  const [proposal,setProposal]=useState<Workshop|null>(null),[generation,setGeneration]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState(false);
  async function act(action:"generate"|"confirm") {
    if(busy)return;setBusy(true);setError("");
    try {
      const response=await apiFetch(`${localDatabaseApiUrl}/api/activities/${activityId}/workshop/${action}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({expectedRevision,preference,proposal,generationId:generation})});
      const result=await response.json() as {error?:string;proposal:Workshop;generation_id:string};if(!response.ok)throw new Error(result.error||"No pudimos preparar el taller.");
      if(action==="generate"){setProposal(result.proposal);setGeneration(result.generation_id);}else setSaved(true);
    }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos guardar el taller. Tus cambios siguen aquí.");}finally{setBusy(false);}
  }
  return <div className="mt-3">{!open?<Button variant="outline" className="min-h-11" onClick={()=>setOpen(true)}>+ Añadir taller</Button>:<section aria-label="Taller opcional de este día" className="space-y-4 rounded-xl border border-[#d6e5ef] p-4">
    {saved?<p role="status">Taller guardado para este día.</p>:<><label className="block font-semibold">¿Qué te gustaría proponer? (opcional)<Textarea className="mt-2" maxLength={1000} value={preference} disabled={busy||!!proposal} onChange={event=>setPreference(event.target.value)} placeholder="Por ejemplo: explorar sonidos con objetos del aula."/></label>
    {!proposal?<AsyncButton busy={busy} busyLabel="Preparando un taller…" onClick={()=>void act("generate")}>Preparar taller</AsyncButton>:<><h3 className="text-lg font-bold">{proposal.title}</h3><p>{proposal.purpose}</p><p>{proposal.opening}</p><label className="block font-semibold">Qué harán los niños<Textarea className="mt-2 min-h-32 font-normal" value={proposal.development} maxLength={1400} disabled={busy} onChange={event=>setProposal({...proposal,development:event.target.value})}/></label><p>{proposal.closure}</p><p><b>Qué observar:</b> {proposal.criterion_or_observation_focus}</p><p><b>Materiales:</b> {proposal.materials.join(", ")}</p><AsyncButton busy={busy} busyLabel="Guardando taller…" onClick={()=>void act("confirm")}>Usar este taller</AsyncButton></>}
    <Button variant="ghost" disabled={busy} onClick={()=>setOpen(false)}>Cerrar</Button></>}{error&&<p role="alert">{error}</p>}</section>}</div>;
}
