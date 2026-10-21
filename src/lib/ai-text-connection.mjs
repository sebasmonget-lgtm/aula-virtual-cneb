/** Server-only text connection; audio credentials remain independent. */
export function resolveTextConnection(environment = process.env, model = null) {
  const profile = environment.AYNI_TEXT_API_PROFILE || "openai";
  const key = environment.AYNI_TEXT_API_KEY;
  const url = environment.AYNI_TEXT_API_BASE_URL;
  if (profile === "openai" && !key && !url) return { apiKey: environment.OPENAI_API_KEY, baseURL: undefined, custom: false };
  if (profile !== "mirai" || !key || url !== "https://api.miraiapi.com/v1") {
    throw new Error("Configuración incompleta del proveedor de texto.");
  }
  const heavyModel = ["gpt-6.1-sol", "gpt-6-sol", "gpt-6-astra"].includes(model);
  return heavyModel ? { apiKey: key, baseURL: url, custom: true }
    : { apiKey: environment.OPENAI_API_KEY, baseURL: undefined, custom: false };
}
