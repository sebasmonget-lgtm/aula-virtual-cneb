import { loadKnowledgeBaseV4, validateKnowledgeBaseAge, validateKnowledgeBaseWorkflow } from "./knowledge-base-v4.mjs";
import { retrieveKnowledgeV4 } from "./knowledge-retrieval-v4.mjs";

const SHORTLIST_SIZE = 3;

const GENERATION_RULE_BY_WORKFLOW = {
  diagnostic: "assessment",
  annual_plan: "annual_plan",
  project: "project_unit",
  unit: "project_unit",
  workshop: "activity",
  activity: "activity",
  criterion_and_evidence: "assessment",
  evidence_capture: "assessment",
  assessment: "assessment",
  descriptive_conclusion: "assessment",
  family_report: "reports",
  material_generation: "reports",
  today_mode: "activity",
};

const STUDENT_FIELDS = new Set([
  "id", "age", "language_context", "family_context", "prior_reports", "observations",
  "portfolio_summary", "criteria_history", "evidence_history", "supports_used", "teacher_notes",
  "teacher_confirmed_findings", "context_changes",
]);
const EVIDENCE_FIELDS = new Set([
  "id", "criterion_id", "observed_status", "observation_note", "activity_context", "date",
  "multiple_evidence_records", "expected_evidence",
]);

export class MissingWorkflowContextError extends Error {
  constructor(workflow, missingFields) {
    super(`Falta contexto obligatorio para ${workflow}: ${missingFields.join(", ")}.`);
    this.name = "MissingWorkflowContextError";
    this.code = "MISSING_REQUIRED_USER_CONTEXT";
    this.workflow = workflow;
    this.missing_fields = missingFields;
  }
}

function pickKnownFields(value, fields) {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return value;
  const subset = Object.fromEntries(Object.entries(value).filter(([key, fieldValue]) => fields.has(key) && fieldValue !== undefined));
  return Object.keys(subset).length ? subset : null;
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];
}

function selectedAgeReferences(curriculumReference, cardIds, age) {
  const curriculumCards = new Map(curriculumReference.competencies.map((competency) => [competency.id, competency]));
  return cardIds.map((id) => ({ competency_id: id, age, reference: curriculumCards.get(id)?.age_references?.[String(age)] ?? null }));
}

function specialRules(specialApplicability, cardIds) {
  return specialApplicability.rules.filter((rule) => cardIds.includes(rule.competency_id));
}

export function applicableL2(input) {
  return input.castellano_l2_applicable === true
    || input.language_context?.castellano_l2_applicable === true
    || input.language_context?.castellanoL2Applicable === true;
}

export function applicableReligion(input) {
  return input.religion_applicable === true
    || input.classroom_context?.religion_applicable === true
    || input.classroom_context?.religionApplicable === true;
}

function allCardsComplete(cards, age, selectableOnly = false) {
  return cards.filter((card) => card?.id && card.official_name && card.ages?.[String(age)] && (!selectableOnly || card.runtime_selectable_by_age?.[String(age)]));
}

export function cardIsApplicable(card, { castellanoL2Applicable, religionApplicable }) {
  if (card.id === "CAST_L2_ORAL") return castellanoL2Applicable;
  if (card.id === "PS_RELIGION") return religionApplicable;
  return true;
}

function shortlistCards(knowledgeBase, retrieval, age, applicability) {
  const cardById = new Map(knowledgeBase.competencyCards.map((card) => [card.id, card]));
  const retrievedIds = uniqueStrings(retrieval.semanticUnits.map((unit) => unit.competency_id));
  const shortlisted = retrievedIds.map((id) => cardById.get(id)).filter((card) => card && cardIsApplicable(card, applicability));
  return allCardsComplete(shortlisted, age, true).slice(0, SHORTLIST_SIZE);
}

function relevantPedagogyModules(knowledgeBase, workflowRequirements) {
  return workflowRequirements.required_domains
    .map((domain) => knowledgeBase.pedagogyModules[domain])
    .filter(Boolean)
    .map((module) => ({ id: module.id, purpose: module.purpose, source_refs: module.source_refs, rules: module.rules ?? [] }));
}

function buildConstraints(knowledgeBase, workflowRequirements, rules) {
  return {
    must: uniqueStrings([
      ...(knowledgeBase.generationGuardrails.must ?? []),
      ...rules.flatMap((rule) => rule.must ?? []),
    ]),
    must_not: uniqueStrings([
      ...(knowledgeBase.generationGuardrails.must_not ?? []),
      ...(knowledgeBase.generationRules.prohibitedShortcuts.shortcuts ?? []),
      ...workflowRequirements.output_guardrails ?? [],
      ...rules.flatMap((rule) => rule.must_not ?? []),
    ]),
    teacher_authority: knowledgeBase.generationGuardrails.teacher_authority,
  };
}

function hasValue(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "object") return Object.values(value).some(hasValue);
  return true;
}

function firstStructuredValue(input, field) {
  return input[field]
    ?? input.classroom_context?.[field]
    ?? input.student_context?.[field]
    ?? input.evidence?.[field];
}

export function resolveRequiredUserContext(input, requiredFields) {
  const competencyId = uniqueStrings(input.competency_ids ?? [])[0];
  const values = {
    age: input.age,
    classroom_or_student_scope: input.classroom_or_student_scope ?? input.classroom_context?.classroom_or_student_scope ?? input.classroom_context ?? input.student_context,
    classroom_context: input.classroom_context,
    student_context: input.student_context,
    competency_id: competencyId,
    calendar: input.calendar_context ?? input.classroom_context?.calendar,
    language_context: input.language_context ?? input.classroom_context?.language_context ?? input.student_context?.language_context,
    student_id: input.student_id ?? input.student_context?.id,
    criterion_id: input.criterion_id ?? input.evidence?.criterion_id,
    observed_status: input.observed_status ?? input.evidence?.observed_status,
    evidence_history: input.evidence_history ?? input.student_context?.evidence_history ?? input.evidence?.evidence_history,
    multiple_evidence_records: input.multiple_evidence_records ?? input.evidence?.multiple_evidence_records,
    teacher_confirmed_findings: input.teacher_confirmed_findings ?? input.student_context?.teacher_confirmed_findings,
  };
  for (const field of requiredFields) values[field] ??= firstStructuredValue(input, field);
  const missingFields = requiredFields.filter((field) => !hasValue(values[field]));
  return { values, missingFields };
}

function workflowInputSubset(input, workflowRequirements) {
  const fields = uniqueStrings([...workflowRequirements.required_user_context, ...workflowRequirements.preferred_user_context]);
  const { values } = resolveRequiredUserContext(input, fields);
  const representedElsewhere = new Set([
    "age", "classroom_or_student_scope", "classroom_context", "student_context", "competency_id",
    "calendar", "language_context", "student_id", "criterion_id", "observed_status", "evidence_history",
    "multiple_evidence_records", "teacher_confirmed_findings",
  ]);
  return Object.fromEntries(fields
    .filter((field) => !representedElsewhere.has(field) && hasValue(values[field]))
    .map((field) => [field, values[field]]));
}

function workflowUses(workflowRequirements, fragment) {
  return [...workflowRequirements.required_user_context, ...workflowRequirements.preferred_user_context].some((field) => field.includes(fragment));
}

function classroomSubset(input, workflowRequirements, retrieval) {
  const allowed = new Set(["id"]);
  if (workflowUses(workflowRequirements, "classroom") || workflowUses(workflowRequirements, "group")) allowed.add("group_context");
  if (workflowUses(workflowRequirements, "school")) allowed.add("school_context");
  if (workflowUses(workflowRequirements, "materials") || workflowUses(workflowRequirements, "resources")) {
    allowed.add("materials");
    allowed.add("available_resources");
  }
  if (workflowUses(workflowRequirements, "space")) allowed.add("space");
  if (workflowUses(workflowRequirements, "time") || workflowUses(workflowRequirements, "frequency")) allowed.add("available_time");
  if (workflowUses(workflowRequirements, "interest") || workflowUses(workflowRequirements, "children_questions") || workflowUses(workflowRequirements, "project_trigger")) allowed.add("interests");
  if (workflowUses(workflowRequirements, "diagnostic")) allowed.add("diagnostic_summary");
  if (workflowUses(workflowRequirements, "prior_reports")) allowed.add("prior_reports");
  if (workflowUses(workflowRequirements, "family")) allowed.add("family_context");
  const classroom = pickKnownFields(input.classroom_context, allowed) ?? {};
  if (workflowRequirements.required_user_context.includes("classroom_or_student_scope")) {
    const scope = input.classroom_or_student_scope ?? input.classroom_context?.classroom_or_student_scope;
    if (hasValue(scope)) classroom.classroom_or_student_scope = scope;
  }
  if (workflowUses(workflowRequirements, "calendar")) {
    const calendar = input.calendar_context ?? input.classroom_context?.calendar;
    if (hasValue(calendar)) classroom.calendar_context = calendar;
  }
  if (workflowUses(workflowRequirements, "language") || applicableL2(input)) {
    const language = input.language_context ?? input.classroom_context?.language_context ?? input.student_context?.language_context;
    if (hasValue(language)) classroom.language_context = language;
  }
  if (retrieval.units.some((unit) => unit.temporal_scope === "2026") && hasValue(input.temporal_context)) {
    classroom.temporal_context = input.temporal_context;
  }
  return Object.keys(classroom).length ? classroom : null;
}

function workflowNeedsStudent(workflowRequirements) {
  return workflowUses(workflowRequirements, "student") || workflowUses(workflowRequirements, "evidence_history") || workflowUses(workflowRequirements, "teacher_confirmed");
}

function workflowNeedsEvidence(workflowRequirements) {
  return workflowUses(workflowRequirements, "evidence")
    || workflowUses(workflowRequirements, "criterion")
    || workflowUses(workflowRequirements, "observed_status")
    || workflowRequirements.required_domains.includes("evidence_and_criteria");
}

function studentSubset(input, workflowRequirements) {
  if (!workflowNeedsStudent(workflowRequirements)) return null;
  const student = pickKnownFields(input.student_context, STUDENT_FIELDS) ?? {};
  const { values } = resolveRequiredUserContext(input, [...workflowRequirements.required_user_context, ...workflowRequirements.preferred_user_context]);
  const aliases = { student_id: "id", evidence_history: "evidence_history", teacher_confirmed_findings: "teacher_confirmed_findings" };
  for (const [field, target] of Object.entries(aliases)) {
    if (hasValue(values[field])) student[target] = values[field];
  }
  return Object.keys(student).length ? student : null;
}

function evidenceSubset(input, workflowRequirements) {
  if (!workflowNeedsEvidence(workflowRequirements)) return null;
  const evidence = pickKnownFields(input.evidence, EVIDENCE_FIELDS) ?? {};
  const { values } = resolveRequiredUserContext(input, [...workflowRequirements.required_user_context, ...workflowRequirements.preferred_user_context]);
  for (const field of ["criterion_id", "observed_status", "multiple_evidence_records"]) {
    if (hasValue(values[field])) evidence[field] = values[field];
  }
  return Object.keys(evidence).length ? evidence : null;
}

function validateInput(input, knowledgeBase) {
  validateKnowledgeBaseAge(input?.age);
  validateKnowledgeBaseWorkflow(input?.workflow, knowledgeBase.workflows);
  if (typeof input?.teacher_request !== "string" || !input.teacher_request.trim()) {
    throw new TypeError("teacher_request es obligatorio para construir AIContextBundle.");
  }
  const competencyIds = input.competency_ids ?? [];
  if (!Array.isArray(competencyIds) || competencyIds.some((id) => typeof id !== "string")) {
    throw new TypeError("competency_ids debe ser una lista de IDs de competencia.");
  }
  const uniqueIds = uniqueStrings(competencyIds);
  if (uniqueIds.length > 1) {
    throw new RangeError("AIContextBundle acepta una sola competencia confirmada por llamada.");
  }
  const workflowRequirements = knowledgeBase.workflows[input.workflow];
  const requiredContext = resolveRequiredUserContext(input, workflowRequirements.required_user_context);
  if (requiredContext.missingFields.length) throw new MissingWorkflowContextError(input.workflow, requiredContext.missingFields);
  return { uniqueIds, requiredContext };
}

/** Builds a workflow-scoped data bundle only; it does not call an AI provider. */
export async function buildAIContext(input, knowledgeBase) {
  knowledgeBase ??= await loadKnowledgeBaseV4();
  const { uniqueIds: confirmedIds } = validateInput(input, knowledgeBase);
  const confirmedCompetencyId = confirmedIds[0] ?? null;
  const workflowRequirements = knowledgeBase.workflows[input.workflow];
  const applicability = { castellanoL2Applicable: applicableL2(input), religionApplicable: applicableReligion(input) };
  const retrieval = await retrieveKnowledgeV4({
    workflow: input.workflow,
    age: input.age,
    teacherRequest: input.teacher_request,
    confirmedCompetencyId,
    ...applicability,
    temporalContext: input.temporal_context,
  }, knowledgeBase);
  const competencyCards = confirmedCompetencyId
    ? allCardsComplete(knowledgeBase.competencyCards.filter((card) => card.id === confirmedCompetencyId), input.age)
    : shortlistCards(knowledgeBase, retrieval, input.age, applicability);
  const competencyIds = competencyCards.map((card) => card.id);
  const applicabilityRules = specialRules(knowledgeBase.specialApplicability, competencyIds);
  const pedagogicalModules = relevantPedagogyModules(knowledgeBase, workflowRequirements);
  const generationRules = knowledgeBase.generationRules[GENERATION_RULE_BY_WORKFLOW[input.workflow]];
  const sourceRefs = uniqueStrings([
    ...retrieval.provenance.source_refs,
    ...competencyCards.flatMap((card) => card.source_refs ?? []),
    ...selectedAgeReferences(knowledgeBase.curriculumReference, competencyIds, input.age).flatMap(({ reference }) => reference?.source_refs ?? []),
    ...pedagogicalModules.flatMap((module) => module.source_refs ?? []),
  ]).sort();

  return {
    workflow: input.workflow,
    context: {
      teacher_request: input.teacher_request,
      classroom: classroomSubset(input, workflowRequirements, retrieval),
      student: studentSubset(input, workflowRequirements),
      evidence: evidenceSubset(input, workflowRequirements),
      workflow_inputs: workflowInputSubset(input, workflowRequirements),
    },
    curriculum: {
      competency_cards: competencyCards,
      age_reference: selectedAgeReferences(knowledgeBase.curriculumReference, competencyIds, input.age),
      special_applicability: applicabilityRules,
    },
    knowledge: {
      semantic_units: retrieval.semanticUnits,
      source_claims: retrieval.sourceClaims,
      pedagogical_modules: pedagogicalModules,
      generation_rules: generationRules,
    },
    constraints: buildConstraints(knowledgeBase, workflowRequirements, applicabilityRules),
    provenance: {
      knowledge_base_version: knowledgeBase.version,
      knowledge_unit_ids: [...new Set(retrieval.provenance.knowledge_unit_ids)],
      source_claim_ids: [...new Set(retrieval.provenance.source_claim_ids)],
      source_refs: sourceRefs,
      competency_ids: competencyIds,
    },
  };
}
