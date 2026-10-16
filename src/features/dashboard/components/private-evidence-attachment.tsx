"use client";

import {useEffect,useState} from 'react';
import Image from 'next/image';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {apiFetch} from '@/src/lib/ayni-api-fetch';
import {localDatabaseApiUrl} from '@/src/lib/local-database';

/** Reuses authenticated storage reads; never exposes a private storage URL. */
export function PrivateEvidenceAttachment({path,compactPreview=false}:{path:string;compactPreview?:boolean}){
  const [attempt,setAttempt]=useState(0);
  const [open,setOpen]=useState(compactPreview),[source,setSource]=useState(''),[error,setError]=useState('');
  useEffect(()=>{
    if(!open)return;let live=true,objectUrl='';const controller=new AbortController();
    void apiFetch(localDatabaseApiUrl+path,{cache:'no-store',signal:controller.signal}).then(async response=>{
      if(!response.ok)throw Error('No pudimos abrir la evidencia. Puedes volver a intentarlo.');
      objectUrl=URL.createObjectURL(await response.blob());if(live)setSource(objectUrl);else URL.revokeObjectURL(objectUrl);
    }).catch(cause=>{if(live)setError((cause as Error).message);});
    return()=>{live=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[open,path,attempt]);
  const [expanded,setExpanded]=useState(false);
  if(compactPreview)return <div className="min-w-0">{error?<p role="alert" className="text-sm">{error} <Button variant="outline" className="mt-2" onClick={()=>{setError('');setAttempt(value=>value+1);}}>Reintentar evidencia</Button></p>:source?<Image unoptimized src={source} alt="Fotografía privada de la observación" width={800} height={600} className="h-auto max-h-40 w-full rounded-xl bg-[#edf9fa] object-contain"/>:<p role="status" className="rounded-xl bg-[#edf5fa] p-3 text-sm">Abriendo evidencia privada…</p>}{source&&<Button variant="outline" className="mt-2 min-h-11 w-full whitespace-normal text-xs" onClick={()=>setExpanded(true)}>Ampliar imagen</Button>}<Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>Evidencia de la observación</DialogTitle></DialogHeader>{source&&<Image unoptimized src={source} alt="Fotografía privada de la observación ampliada" width={800} height={600} className="max-h-[75vh] w-full rounded-xl object-contain"/>}</DialogContent></Dialog></div>;
  return <div className="mt-3"><Button type="button" variant="outline" aria-expanded={open} onClick={()=>{setSource('');setError('');setOpen(!open);}}>{open?'Cerrar evidencia adjunta':'Abrir evidencia adjunta'}</Button>{open&&(error?<p role="alert" className="mt-2 text-sm">{error}</p>:source?<Image unoptimized src={source} alt="Fotografía privada de la observación" width={800} height={600} className="mt-2 h-auto max-h-96 w-auto max-w-full rounded-xl object-contain"/>:<p role="status" className="mt-2 text-sm">Abriendo evidencia privada…</p>)}</div>;
}
