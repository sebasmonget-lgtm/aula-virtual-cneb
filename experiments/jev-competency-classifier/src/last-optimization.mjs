import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { EXPERIMENT_ROOT } from "./constants.mjs";
import { loadKnowledgeBaseV4 } from "../../../src/lib/knowledge-base-v4.mjs";
import { loadExperimentConfig, loadJsonConfig } from "./config.mjs";
import { candidateSourceHashes } from "./current-final-test.mjs";
import { loadLunaBenchmarkDataset } from "./luna-benchmark-dataset.mjs";
import { devInferenceInput } from "./current-dev-dataset.mjs";
import { createBenchmarkAdapters } from "./luna-benchmark-adapters.mjs";
import { createCurrentV2, groundEvidence } from "./current-v2.mjs";
import { createLunaCleanClient } from "./luna-clean-client.mjs";
import { assertNoBenchmarkLabels } from "./luna-inference-boundary.mjs";
import { scoreOutcome } from "./luna-benchmark-score.mjs";
import { analyzeStudyArm, sumKnown } from "./current-study-analysis.mjs";

export const LAST_ARMS = ["CURRENT_V1_RAW", "CURRENT_V2_RAW", "CURRENT_V2_4_RAW", "CURRENT_V2_4_LUNA_CLEAN"];
export const LAST_EXTRA_SOURCES = ["src/last-optimization.mjs", "scripts/run-last-test2.mjs", "src/luna-benchmark-score.mjs",
  "src/current-study-analysis.mjs", "src/current-dev-dataset.mjs", "src/luna-inference-boundary.mjs", "src/luna-benchmark-dataset.mjs"];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export async function lastSourceHashes() {
  return { ...await candidateSourceHashes(), ...Object.fromEntries(await Promise.all(LAST_EXTRA_SOURCES.map(async (file) => [file,
    hash((await readFile(path.join(EXPERIMENT_ROOT, file), "utf8")).replaceAll("\r\n", "\n"))]))) };
}
export async function atomicSave(file, value) {
  await writeFile(file + ".tmp", JSON.stringify(value, null, 2) + "\n");
  await rename(file + ".tmp", file);
}
export async function claimLastTest(lockFile, freeze) {
  if (freeze?.version !== "CURRENT_V2_4" || freeze.optimization_closed !== true || freeze.runs !== 1 ||
    freeze.max_provider_calls !== 360 || JSON.stringify(freeze.arms) !== JSON.stringify(LAST_ARMS)) throw new Error("Freeze inválido; cero llamadas.");
  await mkdir(path.dirname(lockFile), { recursive: true });
  try { await writeFile(lockFile, JSON.stringify({ status: "claimed_before_providers", claimed_at: new Date().toISOString(), freeze }, null, 2), { flag: "wx" }); }
  catch (error) { if (error.code === "EEXIST") throw new Error("TEST2 ya reclamado; no se repite ni se retira el lock."); throw error; }
}
export function limitedFetch({ fetchImpl, maxCalls, onRequest = () => {} }) {
  let count = 0;
  return { get count() { return count; }, fetch: async (url, options) => {
    const payload = JSON.parse(options.body);
    assertNoBenchmarkLabels(payload);
    if (/TEST2_\d{3}/u.test(JSON.stringify(payload))) throw new Error("ID TEST2 filtrado al proveedor.");
    if (count >= maxCalls) throw new Error("Presupuesto de llamadas agotado; no se hace otro intento.");
    count++;
    onRequest({ endpoint: url, payload, number: count });
    return fetchImpl(url, options);
  } };
}
export async function prepareLastTest() {
  const freeze = await loadJsonConfig("last-optimization-freeze.json"), sources = await lastSourceHashes();
  for (const [file, sha] of Object.entries(freeze.source_sha256)) if (sources[file] !== sha) throw new Error(`Fuente modificada después de freeze: ${file}.`);
  for (const [file, sha] of Object.entries(freeze.production_dependency_sha256)) {
    if (hash((await readFile(path.join(EXPERIMENT_ROOT, "../..", file), "utf8")).replaceAll("\r\n", "\n")) !== sha) throw new Error("Dependencia de producto cambió.");
  }
  if (hash(await readFile(path.join(EXPERIMENT_ROOT, "config/current-v2-4-prompt.json"))) !== freeze.prompt_sha256) throw new Error("Prompt V2.4 cambió.");
  if (hash(await readFile(path.join(EXPERIMENT_ROOT, "config/last-threshold-dev.json"))) !== freeze.threshold_review_sha256) throw new Error("Threshold review cambió.");
  if (freeze.thresholds.primary_confidence !== .50 || freeze.thresholds.sufficiency !== .70 || freeze.thresholds.secondary !== .80) throw new Error("Threshold no coincide con runtime cerrado.");
  const kb = await loadKnowledgeBaseV4(), { classifier: config, openrouterPricing: pricing } = await loadExperimentConfig();
  const dataset = await loadLunaBenchmarkDataset(path.join(EXPERIMENT_ROOT, "datasets/last-optimization/test2.jsonl"), {
    knowledgeBase: { cards: kb.competencyCards, version: kb.version }, config });
  if (dataset.fingerprint !== freeze.test2_sha256 || dataset.cases.length !== 40) throw new Error("TEST2 cambió.");
  const [oldPrompt, prompt, lunaPricing, goldFreeze] = await Promise.all([
    loadJsonConfig("current-v2-prompt.json"), loadJsonConfig("current-v2-4-prompt.json"), loadJsonConfig("pricing-luna.json"),
    readFile(path.join(EXPERIMENT_ROOT, "datasets/last-optimization/freeze.json"), "utf8").then(JSON.parse)]);
  if (oldPrompt.version !== "current-v2.3" || prompt.version !== "current-v2.4" || goldFreeze.dataset_sha256 !== dataset.fingerprint ||
    Date.parse(goldFreeze.frozen_at) >= Date.parse(freeze.created_at)) throw new Error("Orden de freeze inválido.");
  return { freeze, kb, config, pricing, lunaPricing, dataset, oldPrompt, prompt, sources };
}
export async function executeLastTest(prepared, { fetchImpl = fetch, onProgress = () => {}, injected = null, lockFile = path.join(EXPERIMENT_ROOT, "results/last-test2.lock.json"),
  directory = path.join(EXPERIMENT_ROOT, "results/last-test2-" + new Date().toISOString().replace(/[:.]/gu, "-")) } = {}) {
  const { freeze, kb, config, pricing, lunaPricing, dataset, oldPrompt, prompt, sources } = prepared;
  if (!injected && (!process.env.OPENROUTER_API_KEY || !process.env.OPENAI_API_KEY)) throw new Error("Credenciales no disponibles; cero llamadas.");
  await claimLastTest(lockFile, freeze);
  await mkdir(directory, { recursive: false });
  let requestList = [], stop = null;
  const budget = limitedFetch({ fetchImpl, maxCalls: freeze.max_provider_calls, onRequest: (body) => requestList.push(body) });
  const adapters = injected ?? {
    v1: (await createBenchmarkAdapters({ config, pricing, model: freeze.models.jev, fetchImpl: budget.fetch })).current,
    v2: createCurrentV2({ kb, prompt: oldPrompt, pricing, model: freeze.models.jev, apiKey: process.env.OPENROUTER_API_KEY, fetchImpl: budget.fetch }),
    v24: createCurrentV2({ kb, prompt, pricing, model: freeze.models.jev, apiKey: process.env.OPENROUTER_API_KEY, fetchImpl: budget.fetch }),
    clean: createLunaCleanClient({ pricing: lunaPricing, fetchImpl: budget.fetch }),
  };
  const results = [{ number: 1, cases: [] }];
  const metadata = { created_at: new Date().toISOString(), execution_mode: injected ? "mock_test" : "live_provider", freeze,
    source_sha256: sources, dataset_sha256: dataset.fingerprint, kb_sha256: hash(JSON.stringify(kb.competencyCards)),
    kb_version: kb.version, pricing: { jev: pricing, luna: lunaPricing }, runs: 1, baseline_v2: "V2.3",
    arm_schedule: "Rotación determinista por fila de los cuatro brazos; solicitudes Jev principal/adicional concurrentes, observaciones secuenciales.",
    provider_retries: 0, old_test_provider_calls: 0 };
  for (const [i, item] of dataset.cases.entries()) {
    const input = devInferenceInput(item), row = { id: item.id, raw_observation: item.raw_observation, expected: item.expected,
      sanitized_observation: input.observation, privacy_reason: input.privacy_reason, arms: {} };
    results[0].cases.push(row);
    // Rotate arms to reduce systematic first/last latency bias without extra calls.
    const order = [...LAST_ARMS.slice(i % 4), ...LAST_ARMS.slice(0, i % 4)];
    for (const arm of order) {
      requestList = []; let luna = null, result, startedLuna = null;
      if (input.privacy_blocked) result = { status: "privacy_blocked", primary: null, additional: [], calls: [], latency_ms: 0,
        explanation: { status: "privacy", primary: null, secondary: [], evidence: "", reason: input.privacy_reason } };
      else {
        try {
          let observation = input.observation;
          if (arm.endsWith("_CLEAN")) { startedLuna = performance.now(); luna = await adapters.clean.clean({ age: input.age, type: input.type, context: input.context, observation }); observation = luna.clean_observation; }
          const classifier = arm === "CURRENT_V1_RAW" ? adapters.v1 : arm === "CURRENT_V2_RAW" ? adapters.v2 : adapters.v24;
          result = await classifier({ age: input.age, observation, observable_text: observation, applicability: input.applicability });
          result.selected_evidence_before_grounding = result.explanation?.evidence ?? null;
          if (result.explanation?.evidence) {
            const ground = groundEvidence(result.explanation.evidence, item.raw_observation);
            result.explanation.evidence = ground.evidence; result.evidence_grounded = ground.grounded;
          }
        } catch (error) {
          luna ??= error.billing ?? (startedLuna == null ? null : { cost_usd: null, usage: null, cost_source: "unknown", latency_ms: Math.round(performance.now() - startedLuna), status: "failed" });
          result = { status: "classification_failed", primary: null, additional: [], calls: [], latency_ms: null, error_code: error.message };
          if (/HTTP (401|402|403|429)|Presupuesto/u.test(error.message)) stop = error.message;
        }
      }
      result.calls ??= [];
      const jev = sumKnown(result.calls.map((c) => c.cost_usd)), lunaUsd = luna ? luna.cost_usd : 0;
      const outcome = { ...result, luna, provider_requests: requestList, cost_jev_usd: jev, cost_luna_usd: lunaUsd,
        total_cost_usd: jev == null || lunaUsd == null ? null : jev + lunaUsd,
        total_latency_ms: result.latency_ms == null || (luna && luna.latency_ms == null) ? null : result.latency_ms + (luna?.latency_ms ?? 0) };
      outcome.score = scoreOutcome(item.expected, outcome); row.arms[arm] = outcome;
      const fatal = result.calls.find((c) => /http_(401|402|403|429)/u.test(c.status)); if (fatal) stop = fatal.status;
      await atomicSave(path.join(directory, "raw-results.json"), { metadata, results, status: "running", physical_attempts: budget.count });
      await onProgress({ completed_arms: results[0].cases.reduce((n, r) => n + Object.keys(r.arms).length, 0), total_arms: 160, physical_calls: budget.count });
      if (stop) break;
    }
    if (stop) break;
  }
  const complete = results[0].cases.length === 40 && results[0].cases.every((r) => LAST_ARMS.every((a) => r.arms[a]));
  const status = complete && !stop ? "completed" : "stopped";
  const analyses = complete ? Object.fromEntries(LAST_ARMS.map((a) => [a, analyzeStudyArm(results, a)])) : null;
  const physical = results[0].cases.flatMap((r) => Object.values(r.arms).flatMap((o) => [...o.calls, ...(o.luna ? [o.luna] : [])]));
  const summary = { metadata, status, error: stop, full_dataset_completed: complete, analyses,
    physical: { attempts: injected ? physical.length : budget.count, billed_records: physical.length,
      unknown_cost_calls: physical.filter((c) => !Number.isFinite(c.cost_usd)).length,
      total_cost_usd: sumKnown(physical.map((c) => c.cost_usd)),
      known_cost_subtotal_usd: physical.reduce((n, c) => n + (Number.isFinite(c.cost_usd) ? c.cost_usd : 0), 0) } };
  await atomicSave(path.join(directory, "raw-results.json"), { metadata, results, status, physical_attempts: budget.count });
  await atomicSave(path.join(directory, "summary.json"), summary);
  await atomicSave(lockFile, { freeze, directory, status, completed_at: new Date().toISOString(), physical: summary.physical });
  return { directory, summary };
}
