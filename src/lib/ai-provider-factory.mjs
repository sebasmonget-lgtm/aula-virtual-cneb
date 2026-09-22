import { OpenAIProvider } from "./openai-provider.mjs";

export class AIProviderFactoryError extends Error {
  constructor(reason, details = {}) {
    super(`Factory de proveedores de IA inválido: ${reason}.`);
    this.name = "AIProviderFactoryError";
    this.code = "AI_PROVIDER_FACTORY_ERROR";
    this.reason = reason;
    this.details = details;
  }
}

/** Creates only the provider specified by an already resolved execution plan. */
export function createAIProviderForPlan(executionPlan, options = {}) {
  if (!executionPlan || typeof executionPlan !== "object") {
    throw new AIProviderFactoryError("execution_plan_required");
  }
  if (executionPlan.execution === "code") return null;
  if (executionPlan.provider === "openai") {
    if (!executionPlan.model) throw new AIProviderFactoryError("execution_plan_model_required");
    return new OpenAIProvider({
      apiKey: options.apiKey,
      client: options.client,
      timeoutMs: options.timeoutMs,
      model: executionPlan.model,
    });
  }
  throw new AIProviderFactoryError("provider_not_implemented", { provider: executionPlan.provider });
}
