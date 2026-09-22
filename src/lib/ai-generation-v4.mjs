import { AIProvider } from "./ai-provider.mjs";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { prepareAIRequestV4 } from "./prepare-ai-request-v4.mjs";

const ACTIVITY_FIELDS = [
  "title",
  "purpose",
  "meaningful_situation",
  "teacher_preparation",
  "child_actions",
  "mediation",
  "evidence_opportunities",
  "closure_or_continuity",
  "competency_status",
  "competency_id",
];

export const ACTIVITY_OUTPUT_SCHEMA = {
  id: "activity-v1",
  type: "object",
  additionalProperties: false,
  required: ACTIVITY_FIELDS,
  properties: Object.fromEntries([
    ...ACTIVITY_FIELDS.slice(0, 8).map((field) => [field, { type: "string", minLength: 1 }]),
    ["competency_status", { enum: ["confirmed", "unconfirmed"] }],
    ["competency_id", { type: ["string", "null"] }],
  ]),
};


const ANNUAL_PLAN_FIELDS = ["title", "school_year", "general_context_summary", "planning_priorities", "competency_overview", "proposed_experiences", "review_checkpoints", "flexibility_notes"];
const EXPERIENCE_FIELDS = ["period", "experience_type", "title", "rationale", "primary_competency_ids", "possible_secondary_competency_ids", "context_or_trigger", "expected_evidence_categories", "flexibility_notes"];
export const ANNUAL_PLAN_OUTPUT_SCHEMA = {
  id: "annual-plan-v1", type: "object", additionalProperties: false, required: ANNUAL_PLAN_FIELDS,
  properties: {
    title: { type: "string", minLength: 1 }, school_year: { type: "string", minLength: 1 }, general_context_summary: { type: "string", minLength: 1 },
    planning_priorities: { type: "array", items: { type: "string", minLength: 1 } }, competency_overview: { type: "array", items: { type: "string", minLength: 1 } },
    proposed_experiences: { type: "array", items: { type: "object", additionalProperties: false, required: EXPERIENCE_FIELDS, properties: {
      period: { type: "string", minLength: 1 }, experience_type: { enum: ["project", "unit", "workshop"] }, title: { type: "string", minLength: 1 }, rationale: { type: "string", minLength: 1 }, primary_competency_ids: { type: "array", items: { type: "string" } }, possible_secondary_competency_ids: { type: "array", items: { type: "string" } }, context_or_trigger: { type: "string", minLength: 1 }, expected_evidence_categories: { type: "array", items: { type: "string", minLength: 1 } }, flexibility_notes: { type: "string", minLength: 1 },
    } } }, review_checkpoints: { type: "array", items: { type: "string", minLength: 1 } }, flexibility_notes: { type: "string", minLength: 1 },
  },
};
const EXPERIENCE_GENERATION_FIELDS = ["title", "purpose", "starting_point", "primary_competency_ids", "possible_secondary_competency_ids", "spaces_and_materials", "evidence_opportunities", "family_or_community_links", "adjustment_points", "flexibility_notes"];
const PATHWAY_FIELDS = ["title", "pedagogical_intention", "possible_child_actions"];
function experienceOutputSchema(id, contextField, collectionField) {
  return { id, type: "object", additionalProperties: false, required: [...EXPERIENCE_GENERATION_FIELDS, contextField, collectionField], properties: {
    title: { type: "string", minLength: 1 }, purpose: { type: "string", minLength: 1 }, [contextField]: { type: "string", minLength: 1 }, starting_point: { type: "string", minLength: 1 },
    primary_competency_ids: { type: "array", items: { type: "string" } }, possible_secondary_competency_ids: { type: "array", items: { type: "string" } },
    [collectionField]: { type: "array", items: { type: "object", additionalProperties: false, required: PATHWAY_FIELDS, properties: { title: { type: "string", minLength: 1 }, pedagogical_intention: { type: "string", minLength: 1 }, possible_child_actions: { type: "string", minLength: 1 } } } },
    spaces_and_materials: { type: "array", items: { type: "string", minLength: 1 } }, evidence_opportunities: { type: "array", items: { type: "string", minLength: 1 } }, family_or_community_links: { type: "array", items: { type: "string", minLength: 1 } }, adjustment_points: { type: "array", items: { type: "string", minLength: 1 } }, flexibility_notes: { type: "string", minLength: 1 },
  } };
}
export const PROJECT_OUTPUT_SCHEMA = experienceOutputSchema("project-v1", "trigger_or_interest", "possible_pathways");
export const UNIT_OUTPUT_SCHEMA = experienceOutputSchema("unit-v1", "learning_need_or_context", "proposed_situations");
export class InvalidAIGenerationError extends Error {
  constructor(reason, details = {}) {
    super(`Generación de IA inválida: ${reason}.`);
    this.name = "InvalidAIGenerationError";
    this.code = "INVALID_AI_GENERATION";
    this.reason = reason;
    this.details = details;
  }
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function parseProviderOutput(response) {
  if (typeof response === "string") {
    try {
      return JSON.parse(response);
    } catch {
      throw new InvalidAIGenerationError("provider_response_not_parseable");
    }
  }
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new InvalidAIGenerationError("provider_response_invalid_format");
  }
  return response;
}

function unwrapProviderResponse(response) {
  if (response && typeof response === "object" && !Array.isArray(response) && "output" in response && "provider_metadata" in response) {
    return { output: parseProviderOutput(response.output), providerMetadata: response.provider_metadata };
  }
  return { output: parseProviderOutput(response), providerMetadata: null };
}

function assertActivityOutput(output, bundle, confirmedCompetencyId) {
  const keys = Object.keys(output);
  const unknownFields = keys.filter((field) => !ACTIVITY_FIELDS.includes(field));
  const missingFields = ACTIVITY_FIELDS.filter((field) => !(field in output));
  if (unknownFields.length || missingFields.length) {
    throw new InvalidAIGenerationError("activity_schema_mismatch", { missing_fields: missingFields, unknown_fields: unknownFields });
  }
  for (const field of ACTIVITY_FIELDS.slice(0, 8)) {
    if (typeof output[field] !== "string" || !output[field].trim()) {
      throw new InvalidAIGenerationError("activity_required_field_invalid", { field });
    }
  }
  if (confirmedCompetencyId) {
    const confirmedCardIds = bundle.curriculum.competency_cards.map((card) => card.id);
    if (!confirmedCardIds.includes(confirmedCompetencyId)) {
      throw new InvalidAIGenerationError("activity_confirmed_competency_missing_from_bundle", { competency_id: confirmedCompetencyId });
    }
    const competencyId = confirmedCompetencyId;
    if (output.competency_status !== "confirmed" || output.competency_id !== competencyId) {
      throw new InvalidAIGenerationError("activity_competency_outside_bundle", { allowed_competency_ids: confirmedCardIds });
    }
  } else if (output.competency_status !== "unconfirmed" || output.competency_id !== null) {
    throw new InvalidAIGenerationError("activity_competency_must_be_unconfirmed", { allowed_competency_ids: [] });
  }
  return output;
}


function assertAnnualPlanOutput(output, bundle) {
  const missing = ANNUAL_PLAN_FIELDS.filter((field) => !(field in output));
  const unknown = Object.keys(output).filter((field) => !ANNUAL_PLAN_FIELDS.includes(field));
  if (missing.length || unknown.length) throw new InvalidAIGenerationError("annual_plan_schema_mismatch", { missing_fields: missing, unknown_fields: unknown });
  for (const field of ["title", "school_year", "general_context_summary", "flexibility_notes"]) if (typeof output[field] !== "string" || !output[field].trim()) throw new InvalidAIGenerationError("annual_plan_required_field_invalid", { field });
  for (const field of ["planning_priorities", "competency_overview", "review_checkpoints", "proposed_experiences"]) if (!Array.isArray(output[field])) throw new InvalidAIGenerationError("annual_plan_required_field_invalid", { field });
  const allowed = new Set(bundle.curriculum.competency_cards.map((card) => card.id));
  for (const experience of output.proposed_experiences) {
    if (!experience || typeof experience !== "object" || EXPERIENCE_FIELDS.some((field) => !(field in experience)) || Object.keys(experience).some((field) => !EXPERIENCE_FIELDS.includes(field))) throw new InvalidAIGenerationError("annual_plan_experience_schema_mismatch");
    if (!["project", "unit", "workshop"].includes(experience.experience_type)) throw new InvalidAIGenerationError("annual_plan_experience_type_invalid");
    for (const id of [...experience.primary_competency_ids, ...experience.possible_secondary_competency_ids]) if (!allowed.has(id)) throw new InvalidAIGenerationError("annual_plan_competency_outside_bundle", { competency_id: id });
  }
  return output;
}
export function buildProviderRequest(workflow, bundle, executionPlan, outputSchema) {
  const immutableBundle = deepFreeze(structuredClone(bundle));
  return deepFreeze({
    workflow,
    ai_context_bundle: immutableBundle,
    output_schema: outputSchema,
    execution_plan: structuredClone(executionPlan),
  });
}
function assertExperienceOutput(output, bundle, workflow) {
  const contextField = workflow === "project" ? "trigger_or_interest" : "learning_need_or_context";
  const collectionField = workflow === "project" ? "possible_pathways" : "proposed_situations";
  const allowedFields = [...EXPERIENCE_GENERATION_FIELDS, contextField, collectionField];
  const missing = allowedFields.filter((field) => !(field in output));
  const unknown = Object.keys(output).filter((field) => !allowedFields.includes(field));
  if (missing.length || unknown.length) throw new InvalidAIGenerationError(`${workflow}_schema_mismatch`, { missing_fields: missing, unknown_fields: unknown });
  for (const field of ["title", "purpose", "starting_point", contextField, "flexibility_notes"]) if (typeof output[field] !== "string" || !output[field].trim()) throw new InvalidAIGenerationError(`${workflow}_required_field_invalid`, { field });
  for (const field of ["primary_competency_ids", "possible_secondary_competency_ids", "spaces_and_materials", "evidence_opportunities", "family_or_community_links", "adjustment_points", collectionField]) if (!Array.isArray(output[field])) throw new InvalidAIGenerationError(`${workflow}_required_field_invalid`, { field });
  const allowed = new Set(bundle.curriculum.competency_cards.map((card) => card.id));
  for (const id of [...output.primary_competency_ids, ...output.possible_secondary_competency_ids]) if (!allowed.has(id)) throw new InvalidAIGenerationError(`${workflow}_competency_outside_bundle`, { competency_id: id });
  for (const item of output[collectionField]) if (!item || typeof item !== "object" || PATHWAY_FIELDS.some((field) => typeof item[field] !== "string" || !item[field].trim()) || Object.keys(item).some((field) => !PATHWAY_FIELDS.includes(field))) throw new InvalidAIGenerationError(`${workflow}_pathway_schema_mismatch`);
  return output;
}

/**
 * Generates one validated activity through an injected provider.
 * @param {object} input - activity workflow input accepted by prepareAIRequestV4.
 * @param {{ provider: AIProvider, knowledgeBase?: object, executionPlan?: object, routingPolicy?: object }} options
 */
export async function generateAIWorkflowV4(input, { provider, knowledgeBase, executionPlan, routingPolicy } = {}) {
  const plan = executionPlan ?? resolveAIExecutionPlan({ workflow: input?.workflow, task: "generation", context: input?.context ?? null }, routingPolicy);
  if (plan.execution === "code") {
    throw new InvalidAIGenerationError("workflow_not_generation_enabled", { workflow: input?.workflow, execution_plan: plan });
  }
  if (!["activity", "annual_plan", "project", "unit"].includes(input?.workflow) || plan.execution !== "generation") {
    throw new InvalidAIGenerationError("unsupported_workflow", { workflow: input?.workflow, execution_plan: plan });
  }
  if (!provider || typeof provider.generate !== "function") {
    throw new InvalidAIGenerationError("provider_not_configured");
  }
  const prepared = await prepareAIRequestV4(input, knowledgeBase);
  const outputSchema = input.workflow === "annual_plan" ? ANNUAL_PLAN_OUTPUT_SCHEMA : input.workflow === "project" ? PROJECT_OUTPUT_SCHEMA : input.workflow === "unit" ? UNIT_OUTPUT_SCHEMA : ACTIVITY_OUTPUT_SCHEMA;
  const providerRequest = buildProviderRequest(input.workflow, prepared.aiContextBundle, plan, outputSchema);
  const confirmedCompetencyId = input.competency_ids?.length === 1 ? input.competency_ids[0] : null;
  const providerResponse = unwrapProviderResponse(await provider.generate(providerRequest));
  const output = input.workflow === "annual_plan" ? assertAnnualPlanOutput(providerResponse.output, prepared.aiContextBundle) : ["project", "unit"].includes(input.workflow) ? assertExperienceOutput(providerResponse.output, prepared.aiContextBundle, input.workflow) : assertActivityOutput(providerResponse.output, prepared.aiContextBundle, confirmedCompetencyId);
  return {
    output,
    metadata: {
      ...prepared.metadata,
      provider: providerResponse.providerMetadata?.provider ?? provider.id ?? "anonymous",
      model: providerResponse.providerMetadata?.model ?? provider.model ?? null,
      output_schema: outputSchema.id,
      execution_plan: plan,
      response_id: providerResponse.providerMetadata?.response_id ?? null,
      usage: providerResponse.providerMetadata?.usage ?? null,
    },
    provenance: prepared.aiContextBundle.provenance,
    validation: { status: "valid", schema: outputSchema.id },
  };
}

export { AIProvider };
