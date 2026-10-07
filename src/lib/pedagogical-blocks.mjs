/** Server projection of explicit pedagogical fields. Never infer sections by parsing prose. */
export function activityPedagogicalBlocks(details = {}, steps = [], criteria = []) {
  const opportunities = criteria.map(criterion => ({
    id: criterion.id, competency_id: criterion.competency_v4_id ?? criterion.competency_id,
    competency_name: criterion.competency_text ?? null, criterion: criterion.criterion_text,
    expected_evidence: criterion.details?.expected_evidence ?? details.expected_evidence ?? null,
  }));
  if (details.child_actions || details.meaningful_situation) return [
    { id: "opening", title: "Comiencen", instruction: details.meaningful_situation },
    { id: "development", title: "Exploren y prueben", instruction: details.mediation || details.child_actions,
      ...(details.mediation && details.child_actions ? { expected_actions: details.child_actions } : {}),
      ...(opportunities.length ? { observations: opportunities } : {}) },
    { id: "closure", title: "Compartan lo que ocurrió", instruction: details.closure_or_continuity },
  ].filter(block => typeof block.instruction === "string" && block.instruction.trim());
  // Historical activities keep their literal instructions; no invented examples or evidence.
  return steps.map((instruction, index) => ({ id: `instruction-${index + 1}`, title: `Actividad · ${index + 1}`, instruction,
    ...(index === Math.max(0, steps.length - 2) && opportunities.length ? { observations: opportunities } : {}) }));
}

export function diagnosticPedagogicalBlocks(experience) {
  return [{ id: "prepare", title: "Prepara el juego", instruction: experience.teacher_instructions },
    ...experience.aspects.map(aspect => ({ id: aspect.id, title: aspect.label, instruction: aspect.prompt,
      ...(aspect.examples?.length ? { examples: aspect.examples } : {}),
      observations: [{ id: aspect.id, criterion: aspect.prompt }] }))];
}
