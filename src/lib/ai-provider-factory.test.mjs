import test from "node:test";
import assert from "node:assert/strict";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { AIProviderFactoryError, createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { OpenAIProvider } from "./openai-provider.mjs";

test("el factory crea OpenAIProvider para el plan Terra sin decidir un modelo", () => {
  const plan = resolveAIExecutionPlan({ workflow: "activity" });
  const provider = createAIProviderForPlan(plan, { apiKey: "test-key", client: {} });
  assert.ok(provider instanceof OpenAIProvider);
  assert.equal(provider.configuredModel, plan.model);
  assert.equal(provider.configuredModel, "gpt-5.6-terra");
});

test("el factory no crea provider para code", () => {
  const plan = resolveAIExecutionPlan({ workflow: "evidence_capture" });
  assert.equal(createAIProviderForPlan(plan), null);
});

test("TypeSafe y planes inválidos quedan explícitamente sin implementar", () => {
  const typesafePlan = resolveAIExecutionPlan({ workflow: "activity", task: "option_ranking" });
  assert.throws(
    () => createAIProviderForPlan(typesafePlan),
    (error) => error instanceof AIProviderFactoryError && error.reason === "provider_not_implemented",
  );
  assert.throws(
    () => createAIProviderForPlan({ execution: "generation", provider: "openai", model: null }),
    (error) => error instanceof AIProviderFactoryError && error.reason === "execution_plan_model_required",
  );
});
