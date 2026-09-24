import { loadExperimentConfig } from "../src/config.mjs";
import { createTypeSafeClient } from "../src/typesafe-client.mjs";

if (!process.env.TYPESAFE_API_KEY) {
  console.error("TYPESAFE_API_KEY no está configurada. Copia .env.example a .env.local y define la clave solo allí.");
  process.exitCode = 2;
} else {
  try {
    const { classifier } = await loadExperimentConfig();
    const client = createTypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY, timeoutMs: classifier.timeout_ms });
    for (const model of await client.listModels()) console.log(`${model.name}\t${model.release_date}\t${model.description}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
