import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { makeMultiAgeDocumentFixture, documentFixtureRequest as conf } from '../../scripts/fixtures/multi-age-document-fixture.mjs';
import { confirmMultiAgeActivity, observeMultiAgeStudent, multiAgeAssessmentContext, multiAgeLocalWorkspace } from './multi-age-local-service.mjs';
import { multiAgeAnnualContext, multiAgeAnnualWorkspace } from './multi-age-annual.mjs';
import { multiAgeProjectContext } from './multi-age-projects.mjs';
import { enqueueMultiAgeGeneration, runMultiAgeGenerationStep, loadMultiAgeGeneration } from './multi-age-generation-jobs.mjs';
import { multiAgeProviderForJob } from '../../scripts/multi-age-ai-runtime.mjs';
import { readMultiAgeConversation } from './multi-age-conversation.mjs';
import { confirmMultiAgePlanningDecision } from './multi-age-planning-decisions.mjs';

async function firstActivity(f){
  const w=await multiAgeAnnualWorkspace(f.db,f.teacher,f.classroom.classroomId),plan=w.plans.find(p=>p.status==='active'),row=plan.proposal.proposals[0],slot=plan.document_context.calendar.projects[0];
  const blueprint={title:'Elegimos y construimos, ficticio',purpose:row.purpose,occursOn:slot.instructional_dates[0],participantAges:[3,4,5],commonSequence:{opening:row.common_invitation,development:row.one_teacher_organization,closure:'Compartimos nuestras elecciones, sin exigir participar.'},criteriaFamilies:[{competency_id:'COM_ORAL',variants:row.opportunities.map(o=>({curricular_age:o.age,criterion_text:o.child_action,expected_evidence:o.observation,observation_moments:['development'],official_performance_refs:o.official_performance_refs}))}]};
  const result=await confirmMultiAgeActivity(f.db,f.teacher,{...conf(),classroomId:f.classroom.classroomId,expectedRevision:1,annualPlanId:plan.id,annualSlotId:slot.slot_id,blueprint});
  return {...result,plan,slot,blueprint};
}
const options=db=>({mode:'fixture',providerForJob:multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'fixture'})});
async function send(f,input){const job=await enqueueMultiAgeGeneration(f.db,f.teacher,{clientRequestId:randomUUID(),kind:'conversation',...input},{mode:'fixture'});await runMultiAgeGenerationStep(f.db,options(f.db));const loaded=await loadMultiAgeGeneration(f.db,f.teacher,job.id);assert.equal(loaded.status,'ready');return loaded;}

test('conversation is durable advice, explicit literal decisions affect future proposals only, sources and classes stay separate',{timeout:90000},async t=>{
  const f=await makeMultiAgeDocumentFixture();const {db,teacher,other,classroom}=f;
  try{
    const a=await firstActivity(f),before=await multiAgeAnnualContext(db,teacher,classroom.classroomId);
    const base={classroomId:classroom.classroomId},request={...conf(),kind:'conversation',...base,expectedRevision:0,text:'¿Cómo podemos acompañar a las tres edades? Continuar no es el tema del proyecto.'};delete request.teacherConfirmed;
    const one=await enqueueMultiAgeGeneration(db,teacher,request,{mode:'fixture'});
    assert.equal((await enqueueMultiAgeGeneration(db,teacher,request,{mode:'fixture'})).id,one.id);
    await assert.rejects(enqueueMultiAgeGeneration(db,teacher,{...request,clientRequestId:randomUUID(),text:'Otro turno simultáneo.'},{mode:'fixture'}));
    await runMultiAgeGenerationStep(db,options(db));
    const conversation=await readMultiAgeConversation(db,teacher,base);assert.equal(conversation.revision,1);assert.equal(conversation.turns[0].teacherText,request.text);assert.equal(conversation.decisions.revision,0);
    assert.equal((await multiAgeAnnualContext(db,teacher,classroom.classroomId)).sourceFingerprint,before.sourceFingerprint,'a question does not change planning sources');
    await t.test('reads never call a provider or create observations/notes and foreign scopes are rejected',async()=>{
      const count=(await db.query('select count(*)::int n from multi_age_generation_jobs')).rows[0].n;
      assert.deepEqual(await readMultiAgeConversation(db,teacher,base),conversation);assert.equal((await db.query('select count(*)::int n from multi_age_generation_jobs')).rows[0].n,count);
      assert.equal((await db.query('select count(*)::int n from ordinary_observations')).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from competency_assessments')).rows[0].n,0);
      await assert.rejects(readMultiAgeConversation(db,other,base));await assert.rejects(enqueueMultiAgeGeneration(db,other,{...request,clientRequestId:randomUUID()},{mode:'fixture'}));
      await assert.rejects(enqueueMultiAgeGeneration(db,teacher,{...request,clientRequestId:randomUUID(),scopeKey:'project:'+a.projectId},{mode:'fixture'}));
    });
    const decision={...conf(),...base,turnId:one.id,action:'include',expectedRevision:0};
    await assert.rejects(confirmMultiAgePlanningDecision(db,teacher,{...decision,teacherConfirmed:false}));
    await confirmMultiAgePlanningDecision(db,teacher,decision);
    const changed=await multiAgeAnnualContext(db,teacher,classroom.classroomId);assert.notEqual(changed.sourceFingerprint,before.sourceFingerprint);assert.equal(changed.context.teacher_confirmed_indications.messages[0].text,request.text);
    assert.equal((await multiAgeAnnualWorkspace(db,teacher,classroom.classroomId)).plans.find(p=>p.status==='active').current,true,'new indications for a future draft do not invalidate the confirmed year');
    const p=await multiAgeProjectContext(db,teacher,classroom.classroomId,a.projectId);
    const two=await send(f,{...base,projectId:a.projectId,expectedRevision:0,text:'En las próximas actividades quiero acompañar un grupo por turno. No hay témperas.'});
    const chat=await readMultiAgeConversation(db,teacher,{...base,projectId:a.projectId});assert.equal(chat.revision,1);assert.equal(chat.decisions.revision,0);
    await confirmMultiAgePlanningDecision(db,teacher,{...conf(),...base,projectId:a.projectId,turnId:two.id,action:'include',expectedRevision:0});
    const genInput={kind:'activity',...base,annualPlanId:a.plan.id,annualSlotId:a.slot.slot_id,projectId:a.projectId,expectedProjectFingerprint:p.fingerprint,activityPosition:2,occursOn:a.slot.instructional_dates[1],competencyIds:['COM_ORAL']};
    const job=await enqueueMultiAgeGeneration(db,teacher,genInput,{mode:'fixture'});
    let sawLiteral=false;
    await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:async j=>{
      const fixture=await options(db).providerForJob(j);return {generate:async req=>{assert.equal(req.workflow,'activity');assert.equal(req.ai_context_bundle.confirmed_annual_position.confirmed_project.id,a.projectId);assert.equal(req.ai_context_bundle.confirmed_annual_position.teacher_confirmed_indications.messages[0].text,chat.turns[0].teacherText);sawLiteral=true;return fixture.generate(req);}};
    }});
    assert.equal(sawLiteral,true);assert.equal((await loadMultiAgeGeneration(db,teacher,job.id)).status,'ready');
    await confirmMultiAgePlanningDecision(db,teacher,{...conf(),...base,projectId:a.projectId,turnId:two.id,action:'remove',expectedRevision:1});
    assert.equal((await loadMultiAgeGeneration(db,teacher,job.id)).status,'stale');assert.ok((await db.query('select result from multi_age_generation_jobs where id=$1',[job.id])).rows[0].result);
    assert.deepEqual((await multiAgeProjectContext(db,teacher,classroom.classroomId,a.projectId)).project,p.project,'decisions do not rewrite a confirmed project');
    assert.equal((await multiAgeLocalWorkspace(db,teacher,classroom.classroomId)).activities.length,1);
    assert.equal((await readMultiAgeConversation(db,teacher,base)).decisions.messages.length,1,'project decisions do not remove annual decisions');
    await t.test('a provider cannot smuggle a grade or observation into the conversational contract',async()=>{
      const invalid=await enqueueMultiAgeGeneration(db,teacher,{kind:'conversation',...base,clientRequestId:randomUUID(),expectedRevision:1,text:'Guardar y continuar. No inventar notas.'},{mode:'fixture'});
      await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:async()=>({generate:async()=>({output:{assistant_text:'No he cambiado los documentos.',suggestions:[],achievement_level:'A'}})})});
      assert.equal((await loadMultiAgeGeneration(db,teacher,invalid.id)).status,'failed');
      assert.equal((await db.query('select count(*)::int n from competency_assessments')).rows[0].n,0);
    });
  }finally{await db.close();}
});

test('one project has three activities: immutable master, inherited age criteria, idempotency and observations preserved',{timeout:90000},async t=>{
  const f=await makeMultiAgeDocumentFixture(),{db,teacher,classroom,children}=f;
  try{
    const first=await firstActivity(f),p=await multiAgeProjectContext(db,teacher,classroom.classroomId,first.projectId);
    const firstRows=(await db.query('select * from activities where id=$1',[first.activityId])).rows;
    let state=await multiAgeLocalWorkspace(db,teacher,classroom.classroomId);
    for(const child of children)await observeMultiAgeStudent(db,teacher,{...conf(),studentId:child.studentId,activityId:first.activityId,criterionId:state.criteria.find(c=>c.curricular_age===child.age).id,periodId:classroom.periodId,observedOn:first.blueprint.occursOn,rawText:`Observación propia inicial de ${child.age} años.`});
    const input={kind:'activity',classroomId:classroom.classroomId,annualPlanId:first.plan.id,annualSlotId:first.slot.slot_id,projectId:first.projectId,expectedProjectFingerprint:p.fingerprint,activityPosition:2,occursOn:first.slot.instructional_dates[1],competencyIds:['COM_ORAL']};
    const job=await enqueueMultiAgeGeneration(db,teacher,input,{mode:'fixture'});await runMultiAgeGenerationStep(db,options(db));const proposal=(await loadMultiAgeGeneration(db,teacher,job.id)).result.proposal;
    const save={...conf(),...input,kind:undefined,expectedRevision:1,generationJobId:job.id,blueprint:proposal};
    const second=await confirmMultiAgeActivity(db,teacher,save);assert.equal(second.projectId,first.projectId);assert.equal((await confirmMultiAgeActivity(db,teacher,save)).replayed,true);
    assert.deepEqual((await db.query('select * from activities where id=$1',[first.activityId])).rows,firstRows);
    assert.deepEqual((await multiAgeProjectContext(db,teacher,classroom.classroomId,first.projectId)).project,p.project);
    assert.equal((await db.query('select count(*)::int n from learning_experiences where classroom_id=$1',[classroom.classroomId])).rows[0].n,1);
    await t.test('wrong position, forged project and changed curriculum refs cannot append',async()=>{
      const bad={...save,...conf(),generationJobId:undefined,activityPosition:3,blueprint:structuredClone(proposal)};bad.blueprint.criteriaFamilies[0].variants[0].official_performance_refs=['PCI2016.COM_ORAL.3.02'];
      await assert.rejects(confirmMultiAgeActivity(db,teacher,bad),/heredar/);
      await assert.rejects(confirmMultiAgeActivity(db,teacher,{...save,...conf(),generationJobId:undefined,activityPosition:3,projectId:randomUUID()}));
      await assert.rejects(confirmMultiAgeActivity(db,teacher,{...save,...conf(),generationJobId:undefined,activityPosition:2}));
    });
    state=await multiAgeLocalWorkspace(db,teacher,classroom.classroomId);
    assert.equal(state.projects.length,1);assert.equal(state.projects[0].activities.length,2);assert.equal(state.projects[0].nextPosition,3);
    for(const child of children){
      const criterion=state.criteria.find(c=>c.activity_id===second.activityId&&c.curricular_age===child.age);
      await observeMultiAgeStudent(db,teacher,{...conf(),studentId:child.studentId,activityId:second.activityId,criterionId:criterion.id,periodId:classroom.periodId,observedOn:proposal.occursOn,rawText:`Segunda actuación propia de ${child.age} años.`});
      const ctx=await multiAgeAssessmentContext(db,teacher,{studentId:child.studentId,periodId:classroom.periodId,competencyId:'COM_ORAL'});assert.equal(ctx.sourceRows.length,2);assert.ok(ctx.sourceRows.every(s=>s.observation_text.includes(String(child.age))));
    }
    const third=await confirmMultiAgeActivity(db,teacher,{...save,...conf(),generationJobId:undefined,activityPosition:3,blueprint:{...proposal,title:'Continuamos nuestra construcción',occursOn:first.slot.instructional_dates[2]}});assert.equal(third.projectId,first.projectId);
    assert.equal((await multiAgeLocalWorkspace(db,teacher,classroom.classroomId)).projects[0].activities.length,3);
    const child=children[0];await assert.rejects(observeMultiAgeStudent(db,teacher,{...conf(),studentId:child.studentId,activityId:second.activityId,criterionId:state.criteria.find(c=>c.activity_id===second.activityId&&c.curricular_age===5).id,periodId:classroom.periodId,observedOn:proposal.occursOn,rawText:'Intento cruzado.'}));
  }finally{await db.close();}
});

test('Supabase SQL: conversation and literal planning decisions have RLS and immutable history',{timeout:90000},async()=>{
  const f=await makeMultiAgeDocumentFixture({schema:'supabase'}),{db,teacher,other,classroom}=f;
  try{
    const job=await send(f,{classroomId:classroom.classroomId,expectedRevision:0,text:'Quiero conversar sobre organización, sin inventar observaciones.'});
    await confirmMultiAgePlanningDecision(db,teacher,{...conf(),classroomId:classroom.classroomId,turnId:job.id,action:'include',expectedRevision:0});
    await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[teacher]);assert.equal((await db.query('select count(*)::int n from multi_age_planning_decisions')).rows[0].n,1);
    await assert.rejects(db.query('delete from multi_age_planning_decisions'),/permission denied/);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);assert.equal((await db.query('select count(*)::int n from multi_age_planning_decisions')).rows[0].n,0);await db.exec('reset role');
    await assert.rejects(db.query('delete from multi_age_planning_decisions'),/historia/);
  }finally{await db.close();}
});
