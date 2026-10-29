// Live, explicit QA only: continue the synthetic store created by multi-age-ai-smoke.mjs.
import { parseEnv } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { openMultiAgePersistentDb, multiAgeLocalStorage } from './multi-age-local-db.mjs';
import { multiAgeProviderForJob } from './multi-age-ai-runtime.mjs';
import { enqueueMultiAgeGeneration, runMultiAgeGenerationStep, loadMultiAgeGeneration } from '../src/lib/multi-age-generation-jobs.mjs';
import { readMultiAgeConversation } from '../src/lib/multi-age-conversation.mjs';
import { confirmMultiAgePlanningDecision } from '../src/lib/multi-age-planning-decisions.mjs';
import { multiAgeProjectContext, multiAgeStableHash } from '../src/lib/multi-age-projects.mjs';
import { confirmMultiAgeActivity } from '../src/lib/multi-age-local-service.mjs';
if(!process.argv.includes('--use-configured-text-key'))throw new Error('Selecciona explícitamente la conexión de texto para esta muestra ficticia.');
const storeName=process.argv.find(a=>a.startsWith('--store='))?.slice(8);
if(!/^ai-smoke-\d+$/.test(storeName??''))throw new Error('Solo se admite el almacén ficticio del smoke anterior.');
const env=parseEnv(await readFile('.env.local','utf8')),key=process.env.AYNI_MULTI_AGE_OPENAI_API_KEY??env.AYNI_MULTI_AGE_OPENAI_API_KEY??env.OPENAI_API_KEY;
if(!key)throw new Error('No hay clave local configurada.');
const db=await openMultiAgePersistentDb({storeName}),teacher=multiAgeLocalStorage(db).teacherId,started=new Date(),directory=`.local/multi-age-main-20261023/conversacion-actividades/live-${Date.now()}`;
await mkdir(directory,{recursive:true});const factory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:key}),results=[],events=[];
const providerForJob=async job=>{const provider=await factory(job),generate=provider.generate.bind(provider);provider.generate=async request=>{try{const result=await generate(request);await writeFile(`${directory}/${job.kind}-${job.id}.json`,JSON.stringify(result,null,2));return result;}catch(error){events.push({kind:job.kind,reason:/^[a-z_]+$/.test(error.reason??'')?error.reason:'provider_error'});throw error;}};return provider;};
const confirmed=()=>({clientRequestId:randomUUID(),teacherConfirmed:true});let status='failed';
try{
  const c=(await db.query("select id from classrooms where teacher_id=$1 and curriculum_contract_version=2 and status='active'",[teacher])).rows[0];
  const projectRow=(await db.query("select id from learning_experiences where classroom_id=$1 and details->>'curriculum_contract_version'='2' order by id limit 1",[c.id])).rows[0];
  const p=await multiAgeProjectContext(db,teacher,c.id,projectRow.id),before=multiAgeStableHash(p.project);
  const chat=await readMultiAgeConversation(db,teacher,{classroomId:c.id,projectId:p.project.id});
  if(chat.revision||p.nextPosition!==2)throw new Error('La muestra ya fue iniciada. No duplicar llamadas.');
  async function generate(input){const j=await enqueueMultiAgeGeneration(db,teacher,input,{mode:'openai'});process.stdout.write(`Preparando ${input.kind} con datos ficticios…\n`);await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob});const ready=await loadMultiAgeGeneration(db,teacher,j.id);results.push({kind:input.kind,status:ready.status,id:ready.id});if(ready.status!=='ready')throw new Error('generation_not_ready');return ready;}
  const turn=await generate({kind:'conversation',classroomId:c.id,projectId:p.project.id,clientRequestId:randomUUID(),expectedRevision:0,text:'Quiero que la próxima actividad use solo los bloques, sin añadir materiales. ¿Cómo acompaño la elección de los niños de 3, 4 y 5 años con una profesora? Continuar y guardar son órdenes para Ayni, no el tema del proyecto.'});
  await confirmMultiAgePlanningDecision(db,teacher,{...confirmed(),classroomId:c.id,projectId:p.project.id,turnId:turn.id,action:'include',expectedRevision:0});
  const plan=(await db.query('select * from annual_plans where id=$1',[p.project.annual_plan_id])).rows[0],slot=plan.document_context.calendar.projects.find(s=>s.slot_id===p.project.details.annual_slot_id);
  const input={kind:'activity',classroomId:c.id,annualPlanId:plan.id,annualSlotId:slot.slot_id,projectId:p.project.id,expectedProjectFingerprint:p.fingerprint,activityPosition:2,occursOn:slot.instructional_dates[1],competencyIds:[...new Set(p.project.details.criteria_families.map(f=>f.competency_id))]};
  const second=await generate(input);
  await confirmMultiAgeActivity(db,teacher,{...confirmed(),...input,expectedRevision:1,generationJobId:second.id,blueprint:second.result.proposal});
  const after=await multiAgeProjectContext(db,teacher,c.id,p.project.id);
  if(multiAgeStableHash(after.project)!==before||after.activities.length!==2)throw new Error('history_changed');
  status='passed';
}catch{/* Raw provider and SQL failures never enter logs. */}
finally{
  try{const usage=(await db.query('select workflow,model,input_tokens,output_tokens,cost_usd,cost_source from ai_usage_events where teacher_id=$1 and occurred_at>=$2 order by occurred_at',[teacher,started])).rows;const receipt={status,storeName,syntheticOnly:true,results,events,usage};await writeFile(`${directory}/receipt.json`,JSON.stringify(receipt,null,2));process.stdout.write(JSON.stringify({status,directory,results,events,usage})+'\n');}
  finally{await db.close();if(status!=='passed')process.exitCode=1;}
}
