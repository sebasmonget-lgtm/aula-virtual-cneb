import { readFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT, NO_CLASSIFIABLE_ID } from "./constants.mjs";
import { buildCriteria } from "./criteria-builder.mjs";
import { decideClassification, summarizeChoice } from "./decision-policy.mjs";

const normalize = (value) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
export async function loadBaselineKeywords(filename = path.join(EXPERIMENT_ROOT, "config", "baseline-keywords.json")) { return JSON.parse(await readFile(filename, "utf8")); }
export function createBaselineClassifier({ knowledgeBase, config, keywordConfig }) {
  return {
    async classifyObservation(rawInput) {
      const plan = buildCriteria(knowledgeBase, rawInput, config);
      const observation = normalize(plan.input.observation);
      const scores = Object.fromEntries([...plan.optionIds].map((id) => [id, 0]));
      for (const option of plan.options) for (const keyword of keywordConfig.keywords[option.id] ?? []) if (observation.includes(normalize(keyword))) scores[option.id] += 1;
      const maximum = Math.max(...Object.values(scores));
      if (maximum === 0) scores[NO_CLASSIFIABLE_ID] = 1;
      const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
      const probabilities = Object.fromEntries(Object.entries(scores).map(([id, score]) => [id, score / total]));
      const ranked = Object.entries(probabilities).sort(([, left], [, right]) => right - left);
      const top = ranked[0][0];
      const summary = summarizeChoice({ choice: top, confidence: ranked[0][1], probabilities, optionIds: plan.optionIds });
      const decision = decideClassification(summary, config);
      return { ...decision, secondary_candidate: summary.top2_id && summary.top2_id !== NO_CLASSIFIABLE_ID ? { competency_id: summary.top2_id, probability: summary.top2_probability } : null, probabilities, model_confidence: summary.confidence, top1_probability: summary.top1_probability, top2_probability: summary.top2_probability, top1_top2_margin: summary.top1_top2_margin, unclassifiable_probability: summary.unclassifiable_probability, model_requested: "keyword-baseline", model_effective: keywordConfig.version, classifier_version: config.classifier_version, knowledge_base_version: knowledgeBase.version, criteria_fingerprint: plan.criteriaFingerprint, usage: null, latency_ms: 0, cache_hit: false };
    },
  };
}
