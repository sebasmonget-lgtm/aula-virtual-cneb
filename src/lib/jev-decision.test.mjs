import test from "node:test";
import assert from "node:assert/strict";
import { routeAssistantIntent, validateJevSelection } from "./jev-decision.mjs";
const candidate = { id: "c1", official_review_status: "verified", semantic_review_status: "verified", official_name: "Indaga", meaning: "Explora", pedagogical_intent: "Investiga", capacities: ["c"], cycle_standard_meaning: "Explica", when_to_use: ["pregunta"], do_not_use_when: ["copia"], typical_contexts: ["jardín"], observable_actions: ["observa"], possible_evidence: ["nota"], examples: ["caracol"], not_examples: ["pintar"], common_confusions: ["comunicación"] };
const performance = { id: "p1", competency_id: "c1", age: 5, official_text_ref: "programa-inicial.pdf#p=150", official_review_status: "verified", semantic_review_status: "verified", meaning: "Explora", focus: "Pregunta", when_to_select: ["investiga"], when_not_to_select: ["copia"], observable_actions: ["pregunta"], expected_evidence: ["nota"], examples: ["caracol"], not_examples: ["dictado"], confusable_with: ["c2"] };
test("Jev usa código para intención cotidiana", () => assert.equal(routeAssistantIntent("¿Qué toca hoy?"), "today"));
test("Jev rechaza IDs fuera de candidatos", () => assert.equal(validateJevSelection({ age: 5, candidates: [candidate], selection: { primary_competency_id: "otro", confidence: .9 } }).status, "manual_selection_required"));
test("Jev exige revisión oficial y semántica", () => assert.equal(validateJevSelection({ age: 5, candidates: [{ ...candidate, official_review_status: "pending" }], selection: { primary_competency_id: "c1", confidence: .9 } }).reason, "no_verified_official_semantic_candidates"));
test("Jev rechaza semántica pendiente, baja confianza y ficha incompleta", () => {
  assert.equal(validateJevSelection({ age: 5, candidates: [{ ...candidate, semantic_review_status: "pending" }], selection: { primary_competency_id: "c1", confidence: .9 } }).status, "manual_selection_required");
  assert.equal(validateJevSelection({ age: 5, candidates: [candidate], selection: { primary_competency_id: "c1", confidence: .2 } }).reason, "low_confidence");
  assert.equal(validateJevSelection({ age: 5, candidates: [{ ...candidate, examples: [] }], selection: { primary_competency_id: "c1", confidence: .9 } }).status, "manual_selection_required");
});
test("Jev solo propone desempeños de la competencia y edad confirmadas", () => {
  const selection = { ranked_performance_ids: ["p1"], confidence: .9 };
  assert.equal(validateJevSelection({ age: 5, candidates: [performance], selection, kind: "performance", selectedCompetencyId: "c1" }).status, "proposal");
  assert.equal(validateJevSelection({ age: 4, candidates: [performance], selection, kind: "performance", selectedCompetencyId: "c1" }).reason, "no_verified_official_semantic_candidates");
  assert.equal(validateJevSelection({ age: 5, candidates: [performance], selection, kind: "performance", selectedCompetencyId: "c2" }).reason, "no_verified_official_semantic_candidates");
  assert.equal(validateJevSelection({ age: 5, candidates: [performance], selection, kind: "performance" }).reason, "missing_confirmed_competency");
});
