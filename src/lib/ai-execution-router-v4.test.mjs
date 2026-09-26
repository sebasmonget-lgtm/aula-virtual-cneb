import test from "node:test";
import assert from "node:assert/strict";
import { AI_ROUTING_POLICY, AIExecutionRoutingError, resolveAIFallbackPlan, resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";

test("aplica los tiers semánticos GPT-6 a los workflows productivos", () => {
  const cases = [
    ["annual_plan", "deep_planning", "gpt-6-astra", "high"],
    ["project", "judgment_generation", "gpt-6-sol", "medium"],
    ["unit", "judgment_generation", "gpt-6-sol", "medium"],
    ["activity", "routine_generation", "gpt-6-luna", "medium"],
    ["criterion_and_evidence", "judgment_generation", "gpt-6-sol", "medium"],
    ["assessment", "judgment_generation", "gpt-6-sol", "medium"],
    ["descriptive_conclusion", "judgment_generation", "gpt-6-sol", "medium"],
    ["family_report", "focused_writing", "gpt-6-sol", "low"],
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
