'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {ReactNode} from 'react';
import {AyniConversationSurface,AyniConversationComposer} from './ayni-conversation-surface';
import { Button } from '@/components/ui/button';

import { multiAgeAppRequest as api } from '@/src/lib/multi-age-app-client';
import { AyniChatMessage, AyniTyping } from './ayni-chat-message';
import styles from './annual-chat.module.css';
import {documentConversationReady} from '@/src/lib/document-generator-chat-readiness.mjs';

type Conversation={revision:number;decisions:{revision:number;messages:{turnId:string;text:string}[]};turns:{id:string;teacherText:string;status:string;attempts:number;providerMode:string;promptVersion?:string|null;readyToGenerate?:boolean|null;assistantText:string|null;suggestions:string[]}[]};
export function MultiAgeConversation({classroomId,projectId,annualPlanId,annualSlotId,mode,onDecision,documentsOnly=false,footer,onBusyChange,onRevisionChange,onReadyChange,contextPrepared=false}:{documentsOnly?:boolean;contextPrepared?:boolean;footer?:ReactNode;onReadyChange?:(ready:boolean)=>void;onBusyChange?:(busy:boolean)=>void;onRevisionChange?:(revision:number)=>void;classroomId:string;projectId?:string;annualPlanId?:string;annualSlotId?:string;mode:'off'|'fixture'|'openai';onDecision:()=>Promise<void>}){
  const [chat,setChat]=useState<Conversation|null>(null),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const guard=useRef(false),end=useRef<HTMLDivElement>(null);
  const read=useCallback(()=>api<Conversation>(`/conversation?classroomId=${classroomId}${projectId?'&projectId='+projectId:''}${annualPlanId&&annualSlotId?'&annualPlanId='+annualPlanId+'&annualSlotId='+annualSlotId:''}`),[classroomId,projectId,annualPlanId,annualSlotId]);
  useEffect(()=>{let live=true;read().then(v=>{if(live)setChat(v);}).catch(()=>{if(live)setError('No se pudo recuperar la conversación.');});return()=>{live=false;};},[read]);
  const last=chat?.turns.at(-1),responding=last?.status==='queued'||last?.status==='running';
  const lastStatus=last?.status;
  const ready=documentsOnly&&documentConversationReady(last?{...last,readyToGenerate:last.readyToGenerate??(contextPrepared?true:undefined)}:null);
  useEffect(()=>{onReadyChange?.(ready);},[ready,onReadyChange]);
  useEffect(()=>{onBusyChange?.(busy||responding||Boolean(text.trim()));},[busy,responding,text,onBusyChange]);
  useEffect(()=>{onRevisionChange?.(chat?.turns.at(-1)?.status==='ready'?chat.revision:0);},[chat,onRevisionChange]);
  useEffect(()=>{end.current?.scrollIntoView({block:'nearest',behavior:'instant'});},[chat?.revision,lastStatus,busy]);
  useEffect(()=>{if(!responding)return;let live=true;const timer=setInterval(()=>{read().then(v=>{if(live)setChat(v);}).catch(()=>{if(live)setError('El mensaje está guardado. No se pudo consultar la respuesta.');});},1500);return()=>{live=false;clearInterval(timer);};},[responding,read]);
  async function act(work:()=>Promise<void>){if(guard.current)return;guard.current=true;setBusy(true);setError('');try{await work();setChat(await read());}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo completar la conversación.');try{setChat(await read());}catch{/* Keep the message and recovery action visible. */}}finally{guard.current=false;setBusy(false);}}
  async function send(){if(!chat||!text.trim())return;const sent=text;await act(async()=>{try{await api('/generation',{kind:'conversation',classroomId,...(projectId?{projectId}:{}),...(annualPlanId&&annualSlotId?{annualPlanId,annualSlotId}:{}),expectedRevision:chat.revision,text:sent});}catch(cause){const recovered=await read().catch(()=>null);if(!recovered?.turns.slice(chat.revision).some(t=>t.teacherText===sent.trim()))throw cause;}setText('');});}
  return <AyniConversationSurface headerAction={<Button variant="outline" size="sm" disabled={busy||responding} onClick={()=>void act(async()=>{})}>Recuperar conversación</Button>} messages={<>{!chat?.turns.length&&<AyniChatMessage role="assistant" text={annualSlotId?'Vamos a desarrollar este proyecto con lo que está pasando en tu aula. ¿Qué hacen los niños o qué les interesa que te gustaría acompañar con este proyecto?':projectId?'Cuéntame qué quieres preparar o ajustar para las próximas actividades. Conservaremos lo que ya hiciste y los criterios de cada edad.':documentsOnly?'Vamos a preparar tu año con las ideas y condiciones de tu aula. ¿Qué espacios del colegio pueden usar para las actividades?':'Podemos conversar sobre tus ideas, recursos y cómo acompañar a los grupos. Las propuestas quedarán para tu revisión.'}/>}{chat?.turns.map(turn=>{
      const selected=chat.decisions.messages.some(m=>m.turnId===turn.id);
      return <div key={turn.id}><AyniChatMessage role="teacher" text={turn.teacherText}/>{!documentsOnly&&<Button className="my-2" size="sm" variant="outline" disabled={busy||responding} onClick={()=>void act(async()=>{await api('/conversation/decision',{classroomId,...(projectId?{projectId}:{}),turnId:turn.id,action:selected?'remove':'include',expectedRevision:chat.decisions.revision,teacherConfirmed:true});await onDecision();})}>{selected?'Retirar mi indicación':'Usar mi indicación para próximas propuestas'}</Button>}{turn.assistantText&&<AyniChatMessage role="assistant" text={turn.assistantText}/>}</div>;
    })}{responding&&<AyniTyping/>}<div ref={end}/></>}>
    {mode==='fixture'&&<p className="mb-3 text-sm text-[#596c82]">Simulación local, sin llamadas a IA.</p>}
    {!!last?.suggestions.length&&<div className={styles.suggestions}><h3>Ideas para continuar</h3><div>{last.suggestions.map(s=><Button key={s} variant="outline" disabled={busy||responding||mode==='off'} onClick={()=>setText(s)}>{s}</Button>)}</div></div>}
    <form data-dirty={Boolean(text.trim())?"true":"false"} onSubmit={e=>{e.preventDefault();void send();}}><AyniConversationComposer id={`multi-age-chat-${projectId??'annual'}`} value={text} onChange={setText} onSend={()=>void send()} label="Tu respuesta para Ayni" placeholder="Escribe tu respuesta o cuéntame una idea…" help="No necesitas tener una idea preparada. Puedes preguntar o pedir ayuda para empezar." disabled={busy||responding||mode==='off'} sendDisabled={busy||responding||!chat||!text.trim()||mode==='off'}/></form>
    {last&&['failed','interrupted'].includes(last.status)&&<p className="mt-3 text-sm">Tu mensaje está guardado. {last.status==='interrupted'?'La llamada pudo generar consumo aunque no llegara la respuesta. ':''}{last.attempts<3&&<Button variant="outline" disabled={busy||mode!==last.providerMode} onClick={()=>void act(async()=>{if(last.status==='interrupted'&&!window.confirm('La llamada anterior pudo generar consumo. ¿Quieres solicitar otro intento?'))return;await api(`/generation/${last.id}/retry`,{});})}>Reintentar respuesta</Button>}</p>}
    {mode==='off'&&<p className="mt-3 text-sm">La IA está desactivada. La conversación guardada sigue disponible.</p>}
    {!documentsOnly&&!!chat?.decisions.messages.length&&<div className={styles.ready}><strong>Indicaciones que confirmaste</strong>{chat.decisions.messages.map(m=><p key={m.turnId} className="mt-2 whitespace-pre-wrap">{m.text}</p>)}</div>}
    {ready&&<p role="status" className="mt-3 text-sm text-[#476596]">Ya podemos preparar {annualSlotId?'este proyecto':'Mi año'}. Puedes generar ahora o seguir conversando para afinarlo.</p>}
    {footer&&<div className={styles.footer} aria-busy={responding||busy}>{footer}</div>}
    <p className="mt-3 text-xs text-[#476596]">{documentsOnly?'Al crear el documento usaremos tus respuestas para planificar. Puedes seguir conversando; los resultados y observaciones se completan en Word.':<>Conversar no cambia lo confirmado. Solo tus indicaciones seleccionadas orientan próximas propuestas; no se guardan como observaciones de los niños.</>}</p>
    {error&&<p role="alert" className="mt-3 rounded-xl bg-[#fff1d6] p-3 text-sm">{error}</p>}
  </AyniConversationSurface>;
}
