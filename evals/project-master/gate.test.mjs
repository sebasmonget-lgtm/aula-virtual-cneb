import test from "node:test";
import assert from "node:assert/strict";
import { decideBakeoff, validateBakeoffEvidence } from "./gate.mjs";

function fixture({ bScore = 3, bCost = 0.075, bLatency = 900 } = {}) {
  const cases = Array.from({ length: 36 }, (_, index) => ({
    id: `case-${index}`, kind: index < 24 ? "base" : index < 30 ? "qa_regression" : "expert_hard",
    age: index < 24 ? 3 + Math.floor(index / 8) : 5,
    period: index < 24 ? 1 + Math.floor((index % 8) / 2) : 1,
    context_variant: index < 24 && index % 2 === 0 ? "baseline" : "changed",
    split: index % 3 ? "blind_test" : "development", source_hash: "source", expected_contract_hash: "contract",
    calendar_hash: "calendar", kb_hash: "kb", qa_source: index >= 24 && index < 30 ? "QA-H34" : undefined,
    expected_outcome: index >= 24 && index < 30 ? "valid project" : undefined,
    expert_case_adjudication_id: index >= 30 ? `external-${index}` : undefined, legacy: index === 35,
  }));
  const runs = [], reviews = [];
  for (const item of cases) for (const repetition of [1, 2, 3]) for (const arm of ["A", "B"]) {
    const runKey = `${item.id}:${repetition}:${arm}`;
    runs.push({ case_id: item.id, repetition, arm, status: "valid", latency_ms: arm === "A" ? 1000 : bLatency,
      input_tokens: 1000, output_tokens: 500, cost_usd: arm === "A" ? 0.10 : bCost, retries: 0,
      provider_version: "frozen", price_version: "frozen", prompt_hash: `frozen-${arm}`,
      output_schema_hash: "frozen", input_hash: item.source_hash, kb_hash: item.kb_hash,
      calendar_hash: item.calendar_hash });
    for (const reviewer_id of ["specialist-1", "specialist-2"])
      reviews.push({ run_key: runKey, reviewer_id, blinded_output_id: `${item.id}-${repetition}-${arm}-blind`,
        visible_arm: "hidden", scores: { coherence: arm === "A" ? 2 : bScore,
          curriculum: arm === "A" ? 2 : bScore, evidence_links: arm === "A" ? 2 : bScore,
          calendar: arm === "A" ? 2 : bScore, mediation: arm === "A" ? 2 : bScore,
          edit_fidelity: arm === "A" ? 2 : bScore }, teacher_edit_minutes: 4, teacher_edit_count: 1,
        serious_curricular_veto: false });
  }
  return { cases, runs, reviews, adjudications: [], risk_defects: { A: 0, B: 0 } };
}

test("complete blinded evidence selects a materially better B", () => {
  const result = decideBakeoff(fixture());
  assert.equal(result.winner, "B");
  assert.equal(result.A.count, 108);
  assert.equal(result.B.input_tokens, 108000);
});

test("B is not preferred for a score tie without enough efficiency", () => {
  assert.equal(decideBakeoff(fixture({ bScore: 2, bCost: 0.09, bLatency: 900 })).winner, "A");
  assert.equal(decideBakeoff(fixture({ bScore: 2, bCost: 0.075, bLatency: 900 })).winner, "B");
});

test("a missing external case adjudication blocks the gate", () => {
  const evidence = fixture();
  delete evidence.cases[35].expert_case_adjudication_id;
  assert.throws(() => decideBakeoff(evidence), /external adjudication/);
});

test("base matrix and identical inputs/provider are mandatory", () => {
  const missingCell = fixture(); missingCell.cases[0].period = 2;
  assert.throws(() => validateBakeoffEvidence(missingCell), /Missing 3×4×2 base cell/);
  const differentInput = fixture(); differentInput.runs[1].input_hash = "changed-only-for-B";
  assert.throws(() => validateBakeoffEvidence(differentInput), /Arms differ in frozen input/);
});

test("missing repetitions, reviewers and disagreement adjudication block the gate", () => {
  const missingRun = fixture(); missingRun.runs.pop();
  assert.throws(() => validateBakeoffEvidence(missingRun), /Missing run/);
  const missingReviewer = fixture(); missingReviewer.reviews.pop();
  assert.throws(() => validateBakeoffEvidence(missingReviewer), /Two independent reviews/);
  const disagreement = fixture(); disagreement.reviews[0].scores.coherence = 1;
  assert.throws(() => validateBakeoffEvidence(disagreement), /Disagreement needs adjudication/);
});

test("invalid outputs count as failures; serious expert veto and privacy defects fail closed", () => {
  const invalid = fixture();
  invalid.runs.filter((item) => item.arm === "B").slice(0, 3)
    .forEach((item) => { item.status = "invalid"; });
  assert.equal(decideBakeoff(invalid).winner, "A");
  const veto = fixture();
  veto.reviews.filter((item) => item.run_key === "case-35:1:B")
    .forEach((item) => { item.serious_curricular_veto = true; });
  assert.equal(decideBakeoff(veto).winner, "A");
  const privacy = fixture(); privacy.risk_defects.B = 1;
  assert.equal(decideBakeoff(privacy).winner, "A");
});
