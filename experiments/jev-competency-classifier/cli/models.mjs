import { loadExperimentConfig } from "../src/config.mjs";
import { createTypeSafeClient } from "../src/typesafe-client.mjs";
import { createOpenRouterClient } from "../src/openrouter-client.mjs";
import { resolveGateway } from "../src/jev-classifier.mjs";

const gateway = resolveGateway();
const keyName = gateway === "openrouter" ? "OPENROUTER_API_KEY" : "TYPESAFE_API_KEY";
if (!process.env[keyName]) {
  console.error(`${keyName} no está configurada. Copia .env.example a .env.local y define la clave solo allí.`);
  process.exitCode = 2;
} else {
  try {
    const { classifier } = await loadExperimentConfig();
    const client = gateway === "openrouter" ? createOpenRouterClient({ apiKey: process.env.OPENROUTER_API_KEY, timeoutMs: classifier.timeout_ms }) : createTypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY, timeoutMs: classifier.timeout_ms });
    for (const model of await client.listModels()) console.log(`${model.name}\t${model.release_date}\t${model.description}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
