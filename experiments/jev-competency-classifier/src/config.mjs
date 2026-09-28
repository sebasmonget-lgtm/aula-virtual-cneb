import { readFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "./constants.mjs";

export async function loadJsonConfig(name) {
  return JSON.parse(await readFile(path.join(EXPERIMENT_ROOT, "config", name), "utf8"));
}

export async function loadExperimentConfig() {
  const [classifier, pricing, openrouterPricing] = await Promise.all([loadJsonConfig("classifier.json"), loadJsonConfig("pricing.json"), loadJsonConfig("pricing-openrouter.json")]);
  return { classifier, pricing, openrouterPricing };
}
