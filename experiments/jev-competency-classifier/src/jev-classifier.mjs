import { cacheKey, createFileCache } from "./cache.mjs";
import { buildCriteria, buildParallelNoulQuestions, buildSufficiencyQuestion } from "./criteria-builder.mjs";
import { failedResult, normalizeChoiceResult, normalizeHybridResult, normalizeParallelNoulResult } from "./result.mjs";
import { createTypeSafeClient, selectJevModel, TypeSafeClientError } from "./typesafe-client.mjs";
import { createOpenRouterClient } from "./openrouter-client.mjs";

export function resolveGateway(gateway = process.env.JEV_GATEWAY) {
  const selected = gateway || (process.env.OPENROUTER_API_KEY ? "openrouter" : "typesafe");
  if (!["openrouter", "typesafe"].includes(selected)) throw new Error("JEV_GATEWAY debe ser openrouter o typesafe.");
  return selected;
}

export function createJevCompetencyClassifier({ knowledgeBase, config, method = "choice", criteriaProfile = "compact", gateway = resolveGateway(), apiKey = gateway === "openrouter" ? process.env.OPENROUTER_API_KEY : process.env.TYPESAFE_API_KEY, requestedModel = process.env.JEV_MODEL, fetchImpl, cache = createFileCache(), useCache = true } = {}) {
  if (!["choice", "parallel-noul", "hybrid"].includes(method)) throw new Error("El método debe ser choice, parallel-noul o hybrid.");
  if (!["compact", "enriched", "focused"].includes(criteriaProfile)) throw new Error("El perfil debe ser compact, enriched o focused.");
  const client = apiKey ? gateway === "openrouter" ? createOpenRouterClient({ apiKey, fetchImpl, timeoutMs: config.timeout_ms }) : createTypeSafeClient({ apiKey, fetchImpl, timeoutMs: config.timeout_ms }) : null;
  let requested = requestedModel || (gateway === "openrouter" ? "typesafe/jev-1.13" : null);
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
      const plan = buildCriteria(knowledgeBase, rawInput, config, criteriaProfile);
      const parallel = method !== "choice" ? buildParallelNoulQuestions(plan) : null;
      const questions = { ...(parallel?.questions ?? {}), ...(method !== "parallel-noul" ?
        { competency: { type: "choice", instructions: plan.instructions, criteria: plan.criteria } } : {}),
      ...(criteriaProfile === "focused" ? { evidence_sufficient: buildSufficiencyQuestion() } : {}) };
      const criteriaFingerprint = cacheKey(questions);
      if (!client) return failedResult({ errorCode: "missing_key", classifierVersion: config.classifier_version, knowledgeBaseVersion: knowledgeBase.version, criteriaFingerprint });
      let model;
      try { model = await ensureModel(); }
      catch (error) { return failedResult({ errorCode: error.code ?? "network", classifierVersion: config.classifier_version, knowledgeBaseVersion: knowledgeBase.version, criteriaFingerprint, modelRequested: requested }); }
      const keyInput = effectiveModel ? { gateway, method, criteriaProfile, input: plan.input, classifier_version: config.classifier_version, knowledge_base: knowledgeBase.fingerprint, criteria: criteriaFingerprint, model: effectiveModel } : null;
      const key = keyInput ? cacheKey(keyInput) : null;
      if (useCache && key) {
        const cached = await cache.get(key);
        if (cached) return { ...cached, cache_hit: true };
      }
      const started = performance.now();
      try {
        const response = await client.systemOne({ model, state: { age: plan.input.age, ...(plan.input.context ? { context: plan.input.context } : {}), observation: plan.input.observation }, questions });
        const normalize = method === "hybrid" ? normalizeHybridResult : parallel ? normalizeParallelNoulResult : normalizeChoiceResult;
        const result = normalize({ response, plan, questionIds: parallel?.questionIds, policy: config, classifierVersion: config.classifier_version, knowledgeBaseVersion: knowledgeBase.version, latencyMs: Math.round(performance.now() - started), modelRequested: model });
        result.method = method;
        result.criteria_profile = criteriaProfile;
        result.criteria_fingerprint = criteriaFingerprint;
        effectiveModel = result.model_effective ?? effectiveModel;
        if (useCache && effectiveModel) await cache.set(cacheKey({ gateway, method, criteriaProfile, input: plan.input, classifier_version: config.classifier_version, knowledge_base: knowledgeBase.fingerprint, criteria: criteriaFingerprint, model: effectiveModel }), result);
        return result;
      } catch (error) {
        return failedResult({ errorCode: error.code ?? "invalid_response", classifierVersion: config.classifier_version, knowledgeBaseVersion: knowledgeBase.version, criteriaFingerprint, modelRequested: model });
      }
    },
  };
}
