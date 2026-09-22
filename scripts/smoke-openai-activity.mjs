import { runOpenAIActivitySmoke } from "../src/lib/openai-activity-smoke.mjs";

try {
  await runOpenAIActivitySmoke();
} catch (error) {
  console.error(`Smoke test OpenAI activity falló: ${error?.message ?? "error desconocido"}`);
  process.exitCode = 1;
}
