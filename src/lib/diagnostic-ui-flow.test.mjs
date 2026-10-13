import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compareObservationDates, experienceCoverageGaps, observationMoment, toggleInterviewOption} from './diagnostic-ui-flow.mjs';
import {projectFamilyAssessmentContext} from './family-interview-projection.mjs';
import {familyInterviewQuestionGroups, interviewInterestOptions} from './family-interview-contract.mjs';
import {diagnosticPedagogicalBlocks} from './pedagogical-blocks.mjs';

test('legacy nature IDs remain valid while overlapping interests are presented once',()=>{
  const details={interest_tags:['nature','plants','drawing']};
  assert.ok(interviewInterestOptions.some(option=>option.id==='nature'));
  assert.deepEqual(projectFamilyAssessmentContext(details).interests,['Plantas y naturaleza','Dibujo']);
  assert.deepEqual(details.interest_tags,['nature','plants','drawing']);
  assert.deepEqual(toggleInterviewOption(details.interest_tags,'interest_tags','plants'),['drawing']);
  assert.deepEqual(toggleInterviewOption(['drawing'],'interest_tags','plants'),['drawing','plants']);
  assert.deepEqual(toggleInterviewOption(['nature'],'community_tags','nature'),[]);
});
test('six distinct family contexts keep their keys and personalise all questions',()=>{
  const questions=familyInterviewQuestionGroups('Mariana Belén')[0].questions;
  assert.deepEqual(questions.map(q=>q.key),['interests','social_context','home_activity_example','communication_context','family_community_context','participation_support_context']);
  assert.ok(questions.every(q=>q.label.includes('Mariana Belén')));
});
test('missing moment is explicit and chronological ordering handles missing or malformed dates',()=>{
  assert.equal(observationMoment('  '),'Sin momento indicado');
  assert.equal(observationMoment(' Juego libre '),'Juego libre');
  const rows=[{id:'missing',date:null},{id:'old',observed_at:'2026-01-02T17:00:00Z'},{id:'b',date:'2026-01-03'},{id:'a',date:'2026-01-03'},{id:'invalid',date:'invalid'}];
  assert.deepEqual(rows.sort(compareObservationDates).map(row=>row.id),['b','a','old','missing','invalid']);
});
test('experience hints measure available records without treating absence as a difficulty',()=>{
  const students=[{id:'a'},{id:'b'}], experience={competencies:[{id:'identity'},{id:'oral'}]};
  const guided=[{student_id:'a',competency_v4_id:'identity',observation_status:'observed_without_judgment',observation_text:'Eligió bloques.'},{student_id:'b',competency_v4_id:'identity',observation_status:'insufficient_information',observation_text:'Sin oportunidad.'}];
  const free=[{student_id:'b',competency_v4_ids:['identity']}];
  assert.equal(experienceCoverageGaps(experience,students,guided,free),1);
  assert.equal(experienceCoverageGaps(experience,students,guided,[...free,{student_id:'a',competency_v4_ids:['oral']},{student_id:'b',competency_v4_ids:['oral']}]),0);
});
test('every catalog moment has a distinct teacher action and preserves its criterion and examples',async()=>{
  const catalog=JSON.parse(await readFile(new URL('../../knowledge/diagnostic-experiences/catalog.json',import.meta.url),'utf8'));
  for(const experience of catalog.experiences){
    const blocks=diagnosticPedagogicalBlocks(experience).slice(1);
    assert.equal(new Set(blocks.map(block=>block.instruction)).size,experience.aspects.length);
    blocks.forEach((block,i)=>{assert.notEqual(block.instruction,experience.teacher_instructions);assert.notEqual(block.instruction,experience.aspects[i].prompt);assert.equal(block.observations[0].criterion,experience.aspects[i].prompt);assert.equal(block.observations[0].id,experience.aspects[i].id);assert.deepEqual(block.examples,experience.aspects[i].examples);});
  }
});
