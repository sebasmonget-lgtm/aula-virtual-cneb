import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { projectPictogramCatalog, searchProjectPictograms, selectProjectPictogram } from "./project-pictograms.mjs";

test("cincuenta SVG livianos y sus JSON corresponden al catálogo y no ejecutan contenido", async () => {
  const root = new URL("../../public/project-pictograms/", import.meta.url);
  assert.equal(projectPictogramCatalog.images.length, 50);
  assert.equal(new Set(projectPictogramCatalog.images.map(image => image.id)).size, 50);
  assert.equal((await readdir(root)).filter(file => file.endsWith(".svg")).length, 50);
  let total = 0;
  for (const image of projectPictogramCatalog.images) {
    const svg = await readFile(new URL(image.file, root), "utf8");
    assert.match(image.id, /^[a-z]+(?:_[a-z]+)*$/);
    assert.equal(image.path, `/project-pictograms/${image.id}.svg`);
    assert.equal(Buffer.byteLength(svg), image.bytes);
    assert.ok(image.bytes < 2048);
    assert.match(svg, /viewBox="0 0 128 128"/);
    assert.doesNotMatch(svg, /<(script|image|foreignObject|text|animate)\b|\bon\w+=|\bhref=|url\(/i);
    assert.deepEqual(JSON.parse(await readFile(new URL(`${image.id}.json`, root), "utf8")), image);
    assert.ok(image.concepts.length && image.description && image.age_range.length === 3);
    total += image.bytes;
  }
  assert.ok(total < 32 * 1024);
});

test("selecciona el tema del título sin que verbos genéricos o materiales lo sustituyan", () => {
  const cases = [
    ["Cuidamos el agua", "water_drop"], ["Cuidamos las plantas del jardín", "plant"],
    ["Descubrimos cómo germinan las semillas", "seed"], ["Los árboles del bosque", "tree"],
    ["Fiestas Patrias del Perú", "peru_flag"], ["Nuestro perro", "dog"], ["Conocemos a los gatos", "cat"],
    ["Observamos aves y sus nidos", "bird"], ["Peces en el acuario", "fish"], ["La casa de las tortugas", "turtle"],
    ["Pinceles y acuarelas", "painting"], ["Leemos cuentos de nuestra biblioteca", "book"],
    ["La música y sus instrumentos", "music"], ["Construimos torres con bloques", "blocks"],
    ["Contamos y comparamos cantidades", "numbers"], ["Cuidamos los dientes", "teeth"],
    ["Lavamos las manos con jabón", "hands"], ["Reciclamos nuestros residuos", "recycling"],
    ["Jugamos con pelotas", "ball"], ["Nuestros autos y sus ruedas", "car"], ["Viajar en bus", "bus"],
    ["Estrellas y planetas", "space"], ["Conocemos a nuestra familia", "family"],
  ];
  for (const [title, id] of cases) {
    const selected = selectProjectPictogram({ title, purpose: "Los niños exploran en el aula.", materials: ["lápices", "acuarelas"] });
    assert.equal(selected.id, id, title);
    assert.equal(selected.selection, "metadata");
  }
  assert.equal(selectProjectPictogram({ title: "Nuestro perro", purpose: "Leer un libro, pintar y conversar con la familia." }).id, "dog");
});

test("un título abierto puede usar el propósito, y un tema desconocido usa una idea neutral", () => {
  assert.equal(selectProjectPictogram({ title: "Una invitación", purpose: "Observar cómo germinan las semillas." }).id, "seed");
  const row = Object.freeze({ title: "Invitación 12", purpose: "Los niños participarán y explorarán en el aula." });
  assert.equal(selectProjectPictogram(row).id, "ideas");
  assert.equal(selectProjectPictogram(row).selection, "fallback");
  assert.deepEqual(searchProjectPictograms(""), []);
});

test("admite solo IDs del catálogo, preserva elecciones explícitas y no construye URLs externas", () => {
  assert.equal(selectProjectPictogram({ title: "Agua", pictogram_id: "plant" }).id, "plant");
  assert.equal(selectProjectPictogram({ title: "Agua", pictogram_id: "plant" }).selection, "explicit");
  for (const id of ["../../secret", "https://external.test/icon.svg", "missing"]) {
    assert.equal(selectProjectPictogram({ title: "Agua", pictogram_id: id }).id, "water_drop");
  }
});
