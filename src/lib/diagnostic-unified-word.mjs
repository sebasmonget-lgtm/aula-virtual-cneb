import { insertCoverQuickView, renderUnifiedWord, removeParagraphsContaining, replaceWordText, xmlEscape } from "./unified-word-template.mjs";

const templateUrl = new URL("../../assets/templates/evaluacion-diagnostica-inicial-unificada-v1.docx", import.meta.url);
const competencyFields = [
  ["PS_IDENTIDAD", "CONSTRUYE_IDENTIDAD"], ["PS_CONVIVE", "CONVIVE"],
  ["PSICO_MOTRICIDAD", "MOTRICIDAD"], ["COM_ORAL", "ORALIDAD"],
  ["COM_LECTURA", "LECTURA"], ["COM_ESCRITURA", "ESCRITURA"],
  ["COM_ARTE", "ARTE"], ["MAT_CANTIDAD", "CANTIDAD"],
  ["MAT_FORMA", "FORMA"], ["CYT_INDAGA", "INDAGA"],
  ["TRANS_AUTONOMO", "GESTIONA"], ["TRANS_TIC", "TIC"],
  ["PS_RELIGION", "RELIGION"], ["CAST_L2_ORAL", "CASTELLANO_L2"],
];
const clean = (value) => typeof value === "string" ? value.trim() : "";
const dateLabel = (value) => /^\d{4}-\d{2}-\d{2}/.test(String(value ?? ""))
  ? `${String(value).slice(8, 10)}/${String(value).slice(5, 7)}/${String(value).slice(0, 4)}` : "";
const countLabel = (count, one, many) => `${count} ${count === 1 ? one : many}`;
const xmlText = (xml) => [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => match[1]).join("");

function paragraph(value, bold = false, bullet = false) {
  return `<w:p><w:pPr><w:spacing w:before="${bold ? 145 : 0}" w:after="${bold ? 75 : 55}"/>${bullet ? '<w:ind w:left="340" w:hanging="180"/>' : ""}${bold ? "<w:keepNext/>" : ""}</w:pPr><w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:color w:val="173352"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${xmlEscape(`${bullet ? "• " : ""}${value}`)}</w:t></w:r></w:p>`;
}

function replaceSectionBody(xml, startText, endText, body) {
  const tables = [...xml.matchAll(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g)];
  const start = tables.find((match) => xmlText(match[0]).includes(startText));
  const end = tables.find((match) => match.index > (start?.index ?? -1) && xmlText(match[0]).includes(endText));
  if (!start || !end) throw new Error(`No se encontró la sección ${startText} en la plantilla diagnóstica.`);
  return xml.slice(0, start.index) + body + xml.slice(end.index);
}

function replaceFromParagraphToTable(xml, startText, endText, body) {
  const start = [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)]
    .find((match) => xmlText(match[0]).includes(startText));
  const end = [...xml.matchAll(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g)]
    .find((match) => match.index > (start?.index ?? -1) && xmlText(match[0]).includes(endText));
  if (!start || !end) throw new Error(`No se encontró el bloque ${startText} en la plantilla diagnóstica.`);
  return xml.slice(0, start.index) + body + xml.slice(end.index);
}

// Civil dates are already local. Instants must be projected into the school's
// time zone before being used as calendar dates in a teacher-facing document.
function observedDay(value) {
  const raw = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const instant = new Date(raw);
  if (!raw || Number.isNaN(instant.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

function uniqueObservations(observations) {
  const seen = new Set();
  return observations.filter((item) => {
    // Legacy snapshots without IDs must not collapse unrelated equal text.
    if (!item.id) return true;
    const key = `${item.student_id}:${item.source_type ?? ""}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function snapshotOf(document) {
  const snapshot = document?.content?.report_snapshot;
  if (document?.content?.document_format !== "diagnostic-unified-v1" || snapshot?.version !== "diagnostic-unified-v1" ||
      !Array.isArray(snapshot.children) || !Array.isArray(snapshot.observations)) {
    throw new Error("Este diagnóstico no tiene una versión estructurada para la plantilla unificada.");
  }
  return snapshot;
}

function competencyValues(snapshot, cards) {
  const names = new Map(cards.map((card) => [card.id, clean(card.name || card.official_name)]));
  const children = new Map(snapshot.children.map((child) => [child.student_id, child]));
  const values = {};
  for (const [id, key] of competencyFields) {
    const records = snapshot.observations.filter((item) => item.competency_id === id);
    const withText = records.filter((item) => clean(item.observation_text));
    const observedChildren = new Set(records.map((item) => item.student_id));
    values[`EVID_${key}`] = withText.length
      ? withText.slice(0, 4).map((item) => `${children.get(item.student_id)?.name || "Niño del aula"}: “${clean(item.observation_text).slice(0, 360)}”`).join("; ")
      : records.length ? `${countLabel(records.length, "registro", "registros")} sin una nota descriptiva suficiente.` : "Información insuficiente: aún no hay observaciones vinculadas.";
    values[`LECTURA_${key}`] = records.length
      ? `Hay registros de ${countLabel(observedChildren.size, "niño", "niños")}. Son un punto de partida; la docente contrastará estas actuaciones en otras situaciones.`
      : "Información insuficiente para interpretar esta competencia en el grupo.";
    values[`DECISION_${key}`] = records.length
      ? "Ofrecer nuevas oportunidades en el juego y registrar cómo participa cada niño."
      : "Mantenerla en observación antes de tomar una decisión específica.";
    if (!names.has(id) && records.length) throw new Error(`Competencia diagnóstica no disponible: ${id}.`);
  }
  return values;
}

function valuesFor(document, context, cards) {
  const snapshot = snapshotOf(document);
  const group = document.content;
  const observations = snapshot.observations;
  const records = uniqueObservations(observations);
  const children = snapshot.children;
  const commentCount = children.filter((child) => clean(child.teacher_comment)).length;
  const observedIds = new Set(observations.map((item) => item.student_id));
  const dates = records.map((item) => observedDay(item.observed_at)).filter(Boolean).sort();
  const observedFrom = dateLabel(dates[0]);
  const observedTo = dateLabel(dates.at(-1));
  const plannedStart = String(context.diagnostic_period_start ?? "").slice(0, 10);
  const plannedEnd = String(context.diagnostic_period_end ?? "").slice(0, 10);
  const datesOutsidePeriod = /^\d{4}-\d{2}-\d{2}$/.test(plannedStart) && /^\d{4}-\d{2}-\d{2}$/.test(plannedEnd)
    && dates.some((date) => date < plannedStart || date > plannedEnd);
  const needs = clean(group.needs);
  const strengths = clean(group.strengths);
  const priorities = clean(group.planning_priorities);
  const reportedInterests = Array.isArray(context.reported_interests) ? context.reported_interests.filter((item) => clean(item)) : [];
  const confirmedPriorities = Array.isArray(context.confirmed_priorities) ? context.confirmed_priorities
    .filter((item) => clean(item?.title)) : [];
  const competencyNames = new Map(cards.map((card) => [card.id, clean(card.name || card.official_name)]));
  const priorityTitles = confirmedPriorities.map((item) => clean(item.title)).join("; ");
  const priorityDecision = (item) => [clean(item?.reason),
    Array.isArray(item?.related_competency_ids) && item.related_competency_ids.length
      ? `Competencias relacionadas: ${item.related_competency_ids.map((id) => competencyNames.get(id)).filter(Boolean).join(", ")}.` : ""]
    .filter(Boolean).join(" ") || "La docente precisará cómo acompañar esta prioridad.";
  const reportedLanguages = [...new Set(children.map((child) => clean(child.family_context?.language_context)).filter(Boolean))].slice(0, 4);
  const missing = competencyFields.filter(([id]) => (id !== "PS_RELIGION" || snapshot.religion_applicable) &&
    (id !== "CAST_L2_ORAL" || snapshot.castellano_l2_applicable) && !observations.some((item) => item.competency_id === id))
    .map(([id]) => cards.find((card) => card.id === id)?.name || cards.find((card) => card.id === id)?.official_name)
    .filter(Boolean).slice(0, 4);
  const values = {
    "AÑO_ESCOLAR": String(context.school_year ?? document.school_year),
    INSTITUCION_EDUCATIVA: clean(context.institution_name) || clean(document.institution_name),
    EDAD_AULA: `${context.age} años · ${clean(context.classroom || document.classroom)}`,
    DOCENTE: clean(context.teacher_name) || "Docente del aula",
    UGEL: clean(context.ugel) || "No registrada",
    FECHA_INICIO_DIAGNOSTICO: dateLabel(context.diagnostic_period_start) || observedFrom || "Inicio del año escolar",
    FECHA_FIN_DIAGNOSTICO: dateLabel(context.diagnostic_period_end) || observedTo || "Fecha de confirmación del informe",
    N_ESTUDIANTES: String(children.length),
    N_OBSERVADOS: String(observedIds.size),
    N_ENTREVISTAS_COMPLETADAS: String(children.filter((item) => item.has_confirmed_interview).length),
    N_EVIDENCIAS_REVISADAS: String(records.length),
    PROPOSITO_DIAGNOSTICO: "Conocer cómo inicia el grupo para decidir cómo acompañar sus aprendizajes.",
    CONTEXTO_PERIODO_DIAGNOSTICO: dates.length
      ? `Registros revisados: del ${observedFrom} al ${observedTo}${commentCount ? ", junto con comentarios confirmados de la docente" : ""}.${datesOutsidePeriod ? ` Revisar fechas: hay registros fuera del período previsto (${dateLabel(plannedStart)} al ${dateLabel(plannedEnd)}).` : ""}`
      : "Aún faltan observaciones fechadas del aula; se continuará recogiendo información.",
    FOCOS_DIAGNOSTICOS: "El juego, la expresión, la convivencia, la exploración y las necesidades que aparecen en el aula.",
    CONDICIONES_RECOJO: "Las entrevistas describen el contexto familiar. Las observaciones docentes muestran lo ocurrido en el aula; una ausencia de registro no indica una dificultad.",
    ESTADO_ENTREV: `${children.filter((item) => item.has_confirmed_interview).length} de ${children.length} entrevistas confirmadas`,
    ESTADO_OBS: `${countLabel(records.length, "registro", "registros")} de ${countLabel(observedIds.size, "niño", "niños")}`,
    ESTADO_DOC: `${countLabel(commentCount, "comentario individual confirmado", "comentarios individuales confirmados")} por la docente`,
    ESTADO_PORT: "Producciones y portafolio: consultar los registros disponibles en Ayni.",
    INFORMACION_PENDIENTE: children.length > observedIds.size
      ? `${children.length - observedIds.size} niños aún no tienen observaciones docentes en este corte. Se continuará observando.`
      : "La observación continúa durante el año; estas conclusiones son iniciales.",
    DIAGNOSTICO_FORTALEZAS: strengths || "Información insuficiente para describir una fortaleza grupal.",
    DIAGNOSTICO_NECESIDADES: needs || "Información insuficiente para precisar necesidades grupales.",
    DIAGNOSTICO_INTERESES: reportedInterests.length ? `Las familias mencionaron intereses como ${reportedInterests.join(", ")}. Conviene retomarlos y observar cuáles aparecen también en el juego y las experiencias del aula.` : "Las entrevistas no aportan intereses estructurados suficientes para resumirlos aquí; se seguirán explorando durante el juego y la conversación.",
    DIAGNOSTICO_CONTEXTO: reportedLanguages.length ? `Las familias informaron sobre las lenguas del hogar: ${reportedLanguages.join("; ")}. Este contexto ayuda a planificar formas de participación; no sustituye la observación docente.` : "Las entrevistas confirmadas aportan contexto para comprender a cada niño. Sus respuestas no se usan como observaciones docentes.",
    DIAGNOSTICO_ADAPTACION_BIENESTAR: "Revisar cómo se adapta y participa cada niño en distintas situaciones; aún no se establece una conclusión general sin evidencia suficiente.",
    DIAGNOSTICO_BARRERAS_APOYOS: "Ajustar materiales, tiempos e interacciones según las necesidades observadas y los comentarios confirmados de la docente.",
    PRIORIDADES_DIAGNOSTICAS: priorityTitles || priorities || "Seguir observando para precisar las primeras prioridades.",
    PRIORIDAD_1: confirmedPriorities[0]?.title || "Aprovechar las fortalezas observadas", DECISION_PRIORIDAD_1: confirmedPriorities[0] ? priorityDecision(confirmedPriorities[0]) : strengths || "Seguir recogiendo registros para reconocer fortalezas.",
    PRIORIDAD_2: confirmedPriorities[1]?.title || "Ofrecer más oportunidades de aprendizaje", DECISION_PRIORIDAD_2: confirmedPriorities[1] ? priorityDecision(confirmedPriorities[1]) : needs || "Precisar necesidades con nuevas observaciones.",
    PRIORIDAD_3: confirmedPriorities[2]?.title || "Ajustar las próximas experiencias", DECISION_PRIORIDAD_3: confirmedPriorities[2] ? priorityDecision(confirmedPriorities[2]) : priorities || "Revisar lo observado antes de planificar.",
    FORTALEZAS_A_POTENCIAR: strengths || "Información insuficiente.",
    IMPLICANCIAS_PLAN_ANUAL: priorityTitles || priorities || "El plan anual se ajustará con nuevas observaciones confirmadas.",
    IMPLICANCIAS_PRIMERAS_EXPERIENCIAS: needs || "Ofrecer juego, conversación y exploración para seguir conociendo al grupo.",
    ASPECTOS_PENDIENTES_OBSERVAR: missing.length ? `Seguir observando, entre otras, estas competencias: ${missing.join("; ")}.` : "Continuar reuniendo evidencias en situaciones variadas.",
    FECHA_REVISION_DIAGNOSTICO: "Al revisar las siguientes experiencias del aula.",
    CONCLUSION_DIAGNOSTICA_GRUPAL: [strengths && `Fortalezas: ${strengths}`, needs && `Oportunidades para acompañar: ${needs}`,
      (priorityTitles || priorities) && `Primeras decisiones: ${priorityTitles || priorities}`, "El diagnóstico se actualizará con nuevas observaciones."].filter(Boolean).join(" "),
    REFERENCIA_ENTREVISTAS: `${children.filter((item) => item.has_confirmed_interview).length} entrevistas confirmadas en Ayni Aula.`,
    REFERENCIA_OBSERVACIONES: `${countLabel(records.length, "registro", "registros")} de observación incluidos en este corte.`,
    REFERENCIA_PORTAFOLIO: "Consultar el portafolio del aula si existen producciones vinculadas.",
    REFERENCIA_OTROS: commentCount ? "Comentarios individuales confirmados por la docente." : "Sin comentarios individuales registrados.",
    RESPONSABLE_REVISION: "Revisión interna del aula",
    ...competencyValues(snapshot, cards),
  };
  // The teacher's confirmed comments are the nominal interpretation. No model
  // invents a child-specific diagnosis or a future observation for this table.
  const followups = children.map((child) => {
    const childObservations = observations.filter((item) => item.student_id === child.student_id && clean(item.observation_text));
    const observedCompetencies = [...new Set(childObservations.map((item) => competencyNames.get(item.competency_id)).filter(Boolean))].slice(0, 2);
    const chronological = uniqueObservations(childObservations).sort((a, b) => String(a.observed_at ?? "").localeCompare(String(b.observed_at ?? "")));
    const selected = chronological.length > 1 ? [chronological[0], chronological.at(-1)] : chronological;
    const excerpts = selected.map((item) =>
      `${competencyNames.get(item.competency_id) || "Observación"}: “${clean(item.observation_text).slice(0, 180)}”`);
    return {
      name: child.name,
      situation: [clean(child.teacher_comment) && `Docente: ${clean(child.teacher_comment)}`,
        excerpts.length && `En el aula: ${excerpts.join("; ")}${chronological.length > selected.length ? ` (Se muestran ${selected.length} de ${chronological.length} registros; consultar los demás en Ayni).` : ""}`,
        clean(child.family_context?.adaptation_context) && `Familia informa: ${clean(child.family_context.adaptation_context)}`].filter(Boolean).join(" ") || "Información insuficiente.",
      support: child.information_status === "insufficient_information"
        ? "Continuar observando y precisar el acompañamiento con nuevos registros."
        : [clean(child.family_context?.interests) && `Ofrecer oportunidades vinculadas con ${clean(child.family_context.interests)} y comprobar si ese interés aparece en el aula.`,
          observedCompetencies.length && `Retomar ${observedCompetencies.join(" y ")} en nuevas situaciones; considerar el comentario docente antes de ajustar los apoyos.`,
          !observedCompetencies.length && "Planificar primeras oportunidades de observación y considerar el comentario docente."].filter(Boolean).join(" "),
      date: "Durante las próximas experiencias",
    };
  });
  return { values, followups };
}

function transformDiagnostic(xml, context, snapshot, followups, values) {
  let output = removeParagraphsContaining(xml, ["{{...", "Plantilla editable"]);
  output = replaceSectionBody(output, "II. PROPÓSITO Y ALCANCE", "III. CÓMO SE RECOGIÓ LA INFORMACIÓN", [
    paragraph("II. PROPÓSITO Y FECHAS", true),
    paragraph(values.PROPOSITO_DIAGNOSTICO),
    paragraph(`Período previsto de recojo: ${values.FECHA_INICIO_DIAGNOSTICO} al ${values.FECHA_FIN_DIAGNOSTICO}.`, true),
    paragraph(values.CONTEXTO_PERIODO_DIAGNOSTICO),
    paragraph(`Qué se buscó conocer: ${values.FOCOS_DIAGNOSTICOS}`),
  ].join(""));
  const records = uniqueObservations(snapshot.observations);
  const observed = new Set(records.map((item) => item.student_id));
  const comments = snapshot.children.filter((child) => clean(child.teacher_comment)).length;
  const sources = [
    paragraph(`Entrevistas familiares: ${snapshot.children.filter((child) => child.has_confirmed_interview).length} de ${snapshot.children.length} confirmadas. Aportan contexto; no sustituyen la observación del aula.`, false, true),
    paragraph(`Observaciones docentes: ${countLabel(records.length, "registro", "registros")} de ${countLabel(observed.size, "niño", "niños")}. Describen lo que hicieron o dijeron.`, false, true),
    paragraph(`${countLabel(comments, "comentario individual confirmado", "comentarios individuales confirmados")} por la docente.`, false, true),
    paragraph("Producciones: consultar los registros disponibles en Ayni.", false, true),
  ].join("");
  output = replaceSectionBody(output, "III. CÓMO SE RECOGIÓ LA INFORMACIÓN", "IV. COBERTURA DEL DIAGNÓSTICO",
    paragraph("III. FUENTES REVISADAS", true) + sources);
  output = replaceSectionBody(output, "IV. COBERTURA DEL DIAGNÓSTICO", "V. SÍNTESIS DIAGNÓSTICA DEL GRUPO", [
    paragraph("IV. COBERTURA DEL DIAGNÓSTICO", true),
    paragraph(`Niñas y niños observados: ${values.N_OBSERVADOS} de ${values.N_ESTUDIANTES}.`, false, true),
    paragraph(`Entrevistas familiares confirmadas: ${values.N_ENTREVISTAS_COMPLETADAS} de ${values.N_ESTUDIANTES}.`, false, true),
    paragraph(`Registros revisados: ${values.N_EVIDENCIAS_REVISADAS}.`, false, true),
    paragraph(`Información pendiente: ${values.INFORMACION_PENDIENTE}`, false, true),
  ].join(""));
  const cards = context.competencyCards ?? [];
  const children = new Map(snapshot.children.map((child) => [child.student_id, child.name]));
  const competencies = competencyFields.filter(([id]) =>
    (id !== "PS_RELIGION" || snapshot.religion_applicable) && (id !== "CAST_L2_ORAL" || snapshot.castellano_l2_applicable))
    .map(([id]) => {
      const card = cards.find((item) => item.id === id);
      const notes = snapshot.observations.filter((item) => item.competency_id === id);
      if (!card && !notes.length) return "";
      const name = clean(card?.name || card?.official_name) || id;
      const excerpts = notes.filter((item) => clean(item.observation_text)).slice(0, 3)
        .map((item) => paragraph(`${children.get(item.student_id) || "Niño del aula"}: “${clean(item.observation_text)}”`, false, true)).join("");
      const rest = notes.filter((item) => clean(item.observation_text)).length - Math.min(3, notes.filter((item) => clean(item.observation_text)).length);
      const evidence = excerpts || paragraph(notes.length ? `${countLabel(notes.length, "registro", "registros")} sin nota descriptiva.` : "Información insuficiente: aún no hay observaciones vinculadas.", false, true);
      const reading = notes.length ? `Hay registros de ${countLabel(new Set(notes.map((item) => item.student_id)).size, "niño", "niños")}. Son un punto de partida, no una valoración final.` : "Información insuficiente para interpretar esta competencia en el grupo.";
      const decision = notes.length ? "Observar esta competencia en otras situaciones antes de ajustar las actividades." : "Mantenerla en observación antes de tomar una decisión específica.";
      return paragraph(name, true) + paragraph("Evidencias observadas", true) + evidence +
        (rest > 0 ? paragraph(`${rest} registros más disponibles en Ayni.`, false, true) : "") +
        paragraph(`Lectura inicial: ${reading}`) + paragraph(`Decisión inicial: ${decision}`, true);
    }).join("");
  output = replaceSectionBody(output, "VI. ANÁLISIS POR COMPETENCIAS", "VII. PRIORIDADES Y DECISIONES PEDAGÓGICAS",
    paragraph("VI. ANÁLISIS POR COMPETENCIAS", true) + paragraph("Cada bloque muestra hechos registrados y una decisión inicial; no asigna un nivel de logro.") + competencies);
  const individual = followups.map((child) => [
    paragraph(child.name, true),
    paragraph(`Registros y contexto: ${child.situation}`, false, true),
    paragraph(`Apoyo o siguiente paso: ${child.support}`, false, true),
  ].join("")).join("");
  output = replaceFromParagraphToTable(output, "Seguimientos individuales o apoyos específicos", "VIII. USO DE LA INFORMACIÓN",
    paragraph("Seguimiento por niña o niño", true) + individual);
  output = replaceWordText(output, "Periodo de recojo", "Período previsto de recojo");
  output = replaceWordText(output, "Periodo diagnóstico", "Período previsto del diagnóstico");
  if (Number(context.school_year) !== 2026) output = removeParagraphsContaining(output, ["Orientaciones para el inicio del año escolar 2026"]);
  return output;
}

export async function renderDiagnosticUnifiedWord(document, context, cards = [], { logo = null } = {}) {
  const snapshot = snapshotOf(document);
  const { values, followups } = valuesFor(document, context, cards);
  const group = document.content ?? {};
  const overview = [
    ["Qué sabemos", clean(group.strengths).split(/(?<=[.!?])\s+/u)[0]],
    ["Qué falta observar", clean(group.needs).split(/(?<=[.!?])\s+/u)[0]],
  ].filter(([, value]) => value);
  return renderUnifiedWord({ templateUrl, values, logo,
    transform: (xml) => insertCoverQuickView(transformDiagnostic(xml, { ...context, competencyCards: cards }, snapshot, followups, values), "El diagnóstico en una mirada", overview) });
}
