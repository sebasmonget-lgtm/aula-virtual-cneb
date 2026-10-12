import test from 'node:test';import assert from 'node:assert/strict';
import {initialObservedPairs,rankGuidedStudents,mergeGuidedObservation} from './guided-observation-flow.mjs';
test('selección prioriza falta de registros por competencia, conserva todos y excluye borradores/anulados',()=>{
  const students=[{id:'a',name:'Ana'},{id:'b',name:'Bruno'},{id:'c',name:'Celia'}];
  const pairs=initialObservedPairs([{student_id:'a',competency_v4_id:'identity',observation_status:'observed_without_judgment',observation_text:'Hecho',aspect_id:'other-criterion'},{student_id:'b',competency_v4_id:'identity',observation_status:'voided',observation_text:'Retirado'}],[{student_id:'c',competency_v4_ids:['other'],classification_source:'teacher',observation_text:'Hecho'}]);
  assert.deepEqual(rankGuidedStudents(students,'identity',pairs).map(s=>[s.id,s.hasRecords]),[['b',false],['c',false],['a',true]]);
  assert.deepEqual(rankGuidedStudents(students,'identity',pairs,'ANA').map(s=>s.id),['a']);
  assert.equal(rankGuidedStudents(students,'other',pairs).at(-1).id,'c');
});
test('respuesta compacta actualiza cobertura sin duplicar ni descartar otros registros',()=>{
  const row={id:'one',student_id:'a',experience_id:'game',competency_v4_id:'identity',observation_status:'observed_without_judgment',observation_text:'Hecho'};
  const workspace={experience_observations:[],experience_coverage:[{experience_id:'game',students_with_records:0,students_with_information:0,competency_coverage:[{competency_id:'identity',students_with_information:0}]}]};
  const updated=mergeGuidedObservation(mergeGuidedObservation(workspace,row),row);assert.equal(updated.experience_observations.length,1);assert.equal(updated.experience_coverage[0].competency_coverage[0].students_with_information,1);
});
