// Live QA only: two area-specific batches; setup and confirmations are explicitly synthetic.
import assert from 'node:assert/strict';
import { parseEnv } from 'node:util';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { openMultiAgePersistentDb, multiAgeLocalStorage } from './multi-age-local-db.mjs';
import { seedMultiAgeAreaFixture } from './fixtures/multi-age-area-fixture.mjs';
import { multiAgeProviderForJob } from './multi-age-ai-runtime.mjs';
import { enqueueMultiAgeGeneration, loadMultiAgeGeneration, runMultiAgeGenerationStep } from '../src/lib/multi-age-generation-jobs.mjs';
import { confirmMultiAgeActivityBatch } from '../src/lib/multi-age-activity-batch.mjs';
import { multiAgeLocalWorkspace } from '../src/lib/multi-age-local-service.mjs';
import { multiAgeProjectContext, multiAgeStableHash } from '../src/lib/multi-age-projects.mjs';
import { validateOfficialPerformanceRefs } from '../src/lib/official-performance-references.mjs';

const arg=name=>process.argv.find(v=>v.startsWith(`--${name}=`))?.slice(name.length+3);
const receiptPath=arg('review-receipt')??arg('verify-receipt')??arg('resume-receipt');
const mode=arg('review-receipt')?'review':arg('verify-receipt')?'verify':'prepare';
const stamp=Date.now(),directory=receiptPath?path.dirname(receiptPath):`.local/multi-age-main-20261023/lotes-areas/live-${stamp}`;
if(!path.resolve(directory).startsWith(path.resolve('.local/multi-age-main-20261023/lotes-areas')+path.sep)||!/^live-\d+$/.test(path.basename(directory)))throw new Error('Usa un recibo de esta prueba de áreas.');
if(mode==='prepare'&&!process.argv.includes('--use-configured-text-key'))throw new Error('La prueba real requiere seleccionar expresamente la clave local de texto.');
await mkdir(directory,{recursive:true});
const receipt=receiptPath?JSON.parse(await readFile(receiptPath,'utf8')):{contract:'multi-age-area-batch-live/v1',storeName:`areas-smoke-${stamp}`,syntheticOnly:true,externalDatabaseWrites:false,status:'starting',calls:[],areas:[],events:[]};
if(receipt.contract!=='multi-age-area-batch-live/v1'||receipt.syntheticOnly!==true||!/^areas-smoke-\d+$/.test(receipt.storeName))throw new Error('El recibo no pertenece al fixture ficticio de áreas.');
const persist=()=>writeFile(path.join(directory,'receipt.json'),JSON.stringify(receipt,null,2));
await persist();
const db=await openMultiAgePersistentDb({storeName:receipt.storeName}),teacher=multiAgeLocalStorage(db).teacherId;
const json=value=>JSON.parse(JSON.stringify(value));
const snapshot=async()=>json(await multiAgeLocalWorkspace(db,teacher,receipt.fixture.classroomId));
const normalize=w=>({...w,activities:[...w.activities].sort((a,b)=>a.id.localeCompare(b.id))});
let phase='setup';
try{
  if(mode==='prepare'){
    if(process.argv.includes('--new-candidates-after-review')){
      const review=JSON.parse(await readFile(path.join(directory,'review.json'),'utf8'));
      assert.equal(review.approved,false);assert.equal(receipt.areas.length,2);assert.ok(!receipt.previousCandidates);
      for(const area of receipt.areas){
        assert.equal(review.areas.find(a=>a.area===area.area).resultHash,area.resultHash);
        for(const suffix of ['context','job','official','provider'])await copyFile(path.join(directory,`${area.area}-${suffix}.json`),path.join(directory,`history-${area.area}-${area.jobId}-${suffix}.json`));
      }
      await copyFile(path.join(directory,'review.json'),path.join(directory,'review-first.json'));
      receipt.previousCandidates=json(receipt.areas);receipt.areas=[];receipt.events.push({reason:'explicit_reproposal_after_quality_review'});await persist();
    }
    receipt.status='preparing';
    if(!receipt.fixture){receipt.fixture=await seedMultiAgeAreaFixture(db,teacher);await persist();await writeFile(path.join(directory,'workspace-before.json'),JSON.stringify(await snapshot(),null,2));}
    const before=JSON.parse(await readFile(path.join(directory,'workspace-before.json'),'utf8'));
    const env=parseEnv(await readFile('.env.local','utf8')),key=process.env.AYNI_MULTI_AGE_OPENAI_API_KEY??env.AYNI_MULTI_AGE_OPENAI_API_KEY??env.OPENAI_API_KEY;
    if(!key)throw new Error('Falta clave de texto.');
    const factory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:key});
    for(const area of receipt.fixture.areas){
      phase=`prepare_${area.area}`;
      let saved=receipt.areas.find(a=>a.area===area.area);
      if(!saved){
        const input={kind:'activity_batch',classroomId:receipt.fixture.classroomId,annualPlanId:receipt.fixture.planId,annualSlotId:area.slotId,projectId:area.projectId,expectedProjectFingerprint:area.projectFingerprint,activityPosition:2,activityDates:area.activityDates,competencyIds:[area.competencyId]};
        const pending=(await db.query("select id from multi_age_generation_jobs where status in ('queued','running')")).rows;
        if(pending.length)throw new Error('Hay otra tarea pendiente.');
        const job=await enqueueMultiAgeGeneration(db,teacher,input,{mode:'openai'});
        saved={area:area.area,jobId:job.id,confirmationRequestId:randomUUID()};receipt.areas.push(saved);await persist();
      }
      let job=await loadMultiAgeGeneration(db,teacher,saved.jobId);
      if(job.status==='queued'){
        const pending=(await db.query("select id from multi_age_generation_jobs where status in ('queued','running')")).rows;
        if(pending.length!==1||pending[0].id!==job.id||receipt.calls.some(c=>c.jobId===job.id)||receipt.calls.length>=4)throw new Error('No se permite otra llamada implícita.');
        process.stdout.write(`Preparando lote real de ${area.area} con fuentes ficticias…\n`);
        await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob:async task=>{
          if(task.id!==job.id)throw new Error('Tarea ajena a la muestra.');
          const provider=await factory(task),generate=provider.generate.bind(provider);
          provider.generate=async request=>{
            receipt.calls.push({area:area.area,jobId:job.id,startedAt:new Date().toISOString()});await persist();
            await writeFile(path.join(directory,`${area.area}-context.json`),JSON.stringify(request,null,2));
            const response=await generate(request);await writeFile(path.join(directory,`${area.area}-provider.json`),JSON.stringify(response,null,2));return response;
          };return provider;
        }});
        job=await loadMultiAgeGeneration(db,teacher,saved.jobId);
      }
      saved.preparedStatus=job.status;saved.attempts=job.attempts;
      await writeFile(path.join(directory,`${area.area}-job.json`),JSON.stringify(job,null,2));
      if(job.status!=='ready')throw new Error('El lote requiere revisar el intento guardado; no se reintenta solo.');
      saved.resultHash=multiAgeStableHash(job.result);
      const p=await multiAgeProjectContext(db,teacher,receipt.fixture.classroomId,area.projectId);
      await writeFile(path.join(directory,`${area.area}-official.json`),JSON.stringify(p.project.details.criteria_families.map(f=>({competencyId:f.competency_id,variants:f.variants.map(v=>({age:v.curricular_age,masterCriterion:v.criterion_text,performances:validateOfficialPerformanceRefs(v.official_performance_refs,f.competency_id,v.curricular_age,{required:true})}))})),null,2));
      await persist();
    }
    assert.equal(multiAgeStableHash(await snapshot()),multiAgeStableHash(before));
    receipt.preparationPreservedWorkspace=true;receipt.status='ready_for_review';
  }else if(mode==='review'){
    receipt.status='confirming';const review=JSON.parse(await readFile(path.join(directory,'review.json'),'utf8'));
    if(review.approved!==true)throw new Error('Revisa la variedad y cada edad antes de confirmar.');
    for(const area of receipt.areas){
      phase=`confirm_${area.area}`;const item=review.areas.find(a=>a.area===area.area),job=await loadMultiAgeGeneration(db,teacher,area.jobId);
      assert.equal(item.resultHash,area.resultHash);
      if(!area.confirmedActivities)assert.equal(multiAgeStableHash(job.result),area.resultHash);
      assert.equal(item.activities.length,3);assert.ok(item.activities.every(a=>a.varied&&a.ageCriteriaCorrect&&a.oneTeacherFeasible));
      const input={...job.input,clientRequestId:area.confirmationRequestId,teacherConfirmed:true,expectedRevision:receipt.fixture.curriculumRevision,generationJobId:job.id,proposals:JSON.parse(await readFile(path.join(directory,`${area.area}-job.json`),'utf8')).result.proposals};
      if(!area.confirmedActivities)assert.equal(job.status,'ready');
      const result=await confirmMultiAgeActivityBatch(db,teacher,input),repeated=await confirmMultiAgeActivityBatch(db,teacher,input);
      assert.equal(repeated.replayed,true);assert.equal(multiAgeStableHash(result.activities),multiAgeStableHash(repeated.activities));
      area.confirmedActivities=result.activities;area.confirmationReplayed=true;await persist();
    }
    const before=JSON.parse(await readFile(path.join(directory,'workspace-before.json'),'utf8')),after=await snapshot();
    assert.equal(after.activities.length,8);
    for(const old of before.activities)assert.equal(multiAgeStableHash(old),multiAgeStableHash(after.activities.find(a=>a.id===old.id)));
    for(const old of before.projects)assert.equal(multiAgeStableHash(old.criteriaFamilies),multiAgeStableHash(after.projects.find(p=>p.id===old.id).criteriaFamilies));
    for(const key of ['students','pairs','reports'])assert.equal(multiAgeStableHash(before[key]),multiAgeStableHash(after[key]));
    await writeFile(path.join(directory,'workspace-after.json'),JSON.stringify(after,null,2));receipt.historyPreserved=true;receipt.status='confirmed_after_review';
  }else{
    phase='verify_reopen';const expected=JSON.parse(await readFile(path.join(directory,'workspace-after.json'),'utf8')),actual=await snapshot();
    assert.equal(multiAgeStableHash(normalize(actual)),multiAgeStableHash(normalize(expected)));
    for(const area of receipt.areas){
      const job=await loadMultiAgeGeneration(db,teacher,area.jobId);assert.equal(job.status,'stale');
      const original=(await db.query('select result from multi_age_generation_jobs where id=$1 and teacher_id=$2',[job.id,teacher])).rows[0];assert.equal(multiAgeStableHash(original.result),area.resultHash);
      const project=actual.projects.find(p=>p.id===receipt.fixture.areas.find(a=>a.area===area.area).projectId);assert.deepEqual(project.activities.map(a=>a.position),[1,2,3,4]);
      area.persistedStatus='stale';area.originalOutputPreserved=true;
    }
    for(const old of receipt.previousCandidates??[]){
      const job=await loadMultiAgeGeneration(db,teacher,old.jobId);assert.equal(job.status,'stale');
      const row=(await db.query('select result from multi_age_generation_jobs where id=$1 and teacher_id=$2',[old.jobId,teacher])).rows[0];assert.equal(multiAgeStableHash(row.result),old.resultHash);
      assert.ok(actual.activities.every(a=>a.details.generation_job_id!==old.jobId));old.originalOutputPreserved=true;old.rejectedNotApplied=true;
    }
    receipt.reopenVerified=true;receipt.status='passed';
  }
}catch{receipt.status=`failed_${phase}`;receipt.events.push({phase,reason:'qa_step_not_completed'});process.exitCode=1;}
finally{
  receipt.usage=(await db.query('select workflow,model,input_tokens,output_tokens,cost_usd,cost_source from ai_usage_events where teacher_id=$1 order by occurred_at',[teacher])).rows;
  await persist();await db.close();process.stdout.write(JSON.stringify({status:receipt.status,directory,storeName:receipt.storeName,calls:receipt.calls.length,areas:receipt.areas.map(a=>({area:a.area,status:a.preparedStatus,attempts:a.attempts})),usage:receipt.usage})+'\n');
}
