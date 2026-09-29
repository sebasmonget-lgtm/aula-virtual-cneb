import { createHash } from "node:crypto";
import { applicableCompetencyCards } from "../../../src/lib/competency-applicability.mjs";
import { createJevCompetencySuggester } from "../../../src/lib/jev-competency-suggestion.mjs";
import { createJevOpenRouterDecision } from "../../../src/lib/jev-openrouter-decision.mjs";
import { buildClassifierOptions } from "../../../src/lib/openai-competency-classifier.mjs";
import { loadKnowledgeBaseV4 } from "../../../src/lib/knowledge-base-v4.mjs";
import { createJevCompetencyClassifier } from "./jev-classifier.mjs";
import { assertNoBenchmarkLabels } from "./luna-inference-boundary.mjs";

export function jevCost(usage, pricing) {
  if (Number.isFinite(usage?.cost_usd)) return usage.cost_usd;
  if (Number.isFinite(usage?.cost)) return usage.cost;
  if (!Number.isInteger(usage?.input_tokens) || !Number.isInteger(usage?.output_tokens)) return null;
  return (usage.input_tokens * pricing.input_usd_per_million + usage.output_tokens * pricing.output_usd_per_million) / 1_000_000;
}

// Observe the original provider boundary without changing prompts, validation, thresholds or retries.
function trackedFetch(fetchImpl, calls, pricing) {
  return async (url, options) => {
    const payload = JSON.parse(options.body);
    assertNoBenchmarkLabels(payload);
    const started = performance.now();
    const call = { model_requested: payload.model, model_effective: null, usage: null,
      latency_ms: null, cost_usd: null, cost_source: "unknown", status: "pending" };
    calls.push(call);
    try {
      const response = await fetchImpl(url, options);
      call.status = response.ok ? "ok" : `http_${response.status}`;
      try {
        const body = await response.clone().json();
        call.usage = body.usage ?? null;
        call.answers = body.answers ?? null;
        call.model_effective = body.model ?? null;
        call.cost_usd = jevCost(call.usage, pricing);
        call.cost_source = Number.isFinite(call.usage?.cost) || Number.isFinite(call.usage?.cost_usd) ? "provider" : call.cost_usd != null ? "price_config" : "unknown";
      } catch { /* An invalid body still represents an attempted call with unknown billing. */ }
      return response;
    } catch (error) { call.status = "network_error"; throw error; }
    finally { call.latency_ms = Math.round(performance.now() - started); }
  };
}

export async function createBenchmarkAdapters({ config, pricing, apiKey = process.env.OPENROUTER_API_KEY,
  model = process.env.JEV_MODEL || "typesafe/jev-1.13", criteriaProfile = "focused", fetchImpl = fetch,
  loadKb = loadKnowledgeBaseV4, localKnowledgeBase } = {}) {
  if (!apiKey) throw new Error("Falta OPENROUTER_API_KEY en el experimento.");
  const kb = await loadKb();
  const experimentalKb = { version: kb.version, cards: kb.competencyCards,
    fingerprint: createHash("sha256").update(JSON.stringify(kb.competencyCards)).digest("hex") };
  const localKb = localKnowledgeBase ?? experimentalKb;
  async function local(method, input) {
    const calls = [];
    const started = performance.now();
    const classifier = createJevCompetencyClassifier({ knowledgeBase: localKb, config, gateway: "openrouter",
      method, criteriaProfile, apiKey, requestedModel: model,
      fetchImpl: trackedFetch(fetchImpl, calls, pricing), useCache: false });
    const result = await classifier.classifyObservation({ age: input.age, observation: input.observation,
      ...(input.context ? { context: input.context } : {}), applicability: input.applicability });
    const ranked = Object.entries(method === "choice" ? result.probabilities ?? {} : result.competency_scores ?? {})
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id]) => id);
    return { status: result.status, primary: method === "choice" ? result.primary_competency_id ?? result.proposed_competency_id : result.proposed_competency_ids?.[0] ?? null,
      additional: method === "choice" ? [] : result.proposed_competency_ids?.slice(1) ?? [], ranked,
      raw_result: result, error_code: result.error_code ?? null, calls,
      latency_ms: Math.round(performance.now() - started) };
  }
  return {
    metadata: { model_requested: model, kb_version: kb.version, kb_fingerprint: experimentalKb.fingerprint,
      parallel_kb_version: localKb.version, parallel_kb_fingerprint: localKb.fingerprint,
      criteria_profile: criteriaProfile, classifier_version: config.classifier_version },
    async current(input) {
      const calls = [];
      const started = performance.now();
      const client = createJevOpenRouterDecision({ apiKey, model,
        fetchImpl: trackedFetch(fetchImpl, calls, pricing), telemetry: () => {} });
      const applicable = applicableCompetencyCards(kb.competencyCards, input.age, {
        castellanoL2Applicable: input.applicability.castellano_as_second_language,
        religionApplicable: input.applicability.religion_applicable });
      const options = buildClassifierOptions(kb.competencyCards, input.age, applicable.map((card) => card.id));
      try {
        const result = await createJevCompetencySuggester({ client, loadKb: async () => kb }).classify({
          observation: input.observation, age: input.age, options });
        return { status: result.candidate_ids.length ? "review" : "unclassified", primary: result.candidate_ids[0] ?? null,
          additional: result.candidate_ids.slice(1), ranked: Object.entries(calls.find((call) => call.answers?.competency)?.answers.competency.probabilities ?? {})
            .sort((a, b) => b[1] - a[1]).map(([id]) => id),
          raw_result: result, calls, latency_ms: Math.round(performance.now() - started) };
      } catch (error) {
        return { status: "classification_failed", primary: null, additional: [], ranked: [],
          error_code: error.code ?? "invalid_response", calls, latency_ms: Math.round(performance.now() - started) };
      }
    },
    parallel: (input) => local("parallel-noul", input),
    choice: (input) => local("choice", input),
  };
}
