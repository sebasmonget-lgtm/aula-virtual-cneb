/** Stable, read-only contracts over the existing planning records. Confirmed legacy rows are never rewritten. */
export const PROJECT_MASTER_CONTRACT_V3 = "project-master-v3";
export const ACTIVITY_CONTRACT_V3 = "activity-v3";
export const planningV3ReadEnabled = () => process.env.AYNI_PLANNING_V3_READ === "1";

const uuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** A proposal UUID is authoritative when present; an older plan uses its stable slot UUID. */
export function resolveAnnualProposal(plan, slots, requestedId) {
  const rows = plan?.proposal?.proposed_experiences;
  if (!uuid(plan?.id) || !Array.isArray(rows) || !uuid(requestedId)) return null;
  for (const slot of slots ?? []) {
    if (slot.annual_plan_id && slot.annual_plan_id !== plan.id) continue;
    const index = Number(slot.slot_index) - 1;
    const proposal = rows[index];
    if (!proposal || !uuid(slot.id)) continue;
    const proposalId = uuid(proposal.proposal_id) ? proposal.proposal_id : slot.id;
    if (slot.proposal_id && slot.proposal_id !== proposal.proposal_id) continue;
    if (requestedId !== proposalId && requestedId !== slot.id) continue;
    return { proposal, proposalId, slotId: slot.id, index, slot, planId: plan.id,
      planVersion: Number(plan.version ?? 1), legacy: !uuid(proposal.proposal_id) };
  }
  return null;
}

/** Strict gate for newly confirmed V3 records; permissive adapters remain read-only for legacy rows. */
export function validateProjectMasterV3(value, { instructionalDates = null, allowedCompetencyIds = null } = {}) {
  const source = value?.source;
  if (value?.contract_version !== PROJECT_MASTER_CONTRACT_V3 || value.compatibility_adapter ||
      !uuid(value.id) || !Number.isInteger(value.version) || value.version < 1 ||
      !uuid(source?.annual_plan_id) || !Number.isInteger(source?.annual_plan_version) ||
      !uuid(source?.proposal_id) || !uuid(source?.slot_id) ||
      !String(value.calendar_fingerprint ?? "").trim() || !String(value.kb_version ?? "").trim() ||
      !String(value.source_fingerprint ?? "").trim() ||
      !value.starting_point || typeof value.starting_point !== "object" ||
      !Array.isArray(value.competency_ids) || !value.competency_ids.length ||
      !Array.isArray(value.guiding_questions) || !value.guiding_questions.length ||
      !Array.isArray(value.criteria) || !value.criteria.length ||
      !Array.isArray(value.expected_evidence) || !value.expected_evidence.length ||
      !Array.isArray(value.progression) || !value.progression.length ||
      !Array.isArray(value.mediation) || !value.mediation.length ||
      !Array.isArray(value.teacher_overrides) ||
      !Array.isArray(value.activity_map) || !value.activity_map.length ||
      typeof value.purpose !== "string" || !value.purpose.trim())
    throw new Error("El contrato V3 del proyecto está incompleto.");
  const selected = new Set(value.competency_ids), ids = new Set(), dates = new Set();
  if (allowedCompetencyIds && value.competency_ids.some((id) => !allowedCompetencyIds.includes(id)))
    throw new Error("El proyecto V3 contiene competencias no aplicables.");
  const criteria = new Map();
  for (const criterion of value.criteria) {
    if (!uuid(criterion.criterion_id) || criteria.has(criterion.criterion_id) ||
        !selected.has(criterion.competency_id) || !String(criterion.text ?? "").trim())
      throw new Error("Los criterios V3 no corresponden a las competencias elegidas.");
    criteria.set(criterion.criterion_id, criterion);
  }
  if (value.expected_evidence.some((item) => !criteria.has(item.criterion_id) || !String(item.description ?? "").trim()))
    throw new Error("La evidencia esperada V3 no corresponde a un criterio.");
  for (const row of value.activity_map) {
    if (!uuid(row.blueprint_id) || ids.has(row.blueprint_id) || typeof row.date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || dates.has(row.date) ||
        !selected.has(row.competency_id) || !row.competency_ids?.includes(row.competency_id) ||
        row.competency_ids.some((id) => !selected.has(id)) ||
        !Array.isArray(row.criterion_refs) || !row.criterion_refs.length ||
        row.criterion_refs.some((ref) => !criteria.has(ref) || !row.competency_ids.includes(criteria.get(ref).competency_id)) ||
        !Array.isArray(row.expected_evidence) || !row.expected_evidence.length ||
        !Array.isArray(row.resource_refs) ||
        !String(row.purpose ?? "").trim()) throw new Error("El mapa V3 tiene vínculos incompletos o duplicados.");
    ids.add(row.blueprint_id); dates.add(row.date);
  }
  if (instructionalDates && (dates.size !== instructionalDates.length ||
      instructionalDates.some((date) => !dates.has(date))))
    throw new Error("El mapa V3 no coincide con los días lectivos confirmados.");
  return value;
}

/** The teacher-editable route wins over a stale duplicate in project_master. */
export function canonicalProjectRoute(details) {
  if (Array.isArray(details?.activity_route)) return details.activity_route;
  return Array.isArray(details?.project_master?.activity_blueprints) ? details.project_master.activity_blueprints : [];
}

/** New draft writes retain only activity_route; old confirmed JSON remains readable as-is. */
export function canonicalProjectDetails(details) {
  if (!details || typeof details !== "object") return details;
  const master = { ...details.project_master };
  delete master.activity_blueprints;
  return { ...details, project_master: master, activity_route: canonicalProjectRoute(details) };
}

/** Read adapter for structured v1/v2 projects and future v3 rows. Null means a truly legacy, unstructured project. */
export function projectMasterV3(experience, { planVersion = null, slotId = null, proposalId = null } = {}) {
  const details = experience?.details ?? {};
  const route = canonicalProjectRoute(details);
  if (!Array.isArray(route) || !route.length || !route.every((item) => uuid(item.id))) return null;
  if (details.contract_version === PROJECT_MASTER_CONTRACT_V3) {
    const criteria = details.dependents?.general_criteria ?? [];
    return { contract_version: PROJECT_MASTER_CONTRACT_V3, id: experience.id,
      version: Number(experience.version ?? 1), status: experience.status,
      source: details.source_refs, starting_point: { proposal: details.source_proposal_snapshot,
        teacher_context: details.decisions?.additional_context, preview: details.decisions?.context_summary,
        no_new_context: !String(details.decisions?.additional_context ?? "").trim() },
      calendar_fingerprint: details.calendar_fingerprint, source_fingerprint: details.source_fingerprint,
      kb_version: details.kb_version, purpose: details.decisions?.purpose,
      competency_ids: details.decisions?.competency_ids ?? [],
      guiding_questions: details.dependents?.guiding_questions ?? [],
      criteria: criteria.map((item) => ({ criterion_id: item.criterion_id, competency_id: item.competency_id, text: item.criterion })),
      expected_evidence: criteria.flatMap((item) => (item.expected_evidence ?? []).map((description) => ({ criterion_id: item.criterion_id, description }))),
      progression: details.dependents?.journey ?? [],
      mediation: route.map((item) => ({ blueprint_id: item.id, guidance: item.mediation_notes })),
      resources: details.project_master?.resources ?? [], foundation: details.project_master?.foundation,
      closing: { description: details.project_master?.closing_description, rationale: details.project_master?.closing_rationale },
      teacher_overrides: details.teacher_overrides ?? [],
      activity_map: route.map((item) => ({ ...item, blueprint_id: item.id,
        competency_id: item.criterion_competency_id ?? item.competency_id,
        criterion_refs: item.criterion_refs ?? [criteria.find(criterion =>
          criterion.competency_id === (item.criterion_competency_id ?? item.competency_id))?.criterion_id],
        purpose: item.specific_purpose, criterion_text: item.evaluation_criterion,
        expected_evidence: [item.expected_evidence], resource_refs: item.materials ?? [],
        mediation: item.mediation_notes, progression: item.expected_progression })) };
  }
  const selected = details.decisions?.competency_ids ?? [
    ...(details.primary_competency_ids ?? []), ...(details.possible_secondary_competency_ids ?? [])];
  const criteria = details.dependents?.general_criteria ?? [];
  return {
    contract_version: PROJECT_MASTER_CONTRACT_V3,
    compatibility_adapter: details.contract_version !== PROJECT_MASTER_CONTRACT_V3,
    source_format: details.flow_version ?? details.document_template_version ?? "legacy-structured",
    id: experience.id, version: Number(experience.version ?? 1), status: experience.status,
    source: { annual_plan_id: experience.annual_plan_id ?? null, annual_plan_version: planVersion,
      proposal_id: experience.source_proposal_id ?? proposalId, proposal_index: experience.source_proposal_index ?? null,
      slot_id: slotId },
    starting_point: details.starting_point ?? details.decisions?.context_summary ?? null,
    purpose: details.decisions?.purpose ?? details.purpose ?? experience.purpose,
    competency_ids: [...new Set(selected)], guiding_questions: details.dependents?.guiding_questions ?? [],
    criteria: criteria.map((item) => ({ competency_id: item.competency_id, text: item.criterion,
      expected_evidence: item.expected_evidence ?? [] })),
    progression: details.dependents?.journey ?? [],
    foundation: details.project_master?.foundation ?? null,
    closing: { description: details.project_master?.closing_description ?? null,
      rationale: details.project_master?.closing_rationale ?? null },
    resources: details.project_master?.resources ?? details.spaces_and_materials ?? [],
    activity_map: route.map((item) => ({ ...item, blueprint_id: item.id,
      competency_id: item.criterion_competency_id ?? item.competency_id,
      criterion_text: item.evaluation_criterion ?? item.criterion_text,
      purpose: item.specific_purpose ?? item.purpose,
      expected_evidence: item.expected_evidence,
      mediation: item.mediation_notes ?? null,
      progression: item.expected_progression ?? null })),
  };
}

/** An activity keeps the exact experience and blueprint IDs it inherited, including archived versions. */
export function activityV3(activity, experience) {
  if (!activity || !experience || activity.experience_id !== experience.id) return null;
  const blueprintId = activity.details?.route_item_id;
  const blueprint = canonicalProjectRoute(experience.details).find((item) => item.id === blueprintId);
  if (!uuid(blueprintId) || !blueprint) return null;
  return { contract_version: ACTIVITY_CONTRACT_V3, compatibility_adapter: true,
    id: activity.id, version: Number(activity.version ?? 1),
    status: activity.status, project_id: experience.id, project_version: Number(experience.version ?? 1),
    blueprint_id: blueprintId, occurs_on: activity.occurs_on, planned_date: blueprint.date,
    purpose: activity.details?.purpose ?? activity.purpose, competency_id: activity.details?.competency_id ?? blueprint.competency_id,
    criterion_text: activity.details?.evaluation_criterion ?? blueprint.evaluation_criterion,
    expected_evidence: activity.details?.expected_evidence ?? blueprint.expected_evidence,
    teacher_overrides: activity.details?.teacher_overrides ?? [] };
}

export function validateActivityV3(value, project) {
  if (value?.contract_version !== ACTIVITY_CONTRACT_V3 || value.compatibility_adapter || !uuid(value.id) ||
      value.project_id !== project?.id || value.project_version !== Number(project.version ?? 1) ||
      !project.activity_map?.some((row) => row.blueprint_id === value.blueprint_id) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.occurs_on ?? "") ||
      !Array.isArray(value.criterion_refs) || !value.criterion_refs.length ||
      !Array.isArray(value.evidence_opportunities) ||
      !Array.isArray(value.sequence) || !value.sequence.length ||
      !Array.isArray(value.preparation) || !Array.isArray(value.mediation) ||
      !Array.isArray(value.adaptations) || !Array.isArray(value.teacher_overrides) ||
      !String(value.purpose ?? "").trim())
    throw new Error("La actividad V3 no corresponde al proyecto y blueprint confirmados.");
  const blueprint = project.activity_map.find((row) => row.blueprint_id === value.blueprint_id);
  if (value.criterion_refs.some((ref) => !blueprint.criterion_refs.includes(ref)))
    throw new Error("La actividad V3 no corresponde al criterio de su blueprint.");
  return value;
}
