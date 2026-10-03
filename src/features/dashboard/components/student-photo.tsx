"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { Button } from "@/components/ui/button";
import { preparePrivateMedia } from "./media-attachment-input";

export function StudentPhoto({ id, name, revision=0 }: {id:string;name:string;revision?:number}) {
  const [photo,setPhoto]=useState({identity:"",url:""});
  const identity=`${id}:${revision}`,url=photo.identity===identity?photo.url:"";
  useEffect(()=>{let live=true,objectUrl=""; apiFetch(`${localDatabaseApiUrl}/api/students/${id}/photo`,{cache:"no-store"}).then(async r=>{if(!r.ok)return;objectUrl=URL.createObjectURL(await r.blob());if(live)setPhoto({identity:`${id}:${revision}`,url:objectUrl});else URL.revokeObjectURL(objectUrl);}).catch(()=>{});return()=>{live=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[id,revision]);
  return <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#e3f2f5] text-base font-bold text-[#075d70]">{url?<Image src={url} alt="" width={48} height={48} unoptimized className="size-full object-cover" />:name.split(/\s+/).slice(0,2).map(n=>n[0]).join("")}</span>;
}
export function StudentPhotoEditor({id,name}:{id:string;name:string}) {
  const [revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[removing,setRemoving]=useState(false);
  async function update(file?:File) {setBusy(true);setMessage("");try{const media=file?await preparePrivateMedia(file):undefined;const r=await apiFetch(`${localDatabaseApiUrl}/api/students/${id}/photo`,{method:file?"PUT":"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({media})});if(!r.ok)throw new Error((await r.json() as {error:string}).error);setRemoving(false);setRevision(v=>v+1);setMessage(file?"Foto privada actualizada.":"Foto retirada.");}catch(e){setMessage(e instanceof Error?e.message:"No se pudo cambiar la foto.");}finally{setBusy(false);}}
  return <div className="mt-4 flex flex-wrap items-center gap-3"><StudentPhoto key={revision} id={id} name={name} revision={revision}/>{[false,true].map(camera=><label key={String(camera)} className={`inline-flex min-h-11 cursor-pointer items-center rounded-xl border bg-white px-3 text-sm font-semibold ${busy?"pointer-events-none opacity-50":""}`}>{camera?"Tomar foto":"Subir / cambiar foto"}<input aria-label={camera?"Tomar foto del alumno":"Subir foto del alumno"} type="file" accept="image/jpeg,image/png,image/webp" capture={camera?"user":undefined} disabled={busy} className="sr-only" onChange={e=>{if(e.target.files?.[0])void update(e.target.files[0]);e.target.value="";}}/></label>)}<Button variant="ghost" disabled={busy} onClick={()=>{if(removing)void update();else setRemoving(true);}}>{removing?"Confirmar eliminación de foto":"Eliminar foto"}</Button>{removing&&<Button variant="ghost" disabled={busy} onClick={()=>setRemoving(false)}>Cancelar</Button>}<p role="status" className="w-full text-sm">{message}</p></div>;
}
