import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import sharp from "sharp";
import { compactWordDocumentEnd, fillWordXml, removeParagraphsContaining, renderUnifiedWord, reserveWordHeaderSpace, wordTemplateFields } from "./unified-word-template.mjs";

test('el cuerpo reserva espacio para el encabezado sin tocar texto ni reducir márgenes mayores',()=>{
 const xml='<w:body><w:p><w:r><w:t>Conclusión conservada.</w:t></w:r></w:p><w:sectPr><w:pgMar w:top="539" w:right="850" w:bottom="1134" w:left="850"/></w:sectPr></w:body>';
 const safe=reserveWordHeaderSpace(xml);
 assert.ok(safe.includes('Conclusión conservada.'));assert.match(safe,/w:top="1440" w:right="850" w:bottom="1134" w:left="850"/);
 assert.equal(reserveWordHeaderSpace(safe),safe);
 assert.equal(reserveWordHeaderSpace(xml.replace('w:top="539"','w:top="1700"')),xml.replace('w:top="539"','w:top="1700"'));
});

test("el final Word elimina títulos vacíos sin quitar contenido, campos ni secciones", () => {
  const end='<w:sectPr><w:pgSz w:w="12240"/></w:sectPr></w:body></w:document>';
  const start='<w:document><w:body>',text='<w:p><w:r><w:t>Registro conservado.</w:t></w:r></w:p>';
  const blank='<w:p><w:pPr><w:keepNext/><w:spacing w:after="180"/></w:pPr></w:p>';
  assert.equal(compactWordDocumentEnd(start+text+blank+blank+end),start+text+end);
  const table='<w:tbl><w:tr><w:tc>'+text+'</w:tc></w:tr></w:tbl>';
  const compact=compactWordDocumentEnd(start+table+blank+end);
  assert.ok(compact.includes(table));assert.match(compact,/w:lineRule="exact"/);
  assert.doesNotMatch(compact,/<w:keepNext/);assert.equal(compactWordDocumentEnd(compact),compact);
  for(const content of ['<w:drawing/>','<w:fldSimple w:instr="PAGE"/>','<w:bookmarkStart w:id="1"/>','<w:sectPr/>','<w:sym w:char="F0FC"/>']) {
    const xml=start+text+'<w:p>'+content+'</w:p>'+end;
    assert.equal(compactWordDocumentEnd(xml),xml);
  }
});

test("rellena un marcador dividido entre runs sin alterar el texto que lo rodea", () => {
  const xml = '<w:p><w:r><w:t>Antes {{CAM</w:t></w:r><w:r><w:t>PO}} después</w:t></w:r></w:p>';
  const filled = fillWordXml(xml, { CAMPO: "Sol & Luna" });
  assert.match(filled, /Antes Sol &amp; Luna/);
  assert.match(filled, /después/);
  assert.doesNotMatch(filled, /\{\{/);
  assert.throws(() => fillWordXml(xml, {}), /CAMPO/);
});

test("las cuatro plantillas conservan un ZIP Word válido al insertar el logo", async () => {
  const logo = await sharp({ create: { width: 8, height: 8, channels: 4, background: "#087d96" } }).png().toBuffer();
  const files = [
    "evaluacion-diagnostica-inicial-unificada-v1.docx",
    "planificacion-anual-inicial-unificada-v1.docx",
    "proyecto-unidad-inicial-unificada-v1.docx",
    "actividad-aprendizaje-inicial-unificada-v1.docx",
  ];
  for (const file of files) {
    const templateUrl = new URL(`../../assets/templates/${file}`, import.meta.url);
    const source = await JSZip.loadAsync(await (await import("node:fs/promises")).readFile(templateUrl));
    const xml = await source.file("word/document.xml").async("string");
    const fields = wordTemplateFields(xml).filter((field) => /^[A-ZÁÉÍÓÚÑ0-9_]+$/.test(field));
    const values = Object.fromEntries(fields.map((field) => [field, field === "AÑO_ESCOLAR" ? "2026" : "Dato de prueba"]));
    const rendered = await renderUnifiedWord({ templateUrl, values, logo,
      transform: (documentXml) => removeParagraphsContaining(documentXml, ["{{...", "{{#", "{{ }}", "{{...}}"]),
    });
    const zip = await JSZip.loadAsync(rendered);
    const output = await zip.file("word/document.xml").async("string");
    assert.ok(zip.file("word/media/ayni-logo.png"), file);
    assert.match(output, /<w:drawing>/, file);
    assert.doesNotMatch(output.replace(/<[^>]+>/g, ""), /\{\{[^{}]+\}\}/, file);
  }
});
