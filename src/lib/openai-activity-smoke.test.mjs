import test from "node:test";
import assert from "node:assert/strict";
import { OPENAI_ACTIVITY_SMOKE_INPUT, runOpenAIActivitySmoke } from "./openai-activity-smoke.mjs";

const generatedOutput = {
  title: "Sombras en movimiento",
  purpose: "Explorar el cambio de las sombras.",
  meaningful_situation: "El grupo observa sus sombras.",
  teacher_preparation: "Prepara linternas y papel.",
  child_actions: "Observan, prueban y explican.",
  mediation: "Formula preguntas abiertas.",
  evidence_opportunities: "Explican un cambio observado.",
  closure_or_continuity: "Comparten hallazgos.",
  competency_status: "unconfirmed",
  competency_id: null,
};

const generatedResult = {
  output: generatedOutput,
  metadata: {
    response_id: "resp_smoke_mock",
    usage: { input_tokens: 101, cached_input_tokens: 12, output_tokens: 42, total_tokens: 143 },
  },
};

test("el harness no llama factory ni provider sin OPENAI_API_KEY", async () => {
  const logs = [];
  let factoryCalls = 0;
  const result = await runOpenAIActivitySmoke({
    environment: {},
    createProvider: () => { factoryCalls += 1; },
    log: (message) => logs.push(message),
  });
  assert.equal(result.status, "not_configured");
  assert.equal(logs[0], "OPENAI_API_KEY no configurada. Smoke test no ejecutado.");
  assert.equal(factoryCalls, 0);
});

test("el harness usa datos ficticios, muestra usage y nunca imprime secretos", async () => {
  const logs = [];
  let receivedPlan;
  let receivedInput;
  const result = await runOpenAIActivitySmoke({
    environment: { OPENAI_API_KEY: "secret-that-must-not-appear" },
    createProvider: (plan, options) => {
      receivedPlan = plan;
      assert.equal(options.apiKey, "secret-that-must-not-appear");
      return { id: "mock" };
    },
    generate: async (input, { provider }) => {
      receivedInput = input;
      assert.equal(provider.id, "mock");
      return generatedResult;
    },
    log: (message) => logs.push(message),
    now: (() => { const values = [100, 345]; return () => values.shift(); })(),
  });
  assert.equal(receivedPlan.model, "gpt-5.6-terra");
  assert.equal(receivedPlan.reasoning_effort, "low");
  assert.deepEqual(receivedInput, OPENAI_ACTIVITY_SMOKE_INPUT);
  assert.equal(result.elapsedMs, 245);
  assert.match(logs[0], /Input tokens: 101/);
  assert.match(logs[0], /Cached input tokens: 12/);
  assert.match(logs[0], /Output tokens: 42/);
  assert.match(logs[0], /Total tokens: 143/);
  assert.doesNotMatch(logs[0], /secret-that-must-not-appear|AIContextBundle|teacher_request/);
  assert.doesNotMatch(JSON.stringify(OPENAI_ACTIVITY_SMOKE_INPUT), /foto|path|nombre/i);
});
