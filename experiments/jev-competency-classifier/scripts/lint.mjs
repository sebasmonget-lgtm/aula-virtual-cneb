import { readFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";

const sourceFiles = ["src/typesafe-client.mjs", "src/jev-classifier.mjs", "src/local-server.mjs", "cli/benchmark.mjs"];
const forbidden = [/console\.log\([^)]*TYPESAFE_API_KEY/, /authorization:\s*["'`]Bearer\s+[A-Za-z0-9]/, /apiKey:\s*["'`][^"'`]/];
for (const relativePath of sourceFiles) {
  const contents = await readFile(path.join(EXPERIMENT_ROOT, relativePath), "utf8");
  for (const pattern of forbidden) if (pattern.test(contents)) throw new Error(`Regla de secretos incumplida en ${relativePath}.`);
}
console.log("Lint local completado: no se detectó exposición estática de secretos.");
