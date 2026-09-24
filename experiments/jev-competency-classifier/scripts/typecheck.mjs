import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.filter((entry) => entry.isDirectory() && !["reports", ".cache", "dist", "node_modules"].includes(entry.name)).map((entry) => files(path.join(directory, entry.name))));
  return [...entries.filter((entry) => entry.isFile() && entry.name.endsWith(".mjs")).map((entry) => path.join(directory, entry.name)), ...nested.flat()];
}
const sourceFiles = await files(EXPERIMENT_ROOT);
for (const filename of sourceFiles) {
  const result = spawnSync(process.execPath, ["--check", filename], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Sintaxis verificada: ${sourceFiles.length} archivos.`);
