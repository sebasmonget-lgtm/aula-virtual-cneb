"use client";
import {presentMaterials} from "@/src/lib/annual-proposal-intent.mjs";
import Image from "next/image";
import {ArrowRight, Sparkles, CalendarDays, Clock} from "lucide-react";
import {Button} from "@/components/ui/button";
import {competencyVisual, competencyLabel} from "@/src/lib/competency-presentation";
import {annualDisplayTitle} from "@/src/lib/annual-year-editor.mjs";
import {ProjectPictogram} from "./project-pictogram";
import styles from "./annual-plan.module.css";

type Row={proposal_id:string;title:string;purpose:string;period:string;duration_weeks:number;primary_competency_ids:string[];
 planned_start_date?:string;planned_end_date?:string;planned_instructional_days?:number;teacher_protected?:boolean;children_actions?:string[];materials?:string[];expected_product?:string};
const date=(value?:string)=>value?new Intl.DateTimeFormat("es-PE",{day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(value+"T00:00:00Z")):"";
export function AnnualCompetencies({ids,names}:{ids:string[];names:Map<string,string>}){
 return <ul className={styles.competencies}>{[...new Set(ids)].map(id=>{const visual=competencyVisual(id);return <li key={id} style={visual?{color:visual.foreground,background:visual.background}:undefined}>{visual&&<Image src={visual.image} alt="" width={24} height={24} unoptimized/>}<span title={names.get(id)??id}>{competencyLabel(id,names.get(id)??id)}</span></li>;})}</ul>;
}
export function AnnualProjectPreview({row,index,names,onPrepare,onChange,canChange,disabled,prepareLabel="Preparar proyecto"}:{row:Row;index:number;names:Map<string,string>;onPrepare?:()=>void;onChange:()=>void;canChange:boolean;disabled:boolean;prepareLabel?:string}){
 return <article className={styles.preview} aria-label={`Proyecto ${index}: ${annualDisplayTitle(row.title)}`}>
  <ProjectPictogram project={row} className={styles.projectImage}/>
  <div className={styles.previewContent}><h2>{index} · {annualDisplayTitle(row.title)}</h2>
   <div className={styles.metadata}>{row.planned_start_date&&<span><CalendarDays size={17}/>{date(row.planned_start_date)} – {date(row.planned_end_date)}</span>}<span><Clock size={17}/>{row.duration_weeks} semanas{row.planned_instructional_days!=null?` · ${row.planned_instructional_days} días lectivos`:""}</span><span>{row.period}</span></div>
   <p className={styles.purpose}><strong>De qué trata:</strong> {row.purpose}</p>
   {!!row.children_actions?.length&&<div className="mt-3 text-sm"><strong>Qué harán los niños</strong><ul className="mt-1 list-disc space-y-1 pl-5">{row.children_actions.slice(0,3).map((action,index)=><li key={index}>{action}</li>)}</ul></div>}
   {!!presentMaterials(row.materials).length&&<p className="mt-3 text-sm"><strong>Materiales previstos:</strong> {presentMaterials(row.materials).slice(0,5).map((material:string)=>material.trim().replace(/[.;]+$/,'')).join(" · ")}</p>}
   {row.expected_product&&<p className="mt-2 text-sm"><strong>Resultado esperado:</strong> {row.expected_product}</p>}
   <AnnualCompetencies ids={row.primary_competency_ids} names={names}/>
  </div>
  <div className={styles.actions}>{onPrepare&&<Button className="max-w-full whitespace-normal text-left" disabled={disabled} onClick={onPrepare}>{prepareLabel}<ArrowRight className="shrink-0" size={18}/></Button>}{canChange&&<Button variant="outline" disabled={disabled||row.teacher_protected} onClick={onChange}><Sparkles size={17}/>Cambiar con Ayni</Button>}</div>
 </article>;
}
