const allowed = new Set(["api_unexpected_failure", "ai_generation_rejected", "evidence_storage_failure",
  "diagnostic_classification_failed", "audio_transcription_failed", "interview_attachment_cleanup_failed",
  "student_context_refresh_failed", "db_request_cleanup_failed"]);

/** Emits diagnostic codes only. Never forward error objects, prompts, child notes or credentials. */
export function recordOperationalEvent(event, { requestId, workflow, status, reason } = {}, sink = console.warn) {
  if (!allowed.has(event)) throw new TypeError("Evento operacional inválido.");
  const entry = { event };
  if (typeof requestId === "string" && /^[0-9a-f-]{36}$/i.test(requestId)) entry.request_id = requestId;
  if (typeof workflow === "string" && /^[a-z_]{1,40}$/.test(workflow)) entry.workflow = workflow;
  if (Number.isInteger(status) && status >= 400 && status < 600) entry.status = status;
  if (event === "audio_transcription_failed" && ["not_configured", "no_speech", "language_unverified", "language_not_spanish", "transcript_too_long",
    "invalid_audio_request", "provider_timeout", "provider_busy", "provider_unavailable", "provider_rejected_audio", "provider_error"].includes(reason)) entry.reason = reason;
  sink(JSON.stringify(entry));
}
