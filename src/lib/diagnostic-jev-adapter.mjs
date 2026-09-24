/** Optional TypeSafe/Jev-compatible HTTP boundary. The server supplies a reviewed endpoint. */
export function createDiagnosticJevAdapter({ endpoint, apiKey, fetchImpl = fetch } = {}) {
  if (!endpoint) return null;
  const url = new URL(endpoint);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname)))
    throw new Error("El clasificador diagnóstico requiere HTTPS o localhost.");
  return {
    async classify({ plan, observation, context, age, options }) {
      if (plan.provider !== "typesafe" || plan.capability !== "decision") throw new TypeError("El plan debe ser TypeSafe/decision.");
      const response = await fetchImpl(url, { method: "POST", signal: AbortSignal.timeout(10_000),
        headers: { "content-type": "application/json", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify({ task: "diagnostic_competency_classification", schema_version: "1",
          observation, context, age, options, allowed_output: {
            primary_competency: "ID permitido o null", confidence: "número 0..1",
            optional_secondary_candidate: "ID permitido o null", needs_review: "boolean",
          } }),
      });
      if (!response.ok) throw new Error(`Clasificador no disponible: HTTP ${response.status}.`);
      return response.json();
    },
  };
}
