// Explicitly authorized live check, at most three generations, only fictitious sources.
import assert from 'node:assert/strict';
import {parseEnv} from 'node:util';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {openMultiAgePersistentDb,multiAgeLocalStorage} from './multi-age-local-db.mjs';
import {multiAgeProviderForJob} from './multi-age-ai-runtime.mjs';
import {chooseAyniProductMode} from '../src/lib/ayni-product-mode.mjs';
import {createMultiAgeClassroom,enrollMultiAgeStudent,confirmMultiAgeActivity} from '../src/lib/multi-age-local-service.mjs';
import {multiAgeAnnualContext,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan} from '../src/lib/multi-age-annual.mjs';
import {confirmMultiAgePlanningDecision} from '../src/lib/multi-age-planning-decisions.mjs';
import {enqueueMultiAgeGeneration,runMultiAgeGenerationStep,loadMultiAgeGeneration} from '../src/lib/multi-age-generation-jobs.mjs';
import {loadMultiAgeDocument} from '../src/lib/multi-age-document-service.mjs';
import {renderMultiAgePlanningWord} from '../src/lib/multi-age-planning-word.mjs';
import {pilotSchoolYearDefaults} from '../src/lib/pilot-school-year-defaults.mjs';

const keyFile=process.argv.find(a=>a.startsWith('--key-env='))?.slice('--key-env='.length);
if(!keyFile||!process.argv.includes('--confirm-live'))throw new Error('Esta prueba requiere selección expresa del archivo de clave y llamadas reales.');
const config=parseEnv(await readFile(keyFile,'utf8')),key=config.AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY??config.OPENAI_API_KEY;
if(!key)throw new Error('No hay clave de texto configurada en el archivo indicado.');
const storeName='generador-smoke-real-'+Date.now(),directory='output/generador-documentos/'+storeName;
await mkdir(directory,{recursive:true});
const db=await openMultiAgePersistentDb({storeName}),teacher=multiAgeLocalStorage(db).teacherId;
const factory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:key});
let calls=0,status='failed';const events=[],documents=[];
const confirm=()=>({clientRequestId:randomUUID(),teacherConfirmed:true});
const providerForJob=async job=>{
 const provider=await factory(job),generate=provider.generate.bind(provider);
 provider.generate=async request=>{
   assert.ok(calls<3,'Presupuesto de tres generaciones agotado.');calls++;
   const started=Date.now();process.stdout.write(JSON.stringify({call:calls,kind:job.kind,state:'started'})+'\n');
   const response=await generate(request);events.push({kind:job.kind,durationMs:Date.now()-started,usage:response.provider_metadata?.usage??null});return response;
 };return provider;
};
async function run(input){
 const job=await enqueueMultiAgeGeneration(db,teacher,{clientRequestId:randomUUID(),...input},{mode:'openai'});
 assert.equal(job.status,'queued');await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob});
 const result=await loadMultiAgeGeneration(db,teacher,job.id);
 await writeFile(`${directory}/${input.kind}.json`,JSON.stringify(result,null,2));
 assert.equal(result.status,'ready',`${input.kind}: ${result.errorCode??result.status}`);
 process.stdout.write(JSON.stringify({call:calls,kind:input.kind,state:'ready'})+'\n');return result;
}
try{
 await chooseAyniProductMode(db,teacher,{mode:'documents'});
 const {startsOn,endsOn}=pilotSchoolYearDefaults(2026);
 const c=await createMultiAgeClassroom(db,teacher,{...confirm(),teachingMode:'single_teacher_multi_age',teacherName:'Docente ficticia de verificación',institutionName:'Jardín ficticio de verificación',section:'Prueba mínima de IA',ages:[3,4,5],year:2026,startsOn,endsOn});
 for(const age of [3,4,5])await enrollMultiAgeStudent(db,teacher,{...confirm(),classroomId:c.classroomId,expectedRevision:1,firstName:`Prueba ${age}`,lastName:'Ficticia',age});
 const chat=await run({kind:'conversation',classroomId:c.classroomId,expectedRevision:0,text:'Tengo un patio y libros de cuentos. Una profesora atiende a niños de 3, 4 y 5 años. Quiero explorar cuentos, plantas y juegos con materiales reutilizables seguros. Ayúdame a planificar; estos son recursos e ideas, no observaciones de aprendizaje.'});
 await confirmMultiAgePlanningDecision(db,teacher,{...confirm(),classroomId:c.classroomId,turnId:chat.id,action:'include',expectedRevision:0});
 const year=await run({kind:'annual',classroomId:c.classroomId});
 const context=await multiAgeAnnualContext(db,teacher,c.classroomId),proposal=year.result.output;
 assert.equal(new Set(proposal.proposals.map(p=>p.title)).size,15);
 assert.ok(proposal.proposals.every(p=>!/^Invitación compartida \d+$/.test(p.title)));
 const draft=await saveMultiAgeAnnualDraft(db,teacher,{...confirm(),classroomId:c.classroomId,proposal,sourceFingerprint:context.sourceFingerprint,generationJobId:year.id});
 await confirmMultiAgeAnnualPlan(db,teacher,{...confirm(),classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision});
 const row=proposal.proposals.find(p=>[...new Set(p.opportunities.map(o=>o.competency_id))].some(id=>[3,4,5].every(age=>p.opportunities.some(o=>o.age===age&&o.competency_id===id))));
 assert.ok(row,'El proyecto de prueba requiere una oportunidad compartida por las tres edades.');
 const competencyId=[...new Set(row.opportunities.map(o=>o.competency_id))].find(id=>[3,4,5].every(age=>row.opportunities.some(o=>o.age===age&&o.competency_id===id)));
 const slot=context.calendar.projects.find(s=>s.slot_id===row.slot_id),input={classroomId:c.classroomId,annualPlanId:draft.planId,annualSlotId:row.slot_id,occursOn:slot.instructional_dates[0],competencyIds:[competencyId]};
 const activity=await run({kind:'activity',...input});
 const saved=await confirmMultiAgeActivity(db,teacher,{...confirm(),...input,expectedRevision:1,blueprint:activity.result.proposal,generationJobId:activity.id});
 const projectId=(await db.query('select experience_id from activities where id=$1',[saved.activityId])).rows[0].experience_id;
 for(const [kind,id]of [['annual_plan',draft.planId],['project',projectId],['activity',saved.activityId]]){
   const doc=await loadMultiAgeDocument(db,teacher,kind,id),bytes=await renderMultiAgePlanningWord(doc);assert.ok(bytes.length>1000);documents.push({kind,id,bytes:bytes.length});
 }
 assert.equal((await db.query('select count(*)::int n from diagnostic_experience_observations')).rows[0].n,0);
 status='passed';
}catch(error){events.push({error:error.code??'live_smoke_failed',reason:error.reason??error.message});process.exitCode=1;}
finally{
 const usage=(await db.query('select workflow,model,input_tokens,output_tokens,cost_usd,cost_source from ai_usage_events where teacher_id=$1 order by occurred_at',[teacher])).rows;
 const jobs=(await db.query('select kind,status,attempts,error_code from multi_age_generation_jobs where teacher_id=$1 order by created_at',[teacher])).rows;
 const receipt={status,storeName,calls,syntheticOnly:true,documents,events,jobs,usage};await writeFile(directory+'/receipt.json',JSON.stringify(receipt,null,2));
 process.stdout.write(JSON.stringify({status,calls,directory,jobs,documents})+'\n');await db.close();
}
