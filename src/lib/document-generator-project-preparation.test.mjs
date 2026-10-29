import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {openMultiAgeLocalDb,openMultiAgePersistentDb} from '../../scripts/multi-age-local-db.mjs';
import {multiAgeProviderForJob} from '../../scripts/multi-age-ai-runtime.mjs';
import {chooseAyniProductMode} from './ayni-product-mode.mjs';
import {createMultiAgeClassroom,enrollMultiAgeStudent,multiAgeLocalWorkspace} from './multi-age-local-service.mjs';
import {multiAgeAnnualContext,multiAgeAnnualWorkspace,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan} from './multi-age-annual.mjs';
import {enqueueMultiAgeGeneration,loadMultiAgeGeneration,runMultiAgeGenerationStep,interruptExpiredMultiAgeGenerations,listMultiAgeGenerationJobs} from './multi-age-generation-jobs.mjs';
import {documentProviderPollDelay,saveDocumentProviderResponse} from './multi-age-generation-provider-state.mjs';
import {startDocumentGeneratorProjectPreparation as start,readDocumentGeneratorProjectPreparation as read,advanceDocumentGeneratorProjects as advance,retryDocumentGeneratorProjectPreparation as retry} from './document-generator-project-preparation.mjs';
import {loadMultiAgeDocument} from './multi-age-document-service.mjs';
import {renderMultiAgePlanningWord} from './multi-age-planning-word.mjs';
import JSZip from 'jszip';
import {readMultiAgeConversation} from './multi-age-conversation.mjs';
import {documentProjectConversationSnapshot} from './document-generator-project-conversation.mjs';
import {officialPerformances} from './official-performance-references.mjs';
import {documentCriteriaFromWire} from './document-generator-generation-guards.mjs';

test('V34 guarda, retoma y exporta actividades con selección oficial propia fuera de los referentes del maestro',{timeout:120000},async()=>{
 const db=await openMultiAgeLocalDb();try{
  const {teacher,factory,input}=await setup(db);
  const providerForJob=async job=>{const provider=await factory(job);return {generate:async request=>{
   const result=await provider.generate(request);result.output=documentCriteriaFromWire(result.output);if(result.output.proposals)result.output.proposals=result.output.proposals.map(documentCriteriaFromWire);
   if(result.output.projectCriteriaFamilies)for(const f of result.output.projectCriteriaFamilies)for(const v of f.variants)v.official_performance_refs=officialPerformances(f.competency_id,v.curricular_age).slice(0,1).map(r=>r.id);
   for(const a of result.output.proposals??[result.output])for(const f of a.criteriaFamilies??[])for(const v of f.variants)v.official_performance_refs=officialPerformances(f.competency_id,v.curricular_age).slice(-1).map(r=>r.id);
   return result;
  }};};
  await start(db,teacher,input,options);
  for(let i=0;i<16;i++){await runMultiAgeGenerationStep(db,{...options,providerForJob});await advance(db,options);const p=await read(db,teacher,input);if(p.status==='succeeded')break;assert.notEqual(p.status,'failed');}
  const state=await read(db,teacher,input);assert.equal(state.status,'succeeded');assert.equal(state.completed,8);
  const w=await multiAgeLocalWorkspace(db,teacher,input.classroomId),project=w.projects[0];
  const row=(await db.query('select details from learning_experiences where id=$1',[project.id])).rows[0];assert.equal(row.details.document_reference_selection_version,2);
  let independent=0;
  for(const a of w.activities){
   const doc=await loadMultiAgeDocument(db,teacher,'activity',a.id);
   for(const family of doc.content.criteriaFamilies)for(const v of family.variants){const parent=row.details.criteria_families.find(f=>f.competency_id===family.competency_id).variants.find(x=>x.curricular_age===v.curricular_age);if(v.official_performance_refs.some(r=>!parent.official_performance_refs.includes(r)))independent++;}
   const bytes=await renderMultiAgePlanningWord(doc,{practical:true});assert.ok(bytes.length>1000);
  }
  assert.ok(independent>0,'La descarga debe admitir referentes oficiales pertinentes no seleccionados en el maestro.');
 }finally{await db.close();}
});

const confirm=()=>({clientRequestId:randomUUID(),teacherConfirmed:true}),options={mode:'fixture'};

test('sin identificador no repite una creación incierta; una respuesta expirada se detiene con causa clara',{timeout:90000},async()=>{
 const db=await openMultiAgeLocalDb();try{
  const {teacher,input}=await setup(db),root=await start(db,teacher,input,{mode:'openai'});let creates=0;
  const uncertain={mode:'openai',providerForJob:async()=>({generate:async()=>{creates++;throw Object.assign(new Error('timeout'),{reason:'timeout'});}})};
  assert.equal((await runMultiAgeGenerationStep(db,uncertain)).status,'interrupted');
  assert.equal(await runMultiAgeGenerationStep(db,uncertain),null);assert.equal(creates,1);
  await assert.rejects(()=>retry(db,teacher,{classroomId:input.classroomId,preparationId:root.id},{mode:'openai'}),/consumo/);
  await retry(db,teacher,{classroomId:input.classroomId,preparationId:root.id,acceptPotentialRepeat:true},{mode:'openai'});
  const providerForJob=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:'test-only'},{createProvider:(_plan,p)=>({generate:async()=>{
   creates++;await p.onResponseStarted('resp_expiry_test');throw Object.assign(new Error('pending'),{reason:'response_pending'});
  }})});
  assert.equal((await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob})).status,'queued');
  await db.query("update multi_age_generation_provider_state set started_at=now()-interval '30 minutes',next_poll_at=now() where job_id=$1",[root.id]);
  const expired=await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob});
  assert.equal(expired.status,'failed');assert.equal(expired.errorCode,'provider_response_expired');assert.equal(creates,2);
  assert.match((await read(db,teacher,input)).error,/recuperar esta respuesta/);
 }finally{await db.close();}
});

test('anual, maestro y lotes recuperan la misma respuesta tras esperas, red y reinicio sin otra generación',{timeout:120000},async()=>{
 const storeName='test-checkpoint-'+randomUUID();let db=await openMultiAgePersistentDb({storeName});
 try{
  const {teacher,input}=await setup(db),original=(await db.query('select proposal from annual_plans where id=$1',[input.annualPlanId])).rows[0].proposal;
  const annual=await enqueueMultiAgeGeneration(db,teacher,{kind:'annual',classroomId:input.classroomId},{mode:'openai'});
  const root=await start(db,teacher,input,{mode:'openai'});
  const creates=new Map(),reads=new Map();let currentJob;
  const providerForJob=async job=>{
   currentJob=job;
   return multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:'test-only'},{createProvider:(_plan,providerOptions)=>({generate:async request=>{
    assert.equal(providerOptions.background,true);assert.equal(providerOptions.store,false);assert.equal(providerOptions.streamResponse,false);
    if(!providerOptions.resumeResponseId){
     creates.set(job.id,(creates.get(job.id)??0)+1);
     await providerOptions.onResponseStarted('resp_test_'+job.id);
     throw Object.assign(new Error('pending'),{reason:'response_pending'});
    }
    assert.equal(providerOptions.resumeResponseId,'resp_test_'+job.id);
    assert.equal(providerOptions.timeoutMs,15_000);
    reads.set(job.id,(reads.get(job.id)??0)+1);
    if(reads.get(job.id)===1)throw Object.assign(new Error('temporary socket loss'),{reason:'provider_error',details:{status:null,cause_name:'SocketError'}});
    const fixture=await multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'fixture'})({...job,provider_mode:'fixture'});
    return fixture.generate(request);
   }})})(job);
  };
  // Persist the first provider ID, then reopen the database as a restarted process.
  assert.equal((await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob})).status,'queued');
  assert.equal(currentJob.id,annual.id);
  await db.query("update multi_age_generation_provider_state set next_poll_at=now()+interval '1 hour' where job_id=$1",[annual.id]);
  assert.notEqual((await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob}))?.id,annual.id,'Respeta el intervalo del anual y permite avanzar otra tarea.');
  await db.query("update multi_age_generation_jobs set status='running',lease_until=now()-interval '1 second' where id=$1",[annual.id]);
  await db.close();db=await openMultiAgePersistentDb({storeName});
  await interruptExpiredMultiAgeGenerations(db,{restarted:true});
  assert.equal((await loadMultiAgeGeneration(db,teacher,annual.id)).status,'queued');
  // Seven minutes is beyond the old five-minute cutoff. No new POST is allowed.
  await db.query("update multi_age_generation_provider_state set started_at=now()-interval '7 minutes',next_poll_at=now()");
  for(let i=0;i<20;i++){
   await db.query('update multi_age_generation_provider_state set next_poll_at=now()');
   const value=await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob});
   if(value?.status==='queued'){
    assert.equal(value.attempts,1);assert.equal(value.errorCode,null);
    const wait=await read(db,teacher,input);assert.equal(wait.status,'running');assert.equal(wait.error,null);
   }
   await advance(db,{mode:'openai'});
   if((await read(db,teacher,input)).status==='succeeded')break;
  }
  assert.equal((await read(db,teacher,input)).status,'succeeded');
  assert.equal((await loadMultiAgeGeneration(db,teacher,annual.id)).status,'ready');
  assert.equal(creates.size,4,'Un anual, un maestro y dos lotes.');
  assert.ok([...creates.values()].every(n=>n===1),'Cada respuesta se crea exactamente una vez.');
  assert.ok([...reads.values()].every(n=>n===2),'La pérdida de red solo repite la consulta.');
  const jobs=await listMultiAgeGenerationJobs(db,teacher,input.classroomId);
  assert.ok(jobs.filter(j=>j.providerMode==='openai').every(j=>j.attempts===1));
  assert.doesNotMatch(JSON.stringify(jobs),/resp_test_/,'El identificador privado no sale por la API.');
  assert.deepEqual((await db.query('select proposal from annual_plans where id=$1',[input.annualPlanId])).rows[0].proposal,original);
  assert.equal((await multiAgeLocalWorkspace(db,teacher,input.classroomId)).activities.length,8);
  const ready=(await db.query('select * from multi_age_generation_jobs where id=$1',[root.id])).rows[0];
  await assert.rejects(()=>saveDocumentProviderResponse(db,{...ready,teacher_id:randomUUID()},'resp_other'));
  assert.equal(documentProviderPollDelay({reason:'rate_limited',details:{retry_after_ms:90_000}}),60_000);
  assert.equal(documentProviderPollDelay({reason:'response_expired'}),null);
 }finally{await db.close();}
});

test('el chat informa cuándo puede generar y acepta más mensajes sin crear ni cambiar documentos',{timeout:90000},async()=>{
 const db=await openMultiAgeLocalDb();try{
  const {teacher,input}=await setup(db),before=await multiAgeLocalWorkspace(db,teacher,input.classroomId);
  const messages=['Tenemos patio y huerto.','Con eso basta, quiero generar.','También tenemos cubetas para explorar.'];
  for(const [i,text]of messages.entries()){
   const job=await enqueueMultiAgeGeneration(db,teacher,{clientRequestId:randomUUID(),kind:'conversation',classroomId:input.classroomId,expectedRevision:i,text},options);
   await runMultiAgeGenerationStep(db,{...options,providerForJob:async()=>({generate:async request=>{
    assert.ok(request.output_schema.required.includes('ready_to_generate'));
    return {output:{assistant_text:i?'Puedes generar Mi año o seguir conversando.':'¿Qué quieren explorar?',suggestions:[],ready_to_generate:i>0}};
   }})});
   assert.equal((await loadMultiAgeGeneration(db,teacher,job.id)).status,'ready');
   const chat=await readMultiAgeConversation(db,teacher,{classroomId:input.classroomId});
   assert.equal(chat.turns.at(-1).readyToGenerate,i>0);assert.deepEqual(chat.turns.map(t=>t.teacherText),messages.slice(0,i+1));
  }
  assert.deepEqual(await multiAgeLocalWorkspace(db,teacher,input.classroomId),before);
 }finally{await db.close();}
});
async function setup(db){
 const teacher=randomUUID();await chooseAyniProductMode(db,teacher,{mode:'documents'});
 const c=await createMultiAgeClassroom(db,teacher,{...confirm(),teacherName:'Docente ficticia',institutionName:'QA aislado',section:'Prueba',ages:[3,4],year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'});
 for(const age of [3,4])await enrollMultiAgeStudent(db,teacher,{...confirm(),classroomId:c.classroomId,expectedRevision:1,firstName:'Niño ficticio',lastName:'Privado',age});
 const factory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'fixture'});
 const year=await enqueueMultiAgeGeneration(db,teacher,{kind:'annual',classroomId:c.classroomId},options);
 await runMultiAgeGenerationStep(db,{...options,providerForJob:factory});
 const result=await loadMultiAgeGeneration(db,teacher,year.id);assert.equal(result.status,'ready');
 const context=await multiAgeAnnualContext(db,teacher,c.classroomId);
 const draft=await saveMultiAgeAnnualDraft(db,teacher,{...confirm(),classroomId:c.classroomId,proposal:result.result.output,sourceFingerprint:context.sourceFingerprint,generationJobId:year.id});
 await confirmMultiAgeAnnualPlan(db,teacher,{...confirm(),classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision});
 const p=await multiAgeAnnualWorkspace(db,teacher,c.classroomId),plan=p.plans.find(p=>p.status==='active'),slot=p.calendar.projects[0];
 return {teacher,factory,input:{classroomId:c.classroomId,annualPlanId:plan.id,annualSlotId:slot.slot_id,expectedPlanRevision:plan.revision,selectedDates:slot.instructional_dates.slice(0,8),teacherConfirmed:true}};
}

test('chat propio antes del proyecto, aislamiento y contexto docente conservado en todos los días',{timeout:120000},async()=>{
 const db=await openMultiAgeLocalDb();try{
  const {teacher,factory,input}=await setup(db),chatInput={classroomId:input.classroomId,annualPlanId:input.annualPlanId,annualSlotId:input.annualSlotId};
  await assert.rejects(()=>start(db,teacher,{...input,selectedDates:input.selectedDates.slice(0,1)},options),/al menos dos días/);
  assert.equal(await read(db,teacher,chatInput),null,'Una selección sin recorrido no inicia consumo ni preparación.');
  const planBefore=(await db.query('select proposal from annual_plans where id=$1',[input.annualPlanId])).rows[0].proposal;
  assert.equal((await readMultiAgeConversation(db,teacher,chatInput)).revision,0);
  await assert.rejects(()=>readMultiAgeConversation(db,randomUUID(),chatInput));
  await assert.rejects(()=>readMultiAgeConversation(db,teacher,{...chatInput,annualSlotId:'ajeno'}));
  await enqueueMultiAgeGeneration(db,teacher,{...chatInput,clientRequestId:randomUUID(),kind:'conversation',text:'Al comer necesitan apoyo para usar cuchara y vaso. Ya se lavan las manos.',expectedRevision:0},options);
  await assert.rejects(()=>start(db,teacher,input,options),/está respondiendo/);
  let chatCalls=0;
  const chatFactory=async()=>({generate:async request=>{
   chatCalls++;assert.equal(request.ai_context_bundle.scope,'project');
   assert.equal(request.ai_context_bundle.planning.classroom.section,'Prueba');
   assert.match(request.skill_instructions,/UN proyecto/);assert.match(request.skill_instructions,/No cierres después/);
   assert.ok(!JSON.stringify(request.ai_context_bundle).includes('Niño ficticio'));
   assert.ok(request.output_schema.required.includes('ready_to_generate'));
   return {output:{assistant_text:chatCalls===1?'Podríamos usar una pantalla, como sugerencia. ¿Qué recursos tienen?':'Podemos explorar utensilios, comparar recipientes y compartir una preparación de juego. ¿Cuáles serían viables?',suggestions:chatCalls===1?[]:['La primera','Las tres'],ready_to_generate:false}};
  }});
  await runMultiAgeGenerationStep(db,{...options,providerForJob:chatFactory});
  await enqueueMultiAgeGeneration(db,teacher,{...chatInput,clientRequestId:randomUUID(),kind:'conversation',text:'No hay pantalla. Usaremos utensilios habituales; quiero recoger restos y pedir ayuda también.',expectedRevision:1},options);
  await runMultiAgeGenerationStep(db,{...options,providerForJob:chatFactory});
  assert.equal(chatCalls,2);
  await enqueueMultiAgeGeneration(db,teacher,{...chatInput,clientRequestId:randomUUID(),kind:'conversation',text:'Las tres',expectedRevision:2},options);
  await runMultiAgeGenerationStep(db,{...options,providerForJob:chatFactory});
  const chat=await readMultiAgeConversation(db,teacher,chatInput);assert.equal(chat.revision,3);
  const legacySnapshot=await documentProjectConversationSnapshot(db,teacher,chatInput);
  assert.equal(Object.hasOwn(legacySnapshot,'replyContext'),false,'La lectura antigua conserva su forma.');
  assert.equal(Object.hasOwn(legacySnapshot,'transcript'),false);
  assert.ok(!JSON.stringify(legacySnapshot).includes('Podríamos usar una pantalla'));
  await assert.rejects(()=>documentProjectConversationSnapshot(db,randomUUID(),chatInput,{includeReplyContext:true}));
  await assert.rejects(()=>documentProjectConversationSnapshot(db,randomUUID(),chatInput,{includeFullConversation:true}));
  const replySnapshot=await documentProjectConversationSnapshot(db,teacher,chatInput,{includeReplyContext:true});
  assert.equal(replySnapshot.replyContext[1].teacherReply,'Las tres','Las capturas v29 siguen siendo legibles.');
  assert.equal((await readMultiAgeConversation(db,teacher,{classroomId:input.classroomId})).revision,0,'El chat anual queda separado.');
  const otherSlot=planBefore.proposals[1].slot_id;
  assert.equal((await readMultiAgeConversation(db,teacher,{...chatInput,annualSlotId:otherSlot})).revision,0);
  await assert.rejects(()=>start(db,teacher,{...input,projectConversationRevision:1},options),/conversación.*cambió/);
  await start(db,teacher,{...input,projectConversationRevision:3},options);
  let generated=0;
  const providerForJob=async job=>{const provider=await factory(job);return {generate:async request=>{
   generated++;const context=request.ai_context_bundle.confirmed_annual_position;
   assert.equal(context.project_conversation.messages.length,3);
   assert.match(context.project_conversation.messages[1].text,/No hay pantalla/);
   assert.ok(!JSON.stringify(context.project_conversation.messages).includes('Podríamos usar una pantalla'));
   const transcript=context.project_conversation.transcript;
   assert.deepEqual(transcript.map(m=>m.role),['teacher','assistant','teacher','assistant','teacher','assistant']);
   assert.ok(transcript.every(m=>m.sourceKind===(m.role==='teacher'?'teacher_context':'proposal_not_fact')));
   assert.match(transcript[1].text,/pantalla/);assert.match(transcript[2].text,/No hay pantalla/);
   assert.match(transcript[3].text,/explorar utensilios, comparar recipientes y compartir/);assert.equal(transcript[4].text,'Las tres');
   assert.equal(transcript[4].turnId,chat.turns[2].id);assert.equal(transcript[3].turnId,chat.turns[1].id);
   assert.equal(transcript[5].text,chat.turns[2].assistantText,'Incluye la última respuesta sin convertirla en dato docente.');
   assert.deepEqual(transcript[5].suggestions,chat.turns[2].suggestions);
   assert.equal(context.classroom.institution_name,'QA aislado');
   assert.match(request.skill_instructions,/Planificamos el proyecto con los niños/);
   return provider.generate(request);
  }};};
  for(let i=0;i<5;i++){await runMultiAgeGenerationStep(db,{...options,providerForJob});await advance(db,options);if((await read(db,teacher,input)).status==='succeeded')break;}
  const w=await multiAgeLocalWorkspace(db,teacher,input.classroomId);
  assert.equal(w.activities.length,8);assert.ok(generated>=2);
  assert.equal(w.activities.find(a=>a.occurs_on===input.selectedDates[0]).title,'Planificamos el proyecto con los niños');
  assert.deepEqual((await db.query('select proposal from annual_plans where id=$1',[input.annualPlanId])).rows[0].proposal,planBefore);
 }finally{await db.close();}
});

test('preparación completa, reanudable e idempotente; autorización y Word', {timeout:120000},async t=>{
 const db=await openMultiAgeLocalDb();try{
  const {teacher,factory,input}=await setup(db);let calls=0;
  const providerForJob=async job=>{const provider=await factory(job);return {generate:async request=>{calls++;const result=await provider.generate(request);
   result.output=documentCriteriaFromWire(result.output);if(result.output.proposals)result.output.proposals=result.output.proposals.map(documentCriteriaFromWire);
   if(result.output.projectCriteriaFamilies)for(const f of result.output.projectCriteriaFamilies)for(const v of f.variants){v.criterion_text='Durante el recorrido del proyecto: '+v.criterion_text;v.expected_evidence='En distintas experiencias: '+v.expected_evidence;}
   if(request.ai_context_bundle.task?.activity_competency_policy==='relevant_subset'){
    const activities=result.output.proposals??[result.output];
    for(const [index,activity]of activities.entries())activity.criteriaFamilies=[activity.criteriaFamilies[index%activity.criteriaFamilies.length]];
   }
   return result;}};};
  await t.test('consultar no prepara ni consume; rechaza otras docentes y días ajenos',async()=>{
   assert.equal(await read(db,teacher,input),null);
   await assert.rejects(()=>start(db,teacher,{...input,teacherConfirmed:false},options),/Acepta/);
   await assert.rejects(()=>start(db,randomUUID(),input,options));
   await assert.rejects(()=>start(db,teacher,{...input,expectedPlanRevision:999},options),/cambió/);
   await assert.rejects(()=>start(db,teacher,{...input,selectedDates:['2026-01-01']},options),/días lectivos/);
   await assert.rejects(()=>enqueueMultiAgeGeneration(db,teacher,{kind:'activity',classroomId:input.classroomId,documentPreparation:{root:true}},options));
   assert.equal(calls,0);
  });
  const first=await start(db,teacher,input,options);assert.equal(first.status,'running');assert.equal(first.completed,0);assert.equal(first.total,8);
  assert.equal((await start(db,teacher,input,options)).id,first.id);
  await assert.rejects(()=>start(db,teacher,{...input,selectedDates:input.selectedDates.slice(0,2)},options),/otros días/);
  await runMultiAgeGenerationStep(db,{...options,providerForJob});
  const rootResult=(await loadMultiAgeGeneration(db,teacher,first.id)).result;
  await advance(db,options);
  assert.equal((await read(db,teacher,input)).completed,1);
  await t.test('un lote fallido conserva la primera actividad y solo se reintenta explícitamente',async()=>{
   await runMultiAgeGenerationStep(db,{...options,providerForJob:async()=>({generate:async()=>{calls++;throw new Error('Fallo de proveedor de prueba');}})});
   await advance(db,options);const paused=await read(db,teacher,input);assert.equal(paused.status,'failed');assert.equal(paused.completed,1);
   await advance(db,options);assert.equal(calls,2);
   await retry(db,teacher,{classroomId:input.classroomId,preparationId:first.id},options);
  });
  for(let i=0;i<6;i++){await runMultiAgeGenerationStep(db,{...options,providerForJob});await advance(db,options);if((await read(db,teacher,input)).status==='succeeded')break;}
  const done=await read(db,teacher,input);assert.equal(done.status,'succeeded');assert.equal(done.completed,8);assert.ok(done.approved_at);
  const w=await multiAgeLocalWorkspace(db,teacher,input.classroomId);assert.equal(w.projects.length,1);assert.equal(w.activities.length,8);
  assert.deepEqual(w.activities.map(a=>a.occurs_on).sort(),input.selectedDates);
  assert.ok(w.projects[0].criteriaFamilies.length>=2);
  for(const family of rootResult.projectCriteriaFamilies)for(const variant of family.variants){const stored=w.projects[0].criteriaFamilies.find(f=>f.competency_id===family.competency_id).variants.find(v=>v.curricular_age===variant.curricular_age);assert.equal(stored.criterion_text,variant.criterion_text);assert.equal(stored.expected_evidence,variant.expected_evidence);}
  assert.notEqual(w.projects[0].criteriaFamilies[0].variants[0].criterion_text,rootResult.proposal.criteriaFamilies[0].variants[0].criterion_text,'El maestro no hereda el criterio del primer día.');
  assert.ok(w.activities.every(a=>a.details.criteria_families.length===1),'Cada día puede focalizar una competencia y el maestro conserva todas las del proyecto.');
  assert.equal(new Set(w.activities.flatMap(a=>a.details.criteria_families.map(f=>f.competency_id))).size,2,'El lote puede cambiar el foco entre actividades.');
  await t.test('proyecto y ocho actividades se descargan sin inventar evaluaciones',async()=>{
   const project=await loadMultiAgeDocument(db,teacher,'project',w.projects[0].id),activity=await loadMultiAgeDocument(db,teacher,'activity',w.activities[0].id);
   assert.equal(project.content.documentPresentationVersion,8,'El maestro nuevo guarda su presentación sin migrar documentos anteriores.');
   for(const saved of w.activities){
    const downloaded=await loadMultiAgeDocument(db,teacher,'activity',saved.id);
    assert.equal(downloaded.content.documentPresentationVersion,7,'El primer día y los lotes nuevos guardan la plantilla y su nómina sin cambiar la del proyecto.');
    assert.equal(downloaded.content.observationRoster.students.length,w.students.length,'El registro incluye a todos los alumnos.');
    assert.ok(downloaded.content.observationRoster.students.every(s=>s.name&&downloaded.identity.ages.includes(s.age)));
   }
   assert.equal(project.content.meaningfulSituation,rootResult.projectPlanning.meaningfulSituation,'El Word lee la situación creada por IA y guardada en el maestro.');
   assert.deepEqual(project.content.commonSequence,rootResult.projectPlanning.commonSequence);
   assert.equal(project.content.documentPlanning.version,4);assert.equal(project.content.purpose,project.content.documentPlanning.sequence.intendedOutcome);assert.equal(activity.content.activityPlanning.version,3);
   const practicalProject=await JSZip.loadAsync(await renderMultiAgePlanningWord(project,{practical:true}));
   const practicalXml=await practicalProject.file('word/document.xml').async('string');
   assert.match(practicalXml,/Día y fecha/);
   for(const day of project.content.documentPlanning.dailyRoute){assert.ok(practicalXml.includes(day.title));assert.ok(practicalXml.includes(day.mainAction));}
   for(const family of project.content.criteriaFamilies)for(const v of family.variants){assert.ok(practicalXml.includes(v.criterion_text));assert.ok(practicalXml.includes(v.expected_evidence));}
   assert.deepEqual(project.content.documentPlanning.ageSupports.map(s=>s.age),[3,4]);
   assert.notDeepEqual(project.content.commonSequence,activity.content.commonSequence,'El recorrido general no es la primera actividad.');
   const zip=await JSZip.loadAsync(await renderMultiAgePlanningWord(project));
   assert.ok((await zip.file('word/document.xml').async('string')).includes(project.content.meaningfulSituation));
   const projectXml=await zip.file('word/document.xml').async('string');
   assert.match(projectXml,/Enfoque de derechos/);assert.match(projectXml,/por verificar/);assert.match(projectXml,/Qué podrán decidir los niños/);
   assert.notEqual(project.content.meaningfulSituation,project.content.annualContext.organization);
   for(const [document,template]of [[project,'proyecto-unidad-inicial-unificada-v1'],[activity,'actividad-aprendizaje-inicial-unificada-v1']]){
    const rendered=await JSZip.loadAsync(await renderMultiAgePlanningWord(document)),original=await JSZip.loadAsync(await readFile(`assets/templates/${template}.docx`));
    assert.equal(await rendered.file('word/styles.xml').async('string'),await original.file('word/styles.xml').async('string'),'Los apartados nuevos conservan la tipografía y estilos aprobados.');
    for(const path of Object.keys(original.files).filter(p=>p.startsWith('word/media/')&&!original.files[p].dir))assert.deepEqual(await rendered.file(path).async('nodebuffer'),await original.file(path).async('nodebuffer'),'Se conservan las ilustraciones originales.');
   }
   for(const [kind,id] of [['project',w.projects[0].id],...w.activities.map(a=>['activity',a.id])]){
    const document=await loadMultiAgeDocument(db,teacher,kind,id);assert.ok((await renderMultiAgePlanningWord(document)).length>1000);
    if(kind==='activity'){assert.equal(document.content.activityPlanning.version,3);assert.deepEqual(document.content.activityPlanning.ageSupports.map(s=>s.age),[3,4]);}
   }
   assert.equal((await db.query('select count(*)::int n from diagnostic_experience_observations')).rows[0].n,0);
  });
  const before=calls;
  for(let i=0;i<3;i++){await advance(db,options);await start(db,teacher,input,options);await read(db,teacher,input);}
  assert.equal(calls,before);assert.equal((await multiAgeLocalWorkspace(db,teacher,input.classroomId)).activities.length,8);
  assert.equal((await db.query("select count(*)::int n from multi_age_requests where kind='document_project_complete'")).rows[0].n,1);
  await assert.rejects(()=>read(db,randomUUID(),input));
 }finally{await db.close();}
});

test('un maestro nuevo incompleto no se guarda ni se sustituye silenciosamente por la primera actividad',{timeout:90000},async()=>{
 const db=await openMultiAgeLocalDb();try{
  const {teacher,factory,input}=await setup(db),root=await start(db,teacher,input,options);
  await runMultiAgeGenerationStep(db,{...options,providerForJob:async job=>{const base=await factory(job);return {generate:async request=>{
   assert.ok(request.output_schema.required.includes('projectPlanning'));
   const response=await base.generate(request);delete response.output.projectPlanning.meaningfulSituation;return response;
  }};}});
  assert.equal((await loadMultiAgeGeneration(db,teacher,root.id)).status,'failed');
  await advance(db,options);
  assert.equal((await multiAgeLocalWorkspace(db,teacher,input.classroomId)).projects.length,0);
  assert.equal((await multiAgeLocalWorkspace(db,teacher,input.classroomId)).activities.length,0);
 }finally{await db.close();}
});

test('una interrupción exige aceptar el consumo posible; fuentes cambiadas no se aplican',{timeout:90000},async()=>{
 const db=await openMultiAgeLocalDb();try{
  const {teacher,factory,input}=await setup(db),root=await start(db,teacher,input,options);
  // Simulate a process stopping after claiming its durable job.
  await db.query("update multi_age_generation_jobs set status='interrupted' where id=$1",[root.id]);
  assert.equal((await read(db,teacher,input)).status,'uncertain');
  await assert.rejects(()=>retry(db,teacher,{classroomId:input.classroomId,preparationId:root.id},options),/consumo/);
  await retry(db,teacher,{classroomId:input.classroomId,preparationId:root.id,acceptPotentialRepeat:true},options);
  await runMultiAgeGenerationStep(db,{...options,providerForJob:factory});
  // Accept a newer year between generation and application, preserving the old one.
  const planning=await multiAgeAnnualWorkspace(db,teacher,input.classroomId),base=planning.plans.find(p=>p.id===input.annualPlanId);
  const draft=await saveMultiAgeAnnualDraft(db,teacher,{...confirm(),classroomId:input.classroomId,proposal:base.proposal,sourceFingerprint:planning.sourceFingerprint,expectedBasePlanId:base.id,expectedBaseRevision:base.revision});
  await confirmMultiAgeAnnualPlan(db,teacher,{...confirm(),classroomId:input.classroomId,planId:draft.planId,expectedRevision:draft.revision,reason:'Nueva versión aceptada durante una preparación de QA.'});
  await advance(db,options);
  const state=await read(db,teacher,input);assert.equal(state.status,'failed');assert.equal(state.completed,0);assert.equal(state.legacy,true);
  assert.equal((await multiAgeLocalWorkspace(db,teacher,input.classroomId)).activities.length,0);
  await assert.rejects(()=>retry(db,teacher,{classroomId:input.classroomId,preparationId:root.id},options),/fuentes cambiaron/);
 }finally{await db.close();}
});
