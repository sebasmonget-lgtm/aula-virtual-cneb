import { mkdir, writeFile, rename } from "node:fs/promises";
import { randomBytes, createHash } from "node:crypto";
import path from "node:path";
import { EXPERIMENT_ROOT } from "./constants.mjs";
import { loadExperimentConfig, loadJsonConfig } from "./config.mjs";
import { loadKnowledgeBaseV4 } from "../../../src/lib/knowledge-base-v4.mjs";
import { createBenchmarkAdapters } from "./luna-benchmark-adapters.mjs";
import { createCurrentV2, groundEvidence } from "./current-v2.mjs";
import { createLunaClient, lunaCost, jevObservationFromLuna } from "./luna-client.mjs";
import { createLunaCleanClient } from "./luna-clean-client.mjs";
import { loadCurrentDevDataset, devInferenceInput } from "./current-dev-dataset.mjs";
import { scoreOutcome } from "./luna-benchmark-score.mjs";
import { DEV_ARMS, summarizeCurrentDev, currentDevMarkdown } from "./current-dev-report.mjs";

const totalCost = (calls) => calls.every((call) => Number.isFinite(call.cost_usd)) ? calls.reduce((n, call) => n + call.cost_usd, 0) : null;
async function save(file, value) { const temp = file + ".tmp"; await writeFile(temp, value, "utf8"); await rename(temp, file); }

export async function prepareCurrentDev({ dataset, adjudicationFile, runs = 3, limit }) {
  if (![1, 3].includes(runs)) throw new Error("DEV admite 1 (smoke) o 3 repeticiones.");
  if (limit != null && (!Number.isInteger(limit) || limit < 1)) throw new Error("Limit inválido.");
  const kb = await loadKnowledgeBaseV4();
  const { classifier: config, openrouterPricing: pricing } = await loadExperimentConfig();
  const [lunaPricing, prompt, planning, promotion] = await Promise.all([
    loadJsonConfig("pricing-luna.json"), loadJsonConfig("current-v2-prompt.json"),
    loadJsonConfig("current-dev-planning.json"), loadJsonConfig("current-dev-promotion.json")]);
  const loaded = await loadCurrentDevDataset(path.resolve(dataset), { knowledgeBase: { cards: kb.competencyCards, version: kb.version }, config, adjudicationFile });
  const cases = loaded.cases.slice(0, limit ?? loaded.cases.length), observations = cases.length * runs;
  const lunaUnit = lunaCost({ input_tokens: planning.luna_input_tokens_per_call_estimate,
    output_tokens: planning.luna_output_tokens_per_call_estimate, cached_input_tokens: 0 }, lunaPricing);
  const v2Call = (planning.v2_jev_input_tokens_per_call_estimate * pricing.input_usd_per_million +
    planning.v2_jev_output_tokens_per_call_estimate * pricing.output_usd_per_million) / 1e6;
  const unit = { CURRENT_V1_RAW: 2 * planning.v1_jev_usd_per_call_estimate, CURRENT_V2_RAW: 2 * v2Call,
    CURRENT_V2_LUNA_CLEAN: 2 * v2Call + lunaUnit, CURRENT_V2_LUNA_INTERPRET: 2 * v2Call + lunaUnit };
  return { kb, config, pricing, lunaPricing, prompt, planning, promotion, loaded, cases, runs,
    preflight: { cases: cases.length, runs, case_repetitions: observations, jev_calls_max: observations * 8,
      luna_calls_max: observations * 2, total_calls_max: observations * 10,
      estimated_cost_usd: Object.values(unit).reduce((a, b) => a + b, 0) * observations,
      estimated_by_arm_usd: Object.fromEntries(DEV_ARMS.map((arm) => [arm, unit[arm] * observations])),
      estimate_basis: planning, privacy_blocked_cases: cases.filter((item) => devInferenceInput(item).privacy_blocked).length,
      review_status: loaded.review_status, executable: loaded.adjudicated } };
}

function attachCosts(result, luna = null) {
  const calls = result.calls ?? [], jev = totalCost(calls), lunaCostUsd = luna ? luna.cost_usd : 0;
  return { ...result, calls, luna, cost_jev_usd: jev, cost_luna_usd: lunaCostUsd,
    total_cost_usd: jev == null || lunaCostUsd == null ? null : jev + lunaCostUsd,
    total_latency_ms: result.latency_ms == null || (luna && luna.latency_ms == null) ? null : result.latency_ms + (luna?.latency_ms ?? 0) };
}

export async function executeCurrentDev(prepared, { maxLiveRequests, adapters: injected, onProgress = () => {} } = {}) {
  // First gate, before key resolution or any provider construction.
  if (!prepared.loaded.adjudicated) throw new Error("Adjudicación humana pendiente: cero llamadas; no se puede optimizar ni puntuar este dev set.");
  if (!Number.isInteger(maxLiveRequests) || maxLiveRequests < prepared.preflight.total_calls_max) throw new Error(`Límite requerido: ${prepared.preflight.total_calls_max}.`);
  const { kb, config, pricing, lunaPricing, prompt, cases, runs } = prepared;
  if (!injected && (!process.env.OPENAI_API_KEY || !process.env.OPENROUTER_API_KEY)) throw new Error("Faltan credenciales locales; cero llamadas.");
  const adapters = injected ?? {
    v1: (await createBenchmarkAdapters({ config, pricing })).current,
    v2: createCurrentV2({ kb, prompt, pricing, apiKey: process.env.OPENROUTER_API_KEY, model: process.env.JEV_MODEL || "typesafe/jev-1.13" }),
    clean: createLunaCleanClient({ pricing: lunaPricing }), interpret: createLunaClient({ pricing: lunaPricing }) };
  const directory = path.join(EXPERIMENT_ROOT, "results", `current-dev-${new Date().toISOString().replace(/[:.]/gu, "-")}-${randomBytes(4).toString("hex")}`);
  await mkdir(path.join(directory, "runs"), { recursive: true });
  const metadata = { created_at: new Date().toISOString(), execution_mode: injected ? "mock_test" : "live_provider", arm_order: DEV_ARMS,
    dataset: path.basename(prepared.loaded.filename),
    dataset_sha256: prepared.loaded.fingerprint, adjudication: prepared.loaded.manifest, runs,
    kb_version: kb.version, kb_sha256: createHash("sha256").update(JSON.stringify(kb.competencyCards)).digest("hex"),
    v2_prompt: prompt, v2_prompt_sha256: createHash("sha256").update(JSON.stringify(prompt)).digest("hex"),
    privacy_version: "current-dev-contextual-v1", pricing: { jev: pricing, luna: lunaPricing },
    model_jev: process.env.JEV_MODEL || "typesafe/jev-1.13", model_luna: "gpt-6-luna", preflight: prepared.preflight,
    promotion_criteria: prepared.promotion, frozen_test_used: false };
  const results = []; let stop = null, completed = 0;
  for (let number = 1; number <= runs && !stop; number++) {
    const run = { number, cases: [] }; results.push(run);
    for (const item of cases) {
      const input = devInferenceInput(item);
      const row = { id: item.id, expected: item.expected, coverage_tags: item.coverage_tags,
        raw_observation: item.raw_observation, sanitized_observation: input.observation,
        privacy_reason: input.privacy_reason, arms: {} };
      for (const arm of DEV_ARMS) {
        let luna = null, result, lunaStarted = null;
        if (input.privacy_blocked) result = { status: "privacy_blocked", primary: null, additional: [], ranked: [], calls: [], latency_ms: 0,
          explanation: { status: "privacy", primary: null, secondary: [], evidence: "", reason: input.privacy_reason } };
        else if (stop) result = { status: "classification_failed", primary: null, additional: [], calls: [], latency_ms: null, error_code: "not_attempted_provider_stop" };
        else {
          try {
            const safe = { age: input.age, type: input.type, context: input.context, observation: input.observation };
            let observation = input.observation, observable = input.observation;
            if (arm.endsWith("_CLEAN")) { lunaStarted = performance.now(); luna = await adapters.clean.clean(safe); observation = luna.clean_observation; observable = observation; }
            if (arm.endsWith("_INTERPRET")) { lunaStarted = performance.now(); luna = await adapters.interpret.clean(safe); observation = jevObservationFromLuna(luna); observable = luna.clean_observation; }
            result = await adapters[arm === "CURRENT_V1_RAW" ? "v1" : "v2"]({ age: input.age, observation,
              observable_text: observable, applicability: input.applicability });
            if (result.explanation && result.primary) {
              const grounded = groundEvidence(result.explanation.evidence, item.raw_observation);
              result.explanation.evidence = grounded.evidence; result.evidence_grounded = grounded.grounded;
              if (!grounded.grounded) result.explanation.reason += " Evidencia literal no verificada: requiere revisión humana.";
            }
          } catch (error) {
            luna ??= error.billing ?? (lunaStarted == null ? null : { usage: null, cost_usd: null,
              cost_source: "unknown", latency_ms: Math.round(performance.now() - lunaStarted), status: "failed" });
            result = { status: "classification_failed", primary: null, additional: [], calls: [], latency_ms: null, error_code: error.message };
            if (/HTTP (401|402|403|429)/u.test(error.message)) stop = error.message;
          }
          const fatal = result.calls?.find((call) => /http_(401|402|403|429)/u.test(call.status));
          if (fatal) stop = fatal.status;
        }
        row.arms[arm] = attachCosts(result, luna);
        row.arms[arm].score = scoreOutcome(item.expected, row.arms[arm]);
      }
      run.cases.push(row); completed++;
      await save(path.join(directory, "raw-results.json"), JSON.stringify({ metadata, results, status: "running" }, null, 2));
      await save(path.join(directory, "runs", `run-${number}.json`), JSON.stringify(run, null, 2));
      await onProgress({ completed, total: cases.length * runs });
      if (stop) break;
    }
  }
  const summary = { metadata, ...summarizeCurrentDev(results, prepared.promotion),
    status: stop ? "stopped" : "completed", error: stop, planned_case_repetitions: cases.length * runs, completed_case_repetitions: completed };
  summary.full_dataset_completed = !stop && completed === prepared.loaded.cases.length * runs;
  if (!summary.full_dataset_completed) for (const candidate of Object.values(summary.candidate_review)) candidate.eligible_for_human_candidate_review = false;
  await Promise.all([
    save(path.join(directory, "raw-results.json"), JSON.stringify({ metadata, results, status: summary.status }, null, 2)),
    save(path.join(directory, "summary.json"), JSON.stringify(summary, null, 2)),
    save(path.join(directory, "comparison.md"), currentDevMarkdown(metadata, summary, results)),
  ]);
  return { directory, summary };
}
