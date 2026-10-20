/** Only explicit unresolved resource conditions need a teacher decision; no availability is inferred. */
export function unresolvedProjectResources(proposal = {}) {
  return (proposal.materials ?? []).filter(value => typeof value === "string" &&
    /por confirmar|pendiente(?:s)? de confirm|si (?:se )?(?:dispone|cuenta|tiene)|acceso no confirmado/i.test(value));
}

export function resourceReadiness(proposal, confirmed, teacherId, source) {
  const resources = unresolvedProjectResources(proposal);
  if (resources.length && confirmed !== true)
    throw new Error("Confirma que los recursos indicados estarán disponibles o ajusta la propuesta con Ayni antes de prepararla.");
  return resources.length ? { resources, confirmed_by: teacherId, confirmed_at: new Date().toISOString(), ...(source ? {confirmation_source:source} : {}) } : null;
}

export function assertResourceReadiness(proposal, receipt) {
  const resources = unresolvedProjectResources(proposal);
  if (resources.length && (!receipt?.confirmed_by || !receipt.confirmed_at ||
    JSON.stringify(receipt.resources) !== JSON.stringify(resources)))
    throw Object.assign(new Error("Confirma primero la disponibilidad de los recursos antes de generar el proyecto."), {reason:"resources_confirmation_missing"});
}
