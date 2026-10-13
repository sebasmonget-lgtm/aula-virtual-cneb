import test from 'node:test';
import assert from 'node:assert/strict';
import {annualChatSummary} from './annual-chat-summary.mjs';
import {buildAnnualClassroomSnapshot} from './annual-classroom-snapshot.mjs';
test('chat summary distinguishes reported interests from individual observations and exposes no raw records or private names',()=>{
 const sources={students:[{id:'a'},{id:'b'}],names:['Nombre privado'],interviews:[{id:'family',student_id:'a',details:{interest_tags:['plants'],home_activity_tags:['builds'],communication_tags:['quiet_initially']}}],observations:[{id:'obs',student_id:'a',observation_text:'Nombre privado cuenta bloques.',competency_ids:['MAT_CANTIDAD']}],fingerprint:'test',group:null,prior:null};
 const curriculum=[{id:'MAT_CANTIDAD',name:'Cantidad'}];const snapshot=buildAnnualClassroomSnapshot(sources,{available_resources:['Patio']},curriculum);
 const summary=annualChatSummary(sources,snapshot,curriculum);
 assert.equal(summary.studentCount,2);assert.equal(summary.observationCount,1);assert.equal(summary.interviewCount,1);
 assert.deepEqual(summary.familyInterests.map(item=>item.families),[1]);assert.equal(summary.observedCompetencies[0].records,1);
 assert.deepEqual(summary.resources,['Patio']);assert.ok(summary.familyActivities.length>0);
 assert.doesNotMatch(JSON.stringify(summary),/Nombre privado|quiet_initially|cuenta bloques|student_id/);
});
