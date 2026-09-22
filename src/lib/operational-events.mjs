const allowed = new Set(["api_unexpected_failure", "ai_generation_rejected", "evidence_storage_failure"]);

/** Emits diagnostic codes only. Never forward error objects, prompts, child notes or credentials. */
export function recordOperationalEvent(event, { requestId, workflow, status } = {}, sink = console.warn) {
  if (!allowed.has(event)) throw new TypeError("Evento operacional inválido.");
  const entry = { event };
  if (typeof requestId === "string" && /^[0-9a-f-]{36}$/i.test(requestId)) entry.request_id = requestId;
  if (typeof workflow === "string" && /^[a-z_]{1,40}$/.test(workflow)) entry.workflow = workflow;
  if (Number.isInteger(status) && status >= 400 && status < 600) entry.status = status;
  sink(JSON.stringify(entry));
}
