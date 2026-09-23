import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { generateAIWorkflowV4 } from "./ai-generation-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";

const ANNUAL_PLAN_TIMEOUT_MS = 90_000;

export class AnnualPlanGenerationUIError extends Error {
  constructor(reason) {
    super(teacherMessageForAnnualPlanGenerationError(reason));
    this.name = "AnnualPlanGenerationUIError";
    this.reason = reason;
  }
}

export function teacherMessageForAnnualPlanGenerationError(reason) {
  switch (reason) {
    case "missing_annual_context": return "Falta información del aula o calendario para preparar el plan anual.";
    case "api_key_missing":
    case "authentication_failed": return "No se pudo acceder al servicio de IA. Pide revisar su configuración.";
    case "rate_limited": return "El servicio de IA está ocupado. Espera unos minutos antes de volver a intentar.";
    case "timeout": return "La preparación del plan anual tardó demasiado. No se guardó ningún borrador.";
    case "proposal_invalid": return "La propuesta anual llegó incompleta o no pasó la revisión. No se guardó ningún borrador.";
    case "provider_error": return "No se pudo conectar con la IA para preparar el plan anual. No se guardó ningún borrador.";
    default: return "No pudimos preparar el plan anual. No se guardó ningún borrador. Inténtalo nuevamente.";
  }
}

function safeAnnualPlanFailureReason(error) {
  const reason = error?.reason;
  if (error?.name === "MissingWorkflowContextError") return "missing_annual_context";
  if (["api_key_missing", "authentication_failed", "rate_limited", "timeout", "provider_error"].includes(reason)) return reason;
  if (typeof reason === "string" && (reason.startsWith("annual_plan_") || ["response_incomplete", "response_refusal", "structured_output_invalid", "provider_response_not_parseable", "provider_response_invalid_format"].includes(reason))) return "proposal_invalid";
  return "unknown";
}

export function buildAnnualPlanGenerationInput({ classroom, request = {} }) {
  if (!classroom || ![3, 4, 5].includes(classroom.age) || !classroom.calendar) throw new AnnualPlanGenerationUIError("missing_annual_context");
  return {
    workflow: "annual_plan", age: classroom.age,
    teacher_request: request.teacherRequest?.trim() || "Preparar una propuesta anual flexible con el contexto disponible.",
    calendar_context: classroom.calendar,
    classroom_context: { id: classroom.id, group_context: classroom.group_context, school_context: classroom.school_context, available_resources: classroom.available_resources, diagnostic_summary: classroom.diagnostic_summary },
    diagnostic_summary: classroom.diagnostic_summary,
    interests: classroom.interests,
    available_resources: classroom.available_resources,
    language_context: classroom.language_context,
  };
}

export async function generateTeacherAnnualPlan({ classroom, request, resolvePlan = resolveAIExecutionPlan, createProvider = createAIProviderForPlan, generate = generateAIWorkflowV4 }) {
  const input = buildAnnualPlanGenerationInput({ classroom, request });
  try {
    const executionPlan = resolvePlan({ workflow: "annual_plan", task: "generation" });
    const provider = createProvider(executionPlan, { timeoutMs: ANNUAL_PLAN_TIMEOUT_MS });
    const generated = await generate(input, { provider, executionPlan });
    return { proposal: generated.output, internalMetadata: { workflow: generated.metadata.workflow, model: generated.metadata.model, reasoning_effort: executionPlan.reasoning_effort, response_id: generated.metadata.response_id, usage: generated.metadata.usage, provenance: generated.provenance } };
  } catch (error) {
    throw new AnnualPlanGenerationUIError(safeAnnualPlanFailureReason(error));
  }
}
