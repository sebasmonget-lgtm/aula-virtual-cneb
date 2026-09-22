import test from "node:test";
import assert from "node:assert/strict";
import { AI_ROUTING_POLICY, AIExecutionRoutingError, resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";

test("aplica la política inicial de routing por workflow", () => {
  const cases = [
    ["activity", "standard_generation", "openai", "gpt-5.6-terra", "low"],
    ["project", "deep_generation", "openai", "gpt-5.6-sol", "medium"],
    ["annual_plan", "deep_generation", "openai", "gpt-5.6-sol", "medium"],
    ["material_generation", "light_generation", "openai", "gpt-5.6-luna", "none"],
  ];
  for (const [workflow, tier, provider, model, reasoning_effort] of cases) {
    assert.deepEqual(resolveAIExecutionPlan({ workflow }), {
      execution: "generation", tier, provider, model, reasoning_effort, capability: null,
      reason: `Política v${AI_ROUTING_POLICY.version} para ${workflow}.`,
      allow_escalation: workflow === "material_generation" || workflow === "activity",
    });
  }
});

test("mantiene evidence_capture y today_mode en código", () => {
  for (const workflow of ["evidence_capture", "today_mode"]) {
    const plan = resolveAIExecutionPlan({ workflow });
    assert.equal(plan.execution, "code");
    assert.equal(plan.provider, null);
    assert.equal(plan.reasoning_effort, null);
    assert.equal(plan.allow_escalation, false);
  }
  const explanation = resolveAIExecutionPlan({ workflow: "today_mode", task: "explanation" });
  assert.deepEqual([explanation.execution, explanation.tier, explanation.model, explanation.reasoning_effort], ["generation", "light_generation", "gpt-5.6-luna", "none"]);
});

test("usa TypeSafe solo para tareas de decisión estructurada", () => {
  const plan = resolveAIExecutionPlan({ workflow: "activity", task: "option_ranking" });
  assert.deepEqual(plan, {
    execution: "decision", tier: "decision", provider: "typesafe", model: null, reasoning_effort: null, capability: "decision",
    reason: "Tarea estructurada 'option_ranking' para activity.", allow_escalation: false,
  });
});

test("el routing es determinista y rechaza workflows desconocidos", () => {
  assert.deepEqual(resolveAIExecutionPlan({ workflow: "activity" }), resolveAIExecutionPlan({ workflow: "activity" }));
  assert.throws(() => resolveAIExecutionPlan({ workflow: "unknown" }), AIExecutionRoutingError);
});
