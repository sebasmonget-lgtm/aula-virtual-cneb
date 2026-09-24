import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import sharp from "sharp";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";

const templateUrl = new URL("../../assets/templates/evaluacion-diagnostica-inicial-ayni.docx", import.meta.url);
const clean = (value) => typeof value === "string" ? value.trim() : "";
const xmlEscape = (value) => String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const numberOf = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`;
const dateLabel = (value) => {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
};

function valuesFor(document, context) {
  const group = document.content ?? {};
  const names = context.student_names ?? [];
  const safe = (value) => clean(neutralizeAssessmentText(value, names));
  const strengths = safe(group.strengths);
  const needs = safe(group.needs);
  const priorities = safe(group.planning_priorities);
  const total = context.student_count ?? 0;
  const count = context.observation_count ?? 0;
  const periodStart = dateLabel(context.observed_from) || "Inicio del año escolar";
  const periodEnd = dateLabel(context.observed_to) || "fecha de este informe";
  const availability = document.status === "confirmed" || document.status === "active" ?
    "Resumen confirmado por la docente." : "Borrador por revisar con la docente.";
  return {
    "AÑO_ESCOLAR": String(context.school_year ?? document.school_year ?? ""),
    INSTITUCION_EDUCATIVA: clean(context.institution_name) || clean(document.institution_name) || "Institución educativa",
    EDAD_AULA: [context.age ? `${context.age} años` : "", clean(context.classroom) || clean(document.classroom)].filter(Boolean).join(" · "),
    DOCENTE: clean(context.teacher_name) || "Docente del aula",
    UGEL: clean(context.ugel) || "No registrada",
    PERIODO_DIAGNOSTICO: count ? `${periodStart} – ${periodEnd}` : "Todavía sin registros fechados",
    N_ESTUDIANTES: String(total),
    N_OBSERVADOS: String(context.observed_children ?? 0),
    N_ENTREVISTAS_COMPLETADAS: String(context.interview_count ?? 0),
    ESTADO_COMENTARIOS: `${context.reviewed_children ?? 0} de ${total}`,
    N_EVIDENCIAS_REVISADAS: String(count),
    PROPOSITO_DIAGNOSTICO: "Conocer al grupo para decidir cómo acompañar sus aprendizajes al empezar el año.",
    CONTEXTO_PERIODO_DIAGNOSTICO: count
      ? `Observaciones registradas del ${periodStart} al ${periodEnd}. ${availability}`
      : `Todavía no hay observaciones fechadas. ${availability}`,
    FOCOS_DIAGNOSTICOS: "Cómo juegan, se expresan, exploran y conviven los niños en las experiencias del aula.",
    CONDICIONES_RECOJO: "Las entrevistas aportan contexto familiar. Solo los registros del aula cuentan como observación docente.",
    ESTADO_ENTREV: `${context.interview_count ?? 0} de ${total} entrevistas confirmadas`,
    ESTADO_OBS: `${numberOf(count, "registro", "registros")} de ${numberOf(context.observed_children ?? 0, "niño", "niños")}`,
    INFORMACION_PENDIENTE: total > (context.observed_children ?? 0)
      ? `${numberOf(total - context.observed_children, "niño", "niños")} aún ${total - context.observed_children === 1 ? "no tiene" : "no tienen"} observaciones registradas.`
      : "La observación continúa durante el año.",
    DIAGNOSTICO_FORTALEZAS: strengths || "No se consignaron fortalezas grupales en este resumen.",
    DIAGNOSTICO_NECESIDADES: needs || "No se consignaron necesidades grupales en este resumen.",
    PRIORIDADES_DIAGNOSTICAS: priorities || "La docente seguirá observando para precisar las primeras decisiones.",
    IMPLICANCIAS_PLAN_ANUAL: priorities || "El plan se ajustará a partir de nuevas observaciones del grupo.",
    IMPLICANCIAS_PRIMERAS_EXPERIENCIAS: needs
      ? `Ofrecer oportunidades relacionadas con lo señalado por la docente: ${needs}`
      : "Ofrecer juego, exploración y conversación; observar lo que hace cada niño.",
    ASPECTOS_PENDIENTES_OBSERVAR: "Seguir recogiendo registros en el juego y las actividades cotidianas.",
    FECHA_REVISION_DIAGNOSTICO: "Al revisar las siguientes actividades del aula.",
    CONCLUSION_DIAGNOSTICA_GRUPAL: [availability, strengths && `Fortalezas: ${strengths}`,
      needs && `Dónde acompañar más: ${needs}`, priorities && `Decisiones: ${priorities}`,
      "Las entrevistas familiares ayudan a comprender el contexto; no reemplazan lo observado en el aula."].filter(Boolean).join(" "),
    REFERENCIA_ENTREVISTAS: `${numberOf(context.interview_count ?? 0, "entrevista confirmada", "entrevistas confirmadas")} en Ayni Aula; las respuestas no se reproducen aquí.`,
    REFERENCIA_OBSERVACIONES: `${numberOf(count, "registro", "registros")} de observación en Ayni Aula.`,
    RESPONSABLE_REVISION: "",
  };
}

function expandCompetencyRows(xml, coverage, cards) {
  const names = new Map(cards.map((card) => [card.id, clean(card.name || card.official_name)]));
  const rows = coverage.filter((item) => names.has(item.competency_id) && names.get(item.competency_id))
    .sort((a, b) => names.get(a.competency_id).localeCompare(names.get(b.competency_id), "es"));
  const pattern = /<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g;
  let found = false;
  const output = xml.replace(pattern, (row) => {
    if (!row.includes("{{COMPETENCY_NAME}}")) return row;
    found = true;
    const entries = rows.length ? rows : [{ competency_id: "", student_count: 0, record_count: 0 }];
    return entries.map((entry) => row
      .replace("{{COMPETENCY_NAME}}", xmlEscape(names.get(entry.competency_id) || "Sin observaciones vinculadas a competencias"))
      .replace("{{COMPETENCY_STUDENTS}}", String(entry.student_count))
      .replace("{{COMPETENCY_RECORDS}}", String(entry.record_count))).join("");
  });
  if (!found) throw new Error("La plantilla diagnóstica no tiene la tabla de competencias esperada.");
  return output;
}

function moveDecisionsToNextPageWhenNeeded(xml, coverage) {
  if (coverage.length < 10) return xml;
  let found = false;
  const output = xml.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g, (table) => {
    if (!table.includes("VII. PRIORIDADES Y DECISIONES PEDAGÓGICAS")) return table;
    found = true;
    return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>${table}`;
  });
  if (!found) throw new Error("La plantilla diagnóstica no tiene la sección de decisiones esperada.");
  return output;
}

async function replaceLogo(archive, xml, logo) {
  const relationships = await archive.file("word/_rels/document.xml.rels")?.async("string");
  if (!relationships?.includes('Id="rId20"') || !relationships.includes('Target="media/image10.png"') ||
      !xml.includes('r:embed="rId20"')) throw new Error("La plantilla diagnóstica no tiene el espacio de logo esperado.");
  if (logo) {
    archive.file("word/media/image10.png", await sharp(logo).resize(320, 320, { fit: "contain", background: "#ffffff00" }).png().toBuffer());
    return xml;
  }
  return xml.replace(/<w:drawing(?:\s[^>]*)?>[\s\S]*?<\/w:drawing>/g,
    (drawing) => drawing.includes('r:embed="rId20"') ? "" : drawing);
}

/** Fill the teacher's diagnostic design without inventing observations or levels. */
export async function renderDiagnosticReportWord(document, context, competencyCards = [], { logo = null } = {}) {
  if (document?.kind !== "diagnostic_summary" || !context) throw new Error("No hay datos del diagnóstico para el informe.");
  const archive = await JSZip.loadAsync(await readFile(templateUrl));
  let xml = await archive.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("La plantilla diagnóstica no tiene contenido Word.");
  xml = await replaceLogo(archive, xml, logo);
  xml = expandCompetencyRows(xml, context.competency_coverage ?? [], competencyCards);
  xml = moveDecisionsToNextPageWhenNeeded(xml, context.competency_coverage ?? []);
  const values = valuesFor(document, context);
  const replace = (_, key) => {
    if (!(key in values)) throw new Error(`La plantilla diagnóstica contiene un campo sin datos: ${key}.`);
    return xmlEscape(values[key]);
  };
  xml = xml.replace(/\{\{([^{}]+)\}\}/g, replace);
  archive.file("word/document.xml", xml);
  for (const part of Object.keys(archive.files).filter((name) => /^word\/(header|footer)\d+\.xml$/.test(name))) {
    const partXml = (await archive.file(part).async("string")).replace(/\{\{([^{}]+)\}\}/g, replace);
    archive.file(part, partXml);
  }
  return archive.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
