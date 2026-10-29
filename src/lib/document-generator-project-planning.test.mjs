import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDocumentProjectPlanning,validateDocumentActivityPlanning,composeDocumentActivityGuide} from './document-generator-project-planning.mjs';
import {documentProjectPlanningFixture,documentActivityPlanningFixture} from '../../scripts/fixtures/document-generator-planning.mjs';

test('actividad V3 exige organización y revisión final; V2 se lee sin reescribirla',()=>{
 const old=documentActivityPlanningFixture([3,4,5]),legacy=JSON.stringify(old);
 assert.deepEqual(validateDocumentActivityPlanning(old,[3,4,5]),old);
 assert.throws(()=>validateDocumentActivityPlanning(old,[3,4,5],{requireCurrent:true}));
 const current=documentActivityPlanningFixture([3,4,5],{version:3});
 assert.deepEqual(validateDocumentActivityPlanning(current,[3,4,5],{requireCurrent:true,isLastActivity:false}),current);
 assert.throws(()=>validateDocumentActivityPlanning({...current,organization:''},[3,4,5]));
 assert.throws(()=>validateDocumentActivityPlanning(current,[3,4,5],{isLastActivity:true}));
 const final=documentActivityPlanningFixture([3,4,5],{version:3,final:true});
 assert.throws(()=>validateDocumentActivityPlanning(final,[3,4,5],{isLastActivity:false}));
 const activity={commonSequence:{opening:'Recupera una propuesta.',development:'Realizan las pruebas.',closure:'Anota sus preguntas.'}},before=JSON.stringify(activity);
 const guide=composeDocumentActivityGuide(activity,final);
 assert.equal(guide.commonSequence.opening,final.organization+'\n'+activity.commonSequence.opening);
 assert.equal(guide.commonSequence.closure,final.projectReview+'\n'+activity.commonSequence.closure);
 assert.equal(JSON.stringify(activity),before);assert.equal(JSON.stringify(old),legacy);
});

test('maestros previos siguen legibles; una nueva generación exige condiciones completas',()=>{
 const old={meaningfulSituation:'Una situación posible.',commonSequence:{opening:'Inicio',development:'Recorrido',closure:'Cierre'}};
 assert.deepEqual(validateDocumentProjectPlanning(old),old);
 assert.throws(()=>validateDocumentProjectPlanning(old,{complete:true,ages:[3,4,5]}),/situación significativa/);
 const full=documentProjectPlanningFixture([3,4,5]);assert.deepEqual(validateDocumentProjectPlanning(full,{complete:true,ages:[3,4,5]}),full);
 for(const field of ['meaningfulSituation','materials','ageSupports','transversalApproaches','learningJourney']){const invalid=structuredClone(full);delete invalid[field];assert.throws(()=>validateDocumentProjectPlanning(invalid,{complete:true,ages:[3,4,5]}));}
 const invalid=structuredClone(full);invalid.transversalApproaches[0].name='Otro enfoque inventado';assert.throws(()=>validateDocumentProjectPlanning(invalid),/enfoques/);
});
test('apoyos y recursos pertenecen a las edades solicitadas y no aceptan datos extra',()=>{
 const planning=documentActivityPlanningFixture([3,5]);assert.deepEqual(validateDocumentActivityPlanning(planning,[3,5]),planning);
 assert.throws(()=>validateDocumentActivityPlanning(planning,[3,4,5]),/Cada edad/);
 const duplicate=structuredClone(planning);duplicate.ageSupports.push(duplicate.ageSupports[0]);assert.throws(()=>validateDocumentActivityPlanning(duplicate,[3,5]),/Cada edad/);
 const material=structuredClone(planning);material.materials[0].availability='comprado';assert.throws(()=>validateDocumentActivityPlanning(material,[3,5]),/materiales/);
 assert.throws(()=>validateDocumentActivityPlanning({...planning,diagnosis:'inventado'},[3,5]));
});
