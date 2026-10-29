import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {parseEnv} from 'node:util';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {openMultiAgePersistentDb,multiAgeLocalStorage} from './multi-age-local-db.mjs';
import {chooseAyniProductMode} from '../src/lib/ayni-product-mode.mjs';
import {createMultiAgeClassroom,enrollMultiAgeStudent,multiAgeLocalWorkspace} from '../src/lib/multi-age-local-service.mjs';
import {multiAgeAnnualContext,sampleMultiAgeAnnualProposal,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan,multiAgeAnnualWorkspace} from '../src/lib/multi-age-annual.mjs';
import {runMultiAgeGenerationStep} from '../src/lib/multi-age-generation-jobs.mjs';
import {startDocumentGeneratorProjectPreparation as start,readDocumentGeneratorProjectPreparation as read,advanceDocumentGeneratorProjects as advance} from '../src/lib/document-generator-project-preparation.mjs';
import {multiAgeProviderForJob} from './multi-age-ai-runtime.mjs';
const keyFile=process.argv.find(a=>a.startsWith('--key-env='))?.slice(10);
if(!process.argv.includes('--confirm-live')||!keyFile)throw new Error('Requiere --confirm-live y configuración local explícita.');
const env=parseEnv(await readFile(keyFile,'utf8')),key=env.AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY??env.OPENAI_API_KEY;
if(!key)throw new Error('Falta clave de texto.');
const storeName=`generador-proyecto-live-${Date.now()}`,directory=`output/generador-documentos/${storeName}`,db=await openMultiAgePersistentDb({storeName}),teacher=multiAgeLocalStorage(db).teacherId;
const conf=()=>({clientRequestId:randomUUID(),teacherConfirmed:true}),options={mode:'openai'},events=[];let calls=0,status='failed',result;
try{
 await chooseAyniProductMode(db,teacher,{mode:'documents'});
 const {classroomId}=await createMultiAgeClassroom(db,teacher,{...conf(),teacherName:'Docente ficticia',institutionName:'Colegio ficticio',section:'QA',ages:[3,4],year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'});
 for(const age of [3,4])await enrollMultiAgeStudent(db,teacher,{...conf(),classroomId,expectedRevision:1,firstName:'Niño ficticio',lastName:'Privado QA',age});
 const context=await multiAgeAnnualContext(db,teacher,classroomId),draft=await saveMultiAgeAnnualDraft(db,teacher,{...conf(),classroomId,proposal:sampleMultiAgeAnnualProposal(context),sourceFingerprint:context.sourceFingerprint});
 await confirmMultiAgeAnnualPlan(db,teacher,{...conf(),classroomId,planId:draft.planId,expectedRevision:draft.revision});
 const planning=await multiAgeAnnualWorkspace(db,teacher,classroomId),plan=planning.plans.find(p=>p.status==='active'),slot=planning.calendar.projects[0];
 const input={classroomId,annualPlanId:plan.id,annualSlotId:slot.slot_id,expectedPlanRevision:plan.revision,selectedDates:slot.instructional_dates.slice(0,2),teacherConfirmed:true};
 await start(db,teacher,input,options);
 const factory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:key});
 for(let i=0;i<3;i++){
  await runMultiAgeGenerationStep(db,{...options,providerForJob:async job=>{const provider=await factory(job);return {generate:async request=>{
   assert.ok(calls<2);assert.ok(!JSON.stringify(request.ai_context_bundle).includes('Privado QA'));calls++;
   process.stdout.write(JSON.stringify({call:calls,state:'started'})+'\n');const at=Date.now(),value=await provider.generate(request);
   events.push({call:calls,durationMs:Date.now()-at,model:request.execution_plan.model});return value;
  }};}});
  await advance(db,options);result=await read(db,teacher,input);if(result.status!=='running')break;
 }
 assert.equal(result.status,'succeeded');assert.equal(result.completed,2);assert.equal(calls,2);
 const w=await multiAgeLocalWorkspace(db,teacher,classroomId);assert.equal(w.projects.length,1);assert.ok(w.projects[0].criteriaFamilies.length>=2);assert.equal(w.activities.length,2);
 status='passed';
}catch(error){events.push({error:error.code??'project_smoke_failed',message:error.message});process.exitCode=1;}
finally{
 const usage=(await db.query('select workflow,model,cost_usd,cost_source,input_tokens,output_tokens from ai_usage_events order by occurred_at')).rows;
 await mkdir(directory,{recursive:true});await writeFile(directory+'/receipt.json',JSON.stringify({status,storeName,syntheticOnly:true,annualSource:'editorial fixture, manually confirmed for QA',paidAnnualGenerations:0,calls,maxCalls:2,result,events,usage},null,2));
 process.stdout.write(JSON.stringify({status,calls,directory})+'\n');await db.close();
}
