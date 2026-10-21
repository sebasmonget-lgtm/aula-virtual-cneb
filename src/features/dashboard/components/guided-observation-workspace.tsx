"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, Eye, Heart, Info, Lightbulb, List, Plus, Save, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { saveCompactGuidedObservation, type DiagnosticWorkspace, type PrivateMediaUpload } from "@/src/lib/local-database";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
import { limaToday } from "@/src/lib/display-date";
import { DictationRecorder } from "./dictation-recorder";
import { MediaAttachmentInput } from "./media-attachment-input";
import { StudentPhoto } from "./student-photo";
import { AsyncButton, WorkflowFeedback } from "./workflow-ui";
import { SaveConfirmation, useSaveConfirmation } from "./save-confirmation";
import { guidedExperienceIllustrations, guidedObservationLookFor, guidedStudentsByCoverage } from "@/src/lib/diagnostic-ui-flow.mjs";
import styles from "./interviews-workspace.module.css";

type Experience=DiagnosticWorkspace["experiences"][number];
export function GuidedObservationWorkspace({experience,students,coverage,initialDate,onChooseAnother,onSaved}: {
  experience:Experience;students:DiagnosticWorkspace["students"];coverage:Record<string,number>|null;onChooseAnother:()=>void;
  initialDate?:string;
  onSaved:(record:DiagnosticWorkspace["experience_observations"][number])=>void;
}) {
  const moments=(experience.pedagogical_blocks??[]).flatMap(block=>(block.observations??[]).flatMap(moment=>{
    const criterion=experience.aspects.find(aspect=>aspect.id===moment.id);
    return criterion?[{block,criterion}]:[];
  }));
  const available=moments.length?moments:experience.aspects.map(criterion=>({block:{id:criterion.id,title:criterion.label,instruction:experience.teacher_instructions,expected_actions:criterion.prompt,examples:criterion.examples},criterion}));
  const [query,setQuery]=useState("");
  const [studentOrder,setStudentOrder]=useState<string[]>([]);
  const [position,setPosition]=useState(0),[open,setOpen]=useState(false),[studentId,setStudentId]=useState("");
  const [note,setNote]=useState(""),[media,setMedia]=useState<PrivateMediaUpload|null>(null);
  const [date,setDate]=useState(()=>initialDate??limaToday());
  const [busy,setBusy]=useState(false),[audioBusy,setAudioBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false),[error,setError]=useState("");
  const request=useRef(""),lock=useRef(false);
  const {confirmation,confirm}=useSaveConfirmation();
  const disabled=busy||audioBusy||photoBusy;
  const allowLeave=useUnsavedWork(Boolean(note.trim()||media),disabled);
  const current=available[position];
  const criterion=current?.criterion;
  const illustration=guidedExperienceIllustrations[experience.id as keyof typeof guidedExperienceIllustrations];
  const counts=(id:string)=>coverage?.[`${id}:${criterion?.competency_id}`]??0;
  const choices:{student:DiagnosticWorkspace["students"][number];count:number}[]=coverage?guidedStudentsByCoverage(students,criterion?.competency_id,coverage,query,studentOrder):[];
  const steps=criterion?.teacher_steps;
  function close(){if(!allowLeave())return;setOpen(false);setNote("");setMedia(null);setError("");request.current="";}
  async function save(another=false){
    if(!criterion||!studentId||!note.trim()||!date||disabled||lock.current)return;
    lock.current=true;setBusy(true);setError("");request.current ||= crypto.randomUUID();
    try{const record=await saveCompactGuidedObservation({studentId,experienceId:experience.id,aspectId:criterion.id,observationText:note,observedAt:date,media:media??undefined,clientRequestId:request.current});onSaved(record);setNote("");setMedia(null);request.current="";confirm("¡Observación guardada!","El registro quedó asociado al niño y al criterio de esta experiencia.");if(!another)setOpen(false);else setStudentId("");}
    catch(cause){setError(cause instanceof Error?cause.message:"No se pudo guardar. El texto y la foto siguen aquí.");}
    finally{lock.current=false;setBusy(false);}
  }
  if(!current)return <p>No hay momentos disponibles para esta experiencia.</p>;
  return <section className={`${styles.guided} ${styles.compactGuided}`}>
    <header className={styles.guidedHeader}><span className={styles.roundIcon}><List size={29}/></span><div><h2>{experience.title}</h2><span className={styles.momentBadge}>Momento {position+1} de {available.length}</span><p className={styles.momentTitle}>{criterion?.moment_title??current.block.title}</p></div>{illustration&&<Image src={`/project-illustrations/${illustration}.webp`} alt="" width={160} height={160} unoptimized className={styles.experienceIllustration}/>}</header>
    {position===0&&<section className={styles.guidedPreparation} aria-label="Antes de empezar"><strong>Antes de empezar</strong><p>{experience.teacher_instructions}</p>{experience.age_support&&<p>{experience.age_support}</p>}</section>}
    <div className={styles.guidance}><section><Lightbulb size={26}/><div><h3>Qué hacer</h3>{steps?<ol className={styles.teacherSteps}>{steps.map(step=><li key={step}>{step}</li>)}</ol>:<p>{current.block.instruction}</p>}</div></section><section><Eye size={27}/><div><h3>Qué observar</h3><p>{guidedObservationLookFor(criterion)}</p></div></section><section><List size={26}/><div><h3>Por ejemplo</h3><ul>{(current.block.examples?.length?current.block.examples:criterion?.examples??experience.examples).map(example=><li key={example}>{example}</li>)}</ul></div></section></div>
    <div className={styles.criterion}><Target size={28}/><div className={styles.criterionBody}><div className={styles.criterionTitle}><h3>Criterio de observación</h3><strong>{criterion?.prompt}</strong></div><div className={styles.relatedCompetency}><span><Heart size={17} aria-hidden="true"/>Competencia relacionada</span><p>{criterion?.competency_name}</p></div><Button className={styles.primary} disabled={!coverage} onClick={()=>{if(!allowLeave())return;setQuery("");setStudentId("");setNote("");setMedia(null);setError("");request.current="";setStudentOrder(guidedStudentsByCoverage(students,criterion?.competency_id,coverage??{}).map(({student}:{student:DiagnosticWorkspace["students"][number]})=>student.id));setOpen(true);}}><Plus/>Registrar observación</Button></div></div>
    <div className={styles.guidedFooter}><div className={styles.guidedActions}><Button variant="outline" disabled={position===0} onClick={()=>{if(allowLeave())setPosition(value=>value-1);}}><ArrowLeft/>Momento anterior</Button>{position===available.length-1?<Button variant="outline" onClick={()=>{if(allowLeave())onChooseAnother();}}>Elegir otra experiencia<ArrowRight/></Button>:<Button variant="outline" onClick={()=>{if(allowLeave())setPosition(value=>Math.min(value+1,available.length-1));}}>Siguiente momento<ArrowRight/></Button>}</div><p>{position===available.length-1?"Terminaste los momentos. Puedes elegir otra experiencia para seguir observando.":"Cada momento es una oportunidad para observar. Registra solo lo que realmente ocurra."}</p></div>
    <SaveConfirmation confirmation={confirmation}/>
    <Dialog open={open} onOpenChange={value=>{if(!value)close();}}><DialogContent className={styles.guidedDialog} onInteractOutside={event=>{if(note.trim()||media||disabled)event.preventDefault();}}>
      <DialogHeader><DialogTitle>Registrar observación</DialogTitle><DialogDescription>Registra lo que hizo o dijo el niño. Todas las competencias provienen del criterio de esta experiencia.</DialogDescription></DialogHeader>
      <div className={styles.dialogContext}><p><List/><span><small>Experiencia</small><strong>{experience.title}</strong></span></p><p><Target/><span><small>Criterio de observación</small><strong>{criterion?.prompt}</strong></span></p><p><Heart/><span><small>Competencia</small><strong>{criterion?.competency_name}</strong></span></p></div>
      <fieldset disabled={disabled} className={styles.dialogStudents}><legend>1. Selecciona al niño o niña que estás observando</legend><label className={styles.studentSearch}>Buscar niño o niña<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Escribe un nombre…"/></label><div>{choices.map(({student})=><button type="button" key={student.id} data-coverage={counts(student.id)===0?"none":counts(student.id)===1?"few":"recorded"} aria-pressed={studentId===student.id} onClick={()=>{if(student.id===studentId||disabled)return;setStudentId(student.id);request.current="";setError("");}}><StudentPhoto id={student.id} name={student.name} className={styles.studentPhoto}/><strong>{student.name}</strong><small>{`${counts(student.id)} obs.`}</small>{studentId===student.id&&<Check size={19} aria-hidden="true"/>}</button>)}</div>{!choices.length&&<p>No encontramos niños con ese nombre.</p>}</fieldset>
      <p className={styles.info}><Info size={18}/>Los números y colores muestran la cantidad de registros, no el nivel de aprendizaje.</p>
      <label className={styles.guidedDate}>Fecha de observación<input type="date" value={date} disabled={disabled} required onInput={event=>{setDate(event.currentTarget.value);request.current="";}} onChange={event=>{setDate(event.target.value);request.current="";}}/></label>
      <label htmlFor="guided-observation-note" className={styles.dialogLabel}>2. Lo que observé</label><div className={styles.noteRow}><Textarea id="guided-observation-note" value={note} maxLength={4000} disabled={disabled} onChange={event=>setNote(event.target.value)} placeholder="Cuenta lo que hizo o dijo, con un ejemplo concreto."/><DictationRecorder key={`${studentId}:${criterion?.id}`} iconOnly autoTranscribe rawTranscript purpose="raw_observation" studentId={studentId} context={`${experience.title}: ${criterion?.prompt}`} currentText={note} disabled={busy||photoBusy||!studentId} onBusyChange={setAudioBusy} onTranscribed={setNote}/></div><small className={styles.counter}>{note.length}/4000</small>
      <div><h3 className={styles.dialogLabel}>3. Evidencia <span>(opcional)</span></h3><MediaAttachmentInput photoOnly buttonInputs rawTranscript studentId={studentId} context={criterion?.prompt??""} media={media} onMedia={setMedia} onTranscribed={setNote} disabled={busy||audioBusy||!studentId} onBusyChange={setPhotoBusy}/></div>
      <div className={styles.autoCompetency}><h3>Competencia vinculada automáticamente</h3><p><Heart size={18}/>{criterion?.competency_name}</p><small>Esta competencia se vincula por el criterio de esta experiencia.</small></div>
      {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
      <div className={styles.dialogActions}><AsyncButton variant="outline" busy={busy} busyLabel="Guardando…" disabled={disabled||!studentId||!note.trim()||!date} onClick={()=>void save(true)}>Guardar y registrar otro</AsyncButton><AsyncButton className={styles.primary} busy={busy} busyLabel="Guardando…" disabled={disabled||!studentId||!note.trim()||!date} onClick={()=>void save()}><Save/>Guardar observación</AsyncButton></div>
    </DialogContent></Dialog>
  </section>;
}
