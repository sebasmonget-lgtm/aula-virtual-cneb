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

const CLASSROOM_FIELDS = new Set([
  "id", "name", "age", "classroom_or_student_scope", "group_context", "school_context",
  "calendar", "language_context", "interests", "available_resources", "materials", "space",
  "available_time", "family_context", "diagnostic_summary", "prior_reports",
]);
const STUDENT_FIELDS = new Set([
  "id", "age", "language_context", "family_context", "prior_reports", "observations",
  "portfolio_summary", "criteria_history", "evidence_history", "supports_used", "teacher_notes",
  "teacher_confirmed_findings", "context_changes",
]);
const EVIDENCE_FIELDS = new Set([
  "id", "criterion_id", "observed_status", "observation_note", "activity_context", "date",
  "multiple_evidence_records", "expected_evidence",
]);

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

function applicableL2(input) {
  return input.castellano_l2_applicable === true
    || input.language_context?.castellano_l2_applicable === true
    || input.language_context?.castellanoL2Applicable === true;
}

function applicableReligion(input) {
  return input.religion_applicable === true
    || input.classroom_context?.religion_applicable === true
    || input.classroom_context?.religionApplicable === true;
}

function allCardsComplete(cards, age, selectableOnly = false) {
  return cards.filter((card) => card?.id && card.official_name && card.ages?.[String(age)] && (!selectableOnly || card.runtime_selectable_by_age?.[String(age)]));
}

function shortlistCards(knowledgeBase, retrieval, age) {
  const cardById = new Map(knowledgeBase.competencyCards.map((card) => [card.id, card]));
  const retrievedIds = uniqueStrings(retrieval.semanticUnits.map((unit) => unit.competency_id));
  const shortlisted = retrievedIds.map((id) => cardById.get(id)).filter(Boolean);
  const remaining = knowledgeBase.competencyCards
    .filter((card) => !retrievedIds.includes(card.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  return allCardsComplete([...shortlisted, ...remaining], age, true).slice(0, SHORTLIST_SIZE);
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
      ...workflowRequirements.output_guardrails ?? [],
      ...rules.flatMap((rule) => rule.must_not ?? []),
    ]),
    teacher_authority: knowledgeBase.generationGuardrails.teacher_authority,
  };
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
  return uniqueIds;
}

/** Builds a workflow-scoped data bundle only; it does not call an AI provider. */
export async function buildAIContext(input, knowledgeBase) {
  knowledgeBase ??= await loadKnowledgeBaseV4();
  const confirmedIds = validateInput(input, knowledgeBase);
  const confirmedCompetencyId = confirmedIds[0] ?? null;
  const workflowRequirements = knowledgeBase.workflows[input.workflow];
  const retrieval = await retrieveKnowledgeV4({
    workflow: input.workflow,
    age: input.age,
    teacherRequest: input.teacher_request,
    confirmedCompetencyId,
    castellanoL2Applicable: applicableL2(input),
    religionApplicable: applicableReligion(input),
    temporalContext: input.temporal_context,
  }, knowledgeBase);
  const competencyCards = confirmedCompetencyId
    ? allCardsComplete(knowledgeBase.competencyCards.filter((card) => card.id === confirmedCompetencyId), input.age)
    : shortlistCards(knowledgeBase, retrieval, input.age);
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
      classroom: pickKnownFields(input.classroom_context, CLASSROOM_FIELDS),
      student: pickKnownFields(input.student_context, STUDENT_FIELDS),
      evidence: pickKnownFields(input.evidence, EVIDENCE_FIELDS),
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
