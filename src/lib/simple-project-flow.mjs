/** UI orchestration only: existing server routes remain the authorization and CAS boundary. */
import { jsonValuesDiffer } from "./project-draft-changes.mjs";

export function combineProjectContext(note, extras = {}) {
  const result = [note.trim(), ...Object.entries(extras).filter(([,value]) => value.trim()).map(([label,value]) => `${label}: ${value.trim()}`)]
    .filter(Boolean).join("\n");
  if (result.length > 1000) throw new Error("Resume el contexto en un máximo de 1000 caracteres entre los cinco campos.");
  return result;
}
export async function prepareSimpleProject({ request, planId, proposalId, proposal, additionalContext = "",
  experience = null, feedback = {}, onCheckpoint = () => {} }) {
  if (additionalContext.trim().length > 1000) throw new Error("Resume el contexto en un máximo de 1000 caracteres.");
  let row = experience;
  const checkpoint = (result) => { row = result.experience; onCheckpoint(row); return row; };
  if (!row) checkpoint(await request("/api/project-flow/start", { annualPlanId: planId, proposalId, ...feedback }));
  if (row.status !== "draft") throw new Error("Crea una nueva versión antes de cambiar un proyecto confirmado.");
  const original = row.details.decisions;
  const decisions = { context_summary: original?.context_summary ?? row.details.preview?.context_summary ?? proposal.rationale,
    purpose: original?.purpose ?? proposal.purpose,
    competency_ids: original?.competency_ids ?? proposal.primary_competency_ids,
    additional_context: additionalContext.trim() };
  const feedbackChanged = Object.hasOwn(feedback, "usePlanningFeedback") &&
    (row.details.planning_feedback?.period_id ?? null) !==
      (feedback.usePlanningFeedback ? feedback.planningFeedbackPeriodId ?? null : null);
  const changed = !original || jsonValuesDiffer(original, decisions) || feedbackChanged;
  if (!changed && row.details.stage === "map_review") return row;
  if (changed || !row.details.dependents) checkpoint(await request(`/api/project-flow/${row.id}/dependents`,
    { decisions, expectedRevision: row.revision, ...feedback }));
  const calendar = await request(`/api/project-flow/${row.id}/calendar`);
  if (calendar.selection.status !== "confirmed") {
    const selectedDates = calendar.days.filter((day) => day.selected && day.is_instructional).map((day) => day.date);
    if (!selectedDates.length) throw new Error("Revisa los días disponibles antes de preparar el proyecto.");
    await request(`/api/project-flow/${row.id}/calendar`, { selectedDates,
      exclusions: Object.fromEntries(calendar.days.filter((day) => day.is_instructional && !day.selected)
        .map((day) => [day.date, day.exclusion_reason || "No se utilizará en este proyecto"])), confirm: true }, "PUT");
  }
  // Refresh the revision after independently saved calendar/decisions; never reuse a stale CAS token.
  checkpoint(await request(`/api/project-flow/${row.id}`));
  checkpoint(await request(`/api/project-flow/${row.id}/master`,
    { dependents: row.details.dependents, expectedRevision: row.revision }));
  return row; // Preparation NEVER calls /confirm: only an explicit teacher gesture may confirm.
}
