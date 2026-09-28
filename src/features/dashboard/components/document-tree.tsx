"use client";

import { useState } from "react";

export type TreeDocument = { id:string;kind:string;title:string;status:string;version?:number;
  school_year:number;classroom:string;classroom_id?:string;parent_experience_id?:string;
  period_label?:string|null };

const sectionName = (kind:string) => ({ diagnostic_summary:"Diagnóstico",annual_plan:"Plan anual",
  experience:"Proyectos y unidades",activity:"Actividades y talleres",family_report:"Evaluación por período",
  period_closure:"Cierres del período" }[kind] ?? "Otros documentos");
const order = ["diagnostic_summary","annual_plan","experience","activity","family_report","period_closure"];

export function DocumentTree({documents,stableIds,onOpen}:{documents:TreeDocument[];stableIds:Set<string>;
  onOpen:(document:TreeDocument)=>void}) {
  const [showDrafts,setShowDrafts]=useState(false);
  const visible=documents.filter(item=>showDrafts || item.status!=="draft");
  const groups=new Map<string,TreeDocument[]>();
  for(const item of visible) {
    const key=`${item.school_year}:${item.classroom_id??item.classroom}`;
    groups.set(key,[...(groups.get(key)??[]),item]);
  }
  const row=(item:TreeDocument)=><li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-3">
    <div><p className="font-semibold">{item.title}</p><p className="text-xs text-[#526b87]">{item.version?`Versión ${item.version} · `:""}{item.status==="draft"?"Borrador":item.status==="archived"?"Versión anterior":"Confirmado"}{item.period_label?` · ${item.period_label}`:""}{stableIds.has(item.id)?" · Word estable":""}</p></div>
    <button type="button" className="min-h-11 rounded-xl border px-4 font-semibold text-[#07576c]" onClick={()=>onOpen(item)}>Abrir</button></li>;
  return <div className="space-y-4"><label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={showDrafts} onChange={event=>setShowDrafts(event.target.checked)} />Mostrar borradores</label>
    {[...groups.entries()].sort((a,b)=>b[0].localeCompare(a[0])).map(([key,items])=><details key={key} open className="rounded-2xl border bg-[#f5f9fc] p-4">
      <summary className="cursor-pointer text-lg font-extrabold">Año escolar {items[0].school_year} · Aula {items[0].classroom}</summary>
      <div className="mt-3 space-y-3">{order.map(kind=>{const matching=items.filter(item=>item.kind===kind);
        if(!matching.length)return null;
        if(kind==="experience") return <details key={kind} open className="rounded-xl border bg-white/70 p-3"><summary className="cursor-pointer font-bold">{sectionName(kind)} · {matching.length}</summary>
          <div className="mt-2 space-y-3">{matching.map(parent=>{const children=items.filter(item=>item.kind==="activity" && item.parent_experience_id===parent.id);
            return <section key={parent.id} className="space-y-2"><ul>{row(parent)}</ul>{children.length>0&&<div className="ml-3 border-l-2 border-[#d6e5ef] pl-3"><p className="mb-2 text-sm font-semibold">Actividades · {children.length}</p><ul className="space-y-2">{children.map(row)}</ul></div>}</section>;})}</div></details>;
        if(kind==="activity") {
          const ungrouped=matching.filter(item=>!items.some(parent=>parent.kind==="experience" && parent.id===item.parent_experience_id));
          return ungrouped.length?<details key={kind} open className="rounded-xl border bg-white/70 p-3"><summary className="cursor-pointer font-bold">{sectionName(kind)} · {ungrouped.length}</summary>
            <ul className="mt-2 space-y-2">{ungrouped.map(row)}</ul></details>:null;
        }
        return <details key={kind} open className="rounded-xl border bg-white/70 p-3"><summary className="cursor-pointer font-bold">{sectionName(kind)} · {matching.length}</summary>
          <ul className="mt-2 space-y-2">{matching.map(row)}</ul></details>;
      })}</div></details>)}
  </div>;
}
