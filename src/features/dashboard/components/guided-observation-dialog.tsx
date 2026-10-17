"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveCompactGuidedObservation, type DiagnosticWorkspace, type PrivateMediaUpload } from "@/src/lib/local-database";
import { rankGuidedStudents } from "@/src/lib/guided-observation-flow.mjs";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
import { displayPersonName } from "@/src/lib/person-name.mjs";
import { DictationRecorder } from "./dictation-recorder";
import { MediaAttachmentInput } from "./media-attachment-input";
import { StudentPhoto } from "./student-photo";
import { PedagogicalBlock as GuidedMoment } from "./pedagogical-block";

type Experience=DiagnosticWorkspace["experiences"][number];
export function GuidedObservationDialog({experience,students,pairs,onSaved,onClose}:{experience:Experience;students:DiagnosticWorkspace["students"];pairs:Set<string>;onSaved:(r:DiagnosticWorkspace["experience_observations"][number])=>void;onClose:()=>void}) {
  const [criterion,setCriterion]=useState<Experience["aspects"][number]|null>(null),[studentId,setStudentId]=useState("");
  const [query,setQuery]=useState(""),[note,setNote]=useState(""),[media,setMedia]=useState<PrivateMediaUpload|null>(null);
  const [busy,setBusy]=useState(false),[audio,setAudio]=useState(false),[preparingPhoto,setPreparingPhoto]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState(false);
  const request=useRef(""),saving=useRef(false);
  const disabled=busy||audio||preparingPhoto;
  const allowLeave=useUnsavedWork(Boolean(note.trim()||media),disabled);
  const student=students.find(s=>s.id===studentId);
  const ranked: (DiagnosticWorkspace["students"][number] & {hasRecords:boolean})[]=criterion ? rankGuidedStudents(students,criterion.competency_id,pairs,query) : [];
  function close(){if(!allowLeave())return;setCriterion(null);setStudentId("");setNote("");setMedia(null);setSaved(false);setError("");request.current="";onClose();}
  async function save(){if(!criterion||!student||!note.trim()||disabled||saving.current)return;
    saving.current=true;setBusy(true);setError("");request.current ||= crypto.randomUUID();
    try{const row=await saveCompactGuidedObservation({studentId:student.id,experienceId:experience.id,aspectId:criterion.id,observationText:note,media:media??undefined,clientRequestId:request.current});onSaved(row);setNote("");setMedia(null);setSaved(true);}
    catch(e){setError(e instanceof Error?e.message:"No pude guardar. Tu texto y fotografía siguen aquí.");}
    finally{saving.current=false;setBusy(false);}
  }
  // This component stays mounted for the experience; closing is always guarded.
  return <>
    <div className="space-y-3">{experience.pedagogical_blocks?.map((block,index)=><div key={block.id}>
      <GuidedMoment compact block={block} position={block.observations?.length ? experience.pedagogical_blocks!.slice(0,index+1).filter(b=>b.observations?.length).length : undefined} onObserve={id=>{const selected=experience.aspects.find(a=>a.id===id);if(!selected||!allowLeave())return;setCriterion(selected);setStudentId("");setQuery("");setError("");setSaved(false);setNote("");setMedia(null);request.current="";}}/>
    </div>)}</div>
    <Dialog open={!!criterion} onOpenChange={open=>{if(!open)close();}}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl" onInteractOutside={event=>{if(note.trim()||media||disabled)event.preventDefault();}}>
        <DialogHeader><DialogTitle>{saved ? "Observación guardada" : student ? `Registrar observación de ${displayPersonName(student.name)}` : "Selecciona al niño"}</DialogTitle><DialogDescription>{saved ? "El servidor confirmó el guardado. Puedes continuar con el mismo criterio." : student ? "Registra hechos observados. Esto no asigna una calificación ni un nivel de logro." : "Sin registro y Con registros indican cobertura de esta competencia en observaciones iniciales, no de este criterio. La ausencia de registros no indica una dificultad."}</DialogDescription></DialogHeader>
        {criterion && <div className="space-y-1 rounded-lg bg-[#fff4df] p-3 text-sm text-[#614515]"><p><strong>Criterio:</strong> {criterion.prompt}</p><p><strong>Competencia:</strong> {criterion.competency_name}</p></div>}
        {!student && criterion && <>
          {students.length>10&&<Input aria-label="Buscar niño" placeholder="Buscar por nombre" value={query} onChange={e=>setQuery(e.target.value)}/>}
          <div className="max-h-[45dvh] space-y-2 overflow-y-auto">{ranked.map(s=><button key={s.id} type="button" className={`flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-[#087d96] active:bg-[#d8f0f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087d96] ${s.hasRecords ? "border-[var(--ayni-panel-border)] bg-white" : "border-[#86baca] bg-[#e8f5fa]"}`} onClick={()=>{setStudentId(s.id);request.current="";}}><StudentPhoto id={s.id} name={displayPersonName(s.name)}/><span className="min-w-0 flex-1 font-semibold">{displayPersonName(s.name)}</span><span className="shrink-0 text-xs font-semibold text-[#07576c]">{s.hasRecords ? "Con registros" : "Sin registro"}</span></button>)}</div>
          {ranked.length===0&&<p className="text-sm">No hay niños con ese nombre.</p>}
        </>}
        {student && criterion && !saved && <div className="space-y-4">
          <label className="block font-semibold" htmlFor="guided-observation-note">¿Qué hizo o dijo el niño?</label><Textarea id="guided-observation-note" className="min-h-28" maxLength={4000} value={note} disabled={disabled} onChange={e=>setNote(e.target.value)} placeholder="Cuenta lo que hizo o dijo, con un ejemplo concreto."/>
          <div><p className="mb-1 text-sm font-semibold">Dictar observación</p><DictationRecorder key={`${student.id}:${criterion.id}`} autoTranscribe rawTranscript purpose="raw_observation" studentId={student.id} context={`${experience.title}: ${criterion.prompt}`} currentText={note} disabled={busy||preparingPhoto} onBusyChange={setAudio} onTranscribed={setNote}/></div>
          <MediaAttachmentInput photoOnly buttonInputs rawTranscript studentId={student.id} context={criterion.prompt} media={media} onMedia={setMedia} onTranscribed={setNote} disabled={busy||audio} onBusyChange={setPreparingPhoto}/>
          <p className="text-xs text-[#526b87]">La fotografía es privada y no se envía a IA.</p>
          {error&&<p role="alert" className="rounded-lg bg-[#fff1d6] p-3 text-sm">{error}</p>}
          <Button className="min-h-12 w-full" disabled={disabled||!note.trim()} onClick={()=>void save()}>{busy ? "Guardando…" : "Guardar observación"}</Button>
          <Button variant="outline" disabled={disabled} onClick={()=>{if(!allowLeave())return;setStudentId("");setNote("");setMedia(null);request.current="";setError("");}}>Elegir otro niño</Button>
        </div>}
        {saved&&<div className="flex flex-col gap-3"><p role="status" className="text-sm font-semibold text-[#17653f]">Tu observación ya está en los registros de tu aula.</p><Button className="min-h-12" onClick={()=>{setStudentId("");setQuery("");setSaved(false);setError("");request.current="";}}>Registrar otro niño</Button><Button variant="outline" className="min-h-12" onClick={close}>Volver a la experiencia</Button></div>}
      </DialogContent>
    </Dialog>
  </>;
}

