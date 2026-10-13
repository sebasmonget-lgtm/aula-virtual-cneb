"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { prepareSimpleProject } from "@/src/lib/simple-project-flow.mjs";
import { displayDate, limaToday } from "@/src/lib/display-date";
import { AsyncButton, LoadingState, WorkflowFeedback } from "./workflow-ui";
import { ProjectDevelopmentWorkspace, type Plan, type Proposal, type Experience } from "./project-development-workspace";
import { PreparationProgress, type PreparationJob } from "./preparation-progress";
import { AyniChatMessage } from "./ayni-chat-message";
import { ProjectPictogram } from "./project-pictogram";
import { DictationRecorder } from "./dictation-recorder";
import { ProjectCalendarReview, type ProjectCalendarDay } from "./project-calendar-review";
import { projectEventWarning } from "@/src/lib/project-event-warning.mjs";
import { readWorkspaceParams, writeWorkspaceLocation } from "@/src/lib/workspace-location";

type Props = ComponentProps<typeof ProjectDevelopmentWorkspace>;
async function request<T>(path: string, body?: unknown, method?: string): Promise<T> {
  const response = await apiFetch(`${localDatabaseApiUrl}${path}`, body === undefined ? undefined : {
    method: method ?? "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json() as T & { error?: string; message?: string };
  if (!response.ok) throw new Error(result.message || result.error || "No pudimos completar la acción.");
  return result;
}
export function SimpleProjectWorkspace(props: Props) {
  const [plan, setPlan] = useState<Plan | null>(null), [experiences, setExperiences] = useState<Experience[]>([]);
  const [chosen, setChosen] = useState<string | null>(() => props.initialProposalId ?? readWorkspaceParams("Planificar").get("projectProposal"));
  const [row, setRow] = useState<Experience | null>(null), [context, setContext] = useState("");
  const [conversation,setConversation]=useState<{messages:{role:string;text:string}[];ready:boolean}|null>(null);
  const [dictating,setDictating]=useState(false);
  const [calendar,setCalendar]=useState<ProjectCalendarDay[]>([]),[selectedDates,setSelectedDates]=useState<string[]>([]);
  const [calendarError,setCalendarError]=useState("");
  const [today,setToday]=useState(limaToday);
  const [names, setNames] = useState<Record<string, string>>({});
  const [advanced, setAdvanced] = useState(false), [changing, setChanging] = useState(false);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [openedProposal, setOpenedProposal] = useState<string | null>(null);
  const [preparations,setPreparations]=useState<PreparationJob[]>([]),[preparation,setPreparation]=useState<PreparationJob|null>(null);
  const [discrepancy,setDiscrepancy]=useState<{changed:boolean;reason:string|null}|null>(null);
  const modern=!!plan?.proposal.experience_context;
  const slotFor=(item:Proposal,position:number)=>plan?.project_slots.find(slot=>slot.proposal_id?slot.proposal_id===item.proposal_id:!modern&&slot.slot_index===position+1);
  const latestProjectPreparation=preparations.find(job=>job.kind==="project"&&job.annual_plan_id===plan?.id&&job.proposal_id===chosen);
  const visiblePreparation=preparation ?? (latestProjectPreparation?.status!=="succeeded"?latestProjectPreparation:undefined) ??
    preparations.find(job=>job.kind==="activity_block"&&job.project_id===row?.id&&!job.approved_at);
  const idAt = (item: Proposal, index: number) => item.proposal_id ?? plan?.project_slots.find((slot) => slot.slot_index === index + 1)?.id ?? "";
  const index = plan?.proposal.proposed_experiences.findIndex((item, position) => idAt(item, position) === chosen) ?? -1;
  const proposal = plan?.proposal.proposed_experiences[index];
  useEffect(() => {
    if (chosen) writeWorkspaceLocation("Planificar", { projectProposal: chosen }, true);
  }, [chosen]);
  const selectedSlot=proposal?slotFor(proposal,index):null;
  const calendarStartsOn=selectedSlot?.starts_on,calendarEndsOn=selectedSlot?.ends_on,calendarProjectId=row?.id;
  useEffect(() => {
    if(!calendarStartsOn||!calendarEndsOn)return;
    let live=true;
    const path=calendarProjectId?`/api/project-flow/${calendarProjectId}/calendar`:`/api/school-calendar?from=${calendarStartsOn}&to=${calendarEndsOn}`;
    void request<{days:ProjectCalendarDay[];selected_dates?:string[];today:string}>(path).then(value=>{
      if(!live)return;setToday(value.today);setCalendar(value.days);setSelectedDates(value.selected_dates??value.days.filter(day=>day.is_instructional&&(!modern||day.date>=value.today)).map(day=>day.date));setCalendarError("");
    }).catch(()=>{if(live)setCalendarError("No pudimos recuperar los días del proyecto. Vuelve a abrirlo para comprobar el calendario.");});
    return()=>{live=false;};
  },[calendarStartsOn,calendarEndsOn,calendarProjectId,modern]);
  useEffect(() => { let live = true;
    Promise.all([request<{ active: Plan | null }>("/api/annual-plans/current"),
      request<{ experiences: Experience[] }>("/api/learning-experiences"),
      request<{ competencies: { id: string; name: string }[] }>("/api/ai/competency-options?workflow=project"),
      request<{date:string}>("/api/teacher/today")])
      .then(([plans, list, cards, clock]) => { if (!live) return; setToday(clock.date); setPlan(plans.active); setExperiences(list.experiences);
        if(plans.active?.proposal.experience_context)void request<{jobs:PreparationJob[]}>("/api/preparation/current").then(value=>{if(live)setPreparations(value.jobs);}).catch(()=>{});
        setNames(Object.fromEntries(cards.competencies.map((card) => [card.id, card.name]))); })
      .catch((cause: Error) => { if (live) setError(cause.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [reload]);
  // Loading an existing proposal is read-only: never generate in an effect.
  useEffect(() => { if (!plan || !chosen) return; let live = true;
    const selectedIndex = plan.proposal.proposed_experiences.findIndex((item, position) =>
      (item.proposal_id ?? plan.project_slots.find((slot) => slot.slot_index === position + 1)?.id) === chosen);
    const found = experiences.filter((item) => (item.annual_plan_id === plan.id || plan.proposal.experience_context&&item.source_proposal_id===chosen) && item.status !== "archived" &&
      (item.source_proposal_id === chosen || (!item.source_proposal_id && item.source_proposal_index === selectedIndex)))
      .sort((a, b) => b.version - a.version)[0];
    if (found) void request<{ experience: Experience;discrepancy:{changed:boolean;reason:string|null} }>(`/api/project-flow/${found.id}`).then((result) => {
      if (live) { setDiscrepancy(result.discrepancy);setRow(result.experience);setConversation(result.experience.details.project_context??null); setContext(result.experience.details.project_context?"":result.experience.details.decisions?.additional_context ?? ""); setOpenedProposal(chosen); }
    }).catch((cause: Error) => { if (live) setError(cause.message); });
    return () => { live = false; };
  }, [plan, chosen, experiences]);
  async function act(job: () => Promise<void>) { if (busy) return; setBusy(true); setError(""); setNotice("");
    try { await job(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos completar la acción."); }
    finally { setBusy(false); }
  }
  async function converse(){if(!plan||!proposal||!chosen)return;await act(async()=>{
    let current=row;if(!current){current=(await request<{experience:Experience}>("/api/project-flow/start",{annualPlanId:plan.id,proposalId:chosen})).experience;setRow(current);}
    const result=await request<{experience:Experience;conversation:{messages:{role:string;text:string}[];ready:boolean}}>(`/api/project-flow/${current.id}/conversation`,{text:context,turnId:crypto.randomUUID(),expectedRevision:current.revision});
    setRow(result.experience);setConversation(result.conversation);setContext("");
  });}
  async function prepare() { if (!plan || !proposal || !chosen || !selectedDates.length || calendarError) return;
    await act(async()=>{
      let current=row;
      if(!current){const result=await request<{experience:Experience}>("/api/project-flow/start",{annualPlanId:plan.id,proposalId:chosen});current=result.experience;setRow(current);setOpenedProposal(chosen);}
      await request(`/api/project-flow/${current.id}/calendar`,{selectedDates,
        exclusions:Object.fromEntries(calendar.filter(day=>day.is_instructional&&!selectedDates.includes(day.date)).map(day=>[day.date,"No se utilizará en este proyecto"])),confirm:true},"PUT");
      current=(await request<{experience:Experience}>(`/api/project-flow/${current.id}`)).experience;setRow(current);
      if(modern){
        const additionalContext=[...(conversation?.messages.filter(message=>message.role==="teacher").map(message=>message.text)??[]),context.trim()].filter(Boolean).join("\n").slice(0,1000);
        if(changing){
          current=(await request<{experience:Experience}>(`/api/project-flow/${current.id}/dependents`,{expectedRevision:current.revision,
            decisions:{purpose:proposal.purpose,context_summary:proposal.rationale,competency_ids:proposal.primary_competency_ids,additional_context:additionalContext}})).experience;
          setRow(current);
        }
        const job=await request<PreparationJob>("/api/preparation/projects",{annualPlanId:plan.id,proposalId:chosen,additionalContext,
          ...(changing?{projectId:current.id,expectedProjectRevision:current.revision}:{})});setPreparation(job);setChanging(false);return;
      }
      const result=await prepareSimpleProject({request,planId:plan.id,proposalId:chosen,proposal,additionalContext:context.trim(),experience:current,
        feedback:{usePlanningFeedback:Boolean(props.feedbackPeriodId),planningFeedbackPeriodId:props.feedbackPeriodId},onCheckpoint:(saved:Experience)=>setRow(saved)});
      setRow(result);setChanging(false);setNotice("Proyecto preparado. Revísalo antes de confirmar.");
    });
  }
  async function confirm() { if (!row) return; await act(async () => {
    const confirmation=await request<{block_job?:PreparationJob}>(`/api/project-flow/${row.id}/confirm`, { expectedRevision: row.revision });
    if(confirmation.block_job)setPreparation(confirmation.block_job);
    const result = await request<{ experience: Experience }>(`/api/project-flow/${row.id}`);
    setRow(result.experience); setNotice("Proyecto confirmado."); props.onConfirmed?.();
  }); }
  async function newVersion() { if (!row) return; await act(async () => {
    const copy = await request<{ id: string }>(`/api/learning-experiences/${row.id}/new-version`, { expectedRevision: row.revision });
    const result = await request<{ experience: Experience }>(`/api/project-flow/${copy.id}`);
    setRow(result.experience); setContext(result.experience.details.decisions?.additional_context ?? "");  setChanging(true);
    setNotice("Nueva versión en borrador. La anterior permanece confirmada.");
  }); }
  async function rebase(){if(!row||!plan)return;await act(async()=>{
    const result=await request<{experience:Experience}>(`/api/project-flow/${row.id}/rebase`,{annualPlanId:plan.id,expectedRevision:row.revision});
    setRow(result.experience);setDiscrepancy(null);setChanging(true);setPreparation(null);setNotice("La preparación anterior se conserva. Puedes preparar y revisar la nueva versión antes de confirmarla.");
  });}
  async function moveEarlier(){if(!plan||!proposal||!chosen)return;
    const slots=plan.project_slots.filter(slot=>slot.starts_on>=today).sort((a,b)=>a.starts_on.localeCompare(b.starts_on));
    const target=slots.find(slot=>slot.proposal_id!==chosen);
    if(!target){setNotice("No hay otro tramo futuro disponible. Revisa Mi año.");return;}
    const warning=projectEventWarning(proposal,target);
    if(!window.confirm(`${warning?`${warning}\n\n`:""}Intercambiar «${proposal.title}» con el proyecto del ${displayDate(target.starts_on)} al ${displayDate(target.ends_on)}. La duración pertenece al tramo. Revisarás y confirmarás el cambio en Mi año.`))return;
    await act(async()=>{
      const current=await request<{draft:Plan|null}>("/api/annual-plans/current");
      if(current.draft)throw Error("Ya hay una revisión de Mi año. Revísala antes de intercambiar proyectos.");
      const draft=await request<{id:string;revision:number}>(`/api/annual-journey/${plan.id}/copy`,{expectedRevision:plan.revision});
      await request(`/api/annual-journey/${draft.id}/structure`,{expectedRevision:draft.revision,action:{kind:"place",proposalId:chosen,targetSlotId:target.id}});
      props.onGoAnnual?.();
    });
  }
  if (advanced) return <div className="space-y-4"><Button variant="outline" onClick={() => { setAdvanced(false); setOpenedProposal(null); setRow(null); setLoading(true); setReload((value) => value + 1); }}>Volver a la vista sencilla</Button>
    <ProjectDevelopmentWorkspace {...props} initialProposalId={chosen} /></div>;
  if (loading) return <LoadingState label="Abriendo Mi año…" />;
  const existingForChosen = chosen && experiences.some((entry) => entry.status !== "archived" && (entry.annual_plan_id === plan?.id || modern&&entry.source_proposal_id===chosen) &&
    (entry.source_proposal_id === chosen || (!entry.source_proposal_id && entry.source_proposal_index === index)));
  if (existingForChosen && openedProposal !== chosen) return error ? <WorkflowFeedback tone="error">{error}
    <Button variant="outline" onClick={() => { setError(""); setReload(value => value + 1); }}>Volver a intentar</Button></WorkflowFeedback> : <LoadingState label="Abriendo el proyecto guardado…" />;
  const prepared = row?.details.stage === "map_review" || row?.status === "active";
  const name = (id: string) => names[id] ?? id;
  const nextActivity=row?.details.activity_route?.find(item=>item.date>=today);
  const proposals = (plan?.proposal.proposed_experiences ?? []).map((item, position) => ({ item, position,
    slot: slotFor(item,position) })).sort((a, b) =>
      (a.slot?.starts_on ?? "9999").localeCompare(b.slot?.starts_on ?? "9999") || a.position - b.position);
  const currentId=proposals.find(({slot})=>slot&&slot.starts_on<=today&&slot.ends_on>=today)?.item.proposal_id;
  const nextId=!currentId?proposals.find(({slot})=>slot&&slot.starts_on>today)?.item.proposal_id:null;
  const futureNotice=modern && (selectedSlot?.starts_on??"")>today ? <WorkflowFeedback tone="info"><p>Este proyecto está previsto para más adelante. Puedes prepararlo para sus fechas o adelantarlo al primer tramo futuro. El tramo que ya comenzó se conserva.</p><Button variant="outline" className="mt-3" disabled={busy} onClick={()=>void moveEarlier()}>Quiero trabajarlo antes</Button></WorkflowFeedback>:null;
  return <section className="ayni-workflow space-y-5"><header>
    <h1 className="text-3xl font-extrabold">{proposal?.title ?? "Elige una propuesta de Mi año"}</h1></header>
    {error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}{notice && <WorkflowFeedback tone="success">{notice}</WorkflowFeedback>}
    {discrepancy?.changed&&row&&<WorkflowFeedback tone="info"><p>{discrepancy.reason}</p><div className="mt-3 flex flex-wrap gap-3"><Button disabled={busy} onClick={()=>void rebase()}>Preparar una nueva versión desde Mi año</Button><Button variant="outline" onClick={props.onGoAnnual}>Revisar Mi año</Button></div></WorkflowFeedback>}
    {visiblePreparation&&<PreparationProgress key={visiblePreparation.id} id={visiblePreparation.id} names={names} onProjectReady={id=>{void request<{experience:Experience}>(`/api/project-flow/${id}`).then(value=>{setRow(value.experience);setOpenedProposal(chosen);setContext(value.experience.details.project_context?"":value.experience.details.decisions?.additional_context??"");setPreparation(null);setPreparations(previous=>previous.filter(job=>job.id!==visiblePreparation.id));}).catch(cause=>setError(cause.message));}}/>}
    {!proposal ? <><p className="text-sm text-[#526b87]">Propuestas en el orden de Mi año. La vigente o la próxima está destacada.</p><div className="grid gap-3 sm:grid-cols-2">{proposals.map(({ item, position, slot }) => {
      const id = idAt(item, position); const existing = experiences.find((entry) => entry.status !== "archived" && entry.annual_plan_id === plan?.id &&
        (entry.source_proposal_id === id || (!entry.source_proposal_id && entry.source_proposal_index === position)));
      return <article key={id} className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">{slot?.slot_index ?? position + 1}. {item.title}</h2>
        {(id===currentId||id===nextId)&&<p className="mt-2 text-sm font-bold text-[#087d96]">{id===currentId?"Corresponde ahora":"Próximo proyecto"}</p>}
        <p className="my-2 text-sm text-[#526b87]">{slot ? `${displayDate(slot.starts_on)} – ${displayDate(slot.ends_on)}` : item.period} · {item.purpose}</p>
        {slot && slot.ends_on < today && <p className="mb-2 text-sm text-[#916219]">Esta planificación corresponde a un período anterior. Puedes revisarla o continuar con la actual.</p>}
        <Button disabled={!id || busy} onClick={() => { setPreparation(null);setOpenedProposal(null); setRow(null); setContext(""); setConversation(null);  setChanging(false); setError(""); setNotice(""); setChosen(id); }}>{existing?.status === "active" ? "Ver proyecto confirmado" : existing ? "Continuar proyecto" : "Usar esta propuesta"}</Button></article>;
    })}</div>{!plan && <Button onClick={props.onGoAnnual}>Completar Mi año</Button>}</> : <>
      <p className="text-sm text-[#526b87]">{row?.status === "active" ? "Confirmado" : prepared ? "Preparado para revisar" : "Por preparar"} · {selectedSlot ? `${displayDate(selectedSlot.starts_on)} al ${displayDate(selectedSlot.ends_on)}` : proposal.period}</p>
      {(slotFor(proposal,index)?.ends_on ?? "9999") < today && <p className="rounded-xl bg-[#fff7e8] p-3 text-sm text-[#805819]">Esta planificación corresponde a un período anterior. Puedes revisarla o continuar con la actual.</p>}
      {(!prepared || changing) && <section aria-label="Propósito y preparación del proyecto" className="space-y-4 rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-5 sm:flex-row"><ProjectPictogram project={proposal} className="size-40 sm:size-48" /><p className="leading-relaxed"><b>Qué buscamos:</b> {proposal.purpose}</p></div>
        <p className="text-sm">{proposal.primary_competency_ids.map(name).join(" · ")}</p>
        {futureNotice}
        <details open={changing}><summary className="min-h-11 cursor-pointer py-2 font-semibold text-[#07576c]">Añadir ajustes o conversar con Ayni (opcional)</summary><div className="mt-3 space-y-4">
        {modern&&<div className="space-y-3"><p className="text-sm text-[#526b87]">Ayni ya conoce la tarjeta y las fechas. Puedes conversar sobre cómo quieres desarrollar este proyecto.</p>{conversation?.messages.map((message,index)=><AyniChatMessage key={index} role={message.role} text={message.text}/>)}</div>}
        <label className="block font-semibold">¿Hay algo que quieras que tenga en cuenta? (opcional)
          <Textarea className="mt-2" value={context} maxLength={1000} onChange={(event) => setContext(event.target.value)}
            placeholder="Por ejemplo: podemos usar el patio o invitar a las familias al cierre." /></label>
        {modern&&!conversation?.ready&&<AsyncButton variant="outline" busy={busy} busyLabel="Preparando una pregunta…" onClick={()=>void converse()}>Conversar con Ayni</AsyncButton>}
        <p className="text-sm text-[#526b87]">Puedes añadir pequeños ajustes. Para cambiar lo que buscamos o las competencias, revisa el proyecto en Mi año.</p>

        <DictationRecorder classroomScope purpose="group_summary" rawTranscript context="Ajustes para este proyecto" currentText={context} onTranscribed={value=>setContext(value.slice(0,1000))} onBusyChange={setDictating} disabled={busy}/></div></details>
        <section className="rounded-xl bg-[#edf7fa] p-4"><h3 className="font-bold">Días del proyecto</h3><p className="mt-2">{selectedDates.length} días de clase{selectedDates.length?` · ${displayDate(selectedDates[0])} al ${displayDate(selectedDates.at(-1)!)}`:""}</p>
          {calendarError&&<WorkflowFeedback tone="error">{calendarError}</WorkflowFeedback>}
          <details className="mt-3"><summary className="min-h-11 cursor-pointer font-semibold text-[#07576c]">Revisar calendario</summary><ProjectCalendarReview days={calendar} selectedDates={selectedDates} disabled={busy||dictating} onChange={dates=>setSelectedDates(dates.filter(date=>!modern||date>=today))}/></details>
        </section>
        <div className="flex flex-wrap items-center gap-3"><AsyncButton className="min-h-11" busy={busy} busyLabel="Preparando proyecto…" disabled={busy||dictating||!selectedDates.length||!!calendarError||!!visiblePreparation&&["queued","running"].includes(visiblePreparation.status)} onClick={() => void prepare()}>
          Preparar proyecto</AsyncButton>
        <Button className="min-h-11 whitespace-normal text-left" variant="outline" disabled={busy} onClick={()=>modern?props.onGoAnnual?.():setAdvanced(true)}>{modern?"Quiero trabajar otro proyecto en Mi año":"Cambiar propósito, competencias o días"}</Button></div>
      </section>}
      {prepared && !changing && row && <section className="space-y-4 rounded-2xl border bg-white p-5"><div className="flex items-center gap-4"><ProjectPictogram project={proposal} className="size-16 shrink-0 sm:size-24" /><p className="text-sm text-[#526b87]">{selectedDates.length} días de clase</p></div>
        <p>{row.details.decisions?.purpose}</p>
        {futureNotice}
        {row.status==="active"&&nextActivity&&props.onDevelopActivity&&<div className="space-y-2"><p className="text-sm text-[#526b87]">Siguiente actividad · {displayDate(nextActivity.date)} · {nextActivity.title}</p><Button disabled={busy} onClick={()=>props.onDevelopActivity?.(row.id,nextActivity.id)}>Preparar actividad</Button></div>}
        <p><b>Cierre:</b> {row.details.project_master?.closing_description}</p>
        <details aria-label="Qué vamos a observar" className="space-y-3 border-t border-[#d6e5ef] pt-4"><summary className="min-h-11 cursor-pointer font-bold">Qué vamos a observar · {row.details.dependents?.general_criteria.length??0} criterios</summary>{row.details.dependents?.general_criteria.map(criterion=><div key={criterion.competency_id}><p className="text-sm font-semibold">{name(criterion.competency_id)}</p><p>{criterion.criterion}</p></div>)}</details>

        <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Ver mapa · {row.details.activity_route?.length ?? 0} actividades</summary>
          <ol className="mt-4 divide-y divide-[#d6e5ef]">{row.details.activity_route?.map(item=><li key={item.id} className="py-3"><p><b>{displayDate(item.date)} · {item.title}</b></p><p className="mt-1 text-sm text-[#526b87]">{item.specific_purpose}</p>{row.status==="active"&&item.date>=today&&<Button variant="ghost" className="mt-2" onClick={()=>props.onDevelopActivity?.(row.id,item.id)}>Preparar esta actividad</Button>}</li>)}</ol></details>
        <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" disabled={busy} onClick={() => props.onGoAnnual?.()}>← Volver a Mi año</Button>
          {row.status === "draft" ? <div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => setChanging(true)}>Quiero cambiar algo</Button>
            <AsyncButton busy={busy} busyLabel="Confirmando…" disabled={busy} onClick={() => void confirm()}>Confirmar proyecto →</AsyncButton></div>
            : !modern&&<Button variant="outline" disabled={busy} onClick={() => void newVersion()}>Preparar una nueva versión</Button>}</div>
        {!modern&&<Button variant="outline" disabled={busy} onClick={() => setAdvanced(true)}>Abrir detalle editable e imágenes</Button>}
      </section>}
    </>}
  </section>;
}
