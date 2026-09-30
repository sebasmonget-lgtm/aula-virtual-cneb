import path from "node:path";
import { insertCoverQuickView, removePageBreakAfterTable, removeParagraphsContaining, renderUnifiedWord, replaceWordText, xmlEscape } from "./unified-word-template.mjs";

const templateUrl = path.join(process.cwd(), "assets/templates/proyecto-unidad-inicial-unificada-v1.docx");
const clean = (value) => typeof value === "string" ? value.trim() : "";
const list = (value) => Array.isArray(value) ? value.map(clean).filter(Boolean).join("; ") : "";
const dateLabel = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? `${value.slice(8)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : "";
const durationWeeks = (startsOn, endsOn) => {
  const start = new Date(`${startsOn}T00:00:00Z`), end = new Date(`${endsOn}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return "Duración referencial";
  return `${Math.max(1, Math.floor((end.getTime() - start.getTime()) / 604800000) + 1)} semanas lectivas previstas`;
};
const xmlText = (xml) => [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => match[1]).join("");

function paragraph(text, bold = false, bullet = false) {
  return `<w:p><w:pPr><w:spacing w:before="${bold ? 140 : 0}" w:after="${bold ? 75 : 55}"/>${bullet ? '<w:ind w:left="340" w:hanging="180"/>' : ""}${bold ? "<w:keepNext/>" : ""}</w:pPr><w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:color w:val="173352"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${xmlEscape(`${bullet ? "• " : ""}${text}`)}</w:t></w:r></w:p>`;
}

function block(label, value) {
  const lines = Array.isArray(value) ? value.map(clean).filter(Boolean)
    : clean(value).split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿])|;\s*/u).map(clean).filter(Boolean);
  return lines.length ? paragraph(label, true) + lines.map((line) => paragraph(line, false, true)).join("") : "";
}

function replaceSectionBody(xml, startText, endText, body) {
  const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)];
  const start = paragraphs.find((match) => xmlText(match[0]).includes(startText));
  const end = paragraphs.find((match) => match.index > (start?.index ?? -1) && xmlText(match[0]).includes(endText));
  if (!start || !end) throw new Error(`No se encontró la sección ${startText} en la plantilla del proyecto.`);
  return xml.slice(0, start.index) + start[0] + body + xml.slice(end.index);
}

function removeBetween(xml, startText, endText = null) {
  const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)];
  const start = paragraphs.find((match) => xmlText(match[0]).includes(startText));
  const end = endText && paragraphs.find((match) => match.index > (start?.index ?? -1) && xmlText(match[0]).includes(endText));
  if (!start) throw new Error(`No se encontró la sección ${startText} en la plantilla.`);
  return xml.slice(0, start.index) + xml.slice(end?.index ?? xml.lastIndexOf("<w:sectPr"));
}

function valuesFor(document, cards) {
  const content = document.content ?? {};
  const modern = content.document_template_version === "experience-unified-v2";
  if (!["experience-unified-v1", "experience-unified-v2"].includes(content.document_template_version) || !content.activity_route?.length)
    throw new Error("Esta experiencia no tiene ruta estructurada para la plantilla unificada.");
  const byId = new Map(cards.map((card) => [card.id, card]));
  const primary = content.primary_competency_ids ?? [];
  const secondary = content.possible_secondary_competency_ids ?? [];
  const selected = [...new Set([...primary, ...secondary])];
  const title = document.subtype === "project" ? "PROYECTO" : "UNIDAD";
  const capacity = (card) => list(card?.capacities?.map((item) => item.official_name));
  const focus = (card) => clean(card?.ages?.[String(document.age)]?.ai_focus);
  const competencyRows = selected.map((id) => {
    const card = byId.get(id);
    if (!card) throw new Error(`Competencia no disponible en la plantilla: ${id}.`);
    const activities = content.activity_route.filter((item) => (item.competency_ids ?? [item.competency_id]).includes(id));
    const generalCriterion = content.dependents?.general_criteria?.find((item) => item.competency_id === id);
    return { AREA: clean(card.area_name), COMPETENCIA: clean(card.name), CAPACIDADES: capacity(card),
      DESEMPENO_REFERENTE: modern && card?.ages?.[String(document.age)]?.status !== "specified"
        ? "Sin desempeño específico para esta edad; se considera el estándar del ciclo." : focus(card) || "Referente por revisar con la docente",
      CRITERIOS: clean(generalCriterion?.criterion) || list(activities.map((item) => item.evaluation_criterion)) || "Se definirá al desarrollar las actividades.",
      EVIDENCIAS: list(generalCriterion?.expected_evidence) || list(activities.map((item) => item.expected_evidence)) || "Se precisará en las actividades." };
  });
  const routeRows = content.activity_route.map((item, index) => ({
    NRO_ACTIVIDAD: String(item.number), FECHA_ACTIVIDAD: modern ? dateLabel(item.date) : index === 0 ? "Inicio" : index === content.activity_route.length - 1 ? "Cierre" : "Desarrollo",
    TITULO_ACTIVIDAD: item.title, PROPOSITO_ESPECIFICO: item.specific_purpose,
    COMPETENCIA_PRINCIPAL_ACTIVIDAD: byId.get(item.competency_id)?.name ?? item.competency_id,
    CRITERIO_ACTIVIDAD: item.evaluation_criterion, EVIDENCIA_ACTIVIDAD: item.expected_evidence,
  }));
  const values = {
    "AÑO_ESCOLAR": String(document.school_year), TIPO_EXPERIENCIA: title,
    NUMERO_EXPERIENCIA: Number.isInteger(document.source_proposal_index) ? String(document.source_proposal_index + 1) : "Emergente",
    CODIGO_EXPERIENCIA: document.id.slice(0, 8).toUpperCase(), TITULO_EXPERIENCIA: document.title,
    FECHA_INICIO: dateLabel(document.starts_on), FECHA_FIN: dateLabel(document.ends_on),
    DURACION_REFERENCIAL: modern ? durationWeeks(document.starts_on, document.ends_on) : "Ajustable según el grupo", INSTITUCION_EDUCATIVA: clean(document.institution_name) || "Institución educativa",
    EDAD_AULA: `${document.age || ""} años · ${clean(document.classroom)}`,
    DOCENTE: clean(document.teacher_name) || "Docente del aula", UGEL: clean(document.ugel) || "Sin dato registrado",
    PRIORIDAD_ANUAL_O_PROYECTO_ORIGEN: document.origin === "planned" ? "Propuesta del plan anual" : clean(content.planning_reason),
    FECHA_SIGNIFICATIVA: "Según el calendario del aula", ORIGEN_NECESIDAD_INTERES_PROBLEMA: clean(content.trigger_or_interest || content.learning_need_or_context || content.starting_point),
    SITUACION_SIGNIFICATIVA: modern ? [clean(content.formal_content?.situation), clean(content.formal_content?.foundation)].filter(Boolean).join(" ")
      : clean(content.starting_point), RETO_PREGUNTA: clean(content.dependents?.guiding_questions?.[0] || content.possible_pathways?.[0]?.title || content.proposed_situations?.[0]?.title || content.title),
    PRODUCTO_FINAL: modern ? clean(content.project_master?.closing_description) : "El resultado colectivo se acordará con los niños al iniciar la experiencia.",
    EVIDENCIAS_CLAVE: list(content.evidence_opportunities), PREPLAN_QUE: list(content.activity_route.map((item) => item.title)),
    PREPLAN_COMO: modern ? clean(content.formal_content?.methodology) || list(content.dependents?.journey?.map((item) => item.description)) : list((content.possible_pathways || content.proposed_situations)?.map((item) => item.possible_child_actions)),
    PREPLAN_RECURSOS: list(content.spaces_and_materials),
    NINOS_QUE: "", NINOS_COMO: "", NINOS_NECESITAN: "", PROPOSITO_GENERAL_EXPERIENCIA: content.purpose,
    AREA: "", COMPETENCIA: "", CAPACIDADES: "", DESEMPENO_REFERENTE: "", CRITERIOS: "", EVIDENCIAS: "",
    ENFOQUES_TRANSVERSALES: "Se concretarán en las actividades según la situación vivida.",
    ACTITUDES_OBSERVABLES: "Escuchar, participar y respetar formas diversas de expresión.",
    APOYOS_DIVERSIDAD: clean(content.formal_content?.diversity_support) || list(content.adjustment_points) || "Ajustar materiales, tiempos y formas de participación según las necesidades observadas.",
    PARTICIPACION_FAMILIA_COMUNIDAD: clean(content.formal_content?.family_collaboration) || list(content.family_or_community_links) || "Cuando resulte pertinente para el grupo.",
    ESTRATEGIA_RECOJO_EVIDENCIAS: clean(content.formal_content?.assessment_followup) || "Observar y registrar actuaciones durante el juego y las actividades.",
    INSTRUMENTOS_PROYECTO: "Notas de observación y evidencias registradas por la docente.",
    USO_EVIDENCIAS_PARA_AJUSTAR: "Revisar los registros y ajustar las siguientes actividades.",
    NRO_ACTIVIDAD: "", FECHA_ACTIVIDAD: "", TITULO_ACTIVIDAD: "", PROPOSITO_ESPECIFICO: "", COMPETENCIA_PRINCIPAL_ACTIVIDAD: "", CRITERIO_ACTIVIDAD: "", EVIDENCIA_ACTIVIDAD: "",
    MATERIALES_RECURSOS_PROYECTO: list(content.spaces_and_materials), ORGANIZACION_ESPACIOS: clean(content.spaces_and_materials?.[0]) || "Según la actividad.",
    HITOS_CALENDARIO: `${dateLabel(document.starts_on)} al ${dateLabel(document.ends_on)}`,
    AJUSTES_FLEXIBILIDAD: list(content.adjustment_points) || clean(content.flexibility_notes),
    CIERRE_SOCIALIZACION: clean(content.formal_content?.closing) || "Compartir lo realizado y conversar sobre lo aprendido, según decida el grupo.",
    SINTESIS_EVIDENCIAS_PROYECTO: "", AVANCES_GRUPO: "", NECESIDADES_EMERGENTES: "", AJUSTES_REALIZADOS: "",
    VALORACION_APRENDIZAJES: "", EVIDENCIAS_CIERRE: "", PROYECCION_SIGUIENTE: "", DIRECTOR_COORDINADOR: "",
  };
  return { values, competencyRows, routeRows };
}

/** Render the planning state only; actual evidence and reflections enter after implementation. */
export async function renderLearningExperienceUnifiedWord(document, cards = [], { logo = null } = {}) {
  const { values, competencyRows, routeRows } = valuesFor(document, cards);
  const content = document.content ?? {};
  const origin = [
    block("De dónde parte", values.ORIGEN_NECESIDAD_INTERES_PROBLEMA),
    block("Situación para empezar", values.SITUACION_SIGNIFICATIVA),
    block("Pregunta que guía", values.RETO_PREGUNTA),
    block("Resultado que se espera", values.PRODUCTO_FINAL),
    block("Qué podríamos observar durante el proceso", content.evidence_opportunities),
  ].join("");
  const preplan = [
    block("Primeros pasos", (content.activity_route ?? []).slice(0, 3).map((item) => item.title)),
    (content.activity_route?.length ?? 0) > 3 ? paragraph(`La ruta completa tiene ${content.activity_route.length} actividades; se muestra más adelante.`) : "",
    block("Cómo acompañará la docente", values.PREPLAN_COMO),
    block("Espacios y materiales", content.spaces_and_materials),
  ].join("");
  const competencies = competencyRows.map((row) => [
    paragraph(row.COMPETENCIA, true),
    paragraph(row.AREA),
    block("Capacidades", row.CAPACIDADES),
    block("Referente para observar", row.DESEMPENO_REFERENTE),
    block("Criterio", row.CRITERIOS.split(/;\s*/).filter(Boolean)),
    block("Evidencia esperada", row.EVIDENCIAS.split(/;\s*/).filter(Boolean)),
  ].join("")).join("");
  const assessment = [
    block("Qué observar y registrar", values.ESTRATEGIA_RECOJO_EVIDENCIAS),
    block("Dónde quedará registrado", values.INSTRUMENTOS_PROYECTO),
    block("Cómo ajustar las próximas actividades", values.USO_EVIDENCIAS_PARA_AJUSTAR),
  ].join("");
  const route = routeRows.map((row) => [
    paragraph(`${row.NRO_ACTIVIDAD}. ${row.TITULO_ACTIVIDAD}${row.FECHA_ACTIVIDAD ? ` · ${row.FECHA_ACTIVIDAD}` : ""}`, true),
    block("Qué se hará", row.PROPOSITO_ESPECIFICO),
    block("Competencia", row.COMPETENCIA_PRINCIPAL_ACTIVIDAD),
    block("Qué observar", row.CRITERIO_ACTIVIDAD),
    block("Evidencia esperada", row.EVIDENCIA_ACTIVIDAD),
  ].join("")).join("");
  const overview = [
    ["Así podría empezar", (content.activity_route ?? []).slice(0, 3).map((item) => item.title).filter(Boolean).join(" · ")],
  ].filter(([, value]) => value);
  return renderUnifiedWord({ templateUrl, values, logo, transform(xml) {
    let output = removeBetween(xml, "XI. SEGUIMIENTO DEL PROYECTO / UNIDAD");
    output = removeBetween(output, "IV. PLANIFICACIÓN CON LOS NIÑOS", "V. PROPÓSITO GENERAL");
    output = replaceSectionBody(output, "II. ORIGEN Y SITUACIÓN SIGNIFICATIVA", "III. PREPLANIFICACIÓN DOCENTE", origin);
    output = replaceSectionBody(output, "III. PREPLANIFICACIÓN DOCENTE", "V. PROPÓSITO GENERAL", preplan);
    output = replaceSectionBody(output, "VI. PROPÓSITOS DE APRENDIZAJE Y EVALUACIÓN", "VII. ENFOQUES", competencies);
    output = replaceSectionBody(output, "VIII. ESTRATEGIA GENERAL DE EVALUACIÓN", "IX. RUTA DE ACTIVIDADES", assessment);
    output = replaceSectionBody(output, "IX. RUTA DE ACTIVIDADES", "X. RECURSOS", route);
    output = output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g, (table) => xmlText(table).includes("Regla para Ayni:") ? "" : table);
    output = removeParagraphsContaining(output, ["Los campos {{...}}", "Una fila por competencia", "Fila repetible:", "Esta sección es el puente directo", "Anexos opcionales"]);
    output = output.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g, (row) =>
      ["Hitos o fechas del calendario", "Producto final / socialización"].some((label) => xmlText(row).includes(label)) ? "" : row);
    output = removePageBreakAfterTable(output, "Materiales y recursos base");
    let coverBreak = true;
    output = output.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) => {
      if (!/<w:br\b[^>]*w:type="page"/.test(paragraph)) return paragraph;
      if (coverBreak) { coverBreak = false; return paragraph; }
      return xmlText(paragraph) ? paragraph.replace(/<w:br\b[^>]*w:type="page"\s*\/>/g, "") : "";
    });
    output = replaceWordText(output, "RUTA DE ACTIVIDADES / SESIONES", "RUTA DE ACTIVIDADES");
    output = replaceWordText(output, "Desempeño / referente", "Referente para observar");
    return insertCoverQuickView(output, "El proyecto en una mirada", overview);
  } });
}
