import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { loadExperimentConfig } from "../src/config.mjs";
import { loadDataset } from "../src/dataset.mjs";
import { createJevCompetencyClassifier, resolveGateway } from "../src/jev-classifier.mjs";
import { createBaselineClassifier, loadBaselineKeywords } from "../src/baseline-classifier.mjs";
import { loadKnowledgeBase } from "../src/kb-loader.mjs";
import { markdownReport, summarizeBenchmark, markdownParallelReport, summarizeParallelBenchmark } from "../src/metrics.mjs";

function args(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]; if (!item.startsWith("--")) continue;
    const key = item.slice(2); const next = argv[index + 1]; values[key] = next && !next.startsWith("--") ? (index += 1, next) : true;
  }
  return values;
}
const options = args(process.argv.slice(2));
const provider = options.provider ?? "jev";
const method = options.method ?? "choice";
const criteriaProfile = options["criteria-profile"] ?? "compact";
if (!["choice", "parallel-noul"].includes(method)) throw new Error("--method debe ser choice o parallel-noul.");
if (!["compact", "enriched", "focused"].includes(criteriaProfile)) throw new Error("--criteria-profile debe ser compact, enriched o focused.");
if (provider !== "jev" && method !== "choice") throw new Error("--method parallel-noul requiere --provider jev.");
if (provider !== "jev" && criteriaProfile !== "compact") throw new Error("--criteria-profile enriched requiere --provider jev.");
const { classifier: config, pricing: directPricing, openrouterPricing } = await loadExperimentConfig();
const gateway = provider === "jev" ? resolveGateway(options.gateway) : null;
const pricing = gateway === "openrouter" ? openrouterPricing : directPricing;
const knowledgeBase = await loadKnowledgeBase();
const datasetPath = path.resolve(EXPERIMENT_ROOT, options.dataset ?? "datasets/development.jsonl");
const dataset = await loadDataset(datasetPath, { knowledgeBase, config });
const limit = options.limit ? Number(options.limit) : dataset.cases.length;
if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit debe ser un entero positivo.");
let implementation;
if (provider === "jev") {
  const keyName = gateway === "openrouter" ? "OPENROUTER_API_KEY" : "TYPESAFE_API_KEY";
  if (!process.env[keyName]) throw new Error(`${keyName} no está configurada; eval:jev no hizo llamadas.`);
  if (!options["max-live-requests"]) throw new Error("Para eval:jev indica --max-live-requests N para limitar el gasto.");
  const maxLive = Number(options["max-live-requests"]); if (!Number.isInteger(maxLive) || maxLive < 1) throw new Error("--max-live-requests debe ser un entero positivo.");
  implementation = createJevCompetencyClassifier({ knowledgeBase, config, method, criteriaProfile, gateway, requestedModel: options.model, useCache: !options["no-cache"] });
  dataset.cases = dataset.cases.slice(0, Math.min(limit, maxLive));
} else if (provider === "baseline") {
  implementation = createBaselineClassifier({ knowledgeBase, config, keywordConfig: await loadBaselineKeywords() });
  dataset.cases = dataset.cases.slice(0, limit);
} else throw new Error("--provider debe ser jev o baseline.");

const results = [];
for (const item of dataset.cases) {
  const result = { id: item.id, ...(await implementation.classifyObservation(item)) };
  results.push(result);
  if (["auth", "insufficient_credits", "model_unavailable"].includes(result.error_code)) {
    console.error(`Benchmark detenido tras ${result.error_code}; no se intentarán más llamadas.`);
    break;
  }
}
const report = method === "parallel-noul" ? summarizeParallelBenchmark({ cases: dataset.cases, results, pricing }) : summarizeBenchmark({ cases: dataset.cases, results, policy: config, pricing });
const effective = [...new Set(results.map((result) => result.model_effective).filter(Boolean))];
const metadata = { provider, method, criteria_profile: criteriaProfile, gateway, dataset: path.basename(datasetPath), dataset_fingerprint: dataset.fingerprint, classifier_version: config.classifier_version, knowledge_base_version: knowledgeBase.version, knowledge_base_fingerprint: knowledgeBase.fingerprint, model_requested: options.model ?? (gateway === "openrouter" ? "typesafe/jev-1.13" : null), models_effective: effective, provisional: dataset.cases.some((item) => item.label_status !== "reviewed"), noul_positive_threshold: config.noul_positive_threshold, noul_review_threshold: config.noul_review_threshold };
const stamp = new Date().toISOString().replace(/[:.]/g, "-"); const reportsDirectory = path.join(EXPERIMENT_ROOT, "reports"); await mkdir(reportsDirectory, { recursive: true });
const base = path.join(reportsDirectory, `${provider}-${method}-${criteriaProfile}-${stamp}`);
const markdown = method === "parallel-noul" ? markdownParallelReport(report, metadata) : markdownReport(report, metadata);
await writeFile(`${base}.md`, markdown, "utf8");
await writeFile(`${base}.json`, JSON.stringify({ metadata, report, case_results: results.map((result) => ({ id: result.id, status: result.status, primary_competency_id: result.primary_competency_id, proposed_competency_id: result.proposed_competency_id, proposed_competency_ids: result.proposed_competency_ids, possible_competency_ids: result.possible_competency_ids, competency_scores: result.competency_scores, probabilities: result.probabilities, sufficiency_probability: result.sufficiency_probability, criteria_fingerprint: result.criteria_fingerprint, model_confidence: result.model_confidence, model_effective: result.model_effective, usage: result.usage, latency_ms: result.latency_ms, cache_hit: result.cache_hit, error_code: result.error_code })) }, null, 2), "utf8");
console.log(markdown); console.log(`Reportes guardados en ${base}.{md,json}`);
