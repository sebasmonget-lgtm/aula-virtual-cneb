import { xmlEscape } from "./unified-word-template.mjs";
import { validateOfficialPerformanceRefs } from "./official-performance-references.mjs";

/** KB cards are editorial paraphrases, not verbatim official performances. */
export function ageReference(card, age, selectedRefs) {
  const selected = validateOfficialPerformanceRefs(Array.isArray(selectedRefs) ? selectedRefs : undefined, card?.id, age);
  if (selected.length) return selected.map(row => `Desempeño de ${age} años · MINEDU, p. ${row.printed_page}: ${row.text}`).join("\n");
  const reference = card?.ages?.[String(age)];
  if (!reference) return "";
  if (reference.status !== "specified") return card.cycle_ii_standard_ai
    ? `Referente orientativo del ciclo II: ${card.cycle_ii_standard_ai}` : "Sin desempeño específico consignado para esta edad.";
  const patterns=(reference.observable_patterns??[]).filter(text=>typeof text==="string"&&text.trim());
  // A short general reference is never presented as a selected official performance.
  return patterns.length ? `Síntesis orientativa para ${age} años (paráfrasis curricular general): ${patterns.slice(0,2).join(" ")} El criterio de esta actividad precisa qué se observará.` : "";
}

export function compactPlanningTable(headers, rows, widths = [2200, 3900, 3900]) {
  const cell = (value, index, header) => `<w:tc><w:tcPr><w:tcW w:w="${widths[index]}" w:type="dxa"/><w:shd w:fill="${header?"E4EEF6":"FFFFFF"}"/></w:tcPr>${String(value ?? "").split("\n").filter(Boolean).map(text=>`<w:p><w:pPr>${header?"<w:keepNext/>":""}<w:spacing w:before="30" w:after="65"/></w:pPr><w:r><w:rPr>${header?"<w:b/>":""}<w:color w:val="173352"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`).join("")||"<w:p/>"}</w:tc>`;
  const row = (values, header) => `<w:tr><w:trPr><w:cantSplit/>${header?"<w:tblHeader/>":""}</w:trPr>${values.map((value,index)=>cell(value,index,header)).join("")}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a,b)=>a+b,0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${["top","left","bottom","right","insideH","insideV"].map(side=>`<w:${side} w:val="single" w:sz="4" w:color="CBD9E5"/>`).join("")}</w:tblBorders><w:tblCellMar><w:top w:w="75" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="75" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(width=>`<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>${row(headers,true)}${rows.map(values=>row(values,false)).join("")}</w:tbl><w:p/>`;
}
