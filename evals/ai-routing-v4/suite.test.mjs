import test from "node:test";
import assert from "node:assert/strict";
import { modelEvalFixtures } from "./fixtures.mjs";
import { assertModelEvalOptIn, buildBlindReview, estimatedCost, evaluateAutomatedMetrics } from "./suite.mjs";
import { prepareAIRequestV4 } from "../../src/lib/prepare-ai-request-v4.mjs";

test("la suite no consume API sin opt-in y clave explícitos", () => {
  assert.throws(() => assertModelEvalOptIn({}), /model_eval_opt_in_required/);
  assert.throws(() => assertModelEvalOptIn({ AYNI_RUN_MODEL_EVALS: "1" }), /openai_api_key_required/);
  assert.doesNotThrow(() => assertModelEvalOptIn({ AYNI_RUN_MODEL_EVALS: "1", OPENAI_API_KEY: "configured-for-test" }));
});

test("hay fixtures separados para todos los workflows productivos", async () => {
  const fixtures = await modelEvalFixtures();
  assert.deepEqual(fixtures.map((item) => item.workflow), ["annual_plan", "project", "unit", "activity",
    "criterion_and_evidence", "assessment", "descriptive_conclusion", "family_report"]);
  assert.equal(new Set(fixtures.map((item) => item.id)).size, fixtures.length);
  assert.ok(fixtures.every((item) => item.input.workflow === item.workflow));
  for (const fixture of fixtures) await assert.doesNotReject(() => prepareAIRequestV4(fixture.input));
});

test("las métricas y la revisión ciega separan routing de evaluación humana", () => {
  const result = { output: { competency_id: "CYT_INDAGA", title: "Observamos cambios" }, validation: { status: "valid" },
    metadata: { model: "model-hidden-from-review", provider: "provider", reasoning_effort: "medium",
      routing_policy_version: "2", fallback_used: false, usage: { input_tokens: 100, cached_input_tokens: 0, output_tokens: 50 } } };
  const fixture = { id: "fixture", workflow: "activity", allowedCompetencyIds: ["CYT_INDAGA"], expectedGroundingTerms: ["cambios"] };
  const metrics = evaluateAutomatedMetrics(fixture, result, 123, { models: { "model-hidden-from-review": {
    input_per_million: 1, cached_input_per_million: 0, output_per_million: 2 } } });
  assert.equal(metrics.schema_valid, true); assert.equal(metrics.competency_ids_within_bundle, true);
  assert.equal(metrics.grounding_signal, true); assert.equal(metrics.estimated_cost_usd, 0.0002);
  const blind = buildBlindReview([{ fixture_id: "fixture", workflow: "activity", output: result.output, metrics }]);
  assert.equal(JSON.stringify(blind).includes("model-hidden-from-review"), false);
  assert.equal(blind[0].human_rating.pedagogical_quality_1_to_5, null);
  assert.equal(estimatedCost(null, "x", {}), null);
});
