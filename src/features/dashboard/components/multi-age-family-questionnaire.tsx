"use client";
import {useRef,useState,type FormEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import {multiAgeAppRequest as api} from '@/src/lib/multi-age-app-client';
import {familyInterviewQuestionGroups,interviewInterestOptions,interviewLanguageOptions} from '@/src/lib/family-interview-contract.mjs';
import {WorkflowFeedback} from './workflow-ui';
import styles from './interviews-workspace.module.css';

type Interview={id:string;version:number;status:string;details:Record<string,unknown>&{family_text?:string;curriculum_snapshot:{age:number}}};
type Context={age:number;assignmentId:string;history:Interview[];draft:Interview|null;confirmed:Interview|null;draftFingerprint:string|null;answered:number};
type Props={studentId:string;studentName:string;run:(path:string,input:Record<string,unknown>)=>Promise<boolean>};
export function MultiAgeFamilyQuestionnaire({studentId,studentName,run}:Props){
 const root=useRef<HTMLElement>(null);
 const [open,setOpen]=useState(false),[state,setState]=useState<Context|null>(null),[editing,setEditing]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function load(){setLoading(true);setError('');try{setState(await api<Context>('/diagnostic/questionnaire?studentId='+studentId));}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo abrir el cuestionario.');}finally{setLoading(false);}}
 const questions=familyInterviewQuestionGroups(studentName,3)[0].questions as {key:string;title:string;label:string;hint:string}[];
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!state)return;const form=event.currentTarget,data=new FormData(form),answers:Record<string,unknown>={};
  for(const q of questions)answers[q.key]=String(data.get(q.key)??'');
  for(const key of ['interest_tags','language_tags'])answers[key]=data.getAll(key);
  for(const key of ['other_interest_text','other_language_text'])answers[key]=String(data.get(key)??'');
  if(await run('/diagnostic/questionnaire/draft',{studentId,expectedAssignmentId:state.assignmentId,expectedDraftId:state.draft?.id??null,expectedDraftFingerprint:state.draftFingerprint,expectedInterviewId:state.confirmed?.id??null,answers})){form.dataset.dirty='false';await load();}
 }
 async function confirm(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!state?.draft)return;const form=event.currentTarget,data=new FormData(form);
  if(root.current?.querySelector('form[data-dirty="true"]')){setError('Guarda los cambios del cuestionario antes de confirmar sus respuestas.');return;}
  if(await run('/diagnostic/questionnaire/confirm',{teacherConfirmed:true,pendingInformationAcknowledged:data.get('pending')==='on',studentId,expectedAssignmentId:state.assignmentId,expectedDraftId:state.draft.id,expectedDraftFingerprint:state.draftFingerprint,expectedInterviewId:state.confirmed?.id??null,reason:String(data.get('reason')??'')})){form.dataset.dirty='false';setEditing(false);await load();}
 }
 const value:Record<string,unknown>=state?.draft?.details??state?.confirmed?.details??{},editable=Boolean(state?.draft||!state?.confirmed||editing);
 return <section ref={root} className="space-y-4"><Button variant="outline" onClick={()=>{if(open&&root.current?.querySelector('form[data-dirty="true"]')){setError('Guarda el avance antes de cerrar el cuestionario.');return;}setOpen(!open);if(!open)void load();}}>Cuestionario familiar e historial</Button>{open&&<>
  {loading&&<p role="status">Abriendo el cuestionario guardado…</p>}{error&&<WorkflowFeedback tone="error">{error}<Button variant="outline" onClick={()=>void load()}>Volver a intentar</Button></WorkflowFeedback>}
  {state&&!loading&&<><h3 className="text-lg font-extrabold text-[#172b52]">Lo que cuenta la familia de {studentName} · {state.age} años</h3><p>Todas las respuestas son opcionales. Este contexto orienta el acompañamiento; no acredita logros observados en el aula.</p>
   {state.age===3&&<p className="text-sm text-[#526b87]">En 3 años no se exige leer, escribir ni alcanzar los desempeños de otras edades. Registra lo que cuenta la familia, sin hacerle pruebas al niño.</p>}
   {!editable?<><p className="whitespace-pre-line">{state.confirmed?.details.family_text}</p><Button variant="outline" onClick={()=>setEditing(true)}>Preparar una nueva versión</Button></>:<form key={`${state.draft?.id??'new'}-${String(value.draft_revision??0)}`} onSubmit={event=>void save(event)} onChangeCapture={event=>{event.currentTarget.dataset.dirty='true';}} className="space-y-4">
    <div className={styles.questionList}>{questions.map((q,index)=><section className={styles.questionCard} key={q.key}><h4 className={styles.questionTitle}><span>{index+1}</span>{q.title}</h4><label className="block space-y-2"><span>{q.label}</span><Textarea name={q.key} defaultValue={typeof value[q.key]==='string'?String(value[q.key]):''} maxLength={1500} aria-describedby={`${studentId}-${q.key}-hint`}/></label><p id={`${studentId}-${q.key}-hint`}>{q.hint}</p>
     {(q.key==='interests'||q.key==='communication_context')&&<fieldset><legend>{q.key==='interests'?'Intereses que menciona la familia':'Lenguas que escucha o usa en casa'}</legend><div className="flex flex-wrap gap-3">{(q.key==='interests'?interviewInterestOptions:interviewLanguageOptions).map((option:{id:string;label:string})=>{const name=q.key==='interests'?'interest_tags':'language_tags';return <label key={option.id} className="inline-flex min-h-11 items-center gap-2"><input type="checkbox" name={name} value={option.id} defaultChecked={Array.isArray(value[name])&&(value[name] as string[]).includes(option.id)}/>{option.label}</label>;})}</div><label className="mt-3 block">{q.key==='interests'?'Otro interés, si marcaste Otro':'Nombre de la lengua, si marcaste Otra lengua'}<Input name={q.key==='interests'?'other_interest_text':'other_language_text'} maxLength={1500} defaultValue={String(value[q.key==='interests'?'other_interest_text':'other_language_text']??'')}/></label></fieldset>}
    </section>)}</div><Button type="submit">Guardar avance del cuestionario</Button><p className="text-sm text-[#526b87]">El avance se conserva al reiniciar y solo se incorpora al diagnóstico después de confirmarlo.</p>
   </form>}
   {state.draft&&<form onSubmit={event=>void confirm(event)} className="space-y-3"><p>Avance guardado · versión {state.draft.version}. Revisa las ocho preguntas antes de confirmar.</p>{state.confirmed&&<label className="block">Motivo de la nueva versión<Textarea name="reason" required maxLength={500}/></label>}<label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="pending" required/>Confirmo las respuestas guardadas; lo no respondido queda pendiente, sin atribuir logros o dificultades.</label><Button type="submit">Confirmar cuestionario guardado</Button></form>}
   <details><summary className="min-h-11 cursor-pointer py-2 font-bold">Versiones familiares conservadas</summary>{state.history.filter(r=>r.status==='confirmed').map(r=><section key={r.id} className="space-y-2 border-t py-4"><h4 className="font-bold">Versión {r.version} · grupo registrado de {r.details.curriculum_snapshot.age} años</h4><p className="whitespace-pre-line">{r.details.family_text}</p></section>)}{!state.confirmed&&<p>Aún no hay una entrevista confirmada.</p>}</details>
  </>}
 </>}</section>;
}
