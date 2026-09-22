import test from "node:test";
import assert from "node:assert/strict";
import { classifyCompetencyInsight, summarizeStudentStatuses } from "./statistics-service.mjs";

test("una competencia nunca planificada ni observada es poca presencia", () => {
  assert.equal(classifyCompetencyInsight({ plannedActivities: 0, studentsWithSufficientInformation: 0, studentsTotal: 22, studentsNeedingSupport: 0 }), "low_planning_presence");
});
test("una competencia planificada sin observaciones tiene información insuficiente", () => {
  assert.equal(classifyCompetencyInsight({ plannedActivities: 2, studentsWithSufficientInformation: 0, studentsTotal: 22, studentsNeedingSupport: 0 }), "insufficient_information");
});
test("siete de veintidós sigue siendo información insuficiente", () => {
  assert.equal(classifyCompetencyInsight({ plannedActivities: 3, studentsWithSufficientInformation: 7, studentsTotal: 22, studentsNeedingSupport: 4 }), "insufficient_information");
});
test("no cuenta marca insuficiente como información suficiente", () => {
  const total = summarizeStudentStatuses([{ studentId: "a", status: "demonstrated", observedAt: "2026-01-01" }, { studentId: "b", status: "insufficient_information", observedAt: "2026-01-01" }]);
  assert.equal(total.students_with_sufficient_information, 1); assert.equal(total.students_insufficient_information, 1);
});
test("dieciocho observados con tres marcas insuficientes separa cobertura de valoración", () => {
  const statuses = Array.from({ length: 18 }, (_, index) => ({ studentId: `student-${index}`, status: index < 3 ? "insufficient_information" : "demonstrated", observedAt: "2026-01-01" }));
  const total = summarizeStudentStatuses(statuses);
  assert.equal(total.students_observed, 18);
  assert.equal(total.students_with_sufficient_information, 15);
  assert.equal(total.students_insufficient_information, 3);
});
test("cinco evidencias de un niño cuentan una sola vez usando su última marca", () => {
  const total = summarizeStudentStatuses([1,2,3,4,5].map((index) => ({ studentId: "a", status: index === 5 ? "with_support" : "demonstrated", observedAt: `2026-01-0${index}` })));
  assert.equal(total.students_observed, 1); assert.equal(total.students_with_support, 1);
});
test("un niño con apoyo no dispara necesidad grupal", () => {
  assert.equal(classifyCompetencyInsight({ plannedActivities: 3, studentsWithSufficientInformation: 18, studentsTotal: 22, studentsNeedingSupport: 1 }), "enough_information");
});
test("varios niños con necesidad y cobertura suficiente generan señal", () => {
  assert.equal(classifyCompetencyInsight({ plannedActivities: 3, studentsWithSufficientInformation: 18, studentsTotal: 22, studentsNeedingSupport: 5 }), "observed_support_need");
});
