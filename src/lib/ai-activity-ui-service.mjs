import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { generateAIWorkflowV4 } from "./ai-generation-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";

const MAX_PURPOSE_LENGTH = 500;
const MAX_CONTEXT_LENGTH = 1_000;
const MAX_MATERIALS = 20;
const MAX_MATERIAL_LENGTH = 120;

export class ActivityGenerationUIError extends Error {
  constructor(reason, message) {
    super(message);
    this.name = "ActivityGenerationUIError";
    this.code = "AI_ACTIVITY_GENERATION_ERROR";
    this.reason = reason;
  }
}

function text(value, maximum) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function materials(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item, MAX_MATERIAL_LENGTH)).filter(Boolean))].slice(0, MAX_MATERIALS);
}

export function teacherMessageForActivityGenerationError(error) {
  switch (error?.reason) {
    case "authentication_failed":
    case "api_key_missing": return "No se pudo acceder al servicio de IA.";
    case "rate_limited": return "El servicio está ocupado. Inténtalo nuevamente en unos momentos.";
    case "timeout": return "La generación tardó demasiado. Puedes volver a intentarlo.";
    case "response_incomplete":
    case "response_refusal":
    case "structured_output_invalid":
    case "activity_schema_mismatch":
    case "activity_required_field_invalid": return "No pudimos generar una propuesta válida. Inténtalo nuevamente.";
    case "missing_activity_purpose": return "Indica el propósito de la actividad para continuar.";
    default: return "No pudimos preparar la actividad. Inténtalo nuevamente.";
  }
}

export function buildTeacherActivityGenerationInput({ request = {}, classroom, learningExperience = null }) {
  if (!classroom || ![3, 4, 5].includes(classroom.age)) {
    throw new ActivityGenerationUIError("invalid_classroom", "No pudimos preparar la actividad.");
  }
  const activityPurpose = text(request.activityPurpose, MAX_PURPOSE_LENGTH);
  if (!activityPurpose) throw new ActivityGenerationUIError("missing_activity_purpose", teacherMessageForActivityGenerationError({ reason: "missing_activity_purpose" }));
  const context = text(request.context, MAX_CONTEXT_LENGTH);
  const competencyId = text(request.competencyId, 80) || null;
  return {
    workflow: "activity",
    age: classroom.age,
    teacher_request: context || activityPurpose,
    activity_purpose: activityPurpose,
    classroom_context: {
      id: classroom.id,
      section: classroom.section,
      group_context: context || classroom.group_context || undefined,
      school_context: classroom.school_context,
      diagnostic_summary: classroom.diagnostic_summary,
      religion_applicable: classroom.religion_applicable === true,
      materials: materials([...(learningExperience?.details?.spaces_and_materials ?? []), ...(request.materials ?? [])]),
    },
    ...(classroom.calendar ? { calendar_context: classroom.calendar } : {}),
    ...(classroom.language_context ? { language_context: classroom.language_context } : {}),
    ...(learningExperience ? { learning_experience_context: { id: learningExperience.id, type: learningExperience.type, title: learningExperience.title, purpose: learningExperience.purpose, trigger_or_interest: learningExperience.details?.trigger_or_interest ?? null, learning_need_or_context: learningExperience.details?.learning_need_or_context ?? null, starting_point: learningExperience.details?.starting_point ?? null, primary_competency_ids: learningExperience.details?.primary_competency_ids ?? [], possible_secondary_competency_ids: learningExperience.details?.possible_secondary_competency_ids ?? [], possible_pathways: learningExperience.details?.possible_pathways ?? [], proposed_situations: learningExperience.details?.proposed_situations ?? [], spaces_and_materials: learningExperience.details?.spaces_and_materials ?? [], evidence_opportunities: learningExperience.details?.evidence_opportunities ?? [], family_or_community_links: learningExperience.details?.family_or_community_links ?? [], adjustment_points: learningExperience.details?.adjustment_points ?? [], flexibility_notes: learningExperience.details?.flexibility_notes ?? null, prior_activities: learningExperience.prior_activities ?? [] } } : {}),
    ...(competencyId ? { competency_ids: [competencyId] } : {}),
  };
}

/** Server-only orchestration for the teacher activity screen. */
export async function generateTeacherActivity({ request, classroom, learningExperience = null, resolvePlan = resolveAIExecutionPlan, createProvider = createAIProviderForPlan, generate = generateAIWorkflowV4 }) {
  const input = buildTeacherActivityGenerationInput({ request, classroom, learningExperience });
  if (input.workflow !== "activity") throw new ActivityGenerationUIError("unsupported_workflow", "No pudimos preparar la actividad.");
  try {
    const executionPlan = resolvePlan({ workflow: "activity", task: "generation" });
    const provider = createProvider(executionPlan);
    if (!provider) throw new ActivityGenerationUIError("provider_not_configured", "No se pudo acceder al servicio de IA.");
    const generated = await generate(input, { provider, executionPlan });
    return {
      proposal: generated.output,
      internalMetadata: {
        workflow: generated.metadata.workflow,
        model: generated.metadata.model,
        reasoning_effort: generated.metadata.execution_plan.reasoning_effort,
        response_id: generated.metadata.response_id,
        usage: generated.metadata.usage,
        provenance: generated.provenance,
      },
    };
  } catch (error) {
    if (error instanceof ActivityGenerationUIError) throw error;
    throw new ActivityGenerationUIError(error?.reason ?? "unknown", teacherMessageForActivityGenerationError(error));
  }
}
