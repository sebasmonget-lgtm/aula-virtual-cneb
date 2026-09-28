import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCases, proposals } from "../src/profile-comparison.mjs";

const cases = [
  { id: "positive", expected_competency_id: "A", acceptable_secondary_ids: ["B"] },
  { id: "abstain", expected_competency_id: null, acceptable_secondary_ids: [] },
];
const applicability = cases.map((item) => ({ id: item.id, primary_applicable: true }));

test("el paralelo mejora la recuperación al bajar umbral, pero puede perder abstención", () => {
  const rows = [
    { id: "positive", method: "parallel-noul", profile: "compact", result: { status: "review", competency_scores: { A: 0.68, B: 0.59 } } },
    { id: "abstain", method: "parallel-noul", profile: "compact", result: { status: "unclassified", competency_scores: { A: 0.55, B: 0.1 } } },
  ];
  const high = evaluateCases(cases, rows, applicability, { method: "parallel-noul", profile: "compact", threshold: 0.8 });
  const middle = evaluateCases(cases, rows, applicability, { method: "parallel-noul", profile: "compact", threshold: 0.6 });
  const low = evaluateCases(cases, rows, applicability, { method: "parallel-noul", profile: "compact", threshold: 0.5 });
  assert.equal(high.admissible_cases, 1);
  assert.equal(middle.admissible_cases, 2);
  assert.equal(low.correct_abstentions, 0);
  assert.equal(low.extra_labels, 1);
});

test("choice añade top-2 solo si el margen lo permite y nunca propone NO_CLASIFICABLE", () => {
  const result = { status: "review", proposed_competency_id: "A", top1_probability: 0.58, secondary_candidate: { competency_id: "B", probability: 0.4 } };
  assert.deepEqual(proposals(result, "choice"), ["A"]);
  assert.deepEqual(proposals(result, "choice", { secondMargin: 0.15 }), ["A"]);
  assert.deepEqual(proposals(result, "choice", { secondMargin: 0.2 }), ["A", "B"]);
  assert.deepEqual(proposals({ ...result, status: "unclassified" }, "choice", { secondMargin: 0.2 }), []);
  assert.deepEqual(proposals({ ...result, secondary_candidate: { competency_id: "NO_CLASIFICABLE", probability: 0.4 } }, "choice", { secondMargin: 0.2 }), ["A"]);
});

test("excluye una primaria no aplicable sin contarla como abstención", () => {
  const rows = [{ id: "positive", method: "choice", profile: "compact", result: { status: "classified", proposed_competency_id: "A", probabilities: { A: 0.8, NO_CLASIFICABLE: 0.2 } } }];
  const outcome = evaluateCases(cases, rows, [{ id: "positive", primary_applicable: false }, { id: "abstain", primary_applicable: true }], { method: "choice", profile: "compact" });
  assert.equal(outcome.eligible, 1);
  assert.equal(outcome.labelled, 0);
  assert.equal(outcome.abstain, 0);
  assert.equal(outcome.failures, 1);
});
