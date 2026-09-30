import { expandTableRow, insertCoverQuickView, removePageBreakAfterTable, removeParagraphsContaining, renderUnifiedWord, replaceWordText } from "./unified-word-template.mjs";
import { availableSheets, renderSheetPages } from "./workshop-sheet-catalog.mjs";

const oldTemplateUrl = new URL("../../assets/templates/actividad-aprendizaje-inicial-ayni-v2.docx", import.meta.url);
const workshopTemplateUrl = new URL("../../assets/templates/actividad-aprendizaje-inicial-con-taller-v1.docx", import.meta.url);
const clean = (value) => typeof value === "string" ? value.trim() : "";
const list = (value) => Array.isArray(value) ? value.map(clean).filter(Boolean).join("; ") : "";
const xmlText = (xml) => [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => match[1]).join("");

function removeSection(xml, startText, endText = null) {
  const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)];
  const start = paragraphs.find((match) => xmlText(match[0]).includes(startText));
  const end = endText && paragraphs.find((match) => match.index > (start?.index ?? -1) && xmlText(match[0]).includes(endText));
  if (!start) throw new Error(`No se encontró la sección ${startText} en la plantilla de actividad.`);
  return xml.slice(0, start.index) + xml.slice(end?.index ?? xml.lastIndexOf("<w:sectPr"));
}

function transformActivity(xml, evidence, closure, withWorkshop) {
  let output = xml;
  if (!evidence.length) output = removeSection(output,
    withWorkshop ? "VI. CUADERNO DE CAMPO" : "VI. REGISTRO DE OBSERVACIONES Y EVIDENCIAS", "VII. SÍNTESIS Y REFLEXIÓN DOCENTE");
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
  return output;
}

function observedDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Lima" }).format(date);
}

/** The planning document omits field notes and reflections until the teacher actually records them. */
export async function renderActivityUnifiedWord(document, cards = [], { logo = null } = {}) {
  const content = document.content ?? {};
  const withWorkshop = content.document_template_version === "activity-with-workshop-v1";
  if (!withWorkshop && content.document_template_version !== "activity-unified-v1") throw new Error("La actividad no usa la plantilla unificada.");
  if (withWorkshop && !document.workshop?.content) throw new Error("El taller confirmado de este día no está disponible.");
  const card = cards.find((item) => item.id === content.competency_id);
  const ageFocus = clean(card?.ages?.[String(document.age)]?.ai_focus);
  const route = document.experience_details?.activity_route?.find((item) => item.id === content.route_item_id);
  const criterion = document.active_criterion;
  const actualEvidence = Array.isArray(document.registered_evidence) ? document.registered_evidence : [];
  const closure = clean(document.teacher_closure_note);
  const workshop = document.workshop?.content ?? null;
  const workshopCard = cards.find((item) => item.id === workshop?.competency_id);
  const evidenceRows = actualEvidence.map((item) => ({
    EVIDENCIA_ESTUDIANTE: clean(item.student_name) || "Niño del aula",
    EVIDENCIA_CRITERIO: clean(item.criterion_text) || clean(criterion?.criterion_text) || clean(content.evaluation_criterion || route?.evaluation_criterion),
    EVIDENCIA_TIPO: item.has_attachment ? "Foto" : "Sin adjunto",
    EVIDENCIA_ADJUNTO: item.has_attachment ? "Guardada en Ayni" : "",
    EVIDENCIA_REGISTRO_CAMPO: [observedDate(item.observed_at), clean(item.observation_text) || "Foto registrada en Ayni"].filter(Boolean).join(" · "),
    EVIDENCIA_SIGUIENTE_PASO: "Revisar junto con nuevos registros",
  }));
  const whatToObserve = list(criterion?.observation_focus) || clean(content.evidence_opportunities) || clean(content.expected_evidence || route?.expected_evidence);
  const date = String(document.occurs_on ?? "").slice(0, 10);
  const values = {
    "AÑO_ESCOLAR": String(document.school_year), TITULO_ACTIVIDAD: document.title,
    TITULO_PROYECTO: clean(document.experience_title), INSTITUCION_EDUCATIVA: clean(document.institution_name) || "Institución educativa",
    EDAD_AULA: `${document.age || ""} años · ${clean(document.classroom)}`, DOCENTE: clean(document.teacher_name) || "Docente del aula",
    FECHA: /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date.slice(8)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : date,
    UGEL: clean(document.ugel) || "Sin dato registrado", NUMERO_ACTIVIDAD: String(route?.number ?? "Del proyecto"),
    DURACION_REFERENCIAL: "Flexible según el grupo", SEDE_COLEGIO: clean(document.district) || "Sede principal",
    PROPOSITO_QUE: clean(content.purpose), PROPOSITO_COMO: clean(content.child_actions), PROPOSITO_PARA_QUE: clean(content.closure_or_continuity),
    COMPETENCIA_PRINCIPAL: card?.name || "Por confirmar con la docente",
    CAPACIDADES_PERTINENTES: list(card?.capacities?.map((item) => item.official_name)),
    DESEMPENO_PERTINENTE: ageFocus ? `Síntesis orientativa para ${document.age} años: ${ageFocus}` : "Síntesis orientativa de la edad aún no disponible.",
    CRITERIO_EVALUACION: clean(criterion?.criterion_text) || clean(content.evaluation_criterion || route?.evaluation_criterion) || "La docente precisará el criterio antes de observar.",
    QUE_OBSERVAR: whatToObserve || "La docente precisará qué actuación observar.",
    EVIDENCIA_ESPERADA: clean(content.expected_evidence || route?.expected_evidence) || clean(content.evidence_opportunities),
    COMPETENCIA_INTEGRADA: "No se prioriza otra competencia en esta actividad.",
    ENFOQUE_TRANSVERSAL: "Según la situación del aula", ACTITUD_OBSERVABLE: "Escuchar y participar respetando las distintas formas de expresión.",
    APOYOS_DIVERSIDAD: "Ajustar materiales y tiempos según el grupo.",
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
  return renderUnifiedWord({ templateUrl: withWorkshop ? workshopTemplateUrl : oldTemplateUrl, values, logo, appendixImages,
    transform: (xml) => insertCoverQuickView(transformActivity(xml, evidenceRows, closure, withWorkshop), "Hoy en el aula", overview),
    transformPart: (part, xml) => part.includes("header") ? replaceWordText(xml, "PLANIFICACIÓN ANUAL", "ACTIVIDAD DE APRENDIZAJE") : xml });
}
