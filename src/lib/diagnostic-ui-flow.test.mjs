import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compareObservationDates, experienceCoverageGaps, experienceCoverageOpportunities, rankGuidedExperiences, availableGuidedExperiences, guidedObservationLookFor, guidedExperienceIllustrations, observationMoment, toggleInterviewOption, guidedStudentsByCoverage, experiencePriorityLabel} from './diagnostic-ui-flow.mjs';
import {projectFamilyAssessmentContext} from './family-interview-projection.mjs';
import {familyInterviewQuestionGroups, interviewInterestOptions} from './family-interview-contract.mjs';
import {diagnosticPedagogicalBlocks} from './pedagogical-blocks.mjs';

test('digital activity requires explicit availability before it can be recommended',()=>{
  const experiences=[{id:'digital',required_resource:'digital_creation',competencies:[{id:'tic'}]},{id:'play',competencies:[{id:'identity'}]}];
  const students=[{id:'a'}],counts={'a:identity':4};
  const original=JSON.stringify(experiences);
  assert.deepEqual(availableGuidedExperiences(experiences).map(row=>row.id),['play']);
  assert.equal(rankGuidedExperiences(availableGuidedExperiences(experiences),students,[],[],counts)[0].experience.id,'play');
  assert.equal(rankGuidedExperiences(availableGuidedExperiences(experiences,true),students,[],[],counts)[0].experience.id,'digital');
  assert.deepEqual(availableGuidedExperiences(experiences,false).map(row=>row.id),['play']);
  assert.equal(JSON.stringify(experiences),original);
});

test('an open child picker keeps its order while coverage updates, including search and another record',()=>{
  const students=[{id:'ana',name:'Ana'},{id:'beto',name:'Beto'}];
  const order=guidedStudentsByCoverage(students,'oral',{'ana:oral':2,'beto:oral':0}).map(row=>row.student.id);
  const updated={'ana:oral':0,'beto:oral':3};
  assert.deepEqual(order,['beto','ana']);
  assert.deepEqual(guidedStudentsByCoverage(students,'oral',updated,'',order).map(row=>[row.student.id,row.count]),[['beto',3],['ana',0]]);
  assert.deepEqual(guidedStudentsByCoverage(students,'oral',updated,'ana',order).map(row=>row.student.id),['ana']);
  assert.deepEqual(guidedStudentsByCoverage(students,'oral',updated).map(row=>row.student.id),['ana','beto']);
});

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
  const questions=familyInterviewQuestionGroups('Mariana Belén',2)[0].questions;
  assert.deepEqual(questions.map(q=>q.key),['interests','social_context','home_activity_example','communication_context','family_community_context','participation_support_context']);
  assert.ok(questions.every(q=>q.label.includes('Mariana Belén')));
});
test('missing moment is explicit and chronological ordering handles missing or malformed dates',()=>{
  assert.equal(observationMoment('  '),'Sin momento indicado');
  assert.equal(observationMoment(' Juego libre '),'Juego libre');
  const rows=[{id:'missing',date:null},{id:'old',observed_at:'2026-01-02T17:00:00Z'},{id:'b',date:'2026-01-03'},{id:'a',date:'2026-01-03'},{id:'invalid',date:'invalid'}];
  assert.deepEqual(rows.sort(compareObservationDates).map(row=>row.id),['b','a','old','missing','invalid']);
  assert.deepEqual(rows.sort((a,b)=>compareObservationDates(a,b,'oldest')).map(row=>row.id),['old','b','a','missing','invalid']);
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

test('guided recommendations prioritise missing coverage, then a single record, without favouring larger experiences',()=>{
  const students=[{id:'a'},{id:'b'}];
  const experiences=[{id:'large',competencies:[{id:'oral'},{id:'count'},{id:'art'}]}, {id:'small',competencies:[{id:'movement'}]}];
  const free=['oral','count','art'].flatMap(id=>students.map(student=>({student_id:student.id,competency_v4_ids:[id]})));
  let ranked=rankGuidedExperiences(experiences,students,[],free);
  assert.equal(ranked[0].experience.id,'small');
  assert.equal(ranked[0].missingRate,1);
  assert.ok(ranked[1].opportunities.every(item=>item.missing===0&&item.few===2));
  const twice=[...free,...free];
  assert.deepEqual(experienceCoverageOpportunities(experiences[0],students,[],twice),[]);
  ranked=rankGuidedExperiences(experiences,students,[],[...twice,...students.map(student=>({student_id:student.id,competency_v4_ids:['movement']}))]);
  assert.equal(ranked[0].experience.id,'small');
  assert.equal(ranked[0].fewRate,1);
});

test('coverage ignores removed, insufficient, unconfirmed suggestions and children outside the active roster',()=>{
  const experience={id:'play',competencies:[{id:'oral',name:'Comunica'}]};
  const guided=[{student_id:'a',competency_v4_id:'oral',observation_status:'insufficient_information',observation_text:'Sin oportunidad.'},{student_id:'foreign',competency_v4_id:'oral',observation_status:'observed_without_judgment',observation_text:'Habló.'}];
  const free=[{student_id:'a',competency_v4_ids:['oral'],observation_status:'withdrawn'},{student_id:'b',competency_v4_ids:[],suggested_competency_v4_ids:['oral']}];
  assert.deepEqual(experienceCoverageOpportunities(experience,[{id:'a'},{id:'b'}],guided,free),[{id:'oral',name:'Comunica',missing:2,few:0}]);
  assert.deepEqual(rankGuidedExperiences([experience],[],guided,free)[0].opportunities,[]);
});

test('every predefined experience has a lightweight illustration and concrete teacher cues preserve the criterion',async()=>{
  const catalog=JSON.parse(await readFile(new URL('../../knowledge/diagnostic-experiences/catalog.json',import.meta.url),'utf8'));
  for(const experience of catalog.experiences){
    const asset=await readFile(new URL(`../../public/project-illustrations/${guidedExperienceIllustrations[experience.id]}.webp`,import.meta.url));
    assert.ok(asset.byteLength<35_000);
    for(const criterion of experience.aspects){const original=JSON.stringify(criterion);const cue=guidedObservationLookFor(criterion);assert.equal(cue,criterion.look_for);assert.ok(criterion.examples.every(example=>!cue.includes(example)));assert.notEqual(cue,criterion.prompt);assert.equal(JSON.stringify(criterion),original);}
  }
});

test('the same authoritative competency counts drive child labels and recommendation order',()=>{
  const students=[{id:'a',name:'Ana'},{id:'b',name:'Belén'},{id:'c',name:'Carlos'}];
  const experiences=[{id:'recorded',competencies:[{id:'identity'}]},{id:'empty',competencies:[{id:'oral'}]}];
  // Counts include free, other guided criteria and ordinary observations confirmed by the teacher.
  const coverage={'a:identity':3,'b:identity':1,'c:identity':2,'foreign:oral':8};
  const ranked=rankGuidedExperiences(experiences,students,[],[],coverage);
  assert.deepEqual(ranked.map(row=>row.experience.id),['empty','recorded']);
  assert.equal(experiencePriorityLabel(ranked[0]),'Sin observaciones en estas competencias');
  assert.deepEqual(guidedStudentsByCoverage(students,'identity',coverage).map(row=>[row.student.id,row.count]),[['b',1],['c',2],['a',3]]);
  assert.deepEqual(guidedStudentsByCoverage(students,'oral',coverage,'ANA').map(row=>[row.student.id,row.count]),[['a',0]]);
  assert.deepEqual(guidedStudentsByCoverage(students,'oral',coverage,'missing'),[]);
});

test('every catalog criterion has a short action guide without changing official content',async()=>{
  const catalog=JSON.parse(await readFile(new URL('../../knowledge/diagnostic-experiences/catalog.json',import.meta.url),'utf8'));
  for(const experience of catalog.experiences)for(const aspect of experience.aspects){
    assert.ok(aspect.teacher_steps.length>=2&&aspect.teacher_steps.length<=3,aspect.id);
    assert.ok(aspect.teacher_steps.every(step=>step.length<=200));assert.ok(aspect.moment_title&&aspect.look_for);
  }
});

test('coverage ties favour fewer observations per child and competency, including fully recorded experiences',()=>{
  const students=[{id:'a'},{id:'b'}];
  const experiences=[{id:'more',competencies:[{id:'oral'}]},{id:'less',competencies:[{id:'identity'},{id:'movement'}]}];
  const coverage={'a:oral':5,'b:oral':5,'a:identity':2,'b:identity':2,'a:movement':2,'b:movement':2};
  const ranked=rankGuidedExperiences(experiences,students,[],[],coverage);
  assert.deepEqual(ranked.map(item=>item.experience.id),['less','more']);
  assert.equal(ranked[0].recordRate,2);
  assert.deepEqual(ranked[0].opportunities,[]);
});
