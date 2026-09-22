import test from "node:test";
import assert from "node:assert/strict";
import { classifyCompetencyInsight } from "./statistics-service.mjs";

test("separa poca presencia en planificación", () => {
  assert.equal(classifyCompetencyInsight({ plannedActivities: 0, studentsWithInformation: 0, studentsTotal: 22, supportOrNotYet: 0 }), "low_planning_presence");
});
test("separa falta de información", () => {
  assert.equal(classifyCompetencyInsight({ plannedActivities: 3, studentsWithInformation: 7, studentsTotal: 22, supportOrNotYet: 4 }), "insufficient_information");
});
test("solo muestra necesidad observada con cobertura suficiente", () => {
  assert.equal(classifyCompetencyInsight({ plannedActivities: 3, studentsWithInformation: 18, studentsTotal: 22, supportOrNotYet: 4 }), "observed_support_need");
});
