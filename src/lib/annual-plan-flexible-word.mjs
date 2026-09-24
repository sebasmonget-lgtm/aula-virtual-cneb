import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import sharp from "sharp";
import { buildFlexibleAnnualSchedule } from "./annual-plan-calendar.mjs";
import { ANNUAL_PLAN_TEMPLATE_FORMAT } from "./annual-plan-contract.mjs";

const templateUrl = new URL("../../assets/templates/planificacion-anual-inicial-flexible.docx", import.meta.url);
const text = (value) => typeof value === "string" ? value.trim() : "";
const list = (value) => Array.isArray(value) ? value.map(text).filter(Boolean) : [];
const joined = (value) => list(value).map((item) => item.replace(/[.;]+$/u, "")).join("; ");
const firstSentences = (value, count) => text(value).split(/(?<=[.!?])\s+/u).slice(0, count).join(" ");
const sentence = (value) => /[.!?]$/.test(value) ? value : `${value}.`;
const diagnosisParagraph = (value, next, missing) => {
  const observed = text(value);
  if (!observed) return missing;
  return `${sentence(observed)} ${next}`;
};
const interestParagraph = (interests) => interests.length
  ? `Las familias mencionaron intereses como ${interests.join(", ")}. La docente podrá retomarlos y comprobar qué despierta la curiosidad del grupo durante el juego.`
  : "El juego y la conversación permitirán reconocer intereses que orienten las siguientes propuestas.";
const xmlEscape = (value) => String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const dateLabel = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : "";

async function addLogo(archive, xml, logo) {
  const relationships = await archive.file("word/_rels/document.xml.rels")?.async("string");
  if (!relationships?.includes('Id="rId8"') || !relationships.includes('Target="media/image1.png"') || !xml.includes('r:embed="rId8"')) {
    throw new Error("La plantilla no tiene el espacio de logo esperado.");
  }
  if (logo) {
    archive.file("word/media/image1.png", await sharp(logo).resize(320, 480, { fit: "contain", background: "#ffffff00" }).png().toBuffer());
    return xml;
  }
  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) => paragraph.includes('r:embed="rId8"') ? "" : paragraph);
}

async function keepOnlyCoverHeading(archive, xml) {
  let coverHeadings = 0;
  let projectHeadings = 0;
  const body = xml.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g, (table) => {
    if (table.includes("PLANIFICACIÓN ANUAL")) coverHeadings += 1;
    if (!table.includes("VII. DESARROLLO DE LOS PROYECTOS")) return table;
    projectHeadings += 1;
    return projectHeadings === 1 ? table : "";
  });
  if (coverHeadings !== 1 || projectHeadings !== 12) throw new Error("La plantilla anual cambió sus encabezados; revisa la portada antes de exportar.");
  const header = await archive.file("word/header1.xml")?.async("string");
  if (!header?.includes("PLANIFICACIÓN ANUAL")) throw new Error("La plantilla anual cambió su encabezado de página.");
  archive.file("word/header1.xml", header.replace(/(<w:hdr(?:\s[^>]*)?>)[\s\S]*?(<\/w:hdr>)/, "$1$2"));
  return body;
}

function replaceParagraphText(xml, marker, replacement) {
  let found = false;
  const result = xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) => {
    if (!paragraph.includes(marker)) return paragraph;
    found = true;
    let first = true;
    return paragraph.replace(/(<w:t(?:\s[^>]*)?>)[\s\S]*?(<\/w:t>)/g, (_, open, close) => {
      if (!first) return `${open}${close}`;
      first = false;
      return `${open}${xmlEscape(replacement)}${close}`;
    });
  });
  if (!found) throw new Error(`La plantilla anual ya no contiene el texto editorial esperado: ${marker}.`);
  return result;
}

function valuesFor(document, cards, schedule) {
  const proposal = document.content;
  const context = document.document_context ?? {};
  const names = new Map(cards.map((card) => [card.id, card.name || card.official_name]));
  const nameFor = (id) => {
    if (!names.has(id)) throw new Error(`Competencia del plan no disponible: ${id}.`);
    return names.get(id);
  };
  const diagnosis = context.diagnostic_group ?? {};
  const interests = list(context.group_interests);
  const stage = schedule.initial_stage;
  const instructional = schedule.blocks.filter((block) => block.type === "instructional");
  const values = {
    "AÑO_ESCOLAR": proposal.school_year,
    INSTITUCION_EDUCATIVA: text(context.institution_name) || "Institución educativa",
    EDAD_AULA: `${context.age ?? ""} años · ${text(context.classroom_section)}`.trim(),
    DOCENTE: text(context.teacher_name) || "Docente del aula",
    UGEL: text(context.ugel) || "No registrada",
    FECHA_INICIO: dateLabel(instructional[0].start_date),
    FECHA_FIN: dateLabel(instructional.at(-1).end_date),
    ETAPA_DURACION: `${stage.duration_weeks} semanas lectivas iniciales` ,
    ETAPA_PROPOSITO: stage.purpose,
    ETAPA_EXPERIENCIAS: joined(stage.suggested_experiences),
    ETAPA_OBSERVAR: joined(stage.what_to_observe),
    ETAPA_FAMILIAS: joined(stage.family_actions),
    ETAPA_FOCO: joined(stage.diagnostic_focus),
    ETAPA_FECHAS: `${dateLabel(stage.starts_on)} al ${dateLabel(stage.ends_on)}`,
    DIAGNOSTICO_FORTALEZAS: diagnosisParagraph(diagnosis.strengths,
      "El plan ofrecerá nuevas ocasiones para aprovechar estas capacidades en el juego y las actividades del aula.",
      "Aún no hay fortalezas grupales confirmadas. Se recogerán al observar al grupo en distintas actividades."),
    DIAGNOSTICO_NECESIDADES: diagnosisParagraph(diagnosis.needs,
      "Por eso se ofrecerán oportunidades para practicar y observar cómo avanza el grupo durante el año.",
      "Aún no hay necesidades grupales confirmadas. La docente podrá registrarlas al revisar nuevas observaciones."),
    DIAGNOSTICO_INTERESES: interestParagraph(interests),
    DIAGNOSTICO_CONTEXTO: firstSentences(proposal.general_context_summary, 3),
    PRIORIDADES_ANUALES: joined(proposal.planning_priorities.slice(0, 3)),
    DESCRIPCION_GENERAL_PROGRAMACION: "Doce propuestas iniciales de proyectos, organizadas en cuatro periodos lectivos. Sus fechas y duración podrán ajustarse según lo que ocurra en el aula.",
    ENFOQUES_TRANSVERSALES: joined(proposal.transversal_approaches.length
      ? proposal.transversal_approaches : proposal.teaching_strategies.slice(0, 2))
      || "Organizar juegos, preguntas y materiales variados; observar cómo participa cada niño y ajustar el acompañamiento.",
    ARTICULACION_FLEXIBILIDAD: "Las fechas son tentativas. La docente podrá ajustar preguntas, materiales, tiempos y productos según lo que observe durante el año.",
    EVALUACION_ENFOQUE_COMPLEMENTO: "Observar lo que hacen y dicen los niños durante el juego. Guardar registros concretos y revisarlos para ajustar las próximas actividades.",
    EVIDENCIAS_PRINCIPALES: [...new Set(proposal.proposed_experiences.flatMap((project) => list(project.expected_evidence_categories)))].slice(0, 8).join("; "),
    INSTRUMENTOS_REGISTROS: "Notas de observación, criterios de cada actividad y evidencias registradas en Ayni.",
    USO_INFORMACION_EVALUACION: "Revisar los registros al cierre de cada proyecto y bimestre para ajustar lo siguiente.",
    OBSERVACION_FINAL_ADICIONAL: "Revisar las propuestas al cerrar cada bimestre y ajustarlas a las necesidades del grupo.",
  };
  for (let index = 0; index < 4; index += 1) values[`CRITERIO_${index + 1}`] = proposal.organization_criteria[index];
  for (const [index, block] of instructional.entries()) {
    values[`BLOQUE_${index + 1}_FECHAS`] = `${dateLabel(block.start_date)} al ${dateLabel(block.end_date)}`;
    values[`BLOQUE_${index + 1}_CODIGOS`] = schedule.projects.filter((entry) => entry.period === `Bimestre ${index + 1}`).map((entry) => entry.code).join(", ");
  }
  for (const [index, project] of proposal.proposed_experiences.entries()) {
    const prefix = `PROYECTO_${String(index + 1).padStart(2, "0")}_`;
    const dates = schedule.projects[index];
    Object.assign(values, {
      [`${prefix}TITULO`]: project.title,
      [`${prefix}INICIO`]: dateLabel(dates.starts_on),
      [`${prefix}FIN`]: dateLabel(dates.ends_on),
      [`${prefix}DURACION`]: `${dates.duration_weeks} semanas lectivas`,
      [`${prefix}PRODUCTO`]: project.final_product,
      [`${prefix}SITUACION`]: project.context_or_trigger,
      [`${prefix}COMPETENCIA_EJE`]: nameFor(project.primary_competency_ids[0]),
      [`${prefix}COMPETENCIAS_SOPORTE`]: [...project.primary_competency_ids.slice(1), ...project.possible_secondary_competency_ids].map(nameFor).join("; "),
      [`${prefix}PROPOSITO`]: project.purpose,
      [`${prefix}MATERIALES`]: joined(project.materials),
      [`${prefix}RECURSO_VISUAL`]: joined(project.expected_evidence_categories),
      [`${prefix}OBSERVACIONES`]: project.flexibility_notes,
    });
  }
  return values;
}

/** Fill the redesigned, retained Word template from a validated saved proposal. */
export async function renderAnnualPlanFlexibleWord(document, competencyCards = [], { logo = null } = {}) {
  if (document?.content?.plan_format !== ANNUAL_PLAN_TEMPLATE_FORMAT || document.content.proposed_experiences?.length !== 12) {
    throw new Error("Este plan no tiene las doce propuestas requeridas por la plantilla.");
  }
  const schedule = buildFlexibleAnnualSchedule(document.document_context?.calendar, document.content.proposed_experiences);
  const values = valuesFor(document, competencyCards, schedule);
  const archive = await JSZip.loadAsync(await readFile(templateUrl));
  let xml = await archive.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("La plantilla anual no tiene contenido Word.");
  xml = await addLogo(archive, xml, logo);
  values.LOGO_COLEGIO = values.INSTITUCION_EDUCATIVA;
  xml = await keepOnlyCoverHeading(archive, xml);
  // Editorial instructions belong to the template, not to the teacher's finished plan.
  xml = xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) =>
    paragraph.includes("Plantilla editable") ? "" : paragraph);
  xml = xml.replace(/Recurso visual \/ enlace \(opcional\)/g, "Qué podríamos observar");
  xml = xml.replace(/sesiones de aprendizaje/g, "actividades");
  xml = xml.replace(/Contexto familiar y sociocultural/g, "Contexto del grupo");
  xml = replaceParagraphText(xml, "Resumen breve construido", "El resumen del aula fue confirmado por la docente. Las entrevistas ayudan a conocer el contexto; las observaciones cuentan lo que ocurrió en el aula.");
  xml = replaceParagraphText(xml, "proyectos, unidades o experiencias", "• El plan anual organiza los proyectos y las actividades. La docente puede ajustarlos durante el año.");
  xml = xml.replace(/Enfoques transversales priorizados/g, "Orientaciones para el trabajo diario");
  xml = xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) => {
    const match = paragraph.match(/\{\{(PROYECTO_\d{2}_COMPETENCIAS_SOPORTE)\}\}/);
    return match && !values[match[1]] ? "" : paragraph;
  });
  const replaced = new Set();
  xml = xml.replace(/\{\{([^{}]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`La plantilla contiene un campo sin datos: ${key}.`);
    replaced.add(key);
    return xmlEscape(values[key]);
  });
  for (let index = 1; index <= 12; index += 1) {
    const prefix = `PROYECTO_${String(index).padStart(2, "0")}_`;
    for (const suffix of ["TITULO", "INICIO", "FIN", "PRODUCTO", "COMPETENCIA_EJE", "PROPOSITO", "MATERIALES"]) {
      if (!replaced.has(`${prefix}${suffix}`)) throw new Error(`La plantilla anual omite un dato del proyecto ${index}: ${suffix}.`);
    }
  }
  if (/\{\{[^{}]+\}\}/.test(xml)) throw new Error("La plantilla anual conserva campos sin completar.");
  archive.file("word/document.xml", xml);
  for (const part of Object.keys(archive.files).filter((name) => /^word\/(header|footer)\d+\.xml$/.test(name))) {
    let partXml = await archive.file(part).async("string");
    partXml = partXml.replace(/\{\{([^{}]+)\}\}/g, (_, key) => xmlEscape(values[key] ?? ""));
    if (/\{\{[^{}]+\}\}/.test(partXml)) throw new Error("El encabezado conserva campos sin completar.");
    archive.file(part, partXml);
  }
  const core = await archive.file("docProps/core.xml")?.async("string");
  if (core) archive.file("docProps/core.xml", core.replace(/<dc:creator>[^<]*<\/dc:creator>/, "<dc:creator>Ayni Aula</dc:creator>")
    .replace(/<cp:lastModifiedBy>[^<]*<\/cp:lastModifiedBy>/, "<cp:lastModifiedBy>Ayni Aula</cp:lastModifiedBy>"));
  return archive.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
