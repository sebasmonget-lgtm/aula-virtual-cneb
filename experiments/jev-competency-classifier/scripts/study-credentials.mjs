import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
export async function loadStudyCredentials() {
  if (process.env.AYNI_STUDY_ENV_FILE) {
    const values = parseEnv(await readFile(process.env.AYNI_STUDY_ENV_FILE, "utf8"));
    for (const key of ["OPENAI_API_KEY", "OPENROUTER_API_KEY"]) if (!process.env[key] && values[key]) process.env[key] = values[key];
  }
  if (!process.env.OPENAI_API_KEY || !process.env.OPENROUTER_API_KEY) throw new Error("Credenciales locales no disponibles.");
}
