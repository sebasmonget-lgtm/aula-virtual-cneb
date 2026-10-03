"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { coverageLabel } from "@/src/lib/observation-coverage.mjs";
import type { DiagnosticWorkspace } from "@/src/lib/local-database";
import { displayPersonName } from "@/src/lib/person-name.mjs";

export function ObservationCoverageMatrix({ data, counts, unclassified, competencies, onRecord, onGuided, onContinue, onBack }: {
  data: DiagnosticWorkspace; counts: Record<string,number>; unclassified:number; competencies: {id:string;name:string}[];
  onRecord: (studentId:string,competencyId:string)=>void; onGuided:(studentId:string,experienceId:string)=>void;
  onContinue:()=>void; onBack:()=>void;
}) {
  const [cell,setCell]=useState<{studentId:string;competencyId:string}|null>(null);
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:"start"});},[]);
  const student=data.students.find(s=>s.id===cell?.studentId), competency=competencies.find(c=>c.id===cell?.competencyId);
  const guides=data.experiences.filter(e=>e.competencies.some(c=>c.id===cell?.competencyId));
  return <section className="diagnostic-panel space-y-5 p-5 md:p-7">
    <div className="flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={onBack}>Volver a observar</Button><Button onClick={onContinue}>Continuar de todas formas →</Button></div>
    <div><h2 ref={heading} tabIndex={-1} className="scroll-mt-28 text-xl font-bold text-[#172b52]">¿Quieres conocer algo más antes de continuar?</h2>
      <p className="mt-2 text-[#526b87]">Cada celda cuenta observaciones relacionadas con una competencia por ti. Puedes registrar algo más o continuar ahora.</p>
      <p className="mt-2 text-sm">Sin registros significa que todavía tenemos poca información registrada. No significa dificultad ni que esa competencia no se haya trabajado.</p></div>
    <p className="text-sm text-[#526b87]">Sin registros · Pocos registros: uno · Hay registros: dos o más. Son cantidades, no calificaciones ni una medida de información suficiente.</p>
    <div className="overflow-x-auto rounded-xl border border-[#d6e5ef]" tabIndex={0} role="region" aria-label="Observaciones por niño y competencia">
      <table className="w-full border-collapse text-sm"><caption className="sr-only">Niños y niñas × competencias. Selecciona una celda para registrar o probar una experiencia.</caption>
        <thead><tr><th scope="col" className="sticky left-0 z-10 min-w-36 border-b bg-white p-3 text-left">Niño o niña</th>{competencies.map(c=><th key={c.id} scope="col" className="min-w-44 border-b bg-[#f3f7fa] p-3 text-left font-semibold">{c.name}</th>)}</tr></thead>
        <tbody>{data.students.map(s=><tr key={s.id}><th scope="row" className="sticky left-0 z-10 border-b bg-white p-3 text-left">{displayPersonName(s.name)}</th>{competencies.map(c=>{
          const count=counts[`${s.id}:${c.id}`]??0;
          return <td key={c.id} className="border-b p-1.5"><button type="button" aria-label={`${displayPersonName(s.name)}, ${c.name}: ${coverageLabel(count)}`} onClick={()=>setCell({studentId:s.id,competencyId:c.id})}
            className={`min-h-12 w-full rounded-lg px-3 text-left focus-visible:outline-2 focus-visible:outline-[#087d96] ${count===0?"bg-[#f6f8fa] text-[#61718e]":count===1?"bg-[#edf3f9] text-[#405c7e]":"bg-[#dce9f2] text-[#173b58]"}`}>{coverageLabel(count)}</button></td>;
        })}</tr>)}</tbody>
      </table>
    </div>
    {cell && student && competency && <div className="rounded-xl border border-[#c9dce9] bg-[#edf5fa] p-4" role="region" aria-label="Acciones para esta observación">
      <h3 className="font-bold">{displayPersonName(student.name)} · {competency.name}</h3><p className="mt-2 text-sm">Puedes anotar una actuación y decidir después con qué competencia se relaciona.</p>
      <div className="mt-3 flex flex-wrap gap-3"><Button onClick={()=>onRecord(student.id,competency.id)}>Registrar observación</Button>{guides.map(e=><Button key={e.id} variant="outline" onClick={()=>onGuided(student.id,e.id)}>Probar una experiencia guiada: {e.title}</Button>)}<Button variant="ghost" onClick={()=>setCell(null)}>Cerrar</Button></div>
    </div>}
    {unclassified>0 && <p className="text-sm text-[#526b87]">También conservamos {unclassified} observaciones libres sin competencia elegida. Puedes continuar con ellas; no se cuentan en una celda hasta que decidas su relación.</p>}
    <Button onClick={onContinue}>Continuar de todas formas →</Button>
  </section>;
}
