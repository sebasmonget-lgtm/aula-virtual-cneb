import test from "node:test";
import assert from "node:assert/strict";
import { decideClassification, summarizeChoice } from "../src/decision-policy.mjs";
import { createTypeSafeClient, selectJevModel } from "../src/typesafe-client.mjs";

test("la política usa confidence, margen y abstención", () => {
  const optionIds = new Set(["MAT_CANTIDAD", "COM_ORAL", "NO_CLASIFICABLE"]);
  const choice = summarizeChoice({ choice: "MAT_CANTIDAD", confidence: 0.9, probabilities: { MAT_CANTIDAD: 0.9, COM_ORAL: 0.07, NO_CLASIFICABLE: 0.03 }, optionIds });
  assert.equal(decideClassification(choice, { auto_accept_threshold: 0.82, review_threshold: 0.5, minimum_margin: 0.15, maximum_unclassifiable_probability_for_auto_accept: 0.2 }).status, "classified");
  assert.equal(decideClassification({ ...choice, confidence: 0.6 }, { auto_accept_threshold: 0.82, review_threshold: 0.5, minimum_margin: 0.15, maximum_unclassifiable_probability_for_auto_accept: 0.2 }).status, "review");
});

test("el cliente consulta modelos y no necesita red real en pruebas", async () => {
  const client = createTypeSafeClient({ apiKey: "test-key", fetchImpl: async () => new Response(JSON.stringify({ models: [{ name: "jev-latest", release_date: "2026-09-15", description: "test" }] }), { status: 200 }) });
  assert.equal((await client.listModels())[0].name, "jev-latest");
  assert.equal(selectJevModel([{ name: "otro" }, { name: "jev-preview" }]), "jev-preview");
});

test("el cliente etiqueta rate limit sin convertirlo en una clasificación", async () => {
  const client = createTypeSafeClient({ apiKey: "test-key", fetchImpl: async () => new Response("{}", { status: 429 }) });
  await assert.rejects(client.listModels(), (error) => error.code === "rate_limited");
});
