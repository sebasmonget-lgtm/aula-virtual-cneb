import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  KNOWLEDGE_BASE_V4_ROOT,
  loadKnowledgeBaseV4,
  validateKnowledgeBaseAge,
  validateKnowledgeBaseWorkflow,
} from "./knowledge-base-v4.mjs";

test("carga la Knowledge Base v4 íntegra sin depender de PDF", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();

  assert.equal(knowledgeBase.version, "4.0.0");
  assert.equal(knowledgeBase.knowledgeUnits.length, 245);
  assert.equal(knowledgeBase.competencyCards.length, 14);
  assert.equal(Object.keys(knowledgeBase.workflows).length, 13);
  assert.equal(knowledgeBase.retrievalPolicy.corpus, "06_retrieval/combined_knowledge_units.jsonl");

  const sourceRefs = new Set(knowledgeBase.knowledgeUnits.flatMap((unit) => unit.source_refs));
  assert.ok(sourceRefs.size > 0);
  assert.ok(knowledgeBase.knowledgeUnits.every((unit) => unit.age_scope.every((age) => [3, 4, 5].includes(age))));
  assert.ok(knowledgeBase.competencyCards.every((card) => ["3", "4", "5"].every((age) => card.ages[age])));
  assert.ok(knowledgeBase.knowledgeUnits.every((unit) => unit.knowledge_base_version === "4.0.0"));

  const loaderSource = await readFile(new URL("./knowledge-base-v4.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(loaderSource, /\.pdf|pdfplumber|poppler/i);
  assert.match(KNOWLEDGE_BASE_V4_ROOT, /knowledge[\\/]cneb-initial-3-5[\\/]v4\.0\.0[\\/]?$/);
});

test("acepta solamente edades 3, 4 y 5", () => {
  for (const age of [3, 4, 5]) assert.equal(validateKnowledgeBaseAge(age), age);
  for (const age of ["3", 2, 6, null, undefined]) {
    assert.throws(() => validateKnowledgeBaseAge(age), /3, 4 o 5/);
  }
});

test("expone los 13 workflows y rechaza uno desconocido", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const workflowNames = Object.keys(knowledgeBase.workflows);

  assert.deepEqual(workflowNames, [
    "diagnostic", "annual_plan", "project", "unit", "workshop", "activity",
    "criterion_and_evidence", "evidence_capture", "assessment", "descriptive_conclusion",
    "family_report", "material_generation", "today_mode",
  ]);
  assert.equal(knowledgeBase.getWorkflow("activity"), knowledgeBase.workflows.activity);
  assert.equal(validateKnowledgeBaseWorkflow("diagnostic", knowledgeBase.workflows), knowledgeBase.workflows.diagnostic);
  assert.throws(() => knowledgeBase.getWorkflow("buildAIContext"), /Workflow.*desconocido/);
});
