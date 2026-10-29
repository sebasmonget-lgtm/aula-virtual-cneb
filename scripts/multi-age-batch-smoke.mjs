// Explicit live QA with synthetic sources. Preparation and reviewed confirmation are separate.
import { parseEnv } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { openMultiAgePersistentDb, multiAgeLocalStorage } from './multi-age-local-db.mjs';
import { multiAgeProviderForJob } from './multi-age-ai-runtime.mjs';
import { enqueueMultiAgeGeneration, loadMultiAgeGeneration, runMultiAgeGenerationStep } from '../src/lib/multi-age-generation-jobs.mjs';
import { confirmMultiAgeActivityBatch } from '../src/lib/multi-age-activity-batch.mjs';
import { multiAgeProjectContext, multiAgeStableHash } from '../src/lib/multi-age-projects.mjs';
import { multiAgeLocalWorkspace } from '../src/lib/multi-age-local-service.mjs';
import { validateOfficialPerformanceRefs } from '../src/lib/official-performance-references.mjs';

const arg=name=>process.argv.find(v=>v.startsWith(`--${name}=`))?.slice(name.length+3);
const reviewing=arg('review-receipt');
let receipt=reviewing?JSON.parse(await readFile(reviewing,'utf8')):null;
const storeName=receipt?.storeName??arg('store');
if(!/^ai-smoke-\d+$/.test(storeName??''))throw new Error('Solo se admite el almacén ficticio del smoke anterior.');
const original=JSON.parse(await readFile(`.local/multi-age-main-20261023/persistencia-ia/live-${storeName.slice(9)}/receipt.json`,'utf8'));
if(original.status!=='passed'||original.syntheticOnly!==true||original.storeName!==storeName)throw new Error('La muestra necesita su recibo de fuentes ficticias.');
if(!reviewing&&!process.argv.includes('--use-configured-text-key'))throw new Error('Selecciona expresamente la clave de texto para la prueba real.');
const directory=reviewing?path.dirname(reviewing):`.local/multi-age-main-20261023/lotes/live-${Date.now()}`;
const allowed=path.resolve('.local/multi-age-main-20261023/lotes')+path.sep;
if(!path.resolve(directory).startsWith(allowed)||!/^live-\d+$/.test(path.basename(directory)))throw new Error('Recibo fuera del directorio de esta prueba.');
await mkdir(directory,{recursive:true});
const db=await openMultiAgePersistentDb({storeName}),teacher=multiAgeLocalStorage(db).teacherId,started=new Date();
receipt??={contract:'multi-age-batch-live-qa/v1',storeName,syntheticOnly:true,externalDatabaseWrites:false,status:'failed',calls:0,events:[]};
try{
  if(reviewing){
    const review=JSON.parse(await readFile(path.join(directory,'review.json'),'utf8'));
    const job=await loadMultiAgeGeneration(db,teacher,receipt.jobId);
    if(receipt.contract!=='multi-age-batch-live-qa/v1'||receipt.syntheticOnly!==true||job.status!=='ready'||review.approved!==true||review.resultHash!==multiAgeStableHash(job.result)
      ||!Array.isArray(review.activities)||review.activities.length!==job.result.proposals.length||review.activities.some(a=>!a.varied||!a.ageCriteriaCorrect||!a.oneTeacherFeasible))throw new Error('Revisa el resultado original antes de confirmar esta prueba.');
    const result=await confirmMultiAgeActivityBatch(db,teacher,{...job.input,clientRequestId:receipt.confirmationRequestId,teacherConfirmed:true,expectedRevision:receipt.curriculumRevision,generationJobId:job.id,proposals:job.result.proposals});
    const before=JSON.parse(await readFile(path.join(directory,'workspace-before.json'),'utf8')),after=await multiAgeLocalWorkspace(db,teacher,job.input.classroomId);
    if(multiAgeStableHash(after.projects[0].criteriaFamilies)!==multiAgeStableHash(before.projects[0].criteriaFamilies)||after.activities.length!==before.activities.length+job.result.proposals.length
      ||before.activities.some(old=>multiAgeStableHash(old)!==multiAgeStableHash(after.activities.find(a=>a.id===old.id)))||['reports','pairs','students'].some(k=>multiAgeStableHash(after[k])!==multiAgeStableHash(before[k])))throw new Error('La continuidad de la muestra cambió.');
    const repeated=await confirmMultiAgeActivityBatch(db,teacher,{...job.input,clientRequestId:receipt.confirmationRequestId,teacherConfirmed:true,expectedRevision:receipt.curriculumRevision,generationJobId:job.id,proposals:job.result.proposals});
    if(!repeated.replayed||multiAgeStableHash(repeated.activities)!==multiAgeStableHash(result.activities))throw new Error('La repetición cambió el lote.');
    receipt.status='confirmed_after_review';receipt.confirmedActivities=result.activities;receipt.historyPreserved=true;receipt.confirmationReplayed=true;
    await writeFile(path.join(directory,'workspace-after.json'),JSON.stringify(after,null,2));
  }else{
    const classroom=(await db.query("select id from classrooms where teacher_id=$1 and curriculum_contract_version=2 and status='active'",[teacher])).rows[0];
    if(!classroom)throw new Error('Falta el aula ficticia.');
    const before=await multiAgeLocalWorkspace(db,teacher,classroom.id);
    if(before.classroom.section!=='Solo prueba IA ficticia'||before.students.length!==3||before.students.some(s=>!s.first_name.startsWith('Prueba '))||before.projects.length!==1)throw new Error('La muestra no corresponde al fixture esperado.');
    const p=await multiAgeProjectContext(db,teacher,classroom.id,before.projects[0].id);
    if(p.nextPosition!==3)throw new Error('La prueba ya cambió. No duplicar llamadas.');
    const plan=(await db.query('select document_context from annual_plans where id=$1',[p.project.annual_plan_id])).rows[0],slot=plan.document_context.calendar.projects.find(s=>s.slot_id===p.project.details.annual_slot_id);
    const dates=slot.instructional_dates.filter(d=>d>p.activities.at(-1).occurs_on).slice(0,3);
    if(dates.length!==3)throw new Error('Faltan fechas para tres actividades.');
    const input={kind:'activity_batch',classroomId:classroom.id,annualPlanId:p.project.annual_plan_id,annualSlotId:slot.slot_id,projectId:p.project.id,expectedProjectFingerprint:p.fingerprint,activityPosition:p.nextPosition,activityDates:dates,competencyIds:p.project.details.criteria_families.map(f=>f.competency_id)};
    receipt.curriculumRevision=before.classroom.curriculum_revision;receipt.confirmationRequestId=randomUUID();
    await writeFile(path.join(directory,'workspace-before.json'),JSON.stringify(before,null,2));
    await writeFile(path.join(directory,'official-references.json'),JSON.stringify(p.project.details.criteria_families.map(f=>({competencyId:f.competency_id,variants:f.variants.map(v=>({age:v.curricular_age,masterCriterion:v.criterion_text,performances:validateOfficialPerformanceRefs(v.official_performance_refs,f.competency_id,v.curricular_age,{required:true})}))})),null,2));
    const pending=(await db.query("select id from multi_age_generation_jobs where status in ('queued','running')")).rows;
    if(pending.length)throw new Error('Hay otra tarea pendiente; no ejecutar llamadas ajenas.');
    const job=await enqueueMultiAgeGeneration(db,teacher,input,{mode:'openai'});receipt.jobId=job.id;
    if(job.status==='queued'){
      const env=parseEnv(await readFile('.env.local','utf8')),key=process.env.AYNI_MULTI_AGE_OPENAI_API_KEY??env.AYNI_MULTI_AGE_OPENAI_API_KEY??env.OPENAI_API_KEY;
      if(!key)throw new Error('Falta la clave local de texto.');
      const factory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:key});
      process.stdout.write('Preparando un lote real de tres actividades con fuentes ficticias…\n');
      await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob:async task=>{
        if(task.id!==job.id)throw new Error('Tarea distinta de esta muestra.');
        const provider=await factory(task),generate=provider.generate.bind(provider);
        provider.generate=async request=>{if(receipt.calls++)throw new Error('No se permiten llamadas adicionales implícitas.');await writeFile(path.join(directory,'request-context.json'),JSON.stringify(request,null,2));const output=await generate(request);await writeFile(path.join(directory,'provider-output.json'),JSON.stringify(output,null,2));return output;};return provider;
      }});
    }
    const ready=await loadMultiAgeGeneration(db,teacher,job.id);receipt.jobStatus=ready.status;receipt.attempts=ready.attempts;
    await writeFile(path.join(directory,'prepared-job.json'),JSON.stringify(ready,null,2));
    const after=await multiAgeLocalWorkspace(db,teacher,classroom.id);
    receipt.preparationPreservedWorkspace=multiAgeStableHash(before)===multiAgeStableHash(after);
    receipt.usage=(await db.query('select workflow,model,input_tokens,output_tokens,cost_usd,cost_source from ai_usage_events where teacher_id=$1 and occurred_at>=$2 order by occurred_at',[teacher,started])).rows;
    if(ready.status!=='ready'||!receipt.preparationPreservedWorkspace)throw new Error('La propuesta no quedó lista para revisar.');
    receipt.resultHash=multiAgeStableHash(ready.result);receipt.status='ready_for_review';
  }
}catch{receipt.events.push({reason:'qa_step_not_completed'});process.exitCode=1;}
finally{await writeFile(path.join(directory,'receipt.json'),JSON.stringify(receipt,null,2));await db.close();process.stdout.write(JSON.stringify({status:receipt.status,directory,jobId:receipt.jobId,calls:receipt.calls,jobStatus:receipt.jobStatus,usage:receipt.usage})+'\n');}
