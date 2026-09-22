import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { generateAIWorkflowV4 } from "./ai-generation-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { ActivityGenerationUIError, teacherMessageForActivityGenerationError } from "./ai-activity-ui-service.mjs";

export function buildAnnualPlanGenerationInput({ classroom, request = {} }) {
  if (!classroom || ![3, 4, 5].includes(classroom.age) || !classroom.calendar) throw new ActivityGenerationUIError("missing_annual_context", "Falta información del aula o calendario para preparar el plan anual.");
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
    const provider = createProvider(executionPlan);
    const generated = await generate(input, { provider, executionPlan });
    return { proposal: generated.output, internalMetadata: { workflow: generated.metadata.workflow, model: generated.metadata.model, reasoning_effort: executionPlan.reasoning_effort, response_id: generated.metadata.response_id, usage: generated.metadata.usage, provenance: generated.provenance } };
  } catch (error) {
    throw new ActivityGenerationUIError(error?.reason ?? "unknown", teacherMessageForActivityGenerationError(error));
  }
}
