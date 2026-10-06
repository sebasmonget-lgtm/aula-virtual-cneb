import { VersionConflictError } from "./version-integrity.mjs";
export function assertProjectAnnualAuthority(source,decisions) {
  if(!source.plan.proposal.experience_context)return;
  if(source.plan.status!=="active")throw new VersionConflictError("Mi año tiene una versión nueva. Revisa el proyecto antes de continuar.");
  if(decisions && (decisions.purpose!==source.source.purpose ||
    JSON.stringify([...decisions.competency_ids].sort())!==JSON.stringify([...source.source.primary_competency_ids].sort())))
    throw new VersionConflictError("El propósito y las competencias vienen de Mi año. Cambia allí la propuesta antes de preparar el proyecto.");
}
