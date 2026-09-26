import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { generateAIWorkflowV4 } from "./ai-generation-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { ActivityGenerationUIError, teacherMessageForActivityGenerationError } from "./ai-activity-ui-service.mjs";
import { buildProjectContext, buildUnitContext } from "./context-policy-v4.mjs";
import { loadLearningExperienceSkill } from "./learning-experience-skill.mjs";

const LEARNING_EXPERIENCE_TIMEOUT_MS = 120_000;

function teacherMessageForLearningExperienceError(error) {
  if (error?.reason === "timeout") return "La preparación tardó demasiado. Puedes volver a intentarlo.";
  if (["authentication_failed", "api_key_missing", "rate_limited"].includes(error?.reason)) return teacherMessageForActivityGenerationError(error);
  if (/^(project|unit)_/.test(error?.reason ?? "")) return "No pudimos validar la propuesta generada. Inténtalo nuevamente.";
  return "No pudimos preparar la propuesta. Inténtalo nuevamente.";
}

export function buildLearningExperienceGenerationInput({ classroom, request = {} }) {
  const workflow = request.workflow;
  const required = workflow === "project" ? "project_trigger_or_interest" : workflow === "unit" ? "learning_need_or_context" : null;
  if (!required || !classroom || ![3, 4, 5].includes(classroom.age) || !request[required]?.trim()) throw new ActivityGenerationUIError("missing_experience_context", workflow === "project" ? "Indica el detonante o interés para desarrollar el proyecto." : "Indica la necesidad o contexto para desarrollar la unidad.");
  const group = (workflow === "project" ? buildProjectContext : buildUnitContext)(classroom.context_v4);
  return {
    workflow, age: classroom.age, teacher_request: request.teacher_request?.trim() || request[required].trim(),
    classroom_context: { id: classroom.id, group_context: [classroom.group_context, group?.group_context].filter(Boolean).join(" "), school_context: classroom.school_context, available_resources: classroom.available_resources, diagnostic_summary: group?.diagnostic_summary ?? classroom.diagnostic_summary },
    calendar_context: classroom.calendar, diagnostic_summary: group?.diagnostic_summary ?? classroom.diagnostic_summary, available_resources: classroom.available_resources, language_context: { ...classroom.language_context, ...group?.language_context },
    ...(group ? { context_snapshot: group.snapshot } : {}),
    competency_ids: Array.isArray(request.competency_ids) ? request.competency_ids : [], [required]: request[required].trim(),
    planned_experience: request.planned_experience ?? null,
  };
}

export async function generateTeacherLearningExperience({ classroom, request, resolvePlan = resolveAIExecutionPlan, createProvider = createAIProviderForPlan, generate = generateAIWorkflowV4, loadSkill = loadLearningExperienceSkill }) {
  const input = buildLearningExperienceGenerationInput({ classroom, request });
  try {
    const executionPlan = resolvePlan({ workflow: input.workflow, task: "generation" });
    const generated = await generate(input, { provider: createProvider(executionPlan, { timeoutMs: LEARNING_EXPERIENCE_TIMEOUT_MS }), executionPlan,
      skillInstructions: await loadSkill() });
    return { proposal: generated.output, internalMetadata: { workflow: generated.metadata.workflow,
      provider: generated.metadata.provider, model: generated.metadata.model,
      reasoning_effort: generated.metadata.reasoning_effort, response_id: generated.metadata.response_id,
      usage: generated.metadata.usage, routing_policy_version: generated.metadata.routing_policy_version,
      fallback_used: generated.metadata.fallback_used === true, provenance: generated.provenance,
      ...(input.context_snapshot ? { context_snapshot: input.context_snapshot } : {}) } };
  } catch (error) { const wrapped = new ActivityGenerationUIError(error?.reason ?? "unknown", teacherMessageForLearningExperienceError(error)); wrapped.cause = error; throw wrapped; }
}
