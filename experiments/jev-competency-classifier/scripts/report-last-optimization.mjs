import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { LAST_ARMS, prepareLastTest } from "../src/last-optimization.mjs";
import { compareCase } from "../src/luna-benchmark-score.mjs";

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const prepared = await prepareLastTest(); // Verify all frozen inference bytes, no providers.
const root = EXPERIMENT_ROOT, lock = await readJson(path.join(root, "results/last-test2.lock.json"));
if (lock.status !== "completed") throw new Error("TEST2 no completado; no declarar resultado final.");
const result = await readJson(path.join(lock.directory, "summary.json"));
const raw = await readJson(path.join(lock.directory, "raw-results.json")), rows = raw.results[0].cases;
const threshold = await readJson(path.join(root, "config/last-threshold-dev.json"));
const autopsy = await readJson(path.join(root, "config/last-optimization-autopsy.json"));
const A = "CURRENT_V1_RAW", B = "CURRENT_V2_RAW", C = "CURRENT_V2_4_RAW", D = "CURRENT_V2_4_LUNA_CLEAN";
const analyses = result.analyses, summaries = Object.fromEntries(LAST_ARMS.map((a) => [a, analyses[a].summary]));
const pct = (n) => n == null ? "desconocido" : (100 * n).toFixed(2) + "%";
const usd = (n) => n == null ? "desconocido" : "US$" + n.toFixed(8);
const number = (n) => n == null ? "—" : n.toFixed(2);
const mean = (list) => list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
const predicted = (o) => o.status === "privacy_blocked" ? "PRIVACY" : o.status === "classification_failed" ? "API_FAILURE" :
  [o.primary, ...o.additional].filter(Boolean).join(" + ") || "ABSTAIN";
const eligible = rows.filter((r) => !r.expected.should_abstain && !r.expected.should_privacy_block);
const correct = (a) => eligible.filter((r) => r.arms[a].score.acceptable_primary_correct).length;
const wrong = (a) => analyses[a].errors.filter((e) => e.types.includes("wrong_primary")).length;
function pair(from, to) {
  const valid = rows.filter((r) => compareCase(r.arms[from], r.arms[to]) !== "UNDETERMINED");
  const primary = eligible.filter((r) => valid.includes(r));
  return { from, to, corrects_primary: primary.filter((r) => !r.arms[from].score.acceptable_primary_correct && r.arms[to].score.acceptable_primary_correct).map((r) => r.id),
    introduces_primary: primary.filter((r) => r.arms[from].score.acceptable_primary_correct && !r.arms[to].score.acceptable_primary_correct).map((r) => r.id),
    improves_full_decision: valid.filter((r) => compareCase(r.arms[from], r.arms[to]) === "IMPROVED").map((r) => r.id),
    worsens_full_decision: valid.filter((r) => compareCase(r.arms[from], r.arms[to]) === "WORSENED").map((r) => r.id),
    same_full_correctness: valid.filter((r) => compareCase(r.arms[from], r.arms[to]) === "SAME").map((r) => r.id),
    unknown: rows.filter((r) => !valid.includes(r)).map((r) => r.id),
    acceptable_gain: summaries[to].acceptable_primary_accuracy - summaries[from].acceptable_primary_accuracy,
    cost_delta_usd: summaries[to].cost_usd == null || summaries[from].cost_usd == null ? null : summaries[to].cost_usd - summaries[from].cost_usd,
    cost_delta_per_1000_usd: summaries[to].cost_per_1000_usd == null || summaries[from].cost_per_1000_usd == null ? null : summaries[to].cost_per_1000_usd - summaries[from].cost_per_1000_usd,
    latency_delta_ms: summaries[to].latency_average_ms - summaries[from].latency_average_ms };
}
const pairs = [pair(A, B), pair(B, C), pair(A, C), pair(C, D)];
const cleanPair = pairs.at(-1), c = summaries[C], d = summaries[D], a = summaries[A];
const criteria = prepared.dataset.cases.length && (await readJson(path.join(root, "datasets/last-optimization/freeze.json"))).criteria;
function passes(arm) {
  const s = summaries[arm];
  return correct(arm) - correct(A) >= criteria.clear_baseline_gain_min_additional_correct_primaries &&
    s.false_abstentions <= a.false_abstentions && s.missed_abstentions_overclassification <= a.missed_abstentions_overclassification &&
    s.privacy_false_positives === 0 && s.missed_privacy_blocks === 0 && s.additional_incorrect <= a.additional_incorrect && s.provider_failures === 0;
}
const cleanMaterial = cleanPair.corrects_primary.length > criteria.clean_gain_not_material_if_corrects_at_most_cases &&
  correct(D) > correct(C) && d.false_abstentions <= c.false_abstentions &&
  d.missed_abstentions_overclassification <= c.missed_abstentions_overclassification && d.additional_incorrect <= c.additional_incorrect &&
  d.privacy_false_positives === 0 && d.missed_privacy_blocks === 0 && d.provider_failures === 0;
const preferred = cleanMaterial ? D : C;
const recommendation = passes(preferred) ? "Hacer prueba supervisada; no integrar automáticamente." : "Detener optimización por prompt; no integrar V2.4 con esta evidencia.";
const allRequests = rows.flatMap((r) => Object.values(r.arms).flatMap((o) => o.provider_requests));
const leaks = allRequests.filter((r) => /"(?:expected|acceptable_primary|acceptable_secondary|gold|correct_answer)"\s*:|TEST2_\d{3}/u.test(JSON.stringify(r.payload)));
if (leaks.length) throw new Error("Fuga de etiquetas; no presentar benchmark válido.");
if (allRequests.length !== result.physical.attempts) throw new Error("Registro de payloads no coincide con llamadas físicas.");
const privacyEvidence = Object.fromEntries(LAST_ARMS.map((arm) => [arm, {
  true_positive: summaries[arm].privacy_true_positives, positive_cases: 4, negatives: 36,
  protected_case_provider_calls: rows.filter((r) => r.expected.should_privacy_block).flatMap((r) => r.arms[arm].provider_requests).length,
} ]));
const closed = { completed_at: new Date().toISOString(), dataset_sha256: prepared.dataset.fingerprint,
  prompt_sha256: prepared.freeze.prompt_sha256, threshold: threshold.selected_threshold, summaries,
  analyses, pairs, preferred, passes_predeclared_criteria: Object.fromEntries([C, D].map((arm) => [arm, passes(arm)])),
  recommendation, physical: result.physical, provider_payload_count: allRequests.length,
  label_leaks: leaks.length, privacy_validation: privacyEvidence, results_directory: lock.directory };
const directory = path.join(root, "docs/last-optimization"); await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, "summary.json"), JSON.stringify(closed, null, 2) + "\n");
const table = ["| Métrica | V1 RAW | V2.3 RAW (CURRENT_V2_RAW) | V2.4 RAW | V2.4 CLEAN |", "|---|---:|---:|---:|---:|"];
const metric = (label, fn) => table.push(`| ${label} | ${LAST_ARMS.map((arm) => fn(summaries[arm], arm)).join(" | ")} |`);
metric("Primary accuracy (28)", (s) => pct(s.primary_accuracy));
metric("Acceptable primary accuracy (28)", (s, arm) => `${pct(s.acceptable_primary_accuracy)} (${correct(arm)}/28)`);
metric("Exact decision (40)", (s) => `${pct(s.correct_total / s.total)} (${s.correct_total}/40)`);
metric("False abstentions (28)", (s) => s.false_abstentions);
metric("Overclassification (8)", (s) => s.missed_abstentions_overclassification);
metric("Wrong primary (28)", (_s, arm) => wrong(arm));
metric("Privacy FP / FN (36 negativos / 4 positivos)", (s) => `${s.privacy_false_positives} / ${s.missed_privacy_blocks}`);
metric("Unnecessary secondary (etiquetas)", (s) => s.additional_incorrect);
metric("Casos con unnecessary secondary", (_s, arm) => analyses[arm].errors.filter((e) => e.types.includes("unnecessary_secondary")).length);
metric("Casos con missed secondary", (_s, arm) => analyses[arm].errors.filter((e) => e.types.includes("missed_secondary")).length);
metric("Provider failures", (s) => s.provider_failures);
metric("Cost / observation", (s) => usd(s.cost_per_observation_usd));
metric("Cost / 100 observations", (s) => usd(s.cost_per_100_usd));
metric("Cost / 1000 observations", (s) => usd(s.cost_per_1000_usd));
metric("Average latency (ms; 40 casos)", (s) => number(s.latency_average_ms));
metric("Average latency (ms; solo 36 permitidos)", (_s, arm) => number(mean(rows.filter((r) => !r.expected.should_privacy_block).map((r) => r.arms[arm].total_latency_ms).filter(Number.isFinite))));
metric("Llamadas promedio / observación", (_s, arm) => number(analyses[arm].calls / 40));

const lines = ["# LAST OPTIMIZATION — V2.4", "", `Informe: ${closed.completed_at}.`, "",
  `**Recomendación: ${recommendation}** Preferencia entre las dos V2.4: **${preferred}**.`, "",
  "## 1. Alcance y congelación", "",
  "Un único V2.4, un TEST2 nuevo, 40 casos, cuatro brazos, una repetición. A es V1 RAW con privacidad corregida; B es V2.3 RAW, el CURRENT_V2_RAW inmediatamente anterior, no el primer borrador V2. No se ejecutó INTERPRET, TEST1 ni otro ciclo DEV. No se modificó Ayni, BD ni routing. No se cambió prompt, threshold, gold o anonimizador después de ver TEST2.", "",
  `Gold: 28 curriculares, 8 abstenciones, 4 Privacy ficticios. Edad null. SHA-256: **${prepared.dataset.fingerprint}**. Congelación de gold anterior a prompt final y a llamadas. Prompt SHA-256: **${prepared.freeze.prompt_sha256}**.`, "",
  "Respaldo: `06a61cb`. Configuración congelada y guardada antes de llamadas: `528cd35`. Todas las entradas oficiales se validaron contra KB v4.1 y sus IDs aplicables. El lock durable impide otra corrida; no hay retry ni uso de cache de clasificaciones.", "",
  "**Límite de independencia:** TEST2 es nuevo, sintético y no evaluado antes, pero lo creó/adjudicó Codex, el mismo autor que conoce errores históricos y redacta V2.4. Jev/Luna no generaron gold. Esto reduce independencia respecto al diseño y no sustituye una adjudicación docente externa ni observaciones reales nuevas. No se afirma generalización a aulas reales.", "",
  "## 2. Autopsia de los ocho errores anteriores", "",
  `[Autopsia privada completa con originales, texto anonimizado, CLEAN real, dos cuerpos Jev reconstruidos, evidence, reason, final y gold](<${path.join(root, "LAST_OPTIMIZATION_ERROR_AUTOPSY.md").replaceAll("\\", "/")}>)`, "",
  "No hubo llamadas de autopsia. Se verificaron las nueve fuentes previas antes de reconstruir requests. Son cuerpos reconstruidos del código/prompt guardado, no capturas de tráfico histórico. Las respuestas son las realmente almacenadas.", "",
  "| Caso | Causas plausibles | Conclusión pedagógica y técnica |", "|---|---|---|",
  ...Object.entries(autopsy).map(([id, x]) => `| ${id} | ${x.causes.join(", ")} | ${x.analysis} |`), "",
  "Causas no aisladas experimentalmente: llamar a una salida jev_wrong_primary significa desacuerdo con el gold histórico, no que la etiqueta sea pedagógicamente imposible. AG-01 admite Forma; MN-03 admite Oral si predomina recuerdo; TE-03 ya admite Lectura. AG-02, MN-03 y TE-02 exigen secundarias que pueden describir la misma actuación. TE-03 exige Lectura secundaria incluso cuando Lectura es principal aceptable: el contrato histórico no permite exact decision en esa alternativa porque runtime excluye duplicados. Gold histórico intacto.", "",
  "## 3. Efecto del anonimizador", "",
  "Modificó seis de ocho: AG-02, MC-03, MN-03, RO-01, SE-01, TE-02. No cambió AG-01 ni TE-03. Ocultó Agarró y Encontró (verbos), También (conector), Con (preposición), Una (determinante), además de nombres correctamente neutralizados. No eliminó No en MN-03. Los placeholders pueden parecer sujetos y destruir relaciones; no tienen un único significado. No se cambió el anonimizador.", "",
  "La distorsión más clara de CLEAN está en MC-03: convierte dos sujetos en uno, atribuyendo tomar el pañuelo y molestarse a la misma niña. En otros casos reconstruye/reordena relaciones o resuelve referente singular/plural. En SE-01 conserva una frase sin verbo. No afirmar que limpiar el schema conserve automáticamente el significado.", "",
  "## 4. Cambios exactos V2.3 → V2.4", "",
  "- Prioridad por fuente/función de conducta; evitar número/material/tema como única señal.",
  "- Acción curricular clara + verbalización acompañante puede bastar, sin exigir logro, paso adicional ni acuerdo completo; conservar abstención en estados/rutinas/manipulación incidental.",
  "- Oral/Lectura: priorizar significado obtenido de soporte gráfico; relato sin uso del soporte sigue Oral. Secuencia visual no es Cantidad por número de imágenes.",
  "- Indaga/Oral: observación → explicación/pregunta → comparación/búsqueda/prueba/verificación realmente descritas. No inventar finalidad de comprobar.",
  "- Convivencia: propuesta/turno/ayuda/acción compartida observadas bastan sin exigir respuesta final; proximidad pasiva no basta.",
  "- Secundarias: instrucción adicional conservadora solo en las preguntas adicionales. No etiquetar dos veces la misma actuación; sí reconocer otra independiente.",
  "- Cantidad/Forma y representación espacial: distinguir seriación/comparación cuantitativa de ubicación/representación y de medios de una prueba de fenómeno.", "",
  "No cambiaron modelos, anonimizador, Luna CLEAN, privacidad, cantidad de solicitudes ni thresholds. El builder acepta una instrucción adicional opcional; se probó que sin ella produce exactamente los requests V2.3 anteriores. El diff literal está en `docs/last-optimization/PROMPT_DIFF.md` y el prompt completo en `config/current-v2-4-prompt.json`.", "",
  "## 5. Comprobación de THRESHOLD, antes de TEST2", "",
  "Original **0.50**; probados offline **0.50 / 0.45 / 0.40**, escala de confianza 0–1 e inclusión `>=`. Suficiencia **0.70** y secundaria **0.80** fijas. Resultados completos de los cuatro ciclos: `docs/LAST_THRESHOLD_DEV.md`; datos/procedencia: `config/last-threshold-dev.json`. No nuevas llamadas, ni lectura de TEST2 en el analizador.", "",
  "| Brazo DEV V2.3 | Threshold | Acceptable primary (204) | False abstentions | Overclassification | Wrong primary | Privacy FP/FN |",
  "|---|---:|---:|---:|---:|---:|---:|",
  ...threshold.rows.filter((r) => r.version === "V2.3").map((r) => `| ${r.arm} | ${r.threshold.toFixed(2)} | ${pct(r.acceptable_primary_accuracy)} | ${r.false_abstentions} | ${r.overclassification} | ${r.wrong_primary} | ${r.privacy_fp}/${r.privacy_fn} |`), "",
  `**Finalmente congelado: ${threshold.selected_threshold.toFixed(2)}.** ${threshold.reason}`, "",
  threshold.limitations, "",
  "## 6. TEST2 — efectividad completa", "", ...table, "",
  "Accuracy solo sobre 28 casos curriculares; exact decision sobre 40, incluyendo Privacy y abstención. Exact decision exige primaria aceptable, ninguna secundaria innecesaria y todas las secundarias requeridas. Primaria equivocada, abstención falsa y Privacy se informan separadamente. Las repeticiones fueron una, no evidencia de estabilidad. Latencia/costo por observación incluyen cuatro Privacy de costo/latencia de proveedor cero.", "",
  "TEST2_017 y TEST2_040 tienen dos principales aceptables por ambigüedad. TEST2_038 fija Cantidad principal y Oral secundaria por acciones separadas, pero el foco global de la nota larga es discutible: no usar ese único caso para afirmar mejora robusta. TEST2_039 también exige una secundaria por una negociación posterior independiente. Gold se mantiene congelado.", "",
  "### Comparaciones emparejadas", "",
  ...pairs.map((p) => `- **${p.from} → ${p.to}:** acceptable ${pct(p.acceptable_gain)} de diferencia; corrige ${p.corrects_primary.length} primarias (${p.corrects_primary.join(", ") || "ninguna"}), introduce ${p.introduces_primary.length} (${p.introduces_primary.join(", ") || "ninguna"}); mejora ${p.improves_full_decision.length} decisiones completas e introduce ${p.worsens_full_decision.length} errores completos. Costo incremental ${usd(p.cost_delta_usd)}, por 1,000 ${usd(p.cost_delta_per_1000_usd)}, latencia ${number(p.latency_delta_ms)} ms.`), "",
  "Las diferencias de accuracy anteriores son puntos porcentuales, no incremento relativo. V2.4 frente a V2.3 corrige una abstención de primaria, pero pierde una secundaria en otro caso: exact decision queda empatado en 39/40. La mejora específica de V2.4 depende de un único caso y no establece superioridad robusta sobre V2.3. V2.3 conserva una relación costo/efectividad competitiva. El 28/28 de V2.4 es un resultado de esta muestra, no promesa de 100% en uso real.", "",
  "## 7. Costos, usage y latencia", "",
  `Desembolso medido/calculado combinado de esta única corrida: **${usd(result.physical.total_cost_usd)}**. Subtotal conocido ${usd(result.physical.known_cost_subtotal_usd)}; **${result.physical.unknown_cost_calls}** llamadas sin costo. **${result.physical.attempts}** intentos físicos, máximo congelado 360; cuatro Privacy ahorran 36 intentos. Sin pruebas pagadas extra ni doble conteo de Luna.`, "",
  "Jev: preferencia por `usage.cost` real; fallback tarifario queda identificado por separado. Luna: usage real × tarifa congelada, costo estimado tarifario, no factura confirmada. Tarifas centralizadas sin cambios: Luna entrada US$0.10/M, cache US$0.01/M, cache-write US$0.125/M, salida US$0.50/M; Jev fallback entrada US$0.042/M y salida US$0/M. Tarifas consultadas en septiembre, no verificación de precio actual. Tokens de reasoning incluidos en salida, no se facturan dos veces.", "",
  "| Método | Jev proveedor | Jev tarifa fallback | Luna tarifa/usage real | Total | Costo/obs | Costo/1000 | Latencia ms |", "|---|---:|---:|---:|---:|---:|---:|---:|",
  ...LAST_ARMS.map((arm) => `| ${arm} | ${usd(analyses[arm].jev_provider_cost_usd)} | ${usd(analyses[arm].jev_tariff_cost_usd)} | ${usd(analyses[arm].luna_cost_usd)} | ${usd(summaries[arm].cost_usd)} | ${usd(summaries[arm].cost_per_observation_usd)} | ${usd(summaries[arm].cost_per_1000_usd)} | ${number(summaries[arm].latency_average_ms)} |`), "",
  "| Método | Llamadas Jev | Jev tokens entrada/salida | Llamadas Luna | Luna entrada/salida/reasoning/cache | Costo por primaria aceptable | Costo por clasificación completa correcta |",
  "|---|---:|---:|---:|---:|---:|---:|",
  ...LAST_ARMS.map((arm) => { const x = analyses[arm], t = x.tokens; return `| ${arm} | ${rows.reduce((n, r) => n + r.arms[arm].calls.length, 0)} | ${t.jev.input_tokens.measured}/${t.jev.output_tokens.measured} | ${rows.filter((r) => r.arms[arm].luna).length} | ${t.luna.input_tokens.measured}/${t.luna.output_tokens.measured}/${t.luna.reasoning_tokens.measured}/${t.luna.cached_input_tokens.measured} | ${correct(arm) && x.summary.cost_usd != null ? usd(x.summary.cost_usd / correct(arm)) : "—"} | ${usd(x.summary.cost_per_correct_classification_usd)} |`; }), "",
  `Añadir CLEAN a V2.4: costo ${c.cost_usd && d.cost_usd != null ? pct((d.cost_usd - c.cost_usd) / c.cost_usd) : "desconocido"}, incremento ${usd(cleanPair.cost_delta_per_1000_usd)}/1,000 y ${number(cleanPair.latency_delta_ms)} ms/obs. Costo incremental por primaria corregida ${cleanPair.corrects_primary.length && cleanPair.cost_delta_usd != null ? usd(cleanPair.cost_delta_usd / cleanPair.corrects_primary.length) : "no definido: ninguna primaria corregida o costo desconocido"}. Ganancia de accuracy por US$1 incremental en lote de 1,000: ${cleanPair.cost_delta_per_1000_usd > 0 ? number(cleanPair.acceptable_gain * 100 / cleanPair.cost_delta_per_1000_usd) + " puntos porcentuales" : "no definida"}; normalización descriptiva, no promesa de mejora lineal al gastar.`, "",
  "### Extrapolación mensual", "",
  "Proyección de consumo, no factura mensual. Mantiene mezcla TEST2 (10% Privacy) y costo Luna tarifario; no incluye hosting, BD, almacenamiento, impuestos ni operaciones ajenas al clasificador.", "",
  "| Profesoras | Obs/día | Obs/mes (20 días) | V1 RAW | V2.3 RAW | V2.4 RAW | V2.4 CLEAN |", "|---:|---:|---:|---:|---:|---:|---:|",
  ...[10, 20, 40].flatMap((daily) => [1, 10, 50, 100].map((teachers) => `| ${teachers} | ${daily} | ${teachers * daily * 20} | ${LAST_ARMS.map((arm) => usd(summaries[arm].cost_per_observation_usd == null ? null : summaries[arm].cost_per_observation_usd * teachers * daily * 20)).join(" | ")} |`)), "",
  "## 8. Errores restantes", "",
  ...LAST_ARMS.flatMap((arm) => ["### " + arm, "", ...(analyses[arm].errors.length ? analyses[arm].errors.map((e) => `- **${e.id}**: ${e.types.join(", ")}. Gold ${JSON.stringify(e.gold)}; salida ${JSON.stringify(e.response)}. ${e.reason ?? "V1 no genera reason; revisar payload y probabilidades."}`) : ["Ninguno según gold congelado."]), ""]),
  "Cada error conserva la observación original/anonimizada/CLEAN y las solicitudes completas en resultados locales. Tabla de 40 y fichas completas: `docs/last-optimization/ALL_40_CASES.md`. No se repararon errores después de la corrida.", "",
  "## 9. ¿Vale la pena Luna?", "",
  cleanMaterial ? "CLEAN presenta ganancia en más de un caso bajo controles previamente definidos; puede considerarse solo para prueba supervisada y con revisión de fidelidad, costo y latencia." : "RAW es preferible entre V2.4: CLEAN no demuestra ganancia material bajo el criterio previo, o introduce regresiones. Una corrección aislada no justifica seleccionar automáticamente CLEAN por un porcentaje que depende de pocos casos.", "",
  "En TEST2_017 CLEAN deja alta suficiencia (0.94), pero reparte la elección entre Arte y Motricidad; Motricidad también está aceptada en gold, y confianza 0.48 produce abstención. TEST2_039 enfrenta Escritura/Convivencia, con suficiencia 0.96 y confianza 0.46; CLEAN restituye el conector temporal, pero la salida vuelve a abstenerse. Es una sola respuesta por brazo: no se puede separar efecto del texto de variación del proveedor ni convertirlo en una ley general sobre Luna. No se simulan nuevos thresholds sobre TEST2 para escoger otro valor.", "",
  `Grounding literal falló en ${rows.filter((r) => r.arms[D].primary && r.arms[D].evidence_grounded === false).length} sugerencias CLEAN frente a ${rows.filter((r) => r.arms[C].primary && r.arms[C].evidence_grounded === false).length} RAW. Esto mide alineación lexical de la cita, no fidelidad semántica: reescrituras correctas también pueden fallar. El campo evidence queda vacío cuando no se alinea; no cambia la clasificación.`, "",
  `Primarias corregidas por CLEAN: ${cleanPair.corrects_primary.join(", ") || "ninguna"}; introducidas: ${cleanPair.introduces_primary.join(", ") || "ninguna"}. Decisiones completas mejoradas: ${cleanPair.improves_full_decision.join(", ") || "ninguna"}; empeoradas: ${cleanPair.worsens_full_decision.join(", ") || "ninguna"}. SAME significa misma corrección global, no necesariamente etiquetas idénticas.`, "",
  "## 10. Recomendación final", "",
  `**${recommendation}**`, "",
  `Criterio previamente congelado: al menos dos primarias aceptables más que V1, falsas abstenciones no superiores, sin aumento de sobreclasificación ni secundarias incorrectas, Privacy FP/FN cero y sin fallos de proveedor. V2.4 RAW: **${passes(C) ? "cumple" : "no cumple"}**; V2.4 CLEAN: **${passes(D) ? "cumple" : "no cumple"}**. Criterio exploratorio de decisión, no significancia estadística ni validación oficial MINEDU.`, "",
  "La recomendación considera efectividad, errores, ambigüedad del gold y fidelidad del input antes del costo. No se propone otra versión ni ajuste de threshold. El programa queda para revisión manual. Para integrar se necesitaría autorización posterior y validación docente; no se realizó integración.", "",
  "## 11. Trazabilidad y validación", "",
  `${allRequests.length} cuerpos guardados y verificados sin expected/gold/acceptable/ID del caso; etiquetas solo en scoring offline. Cuatro Privacy ficticios bloqueados antes de proveedores en los cuatro brazos. La validación cubre estos formatos de identificador, no sensibilidad universal. Fuentes, prompt, tarifas, gold y threshold verificadas por SHA después de TEST2.`, "",
  "Antes de la corrida pasaron 62/62 pruebas, lint, build y syntax/typecheck de 76 archivos JavaScript. Typecheck local es comprobación de sintaxis, no análisis TypeScript. La suite usa fetch simulado: no agrega llamadas pagadas. Los archivos nuevos quedan solo en el experimento. Commit final y comprobación de working tree se registran al cerrar.", ""];
await writeFile(path.join(root, "LAST_OPTIMIZATION_FINAL.md"), lines.join("\n") + "\n");

const cases = ["# TEST2 — 40 casos completos", "", `Gold congelado SHA-256 ${prepared.dataset.fingerprint}. Una repetición, sin reajuste posterior.`, "",
  "| ID | Expected | V1 RAW | V2.3 RAW | V2.4 RAW | V2.4 CLEAN | CLEAN vs RAW |", "|---|---|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.id} | ${r.expected.should_privacy_block ? "PRIVACY" : r.expected.should_abstain ? "ABSTAIN" : [r.expected.primary, ...r.expected.acceptable_secondary].join(" + ")} | ${LAST_ARMS.map((a) => predicted(r.arms[a])).join(" | ")} | ${compareCase(r.arms[C], r.arms[D])} |`), ""];
for (const r of rows) {
  cases.push(`## ${r.id}`, "", `Original: ${r.raw_observation}`, "", `Anonimizada: ${r.sanitized_observation ?? "bloqueada"}`, "",
    `CLEAN: ${r.arms[D].luna?.clean_observation ?? "no se llama: Privacy"}`, "", "Gold:", "```json", JSON.stringify(r.expected, null, 2), "```", "");
  for (const arm of LAST_ARMS) {
    const o = r.arms[arm], types = analyses[arm].errors.find((e) => e.id === r.id)?.types ?? [];
    cases.push(`### ${arm}`, "", `Final: ${predicted(o)} (${o.status}). Errores: ${types.join(", ") || "ninguno"}.`, "",
      `Evidence seleccionada: ${o.selected_evidence_before_grounding ?? "V1 no genera evidencia"}`, "",
      `Evidence grounded: ${o.explanation?.evidence ?? "—"}. Reason: ${o.explanation?.reason ?? "V1 no genera reason; ver probabilidades guardadas"}`, "",
      `Confianza: ${o.raw_result?.primary?.answers?.competency?.confidence ?? o.calls.find((c) => c.answers?.competency)?.answers?.competency?.confidence ?? "—"}; suficiencia: ${o.raw_result?.primary?.answers?.evidence_sufficient?.noul ?? o.calls.find((c) => c.answers?.competency)?.answers?.evidence_sufficient?.noul ?? "—"}. Costo ${usd(o.total_cost_usd)}; latencia ${o.total_latency_ms} ms.`, "");
  }
}
await writeFile(path.join(directory, "ALL_40_CASES.md"), cases.join("\n") + "\n");
const original = prepared.oldPrompt, modified = prepared.prompt;
const changes = ["# Diff literal de prompt V2.3 → V2.4", "", "Cambios congelados antes de TEST2, sin edición posterior.", ""];
for (const key of [...new Set([...Object.keys(original), ...Object.keys(modified)])]) {
  if (JSON.stringify(original[key]) === JSON.stringify(modified[key])) continue;
  changes.push(`## ${key}`, "", "Anterior:", "```json", JSON.stringify(original[key] ?? null, null, 2), "```", "",
    "V2.4:", "```json", JSON.stringify(modified[key], null, 2), "```", "");
}
await writeFile(path.join(directory, "PROMPT_DIFF.md"), changes.join("\n") + "\n");
await writeFile(path.join(lock.directory, "report-sha256.json"), JSON.stringify({
  report_sha256: createHash("sha256").update(lines.join("\n") + "\n").digest("hex"),
  source_sha256: prepared.sources, prompt_sha256: prepared.freeze.prompt_sha256, dataset_sha256: prepared.dataset.fingerprint,
}, null, 2) + "\n");
console.log(JSON.stringify({ stage: "report_written", preferred, recommendation, criteria: closed.passes_predeclared_criteria,
  summaries, pairs, physical: result.physical }));
