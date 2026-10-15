"use client";
import Image from 'next/image';
import {CalendarDays,Target,Heart,Eye,Package,ListChecks} from 'lucide-react';
import {displayDate} from '@/src/lib/display-date';
import {presentMaterials} from '@/src/lib/annual-proposal-intent.mjs';
import {AnnualCompetencies} from './annual-project-preview';
import {ProjectPictogram} from './project-pictogram';
import type {OpenDocument} from './documents-screen';
import styles from './activity-reading.module.css';

const text=(value:unknown)=>typeof value==='string'?value:'';
const strings=(value:unknown)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[];
export function ProjectReadingView({document}:{document:OpenDocument}){
  const content=document.content,master=(content.project_master??{}) as Record<string,unknown>,decisions=(content.decisions??{}) as Record<string,unknown>,dependents=(content.dependents??{}) as Record<string,unknown>;
  const ids=strings(decisions.competency_ids??content.primary_competency_ids),names=new Map((document.competencies??[]).map(item=>[item.id,item.name]));
  const route=Array.isArray(content.activity_route)?content.activity_route as Record<string,unknown>[]:[];
  const journey=Array.isArray(dependents.journey)?dependents.journey as Record<string,unknown>[]:[];
  const criteria=Array.isArray(dependents.general_criteria)?dependents.general_criteria as Record<string,unknown>[]:[];
  const mediation=[...new Set(route.map(item=>text(item.mediation_notes)).filter(Boolean))].slice(0,3);
  const materials=presentMaterials(master.resources??content.spaces_and_materials) as string[];
  return <article className={styles.reader} aria-label="Detalle del proyecto">
    <header className={styles.header}><div className={styles.heading}><h1>{document.title}</h1><div className={styles.metadata}><span><CalendarDays size={18}/>{displayDate(document.starts_on??'')} – {displayDate(document.ends_on??'')}</span><span>{route.length} actividades</span></div><AnnualCompetencies ids={ids} names={names}/></div><ProjectPictogram project={{title:document.title,purpose:text(content.purpose),primary_competency_ids:ids}} className={styles.heroArt}/></header>
    <section className={`${styles.purpose} ${styles.mint}`}><Image src="/project-illustrations/ideas.webp" alt="" width={96} height={96} unoptimized className={styles.illustration}/><div><h2><Target/>Qué buscamos</h2><p>{text(content.purpose)||text(decisions.purpose)}</p></div></section>
    {!!journey.length&&<section className={styles.sequence}><h2><ListChecks/>Qué harán los niños</h2><ol className="mt-4 grid gap-4 sm:grid-cols-2">{journey.map((item,index)=><li key={index} className="flex items-start gap-3 rounded-xl bg-[#edf7fa] p-4"><Image src={`/project-illustrations/${['planning_play','ideas','sharing'][index%3]}.webp`} alt="" width={65} height={75} unoptimized className="h-20 w-16 shrink-0 object-contain"/><div><h3>{text(item.title)}</h3><p>{text(item.description)}</p></div></li>)}</ol></section>}
    <div className={styles.pair}><section className={`${styles.support} ${styles.sand}`}><h2><Package/>Materiales</h2><ul className={styles.lines}>{materials.map((item,index)=><li key={index}>{item}</li>)}</ul>{!materials.length&&<p>Sin materiales adicionales registrados.</p>}</section><section className={`${styles.support} ${styles.sky}`}><h2><Heart/>Cómo acompañar</h2><ul className={styles.lines}>{mediation.map((item,index)=><li key={index}>{item}</li>)}</ul></section></div>
    {!!criteria.length&&<section className={`${styles.support} ${styles.lilac}`}><h2><Eye/>Qué observar</h2><ul className="space-y-4">{criteria.map((item,index)=><li key={index}><AnnualCompetencies ids={[text(item.competency_id)]} names={names}/><p className="mt-2">{text(item.criterion)}</p></li>)}</ul></section>}
    {text(master.closing_description)&&<section className={`${styles.support} ${styles.mint} mt-4`}><h2>Para cerrar el proyecto</h2><p>{text(master.closing_description)}</p></section>}
  </article>;
}
