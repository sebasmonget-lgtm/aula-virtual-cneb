"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Pencil, School, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AIActivityCompetencyOption } from "@/src/lib/ai-activity-client";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { buildAnnualPlanPresentation } from "@/src/lib/annual-plan-presentation.mjs";
import { buildFlexibleAnnualSchedule, suggestAnnualProjectDurations } from "@/src/lib/annual-plan-calendar.mjs";
import { AsyncButton, CompetencyChecklist, GenerationProgress, LoadingState, WorkflowFeedback } from "./workflow-ui";

type Experience = {
  period: string; experience_type: "project" | "unit" | "workshop"; title: string; rationale: string;
  primary_competency_ids: string[]; possible_secondary_competency_ids: string[];
  context_or_trigger: string; expected_evidence_categories: string[]; flexibility_notes: string;
  purpose?: string; final_product?: string; materials?: string[];
  duration_weeks?: 2 | 3;
};
type PresentedExperience = Experience & {
  number: number; typeLabel: string; primaryCompetencies: string[]; secondaryCompetencies: string[];
  startsOn?: string; endsOn?: string; durationDays?: number; durationWeeks?: number;
};
export type Proposal = {
  title: string; school_year: string; general_context_summary: string; planning_priorities: string[];
  competency_overview: string[]; proposed_experiences: Experience[]; review_checkpoints: string[];
  flexibility_notes: string;
  annual_purposes?: string[]; teaching_strategies?: string[]; assessment_followup?: string[];
  family_collaboration?: string[]; inclusive_supports?: string[];
  plan_format?: string; organization_criteria?: string[]; transversal_approaches?: string[];
};
export type DocumentContext = {
  institution_name?: string; institution_code?: string; district?: string; ugel?: string;
  teacher_name?: string; classroom_section?: string; age?: number; school_year?: number;
  starts_on?: string; ends_on?: string; student_count?: number | null;
  diagnostic_group?: { strengths?: string; needs?: string; planning_priorities?: string } | null;
  group_interests?: string[];
  calendar?: AnnualCalendar | null;
};
type AnnualCalendarBlock = { id?: string; type: "instructional" | "management" | "holiday" | "institutional" | "vacation";
  label: string; start_date: string; end_date: string; editable: boolean; sort_order: number };
type InitialStage = { id?: string; name: string; duration_weeks: number; purpose: string;
  suggested_experiences: string[]; what_to_observe: string[]; family_actions: string[];
  diagnostic_focus: string[]; teacher_notes: string };
type AnnualCalendar = { school_year: number; starts_on: string; ends_on: string;
  blocks: AnnualCalendarBlock[]; initial_stage: InitialStage | null;
  exceptions?: { exception_date: string; type: string; label: string; is_instructional: boolean }[] };
type ClassroomContext = DocumentContext & {
  id: string; section: string; year: number; age: number; diagnostic_summary?: string;
  available_resources?: string[];
  calendar: AnnualCalendar;
  context_v4?: { students_total: number; confirmed_interviews: number;
    common_interests: { label: string }[]; languages: { label: string }[] };
};
type SavedPlan = {
  id: string; classroom_id: string; version: number; status: "draft" | "active" | "archived";
  proposal: Proposal; document_context: DocumentContext;
};
type PlansResponse = { active?: SavedPlan | null; draft?: SavedPlan | null; archived?: SavedPlan[] };
type GeneratedResponse = { proposal?: Proposal; generation_id?: string; document_context?: DocumentContext; error?: string };

const lines = (value: string[]) => value.join("\n");
const toLines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
const emptyExperience = (): Experience => ({ period: "Bimestre 1", experience_type: "project", title: "",
  rationale: "", primary_competency_ids: [], possible_secondary_competency_ids: [],
  context_or_trigger: "", expected_evidence_categories: [], flexibility_notes: "Se ajustará según lo observado en el grupo." });
const completeDocumentFields = (value: Proposal): Proposal => ({ ...value,
  annual_purposes: value.annual_purposes ?? [], teaching_strategies: value.teaching_strategies ?? [],
  assessment_followup: value.assessment_followup ?? [], family_collaboration: value.family_collaboration ?? [],
  inclusive_supports: value.inclusive_supports ?? [],
});
const fieldClass = "mt-2 bg-white text-base";

function BulletList({ items, empty }: { items: string[]; empty?: string }) {
  return items.length ? <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-[#087d96]">
    {items.map((item, index) => <li key={`${index}-${item}`} className="pl-1 leading-relaxed">{item}</li>)}
  </ul> : <p className="mt-2 text-sm text-[#61718e]">{empty ?? "Aún no se ha definido."}</p>;
}

export function AnnualPlanDocument({ proposal, context, competencies, status }: {
  proposal: Proposal; context: DocumentContext; competencies: AIActivityCompetencyOption[];
  status: "preview" | "draft" | "active" | "archived";
}) {
  const document = buildAnnualPlanPresentation(proposal, context, competencies);
  const header = document.header;
  const statusLabel = status === "active" ? "Confirmado por la docente" : status === "draft" ? "Borrador guardado" :
    status === "archived" ? "Versión anterior" : "Propuesta por revisar";
  return <article aria-label="Documento del plan anual" className="overflow-hidden rounded-[1.75rem] border border-[#d6e5ef] bg-white shadow-[0_14px_40px_rgba(23,43,82,.07)]">
    <header className="border-b border-[#d6e5ef] bg-gradient-to-br from-[#e8f6fa] via-white to-[#f3f0ff] p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-extrabold tracking-[.16em] text-[#087d96]">PLANIFICACIÓN ANUAL · INICIAL</p><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#31536b]">{statusLabel}</span></div>
      <h2 className="mt-4 text-2xl font-extrabold leading-tight text-[#172b52] sm:text-3xl">{document.title}</h2>
      {header.institution && <p className="mt-2 flex items-center gap-2 font-semibold text-[#294b64]"><School className="size-4 shrink-0" />{header.institution}{header.institutionCode ? ` · ${header.institutionCode}` : ""}</p>}
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl bg-white/85 p-3"><dt className="text-xs font-semibold text-[#526b87]">Aula</dt><dd className="mt-1 font-bold">{[header.age ? `${header.age} años` : null, header.cycle ? `Ciclo ${header.cycle}` : null, header.classroom].filter(Boolean).join(" · ") || "Por completar"}</dd></div>
        <div className="rounded-xl bg-white/85 p-3"><dt className="text-xs font-semibold text-[#526b87]">Año escolar</dt><dd className="mt-1 flex items-center gap-2 font-bold"><CalendarDays className="size-4" />{header.year}</dd></div>
        <div className="rounded-xl bg-white/85 p-3"><dt className="text-xs font-semibold text-[#526b87]">Docente</dt><dd className="mt-1 flex items-center gap-2 font-bold"><UserRound className="size-4" />{header.teacher || "Por completar"}</dd></div>
        <div className="rounded-xl bg-white/85 p-3"><dt className="text-xs font-semibold text-[#526b87]">Período</dt><dd className="mt-1 font-bold">{header.dates.length === 2 ? header.dates.join(" – ") : "Año escolar"}</dd></div>
        {header.studentCount !== null && <div className="rounded-xl bg-white/85 p-3"><dt className="text-xs font-semibold text-[#526b87]">Niños en el aula</dt><dd className="mt-1 font-bold">{header.studentCount}</dd></div>}
      </dl>
      {(header.district || header.ugel) && <p className="mt-3 text-xs text-[#526b87]">{[header.district && `Distrito: ${header.district}`, header.ugel && `UGEL: ${header.ugel}`].filter(Boolean).join(" · ")}</p>}
    </header>
    <div className="space-y-8 p-5 sm:p-8">
      {document.calendarWarning && <p className="rounded-xl border border-[#f0c2b8] bg-[#fff4f2] p-4 font-semibold text-[#9a392d]">{document.calendarWarning} Cambia la duración del proyecto o revisa el calendario.</p>}
      <section aria-labelledby="annual-start"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e2f4f8] font-extrabold text-[#087d96]">1</span><h3 id="annual-start" className="text-xl font-extrabold text-[#172b52]">Nuestro punto de partida</h3></div>
        <p className="mt-4 whitespace-pre-line leading-relaxed text-[#294b64]">{document.context}</p>
        {document.technicalContext && <details className="mt-3 text-sm text-[#526b87]"><summary className="cursor-pointer font-semibold">Ver detalles de origen</summary><p className="mt-2 break-words">{document.technicalContext}</p></details>}
        {(document.diagnostic.strengths || document.diagnostic.needs || document.diagnostic.interests.length > 0) && <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {document.diagnostic.strengths && <div className="rounded-xl bg-[#f0faf4] p-4"><h4 className="font-bold text-[#276c4b]">Fortalezas observadas</h4><p className="mt-2 leading-relaxed">{document.diagnostic.strengths}</p></div>}
          {document.diagnostic.needs && <div className="rounded-xl bg-[#f5f8fd] p-4"><h4 className="font-bold text-[#294b64]">Dónde ofrecer más oportunidades</h4><p className="mt-2 leading-relaxed">{document.diagnostic.needs}</p></div>}
          {document.diagnostic.interests.length > 0 && <div className="rounded-xl bg-[#fff8e9] p-4 sm:col-span-2"><h4 className="font-bold text-[#8b5b12]">Intereses que pueden movilizar al grupo</h4><BulletList items={document.diagnostic.interests} /></div>}
        </div>}
        <p className="mt-3 text-xs text-[#526b87]">Este punto de partida resume información grupal confirmada. No presenta resultados individuales ni convierte la entrevista familiar en observación docente.</p>
      </section>
      <section aria-labelledby="annual-decisions" className="border-t border-[#e3ecf2] pt-7"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e8f6ed] font-extrabold text-[#218050]">2</span><h3 id="annual-decisions" className="text-xl font-extrabold text-[#172b52]">Lo que nos proponemos</h3></div>
        {document.annualPurposes.length > 0 && <><h4 className="mt-4 font-bold text-[#075d70]">Propósitos del año</h4><BulletList items={document.annualPurposes} /></>}
        <h4 className="mt-4 font-bold text-[#075d70]">Decisiones para empezar</h4><BulletList items={document.priorities} />
        {document.organizationCriteria.length > 0 && <><h4 className="mt-4 font-bold text-[#075d70]">Cómo organizaremos el año</h4><BulletList items={document.organizationCriteria} /></>}
        {document.transversalApproaches.length > 0 && <><h4 className="mt-4 font-bold text-[#075d70]">Orientaciones para el trabajo diario</h4><BulletList items={document.transversalApproaches} /></>}
      </section>
      <section aria-labelledby="annual-competencies" className="border-t border-[#e3ecf2] pt-7"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f0ecfb] font-extrabold text-[#7652bc]">3</span><h3 id="annual-competencies" className="text-xl font-extrabold text-[#172b52]">Competencias y oportunidades</h3></div>
        <BulletList items={document.competencyOverview} />
        {document.competencyMap.length > 0 && <div className="mt-5 overflow-x-auto rounded-xl border border-[#d6e5ef]"><table className="w-full min-w-[480px] text-left text-sm"><thead className="bg-[#eaf5fa] text-[#123c5a]"><tr><th scope="col" className="p-3">Competencia</th><th scope="col" className="p-3">Dónde la trabajaremos</th></tr></thead><tbody>{document.competencyMap.map((entry: { id: string; name: string; opportunities: string[] }) => <tr key={entry.id} className="border-t border-[#e3ecf2]"><th scope="row" className="p-3 font-semibold">{entry.name}</th><td className="p-3">{entry.opportunities.join(" · ")}</td></tr>)}</tbody></table></div>}
        <p className="mt-3 text-xs text-[#526b87]">El mapa muestra oportunidades previstas. Si aún no observaste una competencia, no significa que el niño no la haya desarrollado.</p>
      </section>
      {document.initialStage && <section aria-labelledby="annual-initial-stage" className="border-t border-[#e3ecf2] pt-7"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e8f6ed] font-extrabold text-[#218050]">4</span><h3 id="annual-initial-stage" className="text-xl font-extrabold text-[#172b52]">{document.initialStage.name}</h3></div>
        <p className="mt-3 text-sm font-semibold text-[#526b87]">{document.initialStage.startsOn} – {document.initialStage.endsOn} · {document.initialStage.duration_weeks} semanas lectivas iniciales</p>
        <p className="mt-2 leading-relaxed">{document.initialStage.purpose}</p>
        <p className="mt-4 font-bold text-[#075d70]">Qué haremos</p><BulletList items={document.initialStage.suggested_experiences} />
        <p className="mt-4 font-bold text-[#075d70]">Qué observaremos</p><BulletList items={document.initialStage.what_to_observe} />
        <p className="mt-4 font-bold text-[#075d70]">Con las familias</p><BulletList items={document.initialStage.family_actions} />
        <p className="mt-4 text-sm text-[#526b87]">Duración referencial. La adaptación puede continuar de manera diferenciada según las necesidades de cada niño.</p>
      </section>}
      <section aria-labelledby="annual-experiences" className="border-t border-[#e3ecf2] pt-7"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eee8fb] font-extrabold text-[#7652bc]">{document.initialStage ? "5" : "4"}</span><h3 id="annual-experiences" className="text-xl font-extrabold text-[#172b52]">Ruta de experiencias del año</h3></div>
        <p className="mt-2 text-sm text-[#526b87]">{document.templatePlan ? "Doce propuestas iniciales en cuatro periodos lectivos. Las fechas y los proyectos se pueden reajustar según lo que observes en el grupo." : "Son propuestas flexibles. Podrás ajustarlas según lo que ocurra en el aula."}</p>
        {document.calendarBlocks.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{document.calendarBlocks.filter((block: AnnualCalendarBlock) => block.type === "instructional").map((block: AnnualCalendarBlock) => <p key={block.id ?? block.sort_order} className="rounded-xl bg-[#f1f7fb] p-3 text-sm"><span className="font-bold">{block.label}</span><br />{block.start_date} – {block.end_date}</p>)}</div>}
        <div className="mt-4 space-y-4">{document.experiences.length ? document.experiences.map((item: PresentedExperience) => <section key={item.number} className="rounded-2xl border border-[#d6e5ef] bg-[#fbfdff] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wide text-[#087d96]">{item.typeLabel} {item.number}</p><h4 className="mt-1 text-lg font-extrabold text-[#172b52]">{item.title}</h4></div><span className="rounded-full bg-[#e8f6fa] px-3 py-1 text-xs font-semibold text-[#075d70]">{item.period}</span></div>
          <p className="mt-3 leading-relaxed">{item.rationale}</p>
          {item.startsOn && <p className="mt-2 text-sm font-semibold text-[#526b87]">{item.startsOn} – {item.endsOn} · {item.durationWeeks ? `${item.durationWeeks} semanas lectivas` : `${item.durationDays} días de trabajo`}</p>}
          {item.purpose && <p className="mt-3 text-sm"><span className="font-bold">Para qué:</span> {item.purpose}</p>}
          {item.final_product && <p className="mt-2 text-sm"><span className="font-bold">Producto posible del proyecto:</span> {item.final_product}</p>}
          {Boolean(item.materials?.length) && <p className="mt-2 text-sm"><span className="font-bold">Materiales:</span> {item.materials?.join(", ")}</p>}
          <p className="mt-3 text-sm"><span className="font-bold">Punto de partida:</span> {item.context_or_trigger}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-sm font-bold text-[#075d70]">Competencias principales</p><BulletList items={item.primaryCompetencies} empty="La docente puede elegirlas al revisar la experiencia." /></div>
            {item.secondaryCompetencies.length > 0 && <div><p className="text-sm font-bold text-[#075d70]">Otras competencias posibles</p><BulletList items={item.secondaryCompetencies} /></div>}</div>
          {item.expected_evidence_categories.length > 0 && <div className="mt-4"><p className="text-sm font-bold text-[#075d70]">Qué podríamos observar</p><BulletList items={item.expected_evidence_categories} /></div>}
          <p className="mt-4 rounded-xl bg-[#eef8fb] p-3 text-sm"><span className="font-bold">Para ajustarla:</span> {item.flexibility_notes}</p>
        </section>) : <p className="rounded-xl bg-[#f3f7fb] p-4 text-sm">Aún no hay experiencias propuestas. Puedes agregarlas al corregir el borrador.</p>}</div>
      </section>
      {(document.teachingStrategies.length > 0 || document.inclusiveSupports.length > 0) && <section aria-labelledby="annual-teaching" className="border-t border-[#e3ecf2] pt-7"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e8f6fa] font-extrabold text-[#087d96]">5</span><h3 id="annual-teaching" className="text-xl font-extrabold text-[#172b52]">Cómo acompañaremos el aprendizaje</h3></div>
        {document.teachingStrategies.length > 0 && <><h4 className="mt-4 font-bold text-[#075d70]">Durante el juego y las experiencias</h4><BulletList items={document.teachingStrategies} /></>}
        {document.inclusiveSupports.length > 0 && <><h4 className="mt-4 font-bold text-[#075d70]">Apoyos para que todos participen</h4><BulletList items={document.inclusiveSupports} /></>}
      </section>}
      {(document.assessmentFollowup.length > 0 || document.familyCollaboration.length > 0) && <section aria-labelledby="annual-followup" className="border-t border-[#e3ecf2] pt-7"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#fff3df] font-extrabold text-[#a36b20]">6</span><h3 id="annual-followup" className="text-xl font-extrabold text-[#172b52]">Observación y familias</h3></div>
        {document.assessmentFollowup.length > 0 && <><h4 className="mt-4 font-bold text-[#075d70]">Cómo observaremos el avance</h4><BulletList items={document.assessmentFollowup} /></>}
        {document.familyCollaboration.length > 0 && <><h4 className="mt-4 font-bold text-[#075d70]">Cómo colaboraremos con las familias</h4><BulletList items={document.familyCollaboration} /></>}
      </section>}
      <section aria-labelledby="annual-review" className="border-t border-[#e3ecf2] pt-7"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e8f6ed] font-extrabold text-[#218050]">7</span><h3 id="annual-review" className="text-xl font-extrabold text-[#172b52]">Cuándo revisaremos el plan</h3></div>
        <BulletList items={document.checkpoints} empty="La docente puede definir cuándo revisar el plan." />
        <p className="mt-4 rounded-xl bg-[#f0faf4] p-4 leading-relaxed"><span className="font-bold">Podremos ajustarlo así:</span> {document.flexibility}</p>
      </section>
    </div>
  </article>;
}

function AnnualPlanEditor({ proposal, setProposal, competencies, disabled }: {
  proposal: Proposal; setProposal: (value: Proposal) => void; competencies: AIActivityCompetencyOption[]; disabled: boolean;
}) {
  const flexiblePlan = proposal.plan_format === "twelve_projects_flexible_weeks";
  const templatePlan = flexiblePlan || proposal.plan_format === "twenty_projects_ten_days";
  function updateExperience(index: number, patch: Partial<Experience>) {
    setProposal({ ...proposal, proposed_experiences: proposal.proposed_experiences.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  }
  return <section className="rounded-2xl border border-[#c9dce9] bg-[#f8fcfd] p-4 sm:p-6"><h2 className="text-xl font-extrabold">Corrige tu borrador</h2><p className="mt-1 text-sm text-[#526b87]">Cambia solo lo que necesites. Después vuelve a ver el documento y guarda.</p>
    <fieldset disabled={disabled} className="mt-5 space-y-6">
      <section className="space-y-4"><h3 className="font-bold text-[#075d70]">1 · Punto de partida</h3>
        <label className="block font-semibold">Título<Input className={fieldClass} value={proposal.title} onChange={(event) => setProposal({ ...proposal, title: event.target.value })} /></label>
        <label className="block font-semibold">¿Cómo es el grupo?<Textarea className={fieldClass} value={proposal.general_context_summary} onChange={(event) => setProposal({ ...proposal, general_context_summary: event.target.value })} /></label>
        <label className="block font-semibold">¿Qué queremos impulsar? <span className="text-sm font-normal text-[#526b87]">Una idea por línea</span><Textarea className={fieldClass} value={lines(proposal.planning_priorities)} onChange={(event) => setProposal({ ...proposal, planning_priorities: toLines(event.target.value) })} /></label>
        <label className="block font-semibold">Propósitos del año <span className="text-sm font-normal text-[#526b87]">Una idea por línea</span><Textarea className={fieldClass} value={lines(proposal.annual_purposes ?? [])} onChange={(event) => setProposal({ ...proposal, annual_purposes: toLines(event.target.value) })} /></label>
        <label className="block font-semibold">Competencias del plan <span className="text-sm font-normal text-[#526b87]">Una idea por línea</span><Textarea className={fieldClass} value={lines(proposal.competency_overview)} onChange={(event) => setProposal({ ...proposal, competency_overview: toLines(event.target.value) })} /></label>
        {templatePlan && <><label className="block font-semibold">Cuatro criterios para organizar el año <span className="text-sm font-normal text-[#526b87]">Uno por línea</span><Textarea className={fieldClass} value={lines(proposal.organization_criteria ?? [])} onChange={(event) => setProposal({ ...proposal, organization_criteria: toLines(event.target.value) })} /></label>
          <label className="block font-semibold">Orientaciones para el trabajo diario <span className="text-sm font-normal text-[#526b87]">Una por línea</span><Textarea className={fieldClass} value={lines(proposal.transversal_approaches ?? [])} onChange={(event) => setProposal({ ...proposal, transversal_approaches: toLines(event.target.value) })} /></label></>}
      </section>
      <section className="space-y-4 border-t border-[#d6e5ef] pt-5"><h3 className="font-bold text-[#075d70]">2 · Experiencias del año</h3>
        {templatePlan && <p className="text-sm text-[#526b87]">{flexiblePlan ? "El documento propone doce proyectos, tres por periodo lectivo. Puedes cambiar su duración entre dos y tres semanas." : "Este plan anterior conserva veinte proyectos."}</p>}
        {proposal.proposed_experiences.map((item, index) => <details key={index} className="rounded-xl border border-[#d6e5ef] bg-white p-4" open={proposal.proposed_experiences.length === 1 ? true : undefined}>
          <summary className="cursor-pointer font-bold">{index + 1}. {item.title || "Experiencia sin título"} · {item.period || "Sin período"}</summary>
          <div className="mt-4 space-y-4">{!templatePlan && <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">Bimestre<select className="mt-2 min-h-11 w-full rounded-lg border border-[#d6e5ef] bg-white px-3" value={item.period} onChange={(event) => updateExperience(index, { period: event.target.value })}>{!["Bimestre 1", "Bimestre 2", "Bimestre 3", "Bimestre 4"].includes(item.period) && <option value={item.period}>{item.period} (plan anterior)</option>}{[1, 2, 3, 4].map((number) => <option key={number} value={`Bimestre ${number}`}>Bimestre {number}</option>)}</select></label>
            <label className="block text-sm font-semibold">Tipo<select className="mt-2 min-h-11 w-full rounded-lg border border-[#d6e5ef] bg-white px-3" value={item.experience_type} onChange={(event) => updateExperience(index, { experience_type: event.target.value as Experience["experience_type"] })}><option value="project">Proyecto</option><option value="unit">Unidad</option><option value="workshop">Taller</option></select></label></div>}
          {templatePlan && <p className="text-sm font-semibold text-[#075d70]">Proyecto {index + 1} · {item.period}{flexiblePlan ? " · duración referencial" : " · 10 días de trabajo"}</p>}
            {flexiblePlan && <label className="block text-sm font-semibold">Duración<select className="mt-2 min-h-11 w-full rounded-lg border border-[#d6e5ef] bg-white px-3" value={item.duration_weeks ?? 2} onChange={(event) => updateExperience(index, { duration_weeks: Number(event.target.value) as 2 | 3 })}><option value={2}>2 semanas lectivas</option><option value={3}>3 semanas lectivas</option></select></label>}
            <label className="block text-sm font-semibold">Título<Input className={fieldClass} value={item.title} onChange={(event) => updateExperience(index, { title: event.target.value })} /></label>
            {templatePlan && <><label className="block text-sm font-semibold">Propósito del proyecto<Textarea className={fieldClass} value={item.purpose ?? ""} onChange={(event) => updateExperience(index, { purpose: event.target.value })} /></label>
              <label className="block text-sm font-semibold">Producto posible del proyecto<Input className={fieldClass} value={item.final_product ?? ""} onChange={(event) => updateExperience(index, { final_product: event.target.value })} /></label>
              <label className="block text-sm font-semibold">Materiales <span className="font-normal text-[#526b87]">Uno por línea</span><Textarea className={fieldClass} value={lines(item.materials ?? [])} onChange={(event) => updateExperience(index, { materials: toLines(event.target.value) })} /></label></>}
            <label className="block text-sm font-semibold">¿Por qué es valiosa para el grupo?<Textarea className={fieldClass} value={item.rationale} onChange={(event) => updateExperience(index, { rationale: event.target.value })} /></label>
            <label className="block text-sm font-semibold">¿Qué interés o situación la inicia?<Textarea className={fieldClass} value={item.context_or_trigger} onChange={(event) => updateExperience(index, { context_or_trigger: event.target.value })} /></label>
            <CompetencyChecklist label="Competencias principales" value={item.primary_competency_ids} options={competencies} onChange={(primary_competency_ids) => updateExperience(index, { primary_competency_ids })} />
            <details className="rounded-xl bg-[#f3f8fb] p-3"><summary className="cursor-pointer font-semibold">Más detalles de esta experiencia</summary><div className="mt-3 space-y-4">
              <CompetencyChecklist label="Otras competencias posibles" value={item.possible_secondary_competency_ids} options={competencies} onChange={(possible_secondary_competency_ids) => updateExperience(index, { possible_secondary_competency_ids })} />
              <label className="block text-sm font-semibold">Qué podríamos observar <span className="font-normal text-[#526b87]">Una idea por línea</span><Textarea className={fieldClass} value={lines(item.expected_evidence_categories)} onChange={(event) => updateExperience(index, { expected_evidence_categories: toLines(event.target.value) })} /></label>
              <label className="block text-sm font-semibold">Cómo podremos ajustarla<Textarea className={fieldClass} value={item.flexibility_notes} onChange={(event) => updateExperience(index, { flexibility_notes: event.target.value })} /></label>
            </div></details>
            {!templatePlan && <Button type="button" variant="ghost" onClick={() => setProposal({ ...proposal, proposed_experiences: proposal.proposed_experiences.filter((_, itemIndex) => itemIndex !== index) })}>Quitar esta experiencia</Button>}
          </div>
        </details>)}
        {!templatePlan && <Button type="button" variant="outline" className="min-h-11" onClick={() => setProposal({ ...proposal, proposed_experiences: [...proposal.proposed_experiences, emptyExperience()] })}>Agregar experiencia</Button>}
      </section>
      <details className="rounded-xl border border-[#d6e5ef] bg-white p-4"><summary className="cursor-pointer font-bold text-[#075d70]">Cómo acompañar, observar y trabajar con familias</summary><div className="mt-4 space-y-4">
        <label className="block font-semibold">Cómo aprenderemos <span className="text-sm font-normal text-[#526b87]">Una idea por línea</span><Textarea className={fieldClass} value={lines(proposal.teaching_strategies ?? [])} onChange={(event) => setProposal({ ...proposal, teaching_strategies: toLines(event.target.value) })} /></label>
        <label className="block font-semibold">Cómo observaremos el avance <span className="text-sm font-normal text-[#526b87]">Una idea por línea</span><Textarea className={fieldClass} value={lines(proposal.assessment_followup ?? [])} onChange={(event) => setProposal({ ...proposal, assessment_followup: toLines(event.target.value) })} /></label>
        <label className="block font-semibold">Trabajo con las familias <span className="text-sm font-normal text-[#526b87]">Una idea por línea; solo si el contexto lo sustenta</span><Textarea className={fieldClass} value={lines(proposal.family_collaboration ?? [])} onChange={(event) => setProposal({ ...proposal, family_collaboration: toLines(event.target.value) })} /></label>
        <label className="block font-semibold">Apoyos para la participación <span className="text-sm font-normal text-[#526b87]">Una idea por línea; sin etiquetar a niños</span><Textarea className={fieldClass} value={lines(proposal.inclusive_supports ?? [])} onChange={(event) => setProposal({ ...proposal, inclusive_supports: toLines(event.target.value) })} /></label>
      </div></details>
      <section className="space-y-4 border-t border-[#d6e5ef] pt-5"><h3 className="font-bold text-[#075d70]">3 · Revisión y ajustes</h3>
        <label className="block font-semibold">¿Cuándo revisaremos el plan? <span className="text-sm font-normal text-[#526b87]">Una idea por línea</span><Textarea className={fieldClass} value={lines(proposal.review_checkpoints)} onChange={(event) => setProposal({ ...proposal, review_checkpoints: toLines(event.target.value) })} /></label>
        <label className="block font-semibold">¿Cómo podremos adaptarlo?<Textarea className={fieldClass} value={proposal.flexibility_notes} onChange={(event) => setProposal({ ...proposal, flexibility_notes: event.target.value })} /></label>
      </section>
    </fieldset>
  </section>;
}

function AnnualCalendarEditor({ calendar, onChange, onSave, saving }: {
  calendar: AnnualCalendar; onChange: (value: AnnualCalendar) => void; onSave: () => void; saving: boolean;
}) {
  const stage = calendar.initial_stage;
  const updateBlock = (index: number, patch: Partial<AnnualCalendarBlock>) => onChange({ ...calendar,
    blocks: calendar.blocks.map((block, itemIndex) => itemIndex === index ? { ...block, ...patch } : block) });
  const updateStage = (patch: Partial<InitialStage>) => stage && onChange({ ...calendar, initial_stage: { ...stage, ...patch } });
  return <details className="mt-4 rounded-xl border border-[#d6e5ef] bg-[#fbfdff] p-4"><summary className="cursor-pointer font-bold text-[#075d70]">Revisar calendario y etapa inicial</summary>
    <p className="mt-3 text-sm text-[#526b87]">Ayni usa estos periodos para calcular fechas de lunes a viernes. Puedes ajustarlos al calendario de tu institución antes de confirmar el plan.</p>
    <div className="mt-4 space-y-3">{calendar.blocks.map((block, index) => <div key={block.id ?? index} className="grid gap-2 rounded-xl border border-[#d6e5ef] bg-white p-3 sm:grid-cols-[1fr_10rem_10rem_auto] sm:items-end">
      <label className="text-sm font-semibold">{block.type === "instructional" ? "Periodo lectivo" : "Interrupción o gestión"}<Input className="mt-1 bg-white" value={block.label} disabled={!block.editable || saving} onChange={(event) => updateBlock(index, { label: event.target.value })} /></label>
      <label className="text-sm font-semibold">Inicio<Input type="date" className="mt-1 bg-white" value={block.start_date} disabled={!block.editable || saving} onChange={(event) => updateBlock(index, { start_date: event.target.value })} /></label>
      <label className="text-sm font-semibold">Fin<Input type="date" className="mt-1 bg-white" value={block.end_date} disabled={!block.editable || saving} onChange={(event) => updateBlock(index, { end_date: event.target.value })} /></label>
      {block.type !== "instructional" && <Button type="button" variant="outline" className="min-h-10" disabled={!block.editable || saving} onClick={() => onChange({ ...calendar, blocks: calendar.blocks.filter((_, itemIndex) => itemIndex !== index) })}>Quitar</Button>}
    </div>)}</div>
    <div className="mt-3 flex flex-wrap gap-2">{(["holiday", "institutional", "vacation"] as const).map((type) => <Button key={type} type="button" variant="outline" className="min-h-10" disabled={saving} onClick={() => onChange({ ...calendar, blocks: [...calendar.blocks, { type, label: type === "holiday" ? "Feriado" : type === "vacation" ? "Vacaciones" : "Suspensión institucional", start_date: "", end_date: "", editable: true, sort_order: calendar.blocks.length }] })}>Añadir {type === "holiday" ? "feriado" : type === "vacation" ? "vacaciones" : "suspensión"}</Button>)}</div>
    {stage && <div className="mt-5 space-y-3 border-t border-[#d6e5ef] pt-4"><h3 className="font-bold text-[#075d70]">Acogida, adaptación y diagnóstico</h3>
      <label className="block text-sm font-semibold">Duración inicial<select className="mt-1 min-h-11 w-full rounded-lg border border-[#d6e5ef] bg-white px-3" value={stage.duration_weeks} disabled={saving} onChange={(event) => updateStage({ duration_weeks: Number(event.target.value) })}>{[1, 2, 3, 4].map((weeks) => <option key={weeks} value={weeks}>{weeks} {weeks === 1 ? "semana lectiva" : "semanas lectivas"}</option>)}</select></label>
      <label className="block text-sm font-semibold">Propósito<Textarea className="mt-1 bg-white" value={stage.purpose} disabled={saving} onChange={(event) => updateStage({ purpose: event.target.value })} /></label>
      {(["suggested_experiences", "what_to_observe", "family_actions", "diagnostic_focus"] as const).map((field) => <label key={field} className="block text-sm font-semibold">{{ suggested_experiences: "Experiencias sugeridas", what_to_observe: "Qué observar", family_actions: "Acciones con familias", diagnostic_focus: "Foco diagnóstico" }[field]}<Textarea className="mt-1 bg-white" value={lines(stage[field])} disabled={saving} onChange={(event) => updateStage({ [field]: toLines(event.target.value) })} /></label>)}
      <label className="block text-sm font-semibold">Notas de la docente <span className="font-normal text-[#526b87]">Solo para organizarte; no se envían a la IA</span><Textarea className="mt-1 bg-white" value={stage.teacher_notes} disabled={saving} onChange={(event) => updateStage({ teacher_notes: event.target.value })} /></label>
    </div>}
    <AsyncButton className="mt-4 min-h-11" busy={saving} busyLabel="Guardando calendario..." onClick={onSave}>Guardar calendario</AsyncButton>
  </details>;
}

export function AnnualPlanGenerator({ onConfirmed, onGoDiagnostic }: { onConfirmed?: () => void; onGoDiagnostic?: () => void }) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [existingPlan, setExistingPlan] = useState<SavedPlan | null>(null);
  const [classroom, setClassroom] = useState<ClassroomContext | null>(null);
  const [calendarDraft, setCalendarDraft] = useState<AnnualCalendar | null>(null);
  const [generatedHeader, setGeneratedHeader] = useState<DocumentContext | null>(null);
  const [competencies, setCompetencies] = useState<AIActivityCompetencyOption[]>([]);
  const [editing, setEditing] = useState(false);
  const [operation, setOperation] = useState<"generate" | "save" | "confirm" | "calendar" | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [planId, setPlanId] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [replacementPlanId, setReplacementPlanId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [teacherRequest, setTeacherRequest] = useState("");
  const readOnly = existingPlan?.status === "active" || existingPlan?.status === "archived" ||
    Boolean(existingPlan && classroom && existingPlan.classroom_id !== classroom.id);
  const canReplaceLegacy = Boolean(existingPlan?.status === "active" && classroom &&
    existingPlan.classroom_id === classroom.id && existingPlan.proposal.plan_format !== "twelve_projects_flexible_weeks");
  const calendarDirty = Boolean(classroom && calendarDraft && JSON.stringify(calendarDraft) !== JSON.stringify(classroom.calendar));
  let calendarWarning = "";
  if (calendarDraft) {
    try {
      if (proposal?.plan_format === "twelve_projects_flexible_weeks") buildFlexibleAnnualSchedule(calendarDraft, proposal.proposed_experiences);
      else suggestAnnualProjectDurations(calendarDraft);
    }
    catch (error) { calendarWarning = error instanceof Error ? error.message : "Revisa el calendario escolar."; }
  }
  const teachingBlocks = (calendarDraft?.blocks ?? classroom?.calendar.blocks ?? [])
    .filter((block) => block.type === "instructional")
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const teachingRange = teachingBlocks.length === 4
    ? `${teachingBlocks[0].start_date} a ${teachingBlocks[3].end_date}` : "Revisa las fechas lectivas";
  const hasUnsavedChanges = Boolean(proposal && (!planId || existingPlan?.id !== planId || JSON.stringify(proposal) !== JSON.stringify(existingPlan.proposal)));
  const savedDocumentContext = generatedHeader ?? existingPlan?.document_context ?? (classroom ? {
    institution_name: classroom.institution_name, institution_code: classroom.institution_code,
    district: classroom.district, ugel: classroom.ugel, teacher_name: classroom.teacher_name,
    classroom_section: classroom.section, age: classroom.age, school_year: classroom.year,
    starts_on: classroom.calendar.starts_on, ends_on: classroom.calendar.ends_on,
    calendar: classroom.calendar,
    student_count: classroom.context_v4?.students_total ?? null,
    diagnostic_group: classroom.diagnostic_group ?? null,
    group_interests: classroom.context_v4?.common_interests?.map((item) => item.label) ?? [],
  } : {});
  const documentContext = existingPlan?.status === "draft" && classroom
    ? { ...savedDocumentContext, calendar: classroom.calendar } : savedDocumentContext;

  useEffect(() => {
    let live = true;
    const get = async <T,>(path: string, error: string): Promise<T> => {
      const response = await fetch(`${localDatabaseApiUrl}${path}`);
      if (!response.ok) throw new Error(error);
      return response.json() as Promise<T>;
    };
    Promise.all([
      get<{ competencies?: AIActivityCompetencyOption[] }>("/api/ai/competency-options?workflow=annual_plan", "No se pudieron cargar las competencias."),
      get<PlansResponse>("/api/annual-plans/current", "No se pudo cargar el plan anual."),
      get<ClassroomContext>("/api/ai/annual-plan/context", "No se pudo cargar el contexto del aula."),
    ]).then(([options, plans, context]) => {
      if (!live) return;
      const saved = plans.draft ?? plans.active ?? plans.archived?.[0] ?? null;
      setCompetencies(options.competencies ?? []);
      setExistingPlan(saved); setClassroom(context);
      setCalendarDraft(context.calendar);
      setProposal(saved?.proposal ?? null); setPlanId(saved?.id ?? null);
      setGeneratedHeader(null); setGenerationId(null); setReplacementPlanId(null); setEditing(false);
      setLoadError(false); setMessage("");
    }).catch(() => { if (live) { setLoadError(true); setMessage("No se pudo cargar el plan anual. Inténtalo nuevamente."); setMessageTone("error"); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [reload]);

  async function saveCalendar() {
    if (!calendarDraft || !classroom || operation || readOnly) return;
    setOperation("calendar"); setMessage("");
    try {
      const response = await fetch(`${localDatabaseApiUrl}/api/annual-calendar`, { method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blocks: calendarDraft.blocks, initial_stage: calendarDraft.initial_stage }) });
      const data = await response.json() as { calendar?: AnnualCalendar; error?: string };
      if (!response.ok || !data.calendar) throw new Error(data.error ?? "No se pudo guardar el calendario.");
      setClassroom({ ...classroom, calendar: data.calendar }); setCalendarDraft(data.calendar);
      setExistingPlan((current) => current?.status === "draft" ? { ...current,
        document_context: { ...current.document_context, calendar: data.calendar } } : current);
      setMessage("Calendario guardado. Ya puedes preparar tu plan anual."); setMessageTone("success");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar el calendario."); setMessageTone("error"); }
    finally { setOperation(null); }
  }

  async function generate() {
    if (operation || loading || loadError || (existingPlan && !canReplaceLegacy) || calendarDirty || calendarWarning || !classroom?.diagnostic_summary) return;
    setOperation("generate"); setMessage("");
    try {
      const replacingId = canReplaceLegacy ? existingPlan!.id : null;
      const response = await fetch(`${localDatabaseApiUrl}/api/ai/annual-plan/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ teacherRequest: teacherRequest.trim(), ...(replacingId ? { replacementPlanId: replacingId } : {}) }) });
      const data = await response.json() as GeneratedResponse;
      if (!response.ok || !data.proposal || !data.generation_id) throw new Error(data.error ?? "No pudimos generar una propuesta válida.");
      setProposal(data.proposal); setGeneratedHeader(data.document_context ?? null);
      setGenerationId(data.generation_id); setPlanId(null); setReplacementPlanId(replacingId); setExistingPlan(null); setEditing(false);
      setMessage("Tu propuesta está lista. Léela, corrige lo necesario y guarda el borrador."); setMessageTone("success");
    } catch (error) {
      setMessage(error instanceof TypeError ? "No se pudo conectar con el servidor local. Comprueba que la app esté iniciada." : error instanceof Error ? error.message : "No pudimos preparar el plan anual."); setMessageTone("error");
    } finally { setOperation(null); }
  }
  async function save() {
    if (!proposal || operation || readOnly || calendarDirty || calendarWarning) return;
    setOperation("save"); setMessage("");
    try {
      const response = await fetch(`${localDatabaseApiUrl}/api/annual-plans`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ proposal, planId, generationId, ...(replacementPlanId ? { replacementPlanId } : {}) }) });
      const data = await response.json() as { error?: string; id?: string; version?: number };
      if (!response.ok || !data.id) throw new Error(data.error ?? "No se pudo guardar el borrador.");
      setPlanId(data.id); setExistingPlan({ id: data.id, classroom_id: classroom!.id, version: data.version ?? existingPlan?.version ?? 1,
        status: "draft", proposal, document_context: documentContext });
      setGenerationId(null); setReplacementPlanId(null); setEditing(false);
      setMessage("Borrador guardado. Léelo una vez más y confírmalo cuando estés conforme."); setMessageTone("success");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar el borrador."); setMessageTone("error"); }
    finally { setOperation(null); }
  }
  async function confirm() {
    if (!planId || !proposal || operation || readOnly || hasUnsavedChanges || calendarDirty || calendarWarning) return;
    setOperation("confirm"); setMessage("");
    try {
      const response = await fetch(`${localDatabaseApiUrl}/api/annual-plans/${planId}/confirm`, { method: "POST" });
      const data = await response.json() as { error?: string; version?: number };
      if (!response.ok) throw new Error(data.error ?? "No se pudo confirmar el plan.");
      setExistingPlan({ id: planId, classroom_id: classroom!.id, version: data.version ?? existingPlan?.version ?? 1,
        status: "active", proposal, document_context: documentContext });
      setEditing(false); setMessage("Plan anual confirmado por la docente."); setMessageTone("success"); onConfirmed?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo confirmar el plan."); setMessageTone("error"); }
    finally { setOperation(null); }
  }

  return <section className="ayni-workflow space-y-5">
    <header><p className="text-sm font-semibold text-[#087d96]">Paso 4 de 6 · Plan anual</p><h1 className="text-3xl font-extrabold">Plan anual</h1><p className="mt-2 text-muted-foreground">Un plan para este año escolar. Tú decides qué conservar y confirmas el resultado.</p></header>
    {loading && <LoadingState label="Cargando planificación anual..." />}
    {loadError && <Button variant="outline" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Reintentar carga</Button>}
    {message && <WorkflowFeedback tone={messageTone}>{message}</WorkflowFeedback>}
    {!loading && !loadError && !proposal && classroom && <section className="rounded-3xl border border-[#d6e5ef] bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e8f6fa] text-[#087d96]"><BookOpen /></span><div><h2 className="text-xl font-extrabold">Antes de preparar tu plan</h2><p className="mt-1 text-sm text-[#526b87]">Comprueba que estos datos sean los de tu aula. Ayni los usará para crear el borrador.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[#f2f8fc] p-4"><p className="text-xs font-bold text-[#526b87]">COLEGIO Y DOCENTE</p><p className="mt-2 font-bold">{classroom.institution_name || "Colegio sin completar"}</p><p className="text-sm">{classroom.teacher_name || "Docente sin completar"}</p></div>
        <div className="rounded-xl bg-[#f2f8fc] p-4"><p className="text-xs font-bold text-[#526b87]">AULA Y AÑO</p><p className="mt-2 font-bold">{classroom.age} años · {classroom.section}</p><p className="text-sm">{classroom.year} · Clases: {teachingRange}</p></div></div>
      <div className="mt-3 rounded-xl border border-[#d6e5ef] p-4"><p className="font-bold">Lo que conocemos del grupo</p><p className="mt-1 text-sm text-[#526b87]">{classroom.context_v4?.confirmed_interviews ?? 0} de {classroom.context_v4?.students_total ?? 0} entrevistas confirmadas. Se usarán solo patrones grupales, sin respuestas individuales.</p>
        {classroom.diagnostic_summary ? <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{classroom.diagnostic_summary}</p> : <p className="mt-3 text-sm font-semibold text-[#9a6220]">Confirma primero el resumen diagnóstico del aula para preparar el plan.</p>}
        {Boolean(classroom.context_v4?.common_interests?.length) && <p className="mt-2 text-sm"><span className="font-semibold">Intereses frecuentes:</span> {classroom.context_v4!.common_interests.map((item) => item.label).join(", ")}.</p>}
        {Boolean(classroom.available_resources?.length) && <p className="mt-2 text-sm"><span className="font-semibold">Materiales disponibles:</span> {classroom.available_resources?.join(", ")}.</p>}
      </div>
      {calendarDraft && <AnnualCalendarEditor calendar={calendarDraft} onChange={setCalendarDraft} onSave={() => void saveCalendar()} saving={operation === "calendar"} />}
      {calendarDirty && <p className="mt-2 text-sm font-semibold text-[#9a6220]">Guarda el calendario antes de preparar el plan.</p>}
      {calendarWarning && <p className="mt-2 rounded-xl border border-[#f0c2b8] bg-[#fff4f2] p-3 text-sm font-semibold text-[#9a392d]">{calendarWarning} Ajusta la etapa inicial o las interrupciones del calendario para que quepan doce proyectos.</p>}
      <label className="mt-4 block font-semibold">¿Hay algo que quieras tener en cuenta? <span className="text-sm font-normal text-[#526b87]">Opcional</span>
        <Textarea className="mt-2 bg-white" value={teacherRequest} onChange={(event) => setTeacherRequest(event.target.value)} placeholder="Por ejemplo: este año queremos aprovechar el huerto del colegio." />
      </label>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"><AsyncButton className="min-h-12 w-full sm:w-auto" busy={operation === "generate"} busyLabel="Preparando tu plan anual..." disabled={Boolean(operation) || calendarDirty || Boolean(calendarWarning) || !classroom.diagnostic_summary} onClick={() => void generate()}>Preparar mi plan anual <ArrowRight /></AsyncButton>
        {!classroom.diagnostic_summary && onGoDiagnostic && <Button variant="outline" className="min-h-12 w-full sm:w-auto" onClick={onGoDiagnostic}>Ir a evaluación diagnóstica</Button>}</div>
      <p className="mt-3 text-xs text-[#526b87]">La propuesta se mostrará como documento para que puedas revisarla. Nada se confirma automáticamente.</p>
    </section>}
    {operation === "generate" && <GenerationProgress label="Preparando tu plan anual" description="Ayni organiza doce propuestas de proyecto y después completa sus detalles. Puede tardar varios minutos. Mantén esta pantalla abierta." />}
    {proposal && <>
      {canReplaceLegacy && <div className="rounded-2xl border border-[#e9d6a7] bg-[#fff8e9] p-4">
        <p className="font-bold text-[#694717]">Este plan se creó con el formato anterior</p>
        <p className="mt-1 text-sm text-[#694717]">Contiene seis experiencias y usa la plantilla antigua. Puedes preparar una nueva versión con doce propuestas y la plantilla actual. El plan confirmado seguirá vigente hasta que revises y confirmes la nueva versión.</p>
        <AsyncButton className="mt-3 min-h-11" busy={operation === "generate"} busyLabel="Preparando nueva versión..." disabled={Boolean(operation) || calendarDirty || Boolean(calendarWarning) || !classroom?.diagnostic_summary} onClick={() => void generate()}>Preparar versión actualizada <ArrowRight /></AsyncButton>
      </div>}
      {existingPlan && <p className="rounded-xl border border-[#d6e5ef] bg-white p-3 text-sm font-semibold">{existingPlan.status === "active" ? "Plan anual confirmado" : existingPlan.status === "draft" ? "Borrador de tu plan anual" : "Plan anual anterior"} · año {proposal.school_year}{readOnly && existingPlan.status === "draft" ? " · pertenece a otra aula de tu cuenta" : ""}</p>}
      {existingPlan?.status === "draft" && !readOnly && calendarDraft && <AnnualCalendarEditor calendar={calendarDraft} onChange={setCalendarDraft} onSave={() => void saveCalendar()} saving={Boolean(operation)} />}
      {existingPlan?.status === "draft" && calendarDirty && <p className="rounded-xl border border-[#e9d6a7] bg-[#fff8e9] p-3 text-sm font-semibold">Guarda el calendario antes de guardar o confirmar el plan.</p>}
      {existingPlan?.status === "draft" && calendarWarning && <p className="rounded-xl border border-[#f0c2b8] bg-[#fff4f2] p-3 text-sm font-semibold text-[#9a392d]">{calendarWarning} Ajusta las interrupciones o la duración de los proyectos antes de confirmar.</p>}
      {editing && !readOnly ? <><Button variant="outline" className="min-h-11" onClick={() => setEditing(false)}><ArrowLeft /> Ver documento</Button><AnnualPlanEditor proposal={proposal} setProposal={setProposal} competencies={competencies} disabled={Boolean(operation)} /></>
        : <AnnualPlanDocument proposal={proposal} context={documentContext} competencies={competencies} status={existingPlan?.status ?? "preview"} />}
      {!readOnly && <div className="flex flex-col gap-3 rounded-2xl border border-[#d6e5ef] bg-white p-4 sm:flex-row sm:flex-wrap sm:items-center">
        {hasUnsavedChanges ? <AsyncButton className="min-h-12 w-full sm:w-auto" busy={operation === "save"} busyLabel="Guardando..." disabled={Boolean(operation) || calendarDirty || Boolean(calendarWarning)} onClick={() => void save()}>{planId ? "Guardar cambios" : "Guardar borrador"} <ArrowRight /></AsyncButton>
          : !editing && <AsyncButton className="min-h-12 w-full sm:w-auto" busy={operation === "confirm"} busyLabel="Confirmando..." disabled={Boolean(operation) || !planId || calendarDirty || Boolean(calendarWarning)} onClick={() => void confirm()}>Confirmar mi plan anual <ArrowRight /></AsyncButton>}
        {!editing && <Button variant="outline" className="min-h-12 w-full sm:w-auto" disabled={Boolean(operation)} onClick={() => { setProposal(completeDocumentFields(proposal)); setEditing(true); }}><Pencil /> Corregir contenido</Button>}
        {hasUnsavedChanges && planId && <p className="w-full text-sm text-[#526b87]">Guarda los cambios antes de confirmar.</p>}
      </div>}
    </>}
  </section>;
}
