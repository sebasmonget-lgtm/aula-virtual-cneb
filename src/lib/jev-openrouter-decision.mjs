import { recordAiUsage } from "./ai-usage-service.mjs";

const ENDPOINT = "https://openrouter.ai/api/alpha/decisions";
const DEFAULT_MODEL = "typesafe/jev-1.13";
const MODEL_ID = /^typesafe\/jev-\d+(?:\.\d+){1,2}$/u;
const SAFE_ID = /^[A-Za-z0-9_-]{1,100}$/u;

export class JevDecisionError extends Error {
  constructor(code) { super(`Jev decision failed: ${code}`); this.name = "JevDecisionError"; this.code = code; }
}

export function jevFeatureEnabled(feature, env = process.env) {
  const names = { competencies: "AYNI_JEV_COMPETENCIES", project_image: "AYNI_JEV_PROJECT_IMAGE",
    workshop_sheet: "AYNI_JEV_WORKSHOP_SHEET" };
  if (!Object.hasOwn(names, feature)) throw new TypeError("Unknown Jev feature.");
  return Boolean(env.OPENROUTER_API_KEY) && env.AYNI_JEV_ENABLED === "1" && env[names[feature]] === "1";
}

function validQuestion(question) {
  if (!question || !["choice", "noul"].includes(question.type) ||
      typeof question.instructions !== "string" || !question.instructions.trim()) return false;
  if (question.type === "choice") return question.criteria && typeof question.criteria === "object" &&
    !Array.isArray(question.criteria) && Object.keys(question.criteria).length >= 2 &&
    Object.keys(question.criteria).every((id) => SAFE_ID.test(id) &&
      typeof question.criteria[id] === "string" && question.criteria[id].trim());
  return question.criteria && typeof question.criteria.true === "string" &&
    typeof question.criteria.false === "string" && Object.keys(question.criteria).length === 2;
}

function validAnswer(answer, question) {
  if (answer?.type !== question.type) return false;
  if (question.type === "noul") return Object.keys(answer).sort().join(",") === "noul,type" &&
    typeof answer.noul === "number" &&
    Number.isFinite(answer.noul) && answer.noul >= 0 && answer.noul <= 1;
  const expected = Object.keys(question.criteria).sort();
  const probabilities = answer.probabilities;
  return Object.keys(answer).sort().join(",") === "choice,confidence,probabilities,type" &&
    typeof answer.choice === "string" && Object.hasOwn(question.criteria, answer.choice) &&
    typeof answer.confidence === "number" && Number.isFinite(answer.confidence) &&
    answer.confidence >= 0 && answer.confidence <= 1 && probabilities &&
    typeof probabilities === "object" && !Array.isArray(probabilities) &&
    JSON.stringify(Object.keys(probabilities).sort()) === JSON.stringify(expected) &&
    Object.values(probabilities).every((value) => typeof value === "number" && Number.isFinite(value)
      && value >= 0 && value <= 1) &&
    Math.abs(Object.values(probabilities).reduce((sum, value) => sum + value, 0) - 1) <= 0.03;
}

/** Only IDs, versions and aggregate usage leave this telemetry boundary. */
export function safeJevTelemetry({ workflow, status, modelRequested, modelEffective = null, kbVersion,
  candidateIds, usage = null, latencyMs = null, errorCode = null }, sink = console.info) {
  const event = { event: "jev_decision", workflow, status, model_requested: modelRequested,
    model_effective: modelEffective, kb_version: kbVersion,
    candidate_ids: candidateIds.filter((id) => SAFE_ID.test(id)),
    input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null,
    cost_usd: usage?.cost_usd ?? null, latency_ms: latencyMs, error_code: errorCode };
  sink(JSON.stringify(event));
}

/** Backend-only OpenRouter Decisions API adapter. No prompts or sensitive state are logged. */
export function createJevOpenRouterDecision({ apiKey = process.env.OPENROUTER_API_KEY,
  model = process.env.AYNI_JEV_MODEL || DEFAULT_MODEL, fetchImpl = fetch, timeoutMs = 10_000,
  telemetry = safeJevTelemetry, endpoint = ENDPOINT } = {}) {
  if (!MODEL_ID.test(model)) throw new JevDecisionError("unpinned_model");
  if (endpoint !== ENDPOINT && process.env.NODE_ENV !== "test") throw new JevDecisionError("invalid_endpoint");
  return {
    async decide({ workflow, state, questions, kbVersion, candidateIds }) {
      if (!apiKey) throw new JevDecisionError("missing_key");
      if (typeof state !== "string" || !state.trim() || state.length > 6_000 ||
          !questions || !Object.keys(questions).length ||
          Object.entries(questions).some(([id, question]) => !SAFE_ID.test(id) || !validQuestion(question)) ||
          !Array.isArray(candidateIds) || candidateIds.some((id) => !SAFE_ID.test(id)))
        throw new JevDecisionError("invalid_request");
      const started = performance.now();
      let status = "error", errorCode = null, modelEffective = null, usage = null;
      try {
        let response;
        try {
          response = await fetchImpl(endpoint, { method: "POST", signal: AbortSignal.timeout(timeoutMs),
            headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
            body: JSON.stringify({ model, state, questions }) });
        } catch (error) {
          throw new JevDecisionError(["TimeoutError", "AbortError"].includes(error?.name) ? "timeout" : "network");
        }
        if (!response.ok) throw new JevDecisionError(response.status === 402 ? "insufficient_credits"
          : response.status === 429 ? "rate_limited" : "provider_http");
        let body;
        try { body = await response.json(); } catch { throw new JevDecisionError("invalid_json"); }
        if (typeof body?.model !== "string" || !body.model.startsWith(`${model}-`) && body.model !== model ||
            !body.answers || typeof body.answers !== "object" || Array.isArray(body.answers) ||
            Object.keys(body.answers).length !== Object.keys(questions).length ||
            Object.entries(questions).some(([id, question]) => !validAnswer(body.answers[id], question)) ||
            !Number.isInteger(body.usage?.input_tokens) || body.usage.input_tokens < 0 ||
            !Number.isInteger(body.usage?.output_tokens) || body.usage.output_tokens < 0 ||
            (body.usage.cost != null && (!Number.isFinite(body.usage.cost) || body.usage.cost < 0)))
          throw new JevDecisionError("invalid_response");
        modelEffective = body.model;
        usage = { input_tokens: body.usage.input_tokens, output_tokens: body.usage.output_tokens,
          cost_usd: body.usage.cost ?? null };
        await recordAiUsage({ provider: "openrouter", workflow, model: modelEffective,
          inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, providerCostUsd: usage.cost_usd });
        status = "ok";
        return { answers: body.answers, metadata: { model_requested: model, model_effective: modelEffective,
          kb_version: kbVersion, candidate_ids: [...candidateIds], usage,
          latency_ms: Math.round(performance.now() - started) } };
      } catch (error) {
        errorCode = error instanceof JevDecisionError ? error.code : "unexpected";
        throw error instanceof JevDecisionError ? error : new JevDecisionError(errorCode);
      } finally {
        telemetry({ workflow, status, modelRequested: model, modelEffective, kbVersion,
          candidateIds, usage, latencyMs: Math.round(performance.now() - started), errorCode });
      }
    },
  };
}
