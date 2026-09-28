import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const root = path.dirname(fileURLToPath(import.meta.url));
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(root, 'evidencias/consolidado-p3-sin-evidencias.xlsx')));
const summary = await workbook.inspect({kind:'workbook,sheet,table', maxChars:9000, tableMaxRows:20, tableMaxCols:8});
await fs.writeFile(path.join(root,'evidencias/consolidado-inspect.json'), JSON.stringify({ndjson:summary.ndjson,metadata:summary},null,2));
console.log(summary.ndjson ?? JSON.stringify(summary));
const sheets = await workbook.inspect({kind:'sheet',include:'id,name',maxChars:4000});
console.log(sheets.ndjson ?? JSON.stringify(sheets));
// Rendering is a read-only preview. This script never edits or exports the workbook.
const names = workbook.worksheets.items.map(sheet=>sheet.name);
for (let index=0;index<names.length;index++) {
  const range = workbook.worksheets.items[index].getRange('A1:H22');
  await fs.writeFile(path.join(root,`evidencias/consolidado-cells-${index+1}.json`),JSON.stringify({sheet:names[index],range:'A1:H22',values:range.values,formulas:range.formulas},null,2));
  const preview = await workbook.render({sheetName:names[index],range:'A1:H22',scale:1,format:'png'});
  await fs.writeFile(path.join(root,`evidencias/consolidado-preview-${index+1}.png`),new Uint8Array(await preview.arrayBuffer()));
}
console.log(JSON.stringify({previewSheets:names}));
