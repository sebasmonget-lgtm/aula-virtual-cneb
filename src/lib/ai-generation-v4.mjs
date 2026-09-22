import { AIProvider } from "./ai-provider.mjs";
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
  additional_properties: false,
  required: ACTIVITY_FIELDS,
  properties: Object.fromEntries([
    ...ACTIVITY_FIELDS.slice(0, 8).map((field) => [field, { type: "string", min_length: 1 }]),
    ["competency_status", { enum: ["confirmed", "unconfirmed"] }],
    ["competency_id", { type: ["string", "null"] }],
  ]),
};

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

function buildProviderRequest(bundle) {
  const immutableBundle = deepFreeze(structuredClone(bundle));
  return deepFreeze({
    workflow: "activity",
    ai_context_bundle: immutableBundle,
    output_schema: ACTIVITY_OUTPUT_SCHEMA,
  });
}

/**
 * Generates one validated activity through an injected provider.
 * @param {object} input - activity workflow input accepted by prepareAIRequestV4.
 * @param {{ provider: AIProvider, knowledgeBase?: object }} options
 */
export async function generateAIWorkflowV4(input, { provider, knowledgeBase } = {}) {
  if (input?.workflow !== "activity") {
    throw new InvalidAIGenerationError("unsupported_workflow", { workflow: input?.workflow });
  }
  if (!provider || typeof provider.generate !== "function") {
    throw new InvalidAIGenerationError("provider_not_configured");
  }
  const prepared = await prepareAIRequestV4(input, knowledgeBase);
  const providerRequest = buildProviderRequest(prepared.aiContextBundle);
  const confirmedCompetencyId = input.competency_ids?.length === 1 ? input.competency_ids[0] : null;
  const output = assertActivityOutput(parseProviderOutput(await provider.generate(providerRequest)), prepared.aiContextBundle, confirmedCompetencyId);
  return {
    output,
    metadata: {
      ...prepared.metadata,
      provider: provider.id ?? "anonymous",
      model: provider.model ?? null,
      output_schema: ACTIVITY_OUTPUT_SCHEMA.id,
    },
    provenance: prepared.aiContextBundle.provenance,
    validation: { status: "valid", schema: ACTIVITY_OUTPUT_SCHEMA.id },
  };
}

export { AIProvider };
