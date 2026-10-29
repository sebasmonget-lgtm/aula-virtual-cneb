"use client";
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {multiAgeAppRequest as api} from '@/src/lib/multi-age-app-client';
import type {ActivityBlueprint,MultiAgeProject} from '@/src/lib/multi-age-app-types';
import {WorkflowFeedback} from './workflow-ui';

type Edition={id:string;version:number;title:string;purpose:string;reason:string|null;details:{common_sequence:ActivityBlueprint['commonSequence'];criteria_families:ActivityBlueprint['criteriaFamilies']}};
type Context={project:{title:string;purpose:string;details:{criteria_families:ActivityBlueprint['criteriaFamilies']}};version:number;commonSequence:ActivityBlueprint['commonSequence'];fingerprint:string;sourceFingerprint:string;history:Edition[]};
type Props={classroomId:string;project:MultiAgeProject;run:(path:string,input:Record<string,unknown>)=>Promise<boolean>};
const read=(data:FormData,key:string)=>String(data.get(key)??'').trim();
function TextField({label,name,value,large=false,max=1000}:{label:string;name:string;value:string;large?:boolean;max?:number}){
 return <label className="block text-sm font-semibold">{label}{large?<Textarea className="mt-1" name={name} defaultValue={value} required maxLength={max}/>:<Input className="mt-1" name={name} defaultValue={value} required maxLength={max}/>}</label>;
}
export function MultiAgeProjectEdit({classroomId,project,run}:Props){
 const [open,setOpen]=useState(false),[retry,setRetry]=useState(0),root=useRef<HTMLDivElement>(null);
 const [result,setResult]=useState<{project:MultiAgeProject;retry:number;data:Context|null;error:string}|null>(null);
 const current=result?.project===project&&result?.retry===retry?result:null,data=current?.data,error=current?.error;
 useEffect(()=>{if(!open)return;let live=true;api<Context>(`/projects/edit?classroomId=${encodeURIComponent(classroomId)}&projectId=${encodeURIComponent(project.id)}`)
  .then(data=>{if(live)setResult({project,retry,data,error:''});}).catch(cause=>{if(live)setResult({project,retry,data:null,error:cause instanceof Error?cause.message:'No se pudo consultar el proyecto.'});});return()=>{live=false;};
 },[open,retry,project,classroomId]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!data)return;const form=event.currentTarget,fields=new FormData(form);
  const blueprint={title:read(fields,'title'),purpose:read(fields,'purpose'),commonSequence:{opening:read(fields,'opening'),development:read(fields,'development'),closure:read(fields,'closure')},
   criteriaFamilies:data.project.details.criteria_families.map((f,i)=>({competency_id:f.competency_id,variants:f.variants.map((v,j)=>({...v,criterion_text:read(fields,`criterion-${i}-${j}`),expected_evidence:read(fields,`evidence-${i}-${j}`)}))}))};
  // The read DTO also contains stable criterion identities; only editable contract fields are sent.
  blueprint.criteriaFamilies=blueprint.criteriaFamilies.map(f=>({...f,variants:f.variants.map(v=>({curricular_age:v.curricular_age,criterion_text:v.criterion_text,expected_evidence:v.expected_evidence,observation_moments:v.observation_moments,official_performance_refs:v.official_performance_refs}))}));
  if(await run('/projects/edit',{teacherConfirmed:true,classroomId,projectId:project.id,expectedSourceFingerprint:data.sourceFingerprint,expectedProjectFingerprint:data.fingerprint,blueprint,reason:read(fields,'reason'),preservedActivitiesAcknowledged:fields.get('preserved')==='on'}))form.dataset.dirty='false';
 }
 return <div ref={root} className="space-y-4"><Button variant="outline" aria-expanded={open} onClick={()=>{
  if(open&&root.current?.querySelector('form[data-dirty="true"]')&&!window.confirm('Hay una edición sin guardar. ¿Quieres descartarla y cerrar?'))return;setOpen(v=>!v);
 }}>Editar proyecto y ver versiones</Button>
 {open&&<div className="space-y-4">{!data&&!error&&<p role="status">Consultando el proyecto confirmado…</p>}
  {error&&<WorkflowFeedback tone="error">{error} <Button variant="outline" onClick={()=>setRetry(v=>v+1)}>Reintentar</Button></WorkflowFeedback>}
  {data&&<><p className="text-sm">Proyecto versión {data.version}. La edición se aplicará a las próximas actividades. Las {project.activities.length} actividades preparadas conservan sus guías, criterios, fechas y registros.</p>
   <form key={data.sourceFingerprint} className="space-y-4" onSubmit={event=>void submit(event)} onChangeCapture={event=>{event.currentTarget.dataset.dirty='true';}}>
    <TextField name="title" label="Título del proyecto" value={data.project.title} max={180}/><TextField name="purpose" label="Propósito compartido" value={data.project.purpose} large/>
    {(['opening','development','closure'] as const).map((key,i)=><TextField key={key} name={key} label={['Inicio compartido','Organización y desarrollo con una profesora','Cierre compartido'][i]} value={data.commonSequence[key]} large max={2400}/>)}
    {data.project.details.criteria_families.map((f,i)=><section key={f.competency_id} className="space-y-4"><h3 className="font-bold">Criterios de observación · {f.competency_id}</h3>{f.variants.map((v,j)=><div key={v.curricular_age} className="space-y-3"><h4 className="font-semibold">{v.curricular_age} años</h4><TextField name={`criterion-${i}-${j}`} label="Qué observaré" value={v.criterion_text} large/><TextField name={`evidence-${i}-${j}`} label="Qué podría registrar" value={v.expected_evidence} large/><p className="text-sm text-[#526b87]">Se conservan los referentes confirmados de esta edad y los momentos para observar.</p></div>)}</section>)}
    <TextField name="reason" label="Motivo de la edición" value="" large max={500}/><label className="flex items-start gap-3 text-sm"><input name="preserved" type="checkbox" required className="mt-1 size-4"/>He revisado los criterios de cada edad. Esta versión orientará nuevas actividades; las ya preparadas y sus registros se conservarán.</label>
    <Button type="submit">Confirmar nueva versión del proyecto</Button>
   </form>
   <details><summary className="min-h-11 cursor-pointer py-2 font-bold">Historial del proyecto ({data.history.length})</summary>{data.history.map(v=><section key={v.id} className="space-y-3 border-b py-4"><h3 className="font-bold">Versión {v.version} · {v.title}</h3><p>{v.purpose}</p>{v.reason&&<p className="text-sm">Motivo: {v.reason}</p>}<details><summary className="min-h-11 cursor-pointer py-2">Ver organización y criterios por edad</summary>{Object.values(v.details.common_sequence??{}).map((text,i)=><p className="my-2 whitespace-pre-wrap" key={i}>{text}</p>)}{v.details.criteria_families.map(f=><div key={f.competency_id}>{f.variants.map(item=><p key={item.curricular_age} className="my-3"><strong>{item.curricular_age} años:</strong> {item.criterion_text}<br/>{item.expected_evidence}</p>)}</div>)}</details></section>)}</details>
  </>}
 </div>}</div>;
}
