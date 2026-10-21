"use client";
import {Textarea} from '@/components/ui/textarea';
import type {DiagnosticCompetencyReading} from '@/src/lib/local-database';

export function DiagnosticCompetencyReadings({readings,coverage,disabled,onChange}:{readings?:DiagnosticCompetencyReading[];coverage:{competency_id:string;competency_name:string}[];disabled:boolean;onChange:(readings:DiagnosticCompetencyReading[])=>void}){
  if(!readings?.length)return null;
  return <details className="rounded-xl border border-[var(--ayni-panel-border)] p-4">
    <summary className="cursor-pointer font-bold">Lo observado por competencias · {readings.length}</summary>
    <p className="mt-3 text-sm text-[#526b87]">Revisa qué nos dicen los registros y qué haremos después. Puedes corregirlo antes de confirmar.</p>
    <div className="mt-4 space-y-5">{readings.map((reading,index)=><section key={reading.competency_id} className="space-y-3 border-t border-[var(--ayni-panel-border)] pt-4">
      <h3 className="font-bold">{coverage.find(item=>item.competency_id===reading.competency_id)?.competency_name??reading.competency_id}</h3>
      {(['summary','next_step'] as const).map(field=><label key={field} className="block text-sm font-semibold">{field==='summary'?'Qué nos muestran los registros':'Qué haremos después'}<Textarea className="mt-2 font-normal leading-relaxed" maxLength={field==='summary'?700:400} value={reading[field]} disabled={disabled} onChange={event=>onChange(readings.map((item,i)=>i===index?{...item,[field]:event.target.value}:item))}/></label>)}
      <p className="text-xs text-[#526b87]">{reading.source_record_ids.length} registros de respaldo. Esta lectura no asigna un nivel.</p>
    </section>)}</div>
  </details>;
}
