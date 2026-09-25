import { buildFlexibleAnnualSchedule, buildEditableAnnualSchedule } from "./annual-plan-calendar.mjs";
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
  output = removePageBreakAfterTable(output, "Prioridades del año:");
  output = removePageBreakBeforeTable(output, "V. CRONOGRAMA GENERAL DE PROYECTOS");
  output = output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g, (table) => plainText(table).includes("Registra una fila por proyecto") ? "" : table);
  output = output.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g,
    (table) => table.includes("{{MARZO_N_PROYECTOS}}") ? table.replace(/<w:tblHeader(?:\s[^>]*)?\/>/g, "") : table);
  return output;
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
  return renderUnifiedWord({ templateUrl, values, logo,
    transform: (xml) => transformAnnual(xml, schedule) });
}
