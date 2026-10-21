import test from "node:test";
import assert from "node:assert/strict";
import { assertSpanishTranscript, audioTranscriptionFailure, AudioTranscriptionError } from "./audio-transcription-result.mjs";
import { recordOperationalEvent } from "./operational-events.mjs";

test("acepta español con nombres, tildes y préstamos sin modificar una sola palabra", () => {
  const text = "  A Jean Paul y María les gusta correr, saltar y leer.\nJuegan con Lego.  ";
  assert.equal(assertSpanishTranscript({ text, languages: [{ code: "es" }] }), text);
});

for (const [label, result, reason] of [
  ["caso ruso observado", { text: "пожалуйста,", languages: [{ code: "ru" }] }, "language_not_spanish"],
  ["etiqueta española con salida cirílica", { text: "пожалуйста,", languages: [{ code: "es" }] }, "language_not_spanish"],
  ["inglés con alfabeto latino", { text: "He likes running and reading.", languages: [{ code: "en" }] }, "language_not_spanish"],
  ["idiomas mezclados", { text: "Le gusta running.", languages: [{ code: "es" }, { code: "en" }] }, "language_not_spanish"],
  ["idioma incierto", { text: "algo", languages: [] }, "language_unverified"],
  ["sin metadatos", { text: "algo" }, "language_unverified"],
  ["silencio", { text: "  ", languages: [] }, "no_speech"],
  ["sin voz", { text: "...", languages: [{ code: "es" }] }, "no_speech"],
  ["texto demasiado largo", { text: "a".repeat(4001), languages: [{ code: "es" }] }, "transcript_too_long"],
]) test(`rechaza ${label} antes de entregar texto al cliente`, () => {
  assert.throws(() => assertSpanishTranscript(result), error => error instanceof AudioTranscriptionError && error.reason === reason);
});

test("los errores operativos llevan código seguro sin audio, texto, claves ni error del proveedor", () => {
  for (const [error, reason, status] of [
    [new AudioTranscriptionError("language_not_spanish"), "language_not_spanish", 422],
    [{ name: "APIConnectionTimeoutError", message: "secret" }, "provider_timeout", 503],
    [{ status: 429, code: "insufficient_quota", message: "secret" }, "provider_unavailable", 503],
    [{ status: 429, message: "secret" }, "provider_busy", 503],
    [{ status: 401, message: "secret" }, "provider_unavailable", 503],
    [{ status: 400, message: "secret" }, "provider_rejected_audio", 422],
    [new TypeError("secret"), "invalid_audio_request", 422],
    [new Error("secret"), "provider_error", 503],
  ]) {
    const failure = audioTranscriptionFailure(error);
    assert.deepEqual([failure.reason, failure.status], [reason, status]);
    assert.doesNotMatch(JSON.stringify(failure), /secret/);
    const logs = [];
    recordOperationalEvent("audio_transcription_failed", { workflow: "audio", reason, status, transcript: "nota privada", audio: "base64" }, line => logs.push(line));
    assert.deepEqual(JSON.parse(logs[0]), { event: "audio_transcription_failed", workflow: "audio", status, reason });
  }
  const logs = [];
  recordOperationalEvent("audio_transcription_failed", { reason: "nota privada" }, line => logs.push(line));
  assert.equal(logs[0].includes("nota privada"), false);
});
