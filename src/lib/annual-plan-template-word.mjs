import path from "node:path";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { buildAnnualPlanPresentation } from "./annual-plan-presentation.mjs";

const templateUrl = path.join(process.cwd(), "assets/templates/plan-anual-inicial-cneb-v4.docx");
const text = (value) => typeof value === "string" ? value.trim() : "";
const list = (value) => Array.isArray(value) ? value.map(text).filter(Boolean) : [];
const joined = (value) => list(value).join("; ");
const xmlEscape = (value) => String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;").replace(/\s*\r?\n\s*/g, " · ");
const tokens = (xml, values) => xml.replace(/\{\{([A-ZÁÉÍÓÚÑ0-9_]+)\}\}/g,
  (_, key) => xmlEscape(values[key] ?? ""));
const tables = /<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g;
const rows = /<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g;
const wordParagraph = (label, value) => `<w:p><w:pPr><w:spacing w:after="90"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${xmlEscape(label)}: </w:t></w:r><w:r><w:t>${xmlEscape(value)}</w:t></w:r></w:p>`;
const bulletParagraph = (value) => `<w:p><w:pPr><w:ind w:left="360"/><w:spacing w:after="75"/></w:pPr><w:r><w:t>${xmlEscape(`• ${value}`)}</w:t></w:r></w:p>`;
const bimestreParagraph = (value) => `<w:p><w:pPr><w:spacing w:before="150" w:after="75"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="087D96"/><w:sz w:val="22"/></w:rPr><w:t>${xmlEscape(value)}</w:t></w:r></w:p>`;

function repeatTable(xml, marker, entries, fill) {
  let found = false;
  const result = xml.replace(tables, (table) => {
    if (!table.includes(`{{${marker}}}`)) return table;
    found = true;
    return fill(table, entries);
  });
  if (!found) throw new Error(`Plantilla anual incompleta: ${marker}.`);
  return result;
}

/** Fill the supplied .docx in memory. The saved, authorized proposal is the only AI source. */
export async function renderAnnualPlanTemplateWord(document, competencyCards = [], { logo = null } = {}) {
  const source = document.content ?? {};
  const proposal = {
    title: document.title, school_year: String(document.school_year), general_context_summary: "", planning_priorities: [],
    competency_overview: [], proposed_experiences: [], review_checkpoints: [], flexibility_notes: "", ...source,
    title: document.title, school_year: String(document.school_year),
  };
  for (const key of ["planning_priorities", "competency_overview", "proposed_experiences", "review_checkpoints"]) {
    if (!Array.isArray(proposal[key])) proposal[key] = [];
  }
  proposal.proposed_experiences = proposal.proposed_experiences.filter((item) => item && typeof item === "object")
    .map((item) => ({ ...item, primary_competency_ids: list(item.primary_competency_ids),
      possible_secondary_competency_ids: list(item.possible_secondary_competency_ids),
      expected_evidence_categories: list(item.expected_evidence_categories) }));
  const cards = competencyCards.map((card) => ({ ...card, name: card.name || card.official_name }));
  const presented = buildAnnualPlanPresentation(proposal, document.document_context ?? {}, cards);
  const header = presented.header;
  const archive = await JSZip.loadAsync(await readFile(templateUrl));
  let xml = await archive.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("Plantilla anual sin contenido Word.");
  if (logo) {
    const relationships = await archive.file("word/_rels/document.xml.rels")?.async("string");
    if (!relationships) throw new Error("Plantilla anual sin relaciones de imágenes.");
    const ids = [...relationships.matchAll(/Id="rId(\d+)"/g)].map((match) => Number(match[1]));
    const relationshipId = `rId${Math.max(0, ...ids) + 1}`;
    const side = 1_143_000;
    const drawing = `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${side}" cy="${side}"/><wp:docPr id="1001" name="Logo del colegio"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="Logo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${side}" cy="${side}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
    xml = xml.replace("<w:t>{{LOGO_COLEGIO}}</w:t>", drawing);
    archive.file("word/media/ayni-logo.png", logo);
    archive.file("word/_rels/document.xml.rels", relationships.replace("</Relationships>",
      `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/ayni-logo.png"/></Relationships>`));
  }

  xml = repeatTable(xml, "AREA", [], () => "");
  xml = repeatTable(xml, "PERIODO_FECHAS", presented.experiences, (_, entries) => {
    let currentBimestre = "";
    return entries.map((item) => {
      const isBimestre = /^Bimestre [1-4]$/i.test(item.period);
      const heading = isBimestre && item.period !== currentBimestre ? bimestreParagraph(item.period) : "";
      currentBimestre = isBimestre ? item.period : "";
      return heading + bulletParagraph(isBimestre ? item.title : `${item.period} · ${item.title}`);
    }).join("");
  });
  xml = repeatTable(xml, "CODIGO", [], () => "");
  const unusedTables = ["{{CARACTERIZACION_GENERAL_GRUPO}}", "{{PRIORIDADES_INICIALES}}", "{{SINTESIS_INTERPRETATIVA_DIAGNOSTICO}}",
    "{{FOCO_1}}", "{{ENFOQUE_TRANSVERSAL}}", "{{ORIENTACION_JUEGO_AUTONOMO}}", "{{ORGANIZACION_ESPACIOS}}",
    "{{EVIDENCIAS_APRENDIZAJE}}", "{{FOCO_COMUNICACION_FAMILIAS}}", "{{NECESIDAD_DIVERSIDAD}}",
    "{{B1_CAMBIOS}}", "{{RESUMEN_REAJUSTES_Y_DECISIONES}}", "La caracterización representa adecuadamente al grupo",
    "Regla clave", "Evidencia suficiente", "Sentido del documento"];
  xml = xml.replace(tables, (table) => unusedTables.some((marker) => table.includes(marker)) ? "" : table);
  // Optional institutional fields disappear instead of filling the document with warnings.
  xml = xml.replace(tables, (table) => table.replace(rows, (row) =>
    (row.includes("{{UGEL}}") && !header.ugel) || (row.includes("{{DISTRITO_PROVINCIA_REGION}}") && !header.district)
      || (row.includes("{{FECHA_INICIO}}") && !header.dates.length) ? "" : row));
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const confirmedPriority = text(document.document_context?.diagnostic_group?.planning_priorities);
  const historicalWithConfirmedDiagnosis = !Array.isArray(source.annual_purposes)
    && (presented.diagnostic.strengths || presented.diagnostic.needs);
  const planPriorities = confirmedPriority
    ? confirmedPriority.split(/[;\n]+/).map(text).filter(Boolean)
    : historicalWithConfirmedDiagnosis ? [] : presented.priorities;
  const competencyOverview = presented.competencyOverview.filter((item) =>
    !/identificadores|tarjetas de competencias|selección curricular|prioridad curricular por confirmar|otras competencias solo podrán/i.test(item));
  const selectedCompetencies = presented.competencyMap.map((entry) => {
    const card = cardById.get(entry.id);
    const capacities = joined(card?.capacities?.map((capacity) => typeof capacity === "string" ? capacity : capacity.official_name));
    return wordParagraph(entry.name, [card?.area_name, capacities].filter(Boolean).join(" · "));
  }).join("");
  xml = xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) => {
    if (paragraph.includes("2. Punto de partida")) return paragraph +
      (presented.context && !presented.diagnostic.strengths && !presented.diagnostic.needs
        ? wordParagraph("Así es el grupo", presented.context) : "") +
      (presented.diagnostic.strengths ? wordParagraph("Lo que el grupo ya hace bien", presented.diagnostic.strengths) : "") +
      (presented.diagnostic.needs ? wordParagraph("Dónde necesita más apoyo", presented.diagnostic.needs) : "") +
      (list(presented.diagnostic.interests).length ? wordParagraph("Qué le interesa", joined(presented.diagnostic.interests)) : "");
    if (paragraph.includes("Decisiones iniciales que se derivan")) return paragraph +
      planPriorities.map(bulletParagraph).join("");
    if (paragraph.includes("3. Propósitos de aprendizaje")) return paragraph +
      (presented.annualPurposes.length ? wordParagraph("Lo que buscamos este año", joined(presented.annualPurposes)) : "") +
      competencyOverview.map(bulletParagraph).join("") +
      selectedCompetencies;
    if (paragraph.includes("4. Organización anual de experiencias")) return paragraph;
    if (paragraph.includes("6. Enfoques transversales")) return paragraph +
      presented.teachingStrategies.map(bulletParagraph).join("");
    if (paragraph.includes("7. Evaluación formativa")) {
      return paragraph + presented.assessmentFollowup.map(bulletParagraph).join("") +
        presented.familyCollaboration.map(bulletParagraph).join("") +
        presented.inclusiveSupports.map(bulletParagraph).join("");
    }
    if (paragraph.includes("8. Seguimiento y reajuste bimestral")) return paragraph +
      bulletParagraph("Al terminar cada bimestre revisaremos lo observado y ajustaremos el plan si hace falta.");
    if (paragraph.includes("9. Validación docente")) return paragraph;
    return paragraph;
  });
  xml = xml.replace(/(<w:p(?:\s[^>]*)?>[\s\S]*?<w:t>ANUAL<\/w:t>[\s\S]*?<\/w:p>)/,
    (_, paragraph) => `${paragraph}<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="17375E"/><w:sz w:val="24"/></w:rPr><w:t>${xmlEscape(document.title)}</w:t></w:r></w:p>`);

  const values = {
    LOGO_COLEGIO: header.institution || "Institución educativa",
    EDAD: header.age ?? "", AÑO_ESCOLAR: header.year, SECCION: header.classroom || document.classroom || "",
    NOMBRE_IE: header.institution || "", NOMBRE_DOCENTE: header.teacher || "",
    UGEL: header.ugel || "", DISTRITO_PROVINCIA_REGION: header.district || "",
    NUM_ESTUDIANTES: header.studentCount ?? "",
    FECHA_INICIO: header.dates[0] || "", FECHA_FIN: header.dates[1] || "",
    PERIODOS_ACADEMICOS: "4 bimestres",
  };
  // Editorial labels in the supplied template are examples, not generated facts.
  xml = xml.replace(tables, (table) => table.includes("Cómo leer esta sección") && table.includes("sistema debe repetir") ? "" : table);
  xml = xml.replace("<w:t>LOGO IE</w:t>", "<w:t>INSTITUCIÓN EDUCATIVA</w:t>");
  const omitParagraphs = ["0. Cómo se construyó este plan", "Esta sección resume lo recogido", "Caracterización general del grupo",
    "Lectura pedagógica del diagnóstico", "Criterios que orientan las decisiones", "Las formulaciones oficiales de competencias",
    "Distribución por periodos", "5. Ficha de experiencia o proyecto tentativo", "Este bloque se repite solo",
    "Enfoques transversales priorizados", "Orientaciones metodológicas del aula", "Organización de espacios, materiales y tiempos",
    "Evaluación y seguimiento", "Trabajo con las familias", "Atención a la diversidad y apoyos",
    "Usar descripciones pedagógicas", "Registro breve de decisiones relevantes", "Antes de cerrar el plan",
    "Esta sección resume lo recogido", "Fila dinámica:", "Bloque dinámico", "BLOQUE DINÁMICO",
    "Plantilla para automatización:", "(imagen dinámica)", "9. Validación docente",
    "Nota: el plan anual presenta tendencias", "Se muestran únicamente los enfoques",
    "La evaluación acompaña el aprendizaje", "El plan anual se revisa con evidencias",
    "Partimos de lo que conocemos del grupo"];
  if (!presented.annualPurposes.length && !competencyOverview.length && !selectedCompetencies) {
    omitParagraphs.push("3. Propósitos de aprendizaje");
  }
  if (!planPriorities.length) omitParagraphs.push("Decisiones iniciales que se derivan");
  if (!presented.teachingStrategies.length) omitParagraphs.push("6. Enfoques transversales");
  if (!presented.assessmentFollowup.length && !presented.familyCollaboration.length
    && !presented.inclusiveSupports.length) omitParagraphs.push("7. Evaluación formativa");
  const shorterHeadings = new Map([
    ["1. Datos generales", "Datos generales"],
    ["2. Punto de partida: síntesis diagnóstica del aula", "Lo que sabemos del grupo"],
    ["Decisiones iniciales que se derivan del diagnóstico", "Qué haremos primero"],
    ["3. Propósitos de aprendizaje y mapa anual de competencias", "Qué aprenderán durante el año"],
    ["4. Organización anual de experiencias y proyectos tentativos", "Experiencias del año"],
    ["6. Enfoques transversales y orientaciones para el trabajo pedagógico", "Cómo acompañaremos al grupo"],
    ["7. Evaluación formativa, seguimiento y trabajo con las familias", "Cómo observaremos avances y trabajaremos con familias"],
    ["8. Seguimiento y reajuste bimestral", "Cuándo revisaremos el plan"],
    ["9. Validación docente", "Revisión de la docente"],
  ]);
  xml = xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) => {
    const visibleText = paragraph.replace(/<[^>]+>/g, "");
    if (omitParagraphs.some((phrase) => visibleText.includes(phrase))) return "";
    if (paragraph.includes("Elaborado a partir de entrevistas")) return "";
    if (paragraph.includes("Esta ficha orienta, no encierra")) return "";
    let next = paragraph;
    for (const [original, simpler] of shorterHeadings) next = next.replace(original, simpler);
    return next;
  });
  // The manual worksheets leave decorated blank lines after sections that have been omitted.
  xml = xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) =>
    paragraph.includes("<w:pBdr>") && !/<w:t(?:\s[^>]*)?>[^<]+<\/w:t>/.test(paragraph) ? "" : paragraph);
  // The supplied template reserves many separate pages for empty manual worksheets.
  // The generated document is continuous and keeps only its final section settings.
  xml = xml.replace(/<w:br\s+w:type="page"\s*\/>|<w:lastRenderedPageBreak\s*\/>/g, "");
  const sectionTags = [...xml.matchAll(/<w:sectPr(?:\s[^>]*)?>[\s\S]*?<\/w:sectPr>/g)];
  for (const section of sectionTags.slice(0, -1)) xml = xml.replace(section[0], "");
  xml = tokens(xml, values);
  if (/\{\{[^{}]+\}\}/.test(xml)) throw new Error("La plantilla anual conserva campos sin completar.");
  archive.file("word/document.xml", xml);
  for (const part of Object.keys(archive.files).filter((name) => /^word\/header\d+\.xml$/.test(name))) {
    const headerXml = await archive.file(part).async("string");
    // The supplied template has one missing opening brace in its header token.
    archive.file(part, headerXml.replace(/<w:t>\{<\/w:t>/g, "")
      .replace(/\{\{?AÑO_ESCOLAR\}\}/g, xmlEscape(header.year)));
  }
  return archive.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
