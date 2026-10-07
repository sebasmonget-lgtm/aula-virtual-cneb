/** The teacher identifies a pedagogical change; wording, dates and materials never trigger IA. */
export function criterionRealignmentEligibility({ changeKind, reason }) {
  const significant = ["purpose", "children_actions"].includes(changeKind);
  return { allowed: significant && typeof reason === "string" && reason.trim().length >= 10 && reason.length <= 1000,
    message: significant ? "Explica qué cambió en lo que harán los niños o en el propósito." : "Conserva qué observar si solo cambian materiales, tiempo, lugar o redacción." };
}
