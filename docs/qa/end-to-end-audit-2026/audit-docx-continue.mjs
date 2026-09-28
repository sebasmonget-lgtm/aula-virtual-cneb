// Inspect actual files downloaded through UI. XML QA is not a visual render.
import { readFile, writeFile } from 'node:fs/promises';
import JSZip from 'jszip';
const root = new URL('./evidencias/', import.meta.url);
const names = ['diagnostico-despues-h31.docx', 'plan-anual-confirmado.docx', 'actividad-indaga22-ejecutada.docx', 'proyecto-huerto-confirmado.docx',
  'familia-thiago-p1.docx','familia-bruno-p1.docx','familia-valeria-p1.docx','familia-mateo-p1.docx','familia-ines-p1.docx','familia-omar-p2.docx','familia-valeria-p3.docx','proyecto-cuentos-p4-confirmado.docx',
  'familia-alma-p4.docx','familia-omar-p4.docx'];
const reports = [];
for (const name of names) {
  const zip = await JSZip.loadAsync(await readFile(new URL(name, root)));
  const xml = await zip.file('word/document.xml').async('string');
  const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const unresolved = text.match(/\{\{[^}]+\}\}/g) ?? [];
  const report = { name, bytes: (await readFile(new URL(name, root))).length,
    unresolved, tables: (xml.match(/<w:tbl>/g) ?? []).length,
    imageFiles: Object.keys(zip.files).filter(path => /^word\/media\//.test(path)),
    institution: text.includes('IEI Semillas del Valle QA'), teacher: text.includes('Lucía Palomino Quispe'),
    groupCount: text.includes('15'), uniqueDiagnosticCount: name.startsWith('diagnostico') ? text.includes('27 registros') : null,
    inactiveReligion: text.includes('doctrina de su propia religión'), inactiveL2: text.includes('castellano como segunda lengua'),
    activeCriterion: name.startsWith('actividad') ? text.includes('Relaciona una observación registrada') : null,
    visualRender: 'NO PROBADO: LibreOffice no disponible en runtime' };
  reports.push(report);
  await writeFile(new URL(`${name}.txt`, root), text);
}
await writeFile(new URL('docx-after-inspect.json', root), JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
