import test from "node:test";
import assert from "node:assert/strict";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { AIProviderFactoryError, createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { OpenAIProvider } from "./openai-provider.mjs";

test("el factory crea OpenAIProvider sin decidir un modelo", () => {
  const plan = resolveAIExecutionPlan({ workflow: "activity" });
  const provider = createAIProviderForPlan(plan, { apiKey: "test-key", client: {} });
  assert.ok(provider instanceof OpenAIProvider);
  assert.equal(provider.configuredModel, plan.model);
  assert.equal(provider.configuredModel, "gpt-6-luna");
});

test("el factory no crea provider para code", () => {
  const plan = resolveAIExecutionPlan({ workflow: "evidence_capture" });
  assert.equal(createAIProviderForPlan(plan), null);
});

test('informe completo tiene tiempo propio sin cambiar el de los análisis breves',()=>{
 const options={apiKey:'test-key',client:{}};
 assert.equal(createAIProviderForPlan(resolveAIExecutionPlan({workflow:'family_report'}),options).timeoutMs,90_000);
 assert.equal(createAIProviderForPlan(resolveAIExecutionPlan({workflow:'assessment'}),options).timeoutMs,30_000);
 assert.equal(createAIProviderForPlan(resolveAIExecutionPlan({workflow:'family_report'}),{...options,timeoutMs:12_000}).timeoutMs,12_000);
});

test("planes no disponibles no llegan a un proveedor", () => {
  const unavailablePlan = resolveAIExecutionPlan({ workflow: "activity", task: "option_ranking" });
  assert.equal(createAIProviderForPlan(unavailablePlan), null);
  assert.throws(
    () => createAIProviderForPlan({ execution: "generation", provider: "openai", model: null }),
    (error) => error instanceof AIProviderFactoryError && error.reason === "execution_plan_model_required",
  );
});

test("la transcripción usa su cliente especializado y no el provider de Responses", () => {
  assert.equal(createAIProviderForPlan(resolveAIExecutionPlan({ workflow: "audio_transcription" })), null);
});
