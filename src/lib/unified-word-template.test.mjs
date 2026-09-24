import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import sharp from "sharp";
import { fillWordXml, removeParagraphsContaining, renderUnifiedWord, wordTemplateFields } from "./unified-word-template.mjs";

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
