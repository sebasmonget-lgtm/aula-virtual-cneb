"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { syncDocumentArtifacts } from "@/src/lib/document-sync-client.mjs";
import { Button } from "@/components/ui/button";
import { WorkflowFeedback } from "./workflow-ui";

export type SyncArtifact = { id:string;source_kind:string;source_id:string;filename:string;
  sha256:string;byte_length:number;version:number;school_year:number;classroom:string;classroom_id:string };
type SyncResult = {written:string[];skipped:string[];conflicts:{id:string;path:string}[];
  copies:{id:string;path:string}[]};

async function savedHandle():Promise<FileSystemDirectoryHandle|null> {
  if(!("indexedDB" in window))return null;
  return new Promise(resolve=>{
    const open=indexedDB.open("ayni-document-sync",1);
    open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains("handles"))open.result.createObjectStore("handles");};
    open.onerror=()=>resolve(null);
    open.onsuccess=()=>{
      const tx=open.result.transaction("handles","readonly"),request=tx.objectStore("handles").get("last");
      request.onsuccess=()=>resolve(request.result??null);request.onerror=()=>resolve(null);
    };
  });
}
async function rememberHandle(handle:FileSystemDirectoryHandle) {
  if(!("indexedDB" in window))return;
  await new Promise<void>(resolve=>{
    const open=indexedDB.open("ayni-document-sync",1);
    open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains("handles"))open.result.createObjectStore("handles");};
    open.onerror=()=>resolve();
    open.onsuccess=()=>{const tx=open.result.transaction("handles","readwrite");
      tx.objectStore("handles").put(handle,"last");tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();};
  });
}

export function DocumentSyncPanel({artifacts}:{artifacts:SyncArtifact[]}) {
  const [selected,setSelected]=useState<string[]>([]);
  const [handle,setHandle]=useState<FileSystemDirectoryHandle|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [result,setResult]=useState<SyncResult|null>(null);
  const [progress,setProgress]=useState("");
  const [pickerAvailable,setPickerAvailable]=useState(false);
  useEffect(()=>{void Promise.resolve().then(()=>setPickerAvailable("showDirectoryPicker" in window));
    void savedHandle().then(setHandle);},[]);
  const chosen=artifacts.filter(item=>selected.includes(item.id));
  async function downloadOne(artifact:SyncArtifact) {
    const response=await apiFetch(`${localDatabaseApiUrl}/api/documents/artifacts/${artifact.id}/download`,{cache:"no-store"});
    if(!response.ok)throw new Error("No se pudo descargar un documento. Reintenta sin borrar archivos locales.");
    return new Uint8Array(await response.arrayBuffer());
  }
  async function sync(copyConflicts=false) {
    if(!chosen.length)return;
    setBusy(true);setError("");setMessage("");setProgress("");
    try {
      let directory=handle;
      if(!directory){
        const picker=window as Window & {showDirectoryPicker?:()=>Promise<FileSystemDirectoryHandle>};
        if(!picker.showDirectoryPicker)throw new Error("Este navegador no permite elegir carpeta. Usa el ZIP.");
        directory=await picker.showDirectoryPicker();setHandle(directory);await rememberHandle(directory);
      }
      const summary=await syncDocumentArtifacts(directory,chosen,downloadOne,{copyConflicts,
        onProgress:({status}:{status:string})=>setProgress(status==="written"?"Guardando documentos…":status==="conflict"?"Revisando conflicto…":"Verificando archivos…")}) as SyncResult;
      setResult(summary);
      setMessage(`${summary.written.length} nuevos · ${summary.skipped.length} sin cambios · ${summary.conflicts.length} conflictos${summary.copies.length?` · ${summary.copies.length} copias nuevas`:""}.`);
    }catch(cause){setError(cause instanceof Error?cause.message:"No se pudo sincronizar.");}
    finally{setBusy(false);setProgress("");}
  }
  async function downloadZip() {
    if(!chosen.length)return;
    setBusy(true);setError("");setMessage("");
    try {
      const response=await apiFetch(`${localDatabaseApiUrl}/api/documents/artifacts/zip`,{method:"POST",
        headers:{"content-type":"application/json"},body:JSON.stringify({artifactIds:chosen.map(item=>item.id)})});
      if(!response.ok)throw new Error("No se pudo preparar el ZIP seleccionado.");
      const url=URL.createObjectURL(await response.blob()),link=document.createElement("a");
      link.href=url;link.download="ayni-documentos.zip";document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60000);
      setMessage("ZIP descargado. No se modificó ningún archivo de tu carpeta.");
    }catch(cause){setError(cause instanceof Error?cause.message:"No se pudo descargar el ZIP.");}
    finally{setBusy(false);}
  }
  if(!artifacts.length)return <section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-extrabold">Sincronizar con mi laptop</h2>
    <p className="mt-1 text-sm text-[#526b87]">Prepara primero una versión estable de un plan o proyecto confirmado.</p></section>;
  return <section className="space-y-3 rounded-2xl border bg-[#f5f9fc] p-5"><h2 className="text-lg font-extrabold">Sincronizar con mi laptop</h2>
    <p className="text-sm text-[#526b87]">Elige los documentos confirmados. No se borrarán ni sobrescribirán archivos editados en tu equipo.</p>
    <div className="space-y-2">{artifacts.map(item=><label key={item.id} className="flex min-h-11 items-center gap-3 rounded-xl bg-white p-2 text-sm">
      <input type="checkbox" checked={selected.includes(item.id)} onChange={event=>setSelected(current=>event.target.checked?[...current,item.id]:current.filter(id=>id!==item.id))} />
      <span>{item.source_kind==="annual_plan"?"Plan anual":"Proyecto o unidad"} · {item.school_year} · {item.classroom} · V{item.version}</span></label>)}</div>
    <div className="flex flex-wrap gap-2">{pickerAvailable&&<Button disabled={busy||!chosen.length} onClick={()=>void sync()}>{busy?"Sincronizando…":handle?"Sincronizar carpeta anterior":"Elegir carpeta y sincronizar"}</Button>}
      <Button variant="outline" disabled={busy||!chosen.length} onClick={()=>void downloadZip()}>Descargar ZIP</Button>
      {handle&&<button type="button" className="min-h-11 px-2 text-sm font-semibold text-[#07576c]" onClick={()=>setHandle(null)}>Elegir otra carpeta</button>}</div>
    {progress&&<p role="status" className="text-sm">{progress}</p>}
    {message&&<WorkflowFeedback tone="success">{message}</WorkflowFeedback>}
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {result?.conflicts.length? <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm"><p className="font-semibold">Archivos locales editados: {result.conflicts.length}. Se conservaron intactos.</p>
      <Button variant="outline" className="mt-2" disabled={busy} onClick={()=>void sync(true)}>Guardar copias versionadas</Button></div>:null}
  </section>;
}
