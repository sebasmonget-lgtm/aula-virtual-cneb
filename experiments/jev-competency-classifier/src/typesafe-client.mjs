const API_BASE_URL = "https://api.typesafe.ai";

export class TypeSafeClientError extends Error {
  constructor(code, message) { super(message); this.name = "TypeSafeClientError"; this.code = code; }
}

function responseError(status) {
  if (status === 401 || status === 403) return new TypeSafeClientError("auth", "TypeSafe rechazó la autenticación.");
  if (status === 404) return new TypeSafeClientError("model_unavailable", "El modelo o endpoint no está disponible.");
  if (status === 429) return new TypeSafeClientError("rate_limited", "TypeSafe limitó temporalmente la solicitud.");
  if (status >= 500) return new TypeSafeClientError("server_error", "TypeSafe tuvo un error temporal.");
  return new TypeSafeClientError("invalid_response", `TypeSafe rechazó la solicitud con HTTP ${status}.`);
}

export function createTypeSafeClient({ apiKey, fetchImpl = fetch, timeoutMs = 15_000, baseUrl = API_BASE_URL } = {}) {
  if (!apiKey) throw new TypeSafeClientError("missing_key", "Falta TYPESAFE_API_KEY.");
  async function request(path, options = {}) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
        headers: { authorization: `Bearer ${apiKey}`, ...(options.body ? { "content-type": "application/json" } : {}), ...options.headers },
      });
    } catch (error) {
      if (error?.name === "TimeoutError" || error?.name === "AbortError") throw new TypeSafeClientError("timeout", "La solicitud a TypeSafe superó el tiempo límite.");
      if (error instanceof TypeSafeClientError) throw error;
      throw new TypeSafeClientError("network", "No se pudo conectar con TypeSafe.");
    }
    if (!response.ok) throw responseError(response.status);
    try { return await response.json(); }
    catch { throw new TypeSafeClientError("invalid_response", "TypeSafe devolvió una respuesta que no es JSON válido."); }
  }
  return {
    async listModels() {
      const body = await request("/v1/models");
      if (!Array.isArray(body?.models) || body.models.some((model) => typeof model?.name !== "string")) throw new TypeSafeClientError("invalid_response", "TypeSafe devolvió una lista de modelos inválida.");
      return body.models;
    },
    systemOne(payload) { return request("/v1/systemone", { method: "POST", body: JSON.stringify(payload) }); },
  };
}

export function selectJevModel(models, requestedModel) {
  if (requestedModel) return requestedModel;
  const names = models.map((model) => model.name);
  return names.includes("jev-latest") ? "jev-latest" : names.find((name) => /^jev(?:-|$)/i.test(name)) ?? null;
}
