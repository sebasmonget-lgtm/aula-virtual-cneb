import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateJevSelection } from "./jev-decision.mjs";
import { summarizeSelectionBenchmark } from "./jev-benchmark.mjs";
test("los fixtures curriculares fuerzan fallback mientras el catálogo sea pending", async () => {
  const fixtures = JSON.parse(await readFile(new URL("../../tests/ai-routing/competency-selection.json", import.meta.url), "utf8"));
  assert.equal(fixtures.length, 50);
  for (const fixture of fixtures) assert.equal(validateJevSelection({ age: fixture.age, candidates: [], selection: {} }).status, "manual_selection_required");
});

test("los fixtures de desempeño no permiten proponer sin la competencia confirmada", async () => {
  const fixtures = JSON.parse(await readFile(new URL("../../tests/ai-routing/performance-selection.json", import.meta.url), "utf8"));
  for (const fixture of fixtures) {
    const result = validateJevSelection({ age: fixture.age, candidates: [], selection: {}, kind: "performance", selectedCompetencyId: fixture.competency_id });
    assert.equal(result.status, "manual_selection_required");
  }
});

test("infraestructura de métricas distingue propuesta, fallback y resultados faltantes", async () => {
  const fixtures = JSON.parse(await readFile(new URL("../../tests/ai-routing/competency-selection.json", import.meta.url), "utf8"));
  const summary = summarizeSelectionBenchmark(fixtures.slice(0, 3), [
    { id: fixtures[0].id, status: "proposal", ranked_competency_ids: [fixtures[0].acceptable_competency_ids[0]] },
    { id: fixtures[1].id, status: "manual_selection_required" },
  ]);
  assert.deepEqual(summary, { total: 3, top1: 1, top2: 1, top3: 1, manual: 1, invalid: 0, missing: 1 });
});
