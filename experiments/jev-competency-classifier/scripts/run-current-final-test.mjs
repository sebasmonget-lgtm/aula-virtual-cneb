import { readFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { prepareCurrentDev } from "../src/current-dev-job.mjs";
import { executeCurrentFinalTest } from "../src/current-final-test.mjs";
import { loadStudyCredentials } from "./study-credentials.mjs";
const candidate = JSON.parse(await readFile(path.join(EXPERIMENT_ROOT, "config/current-study-candidate.json"), "utf8"));
const preparedDev = await prepareCurrentDev({ dataset: "datasets/current-dev/current_dev_adjudicated.jsonl",
  adjudicationFile: "datasets/current-dev/current_dev_adjudication.json", runs: 3 });
await loadStudyCredentials();
const result = await executeCurrentFinalTest({ candidate, preparedDev,
  testFile: path.join(EXPERIMENT_ROOT, "datasets/luna-benchmark/ayni_jev_gold_v1.jsonl"),
  lockFile: path.join(EXPERIMENT_ROOT, "results/current-study-final-test.lock.json"),
  onProgress: (progress) => console.log(JSON.stringify(progress)) });
console.log(JSON.stringify({ directory: result.directory, status: result.status, summary: result.analysis.summary }));
if (result.status !== "completed") process.exitCode = 1;
