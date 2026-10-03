import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fixtureCalendar, generationFixture } from "./test-fixtures/annual-journey.mjs";
import { solveAnnualJourneyCalendar } from "./annual-journey-calendar.mjs";
import { materializeJourneyRows } from "./annual-journey-service.mjs";
import { validateAnnualJourney } from "./annual-journey-contract.mjs";
import { annualDisplayTitle, annualCoverage, editAnnualStructure, coverageDelta, libraryRow, annualCreationContext } from "./annual-year-editor.mjs";
import { candidateProjectDates, validateSelectedInstructionalDates, validateBlueprintDates } from "./school-calendar-service.mjs";

const cards=[{id:"MAT_CANTIDAD",name:"Cantidad",capacities:["Comunica su comprensión"]},{id:"CYT_INDAGA",name:"Indaga",capacities:["Problematiza situaciones"]}];
function fixture() {
  const output=generationFixture(cards),calendar=solveAnnualJourneyCalendar(fixtureCalendar(),output.proposals.map(()=>({proposal_id:randomUUID()})));
  const {proposals,...general}=output;
  return {journey_version:2,editor_version:3,...general,curriculum_reference:cards,classroom_snapshot:{version:2,facts:[],source_fingerprint:"fixture"},pending_changes:[],change_history:[],pedagogical_review:{status:"passed"},resolved_calendar:calendar,proposed_experiences:materializeJourneyRows(proposals.map((r,i)=>({...r,proposal_id:calendar.projects[i].proposal_id})),calendar),available_experiences:[]};
}
test("15 tramos: 11 de dos semanas, cuatro de tres, 34 semanas después de acogida; bimestres fijos",()=>{
  const c=solveAnnualJourneyCalendar(fixtureCalendar());
  assert.equal(c.projects.length,15);assert.equal(c.projects.filter(s=>s.duration_weeks===2).length,11);assert.equal(c.projects.filter(s=>s.duration_weeks===3).length,4);assert.equal(c.projects.reduce((n,s)=>n+s.duration_weeks,0),34);
  assert.deepEqual([1,2,3,4].map(p=>c.projects.filter(s=>s.period===`Bimestre ${p}`).map(s=>s.duration_weeks)),[[2,2,3],[2,2,2,3],[2,2,2,3],[2,2,2,3]]);
  assert.equal(c.assignments.length,172);assert.equal(new Set(c.assignments.map(a=>a.date)).size,172);assert.deepEqual(c.integrity,{eligible:172,assigned:172,gaps:0,overlaps:0});
});
test("feriado dentro, lunes o viernes no rompe el tramo; override autorizado cambia solo los días",()=>{
  const before=solveAnnualJourneyCalendar(fixtureCalendar()),calendar=fixtureCalendar();
  for(const d of ["2026-06-22","2026-07-03"])calendar.days.find(day=>day.date===d).is_instructional=false;
  const after=solveAnnualJourneyCalendar(calendar);
  assert.deepEqual(after.projects.map(s=>[s.starts_on,s.ends_on,s.duration_weeks]),before.projects.map(s=>[s.starts_on,s.ends_on,s.duration_weeks]));
  assert.equal(before.projects[5].instructional_dates.length,9);assert.equal(after.projects[5].instructional_dates.length,7);
  calendar.days.find(day=>day.date==="2026-06-29").is_instructional=true;
  assert.equal(solveAnnualJourneyCalendar(calendar).projects[5].instructional_dates.length,8);
  assert.ok(!before.assignments.some(a=>a.date==="2026-07-28"));
});
test("swap 2→3 y 3→2 cambia duración y días sin recalcular tramos; retirar/restaurar conserva cobertura temporal",()=>{
  const plan=fixture(),row=plan.proposed_experiences[11],target=plan.resolved_calendar.projects[14];
  const next=editAnnualStructure(plan,{kind:"place",proposalId:row.proposal_id,targetSlotId:target.slot_id});
  const moved=next.proposed_experiences.find(r=>r.proposal_id===row.proposal_id),other=next.proposed_experiences.find(r=>r.proposal_id===target.proposal_id);
  assert.equal(moved.duration_weeks,3);assert.equal(other.duration_weeks,2);assert.deepEqual(moved.instructional_dates,target.instructional_dates);assert.equal(next.change_history[0].ai_calls,0);assert.deepEqual(next.change_history[0].affected_proposal_ids,[row.proposal_id,target.proposal_id]);assert.equal(next.change_history[0].source_slot_id,row.slot_id);assert.equal(next.change_history[0].target_slot_id,target.slot_id);validateAnnualJourney(next,cards);
  const removed=editAnnualStructure(next,{kind:"remove",proposalId:row.proposal_id});
  assert.equal(removed.proposed_experiences.length,14);assert.equal(removed.available_experiences.length,1);assert.equal(removed.available_experiences[0].duration_weeks,undefined);assert.equal(removed.resolved_calendar.projects[14].proposal_id,null);
  validateAnnualJourney(removed,cards,{requireCoverage:false});assert.throws(()=>validateAnnualJourney(removed,cards,{confirmation:true}),e=>e.reason==="empty_slots");
  const restored=editAnnualStructure(removed,{kind:"place",proposalId:row.proposal_id,targetSlotId:target.slot_id});assert.equal(restored.proposed_experiences.length,15);assert.equal(restored.available_experiences.length,0);validateAnnualJourney(restored,cards);
  assert.deepEqual(restored.resolved_calendar.integrity,plan.resolved_calendar.integrity);assert.deepEqual(plan.proposed_experiences[11],row);
});
test("Biblioteca sustituye y conserva la anterior; delta cuenta por propuesta y cotidiano separado",()=>{
  const plan=fixture(),replacement=libraryRow({...plan.proposed_experiences[0],proposal_id:randomUUID(),title:"Indagamos el mercado",primary_competency_ids:["CYT_INDAGA"],opportunities:[generationFixture(cards).everyday_opportunities[1]]});
  delete replacement.opportunities[0].moment;plan.available_experiences.push(replacement);
  plan.proposed_experiences[0].opportunities.push({...plan.proposed_experiences[0].opportunities[0]});
  const coverage=annualCoverage(plan);assert.equal(coverage[0].total,15);assert.deepEqual(coverage[0].periods,[3,4,4,4]);assert.equal(coverage[1].total,0);assert.equal(coverage[1].everyday,true);
  const next=editAnnualStructure(plan,{kind:"place",proposalId:replacement.proposal_id,targetSlotId:plan.resolved_calendar.projects[0].slot_id});
  assert.equal(next.available_experiences[0].proposal_id,plan.proposed_experiences[0].proposal_id);assert.deepEqual(coverageDelta(plan,next).map(c=>[c.id,c.before,c.after]),[["MAT_CANTIDAD",15,14],["CYT_INDAGA",0,1]]);
  assert.deepEqual(annualCoverage(next)[1].proposal_ids,[replacement.proposal_id]);
});
test("cobertura cero bloquea confirmación aunque el borrador incompleto pueda guardarse",()=>{
  const plan=fixture();plan.everyday_opportunities=[];
  validateAnnualJourney(plan,cards,{requireCoverage:false});assert.throws(()=>validateAnnualJourney(plan,cards,{confirmation:true}),e=>e.reason==="coverage_missing");
});
test("no admite Gestión, fechas arbitrarias ni cambios de propuestas pasadas/protegidas/desarrolladas",()=>{
  const plan=fixture(),row=plan.proposed_experiences[0];
  for(const targetSlotId of ["gestion","2026-10-08","medio_tramo"])assert.throws(()=>editAnnualStructure(plan,{kind:"place",proposalId:row.proposal_id,targetSlotId}),e=>e.reason==="invalid_slot");
  assert.throws(()=>editAnnualStructure(plan,{kind:"remove",proposalId:row.proposal_id},{today:"2026-10-03"}),e=>e.reason==="protected_proposal");
  assert.throws(()=>editAnnualStructure(plan,{kind:"remove",proposalId:row.proposal_id},{protectedIds:[row.proposal_id]}),e=>e.reason==="protected_proposal");
  row.teacher_protected=true;assert.throws(()=>editAnnualStructure(plan,{kind:"place",proposalId:plan.proposed_experiences[1].proposal_id,targetSlotId:plan.resolved_calendar.projects[0].slot_id}),e=>e.reason==="protected_proposal");
});
test("títulos muestran número una vez sin mutar el literal; contexto curricular no envía datos privados",()=>{
  assert.equal(annualDisplayTitle("01. Así soy y así me cuido · 30/03–10/04"),"Así soy y así me cuido");assert.equal(annualDisplayTitle("2. Acuerdos para jugar"),"Acuerdos para jugar");assert.equal(annualDisplayTitle("10 dedos para contar"),"10 dedos para contar");
  const plan=fixture();plan.classroom_snapshot.facts=[{kind:"teacher_decision",support_text:"dato privado",ai_support_text:null}];assert.ok(!JSON.stringify(annualCreationContext(plan)).includes("dato privado"));
});
test("históricos de doce mantienen su calendario y lectura sin conversión silenciosa",()=>{
  const rows=Array.from({length:12},()=>({proposal_id:randomUUID()}));assert.equal(solveAnnualJourneyCalendar(fixtureCalendar(),rows).projects.length,12);
});
test("Project Master recibe nueve días en dos semanas con feriado; exclusiones y actividades conservan fechas",()=>{
  const calendar=fixtureCalendar(),slot=solveAnnualJourneyCalendar(calendar).projects[5];
  const candidates=candidateProjectDates(calendar.days,slot.starts_on,slot.ends_on);
  const dates=validateSelectedInstructionalDates(calendar.days,candidates.filter(d=>d.selected).map(d=>d.date),slot.starts_on,slot.ends_on);
  assert.equal(slot.duration_weeks,2);assert.equal(dates.length,9);assert.deepEqual(dates,slot.instructional_dates);validateBlueprintDates(dates.map(date=>({date})),dates);
  assert.throws(()=>validateBlueprintDates([...dates.map(date=>({date})),{date:"2026-06-29"}],dates));
  const fewer=candidateProjectDates(calendar.days,slot.starts_on,slot.ends_on,[{date:dates[0],exclusion_reason:"Decisión docente"}]);assert.equal(fewer.filter(d=>d.selected).length,8);
});
