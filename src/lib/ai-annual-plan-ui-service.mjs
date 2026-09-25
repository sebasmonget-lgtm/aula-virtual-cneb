import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { generateAIWorkflowV4 } from "./ai-generation-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildAnnualPlanContext } from "./context-policy-v4.mjs";
import { mergeAnnualPlanDevelopment } from "./annual-plan-contract.mjs";
import { AnnualCalendarError, buildFlexibleAnnualSchedule, defaultInitialStage, nationalCalendarBlocks2026, suggestAnnualProjectDurations } from "./annual-plan-calendar.mjs";
import { loadAnnualPlanSkill } from "./annual-plan-skill.mjs";

const ANNUAL_PLAN_TIMEOUT_MS = 180_000;

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
    case "diagnostic_review_required": return "Hay información diagnóstica nueva. Revisa y confirma el resumen del aula antes de preparar el plan anual.";
    case "calendar_invalid": return "Revisa el calendario escolar antes de preparar el plan anual.";
    case "calendar_project_does_not_fit": return "El calendario no alcanza para las doce propuestas. Revisa las interrupciones o la duración de los proyectos.";
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
  if (error instanceof AnnualPlanGenerationUIError) return reason;
  if (error?.name === "MissingWorkflowContextError") return "missing_annual_context";
  if (error instanceof AnnualCalendarError) return error.reason === "project_does_not_fit" ? "calendar_project_does_not_fit" : "calendar_invalid";
  if (["api_key_missing", "authentication_failed", "rate_limited", "timeout", "provider_error"].includes(reason)) return reason;
  if (typeof reason === "string" && (reason.startsWith("annual_plan_") || ["response_incomplete", "response_refusal", "structured_output_invalid", "provider_response_not_parseable", "provider_response_invalid_format"].includes(reason))) return "proposal_invalid";
  return "unknown";
}

export function buildAnnualPlanGenerationInput({ classroom, request = {} }) {
  if (!classroom || ![3, 4, 5].includes(classroom.age) || !classroom.calendar) throw new AnnualPlanGenerationUIError("missing_annual_context");
  if (classroom.context_v4 && classroom.context_v4.diagnostic_review_current === false) throw new AnnualPlanGenerationUIError("diagnostic_review_required");
  const calendar = { ...classroom.calendar,
    blocks: classroom.calendar.blocks ?? (Number(classroom.calendar.school_year) === 2026 ? nationalCalendarBlocks2026() : []),
    initial_stage: { ...(classroom.calendar.initial_stage ?? defaultInitialStage()), teacher_notes: "" } };
  calendar.project_duration_weeks = suggestAnnualProjectDurations(calendar);
  calendar.project_slots = buildFlexibleAnnualSchedule(calendar,
    calendar.project_duration_weeks.map((duration_weeks) => ({ duration_weeks }))).projects
    .map(({ code, period, starts_on, ends_on }) => ({ code, period, starts_on, ends_on }));
  const group = buildAnnualPlanContext(classroom.context_v4);
  return {
    workflow: "annual_plan", age: classroom.age,
    teacher_request: `${request.teacherRequest?.trim() || "Preparar el plan anual con el contexto disponible."} Preparar el Plan Maestro anual.`,
    calendar_context: calendar,
    classroom_context: { id: classroom.id, group_context: [classroom.group_context, group?.group_context].filter(Boolean).join(" "), school_context: classroom.school_context, available_resources: classroom.available_resources, diagnostic_summary: group?.diagnostic_summary ?? classroom.diagnostic_summary, religion_applicable: classroom.religion_applicable === true,
      confirmed_competency_priorities: classroom.diagnostic_group?.competency_priorities ?? [] },
    religion_applicable: classroom.religion_applicable === true,
    diagnostic_summary: group?.diagnostic_summary ?? classroom.diagnostic_summary,
    interests: group?.interests ?? [],
    available_resources: classroom.available_resources,
    language_context: { ...classroom.language_context, ...group?.language_context },
    ...(group ? { context_snapshot: group.snapshot } : {}),
  };
}

function developmentSource(master) {
  return {
    school_year: master.school_year,
    general_context_summary: master.general_context_summary,
    planning_priorities: master.planning_priorities,
    proposed_experiences: master.proposed_experiences.map((project, index) => ({
      index: index + 1, title: project.title, period: project.period, rationale: project.rationale,
      context_or_trigger: project.context_or_trigger, primary_competency_ids: project.primary_competency_ids,
      expected_evidence_categories: project.expected_evidence_categories,
    })),
  };
}

function combinedUsage(...parts) {
  return Object.fromEntries(["input_tokens", "cached_input_tokens", "output_tokens", "total_tokens"].map((field) => {
    const values = parts.map((part) => part?.usage?.[field]).filter((value) => Number.isInteger(value));
    return [field, values.length ? values.reduce((sum, value) => sum + value, 0) : null];
  }));
}

export async function generateTeacherAnnualPlan({ classroom, request, resolvePlan = resolveAIExecutionPlan, createProvider = createAIProviderForPlan, generate = generateAIWorkflowV4 }) {
  try {
    const input = buildAnnualPlanGenerationInput({ classroom, request });
    const masterPlan = resolvePlan({ workflow: "annual_plan", task: "generation" });
    const skillInstructions = await loadAnnualPlanSkill();
    const master = await generate({ ...input, annual_stage: "master" }, { provider: createProvider(masterPlan, { timeoutMs: ANNUAL_PLAN_TIMEOUT_MS }), executionPlan: masterPlan, skillInstructions });
    const developmentPlan = resolvePlan({ workflow: "annual_plan", task: "document_development" });
    const developed = await generate({ ...input, annual_stage: "development", master_plan: developmentSource(master.output),
      teacher_request: "Desarrolla el plan maestro validado que aparece en workflow_inputs.master_plan. Conserva sus doce proyectos, su orden, sus cuatro vínculos con el calendario y sus competencias. Para cada índice escribe un propósito concreto y diferente, un producto posible del proyecto y materiales sencillos compatibles con el aula. El producto es distinto de las actuaciones individuales que la docente observará como evidencia: no lo presentes como prueba automática del aprendizaje. No repitas el mismo propósito ni el mismo producto cambiando solo el número; algunos productos pueden ser acuerdos, relatos, construcciones, dibujos o registros cuando tengan sentido. Evita manualidades decorativas como propósito central. Devuelve cuatro criterios de organización y enfoques transversales solo cuando el contexto y la Knowledge Base los sustenten. Usa español claro; no inventes observaciones ni datos familiares." },
    { provider: createProvider(developmentPlan, { timeoutMs: ANNUAL_PLAN_TIMEOUT_MS }), executionPlan: developmentPlan });
    const proposal = mergeAnnualPlanDevelopment(master.output, developed.output, input.calendar_context.project_duration_weeks);
    const stages = [{ stage: "master", model: master.metadata.model, reasoning_effort: masterPlan.reasoning_effort, response_id: master.metadata.response_id, usage: master.metadata.usage },
      { stage: "development", model: developed.metadata.model, reasoning_effort: developmentPlan.reasoning_effort, response_id: developed.metadata.response_id, usage: developed.metadata.usage }];
    return { proposal, internalMetadata: { workflow: "annual_plan", model: master.metadata.model, reasoning_effort: masterPlan.reasoning_effort,
      response_id: master.metadata.response_id, usage: combinedUsage(master.metadata, developed.metadata), stages,
      provenance: master.provenance, ...(input.context_snapshot ? { context_snapshot: input.context_snapshot } : {}) } };
  } catch (error) {
    throw new AnnualPlanGenerationUIError(safeAnnualPlanFailureReason(error));
  }
}
