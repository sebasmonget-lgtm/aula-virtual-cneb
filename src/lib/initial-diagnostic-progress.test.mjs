import test from 'node:test';
import assert from 'node:assert/strict';
import {initialDiagnosticProgress} from './initial-diagnostic-progress.mjs';

const students = [{id:'a'},{id:'b'},{id:'c'}];
const base = {students,interviews:[],spontaneous:[],guided:[],legacy:[]};
test('initial coverage counts saved children once, without requiring a competency',()=>{
  const progress=initialDiagnosticProgress({...base, interviews:[{student_id:'a',has_confirmed_answers:true},{student_id:'a',has_confirmed_answers:true},{student_id:'foreign',has_confirmed_answers:true}],spontaneous:[{student_id:'a',observation_text:'Ordenó las piezas.',competency_v4_ids:[]},{student_id:'a',has_media:true}],guided:[{student_id:'b',observation_status:'observed_without_judgment',observation_text:'Invitó a jugar.'}]});
  assert.deepEqual(progress,{total:3,interviewed:1,observed:2,complete:false});
});
test('drafts, withdrawals, empty records and unrelated children never advance coverage',()=>{
  assert.deepEqual(initialDiagnosticProgress({...base, interviews:[{student_id:'a',has_confirmed_answers:false}],spontaneous:[{student_id:'a',status:'withdrawn',observation_text:'Retirada'},{student_id:'b',status:'draft',has_media:true},{student_id:'c',observation_text:'  '},{student_id:'foreign',has_media:true}],guided:[{student_id:'c',observation_status:'insufficient_information'}],legacy:[{student_id:'c',status:'draft',note:'Borrador'}]}),{total:3,interviewed:0,observed:0,complete:false});
});
test('100 percent is coverage of initial sources, including preserved legacy diagnostic notes',()=>{
  const progress=initialDiagnosticProgress({...base,interviews:students.map(s=>({student_id:s.id,has_confirmed_answers:true})),spontaneous:[{student_id:'a',has_media:true}],guided:[{student_id:'b',observation_status:'not_yet_demonstrated'}],legacy:[{student_id:'c',status:'with_support'}]});
  assert.deepEqual(progress,{total:3,interviewed:3,observed:3,complete:true});
  assert.equal(initialDiagnosticProgress({...base,students:[]}).complete,false);
});


test('voided initial observations never advance coverage in any source',()=>{
  assert.equal(initialDiagnosticProgress({...base,spontaneous:[{student_id:'a',status:'voided',has_media:true}],guided:[{student_id:'b',observation_status:'voided',observation_text:'Anulada'}],legacy:[{student_id:'c',status:'voided',note:'Anulada'}]}).observed,0);
});
