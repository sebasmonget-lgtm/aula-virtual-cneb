import { randomUUID } from "node:crypto";

const routeFields = ["title", "specific_purpose", "competency_id", "evaluation_criterion", "expected_evidence"];

/** Assign stable IDs only at the server boundary, preserving them on teacher edits. */
export function saveExperienceDetails(proposal, previous = null, generated = null) {
  if (!Array.isArray(proposal.activity_route)) return { ...proposal };
  const before = previous?.activity_route ?? [];
  const previousIds = new Set(before.map((item) => item.id).filter(Boolean));
  const usedIds = new Set();
  const route = (proposal.activity_route ?? []).map((item) => {
    const id = previousIds.has(item.id) && !usedIds.has(item.id) ? item.id : randomUUID();
    usedIds.add(id);
    return { ...item, id };
  });
  const baseline = generated ?? previous;
  const overrides = [...(previous?.teacher_overrides ?? [])];
  if (baseline) {
    for (const field of ["title", "purpose", "starting_point", "trigger_or_interest", "learning_need_or_context", "flexibility_notes"]) {
      if (field in proposal && JSON.stringify(proposal[field]) !== JSON.stringify(baseline[field]))
        overrides.push({ field, from: baseline[field] ?? null, to: proposal[field], source: previous ? "teacher_edit" : "teacher_review" });
    }
    for (const [index, item] of route.entries()) for (const field of routeFields) {
      const from = previous ? baseline.activity_route?.find((entry) => entry.id === item.id)?.[field] : baseline.activity_route?.[index]?.[field];
      if (from !== undefined && item[field] !== from)
        overrides.push({ field: `activity_route.${item.id}.${field}`, from, to: item[field], source: previous ? "teacher_edit" : "teacher_review" });
    }
  }
  return { ...proposal, activity_route: route, document_template_version: "experience-unified-v1", teacher_overrides: overrides };
}

export function routeItemFor(experience, routeItemId) {
  if (!routeItemId) return null;
  return experience?.details?.activity_route?.find((item) => item.id === routeItemId) ?? null;
}

export function saveActivityDetails(proposal, routeItem = null, previous = null) {
  if (!routeItem && previous?.document_template_version !== "activity-unified-v1") return { ...proposal };
  const overrides = [...(previous?.teacher_overrides ?? [])];
  if (routeItem) {
    for (const [field, inherited] of [["purpose", routeItem.specific_purpose], ["competency_id", routeItem.competency_id], ["evaluation_criterion", routeItem.evaluation_criterion], ["expected_evidence", routeItem.expected_evidence]]) {
      if (proposal[field] !== inherited && (!previous || proposal[field] !== previous[field]))
        overrides.push({ field, from: inherited, to: proposal[field], source: "teacher_review" });
    }
  }
  return { ...proposal, route_item_id: routeItem?.id ?? previous?.route_item_id ?? null,
    document_template_version: "activity-unified-v1", teacher_overrides: overrides };
}

export function inheritedActivityCriterion(activity, routeItem) {
  if (!routeItem || activity?.competency_status !== "confirmed" || activity.competency_id !== routeItem.competency_id) return null;
  return { competency_id: routeItem.competency_id, criterion_text: activity.evaluation_criterion || routeItem.evaluation_criterion,
    expected_evidence: activity.expected_evidence || routeItem.expected_evidence, acceptable_evidence_variations: [], observation_focus: [],
    evidence_scope: "individual", teacher_caution: "Registrar lo observado después de la actividad; no inferir desde un producto colectivo." };
}
