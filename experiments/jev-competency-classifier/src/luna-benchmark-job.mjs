import { randomBytes } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "./constants.mjs";
import { loadExperimentConfig, loadJsonConfig } from "./config.mjs";
import { inferenceInput, loadLunaBenchmarkDataset } from "./luna-benchmark-dataset.mjs";
import { createBenchmarkAdapters } from "./luna-benchmark-adapters.mjs";
import { createLunaClient, lunaCost } from "./luna-client.mjs";
import { loadKnowledgeBaseV4 } from "../../../src/lib/knowledge-base-v4.mjs";
import { loadKnowledgeBase } from "./kb-loader.mjs";
import { comparisonMarkdown, errorsMarkdown, summarizeBenchmark } from "./luna-benchmark-score.mjs";
import { plannedCalls, runLunaBenchmark } from "./luna-benchmark-runner.mjs";
import { analyzeBenchmarkCosts, costAnalysisMarkdown, monthlyCostCsv } from "./luna-benchmark-costs.mjs";

async function atomicWrite(filename, contents) {
  const temporary = `${filename}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(temporary, contents, "utf8");
  await rename(temporary, filename);
}

export async function prepareBenchmark({ dataset, limit, runs = 1, methods = "both", includeLuna = true,
  currentMode = "product-teacher", criteriaProfile = "focused" }) {
  if (![1, 3, 5].includes(runs)) throw new Error("Las repeticiones deben ser 1, 3 o 5.");
  if (!["both", "current", "parallel"].includes(methods)) throw new Error("Métodos inválidos.");
  if (!["product-teacher", "choice"].includes(currentMode)) throw new Error("Método CURRENT inválido.");
  if (!["compact", "enriched", "focused"].includes(criteriaProfile)) throw new Error("Perfil inválido.");
  const kb = await loadKnowledgeBaseV4();
  const knowledgeBase = currentMode === "choice" ? await loadKnowledgeBase() : { version: kb.version, cards: kb.competencyCards };
  const { classifier: config, openrouterPricing } = await loadExperimentConfig();
  const [lunaPricing, planning] = await Promise.all([loadJsonConfig("pricing-luna.json"), loadJsonConfig("benchmark-planning.json")]);
  const loaded = await loadLunaBenchmarkDataset(path.resolve(dataset), { knowledgeBase, config });
  const selected = limit == null ? loaded.cases : loaded.cases.slice(0, limit);
  if (!selected.length || (limit != null && (!Number.isInteger(limit) || limit < 1))) throw new Error("--limit debe ser positivo.");
  const calls = plannedCalls({ cases: selected.length, runs, methods, includeLuna,
    currentCalls: currentMode === "product-teacher" ? 2 : 1 });
  const estimateLuna = lunaCost({ input_tokens: planning.planning_luna_input_tokens,
    cached_input_tokens: 0, output_tokens: planning.planning_luna_output_tokens }, lunaPricing);
  return { selected, loaded, config, openrouterPricing, lunaPricing, planning, knowledgeBase,
    options: { runs, methods, includeLuna, currentMode, criteriaProfile },
    preflight: { ...calls, estimated_cost_usd: calls.jev_calls_max * planning.historical_jev_usd_per_call +
      calls.luna_calls_max * estimateLuna, estimate_basis: planning.note,
      privacy_blocked_count: selected.filter((item) => inferenceInput(item).privacy_blocked).length } };
}

export async function executeBenchmark(prepared, { maxLiveRequests, onProgress = async () => {},
  adapters: injectedAdapters, lunaClient: injectedLuna } = {}) {
  const { selected, loaded, config, openrouterPricing, lunaPricing, options, preflight } = prepared;
  const maxCalls = preflight.jev_calls_max + preflight.luna_calls_max;
  if (!Number.isInteger(maxLiveRequests) || maxLiveRequests < maxCalls)
    throw new Error(`El límite debe cubrir hasta ${maxCalls} llamadas; ajusta --max-live-requests.`);
  if (!injectedAdapters && !process.env.OPENROUTER_API_KEY) throw new Error("Falta OPENROUTER_API_KEY; no hubo llamadas.");
  if (options.includeLuna && !injectedLuna && !process.env.OPENAI_API_KEY) throw new Error("Falta OPENAI_API_KEY; no hubo llamadas.");
  const adapters = injectedAdapters ?? await createBenchmarkAdapters({ config, pricing: openrouterPricing,
    criteriaProfile: options.criteriaProfile,
    ...(options.currentMode === "choice" ? { localKnowledgeBase: prepared.knowledgeBase } : {}) });
  const selectedAdapters = { current: options.currentMode === "choice" ? adapters.choice : adapters.current,
    parallel: adapters.parallel };
  const lunaClient = injectedLuna ?? createLunaClient({ pricing: lunaPricing });
  const base = path.join(EXPERIMENT_ROOT, "results");
  await mkdir(base, { recursive: true });
  const runId = `${new Date().toISOString().replace(/[:.]/gu, "-")}-${randomBytes(4).toString("hex")}`;
  const directory = path.join(base, runId);
  await mkdir(directory);
  await mkdir(path.join(directory, "runs"));
  const metadata = { run_id: runId, created_at: new Date().toISOString(),
    dataset: path.basename(loaded.filename), dataset_path: loaded.filename,
    dataset_fingerprint: loaded.fingerprint, current_method: options.currentMode,
    parallel_method: "parallel-noul", criteria_profile: options.criteriaProfile,
    classifier_version: config.classifier_version, kb_version: adapters.metadata?.kb_version ?? "unknown",
    kb_fingerprint: adapters.metadata?.kb_fingerprint ?? null,
    parallel_kb_version: adapters.metadata?.parallel_kb_version ?? "unknown",
    parallel_kb_fingerprint: adapters.metadata?.parallel_kb_fingerprint ?? null,
    model_jev_requested: adapters.metadata?.model_requested ?? process.env.JEV_MODEL ?? "typesafe/jev-1.13",
    model_luna_requested: "gpt-6-luna", pricing: { luna: lunaPricing, jev: openrouterPricing },
    preflight, options };
  let results = [], costs = null, stopped = null;
  try {
    const completed = await runLunaBenchmark({ cases: selected, runs: options.runs, methods: options.methods,
      includeLuna: options.includeLuna, adapters: selectedAdapters, lunaClient,
      onCase: async (state) => {
        results = state.results;
        costs = { actual_cost_usd: state.actual_cost_usd, unknown_cost_calls: state.unknown_cost_calls };
        await atomicWrite(path.join(directory, "raw-results.json"), `${JSON.stringify({ metadata, results, costs, status: "running" }, null, 2)}\n`);
        const currentRun = results.at(-1);
        await atomicWrite(path.join(directory, "runs", `run-${currentRun.number}.json`), `${JSON.stringify(currentRun, null, 2)}\n`);
      }, onProgress });
    results = completed.results;
    costs = { actual_cost_usd: completed.actual_cost_usd,
      actual_luna_cost_usd: completed.actual_luna_cost_usd,
      actual_jev_cost_usd: completed.actual_jev_cost_usd, unknown_cost_calls: completed.unknown_cost_calls };
  } catch (error) { stopped = error.message; }
  const summary = { metadata, ...summarizeBenchmark(results),
    by_run: results.map((run) => ({ number: run.number, ...summarizeBenchmark([run]) })),
    planned_case_repetitions: selected.length * options.runs,
    completed_case_repetitions: results.reduce((n, run) => n + run.cases.length, 0),
    costs, status: stopped ? "stopped" : "completed", error: stopped };
  const costAnalysis = analyzeBenchmarkCosts({ metadata, results, status: summary.status }, await loadJsonConfig("cost-scenarios.json"));
  await Promise.all([
    atomicWrite(path.join(directory, "raw-results.json"), `${JSON.stringify({ metadata, results, costs, status: summary.status, error: stopped }, null, 2)}\n`),
    atomicWrite(path.join(directory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`),
    atomicWrite(path.join(directory, "comparison.md"), comparisonMarkdown(metadata, results, summary)),
    atomicWrite(path.join(directory, "errors.md"), errorsMarkdown(results)),
    atomicWrite(path.join(directory, "cost-analysis.json"), `${JSON.stringify(costAnalysis, null, 2)}\n`),
    atomicWrite(path.join(directory, "cost-analysis.md"), costAnalysisMarkdown(costAnalysis)),
    atomicWrite(path.join(directory, "monthly-costs.csv"), monthlyCostCsv(costAnalysis)),
  ]);
  return { directory, runId, summary };
}
