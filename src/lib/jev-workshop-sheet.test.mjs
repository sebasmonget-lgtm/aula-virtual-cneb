import assert from "node:assert/strict";
import test from "node:test";
import { attachWorkshopSheetsWithJev, eligibleWorkshopSheets, suggestWorkshopSheet } from "./jev-workshop-sheet.mjs";

const sheet = { id: "ficha_1", title: "Agrupamos colecciones", age: 5, competency_id: "MAT_CANTIDAD",
  intention: "agrupar y comparar colecciones", actions: ["agrupar objetos"], description: "Representa agrupaciones" };

test("fichas candidatas respetan edad, competencia e intención antes de Jev", async () => {
  const candidates = await eligibleWorkshopSheets({ age: 5, competencyId: "MAT_CANTIDAD",
    intention: "agrupar colecciones y comparar", topic: "colecciones", loadSheets: async () => [sheet,
      { ...sheet, id: "otra_edad", age: 4 }, { ...sheet, id: "otra_competencia", competency_id: "CYT_INDAGA" }] });
  assert.deepEqual(candidates.map((item) => item.id), ["ficha_1"]);
});

test("Jev puede elegir SIN_FICHA y jamás acepta un ID inventado", async () => {
  let request;
  const noSheet = await suggestWorkshopSheet({ age: 5, competencyId: "MAT_CANTIDAD",
    intention: "agrupar colecciones y comparar", candidates: [sheet],
    client: { decide: async (input) => { request = input; return { answers: { sheet: { choice: "SIN_FICHA" } }, metadata: {} }; } },
    loadKb: async () => ({ version: "4.1.0" }) });
  assert.equal(noSheet.sheet, null);
  assert.deepEqual(Object.keys(request.questions.sheet.criteria), ["ficha_1", "SIN_FICHA"]);
  assert.equal(JSON.stringify(request).includes("pdf_path"), false);
  await assert.rejects(suggestWorkshopSheet({ age: 5, competencyId: "MAT_CANTIDAD",
    intention: "agrupar colecciones", candidates: [sheet],
    client: { decide: async () => ({ answers: { sheet: { choice: "inventada" } } }) },
    loadKb: async () => ({ version: "4.1.0" }) }), /ineligible/);
});

test("el texto del taller quita nombres conocidos antes de la decisión", async () => {
  let sent;
  await suggestWorkshopSheet({ age: 5, competencyId: "MAT_CANTIDAD",
    intention: "Camila agrupó colecciones y explicó cómo comparó", topic: "colecciones",
    knownNames: ["Camila"], candidates: [sheet],
    client: { decide: async (input) => { sent = input.state; return { answers: { sheet: { choice: "SIN_FICHA" } } }; } },
    loadKb: async () => ({ version: "4.1.0" }) });
  assert.equal(sent.includes("Camila"), false);
});

test("si Jev falla se conserva la sugerencia previa del catálogo", async () => {
  const master = { items: [{ index: 1, competency_id: "MAT_CANTIDAD", purpose: "agrupar colecciones",
    observation_focus: "cómo compara", brief_outline: "juego", title: "Agrupamos" }] };
  const output = await attachWorkshopSheetsWithJev(master, [{ title: "Agrupamos" }], 5,
    { suggest: async () => { throw new Error("timeout"); }, fallback: async () => sheet });
  assert.equal(output.items[0].sheet_id, "ficha_1");
  assert.equal(output.items[0].day_decision, "suggested");
});

test("si Jev y el catálogo fallan, el taller continúa sin ficha", async () => {
  const master = { items: [{ index: 1, competency_id: "MAT_CANTIDAD", purpose: "agrupar colecciones",
    observation_focus: "cómo compara", brief_outline: "juego", title: "Agrupamos" }] };
  const output = await attachWorkshopSheetsWithJev(master, [{ title: "Agrupamos" }], 5,
    { suggest: async () => { throw new Error("timeout"); }, fallback: async () => { throw new Error("missing catalog"); } });
  assert.equal(output.items[0].sheet_id, null);
  assert.equal(output.items[0].day_decision, "suggested");
});
