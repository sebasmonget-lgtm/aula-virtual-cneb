import { journeyFail } from "./annual-journey-contract.mjs";

// undefined preserves the older whole-batch API; null means only annual instructions.
export function scopedAnnualChanges(plan, proposalId) {
  if (proposalId !== undefined && proposalId !== null &&
    (typeof proposalId !== "string" || !plan.proposed_experiences.some(row => row.proposal_id === proposalId)))
    journeyFail("invalid_scope", "La propuesta no pertenece a este año.");
  return (plan.pending_changes ?? []).filter(change => proposalId === undefined ||
    (change.proposal_id ?? null) === proposalId);
}

// Calendar organization is structural copy, not generated pedagogical content.
export function annualCalendarCriteria(plan) {
  if (plan.editor_version !== 3) return [
    `Esta versión conserva ${plan.proposed_experiences.length} propuestas y sus fechas originales.`,
    "El calendario de esta versión se conserva; los borradores nuevos se organizan en 15 tramos."
  ];
  return [
    "15 tramos fijos después de Acogida: 11 de 2 semanas y 4 de 3 semanas.",
    "Las propuestas toman las fechas y la duración del tramo donde se colocan.",
    "Los feriados reducen los días lectivos reales, sin cambiar las semanas del tramo. Gestión no tiene clases."
  ];
}
