import {guideParagraph, keepShortTableTogether} from './teacher-guide-word-layout.mjs';
import {validateDocumentObservationRoster} from './document-generator-observation-roster.mjs';

const widths = [550, 2650, 4200, 2600];
const labels = ['N.º', 'Alumno/a · edad', 'Observaciones', 'Apoyo o siguiente paso'];
const fills = {3: 'E8F5EE', 4: 'FFF1DF', 5: 'F0EBF9'};

function cell(text, index, {header = false, age = null} = {}) {
  const body = Array.isArray(text) ? text.map((line, i) => guideParagraph(line, {bold: i === 0, size: i === 0 ? 21 : 20})).join('') : guideParagraph(text, {bold: header, size: 20});
  return `<w:tc><w:tcPr><w:tcW w:w="${widths[index]}" w:type="dxa"/><w:shd w:val="clear" w:fill="${header ? 'E4EEF6' : age ? fills[age] : 'FFFFFF'}"/><w:vAlign w:val="top"/></w:tcPr>${body}</w:tc>`;
}

/** Editable blank rows, with the teacher's own roster and no invented evidence. */
export function documentObservationRegisterWord(d) {
  const roster = validateDocumentObservationRoster(d.content.observationRoster, d.identity.ages,{maxStudents:200});
  const heading = guideParagraph('Registro de observación', {bold: true, size: 24, keepNext: true})
    + guideParagraph(`${d.content.title} · ${d.content.occursOn.split('-').reverse().join('/')}`, {size: 20, color: '526B87', keepNext: true});
  const note = guideParagraph('Anota qué hizo o dijo y el criterio relacionado. Puedes dejar filas sin completar.', {size: 20, keepNext: true});
  if (!roster.students.length) return heading + note + guideParagraph('No hay alumnos en la nómina guardada de esta actividad.', {size: 20});
  const header = `<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>${labels.map((label, i) => cell(label, i, {header: true})).join('')}</w:tr>`;
  const rows = roster.students.map((s, i) => `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="900" w:hRule="atLeast"/></w:trPr>${cell(String(i + 1), 0)}${cell([s.name, `${s.age} años`], 1, {age: s.age})}${cell('', 2)}${cell('', 3)}</w:tr>`).join('');
  const table = `<w:tbl><w:tblPr><w:tblW w:w="10000" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(side => `<w:${side} w:val="single" w:sz="4" w:color="CBD9E5"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(width => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${header}${rows}</w:tbl><w:p/>`;
  // A small roster moves with its heading; large rosters paginate with repeated
  // headers and unsplit child rows instead of being forced onto one page.
  return keepShortTableTogether(heading + note + table);
}
