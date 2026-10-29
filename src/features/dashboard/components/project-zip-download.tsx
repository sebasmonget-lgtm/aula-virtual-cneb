'use client';
import {useState} from 'react';
import {Download} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {apiFetch} from '@/src/lib/ayni-api-fetch';
import {downloadNameFromDisposition} from '@/src/lib/document-download-name.mjs';

export function ProjectZipDownload({url}:{url:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function download(){
  if(busy)return;setBusy(true);setError('');
  try{
   const response=await apiFetch(url,{cache:'no-store'});
   if(!response.ok){const result=await response.json() as {error?:string};throw new Error(result.error??'No pudimos preparar el ZIP. Intenta de nuevo.');}
   const blob=await response.blob(),href=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=href;link.download=downloadNameFromDisposition(response.headers.get('content-disposition'),'Proyecto y actividades.zip');
   document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(href),60000);
  }catch(cause){setError(cause instanceof Error?cause.message:'No pudimos descargar el ZIP. Intenta de nuevo.');}finally{setBusy(false);}
 }
 return <div className="max-w-full space-y-2"><Button variant="outline" disabled={busy} aria-busy={busy} onClick={()=>void download()} className="min-h-11 max-w-full whitespace-normal"><Download aria-hidden="true"/>{busy?'Preparando ZIP…':'Descargar todo (ZIP)'}</Button>{error&&<p role="alert" className="max-w-sm text-sm text-red-800">{error}</p>}</div>;
}
