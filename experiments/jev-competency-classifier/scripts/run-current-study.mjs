import { prepareCurrentDev, executeCurrentDev } from "../src/current-dev-job.mjs";
import { loadStudyCredentials } from "./study-credentials.mjs";
const prepared = await prepareCurrentDev({ dataset: "datasets/current-dev/current_dev_adjudicated.jsonl",
  adjudicationFile: "datasets/current-dev/current_dev_adjudication.json", runs: 3 });
await loadStudyCredentials();
console.log(JSON.stringify({ stage: "start", preflight: prepared.preflight, prompt_version: prepared.prompt.version }));
const result = await executeCurrentDev(prepared, { maxLiveRequests: prepared.preflight.total_calls_max,
  onProgress: (progress) => console.log(JSON.stringify({ stage: "progress", ...progress })) });
console.log(JSON.stringify({ stage: "finished", directory: result.directory, status: result.summary.status,
  arms: Object.fromEntries(Object.entries(result.summary.arms).map(([key, arm]) => [key, {
    accuracy: arm.acceptable_primary_accuracy, false_abstentions: arm.false_abstentions,
    overclassification: arm.missed_abstentions_overclassification, failures: arm.provider_failures, cost: arm.cost_usd }])) }));
if (result.summary.status !== "completed") process.exitCode = 1;
