const API_BASE_URL = "https://openrouter.ai";

export class OpenRouterClientError extends Error {
  constructor(code, message) { super(message); this.name = "OpenRouterClientError"; this.code = code; }
}

function responseError(status) {
  if (status === 401 || status === 403) return new OpenRouterClientError("auth", "OpenRouter rechazó la autenticación.");
  if (status === 402) return new OpenRouterClientError("insufficient_credits", "OpenRouter indica que no hay créditos suficientes para esta solicitud.");
  if (status === 404) return new OpenRouterClientError("model_unavailable", "El modelo o endpoint de OpenRouter no está disponible.");
  if (status === 429) return new OpenRouterClientError("rate_limited", "OpenRouter limitó temporalmente la solicitud.");
  if (status >= 500) return new OpenRouterClientError("server_error", "OpenRouter tuvo un error temporal.");
  return new OpenRouterClientError("invalid_response", `OpenRouter rechazó la solicitud con HTTP ${status}.`);
}

export function createOpenRouterClient({ apiKey, fetchImpl = fetch, timeoutMs = 15_000, baseUrl = API_BASE_URL } = {}) {
  if (!apiKey) throw new OpenRouterClientError("missing_key", "Falta OPENROUTER_API_KEY.");
  async function request(endpoint, options = {}) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}${endpoint}`, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
        headers: { authorization: `Bearer ${apiKey}`, ...(options.body ? { "content-type": "application/json" } : {}) },
      });
    } catch (error) {
      if (error?.name === "TimeoutError" || error?.name === "AbortError") throw new OpenRouterClientError("timeout", "La solicitud a OpenRouter superó el tiempo límite.");
      throw new OpenRouterClientError("network", "No se pudo conectar con OpenRouter.");
    }
    if (!response.ok) throw responseError(response.status);
    try { return await response.json(); }
    catch { throw new OpenRouterClientError("invalid_response", "OpenRouter devolvió una respuesta JSON inválida."); }
  }
  return {
    async listModels() {
      const body = await request("/api/v1/models");
      if (!Array.isArray(body?.data)) throw new OpenRouterClientError("invalid_response", "OpenRouter devolvió una lista de modelos inválida.");
      return body.data.filter((model) => /^typesafe\/jev-/i.test(model?.id)).map((model) => ({ name: model.id, description: model.description ?? "", release_date: model.created ?? "" }));
    },
    systemOne(payload) { return request("/api/alpha/decisions", { method: "POST", body: JSON.stringify(payload) }); },
  };
}
