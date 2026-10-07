"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { AsyncButton, LoadingState, WorkflowFeedback } from "./workflow-ui";

type Proposal={conclusion_text?:string;introduction?:string;closing_note?:string;family_agreements?:string;sections?:{competency_id:string;progress_summary:string;family_suggestions:string[]}[]};
type Item={student_id:string;competency_id:string|null;review_reason:string|null;proposal:Proposal;saved_id?:string};
type Job={id:string;kind:string;status:string;total:number;completed:number;error:string|null;revision:number;items:Item[]};
type Person={id:string;first_name:string;last_name:string;preferred_name:string|null};
async function api<T>(path:string,body?:unknown):Promise<T>{
  const response=await apiFetch(localDatabaseApiUrl+path,{method:body===undefined?"GET":"POST",cache:"no-store",...(body===undefined?{}:{headers:{"content-type":"application/json"},body:JSON.stringify(body)})});
  const data=await response.json() as T & {message?:string;error?:string};if(!response.ok)throw new Error(data.message??data.error??"No pudimos completar la preparación.");return data;
}
export function PeriodBatchPanel({classroomId,periodId,kind,students,competencies,disabled,onSaved,onContinue}:{classroomId:string;periodId:string;kind:"conclusions"|"family";students:Person[];competencies:{id:string;name:string}[];disabled:boolean;onSaved:()=>Promise<void>;onContinue?:()=>void}){
  const [job,setJob]=useState<Job|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const [filter,setFilter]=useState("all"),[open,setOpen]=useState<string|null>(null),[items,setItems]=useState<Item[]>([]);
  const scope={classroomId,periodId};
  const query=new URLSearchParams({...scope,kind}).toString();
  function adopt(next:Job|null){setJob(next);setItems(next?.items??[]);}
  useEffect(()=>{let active=true;api<{job:Job|null}>(`/api/period-evaluations/batches?${query}`).then(data=>{if(active)adopt(data.job);}).catch(cause=>{if(active)setError(cause.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[query]);
  async function prepare(target?:Item,editing=false){setBusy(true);setError("");try{const next=await api<Job>("/api/period-evaluations/batches",{...scope,kind,...(!target?{refresh:true}:{}),...(target?{studentId:target.student_id,competencyId:target.competency_id,...(editing?{edit:true}:{regenerate:true})}:{})});adopt(next);if(target&&editing)setOpen(`${target.student_id}:${target.competency_id??"family"}`);}catch(cause){setError((cause as Error).message);}finally{setBusy(false);}}
  // Sequential requests, no detached work or automatic POST retry after a transport error.
  useEffect(()=>{
    if(!job||job.status!=="queued"||busy||disabled)return;
    let active=true;
    api<Job>(`/api/period-evaluations/batches/${job.id}/run`,scope).then(next=>{if(active)adopt(next);}).catch(async cause=>{
      if(!active)return;setError(cause.message);
      try{const next=await api<Job>(`/api/period-evaluations/batches/${job.id}?${query}`);if(active)adopt(next);}catch{if(active)setError("No pudimos recuperar el avance. Recarga esta pantalla para consultar el trabajo guardado.");}
    });return()=>{active=false;};
  // Scope changes remount the panel in its parent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[job?.id,job?.revision,job?.status,busy,disabled]);
  useEffect(()=>{
    if(job?.status!=="running")return;
    let active=true;
    const timer=setTimeout(()=>{api<Job>(`/api/period-evaluations/batches/${job.id}?${query}`).then(next=>{if(active)adopt(next);}).catch(cause=>{if(active)setError(cause.message);});},2500);
    return()=>{active=false;clearTimeout(timer);};
  },[job,query]);
  async function resume(){if(!job)return;setBusy(true);setError("");try{adopt(await api<Job>(`/api/period-evaluations/batches/${job.id}/run`,{...scope,retryUncertain:true}));}catch(cause){setError((cause as Error).message);}finally{setBusy(false);}}
  async function save(){if(!job)return;setBusy(true);setError("");try{adopt(await api<Job>(`/api/period-evaluations/batches/${job.id}/save`,{...scope,expectedRevision:job.revision,items}));await onSaved();adopt((await api<{job:Job|null}>(`/api/period-evaluations/batches?${query}`)).job);}catch(cause){setError((cause as Error).message);}finally{setBusy(false);}}
  const name=(id:string)=>{const person=students.find(item=>item.id===id);return person?`${person.preferred_name||person.first_name} ${person.last_name}`:"Niño del aula";};
  const visible=items.filter(item=>filter==="all"||item.review_reason);
  const key=(item:Item)=>`${item.student_id}:${item.competency_id??"family"}`;
  const edit=(item:Item,field:"conclusion_text"|"introduction"|"closing_note"|"family_agreements",text:string)=>setItems(current=>current.map(row=>key(row)===key(item)?{...row,proposal:{...row.proposal,[field]:text}}:row));
  return <section className="space-y-4" aria-label={kind==="conclusions"?"Conclusiones en lote":"Informes a familias"}>
    <div><h2 className="text-xl font-bold">{kind==="conclusions"?"Conclusiones descriptivas":"Informe a familias"}</h2><p className="mt-1 text-sm text-[#526b87]">{kind==="conclusions"?"Ayni prepara los textos desde tus valoraciones y las evidencias. Revisa las excepciones y guarda el conjunto.":"Un informe por niño, con las mismas conclusiones guardadas y recomendaciones para su familia."}</p></div>
    {loading&&<LoadingState label="Recuperando el trabajo guardado…"/>}
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {!loading&&!job&&<AsyncButton busyLabel="Preparando…" busy={busy} disabled={disabled} onClick={()=>void prepare()}>{kind==="conclusions"?"Preparar conclusiones":`Generar ${students.length} informes`}</AsyncButton>}
    {job&&<><p role="status" className="text-sm">{job.completed} de {job.total} {kind==="conclusions"?"conclusiones":"informes"} preparados · {items.filter(item=>item.review_reason).length} conviene revisar</p>
      {["queued","running"].includes(job.status)&&<LoadingState label="Preparando el siguiente texto. Puedes salir y volver; el avance queda guardado."/>}
      {["failed","uncertain"].includes(job.status)&&<Button disabled={busy||disabled} onClick={()=>void resume()}>Reintentar solo el texto pendiente</Button>}
      <label className="block text-sm font-semibold">Mostrar<select className="mt-1 min-h-11 rounded-xl border bg-white px-3" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Todas</option><option value="review">Conviene revisar</option></select></label>
      <div className="divide-y divide-[#d6e5ef]">{visible.map(item=><article key={key(item)} className={`px-3 py-4 ${item.review_reason?"bg-[#fff5df]":"bg-white"}`}>
        <h3 className="font-bold">{name(item.student_id)}{item.competency_id?` · ${competencies.find(card=>card.id===item.competency_id)?.name??item.competency_id}`:""}</h3>
        <p className="mt-1 text-sm text-[#526b87]">{item.review_reason?`Conviene revisar: ${item.review_reason}`:"Listo"}</p>
        <p className="mt-2 text-sm leading-relaxed">{item.proposal.conclusion_text??item.proposal.introduction}</p>
        <div className="mt-2 flex flex-wrap gap-2"><Button variant="ghost" onClick={()=>setOpen(open===key(item)?null:key(item))}>{open===key(item)?"Cerrar detalle":"Revisar / editar"}</Button>{job.status==="ready"||job.status==="saved"?<Button variant="ghost" disabled={busy||disabled} onClick={()=>void prepare(item)}>Regenerar solo este texto</Button>:null}{job.status==="saved"&&<Button variant="ghost" disabled={busy||disabled} onClick={()=>void prepare(item,true)}>Editar nueva versión</Button>}{kind==="family"&&job.status==="saved"&&item.saved_id&&<a className="inline-flex min-h-11 items-center px-3 font-semibold text-[#07576c] underline" href={`${localDatabaseApiUrl}/api/documents/family_report/${item.saved_id}/download`} download>Descargar Word</a>}</div>
        {open===key(item)&&<div className="mt-3 space-y-3">{(["conclusion_text","introduction","closing_note"] as const).filter(field=>item.proposal[field]!==undefined).map(field=><label key={field} className="block text-sm font-semibold">{field==="conclusion_text"?"Conclusión":field==="introduction"?"Lo que destaca este bimestre":"Para seguir acompañándolo"}<Textarea className="mt-1" value={item.proposal[field]} disabled={busy||disabled||job.status!=="ready"} onChange={event=>edit(item,field,event.target.value)}/></label>)}{kind==="family"&&<label className="block text-sm font-semibold">Acuerdos con la familia (opcional)<Textarea className="mt-1 font-normal" maxLength={1200} value={item.proposal.family_agreements??""} disabled={busy||disabled||job.status!=="ready"} placeholder="Escribe solo los acuerdos conversados con la familia." onChange={event=>edit(item,"family_agreements",event.target.value)}/></label>}{item.proposal.sections?.map(section=><div key={section.competency_id} className="space-y-2 text-sm"><b>{competencies.find(card=>card.id===section.competency_id)?.name}</b><p>{section.progress_summary}</p><label className="block font-semibold">Ideas para acompañarlo en casa<Textarea className="mt-1 font-normal" value={section.family_suggestions.join("\n")} disabled={busy||disabled||job.status!=="ready"} onChange={event=>setItems(current=>current.map(row=>key(row)===key(item)?{...row,proposal:{...row.proposal,sections:row.proposal.sections?.map(part=>part.competency_id===section.competency_id?{...part,family_suggestions:event.target.value.split("\n").filter(text=>text.trim())}:part)}}:row))}/></label></div>)}</div>}
      </article>)}</div>
      {job.status==="ready"&&<AsyncButton busyLabel="Guardando…" busy={busy} disabled={disabled} onClick={()=>void save()}>{kind==="conclusions"?"Guardar conclusiones y continuar":"Guardar informes"}</AsyncButton>}
      {job.status==="saved"&&<>{job.completed<job.total&&<Button disabled={busy||disabled} onClick={()=>void prepare()}>Preparar textos pendientes</Button>}<WorkflowFeedback tone="success">{kind==="conclusions"?"Conclusiones guardadas":"Informes guardados y disponibles en Word"}.</WorkflowFeedback>{onContinue&&<Button onClick={onContinue}>Continuar</Button>}</>}
    </>}
  </section>;
}
