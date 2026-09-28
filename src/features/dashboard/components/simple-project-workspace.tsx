"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { prepareSimpleProject, combineProjectContext } from "@/src/lib/simple-project-flow.mjs";
import { AsyncButton, LoadingState, WorkflowFeedback } from "./workflow-ui";
import { ProjectDevelopmentWorkspace, type Plan, type Proposal, type Experience } from "./project-development-workspace";

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
  const idAt = (item: Proposal, index: number) => item.proposal_id ?? plan?.project_slots.find((slot) => slot.slot_index === index + 1)?.id ?? "";
  const index = plan?.proposal.proposed_experiences.findIndex((item, position) => idAt(item, position) === chosen) ?? -1;
  const proposal = plan?.proposal.proposed_experiences[index];
  useEffect(() => { let live = true;
    Promise.all([request<{ active: Plan | null }>("/api/annual-plans/current"),
      request<{ experiences: Experience[] }>("/api/learning-experiences"),
      request<{ competencies: { id: string; name: string }[] }>("/api/ai/competency-options?workflow=project")])
      .then(([plans, list, cards]) => { if (!live) return; setPlan(plans.active); setExperiences(list.experiences);
        setNames(Object.fromEntries(cards.competencies.map((card) => [card.id, card.name]))); })
      .catch((cause: Error) => { if (live) setError(cause.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [reload]);
  // Loading an existing proposal is read-only: never generate in an effect.
  useEffect(() => { if (!plan || !chosen) return; let live = true;
    const selectedIndex = plan.proposal.proposed_experiences.findIndex((item, position) =>
      (item.proposal_id ?? plan.project_slots.find((slot) => slot.slot_index === position + 1)?.id) === chosen);
    const found = experiences.filter((item) => item.annual_plan_id === plan.id && item.status !== "archived" &&
      (item.source_proposal_id === chosen || (!item.source_proposal_id && item.source_proposal_index === selectedIndex)))
      .sort((a, b) => b.version - a.version)[0];
    if (found) void request<{ experience: Experience }>(`/api/project-flow/${found.id}`).then((result) => {
      if (live) { setRow(result.experience); setContext(result.experience.details.decisions?.additional_context ?? ""); setOpenedProposal(chosen); }
    }).catch((cause: Error) => { if (live) setError(cause.message); });
    return () => { live = false; };
  }, [plan, chosen, experiences]);
  async function act(job: () => Promise<void>) { if (busy) return; setBusy(true); setError(""); setNotice("");
    try { await job(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos completar la acción."); }
    finally { setBusy(false); }
  }
  async function prepare() { if (!plan || !proposal || !chosen) return;
    await act(async () => { const result = await prepareSimpleProject({ request, planId: plan.id,
      proposalId: chosen, proposal, additionalContext: combineProjectContext(context, contextExtras), experience: row,
      feedback: { usePlanningFeedback: Boolean(props.feedbackPeriodId), planningFeedbackPeriodId: props.feedbackPeriodId },
      onCheckpoint: (saved: Experience) => setRow(saved) });
      setRow(result); setContext(result.details.decisions?.additional_context ?? ""); setContextExtras({}); setChanging(false); setNotice("Proyecto preparado. Revísalo antes de confirmar."); });
  }
  async function confirm() { if (!row) return; await act(async () => {
    await request(`/api/project-flow/${row.id}/confirm`, { expectedRevision: row.revision });
    const result = await request<{ experience: Experience }>(`/api/project-flow/${row.id}`);
    setRow(result.experience); setNotice("Proyecto confirmado."); props.onConfirmed?.();
  }); }
  async function newVersion() { if (!row) return; await act(async () => {
    const copy = await request<{ id: string }>(`/api/learning-experiences/${row.id}/new-version`, { expectedRevision: row.revision });
    const result = await request<{ experience: Experience }>(`/api/project-flow/${copy.id}`);
    setRow(result.experience); setContext(result.experience.details.decisions?.additional_context ?? ""); setContextExtras({}); setChanging(true);
    setNotice("Nueva versión en borrador. La anterior permanece confirmada.");
  }); }
  if (advanced) return <div className="space-y-4"><Button variant="outline" onClick={() => { setAdvanced(false); setOpenedProposal(null); setRow(null); setLoading(true); setReload((value) => value + 1); }}>Volver a la vista sencilla</Button>
    <ProjectDevelopmentWorkspace {...props} initialProposalId={chosen} /></div>;
  if (loading) return <LoadingState label="Abriendo Mi año…" />;
  const existingForChosen = chosen && experiences.some((entry) => entry.status !== "archived" && entry.annual_plan_id === plan?.id &&
    (entry.source_proposal_id === chosen || (!entry.source_proposal_id && entry.source_proposal_index === index)));
  if (existingForChosen && openedProposal !== chosen) return error ? <WorkflowFeedback tone="error">{error}
    <Button variant="outline" onClick={() => { setError(""); setReload(value => value + 1); }}>Volver a intentar</Button></WorkflowFeedback> : <LoadingState label="Abriendo el proyecto guardado…" />;
  const prepared = row?.details.stage === "map_review" || row?.status === "active";
  const name = (id: string) => names[id] ?? id;
  return <section className="ayni-workflow space-y-5"><header><p className="text-sm font-semibold text-[#087d96]">Mi año → Proyecto</p>
    <h1 className="text-3xl font-extrabold">{proposal?.title ?? "Elige una propuesta de Mi año"}</h1></header>
    {error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}{notice && <WorkflowFeedback tone="success">{notice}</WorkflowFeedback>}
    {!proposal ? <><div className="grid gap-3 sm:grid-cols-2">{plan?.proposal.proposed_experiences.map((item, position) => {
      const id = idAt(item, position); const existing = experiences.find((entry) => entry.status !== "archived" && entry.annual_plan_id === plan.id &&
        (entry.source_proposal_id === id || (!entry.source_proposal_id && entry.source_proposal_index === position)));
      return <article key={id} className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">{position + 1}. {item.title}</h2>
        <p className="my-2 text-sm text-[#526b87]">{item.period} · {item.purpose}</p>
        <Button disabled={!id || busy} onClick={() => { setOpenedProposal(null); setRow(null); setContext(""); setContextExtras({}); setChanging(false); setError(""); setNotice(""); setChosen(id); }}>{existing?.status === "active" ? "Ver proyecto confirmado" : existing ? "Continuar proyecto" : "Usar esta propuesta"}</Button></article>;
    })}</div>{!plan && <Button onClick={props.onGoAnnual}>Completar Mi año</Button>}</> : <>
      <p className="text-sm text-[#526b87]">{row ? `Versión ${row.version} · ${row.status === "active" ? "confirmada" : "borrador"}` : proposal.period}</p>
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
        <AsyncButton busy={busy} busyLabel="Preparando proyecto…" disabled={busy} onClick={() => void prepare()}>
          {context.trim() || Object.values(contextExtras).some(value => value.trim()) ? "Preparar con este contexto" : "No hay nada nuevo; usar la propuesta de Mi año"}</AsyncButton>
        <Button variant="outline" disabled={busy} onClick={() => setAdvanced(true)}>Cambiar propósito, competencias o días</Button>
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
          <ol className="mt-4 space-y-3">{row.details.activity_route?.map((item) => <li key={item.id} className="rounded-lg border p-3"><b>{item.date} · {item.title}</b><p>{item.specific_purpose}</p>
            <p className="text-sm">{name(item.criterion_competency_id)} · {item.evaluation_criterion}</p><p className="text-sm">Evidencia: {item.expected_evidence}</p>
            <p className="text-sm"><b>Progresión:</b> {item.expected_progression}</p><p className="text-sm"><b>Papel en el proyecto:</b> {item.role_in_project}</p>
            <p className="text-sm"><b>Mediación:</b> {item.mediation_notes}</p><p className="text-sm"><b>Recursos:</b> {item.materials?.join(" · ")}</p>
            {row.status === "active" && <Button className="mt-2" onClick={() => props.onDevelopActivity?.(row.id, item.id)}>Desarrollar actividad</Button>}</li>)}</ol></details>
        <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" disabled={busy} onClick={() => { setChosen(null); setRow(null); setLoading(true); setReload(value => value + 1); }}>← Volver a Mi año</Button>
          {row.status === "draft" ? <div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => setChanging(true)}>Quiero cambiar algo</Button>
            <AsyncButton busy={busy} busyLabel="Confirmando…" disabled={busy} onClick={() => void confirm()}>Confirmar proyecto →</AsyncButton></div>
            : <Button variant="outline" disabled={busy} onClick={() => void newVersion()}>Preparar una nueva versión</Button>}</div>
        <Button variant="outline" disabled={busy} onClick={() => setAdvanced(true)}>Abrir detalle editable e imágenes</Button>
      </section>}
    </>}
  </section>;
}
