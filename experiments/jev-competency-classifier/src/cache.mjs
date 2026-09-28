import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "./constants.mjs";

const stable = (value) => JSON.stringify(value, (_key, current) => current && !Array.isArray(current) && typeof current === "object" ? Object.fromEntries(Object.entries(current).sort(([left], [right]) => left.localeCompare(right))) : current);
export function cacheKey(value) { return createHash("sha256").update(stable(value)).digest("hex"); }

export function createFileCache({ directory = path.join(EXPERIMENT_ROOT, ".cache") } = {}) {
  const filename = (key) => path.join(directory, `${key}.json`);
  return {
    async get(key) {
      try { return JSON.parse(await readFile(filename(key), "utf8")); }
      catch (error) { if (error.code === "ENOENT") return null; throw error; }
    },
    async set(key, value) {
      await mkdir(directory, { recursive: true });
      await writeFile(filename(key), JSON.stringify(value), "utf8");
    },
  };
}
