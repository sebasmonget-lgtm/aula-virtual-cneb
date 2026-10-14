"use client";
import {useEffect, useRef, useState} from "react";
import {ArrowRight, CalendarDays, Check, Footprints, House, Info, Leaf, MessageCircle, Sparkles, Star, X} from "lucide-react";
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
export type ProposalChangePreview={id:string;proposalId:string;request:string;proposal:ChangeProposal;changes:string[]};
export type ProposalPreviewState={planId:string;revision:number;preview:ProposalChangePreview|null;pendingRequest?:string};
const date=(value?:string)=>value?new Intl.DateTimeFormat("es-PE",{day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(value+"T00:00:00Z")):"";
const suggestions=[
  {label:"Más movimiento",text:"Quiero más juegos de movimiento en este proyecto.",icon:Footprints},
  {label:"Más naturaleza",text:"Quiero más oportunidades para explorar la naturaleza en este proyecto.",icon:Leaf},
  {label:"Incluir familias",text:"Quiero incluir a las familias en este proyecto.",icon:House},
  {label:"Más juego simbólico",text:"Quiero más oportunidades de juego simbólico en este proyecto.",icon:Star},
  {label:"Más conversación",text:"Quiero más oportunidades para que los niños conversen y compartan sus ideas.",icon:MessageCircle},
];

export function AnnualProposalChangeDialog({row,index,names,hasConfirmedYear,onClose,onRead,onGenerate,onApply,onDiscard}: {
  row:ChangeProposal;index:number;names:Map<string,string>;hasConfirmedYear:boolean;onClose:()=>void;
  onRead:()=>Promise<ProposalPreviewState|null>;
  onGenerate:(text:string)=>Promise<ProposalPreviewState>;
  onApply:(state:ProposalPreviewState)=>Promise<void>;
  onDiscard:(state:ProposalPreviewState)=>Promise<void>;
}) {
  const [text,setText]=useState(""),[baseline,setBaseline]=useState("");
  const [saved,setSaved]=useState<ProposalPreviewState|null>(null),[review,setReview]=useState(false);
  const [busy,setBusy]=useState<"loading"|"generating"|"applying"|"closing"|null>("loading"),[audioBusy,setAudioBusy]=useState(false);
  const [error,setError]=useState("");
  const readOnOpen=useRef(onRead);
  const working=!!busy||audioBusy;
  useUnsavedWork(text!==baseline,working);
  useEffect(()=>{let live=true;void readOnOpen.current().then(value=>{if(!live)return;setSaved(value);const request=value?.preview?.request??value?.pendingRequest??"";setText(request);setBaseline(request);setReview(!!value?.preview);})
    .catch(()=>{if(live)setError("No pudimos recuperar el pedido guardado. Cierra y vuelve a abrir el chat para intentarlo de nuevo.");})
    .finally(()=>{if(live)setBusy(null);});return()=>{live=false;};},[]);
  async function generate(){if(working||!text.trim())return;setBusy("generating");setError("");try{
    const value=await onGenerate(text.trim());setSaved(value);setBaseline(text);setReview(true);
  }catch(cause){setError(cause instanceof Error?cause.message:"No pudimos preparar la propuesta. Tu pedido sigue aquí.");}finally{setBusy(null);}}
  async function apply(){if(working||!saved?.preview)return;setBusy("applying");setError("");try{await onApply(saved);setBaseline(text);onClose();}
    catch(cause){setError(cause instanceof Error?cause.message:"No pudimos aplicar el cambio. La propuesta sigue aquí.");setBusy(null);}}
  async function close(){if(working)return;setBusy("closing");setError("");try{if(saved?.preview)await onDiscard(saved);onClose();}
    catch(cause){setError(cause instanceof Error?cause.message:"No pudimos cerrar la revisión. Vuelve a intentarlo.");setBusy(null);}}
  const preview=review?saved?.preview:null;
  return <Dialog open onOpenChange={open=>{if(!open)void close();}}><DialogContent aria-busy={working} showCloseButton={false} className="max-h-[90dvh] overflow-y-auto rounded-2xl p-5 sm:max-w-3xl sm:p-7" onInteractOutside={event=>event.preventDefault()}>
    <Button aria-label="Cerrar" variant="ghost" size="icon" className="absolute right-2 top-2 min-h-11 min-w-11" disabled={working} onClick={()=>void close()}><X size={20}/></Button>
    <DialogHeader className="pr-6 text-left"><DialogTitle className="text-2xl font-extrabold text-[#172b52]">{preview?"Revisa la propuesta":"Cambiar propuesta con Ayni"}</DialogTitle>
      <DialogDescription>{preview?"Revisa qué cambiará en este proyecto antes de aplicarlo.":"Cuéntame qué quisieras ajustar en este proyecto."}</DialogDescription></DialogHeader>
    <div className="flex items-center gap-4 rounded-xl bg-[#edf7fa] p-4"><ProjectPictogram project={row} className="size-16 shrink-0"/>
      <div className="min-w-0"><h2 className="font-bold text-[#172b52]">Proyecto {index} · {annualDisplayTitle(row.title)}</h2><p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#47658b]">
        {row.planned_start_date&&<span className="inline-flex items-center gap-1"><CalendarDays size={16}/>{date(row.planned_start_date)} – {date(row.planned_end_date)}</span>}<span>{row.duration_weeks} semanas</span><span>{row.period}</span></p></div></div>
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {preview?<>
      <p className="text-sm text-[#47658b]"><strong>Tu pedido:</strong> {preview.request}</p>
      <section className="rounded-xl bg-[#edf7fa] p-4"><h3 className="flex items-center gap-2 font-bold text-[#172b52]"><Sparkles size={19}/>Qué cambiará</h3>
        <p className="mt-2 text-sm text-[#47658b]">{preview.changes.length?preview.changes.join(" · "):"La propuesta mantiene su enfoque."}</p>
        <h4 className="mt-3 font-bold">{annualDisplayTitle(preview.proposal.title)}</h4><p className="mt-2 leading-relaxed">{preview.proposal.purpose}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{preview.proposal.children_actions.map((action,i)=><li key={i}>{action}</li>)}</ul>
        {preview.changes.includes("Materiales")&&<p className="mt-3 text-sm"><strong>Materiales:</strong> {preview.proposal.materials.join(" · ")}</p>}
        <div className="mt-3"><AnnualCompetencies ids={preview.proposal.primary_competency_ids} names={names}/></div></section>
      <div className="space-y-2 text-sm text-[#47658b]"><h3 className="font-bold text-[#172b52]">Qué se mantiene</h3>{["Las fechas y la duración.","Los demás proyectos de Mi año.",...(hasConfirmedYear?["La versión confirmada, mientras revisas este borrador."]:[])].map(value=><p key={value} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-[#087d96]"/>{value}</p>)}</div>
      <footer className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t bg-white py-3"><Button variant="ghost" disabled={working} onClick={()=>void close()}>Cancelar</Button><Button variant="outline" disabled={working} onClick={()=>{setReview(false);setError("");}}>Editar pedido</Button>
        <AsyncButton busy={busy==="applying"} busyLabel="Aplicando…" disabled={working} onClick={()=>void apply()}>Aplicar cambio<ArrowRight size={17}/></AsyncButton></footer>
    </>:<>
      <div className="flex items-start gap-3 rounded-xl bg-[#e8f6f8] p-4"><span className="w-14 shrink-0"><AyniMascot/></span><p className="leading-relaxed text-[#172b52]">¿Qué te gustaría cambiar? Puedo ayudarte con el enfoque, los materiales, las competencias u otra idea para este proyecto.</p></div>
      <div><h3 className="text-sm font-bold">Sugerencias para empezar</h3><div className="mt-2 flex flex-wrap gap-2">{suggestions.map(({label,text:request,icon:Icon})=><Button key={label} variant="outline" size="sm" className="min-h-11" disabled={working} onClick={()=>setText(request)}><Icon size={17}/>{label}</Button>)}</div></div>
      <div><label htmlFor="proposal-change-message" className="block font-bold">¿Qué quieres cambiar?</label><div className="relative mt-2"><Textarea id="proposal-change-message" value={text} maxLength={1600} disabled={working} onChange={event=>setText(event.target.value)} placeholder="Escribe o dicta tu indicación…" className="min-h-24 pr-16"/>
        <div className="absolute right-2 top-2"><DictationRecorder iconOnly autoTranscribe classroomScope purpose="group_summary" rawTranscript context="Pedido docente para cambiar este proyecto" currentText={text} onTranscribed={value=>setText(value.slice(0,1600))} onBusyChange={setAudioBusy} disabled={!!busy}/></div></div></div>
      <p className="flex items-start gap-2 text-sm text-[#47658b]"><Info className="mt-0.5 size-4 shrink-0"/>Ayni te mostrará la propuesta antes de aplicar el cambio.</p>
      <footer className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t bg-white py-3"><Button variant="outline" disabled={working} onClick={()=>void close()}>Cancelar</Button><AsyncButton busy={busy==="loading"||busy==="generating"} busyLabel={busy==="loading"?"Abriendo chat…":"Preparando propuesta…"} disabled={working||!text.trim()} onClick={()=>void generate()}>Generar propuesta<ArrowRight size={17}/></AsyncButton></footer>
    </>}
  </DialogContent></Dialog>;
}
