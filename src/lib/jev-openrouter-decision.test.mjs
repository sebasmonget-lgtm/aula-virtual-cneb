import assert from "node:assert/strict";
import test from "node:test";
import { createJevOpenRouterDecision, jevFeatureEnabled } from "./jev-openrouter-decision.mjs";

const questions = {
  MAT_CANTIDAD: { type: "noul", instructions: "¿Hay actuación de cantidad?", criteria: { true: "Cuenta", false: "No cuenta" } },
  evidence_sufficient: { type: "noul", instructions: "¿Hay información suficiente?", criteria: { true: "Sí", false: "No" } },
};
const request = { workflow: "observation_competency", state: "Contó tres vasos.", questions,
  kbVersion: "4.1.0", candidateIds: ["MAT_CANTIDAD"] };
const body = { model: "typesafe/jev-1.13-20260917", answers: {
  MAT_CANTIDAD: { type: "noul", noul: 0.93 }, evidence_sufficient: { type: "noul", noul: 0.96 } },
usage: { input_tokens: 300, output_tokens: 25, cost: 0.0000126 } };

test("banderas Jev requieren activación global y por flujo", () => {
  assert.equal(jevFeatureEnabled("competencies", { AYNI_JEV_ENABLED: "0", AYNI_JEV_COMPETENCIES: "1" }), false);
  assert.equal(jevFeatureEnabled("competencies", { AYNI_JEV_ENABLED: "1", AYNI_JEV_COMPETENCIES: "1" }), false);
  assert.equal(jevFeatureEnabled("competencies", { OPENROUTER_API_KEY: "test", AYNI_JEV_ENABLED: "1",
    AYNI_JEV_COMPETENCIES: "1" }), true);
  assert.equal(jevFeatureEnabled("project_image", {}), false);
  assert.equal(jevFeatureEnabled("workshop_sheet", {}), false);
});

test("Jev usa Decisions API, registra solo metadatos seguros y valida la versión efectiva", async () => {
  let sent, log;
  const client = createJevOpenRouterDecision({ apiKey: "test-only-key", telemetry: (entry) => { log = entry; },
    fetchImpl: async (url, init) => { sent = { url, init }; return { ok: true, json: async () => body }; } });
  const result = await client.decide(request);
  assert.equal(sent.url, "https://openrouter.ai/api/alpha/decisions");
  assert.equal(JSON.parse(sent.init.body).model, "typesafe/jev-1.13");
  assert.deepEqual(Object.keys(JSON.parse(sent.init.body).questions), Object.keys(questions));
  assert.equal(result.metadata.model_effective, body.model);
  assert.equal(result.metadata.usage.cost_usd, body.usage.cost);
  assert.deepEqual(log.candidateIds, ["MAT_CANTIDAD"]);
  assert.equal(JSON.stringify(log).includes(request.state), false);
  assert.equal(JSON.stringify(log).includes("test-only-key"), false);
});

test("respuesta inválida, modelo cambiado y timeout fallan cerrados", async () => {
  for (const bad of [
    { ...body, answers: { MAT_CANTIDAD: { type: "noul", noul: 1.2 }, evidence_sufficient: body.answers.evidence_sufficient } },
    { ...body, model: "typesafe/jev-latest" },
    { ...body, answers: { MAT_CANTIDAD: body.answers.MAT_CANTIDAD } },
  ]) {
    const client = createJevOpenRouterDecision({ apiKey: "test", telemetry: () => {},
      fetchImpl: async () => ({ ok: true, json: async () => bad }) });
    await assert.rejects(client.decide(request), { code: "invalid_response" });
  }
  const timeout = createJevOpenRouterDecision({ apiKey: "test", telemetry: () => {},
    fetchImpl: async () => { throw new DOMException("timeout", "TimeoutError"); } });
  await assert.rejects(timeout.decide(request), { code: "timeout" });
  const noCredits = createJevOpenRouterDecision({ apiKey: "test", telemetry: () => {},
    fetchImpl: async () => ({ ok: false, status: 402 }) });
  await assert.rejects(noCredits.decide(request), { code: "insufficient_credits" });
});

test("choice solo puede devolver un ID presente entre las opciones", async () => {
  const choice = { image: { type: "choice", instructions: "Elige", criteria: { A: "Agua", SIN_COINCIDENCIA: "Nada" } } };
  const valid = createJevOpenRouterDecision({ apiKey: "test", telemetry: () => {},
    fetchImpl: async () => ({ ok: true, json: async () => ({ ...body, answers: {
      image: { type: "choice", choice: "SIN_COINCIDENCIA", confidence: 0.8,
        probabilities: { A: 0.2, SIN_COINCIDENCIA: 0.8 } } } }) }) });
  assert.equal((await valid.decide({ ...request, questions: choice, candidateIds: ["A"] }))
    .answers.image.choice, "SIN_COINCIDENCIA");
  const client = createJevOpenRouterDecision({ apiKey: "test", telemetry: () => {},
    fetchImpl: async () => ({ ok: true, json: async () => ({ ...body, answers: {
      image: { type: "choice", choice: "OTRA", confidence: 0.99,
        probabilities: { A: 0.01, SIN_COINCIDENCIA: 0.99 } } } }) }) });
  await assert.rejects(client.decide({ ...request, questions: choice, candidateIds: ["A"] }), { code: "invalid_response" });
});
