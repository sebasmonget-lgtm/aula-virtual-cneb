// One explicit real chat call, ephemeral QA only; never opens the teacher's store.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import {openMultiAgeLocalDb} from './multi-age-local-db.mjs';
import {chooseAyniProductMode} from '../src/lib/ayni-product-mode.mjs';
import {createMultiAgeClassroom,enrollMultiAgeStudent} from '../src/lib/multi-age-local-service.mjs';
import {multiAgeAnnualContext,sampleMultiAgeAnnualProposal,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan} from '../src/lib/multi-age-annual.mjs';
import {enqueueMultiAgeGeneration,runMultiAgeGenerationStep,loadMultiAgeGeneration} from '../src/lib/multi-age-generation-jobs.mjs';
import {multiAgeProviderForJob} from './multi-age-ai-runtime.mjs';
import {generatorChatChecks} from './generator-chat-checks.mjs';

if(!process.argv.includes('--confirm-live'))throw Error('Requiere autorización explícita de prueba real.');
const completeHistory=process.argv.includes('--completed-history');
const dir=`output/generador-documentos/chat-alcance-proyecto-${completeHistory?'v29':'v28'}`;await mkdir(dir,{recursive:true});
const before=JSON.parse(await readFile('.local/project-chat-scope-v28-before.json','utf8'));
if(completeHistory)before.chat=JSON.parse(await readFile('.local/project-chat-scope-v28-activation-before.json','utf8')).chats.p3;
const teacher=randomUUID(),db=await openMultiAgeLocalDb(),confirm=()=>({teacherConfirmed:true,clientRequestId:randomUUID()});
try{
 await chooseAyniProductMode(db,teacher,{mode:'documents'});
 const c=await createMultiAgeClassroom(db,teacher,{...confirm(),teacherName:'Docente ficticia QA',institutionName:'Jardín QA',section:'Prueba',ages:[3,4,5],year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'});
 for(const [i,age]of [3,4,4,5].entries())await enrollMultiAgeStudent(db,teacher,{...confirm(),classroomId:c.classroomId,expectedRevision:1,firstName:'Estudiante QA',lastName:'Prueba '+i,age});
 const context=await multiAgeAnnualContext(db,teacher,c.classroomId),proposal=sampleMultiAgeAnnualProposal(context);
 proposal.proposals[2]=before.plans.find(p=>p.status==='active').proposal.proposals[2];
 const draft=await saveMultiAgeAnnualDraft(db,teacher,{...confirm(),classroomId:c.classroomId,proposal,sourceFingerprint:context.sourceFingerprint});
 await confirmMultiAgeAnnualPlan(db,teacher,{...confirm(),classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision});
 const scope={classroomId:c.classroomId,annualPlanId:draft.planId,annualSlotId:'tramo_3'};
 const history=before.chat.turns.slice(0,completeHistory?5:2);
 for(const [i,t]of history.entries()){
  assert.ok(t.assistantText);
  await enqueueMultiAgeGeneration(db,teacher,{...scope,clientRequestId:randomUUID(),kind:'conversation',expectedRevision:i,text:t.teacherText},{mode:'fixture'});
  await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:async()=>({generate:async()=>({output:{assistant_text:t.assistantText,suggestions:t.suggestions,ready_to_generate:false}})})});
 }
 const config=parseEnv(await readFile('C:/Users/ASUS/Documents/ChatGPT/Asistente CNEB/.env.local','utf8'));
 const factory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:config.AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY??config.OPENAI_API_KEY});
 const job=await enqueueMultiAgeGeneration(db,teacher,{...scope,clientRequestId:randomUUID(),kind:'conversation',expectedRevision:history.length,text:completeHistory?'Quiero mantener la idea inicial de preparar una comida saludable, no solo elegir alimentos.':before.chat.turns[2].teacherText},{mode:'openai'});
 let calls=0;
 await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob:async j=>{
  const provider=await factory(j);return {generate:async request=>{
   assert.equal(++calls,1);assert.ok(!JSON.stringify(request.ai_context_bundle).includes('Estudiante QA'));
   await writeFile(dir+'/request.json',JSON.stringify(request,null,2));
   const result=await provider.generate(request);await writeFile(dir+'/response.json',JSON.stringify(result,null,2));return result;
  }};
 }});
 const result=await loadMultiAgeGeneration(db,teacher,job.id);assert.equal(result.status,'ready');
 const output=result.result.output,checks=generatorChatChecks({text:output.assistant_text,suggestions:output.suggestions});
 assert.ok(Object.values(checks).every(Boolean));
 const receipt={calls,syntheticOnly:true,promptVersion:result.result.promptVersion,output,checks,usage:(await db.query('select workflow,model,input_tokens,output_tokens,cost_usd from ai_usage_events')).rows};
 await writeFile(dir+'/receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}finally{await db.close();}
