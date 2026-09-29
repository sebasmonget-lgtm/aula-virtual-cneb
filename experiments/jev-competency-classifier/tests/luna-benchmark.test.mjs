import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { loadExperimentConfig, loadJsonConfig } from "../src/config.mjs";
import { createLunaClient, lunaCost, lunaRequest, jevObservationFromLuna } from "../src/luna-client.mjs";
import { normalizeBenchmarkCase, inferenceInput, loadLunaBenchmarkDataset } from "../src/luna-benchmark-dataset.mjs";
import { assertNoBenchmarkLabels, GOLD_FIELDS } from "../src/luna-inference-boundary.mjs";
import { createBenchmarkAdapters } from "../src/luna-benchmark-adapters.mjs";
import { runLunaBenchmark, plannedCalls } from "../src/luna-benchmark-runner.mjs";
import { scoreOutcome, compareCase, summarizeBenchmark } from "../src/luna-benchmark-score.mjs";
import { prepareBenchmark, executeBenchmark } from "../src/luna-benchmark-job.mjs";
import { createJevCompetencyClassifier } from "../src/jev-classifier.mjs";
import { createJevCompetencySuggester } from "../../../src/lib/jev-competency-suggestion.mjs";
import { createJevOpenRouterDecision } from "../../../src/lib/jev-openrouter-decision.mjs";
import { applicableCompetencyCards } from "../../../src/lib/competency-applicability.mjs";
import { buildClassifierOptions } from "../../../src/lib/openai-competency-classifier.mjs";
import { loadKnowledgeBaseV4 } from "../../../src/lib/knowledge-base-v4.mjs";

const kb = await loadKnowledgeBaseV4();
const { classifier: config, openrouterPricing: pricing } = await loadExperimentConfig();
const knowledgeBase = { version: kb.version, cards: kb.competencyCards, fingerprint: "test-kb" };
const lunaPricing = await loadJsonConfig("pricing-luna.json");
const dependencies = { knowledgeBase, config };
const record = { id: "T1", age: 5, type: "spontaneous", context: "Contó materiales",
  observation: "Contó tres vasos y dijo que faltaba uno.", expected: { primary: "MAT_CANTIDAD", acceptable_secondary: [], should_abstain: false, should_privacy_block: false } };
const item = normalizeBenchmarkCase(record, 0, dependencies);
const cleanValue = { clean_observation: "Contó tres vasos y dijo que faltaba uno.",
  brief_interpretation: "Relacionó la cantidad de vasos con los que necesitaba.", uncertainty: null };
test("aliases del gold docente se normalizan sin cambiar el texto ni inferir edad", () => {
  const aliases = { CANTIDAD: "MAT_CANTIDAD", ARTE: "COM_ARTE", CONVIVENCIA: "PS_CONVIVE",
    ESCRITURA: "COM_ESCRITURA", FORMA_LOCALIZACION: "MAT_FORMA", INDAGACION: "CYT_INDAGA", MOTRICIDAD: "PSICO_MOTRICIDAD" };
  for (const [label, id] of Object.entries(aliases)) {
    const normalized = normalizeBenchmarkCase({ ...record, expected: { primary: label } }, 0, dependencies);
    assert.equal(normalized.expected.primary, id);
    assert.equal(normalized.raw_observation, record.observation);
  }
  assert.throws(() => normalizeBenchmarkCase({ ...record, age: undefined }, 0, dependencies), /exige edad/);
});
function mockJev(captured, chosen = "MAT_CANTIDAD") {
  return async (url, options) => {
    assert.equal(url, "https://openrouter.ai/api/alpha/decisions");
    const payload = JSON.parse(options.body); captured.push(payload);
    const answers = Object.fromEntries(Object.entries(payload.questions).map(([id, question]) => {
      if (question.type === "noul") return [id, { type: "noul", noul: id === chosen || id === "evidence_sufficient" ? 0.95 : 0.02 }];
      const keys = Object.keys(question.criteria);
      return [id, { type: "choice", choice: chosen, confidence: 0.95,
        probabilities: Object.fromEntries(keys.map((key) => [key, key === chosen ? 0.95 : 0.05 / (keys.length - 1)])) }];
    }));
    return Response.json({ model: "typesafe/jev-1.13-20260917", answers,
      usage: { input_tokens: 200, output_tokens: 10, cost: 0.0002, extra_provider_field: 77 } });
  };
}
function mockLuna(captured = []) {
  return createLunaClient({ apiKey: "mock", pricing: lunaPricing, fetchImpl: async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    captured.push(JSON.parse(options.body));
    return Response.json({ status: "completed", model: "gpt-6-luna-2026-09-24",
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(cleanValue) }] }],
      usage: { input_tokens: 100, input_tokens_details: { cached_tokens: 40 }, output_tokens: 50,
        output_tokens_details: { reasoning_tokens: 20 } } });
  } });
}

test("Luna recibe solo edad/tipo/contexto/texto; gold, nombres y metadata quedan fuera", () => {
  const enriched = { ...item, student_id: "STUDENT_SECRET", date: "DATE_SECRET", teacher: "TEACHER_SECRET",
    name: "NAME_SECRET", family_interviews: "FAMILY_SECRET", history: "HISTORY_SECRET",
    ...Object.fromEntries([...GOLD_FIELDS].map((key) => [key, { value: "GOLD_SECRET" }])) };
  const request = lunaRequest(inferenceInput(enriched));
  const serialized = JSON.stringify(request);
  for (const secret of ["STUDENT_SECRET", "DATE_SECRET", "TEACHER_SECRET", "NAME_SECRET", "FAMILY_SECRET", "HISTORY_SECRET", "GOLD_SECRET"])
    assert.ok(!serialized.includes(secret));
  assertNoBenchmarkLabels(request);
  assert.equal(request.model, "gpt-6-luna"); assert.equal(request.reasoning.effort, "low");
  assert.equal(request.store, false);
  assert.deepEqual(Object.keys(JSON.parse(request.input[1].content)).sort(), ["age", "context", "observation", "type"]);
});

test("guardia automática falla ante cada campo gold estructurado o serializado", () => {
  for (const key of GOLD_FIELDS) {
    assert.throws(() => assertNoBenchmarkLabels({ input: { [key]: "secret" } }), /Data leakage/);
    assert.throws(() => assertNoBenchmarkLabels({ state: JSON.stringify({ [key]: "secret" }) }), /Data leakage/);
  }
});

test("cuatro brazos: mismo caso, Luna única por repetición, RAW sin clean y Luna sin raw", async () => {
  const jev = [], luna = [];
  const adapters = await createBenchmarkAdapters({ config, pricing, apiKey: "mock", fetchImpl: mockJev(jev), loadKb: async () => kb });
  const result = await runLunaBenchmark({ cases: [item], runs: 3, adapters, lunaClient: mockLuna(luna) });
  assert.equal(result.results.length, 3); assert.equal(luna.length, 3); assert.equal(jev.length, 18);
  for (const run of result.results) {
    assert.deepEqual(Object.keys(run.cases[0].arms), ["CURRENT_RAW", "PARALLEL_RAW", "CURRENT_LUNA", "PARALLEL_LUNA"]);
    assert.equal(run.cases[0].raw_observation, record.observation);
    assert.equal(run.cases[0].arms.CURRENT_RAW.jev_call_count, 2);
    assert.equal(run.cases[0].arms.PARALLEL_RAW.jev_call_count, 1);
    assert.equal(run.cases[0].arms.CURRENT_RAW.score.success, true);
    assert.equal(run.cases[0].arms.PARALLEL_LUNA.calls[0].usage.extra_provider_field, 77);
  }
  for (let repetition = 0; repetition < 3; repetition++) {
    const payloads = jev.slice(repetition * 6, repetition * 6 + 6);
    const rawTexts = payloads.slice(0, 3).map((payload) => typeof payload.state === "string" ? payload.state : payload.state.observation);
    const transformedTexts = payloads.slice(3).map((payload) => typeof payload.state === "string" ? payload.state : payload.state.observation);
    assert.ok(rawTexts.every((text) => !text.includes("INTERPRETACIÓN DESCRIPTIVA")));
    assert.ok(transformedTexts.every((text) => text.includes("INTERPRETACIÓN DESCRIPTIVA")));
    for (const payload of payloads) { assertNoBenchmarkLabels(payload); assert.ok(!JSON.stringify(payload).includes('"expected"')); }
  }
});

test("CURRENT_RAW y PARALLEL_RAW emiten exactamente los payloads de los métodos originales", async () => {
  const rawInput = inferenceInput(item);
  const input = { age: rawInput.age, observation: rawInput.observation, applicability: rawInput.applicability };
  const adapterPayloads = [], originalPayloads = [];
  const adapters = await createBenchmarkAdapters({ config, pricing, apiKey: "mock", fetchImpl: mockJev(adapterPayloads), loadKb: async () => kb });
  const current = await adapters.current(input);
  const applicable = applicableCompetencyCards(kb.competencyCards, input.age, {});
  const options = buildClassifierOptions(kb.competencyCards, input.age, applicable.map((card) => card.id));
  const originalCurrent = await createJevCompetencySuggester({ loadKb: async () => kb,
    client: createJevOpenRouterDecision({ apiKey: "mock", fetchImpl: mockJev(originalPayloads), telemetry: () => {} }) }).classify({ age: input.age, observation: input.observation, options });
  const parallel = await adapters.parallel(input);
  const originalParallel = await createJevCompetencyClassifier({ knowledgeBase, config, method: "parallel-noul",
    criteriaProfile: "focused", gateway: "openrouter", apiKey: "mock", requestedModel: "typesafe/jev-1.13",
    useCache: false, fetchImpl: mockJev(originalPayloads) }).classifyObservation(input);
  assert.deepEqual(adapterPayloads, originalPayloads);
  assert.deepEqual(current.raw_result.candidate_ids, originalCurrent.candidate_ids);
  assert.deepEqual(parallel.raw_result.proposed_competency_ids, originalParallel.proposed_competency_ids);
});

test("changing gold changes scoring but never changes a provider payload", async () => {
  const first = [], second = [];
  for (const [expected, captured] of [[item.expected, first], [{ ...item.expected, primary: "COM_ORAL" }, second]]) {
    const adapters = await createBenchmarkAdapters({ config, pricing, apiKey: "mock", fetchImpl: mockJev(captured), loadKb: async () => kb });
    await runLunaBenchmark({ cases: [{ ...item, expected }], adapters, lunaClient: mockLuna() });
  }
  assert.deepEqual(first, second);
});

test("privacidad bloquea antes de ambos proveedores y cuenta el falso bloqueo de mamá", async () => {
  const blocked = normalizeBenchmarkCase({ ...record, observation: "Contó tres vasos para mamá." }, 0, dependencies);
  const result = await runLunaBenchmark({ cases: [blocked], adapters: {
    current() { assert.fail("No llamar Jev"); }, parallel() { assert.fail("No llamar Jev"); } },
  lunaClient: { clean() { assert.fail("No llamar Luna"); } } });
  for (const arm of Object.values(result.results[0].cases[0].arms)) {
    assert.equal(arm.status, "privacy_blocked"); assert.equal(arm.score.false_privacy_block, true);
    assert.equal(arm.total_cost_usd, 0);
  }
});

test("métricas separan abstención falsa, clasificación falsa, privacidad y secundarias", () => {
  const empty = { status: "unclassified", primary: null, additional: [] };
  assert.equal(scoreOutcome(item.expected, empty).false_abstention, true);
  assert.equal(scoreOutcome({ ...item.expected, primary: null, should_abstain: true }, { primary: "MAT_CANTIDAD", additional: [] }).overclassification, true);
  assert.equal(scoreOutcome({ ...item.expected, should_privacy_block: true }, { status: "privacy_blocked" }).privacy_true_positive, true);
  const expected = { ...item.expected, acceptable_primary: ["COM_ORAL"], acceptable_secondary: ["PS_CONVIVE"] };
  const correct = scoreOutcome(expected, { primary: "COM_ORAL", additional: ["PS_CONVIVE"] });
  assert.equal(correct.primary_correct, false); assert.equal(correct.acceptable_primary_correct, true);
  assert.equal(correct.exact_match, true); assert.equal(correct.additional_correct, 1);
  assert.equal(scoreOutcome(expected, { primary: "MAT_CANTIDAD", additional: ["COM_LECTURA"] }).additional_incorrect, 1);
  assert.equal(compareCase({ status: "review", score: { success: false } }, { status: "review", score: correct }), "IMPROVED");
});

test("Luna cost uses cached and reasoning usage correctly without double billing reasoning", async () => {
  const luna = await mockLuna().clean(inferenceInput(item));
  assert.equal(luna.usage.reasoning_tokens, 20); assert.equal(luna.usage.cached_input_tokens, 40);
  assert.ok(Math.abs(luna.cost_usd - 0.0000314) < 1e-12);
  assert.equal(lunaCost(null, lunaPricing), null);
  assert.ok(!jevObservationFromLuna(luna).includes("raw_observation"));
});

test("Luna preserves paid usage when structured output fails; no synthetic Jev billing", async () => {
  const client = createLunaClient({ apiKey: "mock", pricing: lunaPricing, fetchImpl: async () => Response.json({
    status: "completed", model: "gpt-6-luna", output: [{ content: [{ type: "output_text", text: "invalid" }] }],
    usage: { input_tokens: 100, output_tokens: 50 } }) });
  const simple = async () => ({ status: "review", primary: "MAT_CANTIDAD", additional: [], ranked: ["MAT_CANTIDAD"],
    calls: [{ usage: { input_tokens: 10, output_tokens: 1 }, cost_usd: 0.0001, status: "ok" }], latency_ms: 10 });
  const result = await runLunaBenchmark({ cases: [item], adapters: { current: simple, parallel: simple }, lunaClient: client });
  const row = result.results[0].cases[0];
  assert.equal(row.arms.CURRENT_LUNA.status, "classification_failed");
  assert.equal(row.arms.CURRENT_LUNA.jev_call_count, 0);
  assert.equal(row.luna.usage.input_tokens, 100);
  assert.equal(row.arms.CURRENT_LUNA.total_cost_usd, row.luna.cost_usd);
  assert.equal(result.unknown_cost_calls, 0);
  assert.ok(Math.abs(result.actual_cost_usd - (0.0002 + row.luna.cost_usd)) < 1e-12);
});

test("unselected arms have no invented deltas; explicit gold and multiple accepted primaries", async () => {
  assert.throws(() => normalizeBenchmarkCase({ id: "NONE", age: 5, type: "guided", observation: "Dijo algo." }, 0, dependencies), /gold explícito/);
  const ambiguous = normalizeBenchmarkCase({ ...record, expected: {
    acceptable_primary: ["COMUNICACION_ORAL", "LEE_TEXTOS"], acceptable_secondary: [], should_abstain: false,
    should_privacy_block: false } }, 0, dependencies);
  assert.deepEqual(ambiguous.expected.acceptable_primary, ["COM_ORAL", "COM_LECTURA"]);
  const results = [{ number: 1, cases: [{ id: item.id, expected: item.expected, arms: { CURRENT_RAW: {
    primary: "MAT_CANTIDAD", additional: [], status: "review", total_cost_usd: 0.01, total_latency_ms: 10,
    score: scoreOutcome(item.expected, { primary: "MAT_CANTIDAD", additional: [] }) } } }] }];
  const summary = summarizeBenchmark(results);
  assert.equal(summary.deltas.CURRENT.status, "not_compared");
  assert.equal(summary.arms.CURRENT_LUNA.cost_usd, null);
});

test("invalid Jev answers still retain real provider usage and failed secondary calls stay visible", async () => {
  const adapters = await createBenchmarkAdapters({ config, pricing, apiKey: "mock", loadKb: async () => kb,
    fetchImpl: async () => Response.json({ model: "typesafe/jev-1.13-20260917", answers: {},
      usage: { input_tokens: 99, output_tokens: 5, cost: 0.003 } }) });
  const result = await adapters.parallel({ age: item.age, observation: item.raw_observation, applicability: item.applicability });
  assert.equal(result.status, "classification_failed");
  assert.equal(result.calls[0].cost_usd, 0.003);
  assert.equal(result.calls[0].usage.input_tokens, 99);
  const partial = { primary: "MAT_CANTIDAD", additional: [], status: "review", calls: [{ status: "http_500" }] };
  partial.score = scoreOutcome(item.expected, partial);
  assert.ok(partial.score.reasons.includes("provider_partial_failure"));
  assert.equal(compareCase(partial, { ...partial, calls: [] }), "UNDETERMINED");
});

test("a failed paid Jev response retains usage and stops on credits before Luna", async () => {
  let requests = 0, lunaCalls = 0;
  const adapters = await createBenchmarkAdapters({ config, pricing, apiKey: "mock", loadKb: async () => kb,
    fetchImpl: async () => { requests++; return Response.json({ error: "credits" }, { status: 402 }); } });
  let snapshot;
  await assert.rejects(runLunaBenchmark({ cases: [item, { ...item, id: "T2" }], adapters,
    lunaClient: { clean() { lunaCalls++; assert.fail(); } }, onCase: (state) => { snapshot = state.results; } }), /Proveedor detenido/);
  assert.equal(requests, 2); assert.equal(lunaCalls, 0);
  assert.equal(snapshot[0].cases[0].arms.CURRENT_RAW.jev_call_count, 2);
  assert.equal(snapshot[0].cases[0].arms.CURRENT_RAW.cost_jev_usd, null);
});

test("JSONL aliases, alternatives and repetitions produce separate non-overwritten files", async () => {
  const prepared = await prepareBenchmark({ dataset: path.join(EXPERIMENT_ROOT, "datasets/luna-benchmark/example.template.jsonl"),
    runs: 1, limit: 1 });
  const adapters = await createBenchmarkAdapters({ config, pricing, apiKey: "mock", fetchImpl: mockJev([]), loadKb: async () => kb });
  const first = await executeBenchmark(prepared, { maxLiveRequests: 7, adapters, lunaClient: mockLuna() });
  const second = await executeBenchmark(prepared, { maxLiveRequests: 7, adapters, lunaClient: mockLuna() });
  assert.notEqual(first.directory, second.directory);
  for (const filename of ["raw-results.json", "summary.json", "comparison.md", "errors.md", "runs/run-1.json"])
    assert.ok((await readFile(path.join(first.directory, filename), "utf8")).length);
  const loaded = await loadLunaBenchmarkDataset(path.join(EXPERIMENT_ROOT, "datasets/luna-benchmark/example.template.jsonl"), dependencies);
  assert.equal(loaded.cases.length, 3);
  assert.equal(plannedCalls({ cases: 3, runs: 3 }).jev_calls_max, 54);
  assert.equal(plannedCalls({ cases: 3, runs: 3 }).luna_calls_max, 9);
});
