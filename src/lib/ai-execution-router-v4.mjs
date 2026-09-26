export const AI_ROUTING_POLICY = Object.freeze({
  version: "2.0.0",
  tiers: Object.freeze({
    structured_light: Object.freeze({ execution: "generation", provider: "openai", model: "gpt-6-luna", reasoning_effort: "low" }),
    routine_generation: Object.freeze({ execution: "generation", provider: "openai", model: "gpt-6-luna", reasoning_effort: "medium" }),
    focused_writing: Object.freeze({ execution: "generation", provider: "openai", model: "gpt-6-sol", reasoning_effort: "low" }),
    judgment_generation: Object.freeze({ execution: "generation", provider: "openai", model: "gpt-6-sol", reasoning_effort: "medium" }),
    deep_planning: Object.freeze({ execution: "generation", provider: "openai", model: "gpt-6-astra", reasoning_effort: "high" }),
    transcription: Object.freeze({ execution: "transcription", provider: "openai", model: "gpt-4o-mini-transcribe", reasoning_effort: null }),
  }),
  workflows: Object.freeze({
    diagnostic: Object.freeze({ execution: "code" }),
    diagnostic_individual_assist: Object.freeze({ tier: "judgment_generation" }),
    diagnostic_group_synthesis: Object.freeze({ tier: "judgment_generation" }),
    diagnostic_priority_assist: Object.freeze({ tier: "judgment_generation" }),
    annual_plan: Object.freeze({ tier: "deep_planning" }),
    project: Object.freeze({ tier: "judgment_generation" }),
    unit: Object.freeze({ tier: "judgment_generation" }),
    workshop: Object.freeze({ execution: "unavailable", planned_tier: "routine_generation" }),
    activity: Object.freeze({ tier: "routine_generation", fallback_tier: "focused_writing" }),
    criterion_and_evidence: Object.freeze({ tier: "judgment_generation" }),
    evidence_capture: Object.freeze({ execution: "code" }),
    assessment: Object.freeze({ tier: "judgment_generation" }),
    descriptive_conclusion: Object.freeze({ tier: "judgment_generation" }),
    family_report: Object.freeze({ tier: "focused_writing" }),
    material_generation: Object.freeze({ execution: "unavailable", planned_tier: "structured_light", planned_fallback_tier: "focused_writing" }),
    today_mode: Object.freeze({ execution: "code" }),
    observation_rewrite: Object.freeze({ tier: "structured_light" }),
    observation_competency_suggestion: Object.freeze({ tier: "structured_light" }),
    audio_transcription: Object.freeze({ tier: "transcription" }),
  }),
  decision_tasks: Object.freeze([
    "decision", "intent_detection", "workflow_classification", "option_ranking", "scoring",
    "confidence", "escalation_decision", "structured_verification",
  ]),
});

export class AIExecutionRoutingError extends Error {
  constructor(reason, details = {}) {
    super(`Routing de IA inválido: ${reason}.`);
    this.name = "AIExecutionRoutingError";
    this.code = "INVALID_AI_EXECUTION_ROUTING";
    this.reason = reason;
    this.details = details;
  }
}

function inactivePlan(workflow, execution, reason, policy, extra = {}) {
  return {
    execution,
    tier: null,
    provider: null,
    model: null,
    reasoning_effort: null,
    capability: null,
    reason,
    routing_policy_version: policy.version,
    fallback: null,
    workflow,
    ...extra,
  };
}

function fallbackDefinition(tier, policy) {
  if (!tier) return null;
  const definition = policy.tiers[tier];
  if (!definition || definition.execution !== "generation") {
    throw new AIExecutionRoutingError("invalid_fallback_tier", { tier });
  }
  return Object.freeze({
    tier,
    provider: definition.provider,
    model: definition.model,
    reasoning_effort: definition.reasoning_effort,
    trigger: "quality_or_validation_failure",
    max_attempts: 1,
  });
}

function planForTier(workflow, tier, reason, fallbackTier, policy) {
  const definition = policy.tiers[tier];
  if (!definition) throw new AIExecutionRoutingError("unknown_tier", { tier });
  return {
    execution: definition.execution,
    tier,
    provider: definition.provider,
    model: definition.model,
    reasoning_effort: definition.reasoning_effort,
    capability: definition.capability ?? null,
    reason,
    routing_policy_version: policy.version,
    fallback: fallbackDefinition(fallbackTier, policy),
    workflow,
  };
}

/** Deterministically selects a configured execution tier; it never calls a provider. */
export function resolveAIExecutionPlan({ workflow, task = null, context = null } = {}, policy = AI_ROUTING_POLICY) {
  void context;
  const workflowPolicy = policy.workflows[workflow];
  if (!workflow || !workflowPolicy) throw new AIExecutionRoutingError("unknown_workflow", { workflow });
  if (task && policy.decision_tasks.includes(task)) {
    return inactivePlan(workflow, "unavailable", `La tarea estructurada '${task}' no tiene proveedor productivo.`, policy,
      { unavailable_reason: "decision_provider_not_implemented" });
  }
  if (workflowPolicy.execution === "code") {
    return inactivePlan(workflow, "code", `Workflow ${workflow} se resuelve de forma determinista en código.`, policy);
  }
  if (workflowPolicy.execution === "unavailable") {
    return inactivePlan(workflow, "unavailable", `Workflow ${workflow} todavía no tiene generación productiva.`, policy, {
      planned_tier: workflowPolicy.planned_tier ?? null,
      planned_fallback_tier: workflowPolicy.planned_fallback_tier ?? null,
      unavailable_reason: "workflow_not_implemented",
    });
  }
  return planForTier(workflow, workflowPolicy.tier, `Política v${policy.version} para ${workflow}.`, workflowPolicy.fallback_tier, policy);
}

/** Resolves the one permitted fallback without changing workflow, context, or schema. */
export function resolveAIFallbackPlan(primaryPlan, policy = AI_ROUTING_POLICY) {
  if (!primaryPlan?.fallback) return null;
  return planForTier(primaryPlan.workflow, primaryPlan.fallback.tier,
    `Fallback de calidad de la política v${policy.version} para ${primaryPlan.workflow}.`, null, policy);
}
