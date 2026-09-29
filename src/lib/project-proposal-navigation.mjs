export function nextPlanProposalIndex(proposals, experiences, planId) {
  if (!proposals?.length) return -1;
  const active = proposals.map((proposal, index) => experiences
    .filter((item) => item.annual_plan_id === planId && item.status !== "archived" &&
      (item.source_proposal_id === proposal.proposal_id || (!item.source_proposal_id && item.source_proposal_index === index)))
    .sort((a, b) => b.version - a.version)[0]);
  const inPreparation = active.findIndex((item) => item?.status === "draft");
  if (inPreparation >= 0) return inPreparation;
  const pending = active.findIndex((item) => !item);
  return pending >= 0 ? pending : active.length - 1;
}

export function proposalStatus(experience) {
  return !experience ? "Pendiente" : experience.status === "draft" ? "En preparación" : "Confirmado";
}
