"use client";
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {ArrowLeft,BookOpen,CalendarDays,Clock3,Package,Plus,Search,Target} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {apiFetch,apiJson} from '@/src/lib/ayni-api-fetch';
import {localDatabaseApiUrl} from '@/src/lib/local-database';
import {competencyVisual} from '@/src/lib/competency-presentation';
import {AnnualCompetencies} from './annual-project-preview';
import {WorkflowFeedback} from './workflow-ui';
import {WorkshopResources} from './workshop-resources';
import {workshopForAge,workshopAgeLabel} from '@/src/lib/workshop-ages.mjs';
import styles from './workshop-library.module.css';

type Workshop={id:string;title:string;age:number;ages?:number[];adaptations?:Record<number,Partial<Workshop>>;type:string;competency_id:string;duration_minutes:number;purpose:string;criterion:string;evidence:string;materials:string[];preparation:string;opening:{teacher:string;children:string};development:{teacher:string;children:string};closure:{teacher:string;children:string};resources:{id:string;title:string;url:string}[]};
type Library={age:number;today:string;available_dates:string[];scheduled:{id:string;date:string;title:string}[];coverage:Record<string,{developed:number;observed_students:number}>;competencies:{id:string;name:string}[];workshops:Workshop[]};
export function WorkshopLibrary({classroomId,onBack,onAdded,onOpen}:{classroomId:string;onBack:()=>void;onAdded:(id:string)=>Promise<void>;onOpen:(id:string)=>void}){
  const [data,setData]=useState<Library|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const [type,setType]=useState(''),[competency,setCompetency]=useState(''),[query,setQuery]=useState('');
  const [selected,setSelected]=useState<Workshop|null>(null),[date,setDate]=useState(''),[busy,setBusy]=useState(false);
  const request=useRef<{key:string;id:string}|null>(null),detail=useRef<HTMLElement>(null);
  useEffect(()=>{const controller=new AbortController();void apiFetch(`${localDatabaseApiUrl}/api/workshop-library?classroomId=${encodeURIComponent(classroomId)}`,{signal:controller.signal})
    .then(async response=>{const value=await apiJson<Library&{error?:string}>(response);if(!response.ok)throw new Error(value.error??'No pudimos abrir los talleres.');return value;})
    .then(value=>{if(!controller.signal.aborted){setData(value);setDate(value.available_dates[0]??'');setError('');}})
    .catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});return()=>controller.abort();},[classroomId,retry]);
  useEffect(()=>{if(selected){detail.current?.focus({preventScroll:true});detail.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}},[selected]);
  async function add(){if(!selected||busy)return;setBusy(true);setError('');const key=`${selected.id}:${date}`;
    if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};
    try{const response=await apiFetch(`${localDatabaseApiUrl}/api/workshop-library`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({classroomId,workshopId:selected.id,occursOn:date,clientRequestId:request.current.id})});
      const result=await apiJson<{id?:string;error?:string}>(response);if(!response.ok||!result.id)throw new Error(result.error??'No pudimos añadir el taller. Inténtalo otra vez.');
      await onAdded(result.id);
    }catch(cause){setError(cause instanceof Error?cause.message:'No pudimos guardar el taller.');}finally{setBusy(false);}
  }
  const names=new Map(data?.competencies.map(c=>[c.id,c.name])??[]),existing=data?.scheduled.find(w=>w.date===date);
  const candidates=data?.workshops.map(w=>workshopForAge(w,data.age)).filter((w):w is Workshop=>w!==null);
  const filtered=candidates?.filter(w=>(!type||w.type===type)&&(!competency||w.competency_id===competency)&&`${w.title} ${w.purpose}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
  return <section className={styles.library} aria-label="Biblioteca de talleres">
    <Button variant="ghost" onClick={onBack}><ArrowLeft size={18}/>Volver a Hoy</Button>
    <header className={styles.header}><BookOpen size={34} aria-hidden="true"/><div><h1>Elige un taller</h1><p>Para jugar, explorar y observar otros aprendizajes.</p></div></header>
    {error&&<WorkflowFeedback tone="error">{error}{!data&&<Button variant="outline" onClick={()=>setRetry(v=>v+1)}>Reintentar</Button>}</WorkflowFeedback>}
    {!data&&!error&&<p role="status">Abriendo la biblioteca de talleres…</p>}
    {data&&<>
      <div className={styles.filters}>
        <div className={styles.classroomAge}><span>Edad de tu aula</span><strong>{data.age} años</strong></div>
        <label>Tipo<select value={type} onChange={e=>{setType(e.target.value);setSelected(null);}}><option value="">Todos los tipos</option>{[...new Set(data.workshops.map(w=>w.type))].map(t=><option key={t}>{t}</option>)}</select></label>
        <label>Competencia<select value={competency} onChange={e=>{setCompetency(e.target.value);setSelected(null);}}><option value="">Todas las competencias</option>{data.competencies.filter(c=>data.workshops.some(w=>w.competency_id===c.id)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label><span className={styles.searchLabel}><Search size={16}/>Buscar taller</span><input type="search" value={query} onChange={e=>{setQuery(e.target.value);setSelected(null);}} placeholder="Nombre o idea…"/></label>
      </div>
      <p className={styles.hint} role="status">{filtered?.length??0} {(filtered?.length??0)===1?'taller disponible':'talleres disponibles'}{` para ${data.age} años`}.</p>
      <p className={styles.hint}>Primero verás competencias sin actividades desarrolladas y con menos niños observados. Tú eliges.</p>
      <div className={styles.grid}>{filtered?.map(w=>{const visual=competencyVisual(w.competency_id);return <button type="button" key={w.id} aria-pressed={selected?.id===w.id} onClick={()=>{setSelected(w);setError('');}} className={styles.card} style={{background:visual?.background??'#edf7fa'}}>
        <div className={styles.cardTop}>{visual&&<Image src={visual.image} alt="" width={48} height={48} unoptimized/>}<span>{workshopAgeLabel(w)} · {w.duration_minutes} min</span></div>
        <h2>{w.title}</h2><p>{w.type}</p><span className={styles.competency} style={{color:visual?.foreground}}>{names.get(w.competency_id)}</span>
        {data.coverage[w.competency_id]?.developed===0&&<span className={styles.priority}>Por explorar en el aula</span>}
      </button>;})}</div>
      {!filtered?.length&&<p>No hay talleres con esos filtros. Prueba otra competencia o tipo.</p>}
      {selected&&<article ref={detail} tabIndex={-1} className={styles.detail} aria-label={`Taller: ${selected.title}`}>
        <header><h2>{selected.title}</h2><p>{selected.age} años · {selected.type} · {selected.duration_minutes} minutos</p><AnnualCompetencies ids={[selected.competency_id]} names={names}/></header>
        {selected.ages&&<p className={styles.hint}>Para {workshopAgeLabel(selected)}. Estás viendo la guía de {selected.age} años.</p>}
        <p className={styles.purpose}><Target size={22}/>{selected.purpose}</p>
        <section className={styles.materials}><h3><Package size={21}/>Materiales</h3><ul>{selected.materials.map(m=><li key={m}>{m}</li>)}</ul><WorkshopResources resources={selected.resources} workshopId={selected.id} age={selected.age}/></section>
        <section className={styles.preparation}><h3>Antes de empezar</h3><p>{selected.preparation}</p></section>
        <div className={styles.moments}>{(['opening','development','closure'] as const).map((key,i)=><section key={key}><h3>{['Inicio','Desarrollo','Cierre'][i]}</h3><h4>Qué hago ahora</h4><p>{selected[key].teacher}</p><h4>Qué harán los niños</h4><p>{selected[key].children}</p></section>)}</div>
        <section className={styles.observe}><h3>Qué observar</h3><p>{selected.criterion}</p><h4>Evidencia que puedes registrar</h4><p>{selected.evidence}</p></section>
        <footer className={styles.footer}>
          <label><span><CalendarDays size={19}/>Día del taller</span><select value={date} onChange={e=>setDate(e.target.value)} disabled={busy}>{data.available_dates.map(d=><option key={d} value={d}>{new Intl.DateTimeFormat('es-PE',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'))}{d===data.today?' · hoy':''}</option>)}</select></label>
          {selected.age!==data.age?<p>Tu aula es de {data.age} años. Elige un taller de esa edad para añadirlo.</p>:!date?<p>No quedan días de clase disponibles en este año.</p>:existing?<div><p>Este día ya tiene un taller.</p><Button variant="outline" onClick={()=>onOpen(existing.id)}>Abrir {existing.title}</Button></div>:<Button disabled={busy} onClick={()=>void add()}><Plus size={18}/>{busy?'Añadiendo…':'Añadir a la jornada'}</Button>}
        </footer>
        {busy&&<p role="status">Guardando el taller y su guía…</p>}
        <p className={styles.hint}>Propuesta Ayni basada en CNEB. La observación se registra cuando tú la realices.</p>
      </article>}
      {!!data.scheduled.length&&<section className={styles.scheduled}><h2>Talleres elegidos</h2>{data.scheduled.filter(w=>w.date>=data.today).slice(0,8).map(w=><button key={w.id} onClick={()=>onOpen(w.id)}><Clock3 size={18}/><span>{w.date} · {w.title}</span><span>Abrir en Hoy →</span></button>)}</section>}
    </>}
  </section>;
}
