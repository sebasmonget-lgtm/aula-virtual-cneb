import test from "node:test";
import assert from "node:assert/strict";
import { routeAssistantIntent, validateJevSelection } from "./jev-decision.mjs";
const candidate = { id: "c1", review_status: "verified", official_name: "Indaga", meaning: "Explora", pedagogical_intent: "Investiga", capacities: ["c"], cycle_standard_meaning: "Explica", when_to_use: ["pregunta"], do_not_use_when: ["copia"], typical_contexts: ["jardín"], observable_actions: ["observa"], possible_evidence: ["nota"], examples: ["caracol"], not_examples: ["pintar"], common_confusions: ["comunicación"] };
test("Jev usa código para intención cotidiana", () => assert.equal(routeAssistantIntent("¿Qué toca hoy?"), "today"));
test("Jev rechaza IDs fuera de candidatos", () => assert.equal(validateJevSelection({ age: 5, candidates: [candidate], selection: { primary_competency_id: "otro", confidence: .9 } }).status, "manual_selection_required"));
test("Jev exige ficha verificada y completa", () => assert.equal(validateJevSelection({ age: 5, candidates: [{ ...candidate, review_status: "pending" }], selection: { primary_competency_id: "c1", confidence: .9 } }).reason, "no_verified_semantic_candidates"));
