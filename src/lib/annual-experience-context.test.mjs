import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { validateExperienceContext, annualFutureGaps } from "./annual-experience-context.mjs";
import { generateAnnualJourney } from "./annual-journey-service.mjs";
import { validateAnnualJourney } from "./annual-journey-contract.mjs";
import { fixtureCalendar, generationFixture } from "./test-fixtures/annual-journey.mjs";
import { buildAnnualClassroomSnapshot } from "./annual-classroom-snapshot.mjs";
import { annualJourneyDocumentSections } from "./annual-journey-word.mjs";
import { resolveAnnualProposal } from "./planning-contract-v3.mjs";

const curriculum=[{id:"MAT_CANTIDAD",name:"Cantidad",capacities:["Comunica su comprensión"]}];
const snapshot=()=>buildAnnualClassroomSnapshot({students:[],interviews:[],observations:[],names:[],fingerprint:"fixture"},{id:"classroom",available_resources:[]},curriculum);
function provider(calls){return ()=>({generate:async request=>{
  calls.push(request);
  if(request.workflow==="annual_journey_review")return {output:{issues:[]}};
  const output=generationFixture(curriculum);
  output.proposals=output.proposals.slice(0,request.ai_context_bundle.calendar.length);
  return {output};
}});}

test("inicio tardío conserva quince tramos y prepara solo fechas restantes",async()=>{
  for(const today of ["2026-08-12","2026-10-05"]){
    const experienceContext=validateExperienceContext({contextItems:[{text:"Tenemos un huerto"}],historicalProjects:[{title:"Familia"}]},curriculum,today);
    const calls=[];
    const plan=await generateAnnualJourney({context:{year:2026,age:5},snapshot:snapshot(),curriculum,calendar:fixtureCalendar(),experienceContext,createProvider:provider(calls)});
    assert.equal(plan.resolved_calendar.projects.length,15);
    assert.deepEqual(plan.resolved_calendar.integrity,{eligible:172,assigned:172,gaps:0,overlaps:0});
    assert.ok(plan.proposed_experiences.length<15);
    assert.ok(plan.proposed_experiences.every(row=>row.instructional_dates.every(date=>date>=today)));
    assert.equal(plan.resolved_calendar.projects.filter(slot=>slot.occupancy==="past_unrecorded").length,15-plan.proposed_experiences.length);
    assert.equal(validateAnnualJourney(plan,curriculum,{confirmation:true}),plan);
    assert.equal(calls.length,2);
    assert.equal(calls[0].ai_context_bundle.calendar.length,plan.proposed_experiences.length);
    assert.ok(!JSON.stringify(calls[1]).includes('context_items'));
    const text=JSON.stringify(annualJourneyDocumentSections(plan));
    assert.match(text,/Familia/);assert.match(text,/Período no precisado/);assert.match(text,/Pasado sin registro/);
    const slot=plan.resolved_calendar.projects.find(slot=>slot.proposal_id);
    const id=randomUUID(),slotId=randomUUID();
    const found=resolveAnnualProposal({id,proposal:plan},[{id:slotId,annual_plan_id:id,slot_index:slot.index,proposal_id:slot.proposal_id}],slot.proposal_id);
    assert.equal(found.proposal.proposal_id,slot.proposal_id);
  }
});

test("sin días futuros no llama a IA ni inventa actividades",async()=>{
  const calls=[],experienceContext=validateExperienceContext({historicalProjects:[{title:"Plantas",competency_ids:["MAT_CANTIDAD"]}]},curriculum,"2026-12-31");
  const plan=await generateAnnualJourney({context:{year:2026,age:5},snapshot:snapshot(),curriculum,calendar:fixtureCalendar(),experienceContext,createProvider:provider(calls)});
  assert.equal(calls.length,0);assert.equal(plan.proposed_experiences.length,0);
  assert.deepEqual(annualFutureGaps(plan,curriculum),["MAT_CANTIDAD"]);
  assert.equal(validateAnnualJourney(plan,curriculum,{confirmation:true}),plan);
});

test("historia opcional y contexto no aceptan competencias ajenas ni registros vacíos",()=>{
  assert.throws(()=>validateExperienceContext({historicalProjects:[{title:"Familia",competency_ids:["AJENA"]}]},curriculum,"2026-10-05"),/competencias/);
  assert.throws(()=>validateExperienceContext({contextItems:[{text:""}]},curriculum,"2026-10-05"),/contexto/);
});
