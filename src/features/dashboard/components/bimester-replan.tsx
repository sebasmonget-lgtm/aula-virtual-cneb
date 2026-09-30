"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { newAyniFeatureEnabled } from "@/src/lib/new-ayni-feature-flag.mjs";
import { Button } from "@/components/ui/button";
import { LoadingState, WorkflowFeedback } from "./workflow-ui";

type Competency = { competency_id: string; name: string; tone: "well" | "opportunities" | "attention";
  reason: string; without_evidence: number; attention: number; developing: number; evidence_coverage: number };
type Preview = { classroom_id: string; period: { id: string; label: string; ends_on: string };
  next_period: { id: string; label: string } | null;
  annual_unvalued:number|null;
  closure: { closed: boolean; current: boolean; current_version_id: string | null; source_fingerprint: string };
  adjusted: boolean; workshop_options: { competency_id: string; resource_id: string; title: string; purpose: string; reason: string }[];
  available_workshops: { resource_id: string; title: string; purpose: string; area: string }[];
  summary: { students_total: number; assessments_confirmed: number; assessments_total: number; assessments_resolved:number;observation_pending:number;review_pending:number;
    competencies_evaluated: number; students_needing_observation: number;
    observation_students: { id: string; name: string }[]; competencies: Competency[] };
  plan: { id: string; revision: number; version: number; proposals: { proposal_id: string; title: string;
    competency_ids: string[]; competency_names: string[]; starts_on: string; ends_on: string;
    editable: boolean; reason_locked: string }[] } | null };
type Workspace = { years: { id: string }[]; classrooms: { id: string; school_year_id: string }[];
  periods: { id: string; school_year_id: string; label: string; starts_on: string; ends_on: string }[] };
type PriorityChoice = "prioritize" | "maintain" | "not_prioritize";
type Adjustment = { proposal_id: string; competency_id: string; choice: "accept" | "keep" };
type WorkshopChoice = "recommended" | "library" | "create" | "ignore";

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await apiFetch(`${localDatabaseApiUrl}${path}`, { method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  const result = await response.json() as T & { error?: string; message?: string };
  if (!response.ok) throw new Error(result.message ?? result.error ?? "No se pudo completar la revisión.");
  return result;
}

const toneStyle = { well: "bg-[#e9f8f2] text-[#287561]", opportunities: "bg-[#fff3da] text-[#976318]",
  attention: "bg-[#fff0eb] text-[#a64b37]" };
const toneLabel = { well: "Va bien", opportunities: "Más oportunidades", attention: "Necesita atención" };
const steps = ["Cerrar bimestre", "Mi aula", "Prioridades", "Reajustes", "Confirmar"];
const todayInPeru = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function BimesterReplan({ onEvaluation, onFinish }: { onEvaluation: () => void; onFinish: () => void }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [classroomId, setClassroomId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [step, setStep] = useState(0);
  const [priorities, setPriorities] = useState<Record<string, PriorityChoice>>({});
  const [adjustments, setAdjustments] = useState<Record<string, Adjustment>>({});
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [workshops, setWorkshops] = useState<Record<string, WorkshopChoice>>({});
  const [libraryTargets, setLibraryTargets] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [simpleEditing, setSimpleEditing] = useState(false);
  const simpleMode = newAyniFeatureEnabled(process.env.NEXT_PUBLIC_AYNI_F9_REPLAN);

  useEffect(() => { let live = true; api<Workspace>("/api/period-evaluations/workspace").then((data) => {
    if (!live) return;
    setWorkspace(data);
    const classroom = data.classrooms.find((item) => item.school_year_id === data.years[0]?.id);
    const today = todayInPeru();
    const periods = data.periods.filter((item) => item.school_year_id === classroom?.school_year_id);
    const selected = [...periods].reverse().find((item) => item.ends_on < today) ?? periods[0];
    setClassroomId(classroom?.id ?? ""); setPeriodId(selected?.id ?? "");
  }).catch((cause: Error) => { if (live) setError(cause.message); }); return () => { live = false; }; }, []);
  const reload = useCallback(async () => {
    if (!classroomId || !periodId) return;
    setPreview(await api<Preview>(`/api/period-evaluations/replan?classroomId=${classroomId}&periodId=${periodId}`));
  }, [classroomId, periodId]);
  useEffect(() => { let live = true; if (classroomId && periodId)
    api<Preview>(`/api/period-evaluations/replan?classroomId=${classroomId}&periodId=${periodId}`)
      .then((result) => { if (live) setPreview(result); })
      .catch((cause: Error) => { if (live) setError(cause.message); });
    return () => { live = false; }; }, [classroomId, periodId]);

  const candidates = useMemo(() => preview?.summary.competencies.filter((item) => item.tone !== "well") ?? [], [preview]);
  const chosen = candidates.filter((item) => (priorities[item.competency_id] ?? "maintain") === "prioritize");
  const editable = useMemo(() => preview?.plan?.proposals.filter((item) => item.editable) ?? [], [preview]);
  const simpleDiff = useMemo(() => {
    const capacity = new Map<string, number>();
    return candidates.slice(0, 3).flatMap((competency) => {
      const proposal = [...editable].sort((a, b) => a.starts_on.localeCompare(b.starts_on))
        .find((item) => !item.competency_ids.includes(competency.competency_id)
          && (capacity.get(item.proposal_id) ?? item.competency_ids.length) < 5);
      if (!proposal) return [];
      capacity.set(proposal.proposal_id, (capacity.get(proposal.proposal_id) ?? proposal.competency_ids.length) + 1);
      return [{ competency, proposal }];
    });
  }, [candidates, editable]);
  const suggestions = chosen.map((competency, index) => {
    const available = editable.filter((proposal) => !proposal.competency_ids.includes(competency.competency_id)
      && proposal.competency_ids.length < 5);
    return { competency, available, proposal: available.find((item) => item.proposal_id === targets[competency.competency_id])
      ?? available[index % available.length] };
  }).filter((item) => item.proposal);
  const accepted = suggestions.filter(({ competency, proposal }) =>
    adjustments[competency.competency_id]?.choice === "accept"
      && adjustments[competency.competency_id]?.proposal_id === proposal?.proposal_id);
  const adjustedProjects = new Set(accepted.map(({ proposal }) => proposal?.proposal_id)).size;
  const selectedWorkshops = chosen.filter((item) => workshops[item.competency_id]
    && workshops[item.competency_id] !== "ignore").length;
  const period = workspace?.periods.find((item) => item.id === periodId);
  const closureReady=Boolean(preview && preview.summary.assessments_total>0
    && preview.summary.assessments_resolved===preview.summary.assessments_total
    && (preview.annual_unvalued===null||preview.annual_unvalued===0));

  async function closePeriod() {
    if (!preview) return;
    setBusy(true); setError("");
    try {
      await api("/api/period-evaluations/close", { classroomId, periodId,
        expectedCurrentVersionId: preview.closure.current_version_id,
        expectedSourceFingerprint: preview.closure.source_fingerprint });
      await reload(); setStep(1);
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }
  async function confirmWith(decisions: { priorities: { competency_id: string; choice: PriorityChoice }[];
    adjustments: Adjustment[]; workshops: { competency_id: string; choice: WorkshopChoice; resource_id?: string }[] }) {
    if (!preview?.plan?.id || !preview.closure.current_version_id) return;
    setBusy(true); setError("");
    try {
      await api("/api/period-evaluations/replan/confirm", { classroomId, periodId,
        expected: { plan_id: preview.plan.id, plan_revision: preview.plan.revision,
          closure_version_id: preview.closure.current_version_id },
        ...decisions });
      setFinished(true); await reload();
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }
  async function confirm() {
    await confirmWith({ priorities: candidates.map((item) => ({ competency_id: item.competency_id,
      choice: priorities[item.competency_id] ?? "maintain" })),
      adjustments: suggestions.map(({ competency, proposal }) => ({ proposal_id: proposal!.proposal_id,
        competency_id: competency.competency_id,
        choice: adjustments[competency.competency_id]?.choice === "accept" ? "accept" : "keep" })),
      workshops: chosen.map((item) => ({ competency_id: item.competency_id,
        choice: workshops[item.competency_id] ?? "ignore",
        resource_id: workshops[item.competency_id] === "recommended"
          ? preview?.workshop_options.find((option) => option.competency_id === item.competency_id)?.resource_id
          : workshops[item.competency_id] === "library" ? libraryTargets[item.competency_id] : undefined })) });
  }
  async function acceptSimpleDiff() {
    const ids = new Set(simpleDiff.map((item) => item.competency.competency_id));
    await confirmWith({ priorities: candidates.map((item) => ({ competency_id: item.competency_id,
      choice: ids.has(item.competency_id) ? "prioritize" : "maintain" })),
      adjustments: simpleDiff.map(({ competency, proposal }) => ({ proposal_id: proposal.proposal_id,
        competency_id: competency.competency_id, choice: "accept" })), workshops: [] });
  }
  const priorityCard = (item: Competency) => <article key={item.competency_id} className="rounded-2xl border bg-white p-4"><h3 className="font-extrabold">{item.name}</h3><p className="mt-1 text-sm text-[#566883]">{item.reason}</p>
    <div className="mt-3 grid grid-cols-3 gap-1">{([["prioritize", "Priorizar"], ["maintain", "Mantener"], ["not_prioritize", "No priorizar"]] as const).map(([value, label]) =>
      <button key={value} type="button" aria-pressed={(priorities[item.competency_id] ?? "maintain") === value}
        onClick={() => setPriorities((current) => ({ ...current, [item.competency_id]: value }))}
        className={`min-h-11 rounded-xl px-2 text-xs font-bold ${(priorities[item.competency_id] ?? "maintain") === value ? "bg-[#0b7891] text-white" : "bg-[#eef7fa] text-[#07576c]"}`}>{label}</button>)}</div></article>;

  if (!workspace || !preview) return <section className="mx-auto max-w-2xl">{error ? <WorkflowFeedback tone="error">{error}</WorkflowFeedback> : <LoadingState label="Revisando tu bimestre..." />}</section>;
  if (simpleMode && !simpleEditing && preview.closure.closed && preview.closure.current && preview.next_period && preview.plan && !preview.adjusted && !finished) return <section className="mx-auto max-w-2xl space-y-5 pb-8">
    <header><p className="text-sm font-bold text-[#087d96]">Reajuste después de {preview.period.label}</p>
      <h1 className="mt-1 text-3xl font-extrabold text-[#1c2e50]">Lo que conviene ajustar</h1>
      <p className="mt-2 text-[#526681]">El cierre y las actividades realizadas no cambiarán. Revisa la propuesta antes de decidir.</p></header>
    {error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {simpleDiff.length ? <div className="space-y-3">{simpleDiff.map(({ competency, proposal }) => <article key={competency.competency_id} className="rounded-2xl border bg-white p-5">
      <h2 className="font-extrabold">{proposal.title}</h2><p className="text-sm text-[#526681]">{proposal.starts_on} – {proposal.ends_on}</p>
      <p className="mt-3 text-xs font-bold text-[#526681]">ANTES</p><p className="text-sm">{proposal.competency_names.join(" · ") || "Sin competencias listadas"}</p>
      <p className="mt-3 text-xs font-bold text-[#087d96]">PROPUESTA</p><p className="text-sm">Conservar lo anterior y añadir {competency.name}.</p>
      <p className="mt-2 text-sm text-[#526681]">{competency.reason}</p></article>)}</div>
      : <p className="rounded-2xl bg-[#eef7fa] p-5">No hay un proyecto futuro sin desarrollar al que proponer un cambio. Puedes mantener tu plan o revisar otras opciones.</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button className="min-h-11 font-bold text-[#07576c]" onClick={onFinish}>Volver a Hoy</button>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setSimpleEditing(true); setStep(2); }}>Quiero cambiar algo</Button>
        {simpleDiff.length > 0 && <Button disabled={busy} onClick={() => void acceptSimpleDiff()}>{busy ? "Guardando..." : "Aceptar propuesta"}</Button>}</div></div>
  </section>;
  return <section className="mx-auto max-w-2xl space-y-5 pb-8">
    <header><p className="text-sm font-bold text-[#087d96]">Cierre y reajuste</p><h1 className="mt-1 text-3xl font-extrabold text-[#1c2e50]">Un paso a la vez</h1>
      <p className="mt-1 text-[#566883]">Lo que ya ocurrió queda guardado. Solo revisaremos lo que viene.</p></header>
    <label className="block text-sm font-semibold text-[#526681]">Período
      <select className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3" value={periodId} onChange={(event) => {
        setPreview(null); setPeriodId(event.target.value); setStep(0); setPriorities({}); setAdjustments({}); setTargets({}); setWorkshops({}); setLibraryTargets({}); setFinished(false); setError("");
      }}>{workspace.periods.filter((item) => item.school_year_id === workspace.classrooms.find((room) => room.id === classroomId)?.school_year_id).map((item) =>
        <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <div className="flex gap-1" aria-label={`Paso ${step + 1} de 5`}>{steps.map((label, index) =>
      <div key={label} className={`h-2 flex-1 rounded-full ${index <= step ? "bg-[#0b7891]" : "bg-[#dce7ef]"}`} title={label} />)}</div>
    <p className="text-sm font-bold text-[#087d96]">{step + 1} de 5 · {steps[step]}</p>
    {error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    {finished || preview.adjusted ? <div className="rounded-3xl bg-[#e9f8f2] p-6"><Check className="size-8 text-[#287561]" />
      <h2 className="mt-2 text-2xl font-extrabold">Plan reajustado</h2><p className="mt-2">Tu versión anterior y las actividades ya realizadas permanecen guardadas.</p>
      <Button className="mt-5" onClick={onFinish}>Volver a Hoy</Button></div> : !preview.plan ?
      <div className="rounded-2xl bg-white p-5">Confirma primero tu Plan Anual para revisar los proyectos futuros.</div> :
      <>
        {step === 0 && <div className="space-y-4 rounded-3xl border bg-white p-5"><h2 className="text-2xl font-extrabold">Terminamos {period?.label ?? preview.period.label}</h2>
          <p className="text-[#566883]">{preview.summary.assessments_confirmed} de {preview.summary.assessments_total} valoraciones confirmadas · {preview.summary.competencies_evaluated} competencias evaluadas · {preview.summary.students_total} niños</p>
          {(preview.summary.observation_pending+preview.summary.review_pending)>0 && <p className="rounded-xl bg-[#fff3da] p-3 text-sm">{preview.summary.observation_pending} pendientes de observación o información suficiente y {preview.summary.review_pending} con evidencia por revisar. Quedarán sin letra, visibles para nuevas oportunidades; ninguna se convierte en C.</p>}
          {preview.annual_unvalued!==null&&preview.annual_unvalued>0&&<p className="rounded-xl bg-[#fff3da] p-3 text-sm">Para cerrar el año faltan valoraciones docentes vigentes en {preview.annual_unvalued} pares niño–competencia aplicables.</p>}
          {preview.period.ends_on >= todayInPeru() && <p className="rounded-xl bg-[#fff3da] p-3 text-sm">Este período todavía está en curso. Regresa cuando termine para hacer el cierre.</p>}
          {preview.closure.closed && preview.closure.current ? <Button className="min-h-12 w-full" onClick={() => setStep(1)}>Ver cómo está mi aula <ChevronRight className="ml-2 size-4" /></Button>
            : <><Button className="min-h-12 w-full" disabled={busy || preview.period.ends_on >= todayInPeru() || !closureReady} onClick={() => void closePeriod()}>{busy ? "Cerrando..." : "Revisar y cerrar bimestre"}</Button>
              <button className="min-h-11 w-full font-bold text-[#07576c]" onClick={onEvaluation}>Revisar evaluaciones</button></>}</div>}
        {step === 1 && <div className="space-y-3"><h2 className="text-2xl font-extrabold">¿Cómo está mi aula?</h2><p className="text-[#566883]">Este resumen se basa en las valoraciones y evidencias registradas.</p>
          {(["attention", "opportunities", "well"] as const).map((tone) => { const items = preview.summary.competencies.filter((item) => item.tone === tone);
            return <details key={tone} className={`rounded-2xl p-4 ${toneStyle[tone]}`}><summary className="cursor-pointer font-bold">{toneLabel[tone]} · {items.length}</summary>
              <ul className="mt-3 space-y-2 text-sm">{items.map((item) => <li key={item.competency_id}><b>{item.name}</b><p>{item.reason}</p></li>)}</ul></details>; })}
          {preview.summary.students_needing_observation > 0 && <details className="rounded-2xl bg-[#eef7fa] p-4"><summary className="cursor-pointer font-bold text-[#07576c]">{preview.summary.students_needing_observation} niños necesitan más oportunidades de observación</summary>
            <p className="mt-2 text-sm text-[#526681]">Son registros pendientes, no una valoración negativa.</p><ul className="mt-2 list-disc pl-5 text-sm">{preview.summary.observation_students.map((item) => <li key={item.id}>{item.name}</li>)}</ul></details>}
          {preview.next_period ? <Button className="min-h-12 w-full" onClick={() => setStep(2)}>Elegir prioridades <ChevronRight className="ml-2 size-4" /></Button>
            : <div className="rounded-2xl bg-[#e9f8f2] p-4"><p>Este fue el último período del año. Tu cierre ya quedó guardado.</p><Button className="mt-3" onClick={onFinish}>Volver a Hoy</Button></div>}</div>}
        {step === 2 && <div className="space-y-3"><h2 className="text-2xl font-extrabold">¿Qué conviene priorizar?</h2><p className="text-[#566883]">Ayni te propone opciones. Tú decides.</p>
          {candidates.length ? <>{candidates.slice(0, 3).map(priorityCard)}{candidates.length > 3 && <details className="rounded-2xl bg-[#eef7fa] p-3"><summary className="cursor-pointer font-bold text-[#07576c]">Ver otras {candidates.length - 3} competencias</summary><div className="mt-3 space-y-3">{candidates.slice(3).map(priorityCard)}</div></details>}</>
            : <p className="rounded-2xl bg-[#e9f8f2] p-4">No aparecen alertas que requieran una nueva prioridad. Puedes conservar el plan.</p>}
          <Button className="min-h-12 w-full" onClick={() => setStep(3)}>Ver reajustes <ChevronRight className="ml-2 size-4" /></Button></div>}
        {step === 3 && <div className="space-y-3"><h2 className="text-2xl font-extrabold">Revisemos lo que viene</h2><p className="text-[#566883]">Nada cambia hasta que confirmes.</p>
          {suggestions.length ? suggestions.map(({ competency, available, proposal }) => <details name="replan-project-suggestion" key={competency.competency_id} className="rounded-2xl border bg-white p-4"><summary className="cursor-pointer font-extrabold">{proposal?.title} · {competency.name}</summary><div className="mt-3"><p className="text-xs font-bold text-[#526681]">ANTES</p><h3 className="mt-1 font-extrabold">{proposal?.title}</h3>
            <p className="mt-1 text-sm text-[#566883]">{proposal?.competency_names.join(" · ") || "Competencias actuales del proyecto"}</p>
            <p className="mt-3 text-xs font-bold text-[#087d96]">AYNI PROPONE</p><p className="font-semibold">Mantener el proyecto y sumar {competency.name}</p><p className="mt-2 text-sm text-[#566883]"><b>¿Por qué?</b> {competency.reason}</p>
            {editing === competency.competency_id && <label className="mt-3 block text-sm font-semibold">Elegir otro proyecto futuro<select className="mt-1 min-h-11 w-full rounded-xl border px-3" value={proposal?.proposal_id} onChange={(event) => { setTargets((current) => ({ ...current, [competency.competency_id]: event.target.value })); setAdjustments((current) => ({ ...current, [competency.competency_id]: { proposal_id: event.target.value, competency_id: competency.competency_id, choice: "accept" } })); }}>
              {available.map((item) => <option key={item.proposal_id} value={item.proposal_id}>{item.title}</option>)}</select></label>}
            <div className="mt-4 grid grid-cols-3 gap-2"><button className={`min-h-11 rounded-xl text-sm font-bold ${adjustments[competency.competency_id]?.choice === "accept" ? "bg-[#0b7891] text-white" : "bg-[#e8f7fa] text-[#07576c]"}`} onClick={() => setAdjustments((current) => ({ ...current, [competency.competency_id]: { proposal_id: proposal!.proposal_id, competency_id: competency.competency_id, choice: "accept" } }))}>Aceptar</button>
              <button className="min-h-11 rounded-xl bg-[#f1f5f9] text-sm font-bold" onClick={() => setEditing(editing === competency.competency_id ? null : competency.competency_id)}>Editar</button>
              <button className="min-h-11 rounded-xl bg-[#f1f5f9] text-sm font-bold" onClick={() => setAdjustments((current) => ({ ...current, [competency.competency_id]: { proposal_id: proposal!.proposal_id, competency_id: competency.competency_id, choice: "keep" } }))}>Mantener</button></div></div></details>)
            : <p className="rounded-2xl bg-[#eef7fa] p-4">No hay proyectos futuros sin desarrollar que convenga modificar aquí. Puedes mantener el plan y revisar los proyectos ya preparados desde Planificar.</p>}
          {chosen.length > 0 && <details className="rounded-2xl border bg-white p-4"><summary className="cursor-pointer font-bold">Talleres para más oportunidades</summary><p className="mt-2 text-sm text-[#566883]">Estas ideas quedarán guardadas para prepararlas después.</p>
            {chosen.map((item) => { const resource = preview.workshop_options.find((option) => option.competency_id === item.competency_id);
              return <label className="mt-3 block text-sm" key={item.competency_id}><b>{item.name}</b><span className="mt-1 block text-[#566883]">{item.reason}</span><select className="mt-1 min-h-11 w-full rounded-xl border px-3" value={workshops[item.competency_id] ?? "ignore"} onChange={(event) => setWorkshops((current) => ({ ...current, [item.competency_id]: event.target.value as WorkshopChoice }))}>
                <option value="ignore">Ahora no</option>{resource && <option value="recommended">Usar “{resource.title}” después</option>}{preview.available_workshops.length > 0 && <option value="library">Elegir de Biblioteca</option>}<option value="create">Crear uno después</option></select>
                {workshops[item.competency_id] === "library" && <select aria-label={`Taller de biblioteca para ${item.name}`} className="mt-2 min-h-11 w-full rounded-xl border px-3" value={libraryTargets[item.competency_id] ?? ""}
                  onChange={(event) => setLibraryTargets((current) => ({ ...current, [item.competency_id]: event.target.value }))}>
                  <option value="">Elige un taller</option>{preview.available_workshops.map((option) => <option key={option.resource_id} value={option.resource_id}>{option.title}</option>)}</select>}</label>; })}</details>}
          <Button className="min-h-12 w-full" onClick={() => setStep(4)}>Revisar cambios <ChevronRight className="ml-2 size-4" /></Button></div>}
        {step === 4 && <div className="space-y-4 rounded-3xl border bg-white p-5"><h2 className="text-2xl font-extrabold">Tu plan para {preview.next_period?.label ?? "lo que sigue"}</h2>
          <p className="text-[#566883]">{adjustedProjects} {adjustedProjects === 1 ? "proyecto reajustado" : "proyectos reajustados"} · {selectedWorkshops} {selectedWorkshops === 1 ? "idea de taller" : "ideas de taller"} · {chosen.length} {chosen.length === 1 ? "prioridad" : "prioridades"}</p>
          <p className="text-sm text-[#566883]">Se creará una nueva versión de “Mi año”. El cierre, las actividades realizadas y el plan anterior quedan guardados.</p>
          <Button className="min-h-12 w-full" disabled={busy} onClick={() => void confirm()}>{busy ? "Guardando..." : "Actualizar mi planificación"}</Button></div>}
        {step > 0 && <button className="inline-flex min-h-11 items-center gap-1 font-bold text-[#07576c]" onClick={() => setStep((value) => value - 1)}><ChevronLeft className="size-4" /> Volver</button>}
      </>}
  </section>;
}
