import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { projectPictogramCatalog, searchProjectPictograms, selectProjectPictogram } from "./project-pictograms.mjs";

test("63 imágenes pequeñas y transparentes coinciden con sus JSON y huellas", async () => {
  const root = new URL("../../public/project-illustrations/", import.meta.url);
  assert.equal(projectPictogramCatalog.images.length, 63);
  assert.equal(new Set(projectPictogramCatalog.images.map(image => image.id)).size, 63);
  assert.equal((await readdir(root)).filter(file => file.endsWith(".webp")).length, 63);
  let total = 0;
  for (const image of projectPictogramCatalog.images) {
    const bytes = await readFile(new URL(image.file, root));
    assert.match(image.id, /^[a-z]+(?:_[a-z]+)*$/);
    assert.equal(image.path, `/project-illustrations/${image.id}.webp`);
    assert.equal(bytes.length, image.bytes);
    assert.ok(image.bytes <= 6144);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), image.sha256);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 160);
    assert.equal(metadata.height, 160);
    assert.equal(metadata.hasAlpha, true);
    assert.equal(metadata.exif, undefined);
    const stats = await sharp(bytes).stats();
    assert.equal(stats.channels.at(-1).min, 0);
    assert.deepEqual(JSON.parse(await readFile(new URL(`${image.id}.json`, root), "utf8")), image);
    assert.ok(image.concepts.length && image.description && image.age_range.length === 3);
    total += image.bytes;
  }
  assert.ok(total <= 63 * 6144);
});

test("competencias guardadas resuelven títulos ambiguos sin desplazar el tema concreto", async () => {
  const curriculum = JSON.parse(await readFile(new URL("../../knowledge/cneb-initial-3-5/v4.1.0/03_semantic/competencies.json", import.meta.url), "utf8"));
  const ids = new Set(curriculum.competencies.map(item => item.id));
  for (const image of projectPictogramCatalog.images) for (const id of [...image.competency_ids, ...image.fallback_competency_ids]) assert.ok(ids.has(id));
  const cases = [["PS_IDENTIDAD", "identity"], ["PS_CONVIVE", "friendship"], ["PSICO_MOTRICIDAD", "movement"], ["COM_ORAL", "storytelling"], ["COM_LECTURA", "reading_clues"], ["COM_ESCRITURA", "writing"], ["COM_ARTE", "artistic_expression"], ["MAT_CANTIDAD", "numbers"], ["MAT_FORMA", "shapes"], ["CYT_INDAGA", "inquiry"], ["TRANS_TIC", "technology"], ["TRANS_AUTONOMO", "planning_play"]];
  for (const [id, expected] of cases) {
    assert.equal(selectProjectPictogram({ title: "Una invitación", primary_competency_ids: [id] }).id, expected);
    assert.equal(selectProjectPictogram({ title: "Una invitación", opportunities: [{ competency_id: id }] }).id, expected);
  }
  assert.equal(selectProjectPictogram({ title: "Nuestros cuentos", primary_competency_ids: ["COM_ORAL"] }).id, "storytelling");
  assert.equal(selectProjectPictogram({ title: "Nuestros cuentos", primary_competency_ids: ["COM_LECTURA"] }).id, "reading_clues");
  assert.equal(selectProjectPictogram({ title: "Cuidamos el agua", primary_competency_ids: ["COM_ESCRITURA"] }).id, "water_drop");
  assert.equal(selectProjectPictogram({ title: "Una invitación", purpose: "Observar las semillas.", primary_competency_ids: ["COM_ORAL"] }).id, "seed");
  assert.equal(selectProjectPictogram({ title: "Una invitación", primary_competency_ids: ["INVALID"] }).id, "ideas");
  assert.equal(selectProjectPictogram({ title: "Bailamos", primary_competency_ids: ["COM_ARTE"] }).id, "dance");
  assert.equal(selectProjectPictogram({ title: "Colecta de Navidad", primary_competency_ids: ["PS_CONVIVE"] }).id, "solidarity");
  assert.equal(selectProjectPictogram({ title: "Navidad" }).id, "christmas");
  assert.equal(selectProjectPictogram({ title: "Mi colegio" }).id, "school");
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

test("los títulos del QA eligen situaciones pertinentes en lugar de palabras aisladas", () => {
  const cases = [
    ["1. Así soy y así me cuido · 30/03–10/04", "Favorecer decisiones cotidianas y maneras de pedir apoyo.", "identity"],
    ["2. Acuerdos para jugar juntos", "Construir maneras de compartir espacios y materiales de juego.", "friendship"],
    ["3. Caminos que inventamos", "Explorar desplazamientos seguros y distintas formas de representar ideas con el cuerpo.", "movement"],
    ["4. Historias para contarnos", "Ampliar las oportunidades de escuchar, narrar y conversar.", "storytelling"],
    ["5. Pistas dentro de los cuentos", "Anticipar, buscar información y revisar ideas durante la lectura.", "reading_clues"],
    ["6. Mensajes para nuestro juego", "Usar la escritura para comunicar una decisión o idea de juego.", "writing"],
    ["7. Formas de mostrar una idea", "Representar ideas mediante combinaciones elegidas por los niños.", "artistic_expression"],
    ["8. ¿Cómo los repartimos?", "Explorar repartos y comparaciones mediante objetos manipulables.", "sharing"],
    ["9. Construimos y ubicamos", "Explorar formas, posiciones y recorridos al construir.", "blocks"],
    ["10. Probamos ideas con agua", "Formular preguntas y comparar qué ocurre al probar objetos con poca agua.", "water_drop"],
    ["11. Planeamos, probamos y ajustamos un juego", "Elegir una meta de juego, organizar acciones y revisar repartos y decisiones.", "planning_play"],
    ["12. Decidimos cómo participar en una colecta", "Acordar una participación solidaria, respetuosa y voluntaria, si la actividad se confirma.", "solidarity"],
  ];
  for (const [title, purpose, id] of cases) assert.equal(selectProjectPictogram({ title, purpose }).id, id, title);
  assert.notEqual(selectProjectPictogram({ title: "Una invitación", purpose: "Representar ideas con el cuerpo." }).id, "health");
  assert.equal(selectProjectPictogram({ title: "Una invitación", invitation: "Busquemos pistas dentro de los cuentos." }).id, "reading_clues");
  assert.equal(selectProjectPictogram({ title: "Una invitación", children_actions: ["Escribimos mensajes para otras personas."] }).id, "writing");
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
