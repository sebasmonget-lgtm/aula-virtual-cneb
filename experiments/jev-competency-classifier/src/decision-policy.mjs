import { NO_CLASSIFIABLE_ID } from "./constants.mjs";
import { assert, isFiniteProbability } from "./validation.mjs";

export function rankedProbabilities(probabilities) { return Object.entries(probabilities).sort(([, left], [, right]) => right - left || 0); }
export function summarizeChoice({ choice, confidence, probabilities, optionIds }) {
  assert(optionIds.has(choice), "La API devolvió una opción no enviada."); assert(isFiniteProbability(confidence), "La API devolvió confidence inválido.");
  assert(JSON.stringify(Object.keys(probabilities).sort()) === JSON.stringify([...optionIds].sort()), "La API no devolvió las probabilidades esperadas.");
  for (const value of Object.values(probabilities)) assert(isFiniteProbability(value), "La API devolvió una probabilidad inválida.");
  const sum = Object.values(probabilities).reduce((total, value) => total + value, 0); assert(Math.abs(sum - 1) <= 0.02, "Las probabilidades no suman aproximadamente uno.");
  const ranked = rankedProbabilities(probabilities); assert(ranked[0][0] === choice, "La opción elegida no coincide con la mayor probabilidad.");
  const [top1Id, top1Probability] = ranked[0]; const [top2Id, top2Probability] = ranked[1] ?? [null, 0];
  return { choice: top1Id, confidence, probabilities, top1_probability: top1Probability, top2_id: top2Id, top2_probability: top2Probability, top1_top2_margin: top1Probability - top2Probability, unclassifiable_probability: probabilities[NO_CLASSIFIABLE_ID] ?? 0 };
}
export function decideClassification(choice, policy) {
  if (choice.choice === NO_CLASSIFIABLE_ID) return { status: "unclassified", primary_competency_id: null, proposed_competency_id: null };
  if (choice.confidence >= policy.auto_accept_threshold && choice.top1_top2_margin >= policy.minimum_margin && choice.unclassifiable_probability <= policy.maximum_unclassifiable_probability_for_auto_accept) return { status: "classified", primary_competency_id: choice.choice, proposed_competency_id: choice.choice };
  if (choice.confidence >= policy.review_threshold) return { status: "review", primary_competency_id: null, proposed_competency_id: choice.choice };
  return { status: "unclassified", primary_competency_id: null, proposed_competency_id: null };
}
