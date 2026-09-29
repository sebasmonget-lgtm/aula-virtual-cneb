import { lunaRequest, lunaCost } from "./luna-client.mjs";
import { assertNoBenchmarkLabels } from "./luna-inference-boundary.mjs";

export const CLEAN_PROMPT = `Ayuda a una docente de Educación Inicial del Perú a limpiar un registro dictado.
Recibirás edad cuando exista, tipo, contexto cuando exista y la transcripción literal.
Elimina muletillas y repeticiones, ordena frases y corrige errores del dictado sin cambiar su significado.
Conserva hechos, citas relevantes e incertidumbres como "creo", "parecía" y "no sé si".
NO interpretes la conducta. NO añadas información, intenciones, motivos o estados internos.
NO menciones competencias, capacidades, estándares, desempeños, niveles ni terminología curricular.
Devuelve solo JSON con clean_observation. No incluyas interpretación, explicación ni otros campos.`;

export function lunaCleanRequest(input) {
  const request = lunaRequest(input);
  request.input[0].content = CLEAN_PROMPT;
  request.text.format = { type: "json_schema", name: "teacher_observation_clean_only", strict: true,
    schema: { type: "object", additionalProperties: false, properties: { clean_observation: { type: "string" } }, required: ["clean_observation"] } };
  return assertNoBenchmarkLabels(request);
}

export function createLunaCleanClient({ apiKey = process.env.OPENAI_API_KEY, pricing, fetchImpl = fetch, timeoutMs = 45000 }) {
  return { async clean(input) {
    if (!apiKey) throw new Error("Falta OPENAI_API_KEY.");
    const started = performance.now();
    let response;
    try { response = await fetchImpl("https://api.openai.com/v1/responses", { method: "POST", signal: AbortSignal.timeout(timeoutMs),
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify(lunaCleanRequest(input)) }); }
    catch { throw new Error("No se pudo conectar con Luna Clean."); }
    if (!response.ok) throw new Error(`Luna Clean respondió HTTP ${response.status}.`);
    const body = await response.json();
    const usage = body.usage ? { input_tokens: body.usage.input_tokens ?? null, output_tokens: body.usage.output_tokens ?? null,
      cached_input_tokens: body.usage.input_tokens_details?.cached_tokens ?? null,
      cache_write_tokens: body.usage.input_tokens_details?.cache_write_tokens ?? 0,
      reasoning_tokens: body.usage.output_tokens_details?.reasoning_tokens ?? null, provider_usage: body.usage } : null;
    const billing = { usage, latency_ms: Math.round(performance.now() - started), cost_usd: lunaCost(usage, pricing),
      cost_source: "price_config", model_requested: "gpt-6-luna", model_effective: body.model ?? null };
    const invalid = () => { const error = new Error("Luna Clean devolvió salida incompatible."); error.billing = billing; throw error; };
    const text = body.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (body.status !== "completed" || !text || !/^gpt-6-luna(?:-|$)/u.test(body.model ?? "")) invalid();
    let value; try { value = JSON.parse(text); } catch { invalid(); }
    if (!value || Object.keys(value).join(",") !== "clean_observation" || typeof value.clean_observation !== "string" || !value.clean_observation.trim()) invalid();
    assertNoBenchmarkLabels(value);
    return { ...value, ...billing };
  } };
}
