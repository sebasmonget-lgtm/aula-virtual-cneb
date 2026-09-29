import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { loadKnowledgeBaseV4 } from "../../../src/lib/knowledge-base-v4.mjs";
import { v2Requests, createCurrentV2 } from "../src/current-v2.mjs";
import { limitedFetch, claimLastTest, LAST_ARMS, prepareLastTest } from "../src/last-optimization.mjs";
import { devInferenceInput } from "../src/current-dev-dataset.mjs";
import { assertNoBenchmarkLabels } from "../src/luna-inference-boundary.mjs";
const readJson = async (file) => JSON.parse(await readFile(path.join(EXPERIMENT_ROOT, file), "utf8"));

test("optional V2.4 secondary instruction preserves every prior V2.3 request byte", async () => {
  const snapshot = await readJson("config/current-study-versions/V2.3.json"), kb = await loadKnowledgeBaseV4();
  const frozenModule = snapshot.source.replace(/from "([^"]+)"/gu, (_all, relative) => `from "${pathToFileURL(path.resolve(EXPERIMENT_ROOT, "src", relative)).href}"`);
  const historical = await import("data:text/javascript;base64," + Buffer.from(frozenModule).toString("base64"));
  for (const observation of ["Ordenó unas figuras y contó una historia.", "[persona] sostuvo la tela y movió el cordón."]) {
    const input = { age: null, observation, observable_text: observation, applicability: { castellano_as_second_language: false, religion_applicable: false } };
    assert.equal(JSON.stringify(v2Requests({ kb, input, prompt: snapshot.prompt })), JSON.stringify(historical.v2Requests({ kb, input, prompt: snapshot.prompt })));
    const custom = v2Requests({ kb, input, prompt: { ...snapshot.prompt, additional_instruction: "INDEPENDENT_ACTION_REQUIRED" } });
    assert.deepEqual(custom.primary, historical.v2Requests({ kb, input, prompt: snapshot.prompt }).primary);
    assert.match(custom.additional.questions.COM_ORAL.instructions, /INDEPENDENT_ACTION_REQUIRED/u);
  }
});

test("provider budget and label guard act before external request", async () => {
  let external = 0;
  const budget = limitedFetch({ maxCalls: 2, fetchImpl: async () => { external++; return new Response("{}"); } });
  await assert.rejects(budget.fetch("fake", { body: JSON.stringify({ expected: { primary: "X" } }) }), /Data leakage/u);
  await assert.rejects(budget.fetch("fake", { body: JSON.stringify({ state: "TEST2_001" }) }), /ID TEST2/u);
  assert.equal(external, 0); assert.equal(budget.count, 0);
  await budget.fetch("fake", { body: "{}" }); await budget.fetch("fake", { body: "{}" });
  await assert.rejects(budget.fetch("fake", { body: "{}" }), /Presupuesto/u);
  assert.equal(external, 2); assert.equal(budget.count, 2);
});

test("TEST2 atomic claim cannot be reused even without provider success", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "jev-last-gate-"));
  const freeze = { version: "CURRENT_V2_4", optimization_closed: true, runs: 1, max_provider_calls: 360, arms: LAST_ARMS };
  const lock = path.join(dir, "once.json");
  await claimLastTest(lock, freeze);
  await assert.rejects(claimLastTest(lock, freeze), /ya reclamado/u);
});

test("primary confidence .50 and sufficiency .70 remain separate inclusive gates", async () => {
  const kb = await loadKnowledgeBaseV4(), prompt = await readJson("config/current-v2-4-prompt.json");
  for (const [confidence, sufficient, expected] of [[.49, .99, null], [.50, .70, "MAT_CANTIDAD"], [.99, .69, null]]) {
    const classifier = createCurrentV2({ kb, prompt, pricing: {}, apiKey: "test", fetchImpl: async (_url, request) => {
      const body = JSON.parse(request.body), answers = Object.fromEntries(Object.entries(body.questions).map(([id, q]) => {
        if (q.type === "noul") return [id, { type: "noul", noul: id === "evidence_sufficient" ? sufficient : .01 }];
        const choice = id === "competency" ? "MAT_CANTIDAD" : "E1";
        return [id, { type: "choice", choice, confidence, probabilities: Object.fromEntries(Object.keys(q.criteria).map((k) => [k, k === choice ? 1 : 0])) }];
      }));
      return Response.json({ model: "typesafe/jev-1.13", answers, usage: { input_tokens: 1, output_tokens: 1, cost: .000001 } });
    } });
    const result = await classifier({ age: null, observation: "Contó las fichas.", applicability: {} });
    assert.equal(result.primary, expected);
  }
});

test("frozen TEST2 schema, label-free inference and literal configured hashes validate offline", async () => {
  const prepared = await prepareLastTest();
  assert.equal(prepared.dataset.cases.length, 40);
  assert.equal(prepared.freeze.thresholds.primary_confidence, .5);
  for (const item of prepared.dataset.cases) {
    const input = devInferenceInput(item);
    assert.equal(input.age, null); assertNoBenchmarkLabels(input);
    assert.equal(input.privacy_blocked, item.expected.should_privacy_block);
    if (input.privacy_blocked) continue;
    for (const prompt of [prepared.oldPrompt, prepared.prompt]) {
      const plan = v2Requests({ input, kb: prepared.kb, prompt });
      assertNoBenchmarkLabels(plan.primary); assertNoBenchmarkLabels(plan.additional);
      assert.doesNotMatch(JSON.stringify(plan), /TEST2_\d{3}/u);
    }
  }
});
