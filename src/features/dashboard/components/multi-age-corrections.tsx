"use client";

import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {multiAgeAppRequest as api,multiAgeDownloadUrl} from '@/src/lib/multi-age-app-client';
import {WorkflowFeedback} from './workflow-ui';
import type {MultiAgeAppState} from '@/src/lib/multi-age-app-types';

type Student=NonNullable<MultiAgeAppState['workspace']>['students'][number];
type Observation={id:string;age:number;observed_on:string;text:string;currentAssignment:boolean;revision:number;source_revision:number;status:string;action:string|null;raw_text:string;original_text:string;criterion_text?:string;aspect_prompt_snapshot?:string;revisions:{revision:number;corrected_text:string;action:string;reason:string}[]};
type CorrectionSnapshot={text?:string;first_name?:string;last_name?:string;age?:number;birth_date?:string|null;preferred_name?:string|null};
type Correction={entity_kind:'student'|'ordinary_observation'|'diagnostic_observation';revision:number;reason:string;action:string;before_snapshot:CorrectionSnapshot;after_snapshot:CorrectionSnapshot};
type History={studentFingerprint:string;assignmentId:string;ordinary:Observation[];diagnostic:Observation[];events:Correction[];
  assignments:{id:string;revision:number;age:number;status:string;reason:string|null}[];
  reviews:{id:string;version:number;details:{correction_reason?:string;findings:{competency_id:string;teacher_reading:string}[]}}[];
  familyContexts:{id:string;version:number;details:{family_text:string;correction_reason?:string}}[]};
type Props={student:Student;ages:number[];revision:object;run:(path:string,input:Record<string,unknown>)=>Promise<boolean>};
const value=(data:FormData,key:string)=>String(data.get(key)??'').trim();
const labels={student:'Matrícula',ordinary_observation:'Observación de actividad',diagnostic_observation:'Observación diagnóstica'};

function Reason(){return <label className="block text-sm font-semibold">Motivo de la corrección<Textarea className="mt-1" name="reason" required minLength={3} maxLength={500}/></label>;}

export function MultiAgeCorrections({student:s,ages,revision,run}:Props){
  const [open,setOpen]=useState(false),[retry,setRetry]=useState(0),root=useRef<HTMLDivElement>(null);
  const [result,setResult]=useState<{revision:object;retry:number;data:History|null;error:string}|null>(null);
  const current=result?.revision===revision&&result?.retry===retry?result:null,data=current?.data,error=current?.error;
  useEffect(()=>{
    if(!open)return;let live=true;
    api<History>(`/corrections/history?studentId=${encodeURIComponent(s.id)}`).then(data=>{if(live)setResult({revision,retry,data,error:''});})
      .catch(cause=>{if(live)setResult({revision,retry,data:null,error:cause instanceof Error?cause.message:'No se pudo consultar el historial.'});});
    return ()=>{live=false;};
  },[open,revision,retry,s.id]);
  async function submit(event:FormEvent<HTMLFormElement>,path:string,input:Record<string,unknown>){
    event.preventDefault();const form=event.currentTarget,fields=new FormData(form);
    if(await run(path,{teacherConfirmed:true,studentId:s.id,reason:value(fields,'reason'),...input,
      ...(path.endsWith('/student')?{firstName:value(fields,'first'),lastName:value(fields,'last'),preferredName:value(fields,'preferred'),birthDate:value(fields,'birth'),age:Number(fields.get('age')),impactsAcknowledged:fields.get('impacts')==='on'}:
        {action:value(fields,'action'),correctedText:value(fields,'text'),observationText:value(fields,'text'),criterionConfirmed:fields.get('impacts')==='on',impactsAcknowledged:fields.get('impacts')==='on'})}))form.dataset.dirty='false';
  }
  return <div ref={root} className="mt-3 min-w-0" onChangeCapture={event=>{const target=event.target;if(target instanceof HTMLInputElement||target instanceof HTMLSelectElement||target instanceof HTMLTextAreaElement){const form=target.closest('form');if(form)form.dataset.dirty='true';}}}>
    <Button variant="outline" aria-expanded={open} onClick={()=>{
      if(open&&root.current?.querySelector('form[data-dirty="true"]')&&!window.confirm('Hay una corrección sin guardar. ¿Quieres descartarla y cerrar?'))return;
      setOpen(v=>!v);
    }}>{open?'Cerrar correcciones e historial':'Corregir y ver historial'}</Button>
    {open&&<div className="mt-4 space-y-5">
      {!data&&!error&&<p role="status">Consultando registros y versiones…</p>}
      {error&&<WorkflowFeedback tone="error">{error} <Button variant="outline" onClick={()=>setRetry(v=>v+1)}>Reintentar</Button></WorkflowFeedback>}
      {data&&<>
        <details><summary className="min-h-11 cursor-pointer py-2 font-bold">Corregir matrícula</summary>
          <p className="my-3 text-sm">Un cumpleaños no cambia el grupo curricular. Si corriges la edad, las observaciones anteriores conservan su grupo: registra nuevas actuaciones con los criterios de la edad correcta.</p>
          <form key={data.studentFingerprint} className="space-y-4" onSubmit={event=>void submit(event,'/corrections/student',{expectedAssignmentId:data.assignmentId,expectedStudentFingerprint:data.studentFingerprint})}>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Nombres<Input name="first" defaultValue={s.first_name} required maxLength={80}/></label><label className="text-sm font-semibold">Apellidos<Input name="last" defaultValue={s.last_name} required maxLength={80}/></label>
              <label className="text-sm font-semibold">Nombre habitual (opcional)<Input name="preferred" defaultValue={s.preferred_name??''} maxLength={80}/></label><label className="text-sm font-semibold">Fecha de nacimiento (opcional)<Input type="date" name="birth" defaultValue={s.birth_date??''}/></label>
              <label className="text-sm font-semibold">Grupo curricular<select name="age" defaultValue={s.age} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3" required>{ages.map(age=><option value={age} key={age}>{age} años</option>)}</select></label></div>
            <Reason/>
            <label className="flex items-start gap-3 text-sm"><input name="impacts" className="mt-1 size-4" type="checkbox" required/>He revisado los datos. Se conservarán las versiones anteriores; revisaré el diagnóstico y, si cambia el grupo, las valoraciones. Los informes anteriores quedarán en el historial.</label>
            <p className="text-sm text-[#526b87]">Reabre los bimestres cerrados de este año en Consolidado antes de corregir la matrícula.</p>
            <Button type="submit">Guardar corrección de matrícula</Button>
          </form>
        </details>
        {(['ordinary','diagnostic'] as const).map(kind=><details key={kind}><summary className="min-h-11 cursor-pointer py-2 font-bold">{kind==='ordinary'?'Observaciones de actividades':'Observaciones diagnósticas'} ({data[kind].length})</summary>
          {!data[kind].length&&<p className="py-3">Todavía no hay registros de este tipo.</p>}
          {data[kind].map(row=>{const withdrawn=kind==='ordinary'?row.status==='voided':row.action==='void',original=kind==='ordinary'?row.raw_text:row.original_text;
            return <article key={`${row.id}:${row.source_revision??row.revision}`} className="space-y-3 border-b py-5 last:border-b-0">
              <h4 className="font-bold">{row.observed_on} · Grupo registrado: {row.age} años{withdrawn?' · Retirado':!row.currentAssignment?' · Matrícula anterior':''}</h4>
              <p className="text-sm text-[#526b87]">{row.criterion_text??row.aspect_prompt_snapshot}</p><p className="whitespace-pre-wrap"><strong>Original:</strong> {original}</p>
              {original!==row.text&&<p className="whitespace-pre-wrap"><strong>Texto corregido:</strong> {row.text}</p>}
              {!row.currentAssignment&&<p className="text-sm">Se conserva como histórico; no se usa para valorar al niño en su grupo actual.</p>}
              {!withdrawn&&<details><summary className="min-h-11 cursor-pointer py-2 font-semibold">Corregir o retirar este registro</summary>
                <form className="space-y-4" onSubmit={event=>void submit(event,`/corrections/${kind}`,{observationId:row.id,expectedAssignmentId:data.assignmentId,expectedRevision:kind==='ordinary'?row.source_revision:row.revision})}>
                  <label className="block text-sm font-semibold">Acción<select name="action" defaultValue={row.currentAssignment?'correct':'void'} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3">{row.currentAssignment&&<option value="correct">Corregir el texto</option>}<option value="void">Retirar del uso pedagógico y conservar el original</option></select></label>
                  <label className="block text-sm font-semibold">Qué hizo o dijo<Textarea name="text" defaultValue={row.text} maxLength={4000} required className="mt-1"/></label><Reason/>
                  <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="impacts" required className="mt-1 size-4"/>{kind==='ordinary'?'He revisado el criterio. Las valoraciones y conclusiones afectadas pasarán al historial y deberé confirmarlas nuevamente con las fuentes vigentes.':'He revisado la fuente. El diagnóstico y Mi año necesitarán revisión; no se asignarán notas.'}</label>
                  <Button variant="outline" type="submit">Guardar corrección del registro</Button>
                </form>
              </details>}
              {kind==='ordinary'&&row.revisions.length>0&&<ul className="space-y-2 text-sm">{row.revisions.map(r=><li key={r.revision}>Versión {r.revision} · {r.action==='void'?'Retirado':r.corrected_text} · {r.reason}</li>)}</ul>}
            </article>;
          })}
        </details>)}
        <details><summary className="min-h-11 cursor-pointer py-2 font-bold">Versiones de matrícula y diagnóstico</summary>
          <ul className="space-y-3 py-3 text-sm">{data.assignments.map(a=><li key={a.id}>Grupo versión {a.revision}: {a.age} años · {a.status==='active'?'Vigente':'Anterior'}{a.reason?` · ${a.reason}`:''}</li>)}</ul>
          {data.reviews.map(r=><section key={r.id} className="space-y-2 border-b py-4"><h4 className="font-semibold">Diagnóstico versión {r.version}</h4>{r.details.correction_reason&&<p className="text-sm">Motivo: {r.details.correction_reason}</p>}{r.details.findings.map(f=><p className="whitespace-pre-wrap" key={f.competency_id}>{f.teacher_reading}</p>)}<Button asChild variant="outline"><a href={multiAgeDownloadUrl(`/documents/diagnostic_student_review/${r.id}.docx`)}>Descargar diagnóstico v{r.version}</a></Button></section>)}
          {data.familyContexts.map(f=><section key={f.id} className="space-y-2 py-3"><h4 className="text-sm font-bold">Contexto familiar versión {f.version}</h4><p className="whitespace-pre-wrap">{f.details.family_text}</p>{f.details.correction_reason&&<p className="text-sm">Motivo: {f.details.correction_reason}</p>}</section>)}
        </details>
        <details><summary className="min-h-11 cursor-pointer py-2 font-bold">Motivos y cambios conservados ({data.events.length})</summary>
          {!data.events.length&&<p>No hay correcciones registradas.</p>}<ul className="space-y-4 py-3 text-sm">{data.events.map((e,i)=><li key={i} className="space-y-1"><p className="font-bold">{labels[e.entity_kind]} · Revisión {e.revision} · {e.action==='void'?'Retiro':'Corrección'}</p><p>{e.reason}</p>
            {e.entity_kind==='student'?<>{([['Antes',e.before_snapshot],['Después',e.after_snapshot]] as const).map(([label,snapshot])=><p key={label}>{label}: {snapshot.first_name} {snapshot.last_name} · {snapshot.age} años · Nacimiento: {snapshot.birth_date??'Sin registrar'}{snapshot.preferred_name?` · Nombre habitual: ${snapshot.preferred_name}`:''}</p>)}</>:<><p className="whitespace-pre-wrap">Antes: {e.before_snapshot.text}</p><p className="whitespace-pre-wrap">Después: {e.action==='void'?'Retirado del uso pedagógico; original conservado.':e.after_snapshot.text}</p></>}</li>)}</ul>
        </details>
      </>}
    </div>}
  </div>;
}
