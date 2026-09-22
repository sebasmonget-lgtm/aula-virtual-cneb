export const AI_ROUTING_POLICY = Object.freeze({
  version: "1.0.0",
  tiers: Object.freeze({
    decision: Object.freeze({ execution: "decision", provider: "typesafe", capability: "decision", model: null }),
    light_generation: Object.freeze({ execution: "generation", provider: "openai", model: "gpt-5.6-luna" }),
    standard_generation: Object.freeze({ execution: "generation", provider: "openai", model: "gpt-5.6-terra" }),
    deep_generation: Object.freeze({ execution: "generation", provider: "openai", model: "gpt-5.6-sol" }),
  }),
  workflows: Object.freeze({
    diagnostic: Object.freeze({ tier: "standard_generation", allow_escalation: true }),
    annual_plan: Object.freeze({ tier: "deep_generation", allow_escalation: false }),
    project: Object.freeze({ tier: "deep_generation", allow_escalation: false }),
    unit: Object.freeze({ tier: "deep_generation", allow_escalation: false }),
    workshop: Object.freeze({ tier: "standard_generation", allow_escalation: true }),
    activity: Object.freeze({ tier: "standard_generation", allow_escalation: true }),
    criterion_and_evidence: Object.freeze({ tier: "standard_generation", allow_escalation: true }),
    evidence_capture: Object.freeze({ execution: "code", allow_escalation: false }),
    assessment: Object.freeze({ tier: "deep_generation", allow_escalation: false }),
    descriptive_conclusion: Object.freeze({ tier: "deep_generation", allow_escalation: false }),
    family_report: Object.freeze({ tier: "standard_generation", allow_escalation: true }),
    material_generation: Object.freeze({ tier: "light_generation", allow_escalation: true }),
    today_mode: Object.freeze({ execution: "code", allow_escalation: false }),
  }),
  decision_tasks: Object.freeze([
    "decision", "intent_detection", "workflow_classification", "option_ranking", "scoring",
    "confidence", "escalation_decision", "structured_verification",
  ]),
  today_mode_text_tasks: Object.freeze(["explanation", "redaction"]),
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

function planForTier(tier, reason, allowEscalation, policy) {
  const definition = policy.tiers[tier];
  if (!definition) throw new AIExecutionRoutingError("unknown_tier", { tier });
  return {
    execution: definition.execution,
    tier,
    provider: definition.provider,
    model: definition.model,
    capability: definition.capability ?? null,
    reason,
    allow_escalation: allowEscalation,
  };
}

/** Deterministically selects a configured execution tier; it never calls a provider. */
export function resolveAIExecutionPlan({ workflow, task = null, context = null } = {}, policy = AI_ROUTING_POLICY) {
  void context;
  if (!workflow || !policy.workflows[workflow]) {
    throw new AIExecutionRoutingError("unknown_workflow", { workflow });
  }
  if (task && policy.decision_tasks.includes(task)) {
    return planForTier("decision", `Tarea estructurada '${task}' para ${workflow}.`, false, policy);
  }
  if (workflow === "today_mode" && task && policy.today_mode_text_tasks.includes(task)) {
    return planForTier("light_generation", `Redacción futura de today_mode: ${task}.`, false, policy);
  }
  const workflowPolicy = policy.workflows[workflow];
  if (workflowPolicy.execution === "code") {
    return {
      execution: "code",
      tier: null,
      provider: null,
      model: null,
      capability: null,
      reason: `Workflow ${workflow} se resuelve de forma determinista en código.`,
      allow_escalation: false,
    };
  }
  return planForTier(workflowPolicy.tier, `Política v${policy.version} para ${workflow}.`, workflowPolicy.allow_escalation, policy);
}
