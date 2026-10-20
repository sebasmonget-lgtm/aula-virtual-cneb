"use client";
import {Download} from 'lucide-react';
import {localDatabaseApiUrl} from '@/src/lib/local-database';
import {hasWorkshopPrintMaterial} from '@/src/lib/workshop-print-material.mjs';
export function WorkshopResources({resources,workshopId,age}:{resources:unknown;workshopId?:string;age?:number}){
  if(workshopId&&/^[a-z0-9-]+$/.test(workshopId))return hasWorkshopPrintMaterial({resources,workshopId,age})?<a download href={`${localDatabaseApiUrl}/api/workshop-print/${workshopId}/pdf`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#9bb6c9] bg-white px-3 text-sm font-semibold text-[#07576c]"><Download size={18}/>Material para imprimir · PDF</a>:null;
  if(!Array.isArray(resources))return null;
  const items=resources.filter((r):r is {id:string;title:string;url:string}=>r&&typeof r.title==='string'&&typeof r.url==='string'&&(/^\/workshops\/[a-z0-9-]+\.png$/.test(r.url)||/^\/api\/library\/resources\/[a-z0-9-]+\/download$/.test(r.url)));
  return items.length?<div className="mt-3 flex flex-wrap gap-3">{items.map(r=><a key={r.id} download href={r.url.startsWith('/workshops/')?`${localDatabaseApiUrl}/api/workshop-print/${r.id}/pdf`:localDatabaseApiUrl+r.url} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#9bb6c9] bg-white px-3 text-sm font-semibold text-[#07576c]"><Download size={18}/>{r.title}</a>)}</div>:null;
}
