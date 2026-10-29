import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { openMultiAgePersistentDb, openMultiAgeLocalDb, multiAgeLocalStorage } from '../../scripts/multi-age-local-db.mjs';
import { createMultiAgeClassroom, enrollMultiAgeStudent } from './multi-age-local-service.mjs';
import { recordMultiAgeDiagnosticObservation, confirmMultiAgeFamilyContext } from './multi-age-diagnostic.mjs';
import { enqueueMultiAgeGeneration, loadMultiAgeGeneration, runMultiAgeGenerationStep, retryMultiAgeGeneration, interruptExpiredMultiAgeGenerations, listMultiAgeGenerationJobs } from './multi-age-generation-jobs.mjs';
import { multiAgeAIConfig, multiAgeProviderForJob, multiAgeGenerationTimeout } from '../../scripts/multi-age-ai-runtime.mjs';
import { multiAgeAppDevEnv } from '../../scripts/dev-multi-age-app.mjs';
import { createAIProviderForPlan } from './ai-provider-factory.mjs';
import { resolveAIExecutionPlan } from './ai-execution-router-v4.mjs';
import { proposeLocalMultiAgeDiagnostic } from './multi-age-planning-generation.mjs';
import { multiAgeDiagnosticWorkspace } from './multi-age-diagnostic.mjs';
import {chooseAyniProductMode} from './ayni-product-mode.mjs';

const id=()=>randomUUID(),confirmed=()=>({clientRequestId:id(),teacherConfirmed:true});
async function classroom(db,teacher){await db.query("insert into profiles(user_id,display_name) values($1,'Docente ficticia') on conflict(user_id) do nothing",[teacher]);return createMultiAgeClassroom(db,teacher,{...confirmed(),ages:[3,4,5],section:'Persistencia ficticia',institutionName:'Jardín ficticio',year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'});}
async function observedChild(db,teacher,c,age=3){
  const s=await enrollMultiAgeStudent(db,teacher,{...confirmed(),classroomId:c.classroomId,expectedRevision:1,firstName:`Prueba ${age}`,lastName:'Ficticia',age});
  const w=await multiAgeDiagnosticWorkspace(db,teacher,c.classroomId),view=w.students.find(ch=>ch.id===s.studentId),exp=view.catalog.find(e=>e.aspects.some(a=>a.competency_id==='COM_ORAL')),aspect=exp.aspects.find(a=>a.competency_id==='COM_ORAL');
  await recordMultiAgeDiagnosticObservation(db,teacher,{...confirmed(),studentId:s.studentId,expectedAssignmentId:s.assignmentId,experienceId:exp.id,aspectId:aspect.id,observationStatus:'observed_without_judgment',observationText:'Registro literal ficticio propio.',observedOn:'2026-03-16'});
  return s;
}

test('persistent local storage reopens data, identity, receipts and queued/results; refuses adoption and changed migrations',{timeout:90000},async t=>{
  const storeName='test-'+id();let db=await openMultiAgePersistentDb({storeName});
  const teacher=multiAgeLocalStorage(db).teacherId;
  try{
    const c=await classroom(db,teacher),s=await observedChild(db,teacher,c),input={kind:'diagnostic',classroomId:c.classroomId,studentId:s.studentId};
    const job=await enqueueMultiAgeGeneration(db,teacher,input,{mode:'fixture'});
    await t.test('another opener, traversal and arbitrary existing folders are rejected',async()=>{
      await assert.rejects(openMultiAgePersistentDb({storeName}),/otro proceso/);
      for(const name of ['../pgdata','C:/data','..','other/path'])await assert.rejects(openMultiAgePersistentDb({storeName:name}));
      const abandoned='abandoned-'+id(),directory=path.join(process.cwd(),'.local','multi-age-stores',abandoned);
      await mkdir(directory);await writeFile(path.join(directory,'sentinel.txt'),'Synthetic preexisting data');
      await assert.rejects(openMultiAgePersistentDb({storeName:abandoned}),/No se adopta/);
      assert.equal(await readFile(path.join(directory,'sentinel.txt'),'utf8'),'Synthetic preexisting data');
    });
    await db.close();db=await openMultiAgePersistentDb({storeName});
    assert.equal(multiAgeLocalStorage(db).teacherId,teacher);
    assert.equal((await loadMultiAgeGeneration(db,teacher,job.id)).status,'queued');
    assert.equal((await enqueueMultiAgeGeneration(db,teacher,input,{mode:'fixture'})).id,job.id);
    await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'fixture'})});
    const ready=await loadMultiAgeGeneration(db,teacher,job.id);assert.equal(ready.status,'ready');assert.equal(ready.result.teacherConfirmed,false);
    assert.equal((await db.query('select count(*)::int n from diagnostic_student_reviews')).rows[0].n,0,'AI never confirms');
    await db.close();db=await openMultiAgePersistentDb({storeName});
    assert.deepEqual((await loadMultiAgeGeneration(db,teacher,job.id)).result,ready.result);
    assert.equal((await db.query('select count(*)::int n from students where classroom_id=$1',[c.classroomId])).rows[0].n,1);
    await t.test('migration checksum mismatch prevents opening without rewriting sources',async()=>{
      const row=(await db.query('select * from multi_age_local_migrations order by version limit 1')).rows[0];
      await db.query("update multi_age_local_migrations set sha256='modified' where version=$1",[row.version]);await db.close();
      await assert.rejects(openMultiAgePersistentDb({storeName}),/migración aplicada cambió/);
      // Keep the test's quarantined store for inspection; no delete, no change to a migration file.
    });
  }finally{await db.close();}
});

test('generation tasks enforce ownership, current sources, failure recovery, uncertainty and bounded retries',{timeout:90000},async t=>{
  const db=await openMultiAgeLocalDb(),teacher=id(),other=id();
  try{
    const c=await classroom(db,teacher),s=await observedChild(db,teacher,c),otherC=await classroom(db,other),otherS=await observedChild(db,other,otherC);
    const input={kind:'diagnostic',classroomId:c.classroomId,studentId:s.studentId},options={mode:'fixture',providerForJob:multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'fixture'})};
    const [a,b]=await Promise.all([enqueueMultiAgeGeneration(db,teacher,input,{mode:'fixture'}),enqueueMultiAgeGeneration(db,teacher,input,{mode:'fixture'})]);assert.equal(a.id,b.id);
    await t.test('other teachers, wrong students, owner fields and disabled AI cannot access or enqueue',async()=>{
      await assert.rejects(loadMultiAgeGeneration(db,other,a.id));await assert.rejects(listMultiAgeGenerationJobs(db,other,c.classroomId));
      await assert.rejects(enqueueMultiAgeGeneration(db,teacher,{...input,studentId:otherS.studentId},{mode:'fixture'}));
      await assert.rejects(enqueueMultiAgeGeneration(db,teacher,{...input,teacherId:other},{mode:'fixture'}));
      await assert.rejects(enqueueMultiAgeGeneration(db,teacher,input));
    });
    let calls=0;const invalid={mode:'fixture',providerForJob:async()=>({generate:async()=>{calls++;return {output:{findings:[{competency_id:'COM_ORAL',observation_ids:[id()],teacher_reading:'Inventado',planning_priority:'consider'}]}};}})};
    await Promise.all([runMultiAgeGenerationStep(db,invalid),runMultiAgeGenerationStep(db,invalid)]);
    assert.equal(calls,1);assert.equal((await loadMultiAgeGeneration(db,teacher,a.id)).status,'failed');
    await t.test('reading does not retry or expose raw provider errors and a changed provider cannot retry',async()=>{
      const job=await loadMultiAgeGeneration(db,teacher,a.id);assert.equal(calls,1);assert.equal(job.result,null);assert.equal(job.errorCode,'generation_failed');
      await assert.rejects(retryMultiAgeGeneration(db,teacher,a.id,{mode:'openai'}));
    });
    await retryMultiAgeGeneration(db,teacher,a.id,{mode:'fixture'});
    const uncertain={mode:'fixture',providerForJob:async()=>({generate:async()=>{throw Object.assign(new Error('Private provider failure'),{reason:'timeout'});}})};
    await runMultiAgeGenerationStep(db,uncertain);assert.equal((await loadMultiAgeGeneration(db,teacher,a.id)).status,'interrupted');
    await retryMultiAgeGeneration(db,teacher,a.id,{mode:'fixture'});await runMultiAgeGenerationStep(db,options);
    const original=(await loadMultiAgeGeneration(db,teacher,a.id));assert.equal(original.status,'ready');
    await confirmMultiAgeFamilyContext(db,teacher,{...confirmed(),studentId:s.studentId,expectedAssignmentId:s.assignmentId,familyText:'Nueva fuente familiar ficticia.'});
    assert.equal((await loadMultiAgeGeneration(db,teacher,a.id)).status,'stale');
    assert.deepEqual((await db.query('select result from multi_age_generation_jobs where id=$1',[a.id])).rows[0].result,original.result,'stale proposals retain their immutable original for audit');
    await assert.rejects(db.query("update multi_age_generation_jobs set result=null where id=$1",[a.id]),/inmutable/);
    await assert.rejects(retryMultiAgeGeneration(db,teacher,a.id,{mode:'fixture'}));
    const next=await enqueueMultiAgeGeneration(db,teacher,input,{mode:'fixture'});assert.notEqual(next.id,a.id);
    await db.query("update multi_age_generation_jobs set status='running',lease_until=now()-interval '1 second' where id=$1",[next.id]);
    await interruptExpiredMultiAgeGenerations(db);assert.equal((await loadMultiAgeGeneration(db,teacher,next.id)).status,'interrupted');
    await retryMultiAgeGeneration(db,teacher,next.id,{mode:'fixture'});
    await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:async job=>{const previous=(await db.query("select id from student_family_interviews where student_id=$1 and status='confirmed' order by version desc limit 1",[s.studentId])).rows[0];await confirmMultiAgeFamilyContext(db,teacher,{...confirmed(),studentId:s.studentId,expectedAssignmentId:s.assignmentId,expectedInterviewId:previous.id,reason:'Rectificar contexto familiar durante la prueba.',familyText:'Fuente que cambió durante la preparación.'});return options.providerForJob(job);}});
    assert.equal((await loadMultiAgeGeneration(db,teacher,next.id)).status,'stale');
    const limit=await enqueueMultiAgeGeneration(db,teacher,input,{mode:'fixture'});
    for(let i=0;i<3;i++){await runMultiAgeGenerationStep(db,invalid);if(i<2)await retryMultiAgeGeneration(db,teacher,limit.id,{mode:'fixture'});}
    assert.equal((await loadMultiAgeGeneration(db,teacher,limit.id)).attempts,3);await assert.rejects(retryMultiAgeGeneration(db,teacher,limit.id,{mode:'fixture'}));
  }finally{await db.close();}
});

test('dedicated AI configuration cannot inherit existing credentials; OpenAI factory emits strict JSON and store false',{timeout:90000},async()=>{
  assert.deepEqual(multiAgeAIConfig({OPENAI_API_KEY:'existing-not-used'}),{mode:'off'});
  assert.equal(multiAgeGenerationTimeout('annual'),300_000);assert.equal(multiAgeGenerationTimeout('activity'),90_000);assert.equal(multiAgeGenerationTimeout('diagnostic'),90_000);
  assert.equal(multiAgeGenerationTimeout('annual',{documentsOnly:true}),600_000);assert.equal(multiAgeGenerationTimeout('activity',{documentsOnly:true}),300_000);
  assert.equal(multiAgeGenerationTimeout('activity',{documentsOnly:true,firstProject:true}),300_000);
  assert.equal(multiAgeGenerationTimeout('activity',{firstProject:true}),90_000,'El modo diario conserva su plazo.');
  assert.throws(()=>multiAgeAIConfig({AYNI_MULTI_AGE_AI_MODE:'openai',OPENAI_API_KEY:'existing-not-used'}),/clave propia/);
  const env=multiAgeAppDevEnv({OPENAI_API_KEY:'existing',AYNI_MULTI_AGE_OPENAI_API_KEY:'synthetic-key',AYNI_MULTI_AGE_AI_MODE:'openai'});
  assert.equal(env.OPENAI_API_KEY,undefined);assert.equal(env.AYNI_MULTI_AGE_OPENAI_API_KEY,'synthetic-key');
  const db=await openMultiAgeLocalDb(),teacher=id();
  try{
    const c=await classroom(db,teacher),s=await observedChild(db,teacher,c,4),plan=resolveAIExecutionPlan({workflow:'diagnostic_individual_assist',task:'generation'});
    let calls=0;
    const client={responses:{create:async payload=>{
      calls++;assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);
      const context=JSON.parse(payload.input[0].content[0].text);assert.equal(context.curricular_age,4);assert.equal(context.teacher_observations.length,1);
      assert.ok(!JSON.stringify(context).includes('first_name'));assert.ok(!JSON.stringify(context).includes('birth_date'));
      return {status:'completed',model:plan.model,output_text:JSON.stringify({findings:[{competency_id:'COM_ORAL',observation_ids:[context.teacher_observations[0].id],teacher_reading:'Lectura de prueba para revisar.',planning_priority:'consider'}]})};
    }}};
    const provider=createAIProviderForPlan(plan,{client,apiKey:'synthetic-key',store:false});
    const result=await proposeLocalMultiAgeDiagnostic(db,teacher,s.studentId,{provider});assert.equal(result.teacherConfirmed,false);assert.equal(calls,1);
    const documentsTeacher=id();await chooseAyniProductMode(db,documentsTeacher,{mode:'documents'});
    const liveFactory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:'synthetic-key'});
    const annual=await liveFactory({provider_mode:'openai',kind:'annual',teacher_id:documentsTeacher,input:{}});
    assert.equal(annual.background,true);assert.equal(annual.streamResponse,false);assert.equal(annual.store,false);assert.equal(annual.timeoutMs,60000);
    const daily=await liveFactory({provider_mode:'openai',kind:'annual',teacher_id:teacher,input:{}});
    assert.equal(daily.streamResponse,false);assert.equal(daily.timeoutMs,300000,'El Ayni diario mantiene su transporte y plazo.');
  }finally{await db.close();}
});

test('Supabase migration RLS protects generation results for two owners and denies direct client writes',{timeout:90000},async()=>{
  const db=await openMultiAgeLocalDb({schema:'supabase'}),teacher=id(),other=id();
  try{
    await db.query('insert into auth.users(id) values($1),($2)',[teacher,other]);const c=await classroom(db,teacher),s=await observedChild(db,teacher,c);
    const job=await enqueueMultiAgeGeneration(db,teacher,{kind:'diagnostic',classroomId:c.classroomId,studentId:s.studentId},{mode:'fixture'});
    await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[teacher]);assert.equal((await db.query('select id from multi_age_generation_jobs')).rows[0].id,job.id);
    await assert.rejects(db.query("update multi_age_generation_jobs set status='queued' where id=$1",[job.id]),/permission denied/);
    await assert.rejects(db.query('select * from multi_age_generation_provider_state'),/permission denied/);
    await assert.rejects(db.query("insert into multi_age_generation_provider_state(job_id,response_id) values($1,'resp_forbidden')",[job.id]),/permission denied/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);assert.equal((await db.query('select count(*)::int n from multi_age_generation_jobs')).rows[0].n,0);await db.exec('reset role');
    await assert.rejects(db.query('update multi_age_generation_jobs set teacher_id=$2 where id=$1',[job.id,other]),/no corresponde/);
  }finally{await db.close();}
});
