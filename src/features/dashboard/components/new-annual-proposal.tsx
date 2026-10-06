"use client";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiFetch, apiJson } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { annualDisplayTitle } from "@/src/lib/annual-year-editor.mjs";
import { DictationRecorder } from "./dictation-recorder";
import { AyniChatMessage, AyniTyping } from "./ayni-chat-message";
import { ProjectPictogram } from "./project-pictogram";
import { competencyLabel } from "@/src/lib/competency-presentation";
import { MAX_PROPOSAL_COMPETENCIES } from "@/src/lib/annual-proposal-intent.mjs";
type Candidate={purpose:string;invitation:string;materials:string[];supports:string[];flexibility:string;source_fact_keys:string[];opportunities:{competency_id:string;capacity_names:string[];child_action:string;conditions:string;mediation:string;observation:string;supports:string}[];proposal_id:string;title:string;rationale:string;children_actions:string[];primary_competency_ids:string[]};
type Session={id:string;revision:number;status:string;approved?:boolean;review_feedback?:string[];messages:{role:string;text:string}[];candidate:Candidate|null;candidate_sources:{key:string;text:string}[];required_competency_ids?:string[];missing_required_competency_ids?:string[]};
export function NewAnnualProposal({open,onOpenChange,planId,revision,onApproved,curriculumReference=[],reviewPeriodId}:{reviewPeriodId?:string;open:boolean;onOpenChange:(open:boolean)=>void;planId:string;revision:number;onApproved:(id:string)=>Promise<unknown>;curriculumReference?:{id:string;name:string}[]}) {
  const [session,setSession]=useState<Session|null>(null),[text,setText]=useState(""),[busy,setBusy]=useState(false),[audio,setAudio]=useState(false),[error,setError]=useState(""),[type,setType]=useState("project");
  const [required,setRequired]=useState<string[]>([]);
  const [pending,setPending]=useState("");
  const [pendingIndex,setPendingIndex]=useState(0);
  const baseUrl=`${localDatabaseApiUrl}/api/annual-journey/${planId}/new-proposal`;
  const conversationUrl=`${baseUrl}/conversation${reviewPeriodId?`?reviewPeriodId=${reviewPeriodId}`:""}`;
  useEffect(()=>{if(!open)return;let live=true;
    const start=async()=>{
      setBusy(true);setError("");setSession(null);setRequired([]);setPending("");
      try {
        let r=await apiFetch(conversationUrl,{cache:"no-store"});
        let data=await apiJson<Session & {error?:string}>(r);
        if(r.status===404 || r.ok&&(data.status==="interrupted"||data.approved)){
          r=await apiFetch(conversationUrl,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({expectedRevision:revision,reviewPeriodId,...(r.ok&&!data.approved?{id:data.id,revision:data.revision}:{})})});data=await apiJson<Session & {error?:string}>(r);
        }
        if(!r.ok)throw Error(data.error ?? "No pudimos abrir la conversación.");if(live){setSession(data);setRequired(data.required_competency_ids??[]);}
      }catch(e){if(live)setError(e instanceof Error?e.message:"No pudimos abrir la conversación.");}finally{if(live)setBusy(false);}
    };void start();return()=>{live=false;};
  },[open,planId,revision,reviewPeriodId,conversationUrl]);
  useEffect(()=>{if(!open||session?.status!=="responding")return;let live=true;let timer:number;
    const poll=async()=>{try{const response=await apiFetch(`${baseUrl}/conversation?id=${session.id}`);if(response.ok&&live){const saved=await apiJson<Session>(response);setSession(saved);if(saved.status!=="responding"){setRequired(saved.required_competency_ids??[]);if(saved.status==="interrupted")setError("La idea quedó guardada. Retoma la respuesta para continuar.");return;}}}catch{/* Keep consulting the owned saved session. */}if(live)timer=window.setTimeout(()=>void poll(),3000);};timer=window.setTimeout(()=>void poll(),2000);return()=>{live=false;window.clearTimeout(timer);};
  },[open,session?.id,session?.status,baseUrl]);
  const call=async(operation:string,restart=false,resume=false)=>{
    if(busy||audio||session?.status==="responding")return;const sent=operation==="conversation"&&!resume?text.trim():"";setBusy(true);setError("");
    if(sent){setPendingIndex(session?.messages.length??0);setPending(sent);setText("");setSession(value=>value?{...value,status:"responding",candidate:null}:value);}
    try {const r=await apiFetch(`${baseUrl}/${operation}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({expectedRevision:revision,reviewPeriodId,...(!restart&&session?{id:session.id,revision:session.revision}:{}),...(sent?{text:sent}:{}),...(operation==="generate"?{requiredCompetencyIds:required}:{}),experienceType:type,restart})});const data=await apiJson<Session & {error?:string}>(r);if(!r.ok)throw Error(data.error ?? "No se completó la propuesta.");
      if(operation==="approve"){await onApproved(data.id);setSession(null);setRequired([]);setText("");onOpenChange(false);}else {setSession(data);setRequired(data.required_competency_ids??[]);}setPending("");
    }catch(e){
      if(session&&!restart){
        try {const saved=await apiFetch(`${baseUrl}/conversation?id=${session.id}`);
          if(saved.ok){const recovered=await apiJson<Session>(saved);setSession(recovered);setRequired(recovered.required_competency_ids??[]);
            if(operation==="approve"&&recovered.approved){await onApproved(planId);setSession(null);setRequired([]);setText("");setPending("");onOpenChange(false);return;}
            const sentSaved=!!sent&&recovered.messages.at(-1)?.role==="teacher"&&recovered.messages.at(-1)?.text===sent || !!sent&&recovered.messages.some((m,i)=>i>=session.messages.length&&m.role==="teacher"&&m.text===sent);
            if(sentSaved)setPending("");
            if(recovered.status==="responding"){setPending("");return;}
            if(operation==="generate"&&recovered.revision>session.revision&&recovered.candidate&&!recovered.missing_required_competency_ids?.length)return;
            if(sentSaved){setError(recovered.status==="interrupted"?"La idea quedó guardada. Retoma la respuesta para continuar.":"");return;}
          }
        }catch{/* Keep the original recoverable feedback. */}
      }
      if(sent){setText(sent);setPending("");}setError(e instanceof Error?e.message:"No se completó la propuesta.");
    }finally{setBusy(false);}
  };
  const waiting=busy||session?.status==="responding";
  const competencyName=(id:string)=>curriculumReference.find(c=>c.id===id)?.name ?? id;
  const missing=required.filter(id=>session?.candidate && (!session.candidate.primary_competency_ids.includes(id)||!session.candidate.opportunities.some(o=>o.competency_id===id)));
  return <Sheet open={open} onOpenChange={value=>{if(!value&&(busy||audio))return;if(!value&&text.trim()&&!window.confirm("Hay una respuesta sin enviar. ¿Quieres cerrar este panel?"))return;onOpenChange(value);}}><SheetContent className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>Nueva propuesta con Ayni</SheetTitle><SheetDescription>Una conversación breve para preparar una alternativa. Aparecerá en Biblioteca cuando la revises y apruebes.</SheetDescription></SheetHeader><div className="space-y-5 px-5 pb-6">
    <div role="log" aria-live="polite" className="space-y-4">{session?.messages.map((m,i)=><AyniChatMessage key={i} role={m.role} text={m.text}/>)}{pending&&!session?.messages.slice(pendingIndex).some(m=>m.role==="teacher"&&m.text===pending)&&<AyniChatMessage role="teacher" text={pending}/>}</div>
    {error&&<div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950"><p>{error}</p>{!!session?.review_feedback?.length&&<ul className="mt-2 list-disc space-y-2 pl-5">{session.review_feedback.map((reason,i)=><li key={i}>{reason}</li>)}</ul>}{session?.status==="interrupted"&&<Button className="mt-3" variant="outline" disabled={waiting} onClick={()=>void call("conversation",false,true)}>Retomar respuesta</Button>}<Button className="mt-3" variant="outline" disabled={waiting} onClick={()=>void call("conversation",true)}>Empezar otra idea</Button></div>}
    {waiting&&<AyniTyping label={busy&&session?.status==="ready"&&!pending?"Ayni está preparando tu propuesta…":"Ayni está escribiendo…"}/>}
    <label className="block text-sm font-semibold" htmlFor="new-proposal-answer">{session?.candidate?"¿Quieres cambiar esta idea antes de guardarla?":"Tu idea para esta propuesta"}</label><div className="flex items-start gap-2"><Textarea id="new-proposal-answer" value={text} onChange={e=>setText(e.target.value)} disabled={waiting||audio} maxLength={1600} className="min-h-24 min-w-0 flex-1" placeholder="Por ejemplo, un proyecto de Navidad con las familias…"/><DictationRecorder iconOnly autoTranscribe classroomScope purpose="group_summary" rawTranscript context="Intención docente para una nueva propuesta anual" currentText={text} onTranscribed={value=>setText(value.slice(0,1600))} onBusyChange={setAudio} disabled={waiting}/><Button size="icon" className="size-12 shrink-0 rounded-full" aria-label="Enviar idea" disabled={waiting||audio||!text.trim()||!session} onClick={()=>void call("conversation")}><Send className="size-5"/></Button></div>
    {session?.status==="ready"&&!session.candidate&&<div className="space-y-3 rounded-xl bg-[#edf7fa] p-4">
      <h3 className="font-bold">Ya puedo preparar esta propuesta</h3>
      <p className="text-sm">Ayni preparará y revisará solo esta alternativa, conservando el resto de Mi año.</p>
      <label className="block text-sm">Tipo<select value={type} onChange={e=>setType(e.target.value)} disabled={busy} className="ml-3 min-h-11 rounded-lg border bg-white px-3"><option value="project">Proyecto</option><option value="unit">Unidad</option></select></label>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Competencias que Ayni debe conservar</p>
        <p className="text-sm">{required.length?required.map(id=>competencyLabel(id,competencyName(id))).join(" · "):"Puedes elegirlas o dejar que Ayni proponga las más pertinentes."}</p>
        <details className="text-sm"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-[#087d96]">Elegir competencias{required.length?` · ${required.length} seleccionadas`:" (opcional)"}</summary>
          <p className="mb-2">Elige hasta cinco. Cada una tendrá oportunidades reales en la propuesta.</p>
          <fieldset disabled={busy||audio} className="grid gap-2 sm:grid-cols-2"><legend className="sr-only">Competencias elegidas para la nueva propuesta</legend>
            {curriculumReference.map(card=><label key={card.id} title={card.name} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#d6e5ef] bg-white px-3 py-2">
              <input type="checkbox" aria-label={card.name} checked={required.includes(card.id)} disabled={!required.includes(card.id)&&required.length>=MAX_PROPOSAL_COMPETENCIES} onChange={e=>setRequired(ids=>e.target.checked?[...ids,card.id]:ids.filter(id=>id!==card.id))} className="size-4 shrink-0 accent-[#087d96]"/>
              <span>{competencyLabel(card.id,card.name)}</span>
            </label>)}
          </fieldset>
        </details>
      </div>
      <Button disabled={waiting||audio||!!text.trim()||required.length>MAX_PROPOSAL_COMPETENCIES} onClick={()=>void call("generate")}>Preparar propuesta</Button>
    </div>}
    {!!missing.length&&<div role="alert" className="space-y-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-950"><p>Falta incluir: {missing.map(competencyName).join(" · ")}. Ayni debe revisar la propuesta antes de guardarla.</p><Button variant="outline" disabled={busy||audio} onClick={()=>void call("generate")}>Revisar propuesta</Button></div>}
    {session?.candidate&&<article className="space-y-4 border-t border-[#d6e5ef] pt-5"><div className="flex items-center gap-4"><ProjectPictogram project={session.candidate} className="size-16"/><h3 className="text-xl font-bold">{annualDisplayTitle(session.candidate.title)}</h3></div><h4 className="font-semibold">Qué podrían hacer los niños</h4><ul className="list-disc space-y-2 pl-5">{session.candidate.children_actions.map((v,i)=><li key={i}>{v}</li>)}</ul><h4 className="font-semibold">Por qué tiene sentido</h4><p>{session.candidate.rationale}</p><div><h4 className="font-semibold">Competencias</h4><ul className="mt-2 list-disc pl-5 text-sm">{session.candidate.primary_competency_ids.map(id=><li key={id}>{competencyName(id)}</li>)}</ul></div><details className="text-sm leading-relaxed"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-[#087d96]">Ver detalles</summary><div className="space-y-4 py-3"><div><h4 className="font-semibold">Propósito</h4><p>{session.candidate.purpose}</p></div><div><h4 className="font-semibold">Invitación</h4><p>{session.candidate.invitation}</p></div><div><h4 className="font-semibold">Materiales</h4><ul className="list-disc pl-5">{session.candidate.materials.map((v,i)=><li key={i}>{v}</li>)}</ul></div><div><h4 className="font-semibold">Apoyos y flexibilidad</h4><ul className="list-disc pl-5">{session.candidate.supports.map((v,i)=><li key={i}>{v}</li>)}</ul><p>{session.candidate.flexibility}</p></div><div><h4 className="font-semibold">Oportunidades curriculares</h4>{session.candidate.opportunities.map((o,i)=><div key={i} className="mt-3 space-y-1"><b>{competencyName(o.competency_id)}</b><p>{o.capacity_names.join(" · ")}</p><p>{o.child_action}</p><p>Condiciones: {o.conditions}</p><p>Mediación: {o.mediation}</p><p>Qué observar: {o.observation}</p><p>Apoyos: {o.supports}</p></div>)}</div><div><h4 className="font-semibold">Fuentes pertinentes</h4>{session.candidate_sources.map(f=><p className="mt-2" key={f.key}>{f.text}</p>)}</div></div></details><p className="text-sm text-[#526b87]">Esta propuesta todavía no tiene fechas. Después podrás elegir el tramo donde colocarla.</p><Button disabled={waiting||audio||!!text.trim()||!!missing.length} onClick={()=>void call("approve")}>Guardar en Biblioteca</Button></article>}
  </div></SheetContent></Sheet>;
}
