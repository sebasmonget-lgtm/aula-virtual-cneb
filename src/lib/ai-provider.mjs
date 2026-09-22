/** Neutral contract for any future model provider. */
export class AIProvider {
  constructor({ id = "unconfigured", model = null } = {}) {
    this.id = id;
    this.model = model;
  }

  async generate() {
    throw new Error("AIProvider requiere una implementación de generate(request).");
  }
}

/** Reads provider selection only; credentials remain external to the repository. */
export function getAIProviderConfiguration(environment = process.env) {
  return {
    provider: environment.AYNI_AI_PROVIDER ?? null,
    model: environment.AYNI_AI_MODEL ?? null,
  };
}
