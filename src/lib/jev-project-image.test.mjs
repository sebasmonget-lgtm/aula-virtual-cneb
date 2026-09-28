import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eligibleProjectImages, suggestProjectImage } from "./jev-project-image.mjs";

test("código filtra edad, archivo y relevancia antes de preguntar a Jev", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ayni-images-"));
  try {
    await writeFile(path.join(root, "valid.jpg"), "jpeg fixture");
    const search = () => [
      { image: { id: "valid", file: "valid.jpg", title: "Huerto", age_range: [5], category: "naturaleza",
        subcategory: "plantas", concepts: ["semillas"], actions: ["plantar"], contexts: ["huerto"] }, score: 9 },
      { image: { id: "wrong_age", file: "valid.jpg", title: "Otra edad", age_range: [3], category: "naturaleza",
        subcategory: "plantas", concepts: [], actions: [], contexts: [] }, score: 10 },
      { image: { id: "missing", file: "missing.jpg", title: "Sin archivo", age_range: [5], category: "naturaleza",
        subcategory: "plantas", concepts: [], actions: [], contexts: [] }, score: 8 },
    ];
    const candidates = await eligibleProjectImages({ title: "Semillas" }, 5, { search, imageRoot: root });
    assert.deepEqual(candidates.map((item) => item.id), ["valid"]);
    let request;
    const client = { decide: async (input) => { request = input; return { answers: {
      image: { choice: "SIN_COINCIDENCIA" } }, metadata: {} }; } };
    const suggested = await suggestProjectImage({ project: { title: "Cuidamos semillas" }, age: 5,
      candidates, client, loadKb: async () => ({ version: "4.1.0" }) });
    assert.equal(suggested.suggested_id, null);
    assert.deepEqual(Object.keys(request.questions.image.criteria), ["valid", "SIN_COINCIDENCIA"]);
    assert.equal(JSON.stringify(request).includes("valid.jpg"), false);
    assert.equal(JSON.stringify(request).includes(root), false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("imagen inválida de Jev se rechaza y ninguna candidata evita la llamada", async () => {
  const candidate = { id: "scene", title: "Escena", description: "Juego", file: "unused.jpg" };
  await assert.rejects(suggestProjectImage({ project: { title: "Jugamos" }, age: 5,
    candidates: [candidate], client: { decide: async () => ({ answers: { image: { choice: "fabricada" } } }) },
    loadKb: async () => ({ version: "4.1.0" }) }), /ineligible/);
  const none = await suggestProjectImage({ project: { title: "No hay" }, age: 5,
    candidates: [], client: { decide: async () => { throw new Error("No se debe llamar."); } } });
  assert.equal(none.suggested_id, null);
});
