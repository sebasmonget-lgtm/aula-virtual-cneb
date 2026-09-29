import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { loadJsonConfig } from "../src/config.mjs";
import { analyzeBenchmarkCosts, costAnalysisMarkdown, monthlyCostCsv } from "../src/luna-benchmark-costs.mjs";

const filename = process.argv[2];
if (!filename || process.argv.length !== 3) throw new Error("Uso: node cli/analyze-luna-costs.mjs ruta/raw-results.json. No ejecuta llamadas.");
const source = path.resolve(filename);
const raw = JSON.parse(await readFile(source, "utf8"));
const report = analyzeBenchmarkCosts(raw, await loadJsonConfig("cost-scenarios.json"));
report.source_raw_results = source;
// Separate destination keeps previous raw data and reports immutable.
const output = path.join(path.dirname(source), `cost-review-${new Date().toISOString().replace(/[:.]/gu, "-")}-${randomBytes(3).toString("hex")}`);
await mkdir(output);
await Promise.all([
  writeFile(path.join(output, "cost-analysis.json"), JSON.stringify(report, null, 2) + "\n", "utf8"),
  writeFile(path.join(output, "cost-analysis.md"), costAnalysisMarkdown(report), "utf8"),
  writeFile(path.join(output, "monthly-costs.csv"), monthlyCostCsv(report), "utf8"),
]);
console.log(JSON.stringify({ output, physical_cost_usd: report.physical.total_usd,
  best_by_cost_per_correct_classification: report.effectiveness.lowest_cost_per_correct_classification }, null, 2));
