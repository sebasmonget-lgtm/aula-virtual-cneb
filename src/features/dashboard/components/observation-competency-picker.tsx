"use client";
import {useState} from 'react';
import Image from 'next/image';
import {competencyVisual} from '@/src/lib/competency-presentation';

export type ObservationCompetency={id:string;name:string};
/** Shared capture control: selecting a competency is always a teacher decision. */
export function ObservationCompetencyPicker({items,selected,onChange,disabled,compact=false}:{items:ObservationCompetency[];selected:string[];onChange:(ids:string[])=>void;disabled:boolean;compact?:boolean}){
 const [query,setQuery]=useState('');
 return <fieldset disabled={disabled} className="space-y-3" aria-label="Elige hasta dos competencias (opcional)"><legend className={compact?'sr-only':'font-semibold'}>Elige hasta dos competencias (opcional)</legend><label className="block text-sm"><span className={compact?'sr-only':undefined}>Buscar competencia</span><input aria-label="Buscar competencia" placeholder="Buscar competencia…" type="search" value={query} onChange={event=>setQuery(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3"/></label><div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">{items.filter(item=>item.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))).map(item=>{const visual=competencyVisual(item.id);return <label key={item.id} className="flex min-h-14 items-center gap-3 rounded-xl border p-3 text-sm" style={{background:visual?.background??'white',color:visual?.foreground??'#172b52',borderColor:selected.includes(item.id)?'#087d96':'#d6e5ef'}}><input type="checkbox" checked={selected.includes(item.id)} disabled={!selected.includes(item.id)&&selected.length>=2} onChange={event=>onChange(event.target.checked?[...selected,item.id]:selected.filter(id=>id!==item.id))}/>{visual&&<Image src={visual.image} alt="" width={28} height={28} unoptimized className="shrink-0"/>}<span className="min-w-0 break-words">{item.name}</span></label>;})}</div></fieldset>;
}
