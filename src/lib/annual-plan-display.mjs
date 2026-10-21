/** Presentation/recovery from durable plans; never a new generation on navigation. */
export function hasSavedAnnualYear(plan) {
  const proposal=plan?.proposal;
  return Boolean(proposal?.journey_version===2 && proposal.resolved_calendar &&
    (proposal.editor_version===3 && Array.isArray(proposal.resolved_calendar.projects) || proposal.proposed_experiences?.length));
}
/** An explicit conversation never discards or regenerates the saved year. */
export function annualConversationEntry(plan,explicitConversationStart=false) {
  return explicitConversationStart || !plan || plan.proposal?.journey_version===2&&!hasSavedAnnualYear(plan);
}
export function selectSavedAnnualPlan(plans,requestedId) {
  const all=[plans?.draft,plans?.active,...(plans?.archived??[])].filter(Boolean);
  return all.find(plan=>plan.id===requestedId)??plans?.draft??plans?.active??all[0]??null;
}
export function annualPeriodNumber(period) {
  const number=Number(String(period??'').match(/[1-4]/)?.[0]);
  return number||null;
}
export function currentAnnualPeriod(slots,today) {
  const slot=slots.find(item=>item.ends_on>=today)??slots.at(-1);
  return String(annualPeriodNumber(slot?.period)??1);
}
