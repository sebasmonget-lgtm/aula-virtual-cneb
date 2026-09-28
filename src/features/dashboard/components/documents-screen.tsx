"use client";
import { apiFetch } from "@/src/lib/ayni-api-fetch";

import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { AnnualPlanDocument, type DocumentContext, type Proposal } from "./annual-plan-generator";
import { LoadingState, PageIntro, WorkflowFeedback } from "./workflow-ui";

type DocumentKind = "annual_plan" | "diagnostic_summary" | "experience" | "activity" | "family_report" | "period_closure";
type DocumentEntry = {
  id: string; kind: DocumentKind; subtype?: "project" | "unit"; title: string;
  status: string; version?: number; school_year: number; classroom: string; date: string; period_label?: string | null;
};
type OpenDocument = DocumentEntry & {
  institution_name?: string; document_context?: DocumentContext; content: Record<string, unknown>;
  source_plan_format?: string; formal_ready?: boolean;
  starts_on?: string; ends_on?: string; occurs_on?: string; experience_title?: string;
  period_start?: string; period_end?: string; competencies?: { id: string; name: string }[];
};
type Artifact = { id: string; source_kind: string; source_id: string; filename: string;
  sha256: string; byte_length: number; version: number };

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const items = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
const labelFor = (entry: DocumentEntry) => entry.kind === "annual_plan" ? "Plan anual" :
  entry.kind === "diagnostic_summary" ? "Diagnóstico del aula" : entry.kind === "experience" ?
    entry.subtype === "project" ? "Proyecto" : "Unidad" : entry.kind === "activity" ? "Actividad" :
    entry.kind === "period_closure" ? "Cierre del período" : "Informe a la familia";
const statusFor = (status: string) => status === "active" || status === "confirmed" ? "Confirmado" :
  status === "archived" ? "Versión anterior" : "Borrador";
const dateFor = (value: string) => {
  const date = new Date(value.slice(0, 10) + "T12:00:00");
  return Number.isNaN(date.valueOf()) ? "" : new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric" }).format(date);
};

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
        {text(path.possible_child_actions) && <p className="mt-2 text-sm text-[#294b64]"><b>Qué podrían hacer los niños:</b> {text(path.possible_child_actions)}</p>}
      </li>;
    })}</ol>
  </section>;
}

function DocumentContent({ document }: { document: OpenDocument }) {
  if (document.kind === "annual_plan" && document.source_plan_format === "annual_preplan_v1" && !document.formal_ready) {
    const rows = Array.isArray(document.content.proposed_experiences) ? document.content.proposed_experiences as Record<string, unknown>[] : [];
    return <article className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Mi año · versión {document.version}</h2>
      <p className="mt-2 text-sm text-[#526b87]">{document.status === "draft" ? "Preplan en revisión. El Word se preparará después de confirmarlo." : "El preplan está confirmado. Abre Planificar para preparar el Word formal."}</p>
      <ol className="mt-4 space-y-3">{rows.map((row, index) => <li key={String(row.proposal_id ?? index)} className="rounded-xl border p-3"><b>{index + 1}. {text(row.title)}</b>
        <p className="mt-1 text-sm">{text(row.period)} · {String(row.duration_weeks ?? "")} semanas</p><p className="mt-1">{text(row.rationale)}</p></li>)}</ol></article>;
  }
  if (document.kind === "annual_plan") return <AnnualPlanDocument proposal={document.content as Proposal} context={document.document_context ?? {}} competencies={document.competencies ?? []} status={document.status as "draft" | "active" | "archived"} />;
  if (document.kind === "period_closure") {
    const entries=Array.isArray(document.content.entries)?document.content.entries as Record<string,unknown>[]:[];
    const names=new Map((document.competencies??[]).map((card)=>[card.id,card.name]));
    return <article className="rounded-3xl border bg-white p-5 sm:p-8"><p className="text-xs font-bold uppercase tracking-wide text-[#087d96]">Proyección provisional · cierre V{document.version}</p><h2 className="mt-2 text-2xl font-extrabold">{document.title}</h2><p className="mt-2 text-sm text-[#526b87]">{document.classroom} · {document.school_year} · {dateFor(document.period_start??"")} a {dateFor(document.period_end??"")}</p><p className="mt-4 rounded-xl bg-[#eaf7fb] p-3 text-sm">Esta vista conserva los datos del cierre. El Word final se preparará cuando esté disponible su plantilla.</p><div className="mt-5 space-y-3">{entries.map((entry,index)=>{const assessment=(entry.assessment_details??{}) as Record<string,unknown>,conclusion=(entry.conclusion_details??{}) as Record<string,unknown>,evidence=Array.isArray(entry.evidence)?entry.evidence:[];return <section key={`${entry.assessment_id??index}`} className="rounded-xl border p-4"><h3 className="font-bold">{text(entry.student_name)} · {names.get(text(entry.competency_id))??text(entry.competency_id)}</h3><p className="mt-1 text-sm">Nivel confirmado por la docente: <b>{text(entry.achievement_level)}</b> · {evidence.length} registros</p>{text(assessment.evidence_overview)&&<p className="mt-2 text-sm">{text(assessment.evidence_overview)}</p>}{text(conclusion.conclusion_text)&&<p className="mt-2 text-sm"><b>Conclusión:</b> {text(conclusion.conclusion_text)}</p>}</section>;})}</div></article>;
  }
  const content = document.content;
  const names = new Map((document.competencies ?? []).map((card) => [card.id, card.name]));
  return <article aria-label={labelFor(document)} className="overflow-hidden rounded-[1.5rem] border border-[#d6e5ef] bg-white shadow-sm">
    <header className="bg-gradient-to-r from-[#e8f6fa] to-[#f5f9fd] p-5 sm:p-8">
      <div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-extrabold uppercase tracking-wider text-[#087d96]">{labelFor(document)}{document.kind === "experience" && document.version ? ` · Versión ${document.version}` : ""}</p><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">{statusFor(document.status)}</span></div>
      <h2 className="mt-3 text-2xl font-extrabold leading-tight text-[#172b52]">{document.title}</h2>
      <p className="mt-2 text-sm text-[#526b87]">{[document.institution_name, document.classroom, document.school_year].filter(Boolean).join(" · ")}</p>
      {(document.starts_on || document.occurs_on || document.period_start) && <p className="mt-1 text-sm text-[#526b87]">{document.occurs_on ? dateFor(document.occurs_on) : document.period_start ? `${dateFor(document.period_start)} – ${dateFor(document.period_end ?? "")}` : `${dateFor(document.starts_on ?? "")} – ${dateFor(document.ends_on ?? "")}`}</p>}
    </header>
    <div className="space-y-5 p-5 sm:p-8">
      {document.kind === "diagnostic_summary" && <>
        <Section title="Fortalezas del grupo" value={content.strengths} /><Section title="Dónde acompañar más" value={content.needs} />
        <Section title="Qué tendremos en cuenta al planificar" value={content.planning_priorities} />
      </>}
      {document.kind === "experience" && <>
        <Section title="Para qué la haremos" value={content.purpose} /><Section title="Nuestro punto de partida" value={content.starting_point} />
        <Section title={document.subtype === "project" ? "Qué despertó el interés" : "Qué necesita el grupo"} value={document.subtype === "project" ? content.trigger_or_interest : content.learning_need_or_context} />
        <CompetencySection title="Competencias principales" value={content.primary_competency_ids} names={names} />
        <CompetencySection title="Otras competencias posibles" value={content.possible_secondary_competency_ids} names={names} />
        <Pathways title={document.subtype === "project" ? "Posibles caminos" : "Situaciones propuestas"} value={document.subtype === "project" ? content.possible_pathways : content.proposed_situations} />
        <Section title="Espacios y materiales" value={content.spaces_and_materials} /><Section title="Qué podríamos observar" value={content.evidence_opportunities} />
        <Section title="Familias y comunidad" value={content.family_or_community_links} /><Section title="Cuándo ajustar" value={content.adjustment_points} /><Section title="Cómo adaptarla" value={content.flexibility_notes} />
      </>}
      {document.kind === "activity" && <>
        {document.experience_title && <p className="rounded-xl bg-[#f2f8fb] p-3 text-sm"><b>Experiencia:</b> {document.experience_title}</p>}
        <Section title="Propósito" value={content.purpose} /><Section title="Situación para los niños" value={content.meaningful_situation} />
        <Section title="Antes de empezar" value={content.teacher_preparation} /><Section title="Materiales" value={content.materials} />
        <Section title="Qué harán los niños" value={content.child_actions} /><Section title="Cómo acompañaré" value={content.mediation} />
        <Section title="Qué podré observar" value={content.evidence_opportunities} /><Section title="Cierre o continuidad" value={content.closure_or_continuity} />
        {text(content.competency_id) && <Section title="Competencia confirmada" value={names.get(text(content.competency_id)) ?? text(content.competency_id)} />}
      </>}
      {document.kind === "family_report" && <>
        <p className="rounded-xl bg-[#eaf7fb] p-3 text-sm">{document.period_label || "Informe histórico sin período formal"}</p>
        <Section title="Para la familia" value={content.introduction} />
        {Array.isArray(content.sections) && content.sections.map((raw, index) => {
          const section = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
          return <section key={index} className="rounded-xl border border-[#dce8f0] p-4 sm:p-5"><h3 className="font-bold text-[#173352]">{names.get(text(section.competency_id)) ?? "Aprendizajes observados"}</h3>
            <p className="mt-2 leading-relaxed">{text(section.progress_summary)}</p>
            <Section title="Ejemplos observados" value={section.examples} /><Section title="Qué ayudó" value={section.support_or_conditions} />
            <Section title="Próximos pasos" value={section.next_steps} /><Section title="En casa" value={section.family_suggestions} />
            <Section title="Información por completar" value={section.insufficiency_note} />
          </section>;
        })}
        <Section title="Para seguir acompañando" value={content.closing_note} />
      </>}
    </div>
  </article>;
}

export function DocumentsScreen() {
  const [authMode, setAuthMode] = useState<"local" | "supabase">("local");
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [selected, setSelected] = useState<{ kind: DocumentKind; id: string } | null>(null);
  const [opened, setOpened] = useState<OpenDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [savingWord, setSavingWord] = useState(false);
  const [wordMessage, setWordMessage] = useState("");
  const [wordError, setWordError] = useState("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const artifactFeature = process.env.NEXT_PUBLIC_AYNI_F10_ARTIFACTS === "1";

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
    }).then((result) => { setDocuments(result.documents); setError(""); })
      .catch(() => { if (!controller.signal.aborted) setError("No pudimos cargar tus documentos. Inténtalo otra vez."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

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
    if (!selected) return;
    const controller = new AbortController();
    apiFetch(`${localDatabaseApiUrl}/api/documents/${selected.kind}/${selected.id}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("No pudimos abrir este documento.");
      return response.json() as Promise<{ document: OpenDocument }>;
    }).then((result) => { setOpened(result.document); setError(""); })
      .catch(() => { if (!controller.signal.aborted) setError("No pudimos abrir este documento. Inténtalo otra vez."); })
      .finally(() => { if (!controller.signal.aborted) setOpening(false); });
    return () => controller.abort();
  }, [selected, revision]);

  const years = [...new Set(documents.map((item) => item.school_year))].sort((a, b) => b - a);
  const downloadable = opened && opened.kind !== "period_closure" && !(opened.source_plan_format === "annual_preplan_v1" && !opened.formal_ready);
  const downloadUrl = downloadable
    ? `${localDatabaseApiUrl}/api/documents/${opened.kind}/${opened.id}/download`
    : null;
  const stableArtifact = opened && artifacts.find(item => item.source_kind === opened.kind && item.source_id === opened.id);
  async function prepareArtifact() {
    if (!opened || savingWord) return;
    setSavingWord(true); setWordError(""); setWordMessage("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/documents/artifacts/prepare`, {
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({kind:opened.kind,sourceId:opened.id}) });
      const body = await response.json() as {artifact?:Artifact;error?:string};
      if (!response.ok || !body.artifact) throw new Error(body.error ?? "No se pudo preparar la versión estable.");
      setArtifacts(current => [...current.filter(item => item.id !== body.artifact!.id),body.artifact!]);
      setWordMessage("Versión estable preparada. Puedes descargar el mismo archivo cuando lo necesites.");
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
      if (authMode === "supabase") {
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
    <PageIntro eyebrow="Tu trabajo guardado" title="Documentos" description="Encuentra aquí tus diagnósticos, planes, experiencias, actividades, cierres e informes." icon={BookOpen} />
    {selected && <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" className="min-h-11" onClick={() => { setSelected(null); setOpened(null); setError(""); setWordMessage(""); setWordError(""); }}><ArrowLeft className="mr-2 size-4" />Volver a mis documentos</Button>
      <div className="flex flex-wrap gap-2">{artifactFeature && opened && ["annual_plan","experience"].includes(opened.kind) && ["active","archived"].includes(opened.status) && downloadable &&
        (stableArtifact ? <Button className="min-h-11" disabled={savingWord} onClick={() => void downloadStableArtifact(stableArtifact)}><Download className="mr-2 size-4" />Descargar versión estable</Button>
          : <Button className="min-h-11" disabled={savingWord} onClick={() => void prepareArtifact()}>{savingWord ? "Preparando..." : "Preparar versión estable"}</Button>)}
      {downloadable && !stableArtifact && <Button variant={artifactFeature && ["annual_plan","experience"].includes(opened.kind) ? "outline" : "default"} className="min-h-11" disabled={savingWord} onClick={() => void saveWordLocally()}><Download className="mr-2 size-4" />{savingWord ? "Preparando Word..." : authMode === "supabase" ? "Descargar Word" : "Guardar Word en Descargas"}</Button>}</div></div>}
    {wordMessage && <WorkflowFeedback tone="success">{wordMessage}</WorkflowFeedback>}
    {wordError && <WorkflowFeedback tone="error">{wordError}</WorkflowFeedback>}
    {opened?.kind === "annual_plan" && opened.source_plan_format !== "annual_preplan_v1" && opened.content.plan_format !== "twelve_projects_flexible_weeks" &&
      <WorkflowFeedback tone="error">Este plan se creó antes del formato actual. Su Word conserva la plantilla anterior. Abre Plan para preparar una versión actualizada; el plan vigente seguirá guardado mientras la revisas.</WorkflowFeedback>}
    {opened && downloadUrl && <p className="text-sm text-[#526b87]">{authMode === "local" ? "Se guarda en la computadora donde corre Ayni. " : ""}<a className="underline" href={downloadUrl} download>Descargar en este dispositivo</a></p>}
    {error && <div className="flex flex-wrap items-center gap-3"><WorkflowFeedback tone="error">{error}</WorkflowFeedback><Button variant="outline" onClick={() => { setLoading(!selected); setOpening(Boolean(selected)); setRevision((value) => value + 1); }}>Reintentar</Button></div>}
    {selected ? opening ? <LoadingState label="Abriendo documento..." /> : opened ? <DocumentContent document={opened} /> : null :
      loading ? <LoadingState label="Buscando tus documentos..." /> : error ? null : documents.length === 0 ?
        <div className="rounded-2xl border border-[#d6e5ef] bg-white p-6"><FileText className="size-8 text-[#087d96]" /><h2 className="mt-3 text-lg font-bold">Aún no hay documentos guardados</h2><p className="mt-1 text-[#526b87]">Cuando guardes tu diagnóstico, plan anual o una actividad, aparecerán aquí.</p></div> :
        years.map((year) => <section key={year} aria-label={`Documentos ${year}`} className="space-y-3"><h2 className="text-lg font-extrabold text-[#172b52]">Año escolar {year}</h2>
          <ul className="space-y-2">{documents.filter((item) => item.school_year === year).map((item) => <li key={`${item.kind}-${item.id}`} className="rounded-2xl border border-[#d6e5ef] bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-[#087d96]">{labelFor(item)} · {statusFor(item.status)}</p><h3 className="mt-1 break-words text-lg font-bold text-[#172b52]">{item.title}</h3><p className="mt-1 text-sm text-[#526b87]">{item.classroom}{item.period_label ? ` · ${item.period_label}` : item.kind === "family_report" ? " · Informe histórico sin período formal" : ""}{item.date ? ` · ${dateFor(item.date)}` : ""}{item.version && item.version > 1 ? ` · Versión ${item.version}` : ""}</p></div>
            <Button variant="outline" className="mt-3 min-h-11 shrink-0 sm:mt-0" onClick={() => { setOpened(null); setError(""); setWordMessage(""); setWordError(""); setOpening(true); setSelected({ kind: item.kind, id: item.id }); }}>Abrir documento</Button>
          </li>)}</ul>
        </section>)}
  </section>;
}
