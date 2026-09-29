import { assertNoBenchmarkLabels } from "./luna-inference-boundary.mjs";

const PROMPT = `Eres un asistente que ayuda a una docente de Educación Inicial del Perú a ordenar observaciones dictadas durante su jornada.
Tu función NO es evaluar al niño ni identificar competencias curriculares.
Recibirás edad cuando exista, tipo de registro, contexto o actividad cuando exista y transcripción literal.
1. Convierte la transcripción en una observación breve, clara y natural.
2. Conserva únicamente hechos, acciones, expresiones y situaciones presentes en la transcripción.
3. Elimina muletillas, repeticiones y errores del dictado sin cambiar el significado.
4. Mantén entre comillas expresiones relevantes dichas por el niño.
5. Conserva incertidumbres como "creo", "parecía" o "no sé si"; no las conviertas en hechos.
6. No completes información no observada ni inventes motivos, intenciones o estados internos.
7. Añade una interpretación breve solo si deriva directamente de la conducta registrada; describe qué hizo, sin evaluarlo. Si no hay información suficiente, devuelve null.
8. No menciones competencias, capacidades, estándares, desempeños, niveles AD/A/B/C ni terminología curricular.
9. No decidas si la observación es buena o mala.
Devuelve exclusivamente JSON estructurado.`;

const SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    clean_observation: { type: "string" },
    brief_interpretation: { type: ["string", "null"] },
    uncertainty: { type: ["string", "null"] },
  },
  required: ["clean_observation", "brief_interpretation", "uncertainty"],
};

export function lunaRequest(input) {
  const safe = {
    ...(input.age != null ? { age: input.age } : {}),
    type: input.type,
    ...(input.context ? { context: input.context } : {}),
    observation: input.observation,
  };
  return assertNoBenchmarkLabels({
    model: "gpt-6-luna", reasoning: { effort: "low" }, store: false, max_output_tokens: 2048,
    input: [
      { role: "system", content: PROMPT },
      { role: "user", content: JSON.stringify(safe) },
    ],
    text: { format: { type: "json_schema", name: "teacher_observation_cleanup", strict: true, schema: SCHEMA } },
  });
}

export function lunaCost(usage, pricing) {
  if (!usage || !Number.isInteger(usage.input_tokens) || !Number.isInteger(usage.output_tokens)) return null;
  const cached = usage.cached_input_tokens ?? 0;
  const writes = usage.cache_write_tokens ?? 0;
  if (cached < 0 || writes < 0 || cached + writes > usage.input_tokens) return null;
  return ((usage.input_tokens - cached - writes) * pricing.input_usd_per_million +
    cached * pricing.cached_input_usd_per_million + writes * (pricing.cache_write_usd_per_million ?? 0) +
    usage.output_tokens * pricing.output_usd_per_million) / 1_000_000;
}

export function createLunaClient({ apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch,
  endpoint = "https://api.openai.com/v1/responses", timeoutMs = 45_000, pricing } = {}) {
  if (!pricing) throw new Error("Falta la tarifa de Luna.");
  return {
    async clean(input) {
      if (!apiKey) throw new Error("Falta OPENAI_API_KEY en el experimento.");
      const started = performance.now();
      let response;
      try {
        response = await fetchImpl(endpoint, { method: "POST", signal: AbortSignal.timeout(timeoutMs),
          headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
          body: JSON.stringify(lunaRequest(input)) });
      } catch (error) { throw new Error(error?.name === "TimeoutError" ? "Luna agotó el tiempo." : "No se pudo conectar con Luna."); }
      if (!response.ok) throw new Error(`Luna respondió HTTP ${response.status}.`);
      const body = await response.json();
      const usage = body.usage ? {
        input_tokens: body.usage.input_tokens ?? null,
        cached_input_tokens: body.usage.input_tokens_details?.cached_tokens ?? null,
        cache_write_tokens: body.usage.input_tokens_details?.cache_write_tokens ?? 0,
        output_tokens: body.usage.output_tokens ?? null,
        reasoning_tokens: body.usage.output_tokens_details?.reasoning_tokens ?? null,
        provider_usage: body.usage,
      } : null;
      const billing = { model_requested: "gpt-6-luna", model_effective: body.model ?? null,
        usage, latency_ms: Math.round(performance.now() - started), cost_usd: lunaCost(usage, pricing),
        cost_source: "price_config" };
      const invalid = (message) => { const error = new Error(message); error.billing = billing; throw error; };
      const output = body.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
      if (body.status !== "completed" || !output || !/^gpt-6-luna(?:-|$)/u.test(body.model ?? "")) invalid("Luna no devolvió texto completo del modelo pedido.");
      let value;
      try { value = JSON.parse(output); } catch { invalid("Luna devolvió JSON inválido."); }
      if (typeof value.clean_observation !== "string" || !value.clean_observation.trim() ||
        ![null, "string"].includes(value.brief_interpretation === null ? null : typeof value.brief_interpretation) ||
        ![null, "string"].includes(value.uncertainty === null ? null : typeof value.uncertainty))
        invalid("Luna devolvió campos inválidos.");
      if (Object.keys(value).sort().join(",") !== "brief_interpretation,clean_observation,uncertainty") invalid("Luna devolvió campos adicionales.");
      assertNoBenchmarkLabels(value);
      return { ...value, ...billing };
    },
  };
}

export function jevObservationFromLuna(luna) {
  return ["OBSERVACIÓN DOCENTE:", luna.clean_observation,
    ...(luna.brief_interpretation ? ["", "INTERPRETACIÓN DESCRIPTIVA (reformulación derivada de la observación):", luna.brief_interpretation] : []),
    ...(luna.uncertainty ? ["", "INCERTIDUMBRE CONSERVADA:", luna.uncertainty] : [])].join("\n");
}
