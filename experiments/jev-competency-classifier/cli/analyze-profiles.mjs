import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { evaluateCases, proposals } from "../src/profile-comparison.mjs";

const reportPath = path.join(EXPERIMENT_ROOT, "reports", "user-hard-30-comparison.json");
const datasetPath = path.join(EXPERIMENT_ROOT, "datasets", "user-hard-30-v1.jsonl");
const run = JSON.parse(await readFile(reportPath, "utf8"));
const cases = (await readFile(datasetPath, "utf8")).trim().split(/\r?\n/u).map((line) => JSON.parse(line));
const methods = ["choice", "parallel-noul"];
const profiles = ["compact", "enriched", "focused"];
if (cases.length !== 30 || run.results.length !== 180) throw new Error(`La comparación está incompleta: ${run.results.length}/180.`);
const combinations = methods.flatMap((method) => profiles.map((profile) => ({ method, profile })));
const summaries = combinations.map((combo) => evaluateCases(cases, run.results, run.metadata.applicability, combo));
const parallelSweeps = profiles.flatMap((profile) => [0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95].map((threshold) => evaluateCases(cases, run.results, run.metadata.applicability, { method: "parallel-noul", profile, threshold })));
const choiceSweeps = profiles.flatMap((profile) => [0.05, 0.1, 0.15, 0.2, 0.25, 0.3].map((secondMargin) => evaluateCases(cases, run.results, run.metadata.applicability, { method: "choice", profile, secondMargin })));
const all = [...summaries, ...parallelSweeps, ...choiceSweeps];
const sorted = [...all].sort((a, b) => b.admissible_cases - a.admissible_cases || b.primary_in_proposals - a.primary_in_proposals || a.extra_labels - b.extra_labels || a.proposed_labels - b.proposed_labels);
const bestDefaultCount = Math.max(...summaries.map((item) => item.admissible_cases));
const bestDefaults = summaries.filter((item) => item.admissible_cases === bestDefaultCount);
const totalCost = summaries.reduce((sum, item) => sum + item.cost_usd, 0);
const resultByKey = new Map(run.results.map((row) => [`${row.id}:${row.method}:${row.profile}`, row.result]));
const applicableById = new Map(run.metadata.applicability.map((item) => [item.id, item.primary_applicable]));
const comboLabel = ({ method, profile }) => `${method === "choice" ? "C" : "P"}-${profile}`;
const summaryRow = (item) => `| ${comboLabel(item)} | ${item.primary_top1}/${item.labelled} | ${item.primary_in_proposals}/${item.labelled} | ${item.correct_abstentions}/${item.abstain} | ${item.admissible_cases}/${item.completed} | ${item.extra_labels} | ${item.proposed_labels} | $${item.cost_usd.toFixed(5)} |`;
const sweepRow = (item) => `| ${comboLabel(item)} | ${item.method === "choice" ? `Δ ≤ ${item.second_margin}` : `p ≥ ${item.threshold}`} | ${item.primary_in_proposals}/${item.labelled} | ${item.correct_abstentions}/${item.abstain} | ${item.admissible_cases}/${item.completed} | ${item.extra_labels} | ${item.proposed_labels} |`;
function cell(item, combo) {
  const result = resultByKey.get(`${item.id}:${combo.method}:${combo.profile}`);
  if (result.status === "classification_failed") return `ERROR ${result.error_code}`;
  const ids = proposals(result, combo.method);
  const allowed = new Set([item.expected_competency_id, ...item.acceptable_secondary_ids].filter(Boolean));
  const okay = item.expected_competency_id ? ids.includes(item.expected_competency_id) && ids.every((id) => allowed.has(id)) : ids.length === 0;
  return `${applicableById.get(item.id) ? okay ? "✓" : "×" : "NC"} ${ids.join(" + ") || "∅"}`;
}
const caseRows = cases.map((item) => `| ${item.id} | ${item.expected_competency_id ?? "∅"}${applicableById.get(item.id) ? "" : " †"} | ${item.acceptable_secondary_ids.join(" + ") || "—"} | ${combinations.map((combo) => cell(item, combo)).join(" | ")} |`);
const failures = run.results.filter((row) => row.result.status === "classification_failed");
const cacheHits = run.results.filter((row) => row.result.cache_hit).length;
const effectiveModels = [...new Set(run.results.map((row) => row.result.model_effective).filter(Boolean))];
const lines = [
  "# Jev: 30 situaciones difíciles × 2 métodos × 3 perfiles",
  "",
  `Conjunto anonimizado: \`datasets/user-hard-30-v1.jsonl\`; SHA-256 ${run.metadata.dataset_fingerprint}. Etiquetas entregadas por el usuario y **no adjudicadas de forma independiente por especialistas**. El texto enviado a Jev no incluyó las etiquetas. Modelo efectivo: ${effectiveModels.join(", ") || "—"}.`,
  "",
  `Se intentaron 180 combinaciones de caso y configuración: ${180 - cacheHits} llamadas sin caché, ${cacheHits} aciertos de caché, ${failures.length} fallos; costo total aproximado US$${totalCost.toFixed(5)}. Las seis configuraciones reciben las mismas notas anonimizadas, sin contexto adicional ni condiciones especiales de Castellano L2 o Religión. Cada combinación se ejecutó una sola vez; no se midió variación entre repeticiones.`,
  "",
  "## Regla de comparación",
  "",
  "Hay 25 casos con primaria indicada y 5 donde se espera abstención. En dos casos de 4 años (`hard_001` y `hard_007`) la primaria indicada `TRANS_AUTONOMO` no es seleccionable en la KB v4 para esa edad; se muestran sus respuestas, pero se excluyen de los denominadores. Así quedan 23 casos con primaria y 5 de abstención (28 evaluables). En `abstain_028`, una secundaria indicada también está fuera de edad y no se usa como verdad positiva.",
  "",
  "Un caso con primaria cuenta como *admisible* si la propuesta contiene la primaria y ninguna etiqueta fuera del conjunto {primaria + secundarias aceptables}. No se exige proponer todas las secundarias: son plausibles, no necesariamente obligatorias ni exhaustivas. Una abstención cuenta si la propuesta está vacía. En paralelo esto significa sin propuestas ≥ umbral, aunque la interfaz puede mostrar opciones *para revisar* ≥0.50. `Top-1` usa la mayor puntuación cruda; `incluida` usa la propuesta operativa. `Extra` es propuesta fuera del conjunto permitido, no un falso positivo clínico/pedagógico confirmado.",
  "",
  "## Seis combinaciones con política actual",
  "",
  "Choice usa su propuesta según la política vigente; paralelo usa puntuación ≥0.80. `C` = Choice; `P` = paralelo; perfiles compact = resumen anterior, enriched = KB enriquecida y focused = criterios enfocados + suficiencia.",
  "",
  "| Combinación | Primaria top-1 | Primaria incluida | Abstenciones correctas | Casos admisibles | Etiquetas extra | Etiquetas propuestas | Costo real aprox. |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...summaries.map(summaryRow),
  "",
  "## Umbrales simulados sin nuevas llamadas",
  "",
  "Para paralelo se prueban umbrales de propuesta; para Choice se agrega la segunda candidata solo cuando la diferencia entre top-1 y top-2 es como máximo Δ. No son umbrales validados para producción.",
  "",
  "| Combinación | Variante | Primaria incluida | Abstenciones correctas | Casos admisibles | Etiquetas extra | Etiquetas propuestas |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...parallelSweeps.map(sweepRow),
  ...choiceSweeps.map(sweepRow),
  "",
  `Con la política actual empatan ${bestDefaults.map(comboLabel).join(" y ")} en ${bestDefaultCount}/28 casos admisibles. ${comboLabel(sorted[0])} queda primera solo por el desempate de primarias incluidas, etiquetas extra y número total de propuestas; no hay una superioridad estadística demostrada. En el barrido, ${comboLabel(sorted[0])} ${sorted[0].method === "choice" ? sorted[0].second_margin == null ? "mantiene la política actual" : `agrega la segunda si Δ ≤ ${sorted[0].second_margin}` : `usa p ≥ ${sorted[0].threshold}`}. Varias variantes empatan en ${sorted[0].admissible_cases}/28: bajar el umbral paralelo o agregar top-2 no aporta una mejora neta inequívoca aquí. Todo ajuste es retrospectivo sobre este mismo conjunto y necesita prueba con casos nuevos antes de cambiar la política.`,
  "",
  "## Resultado caso por caso con política actual",
  "",
  "`✓` cumple la regla admisible; `×` no; `NC` no comparable por primaria no aplicable; `∅` no propone ninguna. Los códigos son IDs estables de la KB.",
  "",
  `| Caso | Primaria de referencia | Secundarias aceptables | ${combinations.map(comboLabel).join(" | ")} |`,
  `| --- | --- | --- | ${combinations.map(() => "---").join(" | ")} |`,
  ...caseRows,
  "",
  "## Límites y decisión operativa",
  "",
  "No se modificó la KB, la política de umbrales ni Ayni principal. No se debe convertir este resultado en asignación automática: las etiquetas y la completitud de las secundarias necesitan revisión docente independiente; los umbrales escogidos con estos mismos casos pueden sobreajustarse. La IA solo sugiere competencias y la docente confirma.",
  "",
];
const markdown = `${lines.join("\n")}\n`;
const destination = path.join(EXPERIMENT_ROOT, "REVIEW_USER_HARD_30_2026-09-27.md");
await writeFile(destination, markdown, "utf8");
await writeFile(path.join(EXPERIMENT_ROOT, "reports", "user-hard-30-analysis.json"), `${JSON.stringify({ summaries, parallel_sweeps: parallelSweeps, choice_sweeps: choiceSweeps, best: sorted[0] }, null, 2)}\n`, "utf8");
console.log(markdown.slice(0, markdown.indexOf("## Resultado caso por caso")));
console.log(`Reporte completo: ${destination}`);
