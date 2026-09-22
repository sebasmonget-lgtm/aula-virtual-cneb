import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { generateAIWorkflowV4 } from "./ai-generation-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { ActivityGenerationUIError, teacherMessageForActivityGenerationError } from "./ai-activity-ui-service.mjs";

export function buildLearningExperienceGenerationInput({ classroom, request = {} }) {
  const workflow = request.workflow;
  const required = workflow === "project" ? "project_trigger_or_interest" : workflow === "unit" ? "learning_need_or_context" : null;
  if (!required || !classroom || ![3, 4, 5].includes(classroom.age) || !request[required]?.trim()) throw new ActivityGenerationUIError("missing_experience_context", workflow === "project" ? "Indica el detonante o interés para desarrollar el proyecto." : "Indica la necesidad o contexto para desarrollar la unidad.");
  return {
    workflow, age: classroom.age, teacher_request: request.teacher_request?.trim() || request[required].trim(),
    classroom_context: { id: classroom.id, group_context: classroom.group_context, school_context: classroom.school_context, available_resources: classroom.available_resources, diagnostic_summary: classroom.diagnostic_summary },
    calendar_context: classroom.calendar, diagnostic_summary: classroom.diagnostic_summary, available_resources: classroom.available_resources, language_context: classroom.language_context,
    competency_ids: Array.isArray(request.competency_ids) ? request.competency_ids : [], [required]: request[required].trim(),
    planned_experience: request.planned_experience ?? null,
  };
}

export async function generateTeacherLearningExperience({ classroom, request, resolvePlan = resolveAIExecutionPlan, createProvider = createAIProviderForPlan, generate = generateAIWorkflowV4 }) {
  const input = buildLearningExperienceGenerationInput({ classroom, request });
  try {
    const executionPlan = resolvePlan({ workflow: input.workflow, task: "generation" });
    const generated = await generate(input, { provider: createProvider(executionPlan), executionPlan });
    return { proposal: generated.output, internalMetadata: { workflow: generated.metadata.workflow, model: generated.metadata.model, reasoning_effort: executionPlan.reasoning_effort, response_id: generated.metadata.response_id, usage: generated.metadata.usage, provenance: generated.provenance } };
  } catch (error) { throw new ActivityGenerationUIError(error?.reason ?? "unknown", teacherMessageForActivityGenerationError(error)); }
}
