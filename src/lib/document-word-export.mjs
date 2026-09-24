import { AlignmentType, Document, Footer, HeadingLevel, ImageRun, PageNumber, Packer, Paragraph, TextRun } from "docx";
import { buildAnnualPlanPresentation } from "./annual-plan-presentation.mjs";
import { loadDiagnosticWordContext, loadSavedDocument } from "./document-library-service.mjs";
import { renderAnnualPlanTemplateWord } from "./annual-plan-template-word.mjs";
import { renderAnnualPlanRedesignedWord } from "./annual-plan-redesigned-word.mjs";
import { renderAnnualPlanFlexibleWord } from "./annual-plan-flexible-word.mjs";
import { ANNUAL_PLAN_LEGACY_TEMPLATE_FORMAT, ANNUAL_PLAN_TEMPLATE_FORMAT } from "./annual-plan-contract.mjs";
import { renderDiagnosticReportWord } from "./diagnostic-report-word.mjs";
import { renderDiagnosticUnifiedWord } from "./diagnostic-unified-word.mjs";
import { renderAnnualPlanUnifiedWord } from "./annual-plan-unified-word.mjs";
import { renderLearningExperienceUnifiedWord } from "./learning-experience-unified-word.mjs";
import { renderActivityUnifiedWord } from "./activity-unified-word.mjs";

const clean = (value) => typeof value === "string" ? value.trim() : "";
const lines = (value) => Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
const dateLabel = (value) => {
  const match = clean(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
};
const statusLabel = (status) => status === "active" || status === "confirmed" ? "Confirmado por la docente" :
  status === "archived" ? "Versión anterior" : "Borrador por revisar";
const typeLabel = (document) => ({ annual_plan: "Plan anual", diagnostic_summary: "Resumen diagnóstico del aula",
  experience: document.subtype === "project" ? "Proyecto" : "Unidad", activity: "Actividad",
  family_report: "Informe a la familia" })[document.kind] ?? "Documento";

/** The filename has no student name or teacher-controlled text. */
export function wordFilenameFor(document) {
  const kind = ({ annual_plan: "plan-anual", diagnostic_summary: "diagnostico-aula", experience: document.subtype === "project" ? "proyecto" : "unidad",
    activity: "actividad", family_report: "informe-familia" })[document.kind] ?? "documento";
  return `${kind}-${Number(document.school_year) || "sin-anio"}-${String(document.id ?? "").slice(-8)}.docx`;
}

function bodyParagraph(value) {
  return new Paragraph({ text: value, style: "Normal", spacing: { after: 130, line: 300 }, widowControl: true });
}
function heading(value, level = 1) {
  return new Paragraph({ text: value, heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    keepNext: true });
}
function bullet(value) {
  return new Paragraph({ text: value, bullet: { level: 0 }, spacing: { after: 65, line: 285 }, widowControl: true });
}
function labelled(label, value) {
  if (!clean(value)) return [];
  return [new Paragraph({ style: "Normal", children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(clean(value))],
    spacing: { after: 100, line: 285 }, widowControl: true })];
}
function section(title, value, level = 1) {
  const paragraphs = Array.isArray(value) ? lines(value).map(bullet) : clean(value).split(/\r?\n/).map(clean).filter(Boolean).map(bodyParagraph);
  return paragraphs.length ? [heading(title, level), ...paragraphs] : [];
}
function named(ids, names) {
  return lines(ids).map((id) => names.get(id) ?? id);
}
function contentForAnnual(document, names) {
  const source = document.content ?? {};
  const proposal = {
    title: document.title, school_year: String(document.school_year), general_context_summary: "", planning_priorities: [],
    competency_overview: [], proposed_experiences: [], review_checkpoints: [], flexibility_notes: "", ...source,
    school_year: String(document.school_year), title: document.title,
  };
  for (const key of ["planning_priorities", "competency_overview", "proposed_experiences", "review_checkpoints"]) {
    if (!Array.isArray(proposal[key])) proposal[key] = [];
  }
  proposal.proposed_experiences = proposal.proposed_experiences.filter((item) => item && typeof item === "object")
    .map((item) => ({ ...item, primary_competency_ids: lines(item.primary_competency_ids),
      possible_secondary_competency_ids: lines(item.possible_secondary_competency_ids),
      expected_evidence_categories: lines(item.expected_evidence_categories) }));
  const presented = buildAnnualPlanPresentation(proposal, document.document_context ?? {}, [...names].map(([id, name]) => ({ id, name })));
  const header = presented.header;
  const children = [
    ...labelled("Código de la institución", header.institutionCode),
    ...labelled("Distrito", header.district), ...labelled("UGEL", header.ugel),
    ...labelled("Edad", header.age ? `${header.age} años` : ""),
    ...labelled("Docente", header.teacher), ...labelled("Período", header.dates.join(" al ")),
    ...(header.studentCount == null ? [] : labelled("Niños del aula", String(header.studentCount))),
    ...section("Nuestro punto de partida", presented.context),
    ...section("Fortalezas observadas", presented.diagnostic.strengths),
    ...section("Dónde acompañar más", presented.diagnostic.needs),
    ...section("Intereses del grupo", presented.diagnostic.interests),
    ...section("Propósitos del año", presented.annualPurposes),
    ...section("Decisiones para empezar", presented.priorities),
    ...section("Competencias y oportunidades", presented.competencyOverview),
  ];
  if (presented.competencyMap.length) {
    children.push(heading("Mapa de competencias", 2));
    for (const entry of presented.competencyMap) children.push(...labelled(entry.name, entry.opportunities.join("; ")));
  }
  if (presented.experiences.length) children.push(heading("Ruta de experiencias del año"));
  for (const experience of presented.experiences) {
    children.push(heading(`${experience.typeLabel} ${experience.number}  ${experience.title}`, 2));
    children.push(...labelled("Período", experience.period), ...section("Propósito", experience.rationale, 2),
      ...section("Punto de partida", experience.context_or_trigger, 2),
      ...section("Competencias principales", experience.primaryCompetencies, 2),
      ...section("Otras competencias posibles", experience.secondaryCompetencies, 2),
      ...section("Qué podríamos observar", experience.expected_evidence_categories, 2),
      ...section("Cómo ajustarla", experience.flexibility_notes, 2));
  }
  children.push(...section("Durante el juego y las experiencias", presented.teachingStrategies),
    ...section("Apoyos para que todos participen", presented.inclusiveSupports),
    ...section("Cómo observaremos el avance", presented.assessmentFollowup),
    ...section("Cómo colaboraremos con las familias", presented.familyCollaboration),
    ...section("Cuándo revisaremos el plan", presented.checkpoints),
    ...section("Cómo podremos ajustarlo", presented.flexibility));
  return children;
}

function contentForDiagnostic(document) {
  const value = document.content ?? {};
  return [...section("Fortalezas del grupo", value.strengths), ...section("Dónde acompañar más", value.needs),
    ...section("Qué tendremos en cuenta al planificar", value.planning_priorities)];
}

function contentForExperience(document, names) {
  const value = document.content ?? {};
  const isProject = document.subtype === "project";
  const pathways = value[isProject ? "possible_pathways" : "proposed_situations"];
  const children = [
    ...labelled("Período", [dateLabel(document.starts_on), dateLabel(document.ends_on)].filter(Boolean).join(" al ")),
    ...section("Para qué la haremos", value.purpose), ...section("Nuestro punto de partida", value.starting_point),
    ...section(isProject ? "Qué despertó el interés" : "Qué necesita el grupo", isProject ? value.trigger_or_interest : value.learning_need_or_context),
    ...section("Competencias principales", named(value.primary_competency_ids, names)),
    ...section("Otras competencias posibles", named(value.possible_secondary_competency_ids, names)),
  ];
  if (Array.isArray(pathways) && pathways.length) children.push(heading(isProject ? "Posibles caminos" : "Situaciones propuestas"));
  for (const path of Array.isArray(pathways) ? pathways : []) {
    children.push(heading(clean(path?.title) || "Propuesta", 2),
      ...section("Intención pedagógica", path?.pedagogical_intention, 2),
      ...section("Qué podrían hacer los niños", path?.possible_child_actions, 2));
  }
  children.push(...section("Espacios y materiales", value.spaces_and_materials),
    ...section("Qué podríamos observar", value.evidence_opportunities),
    ...section("Familias y comunidad", value.family_or_community_links),
    ...section("Cuándo ajustar", value.adjustment_points),
    ...section("Cómo adaptarla", value.flexibility_notes));
  return children;
}

function contentForActivity(document, names) {
  const value = document.content ?? {};
  return [
    ...labelled("Experiencia", document.experience_title), ...labelled("Fecha", dateLabel(document.occurs_on)),
    ...section("Propósito", value.purpose), ...section("Situación para los niños", value.meaningful_situation),
    ...section("Antes de empezar", value.teacher_preparation), ...section("Materiales", value.materials),
    ...section("Qué harán los niños", value.child_actions), ...section("Cómo acompañaré", value.mediation),
    ...section("Qué podré observar", value.evidence_opportunities),
    ...section("Cierre o continuidad", value.closure_or_continuity),
    ...(clean(value.competency_id) ? section("Competencia confirmada", names.get(value.competency_id) ?? value.competency_id) : []),
  ];
}

function contentForFamilyReport(document, names) {
  const value = document.content ?? {};
  const children = [
    ...labelled("Período de evaluación", document.period_label || "Informe histórico sin período formal"),
    ...labelled("Período", [dateLabel(document.period_start), dateLabel(document.period_end)].filter(Boolean).join(" al ")),
    ...section("Para la familia", value.introduction),
  ];
  for (const report of Array.isArray(value.sections) ? value.sections : []) {
    children.push(heading(names.get(clean(report?.competency_id)) ?? "Aprendizajes observados", 2),
      ...section("Avances", report?.progress_summary, 2),
      ...section("Ejemplos observados", report?.examples, 2),
      ...section("Qué ayudó", report?.support_or_conditions, 2),
      ...section("Próximos pasos", report?.next_steps, 2),
      ...section("En casa", report?.family_suggestions, 2),
      ...section("Información por completar", report?.insufficiency_note, 2));
  }
  children.push(...section("Para seguir acompañando", value.closing_note));
  return children;
}

/** Render only the authorized, presentable projection returned by loadSavedDocument. */
export async function renderSavedDocumentWord(document, competencyCards = [], { logo = null } = {}) {
  if (!document || !["annual_plan", "diagnostic_summary", "experience", "activity", "family_report"].includes(document.kind)) {
    throw new Error("Documento no disponible para Word.");
  }
  if (document.kind === "annual_plan" && document.document_context?.template_version === "annual-unified-v1")
    return renderAnnualPlanUnifiedWord(document, competencyCards, { logo });
  if (document.kind === "annual_plan") return document.content?.plan_format === ANNUAL_PLAN_TEMPLATE_FORMAT
    ? renderAnnualPlanFlexibleWord(document, competencyCards, { logo })
    : document.content?.plan_format === ANNUAL_PLAN_LEGACY_TEMPLATE_FORMAT
      ? renderAnnualPlanRedesignedWord(document, competencyCards, { logo })
      : renderAnnualPlanTemplateWord(document, competencyCards, { logo });
  if (document.kind === "experience" && document.content?.document_template_version === "experience-unified-v1")
    return renderLearningExperienceUnifiedWord(document, competencyCards, { logo });
  if (document.kind === "activity" && document.content?.document_template_version === "activity-unified-v1")
    return renderActivityUnifiedWord(document, competencyCards, { logo });
  const names = new Map(competencyCards.map((card) => [card.id, card.name]));
  const detail = document.kind === "annual_plan" ? contentForAnnual(document, names) :
    document.kind === "diagnostic_summary" ? contentForDiagnostic(document) :
    document.kind === "experience" ? contentForExperience(document, names) :
    document.kind === "activity" ? contentForActivity(document, names) : contentForFamilyReport(document, names);
  const doc = new Document({
    title: clean(document.title), subject: typeLabel(document), creator: "Ayni Aula",
    styles: { paragraphStyles: [{ id: "Normal", name: "Normal", run: { font: "Aptos", size: 22, color: "000000" },
      paragraph: { spacing: { after: 120, line: 285 } } }], default: {
      document: { run: { font: "Aptos", size: 22, color: "000000" }, paragraph: { spacing: { after: 120, line: 285 } } },
      title: { run: { font: "Aptos Display", size: 34, bold: true, color: "000000" }, paragraph: { spacing: { after: 180 }, keepNext: true } },
      heading1: { run: { font: "Aptos Display", size: 26, bold: true, color: "000000" }, paragraph: { spacing: { before: 280, after: 100 }, keepNext: true } },
      heading2: { run: { font: "Aptos", size: 23, bold: true, color: "000000" }, paragraph: { spacing: { before: 220, after: 80 }, keepNext: true } },
      listParagraph: { run: { font: "Aptos", size: 22, color: "000000" }, paragraph: { spacing: { after: 65, line: 285 } } },
    } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Ayni Aula  ·  Página ", size: 18, color: "444444" }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "444444" })] })] }) },
      children: [
        ...(logo ? [new Paragraph({ alignment: AlignmentType.LEFT, children: [new ImageRun({ data: logo,
          transformation: { width: 96, height: 96 }, type: "png" })] })] : []),
        new Paragraph({ text: clean(document.title) || typeLabel(document), heading: HeadingLevel.TITLE, keepNext: true }),
        bodyParagraph(`${typeLabel(document)}  ·  ${statusLabel(document.status)}`),
        ...labelled("Año escolar", String(document.school_year ?? "")),
        ...(Number(document.version) > 1 ? labelled("Versión", String(document.version)) : []),
        ...labelled("Institución educativa", document.institution_name ?? document.document_context?.institution_name),
        ...labelled("Aula", document.classroom),
        ...(document.kind === "family_report" ? labelled("Docente",document.teacher_name) : []),
        ...detail,
      ],
    }],
  });
  return Packer.toBuffer(doc);
}

/** Authorization runs again for every download, independently of the list/detail UI. */
export async function prepareWordDownload(db, teacherId, kind, id, competencyCards = [], options = {}) {
  const document = await loadSavedDocument(db, teacherId, kind, id);
  if (!document) return null;
  if (kind === "diagnostic_summary") {
    const context = await loadDiagnosticWordContext(db, teacherId, id);
    if (!context) return null;
    return { filename: wordFilenameFor(document),
      buffer: document.content?.document_format === "diagnostic-unified-v1"
        ? await renderDiagnosticUnifiedWord(document, context, competencyCards, options)
        : await renderDiagnosticReportWord(document, context, competencyCards, options) };
  }
  return { filename: wordFilenameFor(document), buffer: await renderSavedDocumentWord(document, competencyCards, options) };
}
