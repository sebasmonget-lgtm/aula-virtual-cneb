// Explicit opt-in, <=5 real conversation calls, no annual/project generation or real pupils.
import assert from 'node:assert/strict';
import {parseEnv} from 'node:util';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {openMultiAgePersistentDb,multiAgeLocalStorage} from './multi-age-local-db.mjs';
import {chooseAyniProductMode} from '../src/lib/ayni-product-mode.mjs';
import {createMultiAgeClassroom,enrollMultiAgeStudent} from '../src/lib/multi-age-local-service.mjs';
import {createPilotClassroom,importStudentsForTeacher} from '../src/lib/pilot-onboarding-service.mjs';
import {enqueueMultiAgeGeneration,runMultiAgeGenerationStep,loadMultiAgeGeneration} from '../src/lib/multi-age-generation-jobs.mjs';
import {multiAgeProviderForJob} from './multi-age-ai-runtime.mjs';
import {handlePlanningConversation} from '../src/lib/initial-journey-service.mjs';
import {ageFilteredAnnualCurriculum} from '../src/lib/annual-preplan-service.mjs';
import {createAIProviderForPlan} from '../src/lib/ai-provider-factory.mjs';
import {withAiUsageContext} from '../src/lib/ai-usage-service.mjs';
import {DOCUMENT_GENERATOR_PROMPT_VERSION} from '../src/lib/document-generator-prompts.mjs';
import {generatorChatChecks} from './generator-chat-checks.mjs';

const keyFile=process.argv.find(a=>a.startsWith('--key-env='))?.slice(10);
if(!process.argv.includes('--confirm-live')||!keyFile)throw new Error('Requiere --confirm-live y selección expresa del archivo de clave.');
const config=parseEnv(await readFile(keyFile,'utf8')),key=config.AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY??config.OPENAI_API_KEY;
if(!key)throw new Error('No hay clave de texto configurada.');
const storeName='generador-chat-real-'+Date.now(),directory='output/generador-documentos/'+storeName;
await mkdir(directory,{recursive:true});
const db=await openMultiAgePersistentDb({storeName}),teacher=multiAgeLocalStorage(db).teacherId;
const factory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:key});
const conf=()=>({clientRequestId:randomUUID(),teacherConfirmed:true});
const events=[],cases=[];let calls=0,status='failed';
function monitored(provider,caseId){const generate=provider.generate.bind(provider);return {generate:async request=>{
 assert.ok(calls<5,'Máximo de cinco llamadas reales agotado.');calls++;const start=Date.now();
 assert.ok(!JSON.stringify(request.ai_context_bundle).includes('ApellidoFicticio'));
 process.stdout.write(JSON.stringify({caseId,call:calls,state:'started'})+'\n');
 const response=await generate(request);events.push({caseId,model:request.execution_plan.model,promptVersion:DOCUMENT_GENERATOR_PROMPT_VERSION,durationMs:Date.now()-start,usage:response.provider_metadata?.usage??null});return response;
}};}
async function setupMulti(owner,ages,section){
 await chooseAyniProductMode(db,owner,{mode:'documents'});
 const c=await createMultiAgeClassroom(db,owner,{...conf(),teachingMode:'single_teacher_multi_age',teacherName:'Docente ficticia',institutionName:'Escuela ficticia',section,ages,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31',calendarPolicy:'national-2026'});
 for(const age of ages)await enrollMultiAgeStudent(db,owner,{...conf(),classroomId:c.classroomId,expectedRevision:1,firstName:'AlumnoFicticio',lastName:'ApellidoFicticio',age});
 return c.classroomId;
}
function record(caseId,input,text,suggestions,options={}){
 const checks=generatorChatChecks({text,suggestions},options);const result={caseId,input,text,suggestions,checks};cases.push(result);
 process.stdout.write(JSON.stringify({caseId,state:'review',...result})+'\n');
 // Save every output even if a check fails; no automatic retries or text repairs.
}
async function multiTurn(owner,classroomId,revision,text,caseId,options={}){
 const job=await enqueueMultiAgeGeneration(db,owner,{clientRequestId:randomUUID(),kind:'conversation',classroomId,expectedRevision:revision,text},{mode:'openai'});
 await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob:async job=>monitored(await factory(job),caseId)});
 const result=await loadMultiAgeGeneration(db,owner,job.id);assert.equal(result.status,'ready',result.errorCode??result.status);
 record(caseId,text,result.result.output.assistant_text,result.result.output.suggestions,options);
}
try{
 const classroomId=await setupMulti(teacher,[3,4,5],'Conversación guiada');
 await multiTurn(teacher,classroomId,0,'Quiero preparar Mi año, pero no sé qué información necesitas.','inicio-sin-idea');
 await multiTurn(teacher,classroomId,1,'La escuela está en zona semirrural. Tenemos patio, cuentos, bloques, disfraces y un pequeño huerto. Escasea el agua y hace frío en algunos meses. Quiero empezar con adaptación, seguir con organización del aula y familia, y dar oportunidades de autonomía.','contexto-completo');
 await multiTurn(teacher,classroomId,2,'Con eso basta. No quiero responder más preguntas; quiero crear Mi año sin diagnóstico y sin pedir compras a las familias.','salida-voluntaria',{closing:true});

 const single=randomUUID();await chooseAyniProductMode(db,single,{mode:'documents'});
 const native=await createPilotClassroom(db,single,{teacherName:'Docente ficticia',institutionName:'Escuela ficticia',section:'Una edad',age:4,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
 await importStudentsForTeacher(db,single,[{firstName:'AlumnoFicticio',lastName:'ApellidoFicticio'}]);
 const context={id:native.classroomId,age:4,year:2026,starts_on:'2026-03-02',ends_on:'2026-12-31',document_generation_mode:true};
 const input='No tengo ideas de proyectos ni muchos materiales. Solo tenemos el salón y algunos cuentos. Ayúdame a encontrar por dónde comenzar.';
 let answer;const singleCurriculum=await ageFilteredAnnualCurriculum(context);
 await withAiUsageContext({teacherId:single,db},()=>handlePlanningConversation({db,teacherId:single,context,
   request:{method:'POST'},response:{},url:new URL('http://localhost/api/annual-journey/conversation'),
   snapshot:{source_fingerprint:'synthetic-chat-v3',student_count:1,facts:[],competency_information:[]},curriculum:singleCurriculum,calendar:{blocks:[],days:[]},sources:{names:['AlumnoFicticio','ApellidoFicticio']},
   readJson:async()=>({text:input,expectedRevision:0}),send:(_,code,value)=>{assert.equal(code,200);answer=value;},
   createProvider:plan=>monitored(createAIProviderForPlan(plan,{apiKey:key,store:false,timeoutMs:90000}),'una-edad-pocos-recursos')
 }));
 // Exercise the same structured native service; a real curriculum is present in the native account.
 assert.ok((await ageFilteredAnnualCurriculum(context)).length);
 record('una-edad-pocos-recursos',input,answer.messages.filter(m=>m.role==='assistant').at(-1).text,answer.chips);

 const recovery=randomUUID(),recoveryClass=await setupMulti(recovery,[3,4],'Historia anterior');
 const seed=await enqueueMultiAgeGeneration(db,recovery,{clientRequestId:randomUUID(),kind:'conversation',classroomId:recoveryClass,expectedRevision:0,text:'Tenemos patio y cuentos. Quiero empezar con adaptación y convivencia, usando lo disponible sin pedir compras.'},{mode:'fixture'});
 await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:async()=>({generate:async()=>({output:{assistant_text:'Antes de seguir, completa el diagnóstico inicial. La información diagnóstica está pendiente.',suggestions:[]}})})});
 assert.equal((await loadMultiAgeGeneration(db,recovery,seed.id)).status,'ready');
 await multiTurn(recovery,recoveryClass,1,'¿Tengo que enviar el diagnóstico? Quiero preparar el año con lo que ya te conté.','recupera-historia-anterior',{closing:true});
 assert.equal(calls,5);
 assert.equal((await db.query('select count(*)::int n from diagnostic_experience_observations')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from annual_plans')).rows[0].n,0);
 status=cases.every(c=>Object.values(c.checks).every(Boolean))?'automated_checks_passed':'needs_review';
}catch(error){events.push({error:error.code??'chat_check_failed',message:error.reason??error.message});process.exitCode=1;}
finally{
 const usage=(await db.query('select workflow,model,cost_usd,cost_source,input_tokens,output_tokens from ai_usage_events order by occurred_at')).rows;
 await writeFile(directory+'/receipt.json',JSON.stringify({status,calls,maxCalls:5,storeName,syntheticOnly:true,seededHistory:true,paidAnnualGenerations:0,cases,events,usage},null,2));
 process.stdout.write(JSON.stringify({status,calls,directory})+'\n');await db.close();
}
