import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { validateExperienceContext, annualFutureGaps } from "./annual-experience-context.mjs";
import { generateAnnualJourney } from "./annual-journey-service.mjs";
import { validateAnnualJourney } from "./annual-journey-contract.mjs";
import { fixtureCalendar, generationFixture, opportunityFixture } from "./test-fixtures/annual-journey.mjs";
import { buildAnnualClassroomSnapshot } from "./annual-classroom-snapshot.mjs";
import { annualJourneyDocumentSections } from "./annual-journey-word.mjs";
import { resolveAnnualProposal } from "./planning-contract-v3.mjs";

const curriculum=[{id:"MAT_CANTIDAD",name:"Cantidad",capacities:["Comunica su comprensión"]},{id:"CYT_INDAGA",name:"Indaga",capacities:["Problematiza situaciones"]}];
const snapshot=()=>buildAnnualClassroomSnapshot({students:[],interviews:[],observations:[],names:[],fingerprint:"fixture"},{id:"classroom",available_resources:[]},curriculum);
function provider(calls){return ()=>({generate:async request=>{
  calls.push(request);
  if(request.workflow==="annual_journey_review")return {output:{issues:[]}};
  const output=generationFixture(curriculum);
  output.proposals.forEach(row=>row.opportunities=curriculum.map(opportunityFixture));
  output.proposals=output.proposals.slice(0,request.ai_context_bundle.calendar.length);
  return {output};
}});}

test("inicio tardío genera quince propuestas completas sin acreditar ejecución pasada",async()=>{
  for(const today of ["2026-08-12","2026-10-05"]){
    const experienceContext=validateExperienceContext({contextItems:[{text:"Tenemos un huerto"}],historicalProjects:[{title:"Familia"}]},curriculum,today);
    const calls=[];
    const plan=await generateAnnualJourney({context:{year:2026,age:5},snapshot:snapshot(),curriculum,calendar:fixtureCalendar(),experienceContext,createProvider:provider(calls)});
    assert.equal(plan.resolved_calendar.projects.length,15);
    assert.deepEqual(plan.resolved_calendar.integrity,{eligible:172,assigned:172,gaps:0,overlaps:0});
    assert.equal(plan.proposed_experiences.length,15);
    assert.ok(plan.proposed_experiences.every(row=>row.primary_competency_ids.length>=2));
    assert.ok(plan.proposed_experiences.some(row=>row.planned_end_date<today));
    assert.equal(plan.resolved_calendar.planning_scope,"full_year");
    assert.ok(plan.resolved_calendar.projects.some(slot=>slot.occupancy==="annual_only"));
    assert.equal(validateAnnualJourney(plan,curriculum,{confirmation:true}),plan);
    assert.equal(calls.length,1);
    assert.equal(calls[0].ai_context_bundle.calendar.length,plan.proposed_experiences.length);
    assert.ok(!JSON.stringify(calls[0]).includes('context_items'));
    const text=JSON.stringify(annualJourneyDocumentSections(plan));
    assert.match(text,/Familia/);assert.match(text,/Período no precisado/);assert.match(text,/solo para consulta/);
    const slot=plan.resolved_calendar.projects.find(slot=>slot.proposal_id);
    const id=randomUUID(),slotId=randomUUID();
    const found=resolveAnnualProposal({id,proposal:plan},[{id:slotId,annual_plan_id:id,slot_index:slot.index,proposal_id:slot.proposal_id}],slot.proposal_id);
    assert.equal(found.proposal.proposal_id,slot.proposal_id);
  }
});

test("año terminado conserva quince previsiones de consulta y ninguna actividad retrospectiva",async()=>{
  const calls=[],experienceContext=validateExperienceContext({historicalProjects:[{title:"Plantas",competency_ids:["MAT_CANTIDAD"]}]},curriculum,"2026-12-31");
  const plan=await generateAnnualJourney({context:{year:2026,age:5},snapshot:snapshot(),curriculum,calendar:fixtureCalendar(),experienceContext,createProvider:provider(calls)});
  assert.equal(calls.length,1);assert.equal(plan.proposed_experiences.length,15);
  assert.ok(plan.resolved_calendar.projects.every(slot=>slot.occupancy==="annual_only"));
  assert.deepEqual(annualFutureGaps({...plan,everyday_opportunities:[]},curriculum),curriculum.map(card=>card.id));
  assert.equal(validateAnnualJourney(plan,curriculum,{confirmation:true}),plan);
});

test("historia opcional y contexto no aceptan competencias ajenas ni registros vacíos",()=>{
  assert.throws(()=>validateExperienceContext({historicalProjects:[{title:"Familia",competency_ids:["AJENA"]}]},curriculum,"2026-10-05"),/competencias/);
  assert.throws(()=>validateExperienceContext({contextItems:[{text:""}]},curriculum,"2026-10-05"),/contexto/);
});
