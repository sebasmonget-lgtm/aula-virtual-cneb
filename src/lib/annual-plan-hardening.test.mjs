import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ACTIVITY_OUTPUT_SCHEMA, ANNUAL_PLAN_OUTPUT_SCHEMA, buildProviderRequest, generateAIWorkflowV4 } from "./ai-generation-v4.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { nextAnnualPlanVersion, safeAnnualGenerationMetadata } from "./annual-plan-persistence.mjs";

const bundle = { curriculum: { competency_cards: [] }, provenance: {} };
const plan = { provider: "openai", model: "gpt-5.6-sol", execution: "generation" };

test("provider request conserva el workflow y el schema de cada salida", () => {
  const activity = buildProviderRequest("activity", bundle, plan, ACTIVITY_OUTPUT_SCHEMA);
  const annual = buildProviderRequest("annual_plan", bundle, plan, ANNUAL_PLAN_OUTPUT_SCHEMA);
  assert.equal(activity.workflow, "activity");
  assert.equal(activity.output_schema.id, "activity-v1");
  assert.equal(annual.workflow, "annual_plan");
  assert.equal(annual.output_schema.id, "annual-plan-v1");
});

test("metadata anual preserva solo auditoría permitida", () => {
  const saved = safeAnnualGenerationMetadata({ workflow: "annual_plan", model: "gpt-5.6-sol", reasoning_effort: "medium", response_id: "resp_1", usage: { input_tokens: 2, cached_input_tokens: 1, output_tokens: 3, total_tokens: 5, secret: "no" }, provenance: { knowledge_base_version: "4.0.0", knowledge_unit_ids: ["KU-1"] }, prompt: "never" });
  assert.deepEqual(saved, { workflow: "annual_plan", model: "gpt-5.6-sol", reasoning_effort: "medium", response_id: "resp_1", usage: { input_tokens: 2, cached_input_tokens: 1, output_tokens: 3, total_tokens: 5 }, provenance: { knowledge_base_version: "4.0.0", knowledge_unit_ids: ["KU-1"] }, knowledge_base_version: "4.0.0" });
  assert.equal(nextAnnualPlanVersion(0), 1);
  assert.equal(nextAnnualPlanVersion(1), 2);
});

test("servidor conserva metadata del pending generation, versiona y no crea experiencias reales", async () => {
  const source = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  assert.match(source, /pendingAnnualGenerations\.set/);
  assert.match(source, /pending\?\.metadata/);
  assert.match(source, /!existingId && !pending/);
  assert.doesNotMatch(source, /body\.generation_metadata|body\.metadata/);
  assert.match(source, /max\(version\)/);
  assert.match(source, /status='archived'/);
  assert.match(source, /annual-plan.*generate/);
  assert.doesNotMatch(source, /annual_plan_competencies[\s\S]{0,100}insert/i);
});

test("editor anual permite editar el schema completo y usa URL configurada", async () => {
  const source = await readFile(new URL("../features/dashboard/components/annual-plan-generator.tsx", import.meta.url), "utf8");
  for (const field of ["title", "school_year", "general_context_summary", "planning_priorities", "competency_overview", "proposed_experiences", "review_checkpoints", "flexibility_notes", "period", "rationale", "context_or_trigger", "primary_competency_ids", "possible_secondary_competency_ids", "expected_evidence_categories"]) assert.match(source, new RegExp(field));
  assert.match(source, /localDatabaseApiUrl/);
  assert.doesNotMatch(source, /127\.0\.0\.1:8788/);
});

const annualOutput = {
  title: "Plan anual 2026", school_year: "2026", general_context_summary: "Grupo de cinco años con interés por explorar.", planning_priorities: ["Acompañar exploraciones"], competency_overview: ["Priorizar experiencias significativas"], proposed_experiences: [], review_checkpoints: ["Revisar al cierre del bimestre"], flexibility_notes: "Ajustar según intereses y evidencias docentes.",
};

test("annual_plan entrega workflow y schema annual-plan-v1 al provider y al resultado", async () => {
  const requests = [];
  const provider = { id: "mock", model: "gpt-5.6-sol", generate: async (request) => { requests.push(request); return annualOutput; } };
  const result = await generateAIWorkflowV4({ workflow: "annual_plan", age: 5, teacher_request: "Preparar plan anual.", calendar_context: { school_year: "2026", starts_on: "2026-03-01", ends_on: "2026-12-18" }, classroom_context: { group_context: "Grupo de cinco años" } }, { provider, knowledgeBase: await loadKnowledgeBaseV4() });
  assert.equal(requests[0].workflow, "annual_plan");
  assert.equal(requests[0].output_schema.id, "annual-plan-v1");
  assert.equal(result.validation.schema, "annual-plan-v1");
});



