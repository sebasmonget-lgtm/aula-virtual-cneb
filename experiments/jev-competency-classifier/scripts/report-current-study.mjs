import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { DEV_ARMS } from "../src/current-dev-report.mjs";
import { rankedCandidates, analyzeStudyArm } from "../src/current-study-analysis.mjs";
const registry = JSON.parse(await readFile(path.join(EXPERIMENT_ROOT, "config/current-study-index.json"), "utf8"));
if (registry.phase !== "dev_closed_before_test" || !registry.selected_name) throw new Error("Cerrar DEV y registrar candidato antes de emitir informe final.");
const rows = [], cycles = [];
for (const item of registry.cycles) {
  const summary = JSON.parse(await readFile(path.join(item.directory, "summary.json"), "utf8"));
  const raw = JSON.parse(await readFile(path.join(item.directory, "raw-results.json"), "utf8"));
  if (summary.status !== "completed" || !summary.full_dataset_completed || summary.metadata.dataset_sha256 !== registry.dev_gold_sha256) throw new Error("Corrida DEV inválida.");
  const armAnalyses = Object.fromEntries(DEV_ARMS.map((arm) => [arm, analyzeStudyArm(raw.results, arm)]));
  for (const arm of DEV_ARMS) rows.push({ version: item.version, arm, name: `${item.version}/${arm}`, directory: item.directory, analysis: armAnalyses[arm], summary: summary.arms[arm] });
  cycles.push({ ...item, summary, raw, armAnalyses });
}
// V1 is unchanged across cycles; keep its first measurement for selection rather than
// selecting a lucky repeat. All repeated V1 controls remain visible in the tables.
const ranking = rankedCandidates(rows.filter((row) => row.arm !== "CURRENT_V1_RAW" || row.version === registry.cycles[0].version));
const pct = (n) => n == null ? "—" : (n * 100).toFixed(2) + "%";
const usd = (n) => n == null ? "desconocido" : "$" + n.toFixed(6);
const selected = ranking.find((row) => row.name === registry.selected_name);
if (!selected) throw new Error("Candidato seleccionado no existe en las corridas completas.");
const lines = ["# DEV_FINAL_REPORT", "", "## Cierre de optimización DEV", "",
  `Gold: ${registry.dev_gold_sha256}. Origen Codex por autorización del usuario, fijado antes de proveedores. 80 registros sintéticos; 68 clasificables, ocho abstenciones, cuatro formatos sensibles ficticios. El test final no se abrió durante DEV.`, "",
  `Candidato: **${selected.name}**. Criterio: primaria aceptable, falsas abstenciones, sobreclasificación, privacidad FP/FN, estabilidad; luego latencia y costo. Exact decision es secundaria. ${registry.selection_reason ?? ""}`, "",
  "V1 conserva instrucciones en cada ciclo. Sus nuevas repeticiones se muestran como controles; para selección se usa la primera medición, evitando escoger un control idéntico por una fluctuación favorable.", "",
  "## Todas las versiones y variantes (tres repeticiones)", "",
  "| Versión / variante | Primary | Acceptable primary | False abst. | Overclass. | Privacy FP/FN | Exact decision | Cost/1000 | Latencia ms | Primarias inestables /80 |",
  "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ...rows.map((row) => { const s = row.analysis.summary; return `| ${row.name} | ${pct(s.primary_accuracy)} | ${pct(s.acceptable_primary_accuracy)} | ${s.false_abstentions} | ${s.missed_abstentions_overclassification} | ${s.privacy_false_positives}/${s.missed_privacy_blocks} | ${pct(s.correct_total / s.total)} | ${usd(s.cost_per_1000_usd)} | ${s.latency_average_ms?.toFixed(0) ?? "—"} | ${row.analysis.unstable_primary_ids.length} |`; }), "",
  "Cada accuracy primaria usa 204 repeticiones clasificables (68×3), no 240 casos independientes. Primarias alternativas cuentan como aceptables. Otras decisiones y secundarias se evalúan por separado. El gold conservador tiene cero secundarias exigidas: missing_secondary=0 por construcción, no demuestra recuperación de secundarias. Evidence/reason de V1 no existen; no se inventan explicaciones retrospectivas.", "",
  "## Estabilidad por versión y brazo", "", ...rows.map((row) => `- ${row.name}: accuracy por repetición ${row.analysis.accuracy_by_run.map(pct).join(" / ")}; primaria inestable ${row.analysis.unstable_primary_ids.join(", ") || "ninguna"}; adicionales incorrectos ${row.analysis.summary.additional_incorrect}; secundarias ausentes ${row.summary.expected_secondary_missing}; evidencia no alineada ${row.summary.ungrounded_suggested_evidence}.`), "",
  "## Aporte de Luna y diferencias pareadas", "",
  "Los conteos de errores corregidos/introducidos excluyen fallos de proveedores. Accuracy y bootstrap miden el flujo completo y cuentan esos fallos como desaciertos. En V2.1 esto cambia el denominador pareado; no atribuir correcciones técnicas a capacidad pedagógica de Luna.", ""];
for (const cycle of cycles) {
  lines.push(`### ${cycle.version}`, "", "```json", JSON.stringify(cycle.summary.paired_comparisons, null, 2), "```", "");
  const analysisFile = path.join(EXPERIMENT_ROOT, "docs/current-study", cycle.summary.metadata.v2_prompt.version, "analysis.json");
  const offline = JSON.parse(await readFile(analysisFile, "utf8"));
  lines.push("Intervalos exploratorios por bootstrap de casos (se promedian tres repeticiones dentro del caso, no se asumen independientes):", "", "```json", JSON.stringify(offline.pairs, null, 2), "```", "");
  for (const pair of Object.values(cycle.summary.paired_comparisons)) {
    const before = cycle.summary.arms[pair.before], after = cycle.summary.arms[pair.after];
    const changedCost = pair.incremental_cost_usd;
    lines.push(`- ${pair.after} vs ${pair.before}: corrige ${pair.corrected_primary}, introduce ${pair.introduced_primary_errors}, neto ${pair.net_primary_errors_corrected} errores por caso-repetición; incremento ${usd(changedCost)}; costo incremental/error corregido ${pair.corrected_primary && changedCost != null ? usd(changedCost / pair.corrected_primary) : "no definido"}; costo/error neto corregido ${pair.net_primary_errors_corrected > 0 && changedCost != null ? usd(changedCost / pair.net_primary_errors_corrected) : "no definido"}; Δ falsa abstención ${after.false_abstentions - before.false_abstentions}; Δ sobreclasificación ${after.missed_abstentions_overclassification - before.missed_abstentions_overclassification}; Δ Privacy FP/FN ${after.privacy_false_positives - before.privacy_false_positives}/${after.missed_privacy_blocks - before.missed_privacy_blocks}; Δ latencia ${pair.incremental_latency_ms?.toFixed(0)} ms.`, "");
  }
}
lines.push("## Costos medidos y procedencia", "",
  "Jev: costo del proveedor cuando existe; fallback por tokens separado. Luna: tokens reales y costo calculado por tarifas congeladas, no factura del proveedor. Desconocidos permanecen desconocidos. Proyección usa la mezcla DEV, incluido 5% de bloqueos previos sin llamadas; extrapolación, no tarifa garantizada.", "",
  "| Variante | Total | Jev | Luna | Costo/obs | Costo/100 | Costo/1000 | Llamadas |",
  "|---|---:|---:|---:|---:|---:|---:|---:|",
  ...rows.map((row) => { const s = row.analysis.summary; return `| ${row.name} | ${usd(s.cost_usd)} | ${usd(row.analysis.jev_cost_usd)} | ${usd(row.analysis.luna_cost_usd)} | ${usd(s.cost_per_observation_usd)} | ${usd(s.cost_per_100_usd)} | ${usd(s.cost_per_1000_usd)} | ${row.analysis.calls} |`; }), "",
  "### Costo por acierto y llamadas medias", "",
  "Costo/clasificación correcta divide el costo total por decisiones curriculares completas correctas (principal aceptable y secundarias sin error). Costo/decisión correcta incluye también abstenciones y privacidad correctas. Los dos denominadores permanecen separados.", "",
  ...rows.map((row) => `- ${row.name}: clasificación correcta ${usd(row.analysis.summary.cost_per_correct_classification_usd)}; decisión correcta ${usd(row.analysis.summary.cost_per_correct_usd)}; llamadas/obs ${(row.analysis.calls / row.analysis.summary.total).toFixed(3)}.`), "",
  "Tarifas congeladas y centralizadas: Luna entrada US$0.10/M, entrada cacheada US$0.01/M, escritura de caché US$0.125/M y salida US$0.50/M (config/pricing-luna.json). Jev fallback entrada US$0.042/M y salida US$0/M (config/pricing-openrouter.json); la suma de costo proveedor y fallback se identifica por separado. No se reprecifica después de medir.", "",
  "### Tokens y procedencia por variante", "", ...rows.map((row) => `- ${row.name}: ${JSON.stringify({ tokens: row.analysis.tokens,
    jev_provider: row.analysis.jev_provider_cost_usd, jev_tariff: row.analysis.jev_tariff_cost_usd, unknown_cost_calls: row.analysis.unknown_cost_calls,
    known_cost_subtotal_usd: row.analysis.known_cost_subtotal_usd, missing_latency_observations: row.analysis.missing_latency_observations })}`), "",
  "### Proyección mensual: 20 observaciones/día ×20 días", "",
  "| Profesoras | Obs/mes | " + rows.map((row) => row.name).join(" | ") + " |",
  "|---:|---:|" + rows.map(() => "---:").join("|") + "|",
  ...[1, 10, 50, 100].map((teachers) => `| ${teachers} | ${teachers * 400} | ${rows.map((row) => usd(row.analysis.summary.cost_per_observation_usd == null ? null : row.analysis.summary.cost_per_observation_usd * teachers * 400)).join(" | ")} |`), "",
  `Costo físico contabilizado de todas las corridas DEV (mixto: proveedor Jev + tarifa Luna): ${usd(cycles.every((cycle) => cycle.summary.physical.total_cost_usd != null) ? cycles.reduce((n, cycle) => n + cycle.summary.physical.total_cost_usd, 0) : null)}. Las dos modalidades Luna se invocaron separadamente en cada ciclo.`, "",
  `Subtotal conocido DEV: ${usd(cycles.reduce((n, cycle) => n + cycle.summary.physical.known_cost_subtotal_usd, 0))}; llamadas sin costo conocido: ${cycles.reduce((n, cycle) => n + cycle.summary.physical.unknown_cost_calls, 0)}. Es un subtotal, no un total completo ni costo cero para intentos fallidos.`, "",
  "## Errores por categoría y trazabilidad", "",
  ...cycles.flatMap((cycle) => DEV_ARMS.map((arm) => `- ${cycle.version} / ${arm}: docs/current-study/${cycle.summary.metadata.v2_prompt.version}/${arm}.md; ledger: ${cycle.directory}/raw-results.json.`)), "",
  "## Límites y paso al test", "",
  "DEV fue creado y adjudicado por Codex, es sintético y no representa prevalencias reales. Tres repeticiones evalúan variabilidad técnica, no amplían el tamaño pedagógico. El 85% es orientativo; no se ajustan etiquetas ni thresholds para alcanzarlo. Los criterios previos de revisión humana se informan, pero esta selección autónoma fue autorizada posteriormente. No hay promoción automática a Ayni.", "",
  "Privacidad corregida común permite aislar V2/Luna dentro de DEV. El delta con el baseline histórico del test incluye cambios de privacidad: una sola evaluación final de un candidato no permite repartir causalmente ese delta entre filtro, V2 y Luna. El test fue usado en el benchmark histórico y permanece cerrado durante este ajuste; no se describe como un conjunto jamás observado.", "",
  "El cierre registra fuente/modelos/tarifas y candidato antes de abrir el test final. Una sola pasada de 28 casos; ningún prompt, threshold ni gold se cambiará después de ver TEST.", "");
await writeFile(path.join(EXPERIMENT_ROOT, "DEV_FINAL_REPORT.md"), lines.map((line) => line.trimEnd()).join("\n").trimEnd() + "\n");
await writeFile(path.join(EXPERIMENT_ROOT, "config/current-study-ranking.json"), JSON.stringify({ selected: selected.name,
  ranking: ranking.map((row) => ({ name: row.name, directory: row.directory, acceptable_accuracy: row.analysis.summary.acceptable_primary_accuracy,
    false_abstentions: row.analysis.summary.false_abstentions, overclassification: row.analysis.summary.missed_abstentions_overclassification,
    unstable_primary: row.analysis.unstable_primary_ids.length })) }, null, 2));
console.log(JSON.stringify({ selected: selected.name, ranking: ranking.map((row) => ({ name: row.name, accuracy: row.analysis.summary.acceptable_primary_accuracy })) }));
