import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { loadExperimentConfig } from "../src/config.mjs";
import { loadDataset } from "../src/dataset.mjs";
import { createJevCompetencyClassifier } from "../src/jev-classifier.mjs";
import { createBaselineClassifier, loadBaselineKeywords } from "../src/baseline-classifier.mjs";
import { loadKnowledgeBase } from "../src/kb-loader.mjs";
import { markdownReport, summarizeBenchmark } from "../src/metrics.mjs";

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
const { classifier: config, pricing } = await loadExperimentConfig();
const knowledgeBase = await loadKnowledgeBase();
const datasetPath = path.resolve(EXPERIMENT_ROOT, options.dataset ?? "datasets/development.jsonl");
const dataset = await loadDataset(datasetPath, { knowledgeBase, config });
const limit = options.limit ? Number(options.limit) : dataset.cases.length;
if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit debe ser un entero positivo.");
let implementation;
if (provider === "jev") {
  if (!process.env.TYPESAFE_API_KEY) throw new Error("TYPESAFE_API_KEY no está configurada; eval:jev no hizo llamadas.");
  if (!options["max-live-requests"]) throw new Error("Para eval:jev indica --max-live-requests N para limitar el gasto.");
  const maxLive = Number(options["max-live-requests"]); if (!Number.isInteger(maxLive) || maxLive < 1) throw new Error("--max-live-requests debe ser un entero positivo.");
  implementation = createJevCompetencyClassifier({ knowledgeBase, config, requestedModel: options.model, useCache: !options["no-cache"] });
  dataset.cases = dataset.cases.slice(0, Math.min(limit, maxLive));
} else if (provider === "baseline") {
  implementation = createBaselineClassifier({ knowledgeBase, config, keywordConfig: await loadBaselineKeywords() });
  dataset.cases = dataset.cases.slice(0, limit);
} else throw new Error("--provider debe ser jev o baseline.");

const results = [];
for (const item of dataset.cases) results.push({ id: item.id, ...(await implementation.classifyObservation(item)) });
const report = summarizeBenchmark({ cases: dataset.cases, results, policy: config, pricing });
const effective = [...new Set(results.map((result) => result.model_effective).filter(Boolean))];
const metadata = { provider, dataset: path.basename(datasetPath), dataset_fingerprint: dataset.fingerprint, model_requested: options.model ?? null, models_effective: effective, provisional: dataset.cases.some((item) => item.label_status !== "reviewed") };
const stamp = new Date().toISOString().replace(/[:.]/g, "-"); const reportsDirectory = path.join(EXPERIMENT_ROOT, "reports"); await mkdir(reportsDirectory, { recursive: true });
const base = path.join(reportsDirectory, `${provider}-${stamp}`);
await writeFile(`${base}.md`, markdownReport(report, metadata), "utf8");
await writeFile(`${base}.json`, JSON.stringify({ metadata, report, case_results: results.map((result) => ({ id: result.id, status: result.status, primary_competency_id: result.primary_competency_id, proposed_competency_id: result.proposed_competency_id, model_confidence: result.model_confidence, error_code: result.error_code })) }, null, 2), "utf8");
console.log(markdownReport(report, metadata)); console.log(`Reportes guardados en ${base}.{md,json}`);
