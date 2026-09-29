import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { DEV_ARMS } from "../src/current-dev-report.mjs";
import { errorMarkdown } from "../src/current-study-analysis.mjs";
const root = EXPERIMENT_ROOT;
const lock = JSON.parse(await readFile(path.join(root, "results/current-study-final-test.lock.json"), "utf8"));
if (lock.status !== "completed") throw new Error("Test único no completado; no declarar generalización.");
const final = JSON.parse(await readFile(path.join(lock.directory, "summary.json"), "utf8"));
const candidate = final.metadata.candidate;
const registry = JSON.parse(await readFile(path.join(root, "config/current-study-index.json"), "utf8"));
const cycle = registry.cycles.find((item) => item.version === candidate.version);
const dev = JSON.parse(await readFile(path.join(cycle.directory, "summary.json"), "utf8"));
const chosen = dev.arms[candidate.arm], test = final.analysis.summary;
const devCycles = await Promise.all(registry.cycles.map(async (item) => JSON.parse(await readFile(path.join(item.directory, "summary.json"), "utf8"))));
const allDevKnown = devCycles.every((item) => item.physical.total_cost_usd != null);
const devCost = allDevKnown ? devCycles.reduce((sum, item) => sum + item.physical.total_cost_usd, 0) : null;
const devKnownSubtotal = devCycles.reduce((sum, item) => sum + item.physical.known_cost_subtotal_usd, 0);
const devUnknownCalls = devCycles.reduce((sum, item) => sum + item.physical.unknown_cost_calls, 0);
// Historic results are consulted ONLY after the single final test and prompt freeze.
const historicDirectory = path.join(root, "results/2026-09-29T03-16-53-800Z-18ee8191");
const historic = JSON.parse(await readFile(path.join(historicDirectory, "summary.json"), "utf8"));
const oldRaw = JSON.parse(await readFile(path.join(historicDirectory, "raw-results.json"), "utf8"));
const nowRaw = JSON.parse(await readFile(path.join(lock.directory, "raw-results.json"), "utf8"));
const privacyReleased = nowRaw.results[0].cases.filter((row) => oldRaw.results.some((run) => run.cases.some((old) => old.id === row.id &&
  old.arms.CURRENT_RAW?.status === "privacy_blocked")) && row.arms[candidate.arm].status !== "privacy_blocked")
  .map((row) => ({ id: row.id, acceptable_primary_correct: row.arms[candidate.arm].score.acceptable_primary_correct }));
const pct = (n) => n == null ? "—" : (n * 100).toFixed(2) + "%";
const usd = (n) => n == null ? "desconocido" : "$" + n.toFixed(6);
const scale = (n, factor) => n == null ? null : n * factor;
const row = (name, s, exact) => `| ${name} | ${pct(s.primary_accuracy)} | ${pct(s.acceptable_primary_accuracy)} | ${s.false_abstentions} | ${s.missed_abstentions_overclassification} | ${s.privacy_false_positives}/${s.missed_privacy_blocks} | ${pct(exact)} | ${usd(s.cost_per_observation_usd)} | ${usd(s.cost_per_1000_usd)} | ${s.latency_average_ms?.toFixed(0)} |`;
const sRaw = historic.arms.CURRENT_RAW, sLuna = historic.arms.CURRENT_LUNA;
const lines = ["# Resultado final experimental CURRENT / Luna / Jev", "",
  `CANDIDATO: **${candidate.name}**. Seleccionado y congelado en DEV antes de abrir TEST.`, "",
  "## Efectividad completa", "", "| Método | Primary | Acceptable | False abst. | Overclass. | Privacy FP/FN | Exact decision | Cost/obs | Cost/1000 | Latencia ms |",
  "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ...DEV_ARMS.map((arm) => row(`DEV ${candidate.version}/${arm}`, dev.arms[arm], dev.arms[arm].exact_decision)),
  row("TEST CURRENT_RAW histórico", sRaw, sRaw.correct_total / sRaw.total),
  row("TEST CURRENT_LUNA histórico", sLuna, sLuna.correct_total / sLuna.total),
  row("TEST candidato, una pasada", test, test.correct_total / test.total), "",
  `DEV: ${chosen.denominators.classified} repeticiones clasificables de 68 casos; TEST: ${test.denominators.classified} casos clasificables de 28 registros. TEST candidato se ejecutó una vez (una repetición); los baselines históricos tienen tres. Delta de aceptable: ${((test.acceptable_primary_accuracy - sRaw.acceptable_primary_accuracy) * 100).toFixed(2)} puntos vs RAW y ${((test.acceptable_primary_accuracy - sLuna.acceptable_primary_accuracy) * 100).toFixed(2)} vs LUNA histórico.`, "",
  "## Separación de factores", "",
  "Privacidad: el filtro corregido es común a A/B/C/D DEV. V1 nuevo no equivale al filtro histórico. V2: comparar B−A dentro del mismo DEV. Luna: comparar C−B, D−B y D−C dentro de cada versión. La única corrida TEST del candidato cambia varios factores respecto al historial y no permite atribuir causalmente todo el delta a V2 o Luna.", "",
  `Casos históricamente bloqueados ahora liberados por el filtro: ${JSON.stringify(privacyReleased)}. Esto identifica oportunidades recuperadas de inferencia, no un efecto aislado de exactitud: su acierto también depende del clasificador elegido.`, "",
  "## Luna", "", registry.luna_conclusion ?? "Consultar las diferencias pareadas en DEV_FINAL_REPORT.md.", "",
  "```json", JSON.stringify(dev.paired_comparisons, null, 2), "```", "",
  "## Costos reales de uso / cálculo tarifario", "",
  "Jev conserva usage/costo informado por proveedor. Luna conserva tokens reales y costo calculado con tarifa congelada: no factura verificada. /100 y /1000 y meses son extrapolaciones de consumo medido; mezclan ambos orígenes de forma marcada, no se presentan como cobros observados. Desconocidos permanecen null.", "",
  `TEST: Jev ${usd(final.analysis.jev_cost_usd)}, Luna ${usd(final.analysis.luna_cost_usd)}, total ${usd(test.cost_usd)}, /100 ${usd(test.cost_per_100_usd)}, /1000 ${usd(test.cost_per_1000_usd)}, llamadas ${final.analysis.calls}, latencia ${test.latency_average_ms?.toFixed(0)} ms.`, "",
  `Costo/clasificación curricular correcta: ${usd(test.cost_per_correct_classification_usd)}. Costo/decisión correcta (incluye abstención/privacidad): ${usd(test.cost_per_correct_usd)}. Llamadas/observación: ${(final.analysis.calls / test.total).toFixed(3)}.`, "",
  `Costo físico contabilizado de este estudio: DEV ${usd(devCost)}; TEST ${usd(test.cost_usd)}; total ${usd(devCost == null || test.cost_usd == null ? null : devCost + test.cost_usd)}. Incluye todas las iteraciones y cuatro brazos DEV, sin sumar otra vez las proyecciones ni el benchmark histórico. Llamadas físicas: ${devCycles.reduce((n, item) => n + item.physical.calls, 0) + final.analysis.calls}. Procedencia mixta proveedor Jev / cálculo tarifario Luna.`, "",
  `Subtotal conocido del estudio ${usd(devKnownSubtotal + final.analysis.known_cost_subtotal_usd)}; ${devUnknownCalls + final.analysis.unknown_cost_calls} llamadas con costo desconocido. No se presenta el subtotal como factura total.`, "",
  "Tarifas congeladas: Luna entrada US$0.10/M, cacheada US$0.01/M, escritura de caché US$0.125/M, salida US$0.50/M; Jev fallback entrada US$0.042/M, salida US$0/M. Valores centralizados en config/pricing-luna.json y config/pricing-openrouter.json. Tokens ausentes no se sustituyen por supuestos.", "",
  "Tokens y procedencia TEST:", "", "```json", JSON.stringify({ tokens: final.analysis.tokens, jev_provider_cost: final.analysis.jev_provider_cost_usd,
    jev_tariff_cost: final.analysis.jev_tariff_cost_usd, unknown_cost_calls: final.analysis.unknown_cost_calls }, null, 2), "```", "",
  "### Mes: 20 observaciones/día ×20 días", "", "| Profesoras | Obs/mes | V1 RAW DEV | V2 RAW DEV | V2 CLEAN DEV | V2 INTERPRET DEV | Candidato según TEST |",
  "|---:|---:|---:|---:|---:|---:|---:|", ...[1, 10, 50, 100].map((teachers) => `| ${teachers} | ${teachers * 400} | ${DEV_ARMS.map((arm) => usd(scale(dev.arms[arm].cost_per_observation_usd, teachers * 400))).join(" | ")} | ${usd(scale(test.cost_per_observation_usd, teachers * 400))} |`), "",
  "### Incremento por Luna (vs V2 RAW de su versión)", "",
  ...DEV_ARMS.slice(2).map((arm) => {
    const raw = dev.arms.CURRENT_V2_RAW, method = dev.arms[arm], increment = method.cost_per_1000_usd - raw.cost_per_1000_usd;
    if (raw.cost_per_observation_usd == null || method.cost_per_observation_usd == null) return `- ${arm}: incremento de costo desconocido; se conserva el consumo conocido en ledger.`;
    return `- ${arm}: costo +${(100 * (method.cost_per_observation_usd / raw.cost_per_observation_usd - 1)).toFixed(2)}%; ${usd(increment)} adicionales/1000; ${(100 * (method.acceptable_primary_accuracy - raw.acceptable_primary_accuracy)).toFixed(2)} puntos de accuracy; ${increment > 0 ? (100 * (method.acceptable_primary_accuracy - raw.acceptable_primary_accuracy) / increment).toFixed(2) : "indefinido"} puntos de accuracy por US$1 adicional en un lote de 1000.`;
  }), "",
  "## Errores restantes", "",
  ...final.analysis.errors.map((error) => `- ${error.id}: ${error.types.join(", ")}; gold ${error.gold.primary ?? (error.gold.should_abstain ? "ABSTAIN" : "PRIVACY")}; respuesta ${JSON.stringify(error.response)}.`), "",
  `Detalle privado con observación, gold, respuesta, evidence y reason: ${lock.directory}/errors.md. Ledger íntegro: raw-results.json del mismo directorio. Casos con evidencia no alineada: ${nowRaw.results[0].cases.filter((row) => row.arms[candidate.arm].primary && row.arms[candidate.arm].explanation && !row.arms[candidate.arm].evidence_grounded).map((row) => row.id).join(", ") || "ninguno"}.`, "",
  "## Confianza y siguiente paso", "", registry.confidence_conclusion ?? "Confianza limitada por DEV sintético adjudicado por Codex, test pequeño y una sola pasada final. Revisar con docentes antes de extrapolar a registros reales.", "",
  registry.integration_recommendation ?? "La recomendación se limita a una prueba integrada posterior con solicitud expresa; no se integra ni despliega automáticamente.", "",
  "Fuentes, prompts, thresholds y gold no se cambiaron después de TEST. Lock de evaluación única conservado. Test original de 28 casos intacto. Versiones, métricas, costos y comparación completa en DEV_FINAL_REPORT.md. No se modificó Ayni, BD ni routing.", ""];
await writeFile(path.join(root, "FINAL_REPORT.md"), lines.map((line) => line.trimEnd()).join("\n").trimEnd() + "\n");
await writeFile(path.join(lock.directory, "errors.md"), errorMarkdown("TEST_FINAL", candidate.arm, final.analysis));
const caseLines = ["# TEST final: los 28 casos, una sola pasada", "", "Datos privados; revisar localmente. No hay ajuste posterior de gold ni prompts.", "",
  "| ID | Expected / alternativas | Candidato | Secundarias | Correcto aceptable | Exact decision |",
  "|---|---|---|---|---:|---:|",
  ...nowRaw.results[0].cases.map((item) => { const outcome = item.arms[candidate.arm]; return `| ${item.id} | ${item.expected.primary ?? (item.expected.should_abstain ? "ABSTAIN" : "PRIVACY")} / ${item.expected.acceptable_primary.join(", ")} | ${outcome.primary ?? outcome.status} | ${outcome.additional.join(", ") || "ninguna"} | ${outcome.score.acceptable_primary_correct} | ${outcome.score.success} |`; }), ""];
await writeFile(path.join(lock.directory, "all-28-cases.md"), caseLines.join("\n").trimEnd() + "\n");
console.log(JSON.stringify({ candidate: candidate.name, dev: chosen.acceptable_primary_accuracy, test: test.acceptable_primary_accuracy,
  cost: test.cost_usd, latency: test.latency_average_ms, privacy_released: privacyReleased, report: path.join(root, "FINAL_REPORT.md") }));
