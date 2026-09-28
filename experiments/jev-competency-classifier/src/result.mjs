import { NO_CLASSIFIABLE_ID } from "./constants.mjs";
import { applySufficiencyGate, decideClassification, summarizeChoice } from "./decision-policy.mjs";
import { assert, isFiniteProbability } from "./validation.mjs";

export function failedResult({ errorCode, classifierVersion, knowledgeBaseVersion, criteriaFingerprint = "", modelRequested = null }) {
  return {
    status: "classification_failed", primary_competency_id: null, proposed_competency_id: null, secondary_candidate: null,
    probabilities: {}, model_confidence: null, top1_probability: null, top2_probability: null, top1_top2_margin: null,
    unclassifiable_probability: null, sufficiency_probability: null, model_requested: modelRequested, model_effective: null,
    classifier_version: classifierVersion, knowledge_base_version: knowledgeBaseVersion, criteria_fingerprint: criteriaFingerprint,
    usage: null, latency_ms: null, cache_hit: false, error_code: errorCode,
  };
}

function sufficiencyProbability(response, plan) {
  if (plan.profile !== "focused") return null;
  const answer = response?.answers?.evidence_sufficient;
  assert(answer?.type === "noul" && isFiniteProbability(answer.noul), "Jev no devolvió la pregunta de suficiencia válida.");
  return answer.noul;
}

export function normalizeChoiceResult({ response, plan, policy, classifierVersion, knowledgeBaseVersion, latencyMs, modelRequested }) {
  const answer = response?.answers?.competency;
  if (!answer || answer.type !== "choice" || !response?.usage || !Number.isInteger(response.usage.input_tokens) || !Number.isInteger(response.usage.output_tokens)) throw new Error("Respuesta Jev incompleta.");
  const summary = summarizeChoice({ choice: answer.choice, confidence: answer.confidence, probabilities: answer.probabilities, optionIds: plan.optionIds });
  const sufficiency = sufficiencyProbability(response, plan);
  const decision = applySufficiencyGate(decideClassification(summary, policy), sufficiency, policy);
  const secondary = summary.top2_id && summary.top2_id !== NO_CLASSIFIABLE_ID ? { competency_id: summary.top2_id, probability: summary.top2_probability } : null;
  return {
    ...decision, secondary_candidate: secondary, probabilities: summary.probabilities, model_confidence: summary.confidence,
    top1_probability: summary.top1_probability, top2_probability: summary.top2_probability,
    top1_top2_margin: summary.top1_top2_margin, unclassifiable_probability: summary.unclassifiable_probability, sufficiency_probability: sufficiency,
    model_requested: modelRequested, model_effective: typeof response.model === "string" ? response.model : null,
    classifier_version: classifierVersion, knowledge_base_version: knowledgeBaseVersion, criteria_fingerprint: plan.criteriaFingerprint,
    usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens, ...(Number.isFinite(response.usage.cost) ? { cost_usd: response.usage.cost } : {}) }, latency_ms: latencyMs, cache_hit: false,
  };
}

export function normalizeParallelNoulResult({ response, plan, questionIds, policy, classifierVersion, knowledgeBaseVersion, latencyMs, modelRequested }) {
  assert(response?.answers && response?.usage && Number.isInteger(response.usage.input_tokens) && Number.isInteger(response.usage.output_tokens), "Respuesta Jev incompleta.");
  const expectedIds = [...questionIds, ...(plan.profile === "focused" ? ["evidence_sufficient"] : [])];
  assert(JSON.stringify(Object.keys(response.answers).sort()) === JSON.stringify(expectedIds.sort()), "Jev no devolvió todas las respuestas noul esperadas.");
  const sufficiency = sufficiencyProbability(response, plan);
  const scores = {};
  for (const id of questionIds) {
    const answer = response.answers[id];
    assert(answer?.type === "noul" && isFiniteProbability(answer.noul), `Respuesta noul inválida para ${id}.`);
    scores[id] = answer.noul;
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const positive = ranked.filter(([, score]) => score >= (policy.noul_positive_threshold ?? 0.8)).map(([id]) => id);
  const possible = ranked.filter(([, score]) => score >= (policy.noul_review_threshold ?? 0.5)).map(([id]) => id);
  return {
    method: "parallel-noul", status: possible.length ? "review" : "unclassified",
    primary_competency_id: null, proposed_competency_id: positive[0] ?? possible[0] ?? null,
    proposed_competency_ids: positive, possible_competency_ids: possible, competency_scores: scores,
    model_confidence: null, sufficiency_probability: sufficiency, model_requested: modelRequested, model_effective: typeof response.model === "string" ? response.model : null,
    classifier_version: classifierVersion, knowledge_base_version: knowledgeBaseVersion, criteria_fingerprint: plan.criteriaFingerprint,
    usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens, ...(Number.isFinite(response.usage.cost) ? { cost_usd: response.usage.cost } : {}) },
    latency_ms: latencyMs, cache_hit: false,
  };
}

export function normalizeHybridResult(args) {
  const { response, plan, questionIds, policy } = args;
  const choice = normalizeChoiceResult(args);
  const noulAnswers = Object.fromEntries(Object.entries(response.answers).filter(([id]) => id !== "competency"));
  const parallel = normalizeParallelNoulResult({ ...args,
    response: { ...response, answers: noulAnswers }, questionIds });
  const top = Object.entries(choice.probabilities).sort((a, b) => b[1] - a[1])[0][0];
  const selected = choice.model_confidence >= (policy.hybrid_choice_review_threshold ?? 0.4) &&
    top !== NO_CLASSIFIABLE_ID ? [top] : [];
  const proposed = [...new Set([...selected, ...parallel.proposed_competency_ids])];
  return { ...choice, method: "hybrid", status: proposed.length ? "review" : "unclassified",
    primary_competency_id: null, proposed_competency_id: proposed[0] ?? null,
    proposed_competency_ids: proposed, possible_competency_ids: parallel.possible_competency_ids,
    competency_scores: parallel.competency_scores };
}
