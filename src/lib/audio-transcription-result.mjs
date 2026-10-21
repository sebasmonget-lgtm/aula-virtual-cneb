export class AudioTranscriptionError extends Error {
  constructor(reason) {
    super(`Audio transcription rejected: ${reason}`);
    this.name = "AudioTranscriptionError";
    this.reason = reason;
  }
}

/** Accept detected Spanish, never translate or repair a rejected transcript. */
export function assertSpanishTranscript(result) {
  if (typeof result?.text !== "string" || !result.text.trim()) throw new AudioTranscriptionError("no_speech");
  if (!Array.isArray(result.languages) || !result.languages.length) throw new AudioTranscriptionError("language_unverified");
  if (!result.languages.every(item => ["es", "spa"].includes(item?.code))) throw new AudioTranscriptionError("language_not_spanish");
  const letters = result.text.match(/\p{L}/gu) ?? [];
  if (!letters.length) throw new AudioTranscriptionError("no_speech");
  // A Spanish language label must not admit an incompatible output such as Cyrillic.
  if (letters.some(letter => !/\p{Script=Latin}/u.test(letter))) throw new AudioTranscriptionError("language_not_spanish");
  if (result.text.length > 4000) throw new AudioTranscriptionError("transcript_too_long");
  return result.text;
}

const messages = Object.freeze({
  not_configured: "La transcripción no está disponible en este momento. Puedes escribir la respuesta.",
  no_speech: "No se reconoció una voz clara en español. Vuelve a grabar cerca del micrófono.",
  language_unverified: "No se pudo confirmar que el audio esté en español. Vuelve a grabar hablando con claridad.",
  language_not_spanish: "No se reconoció una transcripción en español. Vuelve a grabar tu respuesta en español.",
  transcript_too_long: "La transcripción es demasiado larga. Graba una respuesta más corta.",
  provider_timeout: "La transcripción tardó demasiado. Puedes reintentar con la misma grabación.",
  provider_busy: "El servicio de transcripción está ocupado. Espera un momento y reintenta.",
  provider_unavailable: "El servicio de transcripción no está disponible. Puedes reintentarlo más tarde.",
  provider_rejected_audio: "El servicio no pudo leer esta grabación. Vuelve a grabar tu respuesta.",
  provider_error: "No se pudo transcribir el audio. Puedes reintentarlo o escribir la respuesta.",
});
const validationMessages = new Set([
  "El propósito de la grabación no es válido.", "El audio debe tener un formato admitido y pesar como máximo 8 MB.",
  "No se pudo leer la duración del audio.", "El audio debe durar como máximo un minuto.",
  "Selecciona un audio de hasta un minuto.", "El archivo no tiene un formato válido.", "El audio debe pesar como máximo 8 MB.",
  "Usa una foto JPEG, PNG o WebP, o un audio WebM, MP3, M4A, WAV u OGG.",
]);

/** Only fixed codes/messages leave the error boundary; provider payloads stay private. */
export function audioTranscriptionFailure(error) {
  let reason = "provider_error";
  if (error instanceof AudioTranscriptionError && Object.hasOwn(messages, error.reason)) reason = error.reason;
  else if (error instanceof TypeError) return { status: 422, reason: "invalid_audio_request",
    message: validationMessages.has(error.message) ? error.message : "No se pudo leer la grabación. Vuelve a grabar tu respuesta." };
  else if (error?.name === "APIConnectionTimeoutError" || ["ETIMEDOUT", "ECONNABORTED"].includes(error?.code)) reason = "provider_timeout";
  else if (error?.status === 429) reason = ["insufficient_quota", "credit_balance_exhausted"].includes(error?.code) ? "provider_unavailable" : "provider_busy";
  else if ([401, 403].includes(error?.status)) reason = "provider_unavailable";
  else if (error?.status === 400) reason = "provider_rejected_audio";
  const invalid = ["no_speech", "language_unverified", "language_not_spanish", "transcript_too_long", "provider_rejected_audio"].includes(reason);
  return { status: invalid ? 422 : 503, reason, message: messages[reason] };
}
