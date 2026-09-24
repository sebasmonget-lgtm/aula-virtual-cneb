import { NO_CLASSIFIABLE_ID } from "./constants.mjs";
import { decideClassification, summarizeChoice } from "./decision-policy.mjs";

export function failedResult({ errorCode, classifierVersion, knowledgeBaseVersion, criteriaFingerprint = "", modelRequested = null }) {
  return {
    status: "classification_failed", primary_competency_id: null, proposed_competency_id: null, secondary_candidate: null,
    probabilities: {}, model_confidence: null, top1_probability: null, top2_probability: null, top1_top2_margin: null,
    unclassifiable_probability: null, model_requested: modelRequested, model_effective: null,
    classifier_version: classifierVersion, knowledge_base_version: knowledgeBaseVersion, criteria_fingerprint: criteriaFingerprint,
    usage: null, latency_ms: null, cache_hit: false, error_code: errorCode,
  };
}

export function normalizeChoiceResult({ response, plan, policy, classifierVersion, knowledgeBaseVersion, latencyMs, modelRequested }) {
  const answer = response?.answers?.competency;
  if (!answer || answer.type !== "choice" || !response?.usage || !Number.isInteger(response.usage.input_tokens) || !Number.isInteger(response.usage.output_tokens)) throw new Error("Respuesta TypeSafe incompleta.");
  const summary = summarizeChoice({ choice: answer.choice, confidence: answer.confidence, probabilities: answer.probabilities, optionIds: plan.optionIds });
  const decision = decideClassification(summary, policy);
  const secondary = summary.top2_id && summary.top2_id !== NO_CLASSIFIABLE_ID ? { competency_id: summary.top2_id, probability: summary.top2_probability } : null;
  return {
    ...decision, secondary_candidate: secondary, probabilities: summary.probabilities, model_confidence: summary.confidence,
    top1_probability: summary.top1_probability, top2_probability: summary.top2_probability,
    top1_top2_margin: summary.top1_top2_margin, unclassifiable_probability: summary.unclassifiable_probability,
    model_requested: modelRequested, model_effective: typeof response.model === "string" ? response.model : null,
    classifier_version: classifierVersion, knowledge_base_version: knowledgeBaseVersion, criteria_fingerprint: plan.criteriaFingerprint,
    usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens }, latency_ms: latencyMs, cache_hit: false,
  };
}
