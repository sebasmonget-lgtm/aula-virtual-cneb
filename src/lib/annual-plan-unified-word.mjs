import { buildFlexibleAnnualSchedule } from "./annual-plan-calendar.mjs";
import { ANNUAL_PLAN_TEMPLATE_FORMAT } from "./annual-plan-contract.mjs";
import { annualFlexibleValues } from "./annual-plan-flexible-word.mjs";
import { removePageBreakAfterTable, removePageBreakBeforeTable, removeParagraphsContaining, renderUnifiedWord, replaceWordText } from "./unified-word-template.mjs";

const templateUrl = new URL("../../assets/templates/planificacion-anual-inicial-unificada-v1.docx", import.meta.url);
const months = ["MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
const plainText = (xml) => [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => match[1]).join("");

function tableSlices(xml) {
  return [...xml.matchAll(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g)]
    .map((match) => ({ start: match.index, end: match.index + match[0].length, xml: match[0], text: plainText(match[0]) }));
}

function transformAnnual(xml, schedule) {
  let output = removeParagraphsContaining(xml, ["Plantilla editable", "Los campos {{ }}"]);
  const tables = tableSlices(output);
  const project13 = tables.findIndex((table) => table.text.includes("P13 | {{PROYECTO_13_TITULO}}"));
  const evaluation = tables.findIndex((table) => table.text.includes("VII. EVALUACIÓN Y SEGUIMIENTO"));
  if (project13 < 1 || evaluation <= project13 || !tables[project13 - 1].text.includes("VI. DESARROLLO MENSUAL")) {
    throw new Error("La plantilla anual cambió la secuencia de fichas de proyecto.");
  }
  output = output.slice(0, tables[project13 - 1].start) + output.slice(tables[evaluation].start);
  output = output.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g, (row) =>
    /\{\{PROYECTO_(?:1[3-9]|20)_(?:TITULO|INICIO|FIN|DURACION|PRODUCTO)\}\}/.test(row) ? "" : row);
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
    return table.replace(/(<w:t(?:\s[^>]*)?>)(?:MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)(<\/w:t>)/,
      (_, open, close) => `${open}${month}${close}`);
  });
  if (headingCount !== 12) throw new Error("La plantilla anual no contiene las doce fichas esperadas.");
  for (const [source, target] of [
    ["Producto o evidencia final", "Producto posible del proyecto"],
    ["Recurso visual / enlace (opcional)", "Qué podríamos observar"],
    ["sesiones de aprendizaje", "actividades de aprendizaje"],
    ["Contexto familiar y sociocultural", "Contexto del grupo"],
  ]) output = replaceWordText(output, source, target);
  output = removePageBreakAfterTable(output, "Prioridades del año:");
  output = removePageBreakBeforeTable(output, "V. CRONOGRAMA GENERAL DE PROYECTOS");
  output = output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g, (table) => plainText(table).includes("Registra una fila por proyecto") ? "" : table);
  output = output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g,
    (table) => table.includes("{{MARZO_N_PROYECTOS}}") ? table.replace(/<w:tblHeader(?:\s[^>]*)?\/>/g, "") : table);
  return output;
}

/** One validated twelve-object array drives the monthly view, chronology and cards. */
export async function renderAnnualPlanUnifiedWord(document, cards = [], { logo = null } = {}) {
  if (document?.content?.plan_format !== ANNUAL_PLAN_TEMPLATE_FORMAT || document.content.proposed_experiences?.length !== 12) {
    throw new Error("La planificación anual requiere exactamente doce propuestas.");
  }
  const schedule = buildFlexibleAnnualSchedule(document.document_context?.calendar, document.content.proposed_experiences);
  const values = annualFlexibleValues(document, cards, schedule);
  for (const month of months) {
    const number = months.indexOf(month) + 3;
    const projects = schedule.projects.filter((entry) => Number(entry.starts_on.slice(5, 7)) === number);
    values[`${month}_N_PROYECTOS`] = projects.length ? String(projects.length) : "—";
    values[`${month}_CODIGOS`] = projects.length ? projects.map((entry) => entry.code).join(", ") : "Sin inicio de proyecto previsto";
  }
  values.CRITERIO_4 ||= "Revisar las propuestas cuando cambien los intereses y necesidades del grupo.";
  return renderUnifiedWord({ templateUrl, values, logo,
    transform: (xml) => transformAnnual(xml, schedule) });
}
