const ANNUAL_PLAN_FIELDS = ["title", "school_year", "general_context_summary", "planning_priorities", "competency_overview", "proposed_experiences", "review_checkpoints", "flexibility_notes"];
const EXPERIENCE_FIELDS = ["period", "experience_type", "title", "rationale", "primary_competency_ids", "possible_secondary_competency_ids", "context_or_trigger", "expected_evidence_categories", "flexibility_notes"];
const TEXT_FIELDS = ["title", "school_year", "general_context_summary", "flexibility_notes"];
const TEXT_LIST_FIELDS = ["planning_priorities", "competency_overview", "review_checkpoints"];
const EXPERIENCE_TEXT_FIELDS = ["period", "title", "rationale", "context_or_trigger", "flexibility_notes"];
const EXPERIENCE_LIST_FIELDS = ["primary_competency_ids", "possible_secondary_competency_ids", "expected_evidence_categories"];

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

export class AnnualPlanValidationError extends Error {
  constructor(reason, details = {}) {
    const messages = {
      annual_plan_schema_mismatch: "La propuesta anual tiene campos incompletos o desconocidos.",
      annual_plan_required_field_invalid: "La propuesta anual tiene un campo obligatorio vacío o inválido.",
      annual_plan_school_year_mismatch: "El año de la propuesta no coincide con el año escolar del aula.",
      annual_plan_experience_schema_mismatch: "Una experiencia propuesta tiene campos incompletos o inválidos.",
      annual_plan_experience_type_invalid: "Una experiencia propuesta tiene un tipo no permitido.",
      annual_plan_competency_outside_bundle: "Una competencia propuesta ya no es aplicable al aula.",
    };
    super(messages[reason] ?? "La propuesta anual no es válida.");
    this.name = "AnnualPlanValidationError";
    this.reason = reason;
    this.details = details;
  }
}

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const isTextList = (value) => Array.isArray(value) && value.every(isText);

export function validateAnnualPlanProposal(output, allowedCompetencyIds, expectedSchoolYear) {
  if (!isRecord(output)) throw new AnnualPlanValidationError("annual_plan_schema_mismatch");
  const missing = ANNUAL_PLAN_FIELDS.filter((field) => !(field in output));
  const unknown = Object.keys(output).filter((field) => !ANNUAL_PLAN_FIELDS.includes(field));
  if (missing.length || unknown.length) throw new AnnualPlanValidationError("annual_plan_schema_mismatch", { missing_fields: missing, unknown_fields: unknown });
  for (const field of TEXT_FIELDS) if (!isText(output[field])) throw new AnnualPlanValidationError("annual_plan_required_field_invalid", { field });
  for (const field of TEXT_LIST_FIELDS) if (!isTextList(output[field])) throw new AnnualPlanValidationError("annual_plan_required_field_invalid", { field });
  if (!Array.isArray(output.proposed_experiences)) throw new AnnualPlanValidationError("annual_plan_required_field_invalid", { field: "proposed_experiences" });
  if (expectedSchoolYear !== undefined && output.school_year.trim() !== String(expectedSchoolYear)) throw new AnnualPlanValidationError("annual_plan_school_year_mismatch", { field: "school_year" });
  const allowed = new Set(allowedCompetencyIds);
  for (const [index, experience] of output.proposed_experiences.entries()) {
    if (!isRecord(experience) || EXPERIENCE_FIELDS.some((field) => !(field in experience)) || Object.keys(experience).some((field) => !EXPERIENCE_FIELDS.includes(field))) throw new AnnualPlanValidationError("annual_plan_experience_schema_mismatch", { index });
    if (!["project", "unit", "workshop"].includes(experience.experience_type)) throw new AnnualPlanValidationError("annual_plan_experience_type_invalid", { index });
    for (const field of EXPERIENCE_TEXT_FIELDS) if (!isText(experience[field])) throw new AnnualPlanValidationError("annual_plan_experience_schema_mismatch", { index, field });
    for (const field of EXPERIENCE_LIST_FIELDS) if (!isTextList(experience[field])) throw new AnnualPlanValidationError("annual_plan_experience_schema_mismatch", { index, field });
    for (const id of [...experience.primary_competency_ids, ...experience.possible_secondary_competency_ids]) if (!allowed.has(id)) throw new AnnualPlanValidationError("annual_plan_competency_outside_bundle", { index, competency_id: id });
  }
  return output;
}
