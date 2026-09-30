import { createHash, randomUUID } from "node:crypto";
import { canonicalProjectDetails, projectMasterV3, validateProjectMasterV3 } from "./planning-contract-v3.mjs";
import { newAyniFeatureEnabled } from "./new-ayni-feature-flag.mjs";

const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export const simpleProjectEnabled = () => newAyniFeatureEnabled(process.env.AYNI_PROJECT_SIMPLE);
export const retainProjectCriterionIds = (next, previous) => ({ ...next,
  general_criteria: next.general_criteria.map((item) => ({ ...item,
    ...(previous?.general_criteria?.find((old) => old.competency_id === item.competency_id)?.criterion_id ?
      { criterion_id: previous.general_criteria.find((old) => old.competency_id === item.competency_id).criterion_id } : {}) })) });

/** Persist only identity/provenance missing from V1. The editable route remains the sole map. */
export function stampProjectV3(experience, details, source, kbVersion, dates, protectedVersion = null) {
  if (experience.status !== "draft") throw new Error("Una versión confirmada no se puede convertir ni reescribir.");
  const canonical = canonicalProjectDetails(details);
  const previous = experience.details?.dependents?.general_criteria ?? [];
  const criteria = canonical.dependents.general_criteria.map((item) => ({ ...item,
    criterion_id: item.criterion_id ?? previous.find((before) => before.competency_id === item.competency_id)?.criterion_id ?? randomUUID() }));
  const refs = new Map(criteria.map((item) => [item.competency_id, item.criterion_id]));
  const protectedIds = new Set((protectedVersion?.sourceRoute ?? []).filter(row =>
    String(row.date).slice(0, 10) <= protectedVersion.today || protectedVersion.recordedRouteIds.includes(row.id)).map(row => row.id));
  const stamped = { ...canonical, contract_version: "project-master-v3",
    dependents: { ...canonical.dependents, general_criteria: criteria },
    source_refs: { annual_plan_id: source.plan.id, annual_plan_version: Number(source.plan.version),
      proposal_id: source.proposalId, slot_id: source.slot.id },
    // Existing Word/version readers require the string. V3 projects derive the structured DTO from canonical decisions and source snapshot.
    starting_point: canonical.decisions.context_summary,
    source_proposal_snapshot: source.source,
    kb_version: kbVersion, calendar_fingerprint: hash(dates),
    // Historical rows in a successor stay byte-for-byte intact. DTO readers derive missing legacy refs.
    activity_route: canonical.activity_route.map((row) => protectedIds.has(row.id) ? row : ({ ...row,
      criterion_refs: [refs.get(row.criterion_competency_id ?? row.competency_id)] })) };
  stamped.source_fingerprint = hash({ source: source.source, source_refs: stamped.source_refs,
    kb_version: kbVersion, decisions: stamped.decisions, dependents: stamped.dependents,
    route: stamped.activity_route, dates });
  validateProjectMasterV3(projectMasterV3({ ...experience, details: stamped }), {
    instructionalDates: dates, allowedCompetencyIds: stamped.decisions.competency_ids,
  });
  return stamped;
}
