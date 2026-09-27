import test from "node:test";
import assert from "node:assert/strict";
import { focusedKnowledgeForDirectWorkflow } from "./ai-focused-knowledge.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";

test("direct planning receives bounded v4.1 didactics for its age and competencies", async () => {
  const kb = await loadKnowledgeBaseV4();
  const result = await focusedKnowledgeForDirectWorkflow({ workflow: "project", age: 4,
    competencyIds: ["CYT_INDAGA", "MAT_CANTIDAD"], request: "Organizar una tienda y comparar productos" }, kb);
  assert.equal(result.knowledge_base_version, "4.1.0");
  assert.ok(result.semantic_units.length > 0);
  assert.ok(result.semantic_units.length <= kb.workflows.project.max_semantic_units);
  assert.ok(result.source_claims.length <= kb.workflows.project.max_source_claims);
  assert.deepEqual(result.provenance.competency_ids, ["CYT_INDAGA", "MAT_CANTIDAD"]);
  const allowed = new Set(["CYT_INDAGA", "MAT_CANTIDAD"]);
  const byId = new Map(kb.knowledgeUnits.map((unit) => [unit.id, unit]));
  for (const unit of [...result.semantic_units, ...result.source_claims]) {
    const original = byId.get(unit.id);
    assert.ok(original.age_scope.includes(4));
    assert.ok(original.competency_id === null || allowed.has(original.competency_id));
    assert.equal(typeof unit.content, "string");
  }
});

test("direct workflow rejects an unknown workflow and an age outside Inicial", async () => {
  await assert.rejects(focusedKnowledgeForDirectWorkflow({ workflow: "assessment", age: 5 }), RangeError);
  await assert.rejects(focusedKnowledgeForDirectWorkflow({ workflow: "annual_plan", age: 6 }), RangeError);
});
