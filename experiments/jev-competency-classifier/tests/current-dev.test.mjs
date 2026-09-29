import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { prepareCurrentDev, executeCurrentDev } from "../src/current-dev-job.mjs";
import { devInferenceInput, loadCurrentDevDataset } from "../src/current-dev-dataset.mjs";
import { createCurrentV2, v2Requests, groundEvidence } from "../src/current-v2.mjs";
import { createLunaCleanClient, lunaCleanRequest } from "../src/luna-clean-client.mjs";
import { lunaRequest } from "../src/luna-client.mjs";
import { createBenchmarkAdapters } from "../src/luna-benchmark-adapters.mjs";
import { assertNoBenchmarkLabels } from "../src/luna-inference-boundary.mjs";

const proposal = path.join(EXPERIMENT_ROOT, "datasets/current-dev/dev_proposal_v1.jsonl");
const preview = await prepareCurrentDev({ dataset: proposal });
const input = { age: null, type: "spontaneous", context: null, observation: "Contó tres vasos y dijo que faltaba uno.",
  applicability: { castellano_as_second_language: false, religion_applicable: false } };
function mockJev(captured, { confidence = .95, sufficiency = .95, secondary = [] } = {}) {
  return async (_url, options) => {
    const payload = JSON.parse(options.body); captured.push(payload); assertNoBenchmarkLabels(payload);
    const answers = Object.fromEntries(Object.entries(payload.questions).map(([id, question]) => {
      if (question.type === "noul") return [id, { type: "noul", noul: id === "evidence_sufficient" ? sufficiency : secondary.includes(id) ? .8 : .02 }];
      const chosen = id === "evidence_fragment" ? "E1" : "MAT_CANTIDAD", keys = Object.keys(question.criteria);
      const score = id === "evidence_fragment" ? .95 : confidence;
      return [id, { type: "choice", choice: chosen, confidence: score,
        probabilities: Object.fromEntries(keys.map((key) => [key, key === chosen ? score : (1 - score) / (keys.length - 1)])) }];
    }));
    return Response.json({ model: "typesafe/jev-1.13-20260917", answers,
      usage: { input_tokens: 200, output_tokens: 10, cost: .0002, provider_extra: 77 } });
  };
}
function cleanClient(captured = [], extra = false) {
  return createLunaCleanClient({ apiKey: "mock", pricing: preview.lunaPricing, fetchImpl: async (_url, options) => {
    captured.push(JSON.parse(options.body));
    return Response.json({ status: "completed", model: "gpt-6-luna-2026-09-24",
      output: [{ content: [{ type: "output_text", text: JSON.stringify({ clean_observation: input.observation, ...(extra ? { brief_interpretation: "forbidden" } : {}) }) }] }],
      usage: { input_tokens: 100, output_tokens: 50, input_tokens_details: { cached_tokens: 40 }, output_tokens_details: { reasoning_tokens: 20 } } });
  } });
}
async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), "current-dev-test-"));
  const records = [{ id: "SYNTHETIC_1", ...input, coverage_tags: ["cantidad"], expected: {
    primary: "MAT_CANTIDAD", acceptable_primary: [], acceptable_secondary: [], should_abstain: false, should_privacy_block: false },
    adjudication: { status: "adjudicated", reviewed_by: "TEST_ONLY", reviewed_at: "2026-09-28T12:00:00Z" } },
  { id: "SYNTHETIC_2", ...input, observation: "Dijo su teléfono 987654321.", coverage_tags: ["privacidad_real_ficticia"],
    expected: { primary: null, acceptable_primary: [], acceptable_secondary: [], should_abstain: false, should_privacy_block: true },
    adjudication: { status: "adjudicated", reviewed_by: "TEST_ONLY", reviewed_at: "2026-09-28T12:00:00Z" } }];
  const jsonl = records.map((record) => JSON.stringify(record)).join("\n") + "\n";
  const dataset = path.join(directory, "synthetic.jsonl"), adjudicationFile = path.join(directory, "manifest.json");
  await writeFile(dataset, jsonl);
  await writeFile(adjudicationFile, JSON.stringify({ status: "adjudicated", gold_source: "human", reviewed_by: "TEST_ONLY",
    reviewed_at: "2026-09-28T12:00:00Z", dataset_sha256: createHash("sha256").update(jsonl).digest("hex"), case_count: 2 }));
  return { directory, dataset, adjudicationFile, prepared: await prepareCurrentDev({ dataset, adjudicationFile }) };
}
async function adapters(captured = []) {
  const v1 = (await createBenchmarkAdapters({ config: preview.config, pricing: preview.pricing, apiKey: "mock",
    fetchImpl: mockJev(captured), loadKb: async () => preview.kb })).current;
  const v2 = createCurrentV2({ kb: preview.kb, prompt: preview.prompt, pricing: preview.pricing, apiKey: "mock", fetchImpl: mockJev(captured) });
  return { v1, v2, clean: cleanClient(), interpret: { clean: async () => ({ clean_observation: input.observation,
    brief_interpretation: "INTERPRETATION_SENTINEL", uncertainty: null, cost_usd: .00004, latency_ms: 10,
    usage: { input_tokens: 100, output_tokens: 50, cached_input_tokens: 0, cache_write_tokens: 0, reasoning_tokens: 20 } }) } };
}
test("80 propuestas sin gold, edad null, presupuesto solo estimado y barrera humana antes de llamadas", async () => {
  const records = (await readFile(proposal, "utf8")).trim().split("\n").map(JSON.parse);
  assert.equal(records.length, 80);
  assert.ok(records.every((record) => record.age === null && !Object.hasOwn(record, "expected") && record.adjudication.status === "pending"));
  assert.equal(preview.preflight.executable, false); assert.equal(preview.preflight.total_calls_max, 2400);
  assert.equal(preview.preflight.privacy_blocked_cases, 4); assert.ok(Math.abs(preview.preflight.estimated_cost_usd - .5016) < 1e-10);
  await assert.rejects(executeCurrentDev(preview, { maxLiveRequests: 2400, adapters: new Proxy({}, { get() { throw new Error("ADAPTER_TOUCHED"); } }) }), /Adjudicación humana pendiente/);
  await assert.rejects(loadCurrentDevDataset("Z:/absent/ayni_jev_gold_v1.jsonl"), /Test final congelado/);
});
test("manifiesto ligado a bytes exactos, mapping inválido y adjudicación parcial se rechazan", async () => {
  const f = await fixture(); assert.equal(f.prepared.loaded.adjudicated, true);
  await writeFile(f.dataset, (await readFile(f.dataset, "utf8")) + "\n");
  const changed = await prepareCurrentDev({ dataset: f.dataset, adjudicationFile: f.adjudicationFile });
  assert.equal(changed.loaded.adjudicated, false);
  await assert.rejects(executeCurrentDev(changed, { maxLiveRequests: 60 }), /pendiente/);
  const invalid = await fixture();
  const records = (await readFile(invalid.dataset, "utf8")).trim().split("\n").map(JSON.parse);
  records[0].expected.primary = "NOT_A_CNEB_ID";
  let text = records.map(JSON.stringify).join("\n") + "\n";
  const manifest = JSON.parse(await readFile(invalid.adjudicationFile, "utf8"));
  manifest.dataset_sha256 = createHash("sha256").update(text).digest("hex");
  await writeFile(invalid.dataset, text); await writeFile(invalid.adjudicationFile, JSON.stringify(manifest));
  await assert.rejects(prepareCurrentDev({ dataset: invalid.dataset, adjudicationFile: invalid.adjudicationFile }), /competencia|primary|CNEB|NOT_A_CNEB_ID/u);
  records[0].expected.primary = "MAT_CANTIDAD"; records[0].adjudication.status = "pending";
  text = records.map(JSON.stringify).join("\n") + "\n"; manifest.dataset_sha256 = createHash("sha256").update(text).digest("hex");
  await writeFile(invalid.dataset, text); await writeFile(invalid.adjudicationFile, JSON.stringify(manifest));
  await assert.rejects(prepareCurrentDev({ dataset: invalid.dataset, adjudicationFile: invalid.adjudicationFile }), /adjudicación humana/u);
});
test("V2 dos llamadas, thresholds originales, evidencia tipada y secundarias independientes", async () => {
  const captured = [], classify = createCurrentV2({ kb: preview.kb, prompt: preview.prompt, pricing: preview.pricing,
    apiKey: "mock", fetchImpl: mockJev(captured, { secondary: ["COM_ORAL", "COM_ARTE", "MAT_FORMA", "PS_CONVIVE"] }) });
  const result = await classify(input);
  assert.equal(captured.length, 2); assert.equal(result.primary, "MAT_CANTIDAD"); assert.equal(result.additional.length, 3);
  assert.equal(result.explanation.evidence, input.observation); assert.equal(result.explanation.status, "suggested");
  assert.ok(captured[1].questions.COM_ORAL.instructions.includes("OTRA conducta independiente"));
  for (const limits of [{ confidence: .499 }, { sufficiency: .699 }]) {
    const out = await createCurrentV2({ kb: preview.kb, prompt: preview.prompt, pricing: preview.pricing,
      apiKey: "mock", fetchImpl: mockJev([], limits) })(input); assert.equal(out.primary, null);
  }
  const boundary = await createCurrentV2({ kb: preview.kb, prompt: preview.prompt, pricing: preview.pricing,
    apiKey: "mock", fetchImpl: mockJev([], { confidence: .5, sufficiency: .7 }) })(input);
  assert.equal(boundary.primary, "MAT_CANTIDAD");
});
test("Codex se declara como gold DEV provisional solo con autorización expresa", async () => {
  const f = await fixture(), manifest = JSON.parse(await readFile(f.adjudicationFile, "utf8"));
  Object.assign(manifest, { gold_source: "codex_rubric", reviewed_by: "Codex" });
  await writeFile(f.adjudicationFile, JSON.stringify(manifest));
  const pending = await prepareCurrentDev({ dataset: f.dataset, adjudicationFile: f.adjudicationFile });
  assert.equal(pending.loaded.adjudicated, false);
  Object.assign(manifest, { authorization: "explicit_user_request", authorization_reference: "test-only-authorization" });
  await writeFile(f.adjudicationFile, JSON.stringify(manifest));
  const allowed = await prepareCurrentDev({ dataset: f.dataset, adjudicationFile: f.adjudicationFile });
  assert.equal(allowed.loaded.review_status, "codex_rubric_adjudicated_dev");
});
test("gold y metadatos nunca llegan al proveedor; INTERPRET no suministra frases de evidencia", () => {
  const item = { ...preview.loaded.cases[0], expected: { primary: "GOLD_SENTINEL" }, coverage_tags: ["TAG_SENTINEL"], reviewer: "PERSON_SENTINEL" };
  const safe = devInferenceInput(item), plan = v2Requests({ input: { ...safe, observation: input.observation + "\nINTERPRETATION_SENTINEL", observable_text: input.observation }, kb: preview.kb, prompt: preview.prompt });
  const serialized = JSON.stringify(plan); for (const sentinel of ["GOLD_SENTINEL", "TAG_SENTINEL", "PERSON_SENTINEL"]) assert.ok(!serialized.includes(sentinel));
  assert.ok(!JSON.stringify(plan.primary.questions.evidence_fragment).includes("INTERPRETATION_SENTINEL"));
  assert.throws(() => v2Requests({ input: { ...input, expected: {} }, kb: preview.kb, prompt: preview.prompt }), /leakage/);
});
test("CLEAN exacto, edad omitida y usage real; JSON inválido conserva cargo conocido", async () => {
  const request = lunaCleanRequest(input), original = lunaRequest(input);
  assert.deepEqual(Object.keys(request.text.format.schema.properties), ["clean_observation"]);
  assert.deepEqual(request.reasoning, original.reasoning); assert.equal(request.model, original.model);
  assert.ok(!Object.hasOwn(JSON.parse(request.input[1].content), "age"));
  const result = await cleanClient().clean(input); assert.equal(result.usage.cached_input_tokens, 40); assert.ok(result.cost_usd > 0);
  await assert.rejects(cleanClient([], true).clean(input), (error) => error.billing?.usage.input_tokens === 100 && error.billing.cost_usd > 0);
});
test("evidencia cita el original, conserva incertidumbre y no inventa texto ausente", () => {
  const source = "Eh, creo que conto, contó tres vasos y dijo que faltaba uno.";
  const grounded = groundEvidence("Contó tres vasos y dijo que faltaba uno.", source);
  assert.equal(grounded.grounded, true); assert.ok(source.includes(grounded.evidence)); assert.ok(grounded.evidence.includes("creo"));
  assert.equal(groundEvidence("Demostró dominio del conteo y autonomía.", source).grounded, false);
});
test("flujo completo mock 3 repeticiones, privacy común, costos físicos sin duplicación y outputs aislados", async () => {
  const f = await fixture(), captured = [];
  const first = await executeCurrentDev(f.prepared, { maxLiveRequests: 60, adapters: await adapters(captured) });
  assert.equal(first.summary.status, "completed"); assert.equal(captured.length, 24);
  assert.equal(first.summary.physical.calls, 30); assert.equal(first.summary.full_dataset_completed, true);
  assert.equal(first.summary.arms.CURRENT_V2_LUNA_CLEAN.luna_tokens.input_tokens.measured, 300);
  assert.equal(first.summary.arms.CURRENT_V1_RAW.privacy_true_positives, 3);
  assert.ok(Math.abs(first.summary.arms.CURRENT_V2_RAW.jev_provider_reported_usd - .0012) < 1e-10);
  assert.ok(Math.abs(first.summary.physical.total_cost_usd - Object.values(first.summary.arms).reduce((n, arm) => n + arm.cost_usd, 0)) < 1e-10);
  const raw = JSON.parse(await readFile(path.join(first.directory, "raw-results.json"), "utf8"));
  for (const run of raw.results) assert.equal(run.cases[0].arms.CURRENT_V2_LUNA_INTERPRET.evidence_grounded, true);
  const second = await executeCurrentDev({ ...f.prepared, cases: f.prepared.cases.slice(0, 1) }, { maxLiveRequests: 60, adapters: await adapters() });
  assert.notEqual(first.directory, second.directory); assert.equal(second.summary.full_dataset_completed, false);
  assert.ok(Object.values(second.summary.candidate_review).every((candidate) => !candidate.eligible_for_human_candidate_review));
});
test("fallo Luna: costo desconocido nunca cero; HTTP402 detiene más llamadas", async () => {
  const f = await fixture(), injected = await adapters();
  injected.clean = { clean: async () => { throw new Error("Luna Clean respondió HTTP 402."); } };
  let interpreted = 0; injected.interpret = { clean: async () => { interpreted++; throw new Error("must not run"); } };
  const out = await executeCurrentDev(f.prepared, { maxLiveRequests: 60, adapters: injected });
  assert.equal(out.summary.status, "stopped"); assert.equal(interpreted, 0);
  assert.equal(out.summary.physical.total_cost_usd, null); assert.equal(out.summary.physical.unknown_cost_calls, 1);
  assert.equal(out.summary.arms.CURRENT_V2_LUNA_CLEAN.luna_cost_usd, null);
  assert.ok(Object.values(out.summary.candidate_review).every((candidate) => !candidate.eligible_for_human_candidate_review));
});
