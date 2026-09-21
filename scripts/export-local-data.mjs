import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd());
await mkdir(path.join(root, ".local"), { recursive: true });
let response;
try {
  response = await fetch("http://127.0.0.1:8788/api/export", { signal: AbortSignal.timeout(5000) });
} catch {
  throw new Error("Inicia primero la base con npm run db:local y vuelve a exportar.");
}
if (!response.ok) throw new Error(`El servidor local rechazó la exportación (${response.status}).`);
const data = await response.json();

const outputDir = path.join(root, ".local", "exports");
await mkdir(outputDir, { recursive: true });
const timestamp = new Date().toISOString().replaceAll(":", "-").replace(".", "-");
const output = process.argv[2] ? path.resolve(process.argv[2]) : path.join(outputDir, `ayni-data-${timestamp}.json`);
await writeFile(output, JSON.stringify(data, null, 2), "utf8");
console.log(output);
