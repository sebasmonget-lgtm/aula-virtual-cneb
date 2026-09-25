import test from "node:test";
import assert from "node:assert/strict";
import { AYNI_HEURISTICS } from "./ayni-heuristics.mjs";
import { assessmentState, coverageForRecords, observeTodaySuggestions } from "./evidence-coverage.mjs";
import { competencyApplicability } from "./competency-applicability.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";

const today = "2026-09-25";
const record = (id, date, activity, student = "a") => ({ id, student_id: student, competency_id: "CYT_INDAGA", observed_on: date, activity_id: activity });

test("cobertura y evaluación son dimensiones independientes", () => {
  const records = [record("1", "2026-09-20", "activity-one"), record("2", "2026-09-24", "activity-two")];
  assert.equal(coverageForRecords(records, { today }).coverage_state, "varied_evidence");
  assert.equal(assessmentState({ state: "confirmed", assessment: { status: "active", achievement_level: "A" } }), "confirmed");
  assert.equal(assessmentState({ state: "needs_review", assessment: { status: "active", achievement_level: "A" } }), "needs_review");
  assert.equal(coverageForRecords(records, { today }).coverage_state, "varied_evidence");
});

test("conteo no declara suficiencia y dos registros de una situación siguen en construcción", () => {
  assert.equal(coverageForRecords([], { today }).coverage_state, "no_records");
  assert.equal(coverageForRecords([record("1", "2026-07-01", "old")], { today }).coverage_state, "observe_more");
  assert.equal(coverageForRecords([record("1", "2026-09-20", "same"), record("2", "2026-09-24", "same")], { today }).coverage_state, "building_evidence");
  assert.equal(AYNI_HEURISTICS.coverage_recent_days, 42);
});

test("sugerencias son explicables, opcionales y ordenadas", () => {
  const students = [{ id: "a", name: "Ana" }, { id: "b", name: "Beto" }, { id: "c", name: "Celia" }];
  const records = [record("1", "2026-09-20", "one", "b"), record("2", "2026-09-20", "one", "c"), record("3", "2026-09-24", "two", "c")];
  const suggestions = observeTodaySuggestions(students, records, "CYT_INDAGA", [], { today });
  assert.deepEqual(suggestions.map((item) => item.student_id), ["a", "b", "c"]);
  assert.equal(suggestions[0].reason_code, "no_records");
  assert.equal(suggestions[1].reason_code, "one_situation");
});

test("competencia del ciclo no se confunde con desempeño de edad", async () => {
  const cards = (await loadKnowledgeBaseV4()).competencyCards;
  const byId = (id) => cards.find((card) => card.id === id);
  assert.equal(competencyApplicability(byId("COM_ESCRITURA"), 3).planning_available, true);
  assert.equal(competencyApplicability(byId("COM_ESCRITURA"), 3).has_age_performance, false);
  assert.equal(competencyApplicability(byId("COM_ESCRITURA"), 4).has_age_performance, true);
  assert.equal(competencyApplicability(byId("TRANS_TIC"), 4).has_age_performance, false);
  assert.equal(competencyApplicability(byId("TRANS_AUTONOMO"), 5).has_age_performance, true);
  assert.equal(competencyApplicability(byId("CAST_L2_ORAL"), 5).planning_available, false);
  assert.equal(competencyApplicability(byId("CAST_L2_ORAL"), 5, { castellanoL2Applicable: true }).planning_available, true);
  assert.equal(competencyApplicability(byId("PS_RELIGION"), 5).planning_available, false);
});
