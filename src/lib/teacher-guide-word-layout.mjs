import { xmlEscape } from "./unified-word-template.mjs";

// These tables sit inside the original Ayni stationery. Content is supplied by
// the saved document: presentation must never invent a pedagogical instruction.
const width = 10000;
export function guideParagraph(text, { bold = false, color = "173352", size = 22, keepNext = false } = {}) {
  return `<w:p><w:pPr>${keepNext ? "<w:keepNext/>" : ""}<w:spacing w:before="0" w:after="85" w:line="270" w:lineRule="auto"/><w:widowControl/></w:pPr><w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:color w:val="${color}"/><w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

export function guideText(value) {
  const lines = (Array.isArray(value) ? value : [value]).filter(item => typeof item === "string" && item.trim());
  return lines.map(item => item.split(/\n+/).filter(Boolean).map(line => guideParagraph(line.trim())).join("")).join("") || "<w:p/>";
}

function cell(content, span, fill) {
  return `<w:tc><w:tcPr><w:tcW w:w="${width / 2 * span}" w:type="dxa"/>${span === 2 ? '<w:gridSpan w:val="2"/>' : ""}<w:shd w:val="clear" w:fill="${fill}"/><w:vAlign w:val="top"/></w:tcPr>${content}</w:tc>`;
}

const row = (cells, keepTogether = false) => `<w:tr>${keepTogether ? "<w:trPr><w:cantSplit/></w:trPr>" : ""}${cells.join("")}</w:tr>`;

/** Source-template pattern: coloured labels and a full readable text column. */
export function guideDetails(entries) {
  const rows = entries.filter(([, value]) => Array.isArray(value) ? value.some(Boolean) : Boolean(value));
  if (!rows.length) return "";
  return `<w:tbl><w:tblPr><w:tblW w:w="10000" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(side => `<w:${side} w:val="single" w:sz="4" w:color="D1E2EA"/>`).join("")}</w:tblBorders><w:tblCellMar><w:top w:w="130" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="2600"/><w:gridCol w:w="7400"/></w:tblGrid>${rows.map(([label, value], index) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/><w:shd w:fill="${index % 2 ? "EDF5F1" : "EAF3FA"}"/><w:vAlign w:val="top"/></w:tcPr>${guideParagraph(label, { bold: true })}</w:tc><w:tc><w:tcPr><w:tcW w:w="7400" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>${guideText(value)}</w:tc></w:tr>`).join("")}</w:tbl><w:p><w:pPr><w:spacing w:line="60" w:lineRule="exact" w:after="90"/></w:pPr></w:p>`;
}

/** Warm, printable two-column guide, with criteria at their saved moment. */
export function guidePanel(title, columns, observations = [], { keepObservationsTogether = false } = {}) {
  const populated = columns.filter(column => column.body);
  if (!populated.length && !observations.length) return "";
  const heading = `<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>${cell(guideParagraph(title, { bold: true, color: "086C7C", size: 25, keepNext: true }), 2, "DCEFF0")}</w:tr>`;
  const body = populated.length === 2
    ? row(populated.map((column, index) => cell(guideParagraph(column.title, { bold: true, keepNext: true }) + column.body, 1, index ? "F0F8F2" : "F0F7FC")))
    : populated.map(column => row([cell(guideParagraph(column.title, { bold: true, keepNext: true }) + column.body, 2, "F0F7FC")])).join("");
  const notes = observations.map(item => row([cell(
    guideParagraph(`Qué observar · ${item.competency}`, { bold: true, color: "684495" }) +
    guideText(item.criterion) +
    (item.focus?.length ? guideText(item.focus) : "") +
    (item.evidence ? guideParagraph(`Evidencia esperada: ${item.evidence}`) : ""), 2, "F4EFFA")], keepObservationsTogether)).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(side => `<w:${side} w:val="single" w:sz="6" w:color="D1E2EA"/>`).join("")}</w:tblBorders><w:tblCellMar><w:top w:w="150" w:type="dxa"/><w:left w:w="180" w:type="dxa"/><w:bottom w:w="110" w:type="dxa"/><w:right w:w="180" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="5000"/><w:gridCol w:w="5000"/></w:tblGrid>${heading}${body}${notes}</w:tbl><w:p><w:pPr><w:spacing w:after="90" w:line="60" w:lineRule="exact"/></w:pPr></w:p>`;
}

/** Preserve the template's cover break; body sections can paginate naturally. */
export function retainCoverPageBreak(xml) {
  let coverFound = false;
  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, paragraph => {
    if (!/<w:br\b[^>]*w:type="page"/.test(paragraph)) return paragraph;
    if (!coverFound) { coverFound = true; return paragraph; }
    return paragraph.replace(/<w:br\b[^>]*w:type="page"\s*\/>/g, "");
  });
}

/** Reclaim oversized empty centred lines, retaining the cover art and tables. */
export function compactCoverSpacers(xml){
 const paragraphs=[...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)];
 const pageBreak=paragraphs.find(item=>/<w:br\b[^>]*w:type="page"/.test(item[0]));
 if(!pageBreak)return xml;
 const prefix=xml.slice(0,pageBreak.index).replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g,paragraph=>{
  if(!/<w:jc w:val="center"\/>/.test(paragraph)||/<w:(?:drawing|pict|object|fldChar|instrText|sectPr)\b/.test(paragraph)||[...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].some(item=>item[1].trim()))return paragraph;
  return paragraph.replace(/<w:spacing\b[^>]*\/>/g,'').replace('<w:pPr>','<w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>');
 });
 return prefix+xml.slice(pageBreak.index);
}

/** Short attached forms move as a unit instead of leaving a few rows alone. */
/** Avoid splitting a compact row while allowing long records to continue normally. */
export function keepShortRowsTogether(xml) {
  return xml.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g,row=>{
    const text=[...row.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(match=>match[1]).join('');
    if(text.length>1200 || /<w:cantSplit\b/.test(row))return row;
    return row.includes('<w:trPr>')?row.replace('<w:trPr>','<w:trPr><w:cantSplit/>')
      :row.replace(/(<w:tr(?:\s[^>]*)?>)/,'$1<w:trPr><w:cantSplit/></w:trPr>');
  });
}

export function keepShortTableTogether(table) {
  const paragraphs = [...table.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)];
  const text = [...table.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(match=>match[1]).join("");
  if ((table.match(/<w:tr(?:\s|>)/g)??[]).length > 6 || text.length > 1600) return table;
  let index=0;
  return table.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g,paragraph=>{
    const keep = ++index < paragraphs.length;
    const clean=paragraph.replace(/<w:keepNext(?:\s[^>]*)?\s*\/>/g,"");
    if(!keep)return clean;
    return clean.includes("<w:pPr>") ? clean.replace("<w:pPr>","<w:pPr><w:keepNext/>")
      : clean.replace(/(<w:p(?:\s[^>]*)?>)/,"$1<w:pPr><w:keepNext/></w:pPr>");
  });
}
