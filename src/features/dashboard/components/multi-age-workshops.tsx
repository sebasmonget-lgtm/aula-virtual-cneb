"use client";

import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {multiAgeAppRequest as api} from '@/src/lib/multi-age-app-client';
import type {ActivityBlueprint,MultiAgeAppState} from '@/src/lib/multi-age-app-types';
import styles from './multi-age-workspace.module.css';

type Workshop={id:string;title:string;type:string;competencyId:string;materials:string[];preparation:string;resources?:unknown;commonSequence:ActivityBlueprint['commonSequence'];variants:(ActivityBlueprint['criteriaFamilies'][number]['variants'][number]&{purpose:string;performances:{id:string;text:string}[]})[]};
type Library={sourceFingerprint:string;workshops:Workshop[]};
type Run=(path:string,input:Record<string,unknown>)=>Promise<boolean>;

/** Public authored images carry no child information and need no legacy classroom reader. */
export function MultiAgeWorkshopResources({resources}:{resources:unknown}){
 const items=Array.isArray(resources)?resources.filter((r):r is {id:string;title:string;url:string}=>r&&typeof r.id==='string'&&typeof r.title==='string'&&typeof r.url==='string'&&/^\/workshops\/[a-z0-9-]+\.png$/.test(r.url)):[];
 return items.length?<section className="space-y-3"><h3 className="font-bold text-[#172b52]">Materiales para imprimir</h3><div className="flex flex-wrap gap-3">{items.map(r=><Button asChild variant="outline" key={r.id}><a href={r.url} target="_blank" rel="noreferrer">Abrir {r.title}</a></Button>)}</div><p className="text-sm">Se abre el material original de Ayni. Puedes guardarlo o imprimirlo; no incluye datos de los niños.</p></section>:null;
}

/** Same Ayni panels and form controls; library selection does not create observations. */
export function MultiAgeWorkshops({w,run}:{w:NonNullable<MultiAgeAppState['workspace']>;run:Run}){
 const [library,setLibrary]=useState<Library|null>(null),[selected,setSelected]=useState(''),[error,setError]=useState('');
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{let live=true;api<Library>('/workshops?classroomId='+w.classroom.id).then(data=>{if(live){setLibrary(data);setError('');}}).catch(cause=>{if(live)setError(cause.message);});return()=>{live=false;};},[w.classroom.id,w.classroom.curriculum_revision]);
 const workshop=library?.workshops.find(item=>item.id===selected);
 const change=(id:string)=>{if(root.current?.querySelector('form[data-dirty="true"]')&&!window.confirm('Hay cambios sin guardar en este taller. ¿Quieres descartarlos?'))return;setSelected(id);};
 const submit=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();if(!workshop||!library)return;const form=event.currentTarget,data=new FormData(form),text=(name:string)=>String(data.get(name)??'');
  const saved=await run('/workshops/confirm',{teacherConfirmed:true,classroomId:w.classroom.id,expectedRevision:w.classroom.curriculum_revision,workshopId:workshop.id,sourceFingerprint:library.sourceFingerprint,
   blueprint:{title:text('title'),purpose:text('purpose'),occursOn:text('day'),participantAges:w.classroom.ages,commonSequence:Object.fromEntries(['opening','development','closure'].map(k=>[k,text(k)])),criteriaFamilies:[{competency_id:workshop.competencyId,variants:workshop.variants.map(v=>({curricular_age:v.curricular_age,criterion_text:text('criterion-'+v.curricular_age),expected_evidence:text('evidence-'+v.curricular_age),observation_moments:v.observation_moments,official_performance_refs:data.getAll('ref-'+v.curricular_age).map(String)}))}]}});
  if(saved){form.dataset.dirty='false';setSelected('');}
 };
 return <section ref={root} className={`${styles.panel} ayni-panel space-y-5 p-5 sm:p-6`} aria-label="Talleres compartidos">
  <h2 className="text-xl font-extrabold text-[#172b52]">Talleres</h2><p>Elige una experiencia compartida y revisa los criterios de {w.classroom.ages.join(', ')} años. Se guarda en Hoy y Documentos; las observaciones se registran después, niño por niño.</p>
  {error&&<p role="alert">{error}</p>}{!library&&!error&&<p role="status">Cargando talleres…</p>}
  {library&&<label className={styles.field}>Propuesta del taller<select value={selected} onChange={event=>change(event.target.value)}><option value="">Elige un taller</option>{library.workshops.map(item=><option key={item.id} value={item.id}>{item.type} · {item.title}</option>)}</select></label>}
  {library&&!library.workshops.length&&<p>No hay propuestas con adaptaciones completas para las edades de tu aula.</p>}
  {workshop&&<form key={workshop.id} className="space-y-5" onSubmit={event=>void submit(event)} onChangeCapture={event=>{event.currentTarget.dataset.dirty='true';}}>
   <label className={styles.field}>Título<Input name="title" defaultValue={workshop.title} maxLength={180} required/></label>
   <label className={styles.field}>Propósito compartido<Textarea name="purpose" defaultValue={workshop.variants.map(v=>`${v.curricular_age} años: ${v.purpose}`).join('\n')} maxLength={1000} required/></label>
   <label className={styles.field}>Fecha prevista<Input name="day" type="date" min={w.classroom.starts_on} max={w.classroom.ends_on} required/></label>
   <p><strong>Materiales:</strong> {workshop.materials.join(', ')}</p><p><strong>Preparación:</strong> {workshop.preparation}</p>
   <MultiAgeWorkshopResources resources={workshop.resources}/>
   {Object.entries({opening:'Inicio compartido',development:'Desarrollo y acompañamiento por edad',closure:'Cierre compartido'}).map(([key,label])=><label key={key} className={styles.field}>{label}<Textarea name={key} defaultValue={workshop.commonSequence[key as keyof typeof workshop.commonSequence]} maxLength={2400} required/></label>)}
   <div className="grid gap-5 lg:grid-cols-3">{workshop.variants.map(v=><fieldset key={v.curricular_age} className="min-w-0 space-y-4"><legend className="py-2 text-lg font-bold">{v.curricular_age} años</legend>
    <label className={styles.field}>Qué observar<Textarea name={'criterion-'+v.curricular_age} defaultValue={v.criterion_text} maxLength={1000} required/></label>
    <label className={styles.field}>Evidencia que podrías recoger<Textarea name={'evidence-'+v.curricular_age} defaultValue={v.expected_evidence} maxLength={1000} required/></label>
    <p className="text-sm">Elige entre uno y tres desempeños pertinentes para el criterio. No es necesario exigir todo el desempeño en este taller.</p>
    {v.performances.map(p=><label key={p.id} className={styles.check}><input type="checkbox" name={'ref-'+v.curricular_age} value={p.id}/><span>{p.text}</span></label>)}
    {!v.performances.length&&<p>Sin desempeño específico publicado para esta edad. Se conservará el referente de ciclo.</p>}
   </fieldset>)}</div>
   <label className={styles.check}><input type="checkbox" required name="reviewed"/>Revisé la organización con una profesora y los criterios y referentes de cada edad.</label>
   <Button type="submit">Confirmar taller</Button>
  </form>}
 </section>;
}
