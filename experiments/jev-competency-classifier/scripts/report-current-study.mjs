import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { DEV_ARMS } from "../src/current-dev-report.mjs";
import { rankedCandidates, analyzeStudyArm } from "../src/current-study-analysis.mjs";
const registry = JSON.parse(await readFile(path.join(EXPERIMENT_ROOT, "config/current-study-index.json"), "utf8"));
const rows = [], cycles = [];
for (const item of registry.cycles) {
  const summary = JSON.parse(await readFile(path.join(item.directory, "summary.json"), "utf8"));
  const raw = JSON.parse(await readFile(path.join(item.directory, "raw-results.json"), "utf8"));
  if (summary.status !== "completed" || !summary.full_dataset_completed || summary.metadata.dataset_sha256 !== registry.dev_gold_sha256) throw new Error("Corrida DEV inválida.");
  const armAnalyses = Object.fromEntries(DEV_ARMS.map((arm) => [arm, analyzeStudyArm(raw.results, arm)]));
  for (const arm of DEV_ARMS) rows.push({ version: item.version, arm, name: `${item.version}/${arm}`, directory: item.directory, analysis: armAnalyses[arm], summary: summary.arms[arm] });
  cycles.push({ ...item, summary, raw, armAnalyses });
}
const ranking = rankedCandidates(rows);
const pct = (n) => n == null ? "—" : (n * 100).toFixed(2) + "%";
const usd = (n) => n == null ? "desconocido" : "$" + n.toFixed(6);
const selected = ranking.find((row) => row.name === registry.selected_name) ?? ranking[0];
const lines = ["# DEV_FINAL_REPORT", "", "## Cierre de optimización DEV", "",
  `Gold: ${registry.dev_gold_sha256}. Origen Codex por autorización del usuario, fijado antes de proveedores. 80 registros sintéticos; 68 clasificables, ocho abstenciones, cuatro formatos sensibles ficticios. El test final no se abrió durante DEV.`, "",
  `Candidato: **${selected.name}**. Criterio: primaria aceptable, falsas abstenciones, sobreclasificación, privacidad FP/FN, estabilidad; luego latencia y costo. Exact decision es secundaria. ${registry.selection_reason ?? ""}`, "",
  "## Todas las versiones y variantes (tres repeticiones)", "",
  "| Versión / variante | Primary | Acceptable primary | False abst. | Overclass. | Privacy FP/FN | Exact decision | Cost/1000 | Latencia ms | Primarias inestables /80 |",
  "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ...rows.map((row) => { const s = row.analysis.summary; return `| ${row.name} | ${pct(s.primary_accuracy)} | ${pct(s.acceptable_primary_accuracy)} | ${s.false_abstentions} | ${s.missed_abstentions_overclassification} | ${s.privacy_false_positives}/${s.missed_privacy_blocks} | ${pct(s.correct_total / s.total)} | ${usd(s.cost_per_1000_usd)} | ${s.latency_average_ms?.toFixed(0) ?? "—"} | ${row.analysis.unstable_primary_ids.length} |`; }), "",
  "Cada accuracy primaria usa 204 repeticiones clasificables (68×3), no 240 casos independientes. Primarias alternativas cuentan como aceptables. Otras decisiones y secundarias se evalúan por separado. El gold conservador tiene cero secundarias exigidas: missing_secondary=0 por construcción, no demuestra recuperación de secundarias. Evidence/reason de V1 no existen; no se inventan explicaciones retrospectivas.", "",
  "## Estabilidad por versión y brazo", "", ...rows.map((row) => `- ${row.name}: accuracy por repetición ${row.analysis.accuracy_by_run.map(pct).join(" / ")}; primaria inestable ${row.analysis.unstable_primary_ids.join(", ") || "ninguna"}; adicionales incorrectos ${row.analysis.summary.additional_incorrect}; secundarias ausentes ${row.summary.expected_secondary_missing}; evidencia no alineada ${row.summary.ungrounded_suggested_evidence}.`), "",
  "## Aporte de Luna y diferencias pareadas", ""];
for (const cycle of cycles) {
  lines.push(`### ${cycle.version}`, "", "```json", JSON.stringify(cycle.summary.paired_comparisons, null, 2), "```", "");
  const analysisFile = path.join(EXPERIMENT_ROOT, "docs/current-study", cycle.summary.metadata.v2_prompt.version, "analysis.json");
  const offline = JSON.parse(await readFile(analysisFile, "utf8"));
  lines.push("Intervalos exploratorios por bootstrap de casos (se promedian tres repeticiones dentro del caso, no se asumen independientes):", "", "```json", JSON.stringify(offline.pairs, null, 2), "```", "");
}
lines.push("## Costos medidos y procedencia", "",
  "Jev: costo del proveedor cuando existe; fallback por tokens separado. Luna: tokens reales y costo calculado por tarifas congeladas, no factura del proveedor. Desconocidos permanecen desconocidos. Proyección usa la mezcla DEV, incluido 5% de bloqueos previos sin llamadas; extrapolación, no tarifa garantizada.", "",
  "| Variante | Total | Jev | Luna | Costo/obs | Costo/100 | Costo/1000 | Llamadas |",
  "|---|---:|---:|---:|---:|---:|---:|---:|",
  ...rows.map((row) => { const s = row.analysis.summary; return `| ${row.name} | ${usd(s.cost_usd)} | ${usd(row.analysis.jev_cost_usd)} | ${usd(row.analysis.luna_cost_usd)} | ${usd(s.cost_per_observation_usd)} | ${usd(s.cost_per_100_usd)} | ${usd(s.cost_per_1000_usd)} | ${row.analysis.calls} |`; }), "",
  "### Tokens y procedencia por variante", "", ...rows.map((row) => `- ${row.name}: ${JSON.stringify({ tokens: row.analysis.tokens,
    jev_provider: row.analysis.jev_provider_cost_usd, jev_tariff: row.analysis.jev_tariff_cost_usd, unknown_cost_calls: row.analysis.unknown_cost_calls,
    missing_latency_observations: row.analysis.missing_latency_observations })}`), "",
  "### Proyección mensual: 20 observaciones/día ×20 días", "",
  "| Profesoras | Obs/mes | " + rows.map((row) => row.name).join(" | ") + " |",
  "|---:|---:|" + rows.map(() => "---:").join("|") + "|",
  ...[1, 10, 50, 100].map((teachers) => `| ${teachers} | ${teachers * 400} | ${rows.map((row) => usd(row.analysis.summary.cost_per_observation_usd == null ? null : row.analysis.summary.cost_per_observation_usd * teachers * 400)).join(" | ")} |`), "",
  `Desembolso físico de todas las corridas DEV: ${usd(cycles.every((cycle) => cycle.summary.physical.total_cost_usd != null) ? cycles.reduce((n, cycle) => n + cycle.summary.physical.total_cost_usd, 0) : null)}. Las dos modalidades Luna se invocaron separadamente en cada ciclo.`, "",
  "## Errores por categoría y trazabilidad", "",
  ...cycles.flatMap((cycle) => DEV_ARMS.map((arm) => `- ${cycle.version} / ${arm}: docs/current-study/${cycle.summary.metadata.v2_prompt.version}/${arm}.md; ledger: ${cycle.directory}/raw-results.json.`)), "",
  "## Límites y paso al test", "",
  "DEV fue creado y adjudicado por Codex, es sintético y no representa prevalencias reales. Tres repeticiones evalúan variabilidad técnica, no amplían el tamaño pedagógico. El 85% es orientativo; no se ajustan etiquetas ni thresholds para alcanzarlo. Los criterios previos de revisión humana se informan, pero esta selección autónoma fue autorizada posteriormente. No hay promoción automática a Ayni.", "",
  "Privacidad corregida común permite aislar V2/Luna dentro de DEV. El delta con el baseline histórico del test incluye cambios de privacidad: una sola evaluación final de un candidato no permite repartir causalmente ese delta entre filtro, V2 y Luna. El test fue usado en el benchmark histórico y permanece cerrado durante este ajuste; no se describe como un conjunto jamás observado.", "",
  "El cierre registra fuente/modelos/tarifas y candidato antes de abrir el test final. Una sola pasada de 28 casos; ningún prompt, threshold ni gold se cambiará después de ver TEST.", "");
await writeFile(path.join(EXPERIMENT_ROOT, "DEV_FINAL_REPORT.md"), lines.join("\n"));
await writeFile(path.join(EXPERIMENT_ROOT, "config/current-study-ranking.json"), JSON.stringify({ selected: selected.name,
  ranking: ranking.map((row) => ({ name: row.name, directory: row.directory, acceptable_accuracy: row.analysis.summary.acceptable_primary_accuracy,
    false_abstentions: row.analysis.summary.false_abstentions, overclassification: row.analysis.summary.missed_abstentions_overclassification,
    unstable_primary: row.analysis.unstable_primary_ids.length })) }, null, 2));
console.log(JSON.stringify({ selected: selected.name, ranking: ranking.map((row) => ({ name: row.name, accuracy: row.analysis.summary.acceptable_primary_accuracy })) }));
