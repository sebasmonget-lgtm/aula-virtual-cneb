import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { makeMultiAgeDocumentFixture, documentFixtureRequest as conf } from '../../scripts/fixtures/multi-age-document-fixture.mjs';
import { confirmMultiAgeActivity, multiAgeLocalWorkspace } from './multi-age-local-service.mjs';
import { multiAgeAnnualWorkspace } from './multi-age-annual.mjs';
import { multiAgeProjectContext } from './multi-age-projects.mjs';
import { enqueueMultiAgeGeneration, runMultiAgeGenerationStep, loadMultiAgeGeneration, retryMultiAgeGeneration } from './multi-age-generation-jobs.mjs';
import { confirmMultiAgeActivityBatch, validateMultiAgeActivityBatch } from './multi-age-activity-batch.mjs';
import { multiAgeProviderForJob } from '../../scripts/multi-age-ai-runtime.mjs';

const options=db=>({mode:'fixture',providerForJob:multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'fixture'})});
async function setup(options={}){
  const f=await makeMultiAgeDocumentFixture(options);
  try{
    const planning=await multiAgeAnnualWorkspace(f.db,f.teacher,f.classroom.classroomId),plan=planning.plans.find(p=>p.status==='active'),row=plan.proposal.proposals[0],slot=plan.document_context.calendar.projects[0];
    const blueprint={title:'Primera exploración ficticia',purpose:row.purpose,occursOn:slot.instructional_dates[0],participantAges:[3,4,5],commonSequence:{opening:row.common_invitation,development:row.one_teacher_organization,closure:'Compartimos nuestras elecciones de manera voluntaria.'},criteriaFamilies:[{competency_id:'COM_ORAL',variants:row.opportunities.map(o=>({curricular_age:o.age,criterion_text:o.child_action,expected_evidence:o.observation,observation_moments:['development'],official_performance_refs:o.official_performance_refs}))}]};
    const a=await confirmMultiAgeActivity(f.db,f.teacher,{...conf(),classroomId:f.classroom.classroomId,expectedRevision:1,annualPlanId:plan.id,annualSlotId:slot.slot_id,blueprint});
    const project=await multiAgeProjectContext(f.db,f.teacher,f.classroom.classroomId,a.projectId);
    const input={kind:'activity_batch',classroomId:f.classroom.classroomId,annualPlanId:plan.id,annualSlotId:slot.slot_id,projectId:a.projectId,expectedProjectFingerprint:project.fingerprint,activityPosition:2,activityDates:slot.instructional_dates.slice(1,4),competencyIds:['COM_ORAL']};
    return {...f,plan,slot,blueprint,a,project,input};
  }catch(error){await f.db.close();throw error;}
}
async function generate(f){
  const job=await enqueueMultiAgeGeneration(f.db,f.teacher,f.input,{mode:'fixture'});
  assert.equal((await enqueueMultiAgeGeneration(f.db,f.teacher,f.input,{mode:'fixture'})).id,job.id);
  let calls=0;
  await runMultiAgeGenerationStep(f.db,{mode:'fixture',providerForJob:async j=>{const fixture=await options(f.db).providerForJob(j);return {generate:async request=>{
    calls++;assert.equal(request.workflow,'activity');assert.deepEqual(request.ai_context_bundle.task.activity_dates,f.input.activityDates);assert.equal(request.ai_context_bundle.confirmed_annual_position.confirmed_project.id,f.a.projectId);assert.match(request.skill_instructions,/una profesora/);return fixture.generate(request);
  }};}});
  const loaded=await loadMultiAgeGeneration(f.db,f.teacher,job.id);assert.equal(loaded.status,'ready');assert.equal(calls,1);assert.equal(loaded.result.teacherConfirmed,false);
  return {job:loaded,save:{...conf(),...f.input,kind:undefined,expectedRevision:1,generationJobId:job.id,proposals:loaded.result.proposals}};
}

test('batch: one proposal call, age-specific review, atomic rollback, immutable master and idempotent confirmation',{timeout:90000},async t=>{
  const f=await setup();try{
    const firstRows=(await f.db.query('select * from activities where id=$1',[f.a.activityId])).rows;
    const {job,save}=await generate(f);assert.equal((await multiAgeLocalWorkspace(f.db,f.teacher,f.input.classroomId)).activities.length,1);
    await assert.rejects(confirmMultiAgeActivityBatch(f.db,f.teacher,{...save,teacherConfirmed:false}));
    await t.test('a database failure on the last activity leaves zero partial activities or receipt',async()=>{
      await f.db.exec("create function fail_batch_test() returns trigger language plpgsql as $$ begin if new.title like '%actividad 4%' then raise exception 'Forced test failure'; end if; return new; end $$; create trigger fail_batch_test before insert on activities for each row execute function fail_batch_test();");
      await assert.rejects(confirmMultiAgeActivityBatch(f.db,f.teacher,save),/Forced test failure/);
      assert.equal((await multiAgeLocalWorkspace(f.db,f.teacher,f.input.classroomId)).activities.length,1);
      assert.equal((await f.db.query('select 1 from multi_age_requests where client_request_id=$1',[save.clientRequestId])).rows.length,0);
      assert.equal((await loadMultiAgeGeneration(f.db,f.teacher,job.id)).status,'ready');
      await f.db.exec('drop trigger fail_batch_test on activities; drop function fail_batch_test();');
    });
    const results=await Promise.all([confirmMultiAgeActivityBatch(f.db,f.teacher,save),confirmMultiAgeActivityBatch(f.db,f.teacher,save)]);
    assert.equal(results.filter(r=>r.replayed).length,1);assert.equal(results[0].activities.length,3);assert.deepEqual(results[0].activities,results[1].activities);
    const w=await multiAgeLocalWorkspace(f.db,f.teacher,f.input.classroomId);assert.equal(w.projects.length,1);assert.equal(w.activities.length,4);assert.equal(w.projects[0].nextPosition,5);
    assert.deepEqual(w.projects[0].activities.map(a=>a.position),[1,2,3,4]);assert.deepEqual((await multiAgeProjectContext(f.db,f.teacher,f.input.classroomId,f.a.projectId)).project,f.project.project);
    assert.deepEqual((await f.db.query('select * from activities where id=$1',[f.a.activityId])).rows,firstRows);
    for(const activity of results[0].activities){const criteria=w.criteria.filter(c=>c.activity_id===activity.activityId);assert.deepEqual(criteria.map(c=>c.curricular_age).sort(),[3,4,5]);assert.ok(criteria.every(c=>c.details.source_project_criterion_id));}
    assert.equal((await loadMultiAgeGeneration(f.db,f.teacher,job.id)).status,'stale');assert.ok((await f.db.query('select result from multi_age_generation_jobs where id=$1',[job.id])).rows[0].result);
    assert.equal((await confirmMultiAgeActivityBatch(f.db,f.teacher,save)).replayed,true);
  }finally{await f.db.close();}
});

test('batch: owner, dates, count, positions, ages and inherited references are enforced before writes',{timeout:90000},async t=>{
  const f=await setup();try{
    await assert.rejects(enqueueMultiAgeGeneration(f.db,f.other,f.input,{mode:'fixture'}));
    for(const patch of [{projectId:undefined},{activityPosition:29},{activityPosition:3},{activityDates:['2026-04-04','2026-04-05']},{activityDates:f.input.activityDates.slice(0,1)},{activityDates:[...f.input.activityDates].reverse()},{activityDates:Array(6).fill(f.input.activityDates[0])},{projectId:randomUUID()},{projectPositionOffset:1}])await assert.rejects(enqueueMultiAgeGeneration(f.db,f.teacher,{...f.input,...patch},{mode:'fixture'}));
    const {save}=await generate(f);
    for(const [name,change] of [
      ['missing age',p=>{p[2].participantAges=[3,4];p[2].criteriaFamilies[0].variants.pop();}],
      ['foreign age reference',p=>{p[2].criteriaFamilies[0].variants[0].official_performance_refs=['PCI2016.COM_ORAL.5.01'];}],
      ['different parent reference',p=>{p[2].criteriaFamilies[0].variants[0].official_performance_refs=['PCI2016.COM_ORAL.3.02'];}],
      ['duplicate title',p=>{p[2].title=p[0].title;}],
      ['duplicate sequence',p=>{p[2].commonSequence=p[0].commonSequence;}],
      ['wrong order',p=>{p.reverse();}],
      ['final grade',p=>{p[2].achievementLevel='A';}],
    ])await t.test(name,async()=>{const proposals=structuredClone(save.proposals);change(proposals);await assert.rejects(confirmMultiAgeActivityBatch(f.db,f.teacher,{...save,...conf(),proposals}));});
    await assert.rejects(confirmMultiAgeActivityBatch(f.db,f.other,save));
    await assert.rejects(confirmMultiAgeActivityBatch(f.db,f.teacher,{...save,...conf(),competencyIds:['PS_IDENTIDAD']}));
    await assert.rejects(confirmMultiAgeActivityBatch(f.db,f.teacher,{...save,...conf(),activityDates:f.input.activityDates.slice(0,2),proposals:save.proposals.slice(0,2)}));
    await validateMultiAgeActivityBatch(f.db,f.teacher,f.input,save.proposals);
    assert.equal((await multiAgeLocalWorkspace(f.db,f.teacher,f.input.classroomId)).activities.length,1);
  }finally{await f.db.close();}
});

test('batch: another confirmed activity makes the entire saved batch stale and keeps its original output',{timeout:90000},async()=>{
  const f=await setup();try{
    const {job,save}=await generate(f);
    await confirmMultiAgeActivity(f.db,f.teacher,{...conf(),...f.input,expectedRevision:1,blueprint:save.proposals[0],generationJobId:undefined});
    await assert.rejects(confirmMultiAgeActivityBatch(f.db,f.teacher,save));
    const read=await loadMultiAgeGeneration(f.db,f.teacher,job.id);assert.equal(read.status,'stale');assert.equal(read.result,null);
    assert.deepEqual((await f.db.query('select result from multi_age_generation_jobs where id=$1',[job.id])).rows[0].result.proposals,save.proposals);
    assert.equal((await multiAgeLocalWorkspace(f.db,f.teacher,f.input.classroomId)).activities.length,2);
  }finally{await f.db.close();}
});

test('batch: malformed provider result fails without partial output, only explicit retry can prepare again',{timeout:90000},async()=>{
  const f=await setup();try{
    const job=await enqueueMultiAgeGeneration(f.db,f.teacher,f.input,{mode:'fixture'});let calls=0;
    await runMultiAgeGenerationStep(f.db,{mode:'fixture',providerForJob:async j=>{const provider=await options(f.db).providerForJob(j);return {generate:async req=>{calls++;const r=await provider.generate(req);r.output.proposals.pop();return r;}};}});
    assert.equal((await loadMultiAgeGeneration(f.db,f.teacher,job.id)).status,'failed');await loadMultiAgeGeneration(f.db,f.teacher,job.id);assert.equal(calls,1);
    assert.equal(await runMultiAgeGenerationStep(f.db,options(f.db)),null);assert.equal((await multiAgeLocalWorkspace(f.db,f.teacher,f.input.classroomId)).activities.length,1);
    await retryMultiAgeGeneration(f.db,f.teacher,job.id,{mode:'fixture'});await runMultiAgeGenerationStep(f.db,options(f.db));const ready=await loadMultiAgeGeneration(f.db,f.teacher,job.id);assert.equal(ready.status,'ready');assert.equal(ready.attempts,2);
  }finally{await f.db.close();}
});

test('batch: maximum five activities retain all three ages and sequential positions',{timeout:90000},async()=>{
  const f=await setup();try{
    f.input.activityDates=f.slot.instructional_dates.slice(1,6);
    const {save}=await generate(f),saved=await confirmMultiAgeActivityBatch(f.db,f.teacher,save);
    assert.equal(saved.activities.length,5);const w=await multiAgeLocalWorkspace(f.db,f.teacher,f.input.classroomId);
    assert.equal(w.activities.length,6);assert.equal(w.projects[0].nextPosition,7);assert.equal(w.criteria.length,18);
    assert.deepEqual(w.activities.map(a=>a.occurs_on),[f.blueprint.occursOn,...f.input.activityDates],'Hoy keeps chronological order even when the whole batch shares one transaction timestamp');
    assert.deepEqual(w.activities.map(a=>a.details.activity_contract.position),[1,2,3,4,5,6]);
  }finally{await f.db.close();}
});

test('Supabase SQL: batch jobs keep owner RLS and deny direct client writes',{timeout:90000},async()=>{
  const f=await setup({schema:'supabase'});try{
    await generate(f);await f.db.exec('set role authenticated');
    await f.db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.teacher]);
    assert.equal((await f.db.query("select count(*)::int n from multi_age_generation_jobs where kind='activity_batch'")).rows[0].n,1);
    await assert.rejects(f.db.query("update multi_age_generation_jobs set status='stale' where kind='activity_batch'"),/permission denied/);
    await f.db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.other]);
    assert.equal((await f.db.query("select count(*)::int n from multi_age_generation_jobs where kind='activity_batch'")).rows[0].n,0);
    await f.db.exec('reset role');
  }finally{await f.db.close();}
});
