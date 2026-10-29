import {DOCUMENT_CONVERSATION_VERSION} from './document-generator-chat-readiness.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {openMultiAgeLocalDb} from '../../scripts/multi-age-local-db.mjs';
import {createPilotClassroom,importStudentsForTeacher} from './pilot-onboarding-service.mjs';
import {multiAgeClassroomConfiguration} from './multi-age-local-service.mjs';
import {chooseAyniProductMode} from './ayni-product-mode.mjs';
import {importDocumentGeneratorStudents,changeDocumentGeneratorEnrollment} from './document-generator-roster.mjs';
import {multiAgeAnnualContext,sampleMultiAgeAnnualProposal} from './multi-age-annual.mjs';
import {proposeLocalMultiAgeAnnual} from './multi-age-planning-generation.mjs';
import {proposeLocalMultiAgeBlueprint} from './multi-age-generation.mjs';
import {sampleMultiAgeBlueprint} from '../../scripts/fixtures/multi-age-local-fixture.mjs';
import {enqueueMultiAgeGeneration,runMultiAgeGenerationStep,loadMultiAgeGeneration} from './multi-age-generation-jobs.mjs';
import {multiAgeProviderForJob} from '../../scripts/multi-age-ai-runtime.mjs';
import {readMultiAgeConversation} from './multi-age-conversation.mjs';
import {prepareDocumentGeneratorConversation,confirmMultiAgePlanningDecision} from './multi-age-planning-decisions.mjs';
import {buildAnnualPlanningBrief,handlePlanningConversation} from './initial-journey-service.mjs';
import {generateProjectPreview} from './project-flow-service.mjs';

const conf=()=>({teacherConfirmed:true,clientRequestId:randomUUID()});
const setup={teacherName:'Docente ficticia',institutionName:'Colegio de prueba',section:'Exploradores',year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31',calendarPolicy:'national-2026',ages:[3,4,5]};

test('reutiliza alta original con logo, matrícula atómica, edición recuperable y aislamiento',{timeout:90000},async()=>{
 const db=await openMultiAgeLocalDb(),teacher=randomUUID(),other=randomUUID(),assetsDir=await mkdtemp(path.join(tmpdir(),'ayni-generator-'));
 try{
  await chooseAyniProductMode(db,teacher,{mode:'documents'});
  const input={...setup,age:3,submissionId:randomUUID(),ugel:'UGEL ficticia',district:'Distrito de prueba',createLogo:true,logoInitials:'QA'},multiAge=multiAgeClassroomConfiguration(input);
  const saved=await createPilotClassroom(db,teacher,input,{assetsDir,multiAge});
  const replay=await createPilotClassroom(db,teacher,input,{assetsDir,multiAge});assert.equal(replay.classroomId,saved.classroomId);assert.equal(replay.replayed,true);
  const institution=(await db.query('select ugel,district,logo_asset_id from institution_profiles where owner_user_id=$1',[teacher])).rows[0];assert.equal(institution.ugel,input.ugel);assert.ok(institution.logo_asset_id);
  assert.equal((await db.query('select curriculum_contract_version,age_grade_id from classrooms where id=$1',[saved.classroomId])).rows[0].age_grade_id,null);
  await assert.rejects(createPilotClassroom(db,teacher,{...input,ages:[3,4]},{assetsDir,multiAge:multiAgeClassroomConfiguration({...input,ages:[3,4]})}),/otros datos/);
  const roster={...conf(),classroomId:saved.classroomId,age:3,expectedRevision:1,students:[{firstName:'Niña',lastName:'Ficticia'},{firstName:'Niño',lastName:'Ficticio'}]};
  const enrolled=await importDocumentGeneratorStudents(db,teacher,roster);assert.equal(enrolled.studentIds.length,2);
  assert.equal((await importDocumentGeneratorStudents(db,teacher,roster)).studentIds.length,2);
  await assert.rejects(importDocumentGeneratorStudents(db,teacher,{...roster,...conf(),age:2}));
  assert.equal((await db.query('select count(*)::int n from students where classroom_id=$1',[saved.classroomId])).rows[0].n,2);
  const studentId=enrolled.studentIds[0];await changeDocumentGeneratorEnrollment(db,teacher,{...conf(),classroomId:saved.classroomId,studentId,status:'inactive',expectedStatus:'active'});
  assert.equal((await db.query('select status from students where id=$1',[studentId])).rows[0].status,'archived');
  await changeDocumentGeneratorEnrollment(db,teacher,{...conf(),classroomId:saved.classroomId,studentId,status:'active',expectedStatus:'inactive'});
  await assert.rejects(changeDocumentGeneratorEnrollment(db,other,{...conf(),classroomId:saved.classroomId,studentId,status:'inactive',expectedStatus:'active'}));
  assert.equal((await db.query('select status from students where id=$1',[studentId])).rows[0].status,'active');
 }finally{await db.close();await rm(assetsDir,{recursive:true,force:true});}
});

test('chat, año y proyecto reciben política de documentos sin diagnóstico ni nombres',{timeout:90000},async()=>{
 const db=await openMultiAgeLocalDb(),teacher=randomUUID();
 try{
  await chooseAyniProductMode(db,teacher,{mode:'documents'});
  const classroom=await createPilotClassroom(db,teacher,{...setup,age:3},{multiAge:multiAgeClassroomConfiguration(setup)}),classroomId=classroom.classroomId;
  await importDocumentGeneratorStudents(db,teacher,{...conf(),classroomId,age:3,expectedRevision:1,students:[{firstName:'Privado',lastName:'No enviar'}]});
  await assert.rejects(enqueueMultiAgeGeneration(db,teacher,{clientRequestId:randomUUID(),kind:'diagnostic',classroomId,studentId:(await db.query('select id from students where classroom_id=$1',[classroomId])).rows[0].id},{mode:'fixture'}),/sin diagnóstico/);
  const messages=['Tenemos patio y bloques.','No contamos con pantallas.','Quiero explorar plantas con materiales de reúso.','Las familias pueden colaborar de forma voluntaria.'];
  let calls=0,lastRequest;
  const providerForJob=async(job,mode)=>{const fixture=await multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'fixture'})(job,mode);return {generate:async request=>{calls++;lastRequest=request;return fixture.generate(request);}};};
  for(const [i,text] of messages.entries()){
    await enqueueMultiAgeGeneration(db,teacher,{clientRequestId:randomUUID(),kind:'conversation',classroomId,expectedRevision:i,text},{mode:'fixture'});
    await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob});
    assert.match(lastRequest.skill_instructions,/No existe un paso de diagnóstico/);assert.match(lastRequest.skill_instructions,/UNA laguna útil/);assert.match(lastRequest.skill_instructions,/número fijo de mensajes/);
    assert.ok(!JSON.stringify(lastRequest.ai_context_bundle).includes('pending_review'));assert.ok(!JSON.stringify(lastRequest.ai_context_bundle).includes('No enviar'));
    assert.ok(!('diagnostic_readings' in lastRequest.ai_context_bundle.planning.context));
    assert.ok(!('instructions' in lastRequest.ai_context_bundle.planning.context));assert.ok(!('projects' in lastRequest.ai_context_bundle.planning.context.calendar));
    assert.deepEqual(lastRequest.ai_context_bundle.planning.context.classroom.groups.map(g=>g.age),[3,4,5]);
  }
  assert.equal(calls,4);
  const chat=await readMultiAgeConversation(db,teacher,{classroomId});assert.equal(chat.turns.length,4);assert.ok(chat.turns.every(t=>t.promptVersion===DOCUMENT_CONVERSATION_VERSION));assert.equal(chat.decisions.messages.length,0);
  await prepareDocumentGeneratorConversation(db,teacher,{...conf(),classroomId});
  let decision=(await readMultiAgeConversation(db,teacher,{classroomId})).decisions;assert.deepEqual(decision.messages.map(m=>m.text),messages);
  await confirmMultiAgePlanningDecision(db,teacher,{...conf(),classroomId,turnId:chat.turns[0].id,action:'remove',expectedRevision:decision.revision});
  await prepareDocumentGeneratorConversation(db,teacher,{...conf(),classroomId});decision=(await readMultiAgeConversation(db,teacher,{classroomId})).decisions;assert.equal(decision.messages.length,3,'no recupera una indicación retirada');
  const annual=await multiAgeAnnualContext(db,teacher,classroomId);assert.ok(!('diagnostic_groups' in annual.context));assert.deepEqual(annual.context.groups.map(g=>g.age),[3,4,5]);
  await proposeLocalMultiAgeAnnual(db,teacher,classroomId,{provider:{generate:async request=>{assert.match(request.skill_instructions,/documentos editables/);assert.match(request.skill_instructions,/No los solicites/);assert.equal(request.ai_context_bundle.teacher_confirmed_indications.messages.length,3);return {output:sampleMultiAgeAnnualProposal(annual)};}}});
  await proposeLocalMultiAgeBlueprint(db,teacher,{classroomId,competencyIds:['COM_ORAL'],occursOn:'2026-10-22'},{provider:{generate:async request=>{assert.match(request.skill_instructions,/No pidas diagnóstico/);assert.equal(request.ai_context_bundle.document_generation_mode,true);return {output:sampleMultiAgeBlueprint()};}}});
  const pending=await enqueueMultiAgeGeneration(db,teacher,{clientRequestId:randomUUID(),kind:'conversation',classroomId,expectedRevision:4,text:'Prefiero cuentos.'},{mode:'fixture'});
  await assert.rejects(prepareDocumentGeneratorConversation(db,teacher,{...conf(),classroomId}),/está respondiendo/);
  assert.equal((await loadMultiAgeGeneration(db,teacher,pending.id)).status,'queued');
  assert.equal((await db.query('select count(*)::int n from diagnostic_experience_observations')).rows[0].n,0);
 }finally{await db.close();}
});

test('una edad conserva conversación extensa y procedencia sin pedir diagnóstico',{timeout:90000},async()=>{
 const db=await openMultiAgeLocalDb(),teacher=randomUUID();
 try{
  await chooseAyniProductMode(db,teacher,{mode:'documents'});
  const c=await createPilotClassroom(db,teacher,{...setup,age:4});await importStudentsForTeacher(db,teacher,[{firstName:'Niña',lastName:'Ficticia'}]);
  const context={id:c.classroomId,age:4,year:2026,starts_on:setup.startsOn,ends_on:setup.endsOn,document_generation_mode:true},snapshot={source_fingerprint:'docs-test',student_count:1,facts:[],competency_information:[{competency_id:'COM_ORAL',recorded_performances:0}]},curriculum=[{id:'COM_ORAL',name:'Se comunica oralmente'}],calendar={blocks:[],days:[]};
  const brief=buildAnnualPlanningBrief({context,snapshot,curriculum,calendar});assert.ok(!('unknowns' in brief));assert.ok(!('coverage' in brief));
  let sent,calls=0;const response={};
  const createProvider=()=>({generate:async request=>{calls++;assert.match(request.skill_instructions,/No existe un paso de diagnóstico/);assert.ok(!request.skill_instructions.includes('Máximo tres respuestas'));const decisions=request.ai_context_bundle.teacher_decisions;return {output:{status:'needs_clarification',message:'Gracias por contarme.',question:'¿Qué condición quieres considerar para tu año?',chips:[],context_items:decisions.map((text,source_turn)=>({text,source_turn,support_text:text})),non_context_turns:[]}};}});
  const call=async(body,method='POST')=>{await handlePlanningConversation({request:{method},response,url:new URL('http://localhost/api/annual-journey/conversation'),db,context,teacherId:teacher,snapshot,curriculum,calendar,sources:{names:[]},send:(_,status,value)=>{assert.equal(status,200);sent=value;},readJson:async()=>body,createProvider});return sent;};
  let conversation=await call({});for(const text of ['Contamos con patio.','Tenemos cuentos.','Prefiero trabajar plantas.','Sin pedir compras.'])conversation=await call({id:conversation.id,expectedRevision:conversation.revision,text});
  assert.equal(conversation.status,'needs_clarification','no cierra por llegar a tres respuestas');assert.equal(calls,5);
  await call({},'GET');assert.equal(calls,5,'recuperar no genera');
  await generateProjectPreview({context:{age:4,document_generation_mode:true},loadSkill:async()=> 'Currículo recibido',createProvider:()=>({generate:async request=>{assert.match(request.skill_instructions,/No pidas diagnóstico/);return {output:{context_summary:'Invitación futura a explorar.',context_points:[],additional_context_example:'Materiales por elegir.',purpose_options:['Explorar posibilidades.','Comunicar ideas.']}};}})});
  assert.equal((await db.query('select count(*)::int n from diagnostic_experience_observations')).rows[0].n,0);
 }finally{await db.close();}
});
