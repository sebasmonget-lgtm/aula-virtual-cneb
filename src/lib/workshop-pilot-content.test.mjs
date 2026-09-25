import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const library = path.join(root, "biblioteca-talleres");
const allowedFutureFields = new Set([
  "AÑO_ESCOLAR", "LOGO_COLEGIO", "INSTITUCION_EDUCATIVA", "SEDE_COLEGIO", "EDAD_AULA", "DOCENTE", "FECHA", "UGEL",
  "VINCULACION_PROYECTO", "OBSERVACIONES_TALLER", "AJUSTES_REUSO", "...", "#RECURSOS", "/RECURSOS",
]);

async function filesMatching(directory, predicate) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? filesMatching(path.join(directory, entry.name), predicate)
    : Promise.resolve(predicate(entry.name) ? [path.join(directory, entry.name)] : [])));
  return nested.flat();
}

const filesNamed = (directory, name) => filesMatching(directory, (entryName) => entryName === name);
const wordFiles = () => filesMatching(library, (entryName) => entryName.endsWith(".docx"));

test("el piloto contiene exactamente seis talleres con metadatos de edad y trazabilidad v4", async () => {
  const metadataFiles = await filesNamed(library, "metadata.json");
  const docxFiles = await wordFiles();
  assert.equal(metadataFiles.length, 6);
  assert.equal(docxFiles.length, 6);
  const metadata = await Promise.all(metadataFiles.map(async (file) => JSON.parse(await readFile(file, "utf8"))));
  for (const item of metadata) {
    assert.equal(item.reutilizable, true);
    assert.equal(item.knowledge_base_version, "4.0.0");
    assert.deepEqual(item.competency_ids, [item.competencia_principal_id]);
    assert.equal(item.referencia_curricular_edad.edad, item.edad);
    assert.ok(item.knowledge_unit_ids.length > 0);
    assert.ok(item.source_refs.includes("CNEB"));
    assert.match(item.referencia_curricular_edad.politica_de_texto, /no es cita textual MINEDU/);
  }
  for (const competency of ["PSICO_MOTRICIDAD", "COM_ARTE"])
    assert.deepEqual(metadata.filter((item) => item.competencia_principal_id === competency).map((item) => item.edad).sort(), [3, 4, 5]);
});

test("los Word resuelven campos de biblioteca y conservan solo placeholders futuros", async () => {
  for (const file of await wordFiles()) {
    const zip = await JSZip.loadAsync(await readFile(file));
    const parts = Object.keys(zip.files).filter((name) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(name));
    const xml = (await Promise.all(parts.map((name) => zip.file(name).async("string")))).join("\n");
    const text = xml.replace(/<[^>]+>/g, "");
    const fields = [...text.matchAll(/\{\{([^{}]+)\}\}/g)].map((match) => match[1]);
    assert.ok(fields.includes("DOCENTE"));
    assert.ok(fields.includes("FECHA"));
    assert.ok(fields.every((field) => allowedFutureFields.has(field)), `${path.basename(file)}: ${fields.join(", ")}`);
    assert.match(text, /Paráfrasis semántica trazable, no cita textual MINEDU/);
  }
});

test("los seis Word conservan intactas las partes no editables de la plantilla", async () => {
  const template = await JSZip.loadAsync(await readFile(path.join(root, "assets/templates/taller-inicial-ayni-unificada-v1.docx")));
  const expectedParts = Object.keys(template.files).filter((part) => !template.files[part].dir).sort();
  for (const file of await wordFiles()) {
    const generated = await JSZip.loadAsync(await readFile(file));
    assert.deepEqual(Object.keys(generated.files).filter((part) => !generated.files[part].dir).sort(), expectedParts, path.basename(file));
    for (const part of expectedParts) {
      if (part === "word/document.xml") continue;
      assert.deepEqual(
        await generated.file(part).async("nodebuffer"),
        await template.file(part).async("nodebuffer"),
        `${path.basename(file)} modificó ${part}`,
      );
    }
  }
});

test("solo el taller que necesita tarjetas incluye assets reutilizables", async () => {
  const assetFiles = await filesNamed(library, "tarjetas-recorrido-motor.svg");
  const pngFiles = await filesNamed(library, "tarjetas-recorrido-motor.png");
  assert.equal(assetFiles.length, 1);
  assert.equal(pngFiles.length, 1);
  const metadataFiles = await filesNamed(library, "metadata.json");
  const metadata = await Promise.all(metadataFiles.map(async (file) => JSON.parse(await readFile(file, "utf8"))));
  assert.equal(metadata.filter((item) => item.recursos_asociados.length > 0).length, 1);
  assert.equal(metadata.find((item) => item.recursos_asociados.length)?.edad, 5);
});
