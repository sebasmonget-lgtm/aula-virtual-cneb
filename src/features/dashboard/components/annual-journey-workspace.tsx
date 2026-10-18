"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { List, Map as MapIcon, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AnnualSlotEditor, type EditorPlan } from "./annual-slot-editor";
import { annualDisplayTitle, annualCoverage } from "@/src/lib/annual-year-editor.mjs";
import { scopedAnnualChanges, annualCalendarCriteria } from "@/src/lib/annual-change-scope.mjs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, apiJson } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { canLeaveWorkspace, readWorkspaceParams, useWorkspaceSubview, useWorkspaceParam, writeWorkspaceLocation } from "@/src/lib/workspace-location";
import { savedJourneyAnnualRows } from "@/src/lib/annual-year-map.mjs";
import { AnnualYearTimeline, type AnnualMapRow, type AnnualMapCalendar, type AnnualMapEffectiveCalendar } from "./annual-year-map";
import { AsyncButton, GenerationProgress, LoadingState, WorkflowFeedback } from "./workflow-ui";
import { AnnualChatContext, type AnnualChatSummary } from "./annual-chat-context";
import chatStyles from "./annual-chat.module.css";
import { useAnnualContextDraft } from "@/src/lib/use-annual-context-draft";
import { AnnualPlanningConversation } from "./annual-planning-conversation";
import { AnnualPreparationProgress } from "./annual-preparation-progress";
import { DictationRecorder } from "./dictation-recorder";
import { AyniMascot } from "./initial-journey-ui";
import { AnnualProjectPreview } from "./annual-project-preview";
import yearStyles from "./annual-plan.module.css";
import { annualTeacherText, annualTeacherProposalView } from "@/src/lib/annual-teacher-display.mjs";
import { hasSavedAnnualYear, selectSavedAnnualPlan, currentAnnualPeriod, annualPeriodNumber } from "@/src/lib/annual-plan-display.mjs";
import {CompleteProjectWorkspace} from "./complete-project-workspace";
import {ActivityConsultation} from "./activity-consultation";

type Fact = { key: string; kind: string; subject: string; scope: string; support_text: string; uncertainty: string; occurred_at: string | null; explicit_tags?: string[] };
type Snapshot = { source_fingerprint: string; student_count: number; facts: Fact[]; resources: string[];
  competency_information: { competency_id: string; recorded_performances: number; distinct_children: number; information_status: string }[] };
type Opportunity = { competency_id: string; capacity_names: string[]; child_action: string; conditions: string; mediation: string; observation: string; supports: string; moment?: string };
type Row = AnnualMapRow & { invitation: string; children_actions: string[];
  materials: string[]; supports: string[]; flexibility: string; source_fact_keys: string[]; opportunities: Opportunity[];
  teacher_protected?: boolean; planned_start_date?: string; planned_end_date?: string };
type Change = { id: string; proposal_id: string | null; text: string };
type Proposal = { editor_version?: number; available_experiences?: Row[]; curriculum_reference?: {id: string; name: string}[]; journey_version?: number; proposed_experiences: Row[]; classroom_snapshot?: Snapshot; teacher_preferences?: string;
  experience_context?: {version:number;starts_on:string;context_items:{text:string}[];historical_projects:{title:string;competency_ids:string[];period:number|null}[]}; future_coverage_gaps?:string[]; generation_job_id?: string; insufficient_interpretations?: { information_status: string }[];
  pending_changes?: Change[]; everyday_opportunities?: Opportunity[];
  evidence_interpretations?: { interpretation: string; meaning: string; scope: string; fact_keys: string[] }[];
  organization_criteria?: string[]; transversal_approaches?: string[]; teaching_strategies?: string[]; assessment_followup?: string[];
  family_collaboration?: string[]; inclusive_supports?: string[];
  resolved_calendar?: { projects?: {historical_dates?:string[];proposal_id:string|null;slot_id:string;starts_on:string;ends_on:string;duration_weeks:2|3;period:string;instructional_dates:string[]}[]; integrity: { eligible: number; assigned: number; gaps: number; overlaps: number }; initial_stage: { purpose: string; name: string; suggested_experiences: string[]; what_to_observe: string[]; family_actions?: string[]; diagnostic_focus?: string[]; teacher_notes?: string; starts_on: string; ends_on: string } } };
type Plan = { id: string; status: string; revision: number; version: number; proposal: Proposal; display_subjects?: Record<string,string>; document_context?: { calendar?: AnnualMapCalendar } };
type Plans = { draft: Plan | null; active: Plan | null; archived: Plan[] };
type Start = { chat_summary:AnnualChatSummary; today?:string; snapshot: Snapshot; curriculum: { id: string; name: string }[] };
type Job = { id: string; draft_id: string; status: "queued" | "running" | "failed" | "interrupted" | "succeeded";
  stage: string; completed_stages: string[]; updated_at: string; error?: string | null; poll_after_ms?: number; can_auto_resume?: boolean; resume_after_ms?: number };
const api = async <T,>(path: string, value?: unknown): Promise<T> => {
  const response = await apiFetch(`${localDatabaseApiUrl}${path}`, value === undefined ? undefined : {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
  const data = await apiJson<T & { message?: string; error?: string; draft_id?: string }>(response);
  if (!response.ok) throw Object.assign(new Error(data.message || data.error || "No se pudo completar la acción."), { draftId: data.draft_id });
  return data;
};
const generalLabels = { organization_criteria: "Cómo organizaremos el año", transversal_approaches: "Enfoques transversales",
  teaching_strategies: "Cómo acompañaremos", assessment_followup: "Cómo seguiremos conociendo al grupo",
  family_collaboration: "Familias y comunidad", inclusive_supports: "Apoyos para participar" } as const;
const sourceLabels: Record<string, string> = { family_report: "La familia reporta", observed: "La profesora registró", teacher_context: "Contexto docente", teacher_decision: "Decisión docente" };
const annualViews = ["map", "list"] as const;
const activityParam=(value:string)=>/^[0-9a-f-]{36}$/i.test(value)?value:undefined;
const compactDate = (value: string) => new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

function Facts({ snapshot, subjects }: { snapshot: Snapshot; subjects?: Record<string,string> }) {
  return <div className="space-y-4">{snapshot.facts.length ? snapshot.facts.map((fact) => <div key={fact.key}>
    <p className="text-sm font-semibold text-[#526b87]">{sourceLabels[fact.kind] ?? fact.kind} · {fact.scope === "individual" ? "Un niño o niña" : "Alcance declarado"} · {annualTeacherText(fact.subject,subjects)}</p>
    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{fact.support_text || "Registro conservado en su fuente privada."}</p>
    {!!fact.explicit_tags?.length && <p className="mt-1 text-sm">Selecciones explícitas: {fact.explicit_tags.join(", ")}</p>}
    {fact.occurred_at && <p className="mt-1 text-xs text-[#526b87]">{new Date(fact.occurred_at).toLocaleDateString("es-PE", { timeZone: "America/Lima" })}</p>}
  </div>) : <p>Estamos empezando a conocer al grupo. Puedes preparar una primera previsión y seguir observando.</p>}</div>;
}
function OpportunityDetails({ value, names }: { value: Opportunity; names: Map<string, string> }) {
  return <div className="space-y-2 py-3"><h4 className="font-semibold">{names.get(value.competency_id) ?? value.competency_id}</h4>
    <p><strong>Capacidades:</strong> {value.capacity_names.join(" · ")}</p>
    {([ ["Qué podrán hacer", value.child_action], ["Condiciones", value.conditions], ["Cómo acompañar", value.mediation],
      ["Qué observar", value.observation], ["Apoyos", value.supports] ] as const).map(([label, text]) => <p key={label}><strong>{label}:</strong> {text}</p>)}
  </div>;
}

export function AnnualJourneyWorkspace({ onConfirmed, onGoDiagnostic, onLegacy,onGoToday }: {
  explicitConversationStart?: boolean; onConfirmed?: () => void; onGoDiagnostic?: () => void; onDevelop?: (id: string) => void; onLegacy: () => void;onGoToday?:()=>void;
}) {
  const [plans, setPlans] = useState<Plans | null>(null), [start, setStart] = useState<Start | null>(null);
  const [selectedId,setSelectedId]=useWorkspaceParam("Planificar","annualPlan","",activityParam);
  const [preparing, setPreparing] = useState(false);
  const [ideas, setIdeas] = useState(""), [message, setMessage] = useState(""), [scope, setScope] = useState<string | null>(null);
  const [ideaDraft, setIdeaDraft] = useState("");
  const contextDraft = useAnnualContextDraft();
  const { value: experienceInput, conversationId, dirty: contextDirty, captureConversation, seed: seedContext } = contextDraft;
  const [panelOpen,setPanelOpen]=useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [revisingPreparation, setRevisingPreparation] = useState(false);
  const [busy, setBusy] = useState<string | null>(null), [audioBusy, setAudioBusy] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [interpretationsReviewed, setInterpretationsReviewed] = useState(false);
  const [annualView, setAnnualView] = useWorkspaceSubview("Planificar", "annualView", annualViews, "map", false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(()=>readWorkspaceParams("Planificar").get("annualProposal"));
  const [consultId,setConsultId]=useWorkspaceParam("Planificar","activityConsult","",activityParam);
  const [projectDetail]=useWorkspaceParam('Planificar','projectDetail','',value=>value==='open'?value:undefined);
  const [annualTools]=useWorkspaceSubview("Planificar","annualTools",["year","tools"] as const,"year",false);
  const toolsOnly=annualTools==='tools';
  const [periodValue,setPeriodValue]=useWorkspaceSubview("Planificar","annualPeriod",["current","all","1","2","3","4"] as const,"current",false);
  const [reviewOpen,setReviewOpen]=useState(false),[prepareAfterConfirm,setPrepareAfterConfirm]=useState<string|null>(null);
  const [developAfterSave,setDevelopAfterSave]=useState<string|null>(null);
  const [effectiveCalendar, setEffectiveCalendar] = useState<AnnualMapEffectiveCalendar | null>(null);
  const [calendarUnavailable, setCalendarUnavailable] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null),overviewRef=useRef<HTMLElement>(null);

  const runningJobRef = useRef(false);
  const selected:Plan|null = plans?selectSavedAnnualPlan(plans,selectedId||undefined):null;
  const proposal: Proposal | undefined = selected ? annualTeacherProposalView(selected.proposal,selected.display_subjects) : undefined, modern = proposal?.journey_version === 2;
  const complete = hasSavedAnnualYear(selected);
  const calendar = selected?.document_context?.calendar;
  const mapProjection: { rows: (Row & { start: string; end: string })[]; error: string } = (() => {
    if (!complete) return { rows: [], error: "" };
    try {
      if (proposal?.editor_version===3) return {rows:[],error:""};
      if (!calendar) throw new Error("Esta versión no tiene un calendario guardado. Puedes consultar las propuestas en la lista.");
      return { rows: savedJourneyAnnualRows(proposal), error: "" };
    } catch (cause) { return { rows: [], error: cause instanceof Error ? cause.message : "No se pudo abrir el mapa guardado." }; }
  })();
  const period=periodValue==='current'?currentAnnualPeriod(proposal?.resolved_calendar?.projects??[],start?.today??new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'})):periodValue;
  const visibleProposals=proposal?.proposed_experiences.filter(row=>period==='all'||String(annualPeriodNumber(row.period))===period)??[];
  const selectedProposal = visibleProposals.find(row => row.proposal_id === selectedProposalId) ?? visibleProposals[0];
  const chooseProposal=(id:string)=>{setSelectedProposalId(id);writeWorkspaceLocation('Planificar',{annualProposal:id},true);};
  const panelProposal = proposal?.proposed_experiences.find(row => row.proposal_id === scope);
  const panelChanges: Change[] = proposal && (!scope || panelProposal) ? scopedAnnualChanges(proposal, scope) : [];
  const globalChanges: Change[] = proposal ? scopedAnnualChanges(proposal, null) : [];
  const libraryChanges = (proposal?.pending_changes ?? []).filter(change => change.proposal_id && !proposal?.proposed_experiences.some(row => row.proposal_id === change.proposal_id));
  const changeScope = (next: string | null) => {
    if (message.trim() && !window.confirm("Hay una indicación sin agregar. ¿Quieres descartarla y cambiar de alcance?")) return;
    setMessage(""); setScope(next); setPanelOpen(true);
  };
  const listOpen = toolsOnly && annualView === "list" || !!mapProjection.error;
  const editable = selected?.status === "draft";
  const generating = job?.status === "queued" || job?.status === "running";
  const dirty = Boolean(message.trim() || ideaDraft.trim() || preparing && contextDirty);
  const reload = useCallback(async (id?: string) => {
    const data = await api<Plans>("/api/annual-plans/current"); setPlans(data);
    const next:Plan|null = selectSavedAnnualPlan(data,id ?? readWorkspaceParams("Planificar").get("annualPlan"));
    setSelectedId(next?.id ?? "");
    const requested=readWorkspaceParams("Planificar").get("annualProposal");if(requested&&next?.proposal.proposed_experiences.some(row=>row.proposal_id===requested))setSelectedProposalId(requested);
    setScope(current => current && !next?.proposal.proposed_experiences.some(row => row.proposal_id === current) ? null : current);
    if (next) writeWorkspaceLocation("Planificar", { annualPlan: next.id }, true);
    return next;
  }, [setSelectedId]);
  const loadStart = useCallback(async () => { const value = await api<Start>("/api/annual-journey/start"); setStart(value); return value; }, []);
  const continueSavedJob = useCallback(async (value: Job) => {
    if (runningJobRef.current) return;
    runningJobRef.current = true;
    setBusy("generate"); setError(""); setJob({ ...value, status: "running" });
    try {
      let result = await api<Job>(`/api/annual-journey/jobs/${value.id}/run`, value.can_auto_resume ? { automaticResume: true } : {});
      while(result.status === "queued") { setJob(result);if(result.poll_after_ms)await new Promise(resolve=>setTimeout(resolve,result.poll_after_ms));result = await api<Job>(`/api/annual-journey/jobs/${value.id}/run`, {}); }
      if (result.status === "succeeded") { await reload(result.draft_id); setPreparing(false); setNotice("Mi año está listo para revisar."); }
      setJob(result);
    } catch {
      // Read server truth, including a recoverable checkpoint, instead of replacing it with a generic HTTP error.
      try { const saved=await api<Job>(`/api/annual-journey/jobs/${value.id}`);if(saved.status==="succeeded"){await reload(saved.draft_id);setPreparing(false);setNotice("Mi año está listo para revisar.");}setJob(saved); }
      catch { setNotice("La conexión está tardando. Ayni sigue preparando tu año; recuperaremos el avance automáticamente."); }
    } finally { runningJobRef.current = false; setBusy(null); }
  }, [reload]);
  useEffect(() => { let live = true;
    Promise.resolve().then(() => Promise.all([reload(), loadStart()])).then(([next]) => { if (live) { setPreparing(!next || next.proposal.journey_version === 2 && !hasSavedAnnualYear(next));
      setIdeas(next?.proposal.teacher_preferences ?? "");
      if(next?.proposal.experience_context) seedContext({contextItems:next.proposal.experience_context.context_items,historicalProjects:next.proposal.experience_context.historical_projects});
      if (next?.proposal.generation_job_id&&!hasSavedAnnualYear(next)) void api<Job>(`/api/annual-journey/jobs/${next.proposal.generation_job_id}`).then(async value => {
        if (!live) return;
        setJob(value);
        if (value.status === "succeeded") { await reload(value.draft_id);if(live)setPreparing(false); }
        else setPreparing(true);
      }).catch(() => { if(live)setError("No pudimos consultar el avance. Tu preparación sigue guardada; vuelve a abrirla para continuar."); });
    } }).catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [reload, loadStart, continueSavedJob, seedContext]);
  useEffect(() => { let live = true;
    void api<AnnualMapEffectiveCalendar>("/api/school-calendar").then(value => { if (live) setEffectiveCalendar(value); }).catch(() => { if (live) setCalendarUnavailable(true); });
    return () => { live = false; };
  }, []);
  useEffect(() => { let live=true;
    const timer = job && (job.status === "queued" || job.can_auto_resume)
      ? window.setTimeout(()=>{if(live)void continueSavedJob(job);}, job.can_auto_resume ? job.resume_after_ms ?? 2000 : 0) : undefined;
    return()=>{live=false;window.clearTimeout(timer);};
  }, [job, continueSavedJob]);
  useEffect(() => {
    if (generating || !dirty && !busy && !audioBusy) return;
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const navigation = (e: Event) => { if (busy || audioBusy || contextDraft.saving || !window.confirm("Hay texto pendiente. ¿Quieres salir sin guardarlo?")) e.preventDefault(); };
    window.addEventListener("beforeunload", unload); window.addEventListener("ayni-before-navigation", navigation);
    return () => { window.removeEventListener("beforeunload", unload); window.removeEventListener("ayni-before-navigation", navigation); };
  }, [dirty, busy, audioBusy, generating, contextDraft.saving]);
  const jobId=job?.id,jobStatus=job?.status;
  useEffect(() => {
    if (!jobId || !["queued", "running"].includes(jobStatus??"")) return;
    let live = true;
    let timer:number;
    const poll = async () => {
      try {
        const value = await api<Job>(`/api/annual-journey/jobs/${jobId}`);
        if (!live) return;
        if (value.status === "succeeded") { await reload(value.draft_id); if (live) { setJob(value);setPreparing(false); setBusy(null); setError("");setNotice("Mi año está listo para revisar."); }return; }
        setJob(value);
        if (["failed", "interrupted"].includes(value.status)) setBusy(null);
      } catch { /* Read again without regenerating the saved job. */ }
      if(live)timer=window.setTimeout(()=>void poll(),3000);
    };
    timer=window.setTimeout(()=>void poll(),2500);
    return () => { live = false; window.clearTimeout(timer); };
  }, [jobId, jobStatus, reload]);
  const run = async (action: string, work: () => Promise<void>) => {
    if (busy || audioBusy) return; setBusy(action); setError(""); setNotice("");
    try { await work(); } catch (e) { const cause = e as Error & { draftId?: string }; setError(cause.message);
      if (cause.draftId) await reload(cause.draftId).catch(() => {});
    } finally { setBusy(null); }
  };
  useEffect(()=>{let live=true;if(!busy&&developAfterSave)void Promise.resolve().then(()=>{if(live){setSelectedProposalId(developAfterSave);writeWorkspaceLocation('Planificar',{annualProposal:developAfterSave,prepareProject:developAfterSave},true);setDevelopAfterSave(null);}});return()=>{live=false;};},[busy,developAfterSave]);
  const mutate = (operation: string, extra: unknown = {}) => selected && run(operation, async () => {
    const result = await api<Plan>(`/api/annual-journey/${selected.id}/${operation}`, { expectedRevision: selected.revision, interpretationsReviewed, futureCoverageAcknowledged:!!proposal?.experience_context, ...(extra as object) });
    if (operation === "intent") { setMessage(""); setNotice("Indicación guardada. Puedes agregar otra o aplicar los cambios juntos."); }
    if (operation === "confirm") { setNotice("Tu año está confirmado. El Word contiene esta misma versión.");setReviewOpen(false); onConfirmed?.(); }
    setInterpretationsReviewed(false); await reload(result.id);
    if(operation==='confirm'&&prepareAfterConfirm){setDevelopAfterSave(prepareAfterConfirm);setPrepareAfterConfirm(null);}
  });
  const generate = () => run("prepare", async () => {
    const existing=selectSavedAnnualPlan(plans,selectedId);
    if(hasSavedAnnualYear(existing)){await reload(existing.id);setPreparing(false);return;}
    if (!start) throw new Error("Actualiza el resumen antes de preparar el año.");
    try {
      const result = await api<Job>("/api/annual-journey/prepare", { teacherIdeas: ideas, sourceFingerprint: start.snapshot.source_fingerprint, ...(process.env.NEXT_PUBLIC_AYNI_EXPERIENCE!=="0"?{experienceContract:true,conversationId,...experienceInput}:{}),
        ...(editable && modern ? { draftId: selected.id, expectedRevision: selected.revision } : {}) });
      setRevisingPreparation(false);setJob(result); await reload(result.draft_id);
    } catch(error) {
      const saved=await reload().catch(()=>null);
      if(saved?.proposal.generation_job_id&&saved.proposal.teacher_preferences===(process.env.NEXT_PUBLIC_AYNI_EXPERIENCE!=="0"?experienceInput.contextItems.map(item=>item.text.trim()).join("\n"):ideas)){
        const recovered=await api<Job>(`/api/annual-journey/jobs/${saved.proposal.generation_job_id}`).catch(()=>null);
        if(recovered){setRevisingPreparation(false);setJob(recovered);if(recovered.status==="succeeded")setPreparing(false);else setPreparing(true);return;}
      }
      throw error;
    }
  });
  if (!plans && !error) return <LoadingState label="Abriendo Mi año…" />;
  const names = new Map((proposal?.curriculum_reference ?? start?.curriculum ?? []).map((c) => [c.id, c.name]));
  const snapshot = preparing ? start?.snapshot : proposal?.classroom_snapshot;
  const disabled = !!busy || audioBusy || generating;
  const awaitingSavedJob = preparing && !job && !!proposal?.generation_job_id && !revisingPreparation;
  if(consultId)return <ActivityConsultation key={consultId} id={consultId} onActivity={setConsultId} onBack={()=>setConsultId('')}/>;
  const proposalDetails=complete&&!toolsOnly?<div className={listOpen?'space-y-4':'space-y-5'}>{(listOpen?visibleProposals:selectedProposal?[selectedProposal]:[]).map(row=>selected?.status==='archived'?<AnnualProjectPreview key={row.proposal_id} row={row} index={(proposal!.resolved_calendar?.projects?.findIndex(slot=>slot.proposal_id===row.proposal_id)??0)+1} names={names} disabled canChange={false} onChange={()=>{}}/>:<CompleteProjectWorkspace key={`${selected?.id}:${row.proposal_id}`} embedded planId={selected?.id} proposalId={row.proposal_id} onGoToday={onGoToday}
    onRequireConfirmation={()=>{setPrepareAfterConfirm(row.proposal_id);setReviewOpen(true);}} onConfirmed={()=>{void reload().then(()=>onConfirmed?.()).catch(cause=>setError(cause.message));}} onPlanChanged={async id=>{await reload(id);}}/>)}{!visibleProposals.length&&<p className="rounded-xl bg-white p-5 text-[#47658b]">No hay proyectos registrados en este bimestre. Puedes consultar otro bimestre o Todo el año.</p>}</div>:null;
  if(projectDetail&&proposalDetails)return <section className="min-w-0">{proposalDetails}</section>;
  return <section ref={overviewRef} className={"ayni-workflow space-y-6 !max-w-none "+yearStyles.page}>
    {(!preparing||generating)&&<header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-extrabold text-[#172b52]">{preparing?job&&job.status!=="succeeded"?"Preparando Mi año":"Conversar con Ayni":toolsOnly?"Organizar propuestas":"Mi año"}</h1>
      <p className="mt-2 text-[#526b87]">{preparing?"Ayni te acompaña a preparar una propuesta para tu aula.":"Conocemos al grupo y preparamos oportunidades para seguir aprendiendo."}</p></div>
      {selected && !preparing && toolsOnly && <label className="text-sm font-semibold">Versión del año<select className="mt-1 block min-h-11 rounded-lg border bg-white px-3" disabled={disabled}
        value={selectedId} onChange={(e) => { if (!canLeaveWorkspace()) return; setSelectedId(e.target.value); setPreparing(false); setMessage(""); setScope(null); setInterpretationsReviewed(false);
          writeWorkspaceLocation("Planificar", { annualPlan: e.target.value }, true); }}>
        {[plans?.draft, plans?.active, ...(plans?.archived ?? [])].filter((p): p is Plan => !!p).map((p) => <option key={p.id} value={p.id}>V{p.version} · {p.status === "draft" ? "Borrador" : p.status === "active" ? "Vigente" : "Histórica"}</option>)}
      </select></label>}
    </header>}
    {error && <WorkflowFeedback tone="error">{error}<Button className="mt-3" variant="outline" disabled={disabled} onClick={() => void run("reload", async () => { let next=await reload(); await loadStart(); if(next?.proposal.generation_job_id&&!hasSavedAnnualYear(next)){const recovered=await api<Job>(`/api/annual-journey/jobs/${next.proposal.generation_job_id}`);setJob(recovered);if(recovered.status==="succeeded")next=await reload(recovered.draft_id);} setPreparing(!next || next.proposal.journey_version===2&&!hasSavedAnnualYear(next)); })}>Abrir lo guardado y actualizar resumen</Button></WorkflowFeedback>}
    {notice && <p role="status" className="text-sm font-semibold text-[#176442]">{notice}</p>}
    {busy === "apply" ? <GenerationProgress label="Ayni está aplicando tus indicaciones" description="Revisa las propuestas que necesitan cambios y conserva las demás." /> : null}
    {job && job.status !== "succeeded" && <AnnualPreparationProgress job={job} generating={generating} disabled={disabled} onContinue={()=>void continueSavedJob(job)} onRefresh={()=>void run("reload",async()=>{await reload(job.draft_id);await loadStart();setRevisingPreparation(true);setJob(null);})}/>}
    {awaitingSavedJob&&!error&&<LoadingState label="Recuperando el avance de Mi año…"/>}
    {preparing && !awaitingSavedJob && !generating && (!job || job.status === "succeeded") && start && <><header className={chatStyles.pageHeader}><div><h1>Conversa con Ayni</h1><p>Te acompaño a preparar tu año con lo que sabemos de tu aula y tus ideas.</p></div><div className="w-24"><AyniMascot/></div></header>{contextDraft.error&&<WorkflowFeedback tone="error">{contextDraft.error}<div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" onClick={contextDraft.retry}>Reintentar guardado</Button><Button variant="ghost" onClick={()=>void contextDraft.reloadSaved()}>Recargar contexto guardado</Button></div></WorkflowFeedback>}<AnnualPlanningConversation onBack={onGoDiagnostic} decisionSummary={experienceInput.contextItems.map(item=>item.text)} contextTools={process.env.NEXT_PUBLIC_AYNI_EXPERIENCE !== "0"?<AnnualChatContext summary={start.chat_summary} value={experienceInput} onChange={contextDraft.change} curriculum={start.curriculum} today={start.today??new Date().toLocaleDateString("en-CA",{timeZone:"America/Lima"})} disabled={disabled} saving={contextDraft.saving} error={contextDraft.error}/>:undefined} contextRevision={contextDraft.revision} onIdeas={setIdeas} onDraft={setIdeaDraft} onGenerate={generate} onConversation={captureConversation} disabled={disabled||contextDirty||contextDraft.saving}/></>}
    {!preparing && complete && selected && proposal && <>
      {editable&&!toolsOnly&&<section className={yearStyles.summary}><div><h2>{editable?'Resumen listo para revisar':'Mi año guardado'}</h2><p>{editable?'Revisa lo principal antes de confirmar tu año.':'Puedes preparar un proyecto y volver a tu año cuando lo necesites.'}</p></div>{proposal.experience_context&&<div><small>Inicio en Ayni</small><strong>{compactDate(proposal.experience_context.starts_on)}</strong></div>}<div><small>Contexto registrado</small><strong>{proposal.experience_context?.context_items[0]?.text??String(proposal.classroom_snapshot?.student_count??0)+' niños en tu aula'}</strong></div><Button disabled={disabled} onClick={()=>{setPrepareAfterConfirm(null);setReviewOpen(true);}}>{editable?'Revisar y confirmar':'Ver resumen del año'}</Button></section>}
      {toolsOnly&&<div className="flex flex-wrap gap-3">{editable?<Button disabled={disabled} onClick={()=>{setPrepareAfterConfirm(null);setReviewOpen(true);}}>Revisar y confirmar</Button>:selected.status==='active'&&!plans?.draft?<Button disabled={disabled} onClick={()=>void mutate('copy')}>Abrir revisión para organizar</Button>:null}</div>}
      {!toolsOnly&&<Dialog open={reviewOpen} onOpenChange={value=>{if(!disabled)setReviewOpen(value);}}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>¿Confirmamos Mi año?</DialogTitle><DialogDescription>Las propuestas consideran la información disponible de tu aula.</DialogDescription></DialogHeader><p><strong>{proposal.resolved_calendar?.projects?.length??15} tramos</strong> organizados en 4 bimestres. Conservamos las fechas lectivas, feriados y semanas de gestión del calendario.</p><p className="text-sm text-[#47658b]">Los períodos pasados sin registro se mantienen como tales. Confirmas la planificación de los días disponibles.</p>{!!proposal.future_coverage_gaps?.length&&<p className="text-sm text-[#47658b]">En lo que queda del año hay {proposal.future_coverage_gaps.length} competencias sin una oportunidad prevista en proyectos. Puedes seguir observándolas en los momentos cotidianos.</p>}{!!proposal.evidence_interpretations?.length&&<p className="text-sm text-[#47658b]">Las interpretaciones de Ayni quedan pendientes de revisión; esta confirmación no acredita logros ni niveles de los niños. Las fuentes siguen disponibles en Entrevistas y observaciones.</p>}{error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}{editable&&<AsyncButton busy={busy==='confirm'} busyLabel="Confirmando…" disabled={disabled||!!message.trim()||!!proposal.pending_changes?.length} onClick={()=>void mutate('confirm',{confirmationScope:'planning',interpretationsReviewed:false})}>Confirmar Mi año</AsyncButton>}</DialogContent></Dialog>}
      {toolsOnly&&<>
      <Dialog open={reviewOpen} onOpenChange={value=>{if(!disabled)setReviewOpen(value);}}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editable?'Revisa y confirma Mi año':'Resumen de Mi año'}</DialogTitle><DialogDescription>{prepareAfterConfirm?'Confirma tu año para continuar con el proyecto elegido.':'La confirmación conserva esta versión. Después puedes cambiar proyectos con Ayni.'}</DialogDescription></DialogHeader>{proposal.experience_context&&<><h3 className="font-bold">Tus decisiones</h3><ul className="list-disc space-y-2 pl-5">{proposal.experience_context.context_items.map((item,i)=><li key={i}>{item.text}</li>)}</ul>{!!proposal.experience_context.historical_projects.length&&<><h3 className="font-bold">Historia que declaraste</h3><ul>{proposal.experience_context.historical_projects.map((item,i)=><li key={i}>{item.title}</li>)}</ul></> }</>}{proposal.evidence_interpretations?.map((item,i)=><section key={i} className="space-y-2 rounded-xl bg-[#edf7fa] p-3"><p>{item.interpretation}</p><p className="text-sm">{item.scope==='individual'?'Registro individual':'Subgrupo'} · Interpretación para revisar</p>{item.fact_keys.map(key=><p key={key} className="text-sm">{snapshot?.facts.find(fact=>fact.key===key)?.support_text}</p>)}</section>)}{editable&&!!proposal.evidence_interpretations?.length&&<label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={interpretationsReviewed} onChange={event=>setInterpretationsReviewed(event.target.checked)}/>Revisé estas interpretaciones para esta versión del año.</label>}{proposal.experience_context&&<p className="text-sm text-[#47658b]">Las fechas pasadas sin registro se conservan así. Confirmas las oportunidades previstas para los días disponibles.</p>}{editable&&<AsyncButton busy={busy==='confirm'} busyLabel="Confirmando…" disabled={disabled||!!message.trim()||!!proposal.pending_changes?.length||proposal.editor_version===3&&!proposal.experience_context&&(proposal.proposed_experiences.length!==15||annualCoverage(proposal).some((item:{total:number;everyday:boolean})=>!item.total&&!item.everyday))||!!proposal.evidence_interpretations?.length&&!interpretationsReviewed} onClick={()=>void mutate('confirm')}>{prepareAfterConfirm?'Confirmar y continuar al proyecto':'Confirmar Mi año'}</AsyncButton>}{error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}</DialogContent></Dialog>
      </>}
      {toolsOnly && editable && proposal.editor_version!==3 && <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={disabled} onClick={()=>changeScope(null)}><MessageCircle className="size-4"/>Ajustar Mi año con Ayni{globalChanges.length ? " · "+globalChanges.length+" pendientes" : ""}</Button><Button variant="ghost" disabled={disabled} onClick={()=>void mutate("refresh")}>Actualizar con nuevas observaciones</Button>{proposal.editor_version!==3 && <Button variant="outline" disabled={disabled} onClick={()=>void mutate("upgrade")}>Organizar borrador en 15 tramos</Button>}</div>}
      {toolsOnly && proposal.editor_version!==3 && <p className="rounded-lg bg-slate-100 p-3 text-sm text-[#3d5874]">Estás viendo una versión anterior de {proposal.proposed_experiences.length} propuestas, con sus fechas conservadas. Organizar un borrador compatible en 15 tramos activa Biblioteca, matriz curricular y arrastre; el contenido pedagógico se conserva. Si contiene trabajo protegido, usa un año QA separado.</p>}
      {toolsOnly && proposal.editor_version===3 && !proposal.experience_context && proposal.proposed_experiences.length!==15 && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Hay {15-proposal.proposed_experiences.length} tramos vacíos. Coloca una propuesta en cada uno antes de confirmar.</p>}
      {toolsOnly && proposal.editor_version===3 && annualCoverage(proposal).some((c:{total:number;everyday:boolean})=>!c.total&&!c.everyday) && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Hay competencias sin oportunidad anual ni cotidiana. Revisa la matriz antes de confirmar. {proposal.experience_context?"Al confirmar este año parcial aceptas las oportunidades futuras indicadas; no se presume qué se trabajó antes.":""}</p>}
      {toolsOnly && editable && libraryChanges.length>0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-bold">Indicaciones de propuestas en Biblioteca</h3><p className="mt-1 text-sm">Puedes quitar estas indicaciones o volver a colocar la propuesta en el año para aplicarlas.</p><ul className="mt-3 space-y-3">{libraryChanges.map(change=><li key={change.id}><p className="font-semibold">{annualDisplayTitle(proposal.available_experiences?.find(row=>row.proposal_id===change.proposal_id)?.title ?? "Propuesta retirada")}</p><span>{change.text}</span><Button variant="ghost" disabled={disabled} onClick={()=>void mutate("remove-intent",{changeId:change.id})}>Quitar indicación</Button></li>)}</ul></section>}
      {proposal.editor_version!==3&&<div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex gap-2" role="group" aria-label="Vista de Mi año">
          <Button variant={annualView === "map" ? "default" : "outline"} aria-pressed={annualView === "map"} onClick={() => setAnnualView("map")}><MapIcon aria-hidden="true" className="size-4" />Mapa del año</Button>
          <Button variant={annualView === "list" ? "default" : "outline"} aria-pressed={annualView === "list"} onClick={() => setAnnualView("list")}><List aria-hidden="true" className="size-4" />Lista de propuestas</Button>
        </div>
      </div>
      }
      {mapProjection.error && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{mapProjection.error}</p>}
      {!listOpen && calendarUnavailable && <p role="status" className="text-sm text-[#526b87]">No pudimos consultar los feriados. Vuelve a abrir Mi año para cargarlos; las fechas de tus propuestas siguen guardadas.</p>}
      {!listOpen && calendar && proposal.editor_version!==3 && <AnnualYearTimeline rows={mapProjection.rows} calendar={calendar} effectiveCalendar={effectiveCalendar}
        selectedId={selectedProposal?.proposal_id ?? null} onSelect={setSelectedProposalId} initialStage={proposal.resolved_calendar?.initial_stage} />}
      {proposal.editor_version===3 && calendar ? <AnnualSlotEditor plan={proposal as unknown as EditorPlan} planId={selected.id} revision={selected.revision} calendar={calendar} effectiveCalendar={effectiveCalendar} compact={!toolsOnly} showTools={toolsOnly} calendarTimeline={toolsOnly||period==='all'&&!listOpen} onProtection={id=>void mutate("keep",{proposalId:id})} listView={listOpen} viewAction={toolsOnly&&<Button variant="outline" onClick={()=>setAnnualView(listOpen?'map':'list')}>{listOpen?<MapIcon size={16}/>:<List size={16}/>} {listOpen?'Ver mapa':'Ver lista'}</Button>} period={period} onPeriod={value=>{setPeriodValue(value as typeof periodValue);setSelectedProposalId(null);}} selectedId={selectedProposal?.proposal_id ?? null} onSelect={chooseProposal} editable={!!editable} disabled={disabled} onAction={action=>void mutate("structure",{action})} onReload={reload}>{proposalDetails}</AnnualSlotEditor> : proposalDetails}

      <Sheet open={panelOpen} onOpenChange={value=>{if(!value&&disabled)return;if(!value&&message.trim()&&!window.confirm("Hay texto sin guardar. ¿Quieres cerrar el panel?"))return;setPanelOpen(value);}}><SheetContent className="w-full overflow-y-auto p-5 sm:max-w-xl"><SheetHeader><SheetTitle>{scope?"Cambiar propuesta con Ayni":"Ajustar Mi año con Ayni"}</SheetTitle><SheetDescription>{scope?"Cuéntame qué quisieras cambiar. Puedes pedir otro enfoque, tema, materiales, competencias u otra experiencia.":"Reúne cambios para todo tu año: temas, propuestas futuras u oportunidades curriculares. Las propuestas protegidas se conservan."}</SheetDescription></SheetHeader>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#edf7fa] p-3"><span className="w-16 shrink-0"><AyniMascot/></span><p className="text-sm leading-relaxed">{scope?"¿Qué enfoque quieres cambiar y qué deseas que hagan los niños? Agrega tus indicaciones; las revisaremos juntas antes de aplicar el cambio.":"Cuéntame qué quieres priorizar y qué condiciones debo considerar para ajustar tu año."}</p></div>
        {error && <WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
        {panelProposal && <p className="mt-3 font-semibold">{annualDisplayTitle(panelProposal.title)}{panelProposal.planned_start_date && panelProposal.planned_end_date?` · ${compactDate(panelProposal.planned_start_date)}–${compactDate(panelProposal.planned_end_date)}`:""}</p>}
        {scope && <button type="button" className="mt-2 min-h-11 text-sm text-[#087d96] underline underline-offset-4 disabled:opacity-50" disabled={disabled} onClick={()=>changeScope(null)}>← Ajustar todo Mi año</button>}
        {editable && <>
          <p className="mt-4 text-sm font-semibold">Ejemplos</p><div className="mt-2 flex flex-wrap gap-2">{(scope?["Quiero que tenga más movimiento","Quiero incluir a las familias","Prefiero otra idea para trabajar esta competencia"]:["Quiero más oportunidades en la naturaleza","Quiero ajustar varias propuestas futuras","Quiero revisar las oportunidades curriculares"]).map(example=><Button key={example} variant="outline" size="sm" disabled={disabled} onClick={()=>setMessage(example)}>{example}</Button>)}</div>
          <label htmlFor="annual-message" className="mt-4 block font-semibold">¿Qué quieres cambiar?</label><div className="relative mt-2"><Textarea id="annual-message" ref={messageRef} placeholder="Escribe o dicta tu indicación…" className="min-h-24 pr-16" value={message} disabled={disabled} maxLength={1600} onChange={(e) => setMessage(e.target.value)} /><div className="absolute top-2 right-2"><DictationRecorder iconOnly autoTranscribe classroomScope purpose="group_summary" rawTranscript context={scope?"Indicación docente para cambiar esta propuesta":"Indicación docente para cambiar el año"} currentText={message} onTranscribed={(text) => setMessage(text.slice(0, 1600))} onBusyChange={setAudioBusy} disabled={!!busy} /></div></div>
          <Button className="mt-3" variant="outline" disabled={disabled || !message.trim()} onClick={() => void mutate("intent", { text: message, proposalId: scope })}>Agregar cambio</Button>
          <div className="mt-6"><h3 className="font-bold">{scope?"Cambios para esta propuesta":"Cambios para Mi año"}</h3>{panelChanges.length?<ol className="mt-2 list-decimal space-y-3 pl-5">{panelChanges.map(c=><li key={c.id}><span className="whitespace-pre-wrap">{c.text}</span><Button variant="ghost" disabled={disabled} onClick={()=>void mutate("remove-intent",{changeId:c.id})}>Quitar</Button></li>)}</ol>:<p className="mt-2 text-sm text-[#526b87]">{scope?"Aún no has agregado cambios para esta propuesta.":"Aún no has agregado cambios para Mi año."}</p>}
          {panelChanges.length>0 && <AsyncButton busyLabel="Aplicando…" className="mt-3" busy={busy === "apply"} disabled={disabled || !!message.trim()} onClick={() => void mutate("apply",{proposalId:scope})}>Aplicar cambios</AsyncButton>}</div>
        </>}
        <details className="mt-5"><summary className="min-h-11 cursor-pointer py-2 font-semibold">{scope?"Por qué Ayni propuso esta experiencia":"Qué sabemos del aula para ajustar Mi año"}</summary>{scope&&panelProposal?<div className="space-y-3 text-sm"><p>{panelProposal.rationale}</p>{panelProposal.source_fact_keys.map(key=>{const fact=snapshot?.facts.find(f=>f.key===key);return fact?<p key={key}>{fact.support_text || "Registro conservado en su fuente privada."}</p>:null;})}</div>:snapshot?<Facts snapshot={snapshot} subjects={selected?.display_subjects}/>:null}</details>
      </SheetContent></Sheet>

      {toolsOnly&&<details className="rounded-xl border bg-white p-5"><summary className="min-h-11 cursor-pointer font-semibold">Ver plan anual completo</summary>
        <div className="mt-4 space-y-5">{Object.entries(generalLabels).map(([key, label]) => <section key={key}><h3 className="font-bold">{label}</h3><ul className="mt-2 list-disc pl-5">{(key==="organization_criteria" && proposal.editor_version===3?annualCalendarCriteria(proposal):proposal[key as keyof typeof generalLabels])?.map((text:string, i:number) => <li key={i}>{text}</li>)}</ul></section>)}
          <h3 className="font-bold">Oportunidades en la jornada</h3>{proposal.everyday_opportunities?.map((value, i) => <section key={i}><h4 className="font-semibold">{value.moment}</h4><OpportunityDetails value={value} names={names} /></section>)}
          <h3 className="font-bold">Interpretaciones que revisarás al confirmar</h3><p className="text-sm">Son propuestas de interpretación de actuaciones concretas. No declaran una competencia lograda ni describen automáticamente a todo el grupo.</p>
          {!!proposal.insufficient_interpretations?.length && <p className="text-sm">En {proposal.insufficient_interpretations.length} posibles interpretaciones todavía faltaba sustento. Conservamos los registros sin concluir que exista un avance o una dificultad.</p>}
          {proposal.evidence_interpretations?.map((value, i) => <div key={i}><p>{value.interpretation} · {value.scope === "individual" ? "Individual" : "Subgrupo"}</p><p className="mt-1 text-sm text-[#526b87]">{value.meaning === "advance" ? "Posible avance" : value.meaning === "support_needed" ? "Posible necesidad de acompañamiento" : "Información ambigua"}</p>{value.fact_keys.map((key) => <p key={key} className="mt-1 text-sm">{snapshot?.facts.find((f) => f.key === key)?.support_text}</p>)}</div>)}
          {proposal.resolved_calendar && <section><h3 className="font-bold">{proposal.resolved_calendar.initial_stage.name}</h3><p>{proposal.resolved_calendar.initial_stage.purpose}</p><p>{proposal.resolved_calendar.initial_stage.suggested_experiences.join(" · ")}</p><p>{proposal.resolved_calendar.initial_stage.what_to_observe.join(" · ")}</p><p>{proposal.resolved_calendar.initial_stage.family_actions?.join(" · ")}</p><p>{proposal.resolved_calendar.initial_stage.diagnostic_focus?.join(" · ")}</p><p>{proposal.resolved_calendar.initial_stage.teacher_notes}</p><p>{proposal.resolved_calendar.initial_stage.starts_on} al {proposal.resolved_calendar.initial_stage.ends_on}</p>
            <p className="mt-3">Calendario comprobado: {proposal.resolved_calendar.integrity.assigned}/{proposal.resolved_calendar.integrity.eligible} fechas asignadas, sin huecos ni solapamientos.</p></section>}
        </div>
      </details>}
      {toolsOnly && !editable && <a className="inline-flex min-h-11 items-center rounded-lg bg-[#087d96] px-5 font-semibold text-white" href={`${localDatabaseApiUrl}/api/documents/annual_plan/${selected.id}/download`}>Descargar mi año en Word</a>}
    </>}
    {!preparing && selected && !modern && <div className="space-y-3"><p>Esta versión utiliza el recorrido anterior. Sus datos y documentos se conservan.</p><Button onClick={onLegacy}>Abrir versión anterior</Button>
      {!plans?.draft && <Button variant="outline" disabled={disabled} onClick={() => { setPreparing(true); setIdeas(""); }}>Preparar una nueva versión con Ayni</Button>}</div>}
    <footer className="flex flex-wrap gap-3 text-sm">{!preparing&&toolsOnly&&<Button variant="outline" disabled={disabled} onClick={toolsOnly?()=>writeWorkspaceLocation("Planificar",{tab:"home",annualTools:""}):onGoDiagnostic}>{toolsOnly?"Volver a Planificación":"Volver"}</Button>}
      {preparing && complete && <Button variant="ghost" disabled={disabled} onClick={() => setPreparing(false)}>Volver a las propuestas guardadas</Button>}
    </footer>
  </section>;
}
