"use client";
import {ProjectReadingView} from "./project-reading-view";
import { newAyniFeatureEnabled } from "@/src/lib/new-ayni-feature-flag.mjs";

import {displayDocumentDate} from "@/src/lib/display-date";
import { apiFetch } from "@/src/lib/ayni-api-fetch";

import { useEffect, useMemo, useState } from "react";
import {useWorkspaceParam,writeWorkspaceLocation} from "@/src/lib/workspace-location";
import { ArrowLeft, BookOpen, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { AnnualPlanDocument, type DocumentContext, type Proposal } from "./annual-plan-generator";
import { LoadingState, PageIntro, WorkflowFeedback } from "./workflow-ui";
import { DocumentTree, type ArtifactState } from "./document-tree";
import {ActivityReadingView} from "./activity-reading-view";
import {AnnualProjectPreview} from "./annual-project-preview";
import type {ChangeProposal} from "./annual-proposal-change-dialog";
import { DocumentSyncPanel } from "./document-sync-panel";

import {familyReportSectionForReader} from "@/src/lib/family-report-presentation.mjs";
import {diagnosticReportReadings,diagnosticReportPurpose} from '@/src/lib/diagnostic-report-reading.mjs';

type DocumentKind = "annual_plan" | "diagnostic_summary" | "experience" | "activity" | "family_report" | "period_closure";
type DocumentEntry = {
  id: string; kind: DocumentKind; subtype?: "project" | "unit"; title: string;
  status: string; version?: number; school_year: number; classroom: string; classroom_id?:string;
  parent_experience_id?:string; date: string; period_label?: string | null;
};
export type OpenDocument = DocumentEntry & {
  institution_name?: string; document_context?: DocumentContext; content: Record<string, unknown>;
  source_plan_format?: string; formal_ready?: boolean;
  actual_execution_date?:string|null;
  experience_ends_on?:string;
  guide?: {criteria: import('@/src/lib/local-database').ActivityCriterion[];pedagogical_blocks: import('./pedagogical-block').PedagogicalBlockData[]};
  starts_on?: string; ends_on?: string; occurs_on?: string; experience_title?: string;
  period_start?: string; period_end?: string; competencies?: { id: string; name: string }[];
  active_criterion?: { criterion_text: string; competency_v4_id: string;expected_evidence?:string|null } | null;
  project_activities?: {id:string;title:string;date:string}[];
  registered_evidence?:{id:string;student_name:string;observation_text?:string;observed_at:string}[];
  workshop?: { id: string; content: Record<string, unknown> } | null;
};
type Artifact = { template_version?:string;id: string; source_kind: string; source_id: string; filename: string;
  sha256: string; byte_length: number; version: number;source_version:number;
  school_year:number;classroom:string;classroom_id:string };

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const sameVisibleText = (a: unknown, b: unknown) => {
  const normalize = (value: unknown) => text(value).toLocaleLowerCase("es-PE").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
  const left = normalize(a), right = normalize(b);
  return Boolean(left && right && (left === right || (Math.min(left.length, right.length) / Math.max(left.length, right.length) > 0.9 && (left.includes(right) || right.includes(left)))));
};
const items = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
const labelFor = (entry: DocumentEntry) => entry.kind === "annual_plan" ? "Plan anual" :
  entry.kind === "diagnostic_summary" ? "Diagnóstico del aula" : entry.kind === "experience" ?
    entry.subtype === "project" ? "Proyecto" : "Unidad" : entry.kind === "activity" ? "Actividad" :
    entry.kind === "period_closure" ? "Cierre del período" : "Informe a la familia";
const statusFor = (status: string) => status === "active" || status === "confirmed" ? "Confirmado" :
  status === "archived" ? "Versión anterior" : "Borrador";
const dateFor=displayDocumentDate;

function Section({ title, value }: { title: string; value: unknown }) {
  const list = items(value);
  const paragraph = text(value);
  if (!list.length && !paragraph) return null;
  return <section className="border-t border-[#e1eaf2] pt-5">
    <h3 className="text-lg font-bold text-[#173352]">{title}</h3>
    {list.length ? <ul className="mt-2 list-disc space-y-2 pl-6 leading-relaxed marker:text-[#087d96]">{list.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> :
      <p className="mt-2 whitespace-pre-line leading-relaxed text-[#294b64]">{paragraph}</p>}
  </section>;
}

function CompetencySection({ title, value, names }: { title: string; value: unknown; names: Map<string, string> }) {
  return <Section title={title} value={items(value).map((id) => names.get(id) ?? id)} />;
}

function Pathways({ title, value }: { title: string; value: unknown }) {
  if (!Array.isArray(value) || !value.length) return null;
  return <section className="border-t border-[#e1eaf2] pt-5"><h3 className="text-lg font-bold text-[#173352]">{title}</h3>
    <ol className="mt-3 space-y-3">{value.map((raw, index) => {
      const path = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
      return <li key={index} className="rounded-xl bg-[#f3f8fb] p-4"><h4 className="font-bold">{text(path.title) || `Propuesta ${index + 1}`}</h4>
        {text(path.pedagogical_intention) && <p className="mt-1">{text(path.pedagogical_intention)}</p>}
        {text(path.possible_child_actions) && !sameVisibleText(path.possible_child_actions, path.pedagogical_intention) && <p className="mt-2 text-sm text-[#294b64]"><b>Qué podrían hacer los niños:</b> {text(path.possible_child_actions)}</p>}
      </li>;
    })}</ol>
  </section>;
}

export function DocumentContent({ document }: { document: OpenDocument }) {
  if(document.kind==='activity')return <ActivityReadingView document={document} actions={null}/>;
  if(document.kind==='annual_plan'&&document.content.journey_version===2){
    const slots=((document.content.resolved_calendar as {projects?:{proposal_id?:string}[]}|undefined)?.projects??[]);
    const rows=(document.content.proposed_experiences??[]) as ChangeProposal[],curriculum=(document.content.curriculum_reference??[]) as {id:string;name:string}[];
    return <article className="space-y-4" aria-label="Plan anual guardado"><h2 className="text-2xl font-bold text-[#172b52]">Mi año · versión {document.version}</h2><p className="text-sm text-[#526b87]">{statusFor(document.status)} · {rows.length} proyectos · {document.school_year}</p>{rows.map((row,index)=><AnnualProjectPreview key={row.proposal_id} row={row} index={slots.findIndex(slot=>slot.proposal_id===row.proposal_id)>=0?slots.findIndex(slot=>slot.proposal_id===row.proposal_id)+1:index+1} names={new Map(curriculum.map(card=>[card.id,card.name]))} canChange={false} disabled onChange={()=>{}}/>)}</article>;
  }
  if (document.kind === "annual_plan" && document.source_plan_format === "annual_preplan_v1" && !document.formal_ready) {
    const rows = Array.isArray(document.content.proposed_experiences) ? document.content.proposed_experiences as Record<string, unknown>[] : [];
    return <article className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Mi año · versión {document.version}</h2>
      <p className="mt-2 text-sm text-[#526b87]">{document.status === "draft" ? "Preplan en revisión. El Word se preparará después de confirmarlo." : "El preplan está confirmado. Abre Planificar para preparar el Word formal."}</p>
      <ol className="mt-4 space-y-3">{rows.map((row, index) => <li key={String(row.proposal_id ?? index)} className="rounded-xl border p-3"><b>{index + 1}. {text(row.title)}</b>
        <p className="mt-1 text-sm">{text(row.period)} · {String(row.duration_weeks ?? "")} semanas</p><p className="mt-1">{text(row.rationale)}</p></li>)}</ol></article>;
  }
  if (document.kind === "annual_plan") return <AnnualPlanDocument proposal={document.content as Proposal} context={document.document_context ?? {}} competencies={document.competencies ?? []} status={document.status as "draft" | "active" | "archived"} />;
  if(document.kind==='experience'&&document.content.project_master)return <ProjectReadingView document={document}/>;
  if (document.kind === "period_closure") {
    const entries=Array.isArray(document.content.entries)?document.content.entries as Record<string,unknown>[]:[];
    const names=new Map((document.competencies??[]).map((card)=>[card.id,card.name]));
    return <article className="rounded-3xl border bg-white p-5 sm:p-8"><p className="text-xs font-bold uppercase tracking-wide text-[#087d96]">Proyección provisional · cierre V{document.version}</p><h2 className="mt-2 text-2xl font-extrabold">{document.title}</h2><p className="mt-2 text-sm text-[#526b87]">{document.classroom} · {document.school_year} · {dateFor(document.period_start??"")} a {dateFor(document.period_end??"")}</p><p className="mt-4 rounded-xl bg-[#eaf7fb] p-3 text-sm">Puedes descargar el registro del cierre confirmado. Esta exportación conserva sus datos y no se presenta como una plantilla oficial adicional.</p><div className="mt-5 space-y-3">{entries.map((entry,index)=>{const assessment=(entry.assessment_details??{}) as Record<string,unknown>,conclusion=(entry.conclusion_details??{}) as Record<string,unknown>,evidence=Array.isArray(entry.evidence)?entry.evidence:[];return <section key={`${entry.assessment_id??index}`} className="rounded-xl border p-4"><h3 className="font-bold">{text(entry.student_name)} · {names.get(text(entry.competency_id))??text(entry.competency_id)}</h3><p className="mt-1 text-sm">Nivel confirmado por la docente: <b>{text(entry.achievement_level)}</b> · {evidence.length} registros</p>{text(assessment.evidence_overview)&&<p className="mt-2 text-sm">{text(assessment.evidence_overview)}</p>}{text(conclusion.conclusion_text)&&<p className="mt-2 text-sm"><b>Conclusión:</b> {text(conclusion.conclusion_text)}</p>}</section>;})}</div></article>;
  }
  const content = document.content;
  const names = new Map((document.competencies ?? []).map((card) => [card.id, card.name]));
  return <article aria-label={labelFor(document)} className="overflow-hidden rounded-[1.5rem] border border-[var(--ayni-panel-border)] bg-white shadow-[var(--ayni-panel-shadow)]">
    <header className="bg-gradient-to-r from-[#e8f6fa] to-[#f5f9fd] p-5 sm:p-8">
      <div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-extrabold uppercase tracking-wider text-[#087d96]">{labelFor(document)}{document.kind === "experience" && document.version ? ` · Versión ${document.version}` : ""}</p><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">{statusFor(document.status)}</span></div>
      <h2 className="mt-3 text-2xl font-extrabold leading-tight text-[#172b52]">{document.title}</h2>
      <p className="mt-2 text-sm text-[#526b87]">{[document.institution_name, document.classroom, document.school_year].filter(Boolean).join(" · ")}</p>
      {(document.starts_on || document.occurs_on || document.period_start) && <p className="mt-1 text-sm text-[#526b87]">{document.occurs_on ? dateFor(document.occurs_on) : document.period_start ? `${dateFor(document.period_start)} – ${dateFor(document.period_end ?? "")}` : `${dateFor(document.starts_on ?? "")} – ${dateFor(document.ends_on ?? "")}`}</p>}
    </header>
    <div className="space-y-5 p-5 sm:p-8">
      {document.kind === "diagnostic_summary" && <>
        <p className="text-sm text-[#526b87]">{diagnosticReportPurpose}</p>
        <Section title="Fortalezas del grupo" value={content.strengths} /><Section title="Dónde acompañar más" value={content.needs} />
        <Section title="Qué tendremos en cuenta al planificar" value={content.planning_priorities} />
        {diagnosticReportReadings(document).map(reading=><section key={reading.competency_id} className="space-y-3 rounded-xl border border-[var(--ayni-panel-border)] p-4"><h3 className="font-bold">{names.get(reading.competency_id)??reading.competency_id}</h3><Section title="Qué nos muestran los registros" value={reading.summary}/><Section title="Qué haremos después" value={reading.next_step}/></section>)}
      </>}
      {document.kind === "experience" && <>
        <Section title="Para qué la haremos" value={content.purpose} /><Section title="Nuestro punto de partida" value={content.starting_point} />
        {!sameVisibleText(content.starting_point, document.subtype === "project" ? content.trigger_or_interest : content.learning_need_or_context) && <Section title={document.subtype === "project" ? "Qué despertó el interés" : "Qué necesita el grupo"} value={document.subtype === "project" ? content.trigger_or_interest : content.learning_need_or_context} />}
        <CompetencySection title="Competencias principales" value={content.primary_competency_ids} names={names} />
        <CompetencySection title="Otras competencias posibles" value={content.possible_secondary_competency_ids} names={names} />
        <Pathways title={document.subtype === "project" ? "Posibles caminos" : "Situaciones propuestas"} value={document.subtype === "project" ? content.possible_pathways : content.proposed_situations} />
        <Section title="Espacios y materiales" value={content.spaces_and_materials} /><Section title="Qué podríamos observar" value={content.evidence_opportunities} />
        <Section title="Familias y comunidad" value={content.family_or_community_links} /><Section title="Cuándo ajustar" value={content.adjustment_points} /><Section title="Cómo adaptarla" value={content.flexibility_notes} />
      </>}
      {document.kind === "family_report" && <>
        <p className="rounded-xl bg-[#eaf7fb] p-3 text-sm">{document.period_label || "Informe histórico sin período formal"}</p>
        <Section title="Para la familia" value={content.introduction} />
        {Array.isArray(content.sections) && content.sections.map((raw, index) => {
          const section = familyReportSectionForReader(raw && typeof raw === "object" ? raw as Record<string, unknown> : {});
          return <section key={index} className="rounded-xl border border-[#dce8f0] p-4 sm:p-5"><h3 className="font-bold text-[#173352]">{names.get(text(section.competency_id)) ?? "Aprendizajes observados"}</h3>
            <p className="mt-2 leading-relaxed">{text(section.progress_summary)}</p>
            <Section title="Ejemplos observados" value={section.examples} /><Section title="Apoyos en el aula" value={section.support_or_conditions} />
            <Section title="Qué seguiremos trabajando" value={section.next_steps} /><Section title="En casa" value={section.family_suggestions} />
            <Section title="Información por completar" value={section.insufficiency_note} />
          </section>;
        })}
        <Section title="Para seguir acompañando" value={content.closing_note} />
      </>}
    </div>
  </article>;
}

export type DocumentFolder = "diagnostic"|"annual"|"experiences"|"evaluation";
const folderKinds:Record<DocumentFolder,DocumentKind[]>={diagnostic:["diagnostic_summary"],annual:["annual_plan"],experiences:["experience","activity"],evaluation:["family_report","period_closure"]};
const documentParam=(value:string)=>/^(annual_plan|diagnostic_summary|experience|activity|family_report|period_closure):[0-9a-f-]{36}$/i.test(value)?value:undefined;
export function DocumentsScreen({ onPlan, folder }: { onPlan?: () => void;folder?:DocumentFolder } = {}) {
  const [authMode, setAuthMode] = useState<"local" | "supabase">("local");
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [documentKey,setDocumentKey]=useWorkspaceParam("Documentos","document","",documentParam);
  const selected=useMemo(()=>documentKey?{kind:documentKey.split(':')[0] as DocumentKind,id:documentKey.split(':')[1]}:null,[documentKey]);
  const setSelected=(value:{kind:DocumentKind;id:string}|null)=>setDocumentKey(value?`${value.kind}:${value.id}`:'');
  const [opened, setOpened] = useState<OpenDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [savingWord, setSavingWord] = useState(false);
  const [wordMessage, setWordMessage] = useState("");
  const [wordError, setWordError] = useState("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [artifactStates,setArtifactStates] = useState<ArtifactState[]>([]);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const artifactFeature = process.env.NEXT_PUBLIC_AYNI_EXPERIENCE !== "0" || newAyniFeatureEnabled(process.env.NEXT_PUBLIC_AYNI_F10_ARTIFACTS);
  const syncFeature = artifactFeature && newAyniFeatureEnabled(process.env.NEXT_PUBLIC_AYNI_F11_DOCUMENTS);

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch(`${localDatabaseApiUrl}/api/auth/config`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ mode: "local" | "supabase" }> : null)
      .then((config) => { if (!controller.signal.aborted && config?.mode) setAuthMode(config.mode); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`${localDatabaseApiUrl}/api/documents`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("No pudimos cargar tus documentos.");
      return response.json() as Promise<{ documents: DocumentEntry[] }>;
    }).then((result) => { if(!controller.signal.aborted){setDocuments(folder?result.documents.filter(row=>folderKinds[folder].includes(row.kind)):result.documents); setError("");} })
      .catch(() => { if (!controller.signal.aborted) setError("No pudimos cargar tus documentos. Inténtalo otra vez."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision,folder]);

  useEffect(() => {
    if (!artifactFeature) return;
    const controller = new AbortController();
    void apiFetch(`${localDatabaseApiUrl}/api/documents/artifacts`, { signal:controller.signal,cache:"no-store" })
      .then(async response => response.ok ? response.json() as Promise<{artifacts:Artifact[]}> : {artifacts:[]})
      .then(result => { if (!controller.signal.aborted) setArtifacts(result.artifacts); })
      .catch(() => {});
    return () => controller.abort();
  }, [artifactFeature,revision]);

  useEffect(() => {
    if(!syncFeature)return;
    const controller=new AbortController();
    void apiFetch(`${localDatabaseApiUrl}/api/documents/artifacts/states`,{signal:controller.signal,cache:"no-store"})
      .then(async response=>response.ok?response.json() as Promise<{states:ArtifactState[]}>:{states:[]})
      .then(result=>{if(!controller.signal.aborted)setArtifactStates(result.states);}).catch(()=>{});
    return()=>controller.abort();
  },[syncFeature,revision,artifacts]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    apiFetch(`${localDatabaseApiUrl}/api/documents/${selected.kind}/${selected.id}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("No pudimos abrir este documento.");
      return response.json() as Promise<{ document: OpenDocument }>;
    }).then((result) => { if(!controller.signal.aborted){setOpened(result.document); setError("");} })
      .catch(() => { if (!controller.signal.aborted) setError("No pudimos abrir este documento. Inténtalo otra vez."); })
      .finally(() => { if (!controller.signal.aborted) setOpening(false); });
    return () => controller.abort();
  }, [selected, revision]);

  const years = [...new Set(documents.map((item) => item.school_year))].sort((a, b) => b - a);
  const needsProjectWord = opened?.kind === "experience" && opened.content.document_template_version === "experience-unified-v2" && !opened.formal_ready;
  const downloadable = opened && !needsProjectWord && !(opened.source_plan_format === "annual_preplan_v1" && !opened.formal_ready);
  const downloadUrl = downloadable
    ? `${localDatabaseApiUrl}/api/documents/${opened.kind}/${opened.id}/download`
    : null;
  const stableArtifact = opened && ["annual_plan","experience"].includes(opened.kind) && artifacts.find(item => item.source_kind === opened.kind &&
    item.source_id === opened.id && item.source_version === opened.version && (opened.kind!=="experience"||item.template_version===`${opened.content.document_template_version??"experience-legacy-v1"}-layout3`));
  async function prepareProjectWord() {
    if (!opened || savingWord) return;
    setSavingWord(true); setWordError(""); setWordMessage("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/project-flow/${opened.id}/formalize`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo preparar el Word.");
      const refreshed = await apiFetch(`${localDatabaseApiUrl}/api/documents/experience/${opened.id}`, { cache: "no-store" });
      const body = await refreshed.json() as { document?: OpenDocument; error?: string };
      if (!refreshed.ok || !body.document?.formal_ready) throw new Error(body.error ?? "El Word aún no está listo. Inténtalo de nuevo.");
      setOpened(body.document); setWordMessage("Word preparado. Ya puedes guardarlo en Descargas.");
    } catch (cause) { setWordError(cause instanceof Error ? cause.message : "No se pudo preparar el Word."); }
    finally { setSavingWord(false); }
  }
  async function prepareArtifact(download=false) {
    if (!opened || savingWord) return;
    setSavingWord(true); setWordError(""); setWordMessage("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/documents/artifacts/prepare`, {
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({kind:opened.kind,sourceId:opened.id}) });
      const body = await response.json() as {artifact?:Artifact;error?:string};
      if (!response.ok || !body.artifact) throw new Error(body.error ?? "No se pudo preparar la versión estable.");
      setArtifacts(current => [...current.filter(item => item.id !== body.artifact!.id),body.artifact!]);
      if(download)await downloadStableArtifact(body.artifact);else setWordMessage("Versión estable preparada. Puedes descargar el mismo archivo cuando lo necesites.");
    } catch (cause) { setWordError(cause instanceof Error ? cause.message : "No se pudo preparar la versión estable."); }
    finally { setSavingWord(false); }
  }
  async function downloadStableArtifact(artifact:Artifact) {
    setSavingWord(true);setWordError("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/documents/artifacts/${artifact.id}/download`,{cache:"no-store"});
      if (!response.ok) throw new Error("No se pudo descargar la versión estable.");
      const blob = await response.blob(), url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href=url;link.download=artifact.filename;document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60000);
      setWordMessage(`Versión estable descargada: ${artifact.filename}`);
    } catch (cause) { setWordError(cause instanceof Error ? cause.message : "No se pudo descargar la versión estable."); }
    finally { setSavingWord(false); }
  }
  async function saveWordLocally() {
    if (!opened || savingWord) return;
    setSavingWord(true); setWordMessage(""); setWordError("");
    try {
      if (authMode === "supabase" || process.env.NEXT_PUBLIC_AYNI_EXPERIENCE !== "0") {
        const response = await apiFetch(`${localDatabaseApiUrl}/api/documents/${opened.kind}/${opened.id}/download`);
        if (!response.ok) throw new Error("No se pudo descargar el Word.");
        const blob = await response.blob();
        const filename = response.headers.get("content-disposition")?.match(/filename="([^"\\/]+)"/)?.[1]
          ?? `documento-${opened.id}.docx`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        setWordMessage(`Word descargado: ${filename}`);
        return;
      }
      const response = await apiFetch(`${localDatabaseApiUrl}/api/documents/${opened.kind}/${opened.id}/save-local`, { method: "POST" });
      const result = await response.json() as { filename?: string; alreadyExists?: boolean; error?: string };
      if (!response.ok || !result.filename) throw new Error(result.error || "No se pudo guardar el Word.");
      setWordMessage(`${result.alreadyExists ? "El Word ya estaba guardado" : "Word guardado"} en Descargas: ${result.filename}`);
    } catch (error) { setWordError(error instanceof Error ? error.message : "No se pudo guardar el Word."); }
    finally { setSavingWord(false); }
  }
  return <section className="mx-auto max-w-5xl space-y-5">
    <PageIntro title={folder?{diagnostic:"Evaluación diagnóstica",annual:"Plan anual",experiences:"Proyectos y actividades",evaluation:"Evaluación"}[folder]:"Documentos"} description={folder?"Consulta y descarga los documentos de esta carpeta, con su fuente y versión.":"Encuentra aquí tus diagnósticos, planes, experiencias, actividades, cierres e informes."} icon={BookOpen} illustration="/project-illustrations/book.webp" />
    {selected && <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" className="min-h-11" onClick={() => { setSelected(null); setOpened(null); setError(""); setWordMessage(""); setWordError(""); }}><ArrowLeft className="mr-2 size-4" />Volver a mis documentos</Button>
      <div className="flex flex-wrap gap-2">{opened?.kind==='annual_plan'&&opened.content.journey_version===2&&onPlan&&<Button variant="outline" disabled={savingWord} onClick={()=>{onPlan();writeWorkspaceLocation('Planificar',{tab:'annual',annualTools:'year',annualPlan:opened.id});}}>Ver Mi año</Button>}{needsProjectWord && opened.status === "active" && <Button className="min-h-11" disabled={savingWord} onClick={() => void prepareProjectWord()}>{savingWord ? "Preparando Word..." : "Preparar Word del proyecto"}</Button>}{artifactFeature && opened && opened.kind!=="annual_plan" && ["experience"].includes(opened.kind) && ["active","archived"].includes(opened.status) && downloadable &&
        (stableArtifact ? <Button className="min-h-11" disabled={savingWord} onClick={() => void downloadStableArtifact(stableArtifact)}><Download className="mr-2 size-4" />Descargar versión estable</Button>
          : <Button className="min-h-11" disabled={savingWord} onClick={() => void prepareArtifact()}>{savingWord ? "Preparando..." : "Preparar versión estable"}</Button>)}
      {downloadable && opened.kind==="annual_plan" && <Button className="min-h-11" disabled={savingWord} onClick={()=>void (artifactFeature?prepareArtifact(true):saveWordLocally())}><Download className="mr-2 size-4"/>{savingWord?"Preparando Word...":"Descargar Word"}</Button>}
      {downloadable && opened.kind!=="annual_plan" && !stableArtifact && <Button variant={artifactFeature && ["annual_plan","experience"].includes(opened.kind) ? "outline" : "default"} className="min-h-11" disabled={savingWord} onClick={() => void saveWordLocally()}><Download className="mr-2 size-4" />{savingWord ? "Preparando Word..." : authMode === "supabase" || process.env.NEXT_PUBLIC_AYNI_EXPERIENCE !== "0" ? "Descargar Word" : "Guardar Word en Descargas"}</Button>}</div></div>}
    {wordMessage && <WorkflowFeedback tone="success">{wordMessage}</WorkflowFeedback>}
    {wordError && <WorkflowFeedback tone="error">{wordError}</WorkflowFeedback>}
    {needsProjectWord && <p className="rounded-xl bg-[#eaf7fb] p-4 text-sm">El proyecto está confirmado. Prepara su Word antes de guardarlo en Descargas.</p>}
    {opened?.kind === "annual_plan" && opened.content.journey_version !== 2 && opened.source_plan_format !== "annual_preplan_v1" && opened.content.plan_format !== "twelve_projects_flexible_weeks" &&
      <WorkflowFeedback tone="error">Este plan se creó antes del formato actual. Su Word conserva la plantilla anterior. Abre Plan para preparar una versión actualizada; el plan vigente seguirá guardado mientras la revisas.</WorkflowFeedback>}
    {opened && downloadUrl && authMode === "local" && process.env.NEXT_PUBLIC_AYNI_EXPERIENCE === "0" && !stableArtifact && <details className="text-sm text-[#526b87]"><summary className="min-h-11 cursor-pointer py-2 font-semibold">Opciones de descarga</summary><p>«Guardar Word en Descargas» lo guarda en el equipo que ejecuta Ayni. Si estás usando otro dispositivo, <a className="underline" href={downloadUrl} download>descarga el Word en este dispositivo</a>.</p></details>}
    {!selected && syncFeature && <details><summary className="min-h-11 cursor-pointer font-semibold text-[#07576c]">Versiones y sincronización de documentos</summary><DocumentSyncPanel artifacts={artifacts} /></details>}
    {error && <div className="flex flex-wrap items-center gap-3"><WorkflowFeedback tone="error">{error}</WorkflowFeedback><Button variant="outline" onClick={() => { setLoading(!selected); setOpening(Boolean(selected)); setRevision((value) => value + 1); }}>Reintentar</Button></div>}
    {selected ? opening || !opened && !error ? <LoadingState label="Abriendo documento..." /> : opened ? <DocumentContent document={opened} /> : null :
      loading ? <LoadingState label="Buscando tus documentos..." /> : error ? null : documents.length === 0 ?
        <div className="rounded-2xl border border-[var(--ayni-panel-border)] bg-white p-6"><FileText className="size-8 text-[#087d96]" /><h2 className="mt-3 text-lg font-bold">Aún no hay documentos guardados</h2><p className="mt-1 text-[#526b87]">Cuando guardes tu diagnóstico, plan anual o una actividad, aparecerán aquí.</p>{onPlan && <Button className="mt-3" onClick={onPlan}>Ir a Mi año</Button>}</div> :
        artifactFeature ? <DocumentTree documents={documents} artifactStates={artifactStates}
          onOpen={item=>{setOpened(null);setError("");setWordMessage("");setWordError("");setOpening(true);setSelected({kind:item.kind as DocumentKind,id:item.id});}} /> :
        years.map((year) => <section key={year} aria-label={`Documentos ${year}`} className="space-y-3"><h2 className="text-lg font-extrabold text-[#172b52]">Año escolar {year}</h2>
          <ul className="space-y-2">{documents.filter((item) => item.school_year === year).map((item) => <li key={`${item.kind}-${item.id}`} className="rounded-2xl border border-[var(--ayni-panel-border)] bg-white p-4 shadow-[var(--ayni-panel-shadow)] sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-[#087d96]">{labelFor(item)} · {statusFor(item.status)}</p><h3 className="mt-1 break-words text-lg font-bold text-[#172b52]">{item.title}</h3><p className="mt-1 text-sm text-[#526b87]">{item.classroom}{item.period_label ? ` · ${item.period_label}` : item.kind === "family_report" ? " · Informe histórico sin período formal" : ""}{item.date ? ` · ${dateFor(item.date)}` : ""}{item.version && item.version > 1 ? ` · Versión ${item.version}` : ""}</p></div>
            <Button variant="outline" className="mt-3 min-h-11 shrink-0 sm:mt-0" onClick={() => { setOpened(null); setError(""); setWordMessage(""); setWordError(""); setOpening(true); setSelected({ kind: item.kind, id: item.id }); }}>Abrir documento</Button>
          </li>)}</ul>
        </section>)}
  </section>;
}
