import { AIProvider } from "./ai-provider.mjs";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { prepareAIRequestV4 } from "./prepare-ai-request-v4.mjs";
import { validateAssessmentProposal } from "./assessment-v4-service.mjs";
import { CONCLUSION_FIELDS, validateDescriptiveConclusion } from "./descriptive-conclusion-v4-service.mjs";
import { FAMILY_REPORT_FIELDS, FAMILY_REPORT_SECTION_FIELDS, validateFamilyReport } from "./family-report-v4-service.mjs";

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
const CRITERION_FIELDS=["competency_id","criterion_text","expected_evidence","acceptable_evidence_variations","observation_focus","evidence_scope","teacher_caution"];
export const CRITERION_EVIDENCE_OUTPUT_SCHEMA={id:"criterion-evidence-v1",type:"object",additionalProperties:false,required:CRITERION_FIELDS,properties:{competency_id:{type:"string",minLength:1},criterion_text:{type:"string",minLength:1},expected_evidence:{type:"string",minLength:1},acceptable_evidence_variations:{type:"array",items:{type:"string",minLength:1}},observation_focus:{type:"array",items:{type:"string",minLength:1}},evidence_scope:{enum:["individual","group","mixed"]},teacher_caution:{type:"string",minLength:1}}};
const ASSESSMENT_FIELDS=["competency_id","information_status","evidence_overview","observable_patterns","strengths_and_advances","support_needs","next_opportunities","teacher_questions","insufficiency_reason","caution"];
export const ASSESSMENT_OUTPUT_SCHEMA={id:"assessment-v1",type:"object",additionalProperties:false,required:ASSESSMENT_FIELDS,properties:{competency_id:{type:"string",minLength:1},information_status:{enum:["sufficient","insufficient"]},evidence_overview:{type:"string",minLength:1},observable_patterns:{type:"array",items:{type:"string"}},strengths_and_advances:{type:"array",items:{type:"string"}},support_needs:{type:"array",items:{type:"string"}},next_opportunities:{type:"array",items:{type:"string"}},teacher_questions:{type:"array",items:{type:"string"}},insufficiency_reason:{type:["string","null"]},caution:{type:"string",minLength:1}}};
export const DESCRIPTIVE_CONCLUSION_OUTPUT_SCHEMA = { id: "descriptive-conclusion-v1", type: "object", additionalProperties: false, required: CONCLUSION_FIELDS, properties: { competency_id: { type: "string", minLength: 1 }, information_status: { enum: ["sufficient", "insufficient"] }, conclusion_text: { type: "string", minLength: 1 }, progress_examples: { type: "array", items: { type: "string", minLength: 1 } }, support_or_conditions: { type: "array", items: { type: "string", minLength: 1 } }, next_steps: { type: "array", items: { type: "string", minLength: 1 } }, insufficiency_reason: { type: ["string", "null"] }, caution: { type: "string", minLength: 1 } } };
export const FAMILY_REPORT_OUTPUT_SCHEMA = { id: "family-report-v1", type: "object", additionalProperties: false, required: FAMILY_REPORT_FIELDS, properties: {
  introduction: { type: "string", minLength: 1 }, closing_note: { type: "string", minLength: 1 },
  sections: { type: "array", items: { type: "object", additionalProperties: false, required: FAMILY_REPORT_SECTION_FIELDS, properties: {
    competency_id: { type: "string", minLength: 1 }, information_status: { enum: ["sufficient", "insufficient"] }, progress_summary: { type: "string", minLength: 1 },
    examples: { type: "array", items: { type: "string", minLength: 1 } }, support_or_conditions: { type: "array", items: { type: "string", minLength: 1 } }, next_steps: { type: "array", items: { type: "string", minLength: 1 } }, family_suggestions: { type: "array", items: { type: "string", minLength: 1 } }, insufficiency_note: { type: ["string", "null"] },
  } } },
} };
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
function assertCriterionEvidenceOutput(output,bundle,competencyId){const missing=CRITERION_FIELDS.filter((field)=>!(field in output));const unknown=Object.keys(output).filter((field)=>!CRITERION_FIELDS.includes(field));if(missing.length||unknown.length)throw new InvalidAIGenerationError("criterion_evidence_schema_mismatch");for(const field of ["competency_id","criterion_text","expected_evidence","teacher_caution"])if(typeof output[field]!=="string"||!output[field].trim())throw new InvalidAIGenerationError("criterion_evidence_required_field_invalid",{field});for(const field of ["acceptable_evidence_variations","observation_focus"])if(!Array.isArray(output[field])||output[field].some((v)=>typeof v!=="string"||!v.trim()))throw new InvalidAIGenerationError("criterion_evidence_required_field_invalid",{field});if(!["individual","group","mixed"].includes(output.evidence_scope))throw new InvalidAIGenerationError("criterion_evidence_scope_invalid");if(output.competency_id!==competencyId||!bundle.curriculum.competency_cards.some((card)=>card.id===competencyId))throw new InvalidAIGenerationError("criterion_evidence_competency_outside_bundle");return output;}
function assertAssessmentOutput(output, bundle, competencyId, evidenceCount) {
  if (!bundle.curriculum.competency_cards.some((card) => card.id === competencyId)) throw new InvalidAIGenerationError("assessment_competency_outside_bundle");
  try { return validateAssessmentProposal(output, competencyId, evidenceCount); }
  catch (error) { throw new InvalidAIGenerationError("assessment_schema_mismatch", { message: error.message }); }
}
function assertDescriptiveConclusionOutput(output, bundle, competencyId, informationStatus) {
  if (!bundle.curriculum.competency_cards.some((card) => card.id === competencyId)) throw new InvalidAIGenerationError("conclusion_competency_outside_bundle");
  try { return validateDescriptiveConclusion(output, competencyId, informationStatus); }
  catch (error) { throw new InvalidAIGenerationError("descriptive_conclusion_schema_mismatch", { message: error.message }); }
}
function assertFamilyReportOutput(output, bundle, input) {
  const selected = input.competency_ids;
  if (bundle.curriculum.competency_cards.length !== selected.length || selected.some((id) => !bundle.curriculum.competency_cards.some((card) => card.id === id))) throw new InvalidAIGenerationError("family_report_competency_outside_bundle");
  const sourceStatuses = input.student_context.teacher_confirmed_findings.map((item) => ({ competency_id: item.competency_id, information_status: item.information_status, has_progress_examples: item.progress_examples.length > 0 }));
  try { return validateFamilyReport(output, selected, sourceStatuses); }
  catch (error) { throw new InvalidAIGenerationError("family_report_schema_mismatch", { message: error.message }); }
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
  if (!["activity", "annual_plan", "project", "unit", "criterion_and_evidence", "assessment", "descriptive_conclusion", "family_report"].includes(input?.workflow) || plan.execution !== "generation") {
    throw new InvalidAIGenerationError("unsupported_workflow", { workflow: input?.workflow, execution_plan: plan });
  }
  if (!provider || typeof provider.generate !== "function") {
    throw new InvalidAIGenerationError("provider_not_configured");
  }
  const prepared = await prepareAIRequestV4(input, knowledgeBase);
  const outputSchema = input.workflow === "annual_plan" ? ANNUAL_PLAN_OUTPUT_SCHEMA : input.workflow === "project" ? PROJECT_OUTPUT_SCHEMA : input.workflow === "unit" ? UNIT_OUTPUT_SCHEMA : input.workflow === "criterion_and_evidence" ? CRITERION_EVIDENCE_OUTPUT_SCHEMA : input.workflow === "assessment" ? ASSESSMENT_OUTPUT_SCHEMA : input.workflow === "descriptive_conclusion" ? DESCRIPTIVE_CONCLUSION_OUTPUT_SCHEMA : input.workflow === "family_report" ? FAMILY_REPORT_OUTPUT_SCHEMA : ACTIVITY_OUTPUT_SCHEMA;
  const providerRequest = buildProviderRequest(input.workflow, prepared.aiContextBundle, plan, outputSchema);
  const confirmedCompetencyId = input.competency_ids?.length === 1 ? input.competency_ids[0] : null;
  const providerResponse = unwrapProviderResponse(await provider.generate(providerRequest));
  const output = input.workflow === "annual_plan" ? assertAnnualPlanOutput(providerResponse.output, prepared.aiContextBundle) : ["project", "unit"].includes(input.workflow) ? assertExperienceOutput(providerResponse.output, prepared.aiContextBundle, input.workflow) : input.workflow === "criterion_and_evidence" ? assertCriterionEvidenceOutput(providerResponse.output,prepared.aiContextBundle,confirmedCompetencyId) : input.workflow === "assessment" ? assertAssessmentOutput(providerResponse.output,prepared.aiContextBundle,confirmedCompetencyId,input.evidence_history?.length??0) : input.workflow === "descriptive_conclusion" ? assertDescriptiveConclusionOutput(providerResponse.output, prepared.aiContextBundle, confirmedCompetencyId, input.student_context?.teacher_confirmed_findings?.information_status) : input.workflow === "family_report" ? assertFamilyReportOutput(providerResponse.output, prepared.aiContextBundle, input) : assertActivityOutput(providerResponse.output, prepared.aiContextBundle, confirmedCompetencyId);
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
