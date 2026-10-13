"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, Eye, Heart, Info, Lightbulb, List, Plus, Save, Target, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { saveCompactGuidedObservation, type DiagnosticWorkspace, type PrivateMediaUpload } from "@/src/lib/local-database";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
import { DictationRecorder } from "./dictation-recorder";
import { MediaAttachmentInput } from "./media-attachment-input";
import { StudentPhoto } from "./student-photo";
import { AsyncButton, WorkflowFeedback } from "./workflow-ui";
import { SaveConfirmation, useSaveConfirmation } from "./save-confirmation";
import { guidedExperienceIllustrations, guidedObservationLookFor } from "@/src/lib/diagnostic-ui-flow.mjs";
import styles from "./interviews-workspace.module.css";

type Experience=DiagnosticWorkspace["experiences"][number];
export function GuidedObservationWorkspace({experience,students,observations,onSaved}: {
  experience:Experience;students:DiagnosticWorkspace["students"];observations:DiagnosticWorkspace["experience_observations"];
  onSaved:(record:DiagnosticWorkspace["experience_observations"][number])=>void;
}) {
  const moments=(experience.pedagogical_blocks??[]).flatMap(block=>(block.observations??[]).flatMap(moment=>{
    const criterion=experience.aspects.find(aspect=>aspect.id===moment.id);
    return criterion?[{block,criterion}]:[];
  }));
  const available=moments.length?moments:experience.aspects.map(criterion=>({block:{id:criterion.id,title:criterion.label,instruction:experience.teacher_instructions,expected_actions:criterion.prompt,examples:criterion.examples},criterion}));
  const [position,setPosition]=useState(0),[open,setOpen]=useState(false),[studentId,setStudentId]=useState("");
  const [note,setNote]=useState(""),[media,setMedia]=useState<PrivateMediaUpload|null>(null);
  const [busy,setBusy]=useState(false),[audioBusy,setAudioBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false),[error,setError]=useState("");
  const request=useRef(""),lock=useRef(false);
  const {confirmation,confirm}=useSaveConfirmation();
  const disabled=busy||audioBusy||photoBusy;
  const allowLeave=useUnsavedWork(Boolean(note.trim()||media),disabled);
  const current=available[position];
  const criterion=current?.criterion;
  const illustration=guidedExperienceIllustrations[experience.id as keyof typeof guidedExperienceIllustrations];
  const counts=(id:string)=>observations.filter(record=>record.student_id===id&&record.experience_id===experience.id&&record.aspect_id===criterion?.id&&!['draft','withdrawn','voided','cancelled','insufficient_information'].includes(record.observation_status)&&Boolean(record.observation_text?.trim()||record.has_media)).length;
  function close(){if(!allowLeave())return;setOpen(false);setNote("");setMedia(null);setError("");request.current="";}
  async function save(another=false){
    if(!criterion||!studentId||!note.trim()||disabled||lock.current)return;
    lock.current=true;setBusy(true);setError("");request.current ||= crypto.randomUUID();
    try{const record=await saveCompactGuidedObservation({studentId,experienceId:experience.id,aspectId:criterion.id,observationText:note,media:media??undefined,clientRequestId:request.current});onSaved(record);setNote("");setMedia(null);request.current="";confirm("¡Observación guardada!","El registro quedó asociado al niño y al criterio de esta experiencia.");if(!another)setOpen(false);else setStudentId("");}
    catch(cause){setError(cause instanceof Error?cause.message:"No se pudo guardar. El texto y la foto siguen aquí.");}
    finally{lock.current=false;setBusy(false);}
  }
  if(!current)return <p>No hay momentos disponibles para esta experiencia.</p>;
  return <section className={styles.guided}>
    <header className={styles.guidedHeader}><span className={styles.roundIcon}><List size={29}/></span><div><h2>{experience.title}</h2><span className={styles.momentBadge}>Momento {position+1} de {available.length}</span></div>{illustration&&<Image src={`/project-illustrations/${illustration}.webp`} alt="" width={160} height={160} unoptimized className={styles.experienceIllustration}/>}</header>
    <div className={styles.guidance}><section><Lightbulb size={26}/><div><h3>Qué hacer</h3><p>{current.block.instruction}</p></div></section><section><Eye size={27}/><div><h3>Qué observar</h3><p>{current.block.expected_actions||criterion?.prompt}</p></div></section><section><List size={26}/><div><h3>Por ejemplo</h3><ul>{(current.block.examples?.length?current.block.examples:criterion?.examples??experience.examples).map(example=><li key={example}>{example}</li>)}</ul></div></section></div>
    <div className={styles.criterion}><Target size={28}/><div><h3>Criterio de observación</h3><strong>{criterion?.prompt}</strong><div className={styles.lookFor}><Search size={24} aria-hidden="true"/><div><h4>Qué debes mirar en este momento:</h4><p>{guidedObservationLookFor(criterion)}</p></div><Image src="/project-illustrations/boy.webp" alt="" width={96} height={96} unoptimized className={styles.lookForIllustration}/></div><p><Heart size={17}/>Competencia relacionada: {criterion?.competency_name}</p><Button className={styles.primary} onClick={()=>{if(!allowLeave())return;setStudentId("");setNote("");setMedia(null);setError("");request.current="";setOpen(true);}}><Plus/>Registrar observación</Button></div></div>
    <p className={styles.coverageHelp}>Cada momento es una oportunidad para observar. Registra solo lo que realmente ocurra.</p><div className={styles.guidedActions}><Button variant="outline" disabled={position===0} onClick={()=>{if(allowLeave())setPosition(value=>value-1);}}><ArrowLeft/>Momento anterior</Button><Button variant="outline" disabled={position===available.length-1} onClick={()=>{if(allowLeave())setPosition(value=>Math.min(value+1,available.length-1));}}>Siguiente momento<ArrowRight/></Button></div>
    <SaveConfirmation confirmation={confirmation}/>
    <Dialog open={open} onOpenChange={value=>{if(!value)close();}}><DialogContent className={styles.guidedDialog} onInteractOutside={event=>{if(note.trim()||media||disabled)event.preventDefault();}}>
      <DialogHeader><DialogTitle>Registrar observación</DialogTitle><DialogDescription>Registra lo que hizo o dijo el niño. Todas las competencias provienen del criterio de esta experiencia.</DialogDescription></DialogHeader>
      <div className={styles.dialogContext}><p><List/><span><small>Experiencia</small><strong>{experience.title}</strong></span></p><p><Target/><span><small>Criterio de observación</small><strong>{criterion?.prompt}</strong></span></p><p><Heart/><span><small>Competencia</small><strong>{criterion?.competency_name}</strong></span></p></div>
      <fieldset disabled={disabled} className={styles.dialogStudents}><legend>1. Selecciona al niño o niña que estás observando</legend><div>{students.map(student=><button type="button" key={student.id} data-coverage={counts(student.id)===0?"none":counts(student.id)===1?"few":"recorded"} aria-pressed={studentId===student.id} onClick={()=>{if(student.id===studentId||disabled)return;setStudentId(student.id);request.current="";setError("");}}><StudentPhoto id={student.id} name={student.name} className={styles.studentPhoto}/><strong>{student.name}</strong><small>{counts(student.id)?`${counts(student.id)} ${counts(student.id)===1?"registro":"registros"}`:"Sin registro"}</small>{studentId===student.id&&<Check size={19} aria-hidden="true"/>}</button>)}</div></fieldset>
      <p className={styles.info}><Info size={18}/>Te mostramos cuántos registros tiene cada niño para este criterio. «Sin registro» no significa una dificultad.</p>
      <label htmlFor="guided-observation-note" className={styles.dialogLabel}>2. Lo que observé</label><div className={styles.noteRow}><Textarea id="guided-observation-note" value={note} maxLength={4000} disabled={disabled} onChange={event=>setNote(event.target.value)} placeholder="Cuenta lo que hizo o dijo, con un ejemplo concreto."/><DictationRecorder key={`${studentId}:${criterion?.id}`} iconOnly autoTranscribe rawTranscript purpose="raw_observation" studentId={studentId} context={`${experience.title}: ${criterion?.prompt}`} currentText={note} disabled={busy||photoBusy||!studentId} onBusyChange={setAudioBusy} onTranscribed={setNote}/></div><small className={styles.counter}>{note.length}/4000</small>
      <div><h3 className={styles.dialogLabel}>3. Evidencia <span>(opcional)</span></h3><MediaAttachmentInput photoOnly buttonInputs rawTranscript studentId={studentId} context={criterion?.prompt??""} media={media} onMedia={setMedia} onTranscribed={setNote} disabled={busy||audioBusy||!studentId} onBusyChange={setPhotoBusy}/></div>
      <div className={styles.autoCompetency}><h3>Competencia vinculada automáticamente</h3><p><Heart size={18}/>{criterion?.competency_name}</p><small>Esta competencia se vincula por el criterio de esta experiencia.</small></div>
      {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
      <div className={styles.dialogActions}><AsyncButton variant="outline" busy={busy} busyLabel="Guardando…" disabled={disabled||!studentId||!note.trim()} onClick={()=>void save(true)}>Guardar y registrar otro</AsyncButton><AsyncButton className={styles.primary} busy={busy} busyLabel="Guardando…" disabled={disabled||!studentId||!note.trim()} onClick={()=>void save()}><Save/>Guardar observación</AsyncButton></div>
    </DialogContent></Dialog>
  </section>;
}
