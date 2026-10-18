import test from 'node:test';import assert from 'node:assert/strict';
import{familyInterviewQuestionGroups}from'./family-interview-contract.mjs';
import{buildAnnualClassroomSnapshot}from'./annual-classroom-snapshot.mjs';
import{annualJourneyDocumentSections}from'./annual-journey-word.mjs';
test('el snapshot anual conserva las ocho respuestas vigentes como relato familiar, sin fabricar evidencias',()=>{
 const questions=familyInterviewQuestionGroups('QA')[0].questions;assert.equal(questions.length,8);
 const details=Object.fromEntries(questions.map((q,i)=>[q.key,`Respuesta familiar ${i+1}; no es observación docente.`]));
 const source={students:[{id:'qa-child'}],names:[],observations:[],interviews:[{id:'qa-interview',student_id:'qa-child',version:1,details:{...details,questionnaire_version:3}}],fingerprint:'qa'};
 const before=structuredClone(source),snapshot=buildAnnualClassroomSnapshot(source,{id:'qa-classroom'},[]),fact=snapshot.facts[0];
 assert.equal(fact.kind,'family_report');assert.equal(fact.uncertainty,'reported_not_observed');assert.equal(fact.competency_id,null);
 for(const value of Object.values(details)){assert.ok(fact.support_text.includes(value));assert.ok(fact.ai_support_text.includes(value));}
 assert.equal(snapshot.facts.filter(f=>f.kind==='observed').length,0);assert.deepEqual(source,before);
});
test('la procedencia familiar traduce etiquetas sin modificar respuestas ni interpretar texto observado',()=>{
 const facts=[{key:'family',kind:'family_report',scope:'individual',uncertainty:'reported_not_observed',support_text:'language_context: Usa quechua y castellano.\nfamily_context: Quiere tiempo para responder.'},{key:'obs',kind:'observed',scope:'individual',uncertainty:'literal_record_only',support_text:'language_context: esta frase es parte del texto observado.'}];
 const plan={classroom_snapshot:{facts},proposed_experiences:[],evidence_interpretations:[],everyday_opportunities:[],resolved_calendar:{projects:[],initial_stage:{name:'Diagnóstico',suggested_experiences:[],what_to_observe:[]},calendar_version:{version:'QA'},integrity:{assigned:0,eligible:0,gaps:0,overlaps:0}}};
 for(const k of ['organization_criteria','transversal_approaches','teaching_strategies','assessment_followup','family_collaboration','inclusive_supports'])plan[k]=[];
 const before=structuredClone(plan),text=JSON.stringify(annualJourneyDocumentSections(plan));
 assert.match(text,/Lenguas en casa: Usa quechua y castellano/);assert.match(text,/Contexto familiar y expectativas: Quiere tiempo para responder/);
 assert.match(text,/language_context: esta frase es parte del texto observado/);assert.deepEqual(plan,before);
});
