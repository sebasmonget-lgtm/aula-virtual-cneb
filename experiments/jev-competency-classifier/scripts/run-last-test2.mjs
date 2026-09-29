import { prepareLastTest, executeLastTest } from "../src/last-optimization.mjs";
import { loadStudyCredentials } from "./study-credentials.mjs";
const prepared = await prepareLastTest();
if (process.argv.includes("--preflight")) {
  console.log(JSON.stringify({ stage: "preflight", cases: prepared.dataset.cases.length,
    sha256: prepared.dataset.fingerprint, primary_threshold: prepared.freeze.thresholds.primary_confidence,
    max_calls: prepared.freeze.max_provider_calls, runs: 1, provider_calls: 0 }));
} else {
  await loadStudyCredentials();
  const result = await executeLastTest(prepared, { onProgress: (p) => console.log(JSON.stringify({ stage: "progress", ...p })) });
  console.log(JSON.stringify({ stage: "finished", directory: result.directory, status: result.summary.status,
    physical: result.summary.physical,
    arms: result.summary.analyses && Object.fromEntries(Object.entries(result.summary.analyses).map(([arm, a]) => [arm, a.summary])) }));
  if (result.summary.status !== "completed") process.exitCode = 1;
}
