import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import sharp from "sharp";

const paragraphPattern = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
const textPattern = /(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g;
const tokenPattern = /\{\{([^{}]+)\}\}/g;

export const xmlEscape = (value) => String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function fillParagraph(paragraph, values, used) {
  const nodes = [...paragraph.matchAll(textPattern)];
  if (!nodes.length) return paragraph;
  const parts = nodes.map((match) => match[2]);
  const positions = [];
  let total = 0;
  for (const part of parts) { positions.push(total); total += part.length; }
  const joined = parts.join("");
  const tokens = [...joined.matchAll(tokenPattern)];
  for (const token of tokens.reverse()) {
    const key = token[1];
    if (!Object.hasOwn(values, key)) throw new Error(`La plantilla contiene un campo sin datos: ${key}.`);
    const start = token.index;
    const end = start + token[0].length;
    const startNode = positions.findLastIndex((position) => position <= start);
    const endNode = positions.findLastIndex((position) => position < end);
    if (startNode < 0 || endNode < 0) throw new Error(`Marcador Word inválido: ${key}.`);
    const localStart = start - positions[startNode];
    const localEnd = end - positions[endNode];
    const value = xmlEscape(values[key]);
    if (startNode === endNode) {
      parts[startNode] = parts[startNode].slice(0, localStart) + value + parts[startNode].slice(localEnd);
    } else {
      parts[startNode] = parts[startNode].slice(0, localStart) + value;
      for (let index = startNode + 1; index < endNode; index += 1) parts[index] = "";
      parts[endNode] = parts[endNode].slice(localEnd);
    }
    used.add(key);
  }
  let index = 0;
  return paragraph.replace(textPattern, (_, open, _body, close) => `${open}${parts[index++]}${close}`);
}

export function fillWordXml(xml, values, used = new Set()) {
  const output = xml.replace(paragraphPattern, (paragraph) => fillParagraph(paragraph, values, used));
  if (/\{\{[^{}]+\}\}/.test(output.replace(/<[^>]+>/g, ""))) throw new Error("Quedaron campos de la plantilla sin completar.");
  return output;
}

export function wordTemplateFields(xml) {
  const fields = new Set();
  for (const paragraph of xml.match(paragraphPattern) ?? []) {
    const text = [...paragraph.matchAll(textPattern)].map((match) => match[2]).join("");
    for (const token of text.matchAll(tokenPattern)) fields.add(token[1]);
  }
  return [...fields];
}

export function replaceWordText(xml, search, replacement) {
  if (!search) return xml;
  return xml.replace(paragraphPattern, (paragraph) => {
    const nodes = [...paragraph.matchAll(textPattern)];
    if (!nodes.length) return paragraph;
    const parts = nodes.map((match) => match[2]);
    const positions = [];
    let total = 0;
    for (const part of parts) { positions.push(total); total += part.length; }
    const joined = parts.join("");
    const starts = [];
    for (let at = joined.indexOf(search); at >= 0; at = joined.indexOf(search, at + search.length)) starts.push(at);
    for (const start of starts.reverse()) {
      const end = start + search.length;
      const first = positions.findLastIndex((position) => position <= start);
      const last = positions.findLastIndex((position) => position < end);
      const localStart = start - positions[first];
      const localEnd = end - positions[last];
      if (first === last) parts[first] = parts[first].slice(0, localStart) + xmlEscape(replacement) + parts[first].slice(localEnd);
      else {
        parts[first] = parts[first].slice(0, localStart) + xmlEscape(replacement);
        for (let index = first + 1; index < last; index += 1) parts[index] = "";
        parts[last] = parts[last].slice(localEnd);
      }
    }
    let index = 0;
    return paragraph.replace(textPattern, (_, open, _body, close) => `${open}${parts[index++]}${close}`);
  });
}

export function removeParagraphsContaining(xml, phrases) {
  return xml.replace(paragraphPattern, (paragraph) => {
    const text = [...paragraph.matchAll(textPattern)].map((match) => match[2]).join("");
    return phrases.some((phrase) => text.includes(phrase)) ? "" : paragraph;
  });
}

export function expandTableRow(xml, marker, rows) {
  let found = false;
  const output = xml.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g, (row) => {
    if (!row.includes(marker)) return row;
    found = true;
    return rows.map((values) => fillWordXml(row, values)).join("");
  });
  if (!found) throw new Error(`La plantilla no tiene la fila repetible ${marker}.`);
  return output;
}

/** Drop a template's forced page break when a section can flow naturally. */
export function removePageBreakAfterTable(xml, tableText) {
  const textOf = (part) => [...part.matchAll(textPattern)].map((match) => match[2]).join("");
  return xml.replace(/(<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>)(<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>)/g,
    (full, table, paragraph) => textOf(table).includes(tableText) && /<w:br[^>]*w:type="page"/.test(paragraph) ? table : full);
}

export function removePageBreakBeforeTable(xml, tableText) {
  const textOf = (part) => [...part.matchAll(textPattern)].map((match) => match[2]).join("");
  return xml.replace(/(<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>)(<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>)/g,
    (full, paragraph, table) => /<w:br[^>]*w:type="page"/.test(paragraph) && textOf(table).includes(tableText) ? table : full);
}

function logoDrawing(relId, imageId) {
  const size = 914400;
  return `<w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${size}" cy="${size}"/><wp:docPr id="${imageId}" name="Logo institucional"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${imageId}" name="logo-ayni.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${size}" cy="${size}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}

async function insertLogo(archive, xml, logo) {
  if (!xml.includes("{{LOGO_COLEGIO}}")) return xml;
  // The four source templates contain a sample "institution logo" picture just
  // before the marker. Remove that sample in both branches so a real logo is
  // never shown beside it and an unconfigured school gets no fake logo.
  const markerAt = xml.indexOf("{{LOGO_COLEGIO}}");
  const sampleStart = xml.lastIndexOf("<w:drawing>", markerAt);
  const sampleEnd = sampleStart < 0 ? -1 : xml.indexOf("</w:drawing>", sampleStart) + "</w:drawing>".length;
  if (sampleStart >= 0 && sampleEnd > sampleStart && markerAt - sampleEnd < 1000)
    xml = xml.slice(0, sampleStart) + xml.slice(sampleEnd);
  if (!logo) return xml.replaceAll("{{LOGO_COLEGIO}}", "");
  const relsFile = archive.file("word/_rels/document.xml.rels");
  const typesFile = archive.file("[Content_Types].xml");
  if (!relsFile || !typesFile) throw new Error("La plantilla Word no permite insertar el logo.");
  let rels = await relsFile.async("string");
  let types = await typesFile.async("string");
  const usedIds = [...rels.matchAll(/Id="rId(\d+)"/g)].map((match) => Number(match[1]));
  const relId = `rId${Math.max(0, ...usedIds) + 1}`;
  rels = rels.replace("</Relationships>", `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/ayni-logo.png"/></Relationships>`);
  if (!types.includes('Extension="png"')) types = types.replace("</Types>", '<Default Extension="png" ContentType="image/png"/></Types>');
  archive.file("word/_rels/document.xml.rels", rels);
  archive.file("[Content_Types].xml", types);
  archive.file("word/media/ayni-logo.png", await sharp(logo).resize(400, 400, { fit: "contain", background: "#ffffff00" }).png().toBuffer());
  let imageId = 7000;
  return xml.replace(/(<w:t(?:\s[^>]*)?>)([\s\S]*?\{\{LOGO_COLEGIO\}\}[\s\S]*?)(<\/w:t>)/g,
    (_, open, body, close) => {
      const [before, after] = body.split("{{LOGO_COLEGIO}}");
      return `${open}${before}${close}${logoDrawing(relId, imageId++)}${open}${after}${close}`;
    });
}

async function appendPrintableImages(archive, xml, images) {
  if (!images.length) return xml;
  const relsFile = archive.file("word/_rels/document.xml.rels");
  const typesFile = archive.file("[Content_Types].xml");
  if (!relsFile || !typesFile) throw new Error("La plantilla no admite la ficha imprimible.");
  let rels = await relsFile.async("string");
  let types = await typesFile.async("string");
  let nextRel = Math.max(0, ...[...rels.matchAll(/Id="rId(\d+)"/g)].map((match) => Number(match[1]))) + 1;
  const paragraphs = [];
  for (const [index, bytes] of images.entries()) {
    const metadata = await sharp(bytes).metadata();
    if (metadata.format !== "png" || !metadata.width || !metadata.height)
      throw new Error("La ficha no tiene una página de imagen válida.");
    const scale = Math.min(6.45 * 914400 / metadata.width, 8.8 * 914400 / metadata.height);
    const cx = Math.round(metadata.width * scale), cy = Math.round(metadata.height * scale);
    const relation = `rId${nextRel++}`, filename = `ayni-sheet-${index + 1}.png`;
    archive.file(`word/media/${filename}`, bytes);
    rels = rels.replace("</Relationships>", `<Relationship Id="${relation}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${filename}"/></Relationships>`);
    const pictureId = 8000 + index;
    paragraphs.push(`<w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${pictureId}" name="Ficha imprimible ${index + 1}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${pictureId}" name="${filename}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relation}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
  }
  if (!types.includes('Extension="png"')) types = types.replace("</Types>", '<Default Extension="png" ContentType="image/png"/></Types>');
  archive.file("word/_rels/document.xml.rels", rels);
  archive.file("[Content_Types].xml", types);
  const insertAt = xml.lastIndexOf("<w:sectPr");
  if (insertAt < 0) throw new Error("La plantilla no tiene cierre de sección para anexar la ficha.");
  return xml.slice(0, insertAt) + paragraphs.join("") + xml.slice(insertAt);
}

/** The DOCX is a view of validated application data; this function makes no AI call. */
export async function renderUnifiedWord({ templateUrl, values, logo = null, appendixImages = [], transform = (xml) => xml, transformPart = (_part, xml) => xml }) {
  const archive = await JSZip.loadAsync(await readFile(templateUrl));
  let xml = await archive.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("La plantilla no tiene contenido Word.");
  xml = transform(xml);
  xml = await insertLogo(archive, xml, logo);
  xml = fillWordXml(xml, { ...values, LOGO_COLEGIO: "" });
  xml = await appendPrintableImages(archive, xml, appendixImages);
  archive.file("word/document.xml", xml);
  for (const part of Object.keys(archive.files).filter((name) => /^word\/(header|footer)\d+\.xml$/.test(name))) {
    archive.file(part, fillWordXml(transformPart(part, await archive.file(part).async("string")), { ...values, LOGO_COLEGIO: "" }));
  }
  const core = await archive.file("docProps/core.xml")?.async("string");
  if (core) archive.file("docProps/core.xml", core.replace(/<dc:creator>[^<]*<\/dc:creator>/, "<dc:creator>Ayni Aula</dc:creator>"));
  return archive.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
