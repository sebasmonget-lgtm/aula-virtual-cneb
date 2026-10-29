/** The initial editorial fixture is never a generated year or an implicit draft. */
/**
 * @param {NonNullable<import('./multi-age-app-types').MultiAgeAppState['planning']>} planning
 * @param {{proposal:import('./multi-age-app-types').AnnualProposal}|null} [generated]
 */
export function documentGeneratorAnnualState(planning,generated=null){
 const draft=planning.plans.find(p=>p.status==='draft')??null,active=planning.plans.find(p=>p.status==='active')??null,source=draft??active;
 let proposal=generated?.proposal??source?.proposal??null;
 if(generated&&active&&proposal){
   const protectedIds=new Set(planning.protectedSlots.map(p=>p.slotId));
   proposal={...proposal,proposals:proposal.proposals.map(p=>protectedIds.has(p.slot_id)?active.proposal.proposals.find(row=>row.slot_id===p.slot_id)??p:p)};
 }
 return {draft,active,source,proposal,origin:generated||source?.document_context?.generation_job_id?'prepared':source?'manual':'empty'};
}
