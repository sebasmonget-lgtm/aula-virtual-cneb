"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, FileDown, Heart, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import styles from "./period-review.module.css";
import { writeWorkspaceLocation } from "@/src/lib/workspace-location";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
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
export function PeriodBatchPanel({classroomId,periodId,kind,students,competencies,disabled,onSaved,onContinue,initialStudentId=""}:{classroomId:string;periodId:string;kind:"conclusions"|"family";students:Person[];competencies:{id:string;name:string}[];disabled:boolean;onSaved:()=>Promise<void>;onContinue?:()=>void;initialStudentId?:string}){
  const [job,setJob]=useState<Job|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const [familyStudent,setFamilyStudent]=useState(initialStudentId),[familySearch,setFamilySearch]=useState(""),[familyFilter,setFamilyFilter]=useState("all"),[familyRoster,setFamilyRoster]=useState(false);
  const [filter,setFilter]=useState("all"),[open,setOpen]=useState<string|null>(null),[items,setItems]=useState<Item[]>([]);
  const dirty=Boolean(job&&JSON.stringify(items)!==JSON.stringify(job.items));
  const allowLeave=useUnsavedWork(dirty,busy&&dirty,"Hay textos editados sin guardar. ¿Quieres descartarlos?");
  const scope={classroomId,periodId};
  const query=new URLSearchParams({...scope,kind}).toString();
  function adopt(next:Job|null){setJob(next);setItems(next?.items??[]);}
  useEffect(()=>{let active=true;api<{job:Job|null}>(`/api/period-evaluations/batches?${query}`).then(data=>{if(active)adopt(data.job);}).catch(cause=>{if(active)setError(cause.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[query]);
  async function prepare(target?:Item,editing=false){if(!allowLeave())return;setBusy(true);setError("");try{const next=await api<Job>("/api/period-evaluations/batches",{...scope,kind,...(!target?{refresh:true}:{}),...(target?{studentId:target.student_id,competencyId:target.competency_id,...(editing?{edit:true}:{regenerate:true})}:{})});adopt(next);if(target&&editing)setOpen(`${target.student_id}:${target.competency_id??"family"}`);}catch(cause){setError((cause as Error).message);}finally{setBusy(false);}}
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
  async function downloadFamily(item:Item){
    if(!item.saved_id)return;setBusy(true);setError("");
    try{
      const response=await apiFetch(`${localDatabaseApiUrl}/api/documents/family_report/${item.saved_id}/download`,{cache:"no-store"});
      if(!response.ok)throw new Error("No pudimos descargar el informe. Vuelve a intentarlo.");
      const url=URL.createObjectURL(await response.blob()),link=document.createElement("a");
      link.href=url;link.download=`Informe a familias - ${name(item.student_id).replace(/[\\/:*?"<>|]/g, "")}.docx`;
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(cause){setError((cause as Error).message);}finally{setBusy(false);}
  }
  const visible=items.filter(item=>filter==="all"||item.review_reason);
  const key=(item:Item)=>`${item.student_id}:${item.competency_id??"family"}`;
  const edit=(item:Item,field:"conclusion_text"|"introduction"|"closing_note"|"family_agreements",text:string)=>setItems(current=>current.map(row=>key(row)===key(item)?{...row,proposal:{...row.proposal,[field]:text}}:row));
  const familyStudents=Array.from(new Set([...students.map(person=>person.id),...items.map(item=>item.student_id)])).map(id=>({id}));
  const selectedPerson=familyStudents.find(person=>person.id===familyStudent)??familyStudents[0];
  const selectedItem=items.find(item=>item.student_id===selectedPerson?.id);
  const savedFamily=(item:Item|undefined)=>Boolean(item?.saved_id&&job?.status==="saved");
  const savedCount=familyStudents.filter(person=>savedFamily(items.find(item=>item.student_id===person.id))).length;
  const reviewCount=items.filter(item=>item.review_reason).length;
  const familyPeople=familyStudents.filter(person=>{
    const item=items.find(row=>row.student_id===person.id),saved=savedFamily(item);
    return name(person.id).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").includes(familySearch.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es"))&&(familyFilter==="all"||familyFilter==="review"&&Boolean(item?.review_reason)||familyFilter==="pending"&&!saved||familyFilter==="saved"&&saved);
  });
  function selectFamilyStudent(id:string){setFamilyStudent(id);setFamilyRoster(false);}
  useEffect(()=>{if(kind==="family"&&selectedPerson)writeWorkspaceLocation("Evaluar",{student:selectedPerson.id},true);},[kind,selectedPerson]);
  const familyIndex=familyPeople.findIndex(person=>person.id===selectedPerson?.id);
  const canEditFamily=!busy&&!disabled&&job?.status==="ready";
  if(kind==="family"&&loading)return <LoadingState label="Recuperando los informes guardados…"/>;
  if(kind==="family"&&error&&!job)return <div className="space-y-3"><WorkflowFeedback tone="error">{error}</WorkflowFeedback><Button variant="outline" onClick={()=>{setLoading(true);setError("");void api<{job:Job|null}>(`/api/period-evaluations/batches?${query}`).then(data=>adopt(data.job)).catch(cause=>setError(cause.message)).finally(()=>setLoading(false));}}>Reintentar carga de informes</Button></div>;
  if(kind==="family")return <section className="space-y-4" aria-label="Informes a familias">
    {loading&&<LoadingState label="Recuperando los informes guardados…"/>}
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    <div className={styles.reportSummary}>
      <div><Heart aria-hidden="true" className="size-5 text-[#77509b]"/><p><strong>Compartimos sus aprendizajes</strong><span>Revisa las conclusiones y las ideas para acompañar en casa.</span></p></div>
      <div className="min-w-48"><p className="mb-2 text-sm font-semibold tabular-nums">{savedCount} de {familyStudents.length} informes guardados</p><Progress value={familyStudents.length?savedCount/familyStudents.length*100:0} aria-label="Informes guardados"/></div>
    </div>
    {job&&["queued","running"].includes(job.status)&&<LoadingState label={`Preparando informes: ${job.completed} de ${job.total}. Puedes salir y volver; el avance queda guardado.`}/>}
    {job&&["failed","uncertain"].includes(job.status)&&<Button disabled={busy||disabled} onClick={()=>void resume()}>Reintentar solo el texto pendiente</Button>}
    {job?.status==="stale"&&<WorkflowFeedback tone="info">Las fuentes cambiaron. Prepara una versión actualizada; los informes anteriores siguen en el historial.</WorkflowFeedback>}
    <div className={styles.split}>
      <button type="button" className={styles.mobilePicker} aria-expanded={familyRoster} aria-controls="family-roster" onClick={()=>setFamilyRoster(!familyRoster)}>{selectedPerson?name(selectedPerson.id):"Seleccionar alumno"}<span>{familyRoster?"Cerrar lista":"Cambiar niño"}</span></button>
      <aside id="family-roster" aria-label="Alumnos e informes" className={`${styles.roster} ${familyRoster?styles.rosterOpen:""}`}>
        <h2 className="font-bold">Alumnos ({familyStudents.length})</h2>
        <label className="relative mt-3 block"><Search aria-hidden="true" className="absolute left-3 top-3.5 size-4 text-[#526b87]"/><Input aria-label="Buscar alumno para su informe" placeholder="Buscar niño o niña…" className="min-h-11 pl-9" value={familySearch} onChange={event=>setFamilySearch(event.target.value)}/></label>
        <div className="my-3 flex flex-wrap gap-1" aria-label="Filtrar informes">{[["all","Todos",familyStudents.length],["pending","Pendientes",familyStudents.length-savedCount],["review","Revisar",reviewCount],["saved","Guardados",savedCount]].map(([value,label,count])=><button type="button" key={value} aria-pressed={familyFilter===value} onClick={()=>setFamilyFilter(String(value))} className={`${styles.filter} ${familyFilter===value?styles.filterActive:""}`}>{label} ({count})</button>)}</div>
        <div className={styles.rosterList}>{familyPeople.map(person=>{const item=items.find(row=>row.student_id===person.id),saved=savedFamily(item);return <button key={person.id} type="button" disabled={busy} aria-pressed={selectedPerson?.id===person.id} onClick={()=>selectFamilyStudent(person.id)} className={styles.person}>
          <span aria-hidden="true" className={styles.avatar}>{name(person.id).split(/\s+/).slice(0,2).map(part=>part[0]).join("")}</span><span><strong>{name(person.id)}</strong><small className={saved?"text-[#12634e]":"text-[#88520b]"}>{saved?<CheckCircle2 className="size-3.5" aria-hidden="true"/>:<Clock3 className="size-3.5" aria-hidden="true"/>}{item?.review_reason?"Conviene revisar":saved?"Guardado":item?"Por guardar":"Por preparar"}</small></span>
        </button>;})}{!familyPeople.length&&<p className="p-3 text-sm text-[#526b87]">No hay alumnos que coincidan con estos filtros.</p>}</div>
      </aside>
      <div className={styles.detail}>
        <header className={styles.studentHeader}><div><h2 className="text-xl font-bold">{selectedPerson?name(selectedPerson.id):"Informes a familias"}</h2><p className="mt-1 text-sm text-[#526b87]">{savedFamily(selectedItem)?"Informe guardado":selectedItem?"Informe preparado · por guardar":"Informe pendiente de preparar"}</p></div>{selectedItem&&savedFamily(selectedItem)&&<Button variant="outline" disabled={busy} onClick={()=>void downloadFamily(selectedItem)}><FileDown aria-hidden="true"/>Descargar Word</Button>}</header>
        {selectedItem?<>
          {selectedItem.review_reason&&<p role="status" className="rounded-xl bg-[#fff5df] p-3 text-sm leading-relaxed text-[#80500c]">Conviene revisar: {selectedItem.review_reason}</p>}
          <section className="space-y-2"><h3 className="flex items-center gap-2 font-bold"><Sparkles className="size-4 text-[#087d96]" aria-hidden="true"/>Lo que destaca este período</h3>{canEditFamily?<Textarea aria-label="Lo que destaca este período" value={selectedItem.proposal.introduction??""} onChange={event=>edit(selectedItem,"introduction",event.target.value)}/>:<p className="whitespace-pre-wrap text-sm leading-relaxed text-[#345372]">{selectedItem.proposal.introduction}</p>}</section>
          <section className="space-y-4" aria-label="Conclusiones y recomendaciones">{selectedItem.proposal.sections?.map(section=><article key={section.competency_id} className={styles.reportSection}>
            <h3 className="font-bold leading-snug">{competencies.find(card=>card.id===section.competency_id)?.name??section.competency_id}</h3>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#31665c]">Conclusión guardada</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{section.progress_summary}</p>
            <div className="mt-4 rounded-xl bg-white/80 p-3"><h4 className="text-sm font-semibold text-[#6b4c8b]">Ideas para acompañar en casa</h4>{canEditFamily?<Textarea className="mt-2" aria-label={`Recomendaciones: ${competencies.find(card=>card.id===section.competency_id)?.name??section.competency_id}`} value={section.family_suggestions.join("\n")} onChange={event=>setItems(current=>current.map(row=>key(row)===key(selectedItem)?{...row,proposal:{...row.proposal,sections:row.proposal.sections?.map(part=>part.competency_id===section.competency_id?{...part,family_suggestions:event.target.value.split("\n").filter(text=>text.trim())}:part)}}:row))}/>:<ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">{section.family_suggestions.map((text,index)=><li key={index}>{text}</li>)}</ul>}</div>
          </article>)}</section>
          <section className="space-y-2"><h3 className="font-bold">Para seguir acompañándolo</h3>{canEditFamily?<Textarea aria-label="Para seguir acompañándolo" value={selectedItem.proposal.closing_note??""} onChange={event=>edit(selectedItem,"closing_note",event.target.value)}/>:<p className="whitespace-pre-wrap text-sm leading-relaxed text-[#345372]">{selectedItem.proposal.closing_note}</p>}</section>
          {(canEditFamily||selectedItem.proposal.family_agreements)&&<section><h3 className="mb-2 font-bold">Acuerdos con la familia <span className="font-normal text-[#526b87]">(opcional)</span></h3>{canEditFamily?<Textarea aria-label="Acuerdos con la familia" maxLength={1200} placeholder="Solo los acuerdos conversados con la familia." value={selectedItem.proposal.family_agreements??""} onChange={event=>edit(selectedItem,"family_agreements",event.target.value)}/>:<p className="whitespace-pre-wrap text-sm leading-relaxed">{selectedItem.proposal.family_agreements}</p>}</section>}
        </>:!loading&&<div className={styles.emptyReport}><Image src="/project-illustrations/parents.webp" width={160} height={130} unoptimized alt="" aria-hidden="true"/><h3 className="font-bold">Sus aprendizajes, cerca de la familia</h3><p>El informe aparecerá aquí cuando esté preparado. Utilizará las conclusiones guardadas.</p></div>}
        {selectedItem&&!disabled&&(job?.status==="ready"||job?.status==="saved")&&<div className="flex flex-wrap gap-2 border-t pt-3">{job.status==="saved"&&<Button variant="outline" disabled={busy} onClick={()=>void prepare(selectedItem,true)}>Editar nueva versión</Button>}<Button variant="ghost" disabled={busy} onClick={()=>void prepare(selectedItem)}>Regenerar este informe</Button></div>}
        <footer className={styles.actionBar}>
          <div className="flex gap-1"><Button variant="outline" aria-label="Informe anterior" disabled={busy||familyIndex<=0} onClick={()=>selectFamilyStudent(familyPeople[familyIndex-1].id)}><ArrowLeft aria-hidden="true"/></Button><Button variant="outline" aria-label="Siguiente informe" disabled={busy||familyIndex<0||familyIndex>=familyPeople.length-1} onClick={()=>selectFamilyStudent(familyPeople[familyIndex+1].id)}><ArrowRight aria-hidden="true"/></Button></div>
          <div className="flex flex-wrap gap-2">
            {job?.status==="ready"&&<AsyncButton busyLabel="Guardando…" busy={busy} disabled={disabled} onClick={()=>void save()}>Confirmar y guardar informes</AsyncButton>}
            {!loading&&(!job||job.status==="stale"||job.status==="saved"&&job.completed<job.total)&&<AsyncButton busyLabel="Preparando…" busy={busy} disabled={disabled} onClick={()=>void prepare()}>{job?"Preparar pendientes":"Generar informes"}</AsyncButton>}
            {job?.status==="saved"&&onContinue&&<Button onClick={onContinue}>Ir a Consolidado<ArrowRight aria-hidden="true"/></Button>}
          </div>
          {dirty&&<p role="status" className="w-full text-xs text-[#88520b]">Cambios sin guardar. La confirmación guarda el conjunto de informes.</p>}
        </footer>
      </div>
    </div>
  </section>;
  function renderConclusionBatch(){return <section className="space-y-4" aria-label={kind==="conclusions"?"Conclusiones en lote":"Informes a familias"}>
    <div><h2 className="text-xl font-bold">{kind==="conclusions"?"Conclusiones descriptivas":"Informe a familias"}</h2><p className="mt-1 text-sm text-[#526b87]">{kind==="conclusions"?"Ayni prepara los textos desde tus valoraciones y las evidencias. Revisa las excepciones y guarda el conjunto.":"Un informe por niño, con las mismas conclusiones guardadas y recomendaciones para su familia."}</p></div>
    {loading&&<LoadingState label="Recuperando el trabajo guardado…"/>}
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {dirty&&<p role="status" className="text-sm text-[#526b87]">Cambios sin guardar · Guarda el conjunto para conservar tus ediciones.</p>}
    {!loading&&!job&&<AsyncButton busyLabel="Preparando…" busy={busy} disabled={disabled} onClick={()=>void prepare()}>{kind==="conclusions"?"Preparar conclusiones":`Generar ${students.length} informes`}</AsyncButton>}
    {job&&<><p role="status" className="text-sm">{job.completed} de {job.total} {kind==="conclusions"?"conclusiones":"informes"} preparados · {items.filter(item=>item.review_reason).length} conviene revisar</p>
      {["queued","running"].includes(job.status)&&<LoadingState label="Preparando el siguiente texto. Puedes salir y volver; el avance queda guardado."/>}
      {["failed","uncertain"].includes(job.status)&&<Button disabled={busy||disabled} onClick={()=>void resume()}>Reintentar solo el texto pendiente</Button>}
      {job.status==="stale"&&<><WorkflowFeedback tone="info">Las valoraciones o sus fuentes cambiaron. Los textos anteriores siguen en el historial.</WorkflowFeedback><Button disabled={busy||disabled} onClick={()=>void prepare()}>Preparar textos actualizados</Button></>}
      <label className="block text-sm font-semibold">Mostrar<select className="mt-1 min-h-11 rounded-xl border bg-white px-3" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Todas</option><option value="review">Conviene revisar</option></select></label>
      <div className="divide-y divide-[#d6e5ef]">{visible.map(item=><article key={key(item)} className={`px-3 py-4 ${item.review_reason?"bg-[#fff5df]":"bg-white"}`}>
        <h3 className="font-bold">{name(item.student_id)}{item.competency_id?` · ${competencies.find(card=>card.id===item.competency_id)?.name??item.competency_id}`:""}</h3>
        <p className="mt-1 text-sm text-[#526b87]">{item.review_reason?`Conviene revisar: ${item.review_reason}`:job.status==="saved"?"Guardado":"Preparado · falta guardar"}</p>
        <p className="mt-2 text-sm leading-relaxed">{item.proposal.conclusion_text??item.proposal.introduction}</p>
        <div className="mt-2 flex flex-wrap gap-2"><Button variant="ghost" onClick={()=>setOpen(open===key(item)?null:key(item))}>{open===key(item)?"Cerrar detalle":"Revisar / editar"}</Button>{open===key(item)&&(job.status==="ready"||job.status==="saved")?<Button variant="ghost" disabled={busy||disabled} onClick={()=>void prepare(item)}>Regenerar solo este texto</Button>:null}{open===key(item)&&job.status==="saved"&&<Button variant="ghost" disabled={busy||disabled} onClick={()=>void prepare(item,true)}>Editar nueva versión</Button>}{kind==="family"&&job.status==="saved"&&item.saved_id&&<Button variant="ghost" disabled={busy} onClick={()=>void downloadFamily(item)}>Descargar Word</Button>}</div>
        {open===key(item)&&<div className="mt-3 space-y-3">{(["conclusion_text","introduction","closing_note"] as const).filter(field=>item.proposal[field]!==undefined).map(field=><label key={field} className="block text-sm font-semibold">{field==="conclusion_text"?"Conclusión":field==="introduction"?"Lo que destaca este período":"Para seguir acompañándolo"}<Textarea className="mt-1" value={item.proposal[field]} disabled={busy||disabled||job.status!=="ready"} onChange={event=>edit(item,field,event.target.value)}/></label>)}{kind==="family"&&<label className="block text-sm font-semibold">Acuerdos con la familia (opcional)<Textarea className="mt-1 font-normal" maxLength={1200} value={item.proposal.family_agreements??""} disabled={busy||disabled||job.status!=="ready"} placeholder="Escribe solo los acuerdos conversados con la familia." onChange={event=>edit(item,"family_agreements",event.target.value)}/></label>}{item.proposal.sections?.map(section=><div key={section.competency_id} className="space-y-2 text-sm"><b>{competencies.find(card=>card.id===section.competency_id)?.name}</b><p>{section.progress_summary}</p><label className="block font-semibold">Ideas para acompañarlo en casa<Textarea className="mt-1 font-normal" value={section.family_suggestions.join("\n")} disabled={busy||disabled||job.status!=="ready"} onChange={event=>setItems(current=>current.map(row=>key(row)===key(item)?{...row,proposal:{...row.proposal,sections:row.proposal.sections?.map(part=>part.competency_id===section.competency_id?{...part,family_suggestions:event.target.value.split("\n").filter(text=>text.trim())}:part)}}:row))}/></label></div>)}</div>}
      </article>)}</div>
      {job.status==="ready"&&<AsyncButton busyLabel="Guardando…" busy={busy} disabled={disabled} onClick={()=>void save()}>{kind==="conclusions"?"Guardar conclusiones":"Guardar informes"}</AsyncButton>}
      {job.status==="saved"&&<>{job.completed<job.total&&<Button disabled={busy||disabled} onClick={()=>void prepare()}>Preparar textos pendientes</Button>}<WorkflowFeedback tone="success">{kind==="conclusions"?"Conclusiones guardadas":"Informes guardados y disponibles en Word"}.</WorkflowFeedback>{onContinue&&<Button onClick={onContinue}>Continuar</Button>}</>}
    </>}
  </section>;}
  return renderConclusionBatch();
}
