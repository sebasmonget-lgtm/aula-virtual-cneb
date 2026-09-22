import test from "node:test";
import assert from "node:assert/strict";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { retrieveKnowledgeV4 } from "./knowledge-retrieval-v4.mjs";

const baseInput = { workflow: "diagnostic", age: 5, teacherRequest: "observaciones para diagnóstico" };

test("recupera solo dominios del workflow y respeta sus límites", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const result = await retrieveKnowledgeV4(baseInput, knowledgeBase);
  const workflow = knowledgeBase.workflows.diagnostic;
  const allowedDomains = new Set([...workflow.required_domains, ...workflow.optional_domains]);

  assert.ok(result.units.length > 0);
  assert.ok(result.units.every((unit) => allowedDomains.has(unit.domain)));
  assert.ok(result.units.every((unit) => unit.age_scope.includes(5)));
  assert.ok(result.semanticUnits.length <= workflow.max_semantic_units);
  assert.ok(result.sourceClaims.length <= workflow.max_source_claims);
  assert.deepEqual(result.provenance.knowledge_unit_ids, result.units.map((unit) => unit.id));
  assert.deepEqual(result.provenance.source_claim_ids, result.sourceClaims.map((unit) => unit.id));
  assert.equal(result.provenance.knowledge_base_version, "4.0.0");
});

test("aplica competencia confirmada y orden de ranking de forma estable", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const input = { ...baseInput, confirmedCompetencyId: "COM_ORAL", teacherRequest: "explicar oralmente" };
  const first = await retrieveKnowledgeV4(input, knowledgeBase);
  const second = await retrieveKnowledgeV4(input, knowledgeBase);

  assert.deepEqual(first.provenance.knowledge_unit_ids, second.provenance.knowledge_unit_ids);
  assert.ok(first.units.every((unit) => unit.competency_id === null || unit.competency_id === "COM_ORAL"));
  assert.equal(first.provenance.competency_ids[0], "COM_ORAL");
  assert.equal(first.semanticUnits[0]?.domain, "curriculum_age_profile");
});

test("excluye L2, Religión y overlay 2026 si no son aplicables", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const result = await retrieveKnowledgeV4(baseInput, knowledgeBase);

  assert.ok(result.units.every((unit) => unit.temporal_scope !== "2026"));
  assert.ok(result.units.every((unit) => unit.competency_id !== "CAST_L2_ORAL" && unit.domain !== "castellano_l2"));
  assert.ok(result.units.every((unit) => unit.competency_id !== "PS_RELIGION" && unit.domain !== "religion_context"));
});

test("incluye conocimiento L2 y Religión solo con aplicabilidad explícita", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const l2 = await retrieveKnowledgeV4({ ...baseInput, castellanoL2Applicable: true }, knowledgeBase);
  const religion = await retrieveKnowledgeV4({ ...baseInput, religionApplicable: true }, knowledgeBase);

  assert.ok(l2.units.some((unit) => unit.competency_id === "CAST_L2_ORAL"));
  assert.ok(religion.units.some((unit) => unit.competency_id === "PS_RELIGION"));
});

test("incluye el overlay 2026 solamente cuando hay contexto temporal explícito", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const defaultResult = await retrieveKnowledgeV4({ ...baseInput, workflow: "annual_plan" }, knowledgeBase);
  const temporalResult = await retrieveKnowledgeV4({ ...baseInput, workflow: "annual_plan", temporalContext: { year: 2026 } }, knowledgeBase);

  assert.ok(defaultResult.units.every((unit) => unit.temporal_scope !== "2026"));
  assert.ok(temporalResult.units.some((unit) => unit.temporal_scope === "2026"));
});

test("rechaza edad, workflow y competencia confirmada inválidos", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  await assert.rejects(() => retrieveKnowledgeV4({ workflow: "diagnostic", age: 6 }, knowledgeBase), /3, 4 o 5/);
  await assert.rejects(() => retrieveKnowledgeV4({ workflow: "unknown", age: 5 }, knowledgeBase), /Workflow.*desconocido/);
  await assert.rejects(() => retrieveKnowledgeV4({ ...baseInput, confirmedCompetencyId: "UNKNOWN" }, knowledgeBase), /Competencia confirmada desconocida/);
});
