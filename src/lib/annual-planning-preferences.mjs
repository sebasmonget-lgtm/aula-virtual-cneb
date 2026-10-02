const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bounded = (value, limit) => typeof value === "string" && value.trim().length <= limit ? value.trim() : null;
export class PlanningPreferencesError extends Error {
  constructor(message) { super(message); this.name = "PlanningPreferencesError"; this.reason = "invalid_preferences"; }
}
const fail = (message) => { throw new PlanningPreferencesError(message); };

/** Planning intentions are separate from evidence, interests and diagnostic priorities. */
export function validatePlanningPreferences(value) {
  if (value === undefined) return undefined;
  if (!value || value.version !== 1 || !Array.isArray(value.teacher_ideas) || value.teacher_ideas.length > 10)
    fail("Revisa las ideas para este año. Puedes guardar hasta diez ideas.");
  const seen = new Set();
  const teacher_ideas = value.teacher_ideas.map((idea) => {
    const title = bounded(idea?.title, 180), explanation = bounded(idea?.explanation ?? "", 500);
    if (!uuid.test(idea?.id ?? "") || seen.has(idea.id) || !title || explanation === null
      || (idea.requested_month != null && (!Number.isInteger(idea.requested_month) || idea.requested_month < 1 || idea.requested_month > 12)))
      fail("Cada idea necesita un tema breve y un mes válido si deseas indicarlo.");
    seen.add(idea.id);
    return { id: idea.id, title, explanation, requested_month: idea.requested_month ?? null };
  });
  return { version: 1, teacher_ideas };
}

export function validateTeacherIdeaFeedback(feedback, preferences) {
  const ideas = preferences?.teacher_ideas ?? [];
  if (!ideas.length && feedback === undefined) return undefined;
  if (!Array.isArray(feedback) || feedback.length !== ideas.length)
    fail("Falta explicar cómo se consideraron las ideas de la docente.");
  const seen = new Set();
  return feedback.map((item) => {
    const explanation = bounded(item?.explanation, 700);
    if (!ideas.some((idea) => idea.id === item?.idea_id) || seen.has(item.idea_id) || !explanation)
      fail("Revisa la explicación de cada idea docente.");
    seen.add(item.idea_id);
    return { idea_id: item.idea_id, explanation };
  });
}

export function teacherIdeaPlacements(proposal) {
  return (proposal.planning_preferences?.teacher_ideas ?? []).map((idea) => {
    const rows = proposal.proposed_experiences.filter((row) => row.source_teacher_idea_ids?.includes(idea.id));
    const months = [...new Set(rows.map((row) => row.month))];
    const outcome = !rows.length ? "not_incorporated" : idea.requested_month && !months.includes(idea.requested_month) ? "alternative" : "incorporated";
    return { ...idea, outcome, months, proposal_ids: rows.map((row) => row.proposal_id),
      explanation: proposal.teacher_idea_feedback?.find((item) => item.idea_id === idea.id)?.explanation ?? "" };
  });
}
