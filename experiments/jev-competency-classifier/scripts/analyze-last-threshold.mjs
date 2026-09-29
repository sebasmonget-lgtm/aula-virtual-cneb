import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { scoreOutcome, summarizeArm } from "../src/luna-benchmark-score.mjs";

// Only stored DEV outputs. Never reads TEST1/TEST2 or calls providers.
const index = JSON.parse(await readFile(path.join(EXPERIMENT_ROOT, "config/current-study-index.json"), "utf8"));
const thresholds = [.50, .45, .40], rows = [], provenance = [];
for (const cycle of index.cycles) {
  const bytes = await readFile(path.join(cycle.directory, "raw-results.json"), "utf8");
  const raw = JSON.parse(bytes);
  provenance.push({ version: cycle.version, file: path.join(cycle.directory, "raw-results.json"),
    sha256: createHash("sha256").update(bytes).digest("hex"), dataset_sha256: raw.metadata.dataset_sha256 });
  for (const arm of ["CURRENT_V2_RAW", "CURRENT_V2_LUNA_CLEAN"]) {
    const observations = raw.results.flatMap((run) => run.cases.map((c) => ({ run: run.number, ...c, outcome: c.arms[arm] })));
    for (const threshold of thresholds) {
      const missing = [], changed = [];
      const simulated = observations.map((row) => {
        const stored = row.outcome;
        if (stored.status === "privacy_blocked" || stored.status === "classification_failed") {
          if (stored.status === "classification_failed") missing.push({ id: row.id, run: row.run, reason: "provider_failure_no_complete_answers" });
          return { ...row, score: scoreOutcome(row.expected, stored) };
        }
        const answers = stored.raw_result?.primary?.answers, addition = stored.raw_result?.additional?.answers;
        if (!Number.isFinite(answers?.competency?.confidence) || !Number.isFinite(answers?.evidence_sufficient?.noul)) throw new Error("DEV no permite replay completo de un resultado válido.");
        const primary = answers.competency.choice !== "NO_CLASIFICABLE" && answers.competency.confidence >= threshold && answers.evidence_sufficient.noul >= .70 ? answers.competency.choice : null;
        const additional = primary && addition?.evidence_sufficient?.noul >= .70 ? Object.keys(addition)
          .filter((id) => id !== "evidence_sufficient" && id !== primary && addition[id].noul >= .80)
          .sort((a, b) => addition[b].noul - addition[a].noul || a.localeCompare(b)).slice(0, 3) : [];
        const outcome = { ...stored, primary, additional, status: primary ? "review" : "unclassified" };
        if (threshold === .50 && (primary !== stored.primary || JSON.stringify(additional) !== JSON.stringify(stored.additional))) throw new Error("Replay .50 no reproduce original.");
        const score = scoreOutcome(row.expected, outcome);
        if (primary !== stored.primary) changed.push({ id: row.id, run: row.run, confidence: answers.competency.confidence,
          sufficiency: answers.evidence_sufficient.noul, new_primary: primary, acceptable: score.acceptable_primary_correct });
        return { ...row, outcome, score };
      });
      const summary = summarizeArm(simulated);
      rows.push({ version: cycle.version, arm, threshold, eligible_primary_observations: summary.denominators.classified,
        acceptable_primary_accuracy: summary.acceptable_primary_accuracy, false_abstentions: summary.false_abstentions,
        overclassification: summary.missed_abstentions_overclassification,
        wrong_primary: simulated.filter((r) => !r.expected.should_abstain && !r.expected.should_privacy_block && r.outcome.primary && !r.score.acceptable_primary_correct).length,
        privacy_fp: summary.privacy_false_positives, privacy_fn: summary.missed_privacy_blocks, provider_failures: summary.provider_failures,
        missing_answers: missing, changed_cases: changed });
    }
  }
}
const current = rows.filter((r) => r.version === "V2.3");
const originals = current.filter((r) => r.threshold === .5);
const candidates = [.45, .40].filter((t) => {
  const alternative = current.filter((r) => r.threshold === t);
  return alternative.some((r, i) => r.acceptable_primary_accuracy > originals[i].acceptable_primary_accuracy) &&
    alternative.every((r, i) => r.wrong_primary <= originals[i].wrong_primary && r.overclassification <= originals[i].overclassification &&
      r.false_abstentions <= originals[i].false_abstentions && r.privacy_fp === originals[i].privacy_fp && r.privacy_fn === originals[i].privacy_fn);
});
const selected = candidates[0] ?? .5;
const report = { created_at: new Date().toISOString(), scope: "stored_DEV_only_no_TEST_reads_no_provider_calls", provider_calls: 0,
  original_threshold: .5, tested_thresholds: thresholds, scale: "confidence 0–1, inclusive >=", fixed_sufficiency_threshold: .7,
  fixed_secondary_threshold: .8, selected_threshold: selected, alternative_thresholds_selected: selected === .5 ? 0 : 1,
  decision_basis: "V2.3 RAW and CLEAN are the immediately preceding version; older versions provide sensitivity, not pooled independent observations.",
  reason: selected === .5 ? "En V2.3 RAW y CLEAN, .45 y .40 reproducen exactamente las decisiones de .50. Todas las falsas abstenciones restantes tienen confianza .95–.96 y suficiencia .61–.63: el gate activo es suficiencia .70, no confianza. No hay beneficio DEV que justifique bajar confianza. En V2 inicial reducir confidence también habilita primarias incorrectas; no usar TEST1 para contradecir la elección DEV." : "Mayor threshold alternativo de los dos con ganancia en V2.3 sin aumentos de errores; congelado antes de TEST2.",
  limitations: "Replay condicional a outputs ya guardados, no estima cómo cambiará la distribución de confianza al modificar el prompt V2.4. DEV reutilizado y próximo al techo; repeticiones no son casos independientes. No variar suficiencia porque no está autorizado en esta comprobación.", provenance, rows };
await writeFile(path.join(EXPERIMENT_ROOT, "config/last-threshold-dev.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const lines = ["# Threshold — simulación offline DEV", "", report.reason, "", report.limitations, "",
  "Original: 0.50. Probados: 0.50, 0.45, 0.40. Seleccionado: " + selected.toFixed(2) + ". Suficiencia 0.70 y secundaria 0.80 sin cambios. Escala 0–1, comparación inclusiva. Cero llamadas.", "",
  "| Versión | Brazo | Threshold | Acceptable primary | Falsas abstenciones | Sobreclasificación | Primaria incorrecta | Privacy FP/FN | Fallos proveedor |",
  "|---|---|---:|---:|---:|---:|---:|---:|---:|",
  ...rows.map((r) => `| ${r.version} | ${r.arm} | ${r.threshold.toFixed(2)} | ${(r.acceptable_primary_accuracy * 100).toFixed(2)}% | ${r.false_abstentions} | ${r.overclassification} | ${r.wrong_primary} | ${r.privacy_fp}/${r.privacy_fn} | ${r.provider_failures} |`), "",
  "Denominador curricular por fila: 204 (68 casos × 3). Sobreclasificaciones: 24 oportunidades (8 × 3); Privacy: 12 positivos y 228 negativos. Cuatro ciclos comparten los mismos 80 casos, no 320 independientes. V2.1 RAW tiene un fallo sin respuesta principal; se conserva como fallo, no se inventa confianza ni resultado. Replay original .50 se valida contra cada resultado existente.", "",
  "## Cambios al bajar threshold", "",
  ...rows.filter((r) => r.changed_cases.length).map((r) => `- ${r.version}/${r.arm}/${r.threshold}: ${r.changed_cases.map((c) => `${c.id} r${c.run} → ${c.new_primary} (${c.acceptable ? "aceptable" : "incorrecta"})`).join("; ")}.`), ""];
await writeFile(path.join(EXPERIMENT_ROOT, "docs/LAST_THRESHOLD_DEV.md"), lines.join("\n") + "\n", { flag: "wx" });
console.log(JSON.stringify({ original: .5, simulated: thresholds, selected, current, provider_calls: 0 }));
