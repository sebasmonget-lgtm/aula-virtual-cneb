import { buildCriteria } from "./criteria-builder.mjs";
import { normalizeChoiceResult } from "./result.mjs";

export function createFakeClassifier({ knowledgeBase, config, responder }) {
  return {
    async classifyObservation(input) {
      const plan = buildCriteria(knowledgeBase, input, config);
      const response = await responder({ plan, input: plan.input });
      return normalizeChoiceResult({ response, plan, policy: config, classifierVersion: config.classifier_version, knowledgeBaseVersion: knowledgeBase.version, latencyMs: 1, modelRequested: "fake-jev" });
    },
  };
}
