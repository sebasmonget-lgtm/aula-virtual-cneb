import assert from "node:assert/strict";
import test from "node:test";
import { summarizeDecisionComparison, validateExpertDecisionCase } from "./jev-expert-evaluation.mjs";

const allowed = ["MAT_CANTIDAD", "COM_ORAL"];
const expert = { id: "case-001", age: 5, observation: "Contó piezas y explicó su decisión.",
  label_status: "expert_adjudicated", independent_labels: [
    { reviewer_code: "E01", independent: true, competency_ids: allowed },
    { reviewer_code: "E02", independent: true, competency_ids: allowed }],
  adjudicated_competency_ids: allowed };

test("la comparación rechaza etiquetas técnicas o una sola revisión", () => {
  assert.equal(validateExpertDecisionCase(expert, allowed), expert);
  assert.throws(() => validateExpertDecisionCase({ ...expert, label_status: "technical" }, allowed));
  assert.throws(() => validateExpertDecisionCase({ ...expert, dataset_origin: "synthetic" }, allowed));
  assert.throws(() => validateExpertDecisionCase({ ...expert,
    independent_labels: expert.independent_labels.slice(0, 1) }, allowed));
  assert.throws(() => validateExpertDecisionCase({ ...expert,
    adjudicated_competency_ids: ["FUERA"] }, allowed));
});

test("mide varias competencias y abstención sobre los mismos casos", () => {
  assert.deepEqual(summarizeDecisionComparison([
    { expected: allowed, current: ["MAT_CANTIDAD"], jev: allowed },
    { expected: [], current: ["COM_ORAL"], jev: [] },
  ]), { total: 2, without_competency: 1, multiple_competencies: 1,
    current: { exact: 0, false_positives: 1, false_negatives: 1, none_exact: 0, multiple_exact: 0 },
    jev: { exact: 2, false_positives: 0, false_negatives: 0, none_exact: 1, multiple_exact: 1 } });
});
