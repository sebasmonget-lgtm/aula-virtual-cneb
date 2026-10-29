// Explicit live smoke with synthetic sources only. Never loads DB/cloud credentials into the app.
import { parseEnv } from 'node:util';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { openMultiAgePersistentDb, multiAgeLocalStorage } from './multi-age-local-db.mjs';
import { multiAgeProviderForJob } from './multi-age-ai-runtime.mjs';
import { createMultiAgeClassroom, enrollMultiAgeStudent, confirmMultiAgeActivity } from '../src/lib/multi-age-local-service.mjs';
import { multiAgeDiagnosticWorkspace, recordMultiAgeDiagnosticObservation, confirmMultiAgeDiagnosticReview } from '../src/lib/multi-age-diagnostic.mjs';
import { saveMultiAgeAnnualDraft, confirmMultiAgeAnnualPlan, multiAgeAnnualWorkspace } from '../src/lib/multi-age-annual.mjs';
import { enqueueMultiAgeGeneration, runMultiAgeGenerationStep, loadMultiAgeGeneration, retryMultiAgeGeneration } from '../src/lib/multi-age-generation-jobs.mjs';

if(!process.argv.includes('--use-configured-text-key'))throw new Error('Este smoke real requiere la selección explícita de la clave local de texto.');
const configuration=parseEnv(await readFile('.env.local','utf8'));
const key=process.env.AYNI_MULTI_AGE_OPENAI_API_KEY??configuration.AYNI_MULTI_AGE_OPENAI_API_KEY??configuration.OPENAI_API_KEY;
if(!key)throw new Error('No hay una clave local de texto configurada.');
const resume=process.argv.find(a=>a.startsWith('--resume-store='))?.slice('--resume-store='.length);
if(resume&&!/^ai-smoke-\d+$/.test(resume))throw new Error('Solo se puede retomar el almacén propio de este smoke.');
const stamp=resume?Number(resume.slice('ai-smoke-'.length)):Date.now(),storeName=resume??'ai-smoke-'+stamp,db=await openMultiAgePersistentDb({storeName}),teacher=multiAgeLocalStorage(db).teacherId;
const directory=`.local/multi-age-main-20261023/persistencia-ia/live-${stamp}`;await mkdir(directory,{recursive:true});
const realFactory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:key});
const events=[],results=[];
const providerForJob=async job=>{
  const provider=await realFactory(job),generate=provider.generate.bind(provider);
  provider.generate=async request=>{try{const response=await generate(request);await writeFile(`${directory}/${job.kind}-${job.id}.json`,JSON.stringify(response,null,2));return response;}
    catch(error){events.push({kind:job.kind,reason:/^[a-z_]+$/.test(error.reason??'')?error.reason:'provider_error'});throw error;}};
  return provider;
};
const conf=()=>({clientRequestId:randomUUID(),teacherConfirmed:true});
let status='failed';
try{
  const existing=(await db.query("select id from classrooms where teacher_id=$1 and status='active' and curriculum_contract_version=2",[teacher])).rows[0];
  const c=existing?{classroomId:existing.id}:await createMultiAgeClassroom(db,teacher,{...conf(),teachingMode:'single_teacher_multi_age',calendarPolicy:'national-2026',ages:[3,4,5],section:'Solo prueba IA ficticia',institutionName:'Institución ficticia',teacherName:'Docente ficticia',year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
  const children=(await multiAgeDiagnosticWorkspace(db,teacher,c.classroomId)).students.map(s=>({studentId:s.id,assignmentId:s.assignmentId,age:s.age}));
  for(const age of [3,4,5])if(!children.some(s=>s.age===age))children.push({...await enrollMultiAgeStudent(db,teacher,{...conf(),classroomId:c.classroomId,expectedRevision:1,age,firstName:`Prueba ${age}`,lastName:'Ficticia'}),age});
  async function generate(input){
    const job=await enqueueMultiAgeGeneration(db,teacher,input,{mode:'openai'});process.stdout.write(`Preparando ${input.kind} con fuentes ficticias…\n`);
    if(['interrupted','failed'].includes(job.status)&&process.argv.includes('--retry-interrupted')){events.push({kind:input.kind,reason:'explicit_retry_prior_cost_uncertain'});await retryMultiAgeGeneration(db,teacher,job.id,{mode:'openai'});}
    else if(!['queued','ready'].includes(job.status))throw new Error('explicit_retry_required');
    if(job.status!=='ready')await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob});const result=await loadMultiAgeGeneration(db,teacher,job.id);
    results.push({kind:input.kind,status:result.status,jobId:job.id});if(result.status!=='ready')throw new Error('live_generation_not_ready');return result;
  }
  const observed={3:'Durante el juego de bloques señaló uno rojo y dijo «ese quiero». La profesora esperó mientras lo elegía.',
    4:'Al conversar sobre el juego dijo «yo hice una casa con dos puertas» y respondió a su compañera «aquí entra el perro». La profesora escuchó sin completar sus frases.',
    5:'En el intercambio del juego explicó «hicimos un puente para que los carros pasen por arriba, porque aquí había agua» y acompañó su explicación señalando su construcción.'};
  for(const child of children){
    const view=(await multiAgeDiagnosticWorkspace(db,teacher,c.classroomId)).students.find(s=>s.id===child.studentId),experience=view.catalog.find(e=>e.aspects.some(a=>a.competency_id==='COM_ORAL')),aspect=experience.aspects.find(a=>a.competency_id==='COM_ORAL');
    if(view.current)continue;
    if(!view.observations.length)await recordMultiAgeDiagnosticObservation(db,teacher,{...conf(),studentId:child.studentId,expectedAssignmentId:child.assignmentId,experienceId:experience.id,aspectId:aspect.id,observationStatus:'observed_without_judgment',observationText:observed[child.age],observedOn:'2026-03-16'});
    const result=await generate({kind:'diagnostic',classroomId:c.classroomId,studentId:child.studentId});
    await confirmMultiAgeDiagnosticReview(db,teacher,{...conf(),studentId:child.studentId,generationJobId:result.id,sourceFingerprint:result.sourceFingerprint,pendingInformationAcknowledged:true,findings:result.result.output.findings});
  }
  if(!(await multiAgeAnnualWorkspace(db,teacher,c.classroomId)).plans.some(p=>p.status==='active')){
    const annual=await generate({kind:'annual',classroomId:c.classroomId});
    const oldDraft=(await multiAgeAnnualWorkspace(db,teacher,c.classroomId)).plans.find(p=>p.status==='draft');
    const draft=await saveMultiAgeAnnualDraft(db,teacher,{...conf(),classroomId:c.classroomId,generationJobId:annual.id,sourceFingerprint:annual.sourceFingerprint,proposal:annual.result.output,...(oldDraft?{planId:oldDraft.id,expectedRevision:oldDraft.revision}:{})});
    await confirmMultiAgeAnnualPlan(db,teacher,{...conf(),classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision});
  }
  const plan=(await multiAgeAnnualWorkspace(db,teacher,c.classroomId)).plans.find(p=>p.status==='active'),row=plan.proposal.proposals[0],slot=plan.document_context.calendar.projects[0];
  const activity=await generate({kind:'activity',classroomId:c.classroomId,annualPlanId:plan.id,annualSlotId:slot.slot_id,occursOn:slot.instructional_dates[0],competencyIds:[...new Set(row.opportunities.map(o=>o.competency_id))]});
  await confirmMultiAgeActivity(db,teacher,{...conf(),classroomId:c.classroomId,expectedRevision:1,annualPlanId:plan.id,annualSlotId:slot.slot_id,generationJobId:activity.id,blueprint:activity.result.proposal});
  status='passed';
}catch{/* Only controlled status/causes are reported; never print SDK errors, headers or keys. */}
finally{
  const usage=(await db.query('select workflow,model,input_tokens,output_tokens,cost_usd,cost_source from ai_usage_events where teacher_id=$1 order by occurred_at',[teacher])).rows;
  const savedResults=(await db.query('select id,kind,status,attempts,error_code from multi_age_generation_jobs where teacher_id=$1 order by created_at',[teacher])).rows;
  const receipt={status,storeName,syntheticOnly:true,externalDatabaseWrites:false,results:savedResults,events,usage};await writeFile(`${directory}/receipt.json`,JSON.stringify(receipt,null,2));
  process.stdout.write(JSON.stringify({status,directory,results,events,usage})+'\n');await db.close();if(status!=='passed')process.exitCode=1;
}
