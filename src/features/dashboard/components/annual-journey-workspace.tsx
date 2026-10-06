"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, List, Map as MapIcon, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AnnualSlotEditor, type EditorPlan } from "./annual-slot-editor";
import { annualDisplayTitle, annualCoverage } from "@/src/lib/annual-year-editor.mjs";
import { scopedAnnualChanges, annualCalendarCriteria } from "@/src/lib/annual-change-scope.mjs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, apiJson } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { canLeaveWorkspace, readWorkspaceParams, useWorkspaceSubview, writeWorkspaceLocation } from "@/src/lib/workspace-location";
import { savedJourneyAnnualRows } from "@/src/lib/annual-year-map.mjs";
import { AnnualYearTimeline, type AnnualMapRow, type AnnualMapCalendar, type AnnualMapEffectiveCalendar } from "./annual-year-map";
import { AsyncButton, GenerationProgress, LoadingState, WorkflowFeedback } from "./workflow-ui";
import { ExperienceContextForm, type ExperienceContextInput } from "./experience-context-form";
import { AnnualPlanningConversation } from "./annual-planning-conversation";
import { AnnualPreparationProgress } from "./annual-preparation-progress";
import { DictationRecorder } from "./dictation-recorder";
import { AyniMascot, JourneySteps } from "./initial-journey-ui";

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
type Plan = { id: string; status: string; revision: number; version: number; proposal: Proposal; document_context?: { calendar?: AnnualMapCalendar } };
type Plans = { draft: Plan | null; active: Plan | null; archived: Plan[] };
type Start = { today?:string; snapshot: Snapshot; curriculum: { id: string; name: string }[] };
type Job = { id: string; draft_id: string; status: "queued" | "running" | "failed" | "interrupted" | "succeeded";
  stage: string; completed_stages: string[]; updated_at: string; error?: string | null };
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
const compactDate = (value: string) => new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

function Facts({ snapshot }: { snapshot: Snapshot }) {
  return <div className="space-y-4">{snapshot.facts.length ? snapshot.facts.map((fact) => <div key={fact.key}>
    <p className="text-sm font-semibold text-[#526b87]">{sourceLabels[fact.kind] ?? fact.kind} · {fact.scope === "individual" ? "Un niño o niña" : "Alcance declarado"} · {fact.subject.replace("child_", "Niño ")}</p>
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

export function AnnualJourneyWorkspace({ onConfirmed, onGoDiagnostic, onDevelop, onLegacy }: {
  onConfirmed?: () => void; onGoDiagnostic?: () => void; onDevelop?: (id: string) => void; onLegacy: () => void;
}) {
  const [plans, setPlans] = useState<Plans | null>(null), [start, setStart] = useState<Start | null>(null);
  const [selectedId, setSelectedId] = useState(""), [preparing, setPreparing] = useState(false);
  const [ideas, setIdeas] = useState(""), [message, setMessage] = useState(""), [scope, setScope] = useState<string | null>(null);
  const [ideaDraft, setIdeaDraft] = useState("");
  const [experienceInput,setExperienceInput]=useState<ExperienceContextInput>({contextItems:[],historicalProjects:[]});
  const [conversationId,setConversationId]=useState<string>();
  const contextEdited=useRef(false);
  const [contextDirty,setContextDirty]=useState(false);
  const captureConversation=useCallback((value:{id:string;messages:{role:string;text:string}[]})=>{setConversationId(value.id);if(!contextEdited.current)setExperienceInput(previous=>({...previous,contextItems:value.messages.flatMap((m,index)=>m.role==="teacher"?m.text.split(/\n+|;\s*/).filter(Boolean).map(text=>({text,source_turn:index})):[])}));},[]);
  const [panelOpen,setPanelOpen]=useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState<string | null>(null), [audioBusy, setAudioBusy] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [interpretationsReviewed, setInterpretationsReviewed] = useState(false);
  const [annualView, setAnnualView] = useWorkspaceSubview("Planificar", "annualView", annualViews, "map", false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [effectiveCalendar, setEffectiveCalendar] = useState<AnnualMapEffectiveCalendar | null>(null);
  const [calendarUnavailable, setCalendarUnavailable] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const runningJobRef = useRef(false);
  const selected = [plans?.draft, plans?.active, ...(plans?.archived ?? [])].find((p) => p?.id === selectedId) ?? null;
  const proposal = selected?.proposal, modern = proposal?.journey_version === 2;
  const complete = modern && !!proposal?.resolved_calendar && (proposal.editor_version===3 || proposal.proposed_experiences.length===12);
  const calendar = selected?.document_context?.calendar;
  const mapProjection: { rows: (Row & { start: string; end: string })[]; error: string } = (() => {
    if (!complete) return { rows: [], error: "" };
    try {
      if (proposal?.editor_version===3) return {rows:[],error:""};
      if (!calendar) throw new Error("Esta versión no tiene un calendario guardado. Puedes consultar las propuestas en la lista.");
      return { rows: savedJourneyAnnualRows(proposal), error: "" };
    } catch (cause) { return { rows: [], error: cause instanceof Error ? cause.message : "No se pudo abrir el mapa guardado." }; }
  })();
  const selectedProposal = proposal?.proposed_experiences.find(row => row.proposal_id === selectedProposalId) ?? proposal?.proposed_experiences[0];
  const panelProposal = proposal?.proposed_experiences.find(row => row.proposal_id === scope);
  const panelChanges: Change[] = proposal && (!scope || panelProposal) ? scopedAnnualChanges(proposal, scope) : [];
  const globalChanges: Change[] = proposal ? scopedAnnualChanges(proposal, null) : [];
  const libraryChanges = (proposal?.pending_changes ?? []).filter(change => change.proposal_id && !proposal?.proposed_experiences.some(row => row.proposal_id === change.proposal_id));
  const changeScope = (next: string | null) => {
    if (message.trim() && !window.confirm("Hay una indicación sin agregar. ¿Quieres descartarla y cambiar de alcance?")) return;
    setMessage(""); setScope(next); setPanelOpen(true);
  };
  const listOpen = annualView === "list" || !!mapProjection.error;
  const editable = selected?.status === "draft";
  const generating = job?.status === "queued" || job?.status === "running";
  const dirty = Boolean(message.trim() || ideaDraft.trim() || preparing && contextDirty);
  const reload = useCallback(async (id?: string) => {
    const data = await api<Plans>("/api/annual-plans/current"); setPlans(data);
    const all = [data.draft, data.active, ...data.archived].filter((p): p is Plan => !!p);
    const next = all.find((p) => p.id === (id ?? readWorkspaceParams("Planificar").get("annualPlan"))) ?? data.draft ?? data.active;
    setSelectedId(next?.id ?? "");
    setScope(current => current && !next?.proposal.proposed_experiences.some(row => row.proposal_id === current) ? null : current);
    if (next) writeWorkspaceLocation("Planificar", { annualPlan: next.id }, true);
    return next;
  }, []);
  const loadStart = useCallback(async () => { const value = await api<Start>("/api/annual-journey/start"); setStart(value); return value; }, []);
  const continueSavedJob = useCallback(async (value: Job) => {
    if (runningJobRef.current) return;
    runningJobRef.current = true;
    setBusy("generate"); setError(""); setJob({ ...value, status: "running" });
    try {
      let result = await api<Job>(`/api/annual-journey/jobs/${value.id}/run`, {});
      while(result.status === "queued") { setJob(result);result = await api<Job>(`/api/annual-journey/jobs/${value.id}/run`, {}); }
      if (result.status === "succeeded") { await reload(result.draft_id); setPreparing(false); setNotice("Mi año está listo para revisar."); }
      setJob(result);
    } catch {
      // Read server truth, including a recoverable checkpoint, instead of replacing it with a generic HTTP error.
      try { const saved=await api<Job>(`/api/annual-journey/jobs/${value.id}`);if(saved.status==="succeeded"){await reload(saved.draft_id);setPreparing(false);setNotice("Mi año está listo para revisar.");}setJob(saved); }
      catch { setNotice("La conexión está tardando. Ayni sigue preparando tu año; recuperaremos el avance automáticamente."); }
    } finally { runningJobRef.current = false; setBusy(null); }
  }, [reload]);
  useEffect(() => { let live = true;
    Promise.resolve().then(() => Promise.all([reload(), loadStart()])).then(([next]) => { if (live) { setPreparing(!next || next.proposal.journey_version === 2 && !next.proposal.proposed_experiences.length);
      setIdeas(next?.proposal.teacher_preferences ?? "");
      if(next?.proposal.experience_context) setExperienceInput({contextItems:next.proposal.experience_context.context_items,historicalProjects:next.proposal.experience_context.historical_projects});
      if (next?.proposal.generation_job_id) void api<Job>(`/api/annual-journey/jobs/${next.proposal.generation_job_id}`).then(value => {
        if (live) { setJob(value); if (value.status !== "succeeded") setPreparing(true);
        }
      }).catch(() => {});
    } }).catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [reload, loadStart, continueSavedJob]);
  useEffect(() => { let live = true;
    void api<AnnualMapEffectiveCalendar>("/api/school-calendar").then(value => { if (live) setEffectiveCalendar(value); }).catch(() => { if (live) setCalendarUnavailable(true); });
    return () => { live = false; };
  }, []);
  useEffect(() => { let live=true;
    if (job?.status === "queued") void Promise.resolve().then(()=>{if(live)void continueSavedJob(job);});
    return()=>{live=false;};
  }, [job, continueSavedJob]);
  useEffect(() => {
    if (generating || !dirty && !busy && !audioBusy) return;
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const navigation = (e: Event) => { if (busy || audioBusy || !window.confirm("Hay texto pendiente. ¿Quieres salir sin guardarlo?")) e.preventDefault(); };
    window.addEventListener("beforeunload", unload); window.addEventListener("ayni-before-navigation", navigation);
    return () => { window.removeEventListener("beforeunload", unload); window.removeEventListener("ayni-before-navigation", navigation); };
  }, [dirty, busy, audioBusy, generating]);
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
  const mutate = (operation: string, extra: unknown = {}) => selected && run(operation, async () => {
    const result = await api<Plan>(`/api/annual-journey/${selected.id}/${operation}`, { expectedRevision: selected.revision, interpretationsReviewed, futureCoverageAcknowledged:!!proposal?.experience_context, ...(extra as object) });
    if (operation === "intent") { setMessage(""); setNotice("Indicación guardada. Puedes agregar otra o aplicar los cambios juntos."); }
    if (operation === "confirm") { setNotice("Tu año está confirmado. El Word contiene esta misma versión."); onConfirmed?.(); }
    setInterpretationsReviewed(false); await reload(result.id);
  });
  const generate = () => run("prepare", async () => {
    if (!start) throw new Error("Actualiza el resumen antes de preparar el año.");
    try {
      const result = await api<Job>("/api/annual-journey/prepare", { teacherIdeas: ideas, sourceFingerprint: start.snapshot.source_fingerprint, ...(process.env.NEXT_PUBLIC_AYNI_EXPERIENCE!=="0"?{experienceContract:true,conversationId,...experienceInput}:{}),
        ...(editable && modern ? { draftId: selected.id, expectedRevision: selected.revision } : {}) });
      contextEdited.current=false;setContextDirty(false);setJob(result); await reload(result.draft_id);
    } catch(error) {
      const saved=await reload().catch(()=>null);
      if(saved?.proposal.generation_job_id&&saved.proposal.teacher_preferences===(process.env.NEXT_PUBLIC_AYNI_EXPERIENCE!=="0"?experienceInput.contextItems.map(item=>item.text.trim()).join("\n"):ideas)){
        const recovered=await api<Job>(`/api/annual-journey/jobs/${saved.proposal.generation_job_id}`).catch(()=>null);
        if(recovered){setJob(recovered);if(recovered.status==="succeeded")setPreparing(false);else setPreparing(true);return;}
      }
      throw error;
    }
  });
  if (!plans && !error) return <LoadingState label="Abriendo Mi año…" />;
  const names = new Map((proposal?.curriculum_reference ?? start?.curriculum ?? []).map((c) => [c.id, c.name]));
  const snapshot = preparing ? start?.snapshot : proposal?.classroom_snapshot;
  const disabled = !!busy || audioBusy || generating;
  const proposalDetails = complete ? (<div className={listOpen ? "grid gap-5 lg:grid-cols-2" : "space-y-5"}>{proposal!.proposed_experiences.map((row, index) => listOpen || row.proposal_id === selectedProposal?.proposal_id ? <article key={row.proposal_id} className="rounded-xl border border-[#d6e5ef] bg-white p-5 sm:p-6">
        <h2 className="text-xl font-bold leading-snug text-[#172b52]">{proposal!.editor_version===3 ? (proposal!.resolved_calendar?.projects?.findIndex((slot:{proposal_id:string|null})=>slot.proposal_id===row.proposal_id) ?? index)+1 : index+1} · {annualDisplayTitle(row.title)}</h2>
        {row.planned_start_date && row.planned_end_date && <p className="mt-2 text-sm font-semibold text-[#526b87]">{compactDate(row.planned_start_date)} – {compactDate(row.planned_end_date)} · {proposal?.resolved_calendar?.projects?.some(slot=>slot.proposal_id===row.proposal_id&&!!slot.historical_dates?.length)?"Tramo parcial":`${row.duration_weeks} semanas`} · {row.period} · {row.planned_instructional_days} días lectivos</p>}
        <p className="mt-4 font-semibold">Qué podrían hacer los niños</p><ul className="mt-2 list-disc space-y-1 pl-5 text-[#3d5874]">{row.children_actions.map((text, i) => <li key={i}>{text}</li>)}</ul>
        <p className="mt-4 font-semibold">Por qué tiene sentido para esta aula</p><p className="mt-2 leading-relaxed text-[#3d5874]">{row.rationale}</p>
        <div className="mt-4 flex flex-wrap gap-2">{editable && <><Button variant="outline" disabled={disabled} onClick={() => void mutate("keep", { proposalId: row.proposal_id })}>{row.teacher_protected && <Check aria-hidden="true" />} {row.teacher_protected ? "Mantenida · permitir cambios" : "Dejar como está"}</Button>
          <Button variant="outline" disabled={disabled || row.teacher_protected} onClick={() => changeScope(row.proposal_id)}>Cambiar con Ayni</Button>
          </>}
          {selected!.status === "active" && onDevelop && <Button variant="outline" onClick={() => onDevelop(row.proposal_id)}>Preparar esta propuesta</Button>}
        </div>
        <details className="mt-3 text-sm leading-relaxed"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-[#087d96]">Ver detalles</summary>
          <div className="space-y-3"><p><strong>Invitación prevista:</strong> {row.invitation}</p><p><strong>Propósito:</strong> {row.purpose}</p>
            {row.opportunities.map((value, i) => <OpportunityDetails key={i} value={value} names={names} />)}
            <p><strong>Materiales:</strong> {row.materials.join(" · ")}</p><p><strong>Apoyos:</strong> {row.supports.join(" · ")}</p><p><strong>Flexibilidad:</strong> {row.flexibility}</p>
            <p><strong>Fechas previstas:</strong> {row.planned_start_date} al {row.planned_end_date}</p>
            {!!row.source_fact_keys.length && <div><h3 className="font-bold">Fuentes pertinentes</h3>{row.source_fact_keys.map((key) => <p key={key} className="mt-2">{snapshot?.facts.find((f) => f.key === key)?.support_text ?? key}</p>)}</div>}
          </div>
        </details>
      </article> : null)}</div>) : null;
  return <section className="ayni-workflow space-y-6 !max-w-none">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-extrabold text-[#172b52]">{preparing?job&&job.status!=="succeeded"?"Preparando Mi año":"Conversar con Ayni":"Mi año"}</h1>
      <p className="mt-2 text-[#526b87]">{preparing?"Ayni te acompaña a preparar una propuesta para tu aula.":"Conocemos al grupo y preparamos oportunidades para seguir aprendiendo."}</p></div>
      {selected && !preparing && <label className="text-sm font-semibold">Versión del año<select className="mt-1 block min-h-11 rounded-lg border bg-white px-3" disabled={disabled}
        value={selectedId} onChange={(e) => { if (!canLeaveWorkspace()) return; setSelectedId(e.target.value); setPreparing(false); setMessage(""); setScope(null); setInterpretationsReviewed(false);
          writeWorkspaceLocation("Planificar", { annualPlan: e.target.value }, true); }}>
        {[plans?.draft, plans?.active, ...(plans?.archived ?? [])].filter((p): p is Plan => !!p).map((p) => <option key={p.id} value={p.id}>V{p.version} · {p.status === "draft" ? "Borrador" : p.status === "active" ? "Vigente" : "Histórica"}</option>)}
      </select></label>}
    </header>
    {error && <WorkflowFeedback tone="error">{error}<Button className="mt-3" variant="outline" disabled={disabled} onClick={() => void run("reload", async () => { await reload(); await loadStart(); })}>Abrir lo guardado y actualizar resumen</Button></WorkflowFeedback>}
    {notice && <p role="status" className="text-sm font-semibold text-[#176442]">{notice}</p>}
    {busy === "apply" ? <GenerationProgress label="Ayni está aplicando tus indicaciones" description="Revisa las propuestas que necesitan cambios y conserva las demás." /> : null}
    {job && job.status !== "succeeded" && <AnnualPreparationProgress job={job} generating={generating} disabled={disabled} onContinue={()=>void continueSavedJob(job)} onRefresh={()=>void run("reload",async()=>{await reload(job.draft_id);await loadStart();setJob(null);})}/>}
    {preparing && !generating && (!job || job.status === "succeeded") && start && <>{process.env.NEXT_PUBLIC_AYNI_EXPERIENCE !== "0" && <ExperienceContextForm value={experienceInput} onChange={value=>{contextEdited.current=true;setContextDirty(true);setExperienceInput(value);}} curriculum={start.curriculum} today={start.today??new Date().toLocaleDateString("en-CA",{timeZone:"America/Lima"})} disabled={disabled}/>}<AnnualPlanningConversation observations={start.snapshot.facts.filter(f=>f.kind==="observed").length} families={start.snapshot.facts.filter(f=>f.kind==="family_report").length} unknown={start.snapshot.competency_information.filter(c=>c.recorded_performances===0).length} onIdeas={setIdeas} onDraft={setIdeaDraft} onGenerate={generate} onConversation={captureConversation} disabled={disabled}/></>}
    {!preparing && complete && selected && <>
      {!proposal.experience_context && <JourneySteps active={6}/>}{proposal.experience_context&&<section className="space-y-3 rounded-xl bg-[#edf7fa] p-4"><h2 className="font-bold">Tu inicio en Ayni · {proposal.experience_context.starts_on}</h2><p className="text-sm">El pasado sin registro permanece explícito. El primer proyecto se prepara para los días lectivos restantes.</p><details><summary className="min-h-11 cursor-pointer py-2 font-semibold">Contexto confirmado e historia declarada</summary><ul className="space-y-2">{proposal.experience_context.context_items.map((item,i)=><li key={i}>{item.text}</li>)}</ul><ul className="mt-4 space-y-2">{proposal.experience_context.historical_projects.map((item,i)=><li key={i}>{item.title} · {item.period?`Bimestre ${item.period}`:"Período no precisado"} · Historia declarada</li>)}</ul></details></section>}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold text-[#526b87]">{editable ? "Borrador guardado · revisa antes de confirmar" : selected.status === "active" ? "Año confirmado · previsión flexible" : "Versión histórica"}</p>
        {editable ? <AsyncButton busyLabel="Confirmando…" busy={busy === "confirm"} disabled={disabled || !!message.trim() || !!proposal.pending_changes?.length || proposal.editor_version===3 && !proposal.experience_context && (proposal.proposed_experiences.length!==15 || annualCoverage(proposal).some((c:{total:number;everyday:boolean})=>!c.total&&!c.everyday)) || !!proposal.evidence_interpretations?.length && !interpretationsReviewed} onClick={() => void mutate("confirm")}>Confirmar mi año</AsyncButton>
          : selected.status === "active" ? <Button disabled={disabled || !!plans?.draft} onClick={() => void mutate("copy")}>Revisar mi año con Ayni</Button> : null}
      </div>
      {editable && !!proposal.evidence_interpretations?.length && <div className="rounded-xl border border-[#d6e5ef] p-4"><p>Revisa las interpretaciones y sus actuaciones en «El año completo» antes de confirmar; pueden orientar los apoyos previstos.</p><label className="mt-3 flex min-h-11 items-center gap-3"><input type="checkbox" checked={interpretationsReviewed} onChange={(e) => setInterpretationsReviewed(e.target.checked)} />Revisé estas interpretaciones para esta versión del año.</label></div>}
      {editable && <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={disabled} onClick={()=>changeScope(null)}><MessageCircle className="size-4"/>Ajustar Mi año con Ayni{globalChanges.length ? " · "+globalChanges.length+" pendientes" : ""}</Button><Button variant="ghost" disabled={disabled} onClick={()=>void mutate("refresh")}>Actualizar con nuevas observaciones</Button>{proposal.editor_version!==3 && <Button variant="outline" disabled={disabled} onClick={()=>void mutate("upgrade")}>Organizar borrador en 15 tramos</Button>}</div>}
      {proposal.editor_version!==3 && <p className="rounded-lg bg-slate-100 p-3 text-sm text-[#3d5874]">Estás viendo una versión anterior de {proposal.proposed_experiences.length} propuestas, con sus fechas conservadas. Organizar un borrador compatible en 15 tramos activa Biblioteca, matriz curricular y arrastre; el contenido pedagógico se conserva. Si contiene trabajo protegido, usa un año QA separado.</p>}
      {proposal.editor_version===3 && !proposal.experience_context && proposal.proposed_experiences.length!==15 && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Hay {15-proposal.proposed_experiences.length} tramos vacíos. Coloca una propuesta en cada uno antes de confirmar.</p>}
      {proposal.editor_version===3 && annualCoverage(proposal).some((c:{total:number;everyday:boolean})=>!c.total&&!c.everyday) && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Hay competencias sin oportunidad anual ni cotidiana. Revisa la matriz antes de confirmar. {proposal.experience_context?"Al confirmar este año parcial aceptas las oportunidades futuras indicadas; no se presume qué se trabajó antes.":""}</p>}
      {editable && libraryChanges.length>0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-bold">Indicaciones de propuestas en Biblioteca</h3><p className="mt-1 text-sm">Puedes quitar estas indicaciones o volver a colocar la propuesta en el año para aplicarlas.</p><ul className="mt-3 space-y-3">{libraryChanges.map(change=><li key={change.id}><p className="font-semibold">{annualDisplayTitle(proposal.available_experiences?.find(row=>row.proposal_id===change.proposal_id)?.title ?? "Propuesta retirada")}</p><span>{change.text}</span><Button variant="ghost" disabled={disabled} onClick={()=>void mutate("remove-intent",{changeId:change.id})}>Quitar indicación</Button></li>)}</ul></section>}
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-[#172b52]">Tu año en el tiempo</h2>
        <div className="flex gap-2" role="group" aria-label="Vista de Mi año">
          <Button variant={annualView === "map" ? "default" : "outline"} aria-pressed={annualView === "map"} onClick={() => setAnnualView("map")}><MapIcon aria-hidden="true" className="size-4" />Mapa del año</Button>
          <Button variant={annualView === "list" ? "default" : "outline"} aria-pressed={annualView === "list"} onClick={() => setAnnualView("list")}><List aria-hidden="true" className="size-4" />Lista de propuestas</Button>
        </div>
      </div>
      {mapProjection.error && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{mapProjection.error}</p>}
      {!listOpen && calendarUnavailable && <p role="status" className="text-sm text-[#526b87]">No pudimos consultar los feriados. Vuelve a abrir Mi año para cargarlos; las fechas de tus propuestas siguen guardadas.</p>}
      {!listOpen && calendar && proposal.editor_version!==3 && <AnnualYearTimeline rows={mapProjection.rows} calendar={calendar} effectiveCalendar={effectiveCalendar}
        selectedId={selectedProposal?.proposal_id ?? null} onSelect={setSelectedProposalId} initialStage={proposal.resolved_calendar?.initial_stage} />}
      {proposal.editor_version===3 && calendar && !listOpen ? <AnnualSlotEditor plan={proposal as unknown as EditorPlan} planId={selected.id} revision={selected.revision} calendar={calendar} effectiveCalendar={effectiveCalendar} selectedId={selectedProposal?.proposal_id ?? null} onSelect={setSelectedProposalId} editable={!!editable} disabled={disabled} onAction={action=>void mutate("structure",{action})} onReload={reload}>{proposalDetails}</AnnualSlotEditor> : proposalDetails}
      <Sheet open={panelOpen} onOpenChange={value=>{if(!value&&disabled)return;if(!value&&message.trim()&&!window.confirm("Hay texto sin guardar. ¿Quieres cerrar el panel?"))return;setPanelOpen(value);}}><SheetContent className="w-full overflow-y-auto p-5 sm:max-w-xl"><SheetHeader><SheetTitle>{scope?"Cambiar propuesta con Ayni":"Ajustar Mi año con Ayni"}</SheetTitle><SheetDescription>{scope?"Cuéntame qué quisieras cambiar. Puedes pedir otro enfoque, tema, materiales, competencias u otra experiencia.":"Reúne cambios para todo tu año: temas, propuestas futuras u oportunidades curriculares. Las propuestas protegidas se conservan."}</SheetDescription></SheetHeader>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#edf7fa] p-3"><span className="w-16 shrink-0"><AyniMascot/></span><p className="text-sm leading-relaxed">{scope?"¿Qué enfoque quieres cambiar y qué deseas que hagan los niños? Agrega tus indicaciones; las revisaremos juntas antes de aplicar el cambio.":"Cuéntame qué quieres priorizar y qué condiciones debo considerar para ajustar tu año."}</p></div>
        {panelProposal && <p className="mt-3 font-semibold">{annualDisplayTitle(panelProposal.title)}{panelProposal.planned_start_date && panelProposal.planned_end_date?` · ${compactDate(panelProposal.planned_start_date)}–${compactDate(panelProposal.planned_end_date)}`:""}</p>}
        {scope && <button type="button" className="mt-2 min-h-11 text-sm text-[#087d96] underline underline-offset-4 disabled:opacity-50" disabled={disabled} onClick={()=>changeScope(null)}>← Ajustar todo Mi año</button>}
        {editable && <>
          <p className="mt-4 text-sm font-semibold">Ejemplos</p><div className="mt-2 flex flex-wrap gap-2">{(scope?["Quiero que tenga más movimiento","Quiero incluir a las familias","Prefiero otra idea para trabajar esta competencia"]:["Quiero más oportunidades en la naturaleza","Quiero ajustar varias propuestas futuras","Quiero revisar las oportunidades curriculares"]).map(example=><Button key={example} variant="outline" size="sm" disabled={disabled} onClick={()=>setMessage(example)}>{example}</Button>)}</div>
          <label htmlFor="annual-message" className="mt-4 block font-semibold">¿Qué quieres cambiar?</label><div className="relative mt-2"><Textarea id="annual-message" ref={messageRef} placeholder="Escribe o dicta tu indicación…" className="min-h-24 pr-16" value={message} disabled={disabled} maxLength={1600} onChange={(e) => setMessage(e.target.value)} /><div className="absolute top-2 right-2"><DictationRecorder iconOnly autoTranscribe classroomScope purpose="group_summary" rawTranscript context={scope?"Indicación docente para cambiar esta propuesta":"Indicación docente para cambiar el año"} currentText={message} onTranscribed={(text) => setMessage(text.slice(0, 1600))} onBusyChange={setAudioBusy} disabled={!!busy} /></div></div>
          <Button className="mt-3" variant="outline" disabled={disabled || !message.trim()} onClick={() => void mutate("intent", { text: message, proposalId: scope })}>Agregar cambio</Button>
          <div className="mt-6"><h3 className="font-bold">{scope?"Cambios para esta propuesta":"Cambios para Mi año"}</h3>{panelChanges.length?<ol className="mt-2 list-decimal space-y-3 pl-5">{panelChanges.map(c=><li key={c.id}><span className="whitespace-pre-wrap">{c.text}</span><Button variant="ghost" disabled={disabled} onClick={()=>void mutate("remove-intent",{changeId:c.id})}>Quitar</Button></li>)}</ol>:<p className="mt-2 text-sm text-[#526b87]">{scope?"Aún no has agregado cambios para esta propuesta.":"Aún no has agregado cambios para Mi año."}</p>}
          {panelChanges.length>0 && <AsyncButton busyLabel="Aplicando…" className="mt-3" busy={busy === "apply"} disabled={disabled || !!message.trim()} onClick={() => void mutate("apply",{proposalId:scope})}>Aplicar cambios</AsyncButton>}</div>
        </>}
        <details className="mt-5"><summary className="min-h-11 cursor-pointer py-2 font-semibold">{scope?"Por qué Ayni propuso esta experiencia":"Qué sabemos del aula para ajustar Mi año"}</summary>{scope&&panelProposal?<div className="space-y-3 text-sm"><p>{panelProposal.rationale}</p>{panelProposal.source_fact_keys.map(key=>{const fact=snapshot?.facts.find(f=>f.key===key);return fact?<p key={key}>{fact.support_text || "Registro conservado en su fuente privada."}</p>:null;})}</div>:snapshot?<Facts snapshot={snapshot}/>:null}</details>
      </SheetContent></Sheet>

      <details className="rounded-xl border bg-white p-5"><summary className="min-h-11 cursor-pointer font-semibold">El año completo: momentos cotidianos, acompañamiento y observación</summary>
        <div className="mt-4 space-y-5">{Object.entries(generalLabels).map(([key, label]) => <section key={key}><h3 className="font-bold">{label}</h3><ul className="mt-2 list-disc pl-5">{(key==="organization_criteria" && proposal.editor_version===3?annualCalendarCriteria(proposal):proposal[key as keyof typeof generalLabels])?.map((text:string, i:number) => <li key={i}>{text}</li>)}</ul></section>)}
          <h3 className="font-bold">Oportunidades en la jornada</h3>{proposal.everyday_opportunities?.map((value, i) => <section key={i}><h4 className="font-semibold">{value.moment}</h4><OpportunityDetails value={value} names={names} /></section>)}
          <h3 className="font-bold">Interpretaciones que revisarás al confirmar</h3><p className="text-sm">Son propuestas de interpretación de actuaciones concretas. No declaran una competencia lograda ni describen automáticamente a todo el grupo.</p>
          {!!proposal.insufficient_interpretations?.length && <p className="text-sm">En {proposal.insufficient_interpretations.length} posibles interpretaciones todavía faltaba sustento. Conservamos los registros sin concluir que exista un avance o una dificultad.</p>}
          {proposal.evidence_interpretations?.map((value, i) => <div key={i}><p>{value.interpretation} · {value.scope === "individual" ? "Individual" : "Subgrupo"}</p><p className="mt-1 text-sm text-[#526b87]">{value.meaning === "advance" ? "Posible avance" : value.meaning === "support_needed" ? "Posible necesidad de acompañamiento" : "Información ambigua"}</p>{value.fact_keys.map((key) => <p key={key} className="mt-1 text-sm">{snapshot?.facts.find((f) => f.key === key)?.support_text}</p>)}</div>)}
          {proposal.resolved_calendar && <section><h3 className="font-bold">{proposal.resolved_calendar.initial_stage.name}</h3><p>{proposal.resolved_calendar.initial_stage.purpose}</p><p>{proposal.resolved_calendar.initial_stage.suggested_experiences.join(" · ")}</p><p>{proposal.resolved_calendar.initial_stage.what_to_observe.join(" · ")}</p><p>{proposal.resolved_calendar.initial_stage.family_actions?.join(" · ")}</p><p>{proposal.resolved_calendar.initial_stage.diagnostic_focus?.join(" · ")}</p><p>{proposal.resolved_calendar.initial_stage.teacher_notes}</p><p>{proposal.resolved_calendar.initial_stage.starts_on} al {proposal.resolved_calendar.initial_stage.ends_on}</p>
            <p className="mt-3">Calendario comprobado: {proposal.resolved_calendar.integrity.assigned}/{proposal.resolved_calendar.integrity.eligible} fechas asignadas, sin huecos ni solapamientos.</p></section>}
        </div>
      </details>
      {!editable && <a className="inline-flex min-h-11 items-center rounded-lg bg-[#087d96] px-5 font-semibold text-white" href={`${localDatabaseApiUrl}/api/documents/annual_plan/${selected.id}/download`}>Descargar mi año en Word</a>}
    </>}
    {!preparing && selected && !modern && <div className="space-y-3"><p>Esta versión utiliza el recorrido anterior. Sus datos y documentos se conservan.</p><Button onClick={onLegacy}>Abrir versión anterior</Button>
      {!plans?.draft && <Button variant="outline" disabled={disabled} onClick={() => { setPreparing(true); setIdeas(""); }}>Preparar una nueva versión con Ayni</Button>}</div>}
    <footer className="flex flex-wrap gap-3 text-sm"><Button variant="ghost" disabled={disabled} onClick={onGoDiagnostic}>Familias y observar</Button>
      {editable && complete && <Button variant="ghost" disabled={disabled} onClick={() => { setPreparing(true); setIdeas(proposal.teacher_preferences ?? ""); }}>Volver a preparar el borrador</Button>}
      {preparing && complete && <Button variant="ghost" disabled={disabled} onClick={() => setPreparing(false)}>Volver a las propuestas guardadas</Button>}
    </footer>
  </section>;
}
