import OpenAI, { toFile } from "openai";
import { parseBuffer } from "music-metadata";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { recordAiUsage } from "./ai-usage-service.mjs";

export const AUDIO_MIME_TYPES = Object.freeze(new Set(["audio/webm", "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg"]));
const fileExtension = { "audio/webm": "webm", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/wav": "wav", "audio/ogg": "ogg" };

export async function validateShortAudio(bytes, mimeType) {
  if (!AUDIO_MIME_TYPES.has(mimeType) || !Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > 8_000_000)
    throw new TypeError("El audio debe tener un formato admitido y pesar como máximo 8 MB.");
  let duration;
  try { duration = (await parseBuffer(bytes, { mimeType }, { duration: true })).format.duration; }
  catch { throw new TypeError("No se pudo leer la duración del audio."); }
  if (!Number.isFinite(duration) || duration <= 0) throw new TypeError("No se pudo leer la duración del audio.");
  if (duration > 60) throw new TypeError("El audio debe durar como máximo un minuto.");
  return { durationSeconds: duration, mimeType };
}

export async function transcribeAndPolishAudio({ bytes, mimeType, context = "", names = [], purpose = "observation", client = null }) {
  if (!["observation", "interview", "teacher_comment", "group_summary"].includes(purpose))
    throw new TypeError("El propósito de la grabación no es válido.");
  const { durationSeconds } = await validateShortAudio(bytes, mimeType);
  if (!process.env.OPENAI_API_KEY && !client) throw new Error("La transcripción no está configurada.");
  const openai = client ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000, maxRetries: 0 });
  const transcriptionPlan = resolveAIExecutionPlan({ workflow: "audio_transcription", task: "generation" });
  const rewritePlan = resolveAIExecutionPlan({ workflow: "observation_rewrite", task: "generation" });
  const file = await toFile(bytes, `observacion.${fileExtension[mimeType]}`, { type: mimeType });
  const transcription = await openai.audio.transcriptions.create({ file, model: transcriptionPlan.model, language: "es" });
  await recordAiUsage({ provider: "openai", workflow: "audio_transcription", model: transcriptionPlan.model,
    inputTokens: transcription.usage?.input_tokens, outputTokens: transcription.usage?.output_tokens,
    durationSeconds });
  const transcript = typeof transcription.text === "string" ? transcription.text.trim().slice(0, 4000) : "";
  if (!transcript) throw new Error("No se reconoció voz en el audio.");
  if (purpose !== "observation") return { transcript, improved_text: transcript,
    transcription_model: transcriptionPlan.model, editing_model: null,
    routing_policy_version: transcriptionPlan.routing_policy_version };
  const response = await openai.responses.create({
    model: rewritePlan.model, reasoning: { effort: rewritePlan.reasoning_effort },
    instructions: "Corrige puntuación, ortografía y frases truncadas en una transcripción de una observación docente de Educación Inicial. Conserva exactamente los hechos, la incertidumbre y quién dijo o hizo cada cosa. No inventes acciones, competencias, diagnósticos ni niveles. Si una palabra no se entiende, consérvala como [inaudible]. Devuelve solo JSON.",
    input: JSON.stringify({ transcript: neutralizeAssessmentText(transcript, names), context: neutralizeAssessmentText(String(context).slice(0, 300), names) }),
    text: { format: { type: "json_schema", name: "audio_observation_edit_v1", strict: true,
      schema: { type: "object", additionalProperties: false, required: ["improved_text"],
        properties: { improved_text: { type: "string" } } } } },
  });
  await recordAiUsage({ provider: "openai", workflow: "observation_rewrite", model: response.model ?? rewritePlan.model,
    inputTokens: response.usage?.input_tokens, cachedInputTokens: response.usage?.input_tokens_details?.cached_tokens ?? 0,
    outputTokens: response.usage?.output_tokens });
  const improved = JSON.parse(response.output_text || "{}").improved_text;
  if (typeof improved !== "string" || !improved.trim()) throw new Error("No se pudo preparar el texto del audio.");
  return { transcript, improved_text: improved.trim().slice(0, 4000),
    transcription_model: transcriptionPlan.model, editing_model: rewritePlan.model,
    routing_policy_version: rewritePlan.routing_policy_version };
}
