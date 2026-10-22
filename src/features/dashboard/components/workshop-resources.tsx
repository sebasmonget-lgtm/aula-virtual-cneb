"use client";
import {Download} from 'lucide-react';
import {localDatabaseApiUrl} from '@/src/lib/local-database';
import {hasWorkshopPrintMaterial,curatedWorkshopSheets} from '@/src/lib/workshop-print-material.mjs';
export function WorkshopResources({resources,workshopId,age}:{resources:unknown;workshopId?:string;age?:number}){
  if(workshopId&&/^[a-z0-9-]+$/.test(workshopId)){
    const sheets=curatedWorkshopSheets(workshopId,age);
    if(!hasWorkshopPrintMaterial({resources,workshopId,age}))return null;
    const linkClass="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#9bb6c9] bg-white px-3 py-2 text-left text-sm font-semibold text-[#07576c]";
    return <div className="mt-3 space-y-3">
      <a download href={`${localDatabaseApiUrl}/api/workshop-print/${workshopId}/pdf`} className={linkClass}><Download size={18} className="shrink-0"/>{sheets.length>1?'Todos los materiales · PDF':'Material para imprimir · PDF'}</a>
      {sheets.length>0&&<div className="space-y-2 rounded-xl border border-[#b8ccde] bg-white/80 p-3"><p className="text-sm font-semibold text-[#234b63]">Fichas MINEDU · {age} años{sheets.length>1?' · Puedes elegir una':''}</p><ul className="space-y-2">{sheets.map(sheet=><li key={sheet.id}><a download href={`${localDatabaseApiUrl}/api/workshop-print/${workshopId}/pdf?sheetId=${encodeURIComponent(sheet.id)}`} className={linkClass}><Download size={17} className="shrink-0"/>{sheet.title}<span className="shrink-0 text-xs">PDF</span></a><p className="mt-2 text-sm leading-relaxed text-[#345372]">{sheet.classroom_use}</p></li>)}</ul></div>}
    </div>;
  }
  if(!Array.isArray(resources))return null;
  const items=resources.filter((r):r is {id:string;title:string;url:string}=>r&&typeof r.title==='string'&&typeof r.url==='string'&&(/^\/workshops\/[a-z0-9-]+\.png$/.test(r.url)||/^\/api\/library\/resources\/[a-z0-9-]+\/download$/.test(r.url)));
  return items.length?<div className="mt-3 flex flex-wrap gap-3">{items.map(r=><a key={r.id} download href={r.url.startsWith('/workshops/')?`${localDatabaseApiUrl}/api/workshop-print/${r.id}/pdf`:localDatabaseApiUrl+r.url} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#9bb6c9] bg-white px-3 text-sm font-semibold text-[#07576c]"><Download size={18}/>{r.title}</a>)}</div>:null;
}
