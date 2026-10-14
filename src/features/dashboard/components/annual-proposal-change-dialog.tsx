"use client";
import {useEffect, useRef, useState} from "react";
import {ArrowRight, Check, Footprints, House, Leaf, MessageCircle, Sparkles, Star, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {ProjectPictogram} from "./project-pictogram";
import {AyniMascot} from "./initial-journey-ui";
import {AnnualCompetencies} from "./annual-project-preview";
import {DictationRecorder} from "./dictation-recorder";
import {AsyncButton, WorkflowFeedback} from "./workflow-ui";
import {useUnsavedWork} from "@/src/lib/use-unsaved-work";
import {annualDisplayTitle} from "@/src/lib/annual-year-editor.mjs";

export type ChangeProposal={proposal_id:string;title:string;purpose:string;primary_competency_ids:string[];
  period:string;duration_weeks:number;planned_start_date?:string;planned_end_date?:string;children_actions:string[];materials:string[]};
export type ProposalChangePreview={id:string;proposalId:string;request:string;proposal:ChangeProposal;changes:string[];conversationId?:string|null;conversationRevision?:number|null};
export type ProposalPreviewState={planId:string;revision:number;preview:ProposalChangePreview|null;pendingRequest?:string};
const date=(value?:string)=>value?new Intl.DateTimeFormat("es-PE",{day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(value+"T00:00:00Z")):"";
const suggestions=[
  {label:"Más movimiento",text:"Quiero más juegos de movimiento en este proyecto.",icon:Footprints},
  {label:"Más naturaleza",text:"Quiero más oportunidades para explorar la naturaleza en este proyecto.",icon:Leaf},
  {label:"Incluir familias",text:"Quiero incluir a las familias en este proyecto.",icon:House},
  {label:"Más juego simbólico",text:"Quiero más oportunidades de juego simbólico en este proyecto.",icon:Star},
  {label:"Más conversación",text:"Quiero más oportunidades para que los niños conversen y compartan sus ideas.",icon:MessageCircle},
];

export type ProjectChat={id:string|null;revision:number;messages:{role:string;text:string}[];ready:boolean;chips:string[];pendingTurn:string|null;status:string};
export function AnnualProposalChangeDialog({row,index,names,hasConfirmedYear,onClose,onRead,onChatRead,onSend,onGenerate,onApply,onDiscard,futureOnly=false}: {
  row:ChangeProposal;index:number;names:Map<string,string>;hasConfirmedYear:boolean;onClose:()=>void;
  futureOnly?:boolean;
  onRead:()=>Promise<ProposalPreviewState|null>;onChatRead:()=>Promise<ProjectChat>;
  onSend:(text:string,chat:ProjectChat,turnId:string,retry?:boolean,acceptPotentialRepeat?:boolean)=>Promise<ProjectChat>;
  onGenerate:(chat:ProjectChat)=>Promise<ProposalPreviewState>;
  onApply:(state:ProposalPreviewState)=>Promise<void>;onDiscard:(state:ProposalPreviewState)=>Promise<void>;
}) {
  const [text,setText]=useState(""),[chat,setChat]=useState<ProjectChat|null>(null);
  const [saved,setSaved]=useState<ProposalPreviewState|null>(null),[review,setReview]=useState(false);
  const [busy,setBusy]=useState<string|null>("loading"),[audioBusy,setAudioBusy]=useState(false),[error,setError]=useState("");
  const readOnOpen=useRef({onRead,onChatRead}),messageLog=useRef<HTMLDivElement>(null);
  const working=!!busy||audioBusy;
  useUnsavedWork(!!text.trim(),working);
  useEffect(()=>{let live=true;void Promise.all([readOnOpen.current.onRead(),readOnOpen.current.onChatRead()]).then(([value,conversation])=>{
    if(!live)return;setSaved(value);setReview(!!value?.preview);setChat(conversation);
  }).catch(()=>{if(live)setError("No pudimos recuperar la conversación. Cierra y vuelve a abrirla para intentarlo de nuevo.");})
    .finally(()=>{if(live)setBusy(null);});return()=>{live=false;};},[]);
  useEffect(()=>{const log=messageLog.current;if(log)log.scrollTop=log.scrollHeight;},[chat?.messages.length]);
  async function send(retry=false){if(working||!chat||!retry&&!text.trim())return;
    const value=retry?chat.messages.filter(m=>m.role==="teacher").at(-1)?.text??"":text.trim();
    const turnId=retry?chat.pendingTurn:crypto.randomUUID();if(!turnId)return;
    if(retry&&chat.status==="uncertain"&&!window.confirm("La respuesta anterior pudo terminar. ¿Quieres reintentar aunque pueda repetir esa llamada?"))return;
    setBusy("sending");setError("");try{setChat(await onSend(value,chat,turnId,retry,chat.status==="uncertain"));setText("");setReview(false);}
    catch(cause){const recovered=await onChatRead().catch(()=>null);if(recovered){setChat(recovered);if(recovered.messages.some(m=>m.role==="teacher"&&m.text===value))setText("");}setError(cause instanceof Error?cause.message:"No pudimos recuperar la respuesta. Tus mensajes enviados siguen guardados.");}finally{setBusy(null);}}
  async function generate(){if(working||!chat?.id||chat.pendingTurn)return;setBusy("generating");setError("");try{setSaved(await onGenerate(chat));setReview(true);}
    catch(cause){setError(cause instanceof Error?cause.message:"No pudimos preparar la propuesta. La conversación sigue guardada.");}finally{setBusy(null);}}
  async function apply(){if(working||!saved?.preview)return;setBusy("applying");setError("");try{await onApply(saved);onClose();}
    catch(cause){setError(cause instanceof Error?cause.message:"No pudimos aplicar el cambio. La propuesta sigue aquí.");setBusy(null);}}
  async function close(){if(working)return;setBusy("closing");setError("");try{if(saved?.preview)await onDiscard(saved);onClose();}
    catch(cause){setError(cause instanceof Error?cause.message:"No pudimos cerrar la revisión. Vuelve a intentarlo.");setBusy(null);}}
  const preview=review?saved?.preview:null;
  return <Dialog open onOpenChange={open=>{if(!open)void close();}}><DialogContent aria-busy={working} showCloseButton={false} className="max-h-[90dvh] overflow-y-auto rounded-2xl p-5 sm:max-w-3xl sm:p-6" onInteractOutside={event=>event.preventDefault()}>
    <Button aria-label="Cerrar" variant="ghost" size="icon" className="absolute right-2 top-2 min-h-11 min-w-11" disabled={working} onClick={()=>void close()}><X size={20}/></Button>
    <DialogHeader className="pr-6 text-left"><DialogTitle className="text-2xl font-extrabold text-[#172b52]">{preview?"Revisa la propuesta":"Conversa con Ayni"}</DialogTitle><DialogDescription>{preview?"Revisa el resultado antes de aplicarlo al proyecto.":"Personalizamos este proyecto con tus ideas."}</DialogDescription></DialogHeader>
    <div className="flex items-start gap-3 rounded-xl bg-[#edf7fa] p-3"><ProjectPictogram project={row} className="size-14 shrink-0"/><div className="min-w-0"><h2 className="font-bold">Proyecto {index} · {annualDisplayTitle(row.title)}</h2><p className="mt-1 text-sm text-[#47658b]">{date(row.planned_start_date)} – {date(row.planned_end_date)} · {row.duration_weeks} semanas</p><p className="mt-2 text-sm leading-relaxed">{row.purpose}</p></div></div>
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {futureOnly&&<p className="rounded-xl bg-[#edf7fa] p-3 text-sm">Ajustamos juntos los días futuros sin registros. Conservamos el propósito, las competencias, las fechas y todo lo trabajado.</p>}
    {preview?<>
      <section className="rounded-xl bg-[#edf7fa] p-4"><h3 className="flex items-center gap-2 font-bold"><Sparkles size={19}/>Propuesta actualizada</h3><h4 className="mt-3 font-bold">{annualDisplayTitle(preview.proposal.title)}</h4><p className="mt-2 leading-relaxed">{preview.proposal.purpose}</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{preview.proposal.children_actions.slice(0,3).map((action,i)=><li key={i}>{action}</li>)}</ul><p className="mt-3 text-sm"><strong>Materiales sugeridos:</strong> {preview.proposal.materials.join(" · ")}</p><div className="mt-3"><AnnualCompetencies ids={preview.proposal.primary_competency_ids} names={names}/></div></section>
      <p className="flex items-start gap-2 text-sm text-[#47658b]"><Check className="mt-0.5 size-4 shrink-0"/>Conservamos las fechas y los demás proyectos.{hasConfirmedYear?" La versión confirmada permanece guardada.":""}</p>
      <footer className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t bg-white py-3"><Button variant="ghost" disabled={working} onClick={()=>void close()}>Cancelar</Button><Button variant="outline" disabled={working} onClick={()=>{setReview(false);setError("");}}>Seguir conversando</Button><AsyncButton busy={busy==="applying"} busyLabel="Aplicando…" disabled={working} onClick={()=>void apply()}>{futureOnly?"Aceptar ajuste y preparar días futuros":"Aplicar cambio"}<ArrowRight size={17}/></AsyncButton></footer>
    </>:<>
      <div role="log" aria-label="Conversación del proyecto" aria-live="polite" className="max-h-[30dvh] space-y-4 overflow-y-auto py-1 sm:max-h-60">{chat?.messages.map((message,i)=><div key={i} className={message.role==="teacher"?"ml-auto max-w-[85%] rounded-2xl bg-[#f2edff] p-3 text-[#172b52]":"flex items-start gap-2"}>{message.role!=="teacher"&&<span className="w-10 shrink-0"><AyniMascot/></span>}<p className={message.role!=="teacher"?"max-w-[85%] whitespace-pre-wrap rounded-2xl bg-[#e8f6f8] p-3 text-sm leading-relaxed":"whitespace-pre-wrap text-sm leading-relaxed"}>{message.text}</p></div>)}{busy==="sending"&&<p role="status" className="text-sm text-[#47658b]">Ayni está respondiendo…</p>}</div>
      {!!chat?.pendingTurn&&<Button variant="outline" disabled={working} onClick={()=>void send(true)}>Reintentar respuesta pendiente</Button>}
      <div className="flex flex-wrap gap-2">{(chat?.messages.some(m=>m.role==="teacher")?(chat.chips??[]).map(label=>({label,text:label,icon:MessageCircle})):suggestions.slice(0,3)).map(({label,text:request,icon:Icon})=><Button key={label} variant="outline" size="sm" className="min-h-11" disabled={working||!!chat?.pendingTurn} onClick={()=>setText(request)}><Icon size={15}/>{label}</Button>)}</div>
      <div className="sticky bottom-0 z-10 space-y-3 border-t bg-white pt-3"><label htmlFor="proposal-change-message" className="sr-only">Mensaje para Ayni</label><div className="flex items-end gap-2"><div className="relative min-w-0 flex-1"><Textarea id="proposal-change-message" value={text} maxLength={1600} disabled={working||!!chat?.pendingTurn} onChange={event=>setText(event.target.value)} placeholder="Escribe o dicta tu mensaje…" className="min-h-20 pr-14"/><div className="absolute right-1 top-1"><DictationRecorder iconOnly autoTranscribe classroomScope purpose="group_summary" rawTranscript context="Decisiones para personalizar este proyecto" currentText={text} onTranscribed={value=>setText(value.slice(0,1600))} onBusyChange={setAudioBusy} disabled={!!busy||!!chat?.pendingTurn}/></div></div><Button disabled={working||!chat||!text.trim()||!!chat.pendingTurn} onClick={()=>void send()}>Enviar</Button></div>
        <footer className="flex flex-wrap justify-end gap-2"><Button variant="ghost" disabled={working} onClick={()=>void close()}>Cancelar</Button><AsyncButton busy={busy==="generating"} busyLabel="Preparando propuesta…" disabled={working||!chat?.id||!!chat.pendingTurn||!!text.trim()||!chat.messages.some(m=>m.role==="teacher")} onClick={()=>void generate()}>Ver propuesta actualizada<ArrowRight size={17}/></AsyncButton></footer></div>
    </>}
  </DialogContent></Dialog>;
}
