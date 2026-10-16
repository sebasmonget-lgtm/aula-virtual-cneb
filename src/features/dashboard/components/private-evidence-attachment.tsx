"use client";

import {useEffect,useState} from 'react';
import Image from 'next/image';
import {Button} from '@/components/ui/button';
import {apiFetch} from '@/src/lib/ayni-api-fetch';
import {localDatabaseApiUrl} from '@/src/lib/local-database';

/** Reuses authenticated storage reads; never exposes a private storage URL. */
export function PrivateEvidenceAttachment({path}:{path:string}){
  const [open,setOpen]=useState(false),[source,setSource]=useState(''),[error,setError]=useState('');
  useEffect(()=>{
    if(!open)return;let live=true,objectUrl='';const controller=new AbortController();
    void apiFetch(localDatabaseApiUrl+path,{cache:'no-store',signal:controller.signal}).then(async response=>{
      if(!response.ok)throw Error('No pudimos abrir la evidencia. Puedes volver a intentarlo.');
      objectUrl=URL.createObjectURL(await response.blob());if(live)setSource(objectUrl);else URL.revokeObjectURL(objectUrl);
    }).catch(cause=>{if(live)setError((cause as Error).message);});
    return()=>{live=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[open,path]);
  return <div className="mt-3"><Button type="button" variant="outline" aria-expanded={open} onClick={()=>{setSource('');setError('');setOpen(!open);}}>{open?'Cerrar evidencia adjunta':'Abrir evidencia adjunta'}</Button>{open&&(error?<p role="alert" className="mt-2 text-sm">{error}</p>:source?<Image unoptimized src={source} alt="Fotografía privada de la observación" width={800} height={600} className="mt-2 h-auto max-h-96 w-auto max-w-full rounded-xl object-contain"/>:<p role="status" className="mt-2 text-sm">Abriendo evidencia privada…</p>)}</div>;
}
