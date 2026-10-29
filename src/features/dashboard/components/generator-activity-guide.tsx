'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {multiAgeAppRequest as api,multiAgeDownloadUrl} from '@/src/lib/multi-age-app-client';
import type {LocalDashboard} from '@/src/lib/local-database';
import {ActivityRunView} from './activity-run-view';
import {LoadingState,WorkflowFeedback} from './workflow-ui';

type Moment='opening'|'development'|'closure';
type SavedActivity={id:string;identity:{ages:number[]};curriculumReference:{competency_id:string;age:number;name:string;official_performances:{id:string;text:string;printed_page?:number}[];cycle_standard_ai:string}[];content:{title:string;purpose:string;projectTitle?:string;position:number;commonSequence:Record<Moment,string>;criteriaFamilies:{competency_id:string;variants:{criterion_id:string;curricular_age:number;criterion_text:string;expected_evidence:string;observation_moments:Moment[]}[]}[];activityPlanning?:{materials:{name:string;availability:string}[];ageSupports:{age:number;mediation:string;support:string}[];childParticipation:string;progression:string}}};
const moments:Record<Moment,string>={opening:'Inicio',development:'Desarrollo',closure:'Cierre'};

/** Same read-only moment guide as Hoy. It never starts activities or writes observations. */
export function GeneratorActivityGuide({id,onBack,onActivity,activities}:{id:string;onBack:()=>void;onActivity:(id:string)=>void;activities:{id:string;title:string}[]}){
 const [document,setDocument]=useState<SavedActivity|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[selectedAge,setAge]=useState<number|null>(null);
 useEffect(()=>{let live=true;api<SavedActivity>(`/documents/activity/${id}`).then(value=>{if(live)setDocument(value);}).catch(cause=>{if(live)setError(cause.message);});return()=>{live=false;};},[id,retry]);
 if(error)return <WorkflowFeedback tone="error">{error}<Button variant="outline" onClick={()=>{setError('');setRetry(v=>v+1);}}>Reintentar</Button><Button variant="ghost" onClick={onBack}>Volver al proyecto</Button></WorkflowFeedback>;
 if(!document)return <LoadingState label="Abriendo la guía de la actividad…"/>;
 const c=document.content,p=c.activityPlanning,age=document.identity.ages.includes(selectedAge??0)?selectedAge!:document.identity.ages[0],support=p?.ageSupports.find(s=>s.age===age);
 const names=new Map(document.curriculumReference.map(r=>[r.competency_id,r.name])),position=activities.findIndex(a=>a.id===id);
 const criteria=c.criteriaFamilies.flatMap(f=>f.variants.filter(v=>v.curricular_age===age).map(v=>({...v,competency_v4_id:f.competency_id,competency_text:names.get(f.competency_id)??f.competency_id})));
 const block:LocalDashboard['today']['blocks'][number]={id,activity_id:id,title:c.title,purpose:c.purpose,experience_title:c.projectTitle??'',activity_details:null,
  materials:p?.materials.map(m=>`${m.name}${m.availability==='to_verify'?' · por verificar':''}`)??['Comprueba los materiales previstos en la propuesta antes de empezar.'],materials_source:'activity',steps:[],criteria:criteria.map(v=>({id:v.criterion_id,criterion_text:v.criterion_text,competency_id:null,performance_id:null,evidence_kind:null,details:{expected_evidence:v.expected_evidence},competency_v4_id:v.competency_v4_id,competency_text:v.competency_text})),
  pedagogical_blocks:(Object.entries(moments) as [Moment,string][]).map(([key,title])=>({id:`${id}-${key}-${age}`,title,instruction:c.commonSequence[key],...(key==='development'&&p?{expected_actions:p.childParticipation}:{}),observations:criteria.filter(v=>v.observation_moments.includes(key)).map(v=>({id:v.criterion_id,competency_id:v.competency_v4_id,competency_name:v.competency_text,criterion:v.criterion_text,expected_evidence:v.expected_evidence}))})),
  start_time:'',end_time:'',block_type:'activity',status:'planned',display_status:'planned',current_override:false,current_step_index:0,closure_type:null};
 return <div className="space-y-5"><ActivityRunView key={id} block={block} evidenceRevision={0} preview onBack={onBack} backLabel="Volver al proyecto" onEvidence={()=>{}}
  actions={<Button asChild variant="outline"><a href={multiAgeDownloadUrl(`/documents/activity/${id}.docx`)}>Descargar Word</a></Button>}
  navigation={<fieldset className="flex flex-wrap items-center gap-2"><legend className="mb-2 font-semibold text-[#172b52]">Ver guía para esta edad</legend>{document.identity.ages.map(a=><Button key={a} variant={a===age?'default':'outline'} aria-pressed={a===age} onClick={()=>setAge(a)}>{a} años</Button>)}</fieldset>}
  beforeMoment={support?<section className="space-y-3 rounded-2xl border border-[#b8ccde] bg-white p-5 text-[#294d6d]"><h2 className="text-lg font-bold text-[#172b52]">Cómo ayudar a los niños de {age} años</h2><p>{support.mediation}</p><p><strong>Si necesitan más ayuda:</strong> {support.support}</p></section>:undefined}/>
  <details className="rounded-xl border border-[#b8ccde] bg-white p-4"><summary className="cursor-pointer font-semibold text-[#172b52]">Ver competencias y referentes del CNEB</summary><div className="mt-4 space-y-4 text-[#294d6d]">{document.curriculumReference.filter(r=>r.age===age).map(r=><section key={r.competency_id}><h2 className="font-bold">{r.name} · {age} años</h2>{r.official_performances.length?r.official_performances.map(performance=><p className="mt-2" key={performance.id}>{performance.text}{performance.printed_page?` (MINEDU, p. ${performance.printed_page})`:''}</p>):<p>{r.cycle_standard_ai}</p>}</section>)}</div></details>
  {position>=0&&activities.length>1&&<nav aria-label="Actividades del proyecto" className="flex flex-wrap justify-between gap-3"><Button variant="outline" disabled={position===0} onClick={()=>onActivity(activities[position-1].id)}>Actividad anterior</Button><Button disabled={position===activities.length-1} onClick={()=>onActivity(activities[position+1].id)}>Siguiente actividad</Button></nav>}
 </div>;
}
