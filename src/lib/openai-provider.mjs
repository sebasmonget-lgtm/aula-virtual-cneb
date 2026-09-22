import OpenAI from "openai";
import { AIProvider } from "./ai-provider.mjs";

export class OpenAIProviderError extends Error {
  constructor(reason, details = {}) {
    super(`Proveedor OpenAI no disponible: ${reason}.`);
    this.name = "OpenAIProviderError";
    this.code = "OPENAI_PROVIDER_ERROR";
    this.reason = reason;
    this.details = details;
  }
}

function activityJsonSchema(schema) {
  const jsonSchema = { ...schema };
  delete jsonSchema.id;
  return jsonSchema;
}

function normalizeUsage(usage = {}) {
  return {
    input_tokens: usage.input_tokens ?? null,
    cached_input_tokens: usage.input_tokens_details?.cached_tokens ?? usage.cached_input_tokens ?? null,
    output_tokens: usage.output_tokens ?? null,
    total_tokens: usage.total_tokens ?? null,
  };
}

function includesRefusal(response) {
  return response.output?.some((item) => item.content?.some((content) => content.type === "refusal" || content.refusal)) ?? false;
}

function outputText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text;
  return response.output?.flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" && typeof content.text === "string")
    .map((content) => content.text)
    .join("") ?? "";
}

function classifyError(error) {
  if (error?.status === 401) return "authentication_failed";
  if (error?.status === 429) return "rate_limited";
  if (/timeout|timedout/i.test(error?.name ?? "") || error?.code === "ETIMEDOUT") return "timeout";
  return "provider_error";
}

export class OpenAIProvider extends AIProvider {
  constructor({ apiKey = process.env.OPENAI_API_KEY, client = null, timeoutMs = 30_000, model = null } = {}) {
    super({ id: "openai", model: null });
    this.apiKey = apiKey;
    this.client = client;
    this.timeoutMs = timeoutMs;
    this.configuredModel = model;
  }

  getClient() {
    if (!this.apiKey) throw new OpenAIProviderError("api_key_missing");
    return this.client ?? new OpenAI({ apiKey: this.apiKey, timeout: this.timeoutMs });
  }

  async generate(request) {
    const plan = request?.execution_plan;
    if (plan?.provider !== "openai" || !plan.model) {
      throw new OpenAIProviderError("execution_plan_invalid");
    }
    if (this.configuredModel && this.configuredModel !== plan.model) {
      throw new OpenAIProviderError("model_mismatch", { execution_plan_model: plan.model });
    }
    const client = this.getClient();
    let response;
    try {
      response = await client.responses.create({
        model: plan.model,
        ...(plan.reasoning_effort ? { reasoning: { effort: plan.reasoning_effort } } : {}),
        instructions: "Actúa como asistente pedagógico de Educación Inicial. Usa exclusivamente el AIContextBundle entregado; respeta constraints.must y constraints.must_not; no inventes hechos sobre estudiantes ni presentes paráfrasis semánticas como citas literales MINEDU. Respeta edad, propósito, contexto, materiales y estado de competencia. Produce únicamente el objeto requerido por el schema.",
        input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify(request.ai_context_bundle) }] }],
        text: {
          format: {
            type: "json_schema",
            name: request.output_schema.id.replace(/[^a-zA-Z0-9_]/g, "_"),
            strict: true,
            schema: activityJsonSchema(request.output_schema),
          },
        },
      }, { timeout: this.timeoutMs });
    } catch (error) {
      if (error instanceof OpenAIProviderError) throw error;
      throw new OpenAIProviderError(classifyError(error));
    }
    if (response.status === "incomplete" || response.incomplete_details) {
      throw new OpenAIProviderError("response_incomplete");
    }
    if (includesRefusal(response)) throw new OpenAIProviderError("response_refusal");
    const text = outputText(response);
    if (!text) throw new OpenAIProviderError("response_incomplete");
    let output;
    try {
      output = JSON.parse(text);
    } catch {
      throw new OpenAIProviderError("structured_output_invalid");
    }
    const actualModel = response.model ?? plan.model;
    if (actualModel !== plan.model) {
      throw new OpenAIProviderError("model_mismatch", { execution_plan_model: plan.model });
    }
    return {
      output,
      provider_metadata: {
        provider: "openai",
        model: actualModel,
        response_id: response._request_id ?? response.id ?? null,
        usage: normalizeUsage(response.usage),
      },
    };
  }
}
