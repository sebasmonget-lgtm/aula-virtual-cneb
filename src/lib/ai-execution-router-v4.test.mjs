import test from "node:test";
import assert from "node:assert/strict";
import { AI_ROUTING_POLICY, AIExecutionRoutingError, resolveAIFallbackPlan, resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";

test("aplica los tiers semánticos GPT-6 a los workflows productivos", () => {
  const cases = [
    ["annual_plan", "global_planning", "gpt-6-sol", "high"],
    ["project", "judgment_generation", "gpt-6-sol", "medium"],
    ["unit", "judgment_generation", "gpt-6-sol", "medium"],
    ["activity", "routine_generation", "gpt-6-luna", "medium"],
    ["criterion_realignment", "judgment_generation", "gpt-6-sol", "medium"],
    ["assessment_master", "judgment_generation", "gpt-6-sol", "medium"],
    ["assessment", "routine_generation", "gpt-6-luna", "medium"],
    ["descriptive_conclusion", "routine_generation", "gpt-6-luna", "medium"],
    ["family_report", "routine_generation", "gpt-6-luna", "medium"],
  ];
  for (const [workflow, tier, model, reasoning] of cases) {
    const plan = resolveAIExecutionPlan({ workflow, task: "generation" });
    assert.deepEqual([plan.tier, plan.provider, plan.model, plan.reasoning_effort], [tier, "openai", model, reasoning]);
    assert.equal(plan.routing_policy_version, AI_ROUTING_POLICY.version);
  }
});

test("activity tiene un único fallback explícito de Luna medium a Sol low", () => {
  const primary = resolveAIExecutionPlan({ workflow: "activity", task: "generation" });
  assert.deepEqual(primary.fallback, { tier: "focused_writing", provider: "openai", model: "gpt-6-sol",
    reasoning_effort: "low", trigger: "quality_or_validation_failure", max_attempts: 1 });
  const fallback = resolveAIFallbackPlan(primary);
  assert.deepEqual([fallback.tier, fallback.model, fallback.reasoning_effort, fallback.fallback],
    ["focused_writing", "gpt-6-sol", "low", null]);
});

test("el Plan Maestro usa Sol high y su redacción formal Sol low", () => {
  const master = resolveAIExecutionPlan({ workflow: "annual_plan", task: "generation" });
  const writing = resolveAIExecutionPlan({ workflow: "annual_plan", task: "document_development" });
  assert.deepEqual([master.tier, master.model, master.reasoning_effort], ["global_planning", "gpt-6-sol", "high"]);
  assert.deepEqual([writing.tier, writing.model, writing.reasoning_effort], ["focused_writing", "gpt-6-sol", "low"]);
});

test("assessment y conclusión tienen fallbacks de calidad explícitos; criterio normal no llama IA",()=>{
  const assessment=resolveAIExecutionPlan({workflow:"assessment"});
  assert.deepEqual([assessment.fallback.model,assessment.fallback.reasoning_effort,assessment.fallback.max_attempts],
    ["gpt-6-sol","medium",1]);
  const conclusion=resolveAIExecutionPlan({workflow:"descriptive_conclusion"});
  assert.deepEqual([conclusion.fallback.model,conclusion.fallback.reasoning_effort,conclusion.fallback.max_attempts],
    ["gpt-6-sol","low",1]);
  const criterion=resolveAIExecutionPlan({workflow:"criterion_and_evidence"});
  assert.deepEqual([criterion.execution,criterion.replacement_workflow],["unavailable","criterion_realignment"]);
  assert.equal(JSON.stringify(AI_ROUTING_POLICY).includes("gpt-6-astra"),false);
});

test("diagnóstico principal, evidencia y modo Hoy se resuelven en código", () => {
  for (const workflow of ["diagnostic", "evidence_capture", "today_mode"]) {
    const plan = resolveAIExecutionPlan({ workflow });
    assert.equal(plan.execution, "code");
    assert.equal(plan.provider, null);
    assert.equal(plan.fallback, null);
  }
});

test("las ayudas diagnósticas opcionales tienen workflows explícitos", () => {
  for (const workflow of ["diagnostic_individual_assist", "diagnostic_group_synthesis", "diagnostic_priority_assist"]) {
    const plan = resolveAIExecutionPlan({ workflow, task: "generation" });
    assert.deepEqual([plan.model, plan.reasoning_effort], ["gpt-6-sol", "medium"]);
  }
});

test("decisiones, workshop y materiales quedan explícitamente no disponibles", () => {
  const decision = resolveAIExecutionPlan({ workflow: "activity", task: "option_ranking" });
  assert.deepEqual([decision.execution, decision.provider, decision.unavailable_reason],
    ["unavailable", null, "decision_provider_not_implemented"]);
  const workshop = resolveAIExecutionPlan({ workflow: "workshop" });
  assert.deepEqual([workshop.execution, workshop.planned_tier], ["unavailable", "routine_generation"]);
  const material = resolveAIExecutionPlan({ workflow: "material_generation" });
  assert.deepEqual([material.execution, material.planned_tier, material.planned_fallback_tier],
    ["unavailable", "structured_light", "focused_writing"]);
});

test("el routing es determinista y rechaza workflows desconocidos", () => {
  assert.deepEqual(resolveAIExecutionPlan({ workflow: "activity" }), resolveAIExecutionPlan({ workflow: "activity" }));
  assert.throws(() => resolveAIExecutionPlan({ workflow: "unknown" }), AIExecutionRoutingError);
});
