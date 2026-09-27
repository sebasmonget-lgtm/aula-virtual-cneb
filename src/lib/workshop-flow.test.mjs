import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { renderActivityUnifiedWord } from "./activity-unified-word.mjs";
import { attachWorkshopSheets, generateWorkshopDay, validateWorkshopMaster, workshopCoverage, workshopItemIsSelected } from "./workshop-master-service.mjs";
import { availableSheets, rankWorkshopSheets, verifiedSheetFile } from "./workshop-sheet-catalog.mjs";

const route = [
  { title: "Exploramos las sombras", competency_id: "CYT_INDAGA", competency_ids: ["CYT_INDAGA"] },
  { title: "Comparamos nuestras sombras", competency_id: "CYT_INDAGA", competency_ids: ["CYT_INDAGA"] },
];
const item = (index, competency_id = "MAT_CANTIDAD") => ({ index, linked_activity_index: index,
  title: `Jugamos a comparar ${index}`, workshop_type: "matemática", competency_id,
  purpose: "Comparar colecciones durante el juego", rationale: "Ofrece otra forma de resolver una situación",
  observation_focus: "Explica cómo comparó cantidades", materials: ["objetos concretos"],
  brief_outline: "Juego con objetos, conversación y representación", sheet_id: null, sheet_reason: null });

test("dos maestros independientes: una fila de taller por día, edad y cobertura sin cuota forzada", () => {
  const cards = [{ id: "CYT_INDAGA" }, { id: "MAT_CANTIDAD" }, { id: "PSICO_MOTRICIDAD" }];
  const coverage = workshopCoverage(route, cards);
  assert.equal(coverage.find((row) => row.competency_id === "CYT_INDAGA").main_opportunities, 2);
  assert.equal(coverage.find((row) => row.competency_id === "MAT_CANTIDAD").main_opportunities, 0);
  assert.deepEqual(validateWorkshopMaster({ items: [item(1), item(2)] }, route, cards.map((card) => card.id)).items.map((row) => row.linked_activity_index), [1, 2]);
  assert.throws(() => validateWorkshopMaster({ items: [item(1)] }, route, cards.map((card) => card.id)));
  assert.throws(() => validateWorkshopMaster({ items: [item(1, "OTRA_EDAD"), item(2)] }, route, cards.map((card) => card.id)));
  assert.deepEqual(route.map((row) => row.competency_id), ["CYT_INDAGA", "CYT_INDAGA"]);
});

test("la docente puede aceptar, continuar o dejar un día sin taller", () => {
  const cards = ["MAT_CANTIDAD"];
  const accepted = { ...item(1), day_decision: "accepted" };
  const continued = { ...item(2), day_decision: "continued", continuation_of_index: 1 };
  assert.deepEqual(validateWorkshopMaster({ items: [accepted, continued] }, route, cards).items.length, 2);
  assert.equal(workshopItemIsSelected(continued), true);
  assert.equal(workshopItemIsSelected({ ...item(2), day_decision: "none" }), false);
  assert.throws(() => validateWorkshopMaster({ items: [{ ...accepted, day_decision: "none" }, continued] }, route, cards));
});

test("competencia e intención se fijan antes de buscar ficha; puede quedarse sin ficha", async () => {
  const calls = [];
  const output = await attachWorkshopSheets({ items: [item(1), item(2)] }, route, 5, {
    selectSheet: async (args) => { calls.push(args); return null; },
  });
  assert.equal(calls[0].competencyId, "MAT_CANTIDAD");
  assert.equal(calls[0].age, 5);
  assert.deepEqual(output.items.map((row) => row.sheet_id), [null, null]);
  const source = await availableSheets({ age: 5, competencyId: "MAT_CANTIDAD" });
  assert.ok(source.length > 0);
  assert.ok(source.every((sheet) => sheet.age === 5 && sheet.competency_id === "MAT_CANTIDAD"));
  assert.deepEqual(rankWorkshopSheets(source, { age: 4, competencyId: "MAT_CANTIDAD", intention: "comparar cantidades" }), []);
  assert.deepEqual(rankWorkshopSheets(source, { age: 5, competencyId: "CYT_INDAGA", intention: "comparar cantidades" }), []);
  assert.ok((await verifiedSheetFile(source[0])).length > 1000);
});

test("el taller diario conserva tipo, competencia, ficha y maestro confirmado", async () => {
  const master = { id: "wm", parent_project_id: "p", status: "active", version: 1,
    details: { schema: "workshop-master-v1", items: [item(1), item(2)] } };
  const project = { id: "p", title: "Sombras", purpose: "Explorar", details: {} };
  const result = await generateWorkshopDay({ classroom: { age: 5 }, project, master, itemIndex: 1,
    mainActivity: { title: "Exploramos", purpose: "Observar sombras" }, sheet: null,
    createProvider: () => ({ generate: async () => ({ output: { title: "Jugamos a comparar", workshop_type: "matemática",
      competency_id: "MAT_CANTIDAD", purpose: "Comparar colecciones", criterion_or_observation_focus: "Explica cómo comparó",
      opening: "Juego libre con objetos", development: "Compara y conversa", closure: "Comparte hallazgos",
      evidence_expected: "Explicación oral", materials: ["objetos"], sheet_id: null } }) }) });
  assert.equal(result.proposal.competency_id, "MAT_CANTIDAD");
  await assert.rejects(generateWorkshopDay({ classroom: { age: 5 }, project,
    master: { ...master, status: "draft" }, itemIndex: 1, mainActivity: { title: "Exploramos" }, sheet: null }));
});

test("el Word usa la nueva sección y solo anexa páginas cuando hay ficha", async () => {
  const cards = (await loadKnowledgeBaseV4()).competencyCards.map((card) => ({ id: card.id,
    name: card.official_name, capacities: card.capacities, ages: card.ages }));
  const sheet = (await availableSheets({ age: 5, competencyId: "MAT_CANTIDAD" }))[0];
  const base = { kind: "activity", school_year: 2026, age: 5, classroom: "Sala A", title: "Sombras y cantidades",
    occurs_on: "2026-04-14", experience_title: "Exploramos sombras", experience_details: { activity_route: [] },
    content: { document_template_version: "activity-with-workshop-v1", purpose: "Explorar", competency_id: "CYT_INDAGA",
      meaningful_situation: "Exploramos la luz", teacher_preparation: "Preparar linternas", child_actions: "Probar posiciones",
      mediation: "Preguntar qué cambia", evidence_opportunities: "Escuchar explicaciones", closure_or_continuity: "Conversar",
      materials: ["linternas"] } };
  const workshop = { title: "Comparamos", workshop_type: "matemática", competency_id: "MAT_CANTIDAD",
    purpose: "Comparar jugando", criterion_or_observation_focus: "Explica cómo compara", opening: "Jugamos con objetos",
    development: "Comparamos y conversamos", closure: "Compartimos hallazgos", evidence_expected: "Explicación oral",
    materials: ["objetos"], sheet_id: null };
  const noSheet = await JSZip.loadAsync(await renderActivityUnifiedWord({ ...base, workshop: { content: workshop } }, cards));
  const noSheetXml = await noSheet.file("word/document.xml").async("string");
  assert.match(noSheetXml, /TALLER DEL DÍA/);
  assert.match(noSheetXml, /Explica cómo compara/);
  assert.doesNotMatch(noSheetXml, /\{\{/);
  assert.equal(noSheet.file(/word\/media\/ayni-sheet-/).length, 0);
  const withSheet = await JSZip.loadAsync(await renderActivityUnifiedWord({ ...base,
    workshop: { content: { ...workshop, sheet_id: sheet.id } } }, cards));
  const withSheetXml = await withSheet.file("word/document.xml").async("string");
  assert.match(withSheetXml, new RegExp(sheet.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(withSheetXml, /Ficha imprimible/);
  assert.ok(withSheet.file(/word\/media\/ayni-sheet-/).length >= 1);
});
