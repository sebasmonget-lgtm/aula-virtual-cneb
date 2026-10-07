"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { displayDate } from "@/src/lib/display-date";
import { AsyncButton, WorkflowFeedback } from "./workflow-ui";

export function PastActivityReview({ items, onSaved }: { items: {id:string;title:string;date:string}[]; onSaved:()=>Promise<void> }) {
  const [selected,setSelected]=useState<string|null>(null),[note,setNote]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function save(action:"complete"|"skip") {
    if(busy||!selected)return;setBusy(true);setError("");
    try { const response=await apiFetch(`${localDatabaseApiUrl}/api/today/review-past`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scheduleEntryId:selected,action,closureNote:note})});
      if(!response.ok)throw new Error();await onSaved();setSelected(null);setNote("");
    }catch{setError("No pudimos guardar la revisión. Recarga Hoy y vuelve a intentarlo.");}finally{setBusy(false);}
  }
  if(!items.length)return null;
  return <details className="rounded-2xl border border-[#e7d7b7] bg-[#fff8ec] p-5"><summary className="min-h-11 cursor-pointer font-bold text-[#805819]">Actividades anteriores por revisar · {items.length}</summary>
    <p className="mt-2 text-sm text-[#805819]">Su fecha ya pasó. Ayni conserva lo previsto y tus registros; tú indicas qué ocurrió.</p>
    <ul className="mt-4 space-y-3">{items.map(item=><li key={item.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><b>{item.title}</b><p className="text-sm">{displayDate(item.date)} · Fecha transcurrida, pendiente de revisar</p></div><Button variant="outline" disabled={busy} onClick={()=>{setSelected(item.id);setNote("");}}>Revisar</Button></div>
      {selected===item.id&&<div className="mt-3 space-y-3"><label className="block font-semibold">Nota opcional<Textarea className="mt-2" maxLength={800} value={note} onChange={event=>setNote(event.target.value)}/></label><div className="flex flex-wrap gap-3"><AsyncButton busy={busy} busyLabel="Guardando…" onClick={()=>void save("complete")}>Se realizó</AsyncButton><Button variant="outline" disabled={busy} onClick={()=>void save("skip")}>No se realizó</Button></div></div>}
    </li>)}</ul>{error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
  </details>;
}
