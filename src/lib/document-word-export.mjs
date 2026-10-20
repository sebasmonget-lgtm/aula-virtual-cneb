import { renderAnnualJourneyWord } from "./annual-journey-word.mjs";
import { AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, PageNumber, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
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
import { renderFamilyReportWord } from "./family-report-word.mjs";

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
  family_report: "Informe a la familia", period_closure: "Cierre de evaluación" })[document.kind] ?? "Documento";

/** A compact identification block leaves room for the teacher's actual report. */
function reportIdentification(document) {
  const values = [
    ["Institución educativa", document.institution_name ?? document.document_context?.institution_name],
    ["Aula", document.classroom], ["Docente", document.teacher_name],
    ["Edad", (document.age ?? document.age_years) ? `${document.age ?? document.age_years} años` : ""],
    ["Año escolar", String(document.school_year ?? "")],
    ["Período", [document.period_label ?? document.content?.period?.label ?? (document.kind === "family_report" ? "Informe histórico sin período formal" : ""),
      [dateLabel(document.period_start),dateLabel(document.period_end)].filter(Boolean).join(" al ")].filter(Boolean).join(" · ")],
  ].filter(([,value])=>clean(value));
  const border = { style: BorderStyle.SINGLE, size: 4, color: "D1E2EA" };
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [4819,4819],
    borders: {top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border},
    rows: Array.from({length:Math.ceil(values.length/2)},(_,index)=>new TableRow({children:[0,1].map(offset=>{
      const value=values[index*2+offset];
      return new TableCell({width:{size:4819,type:WidthType.DXA},shading:{fill:index%2?"F0F8F2":"EDF6FB"},
        margins:{top:100,bottom:100,left:160,right:160},children:[new Paragraph({spacing:{after:0,line:270},children:value?[
          new TextRun({text:`${value[0]}: `,bold:true}),new TextRun(value[1]),
        ]:[]})]});
    })})),
  });
}

/** The filename has no student name or teacher-controlled text. */
export function wordFilenameFor(document) {
  const kind = ({ annual_plan: "plan-anual", diagnostic_summary: "diagnostico-aula", experience: document.subtype === "project" ? "proyecto" : "unidad",
    activity: "actividad", family_report: "informe-familia", period_closure: "cierre-periodo" })[document.kind] ?? "documento";
  return `${kind}-${Number(document.school_year) || "sin-anio"}-${String(document.id ?? "").slice(-8)}.docx`;
}

function bodyParagraph(value) {
  return new Paragraph({ text: value, style: "Normal", spacing: { after: 100, line: 285 }, widowControl: true });
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

function contentForPeriodClosure(document,names){
  const entries=document.content.entries??[],pending=document.content.pending_entries??[];
  const cell=children=>new TableCell({margins:{top:150,bottom:140,left:170,right:170},children});
  const border={style:BorderStyle.SINGLE,size:4,color:'D1E2EA'};
  const table=rows=>new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:{top:border,bottom:border,left:border,right:border,insideHorizontal:border},rows});
  const children=[bodyParagraph('Exportación del cierre confirmado. Conserva las valoraciones y conclusiones guardadas; no es una plantilla oficial adicional.')];
  if(entries.length)children.push(table(entries.map(entry=>new TableRow({cantSplit:true,children:[cell([
    new Paragraph({spacing:{after:90},children:[new TextRun({text:entry.student_name,bold:true,color:'086C7C',size:25})]}),
    ...labelled('Competencia',names.get(entry.competency_id)??entry.competency_id),
    ...labelled('Nivel confirmado',entry.achievement_level),
    ...labelled('Conclusión confirmada',entry.conclusion_details?.conclusion_text??entry.conclusion_details?.conclusion??entry.conclusion_details?.text),
    ...(entry.evidence?.length?[new Paragraph({spacing:{after:60},children:[new TextRun({text:'Evidencia del cierre',bold:true})]}),...entry.evidence.map(e=>bullet(`${e.observed_on}: ${e.observation_text??''}`))]:[]),
  ])]}))));
  if(pending.length)children.push(heading('Pendientes declarados en el cierre'),table(pending.map(entry=>new TableRow({cantSplit:true,children:[cell([bodyParagraph(`${entry.student_name} · ${names.get(entry.competency_id)??entry.competency_id}: ${entry.reason??entry.state}`)])]}))));
  return children;
}

/** Render only the authorized, presentable projection returned by loadSavedDocument. */
export async function renderSavedDocumentWord(document, competencyCards = [], { logo = null, studentPhoto = null } = {}) {
  if (!document || !["annual_plan", "diagnostic_summary", "experience", "activity", "family_report", "period_closure"].includes(document.kind)) {
    throw new Error("Documento no disponible para Word.");
  }
  if (document.kind === 'family_report') return renderFamilyReportWord(document,competencyCards,{logo,studentPhoto});
  if (document.kind === "annual_plan" && document.content?.journey_version === 2) return renderAnnualJourneyWord(document, competencyCards, {logo});
  if (document.kind === "annual_plan" && document.source_plan_format === "annual_preplan_v1" && !document.formal_ready)
    throw new Error("El Word de esta versión se está preparando. Inténtalo nuevamente cuando esté listo.");
  if (document.kind === "annual_plan" && document.document_context?.template_version === "annual-unified-v1")
    return renderAnnualPlanUnifiedWord(document, competencyCards, { logo });
  if (document.kind === "annual_plan") return document.content?.plan_format === ANNUAL_PLAN_TEMPLATE_FORMAT
    ? renderAnnualPlanFlexibleWord(document, competencyCards, { logo })
    : document.content?.plan_format === ANNUAL_PLAN_LEGACY_TEMPLATE_FORMAT
      ? renderAnnualPlanRedesignedWord(document, competencyCards, { logo })
      : renderAnnualPlanTemplateWord(document, competencyCards, { logo });
  if (document.kind === "experience" && document.content?.document_template_version === "experience-unified-v2" && !document.formal_ready)
    throw new Error("Prepara primero el Word desde el proyecto confirmado.");
  if (document.kind === "experience" && ["experience-unified-v1", "experience-unified-v2"].includes(document.content?.document_template_version))
    return renderLearningExperienceUnifiedWord(document, competencyCards, { logo });
  if (document.kind === "activity" && ["activity-unified-v1", "activity-with-workshop-v1"].includes(document.content?.document_template_version))
    return renderActivityUnifiedWord(document, competencyCards, { logo });
  if(document.kind==='activity'&&document.activity_v3)return renderActivityUnifiedWord({...document,content:{...document.content,document_template_version:document.workshop?'activity-with-workshop-v1':'activity-unified-v1'}},competencyCards,{logo});
  const names = new Map(competencyCards.map((card) => [card.id, card.name]));
  const detail = document.kind === "annual_plan" ? contentForAnnual(document, names) :
    document.kind === "diagnostic_summary" ? contentForDiagnostic(document) :
    document.kind === "experience" ? contentForExperience(document, names) :
    document.kind === "activity" ? contentForActivity(document, names) : contentForPeriodClosure(document,names);
  const polishedReport = ["period_closure", "experience", "activity", "diagnostic_summary"].includes(document.kind);
  const font = polishedReport ? "Poppins" : "Aptos";
  const ink = polishedReport ? "173352" : "000000";
  const doc = new Document({
    title: clean(document.title), subject: typeLabel(document), creator: "Ayni Aula",
    styles: { paragraphStyles: [{ id: "Normal", name: "Normal", run: { font, size: 22, color: ink },
      paragraph: { spacing: { after: 120, line: 285 } } }], default: {
      document: { run: { font, size: 22, color: ink }, paragraph: { spacing: { after: 120, line: 285 } } },
      title: { run: { font: polishedReport ? font : "Aptos Display", size: 34, bold: true, color: ink }, paragraph: { spacing: { after: 180 }, keepNext: true } },
      heading1: { run: { font: polishedReport ? font : "Aptos Display", size: 26, bold: true, color: ink }, paragraph: { spacing: { before: 160, after: 70 }, keepNext: true,...(polishedReport?{shading:{fill:"E7F3F4"}}:{}) } },
      heading2: { run: { font, size: 23, bold: true, color: polishedReport ? "086C7C" : ink }, paragraph: { spacing: { before: 140, after: 70 }, keepNext: true } },
      listParagraph: { run: { font, size: 22, color: ink }, paragraph: { spacing: { after: 65, line: 285 } } },
    } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      ...(polishedReport ? { headers: { default: new Header({children:[new Paragraph({spacing:{after:90},border:{bottom:{style:BorderStyle.SINGLE,size:8,color:"B4DCD6"}},children:[new TextRun({text:"Ayni Aula",bold:true,color:"086C7C",size:21}),new TextRun({text:`   ·   ${typeLabel(document)}`,color:ink,size:18})]})]}) } } : {}),
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Ayni Aula  ·  Página ", size: 18, color: "444444" }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "444444" })] })] }) },
      children: [
        ...(logo ? [new Paragraph({ alignment: AlignmentType.LEFT, children: [new ImageRun({ data: logo,
          transformation: { width: 96, height: 96 }, type: "png" })] })] : []),
        new Paragraph({ text: clean(document.title) || typeLabel(document), heading: HeadingLevel.TITLE, keepNext: true }),
        bodyParagraph(`${typeLabel(document)}  ·  ${statusLabel(document.status)}`),
        ...(polishedReport ? [reportIdentification(document),new Paragraph({spacing:{after:70}})] : labelled("Año escolar", String(document.school_year ?? ""))),
        ...(Number(document.version) > 1 ? labelled("Versión", String(document.version)) : []),
        ...(!polishedReport ? [...labelled("Institución educativa", document.institution_name ?? document.document_context?.institution_name),...labelled("Aula", document.classroom)] : []),
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
  if(kind==="family_report"&&options.photoStorage){
    const student=(await db.query(`select s.profile_photo_path from students s join classrooms c on c.id=s.classroom_id where s.id=$1 and c.teacher_id=$2`,[document.student_id,teacherId])).rows[0];
    if(student?.profile_photo_path){const photo=await options.photoStorage.read(student.profile_photo_path,{teacherId,studentId:document.student_id});options={...options,studentPhoto:photo};}
  }
  return { filename: wordFilenameFor(document), buffer: await renderSavedDocumentWord(document, competencyCards, options) };
}
