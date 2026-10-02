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
import { nextPlanProposalIndex, proposalStatus } from "@/src/lib/project-proposal-navigation.mjs";
import { selectedProjectQuestions } from "@/src/lib/project-question-selection.mjs";
import { limaToday } from "@/src/lib/display-date";

export type Proposal = { proposal_id?: string; experience_type: "project" | "unit"; title: string; purpose: string;
  rationale: string; period: string; primary_competency_ids: string[] };
export type Plan = { id: string; revision: number; proposal: { plan_format?: string; proposed_experiences: Proposal[] }; project_slots: { id: string;
  proposal_id?: string | null; slot_index: number;
  starts_on: string; ends_on: string }[] };
type Decision = { context_summary: string; purpose: string; competency_ids: string[]; additional_context: string };
type Criterion = { competency_id: string; criterion: string; expected_evidence: string[] };
type Dependents = { guiding_questions: string[]; journey: { title: string; description: string }[];
  general_criteria: Criterion[] };
type Route = { id: string; number: number; date: string; title: string; specific_purpose: string;
  competency_id: string; competency_ids: string[]; criterion_competency_id: string;
  evaluation_criterion: string; expected_evidence: string; role_in_project: string;
  expected_progression: string; estimated_minutes: number; materials?: string[]; mediation_notes?: string };
type Details = { flow_version?: string; stage?: string; preview?: { context_summary: string; context_points: string[];
  purpose_options: string[]; additional_context_example: string }; decisions?: Decision;
  planning_feedback?: { period_id: string; period_label: string; confirmed_assessments: number } | null;
  dependents?: Dependents; project_master?: { foundation: string; closing_description: string; closing_rationale: string; resources?: string[] };
  activity_route?: Route[]; previous_map?: Route[] | null; image_id?: string | null; image_suggested_id?: string | null };
export type Experience = { id: string; annual_plan_id: string; source_proposal_id: string | null;
  source_proposal_index: number; title: string; type: "project" | "unit"; status: "draft" | "active" | "archived";
  version: number; revision: number; details: Details };
type Competency = { id: string; name: string };
type CalendarReview = { selection: { id: string; status: "draft" | "confirmed"; starts_on: string; ends_on: string; revision: number };
  days: { id: string; date: string; calendar_type: string; is_instructional: boolean; editable: boolean; reason: string;
    school_override?: boolean; selected: boolean; exclusion_reason: string | null }[]; selected_dates: string[] };
const api = (path: string) => `${localDatabaseApiUrl}${path}`;
async function json<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await apiFetch(api(path), init); }
  catch { throw new Error("No pudimos conectar con Ayni. Revisa la conexión y vuelve a intentarlo."); }
  const result = await response.json() as T & { error?: string; message?: string };
  if (!response.ok) throw new Error(result.message || result.error || "No pudimos completar la acción.");
  return result;
}
const post = (value: unknown): RequestInit => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
const dateLabel = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value.slice(8)}/${value.slice(5, 7)}` : value;

export function ProjectDevelopmentWorkspace({ initialProposalId, onConfirmed, onDevelopActivity, onGoAnnual, feedbackPeriodId = null }: {
  initialProposalId?: string | null; onConfirmed?: () => void;
  feedbackPeriodId?: string | null;
  onDevelopActivity?: (experienceId: string, routeItemId: string) => void;
  onGoAnnual?: () => void }) {
  const [plan, setPlan] = useState<Plan | null>(null), [experiences, setExperiences] = useState<Experience[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]), [selected, setSelected] = useState<Experience | null>(null);
  const [dates, setDates] = useState<string[]>([]), [decisions, setDecisions] = useState<Decision | null>(null);
  const [calendarReview,setCalendarReview]=useState<CalendarReview|null>(null);
  const [calendarMonth, setCalendarMonth] = useState("");
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
  const [showAllProposals, setShowAllProposals] = useState(false);
  const [reviewCompetencies, setReviewCompetencies] = useState(false);
  const [excludedQuestions, setExcludedQuestions] = useState<number[]>([]);
  const [editingJourney, setEditingJourney] = useState<number | null>(null);
  const [editingCriterion, setEditingCriterion] = useState<number | null>(null);
  const autoOpened = useRef<string | null>(null);
  const imageLoadRequest = useRef(0);
  const proposal = plan?.proposal.proposed_experiences[selected?.source_proposal_index ?? -1];
  const proposalIdAt = (index: number) => plan?.proposal.proposed_experiences[index]?.proposal_id ??
    plan?.project_slots.find((slot) => slot.slot_index === index + 1)?.id ?? "";
  const options = new Map(competencies.map((item) => [item.id, item.name]));
  const name = (id: string) => options.get(id) ?? id;
  const readable = (value: string) => [...options.entries()].reduce((text, [id, label]) => text.replaceAll(id, label), value);
  const activeDependents: Dependents | null = dependents ? { ...dependents, guiding_questions: selectedProjectQuestions(dependents.guiding_questions, excludedQuestions) } : null;
  const { decisionsChanged: baseDecisionsChanged, mapChanged, depChanged } = projectDraftChanges(selected?.details, decisions, activeDependents, route);
  const inheritedCompetencies = proposal?.primary_competency_ids ?? [];
  const addedCompetencies = decisions?.competency_ids.filter((id) => !inheritedCompetencies.includes(id)) ?? [];
  const removedCompetencies = inheritedCompetencies.filter((id) => !decisions?.competency_ids.includes(id));
  const competenciesModified = addedCompetencies.length > 0 || removedCompetencies.length > 0;
  const feedbackChanged = selected?.status === "draft" && Boolean(selected.details.decisions) &&
    (selected.details.planning_feedback?.period_id ?? null) !== feedbackPeriodId;
  const decisionsChanged = baseDecisionsChanged || feedbackChanged;
  const feedbackRequest = { usePlanningFeedback: Boolean(feedbackPeriodId), planningFeedbackPeriodId: feedbackPeriodId };
  function showExperience(experience: Experience, availableDates: string[] = [],review:CalendarReview|null=null,
    protectedIds: string[] = []) {
    setSelected(experience); setDates(availableDates); setEditingRoute(null); setExcludedQuestions([]); setEditingJourney(null); setEditingCriterion(null); setReviewCompetencies(false);
    setProtectedRouteIds(protectedIds);
    setCalendarReview(review); setCalendarMonth(review?.days[0]?.date.slice(0, 7) ?? "");
    setStep(experience.status === "active" ? 8 : experience.details.stage === "map_review" ? 7 :
      experience.details.stage === "dependents" ? 3 : 0);
    const source = plan?.proposal.proposed_experiences[experience.source_proposal_index];
    setDecisions(experience.details.decisions ?? { context_summary: readable(experience.details.preview?.context_summary ?? ""),
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
      "/api/project-flow/start", post({ annualPlanId: plan.id, proposalId, ...feedbackRequest }));
      const item = plan.proposal.proposed_experiences[index];
      setSelected(result.experience); setDates(result.available_dates);setCalendarReview(result.calendar_review);setCalendarMonth(result.calendar_review?.days[0]?.date.slice(0, 7) ?? "");
      setStep(0);
      setDecisions({ context_summary: readable(result.experience.details.preview?.context_summary ?? ""),
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
  async function refreshPreview() { if (!selected || !plan || selected.details.decisions) return;
    await act("preview", async () => { const result = await json<{ experience: Experience; available_dates: string[]; calendar_review: CalendarReview }>(
      "/api/project-flow/start", post({ annualPlanId: selected.annual_plan_id,
        proposalId: selected.source_proposal_id ?? proposalIdAt(selected.source_proposal_index),
        refreshPreview: true, expectedRevision: selected.revision, ...feedbackRequest }));
      showExperience(result.experience, result.available_dates, result.calendar_review);
      setNotice("Contexto actualizado. Revisa las opciones de propósito antes de continuar."); }); }
  async function prepareDependents() { if (!selected || !decisions) return;
    await act("dependents", async () => { const result = await json<{ experience: Experience }>(`/api/project-flow/${selected.id}/dependents`,
      post({ decisions, expectedRevision: selected.revision, ...feedbackRequest }));
      setSelected(result.experience); setDependents(result.experience.details.dependents ?? null); setExcludedQuestions([]); setReviewCompetencies(false); setRoute([]);
      setStep(3);
      setNotice("Preguntas y criterios listos para revisar."); }); }
  async function prepareMaster() { if (!selected || !activeDependents || !activeDependents.guiding_questions.length) return;
    await act("master", async () => { const result = await json<{ experience: Experience }>(`/api/project-flow/${selected.id}/master`,
      post({ dependents: activeDependents, expectedRevision: selected.revision }));
      showExperience(result.experience, dates, calendarReview, protectedRouteIds);
      setNotice("Mapa preparado. Revísalo y ajústalo antes de confirmar el proyecto."); }); }
  async function confirmCalendar(){if(!selected||!calendarReview)return;await act("calendar",async()=>{
    const selectedDates=calendarReview.days.filter((day)=>day.selected).map((day)=>day.date);
    const exclusions=Object.fromEntries(calendarReview.days.filter((day)=>day.is_instructional&&!day.selected).map((day)=>[day.date,day.exclusion_reason||"No se utilizará en este proyecto"]));
    await json(`/api/project-flow/${selected.id}/calendar`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({selectedDates,exclusions,confirm:true})});
    const fresh=await json<CalendarReview>(`/api/project-flow/${selected.id}/calendar`);setCalendarReview(fresh);setDates(fresh.selected_dates);
    setNotice(`${fresh.selected_dates.length} días confirmados. Ayni preparará ${fresh.selected_dates.length} actividades.`);
  });}
  async function toggleCalendarDay(day: CalendarReview["days"][number]) {
    if (!calendarReview || !selected) return;
    if (!day.is_instructional) {
      if (!window.confirm(`${day.date}: ${day.reason || "día no lectivo"}. ¿Quieres usarlo como día trabajado o reprogramado para este proyecto?`)) return;
      const reason = window.prompt("Indica el motivo de la jornada trabajada o reprogramada:", "Jornada reprogramada para este proyecto")?.trim();
      if (!reason) return;
      await act("calendar-exception", async () => {
        await json("/api/school-calendar/override", { method: "PUT", headers: { "content-type": "application/json" },
          body: JSON.stringify({ date: day.date, isInstructional: true, reason, confirmOfficialException: true }) });
        const fresh = await json<CalendarReview>(`/api/project-flow/${selected.id}/calendar`);
        setCalendarReview({ ...fresh, selection: { ...fresh.selection, status: "draft" },
          days: fresh.days.map((item) => item.date === day.date ? { ...item, selected: true } : item) });
        setNotice("Excepción guardada en el calendario del aula. Confirma los días del proyecto para usarla en el mapa.");
      });
      return;
    }
    if (!day.editable) return;
    setCalendarReview({ ...calendarReview, selection: { ...calendarReview.selection, status: "draft" },
      days: calendarReview.days.map((item) => item.date === day.date ? { ...item, selected: !item.selected,
        exclusion_reason: item.selected ? "No se utilizará en este proyecto" : null } : item) });
  }
  async function saveMap() { if (!selected) return;
    await act("save", async () => { const result = await json<{ experience: Experience }>(`/api/project-flow/${selected.id}/map`,
      { method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ activity_route: route, expectedRevision: selected.revision }) });
      setSelected(result.experience); setRoute(result.experience.details.activity_route ?? []); setNotice("Mapa guardado."); }); }
  async function confirm() { if (!selected || mapChanged || decisionsChanged || depChanged) return;
    await act("confirm", async () => { try { await json(`/api/project-flow/${selected.id}/confirm`, post({ expectedRevision: selected.revision })); }
      catch { const checked = await json<{ experience: Experience }>(`/api/project-flow/${selected.id}`).catch(() => null);
        if (!checked) throw new Error("No pudimos verificar si el proyecto se guardó. Vuelve a abrirlo antes de repetir la confirmación.");
        if (checked.experience.status !== "active") throw new Error("No pudimos guardar el proyecto. Tus cambios siguen en pantalla. Intenta nuevamente."); }
      const result = await json<{ experience: Experience; available_dates: string[];calendar_review:CalendarReview;protected_route_ids:string[] }>(`/api/project-flow/${selected.id}`).catch(() => null);
      if (!result) { setSelected({ ...selected, status: "active" }); onConfirmed?.(); setNotice("El servidor confirmó el proyecto, pero no pudimos actualizar la pantalla. Vuelve a abrirlo para continuar."); return; }
      showExperience(result.experience, result.available_dates,result.calendar_review,result.protected_route_ids); await refresh().catch(() => null); onConfirmed?.();
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
  const today = limaToday();
  const planIndex = nextPlanProposalIndex(plan?.proposal.proposed_experiences, experiences, plan?.id);
  const orderedProposals = (plan?.proposal.proposed_experiences ?? []).map((item, index) => ({ item, index,
    slot: plan?.project_slots.find((row) => row.slot_index === index + 1) })).sort((a, b) =>
      Number((a.slot?.ends_on ?? "") < today) - Number((b.slot?.ends_on ?? "") < today) ||
      (a.slot?.starts_on ?? "9999").localeCompare(b.slot?.starts_on ?? "9999") || a.index - b.index);
  const suggestedIndex = orderedProposals.find(({ slot }) => slot && slot.ends_on >= today)?.index ?? planIndex;
  const calendarMonths = [...new Set(calendarReview?.days.map((day) => day.date.slice(0, 7)) ?? [])];
  const visibleMonth = calendarMonths.includes(calendarMonth) ? calendarMonth : calendarMonths[0];
  const visibleDays = calendarReview?.days.filter((day) => day.date.startsWith(visibleMonth)) ?? [];
  const visibleDaysByDate = new Map(visibleDays.map((day) => [day.date, day]));
  const firstWeekday = visibleMonth ? (new Date(`${visibleMonth}-01T00:00:00Z`).getUTCDay() + 6) % 7 : 0;
  const daysInMonth = visibleMonth ? new Date(Date.UTC(Number(visibleMonth.slice(0, 4)), Number(visibleMonth.slice(5, 7)), 0)).getUTCDate() : 0;
  if (loading) return <LoadingState label="Abriendo proyectos y unidades..." />;
  if (legacy) return <div className="space-y-3"><Button variant="outline" onClick={() => setLegacy(false)}>← Volver a proyectos</Button>
    <LearningExperienceGenerator onConfirmed={onConfirmed} feedbackPeriodId={feedbackPeriodId} /></div>;
  return <section className="ayni-workflow space-y-5"><header>
    <h1 className="text-2xl font-extrabold sm:text-3xl text-[#172b52]">{selected?.status === "active" ? "Tu proyecto o unidad" : "Próximo proyecto de tu plan"}</h1>
    <p className="mt-2 text-[#526b87]">{selected?.status === "active" ? "Elige una actividad para preparar tu día." : "Elige una propuesta de Mi año para desarrollar sus actividades."}</p></header>
    {error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}{notice && <WorkflowFeedback tone="success">{notice}</WorkflowFeedback>}
    {!selected ? <><section className="space-y-3"><h2 className="text-xl font-bold">Elige qué desarrollar</h2>
      <p className="text-sm text-[#526b87]">Primero verás la planificación vigente o la próxima. Puedes revisar períodos anteriores sin cambiar sus fechas.</p>
      {(showAllProposals ? orderedProposals : orderedProposals.filter(({ index }) => index === suggestedIndex)).map(({ item, index, slot }) => { const proposalId = proposalIdAt(index);
        const found = experiences.find((row) =>
          (row.source_proposal_id === proposalId || (row.annual_plan_id === plan?.id && !row.source_proposal_id && row.source_proposal_index === index)) && row.status !== "archived");
        return <article key={proposalId || index} className={`rounded-2xl border bg-white p-4 ${suggestedIndex === index ? "border-[#087d96]" : "border-[#d6e5ef]"}`}>
          <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-bold">{item.experience_type === "unit" ? "U" : "P"}{String(index + 1).padStart(2, "0")} · {item.title}</h3>{suggestedIndex === index && slot && slot.ends_on >= today && <span className="rounded-full bg-[#e8f6fa] px-3 py-1 text-xs font-bold text-[#087d96]">{slot.starts_on <= today ? "Planificación vigente" : "Próxima planificación"}</span>}</div>
          <p className="mt-1 text-sm text-[#526b87]">{slot ? `${dateLabel(slot.starts_on.slice(0, 10))} – ${dateLabel(slot.ends_on.slice(0, 10))}` : item.period} · {item.experience_type === "unit" ? "Unidad" : "Proyecto"} · {proposalStatus(found)}</p>
          {slot && slot.ends_on < today && <p className="mt-1 text-sm text-[#916219]">Esta planificación corresponde a un período anterior. Puedes revisarla o continuar con la actual.</p>}
          <p className="mt-1 text-sm text-[#526b87]">{item.rationale}</p>
          <Button className="mt-3" disabled={Boolean(busy) || !proposalId} onClick={() => void openProposal(proposalId)}>{found ? found.status === "active" ? "Entrar al proyecto" : "Continuar proyecto" : "Empezar este proyecto"}</Button>
        </article>; })}{Boolean(plan) && <Button variant="outline" onClick={() => setShowAllProposals(!showAllProposals)}>{showAllProposals ? "Mostrar solo la siguiente" : "Elegir otro"}</Button>}{!plan && <p>Confirma primero «Mi año» para continuar.</p>}</section>
      {plan?.proposal.plan_format !== "annual_preplan_v1" && <section className="rounded-2xl border border-[#d6e5ef] bg-[#f8fbff] p-4">
        <h3 className="font-bold">¿Surgió un interés nuevo en el grupo?</h3>
        <p className="mt-1 text-sm text-[#526b87]">Actualiza «Mi año» a la tabla editable para incorporar, postergar o reemplazar una propuesta.</p>
        <Button className="mt-3" variant="outline" onClick={onGoAnnual}>Ir a Mi año</Button>
      </section>}
      {plan?.proposal.plan_format === "annual_preplan_v1" && <section className="space-y-3 rounded-2xl border border-[#d6e5ef] bg-white p-4"><Button variant="outline" onClick={() => setShowEmergent(!showEmergent)}>
        + Crear un proyecto nuevo desde cero</Button>
        <p className="text-sm text-[#526b87]">Úsalo si surgió un interés de los niños que no aparece en «Mi año». Ayni propondrá cómo incorporarlo; tú revisarás el cambio antes de confirmarlo.</p>
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
      <Button variant="outline" onClick={() => setLegacy(true)}>Ver todas las propuestas y proyectos</Button></> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#edf7fa] p-4"><div><b>{proposal?.title ?? selected.title}</b>
        <p className="text-sm">Versión {selected.version} · {selected.status === "active" ? "confirmada" : "en revisión"}</p></div>
        <Button variant="outline" onClick={() => setSelected(null)}>Elegir otra</Button></div>
      {selected.status === "draft" && <nav aria-label="Pasos del proyecto" className="flex flex-wrap gap-2">{["Contexto", "Propósito", "Competencias", "Preguntas", "Recorrido", "Evaluación", "Resumen", "Mapa"].map((label, index) =>
        <Button key={label} type="button" variant={step === index ? "default" : "outline"} size="sm"
          disabled={index >= 3 && !dependents || index === 7 && selected.details.stage !== "map_review"}
          onClick={() => setStep(index)}>{index + 1}. {label}</Button>)}</nav>}
      {selected.status === "draft" && decisions && step <= 2 && <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">{["1. Contexto que Ayni tendrá en cuenta", "2. ¿Qué buscamos con este proyecto?", "3. Competencias previstas"][step]}</h2>
        {step === 0 && <>
        {selected.details.planning_feedback && <p className="text-sm text-[#526b87]">Evaluaciones incorporadas: {selected.details.planning_feedback.period_label} · {selected.details.planning_feedback.confirmed_assessments} valoraciones confirmadas.</p>}
        {!selected.details.decisions && feedbackPeriodId && <AsyncButton variant="outline" busy={busy === "preview"} busyLabel="Incorporando evaluación anterior..."
          disabled={Boolean(busy)} onClick={() => void refreshPreview()}>Incorporar evaluación anterior al contexto de este proyecto</AsyncButton>}
        <label className="block font-semibold">Contexto de este proyecto<Textarea className="mt-2" value={decisions.context_summary}
          onChange={(event) => setDecisions({ ...decisions, context_summary: event.target.value })} /></label>
        {selected.details.preview?.context_points?.length ? <p className="text-sm text-[#526b87]">Ayni tuvo en cuenta: {selected.details.preview.context_points.map(readable).join(" · ")}</p> : null}
        <label className="block font-semibold">¿Hay algo más que quieras agregar? (opcional)<Textarea className="mt-2" value={decisions.additional_context}
          onChange={(event) => setDecisions({ ...decisions, additional_context: event.target.value })} /></label>
        {selected.details.preview?.additional_context_example && <div className="rounded-lg border border-[#b9dce5] bg-[#f2f8fc] p-3 text-sm"><b>Sugerencia de Ayni (aún no incluida)</b>
          <p className="mt-1">{readable(selected.details.preview.additional_context_example)}</p>
          <Button className="mt-2" variant="outline" onClick={() => setDecisions({ ...decisions, additional_context: selected.details.preview?.additional_context_example ?? "" })}>Usar sugerencia</Button></div>}
        <Button disabled={!decisions.context_summary.trim()} onClick={() => setStep(1)}>Continuar al propósito</Button></>}
        {step === 1 && <>
        <fieldset className="space-y-2"><legend className="font-semibold">¿Qué propósito prefieres?</legend>
          {selected.details.preview?.purpose_options.map((option) => <label key={option} className="flex min-h-11 items-center gap-2 rounded-lg border p-3 text-sm"><input type="radio" name="project-purpose" checked={decisions.purpose === option}
            onChange={() => setDecisions({ ...decisions, purpose: option })} />{option}</label>)}</fieldset>
        <label className="block font-semibold">Puedes ajustar el propósito<Textarea className="mt-2" value={decisions.purpose}
          onChange={(event) => setDecisions({ ...decisions, purpose: event.target.value })} /></label>
        <Button disabled={!decisions.purpose.trim()} onClick={() => setStep(2)}>Continuar a competencias</Button></>}
        {step === 2 && <>
        <p className="text-sm text-[#526b87]">Competencias previstas en «Mi año»: {inheritedCompetencies.map(name).join(" · ")}. Puedes revisarlas si cambió el enfoque del proyecto.</p>
        <CompetencyChecklist label="Competencias que se trabajarán" value={decisions.competency_ids} options={competencies}
          onChange={(competency_ids) => { setDecisions({ ...decisions, competency_ids }); setReviewCompetencies(false); }} />
        {competenciesModified && <p role="alert" className="rounded-lg border border-[#d8aa65] bg-[#fff8eb] p-3 text-sm"><b>Revisa este cambio curricular.</b> {addedCompetencies.length ? `Agregaste: ${addedCompetencies.map(name).join(" · ")}. ` : ""}Confirma que cada competencia se relaciona con el propósito y las actividades del proyecto. Antes de continuar te pediremos confirmar la selección.</p>}
        {reviewCompetencies && competenciesModified && <div role="alertdialog" aria-label="Revisa las competencias del proyecto" className="space-y-2 rounded-xl border border-[#d8aa65] bg-[#fff8eb] p-4 text-sm"><b>Revisa las competencias del proyecto</b>
          <p>Estos cambios influirán en las preguntas, el recorrido, los criterios y el mapa.</p>
          {addedCompetencies.length > 0 && <p>Añadidas: {addedCompetencies.map(name).join(" · ")}</p>}
          {removedCompetencies.length > 0 && <p>Quitadas: {removedCompetencies.map(name).join(" · ")}</p>}
          <div className="flex gap-2"><Button variant="outline" onClick={() => setReviewCompetencies(false)}>Volver a revisar</Button>
          <AsyncButton busy={busy === "dependents"} busyLabel="Preparando preguntas..." disabled={Boolean(busy)} onClick={() => void prepareDependents()}>Confirmar cambios</AsyncButton></div></div>}
        {!reviewCompetencies && <AsyncButton busy={busy === "dependents"} busyLabel="Preparando preguntas..." disabled={Boolean(busy) || !decisions.context_summary.trim() || !decisions.purpose.trim() || !decisions.competency_ids.length}
          onClick={() => { if (competenciesModified && !reviewCompetencies) { setReviewCompetencies(true); return; } if (!decisionsChanged && selected.details.dependents) setStep(3); else void prepareDependents(); }}>
          {decisionsChanged ? "Actualizar preguntas y recorrido" : "Continuar a preguntas"}</AsyncButton>}</>}
        {decisionsChanged && <p className="text-sm text-[#a56712]">Cambiaste una decisión inicial o las evaluaciones elegidas. Ayni actualizará las secciones que dependen de esa elección.</p>}
      </section>}
      {selected.status === "draft" && dependents && !decisionsChanged && step >= 3 && step <= 6 && <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">{["", "", "", "4. Preguntas para explorar", "5. Así podría desarrollarse", "6. Qué observaremos", "7. Resumen antes del mapa"][step]}</h2>
        <p className="text-sm text-[#526b87]">Revisa estas ideas antes de preparar el mapa. Puedes editarlas.</p>
        {step === 3 && <>
        <div className="space-y-2"><h3 className="font-semibold">Preguntas para explorar</h3><p className="text-sm text-[#526b87]">Elige las preguntas que quieres conservar. Puedes editarlas o agregar otras.</p>{dependents.guiding_questions.map((question, index) =>
          <div key={index} className={`flex items-start gap-2 rounded-lg border p-2 ${excludedQuestions.includes(index) ? "opacity-50" : ""}`}><input type="checkbox" className="mt-3" aria-label={`Conservar pregunta ${index + 1}`} checked={!excludedQuestions.includes(index)} onChange={(event) => setExcludedQuestions((before) => event.target.checked ? before.filter((item) => item !== index) : [...before, index])} />
          <Input aria-label={`Pregunta ${index + 1}`} value={question} onChange={(event) => setDependents({ ...dependents,
            guiding_questions: dependents.guiding_questions.map((item, i) => i === index ? event.target.value : item) })} /></div>)}</div>
        <Button variant="outline" disabled={dependents.guiding_questions.length >= 8} onClick={() => setDependents({ ...dependents, guiding_questions: [...dependents.guiding_questions, "Nueva pregunta"] })}>Agregar pregunta</Button>
        <Button disabled={!activeDependents?.guiding_questions.some((question) => question.trim())} onClick={() => setStep(4)}>Continuar al recorrido</Button></>}
        {step === 4 && <>
        <ol className="border-l-2 border-[#8dcad6] pl-4">{dependents.journey.map((part, index) =>
          <li key={index} className="relative mb-4 rounded-xl border bg-[#f8fbff] p-4 before:absolute before:-left-[1.55rem] before:top-5 before:h-3 before:w-3 before:rounded-full before:bg-[#087d96]"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#087d96]">ETAPA {index + 1}</p><h3 className="font-bold">{part.title}</h3></div><Button size="sm" variant="outline" onClick={() => setEditingJourney(editingJourney === index ? null : index)}>{editingJourney === index ? "Listo" : "Editar"}</Button></div>
            {editingJourney === index ? <><Input className="mt-2" aria-label={`Etapa ${index + 1}`} value={part.title}
              onChange={(event) => setDependents({ ...dependents, journey: dependents.journey.map((item, i) => i === index ? { ...item, title: event.target.value } : item) })} />
              <Textarea className="mt-2" aria-label={`Descripción de etapa ${index + 1}`} value={part.description}
                onChange={(event) => setDependents({ ...dependents, journey: dependents.journey.map((item, i) => i === index ? { ...item, description: event.target.value } : item) })} /></> : <p className="mt-2 text-sm text-[#526b87]">{part.description}</p>}</li>)}</ol>
        <Button onClick={() => setStep(5)}>Continuar a evaluación</Button></>}
        {step === 5 && <>
        <div className="space-y-2"><h3 className="font-semibold">Criterios y evidencias sugeridas</h3><p className="text-sm text-[#526b87]">El nombre de la competencia viene del CNEB y no se edita aquí. Ayni redactó el criterio específico para este proyecto a partir del propósito y el recorrido; puedes ajustarlo.</p>{dependents.general_criteria.map((criterion, index) =>
          <article key={criterion.competency_id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-2"><b>{name(criterion.competency_id)}</b><Button size="sm" variant="outline" onClick={() => setEditingCriterion(editingCriterion === index ? null : index)}>{editingCriterion === index ? "Listo" : "Editar criterio"}</Button></div>
            {editingCriterion === index ? <Textarea className="mt-2" aria-label={`Criterio de ${name(criterion.competency_id)}`} value={criterion.criterion} onChange={(event) => setDependents({ ...dependents,
              general_criteria: dependents.general_criteria.map((item, i) => i === index ? { ...item, criterion: event.target.value } : item) })} /> : <p className="mt-2 text-sm">{criterion.criterion}</p>}
            <details className="mt-2 text-sm text-[#526b87]"><summary className="cursor-pointer">Evidencias posibles</summary><p className="mt-1">{criterion.expected_evidence.join(" · ")}</p></details></article>)}</div>
        <Button onClick={() => setStep(6)}>Ver resumen</Button></>}
        {step === 6 && <div className="space-y-3 rounded-xl bg-[#f2f8fc] p-4 text-sm"><p><b>Proyecto:</b> {proposal?.title ?? selected.title}</p>
          <p><b>Contexto:</b> {decisions?.context_summary}</p><p><b>Propósito:</b> {decisions?.purpose}</p>
          <p><b>Competencias:</b> {decisions?.competency_ids.map(name).join(" · ")}</p>
          <p><b>Preguntas:</b> {activeDependents?.guiding_questions.join(" · ")}</p>
          <p><b>Recorrido:</b> {dependents.journey.map((part) => part.title).join(" → ")}</p>
          <p><b>Evaluación:</b> {dependents.general_criteria.map((item) => `${name(item.competency_id)}: ${item.criterion}`).join(" · ")}</p></div>}
        {step === 6 && calendarReview && <section className="space-y-3 rounded-xl border border-[#b9dce5] bg-white p-4"><div><h3 className="text-lg font-bold">Revisa los días del proyecto</h3>
          <p className="text-sm text-[#526b87]">Verde: habrá actividad. Los feriados y otros días no lectivos conservan su condición oficial; puedes registrar una jornada reprogramada del aula con confirmación.</p></div>
          <div className="flex items-center justify-between gap-3"><Button variant="outline" disabled={calendarMonths.indexOf(visibleMonth) <= 0} onClick={() => setCalendarMonth(calendarMonths[calendarMonths.indexOf(visibleMonth) - 1])}>← Mes anterior</Button>
            <b className="capitalize">{visibleMonth && new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${visibleMonth}-01T00:00:00Z`))}</b>
            <Button variant="outline" disabled={calendarMonths.indexOf(visibleMonth) >= calendarMonths.length - 1} onClick={() => setCalendarMonth(calendarMonths[calendarMonths.indexOf(visibleMonth) + 1])}>Mes siguiente →</Button></div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#526b87]">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((label) => <span key={label}>{label}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">{Array.from({ length: firstWeekday }, (_, index) => <span key={`empty-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => {
            const date = `${visibleMonth}-${String(index + 1).padStart(2, "0")}`;
            const day = visibleDaysByDate.get(date);
            return day ? <button type="button" key={date}
            disabled={Boolean(busy) || (day.is_instructional && !day.editable)} onClick={() => void toggleCalendarDay(day)}
            title={`${dateLabel(day.date)} · ${day.reason || day.calendar_type}`}
            className={`min-h-16 rounded-lg border p-1 text-left text-xs ${day.selected ? "border-[#64b69d] bg-[#eaf7f1]" : day.is_instructional ? "border-[#e3c3c3] bg-[#fff1f1]" : "border-[#b9c7d4] bg-[#eef1f5]"}`}>
            <b className="block">{Number(day.date.slice(8))}</b><span className="block">{day.selected ? "✓ Actividad" : day.is_instructional ? "Sin actividad" : day.calendar_type === "national_holiday" ? "Feriado" : day.calendar_type === "management_week" ? "Gestión" : "No lectivo"}</span>
            {day.school_override && <span className="block text-[#087d96]">Reprogramado</span>}</button> : <span key={date} className="min-h-16 rounded-lg bg-[#f5f7f9] p-1 text-xs text-[#8997a5]">{index + 1}</span>; })}</div>
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
      {selected.status === "active" && <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Actividades del proyecto</h2>
        <p className="text-sm text-[#526b87]">Actividades en el orden del mapa. El documento y las versiones están al final.</p>
        <div className="space-y-2">{route.map((item) => <article key={item.id} className="flex flex-col items-start justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
          <div className="min-w-0 w-full sm:flex-1"><b>{item.number}. {item.title}</b><p className="text-sm text-[#526b87]">{dateLabel(item.date)}</p><details className="mt-1 text-sm"><summary className="cursor-pointer py-2 font-semibold text-[#07576c]">Propósito</summary><p>{item.specific_purpose}</p></details></div>
          <Button className="min-h-11" onClick={() => onDevelopActivity?.(selected.id, item.id)}>Desarrollar actividad</Button></article>)}</div><details className="text-sm"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-[#07576c]">Documento, imagen y versiones del proyecto</summary><div className="mt-3 space-y-3">        <p className="text-sm"><b>Imagen elegida:</b> {imageOptions.find((item) => item.id === selected.details.image_id)?.title ?? "Sin imagen"}. Para cambiarla, crea una nueva versión.</p>
        <div className="flex flex-wrap gap-2"><AsyncButton variant="outline" busy={busy === "formal"} busyLabel="Preparando Word..." disabled={Boolean(busy)} onClick={() => void formalize()}>Preparar Word</AsyncButton>
          <AsyncButton variant="outline" busy={busy === "copy"} busyLabel="Creando versión..." disabled={Boolean(busy)} onClick={() => void copyVersion()}>Revisar una nueva versión</AsyncButton></div>
</div></details></section>}
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
