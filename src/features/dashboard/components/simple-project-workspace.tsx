"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { prepareSimpleProject, combineProjectContext } from "@/src/lib/simple-project-flow.mjs";
import { displayDate, limaToday } from "@/src/lib/display-date";
import { AsyncButton, LoadingState, WorkflowFeedback } from "./workflow-ui";
import { ProjectDevelopmentWorkspace, type Plan, type Proposal, type Experience } from "./project-development-workspace";
import { PreparationProgress, type PreparationJob } from "./preparation-progress";
import { projectEventWarning } from "@/src/lib/project-event-warning.mjs";

type Props = ComponentProps<typeof ProjectDevelopmentWorkspace>;
async function request<T>(path: string, body?: unknown, method?: string): Promise<T> {
  const response = await apiFetch(`${localDatabaseApiUrl}${path}`, body === undefined ? undefined : {
    method: method ?? "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "No pudimos completar la acción.");
  return result;
}
export function SimpleProjectWorkspace(props: Props) {
  const [plan, setPlan] = useState<Plan | null>(null), [experiences, setExperiences] = useState<Experience[]>([]);
  const [chosen, setChosen] = useState<string | null>(props.initialProposalId ?? null);
  const [row, setRow] = useState<Experience | null>(null), [context, setContext] = useState("");
  const [contextExtras, setContextExtras] = useState<Record<string,string>>({});
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
  const visiblePreparation=preparation ?? preparations.find(job=>job.kind==="activity_block"&&job.project_id===row?.id || job.kind==="project"&&job.annual_plan_id===plan?.id&&job.proposal_id===chosen&&job.status!=="succeeded");
  const idAt = (item: Proposal, index: number) => item.proposal_id ?? plan?.project_slots.find((slot) => slot.slot_index === index + 1)?.id ?? "";
  const index = plan?.proposal.proposed_experiences.findIndex((item, position) => idAt(item, position) === chosen) ?? -1;
  const proposal = plan?.proposal.proposed_experiences[index];
  useEffect(() => { let live = true;
    Promise.all([request<{ active: Plan | null }>("/api/annual-plans/current"),
      request<{ experiences: Experience[] }>("/api/learning-experiences"),
      request<{ competencies: { id: string; name: string }[] }>("/api/ai/competency-options?workflow=project")])
      .then(([plans, list, cards]) => { if (!live) return; setPlan(plans.active); setExperiences(list.experiences);
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
      if (live) { setDiscrepancy(result.discrepancy);setRow(result.experience); setContext(result.experience.details.decisions?.additional_context ?? ""); setOpenedProposal(chosen); }
    }).catch((cause: Error) => { if (live) setError(cause.message); });
    return () => { live = false; };
  }, [plan, chosen, experiences]);
  async function act(job: () => Promise<void>) { if (busy) return; setBusy(true); setError(""); setNotice("");
    try { await job(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos completar la acción."); }
    finally { setBusy(false); }
  }
  async function prepare() { if (!plan || !proposal || !chosen) return;
    if(modern){await act(async()=>{const job=await request<PreparationJob>("/api/preparation/projects",{annualPlanId:plan.id,proposalId:chosen,additionalContext:combineProjectContext(context,contextExtras)});setPreparation(job);setChanging(false);});return;}
    await act(async () => { const result = await prepareSimpleProject({ request, planId: plan.id,
      proposalId: chosen, proposal, additionalContext: combineProjectContext(context, contextExtras), experience: row,
      feedback: { usePlanningFeedback: Boolean(props.feedbackPeriodId), planningFeedbackPeriodId: props.feedbackPeriodId },
      onCheckpoint: (saved: Experience) => setRow(saved) });
      setRow(result); setContext(result.details.decisions?.additional_context ?? ""); setContextExtras({}); setChanging(false); setNotice("Proyecto preparado. Revísalo antes de confirmar."); });
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
    setRow(result.experience); setContext(result.experience.details.decisions?.additional_context ?? ""); setContextExtras({}); setChanging(true);
    setNotice("Nueva versión en borrador. La anterior permanece confirmada.");
  }); }
  async function rebase(){if(!row||!plan)return;await act(async()=>{
    const result=await request<{experience:Experience}>(`/api/project-flow/${row.id}/rebase`,{annualPlanId:plan.id,expectedRevision:row.revision});
    setRow(result.experience);setDiscrepancy(null);setChanging(true);setPreparation(null);setNotice("La preparación anterior se conserva. Puedes preparar y revisar la nueva versión antes de confirmarla.");
  });}
  async function moveEarlier(){if(!plan||!proposal||!chosen)return;
    const today=limaToday(),slots=plan.project_slots.filter(slot=>slot.starts_on>=today).sort((a,b)=>a.starts_on.localeCompare(b.starts_on));
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
  const today = limaToday();
  const proposals = (plan?.proposal.proposed_experiences ?? []).map((item, position) => ({ item, position,
    slot: slotFor(item,position) })).sort((a, b) =>
      (a.slot?.starts_on ?? "9999").localeCompare(b.slot?.starts_on ?? "9999") || a.position - b.position);
  const currentId=proposals.find(({slot})=>slot&&slot.starts_on<=today&&slot.ends_on>=today)?.item.proposal_id;
  const nextId=!currentId?proposals.find(({slot})=>slot&&slot.starts_on>today)?.item.proposal_id:null;
  return <section className="ayni-workflow space-y-5"><header><p className="text-sm font-semibold text-[#087d96]">Mi año → Proyecto</p>
    <h1 className="text-3xl font-extrabold">{proposal?.title ?? "Elige una propuesta de Mi año"}</h1></header>
    {error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}{notice && <WorkflowFeedback tone="success">{notice}</WorkflowFeedback>}
    {discrepancy?.changed&&row&&<WorkflowFeedback tone="info"><p>{discrepancy.reason}</p><div className="mt-3 flex flex-wrap gap-3"><Button disabled={busy} onClick={()=>void rebase()}>Preparar una nueva versión desde Mi año</Button><Button variant="outline" onClick={props.onGoAnnual}>Revisar Mi año</Button></div></WorkflowFeedback>}
    {visiblePreparation&&<PreparationProgress key={visiblePreparation.id} id={visiblePreparation.id} names={names} onProjectReady={id=>{void request<{experience:Experience}>(`/api/project-flow/${id}`).then(value=>{setRow(value.experience);setOpenedProposal(chosen);setContext(value.experience.details.decisions?.additional_context??"");setPreparation(null);setPreparations(previous=>previous.filter(job=>job.id!==visiblePreparation.id));}).catch(cause=>setError(cause.message));}}/>}
    {!proposal ? <><p className="text-sm text-[#526b87]">Propuestas en el orden de Mi año. La vigente o la próxima está destacada.</p><div className="grid gap-3 sm:grid-cols-2">{proposals.map(({ item, position, slot }) => {
      const id = idAt(item, position); const existing = experiences.find((entry) => entry.status !== "archived" && entry.annual_plan_id === plan?.id &&
        (entry.source_proposal_id === id || (!entry.source_proposal_id && entry.source_proposal_index === position)));
      return <article key={id} className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">{slot?.slot_index ?? position + 1}. {item.title}</h2>
        {(id===currentId||id===nextId)&&<p className="mt-2 text-sm font-bold text-[#087d96]">{id===currentId?"Corresponde ahora":"Próximo proyecto"}</p>}
        <p className="my-2 text-sm text-[#526b87]">{slot ? `${displayDate(slot.starts_on)} – ${displayDate(slot.ends_on)}` : item.period} · {item.purpose}</p>
        {slot && slot.ends_on < today && <p className="mb-2 text-sm text-[#916219]">Esta planificación corresponde a un período anterior. Puedes revisarla o continuar con la actual.</p>}
        <Button disabled={!id || busy} onClick={() => { setPreparation(null);setOpenedProposal(null); setRow(null); setContext(""); setContextExtras({}); setChanging(false); setError(""); setNotice(""); setChosen(id); }}>{existing?.status === "active" ? "Ver proyecto confirmado" : existing ? "Continuar proyecto" : "Usar esta propuesta"}</Button></article>;
    })}</div>{!plan && <Button onClick={props.onGoAnnual}>Completar Mi año</Button>}</> : <>
      <p className="text-sm text-[#526b87]">{row ? `Versión ${row.version} · ${row.status === "active" ? "confirmada" : "borrador"}` : proposal.period}</p>
      {modern && (slotFor(proposal,index)?.starts_on??"")>today && <WorkflowFeedback tone="info"><p>Este proyecto está previsto para más adelante. Puedes consultarlo y prepararlo para sus fechas, o adelantarlo al primer tramo futuro. Si el tramo actual comenzó, se conserva.</p><Button variant="outline" className="mt-3" disabled={busy} onClick={()=>void moveEarlier()}>Quiero trabajarlo antes</Button></WorkflowFeedback>}
      {(slotFor(proposal,index)?.ends_on ?? "9999") < today && <p className="rounded-xl bg-[#fff7e8] p-3 text-sm text-[#805819]">Esta planificación corresponde a un período anterior. Puedes revisarla o continuar con la actual.</p>}
      {(!prepared || changing) && <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Punto de partida</h2>
        <p>{proposal.rationale}</p><p><b>Propósito previsto:</b> {proposal.purpose}</p>
        <p className="text-sm">{proposal.primary_competency_ids.map(name).join(" · ")}</p>
        <label className="block font-semibold">¿Hay algo nuevo que debamos tener en cuenta? (opcional)
          <Textarea className="mt-2" value={context} maxLength={1000} onChange={(event) => setContext(event.target.value)}
            placeholder="Por ejemplo: surgió una pregunta, falta un material o queremos adaptar la propuesta a nuestro grupo." /></label>
        <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Añadir contexto por temas (opcional)</summary>
          <div className="mt-4 space-y-3">{([ ["Intereses", "¿Qué está interesando al grupo?"], ["Preguntas", "¿Qué preguntas han surgido?"],
            ["Recursos", "¿Qué recursos o condiciones tenemos?"], ["Adaptaciones", "¿Qué acompañamiento conviene considerar?"] ] as const).map(([key,label]) =>
              <label className="block font-semibold" key={key}>{label}<Textarea className="mt-2" maxLength={200} value={contextExtras[key] ?? ""}
                onChange={event => setContextExtras(value => ({ ...value, [key]: event.target.value }))} placeholder="Puedes dejarlo vacío." /></label>)}</div></details>
        <AsyncButton busy={busy} busyLabel="Preparando proyecto…" disabled={busy||!!visiblePreparation&&["queued","running"].includes(visiblePreparation.status)} onClick={() => void prepare()}>
          {context.trim() || Object.values(contextExtras).some(value => value.trim()) ? "Preparar con este contexto" : "No hay nada nuevo; usar la propuesta de Mi año"}</AsyncButton>
        <Button variant="outline" disabled={busy} onClick={()=>modern?props.onGoAnnual?.():setAdvanced(true)}>{modern?"Quiero trabajar otro proyecto en Mi año":"Cambiar propósito, competencias o días"}</Button>
      </section>}
      {prepared && !changing && row && <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">{row.status === "active" ? "Proyecto confirmado" : "Proyecto preparado"}</h2>
        <p>{row.details.decisions?.purpose}</p><p className="text-sm">{row.details.decisions?.competency_ids.map(name).join(" · ")}</p>
        <p><b>Cierre:</b> {row.details.project_master?.closing_description}</p>
        <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Ver propósito, criterios, evidencia, preguntas y progresión</summary>
          <div className="mt-4 space-y-4"><p><b>Contexto:</b> {row.details.decisions?.context_summary}</p>
            {row.details.decisions?.additional_context && <p><b>Aporte docente:</b> {row.details.decisions.additional_context}</p>}
            <h3 className="font-bold">Fundamentación</h3><p>{row.details.project_master?.foundation}</p>
            <h3 className="font-bold">Preguntas</h3><ul className="list-disc pl-5">{row.details.dependents?.guiding_questions.map((value) => <li key={value}>{value}</li>)}</ul>
            <h3 className="font-bold">Progresión</h3>{row.details.dependents?.journey.map((part) => <p key={part.title}><b>{part.title}:</b> {part.description}</p>)}
            <h3 className="font-bold">Criterios y evidencia esperada</h3>{row.details.dependents?.general_criteria.map((criterion) => <div key={criterion.competency_id}><b>{name(criterion.competency_id)}</b><p>{criterion.criterion}</p><p className="text-sm">{criterion.expected_evidence.join(" · ")}</p></div>)}
            <h3 className="font-bold">Recursos</h3><p>{row.details.project_master?.resources?.join(" · ")}</p>
            <p><b>Sentido del cierre:</b> {row.details.project_master?.closing_rationale}</p>
          </div></details>
        <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Ver mapa · {row.details.activity_route?.length ?? 0} actividades</summary>
          <ol className="mt-4 space-y-3">{row.details.activity_route?.map((item) => <li key={item.id} className="rounded-lg border p-3"><b>{displayDate(item.date)} · {item.title}</b><p>{item.specific_purpose}</p>
            <p className="text-sm">{name(item.criterion_competency_id)} · {item.evaluation_criterion}</p><p className="text-sm">Evidencia: {item.expected_evidence}</p>
            <p className="text-sm"><b>Progresión:</b> {item.expected_progression}</p><p className="text-sm"><b>Papel en el proyecto:</b> {item.role_in_project}</p>
            <p className="text-sm"><b>Mediación:</b> {item.mediation_notes}</p><p className="text-sm"><b>Recursos:</b> {item.materials?.join(" · ")}</p>
            {row.status === "active" && !modern && <Button className="mt-2" onClick={() => props.onDevelopActivity?.(row.id, item.id)}>Desarrollar actividad</Button>}</li>)}</ol></details>
        <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" disabled={busy} onClick={() => { setChosen(null); setRow(null); setLoading(true); setReload(value => value + 1); }}>← Volver a Mi año</Button>
          {row.status === "draft" ? <div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => setChanging(true)}>Quiero cambiar algo</Button>
            <AsyncButton busy={busy} busyLabel="Confirmando…" disabled={busy} onClick={() => void confirm()}>Confirmar proyecto →</AsyncButton></div>
            : !modern&&<Button variant="outline" disabled={busy} onClick={() => void newVersion()}>Preparar una nueva versión</Button>}</div>
        {!modern&&<Button variant="outline" disabled={busy} onClick={() => setAdvanced(true)}>Abrir detalle editable e imágenes</Button>}
      </section>}
    </>}
  </section>;
}
