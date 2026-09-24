import { expandTableRow, removePageBreakAfterTable, removeParagraphsContaining, renderUnifiedWord, replaceWordText } from "./unified-word-template.mjs";

const templateUrl = new URL("../../assets/templates/actividad-aprendizaje-inicial-unificada-v1.docx", import.meta.url);
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

function transformActivity(xml, evidence, closure) {
  let output = xml;
  if (!evidence.length) output = removeSection(output, "VI. CUADERNO DE CAMPO", "VII. SÍNTESIS Y REFLEXIÓN DOCENTE");
  if (!closure) output = removeSection(output, "VII. SÍNTESIS Y REFLEXIÓN DOCENTE", "VIII. TALLER");
  output = removeSection(output, "VIII. TALLER");
  if (evidence.length) output = expandTableRow(output, "{{EVIDENCIA_ESTUDIANTE}}", evidence);
  output = output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g,
    (table) => xmlText(table).includes("Estos bloques se mantienen como base") ? "" : table);
  output = removeParagraphsContaining(output, ["Los campos {{...}}"]);
  output = removePageBreakAfterTable(output, "{{COMPETENCIA_PRINCIPAL}}");
  output = removePageBreakAfterTable(output, "{{INICIO}}");
  output = replaceWordText(output, "Desempeño / referente", "Referente de observación");
  return output;
}

/** The planning document omits field notes and reflections until the teacher actually records them. */
export async function renderActivityUnifiedWord(document, cards = [], { logo = null } = {}) {
  const content = document.content ?? {};
  if (content.document_template_version !== "activity-unified-v1") throw new Error("La actividad no usa la plantilla unificada.");
  const card = cards.find((item) => item.id === content.competency_id);
  const ageFocus = clean(card?.ages?.[String(document.age)]?.ai_focus);
  const route = document.experience_details?.activity_route?.find((item) => item.id === content.route_item_id);
  const actualEvidence = Array.isArray(document.registered_evidence) ? document.registered_evidence : [];
  const closure = clean(document.teacher_closure_note);
  const evidenceRows = actualEvidence.map((item) => ({
    EVIDENCIA_ESTUDIANTE: clean(item.student_name) || "Niño del aula",
    EVIDENCIA_CRITERIO: clean(content.evaluation_criterion || route?.evaluation_criterion),
    EVIDENCIA_TIPO: clean(item.observation_status) || "Registro docente",
    EVIDENCIA_ADJUNTO: item.has_attachment ? "Foto guardada en Ayni · " : "",
    EVIDENCIA_REGISTRO_CAMPO: clean(item.observation_text) || "Registro sin texto descriptivo",
    EVIDENCIA_SIGUIENTE_PASO: "Revisar junto con nuevos registros",
  }));
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
    DESEMPENO_PERTINENTE: ageFocus || "Referente orientativo de la edad por revisar.",
    CRITERIO_EVALUACION: clean(content.evaluation_criterion || route?.evaluation_criterion) || "La docente precisará el criterio antes de observar.",
    EVIDENCIA_ESPERADA: clean(content.expected_evidence || route?.expected_evidence) || clean(content.evidence_opportunities),
    COMPETENCIA_INTEGRADA: "No se prioriza otra competencia en esta actividad.",
    ENFOQUE_TRANSVERSAL: "Según la situación del aula", ACTITUD_OBSERVABLE: "Escuchar y participar respetando las distintas formas de expresión.",
    APOYOS_DIVERSIDAD: "Ajustar materiales y tiempos según el grupo.",
    MATERIALES_PRINCIPALES: list(content.materials),
    INICIO: clean(content.meaningful_situation), INICIO_MEDIACION: clean(content.mediation), INICIO_RECURSOS: list(content.materials),
    DESARROLLO: clean(content.child_actions), DESARROLLO_MEDIACION: clean(content.mediation), DESARROLLO_NINOS: clean(content.child_actions), DESARROLLO_RECURSOS: list(content.materials),
    CIERRE: clean(content.closure_or_continuity), CIERRE_REFLEXION: "Conversar sobre lo que hicieron, pensaron y quisieran seguir explorando.",
    CIERRE_RECURSOS: list(content.materials),
    EVIDENCIA_ESTUDIANTE: "", EVIDENCIA_CRITERIO: "", EVIDENCIA_TIPO: "", EVIDENCIA_ADJUNTO: "", EVIDENCIA_REGISTRO_CAMPO: "", EVIDENCIA_SIGUIENTE_PASO: "",
    SINTESIS_EVIDENCIAS_REGISTRADAS: `${actualEvidence.length} registros docentes vinculados a esta actividad. La interpretación requiere revisar cada actuación.`,
    AJUSTES_SIGUIENTE: "Revisar estas evidencias al preparar la próxima actividad.", REFLEXION_DOCENTE: closure,
    TIPO_TALLER: "", TALLER_DESCRIPCION: "", ANEXOS_RECURSOS: "",
  };
  return renderUnifiedWord({ templateUrl, values, logo, transform: (xml) => transformActivity(xml, evidenceRows, closure),
    transformPart: (part, xml) => part.includes("header") ? replaceWordText(xml, "PLANIFICACIÓN ANUAL", "ACTIVIDAD DE APRENDIZAJE") : xml });
}
