import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { applicableCompetencyCards } from "../../../src/lib/competency-applicability.mjs";
import { anonymousDecisionText, createJevCompetencySuggester } from "../../../src/lib/jev-competency-suggestion.mjs";
import { createJevOpenRouterDecision } from "../../../src/lib/jev-openrouter-decision.mjs";
import { buildClassifierOptions } from "../../../src/lib/openai-competency-classifier.mjs";
import { loadKnowledgeBaseV4 } from "../../../src/lib/knowledge-base-v4.mjs";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { loadExperimentConfig } from "../src/config.mjs";
import { buildCriteria } from "../src/criteria-builder.mjs";
import { createJevCompetencyClassifier } from "../src/jev-classifier.mjs";
import { evaluateCases } from "../src/profile-comparison.mjs";

const cap = Number(process.argv[2]);
if (!Number.isInteger(cap) || cap < 1 || cap > 210) throw new Error("Indica un máximo de 1 a 210 llamadas.");
if (!process.env.OPENROUTER_API_KEY) throw new Error("Falta OPENROUTER_API_KEY en el entorno local del experimento.");
const datasetChoice = process.argv[3] || "hard-30";
if (!["hard-30", "synthetic-50"].includes(datasetChoice)) throw new Error("Dataset no permitido.");
const allVariants = ["product-teacher", "hybrid:compact", ...["choice", "parallel-noul"].flatMap((method) =>
  ["compact", "enriched", "focused"].map((profile) => `${method}:${profile}`))];
const selected = process.argv[4] || "all";
const runTag = process.argv[5] || "";
if (runTag && !/^r[2-9]$/u.test(runTag)) throw new Error("La repetición debe llamarse r2 a r9.");
const variants = selected === "all" ? allVariants.filter((variant) =>
  !["hybrid:compact", "product-teacher"].includes(variant)) : selected.split(",");
if (!variants.length || new Set(variants).size !== variants.length ||
    variants.some((variant) => !allVariants.includes(variant))) throw new Error("Variantes no permitidas.");

const datasetPath = path.join(EXPERIMENT_ROOT, "datasets", datasetChoice === "hard-30" ?
  "user-hard-30-v1.jsonl" : "synthetic-50-v1.jsonl");
const datasetText = await readFile(datasetPath, "utf8");
const datasetFingerprint = createHash("sha256").update(datasetText).digest("hex");
const cases = datasetText.trim().split(/\r?\n/u).map((line) => JSON.parse(line));
const prepared = cases.map((item) => ({ ...item, sanitized: anonymousDecisionText(item.observation) }));
const runnable = prepared.filter((item) => item.sanitized);
const rejectedIds = prepared.filter((item) => !item.sanitized).map((item) => item.id);
const kb = await loadKnowledgeBaseV4();
const { classifier: config } = await loadExperimentConfig();
const experimentalKb = { version: kb.version, cards: kb.competencyCards,
  fingerprint: createHash("sha256").update(JSON.stringify(kb.competencyCards)).digest("hex") };
const modelRequested = process.env.JEV_MODEL || "typesafe/jev-1.13";
const applicability = runnable.map((item) => {
  const plan = buildCriteria(experimentalKb, { age: item.age, observation: item.sanitized,
    applicability: item.applicability }, config);
  return { id: item.id, primary_applicable: item.expected_competency_id == null ||
    plan.optionIds.has(item.expected_competency_id), invalid_secondary_ids: item.acceptable_secondary_ids
      .filter((id) => !plan.optionIds.has(id)) };
});
const metadata = { dataset: path.basename(datasetPath), dataset_fingerprint: datasetFingerprint,
  kb_version: kb.version, kb_fingerprint: experimentalKb.fingerprint,
  config_fingerprint: createHash("sha256").update(JSON.stringify(config)).digest("hex"),
  sanitized_fingerprint: createHash("sha256").update(JSON.stringify(prepared.map((item) =>
    [item.id, item.sanitized]))).digest("hex"), model_requested: modelRequested,
  rejected_ids: rejectedIds,
  applicability };

const reportsDir = path.join(EXPERIMENT_ROOT, "reports");
await mkdir(reportsDir, { recursive: true });
const reportPath = path.join(reportsDir,
  `product-path-${datasetChoice}-${variants.join("_").replaceAll(":", "-")}-v1${runTag ? `-${runTag}` : ""}.json`);
let saved;
try { saved = JSON.parse(await readFile(reportPath, "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
if (saved && JSON.stringify(saved.metadata) !== JSON.stringify(metadata))
  throw new Error("El reporte existente pertenece a otra entrada o configuración; no se sobrescribió.");
const results = saved?.results ?? [];
const completed = new Set(results.map(({ id, variant }) => `${id}:${variant}`));
const product = createJevCompetencySuggester({ loadKb: async () => kb,
  client: createJevOpenRouterDecision({ apiKey: process.env.OPENROUTER_API_KEY,
    model: modelRequested, telemetry: () => {} }) });
const experiments = new Map(variants.filter((variant) => !variant.startsWith("product")).map((variant) => {
  const [method, criteriaProfile] = variant.split(":");
  return [variant, createJevCompetencyClassifier({ knowledgeBase: experimentalKb, config,
    gateway: "openrouter", method, criteriaProfile, useCache: false,
    requestedModel: modelRequested })];
}));
let calls = 0;
for (const variant of variants) {
  for (const item of runnable) {
    if (completed.has(`${item.id}:${variant}`)) continue;
    if (calls >= cap) throw new Error(`Límite de ${cap} llamadas alcanzado; reporte parcial: ${reportPath}`);
    let result;
    if (variant === "product-teacher") {
      const applicable = applicableCompetencyCards(kb.competencyCards, item.age, {
        castellanoL2Applicable: item.applicability?.castellano_l2 === true,
        religionApplicable: item.applicability?.religion === true });
      const options = buildClassifierOptions(kb.competencyCards, item.age,
        applicable.map((card) => card.id));
      result = await product.classify({ observation: item.sanitized, age: item.age, options });
    } else {
      result = await experiments.get(variant).classifyObservation({ age: item.age,
        observation: item.sanitized, applicability: item.applicability });
      if (result.status === "classification_failed")
        throw new Error(`Jev detuvo la corrida: ${result.error_code}; reporte parcial: ${reportPath}`);
    }
    calls += variant === "product-teacher" ? 2 : 1;
    results.push({ id: item.id, variant, result });
    completed.add(`${item.id}:${variant}`);
    await writeFile(reportPath, `${JSON.stringify({ metadata, results }, null, 2)}\n`, "utf8");
    if (results.length % 10 === 0) console.log(`${results.length}/${runnable.length * variants.length} · ${variant}`);
  }
}

const scored = runnable.filter((item) => applicability.find((entry) => entry.id === item.id)?.primary_applicable);
const summary = variants.map((variant) => {
  if (variant !== "product-teacher") {
    const [method, profile] = variant.split(":");
    const rows = results.filter((row) => row.variant === variant).map((row) => ({ ...row, method, profile }));
    return { variant, ...evaluateCases(runnable, rows, applicability, { method, profile }) };
  }
  let admissible = 0, primaryIncluded = 0, correctAbstentions = 0, extras = 0;
  for (const item of scored) {
    const ids = results.find((row) => row.id === item.id && row.variant === variant).result.candidate_ids;
    const allowed = new Set([item.expected_competency_id, ...item.acceptable_secondary_ids].filter(Boolean));
    const extra = ids.filter((id) => !allowed.has(id));
    extras += extra.length;
    if (item.expected_competency_id && ids.includes(item.expected_competency_id)) primaryIncluded++;
    if (!item.expected_competency_id && !ids.length) correctAbstentions++;
    if (item.expected_competency_id ? ids.includes(item.expected_competency_id) && !extra.length : !ids.length)
      admissible++;
  }
  return { variant, completed: scored.length, primary_in_proposals: primaryIncluded,
    correct_abstentions: correctAbstentions, admissible_cases: admissible, extra_labels: extras };
});
console.log(JSON.stringify({ attempted_new_calls: calls, total_results: results.length,
  rejected_ids: rejectedIds, summary }, null, 2));
