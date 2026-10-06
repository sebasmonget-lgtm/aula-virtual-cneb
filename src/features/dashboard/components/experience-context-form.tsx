"use client";
import { Button } from "@/components/ui/button";

export type ExperienceContextInput = { contextItems: { text: string; source_turn?: number }[];
  historicalProjects: { title: string; competency_ids: string[]; period?: number | null }[] };

export function ExperienceContextForm({ value, onChange, curriculum, today, disabled }: {
  value: ExperienceContextInput; onChange: (next: ExperienceContextInput) => void;
  curriculum: { id: string; name: string }[]; today: string; disabled: boolean;
}) {
  const updateHistory = (index: number, changes: Partial<ExperienceContextInput["historicalProjects"][number]>) =>
    onChange({ ...value, historicalProjects: value.historicalProjects.map((item,i)=>i===index?{...item,...changes}:item) });
  return <section className="space-y-6 rounded-xl bg-white p-5" aria-label="Contexto e historia del año">
    <div><h2 className="text-xl font-bold text-[#172b52]">Lo que Ayni tendrá en cuenta</h2>
      <p className="mt-2 text-sm text-[#526b87]">Son tus decisiones sobre espacios, recursos, eventos o ideas. Puedes corregirlas o quitarlas antes de crear Mi año.</p>
      <div className="mt-3 space-y-3">{value.contextItems.map((item,index)=><div key={index} className="flex items-start gap-2">
        <label className="flex-1 text-sm"><span className="sr-only">Elemento de contexto {index+1}</span>
          <textarea className="min-h-16 w-full rounded-lg border border-[#b9ccd5] p-3" value={item.text} maxLength={500} disabled={disabled}
            onChange={e=>onChange({...value,contextItems:value.contextItems.map((current,i)=>i===index?{...current,text:e.target.value}:current)})}/></label>
        <Button variant="ghost" disabled={disabled} aria-label={`Quitar elemento de contexto ${index+1}`} onClick={()=>onChange({...value,contextItems:value.contextItems.filter((_,i)=>i!==index)})}>Quitar</Button>
      </div>)}</div>
      <Button className="mt-3" variant="outline" disabled={disabled||value.contextItems.length>=20} onClick={()=>onChange({...value,contextItems:[...value.contextItems,{text:""}]})}>Agregar una idea o recurso</Button>
    </div>
    {today.slice(5)>"03-16" && <div><h2 className="text-xl font-bold text-[#172b52]">Lo que ya trabajaste este año</h2>
      <p className="mt-2 text-sm text-[#526b87]">Puedes mencionar animales, familia, plantas o Fiestas Patrias. Basta el nombre; las competencias y el período son opcionales. También puedes continuar sin registrar proyectos anteriores.</p>
      <div className="mt-4 space-y-5">{value.historicalProjects.map((item,index)=><fieldset key={index} disabled={disabled} className="space-y-3 border-b border-[#d6e5ef] pb-4">
        <legend className="sr-only">Proyecto anterior {index+1}</legend>
        <label className="block text-sm font-semibold">Nombre del proyecto o unidad<input className="mt-1 min-h-11 w-full rounded-lg border border-[#b9ccd5] px-3 font-normal" maxLength={180} value={item.title} onChange={e=>updateHistory(index,{title:e.target.value})}/></label>
        <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-[#07576c]">Agregar período o competencias, si las conoces</summary>
          <label className="block text-sm">Período<select className="ml-2 min-h-11 rounded-lg border px-2" value={item.period??""} onChange={e=>updateHistory(index,{period:e.target.value?Number(e.target.value):null})}><option value="">No precisado</option>{[1,2,3,4].map(p=><option key={p} value={p}>Bimestre {p}</option>)}</select></label>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{curriculum.map(card=><label key={card.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={item.competency_ids.includes(card.id)} onChange={e=>updateHistory(index,{competency_ids:e.target.checked?[...item.competency_ids,card.id]:item.competency_ids.filter(id=>id!==card.id)})}/>{card.name}</label>)}</div>
        </details>
        <Button variant="ghost" onClick={()=>onChange({...value,historicalProjects:value.historicalProjects.filter((_,i)=>i!==index)})}>Quitar registro anterior</Button>
      </fieldset>)}</div>
      <Button variant="outline" className="mt-3" disabled={disabled||value.historicalProjects.length>=20} onClick={()=>onChange({...value,historicalProjects:[...value.historicalProjects,{title:"",competency_ids:[]}]})}>Agregar proyecto anterior</Button>
      <p className="mt-3 text-sm text-[#526b87]">Se conservará como historia declarada. Ayni preparará únicamente los días disponibles desde {today}, sin crear actividades ni evidencias del pasado.</p>
    </div>}
  </section>;
}
