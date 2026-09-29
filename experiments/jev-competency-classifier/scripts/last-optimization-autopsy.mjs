import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { loadKnowledgeBaseV4 } from "../../../src/lib/knowledge-base-v4.mjs";
import { loadExperimentConfig } from "../src/config.mjs";
import { loadLunaBenchmarkDataset } from "../src/luna-benchmark-dataset.mjs";
import { devInferenceInput } from "../src/current-dev-dataset.mjs";
import { v2Requests } from "../src/current-v2.mjs";
import { candidateSourceHashes } from "../src/current-final-test.mjs";

const historicalDirectory = path.join(EXPERIMENT_ROOT, "results/current-final-2026-09-29T11-59-24-143Z");
const historical = JSON.parse(await readFile(path.join(historicalDirectory, "raw-results.json"), "utf8"));
const review = JSON.parse(await readFile(path.join(EXPERIMENT_ROOT, "config/last-optimization-autopsy.json"), "utf8"));
const prompt = JSON.parse(await readFile(path.join(EXPERIMENT_ROOT, "config/current-study-versions/V2.3.json"), "utf8")).prompt;
const hashes = await candidateSourceHashes();
for (const [file, sha] of Object.entries(historical.metadata.source_sha256)) {
  if (hashes[file] !== sha) throw new Error(`No se puede reconstruir fielmente: ${file} cambió.`);
}
const kb = await loadKnowledgeBaseV4(), { classifier: config } = await loadExperimentConfig();
const dataset = await loadLunaBenchmarkDataset("C:/Users/ASUS/Documents/ayni_jev_gold_v1.jsonl", {
  knowledgeBase: { cards: kb.competencyCards, version: kb.version }, config });
if (dataset.fingerprint !== historical.metadata.dataset_sha256) throw new Error("Gold histórico cambió.");
const directory = path.join(EXPERIMENT_ROOT, "results/last-optimization-autopsy");
await mkdir(directory, { recursive: true });
const lines = ["# LAST OPTIMIZATION — Autopsia de los ocho errores", "",
  `Creada localmente: ${new Date().toISOString()}. Sin llamadas a Jev/Luna.`, "",
  "Observaciones históricas privadas: este documento queda local e ignorado por Git. No se cambió gold, anonimizador, Luna, thresholds ni respuestas. Causas son hipótesis de revisión pedagógica, no atribuciones causales aisladas.", "",
  "Los cuerpos de Jev no fueron guardados en la corrida antigua. Se reconstruyen sin red desde el prompt V2.3 y las nueve fuentes verificadas por SHA, usando la salida CLEAN realmente guardada. No son una captura de paquetes. El cuerpo de cada solicitud es {model,state,questions}; las cabeceras y secretos se excluyen.", "",
  "B en TEST2 será CURRENT_V2_RAW = V2.3 RAW, la versión inmediatamente anterior. Se preserva también el snapshot original V2 sin evaluarlo, para no añadir otro brazo.", "",
  "## Resumen", "", "| Caso | Error histórico | Causas plausibles | Principal alternativa defendible |", "|---|---|---|---|"];
const records = [];
for (const [id, diagnosis] of Object.entries(review)) {
  const row = historical.results[0].cases.find((item) => item.id === id);
  const item = dataset.cases.find((item) => item.id === id), input = devInferenceInput(item);
  const result = row.arms.CURRENT_V2_LUNA_CLEAN;
  const plan = v2Requests({ input: { age: input.age, observation: result.luna.clean_observation,
    observable_text: result.luna.clean_observation, applicability: input.applicability }, kb, prompt });
  const requests = Object.fromEntries(["primary", "additional"].map((role) => [role, {
    model: "typesafe/jev-1.13", state: plan[role].state, questions: plan[role].questions }]));
  const types = [
    ...(result.score.false_abstention ? ["false_abstention"] : []),
    ...(result.primary && !result.score.acceptable_primary_correct ? ["wrong_primary"] : []),
    ...(result.score.additional_incorrect ? ["unnecessary_secondary"] : []),
    ...(item.expected.acceptable_secondary.some((id) => !result.additional.includes(id)) ? ["missed_secondary"] : []),
  ];
  const record = { id, original: item.raw_observation, anonymized: input.observation, clean: result.luna.clean_observation,
    requests, selected_evidence_before_grounding: plan.fragments[Number(result.evidence_selected_id?.slice(1)) - 1] ?? "",
    explanation: result.explanation, final: { status: result.status, primary: result.primary, secondary: result.additional },
    gold: item.expected, errors: types, diagnosis, historical_raw_result: result.raw_result };
  records.push(record);
  await writeFile(path.join(directory, `${id}-jev-input.json`), JSON.stringify(requests, null, 2) + "\n");
  lines.push(`| ${id} | ${types.join(", ")} | ${diagnosis.causes.join(", ")} | ${diagnosis.reasonable_alternative_primary.join(", ") || "—"} |`);
}
for (const r of records) {
  const requestPath = path.join(directory, `${r.id}-jev-input.json`).replaceAll("\\", "/");
  lines.push("", `## ${r.id}`, "", "### Trazabilidad", "",
    `**Original:** ${r.original}`, "", `**Anonimizado:** ${r.anonymized}`, "", `**Luna CLEAN real:** ${r.clean}`, "",
    `**Estado exacto de Jev reconstruido:** ${r.requests.primary.state}`, "",
    `[Dos cuerpos completos de Jev: principal y adicionales](<${requestPath}>)`, "",
    `**Fragmento elegido antes del grounding:** ${r.selected_evidence_before_grounding}`, "",
    `**Evidence final guardada:** ${r.explanation.evidence || "vacía: no alineada literalmente"}`, "",
    `**Reason guardada:** ${r.explanation.reason}`, "",
    "**Respuesta final:**", "```json", JSON.stringify(r.final, null, 2), "```", "",
    "**Gold histórico intacto:**", "```json", JSON.stringify(r.gold, null, 2), "```", "",
    `**Errores:** ${r.errors.join(", ")}.`, "", `**Causas:** ${r.diagnosis.causes.join(", ")}.`, "",
    r.diagnosis.analysis, "", "### Auditoría del anonimizador", "", "```json", JSON.stringify(r.diagnosis.anonymizer, null, 2), "```", "",
    "### Revisión del gold", "", r.diagnosis.gold_review, "",
    "### Respuesta Jev anterior completa", "", "```json", JSON.stringify(r.historical_raw_result, null, 2), "```");
}
await writeFile(path.join(directory, "autopsy.json"), JSON.stringify({ created_at: new Date().toISOString(),
  historical_dataset_sha256: dataset.fingerprint, source_sha256: hashes, records }, null, 2) + "\n");
await writeFile(path.join(EXPERIMENT_ROOT, "LAST_OPTIMIZATION_ERROR_AUTOPSY.md"), lines.join("\n") + "\n");
console.log(JSON.stringify({ autopsy_cases: records.length, provider_calls: 0,
  historical_gold_sha256: dataset.fingerprint, autopsy_sha256: createHash("sha256").update(lines.join("\n") + "\n").digest("hex") }));
