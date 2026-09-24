import { DEFAULT_ANNUAL_PROJECT_WEEKS } from "./annual-plan-calendar.mjs";

const ANNUAL_PLAN_FIELDS = ["title", "school_year", "general_context_summary", "planning_priorities", "competency_overview", "proposed_experiences", "review_checkpoints", "flexibility_notes"];
const DOCUMENT_FIELDS = ["annual_purposes", "teaching_strategies", "assessment_followup", "family_collaboration", "inclusive_supports"];
const EXPERIENCE_FIELDS = ["period", "experience_type", "title", "rationale", "primary_competency_ids", "possible_secondary_competency_ids", "context_or_trigger", "expected_evidence_categories", "flexibility_notes"];
const TEXT_FIELDS = ["title", "school_year", "general_context_summary", "flexibility_notes"];
const TEXT_LIST_FIELDS = ["planning_priorities", "competency_overview", "review_checkpoints", ...DOCUMENT_FIELDS];
const EXPERIENCE_TEXT_FIELDS = ["period", "title", "rationale", "context_or_trigger", "flexibility_notes"];
const EXPERIENCE_LIST_FIELDS = ["primary_competency_ids", "possible_secondary_competency_ids", "expected_evidence_categories"];
const TEMPLATE_FORMAT = "twelve_projects_flexible_weeks";
const LEGACY_TEMPLATE_FORMAT = "twenty_projects_ten_days";
const TEMPLATE_PLAN_FIELDS = ["plan_format", "organization_criteria", "transversal_approaches"];
const TEMPLATE_EXPERIENCE_FIELDS = ["purpose", "final_product", "materials"];
const PROJECT_DETAIL_FIELDS = ["index", "purpose", "final_product", "materials"];

export const ANNUAL_PLAN_OUTPUT_SCHEMA = {
  id: "annual-plan-v2", type: "object", additionalProperties: false, required: [...ANNUAL_PLAN_FIELDS, ...DOCUMENT_FIELDS],
  properties: {
    title: { type: "string", minLength: 1 }, school_year: { type: "string", minLength: 1 }, general_context_summary: { type: "string", minLength: 1 },
    planning_priorities: { type: "array", items: { type: "string", minLength: 1 } }, competency_overview: { type: "array", items: { type: "string", minLength: 1 } },
    proposed_experiences: { type: "array", items: { type: "object", additionalProperties: false, required: EXPERIENCE_FIELDS, properties: {
      period: { type: "string", minLength: 1 }, experience_type: { enum: ["project", "unit", "workshop"] }, title: { type: "string", minLength: 1 }, rationale: { type: "string", minLength: 1 }, primary_competency_ids: { type: "array", items: { type: "string" } }, possible_secondary_competency_ids: { type: "array", items: { type: "string" } }, context_or_trigger: { type: "string", minLength: 1 }, expected_evidence_categories: { type: "array", items: { type: "string", minLength: 1 } }, flexibility_notes: { type: "string", minLength: 1 },
    } } }, review_checkpoints: { type: "array", items: { type: "string", minLength: 1 } }, flexibility_notes: { type: "string", minLength: 1 },
    annual_purposes: { type: "array", items: { type: "string", minLength: 1 } },
    teaching_strategies: { type: "array", items: { type: "string", minLength: 1 } },
    assessment_followup: { type: "array", items: { type: "string", minLength: 1 } },
    family_collaboration: { type: "array", items: { type: "string", minLength: 1 } },
    inclusive_supports: { type: "array", items: { type: "string", minLength: 1 } },
  },
};

export const ANNUAL_PLAN_DEVELOPMENT_SCHEMA = {
  id: "annual-plan-development-v1", type: "object", additionalProperties: false,
  required: ["organization_criteria", "transversal_approaches", "project_details"],
  properties: {
    organization_criteria: { type: "array", items: { type: "string", minLength: 1 } },
    transversal_approaches: { type: "array", items: { type: "string", minLength: 1 } },
    project_details: { type: "array", items: { type: "object", additionalProperties: false, required: PROJECT_DETAIL_FIELDS,
      properties: { index: { type: "integer" }, purpose: { type: "string", minLength: 1 }, final_product: { type: "string", minLength: 1 }, materials: { type: "array", items: { type: "string", minLength: 1 } } } } },
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
      annual_plan_project_count_invalid: "El plan debe contener doce propuestas de proyecto.",
      annual_plan_project_order_invalid: "Los proyectos deben seguir el orden de los cuatro periodos lectivos.",
      annual_plan_project_duration_invalid: "Cada proyecto debe durar dos o tres semanas lectivas.",
      annual_plan_project_diversity_invalid: "Los proyectos se parecen demasiado entre sí. Revisa títulos, situaciones y productos para que cada uno tenga sentido propio.",
      annual_plan_development_invalid: "El desarrollo de los proyectos llegó incompleto.",
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
const contentKey = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es").replace(/\b(?:proyecto|n[oú]mero|nro)\s*(?=\d+\b)/g, "")
  .replace(/\b\d+\b/g, "").replace(/[^a-zñ]+/g, " ").trim().replace(/\s+/g, " ");

function rejectRepeatedProjects(values, field, maximum) {
  const counts = new Map();
  for (const [index, value] of values.entries()) {
    const key = contentKey(value) || "__sin_tema__";
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    if (count > maximum) throw new AnnualPlanValidationError("annual_plan_project_diversity_invalid", { index, field });
  }
}

export function validateAnnualPlanProposal(output, allowedCompetencyIds, expectedSchoolYear, { requireCurrentSchema = false } = {}) {
  if (!isRecord(output)) throw new AnnualPlanValidationError("annual_plan_schema_mismatch");
  const isTemplate = [TEMPLATE_FORMAT, LEGACY_TEMPLATE_FORMAT].includes(output.plan_format);
  const isFlexible = output.plan_format === TEMPLATE_FORMAT;
  const isCurrent = requireCurrentSchema || isTemplate || DOCUMENT_FIELDS.some((field) => field in output);
  const required = isCurrent ? [...ANNUAL_PLAN_FIELDS, ...DOCUMENT_FIELDS, ...(isTemplate ? TEMPLATE_PLAN_FIELDS : [])] : ANNUAL_PLAN_FIELDS;
  const missing = required.filter((field) => !(field in output));
  const unknown = Object.keys(output).filter((field) => !required.includes(field));
  if (missing.length || unknown.length) throw new AnnualPlanValidationError("annual_plan_schema_mismatch", { missing_fields: missing, unknown_fields: unknown });
  for (const field of TEXT_FIELDS) if (!isText(output[field])) throw new AnnualPlanValidationError("annual_plan_required_field_invalid", { field });
  for (const field of TEXT_LIST_FIELDS.filter((field) => isCurrent || !DOCUMENT_FIELDS.includes(field))) if (!isTextList(output[field])) throw new AnnualPlanValidationError("annual_plan_required_field_invalid", { field });
  if (isTemplate && (!isTextList(output.organization_criteria) || output.organization_criteria.length !== 4 || !isTextList(output.transversal_approaches))) throw new AnnualPlanValidationError("annual_plan_required_field_invalid", { field: "organization_criteria" });
  if (!Array.isArray(output.proposed_experiences)) throw new AnnualPlanValidationError("annual_plan_required_field_invalid", { field: "proposed_experiences" });
  if (expectedSchoolYear !== undefined && output.school_year.trim() !== String(expectedSchoolYear)) throw new AnnualPlanValidationError("annual_plan_school_year_mismatch", { field: "school_year" });
  const allowed = new Set(allowedCompetencyIds);
  for (const [index, experience] of output.proposed_experiences.entries()) {
    const fields = [...EXPERIENCE_FIELDS, ...(isTemplate ? TEMPLATE_EXPERIENCE_FIELDS : []), ...(isFlexible ? ["duration_weeks"] : [])];
    if (!isRecord(experience) || fields.some((field) => !(field in experience)) || Object.keys(experience).some((field) => !fields.includes(field))) throw new AnnualPlanValidationError("annual_plan_experience_schema_mismatch", { index });
    if (!["project", "unit", "workshop"].includes(experience.experience_type)) throw new AnnualPlanValidationError("annual_plan_experience_type_invalid", { index });
    for (const field of EXPERIENCE_TEXT_FIELDS) if (!isText(experience[field])) throw new AnnualPlanValidationError("annual_plan_experience_schema_mismatch", { index, field });
    for (const field of EXPERIENCE_LIST_FIELDS) if (!isTextList(experience[field])) throw new AnnualPlanValidationError("annual_plan_experience_schema_mismatch", { index, field });
    if (isTemplate && (!isText(experience.purpose) || !isText(experience.final_product) || !isTextList(experience.materials) || !experience.materials.length)) throw new AnnualPlanValidationError("annual_plan_experience_schema_mismatch", { index, field: "project_details" });
    if (isFlexible && ![2, 3].includes(experience.duration_weeks)) throw new AnnualPlanValidationError("annual_plan_project_duration_invalid", { index });
    for (const id of [...experience.primary_competency_ids, ...experience.possible_secondary_competency_ids]) if (!allowed.has(id)) throw new AnnualPlanValidationError("annual_plan_competency_outside_bundle", { index, competency_id: id });
  }
  if (isFlexible) validateAnnualPlanMaster(output);
  else if (output.plan_format === LEGACY_TEMPLATE_FORMAT && output.proposed_experiences.length !== 20) throw new AnnualPlanValidationError("annual_plan_project_count_invalid");
  return output;
}

/** The first model creates the complete, curriculum-checked annual sequence. */
export function validateAnnualPlanMaster(master) {
  const projects = master?.proposed_experiences;
  if (!Array.isArray(projects) || projects.length !== 12) throw new AnnualPlanValidationError("annual_plan_project_count_invalid");
  for (const [index, project] of projects.entries()) {
    if (project?.experience_type !== "project" || project.period !== `Bimestre ${Math.floor(index / 3) + 1}` || !Array.isArray(project.primary_competency_ids) || !project.primary_competency_ids.length) {
      throw new AnnualPlanValidationError("annual_plan_project_order_invalid", { index });
    }
  }
  rejectRepeatedProjects(projects.map((project) => project.title), "title", 1);
  rejectRepeatedProjects(projects.map((project) => project.context_or_trigger), "context_or_trigger", 5);
  rejectRepeatedProjects(projects.map((project) => project.rationale), "rationale", 5);
  return master;
}

export function validateAnnualPlanDevelopment(output) {
  if (!isRecord(output) || Object.keys(output).length !== 3 || !["organization_criteria", "transversal_approaches", "project_details"].every((key) => key in output)
    || !isTextList(output.organization_criteria) || output.organization_criteria.length !== 4 || !isTextList(output.transversal_approaches)
    || !Array.isArray(output.project_details) || output.project_details.length !== 12) throw new AnnualPlanValidationError("annual_plan_development_invalid");
  for (const [index, detail] of output.project_details.entries()) {
    if (!isRecord(detail) || Object.keys(detail).length !== PROJECT_DETAIL_FIELDS.length || PROJECT_DETAIL_FIELDS.some((key) => !(key in detail))
      || detail.index !== index + 1 || !isText(detail.purpose) || !isText(detail.final_product) || !isTextList(detail.materials) || !detail.materials.length) {
      throw new AnnualPlanValidationError("annual_plan_development_invalid", { index });
    }
  }
  rejectRepeatedProjects(output.project_details.map((detail) => detail.purpose), "purpose", 5);
  rejectRepeatedProjects(output.project_details.map((detail) => detail.final_product), "final_product", 7);
  return output;
}

export function mergeAnnualPlanDevelopment(master, development, durationWeeks = DEFAULT_ANNUAL_PROJECT_WEEKS) {
  validateAnnualPlanMaster(master);
  validateAnnualPlanDevelopment(development);
  if (!Array.isArray(durationWeeks) || durationWeeks.length !== 12 || durationWeeks.some((weeks) => ![2, 3].includes(weeks))) {
    throw new AnnualPlanValidationError("annual_plan_project_duration_invalid");
  }
  return { ...master, plan_format: TEMPLATE_FORMAT, organization_criteria: development.organization_criteria,
    transversal_approaches: development.transversal_approaches,
    proposed_experiences: master.proposed_experiences.map((project, index) => ({ ...project,
      duration_weeks: durationWeeks[index],
      purpose: development.project_details[index].purpose,
      final_product: development.project_details[index].final_product,
      materials: development.project_details[index].materials })) };
}

export const ANNUAL_PLAN_TEMPLATE_FORMAT = TEMPLATE_FORMAT;
export const ANNUAL_PLAN_LEGACY_TEMPLATE_FORMAT = LEGACY_TEMPLATE_FORMAT;
