import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { createCurrentV2 } from "../../experiments/jev-competency-classifier/src/current-v2.mjs";

const ROOT = path.join(process.cwd(), "experiments/jev-competency-classifier");
const PROMPT_SHA256 = "271b4b8298a5b8c2132160f7514d69c45f8f59cf686aa2a2a2edd0892cbd0867";
const SOURCE_SHA256 = "601254e3622cd26db927c465f153f2be9be9e54b27f223c5443bf3773c199d83";
export const OBSERVATION_V24_VERSION = "CURRENT_V2_4_RAW";

export function observationV24Enabled(env = process.env) {
  return env.AYNI_OBSERVATION_CLASSIFIER_V24 === "1";
}

/** Use the frozen experimental implementation and prompt byte for byte. */
export async function createObservationV24Classifier({ apiKey = process.env.OPENROUTER_API_KEY,
  fetchImpl = fetch } = {}) {
  const [promptBytes, sourceBytes, pricingBytes, kb] = await Promise.all([
    readFile(path.join(ROOT, "config/current-v2-4-prompt.json")),
    readFile(path.join(ROOT, "src/current-v2.mjs")),
    readFile(path.join(ROOT, "config/pricing-openrouter.json")), loadKnowledgeBaseV4(),
  ]);
  // Git may check text files out with CRLF on Windows; verify canonical Git LF bytes.
  const canonicalSource = sourceBytes.toString("utf8").replace(/\r\n/g, "\n");
  if (createHash("sha256").update(promptBytes).digest("hex") !== PROMPT_SHA256 ||
      createHash("sha256").update(canonicalSource).digest("hex") !== SOURCE_SHA256)
    throw new Error("V2.4 no coincide con la versión congelada.");
  const classify = createCurrentV2({ kb, prompt: JSON.parse(promptBytes), pricing: JSON.parse(pricingBytes),
    apiKey, model: "typesafe/jev-1.13", fetchImpl });
  return { async classify({ observation, age, applicability }) {
    const result = await classify({ observation, age, applicability, observable_text: observation });
    // The benchmark wrapper holds raw provider answers in memory; never return or persist them.
    return { status: result.status, primary: result.primary, additional: result.additional,
      latency_ms: result.latency_ms, error_code: result.error_code ?? null, provider_calls: result.calls?.length??0 };
  } };
}
