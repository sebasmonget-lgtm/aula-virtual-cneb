const requiredCompetencyFields = ["id", "official_name", "meaning", "pedagogical_intent", "capacities", "cycle_standard_meaning", "when_to_use", "do_not_use_when", "typical_contexts", "observable_actions", "possible_evidence", "examples", "not_examples", "common_confusions"];
const requiredPerformanceFields = ["id", "competency_id", "age", "official_text_ref", "meaning", "focus", "when_to_select", "when_not_to_select", "observable_actions", "expected_evidence", "examples", "not_examples", "confusable_with"];

export function routeAssistantIntent(message = "") {
  const text = message.toLowerCase();
  if (/qué toca|que toca|horario|hoy/.test(text)) return "today";
  if (/evidencia|observ/.test(text)) return "register_evidence";
  if (/competencia|desempeño|desempeno/.test(text)) return "curriculum_selection";
  if (/actividad/.test(text)) return "plan_activity";
  if (/proyecto/.test(text)) return "plan_project";
  return "needs_generative_model";
}

export function hasCompleteSemanticCard(card, kind = "competency") {
  const fields = kind === "competency" ? requiredCompetencyFields : requiredPerformanceFields;
  return card?.review_status === "verified" && fields.every((field) => Array.isArray(card[field]) ? card[field].length > 0 : Boolean(card[field]));
}

export function validateJevSelection({ age, candidates, selection, kind = "competency", minimumConfidence = 0.7 }) {
  const valid = candidates.filter((candidate) => hasCompleteSemanticCard(candidate, kind) && (kind !== "performance" || candidate.age === age));
  const candidateIds = new Set(valid.map((candidate) => candidate.id));
  const selectedIds = kind === "competency" ? [selection.primary_competency_id, ...(selection.secondary_competency_ids ?? [])] : selection.ranked_performance_ids ?? [];
  if (!valid.length) return { status: "manual_selection_required", reason: "no_verified_semantic_candidates", candidate_ids: [] };
  if (!selectedIds.length || selectedIds.some((id) => !candidateIds.has(id))) return { status: "manual_selection_required", reason: "selection_outside_candidates", candidate_ids: [...candidateIds] };
  if (selection.confidence < minimumConfidence) return { status: "manual_selection_required", reason: "low_confidence", candidate_ids: [...candidateIds] };
  return { status: "proposal", selected_ids: selectedIds, confidence: selection.confidence };
}
