"use client";
import Image from 'next/image';
import {CalendarDays,CheckCircle2,ListChecks,Target,Heart,Search,ClipboardList,BookOpen,FileText} from 'lucide-react';
import {activityReadingStages,readingSentences,savedText} from '@/src/lib/activity-reading-content.mjs';
import {displayDate,displayDocumentDate} from '@/src/lib/display-date';
import {competencyVisual} from '@/src/lib/competency-presentation';
import {ProjectPictogram} from './project-pictogram';
import type {OpenDocument} from './documents-screen';
import styles from './activity-reading.module.css';

function SavedLines({value}:{value:unknown}){
  const lines=readingSentences(value) as string[];
  if(!lines.length)return null;
  return <ul className={styles.lines}>{lines.map((line,index)=><li key={index}>{line}</li>)}</ul>;
}
function Illustration({name,className=''}:{name:string;className?:string}){
  return <Image src={`/project-illustrations/${name}.webp`} alt="" aria-hidden="true" width={160} height={160} unoptimized className={`${styles.illustration} ${className}`}/>;
}
export function ActivityReadingView({document,position,total,actions}:{document:OpenDocument;position?:number;total?:number;actions:React.ReactNode}){
  const content=document.content,sequence=activityReadingStages(content.child_actions,{opening:content.meaningful_situation,closure:content.closure_or_continuity}) as {introduction:string;groupedContext?:boolean;stages:{label:string;text:string}[]};
  const names=new Map(document.competencies?.map(item=>[item.id,item.name])??[]);
  const competency=savedText(document.active_criterion?.competency_v4_id||content.competency_id),visual=competencyVisual(competency);
  const confirmed=['active','confirmed'].includes(document.status);
  const art={title:document.title,purpose:savedText(content.purpose),primary_competency_ids:competency?[competency]:[]};
  return <article className={styles.reader} aria-label="Actividad completa">
    <header className={styles.header}>
      <div className={styles.heading}><h1>{document.title}</h1><div className={styles.metadata}>
        <span><CalendarDays size={19}/>{displayDate(document.occurs_on??document.date)}</span>
        {document.actual_execution_date&&document.actual_execution_date!==document.occurs_on&&<span><CheckCircle2 size={19}/>Trabajada el {displayDate(document.actual_execution_date)}</span>}
        {!!position&&!!total&&<span><ListChecks size={19}/>Actividad {position} de {total}</span>}
        <span className={styles.status}><CheckCircle2 size={18}/>{confirmed?'Confirmada':document.status==='archived'?'Versión anterior':'Borrador'}</span>
      </div>{document.experience_title&&<p className={styles.experience}><BookOpen size={19}/><span><strong>Experiencia:</strong> {document.experience_title}</span></p>}</div>
      <ProjectPictogram project={art} className={styles.heroArt}/>
      <div className={styles.actions}>{actions}</div>
    </header>
    {savedText(content.purpose)&&<section className={`${styles.purpose} ${styles.mint}`}><Illustration name="ideas" className={styles.purposeArt}/><div><h2><Target/>Propósito</h2><p>{savedText(content.purpose)}</p></div></section>}
    <div className={styles.pair}>
      <section className={`${styles.panel} ${styles.sand}`}><Illustration name="pencil"/><div><h2>{content.materials_source==='project'?'Materiales del proyecto':'Materiales'}</h2><SavedLines value={content.materials}/>{content.materials_source==='project'&&<p className="mt-2 text-sm">Recursos registrados en el proyecto preparado.</p>}{content.materials_source==='incomplete'?<p>El proyecto guardado aún no precisa estos materiales. Revísalos con Ayni antes de prepararlo de nuevo.</p>:!readingSentences(content.materials).length&&<p>Sin materiales adicionales registrados.</p>}</div></section>
      <section className={`${styles.panel} ${styles.rose}`}><ClipboardList className={styles.largeIcon}/><div><h2>Antes de empezar</h2><SavedLines value={content.teacher_preparation}/></div></section>
    </div>
    {!sequence.groupedContext&&savedText(content.meaningful_situation)&&<section className={styles.situation}><h2><BookOpen/>Situación para los niños</h2><p>{savedText(content.meaningful_situation)}</p></section>}
    {!!sequence.stages.length&&<section className={styles.sequence}><h2><ListChecks/>Qué harán los niños</h2>{sequence.introduction&&<p>{sequence.introduction}</p>}<ol className={styles.steps}>
      {sequence.stages.map((step,index)=><li key={step.label} className={`${styles.step} ${[styles.sky,styles.sand,styles.lilac][index]}`}><h3>{sequence.stages.length===3&&<span className={styles.stepNumber}>{index+1}</span>}{step.label}</h3><div className={styles.stepBody}><Illustration name={['planning_play','ideas','sharing'][index]}/><SavedLines value={step.text}/></div></li>)}
    </ol></section>}
    {!sequence.groupedContext&&savedText(content.closure_or_continuity)&&<section className={styles.continuity}><h2>Para cerrar o continuar</h2><SavedLines value={content.closure_or_continuity}/></section>}
    <div className={styles.pair}>
      <section className={`${styles.support} ${styles.sky}`}><h2><Heart/>Cómo acompañar</h2><SavedLines value={content.mediation}/></section>
      <section className={`${styles.support} ${styles.rose}`}><h2><Search/>Qué observar</h2><SavedLines value={content.evidence_opportunities}/></section>
    </div>
    <div className={styles.references}>
      {competency&&<section className={styles.mint}><h2>{visual?<Image src={visual.image} alt="" width={28} height={28} unoptimized/>:<BookOpen/>}Competencia {confirmed?'confirmada':'propuesta'}</h2><p>{names.get(competency)??competency}</p></section>}
      <section className={styles.lilac}><h2><Target/>Criterio</h2><p>{savedText(document.active_criterion?.criterion_text||content.evaluation_criterion)}</p></section>
      <section className={styles.sky}><h2><FileText/>Evidencia esperada</h2><p>{savedText(content.expected_evidence)}</p></section>
    </div>
    {!!document.registered_evidence?.length&&<section className={styles.sequence}><h2><ClipboardList/>Observaciones registradas</h2><ul className="mt-3 space-y-3">{document.registered_evidence.map(item=><li key={item.id} className="rounded-xl bg-[#edf7fa] p-3"><strong>{item.student_name}</strong><span className="ml-2 text-sm">{displayDocumentDate(item.observed_at)}</span><p className="mt-1">{item.observation_text||'Evidencia privada adjunta'}</p></li>)}</ul></section>}
    {document.workshop&&<section className={styles.workshop}><h2>Taller del día · {savedText(document.workshop.content.title)}</h2>{[['Propósito','purpose'],['Materiales','materials'],['Inicio','opening'],['Desarrollo','development'],['Cierre','closure'],['Qué observar','criterion_or_observation_focus'],['Evidencia esperada','evidence_expected']].map(([label,key])=><div key={key}><h3>{label}</h3><SavedLines value={document.workshop?.content[key]}/></div>)}</section>}
  </article>;
}
