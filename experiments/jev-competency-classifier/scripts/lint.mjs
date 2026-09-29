import { readFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { ESLint } from "eslint";

const sourceFiles = ["src/typesafe-client.mjs", "src/jev-classifier.mjs", "src/local-server.mjs", "cli/benchmark.mjs",
  "src/luna-client.mjs", "src/luna-benchmark-adapters.mjs", "src/luna-benchmark-job.mjs",
  "src/luna-benchmark-runner.mjs", "src/luna-benchmark-dataset.mjs", "src/luna-benchmark-score.mjs",
  "src/luna-inference-boundary.mjs", "cli/benchmark-luna.mjs", "public/benchmark.js"];
const forbidden = [/console\.log\([^)]*TYPESAFE_API_KEY/, /authorization:\s*["'`]Bearer\s+[A-Za-z0-9]/, /apiKey:\s*["'`][^"'`]/];
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
const results = await eslint.lintFiles([...sourceFiles, "tests/luna-benchmark.test.mjs"]);
const formatter = await eslint.loadFormatter("stylish");
const output = formatter.format(results);
if (output) console.log(output);
if (results.some((result) => result.errorCount)) process.exitCode = 1;
else console.log("ESLint del experimento completado.");
