import { activityPedagogicalBlocks } from "./pedagogical-blocks.mjs";
import { activityObservationCriteria } from "./activity-observation-plan.mjs";
import { ageReference } from "./pedagogical-word-presentation.mjs";
import path from "node:path";
import { expandTableRow, insertCoverQuickView, removePageBreakAfterTable, removeParagraphsContaining, renderUnifiedWord, replaceWordText, xmlEscape } from "./unified-word-template.mjs";
import { availableSheets, renderSheetPages } from "./workshop-sheet-catalog.mjs";
import { activityReadingStages } from "./activity-reading-content.mjs";
import { guidePanel, guideText, guideParagraph, guideDetails, keepShortTableTogether, retainCoverPageBreak } from "./teacher-guide-word-layout.mjs";

const oldTemplateUrl = path.join(process.cwd(), "assets/templates/actividad-aprendizaje-inicial-ayni-v2.docx");
const workshopTemplateUrl = path.join(process.cwd(), "assets/templates/actividad-aprendizaje-inicial-con-taller-v1.docx");
const clean = (value) => typeof value === "string" ? value.trim() : "";
const list = (value) => Array.isArray(value) ? value.map(clean).filter(Boolean).join("; ") : "";
const xmlText = (xml) => [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => match[1]).join("");
const paragraphPattern = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;

function readableSentences(value) {
  return clean(value).split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿])|;\s*/u).map((part) => part.trim()).filter(Boolean)
    .map((part) => {
      const capitalized = part.replace(/^[a-záéíóúñ]/u, (letter) => letter.toLocaleUpperCase("es-PE"));
      return /[.!?]$/u.test(capitalized) ? capitalized : `${capitalized}.`;
    });
}

function readableParagraph(value, { bold = false, bullet = false } = {}) {
  const text = `${bullet ? "• " : ""}${value}`;
  return `<w:p><w:pPr><w:spacing w:before="${bold ? 120 : 0}" w:after="${bold ? 70 : 55}"/>${bullet ? '<w:ind w:left="340" w:hanging="180"/>' : ""}${bold ? "<w:keepNext/>" : ""}</w:pPr><w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:color w:val="173352"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function readableBlock(label, value) {
  const lines = Array.isArray(value) ? value.map(clean).filter(Boolean) : readableSentences(value);
  return lines.length ? readableParagraph(label, { bold: true }) + lines.map((line) => readableParagraph(line, { bullet: true })).join("") : "";
}

function replaceSectionBody(xml, startText, endText, body) {
  const paragraphs = [...xml.matchAll(paragraphPattern)];
  const start = paragraphs.find((match) => xmlText(match[0]).includes(startText));
  const end = paragraphs.find((match) => match.index > (start?.index ?? -1) && xmlText(match[0]).includes(endText));
  if (!start || !end) throw new Error(`No se encontró la sección ${startText} en la plantilla de actividad.`);
  return xml.slice(0, start.index) + start[0] + body + xml.slice(end.index);
}

function activityGuide(content, whatToObserve, observationBlocks = [], names = new Map()) {
  const actions = activityReadingStages(content.child_actions);
  const mediation = activityReadingStages(content.mediation);
  const observations = moment => (observationBlocks.find(block => block.id === moment)?.observations ?? []).map(item => ({
    competency: names.get(item.competency_id) ?? item.competency_name ?? item.competency_id,
    criterion: item.criterion,
    focus: (item.observation_focus ?? []).filter(text => text !== item.criterion),
    evidence: item.expected_evidence,
  }));
  const before = guidePanel("Antes de empezar", [
    { title: "Docente · antes de empezar", body: content.teacher_preparation ? guideText(content.teacher_preparation) : "" },
    { title: "Materiales", body: content.materials?.length ? guideText(content.materials) : "" },
  ]);
  const phased = actions.stages.length === 3 && mediation.stages.length === 3;
  if (phased) return {
    purpose: guidePanel("El propósito de hoy", [{ title: "Propósito", body: guideText(content.purpose) }]),
    sequence: before + readableBlock("Contexto de las acciones", actions.introduction) +
      readableBlock("Orientaciones generales", mediation.introduction) +
      actions.stages.map((stage, index) => guidePanel(stage.label.toLocaleUpperCase("es-PE"), [
        { title: "Niños · qué harán", body: guideText(stage.text) },
        { title: "Docente · cómo acompaña", body: (index === 0 && content.meaningful_situation ? readableBlock("Situación para empezar", content.meaningful_situation) : "") + guideText(mediation.stages[index].text) },
      ], observations(["opening", "development", "closure"][index]))).join("") + readableBlock("Continuidad", content.closure_or_continuity),
  };
  // Historical unphased instructions remain in their saved scope, rather than
  // fabricating separate child actions for opening and closure.
  return {
    purpose: guidePanel("El propósito de hoy", [{ title: "Propósito", body: guideText(content.purpose) }]),
    sequence: before + guidePanel("INICIO", [
      { title: "Situación para empezar", body: content.meaningful_situation ? guideText(content.meaningful_situation) : "" },
    ], observations("opening")) + guidePanel("DESARROLLO", [
      { title: "Niños · qué harán", body: guideText(content.child_actions) },
      { title: "Docente · cómo acompaña", body: guideText(content.mediation) },
    ], observations("development")) + guidePanel("CIERRE", [
      { title: "Para cerrar y continuar", body: content.closure_or_continuity ? guideText(content.closure_or_continuity) : "" },
    ], observations("closure")) +
      (observationBlocks.some(block => block.observations?.length) ? "" : readableBlock("Qué observar", whatToObserve)),
  };
}

function removeSection(xml, startText, endText = null) {
  const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)];
  const start = paragraphs.find((match) => xmlText(match[0]).includes(startText));
  const end = endText && paragraphs.find((match) => match.index > (start?.index ?? -1) && xmlText(match[0]).includes(endText));
  if (!start) throw new Error(`No se encontró la sección ${startText} en la plantilla de actividad.`);
  return xml.slice(0, start.index) + xml.slice(end?.index ?? xml.lastIndexOf("<w:sectPr"));
}

function transformActivity(xml, evidence, closure, withWorkshop, guide, curriculum, values) {
  let output = xml;
  output = replaceSectionBody(output, "III. REFERENTES CURRICULARES", "IV. MOMENTOS FIJOS", curriculum);
  output = output.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g, row => ["SEDE_COLEGIO","UGEL"].some(key => !values[key] && xmlText(row).includes("{{"+key+"}}")) ? "" : row);
  output = replaceSectionBody(output, "II. PROPÓSITO DE APRENDIZAJE", "III. REFERENTES CURRICULARES", guide.purpose +
    (!evidence.length ? guideParagraph("Aún no hay observaciones registradas. Puedes registrarlas desde Hoy.", { size: 20, color: "526B87" }) : ""));
  output = replaceSectionBody(output, "V. SECUENCIA DE LA ACTIVIDAD", withWorkshop ? "VI. CUADERNO DE CAMPO" : "VI. REGISTRO DE OBSERVACIONES", guide.sequence);
  if (!evidence.length) {
    output = output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g,
      (table) => table.includes("{{EVIDENCIA_ESTUDIANTE}}") ? "" : table);
    output = output.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) => {
      if (!xmlText(paragraph).startsWith("Esta sección se completa automáticamente")) return paragraph;
      let first = true;
      return paragraph.replace(/(<w:t(?:\s[^>]*)?>)[\s\S]*?(<\/w:t>)/g, (_match, open, close) => {
        const value = first ? "Aún no hay observaciones registradas. Regístralas en Hoy para que aparezcan aquí." : "";
        first = false;
        return `${open}${value}${close}`;
      });
    });
  }
  if (!closure) output = removeSection(output, "VII. SÍNTESIS Y REFLEXIÓN DOCENTE", "VIII. TALLER");
  if (!withWorkshop) output = removeSection(output, "VIII. TALLER");
  if (evidence.length) output = expandTableRow(output, "{{EVIDENCIA_ESTUDIANTE}}", evidence);
  output = output.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g,
    (row) => row.includes("{{SINTESIS_EVIDENCIAS_REGISTRADAS}}") || row.includes("{{AJUSTES_SIGUIENTE}}") ? "" : row);
  output = output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g,
    (table) => xmlText(table).includes("Estos bloques se mantienen como base") ? "" : table);
  output = removeParagraphsContaining(output, ["Los campos {{...}}", "Esta sección se completa automáticamente con los registros creados desde"]);
  output = removePageBreakAfterTable(output, "{{COMPETENCIA_PRINCIPAL}}");
  output = removePageBreakAfterTable(output, "JUEGO LIBRE");
  output = removePageBreakAfterTable(output, "{{INICIO}}");
  // Keep a child's name, criterion and observation together when the row fits a page.
  // Word still permits oversized rows to flow; repeated column labels retain context.
  output = output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g, (table) => {
    if (!xmlText(table).includes("Nombre del estudiante")) return table;
    let first = true;
    return table.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g, (row) => {
      const properties = `<w:cantSplit/>${first ? "<w:tblHeader/>" : ""}`;
      if (first) row = row.replace(/<w:pPr>/g, "<w:pPr><w:keepNext/>");
      first = false;
      return row.includes("<w:trPr>") ? row.replace("<w:trPr>", `<w:trPr>${properties}`)
        : row.replace(/(<w:tr(?:\s[^>]*)?>)/, `$1<w:trPr>${properties}</w:trPr>`);
    });
  });
  const sectionStart=label=>[...output.matchAll(paragraphPattern)].find(match=>xmlText(match[0]).includes(label))?.index;
  const curriculumStart=sectionStart("III. REFERENTES CURRICULARES"),sequenceStart=sectionStart("V. SECUENCIA DE LA ACTIVIDAD"),evidenceStart=sectionStart(withWorkshop?"VI. CUADERNO DE CAMPO":"VI. REGISTRO DE OBSERVACIONES");
  if(curriculumStart!=null&&sequenceStart!=null&&evidenceStart!=null){
    const reference=removeSection(output.slice(curriculumStart,sequenceStart)+'<w:sectPr/>',"IV. MOMENTOS FIJOS DE LA JORNADA").replace('<w:sectPr/>',''),sequence=output.slice(sequenceStart,evidenceStart);
    output=output.slice(0,curriculumStart)+sequence+reference+output.slice(evidenceStart);
  }
  output = retainCoverPageBreak(output);
  // No empty form or isolated heading when there are no field records yet.
  if (!evidence.length) {
    output = removeSection(output, withWorkshop ? "VI. CUADERNO DE CAMPO" : "VI. REGISTRO DE OBSERVACIONES",
      closure ? "VII. SÍNTESIS Y REFLEXIÓN DOCENTE" : withWorkshop ? "VIII. TALLER" : undefined);
  }
  output=replaceWordText(output,"Capacidad(es) pertinente(s)","Capacidades de referencia");
  output=replaceWordText(output,"V. SECUENCIA DE LA ACTIVIDAD","III. SECUENCIA DE LA ACTIVIDAD");
  output=replaceWordText(output,"III. REFERENTES CURRICULARES","IV. REFERENTES CURRICULARES");
  output=replaceWordText(output,"VI. REGISTRO DE OBSERVACIONES","V. REGISTRO DE OBSERVACIONES");
  output=replaceWordText(output,"VI. CUADERNO DE CAMPO","V. CUADERNO DE CAMPO");
  const numerals=["V","VI","VII"];
  output=replaceWordText(output,"VII. SÍNTESIS Y REFLEXIÓN DOCENTE",`${numerals[evidence.length?1:0]}. SÍNTESIS Y REFLEXIÓN DOCENTE`);
  output=replaceWordText(output,"VIII. TALLER",`${numerals[(evidence.length?1:0)+(closure?1:0)]}. TALLER`);
  if(withWorkshop)output=output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g,table=>table.includes("{{TALLER_PROPOSITO}}")?keepShortTableTogether(table):table);
  return output;
}

function observedDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Lima" }).format(date);
}

/** The planning document shows where observations will appear without inventing field notes or reflections. */
export async function renderActivityUnifiedWord(document, cards = [], { logo = null } = {}) {
  const content = document.content ?? {};
  const withWorkshop = content.document_template_version === "activity-with-workshop-v1";
  if (!withWorkshop && content.document_template_version !== "activity-unified-v1") throw new Error("La actividad no usa la plantilla unificada.");
  if (withWorkshop && !document.workshop?.content) throw new Error("El taller confirmado de este día no está disponible.");
  const card = cards.find((item) => item.id === content.competency_id);
  const ageFocus = ageReference(card, document.age, content.evaluation_criterion ?? content.purpose);
  const route = document.experience_details?.activity_route?.find((item) => item.id === content.route_item_id);
  const criterion = document.active_criterion;
  const primaryId = criterion?.competency_v4_id || content.competency_id;
  const observedIds = (document.guide?.criteria ?? []).map(item => item.competency_v4_id ?? item.competency_id);
  const integratedIds = [...new Set([...(route?.competency_ids ?? []), ...(route?.possible_secondary_competency_ids ?? []), ...observedIds])]
    .filter(id => id && id !== primaryId);
  const integrated = integratedIds.map(id => cards.find(item => item.id === id)?.name).filter(Boolean);
  const actualEvidence = Array.isArray(document.registered_evidence) ? document.registered_evidence : [];
  const closure = clean(document.teacher_closure_note);
  const workshop = document.workshop?.content ?? null;
  const workshopCard = cards.find((item) => item.id === workshop?.competency_id);
  const evidenceRows = actualEvidence.map((item) => ({
    EVIDENCIA_ESTUDIANTE: clean(item.student_name) || "Niño del aula",
    EVIDENCIA_CRITERIO: clean(item.criterion_text) || "Sin criterio asociado",
    EVIDENCIA_TIPO: item.has_attachment ? "Foto" : "Sin adjunto",
    EVIDENCIA_ADJUNTO: item.has_attachment ? "Guardada en Ayni" : "",
    EVIDENCIA_REGISTRO_CAMPO: [observedDate(item.observed_at), clean(item.observation_text) || "Foto registrada en Ayni"].filter(Boolean).join(" · "),
    EVIDENCIA_SIGUIENTE_PASO: "Revisar junto con nuevos registros",
  }));
  const criterionText = clean(criterion?.criterion_text || content.evaluation_criterion || route?.evaluation_criterion);
  const distinctFocus = (criterion?.observation_focus ?? []).filter(value => clean(value) !== criterionText);
  const whatToObserve = list(distinctFocus) || clean(content.evidence_opportunities) || clean(content.expected_evidence || route?.expected_evidence);
  const criteria = document.guide?.criteria?.length ? document.guide.criteria : activityObservationCriteria({...route,...content}).map(item => ({...item, details:{...item, ...(item.competency_id===primaryId&&criterion?.observation_focus?{observation_focus: distinctFocus.length ? distinctFocus : [whatToObserve]}:{})}, competency_v4_id:item.competency_id}));
  const blocks = activityPedagogicalBlocks(content,[],criteria);
  const names = new Map(cards.map(card=>[card.id,card.name??card.official_name]));
  const guide = activityGuide(content, whatToObserve, blocks, names);
  const curriculum = criteria.map(item => {
    const id = item.competency_v4_id ?? item.competency_id;
    const reference = cards.find(card => card.id === id);
    return readableParagraph(names.get(id) ?? id, { bold: true }) + guideDetails([
      ["Referentes curriculares", ageReference(reference, document.age, item.details?.official_performance_refs ?? item.official_performance_refs)],
      ["Criterio de esta actividad", item.criterion_text],
      ["Evidencia esperada", item.details?.expected_evidence ?? item.expected_evidence ?? content.expected_evidence],
    ]);
  }).join("") + (integratedIds.some(id => !observedIds.includes(id) && !criteria.some(item => (item.competency_v4_id ?? item.competency_id) === id))
    ? readableBlock("Integración prevista en el mapa", integrated) : "");
  const supports = document.experience_details?.source_proposal_snapshot?.supports ?? [];
  const supportBlocks = readableBlock("Apoyos previstos", supports);
  guide.sequence += supportBlocks;
  const approaches = document.experience_details?.transversal_approaches ?? [];
  const attitudes = document.experience_details?.observable_attitudes ?? [];
  guide.sequence += readableBlock("Enfoques transversales previstos", approaches) + readableBlock("Actitudes a acompañar", attitudes);
  const date = String(document.occurs_on ?? "").slice(0, 10);
  const values = {
    "AÑO_ESCOLAR": String(document.school_year), TITULO_ACTIVIDAD: document.title,
    TITULO_PROYECTO: clean(document.experience_title), INSTITUCION_EDUCATIVA: clean(document.institution_name) || "Institución educativa",
    EDAD_AULA: `${document.age || ""} años · ${clean(document.classroom)}`, DOCENTE: clean(document.teacher_name) || "Docente del aula",
    FECHA: document.actual_execution_date&&document.actual_execution_date!==date ? `${document.actual_execution_date.slice(8)}/${document.actual_execution_date.slice(5,7)}/${document.actual_execution_date.slice(0,4)} (prevista: ${date.slice(8)}/${date.slice(5,7)}/${date.slice(0,4)})` : /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date.slice(8)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : date,
    UGEL: clean(document.ugel), NUMERO_ACTIVIDAD: String(route?.number ?? "Del proyecto"),
    DURACION_REFERENCIAL: Number.isInteger(route?.estimated_minutes) ? `${route.estimated_minutes} minutos estimados` : "Tiempo ajustable al grupo", SEDE_COLEGIO: clean(document.district),
    PROPOSITO_QUE: clean(content.purpose), PROPOSITO_COMO: clean(content.child_actions), PROPOSITO_PARA_QUE: clean(content.closure_or_continuity),
    COMPETENCIA_PRINCIPAL: card?.name || "Por confirmar con la docente",
    CAPACIDADES_PERTINENTES: list(card?.capacities?.map((item) => item.official_name)),
    DESEMPENO_PERTINENTE: ageFocus,
    CRITERIO_EVALUACION: clean(criterion?.criterion_text) || clean(content.evaluation_criterion || route?.evaluation_criterion) || "La docente precisará el criterio antes de observar.",
    QUE_OBSERVAR: whatToObserve || "La docente precisará qué actuación observar.",
    EVIDENCIA_ESPERADA: clean(content.expected_evidence || route?.expected_evidence) || clean(content.evidence_opportunities),
    COMPETENCIA_INTEGRADA: integrated.length ? `${integrated.join("; ")}. Integración prevista en el mapa; no acredita una actuación ni una valoración.` : "No se ha previsto otra competencia en el mapa de esta actividad.",
    ENFOQUE_TRANSVERSAL: list(approaches), ACTITUD_OBSERVABLE: list(attitudes),
    APOYOS_DIVERSIDAD: list(supports),
    MATERIALES_PRINCIPALES: list(content.materials),
    INICIO: clean(content.meaningful_situation), INICIO_MEDIACION: "", INICIO_RECURSOS: list(content.materials),
    DESARROLLO: clean(content.child_actions), DESARROLLO_MEDIACION: clean(content.mediation), DESARROLLO_NINOS: "", DESARROLLO_RECURSOS: list(content.materials),
    CIERRE: clean(content.closure_or_continuity), CIERRE_REFLEXION: "Conversar sobre lo que hicieron, pensaron y quisieran seguir explorando.",
    CIERRE_RECURSOS: list(content.materials),
    EVIDENCIA_ESTUDIANTE: "", EVIDENCIA_CRITERIO: "", EVIDENCIA_TIPO: "", EVIDENCIA_ADJUNTO: "", EVIDENCIA_REGISTRO_CAMPO: "", EVIDENCIA_SIGUIENTE_PASO: "",
    SINTESIS_EVIDENCIAS_REGISTRADAS: `${actualEvidence.length} registros docentes vinculados a esta actividad. La interpretación requiere revisar cada actuación.`,
    AJUSTES_SIGUIENTE: "Revisar estas evidencias al preparar la próxima actividad.", REFLEXION_DOCENTE: closure,
    TIPO_TALLER: clean(workshop?.workshop_type), TALLER_DESCRIPCION: "", ANEXOS_RECURSOS: "",
    TALLER_COMPETENCIA: clean(workshopCard?.name ?? workshopCard?.official_name),
    TALLER_PROPOSITO: clean(workshop?.purpose), TALLER_INICIO: clean(workshop?.opening),
    TALLER_DESARROLLO: clean(workshop?.development), TALLER_CIERRE: clean(workshop?.closure),
    TALLER_CRITERIO: clean(workshop?.criterion_or_observation_focus),
    TALLER_EVIDENCIA: clean(workshop?.evidence_expected),
    TALLER_MATERIALES: list(workshop?.materials),
    TALLER_FICHA: clean(document.workshop?.sheet_title) || "Sin ficha imprimible",
  };
  let appendixImages = [];
  if (withWorkshop && workshop.sheet_id) {
    const sheet = (await availableSheets({ age: document.age, competencyId: workshop.competency_id }))
      .find((item) => item.id === workshop.sheet_id);
    if (!sheet) throw new Error("La ficha del taller no está disponible para imprimir.");
    values.TALLER_FICHA = sheet.title;
    appendixImages = await renderSheetPages(sheet);
  }
  const overview = [
    ["Qué haremos hoy", clean(content.purpose)],
  ].filter(([, value]) => value);
  return renderUnifiedWord({ templateUrl: withWorkshop ? workshopTemplateUrl : oldTemplateUrl, values, logo, appendixImages, compactTrailingSpace: true,
    transform: (xml) => insertCoverQuickView(transformActivity(xml, evidenceRows, closure, withWorkshop, guide, curriculum, values), "Hoy en el aula", overview),
    transformPart: (part, xml) => part.includes("header") ? replaceWordText(xml, "PLANIFICACIÓN ANUAL", "ACTIVIDAD DE APRENDIZAJE") : xml });
}
