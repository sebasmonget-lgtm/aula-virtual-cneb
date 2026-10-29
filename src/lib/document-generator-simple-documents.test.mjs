import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {makeMultiAgeDocumentFixture} from '../../scripts/fixtures/multi-age-document-fixture.mjs';
import {addActivityDocumentFixture} from '../../scripts/fixtures/multi-age-activity-document-fixture.mjs';
import {loadMultiAgeDocument} from './multi-age-document-service.mjs';
import {renderMultiAgePlanningWord} from './multi-age-planning-word.mjs';
import {documentAnnualCompetencyMap} from './document-generator-annual-map-word.mjs';
import {classroomCurriculumScope} from './classroom-curriculum-scope.mjs';
import {captureDocumentObservationRoster} from './document-generator-observation-roster.mjs';
import {xmlEscape} from './unified-word-template.mjs';

const xml=async bytes=>(await JSZip.loadAsync(bytes)).file('word/document.xml').async('string');
test('el mapa anual distingue proyectos por edad y oportunidades cotidianas sin inventarlas',()=>{
 const d={identity:{ages:[3,4,5]},curriculumReference:[3,4,5].map(age=>({age,competency_id:'A',name:'Competencia A'})),content:{proposals:[{opportunities:[{age:3,competency_id:'A'},{age:4,competency_id:'A'}]},{opportunities:[{age:5,competency_id:'A'}]}],everyday_opportunities:[{age:4,competency_id:'A'}]}};
 const before=JSON.stringify(d),[row]=documentAnnualCompetencyMap(d);
 assert.deepEqual(row.groups,[{ages:[3,4],projects:[1]},{ages:[5],projects:[2]}]);assert.deepEqual(row.everyday,[4]);assert.equal(JSON.stringify(d),before);
});

test('mejoras documentales nuevas conservan fuentes, currículo, nómina y presentaciones anteriores',{timeout:90000},async()=>{
 const f=await makeMultiAgeDocumentFixture();try{
  const a=await addActivityDocumentFixture(f);
  const annual=await loadMultiAgeDocument(f.db,f.teacher,'annual_plan',f.plan.planId);
  assert.equal(annual.documentPresentationVersion,undefined,'Una cuenta diaria no recibe la presentación documental.');
  const oldAnnual=await xml(await renderMultiAgePlanningWord(annual,{practical:true})),newAnnual=structuredClone(annual);newAnnual.documentPresentationVersion=2;
  const rendered=await xml(await renderMultiAgePlanningWord(newAnnual,{practical:true}));
  assert.doesNotMatch(oldAnnual,/Dónde se trabajan las competencias/);assert.match(rendered,/Dónde se trabajan las competencias/);assert.match(rendered,/P01/);assert.match(rendered,/no aprendizajes ya logrados/);
  for(const ref of annual.curriculumReference)assert.ok(rendered.includes(xmlEscape(ref.name)));
  assert.equal(await xml(await renderMultiAgePlanningWord(annual,{practical:true})),oldAnnual);
  for(const [kind,id,oldVersion,newVersion] of [['project',a.projectId,7,8],['activity',a.activityId,6,7]]){
   const d=await loadMultiAgeDocument(f.db,f.teacher,kind,id);d.content.documentPresentationVersion=oldVersion;
   if(kind==='project')d.content.documentPlanning={version:2,commonSequence:d.content.commonSequence,materials:[],ageSupports:[],transversalApproaches:[],learningJourney:[]};
   else d.content.observationRoster=await captureDocumentObservationRoster(f.db,f.teacher,await classroomCurriculumScope(f.db,f.teacher,f.classroom.classroomId));
   const before=JSON.stringify(d),old=await xml(await renderMultiAgePlanningWord(d,{practical:true})),copy=structuredClone(d);copy.content.documentPresentationVersion=newVersion;
   const next=await xml(await renderMultiAgePlanningWord(copy,{practical:true}));
   for(const family of d.content.criteriaFamilies)for(const v of family.variants){assert.ok(next.includes(xmlEscape(v.criterion_text)));assert.ok(next.includes(xmlEscape(v.expected_evidence)));}
   for(const text of (kind==='activity'?Object.values(d.content.commonSequence):[d.content.commonSequence.closure]))assert.ok(next.includes(xmlEscape(text)));
   if(kind==='project'){assert.doesNotMatch(old,/Cómo revisaremos el proyecto al finalizar/);assert.match(next,/Cómo revisaremos el proyecto al finalizar/);}
   else{assert.match(next,/Qué harán los niños y cómo acompañarlos/);for(const s of d.content.observationRoster.students)assert.ok(next.includes(xmlEscape(s.name)));assert.match(next,/Puedes dejar filas sin completar/);}
   assert.equal(JSON.stringify(d),before);assert.equal(await xml(await renderMultiAgePlanningWord(d,{practical:true})),old);
  }
 }finally{await f.db.close();}
});
