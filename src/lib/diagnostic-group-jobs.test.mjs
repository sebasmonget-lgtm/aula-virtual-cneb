import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {createPilotClassroom,importStudentsForTeacher} from './pilot-onboarding-service.mjs';
import {recordConfirmedSpontaneousObservation} from './diagnostic-sources-v4.mjs';
import {prepareDiagnosticGroupReview,diagnosticGroupProposalSources,saveDiagnosticGroupReview} from './diagnostic-assessment-v4.mjs';
import {suggestDiagnosticGroupReview,diagnosticGroupProviderRequest} from './ai-diagnostic-evaluation-service.mjs';
import {startDiagnosticGeneration,readDiagnosticGeneration,runDiagnosticGenerationStep,diagnosticGenerationPending,claimDiagnosticDrain,releaseDiagnosticDrain} from './diagnostic-group-jobs.mjs';

const teacher='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
async function fixture(target){
 const db=await PGlite.create(target),dir=new URL('../../local-db/migrations/',import.meta.url);
 for(const name of (await readdir(dir)).filter(n=>n.endsWith('.sql')).sort())await db.exec(await readFile(new URL(name,dir),'utf8'));
 await createPilotClassroom(db,teacher,{teacherName:'Docente',institutionName:'Escuela',section:'A',age:5,year:2026,startsOn:'2026-03-01',endsOn:'2026-12-18'});
 await importStudentsForTeacher(db,teacher,[{firstName:'Ana',lastName:'Rojas'}]);
 const student=(await db.query("select s.id from students s join classrooms c on c.id=s.classroom_id where c.teacher_id=$1 and c.status='active' and s.status='active'",[teacher])).rows[0];
 await recordConfirmedSpontaneousObservation(db,teacher,{studentId:student.id,contextLabel:'Juego',observedAt:'2026-03-16',competencyIds:['PS_IDENTIDAD'],observationText:'Eligió bloques y explicó qué deseaba construir.'});
 const draft=await prepareDiagnosticGroupReview(db,teacher);return{db,draft,student};
}
function valid(request){
 const note=request.ai_context_bundle.context.observed_records[0].notes[0];
 const output={strengths:'Un niño expresó una elección.',needs:'Falta observar otras elecciones.',planning_priorities:'Mantener opciones de juego accesibles.'};
 return{output:{...output,claims:Object.entries(output).map(([field,text])=>({field,text,scope:field==='strengths'?'individual':field==='needs'?'information_gap':'planning_decision',source_refs:[note.source_id]})),
 competency_readings:[{competency_id:note.competency_ids[0],summary:'Un niño eligió materiales y explicó su intención.',next_step:'Ofrecer otra elección y escuchar su explicación.',scope:'individual',source_refs:[note.source_id]}]},
 provider_metadata:{usage:{input_tokens:100,cached_input_tokens:0,output_tokens:80},response_id:'resp_recoverable_test'}};
}
const failure=reason=>Object.assign(new Error(reason),{reason});

test('reiniciar proceso con ID guardado y lease vencida recupera tras cinco minutos sin otra creación',async()=>{
 const target=await mkdtemp(join(tmpdir(),'ayni-diagnostic-restart-'));let db;
 try{
  const setup=await fixture(target);db=setup.db;const draft=setup.draft;let time=Date.now(),creates=0,retrievals=0;
  await startDiagnosticGeneration(db,teacher,draft.id,{}, {now:()=>time});
  await runDiagnosticGenerationStep(db,{now:()=>time,createProvider:(_plan,options)=>({generate:async()=>{
   creates++;await options.onResponseStarted('resp_restart_saved');throw failure('response_pending');
  }})});
  await saveDiagnosticGroupReview(db,teacher,draft.id,{strengths:'Mi texto antes de salir.',needs:'',planning_priorities:'',competency_priorities:[]});
  await db.query(`update diagnostic_group_reviews set ai_snapshot=ai_snapshot||$1::jsonb where id=$2`,[JSON.stringify({phase:'polling',worker_token:'old-process',worker_until:new Date(time+30000).toISOString()}),draft.id]);
  await db.close();db=null;time+=5*60000;
  db=await PGlite.create(target);
  const result=await runDiagnosticGenerationStep(db,{now:()=>time,createProvider:(_plan,options)=>({generate:async request=>{
   assert.equal(options.resumeResponseId,'resp_restart_saved');retrievals++;return valid(request);
  }})});
  assert.equal(result.status,'ready');assert.equal(creates,1);assert.equal(retrievals,1);
  const row=(await db.query('select status,details,teacher_confirmed_at from diagnostic_group_reviews where id=$1',[draft.id])).rows[0];
  assert.equal(row.details.strengths,'Mi texto antes de salir.');assert.equal(row.status,'draft');assert.equal(row.teacher_confirmed_at,null);
 }finally{
  if(db)await db.close();
  if(!resolve(target).startsWith(resolve(tmpdir())+'\\ayni-diagnostic-restart-')&&!resolve(target).startsWith(resolve(tmpdir())+'/ayni-diagnostic-restart-'))throw Error('Unsafe temporary cleanup');
  await rm(target,{recursive:true,force:true});
 }
});

test('inicio concurrente, ID durable, recarga y consulta: una creación, texto y confirmación intactos',async()=>{
 const{db,draft}=await fixture();try{
 const starts=await Promise.all(Array.from({length:10},()=>startDiagnosticGeneration(db,teacher,draft.id)));
 assert.ok(starts.every(s=>s.status==='queued'));let creates=0,polls=0,original;
 let time=Date.now();const deps={now:()=>time,random:()=>0,createProvider:(plan,options)=>({generate:async request=>{
   assert.equal(plan.model,'gpt-6.1-sol');assert.equal(plan.reasoning_effort,'high');assert.equal(options.background,true);
   if(!options.resumeResponseId){creates++;original=request;await options.onResponseStarted('resp_recoverable_test');throw failure('response_pending');}
   polls++;assert.equal(options.resumeResponseId,'resp_recoverable_test');assert.deepEqual(request,original);return valid(request);
 }})};
 assert.equal((await runDiagnosticGenerationStep(db,deps)).status,'processing');
 assert.equal((await readDiagnosticGeneration(db,teacher,draft.id)).status,'processing');
 assert.equal((await startDiagnosticGeneration(db,teacher,draft.id)).status,'processing');
 await saveDiagnosticGroupReview(db,teacher,draft.id,{strengths:'Mi comentario mientras Ayni prepara la propuesta.',needs:'',planning_priorities:'',competency_priorities:[]});
 await assert.rejects(suggestDiagnosticGroupReview(db,teacher,draft.id),{reason:'in_progress'});
 assert.equal(await runDiagnosticGenerationStep(db,deps),null);time+=6000;
 const workers=await Promise.all([runDiagnosticGenerationStep(db,deps),runDiagnosticGenerationStep(db,deps)]);
 assert.equal(workers.filter(Boolean).length,1);assert.equal(creates,1);assert.equal(polls,1);
 const ready=await readDiagnosticGeneration(db,teacher,draft.id);assert.equal(ready.status,'ready');
 assert.equal(ready.details.competency_readings.length,1);assert.equal(await diagnosticGenerationPending(db),false);
 assert.equal((await startDiagnosticGeneration(db,teacher,draft.id)).status,'ready');
 assert.deepEqual((await suggestDiagnosticGroupReview(db,teacher,draft.id)).details,ready.details);
 const row=(await db.query('select status,details from diagnostic_group_reviews where id=$1',[draft.id])).rows[0];
 assert.equal(row.status,'draft');assert.equal(row.details.strengths,'Mi comentario mientras Ayni prepara la propuesta.');assert.equal(creates,1);
 }finally{await db.close();}
});

test('timeout sin ID queda incierto y solo un reintento explícito puede crear otro trabajo',async()=>{
 const{db,draft}=await fixture();try{
 await startDiagnosticGeneration(db,teacher,draft.id);let calls=0;
 const deps={createProvider:()=>({generate:async()=>{calls++;throw failure('timeout');}})};
 const result=await runDiagnosticGenerationStep(db,deps);assert.equal(result.status,'uncertain');assert.equal(result.requiresRepeatConsent,true);
 assert.equal((await startDiagnosticGeneration(db,teacher,draft.id)).status,'uncertain');
 assert.equal(await runDiagnosticGenerationStep(db,deps),null);assert.equal(calls,1);
 assert.equal((await startDiagnosticGeneration(db,teacher,draft.id,{acceptPotentialRepeat:true})).status,'queued');
 }finally{await db.close();}
});

test('timeout al consultar mantiene el ID; 429 respeta Retry-After y saldo detiene la recuperación',async()=>{
 const{db,draft}=await fixture();try{
 let time=Date.now();await startDiagnosticGeneration(db,teacher,draft.id,{}, {now:()=>time});let phase='pending',creates=0;
 const deps={now:()=>time,random:()=>0,createProvider:(_plan,opt)=>({generate:async()=>{
  if(!opt.resumeResponseId){creates++;await opt.onResponseStarted('resp_recoverable_test');throw failure('response_pending');}
  if(phase==='rate')throw Object.assign(failure('rate_limited'),{details:{retry_after_ms:90000}});
  throw failure(phase==='quota'?'insufficient_quota':'timeout');
 }})};
 await runDiagnosticGenerationStep(db,deps);time+=6000;await runDiagnosticGenerationStep(db,deps);phase='rate';time+=6000;
 const limited=await runDiagnosticGenerationStep(db,deps);assert.equal(limited.status,'processing');assert.equal(limited.retryAfterMs,90000);
 time+=10000;assert.equal(await runDiagnosticGenerationStep(db,deps),null);phase='quota';time+=81000;
 const stopped=await runDiagnosticGenerationStep(db,deps);assert.equal(stopped.status,'failed');assert.match(stopped.message,/saldo/);
 assert.equal(await runDiagnosticGenerationStep(db,deps),null);assert.equal(creates,1);
 }finally{await db.close();}
});

test('fuentes nuevas y otra docente no reciben la propuesta; se conserva texto escrito durante la espera',async()=>{
 const{db,draft,student}=await fixture();try{
 await assert.rejects(startDiagnosticGeneration(db,other,draft.id));await assert.rejects(readDiagnosticGeneration(db,other,draft.id));
 await startDiagnosticGeneration(db,teacher,draft.id);
 await db.query("update diagnostic_group_reviews set details=jsonb_set(details,'{strengths}','\"Mi texto docente\"'::jsonb) where id=$1",[draft.id]);
 const result=await runDiagnosticGenerationStep(db,{createProvider:()=>({generate:async request=>{
   await recordConfirmedSpontaneousObservation(db,teacher,{studentId:student.id,contextLabel:'Patio',observedAt:'2026-03-17',competencyIds:['PS_IDENTIDAD'],observationText:'Eligió otra caja y explicó para qué la usaría.'});return valid(request);
 }})});
 assert.equal(result.status,'failed');assert.match(result.message,/información.*cambió/);
 const row=(await db.query('select status,details,ai_snapshot from diagnostic_group_reviews where id=$1',[draft.id])).rows[0];
 assert.equal(row.details.strengths,'Mi texto docente');assert.equal(row.status,'draft');assert.equal(row.ai_snapshot.output,undefined);
 }finally{await db.close();}
});

test('trabajador interrumpido sin identificador no reenvía; vencimiento con ID tampoco crea otra respuesta',async()=>{
 const{db,draft}=await fixture();try{
 await startDiagnosticGeneration(db,teacher,draft.id);const past=new Date(Date.now()-60000).toISOString();
 await db.query(`update diagnostic_group_reviews set ai_snapshot=ai_snapshot||$1::jsonb where id=$2`,[JSON.stringify({status:'processing',phase:'creating',worker_until:past}),draft.id]);
 let calls=0;const deps={createProvider:()=>({generate:async()=>{calls++;throw failure('response_expired');}})};
 assert.equal(await runDiagnosticGenerationStep(db,deps),null);assert.equal((await readDiagnosticGeneration(db,teacher,draft.id)).status,'uncertain');
 await startDiagnosticGeneration(db,teacher,draft.id,{acceptPotentialRepeat:true});
 await db.query(`update diagnostic_group_reviews set ai_snapshot=ai_snapshot||$1::jsonb where id=$2`,[JSON.stringify({status:'processing',phase:'waiting',provider_response_id:'resp_expired_test',started_at:new Date(Date.now()-600000).toISOString()}),draft.id]);
 assert.equal((await runDiagnosticGenerationStep(db,deps)).status,'failed');assert.equal(calls,0);
 }finally{await db.close();}
});

test('constructor compartido preserva fuentes completas y no cambia instrucciones al recuperar',async()=>{
 const{db,draft}=await fixture();try{
 const sources=await diagnosticGroupProposalSources(db,teacher,draft.id);const before=structuredClone(sources);
 const plan={provider:'openai',model:'gpt-6.1-sol',reasoning_effort:'high'};
 const request=diagnosticGroupProviderRequest(sources,plan,'Instrucciones oficiales completas');
 assert.deepEqual(sources,before);assert.ok(request.skill_instructions.startsWith('Instrucciones oficiales completas\n'));
 assert.match(request.skill_instructions,/La profesora confirma los niveles/);
 assert.equal(request.ai_context_bundle.context.observed_records[0].notes[0].record_id,undefined);
 assert.equal(request.ai_context_bundle.context.observed_records[0].notes[0].text,sources.observed_records[0].notes[0].text);
 assert.deepEqual(request.ai_context_bundle.curriculum.competency_cards,sources.competency_options);
 }finally{await db.close();}
});

test('una sola continuación de servidor a la vez; liberar una lease vieja no borra la nueva',async()=>{
 const{db}=await fixture();try{
 const claims=await Promise.all(Array.from({length:5},()=>claimDiagnosticDrain(db)));
 assert.equal(claims.filter(Boolean).length,1);const old=claims.find(Boolean);
 await releaseDiagnosticDrain(db,'2000-01-01T00:00:00Z');assert.equal(await claimDiagnosticDrain(db),null);
 await releaseDiagnosticDrain(db,old);assert.ok(await claimDiagnosticDrain(db));
 }finally{await db.close();}
});

test('veinte diagnósticos simulados: dos respuestas activas, una creación por aula y recuperación completa',async()=>{
 const{db,draft}=await fixture();try{
 const drafts=[draft];
 for(let i=1;i<20;i++){
  const owner=`cccccccc-cccc-4ccc-8ccc-${String(i).padStart(12,'0')}`;
  await createPilotClassroom(db,owner,{teacherName:'Docente',institutionName:'Escuela',section:'A',age:5,year:2026,startsOn:'2026-03-01',endsOn:'2026-12-18'});
  await importStudentsForTeacher(db,owner,[{firstName:'Niña',lastName:'Rojas'}]);
  const student=(await db.query("select s.id from students s join classrooms c on c.id=s.classroom_id where c.teacher_id=$1 and c.status='active'",[owner])).rows[0];
  await recordConfirmedSpontaneousObservation(db,owner,{studentId:student.id,contextLabel:'Juego',observedAt:'2026-03-16',competencyIds:['PS_IDENTIDAD'],observationText:'Eligió una caja y explicó qué quería construir.'});
  drafts.push(await prepareDiagnosticGroupReview(db,owner));await startDiagnosticGeneration(db,owner,drafts.at(-1).id);
 }
 await startDiagnosticGeneration(db,teacher,draft.id);let time=Date.now(),creates=0,completed=0,live=0,peak=0;
 const ids=new Set(),deps={now:()=>time,random:()=>0,createProvider:(_plan,opt)=>({generate:async request=>{
  if(!opt.resumeResponseId){creates++;live++;peak=Math.max(peak,live);assert.ok(live<=2);const id='resp_mass_'+creates;ids.add(id);await opt.onResponseStarted(id);throw failure('response_pending');}
  assert.ok(ids.has(opt.resumeResponseId));ids.delete(opt.resumeResponseId);live--;completed++;return valid(request);
 }})};
 for(let step=0;step<100&&completed<20;step++){
  const results=await Promise.all([runDiagnosticGenerationStep(db,deps),runDiagnosticGenerationStep(db,deps),runDiagnosticGenerationStep(db,deps)]);
  if(!results.some(Boolean))time+=6000;
 }
 assert.equal(creates,20);assert.equal(completed,20);assert.equal(peak,2);assert.equal(live,0);
 assert.equal((await db.query("select count(*)::int n from diagnostic_group_reviews where ai_snapshot->>'status'='ready'")).rows[0].n,20);
 assert.equal((await db.query("select count(*)::int n from diagnostic_group_reviews where status='confirmed'")).rows[0].n,0);
 }finally{await db.close();}
});
