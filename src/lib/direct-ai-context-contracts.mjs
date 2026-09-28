import { canonicalProjectRoute } from "./planning-contract-v3.mjs";

/** A confirmed project's stable decisions, without a second copy of the daily map. */
export function confirmedProjectFoundation(project) {
  const details = project?.details ?? {};
  const master = details.project_master ?? {};
  return {
    id: project.id, title: project.title, purpose: project.purpose,
    decisions: details.decisions ?? null,
    guiding_questions: details.dependents?.guiding_questions ?? [],
    project_master: {
      foundation: master.foundation ?? null,
      closing_description: master.closing_description ?? null,
      closing_rationale: master.closing_rationale ?? null,
      resources: master.resources ?? [],
    },
  };
}

/** The daily call sees its row and immediate neighbors; it never receives a duplicate complete map. */
export function confirmedDailyRouteContext(route, position) {
  if (!Array.isArray(route) || position < 0 || position >= route.length)
    throw new Error("La actividad no pertenece al mapa confirmado.");
  return { route_position: { number: position + 1, total: route.length },
    inherited_route_item: route[position], previous_map_item: route[position - 1] ?? null,
    next_map_item: route[position + 1] ?? null };
}

/** Formalization respects the confirmed map and omits the duplicate blueprint array and edit history. */
export function confirmedProjectFormalContext(project) {
  const details = project?.details ?? {};
  const foundation = confirmedProjectFoundation(project);
  return {
    ...foundation, starting_point: details.starting_point ?? null,
    trigger_or_interest: details.trigger_or_interest ?? null,
    learning_need_or_context: details.learning_need_or_context ?? null,
    primary_competency_ids: details.primary_competency_ids ?? [],
    possible_secondary_competency_ids: details.possible_secondary_competency_ids ?? [],
    possible_pathways: details.possible_pathways ?? [],
    proposed_situations: details.proposed_situations ?? [],
    spaces_and_materials: details.spaces_and_materials ?? [],
    evidence_opportunities: details.evidence_opportunities ?? [],
    activity_route: canonicalProjectRoute(details),
  };
}
