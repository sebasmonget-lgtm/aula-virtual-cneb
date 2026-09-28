import test from "node:test";
import assert from "node:assert/strict";
import { projectMasterCases, stableUuid } from "./cases.mjs";
import { loadKnowledgeBaseV4 } from "../../src/lib/knowledge-base-v4.mjs";

test("provisional F2 matrix contains 24 base, 6 QA and 6 difficult anonymous cases", () => {
  const rows = projectMasterCases();
  assert.equal(rows.length, 36);
  assert.equal(rows.filter((row) => row.kind === "base").length, 24);
  assert.equal(rows.filter((row) => row.kind === "qa_regression").length, 6);
  assert.equal(rows.filter((row) => row.kind === "expert_hard").length, 6);
  assert.equal(new Set(rows.map((row) => row.id)).size, 36);
  assert(rows.every((row) => row.dates.length === 8 &&
    row.dates.every((date) => ![0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay()))));
  const holiday = rows.find((row) => row.id === "hard-holiday");
  assert(!holiday.dates.includes(holiday.exception_date));
  assert(rows.every((row) => !JSON.stringify(row).includes("student_id")));
});

test("every fixture competency resolves to a selectable CNEB card at its age", async () => {
  const cards = new Map((await loadKnowledgeBaseV4()).competencyCards.map((card) => [card.id, card]));
  for (const row of projectMasterCases()) for (const id of row.teacher_decisions.competency_ids) {
    assert(cards.has(id), `${row.id}: ${id}`);
    assert(cards.get(id).ages?.[String(row.age)], `${row.id}: age ${row.age}/${id}`);
  }
});

test("fixture source identifiers remain stable across runs", () => {
  assert.equal(stableUuid("project-1"), stableUuid("project-1"));
  assert.notEqual(stableUuid("project-1"), stableUuid("project-2"));
});
