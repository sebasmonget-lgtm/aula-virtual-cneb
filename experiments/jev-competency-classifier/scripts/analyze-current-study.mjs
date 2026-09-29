import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { DEV_ARMS } from "../src/current-dev-report.mjs";
import { analyzeStudyArm, errorMarkdown, pairedClusterInterval } from "../src/current-study-analysis.mjs";
const directory = path.resolve(process.argv[2]);
const raw = JSON.parse(await readFile(path.join(directory, "raw-results.json"), "utf8"));
if (raw.status !== "completed" || raw.metadata.execution_mode !== "live_provider") throw new Error("Se requiere corrida viva completa.");
const version = raw.metadata.v2_prompt.version;
const destination = path.join(EXPERIMENT_ROOT, "docs/current-study", version);
await mkdir(destination, { recursive: true });
const analysis = Object.fromEntries(DEV_ARMS.map((arm) => [arm, analyzeStudyArm(raw.results, arm)]));
const pairs = Object.fromEntries([["v2_vs_v1", DEV_ARMS[0], DEV_ARMS[1]], ["clean_vs_raw", DEV_ARMS[1], DEV_ARMS[2]],
  ["interpret_vs_raw", DEV_ARMS[1], DEV_ARMS[3]], ["interpret_vs_clean", DEV_ARMS[2], DEV_ARMS[3]]]
  .map(([label, before, after]) => [label, pairedClusterInterval(raw.results, before, after)]));
for (const arm of DEV_ARMS) await writeFile(path.join(destination, arm + ".md"), errorMarkdown(version, arm, analysis[arm]), { flag: "wx" });
await writeFile(path.join(destination, "analysis.json"), JSON.stringify({ version, directory, dataset_sha256: raw.metadata.dataset_sha256, analysis, pairs }, null, 2), { flag: "wx" });
console.log(JSON.stringify({ version, destination, pairs, summary: Object.fromEntries(DEV_ARMS.map((arm) => [arm, {
  accuracy: analysis[arm].summary.acceptable_primary_accuracy, primary_unstable: analysis[arm].unstable_primary_ids,
  by_run: analysis[arm].accuracy_by_run, errors: analysis[arm].errors.length }])) }));
