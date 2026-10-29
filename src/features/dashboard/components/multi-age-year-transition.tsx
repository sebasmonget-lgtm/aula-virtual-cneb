"use client";
import {useEffect,useState,type FormEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {multiAgeAppRequest as api,multiAgeDownloadUrl} from '@/src/lib/multi-age-app-client';
import type {MultiAgeAppState} from '@/src/lib/multi-age-app-types';
import {MultiAgeCalendarFields,multiAgeCalendarFormData} from './multi-age-calendar-fields';
import styles from './multi-age-workspace.module.css';
type Workspace=NonNullable<MultiAgeAppState['workspace']>;
type Transition={ready:boolean;sourceFingerprint:string;nextYear:number;pendingJobs:number;interruptedJobs:number;students:{id:string;first_name:string;last_name:string;age:number}[];periods:{id:string;label:string;closed:boolean;current:boolean}[]};
type History={years:{id:string;section:string;year:number;documents:MultiAgeAppState['documents'];reports:{id:string;first_name:string;last_name:string}[];closures:{id:string;version:number;label:string}[]}[]};

export function MultiAgeYearTransition({w,run}:{w:Workspace;run:(path:string,input:Record<string,unknown>)=>Promise<boolean>}){
 const [context,setContext]=useState<Transition|null>(null),[history,setHistory]=useState<History|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let live=true;api<History>('/years/history').then(value=>{if(live)setHistory(value);}).catch(cause=>{if(live)setError(cause.message);});return()=>{live=false;};},[w.classroom.id]);
 const review=async()=>{setLoading(true);setError('');try{setContext(await api<Transition>('/years/transition?classroomId='+w.classroom.id));}catch(cause){setError(cause instanceof Error?cause.message:'No se pudieron revisar los cierres.');}finally{setLoading(false);}};
 const submit=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!context)return;const form=event.currentTarget,data=new FormData(form),text=(key:string)=>String(data.get(key)??'');
  const saved=await run('/years/transition',{teacherConfirmed:true,historyAcknowledged:true,discardInterruptedPreparations:data.get('discard-interrupted')==='on',classroomId:w.classroom.id,sourceFingerprint:context.sourceFingerprint,reason:text('reason'),
   nextClassroom:{institutionName:text('institution'),section:text('section'),ages:data.getAll('next-age').map(Number),...multiAgeCalendarFormData(data,'next-')},
   students:context.students.map(child=>{const choice=text('child-'+child.id);return choice==='leave'?{studentId:child.id,action:'leave'}:{studentId:child.id,action:'continue',age:Number(choice)};})});
  if(saved)form.dataset.dirty='false';
 };
 return <section className={`${styles.panel} ayni-panel space-y-5 p-5 sm:p-6`}>
  <h2 className="text-xl font-extrabold text-[#172b52]">Años escolares</h2><p>El año anterior conserva sus documentos, cierres, matrícula y registros. En el año nuevo se confirma otra matrícula y se vuelve a recoger información sobre cada niño.</p>
  {error&&<p role="alert">{error}</p>}{!context&&<Button variant="outline" disabled={loading} onClick={()=>void review()}>{loading?'Revisando cierres…':'Revisar apertura del siguiente año'}</Button>}
  {context&&!context.ready&&<div className="space-y-3"><p>Antes de abrir {context.nextYear}, revisa los cuatro bimestres desde Consolidado.</p><ul>{context.periods.map(p=><li key={p.id}>{p.label}: {p.closed&&p.current?'cierre vigente':p.closed?'cierre que necesita revisión':'pendiente de cierre'}</li>)}</ul>{context.pendingJobs>0&&<p>Hay {context.pendingJobs} preparaciones pendientes. Resuélvelas antes de continuar.</p>}<Button variant="outline" onClick={()=>void review()} disabled={loading}>Volver a revisar cierres</Button></div>}
  {context?.ready&&<form key={context.sourceFingerprint} onSubmit={event=>void submit(event)} onChangeCapture={event=>{event.currentTarget.dataset.dirty='true';}} className="space-y-5">
   <h3 className="text-lg font-bold">Nueva matrícula de {context.nextYear}</h3>
   <label className={styles.field}>Institución educativa<Input name="institution" defaultValue={w.classroom.institution_name} maxLength={200} required/></label>
   <label className={styles.field}>Nombre del aula<Input name="section" defaultValue={w.classroom.section} maxLength={80} required/></label>
   <fieldset><legend className="font-semibold">Grupos atendidos en el nuevo año · elige al menos dos</legend>{[3,4,5].map(age=><label key={age} className={styles.check}><input type="checkbox" name="next-age" value={age} defaultChecked={w.classroom.ages.includes(age)}/>{age} años</label>)}</fieldset>
   {context.students.map(child=><label key={child.id} className={styles.field}>{child.first_name} {child.last_name} · {child.age} años en {w.classroom.year}<select name={'child-'+child.id} required defaultValue=""><option value="">Confirma su continuidad</option><option value="leave">No continúa en esta aula</option>{[3,4,5].filter(age=>age>=child.age&&age<=child.age+1).map(age=><option key={age} value={age}>Continúa en el grupo de {age} años</option>)}</select></label>)}
   <MultiAgeCalendarFields prefix="next-" defaultYear={context.nextYear} nationalAvailable={false}/>
   <label className={styles.field}>Motivo y precisiones de esta apertura<Textarea name="reason" minLength={3} maxLength={1000} required/></label>
   {context.interruptedJobs>0&&<label className={styles.check}><input type="checkbox" name="discard-interrupted" required/>No utilizaré las {context.interruptedJobs} preparaciones interrumpidas del año anterior. Sus registros se conservan; no se repetirá ninguna llamada a IA.</label>}
   <label className={styles.check}><input type="checkbox" name="reviewed" required/>Confirmo la nueva matrícula y calendario. El aula anterior quedará archivada y sus evidencias, entrevistas, diagnósticos y notas se conservarán en ese año.</label>
   <Button type="submit">Confirmar apertura del nuevo año</Button>
  </form>}
  {history?.years.map(year=><details key={year.id}><summary className="min-h-11 cursor-pointer py-2 font-bold">{year.year} · Aula {year.section} · Historial</summary><div className="space-y-3 py-3"><p>Versiones conservadas del año anterior. Cada descarga mantiene su edad y sus fuentes originales.</p><ul className="space-y-3">{year.documents.filter(d=>d.exportReady).map(d=><li key={d.id}><a className="inline-flex min-h-11 items-center underline" href={multiAgeDownloadUrl(`/documents/${d.kind}/${d.id}.docx`)}>{d.title} · versión {d.version} · Word</a></li>)}{year.reports.map(r=><li key={r.id}><a className="inline-flex min-h-11 items-center underline" href={multiAgeDownloadUrl(`/reports/${r.id}.docx`)}>Informe de {r.first_name} {r.last_name} · Word</a></li>)}{year.closures.map(c=><li key={c.id}><a className="inline-flex min-h-11 items-center underline" href={multiAgeDownloadUrl(`/periods/closures/${c.id}.xlsx`)}>{c.label} · cierre {c.version} · Excel</a></li>)}</ul></div></details>)}
 </section>;
}
