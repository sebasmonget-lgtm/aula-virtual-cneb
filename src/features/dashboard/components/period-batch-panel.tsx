"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, FileDown, FileText, Heart, Search, Sparkles } from "lucide-react";
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
import {CompetencyIdentity,competencyTheme} from './competency-identity';
import batchStyles from './period-batch.module.css';
import gradeStyles from './achievement-colors.module.css';
const gradeLabels:Record<string,string>={AD:'Destacado',A:'Esperado',B:'En proceso',C:'En inicio'};
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {familyReportSectionForReader} from "@/src/lib/family-report-presentation.mjs";
import {FamilyReportAttendance} from './family-report-attendance';
import {evaluationConfirmationSeconds} from '@/src/lib/evaluation-preparation.mjs';

type FamilyWording={version:1;source_fingerprint:string;progress_summary:string;examples:string[];support_or_conditions:string[];next_steps:string[]};
type Proposal={conclusion_text?:string;introduction?:string;closing_note?:string;family_agreements?:string;sections?:{competency_id:string;progress_summary:string;family_suggestions:string[];family_wording?:FamilyWording}[]};
type Item={student_id:string;competency_id:string|null;review_reason:string|null;proposal:Proposal;saved_id?:string;grade_informed?:boolean;plain_language?:boolean;uses_confirmed_conclusions?:boolean;achievement_levels?:{competency_id:string;achievement_level:string}[]};
type Job={id:string;kind:string;status:string;total:number;completed:number;error:string|null;revision:number;items:Item[]};
type Person={id:string;first_name:string;last_name:string;preferred_name:string|null};
async function api<T>(path:string,body?:unknown):Promise<T>{
  const response=await apiFetch(localDatabaseApiUrl+path,{method:body===undefined?"GET":"POST",cache:"no-store",...(body===undefined?{}:{headers:{"content-type":"application/json"},body:JSON.stringify(body)})});
  const data=await response.json() as T & {message?:string;error?:string};if(!response.ok)throw new Error(data.message??data.error??"No pudimos completar la preparación.");return data;
}
export function PeriodBatchPanel({classroomId,periodId,kind,students,competencies,disabled,onSaved,onContinue,initialStudentId="",pendingValuations=0,canPrepare=true,collapsible=false}:{classroomId:string;periodId:string;kind:"conclusions"|"family";students:Person[];competencies:{id:string;name:string}[];disabled:boolean;onSaved:()=>Promise<void>;onContinue?:()=>void;initialStudentId?:string;pendingValuations?:number;canPrepare?:boolean;collapsible?:boolean}){
  const [job,setJob]=useState<Job|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const [familyStudent,setFamilyStudent]=useState(initialStudentId),[familySearch,setFamilySearch]=useState(""),[familyFilter,setFamilyFilter]=useState("all"),[familyRoster,setFamilyRoster]=useState(false);
  const [filter,setFilter]=useState("all"),[open,setOpen]=useState<string|null>(null),[items,setItems]=useState<Item[]>([]);
  const [page,setPage]=useState(1),[full,setFull]=useState<string|null>(null),[expanded,setExpanded]=useState(!collapsible);
  const conclusionPanel=useRef<HTMLElement|null>(null);
  const [confirmIncomplete,setConfirmIncomplete]=useState(false),[seconds,setSeconds]=useState(5),[pendingTarget,setPendingTarget]=useState<Item|undefined>();
  const dirty=Boolean(job&&JSON.stringify(items)!==JSON.stringify(job.items));
  const allowLeave=useUnsavedWork(dirty,busy&&dirty,"Hay textos editados sin guardar. ¿Quieres descartarlos?");
  const scope={classroomId,periodId};
  const query=new URLSearchParams({...scope,kind}).toString();
  function adopt(next:Job|null){setJob(next);setItems(next?.items??[]);}
  useEffect(()=>{let active=true;api<{job:Job|null}>(`/api/period-evaluations/batches?${query}`).then(data=>{if(active)adopt(data.job);}).catch(cause=>{if(active)setError(cause.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[query]);
  useEffect(()=>{if(!confirmIncomplete)return;const deadline=Date.now()+5000;const timer=window.setInterval(()=>setSeconds(evaluationConfirmationSeconds(deadline)),200);return()=>window.clearInterval(timer);},[confirmIncomplete]);
  function requestPrepare(target?:Item,editing=false){setExpanded(true);if(kind==='conclusions'&&pendingValuations>0&&!editing){setPendingTarget(target);setSeconds(5);setConfirmIncomplete(true);}else void prepare(target,editing,editing);}
  async function prepare(target?:Item,editing=false,acknowledgeIncomplete=false){if(!allowLeave())return;setConfirmIncomplete(false);setBusy(true);setError("");try{const next=await api<Job>("/api/period-evaluations/batches",{...scope,kind,acknowledgeIncomplete,...(!target?{refresh:true}:{}),...(target?{studentId:target.student_id,competencyId:target.competency_id,...(editing?{edit:true}:{regenerate:true})}:{})});adopt(next);if(target){setFilter('all');setPage(1);}if(target&&editing)setOpen(`${target.student_id}:${target.competency_id??"family"}`);}catch(cause){setError((cause as Error).message);}finally{setBusy(false);}}
  // Requests advance bounded parallel groups; transport errors are reconciled with GET.
  useEffect(()=>{
    if(!job||job.status!=="queued"||busy||disabled)return;
    let active=true;
    api<Job>(`/api/period-evaluations/batches/${job.id}/run`,scope).then(next=>{if(active)adopt(next);}).catch(async cause=>{
      if(!active)return;setError(cause.message);
      try{const next=await api<Job>(`/api/period-evaluations/batches/${job.id}?${query}`);if(active){adopt(next);if(['queued','running','ready'].includes(next.status))setError('');}}catch{if(active)setError("No pudimos recuperar el avance. Recarga esta pantalla para consultar el trabajo guardado.");}
    });return()=>{active=false;};
  // Scope changes remount the panel in its parent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[job?.id,job?.revision,job?.status,busy,disabled]);
  useEffect(()=>{
    if(job?.status!=="running")return;
    let active=true,checking=false;
    const timer=window.setInterval(()=>{if(checking)return;checking=true;void api<Job>(`/api/period-evaluations/batches/${job.id}?${query}`).then(next=>{if(active)adopt(next);}).catch(cause=>{if(active)setError(cause.message);}).finally(()=>{checking=false;});},2500);
    return()=>{active=false;window.clearInterval(timer);};
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
  const itemState=(item:Item)=>item.saved_id?'saved':item.review_reason?'review':'ready';
  const studentOrder=new Map(students.map((student,index)=>[student.id,index])),competencyOrder=new Map(competencies.map((competency,index)=>[competency.id,index]));
  // Keep the open editor mounted when a saved text becomes an unsaved revision.
  const visible=items.filter(item=>filter==="all"||itemState(item)===filter||filter==='saved'&&open===`${item.student_id}:${item.competency_id??'family'}`).sort((a,b)=>(studentOrder.get(a.student_id)??students.length)-(studentOrder.get(b.student_id)??students.length)||(competencyOrder.get(a.competency_id??'')??competencies.length)-(competencyOrder.get(b.competency_id??'')??competencies.length));
  const pages=Math.max(1,Math.ceil(visible.length/10)),currentPage=Math.min(page,pages),pageItems=visible.slice((currentPage-1)*10,currentPage*10);
  function turnPage(next:number){setPage(next);conclusionPanel.current?.scrollIntoView({block:'start',behavior:'auto'});}
  const key=(item:Item)=>`${item.student_id}:${item.competency_id??"family"}`;
  const edit=(item:Item,field:"conclusion_text"|"introduction"|"closing_note"|"family_agreements",text:string)=>setItems(current=>current.map(row=>{
    if(key(row)!==key(item))return row;
    const proposal={...row.proposal,[field]:text},original=job?.items.find(saved=>key(saved)===key(row));
    return {...row,proposal,...(kind==='conclusions'?{saved_id:JSON.stringify(proposal)===JSON.stringify(original?.proposal)?original?.saved_id:undefined}:{})};
  }));
  const familyStudents=Array.from(new Set([...students.map(person=>person.id),...items.map(item=>item.student_id)])).map(id=>({id}));
  const selectedPerson=familyStudents.find(person=>person.id===familyStudent)??familyStudents[0];
  const selectedItem=items.find(item=>item.student_id===selectedPerson?.id);
  const savedFamily=(item:Item|undefined)=>Boolean(item?.saved_id&&job?.status==="saved");
  const savedCount=familyStudents.filter(person=>savedFamily(items.find(item=>item.student_id===person.id))).length;
  const reviewCount=items.filter(item=>!item.saved_id&&item.review_reason).length;
  const generating=Boolean(job&&['queued','running'].includes(job.status));
  const generationProgress=generating&&<div className={batchStyles.generation} role="status"><LoadingState label={`Preparando ${kind==='family'?'informes':'conclusiones'}: ${job!.completed} de ${job!.total}`}/><Progress value={job!.total?job!.completed/job!.total*100:0} aria-label={kind==='family'?'Informes preparados':'Conclusiones preparadas'}/><p>El avance se guarda. Puedes salir y volver.</p></div>;
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
    {generationProgress}
    {job?.error&&<WorkflowFeedback tone="info">{job.error}</WorkflowFeedback>}
    {job&&["failed","uncertain","paused"].includes(job.status)&&<Button disabled={busy||disabled} onClick={()=>void resume()}>Reintentar solo el texto pendiente</Button>}
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
        <header className={styles.studentHeader}><div><h2 className="text-xl font-bold">{selectedPerson?name(selectedPerson.id):"Informes a familias"}</h2><p className="mt-1 text-sm text-[#526b87]">{savedFamily(selectedItem)?"Informe guardado":selectedItem?"Informe preparado · por guardar":generating?"Preparando este informe...":"Informe pendiente de preparar"}</p></div>{selectedItem&&savedFamily(selectedItem)&&<Button variant="outline" disabled={busy} onClick={()=>void downloadFamily(selectedItem)}><FileDown aria-hidden="true"/>Descargar Word</Button>}</header>
        {selectedItem?<>
          {selectedItem.review_reason&&<p role="status" className="rounded-xl bg-[#fff5df] p-3 text-sm leading-relaxed text-[#80500c]">Conviene revisar: {selectedItem.review_reason}</p>}
          <section className="space-y-2"><h3 className="flex items-center gap-2 font-bold"><Sparkles className="size-4 text-[#087d96]" aria-hidden="true"/>Lo que destaca este período</h3>{canEditFamily?<Textarea aria-label="Lo que destaca este período" value={selectedItem.proposal.introduction??""} onChange={event=>edit(selectedItem,"introduction",event.target.value)}/>:<p className="whitespace-pre-wrap text-sm leading-relaxed text-[#345372]">{selectedItem.proposal.introduction}</p>}</section>
          <FamilyReportAttendance classroomId={classroomId} periodId={periodId} studentId={selectedItem.student_id}/>
          <section className="space-y-4" aria-label="Conclusiones y recomendaciones">{selectedItem.proposal.sections?.map(section=><article key={section.competency_id} className={styles.reportSection} style={competencyTheme(section.competency_id)}>
            <div className={batchStyles.reportCompetency}><h3 className="font-bold leading-snug"><CompetencyIdentity id={section.competency_id} name={competencies.find(card=>card.id===section.competency_id)?.name??section.competency_id}/></h3>{selectedItem.achievement_levels?.find(level=>level.competency_id===section.competency_id)&&<p className={`${batchStyles.grade} ${gradeStyles.level}`} data-level={selectedItem.achievement_levels.find(level=>level.competency_id===section.competency_id)?.achievement_level}><span>Valoración docente</span><strong>{selectedItem.achievement_levels.find(level=>level.competency_id===section.competency_id)?.achievement_level} · {gradeLabels[selectedItem.achievement_levels.find(level=>level.competency_id===section.competency_id)!.achievement_level]}</strong></p>}</div>
            <h4 className="mt-3 text-sm font-semibold text-[#31665c]">Lo que observamos</h4>{canEditFamily&&section.family_wording?<Textarea className="mt-2" aria-label={`Lo que observamos: ${section.competency_id}`} value={section.family_wording.progress_summary} onChange={event=>setItems(current=>current.map(row=>key(row)===key(selectedItem)?{...row,proposal:{...row.proposal,sections:row.proposal.sections?.map(part=>part.competency_id===section.competency_id?{...part,family_wording:{...part.family_wording!,progress_summary:event.target.value}}:part)}}:row))}/>:<p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{familyReportSectionForReader(section).progress_summary}</p>}
            {section.family_wording&&<details className="mt-3 text-sm"><summary className="cursor-pointer py-2 font-semibold">Ver conclusión de la profesora</summary><p className="whitespace-pre-wrap leading-relaxed">{section.progress_summary}</p></details>}
            <div className="mt-4 rounded-xl bg-white/80 p-3"><h4 className="text-sm font-semibold text-[#6b4c8b]">Ideas para acompañar en casa</h4>{canEditFamily?<Textarea className="mt-2" aria-label={`Recomendaciones: ${competencies.find(card=>card.id===section.competency_id)?.name??section.competency_id}`} value={section.family_suggestions.join("\n")} onChange={event=>setItems(current=>current.map(row=>key(row)===key(selectedItem)?{...row,proposal:{...row.proposal,sections:row.proposal.sections?.map(part=>part.competency_id===section.competency_id?{...part,family_suggestions:event.target.value.split("\n").filter(text=>text.trim())}:part)}}:row))}/>:<ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">{section.family_suggestions.map((text,index)=><li key={index}>{text}</li>)}</ul>}</div>
          </article>)}</section>
          <section className="space-y-2"><h3 className="font-bold">Para seguir acompañándolo</h3>{canEditFamily?<Textarea aria-label="Para seguir acompañándolo" value={selectedItem.proposal.closing_note??""} onChange={event=>edit(selectedItem,"closing_note",event.target.value)}/>:<p className="whitespace-pre-wrap text-sm leading-relaxed text-[#345372]">{selectedItem.proposal.closing_note}</p>}</section>
          {(canEditFamily||selectedItem.proposal.family_agreements)&&<section><h3 className="mb-2 font-bold">Acuerdos con la familia <span className="font-normal text-[#526b87]">(opcional)</span></h3>{canEditFamily?<Textarea aria-label="Acuerdos con la familia" maxLength={1200} placeholder="Solo los acuerdos conversados con la familia." value={selectedItem.proposal.family_agreements??""} onChange={event=>edit(selectedItem,"family_agreements",event.target.value)}/>:<p className="whitespace-pre-wrap text-sm leading-relaxed">{selectedItem.proposal.family_agreements}</p>}</section>}
        </>:!loading&&<div className={styles.emptyReport}>{generating?<><Sparkles aria-hidden="true" className="size-10 text-[#087d96]"/><h3 className="font-bold">Preparando su informe</h3><p>Los informes se preparan en paralelo. El avance aparece abajo.</p></>:<><Image src="/evaluation/family-caregivers.webp" width={176} height={176} unoptimized alt="" aria-hidden="true"/><h3 className="font-bold">Sus aprendizajes, cerca de la familia</h3><p>El informe aparecerá aquí cuando esté preparado. Utilizará las conclusiones guardadas.</p></>}</div>}
        {selectedItem?.uses_confirmed_conclusions&&<p className="text-sm text-[#526b87]">Este informe conserva tus conclusiones guardadas, sin sugerencias nuevas. Revísalo antes de guardar.</p>}{selectedItem&&!disabled&&(job?.status==="ready"||job?.status==="saved")&&<div className="flex flex-wrap gap-2 border-t pt-3">{job.status==="saved"&&<Button variant="outline" disabled={busy} onClick={()=>requestPrepare(selectedItem,true)}>Editar nueva versión</Button>}<Button variant="ghost" disabled={busy} onClick={()=>requestPrepare(selectedItem)}>Regenerar este informe</Button></div>}
        {generationProgress}
        <footer className={styles.actionBar}>
          <div className="flex gap-1"><Button variant="outline" aria-label="Informe anterior" disabled={busy||familyIndex<=0} onClick={()=>selectFamilyStudent(familyPeople[familyIndex-1].id)}><ArrowLeft aria-hidden="true"/></Button><Button variant="outline" aria-label="Siguiente informe" disabled={busy||familyIndex<0||familyIndex>=familyPeople.length-1} onClick={()=>selectFamilyStudent(familyPeople[familyIndex+1].id)}><ArrowRight aria-hidden="true"/></Button></div>
          <div className="flex flex-wrap gap-2">
            {job&&["ready","saved"].includes(job.status)&&items.some(item=>!item.plain_language)&&<Button variant="outline" disabled={busy||disabled} onClick={()=>requestPrepare()}>Preparar versión con lenguaje sencillo</Button>}
            {job?.status==="ready"&&<AsyncButton busyLabel="Guardando…" busy={busy} disabled={disabled} onClick={()=>void save()}>Confirmar y guardar informes</AsyncButton>}
            {!loading&&(!job||job.status==="stale"||job.status==="saved"&&job.completed<job.total)&&<AsyncButton busyLabel="Preparando…" busy={busy} disabled={disabled} onClick={()=>requestPrepare()}>{job?"Preparar pendientes":"Generar informes"}</AsyncButton>}
            {job?.status==="saved"&&onContinue&&<Button onClick={onContinue}>Ir a Consolidado<ArrowRight aria-hidden="true"/></Button>}
          </div>
          {dirty&&<p role="status" className="w-full text-xs text-[#88520b]">Cambios sin guardar. La confirmación guarda el conjunto de informes.</p>}
        </footer>
      </div>
    </div>
  </section>;
  function renderConclusionBatch(){return <section ref={conclusionPanel} className={batchStyles.conclusions} aria-label="Conclusiones descriptivas">
    <header className={batchStyles.heading}>
      <div><h2>Conclusiones descriptivas</h2><p>{pendingValuations>0?`Faltan ${pendingValuations} notas. Puedes preparar las conclusiones con nota guardada.`:'Ayni prepara los textos con tus notas. Revisa y guarda el conjunto.'}</p></div>
      {collapsible&&<Button size="lg" disabled={loading||busy||(!job&&(!canPrepare||disabled))} aria-expanded={expanded} onClick={()=>{if(job)setExpanded(!expanded);else requestPrepare();}}><Sparkles aria-hidden="true"/>{job?(expanded?'Ocultar conclusiones':'Ver conclusiones'):'Preparar conclusiones'}</Button>}
    </header>
    {loading&&<LoadingState label="Recuperando las conclusiones..."/>}
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {expanded&&!loading&&<>
      {!job&&!collapsible&&<Button size="lg" disabled={busy||disabled||!canPrepare} onClick={()=>requestPrepare()}><Sparkles aria-hidden="true"/>Preparar conclusiones</Button>}
      {job&&<>
        <div className={batchStyles.summaries} aria-label="Filtrar conclusiones">{[
          {value:'all',label:'Preparadas',count:items.length,Icon:FileText},
          {value:'review',label:'Por revisar',count:reviewCount,Icon:Clock3},
          {value:'ready',label:'Listas para guardar',count:items.filter(item=>itemState(item)==='ready').length,Icon:Sparkles},
          {value:'saved',label:'Guardadas',count:items.filter(item=>itemState(item)==='saved').length,Icon:CheckCircle2},
        ].map(({value,label,count,Icon})=><button key={value} type="button" data-tone={value} aria-pressed={filter===value} onClick={()=>{setFilter(value);setPage(1);}}><Icon aria-hidden="true"/><span><strong>{count}</strong>{label}</span></button>)}</div>
        {generationProgress}
        {job.error&&<WorkflowFeedback tone="info">{job.error}</WorkflowFeedback>}
        {['failed','uncertain','paused'].includes(job.status)&&<Button disabled={busy||disabled} onClick={()=>void resume()}>Retomar textos pendientes</Button>}
        {job.status==='stale'&&<WorkflowFeedback tone="info">Las notas cambiaron. Prepara los textos actualizados.</WorkflowFeedback>}
        <div className={batchStyles.list}>{pageItems.map(item=><article className={batchStyles.conclusion} key={key(item)} style={competencyTheme(item.competency_id??'')}>
          <header><h3>{name(item.student_id)}</h3><div className={batchStyles.identity}><CompetencyIdentity compact id={item.competency_id!} name={competencies.find(card=>card.id===item.competency_id)?.name??item.competency_id!}/><span className={batchStyles.status} data-state={itemState(item)}>{itemState(item)==='saved'?<CheckCircle2 aria-hidden="true"/>:itemState(item)==='review'?<Clock3 aria-hidden="true"/>:<Sparkles aria-hidden="true"/>}{itemState(item)==='saved'?'Guardada':itemState(item)==='review'?'Por revisar':'Preparada para revisar'}</span></div></header>
          {item.review_reason&&!item.saved_id&&<p className={batchStyles.reason}>{item.review_reason}</p>}
          {open===key(item)?<label className={batchStyles.editor}>Conclusión<Textarea aria-label={`Conclusión de ${name(item.student_id)}`} value={item.proposal.conclusion_text??''} disabled={busy||disabled||job.status!=='ready'} onChange={event=>edit(item,'conclusion_text',event.target.value)}/></label>:<p className={full===key(item)?batchStyles.text:batchStyles.preview}>{item.proposal.conclusion_text}</p>}
          <div className={batchStyles.cardActions}><Button variant="outline" onClick={()=>setOpen(open===key(item)?null:key(item))}>{open===key(item)?'Cerrar edición':'Revisar / editar'}</Button><Button variant="outline" onClick={()=>setFull(full===key(item)?null:key(item))} aria-expanded={full===key(item)}>{full===key(item)?'Ver menos':'Ver completo'}</Button>{open===key(item)&&['ready','saved'].includes(job.status)&&<Button variant="outline" disabled={busy||disabled} onClick={()=>requestPrepare(item,Boolean(item.saved_id))}>{item.saved_id?'Editar nueva versión':'Regenerar este texto'}</Button>}</div>
        </article>)}</div>
        {!visible.length&&<p className={batchStyles.empty}>No hay conclusiones en este grupo.</p>}
        {visible.length>0&&<nav className={batchStyles.pagination} aria-label="Páginas de conclusiones"><Button variant="outline" disabled={currentPage===1} onClick={()=>turnPage(currentPage-1)}><ArrowLeft aria-hidden="true"/>Anterior</Button><p role="status">{(currentPage-1)*10+1}-{Math.min(currentPage*10,visible.length)} de {visible.length}<span>Página {currentPage} de {pages}</span></p><Button variant="outline" disabled={currentPage===pages} onClick={()=>turnPage(currentPage+1)}>Siguiente<ArrowRight aria-hidden="true"/></Button></nav>}
        <footer className={batchStyles.saveBar}>
          <p aria-live="polite">{job.completed} de {job.total} conclusiones preparadas{dirty&&<span>Cambios sin guardar</span>}</p>
          {job.status==='ready'&&<AsyncButton busyLabel="Guardando..." busy={busy} disabled={disabled} onClick={()=>void save()}>Guardar conclusiones</AsyncButton>}
          {job.status==='stale'&&<Button disabled={busy||disabled} onClick={()=>requestPrepare()}>Preparar textos actualizados</Button>}
          {job.status==='saved'&&<>{job.completed<job.total&&<Button disabled={busy||disabled} onClick={()=>requestPrepare()}>Generar conclusiones pendientes</Button>}{onContinue&&<Button onClick={onContinue}>Ir a Informe a familias<ArrowRight aria-hidden="true"/></Button>}</>}
          {generating&&<p className="font-semibold">Preparando textos en paralelo...</p>}
        </footer>
      </>}
    </>}
    <AlertDialog open={confirmIncomplete} onOpenChange={setConfirmIncomplete}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Aún faltan notas por guardar</AlertDialogTitle><AlertDialogDescription>No todos los niños tienen nota en todas las competencias trabajadas. ¿Quieres generar las conclusiones con las notas guardadas hasta ahora? Las demás quedarán pendientes.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel variant="default" autoFocus>Cancelar y volver</AlertDialogCancel><AlertDialogAction variant="outline" disabled={seconds>0} onClick={()=>void prepare(pendingTarget,false,true)}>{seconds>0?`Continuar (${seconds} s)`:'Generar de todos modos'}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </section>;}
  return renderConclusionBatch();
}
