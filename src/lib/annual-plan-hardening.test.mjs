import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { ACTIVITY_OUTPUT_SCHEMA, ANNUAL_PLAN_OUTPUT_SCHEMA, buildProviderRequest, generateAIWorkflowV4 } from "./ai-generation-v4.mjs";
import { AnnualPlanValidationError, validateAnnualPlanProposal } from "./annual-plan-contract.mjs";
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
  assert.match(source, /pendingAIGenerations\.set/);
  assert.match(source, /pending\?\.metadata/);
  assert.match(source, /!existingId && \(!pending/);
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

const sampleExperience = {
  period: "Marzo", experience_type: "project", title: "Explorar sombras", rationale: "Interés del grupo", primary_competency_ids: ["COMP-1"], possible_secondary_competency_ids: [], context_or_trigger: "Observación del patio", expected_evidence_categories: ["Preguntas de niños"], flexibility_notes: "Ajustar según observación",
};

test("contrato anual valida todos los campos, listas, año y competencias aplicables", () => {
  const valid = { ...annualOutput, proposed_experiences: [sampleExperience] };
  assert.equal(validateAnnualPlanProposal(valid, new Set(["COMP-1"]), 2026), valid);
  const invalid = [
    [null, "annual_plan_schema_mismatch"],
    [{ ...valid, planning_priorities: [null] }, "annual_plan_required_field_invalid"],
    [{ ...valid, school_year: "2025" }, "annual_plan_school_year_mismatch"],
    [{ ...valid, proposed_experiences: [null] }, "annual_plan_experience_schema_mismatch"],
    [{ ...valid, proposed_experiences: [{ ...sampleExperience, primary_competency_ids: "COMP-1" }] }, "annual_plan_experience_schema_mismatch"],
    [{ ...valid, proposed_experiences: [{ ...sampleExperience, expected_evidence_categories: [""] }] }, "annual_plan_experience_schema_mismatch"],
    [{ ...valid, proposed_experiences: [{ ...sampleExperience, experience_type: "activity" }] }, "annual_plan_experience_type_invalid"],
    [{ ...valid, proposed_experiences: [{ ...sampleExperience, primary_competency_ids: ["INVENTADA"] }] }, "annual_plan_competency_outside_bundle"],
    [{ ...valid, proposed_experiences: [{ ...sampleExperience, primary_competency_ids: ["COMP-1"] }] }, "annual_plan_competency_outside_bundle", new Set()],
  ];
  for (const [proposal, reason, ids = new Set(["COMP-1"])] of invalid) {
    assert.throws(() => validateAnnualPlanProposal(proposal, ids, 2026), (error) => error instanceof AnnualPlanValidationError && error.reason === reason);
  }
});

test("salida anual malformada del provider falla de forma controlada", async () => {
  const input = { workflow: "annual_plan", age: 5, teacher_request: "Preparar plan anual.", calendar_context: { school_year: "2026", starts_on: "2026-03-01", ends_on: "2026-12-18" }, classroom_context: { group_context: "Grupo de cinco años" } };
  const provider = { id: "mock", model: "gpt-5.6-sol", generate: async () => ({ ...annualOutput, proposed_experiences: [{ ...sampleExperience, primary_competency_ids: null }] }) };
  await assert.rejects(generateAIWorkflowV4(input, { provider, knowledgeBase: await loadKnowledgeBaseV4() }), (error) => error.code === "INVALID_AI_GENERATION" && error.reason === "annual_plan_experience_schema_mismatch");
});

test("servidor valida POST y CONFIRM antes de persistir o activar el plan", async () => {
  const source = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  const post = source.slice(source.indexOf('url.pathname === "/api/annual-plans"'), source.indexOf('url.pathname.startsWith("/api/annual-plans/")'));
  const confirm = source.slice(source.indexOf('url.pathname.endsWith("/confirm")'), source.indexOf('url.pathname === "/api/annual-plans/current"'));
  assert.match(post, /validateAnnualPlanProposal\(body\.proposal, await applicableCompetencyIds\("annual_plan", context\), context\.year\)/);
  assert.ok(post.indexOf("validateAnnualPlanProposal") < post.indexOf("await db.exec(\"begin\")"));
  assert.match(confirm, /validateAnnualPlanProposal\(draft\.rows\[0\]\.proposal, await applicableCompetencyIds\("annual_plan", context\), context\.year\)/);
  assert.ok(confirm.indexOf("validateAnnualPlanProposal") < confirm.indexOf("set status='archived'"));
});

test("migraciones local y Supabase impiden dos borradores anuales del mismo aula y año", async () => {
  for (const migrationUrl of [new URL("../../local-db/migrations/0026_annual_plan_draft_uniqueness.sql", import.meta.url), new URL("../../supabase/migrations/202609220024_annual_plan_draft_uniqueness.sql", import.meta.url)]) {
    const db = await PGlite.create();
    try {
      await db.exec("create table public.annual_plans (id integer primary key, classroom_id integer not null, school_year_id integer not null, status text not null)");
      await db.exec(await readFile(migrationUrl, "utf8"));
      await db.exec("insert into public.annual_plans values (1, 10, 2026, 'draft')");
      await assert.rejects(db.exec("insert into public.annual_plans values (2, 10, 2026, 'draft')"));
      await db.exec("update public.annual_plans set status='active' where id=1");
      await db.exec("insert into public.annual_plans values (2, 10, 2026, 'draft')");
      await db.exec("insert into public.annual_plans values (3, 10, 2027, 'draft')");
    } finally { await db.close(); }
  }
});





