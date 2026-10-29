// Two explicit, bounded live calls per prompt iteration; separate synthetic storage.
import assert from 'node:assert/strict';
import {parseEnv} from 'node:util';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {openMultiAgePersistentDb,multiAgeLocalStorage} from './multi-age-local-db.mjs';
import {chooseAyniProductMode} from '../src/lib/ayni-product-mode.mjs';
import {createMultiAgeClassroom,enrollMultiAgeStudent} from '../src/lib/multi-age-local-service.mjs';
import {enqueueMultiAgeGeneration,runMultiAgeGenerationStep,loadMultiAgeGeneration} from '../src/lib/multi-age-generation-jobs.mjs';
import {multiAgeProviderForJob} from './multi-age-ai-runtime.mjs';
import {DOCUMENT_GENERATOR_PROMPT_VERSION} from '../src/lib/document-generator-prompts.mjs';
import {generatorChatChecks} from './generator-chat-checks.mjs';

const keyFile=process.argv.find(a=>a.startsWith('--key-env='))?.slice(10);
const iteration=Number(process.argv.find(a=>a.startsWith('--iteration='))?.slice(12));
if(!process.argv.includes('--confirm-live')||!keyFile||![1,2].includes(iteration))throw new Error('Requiere --confirm-live, --key-env y --iteration=1|2.');
const config=parseEnv(await readFile(keyFile,'utf8')),key=config.AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY??config.OPENAI_API_KEY;
if(!key)throw new Error('Falta la clave de texto.');
const storeName=`generador-iteracion-${iteration}-${Date.now()}`,directory=`output/generador-documentos/${storeName}`;
await mkdir(directory,{recursive:true});
const db=await openMultiAgePersistentDb({storeName}),teacher=multiAgeLocalStorage(db).teacherId;
const factory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:key});
const conf=()=>({clientRequestId:randomUUID(),teacherConfirmed:true});
const cases=[],events=[];let calls=0,status='failed';
try{
 await chooseAyniProductMode(db,teacher,{mode:'documents'});
 const {classroomId}=await createMultiAgeClassroom(db,teacher,{...conf(),teachingMode:'single_teacher_multi_age',teacherName:'Docente ficticia',institutionName:'Escuela ficticia',section:'Prueba aislada',ages:[3,4],year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31',calendarPolicy:'national-2026'});
 for(const age of [3,4])await enrollMultiAgeStudent(db,teacher,{...conf(),classroomId,expectedRevision:1,firstName:'Niño ficticio',lastName:'Privado QA',age});
 const inputs=iteration===1?[
  'Solo podemos usar el salón y algunos cuentos. No tengo ideas de proyectos; ayúdame a comenzar.',
  'Elijo empezar por acogida y convivencia.'
 ]:[
  'Estamos en una escuela rural con patio y huerto, cuentos y bloques. Quiero comenzar con plantas, luego familia. Las familias podrían traer materiales.',
  'Corrijo lo anterior: el patio y el huerto están cerrados todo el año, no podemos usarlos. Solo salón, cuentos y bloques. No pediré compras ni asistencia de las familias. Ahora prefiero empezar por acogida y después cuentos; plantas ya no. Con eso basta, crea Mi año.'
 ];
 for(const [revision,input] of inputs.entries()){
  const job=await enqueueMultiAgeGeneration(db,teacher,{clientRequestId:randomUUID(),kind:'conversation',classroomId,expectedRevision:revision,text:input},{mode:'openai'});
  await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob:async job=>{
   const provider=await factory(job);return {generate:async request=>{
    assert.ok(calls<2);calls++;assert.ok(!JSON.stringify(request.ai_context_bundle).includes('Privado QA'));
    process.stdout.write(JSON.stringify({iteration,call:calls,state:'started'})+'\n');
    const start=Date.now(),result=await provider.generate(request);
    events.push({durationMs:Date.now()-start,model:request.execution_plan.model,promptVersion:DOCUMENT_GENERATOR_PROMPT_VERSION});return result;
   }};
  }});
  const result=await loadMultiAgeGeneration(db,teacher,job.id);assert.equal(result.status,'ready',result.errorCode??result.status);
  const {assistant_text:text,suggestions}=result.result.output;
  const item={input,text,suggestions,checks:generatorChatChecks({text,suggestions},{closing:revision===1})};cases.push(item);
  process.stdout.write(JSON.stringify(item)+'\n');
 }
 assert.equal(calls,2);status=cases.every(c=>Object.values(c.checks).every(Boolean))?'automated_checks_passed':'needs_review';
}catch(error){events.push({error:error.code??'iteration_failed',message:error.message});process.exitCode=1;}
finally{
 const usage=(await db.query('select workflow,model,cost_usd,cost_source,input_tokens,output_tokens from ai_usage_events order by occurred_at')).rows;
 await writeFile(directory+'/receipt.json',JSON.stringify({status,iteration,promptVersion:DOCUMENT_GENERATOR_PROMPT_VERSION,calls,maxCalls:2,storeName,syntheticOnly:true,paidAnnualGenerations:0,cases,events,usage},null,2));
 process.stdout.write(JSON.stringify({status,calls,directory})+'\n');await db.close();
}
