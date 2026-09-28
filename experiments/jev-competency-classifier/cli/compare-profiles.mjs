import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { loadExperimentConfig } from "../src/config.mjs";
import { buildCriteria } from "../src/criteria-builder.mjs";
import { createJevCompetencyClassifier, resolveGateway } from "../src/jev-classifier.mjs";
import { loadKnowledgeBase } from "../src/kb-loader.mjs";

const cap = Number(process.argv[2]);
if (!Number.isInteger(cap) || cap < 1 || cap > 180) throw new Error("Indica el máximo explícito de llamadas, entre 1 y 180.");
const { classifier: config } = await loadExperimentConfig();
const gateway = resolveGateway();
if (!(gateway === "openrouter" ? process.env.OPENROUTER_API_KEY : process.env.TYPESAFE_API_KEY)) throw new Error("No hay clave Jev configurada.");
const knowledgeBase = await loadKnowledgeBase();
const datasetPath = path.join(EXPERIMENT_ROOT, "datasets", "user-hard-30-v1.jsonl");
const datasetText = await readFile(datasetPath, "utf8");
const cases = datasetText.trim().split(/\r?\n/u).map((line) => JSON.parse(line));
if (cases.length !== 30 || new Set(cases.map((item) => item.id)).size !== 30) throw new Error("El conjunto no tiene 30 IDs únicos.");
const datasetFingerprint = createHash("sha256").update(datasetText).digest("hex");
const profiles = ["compact", "enriched", "focused"];
const methods = ["choice", "parallel-noul"];
const combinations = methods.flatMap((method) => profiles.map((profile) => ({ method, profile })));
const applicability = cases.map((item) => {
  const plan = buildCriteria(knowledgeBase, { age: item.age, observation: item.observation, applicability: item.applicability }, config);
  return { id: item.id, primary_applicable: item.expected_competency_id == null || plan.optionIds.has(item.expected_competency_id), invalid_secondary_ids: item.acceptable_secondary_ids.filter((id) => !plan.optionIds.has(id)) };
});

const reportsDirectory = path.join(EXPERIMENT_ROOT, "reports");
await mkdir(reportsDirectory, { recursive: true });
const reportPath = path.join(reportsDirectory, "user-hard-30-comparison.json");
let saved;
try { saved = JSON.parse(await readFile(reportPath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
const metadata = { dataset: path.basename(datasetPath), dataset_fingerprint: datasetFingerprint, classifier_version: config.classifier_version, knowledge_base_fingerprint: knowledgeBase.fingerprint, gateway, model_requested: process.env.JEV_MODEL || (gateway === "openrouter" ? "typesafe/jev-1.13" : null), applicability };
if (saved && ["dataset_fingerprint", "classifier_version", "knowledge_base_fingerprint", "gateway", "model_requested"].some((key) => saved.metadata?.[key] !== metadata[key])) throw new Error("El reporte existente pertenece a otra configuración; consérvalo y cambia el nombre antes de iniciar una nueva corrida.");
const results = saved?.results ?? [];
const completedKeys = new Set(results.map((row) => `${row.id}:${row.method}:${row.profile}`));
let attempted = 0;
for (const { method, profile } of combinations) {
  const classifier = createJevCompetencyClassifier({ knowledgeBase, config, gateway, method, criteriaProfile: profile });
  for (const item of cases) {
    const key = `${item.id}:${method}:${profile}`;
    if (completedKeys.has(key)) continue;
    if (attempted >= cap) throw new Error(`Límite de ${cap} llamadas alcanzado con ${results.length}/180 resultados. Reporte parcial: ${reportPath}`);
    const result = await classifier.classifyObservation({ age: item.age, observation: item.observation, applicability: item.applicability });
    attempted += result.cache_hit ? 0 : 1;
    results.push({ id: item.id, method, profile, result });
    completedKeys.add(key);
    await writeFile(reportPath, `${JSON.stringify({ metadata, results }, null, 2)}\n`, "utf8");
    if (results.length % 10 === 0 || result.status === "classification_failed") console.log(`${results.length}/180 · ${method}/${profile} · ${item.id} · ${result.status}${result.cache_hit ? " · caché" : ""}`);
    if (["auth", "insufficient_credits", "model_unavailable", "rate_limited"].includes(result.error_code)) throw new Error(`Jev detuvo la corrida: ${result.error_code}. Reporte parcial: ${reportPath}`);
  }
}
console.log(`Comparación completa: ${results.length}/180 resultados, ${attempted} solicitudes sin caché en esta ejecución. Reporte: ${reportPath}`);
