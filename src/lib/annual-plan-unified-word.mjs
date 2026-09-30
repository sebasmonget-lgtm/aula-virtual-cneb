import path from "node:path";
import { buildFlexibleAnnualSchedule, buildEditableAnnualSchedule } from "./annual-plan-calendar.mjs";
import { readFile } from "node:fs/promises";
import { eligibleProjectImages } from "./jev-project-image.mjs";
import { ANNUAL_PLAN_TEMPLATE_FORMAT } from "./annual-plan-contract.mjs";
import { annualFlexibleValues } from "./annual-plan-flexible-word.mjs";
import { removePageBreakAfterTable, removePageBreakBeforeTable, removeParagraphsContaining, renderUnifiedWord, replaceWordText, xmlEscape } from "./unified-word-template.mjs";

const templateUrl = path.join(process.cwd(), "assets/templates/planificacion-anual-inicial-unificada-v1.docx");
const months = ["MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
const plainText = (xml) => [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => match[1]).join("");

function tableSlices(xml) {
  return [...xml.matchAll(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g)]
    .map((match) => ({ start: match.index, end: match.index + match[0].length, xml: match[0], text: plainText(match[0]) }));
}

function experienceSketch(project) {
  const topic = `${project.title ?? ""} ${project.context_or_trigger ?? ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-PE");
  const paths = [
    [/educacion inicial|jardin para jugar|mejorar.*espacio/, ["Recorren un espacio del jardín y cuentan cómo lo usan para jugar.", "Proponen un cambio pequeño y lo prueban allí.", "Conversan sobre si el cambio ayudó y qué ajustarían."]],
    [/cierre de ano|navidad/, ["Vuelven a mirar experiencias vividas durante el año.", "Eligen una para contarla o mostrarla a otros.", "Conversan sobre lo que quisieran seguir explorando."]],
    [/puente|construccion|bloque/, ["Arman una pista o construcción con los materiales disponibles.", "Prueban cómo funciona y cambian una parte.", "Comparan qué pasó antes y después del cambio."]],
    [/huerto|planta|semilla|fruto/, ["Miran las plantas o semillas de cerca y cuentan qué notan.", "Prueban una forma de cuidarlas y vuelven a observarlas.", "Comparan los cambios que ven con el paso de los días."]],
    [/agua|material/, ["Eligen materiales para probar qué ocurre al usarlos con agua.", "Comparan lo que pasa en cada prueba.", "Cuentan qué cambiarían para comprobar otra idea."]],
    [/sombra|luz/, ["Buscan sombras en distintos lugares y momentos.", "Mueven un objeto o cambian de lugar para probar qué ocurre.", "Comparan las sombras y cuentan qué descubrieron."]],
    [/mercado|tienda/, ["Organizan un espacio de tienda con objetos del aula.", "Acuerdan quiénes atenderán y quiénes comprarán durante el juego.", "Cambian los roles y conversan sobre lo que necesitaron."]],
    [/cuento|historia|relato|comunidad/, ["Escuchan o cuentan una historia conocida.", "Eligen una parte para representarla con palabras, dibujos o juego.", "Comparten sus versiones y conversan sobre las diferencias."]],
    [/ruta|camino|recorrido|circuito|movimiento/, ["Marcan un recorrido con objetos o señales.", "Lo siguen y prueban otra forma de llegar.", "Explican por dónde pasaron y ajustan el recorrido."]],
    [/forma|tamano|cantidad|medir/, ["Agrupan objetos y explican cómo decidieron ordenarlos.", "Prueban otra manera de compararlos.", "Cuentan qué cambió al mover o agregar objetos."]],
    [/musica|sonido|arte|imagen|dibujo/, ["Exploran sonidos, movimientos o imágenes con materiales del aula.", "Eligen una idea y la prueban de distintas maneras.", "Muestran lo que hicieron y cuentan cómo lo cambiaron."]],
    [/jueg|acuerdo|conviv|nino peruano/, ["Proponen juegos y escuchan las opciones del grupo.", "Eligen una posibilidad y la prueban juntos.", "Conversan sobre cómo resultó y ajustan sus acuerdos."]],
  ];
  return paths.find(([pattern]) => pattern.test(topic))?.[1] ??
    ["Miran los materiales y comparten ideas sobre cómo usarlos.", "Eligen una propuesta y la ponen a prueba.", "Cuentan qué ocurrió y qué cambiarían la próxima vez."];
}

function sketchTable(project, marker, hasImage) {
  const paragraph = (value, title = false) => `<w:p><w:pPr><w:spacing w:after="${title ? 120 : 70}"/></w:pPr><w:r><w:rPr>${title ? "<w:b/>" : ""}<w:sz w:val="20"/><w:color w:val="173352"/></w:rPr><w:t>${xmlEscape(value)}</w:t></w:r></w:p>`;
  const imageCell = hasImage ? `<w:tc><w:tcPr><w:tcW w:w="3600" w:type="dxa"/><w:shd w:fill="F2F8FC"/></w:tcPr><w:p><w:r><w:t>{{AYNI_PROJECT_IMAGE_${marker}}}</w:t></w:r></w:p></w:tc>` : "";
  const body = [paragraph("Así se podría vivir", true), ...experienceSketch(project).map((step) => paragraph(`• ${step}`))].join("");
  const width = hasImage ? 6700 : 10300;
  return `<w:tbl><w:tblPr><w:tblW w:w="10300" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D6E5EF"/><w:bottom w:val="single" w:sz="4" w:color="D6E5EF"/></w:tblBorders></w:tblPr><w:tblGrid>${hasImage ? '<w:gridCol w:w="3600"/>' : ""}<w:gridCol w:w="${width}"/></w:tblGrid><w:tr>${imageCell}<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:shd w:fill="F2F8FC"/><w:tcMar><w:top w:w="150" w:type="dxa"/><w:left w:w="180" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>${body}</w:tc></w:tr></w:tbl>`;
}

function transformAnnual(xml, schedule, projects, imagePresence) {
  let output = removeParagraphsContaining(xml, ["Plantilla editable", "Los campos {{ }}"]);
  const tables = tableSlices(output);
  const nextNumber = schedule.projects.length + 1;
  const nextMarker = `P${String(nextNumber).padStart(2, "0")} | {{PROYECTO_${String(nextNumber).padStart(2, "0")}_TITULO}}`;
  const nextProject = nextNumber <= 20 ? tables.findIndex((table) => table.text.includes(nextMarker)) : -1;
  const evaluation = tables.findIndex((table) => table.text.includes("VII. EVALUACIÓN Y SEGUIMIENTO"));
  if (evaluation < 0 || (nextNumber <= 20 && (nextProject < 1 || evaluation <= nextProject || !tables[nextProject - 1].text.includes("VI. DESARROLLO MENSUAL")))) {
    throw new Error("La plantilla anual cambió la secuencia de fichas de proyecto.");
  }
  if (nextProject > 0) output = output.slice(0, tables[nextProject - 1].start) + output.slice(tables[evaluation].start);
  output = output.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g, (row) =>
    [...row.matchAll(/\{\{PROYECTO_(\d{2})_(?:TITULO|INICIO|FIN|DURACION|PRODUCTO)\}\}/g)]
      .some((match) => Number(match[1]) > schedule.projects.length) ? "" : row);
  let headingCount = 0;
  output = output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g, (table) => {
    const text = plainText(table);
    if (text.includes("VI. DESARROLLO MENSUAL DE LA PLANIFICACIÓN ANUAL")) {
      headingCount += 1;
      return headingCount === 1 ? table : "";
    }
    const title = text.match(/P(\d{2}) \| \{\{PROYECTO_\d{2}_TITULO\}\}/);
    if (!title) return table;
    const entry = schedule.projects[Number(title[1]) - 1];
    if (!entry) throw new Error(`La ficha ${title[1]} no tiene propuesta estructurada.`);
    const month = months[Number(entry.starts_on.slice(5, 7)) - 3];
    if (!month) throw new Error(`Fecha de proyecto fuera del año lectivo: ${entry.starts_on}.`);
    const dated = table.replace(/(<w:t(?:\s[^>]*)?>)(?:MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)(<\/w:t>)/,
      (_, open, close) => `${open}${month}${close}`);
    return entry.code.startsWith("U") ? dated.replace(`P${title[1]} |`, `U${title[1]} |`) : dated;
  });
  if (headingCount !== schedule.projects.length) throw new Error("La plantilla anual no contiene las fichas esperadas.");
  for (const [source, target] of [
    ["Producto o evidencia final", "Producto posible del proyecto"],
    ["Recurso visual / enlace (opcional)", "Qué podríamos observar"],
    ["sesiones de aprendizaje", "actividades de aprendizaje"],
    ["Contexto familiar y sociocultural", "Contexto del grupo"],
  ]) output = replaceWordText(output, source, target);
  for (const entry of schedule.projects.filter((item) => item.code.startsWith("U"))) {
    output = replaceWordText(output, `P${entry.code.slice(1)}`, entry.code);
  }
  output = removePageBreakAfterTable(output, "Prioridades del año:");
  output = removePageBreakBeforeTable(output, "V. CRONOGRAMA GENERAL DE PROYECTOS");
  output = output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g, (table) => plainText(table).includes("Registra una fila por proyecto") ? "" : table);
  output = output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g,
    (table) => table.includes("{{MARZO_N_PROYECTOS}}") ? table.replace(/<w:tblHeader(?:\s[^>]*)?\/>/g, "") : table);
  let imagePlaces = 0;
  output = output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g, (table) => {
    const match = table.match(/\{\{PROYECTO_(\d{2})_OBSERVACIONES\}\}/);
    if (!match) return table;
    imagePlaces += 1;
    const index = Number(match[1]) - 1;
    return `${table}${sketchTable(projects[index], match[1], imagePresence[index])}`;
  });
  if (imagePlaces !== schedule.projects.length) throw new Error("La plantilla anual no tiene espacio para las imágenes de cada proyecto.");
  output = output.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g, (row) =>
    plainText(row).includes("La planificación anual se articula con los proyectos") ? "" : row);
  output = output.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) =>
    /<w:br\b[^>]*w:type="page"/.test(paragraph) && paragraph.includes("<w:pPr")
      ? paragraph.replace("</w:pPr>", "<w:pageBreakBefore/></w:pPr>").replace(/<w:br\b[^>]*w:type="page"\s*\/>/g, "")
      : paragraph);
  output = output.replace(/(<w:pgMar\b[^>]*\bw:bottom=")1440("[^>]*\/>)/,
    (_match, before, after) => `${before}1000${after}`);
  const sectionAt = output.lastIndexOf("<w:sectPr");
  if (sectionAt >= 0) {
    const paragraphs = [...output.slice(0, sectionAt).matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)];
    const lastParagraph = paragraphs.at(-1);
    if (lastParagraph && lastParagraph.index + lastParagraph[0].length === sectionAt
      && !plainText(lastParagraph[0]) && !lastParagraph[0].includes("<w:drawing"))
      output = output.slice(0, lastParagraph.index) + output.slice(sectionAt);
  }
  return output;
}

function compactAnnualFooter(part, xml) {
  if (!/^word\/footer[12]\.xml$/.test(part)) return xml;
  return xml.replace(/<(wp:extent|a:ext)\b([^>]*\bcx=")(\d+)("[^>]*\bcy=")(\d+)("[^>]*)\/>/g,
    (_match, tag, before, width, middle, height, after) =>
      `<${tag}${before}${width}${middle}${Math.round(Number(height) * 0.72)}${after}/>`);
}

/** The same confirmed proposals drive the monthly view, chronology and cards. */
export async function renderAnnualPlanUnifiedWord(document, cards = [], { logo = null } = {}) {
  const editable = document?.source_plan_format === "annual_preplan_v1";
  if (document?.content?.plan_format !== ANNUAL_PLAN_TEMPLATE_FORMAT ||
    (!editable && document.content.proposed_experiences?.length !== 12) ||
    (editable && (document.content.proposed_experiences?.length < 1 || document.content.proposed_experiences?.length > 20))) {
    throw new Error("La planificación anual requiere propuestas confirmadas.");
  }
  const schedule = editable ? buildEditableAnnualSchedule(document.document_context?.calendar, document.content.proposed_experiences)
    : buildFlexibleAnnualSchedule(document.document_context?.calendar, document.content.proposed_experiences);
  const values = annualFlexibleValues(document, cards, schedule);
  for (const month of months) {
    const number = months.indexOf(month) + 3;
    const projects = schedule.projects.filter((entry) => Number(entry.starts_on.slice(5, 7)) === number);
    values[`${month}_N_PROYECTOS`] = projects.length ? String(projects.length) : "—";
    values[`${month}_CODIGOS`] = projects.length ? projects.map((entry) => entry.code).join(", ") : "Sin inicio de proyecto previsto";
  }
  values.CRITERIO_4 ||= "Revisar las propuestas cuando cambien los intereses y necesidades del grupo.";
  const usedIds = [];
  const inlineImages = [];
  const imagePresence = [];
  for (const [index, project] of document.content.proposed_experiences.entries()) {
    const candidates = await eligibleProjectImages({ title: project.title, purpose: project.purpose,
      situation: project.meaningful_situation ?? project.situation ?? project.context_or_trigger },
    document.document_context?.age, { usedIds });
    const image = candidates[0];
    imagePresence.push(Boolean(image));
    if (image) usedIds.push(image.id);
    if (image) inlineImages.push({ marker: `AYNI_PROJECT_IMAGE_${String(index + 1).padStart(2, "0")}`,
      data: await readFile(image.file), alt: image.title });
  }
  return renderUnifiedWord({ templateUrl, values, logo, inlineImages,
    transform: (xml) => transformAnnual(xml, schedule, document.content.proposed_experiences, imagePresence), transformPart: compactAnnualFooter });
}
