import { readFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { ESLint } from "eslint";

const sourceFiles = ["src/typesafe-client.mjs", "src/jev-classifier.mjs", "src/local-server.mjs", "cli/benchmark.mjs",
  "src/luna-client.mjs", "src/luna-benchmark-adapters.mjs", "src/luna-benchmark-job.mjs",
  "src/luna-benchmark-runner.mjs", "src/luna-benchmark-dataset.mjs", "src/luna-benchmark-score.mjs",
  "src/luna-inference-boundary.mjs", "src/jev-current-benchmark.mjs", "src/validation.mjs", "src/criteria-builder.mjs", "src/luna-benchmark-costs.mjs", "cli/analyze-luna-costs.mjs", "cli/benchmark-luna.mjs", "public/benchmark.js"];
const forbidden = [/console\.log\([^)]*TYPESAFE_API_KEY/, /authorization:\s*["'`]Bearer\s+[A-Za-z0-9]/, /apiKey:\s*["'`][^"'`]/];
sourceFiles.push("src/current-dev-privacy.mjs", "src/current-dev-dataset.mjs", "src/current-dev-job.mjs",
  "src/current-dev-report.mjs", "src/current-v2.mjs", "src/luna-clean-client.mjs", "cli/benchmark-current-dev.mjs",
  "scripts/create-current-dev-proposal.mjs", "public/current-dev-review.js");
sourceFiles.push("scripts/adjudicate-current-dev.mjs", "scripts/study-credentials.mjs", "scripts/run-current-study.mjs");
sourceFiles.push("src/current-study-analysis.mjs", "scripts/analyze-current-study.mjs", "src/current-final-test.mjs", "scripts/run-current-final-test.mjs");
sourceFiles.push("scripts/report-current-study.mjs");
sourceFiles.push("scripts/report-current-final.mjs");
for (const relativePath of sourceFiles) {
  const contents = await readFile(path.join(EXPERIMENT_ROOT, relativePath), "utf8");
  for (const pattern of forbidden) if (pattern.test(contents)) throw new Error(`Regla de secretos incumplida en ${relativePath}.`);
}
console.log("Lint local completado: no se detectó exposición estática de secretos.");
// The repository config intentionally ignores experiments. Check this program with its own rules.
const eslint = new ESLint({ cwd: EXPERIMENT_ROOT, overrideConfigFile: true, overrideConfig: {
  files: ["**/*.mjs", "public/*.js"],
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
  rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_" }], "no-constant-condition": "error",
    "no-dupe-keys": "error", "valid-typeof": "error" },
} });
const results = await eslint.lintFiles([...sourceFiles, "tests/*.test.mjs"]);
const formatter = await eslint.loadFormatter("stylish");
const output = formatter.format(results);
if (output) console.log(output);
if (results.some((result) => result.errorCount)) process.exitCode = 1;
else console.log("ESLint del experimento completado.");
