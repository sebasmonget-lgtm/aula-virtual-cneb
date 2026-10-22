import { retainCoverPageBreak, compactCoverSpacers, guideDetails, keepShortTableTogether, keepShortRowsTogether } from "./teacher-guide-word-layout.mjs";
import { routeObservationCriteria } from "./activity-observation-plan.mjs";
import {projectFlexibilityGuidance,projectFlexibilityText,projectMediationNotes} from './activity-teacher-reading.mjs';
import { ageReference, compactPlanningTable } from "./pedagogical-word-presentation.mjs";
import path from "node:path";
import { insertCoverQuickView, removePageBreakAfterTable, removeParagraphsContaining, renderUnifiedWord, replaceWordText, xmlEscape } from "./unified-word-template.mjs";

const templateUrl = path.join(process.cwd(), "assets/templates/proyecto-unidad-inicial-unificada-v1.docx");
const clean = (value) => typeof value === "string" ? value.trim() : "";
const list = (value) => Array.isArray(value) ? value.map(clean).filter(Boolean).join("; ") : "";
const dateLabel = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? `${value.slice(8)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : "";
const durationWeeks = (startsOn, endsOn) => {
  const start = new Date(`${startsOn}T00:00:00Z`), end = new Date(`${endsOn}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return "Duración referencial";
  const weeks = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 604800000) + 1);
  return weeks === 1 ? "1 semana lectiva prevista" : `${weeks} semanas lectivas previstas`;
};
const xmlText = (xml) => [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => match[1]).join("");

function paragraph(text, bold = false, bullet = false, keepNext = false) {
  return `<w:p><w:pPr>${String(text).length < 800 ? '<w:keepLines/>' : ''}<w:spacing w:before="${bold ? 140 : 0}" w:after="${bold ? 75 : 55}"/>${bullet ? '<w:ind w:left="340" w:hanging="180"/>' : ""}${bold || keepNext ? "<w:keepNext/>" : ""}</w:pPr><w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:color w:val="173352"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${xmlEscape(`${bullet ? "• " : ""}${text}`)}</w:t></w:r></w:p>`;
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
  const focus = (card, context) => ageReference(card,document.age,context);
  const competencyRows = selected.map((id) => {
    const card = byId.get(id);
    if (!card) throw new Error(`Competencia no disponible en la plantilla: ${id}.`);
    const activities = content.activity_route.filter((item) => (item.competency_ids ?? [item.competency_id]).includes(id));
    const generalCriterion = content.dependents?.general_criteria?.find((item) => item.competency_id === id);
    return { AREA: clean(card.area_name), COMPETENCIA: clean(card.name), CAPACIDADES: capacity(card),
      DESEMPENO_REFERENTE: modern && card?.ages?.[String(document.age)]?.status !== "specified"
        ? "Sin desempeño específico para esta edad; se considera el estándar del ciclo." : focus(card,generalCriterion?.official_performance_refs) || "Referente por revisar con la docente",
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
    DURACION_REFERENCIAL: modern ? `${durationWeeks(document.starts_on, document.ends_on)}${content.activity_route.length?` · ${content.activity_route.length} ${content.activity_route.length===1?'día elegido: '+dateLabel(content.activity_route[0].date??content.activity_route[0].planned_date):'días elegidos'}`:''}` : "Ajustable según el grupo", INSTITUCION_EDUCATIVA: clean(document.institution_name) || "Institución educativa",
    EDAD_AULA: `${document.age || ""} años · ${clean(document.classroom)}`,
    DOCENTE: clean(document.teacher_name) || "Docente del aula", UGEL: clean(document.ugel),
    PRIORIDAD_ANUAL_O_PROYECTO_ORIGEN: document.origin === "planned" ? "Propuesta del plan anual" : clean(content.planning_reason),
    FECHA_SIGNIFICATIVA: clean(content.significant_date), ORIGEN_NECESIDAD_INTERES_PROBLEMA: clean(content.trigger_or_interest || content.learning_need_or_context || content.starting_point),
    SITUACION_SIGNIFICATIVA: modern ? clean(content.project_master?.meaningful_situation) || [clean(content.formal_content?.situation)].filter(Boolean).join(" ")
      : clean(content.starting_point), RETO_PREGUNTA: clean(content.project_master?.global_challenge || content.dependents?.guiding_questions?.join(" · ") || content.possible_pathways?.[0]?.title || content.proposed_situations?.[0]?.title || content.title),
    PRODUCTO_FINAL: modern ? clean(content.project_master?.closing_description) : "El resultado colectivo se acordará con los niños al iniciar la experiencia.",
    EVIDENCIAS_CLAVE: list(content.evidence_opportunities), PREPLAN_QUE: list(content.activity_route.map((item) => item.title)),
    PREPLAN_COMO: modern ? clean(content.formal_content?.methodology) || list(content.dependents?.journey?.map((item) => item.description)) : list((content.possible_pathways || content.proposed_situations)?.map((item) => item.possible_child_actions)),
    PREPLAN_RECURSOS: list(content.spaces_and_materials),
    NINOS_QUE: "", NINOS_COMO: "", NINOS_NECESITAN: "", PROPOSITO_GENERAL_EXPERIENCIA: content.purpose,
    AREA: "", COMPETENCIA: "", CAPACIDADES: "", DESEMPENO_REFERENTE: "", CRITERIOS: "", EVIDENCIAS: "",
    ENFOQUES_TRANSVERSALES: list(content.transversal_approaches),
    ACTITUDES_OBSERVABLES: list(content.observable_attitudes),
    APOYOS_DIVERSIDAD: clean(content.formal_content?.diversity_support) || list(content.adjustment_points),
    PARTICIPACION_FAMILIA_COMUNIDAD: clean(content.formal_content?.family_collaboration) || list(content.family_or_community_links),
    ESTRATEGIA_RECOJO_EVIDENCIAS: clean(content.formal_content?.assessment_followup) || "Observar y registrar actuaciones durante el juego y las actividades.",
    INSTRUMENTOS_PROYECTO: "Notas de observación y evidencias registradas por la docente.",
    USO_EVIDENCIAS_PARA_AJUSTAR: projectFlexibilityGuidance,
    NRO_ACTIVIDAD: "", FECHA_ACTIVIDAD: "", TITULO_ACTIVIDAD: "", PROPOSITO_ESPECIFICO: "", COMPETENCIA_PRINCIPAL_ACTIVIDAD: "", CRITERIO_ACTIVIDAD: "", EVIDENCIA_ACTIVIDAD: "",
    MATERIALES_RECURSOS_PROYECTO: list(content.spaces_and_materials), ORGANIZACION_ESPACIOS: clean(content.organization_of_spaces) || "",
    HITOS_CALENDARIO: `${dateLabel(document.starts_on)} al ${dateLabel(document.ends_on)}`,
    AJUSTES_FLEXIBILIDAD: list(content.adjustment_points) || projectFlexibilityText(clean(content.flexibility_notes)),
    CIERRE_SOCIALIZACION: clean(content.formal_content?.closing) || "Compartir lo realizado y conversar sobre lo aprendido, según decida el grupo.",
    SINTESIS_EVIDENCIAS_PROYECTO: "", AVANCES_GRUPO: "", NECESIDADES_EMERGENTES: "", AJUSTES_REALIZADOS: "",
    VALORACION_APRENDIZAJES: "", EVIDENCIAS_CIERRE: "", PROYECCION_SIGUIENTE: "", DIRECTOR_COORDINADOR: "",
  };
  return { values, competencyRows, routeRows };
}

/** Render the planning state only; actual evidence and reflections enter after implementation. */
export async function renderLearningExperienceUnifiedWord(document, cards = [], { logo = null } = {}) {
  const { values, competencyRows } = valuesFor(document, cards);
  const content = document.content ?? {};
  const origin = guideDetails([
    ["De dónde parte", clean(content.project_master?.meaningful_situation) || values.ORIGEN_NECESIDAD_INTERES_PROBLEMA === values.SITUACION_SIGNIFICATIVA ? "" : values.ORIGEN_NECESIDAD_INTERES_PROBLEMA],
    ["Situación para empezar", values.SITUACION_SIGNIFICATIVA],
    ["Fundamentación pedagógica", clean(content.project_master?.meaningful_situation) ? clean(content.project_master?.foundation) : clean(content.formal_content?.foundation)],
    ["Preguntas que orientan el recorrido", content.dependents?.guiding_questions?.length ? content.dependents.guiding_questions : values.RETO_PREGUNTA],
    ["Resultado que se espera", values.PRODUCTO_FINAL],
  ]);
  const childJourney=(content.dependents?.journey??[]).map(item=>[clean(item.title),clean(item.description)].filter(Boolean).join(': ')).filter(Boolean);
  const mediation=projectMediationNotes(content);
  const preplan = guideDetails([
    ["Primeros pasos", (content.activity_route ?? []).slice(0, 3).map(item => item.title)],
    ["Ruta completa", (content.activity_route?.length ?? 0) > 3 ? `La ruta completa tiene ${content.activity_route.length} actividades; se muestra más adelante.` : ""],
    ["Qué harán los niños", childJourney.length?childJourney:list((content.possible_pathways || content.proposed_situations)?.map(item=>item.possible_child_actions))],
    ["Cómo acompañará la docente", mediation.length?mediation:clean(content.formal_content?.methodology)],
    ["Materiales y recursos previstos", content.spaces_and_materials],
    ["Acompañamiento y flexibilidad", values.AJUSTES_FLEXIBILIDAD],
  ]).replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g,row=>xmlText(row).startsWith('Cómo acompañará la docente')&&xmlText(row).length<=1400
    ?row.replace('<w:tr>','<w:tr><w:trPr><w:cantSplit/></w:trPr>'):row);
  const competencies = competencyRows.map(row => paragraph(row.COMPETENCIA, true) + guideDetails([
    ["Área", row.AREA],
    ["Capacidades de la competencia como referencia", row.CAPACIDADES],
    ["Referente para observar", row.DESEMPENO_REFERENTE.split("\n")],
    ["Criterio", row.CRITERIOS],
    ["Evidencia esperada", row.EVIDENCIAS],
  ])).join("");
  const assessment = guideDetails([
    ["Qué observar y registrar", "Usar los criterios y evidencias de la ruta. Registrar lo que cada niño hace o dice, con su fecha y el criterio correspondiente."],
    ["Dónde quedará registrado", values.INSTRUMENTOS_PROYECTO],
    ["Cómo acompañar los próximos encuentros", values.USO_EVIDENCIAS_PARA_AJUSTAR],
  ]);
  const byId = new Map(cards.map(card=>[card.id,card.name??card.official_name]));
  const route = content.activity_route.some(item=>routeObservationCriteria(item).length>1)
    ? content.activity_route.map(item=>paragraph(`${item.number}. ${item.title} · ${dateLabel(item.date)}`,true)+
      paragraph(`Propósito: ${item.specific_purpose}`,false,false,true)+routeObservationCriteria(item).map(criterion=>
        paragraph(byId.get(criterion.competency_id)??criterion.competency_id,true)+keepShortTableTogether(guideDetails([
          ["Criterio",criterion.criterion_text],["Evidencia esperada",criterion.expected_evidence],
        ]))).join("")).join("")
    : compactPlanningTable(["Actividad y fecha", "Propósito", "Criterios y evidencias"], content.activity_route.map(item=>[
    `${item.number}. ${item.title}\n${dateLabel(item.date)}`,
    item.specific_purpose,
    routeObservationCriteria(item).map(criterion=>`${byId.get(criterion.competency_id)??criterion.competency_id}\n${criterion.criterion_text}\nEvidencia: ${criterion.expected_evidence}`).join("\n\n")
  ]),[2600,2900,4500]);
  const overview = [
    ["Así podría empezar", (content.activity_route ?? []).slice(0, 3).map((item) => item.title).filter(Boolean).join(" · ")],
  ].filter(([, value]) => value);
  return renderUnifiedWord({ templateUrl, values, logo, compactTrailingSpace: true, transform(xml) {
    let output = removeBetween(xml, "XI. SEGUIMIENTO DEL PROYECTO / UNIDAD");
    output = removeBetween(output, "IV. PLANIFICACIÓN CON LOS NIÑOS", "V. PROPÓSITO GENERAL");
    output = replaceSectionBody(output, "II. ORIGEN Y SITUACIÓN SIGNIFICATIVA", "III. PREPLANIFICACIÓN DOCENTE", origin);
    output = replaceSectionBody(output, "III. PREPLANIFICACIÓN DOCENTE", "V. PROPÓSITO GENERAL", preplan);
    output = replaceSectionBody(output, "VI. PROPÓSITOS DE APRENDIZAJE Y EVALUACIÓN", "VII. ENFOQUES", competencies);
    const transversal = guideDetails([["Enfoques previstos", content.transversal_approaches], ["Actitudes a acompañar", content.observable_attitudes], ["Apoyos previstos", values.APOYOS_DIVERSIDAD], ["Participación familiar acordada", values.PARTICIPACION_FAMILIA_COMUNIDAD]]);
    output = transversal ? replaceSectionBody(output,"VII. ENFOQUES","VIII. ESTRATEGIA",transversal) : removeBetween(output,"VII. ENFOQUES","VIII. ESTRATEGIA");
    output = replaceSectionBody(output, "VIII. ESTRATEGIA GENERAL DE EVALUACIÓN", "IX. RUTA DE ACTIVIDADES", assessment);
    output = replaceSectionBody(output, "IX. RUTA DE ACTIVIDADES", "X. RECURSOS", route);
    output = removeBetween(output,"X. RECURSOS");
    output = output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g, (table) => xmlText(table).includes("Regla para Ayni:") ? "" : table);
    output = removeParagraphsContaining(output, ["Los campos {{...}}", "Una fila por competencia", "Fila repetible:", "Esta sección es el puente directo", "Anexos opcionales"]);
    output = output.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g, (row) =>
      ["Hitos o fechas del calendario", "Producto final / socialización"].some((label) => xmlText(row).includes(label)) ? "" : row);
    output=output.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g,row=>["UGEL","FECHA_SIGNIFICATIVA","ORGANIZACION_ESPACIOS","PARTICIPACION_FAMILIA_COMUNIDAD","APOYOS_DIVERSIDAD"].some(key=>!values[key]&&xmlText(row).includes("{{"+key+"}}"))?"":row);
    output = removePageBreakAfterTable(output, "Materiales y recursos base");
    output = retainCoverPageBreak(output);
    output = replaceWordText(output, "RUTA DE ACTIVIDADES / SESIONES", "RUTA DE ACTIVIDADES");
    output = replaceWordText(output, "Desempeño / referente", "Referente para observar");
    for (const [from, to] of [["V", "IV"], ["VI", "V"], ["VII", "VI"], ["VIII", "VII"], ["IX", "VIII"], ["X", "IX"]]) {
      const heading = { V: "PROPÓSITO GENERAL", VI: "PROPÓSITOS DE APRENDIZAJE Y EVALUACIÓN", VII: "ENFOQUES",
        VIII: "ESTRATEGIA GENERAL DE EVALUACIÓN", IX: "RUTA DE ACTIVIDADES", X: "RECURSOS" }[from];
      output = replaceWordText(output, `${from}. ${heading}`, `${to}. ${heading}`);
    }
    let section=0;
    const numerals=["I","II","III","IV","V","VI","VII","VIII","IX","X"];
    output=output.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g,part=>{
      const title=xmlText(part);
      if(!/^[IVX]+\. (?:DATOS GENERALES|ORIGEN|PREPLANIFICACIÓN|PROPÓSITO|ENFOQUES|ESTRATEGIA|RUTA)/.test(title))return part;
      return replaceWordText(part,title,title.replace(/^[IVX]+/,numerals[section++]));
    });
    return keepShortRowsTogether(compactCoverSpacers(insertCoverQuickView(output, "El proyecto en una mirada", overview)).replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g,keepShortTableTogether));
  } });
}
