"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AsyncButton, CompetencyChecklist, LoadingState, WorkflowFeedback } from "./workflow-ui";
import { LearningExperienceGenerator } from "./learning-experience-generator";
import { projectDraftChanges } from "@/src/lib/project-draft-changes.mjs";

type Proposal = { proposal_id?: string; experience_type: "project" | "unit"; title: string; purpose: string;
  rationale: string; period: string; primary_competency_ids: string[] };
type Plan = { id: string; revision: number; proposal: { plan_format?: string; proposed_experiences: Proposal[] }; project_slots: { id: string;
  proposal_id?: string | null; slot_index: number;
  starts_on: string; ends_on: string }[] };
type Decision = { context_summary: string; purpose: string; competency_ids: string[]; additional_context: string };
type Criterion = { competency_id: string; criterion: string; expected_evidence: string[] };
type Dependents = { guiding_questions: string[]; journey: { title: string; description: string }[];
  general_criteria: Criterion[] };
type Route = { id: string; number: number; date: string; title: string; specific_purpose: string;
  competency_id: string; competency_ids: string[]; criterion_competency_id: string;
  evaluation_criterion: string; expected_evidence: string; role_in_project: string;
  expected_progression: string; estimated_minutes: number };
type Details = { flow_version?: string; stage?: string; preview?: { context_summary: string; context_points: string[];
  purpose_options: string[]; additional_context_example: string }; decisions?: Decision;
  dependents?: Dependents; project_master?: { foundation: string; closing_description: string; closing_rationale: string };
  activity_route?: Route[]; previous_map?: Route[] | null; image_id?: string | null; image_suggested_id?: string | null };
type Experience = { id: string; annual_plan_id: string; source_proposal_id: string | null;
  source_proposal_index: number; title: string; type: "project" | "unit"; status: "draft" | "active" | "archived";
  version: number; revision: number; details: Details };
type Competency = { id: string; name: string };
type CalendarReview = { selection: { id: string; status: "draft" | "confirmed"; starts_on: string; ends_on: string; revision: number };
  days: { id: string; date: string; calendar_type: string; is_instructional: boolean; editable: boolean; reason: string;
    selected: boolean; exclusion_reason: string | null }[]; selected_dates: string[] };
const api = (path: string) => `${localDatabaseApiUrl}${path}`;
async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(api(path), init);
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "No pudimos completar la acción.");
  return result;
}
const post = (value: unknown): RequestInit => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
const dateLabel = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value.slice(8)}/${value.slice(5, 7)}` : value;
const localDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function ProjectDevelopmentWorkspace({ initialProposalId, onConfirmed, onDevelopActivity, onGoAnnual }: {
  initialProposalId?: string | null; onConfirmed?: () => void;
  onDevelopActivity?: (experienceId: string, routeItemId: string) => void;
  onGoAnnual?: () => void }) {
  const [plan, setPlan] = useState<Plan | null>(null), [experiences, setExperiences] = useState<Experience[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]), [selected, setSelected] = useState<Experience | null>(null);
  const [dates, setDates] = useState<string[]>([]), [decisions, setDecisions] = useState<Decision | null>(null);
  const [calendarReview,setCalendarReview]=useState<CalendarReview|null>(null);
  const [step, setStep] = useState(0);
  const [dependents, setDependents] = useState<Dependents | null>(null), [route, setRoute] = useState<Route[]>([]);
  const [protectedRouteIds, setProtectedRouteIds] = useState<string[]>([]);
  const [editingRoute, setEditingRoute] = useState<string | null>(null), [busy, setBusy] = useState<string | null>(null);
  const [showEmergent, setShowEmergent] = useState(false), [emergentSituation, setEmergentSituation] = useState("");
  const [emergent, setEmergent] = useState<{ title: string; rationale: string; purpose: string;
    primary_competency_ids: string[]; duration_weeks: 2 | 3 } | null>(null);
  const [emergentCompetencySuggestion, setEmergentCompetencySuggestion] = useState<string[] | null>(null);
  const [emergentMode, setEmergentMode] = useState<"keep" | "postpone" | "replace">("replace");
  const [emergentTargetId, setEmergentTargetId] = useState("");
  const [imageOptions, setImageOptions] = useState<{ id: string; title: string; description: string }[]>([]);
  const [imageSuggestedId, setImageSuggestedId] = useState<string | null>(null);
  const [imageOptionsError, setImageOptionsError] = useState(false);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [legacy, setLegacy] = useState(false);
  const autoOpened = useRef<string | null>(null);
  const imageLoadRequest = useRef(0);
  const proposal = plan?.proposal.proposed_experiences[selected?.source_proposal_index ?? -1];
  const proposalIdAt = (index: number) => plan?.proposal.proposed_experiences[index]?.proposal_id ??
    plan?.project_slots.find((slot) => slot.slot_index === index + 1)?.id ?? "";
  const options = new Map(competencies.map((item) => [item.id, item.name]));
  const name = (id: string) => options.get(id) ?? id;
  const { decisionsChanged, mapChanged, depChanged } = projectDraftChanges(selected?.details, decisions, dependents, route);
  function showExperience(experience: Experience, availableDates: string[] = [],review:CalendarReview|null=null,
    protectedIds: string[] = []) {
    setSelected(experience); setDates(availableDates); setEditingRoute(null);
    setProtectedRouteIds(protectedIds);
    setCalendarReview(review);
    setStep(experience.status === "active" ? 8 : experience.details.stage === "map_review" ? 7 :
      experience.details.stage === "dependents" ? 3 : 0);
    const source = plan?.proposal.proposed_experiences[experience.source_proposal_index];
    setDecisions(experience.details.decisions ?? { context_summary: experience.details.preview?.context_summary ?? "",
      purpose: experience.details.preview?.purpose_options?.[0] ?? source?.purpose ?? "",
      competency_ids: source?.primary_competency_ids ?? [],
      additional_context: "" });
    setDependents(experience.details.dependents ?? null);
    setRoute(experience.details.activity_route ?? []);
    setImageOptions([]);
    setImageSuggestedId(experience.details.image_suggested_id ?? null);
    setImageOptionsError(false);
    const requestNumber = ++imageLoadRequest.current;
    if (experience.details.stage === "map_review" || experience.status === "active") {
      void json<{ images: { id: string; title: string; description: string }[] }>(
        `/api/project-flow/${experience.id}/image-options`).then((result) => {
          if (imageLoadRequest.current === requestNumber) setImageOptions(result.images);
        }).catch(() => { if (imageLoadRequest.current === requestNumber) setImageOptionsError(true); });
    }
  }
  async function chooseProjectImage(imageId: string | null) { if (!selected) return;
    await act("image", async () => {
      const result = await json<{ experience: Experience }>(`/api/project-flow/${selected.id}/image`, {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageId, expectedRevision: selected.revision }),
      });
      showExperience(result.experience, dates, calendarReview, protectedRouteIds);
      setNotice(imageId ? "Imagen guardada para revisar con el proyecto." : "Proyecto guardado sin imagen.");
    });
  }
  async function suggestProjectImageAgain() { if (!selected) return;
    await act("image-suggestion", async () => {
      const result = await json<{ suggested_id: string | null; images: { id: string; title: string; description: string }[] }>(
        `/api/project-flow/${selected.id}/image-suggestion`, post({ expectedRevision: selected.revision }));
      setImageOptions(result.images);
      setImageSuggestedId(result.suggested_id);
      setNotice(result.suggested_id ? "Ayni recomienda una imagen. Puedes elegirla o cambiarla."
        : "Ayni no encontró una imagen adecuada. Puedes elegir una o continuar sin imagen.");
    });
  }
  async function refresh() {
    const [plans, list, cards] = await Promise.all([
      json<{ active: Plan | null }>("/api/annual-plans/current"),
      json<{ experiences: Experience[] }>("/api/learning-experiences"),
      json<{ competencies: Competency[] }>("/api/ai/competency-options?workflow=project")]);
    setPlan(plans.active); setExperiences(list.experiences); setCompetencies(cards.competencies);
    return { plan: plans.active, experiences: list.experiences };
  }
  useEffect(() => { let live = true; void Promise.resolve().then(refresh).catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : "No pudimos abrir los proyectos."); })
    .finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, []);
  async function act(key: string, job: () => Promise<void>) { if (busy) return; setBusy(key); setError(""); setNotice("");
    try { await job(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos completar esta acción."); }
    finally { setBusy(null); } }
  async function openProposal(proposalId: string) { if (!plan) return;
    const index = plan.proposal.proposed_experiences.findIndex((_, position) => proposalIdAt(position) === proposalId);
    const existing = experiences.filter((item) =>
      (item.source_proposal_id === proposalId || (item.annual_plan_id === plan.id && !item.source_proposal_id && item.source_proposal_index === index)) &&
      item.status !== "archived")
      .sort((a, b) => b.version - a.version)[0];
    if (existing && ["project-master-v1","project-master-v2"].includes(existing.details.flow_version ?? "")) {
      await act("open", async () => { const result = await json<{ experience: Experience; available_dates: string[];calendar_review:CalendarReview;protected_route_ids:string[] }>(`/api/project-flow/${existing.id}`);
        showExperience(result.experience, result.available_dates,result.calendar_review,result.protected_route_ids); }); return;
    }
    if (existing) { setLegacy(true); return; }
    await act("start", async () => { const result = await json<{ experience: Experience; available_dates: string[];calendar_review:CalendarReview }>(
      "/api/project-flow/start", post({ annualPlanId: plan.id, proposalId }));
      const item = plan.proposal.proposed_experiences[index];
      setSelected(result.experience); setDates(result.available_dates);setCalendarReview(result.calendar_review);
      setStep(0);
      setDecisions({ context_summary: result.experience.details.preview?.context_summary ?? "",
        purpose: result.experience.details.preview?.purpose_options?.[0] ?? item?.purpose ?? "",
        competency_ids: item?.primary_competency_ids ?? [], additional_context: "" });
      setDependents(null); setRoute([]); await refresh();
      setNotice("Revisa el contexto y elige el propósito antes de continuar."); });
  }
  const openProposalRef = useRef(openProposal);
  useEffect(() => { openProposalRef.current = openProposal; });
  useEffect(() => { if (!initialProposalId || !plan || loading || autoOpened.current === initialProposalId) return;
    autoOpened.current = initialProposalId;
    void openProposalRef.current(initialProposalId);
  }, [initialProposalId, plan, loading]);
  async function prepareDependents() { if (!selected || !decisions) return;
    await act("dependents", async () => { const result = await json<{ experience: Experience }>(`/api/project-flow/${selected.id}/dependents`,
      post({ decisions, expectedRevision: selected.revision }));
      setSelected(result.experience); setDependents(result.experience.details.dependents ?? null); setRoute([]);
      setStep(3);
      setNotice("Preguntas y criterios listos para revisar."); }); }
  async function prepareMaster() { if (!selected || !dependents) return;
    await act("master", async () => { const result = await json<{ experience: Experience }>(`/api/project-flow/${selected.id}/master`,
      post({ dependents, expectedRevision: selected.revision }));
      showExperience(result.experience, dates, calendarReview, protectedRouteIds);
      setNotice("Mapa preparado. Revísalo y ajústalo antes de confirmar el proyecto."); }); }
  async function confirmCalendar(){if(!selected||!calendarReview)return;await act("calendar",async()=>{
    const selectedDates=calendarReview.days.filter((day)=>day.selected).map((day)=>day.date);
    const exclusions=Object.fromEntries(calendarReview.days.filter((day)=>day.is_instructional&&!day.selected).map((day)=>[day.date,day.exclusion_reason||"No se utilizará en este proyecto"]));
    await json(`/api/project-flow/${selected.id}/calendar`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({selectedDates,exclusions,confirm:true})});
    const fresh=await json<CalendarReview>(`/api/project-flow/${selected.id}/calendar`);setCalendarReview(fresh);setDates(fresh.selected_dates);
    setNotice(`${fresh.selected_dates.length} días confirmados. Ayni preparará ${fresh.selected_dates.length} actividades.`);
  });}
  async function saveMap() { if (!selected) return;
    await act("save", async () => { const result = await json<{ experience: Experience }>(`/api/project-flow/${selected.id}/map`,
      { method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ activity_route: route, expectedRevision: selected.revision }) });
      setSelected(result.experience); setRoute(result.experience.details.activity_route ?? []); setNotice("Mapa guardado."); }); }
  async function confirm() { if (!selected || mapChanged || decisionsChanged || depChanged) return;
    await act("confirm", async () => { await json(`/api/project-flow/${selected.id}/confirm`, post({ expectedRevision: selected.revision }));
      const result = await json<{ experience: Experience; available_dates: string[];calendar_review:CalendarReview;protected_route_ids:string[] }>(`/api/project-flow/${selected.id}`);
      showExperience(result.experience, result.available_dates,result.calendar_review,result.protected_route_ids); await refresh(); onConfirmed?.();
      setNotice("Proyecto confirmado. Las actividades se desarrollarán una por una desde este mapa."); }); }
  async function formalize() { if (!selected) return;
    await act("formal", async () => { await json(`/api/project-flow/${selected.id}/formalize`, post({}));
      setNotice("Word preparado. Lo encontrarás en Documentos para descargar."); }); }
  async function copyVersion() { if (!selected) return;
    await act("copy", async () => { const copied = await json<{ id: string }>(`/api/learning-experiences/${selected.id}/new-version`,
      post({ expectedRevision: selected.revision })); await refresh();
      const result = await json<{ experience: Experience; available_dates: string[];calendar_review:CalendarReview;protected_route_ids:string[] }>(`/api/project-flow/${copied.id}`);
      showExperience(result.experience, result.available_dates,result.calendar_review,result.protected_route_ids);
      setNotice("Nueva versión en revisión. La versión confirmada permanece disponible."); }); }
  async function suggestEmergent() { if (!plan) return;
    await act("emergent", async () => { const result = await json<{ proposal: { title: string; rationale: string; purpose: string;
      primary_competency_ids: string[] }; competency_suggestion: string[] | null }>("/api/project-flow/emergent-preview", post({ situation: emergentSituation }));
      setEmergent({ ...result.proposal, duration_weeks: 2 });
      setEmergentCompetencySuggestion(result.competency_suggestion);
      setEmergentTargetId(plan.proposal.proposed_experiences[Math.min(suggestedIndex - 1,
        plan.proposal.proposed_experiences.length - 1)]?.proposal_id ?? "");
      setNotice("Revisa la propuesta y decide cómo incorporarla a «Mi año»."); }); }
  async function prepareEmergentAnnual() { if (!plan || !emergent) return;
    await act("emergent-save", async () => { await json("/api/project-flow/emergent-annual-draft", post({ annualPlanId: plan.id,
      expectedRevision: plan.revision, targetProposalId: emergentTargetId, mode: emergentMode, proposal: emergent }));
      setShowEmergent(false); setEmergent(null); setEmergentCompetencySuggestion(null);
      setNotice("Nueva versión de «Mi año» lista para revisar y confirmar.");
      onGoAnnual?.(); }); }
  function updateRoute(id: string, changes: Partial<Route>) { if (protectedRouteIds.includes(id)) return;
    setRoute((before) => before.map((item) => item.id === id ? { ...item, ...changes } : item)); }
  function moveRoute(index: number, delta: number) { const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= route.length) return;
    if (protectedRouteIds.includes(route[index].id) || protectedRouteIds.includes(route[nextIndex].id)) return;
    const next = [...route], earlier = next[index], later = next[nextIndex];
    next[index] = { ...later, date: earlier.date, number: index + 1 };
    next[nextIndex] = { ...earlier, date: later.date, number: nextIndex + 1 }; setRoute(next); }
  const currentEdit = route.find((item) => item.id === editingRoute);
  const suggestedIndex = plan?.project_slots.find((slot) => localDay() <= slot.ends_on.slice(0, 10))?.slot_index ?? 1;
  if (loading) return <LoadingState label="Abriendo proyectos y unidades..." />;
  if (legacy) return <div className="space-y-3"><Button variant="outline" onClick={() => setLegacy(false)}>← Volver a proyectos</Button>
    <LearningExperienceGenerator onConfirmed={onConfirmed} /></div>;
  return <section className="ayni-workflow space-y-5"><header><p className="text-sm font-semibold text-[#087d96]">Paso 5 de 6 · Proyecto o unidad</p>
    <h1 className="text-3xl font-extrabold text-[#172b52]">Desarrolla una propuesta</h1>
    <p className="mt-2 text-[#526b87]">Primero decides el propósito. Después revisas las preguntas y el mapa de actividades antes de confirmar.</p></header>
    {error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}{notice && <WorkflowFeedback tone="success">{notice}</WorkflowFeedback>}
    {!selected ? <><section className="space-y-3"><h2 className="text-xl font-bold">Elige qué desarrollar</h2>
      <p className="text-sm text-[#526b87]">Ayni sugiere la propuesta que corresponde por fecha. Puedes elegir otra.</p>
      {(plan?.proposal.proposed_experiences ?? []).map((item, index) => { const proposalId = proposalIdAt(index);
        const found = experiences.find((row) =>
          (row.source_proposal_id === proposalId || (row.annual_plan_id === plan?.id && !row.source_proposal_id && row.source_proposal_index === index)) && row.status !== "archived");
        return <article key={proposalId || index} className={`rounded-2xl border bg-white p-4 ${suggestedIndex === index + 1 ? "border-[#087d96]" : "border-[#d6e5ef]"}`}>
          <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-bold">{item.title}</h3>{suggestedIndex === index + 1 && <span className="rounded-full bg-[#e8f6fa] px-3 py-1 text-xs font-bold text-[#087d96]">Te corresponde ahora</span>}</div>
          <p className="mt-1 text-sm text-[#526b87]">{item.period} · {item.rationale}</p>
          <Button className="mt-3" disabled={Boolean(busy) || !proposalId} onClick={() => void openProposal(proposalId)}>{found ? "Continuar propuesta" : "Desarrollar propuesta"}</Button>
        </article>; })}{!plan && <p>Confirma primero «Mi año» para continuar.</p>}</section>
      {plan?.proposal.plan_format !== "annual_preplan_v1" && <section className="rounded-2xl border border-[#d6e5ef] bg-[#f8fbff] p-4">
        <h3 className="font-bold">¿Surgió un interés nuevo en el grupo?</h3>
        <p className="mt-1 text-sm text-[#526b87]">Actualiza «Mi año» a la tabla editable para incorporar, postergar o reemplazar una propuesta.</p>
        <Button className="mt-3" variant="outline" onClick={onGoAnnual}>Ir a Mi año</Button>
      </section>}
      {plan?.proposal.plan_format === "annual_preplan_v1" && <section className="space-y-3 rounded-2xl border border-[#d6e5ef] bg-white p-4"><Button variant="outline" onClick={() => setShowEmergent(!showEmergent)}>
        + Nuevo proyecto por interés del grupo</Button>
        {showEmergent && <div className="space-y-3"><p className="text-sm text-[#526b87]">Cuéntanos qué ha surgido. Ayni propondrá una fila para «Mi año» y tú decidirás si se incorpora.</p>
          <label className="block font-semibold">¿Qué ocurrió o qué preguntan los niños?<Textarea className="mt-2" value={emergentSituation}
            onChange={(event) => setEmergentSituation(event.target.value)} placeholder="Por ejemplo: encontraron un nido y preguntan por las aves." /></label>
          {!emergent && <AsyncButton busy={busy === "emergent"} busyLabel="Preparando propuesta..." disabled={Boolean(busy) || emergentSituation.trim().length < 20}
            onClick={() => void suggestEmergent()}>Proponer proyecto</AsyncButton>}
          {emergent && <div className="space-y-3 rounded-xl bg-[#f2f8fc] p-4"><h3 className="font-bold">Revisa esta propuesta</h3>
            <label className="block font-semibold">Título<Input className="mt-2" value={emergent.title} onChange={(event) => setEmergent({ ...emergent, title: event.target.value })} /></label>
            <label className="block font-semibold">¿Por qué?<Textarea className="mt-2" value={emergent.rationale} onChange={(event) => setEmergent({ ...emergent, rationale: event.target.value })} /></label>
            <label className="block font-semibold">Propósito breve<Textarea className="mt-2" value={emergent.purpose} onChange={(event) => setEmergent({ ...emergent, purpose: event.target.value })} /></label>
            <CompetencyChecklist label="Competencias previstas" options={competencies} value={emergent.primary_competency_ids}
              onChange={(primary_competency_ids) => setEmergent({ ...emergent, primary_competency_ids })} />
            {emergentCompetencySuggestion && <div className="rounded-lg border border-[#b9dce5] bg-white p-3 text-sm">
              <p><b>Otra sugerencia para revisar:</b> {emergentCompetencySuggestion.length
                ? emergentCompetencySuggestion.map(name).join(" · ") : "No hay una competencia suficientemente sustentada en la descripción."}</p>
              {emergentCompetencySuggestion.length > 0 && <Button className="mt-2" variant="outline"
                onClick={() => setEmergent({ ...emergent, primary_competency_ids: emergentCompetencySuggestion })}>Usar esta sugerencia</Button>}
            </div>}
            <label className="block font-semibold">Duración<select className="mt-2 min-h-11 w-full rounded-lg border px-3" value={emergent.duration_weeks}
              onChange={(event) => setEmergent({ ...emergent, duration_weeks: Number(event.target.value) as 2 | 3 })}>
              <option value={2}>2 semanas lectivas</option><option value={3}>3 semanas lectivas</option></select></label>
            <label className="block font-semibold">Propuesta prevista que se verá afectada<select className="mt-2 min-h-11 w-full rounded-lg border px-3" value={emergentTargetId}
              onChange={(event) => setEmergentTargetId(event.target.value)}>{plan?.proposal.proposed_experiences.map((item) =>
                <option key={item.proposal_id} value={item.proposal_id}>{item.title}</option>)}</select></label>
            <label className="block font-semibold">¿Qué hacemos con ella?<select className="mt-2 min-h-11 w-full rounded-lg border px-3" value={emergentMode}
              onChange={(event) => setEmergentMode(event.target.value as typeof emergentMode)}>
              <option value="replace">Reemplazarla en esta versión</option><option value="postpone">Hacer primero la nueva y postergar la prevista</option>
              <option value="keep">Mantener la prevista y añadir después la nueva</option></select></label>
            <p className="text-sm text-[#526b87]">Se creará una versión de «Mi año» en borrador. La revisarás y confirmarás antes de desarrollar este proyecto.</p>
            <AsyncButton busy={busy === "emergent-save"} busyLabel="Preparando Mi año..." disabled={Boolean(busy) || !emergent.title.trim() || !emergent.purpose.trim() || !emergent.primary_competency_ids.length}
              onClick={() => void prepareEmergentAnnual()}>Revisar nueva versión de Mi año</AsyncButton></div>}
        </div>}</section>}
      <Button variant="outline" onClick={() => setLegacy(true)}>Ver proyectos anteriores</Button></> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#edf7fa] p-4"><div><b>{proposal?.title ?? selected.title}</b>
        <p className="text-sm">Versión {selected.version} · {selected.status === "active" ? "confirmada" : "en revisión"}</p></div>
        <Button variant="outline" onClick={() => setSelected(null)}>Elegir otra</Button></div>
      {selected.status === "draft" && <nav aria-label="Pasos del proyecto" className="flex flex-wrap gap-2">{["Contexto", "Propósito", "Competencias", "Preguntas", "Recorrido", "Evaluación", "Resumen", "Mapa"].map((label, index) =>
        <Button key={label} type="button" variant={step === index ? "default" : "outline"} size="sm"
          disabled={index >= 3 && !dependents || index === 7 && selected.details.stage !== "map_review"}
          onClick={() => setStep(index)}>{index + 1}. {label}</Button>)}</nav>}
      {selected.status === "draft" && decisions && step <= 2 && <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">{["1. Contexto que Ayni tendrá en cuenta", "2. ¿Qué buscamos con este proyecto?", "3. Competencias previstas"][step]}</h2>
        {step === 0 && <>
        <label className="block font-semibold">Contexto de este proyecto<Textarea className="mt-2" value={decisions.context_summary}
          onChange={(event) => setDecisions({ ...decisions, context_summary: event.target.value })} /></label>
        {selected.details.preview?.context_points?.length ? <p className="text-sm text-[#526b87]">Ayni tuvo en cuenta: {selected.details.preview.context_points.join(" · ")}</p> : null}
        <label className="block font-semibold">¿Hay algo más que quieras agregar? (opcional)<Textarea className="mt-2" value={decisions.additional_context}
          placeholder={selected.details.preview?.additional_context_example} onChange={(event) => setDecisions({ ...decisions, additional_context: event.target.value })} /></label>
        <Button disabled={!decisions.context_summary.trim()} onClick={() => setStep(1)}>Continuar al propósito</Button></>}
        {step === 1 && <>
        <fieldset className="space-y-2"><legend className="font-semibold">¿Qué propósito prefieres?</legend>
          {selected.details.preview?.purpose_options.map((option) => <label key={option} className="flex min-h-11 items-center gap-2 rounded-lg border p-3 text-sm"><input type="radio" name="project-purpose" checked={decisions.purpose === option}
            onChange={() => setDecisions({ ...decisions, purpose: option })} />{option}</label>)}</fieldset>
        <label className="block font-semibold">Puedes ajustar el propósito<Textarea className="mt-2" value={decisions.purpose}
          onChange={(event) => setDecisions({ ...decisions, purpose: event.target.value })} /></label>
        <Button disabled={!decisions.purpose.trim()} onClick={() => setStep(2)}>Continuar a competencias</Button></>}
        {step === 2 && <>
        <p className="text-sm text-[#526b87]">Estas competencias vienen de «Mi año». Puedes revisarlas si cambió el enfoque del proyecto.</p>
        <CompetencyChecklist label="Competencias que se trabajarán" value={decisions.competency_ids} options={competencies}
          onChange={(competency_ids) => setDecisions({ ...decisions, competency_ids })} />
        <AsyncButton busy={busy === "dependents"} busyLabel="Preparando preguntas..." disabled={Boolean(busy) || !decisions.context_summary.trim() || !decisions.purpose.trim() || !decisions.competency_ids.length}
          onClick={() => { if (!decisionsChanged && selected.details.dependents) setStep(3); else void prepareDependents(); }}>
          {decisionsChanged ? "Actualizar preguntas y recorrido" : "Continuar a preguntas"}</AsyncButton></>}
        {decisionsChanged && <p className="text-sm text-[#a56712]">Cambiaste una decisión inicial. Ayni actualizará solo las secciones que dependen de ella.</p>}
      </section>}
      {selected.status === "draft" && dependents && !decisionsChanged && step >= 3 && step <= 6 && <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">{["", "", "", "4. Preguntas para explorar", "5. Así podría desarrollarse", "6. Qué observaremos", "7. Resumen antes del mapa"][step]}</h2>
        <p className="text-sm text-[#526b87]">Revisa estas ideas antes de preparar el mapa. Puedes editarlas.</p>
        {step === 3 && <>
        <div className="space-y-2"><h3 className="font-semibold">Preguntas para explorar</h3>{dependents.guiding_questions.map((question, index) =>
          <Input key={index} aria-label={`Pregunta ${index + 1}`} value={question} onChange={(event) => setDependents({ ...dependents,
            guiding_questions: dependents.guiding_questions.map((item, i) => i === index ? event.target.value : item) })} />)}</div>
        <Button variant="outline" disabled={dependents.guiding_questions.length <= 2} onClick={() => setDependents({ ...dependents, guiding_questions: dependents.guiding_questions.slice(0, -1) })}>Quitar última pregunta</Button>
        <Button variant="outline" disabled={dependents.guiding_questions.length >= 8} onClick={() => setDependents({ ...dependents, guiding_questions: [...dependents.guiding_questions, "Nueva pregunta"] })}>Agregar pregunta</Button>
        <Button onClick={() => setStep(4)}>Continuar al recorrido</Button></>}
        {step === 4 && <>
        <div className="space-y-2"><h3 className="font-semibold">Recorrido posible</h3>{dependents.journey.map((part, index) =>
          <div key={index} className="rounded-lg border p-3"><Input aria-label={`Etapa ${index + 1}`} value={part.title}
            onChange={(event) => setDependents({ ...dependents, journey: dependents.journey.map((item, i) => i === index ? { ...item, title: event.target.value } : item) })} />
            <Textarea className="mt-2" aria-label={`Descripción de etapa ${index + 1}`} value={part.description}
              onChange={(event) => setDependents({ ...dependents, journey: dependents.journey.map((item, i) => i === index ? { ...item, description: event.target.value } : item) })} /></div>)}</div>
        <Button onClick={() => setStep(5)}>Continuar a evaluación</Button></>}
        {step === 5 && <>
        <div className="space-y-2"><h3 className="font-semibold">Qué observar</h3>{dependents.general_criteria.map((criterion, index) =>
          <label key={criterion.competency_id} className="block rounded-lg border p-3"><b>{name(criterion.competency_id)}</b>
            <Textarea className="mt-2" value={criterion.criterion} onChange={(event) => setDependents({ ...dependents,
              general_criteria: dependents.general_criteria.map((item, i) => i === index ? { ...item, criterion: event.target.value } : item) })} />
            <small className="text-[#526b87]">Evidencias posibles: {criterion.expected_evidence.join(" · ")}</small></label>)}</div>
        <Button onClick={() => setStep(6)}>Ver resumen</Button></>}
        {step === 6 && <div className="space-y-3 rounded-xl bg-[#f2f8fc] p-4 text-sm"><p><b>Proyecto:</b> {proposal?.title ?? selected.title}</p>
          <p><b>Contexto:</b> {decisions?.context_summary}</p><p><b>Propósito:</b> {decisions?.purpose}</p>
          <p><b>Competencias:</b> {decisions?.competency_ids.map(name).join(" · ")}</p>
          <p><b>Preguntas:</b> {dependents.guiding_questions.join(" · ")}</p>
          <p><b>Recorrido:</b> {dependents.journey.map((part) => part.title).join(" → ")}</p>
          <p><b>Evaluación:</b> {dependents.general_criteria.map((item) => `${name(item.competency_id)}: ${item.criterion}`).join(" · ")}</p></div>}
        {step === 6 && calendarReview && <section className="space-y-3 rounded-xl border border-[#b9dce5] bg-white p-4"><div><h3 className="text-lg font-bold">Revisa los días del proyecto</h3>
          <p className="text-sm text-[#526b87]">Verde: habrá actividad. Los días bloqueados muestran el motivo. Puedes quitar un día de clase antes de continuar.</p></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{calendarReview.days.map((day)=><button type="button" key={day.date}
            disabled={!day.is_instructional||!day.editable} onClick={()=>setCalendarReview({...calendarReview,selection:{...calendarReview.selection,status:"draft"},days:calendarReview.days.map((item)=>item.date===day.date?{...item,selected:!item.selected,exclusion_reason:item.selected?"No se utilizará en este proyecto":null}:item)})}
            className={`min-h-16 rounded-xl border p-3 text-left text-sm ${day.selected?"border-[#64b69d] bg-[#eaf7f1]":"border-[#e3c3c3] bg-[#fff1f1]"} disabled:cursor-not-allowed`}>
            <b>{new Intl.DateTimeFormat("es-PE",{weekday:"short",day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(`${day.date}T00:00:00Z`))}</b>
            <span className="mt-1 block text-xs">{day.selected?"✓ Habrá actividad":`Sin actividad · ${day.exclusion_reason||day.reason}`}</span></button>)}</div>
          <p className="rounded-lg bg-[#eaf7fb] p-3 font-semibold">{calendarReview.selection.status==="confirmed"?dates.length:calendarReview.days.filter((day)=>day.selected).length} días seleccionados → Ayni generará {calendarReview.selection.status==="confirmed"?dates.length:calendarReview.days.filter((day)=>day.selected).length} actividades.</p>
          {calendarReview.selection.status!=="confirmed"?<AsyncButton busy={busy==="calendar"} busyLabel="Guardando días..." disabled={Boolean(busy)||!calendarReview.days.some((day)=>day.selected)} onClick={()=>void confirmCalendar()}>Confirmar estos días</AsyncButton>:
          <Button variant="outline" onClick={()=>setCalendarReview({...calendarReview,selection:{...calendarReview.selection,status:"draft"}})}>Cambiar días</Button>}</section>}
        {step === 6 && <>
        <AsyncButton busy={busy === "master"} busyLabel="Preparando mapa..." disabled={Boolean(busy)||calendarReview?.selection.status!=="confirmed"} onClick={() => void prepareMaster()}>
          {selected.details.stage === "map_review" || depChanged ? "Actualizar mapa" : "Preparar mapa de actividades"}</AsyncButton></>}
        {depChanged && <p className="text-sm text-[#a56712]">El mapa anterior se actualizará con estas preguntas y criterios.</p>}
      </section>}
      {selected.details.stage === "map_review" && !decisionsChanged && !depChanged && step === 7 && <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">8. Mapa de actividades</h2>
        <p className="text-sm text-[#526b87]">Este mapa organiza el proyecto. Las actividades completas se prepararán una por una cuando las necesites.</p>
        <div className="space-y-2 rounded-xl border border-[#b9dce5] bg-[#f7fbfd] p-4">
          <h3 className="font-bold">Imagen del proyecto · opcional</h3>
          <p className="text-sm text-[#526b87]">La sugerencia se basa en las descripciones de la biblioteca. Elige otra imagen o deja el proyecto sin imagen.</p>
          <Button variant="outline" disabled={Boolean(busy)} onClick={() => void suggestProjectImageAgain()}>
            {busy === "image-suggestion" ? "Ayni está buscando…" : "Recomendar imagen con Ayni"}</Button>
          <div className="flex flex-wrap gap-3">{imageOptions.map((item) => <button key={item.id} type="button"
            disabled={Boolean(busy)} onClick={() => void chooseProjectImage(item.id)}
            className={`w-44 rounded-lg border p-2 text-left text-sm ${selected.details.image_id === item.id ? "border-[#087d96] bg-[#e7f5f7]" : "bg-white"}`}>
            <Image unoptimized width={160} height={105} className="h-auto w-full rounded" alt={item.title}
              src={api(`/api/project-flow/images/${item.id}?projectId=${selected.id}`)} />
            <span className="mt-2 block font-semibold">{item.title}{imageSuggestedId === item.id ? " · recomendada por Ayni" : ""}</span>
          </button>)}</div>
          {imageOptionsError ? <p className="text-sm text-[#a56712]">No pudimos cargar la biblioteca de imágenes. Puedes continuar sin imagen y revisarla luego.</p> :
            !imageOptions.length && <p className="text-sm text-[#526b87]">No hay imágenes de la biblioteca que coincidan con esta propuesta.</p>}
          <Button variant="outline" disabled={Boolean(busy)} onClick={() => void chooseProjectImage(null)}>Sin imagen</Button>
        </div>
        {protectedRouteIds.length > 0 && <p className="rounded-lg bg-[#fff8eb] p-3 text-sm">Los días anteriores y los que ya tienen registros conservan la versión confirmada. Puedes modificar las actividades futuras sin registros.</p>}
        <p className="rounded-lg bg-[#eaf7fb] p-3 text-sm"><b>Cierre propuesto:</b> {selected.details.project_master?.closing_description}</p>
        {Boolean(selected.details.previous_map?.length) && <details className="rounded-lg border bg-[#fff8eb] p-3 text-sm"><summary className="cursor-pointer font-semibold">Ver el mapa anterior y sus cambios</summary>
          <p className="mt-2">Puedes recuperarlo si las decisiones nuevas todavía coinciden con sus competencias y fechas.</p>
          <ul className="mt-2 list-disc pl-5">{selected.details.previous_map?.map((item) => <li key={item.id}>{dateLabel(item.date)} · {item.title}</li>)}</ul>
          <Button className="mt-2" variant="outline" onClick={() => setRoute(selected.details.previous_map ?? [])}>Recuperar mapa anterior</Button></details>}
        <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#edf5fa]"><tr>{["Fecha", "Actividad", "Propósito", "Competencia", "Acción"].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead>
          <tbody>{route.map((item, index) => <tr key={item.id} className="border-t"><td className="p-3">{dateLabel(item.date)}</td>
            <td className="p-3 font-semibold">{index + 1}. {item.title}{protectedRouteIds.includes(item.id) && <span className="ml-2 text-xs text-[#90631d]">Histórico</span>}</td><td className="p-3">{item.specific_purpose}</td>
            <td className="p-3">{item.competency_ids.map(name).join(" · ")}</td><td className="p-3"><div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={protectedRouteIds.includes(item.id)} onClick={() => setEditingRoute(item.id)}>Editar</Button>
              <Button variant="ghost" size="sm" aria-label={`Subir ${item.title}`} disabled={index === 0 || protectedRouteIds.includes(item.id) || protectedRouteIds.includes(route[index - 1]?.id)} onClick={() => moveRoute(index, -1)}>↑</Button>
              <Button variant="ghost" size="sm" aria-label={`Bajar ${item.title}`} disabled={index === route.length - 1 || protectedRouteIds.includes(item.id) || protectedRouteIds.includes(route[index + 1]?.id)} onClick={() => moveRoute(index, 1)}>↓</Button>
            </div></td></tr>)}</tbody></table></div>
        {mapChanged && <AsyncButton busy={busy === "save"} busyLabel="Guardando mapa..." disabled={Boolean(busy)} onClick={() => void saveMap()}>Guardar mapa</AsyncButton>}
        {!mapChanged && <AsyncButton busy={busy === "confirm"} busyLabel="Confirmando proyecto..." disabled={Boolean(busy)} onClick={() => void confirm()}>Confirmar proyecto</AsyncButton>}
        <p className="text-sm text-[#526b87]">El proyecto queda confirmado después de revisar este mapa.</p></section>}
      {selected.status === "active" && <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Proyecto confirmado</h2>
        <p className="text-sm text-[#526b87]">Esta versión es la base del Word y de las próximas actividades.</p>
        <p className="text-sm"><b>Imagen elegida:</b> {imageOptions.find((item) => item.id === selected.details.image_id)?.title ?? "Sin imagen"}. Para cambiarla, crea una nueva versión.</p>
        <div className="flex flex-wrap gap-2"><AsyncButton busy={busy === "formal"} busyLabel="Preparando Word..." disabled={Boolean(busy)} onClick={() => void formalize()}>Preparar Word</AsyncButton>
          <AsyncButton variant="outline" busy={busy === "copy"} busyLabel="Creando versión..." disabled={Boolean(busy)} onClick={() => void copyVersion()}>Revisar una nueva versión</AsyncButton></div>
        <div className="space-y-2">{route.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div><b>{item.number}. {item.title}</b><p className="text-sm text-[#526b87]">{dateLabel(item.date)} · {item.specific_purpose}</p></div>
          <Button onClick={() => onDevelopActivity?.(selected.id, item.id)}>Desarrollar actividad</Button></article>)}</div></section>}
      {currentEdit && selected.status === "draft" && <div role="dialog" aria-modal="true" aria-label="Editar actividad" className="fixed inset-0 z-50 flex justify-end bg-[#10233a]/45">
        <div className="h-full w-full max-w-xl space-y-4 overflow-y-auto bg-white p-5 shadow-2xl"><div className="flex items-center justify-between gap-2"><h2 className="text-xl font-bold">Editar actividad del mapa</h2>
          <Button variant="outline" onClick={() => setEditingRoute(null)}>Cerrar</Button></div>
          {selected.version > 1 && !protectedRouteIds.includes(currentEdit.id) ?
            <label className="block font-semibold">Fecha futura<select className="mt-2 min-h-11 w-full rounded-lg border px-3"
              value={currentEdit.date} onChange={(event) => updateRoute(currentEdit.id, { date: event.target.value })}>
              {[currentEdit.date, ...dates.filter((date) => !route.some((item) => item.id !== currentEdit.id && item.date === date))]
                .filter((date, index, all) => all.indexOf(date) === index).sort().map((date) =>
                  <option key={date} value={date}>{dateLabel(date)}</option>)}</select></label> :
            <p className="rounded-lg bg-[#edf5fa] p-3 text-sm"><b>Fecha confirmada:</b> {dateLabel(currentEdit.date)}.</p>}
          <label className="block font-semibold">Título<Input className="mt-2" value={currentEdit.title} onChange={(event) => updateRoute(currentEdit.id, { title: event.target.value })} /></label>
          <label className="block font-semibold">Propósito<Textarea className="mt-2" value={currentEdit.specific_purpose} onChange={(event) => updateRoute(currentEdit.id, { specific_purpose: event.target.value })} /></label>
          <label className="block font-semibold">Función en el proyecto<Textarea className="mt-2" value={currentEdit.role_in_project} onChange={(event) => updateRoute(currentEdit.id, { role_in_project: event.target.value })} /></label>
          <label className="block font-semibold">Cómo avanza el aprendizaje<Textarea className="mt-2" value={currentEdit.expected_progression} onChange={(event) => updateRoute(currentEdit.id, { expected_progression: event.target.value })} /></label>
          <label className="block font-semibold">Competencia principal<select className="mt-2 min-h-11 w-full rounded-lg border px-3" value={currentEdit.criterion_competency_id}
            onChange={(event) => updateRoute(currentEdit.id, { competency_ids: [event.target.value], competency_id: event.target.value,
              criterion_competency_id: event.target.value })}>{selected.details.decisions?.competency_ids.map((id) => <option key={id} value={id}>{name(id)}</option>)}</select></label>
          <div className="flex gap-2"><Button onClick={() => setEditingRoute(null)}>Listo</Button></div>
        </div></div>}
    </>}
  </section>;
}
