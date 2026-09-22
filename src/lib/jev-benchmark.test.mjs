import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateJevSelection } from "./jev-decision.mjs";
test("los fixtures curriculares fuerzan fallback mientras el catálogo sea pending", async () => {
  const fixtures = JSON.parse(await readFile(new URL("../../tests/ai-routing/competency-selection.json", import.meta.url), "utf8"));
  for (const fixture of fixtures) assert.equal(validateJevSelection({ age: fixture.age, candidates: [], selection: {} }).status, "manual_selection_required");
});
