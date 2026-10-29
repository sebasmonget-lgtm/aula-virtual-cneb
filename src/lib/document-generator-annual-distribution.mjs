/** Read-only editorial review. Counts are planning opportunities, never attainment. */
export function reviewDocumentAnnualDistribution(proposal,{eligible,calendar}){
 const rows=(proposal?.proposals??[]).map((row,index)=>({
  slotId:row.slot_id,position:index+1,period:calendar.projects.find(s=>s.slot_id===row.slot_id)?.period??null,
  competencyIds:[...new Set(row.opportunities.map(o=>o.competency_id))],
 }));
 const byAge=eligible.map(({age,cards})=>({age,competencies:cards.map(card=>{
  const projects=rows.filter((_,index)=>proposal.proposals[index].opportunities.some(o=>o.age===age&&o.competency_id===card.id));
  return {id:card.id,name:card.official_name,projectPositions:projects.map(p=>p.position),periods:[...new Set(projects.map(p=>p.period).filter(Boolean))],recurringOpportunity:(proposal?.everyday_opportunities??[]).some(o=>o.age===age&&o.competency_id===card.id)};
 })}));
 const twoCompetencyProjects=rows.filter(r=>r.competencyIds.length===2).length;
 return {policy:'ayni-editorial-review-not-a-minedu-quota',projectCount:rows.length,twoCompetencyProjects,broaderProjects:rows.filter(r=>r.competencyIds.length>2).length,projects:rows,byAge,
  reviewPoints:[
   ...(rows.length&&twoCompetencyProjects>rows.length/2?[{code:'mostly_minimum_integration',positions:rows.filter(r=>r.competencyIds.length===2).map(r=>r.position)}]:[]),
   ...byAge.flatMap(g=>g.competencies.filter(c=>c.projectPositions.length<2&&!c.recurringOpportunity).map(c=>({code:c.projectPositions.length?'no_planned_return':'missing_opportunity',age:g.age,competencyId:c.id}))),
  ]};
}

/** Compact data for the annual request; no names, past AI prose or student records. */
export function documentAnnualDistributionBrief(data,previous=null,protectedSlotIds=[]){
 return {purpose:'Revisar amplitud, recurrencia y distribución; los recuentos no sustituyen la pertinencia pedagógica.',
  schedule:data.calendar.projects.map(s=>({slot_id:s.slot_id,period:s.period,duration_weeks:s.duration_weeks})),
  eligible_by_age:data.eligible.map(({age,cards})=>({age,competency_ids:cards.map(c=>c.id)})),
  protected_slot_ids:protectedSlotIds,
  ...(previous?{previous_plan_review:reviewDocumentAnnualDistribution(previous,data),previous_plan_is:'Referencia editorial; no es evidencia observada ni una indicación docente nueva.'}:{}),
 };
}
