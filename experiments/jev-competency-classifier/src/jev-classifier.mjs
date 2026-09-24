import { cacheKey, createFileCache } from "./cache.mjs";
import { buildCriteria } from "./criteria-builder.mjs";
import { failedResult, normalizeChoiceResult } from "./result.mjs";
import { createTypeSafeClient, selectJevModel, TypeSafeClientError } from "./typesafe-client.mjs";

export function createJevCompetencyClassifier({ knowledgeBase, config, apiKey = process.env.TYPESAFE_API_KEY, requestedModel = process.env.JEV_MODEL, fetchImpl, cache = createFileCache(), useCache = true } = {}) {
  const client = apiKey ? createTypeSafeClient({ apiKey, fetchImpl, timeoutMs: config.timeout_ms }) : null;
  let requested = requestedModel || null;
  let effectiveModel = requestedModel && !requestedModel.includes("latest") ? requestedModel : null;
  async function ensureModel() {
    if (requested) return requested;
    const models = await client.listModels();
    requested = selectJevModel(models, requestedModel);
    if (!requested) throw new TypeSafeClientError("model_unavailable", "La cuenta no expone un modelo Jev.");
    return requested;
  }
  return {
    async availableModels() { return client ? client.listModels() : []; },
    async classifyObservation(rawInput) {
      const plan = buildCriteria(knowledgeBase, rawInput, config);
      if (!client) return failedResult({ errorCode: "missing_key", classifierVersion: config.classifier_version, knowledgeBaseVersion: knowledgeBase.version, criteriaFingerprint: plan.criteriaFingerprint });
      let model;
      try { model = await ensureModel(); }
      catch (error) { return failedResult({ errorCode: error.code ?? "network", classifierVersion: config.classifier_version, knowledgeBaseVersion: knowledgeBase.version, criteriaFingerprint: plan.criteriaFingerprint, modelRequested: requested }); }
      const keyInput = effectiveModel ? { input: plan.input, classifier_version: config.classifier_version, knowledge_base: knowledgeBase.fingerprint, criteria: plan.criteriaFingerprint, model: effectiveModel } : null;
      const key = keyInput ? cacheKey(keyInput) : null;
      if (useCache && key) {
        const cached = await cache.get(key);
        if (cached) return { ...cached, cache_hit: true };
      }
      const started = performance.now();
      try {
        const response = await client.systemOne({ model, state: { age: plan.input.age, ...(plan.input.context ? { context: plan.input.context } : {}), observation: plan.input.observation }, questions: { competency: { type: "choice", instructions: plan.instructions, criteria: plan.criteria } } });
        const result = normalizeChoiceResult({ response, plan, policy: config, classifierVersion: config.classifier_version, knowledgeBaseVersion: knowledgeBase.version, latencyMs: Math.round(performance.now() - started), modelRequested: model });
        effectiveModel = result.model_effective ?? effectiveModel;
        if (useCache && effectiveModel) await cache.set(cacheKey({ input: plan.input, classifier_version: config.classifier_version, knowledge_base: knowledgeBase.fingerprint, criteria: plan.criteriaFingerprint, model: effectiveModel }), result);
        return result;
      } catch (error) {
        return failedResult({ errorCode: error.code ?? "invalid_response", classifierVersion: config.classifier_version, knowledgeBaseVersion: knowledgeBase.version, criteriaFingerprint: plan.criteriaFingerprint, modelRequested: model });
      }
    },
  };
}
