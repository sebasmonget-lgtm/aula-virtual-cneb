import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { EXPERIMENT_ROOT } from "./constants.mjs";
import { FROZEN_TEST_SHA256, devInferenceInput } from "./current-dev-dataset.mjs";
import { loadLunaBenchmarkDataset } from "./luna-benchmark-dataset.mjs";
import { createCurrentV2, groundEvidence } from "./current-v2.mjs";
import { createBenchmarkAdapters } from "./luna-benchmark-adapters.mjs";
import { createLunaClient, jevObservationFromLuna } from "./luna-client.mjs";
import { createLunaCleanClient } from "./luna-clean-client.mjs";
import { scoreOutcome } from "./luna-benchmark-score.mjs";
import { analyzeStudyArm, sumKnown } from "./current-study-analysis.mjs";
import { DEV_ARMS } from "./current-dev-report.mjs";

export const CANDIDATE_SOURCE_FILES = ["src/current-v2.mjs", "config/current-v2-prompt.json", "src/jev-current-benchmark.mjs",
  "src/luna-client.mjs", "src/luna-clean-client.mjs", "src/current-dev-privacy.mjs", "src/luna-benchmark-adapters.mjs",
  "config/pricing-luna.json", "config/pricing-openrouter.json"];
export async function candidateSourceHashes(root = EXPERIMENT_ROOT) {
  return Object.fromEntries(await Promise.all(CANDIDATE_SOURCE_FILES.map(async (file) => [file,
    createHash("sha256").update((await readFile(path.join(root, file), "utf8")).replaceAll("\r\n", "\n")).digest("hex")])));
}
export function validateClosedCandidate(candidate) {
  if (candidate?.phase !== "dev_closed_before_test" || candidate?.optimization_closed !== true ||
    candidate?.final_test_runs !== 1 || !DEV_ARMS.includes(candidate?.arm) ||
    typeof candidate?.dev_gold_sha256 !== "string" || !candidate?.source_sha256 ||
    candidate?.model_jev !== "typesafe/jev-1.13" || candidate?.model_luna !== "gpt-6-luna" ||
    !Array.isArray(candidate?.dev_result_directories) || !candidate.dev_result_directories.length)
    throw new Error("Candidato DEV no cerrado; test no abierto.");
}
export async function claimFinalTest(lockFile, candidate) {
  validateClosedCandidate(candidate);
  await mkdir(path.dirname(lockFile), { recursive: true });
  try { await writeFile(lockFile, JSON.stringify({ claimed_at: new Date().toISOString(), candidate, status: "claimed_before_gold_read" }, null, 2), { flag: "wx" }); }
  catch (error) { if (error.code === "EEXIST") throw new Error("Test final ya reclamado: no se permite otra evaluación."); throw error; }
}
export async function executeCurrentFinalTest({ candidate, preparedDev, testFile, lockFile, onProgress = () => {} }) {
  validateClosedCandidate(candidate);
  const currentHashes = await candidateSourceHashes();
  for (const file of CANDIDATE_SOURCE_FILES) if (currentHashes[file] !== candidate.source_sha256[file]) throw new Error("Fuente cambió después del cierre DEV; test no abierto.");
  if (preparedDev.loaded.fingerprint !== candidate.dev_gold_sha256) throw new Error("Gold DEV cambió; test no abierto.");
  for (const directory of candidate.dev_result_directories) {
    const summary = JSON.parse(await readFile(path.join(directory, "summary.json"), "utf8"));
    if (summary.status !== "completed" || !summary.full_dataset_completed || summary.metadata.runs !== 3 ||
      summary.metadata.dataset_sha256 !== candidate.dev_gold_sha256) throw new Error("DEV incompleto; test no abierto.");
  }
  if (!process.env.OPENAI_API_KEY || !process.env.OPENROUTER_API_KEY) throw new Error("Credenciales ausentes; test no abierto.");
  // Atomic durable gate BEFORE reading frozen bytes or constructing providers.
  await claimFinalTest(lockFile, candidate);
  const loaded = await loadLunaBenchmarkDataset(testFile, { knowledgeBase: { cards: preparedDev.kb.competencyCards, version: preparedDev.kb.version }, config: preparedDev.config });
  if (loaded.fingerprint !== FROZEN_TEST_SHA256 || loaded.cases.length !== 28) throw new Error("Integridad del test congelado inválida; no hubo inferencia.");
  const directory = path.join(EXPERIMENT_ROOT, "results", "current-final-" + new Date().toISOString().replace(/[:.]/gu, "-"));
  await mkdir(directory, { recursive: false });
  const arm = candidate.arm, { kb, prompt, pricing, lunaPricing } = preparedDev;
  const classifier = arm === "CURRENT_V1_RAW" ? (await createBenchmarkAdapters({ config: preparedDev.config, pricing,
    model: candidate.model_jev })).current : createCurrentV2({ kb, prompt, pricing, apiKey: process.env.OPENROUTER_API_KEY, model: candidate.model_jev });
  const lunaClient = arm.endsWith("_CLEAN") ? createLunaCleanClient({ pricing: lunaPricing }) : arm.endsWith("_INTERPRET") ? createLunaClient({ pricing: lunaPricing }) : null;
  const metadata = { candidate, dataset_sha256: loaded.fingerprint, cases: 28, runs: 1,
    created_at: new Date().toISOString(), source_sha256: currentHashes, pricing: { jev: pricing, luna: lunaPricing }, execution_mode: "live_provider",
    historical_baselines: { CURRENT_RAW: .6970, CURRENT_LUNA: .7424 }, privacy_version: "current-dev-contextual-v1" };
  const results = [{ number: 1, cases: [] }]; let stop = null;
  for (const item of loaded.cases) {
    const input = devInferenceInput(item); let luna = null, result, lunaStarted = null;
    if (input.privacy_blocked) result = { status: "privacy_blocked", primary: null, additional: [], calls: [], latency_ms: 0,
      explanation: { status: "privacy", primary: null, secondary: [], evidence: "", reason: input.privacy_reason } };
    else {
      try {
        let observation = input.observation, observable = input.observation;
        if (lunaClient) {
          lunaStarted = performance.now(); luna = await lunaClient.clean({ age: input.age, type: input.type, context: input.context, observation });
          observation = arm.endsWith("_CLEAN") ? luna.clean_observation : jevObservationFromLuna(luna); observable = luna.clean_observation;
        }
        result = await classifier({ age: input.age, observation, observable_text: observable, applicability: input.applicability });
        if (result.explanation && result.primary) {
          const grounded = groundEvidence(result.explanation.evidence, item.raw_observation);
          result.explanation.evidence = grounded.evidence; result.evidence_grounded = grounded.grounded;
        }
      } catch (error) {
        luna ??= error.billing ?? (lunaStarted == null ? null : { usage: null, cost_usd: null, cost_source: "unknown",
          latency_ms: Math.round(performance.now() - lunaStarted) });
        result = { status: "classification_failed", primary: null, additional: [], calls: [], latency_ms: null, error_code: error.message };
        if (/HTTP (401|402|403|429)/u.test(error.message)) stop = error.message;
      }
      const fatal = result.calls?.find((call) => /http_(401|402|403|429)/u.test(call.status)); if (fatal) stop = fatal.status;
    }
    result.calls ??= []; const jev = sumKnown(result.calls.map((call) => call.cost_usd)), lunaCost = luna ? luna.cost_usd : 0;
    const outcome = { ...result, luna, cost_jev_usd: jev, cost_luna_usd: lunaCost,
      total_cost_usd: jev == null || lunaCost == null ? null : jev + lunaCost,
      total_latency_ms: result.latency_ms == null || (luna && luna.latency_ms == null) ? null : result.latency_ms + (luna?.latency_ms ?? 0) };
    outcome.score = scoreOutcome(item.expected, outcome);
    results[0].cases.push({ id: item.id, expected: item.expected, raw_observation: item.raw_observation, privacy_reason: input.privacy_reason, arms: { [arm]: outcome } });
    await writeFile(path.join(directory, "raw-results.json"), JSON.stringify({ metadata, results, status: "running" }, null, 2));
    await onProgress({ completed: results[0].cases.length, total: 28 }); if (stop) break;
  }
  const analysis = analyzeStudyArm(results, arm), status = stop ? "stopped" : "completed";
  await writeFile(path.join(directory, "raw-results.json"), JSON.stringify({ metadata, results, status }, null, 2));
  await writeFile(path.join(directory, "summary.json"), JSON.stringify({ metadata, status, error: stop, analysis }, null, 2));
  await writeFile(lockFile, JSON.stringify({ candidate, directory, status, completed_at: new Date().toISOString() }, null, 2));
  return { directory, status, analysis };
}
