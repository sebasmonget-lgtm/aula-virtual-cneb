"use client";
import { useState } from "react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl, loadLocalDashboard, type LocalDashboard } from "@/src/lib/local-database";
import { AsyncButton } from "./workflow-ui";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
type Settings = {age:number;year:number;startsOn:string;endsOn:string;castellanoL2Applicable:boolean;religionApplicable:boolean};
async function requestSettings(init?:RequestInit) {
  const response=await apiFetch(`${localDatabaseApiUrl}/api/classroom/settings`,init);
  const value=await response.json() as Settings&{error?:string};
  if(!response.ok)throw Error(value.error??"No se pudo confirmar la configuración. Recarga para comprobarla.");
  return value;
}
export function ClassroomSettings({onSaved}:{onSaved:(dashboard:LocalDashboard)=>void}) {
  const [saved,setSaved]=useState<Settings|null>(null),[draft,setDraft]=useState<Settings|null>(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
  useUnsavedWork(Boolean(saved&&draft&&JSON.stringify(saved)!==JSON.stringify(draft)),busy);
  async function load(){if(busy)return;setBusy(true);setMessage("");try{const value=await requestSettings({cache:"no-store"});setSaved(value);setDraft(value);}catch(e){setMessage(e instanceof Error?e.message:"No se pudo cargar la configuración.");}finally{setBusy(false);}}
  async function save(){if(busy||!draft)return;setBusy(true);setMessage("");try{const value=await requestSettings({method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({expected:saved,settings:draft})});setSaved(value);setDraft(value);setMessage("Configuración del aula guardada.");try{onSaved(await loadLocalDashboard());}catch{setMessage("Configuración guardada. Recarga para actualizar los datos del aula.");}}catch(e){setMessage(e instanceof Error?e.message:"No se pudo guardar la configuración.");}finally{setBusy(false);}}
  const patch=(value:Partial<Settings>)=>setDraft(current=>current?{...current,...value}:current);
  return <details className="rounded-xl border bg-white p-5" onToggle={event=>{if(event.currentTarget.open&&!saved&&!busy)void load();}}>
    <summary className="min-h-11 cursor-pointer font-bold">Opciones curriculares del aula</summary>
    <p className="mt-2 text-sm text-muted-foreground">Revisa la edad, el año y las opciones curriculares. Para ajustar días de clase, abre Calendario. Las fechas oficiales MINEDU son de solo lectura. La edad y el año se protegen cuando el aula ya tiene niños o planificación.</p>
    {draft&&<div className="mt-4 space-y-4"><p className="text-sm">Edad: {draft.age} años · Año escolar: {draft.year}. El calendario oficial se conserva en Calendario.</p><label className="flex min-h-11 items-center gap-2 text-sm"><input disabled={busy} type="checkbox" checked={draft.castellanoL2Applicable} onChange={e=>patch({castellanoL2Applicable:e.target.checked})}/>Castellano como segunda lengua aplicable</label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input disabled={busy} type="checkbox" checked={draft.religionApplicable} onChange={e=>patch({religionApplicable:e.target.checked})}/>Educación religiosa aplicable</label>
      <AsyncButton busy={busy} disabled={JSON.stringify(saved)===JSON.stringify(draft)} busyLabel="Guardando…" onClick={()=>void save()}>Guardar configuración del aula</AsyncButton>
    </div>}
    {!draft&&<AsyncButton busy={busy} busyLabel="Cargando…" onClick={()=>void load()}>Cargar configuración del aula</AsyncButton>}
    {message&&<p role="status" className="mt-3 text-sm">{message}</p>}
  </details>;
}
