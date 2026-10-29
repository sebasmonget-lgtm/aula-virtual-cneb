"use client";

import {Button} from '@/components/ui/button';
import type {ActivityBlueprint,MultiAgeAppState} from '@/src/lib/multi-age-app-types';
import {displayDocumentDate} from '@/src/lib/display-date';
import {ActivityReadingView} from './activity-reading-view';
import {ProjectReadingView} from './project-reading-view';
import {MultiAgeWorkshopResources} from './multi-age-workshops';
import type {OpenDocument} from './documents-screen';

export type SavedMultiAgeProjectDocument={
 id:string;kind:'project'|'activity'|'workshop';version:number;status:string;
 identity:{ages:number[];school_year:number;section:string;teacher_name:string;institution_name:string};
 sourceSnapshot:{annualPlanVersion:number};
 curriculumReference:{age:number;competency_id:string;name:string;official_performance_version:string;official_performances:{id:string;text:string}[];cycle_standard_ai:string}[];
 content:{title:string;purpose:string;startsOn?:string;endsOn?:string;occursOn?:string;position?:number;projectTitle?:string;commonSequence:ActivityBlueprint['commonSequence'];criteriaFamilies:ActivityBlueprint['criteriaFamilies'];materials?:string[];preparation?:string;resources?:unknown};
};

/** Reading uses only the saved document; the activity index is explicitly a separate live projection. */
export function MultiAgeSavedProject({document,activities,onOpenActivity}:{document:SavedMultiAgeProjectDocument;activities:MultiAgeAppState['documents'];onOpenActivity:(id:string)=>void}){
 const {content,identity}=document,sequence=content.commonSequence,project=document.kind==='project';
 const competencies=[...new Map(document.curriculumReference.map(c=>[c.competency_id,{id:c.competency_id,name:c.name}])).values()];
 const stages={opening:'Inicio',development:'Desarrollo',closure:'Cierre'};
 const saved:OpenDocument={id:document.id,kind:project?'experience':'activity',title:content.title,status:document.status,version:document.version,school_year:identity.school_year,classroom:identity.section,date:content.occursOn??content.startsOn??'',
  starts_on:content.startsOn,ends_on:content.endsOn,occurs_on:content.occursOn,experience_title:content.projectTitle,competencies,
  content:{project_master:{resources:content.materials??[],meaningful_situation:sequence.opening,closing_description:sequence.closure},purpose:content.purpose,materials:content.materials,teacher_preparation:content.preparation,meaningful_situation:sequence.opening,child_actions:sequence.development,closure_or_continuity:sequence.closure,
   mediation:sequence.development,primary_competency_ids:competencies.map(c=>c.id),
   evaluation_criterion:content.criteriaFamilies.flatMap(f=>f.variants.map(v=>`${v.curricular_age} años: ${v.criterion_text}`)).join('\n'),
   expected_evidence:content.criteriaFamilies.flatMap(f=>f.variants.map(v=>`${v.curricular_age} años: ${v.expected_evidence}`)).join('\n'),
   evidence_opportunities:'Consulta los criterios y las oportunidades de observación de cada edad a continuación.',
   activity_route:activities.map(a=>({title:a.title,mediation_notes:sequence.development})),dependents:{journey:Object.entries(stages).map(([key,title])=>({title,description:sequence[key as keyof typeof sequence]}))}}};
 return <div className="space-y-6">
  <p className="text-sm text-[#526b87]">Aula {identity.section} · {identity.school_year} · Versión {document.version} · {identity.teacher_name}</p>
  {project?<><p className="text-sm text-[#526b87]">Datos del aula conservados desde Mi año versión {document.sourceSnapshot.annualPlanVersion}. Las actividades anteriores mantienen la versión con la que se prepararon.</p><ProjectReadingView document={saved}/></>:<ActivityReadingView document={saved} position={content.position} actions={null}/>}
  {document.kind==='workshop'&&<MultiAgeWorkshopResources resources={content.resources}/>}
  <section className="space-y-4" aria-label="Criterios por edad"><h2 className="text-xl font-extrabold text-[#172b52]">Qué observar en cada edad</h2><div className="grid gap-4 lg:grid-cols-3">{identity.ages.map(age=><section key={age} className="ayni-panel space-y-4 p-4"><h3 className="text-lg font-extrabold text-[#172b52]">{age} años</h3>{content.criteriaFamilies.map(f=>{const variant=f.variants.find(v=>v.curricular_age===age),reference=document.curriculumReference.find(r=>r.age===age&&r.competency_id===f.competency_id);return variant&&<div key={f.competency_id} className="space-y-2"><p className="font-semibold">{reference?.name??f.competency_id}</p><p><strong>Criterio:</strong> {variant.criterion_text}</p><p><strong>Qué podría observar:</strong> {variant.expected_evidence}</p><p className="text-sm text-[#526b87]">Momentos: {variant.observation_moments.map(m=>stages[m as keyof typeof stages]).join(' · ')}</p><details><summary className="min-h-11 cursor-pointer py-2 font-semibold">Referentes de {age} años</summary><p className="text-sm">{reference?.official_performance_version}</p>{reference?.official_performances.length?reference.official_performances.map(p=><p className="mt-3" key={p.id}>{p.text}</p>):<p>Sin desempeño específico publicado para esta edad. Referente de ciclo en paráfrasis: {reference?.cycle_standard_ai}</p>}</details></div>;})}</section>)}</div></section>
  {project&&<section className="space-y-3" aria-label="Índice de actividades"><h2 className="text-xl font-extrabold text-[#172b52]">Actividades preparadas con esta versión</h2><p className="text-sm text-[#526b87]">Índice actualizado. El Word del proyecto conserva su contenido confirmado; cada actividad tiene su propio Word.</p>{activities.length?<ol className="divide-y rounded-2xl border border-[var(--ayni-panel-border)] bg-white">{activities.map(a=><li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0 flex-1"><p className="break-words font-bold text-[#172b52]">Actividad {a.position} · {a.title}</p><p className="text-sm text-[#526b87]">Fecha prevista: {displayDocumentDate(a.date)} · {a.ages.join(', ')} años · Proyecto V{a.projectVersion}{a.historical?' · Versión anterior':''}</p></div><Button variant="outline" onClick={()=>onOpenActivity(a.id)}>Abrir actividad {a.position}</Button></li>)}</ol>:<p>Aún no hay actividades preparadas con esta versión. Las anteriores se conservan en su carpeta correspondiente.</p>}</section>}
 </div>;
}
