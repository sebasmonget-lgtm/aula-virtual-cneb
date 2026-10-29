import {guideParagraph, guideText} from './teacher-guide-word-layout.mjs';

const moments = [['opening', 'Inicio', 'E8F5EE', '65AD8A'], ['development', 'Desarrollo', 'EAF3FA', '315C86'], ['closure', 'Cierre', 'FFF1DF', 'EBA33B']];
const spacer = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="60" w:lineRule="exact"/></w:pPr></w:p>';

function paragraph(text, {bold = false, keepNext = false, after = 70, before = 0, size = 22} = {}) {
  return guideParagraph(text, {bold, keepNext, size}).replace(/<w:spacing\b[^>]*\/>/, `<w:spacing w:before="${before}" w:after="${after}" w:line="264" w:lineRule="auto"/>`);
}

function cell(xml, width, {fill = 'FFFFFF', accent = null} = {}) {
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:shd w:val="clear" w:fill="${fill}"/><w:vAlign w:val="top"/>${accent ? `<w:tcBorders><w:left w:val="single" w:sz="18" w:color="${accent}"/></w:tcBorders>` : ''}</w:tcPr>${xml}</w:tc>`;
}

function table(rows, widths, {padding = 110} = {}) {
  return `<w:tbl><w:tblPr><w:tblW w:w="10000" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(side => `<w:${side} w:val="single" w:sz="4" w:color="D1E2EA"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="${padding}" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:bottom w:w="${padding}" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(width => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${rows.map(({cells, header = false}) => `<w:tr><w:trPr><w:cantSplit/>${header ? '<w:tblHeader/>' : ''}</w:trPr>${cells.join('')}</w:tr>`).join('')}</w:tbl>${spacer}`;
}

function heading(text) {
  return paragraph(text, {bold: true, keepNext: true, size: 24, before: 100, after: 100});
}

const newPage = xml => xml.replace('<w:pPr>', '<w:pPr><w:pageBreakBefore/>');

function labeled(label, text) {
  const value = paragraph(text).match(/<w:r>[\s\S]*?<\/w:r>/)?.[0] ?? '';
  return paragraph(`${label}: `, {bold: true, after: 65}).replace('</w:p>', value + '</w:p>');
}

function curriculumSpacing(xml) {
  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, p => {
    if (!/<w:t(?:\s|>)/.test(p)) return p;
    const title = /<w:shd\b/.test(p);
    return p.replace(/<w:spacing\b[^>]*\/>/g, `<w:spacing w:before="${title ? 80 : 0}" w:after="30" w:line="252" w:lineRule="auto"/>`);
  });
}

/** A presentation-only layout. Every instruction comes from the frozen source. */
export function activityCardsWordBody(d, {criteria, references, observationRegister, materials}) {
  const c = d.content, p = c.activityPlanning;
  const preparation = labeled('Para qué', c.purpose) + labeled('Materiales', materials)
    +(c.preparation?labeled('Antes de empezar',c.preparation):'');
  let guide = moments.map(([key, title, fill, accent]) => table([{cells: [cell(
    paragraph(c.documentPresentationVersion===7?`${title} · Qué harán los niños y cómo acompañarlos`:title, {bold: true, keepNext: true, after: 65}).replace('<w:pPr>', `<w:pPr><w:shd w:val="clear" w:fill="${fill}"/>`)
      + guideText(c.commonSequence[key]).replace(/<w:spacing\b[^>]*\/>/g, '<w:spacing w:before="0" w:after="50" w:line="264" w:lineRule="auto"/>'),
    10000, {accent}
  )]}], [10000], {padding: 30})).join('');
  if(c.keepGuideMomentsTogether){
    const text=[...guide.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m=>m[1]).join('');
    if(text.length<=4500){
      // Word does not honor paragraph chains across separate tables. A
      // borderless, unsplittable outer row keeps the three existing cards
      // together while preserving their text, widths, spacing and colors.
      guide='<w:tbl><w:tblPr><w:tblW w:w="10000" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(side=>`<w:${side} w:val="nil"/>`).join('')+'</w:tblBorders><w:tblCellMar>'+['top','left','bottom','right'].map(side=>`<w:${side} w:w="0" w:type="dxa"/>`).join('')+'</w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="10000"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="10000" w:type="dxa"/></w:tcPr>'+guide+'</w:tc></w:tr></w:tbl>'+spacer;
    }
  }
  const decisions = p ? (c.compactSingleAge&&d.identity.ages.length===1?labeled('Qué pueden decidir los niños',p.childParticipation):newPage(labeled('Qué pueden decidir los niños', p.childParticipation))) : '';
  const supports = p ? heading('Cómo ayudar según la edad') + table(
    p.ageSupports.map(s => ({cells: [cell(curriculumSpacing(labeled(`${s.age} años`, `${s.mediation} ${s.support}`)), 10000, {fill: ({3: 'F0F8F3', 4: 'FFF8ED', 5: 'F6F2FB'})[s.age]})]})),
    [10000], {padding: 75}
  ) : '';
  const appendix = c.compactSingleAge&&d.identity.ages.length===1
    ? newPage(supports + heading('Competencias y qué observar')) + curriculumSpacing(criteria + observationRegister + references)
    : supports + newPage(heading('Competencias y qué observar')) + curriculumSpacing(criteria + observationRegister + references);
  return (preparation + guide + decisions + appendix)
    .replace(/<w:pPr>/g, '<w:pPr><w:jc w:val="left"/><w:suppressAutoHyphens/>')
    .replace(/<w:rPr>/g, '<w:rPr><w:rFonts w:ascii="Poppins" w:hAnsi="Poppins" w:eastAsia="Poppins" w:cs="Poppins"/>');
}
