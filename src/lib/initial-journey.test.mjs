import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readdir,readFile } from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import { createPilotClassroom,importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { recordConfirmedSpontaneousObservation,reviseSpontaneousObservation,correctSpontaneousClassification,loadSpontaneousObservations,applicableDiagnosticCompetencies } from "./diagnostic-sources-v4.mjs";
import { previewSpontaneous,suggestSavedCapture,handleFamilyShare,handleStudentPhoto } from "../../scripts/initial-journey-routes.mjs";
import { buildAnnualPlanningBrief,handlePlanningConversation } from "./initial-journey-service.mjs";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { personalizationSources } from "./annual-personalization-service.mjs";

test("initial journey: atomic decisions, private photos/invitations and bounded Luna conversation",{timeout:90000},async t=>{
 const db=new PGlite(),teacher=randomUUID(),other=randomUUID();
 try{
  for(const file of (await readdir('local-db/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile('local-db/migrations/'+file,'utf8'));
  for(const id of [teacher,other]){await createPilotClassroom(db,id,{teacherName:"QA",institutionName:"Escuela QA",section:"QA",age:5,year:2026,startsOn:"2026-03-02",endsOn:"2026-12-31"});await importStudentsForTeacher(db,id,[{firstName:"Camila",lastName:"Prueba"}]);}
  const students=(await db.query('select s.id,c.teacher_id,s.classroom_id from students s join classrooms c on c.id=s.classroom_id')).rows;
  const student=students.find(s=>s.teacher_id===teacher),foreign=students.find(s=>s.teacher_id===other);
  const curriculum=await applicableDiagnosticCompetencies({id:student.classroom_id,age_years:5}),ids=curriculum.slice(0,2).map(c=>c.id);
  const input={clientRequestId:randomUUID(),studentId:student.id,contextLabel:"Juego libre",observationText:"Propuso construir una torre y escuchó una idea distinta.",observedAt:"2026-10-02",competencyIds:ids};
  await t.test("capture confirms once, stores date, versioned edit and duplicate retry creates no second record",async()=>{
   const saved=await recordConfirmedSpontaneousObservation(db,teacher,input);assert.equal(saved.classification_status,"classified");
   assert.equal((await recordConfirmedSpontaneousObservation(db,teacher,input)).replayed,true);
   await assert.rejects(recordConfirmedSpontaneousObservation(db,teacher,{...input,competencyIds:[ids[0]]}));
   const list=await loadSpontaneousObservations(db,teacher);assert.equal(list.observations.length,1);assert.equal(list.observations[0].classification_source,"teacher");assert.equal(list.observations[0].classifier_status,"disabled");assert.equal(new Date(list.observations[0].observed_at).toISOString().slice(0,10),input.observedAt);
   const sources=await personalizationSources(db,teacher,{id:student.classroom_id});assert.deepEqual(sources.observations.find(o=>o.id===saved.id).competency_ids,ids);
   await correctSpontaneousClassification(db,teacher,saved.id,[ids[1]]);assert.equal(Number((await db.query('select count(*) n from diagnostic_spontaneous_observation_decision_events where observation_id=$1',[saved.id])).rows[0].n),2);
  });
  await t.test("unclassified is teacher decision; invalid competence/date/student are rejected without insert",async()=>{
   const saved=await recordConfirmedSpontaneousObservation(db,teacher,{...input,clientRequestId:randomUUID(),competencyIds:[]});const row=(await db.query('select classification_source,teacher_action from diagnostic_spontaneous_observations where id=$1',[saved.id])).rows[0];assert.deepEqual(row,{classification_source:"teacher",teacher_action:"saved_without_competency"});
   for(const extra of [{studentId:foreign.id},{competencyIds:["FAKE"]},{observedAt:"2026-02-31"},{competencyIds:[...ids,"FAKE"]}])await assert.rejects(recordConfirmedSpontaneousObservation(db,teacher,{...input,clientRequestId:randomUUID(),...extra}));
   assert.equal(Number((await db.query('select count(*) n from diagnostic_spontaneous_observations')).rows[0].n),2);
  });
  await t.test("pre-save analysis is cached; capture/edit adds zero AI calls and never sends media",async()=>{
   let calls=0;const classifier={classify:async request=>{calls++;assert.equal(request.observation.includes("Camila"),true);assert.equal(request.media,undefined);await db.query('select 1');return {candidate_ids:[ids[0]]};}};
   const data={...input,observationText:"Camila contó los vasos y dijo que faltaba uno."};const a=await previewSpontaneous({db,teacherId:teacher,input:data,classifier});const b=await previewSpontaneous({db,teacherId:teacher,input:data,classifier});assert.deepEqual(a.competency_ids,[ids[0]]);assert.equal(b.cached,true);assert.equal(calls,1);
   await recordConfirmedSpontaneousObservation(db,teacher,{...data,clientRequestId:randomUUID(),competencyIds:a.competency_ids});assert.equal(calls,1);
   await assert.rejects(previewSpontaneous({db,teacherId:other,input:data,classifier}));
   const empty=await previewSpontaneous({db,teacherId:teacher,input:{...data,observationText:"Se sentó en una silla."},classifier:{classify:async()=>({candidate_ids:[]})}});assert.deepEqual(empty.competency_ids,[]);
   await assert.rejects(previewSpontaneous({db,teacherId:teacher,input:{...data,contextLabel:" "},classifier}));assert.equal(calls,1,"No calls when the required moment is missing");
  });
  await t.test("Jev preview accounts for its two decisions; cached preview and persistence do not reconsult",async()=>{
   let analyses=0;const data={...input,observationText:"Explicó una idea durante la asamblea."};
   const v24={classify:async()=>{analyses++;return {status:"classified",primary:ids[0],additional:[],provider_calls:2};}};
   const a=await previewSpontaneous({db,teacherId:teacher,input:data,v24});assert.equal(a.calls,2);
   const b=await previewSpontaneous({db,teacherId:teacher,input:data,v24});assert.equal(b.calls,0);assert.equal(b.original_calls,2);assert.equal(analyses,1);
   await recordConfirmedSpontaneousObservation(db,teacher,{...data,clientRequestId:randomUUID(),competencyIds:a.competency_ids});assert.equal(analyses,1);
   await assert.rejects(previewSpontaneous({db,teacherId:teacher,input:{...data,observationText:"Prueba de indisponibilidad."},v24:{classify:async()=>({status:"classification_failed",provider_calls:2})}}),/elegir/);
  });
  const response={};let sent;
  const send=(_,status,value)=>{sent={status,value};};
  await t.test("automatic suggestion keeps acknowledged observation separate from teacher classification",async()=>{
   const automatic={...input,clientRequestId:randomUUID(),competencyIds:[],automaticSuggestion:true,observationText:'Contó las piezas y explicó que necesitaba dos más.'};
   const saved=await recordConfirmedSpontaneousObservation(db,teacher,automatic);
   assert.equal(saved.classification_status,'pending');let calls=0;
   const classifier={classify:async()=>{calls++;return {candidate_ids:[ids[0]]};}};
   await suggestSavedCapture({db,teacherId:teacher,id:saved.id,classifier});
   await suggestSavedCapture({db,teacherId:teacher,id:saved.id,classifier});
   const row=(await loadSpontaneousObservations(db,teacher)).observations.find(row=>row.id===saved.id);
   assert.equal(calls,1);assert.equal(row.recommendation_state,'suggested');assert.deepEqual(row.competency_v4_ids,[]);
   assert.deepEqual(row.suggested_competency_v4_ids,[ids[0]]);assert.equal(row.observation_text,automatic.observationText);
   await correctSpontaneousClassification(db,teacher,saved.id,[ids[0]]);
   assert.equal((await loadSpontaneousObservations(db,teacher)).observations.find(row=>row.id===saved.id).classification_source,'teacher');
   const failed=await recordConfirmedSpontaneousObservation(db,teacher,{...automatic,clientRequestId:randomUUID(),observationText:'Jugó con piezas distintas y explicó su elección.'});
   await suggestSavedCapture({db,teacherId:teacher,id:failed.id,classifier:{classify:async()=>{throw Error('network');}}});
   const kept=(await loadSpontaneousObservations(db,teacher)).observations.find(row=>row.id===failed.id);
   assert.equal(kept.recommendation_state,'unavailable');assert.ok(kept.observation_text);
   await assert.rejects(suggestSavedCapture({db,teacherId:other,id:saved.id,classifier}));
  });
  await t.test("invitation exposes only own answers; replacement/expiry invalidate token and teacher review stays separate",async()=>{
   const teacherUrl=new URL(`http://localhost/api/diagnostics/students/${student.id}/family-share`),base={response,db,teacherId:teacher,send,readJson:async()=>({})};
   await handleFamilyShare({...base,url:teacherUrl,request:{method:"POST"}});const token=sent.value.token;
   const url=new URL('http://localhost/api/family-share'),request={method:"GET",headers:{"x-ayni-family-token":token}};
   await handleFamilyShare({response,db,send,url,request});assert.deepEqual(Object.keys(sent.value).sort(),["details","name"]);assert.deepEqual(sent.value.details,{});
   await handleFamilyShare({response,db,send,url,request:{...request,method:"PUT"},readJson:async()=>({details:{interests:"No le interesa el agua.",structured_options_version:2}})});assert.equal(sent.status,200);
   assert.equal(Number((await db.query('select count(*) n from student_family_interviews')).rows[0].n),0);
   await handleFamilyShare({...base,url:teacherUrl,request:{method:"GET"}});assert.equal(sent.value.details.interests,"No le interesa el agua.");
   const currentDetails={questionnaire_version:3,identity_autonomy_context:"Pide compañía cuando se molesta.",literacy_context:"Mira cuentos.",mathematics_context:"Reparte cucharas.",exploration_context:"Prueba cómo ruedan objetos."};
   await handleFamilyShare({response,db,send,url,request:{...request,method:"PUT"},readJson:async()=>({details:currentDetails})});assert.equal(sent.status,200);
   await handleFamilyShare({...base,url:teacherUrl,request:{method:"GET"}});
   for(const [key,value]of Object.entries(currentDetails))assert.equal(sent.value.details[key],value);
   await assert.rejects(handleFamilyShare({...base,teacherId:other,url:teacherUrl,request:{method:"POST"}}));
   await handleFamilyShare({...base,url:teacherUrl,request:{method:"POST"}});await handleFamilyShare({response,db,send,url,request});assert.equal(sent.status,404);
  });
  await t.test("private photo operations authorize student before touching storage",async()=>{
   let touched=false;const storage={read:async()=>{touched=true;}};await assert.rejects(handleStudentPhoto({request:{method:"GET"},response,url:new URL(`http://localhost/api/students/${foreign.id}/photo`),db,teacherId:teacher,send,storage}));assert.equal(touched,false);
  });
  await t.test("profile photo is normalized, privately read, replaced and removed without changing interviews",async()=>{
   const sharp=(await import('sharp')).default,bytes=await sharp(randomBytes(1024*1024*3),{raw:{width:1024,height:1024,channels:3}}).jpeg({quality:90}).toBuffer();
   const assets=new Map();let sequence=0,assetResponse;
   const storage={save:async({teacherId,studentId,mimeType,bytes})=>{assert.equal(teacherId,teacher);assert.equal(studentId,student.id);const path=`private/${++sequence}`;assets.set(path,{mimeType,data:bytes});return path;},read:async path=>assets.get(path),delete:async path=>assets.delete(path)};
   const base={response,db,teacherId:teacher,send,storage,url:new URL(`http://localhost/api/students/${student.id}/photo`),readJson:async()=>({media:{base64:bytes.toString('base64'),mimeType:'image/png'}}),sendAsset:(_,status,data,mime,origin,cache)=>{assetResponse={status,mime,cache,bytes:data.length};}};
   await handleStudentPhoto({...base,request:{method:'PUT'}});assert.equal(sent.status,200);
   const size=await sharp([...assets.values()][0].data).metadata();assert.equal(size.width,320);assert.equal(size.height,320);
   await handleStudentPhoto({...base,request:{method:'GET'}});assert.equal(assetResponse.status,200);assert.equal(assetResponse.mime,'image/jpeg');assert.equal(assetResponse.cache,'private, no-store');assert.ok(assetResponse.bytes<=100_000);
   await handleStudentPhoto({...base,request:{method:'PUT'}});assert.equal(assets.size,1);
   await handleStudentPhoto({...base,request:{method:'DELETE'}});assert.equal(assets.size,0);assert.equal((await db.query('select profile_photo_path from students where id=$1',[student.id])).rows[0].profile_photo_path,null);
   assert.equal(Number((await db.query('select count(*) n from student_family_interviews')).rows[0].n),0);
  });
  await t.test("text correction and withdrawal preserve originals, CAS, permissions and current annual context",async()=>{
   const original="Camila explicó cómo construir una torre.";
   const saved=await recordConfirmedSpontaneousObservation(db,teacher,{studentId:student.id,contextLabel:"Juego libre",observationText:original,competencyIds:[ids[0]],clientRequestId:randomUUID()});
   const text="Camila explicó cómo construir una torre. No eligió jugar con agua.";
   const context={id:student.classroom_id,age:5};const before=(await personalizationSources(db,teacher,context)).fingerprint;
   await assert.rejects(reviseSpontaneousObservation(db,other,saved.id,{expectedRevision:0,observationText:text,competencyIds:[]}),/disponible/);
   await reviseSpontaneousObservation(db,teacher,saved.id,{expectedRevision:0,observationText:text,competencyIds:ids.slice(0,2)});
   assert.equal((await db.query('select observation_text from diagnostic_spontaneous_observations where id=$1',[saved.id])).rows[0].observation_text,original);
   const current=(await loadSpontaneousObservations(db,teacher)).observations.find(r=>r.id===saved.id);assert.equal(current.observation_text,text);assert.equal(Number(current.source_revision),1);
   const sources=await personalizationSources(db,teacher,context);assert.notEqual(sources.fingerprint,before);assert.equal(sources.observations.find(r=>r.id===saved.id).observation_text,text);
   await assert.rejects(reviseSpontaneousObservation(db,teacher,saved.id,{expectedRevision:0,observationText:"stale",competencyIds:[]}),/cambió/);
   await assert.rejects(db.query('update diagnostic_spontaneous_observation_revisions set corrected_text=$1 where observation_id=$2',["mutated",saved.id]),/inmutable/);
   await reviseSpontaneousObservation(db,teacher,saved.id,{expectedRevision:1},true);
   assert.equal((await loadSpontaneousObservations(db,teacher)).observations.some(r=>r.id===saved.id),false);
   assert.equal((await personalizationSources(db,teacher,context)).observations.some(r=>r.id===saved.id),false);
   assert.equal(Number((await db.query('select count(*) n from diagnostic_spontaneous_observation_revisions where observation_id=$1',[saved.id])).rows[0].n),2);
  });
  const snapshot={source_fingerprint:"fresh",student_count:1,facts:[{key:"f1",kind:"family_report",subject:"child_1",scope:"individual",support_text:"private name",ai_support_text:"No le interesa el agua.",uncertainty:"reported_not_observed"}],competency_information:[{competency_id:ids[0],recorded_performances:0}]};
  const context={id:student.classroom_id,age:5,year:2026,starts_on:"2026-03-02",ends_on:"2026-12-31",annual_planning_context:{resources:"Sin piscina"}},calendar={blocks:[],days:[]};
  const brief=buildAnnualPlanningBrief({context,snapshot,curriculum,calendar});
  await t.test("AnnualPlanningBrief retains negation/subject/source, unknowns and institutional context, uses Luna",()=>{assert.equal(brief.sources[0].support_text,"No le interesa el agua.");assert.equal(brief.sources[0].subject,"child_1");assert.equal(brief.sources[0].kind,"family_report");assert.deepEqual(brief.unknowns,[ids[0]]);assert.equal(brief.classroom.institutional_context.resources,"Sin piscina");assert.equal(resolveAIExecutionPlan({workflow:"annual_journey_conversation",task:"generation"}).model,"gpt-6-luna");});
  let calls=0,lastBundle,failNext=false,nextAnswer=null;
  const createProvider=plan=>({generate:async request=>{assert.equal(plan.model,"gpt-6-luna");calls++;lastBundle=request.ai_context_bundle;if(failNext){failNext=false;throw new Error('provider interrupted');}if(nextAnswer){const output=nextAnswer;nextAnswer=null;return {output};}const decisions=lastBundle.teacher_decisions;return {output:{status:decisions.length&&decisions[0]!=="Quiero comunidad"?"ready":"needs_clarification",message:"Ya revisé los registros disponibles.",question:"¿Hay alguna experiencia que quieras realizar?",chips:["No tengo una idea todavía"],context_items:decisions.map((text,index)=>({text,source_turn:index,support_text:text}))}};}});
  async function conversation(method,body={},owner=teacher){sent=null;await handlePlanningConversation({request:{method},response,url:new URL('http://localhost/api/annual-journey/conversation'),db,context,teacherId:owner,snapshot,curriculum,calendar,sources:{names:["Camila"]},send,readJson:async()=>body,createProvider});return sent.value;}
  await t.test("context draft saves recover through GET, respect owner/CAS and add zero AI calls",async()=>{
   let c=await conversation("POST");
   c=await conversation("POST",{id:c.id,expectedRevision:c.revision,text:"Tenemos patio"});
   const before=calls,expectedRevision=c.revision;
   const contextDraft={value:{contextItems:[{text:"Patio pequeño, sin huerto",source_turn:0},{text:""}],historicalProjects:[{title:"Familia",competency_ids:[ids[0]],period:1}]},importedTurns:[0]};
   await assert.rejects(conversation("PUT",{id:c.id,expectedRevision,contextDraft},other));
   c=await conversation("PUT",{id:c.id,expectedRevision,contextDraft});
   assert.equal(c.revision,expectedRevision+1);assert.deepEqual((await conversation("GET")).contextDraft,contextDraft);assert.equal(calls,before);
   await assert.rejects(conversation("PUT",{id:c.id,expectedRevision,contextDraft}),/cambió/);
   const invalid={...contextDraft,value:{...contextDraft.value,historicalProjects:[{title:"Familia",competency_ids:["AJENA"]}]}};
   await assert.rejects(conversation("PUT",{id:c.id,expectedRevision:c.revision,contextDraft:invalid}));
   await db.query(`update ai_pending_generations set payload=jsonb_set(payload,'{pending_turn}','true'::jsonb) where id=$1`,[c.id]);
   await assert.rejects(conversation("PUT",{id:c.id,expectedRevision:c.revision,contextDraft}),/respondiendo/);
   await db.query(`update ai_pending_generations set payload=jsonb_set(payload,'{pending_turn}','false'::jsonb) where id=$1`,[c.id]);
   c=await conversation("POST",{id:c.id,expectedRevision:c.revision,text:"Cierre con familias"});
   assert.deepEqual(c.contextDraft,contextDraft);assert.equal(calls,before+1);
   assert.equal(lastBundle.effective_context.contextItems[0].text,"Patio pequeño, sin huerto");
   assert.equal(lastBundle.effective_context.historicalProjects[0].title,"Familia");
   const previous=snapshot.source_fingerprint;snapshot.source_fingerprint="changed-draft";
   await assert.rejects(conversation("PUT",{id:c.id,expectedRevision:c.revision,contextDraft}));snapshot.source_fingerprint=previous;
   assert.deepEqual((await conversation("GET")).contextDraft,contextDraft);
   const oldId=c.id;snapshot.source_fingerprint="new-records";
   c=await conversation("POST");assert.notEqual(c.id,oldId);assert.deepEqual(c.contextDraft,contextDraft);
   assert.equal(c.teacherIdeas,"Tenemos patio\nCierre con familias");
   const retained=(await db.query('select expires_at from ai_pending_generations where id=$1',[c.id])).rows[0];
   assert.ok(new Date(retained.expires_at)>=new Date('2027-01-31'));
   snapshot.source_fingerprint=previous;
  });
  await t.test("no ideas / one / several ideas reach ready, refresh costs zero, CAS rejects repeated turn",async()=>{
   for(const text of ["No tengo una idea todavía","Proyecto con agua","Agua y una actividad con las familias"]){await db.query(`update ai_pending_generations set expires_at=now() where workflow='annual_journey_conversation'`);const before=calls,start=await conversation("POST");assert.equal(start.status,"needs_clarification");assert.equal((await conversation("GET")).id,start.id);assert.equal((await conversation("POST")).id,start.id);assert.equal(calls,before+1);const end=await conversation("POST",{id:start.id,expectedRevision:start.revision,text});assert.equal(end.status,"ready");assert.equal(end.teacherIdeas,text);assert.equal(end.chips.length,0);assert.equal(calls,before+2);await assert.rejects(conversation("POST",{id:start.id,expectedRevision:start.revision,text}));}
  });
  await t.test("la conversación conserva Indaga y Crea sin alterar nombres ni verbos",async()=>{
   await db.query(`update ai_pending_generations set expires_at=now() where workflow='annual_journey_conversation'`);
   const c=await conversation("POST");
   await conversation("POST",{id:c.id,expectedRevision:c.revision,text:"Quiero priorizar Indaga y Crea. Camila y Aurelio participarán."});
   assert.match(lastBundle.teacher_decisions[0],/Indaga y Crea/);
   assert.ok(lastBundle.teacher_decisions[0].includes("Camila"));assert.ok(lastBundle.teacher_decisions[0].includes("Aurelio"));
  });
  await t.test("retomar reconstruye las preferencias desde el original sin volver a filtrar el texto",async()=>{
   await db.query(`update ai_pending_generations set expires_at=now() where workflow='annual_journey_conversation'`);
   const c=await conversation("POST");failNext=true;
   const text="Prefiero arte. Más adelante podrán cuidar plantas. Podrán contar semillas. Podemos observar. Usaremos cajas. Contamos con tizas. Mantengamos ocho días. Mientras tanto conversaremos. Preparar proyecto. Camila y Aurelio participarán.";
   await assert.rejects(conversation("POST",{id:c.id,expectedRevision:c.revision,text}));
   await db.query(`update ai_pending_generations set payload=jsonb_set(payload,'{safe_texts}',$2::jsonb) where id=$1`,[c.id,JSON.stringify(["[persona] arte."])]);
   const resumed=await conversation("POST",{id:c.id});
   assert.match(lastBundle.teacher_decisions[0],/^Prefiero arte\. Más adelante/);
   assert.match(lastBundle.teacher_decisions[0],/Podrán contar semillas\. Podemos observar\./);
   assert.match(lastBundle.teacher_decisions[0],/Usaremos cajas\./);
   assert.match(lastBundle.teacher_decisions[0],/Contamos con tizas\. Mantengamos ocho días\. Mientras tanto conversaremos\. Preparar proyecto\./);
   assert.deepEqual(lastBundle.teacher_decision_sources,[{source_turn:0,text:lastBundle.teacher_decisions[0]}]);
   assert.match(lastBundle.teacher_decisions[0],/Camila y Aurelio/);
   assert.equal(resumed.messages.filter(m=>m.role==="teacher").length,1);
  });
  await t.test("three useful answers, saved turn recovery without duplication, literal preferences never become observations",async()=>{
   await db.query(`update ai_pending_generations set expires_at=now() where workflow='annual_journey_conversation'`);let c=await conversation("POST");failNext=true;await assert.rejects(conversation("POST",{id:c.id,expectedRevision:c.revision,text:"Quiero comunidad"}));assert.equal((await conversation("GET")).revision,c.revision);
   const persisted=await conversation("GET");assert.equal(persisted.status,"interrupted");assert.equal(persisted.messages.at(-1).text,"Quiero comunidad");
   c=await conversation("POST",{id:c.id,expectedRevision:c.revision,text:"Quiero comunidad"});assert.equal(c.status,"needs_clarification");assert.equal(c.messages.filter(m=>m.role==="teacher").length,1);
   c=await conversation("POST",{id:c.id,expectedRevision:c.revision,text:"Invitar a las familias a construir juguetes"});assert.equal(c.status,"needs_clarification");
   c=await conversation("POST",{id:c.id,expectedRevision:c.revision,text:"Solo con materiales reciclados"});assert.equal(c.status,"ready");const before=calls;
   c=await conversation("POST",{id:c.id,expectedRevision:c.revision,text:"Sin pedir compras"});assert.equal(calls,before+1);assert.equal(c.status,"ready");assert.equal(snapshot.facts.length,1);assert.equal(lastBundle.AnnualPlanningBrief.sources[0].kind,"family_report");
   assert.equal(c.messages.at(-1).text,"Ya revisé los registros disponibles.","no sustituye la respuesta al cuarto aporte por el cierre genérico");
   assert.match(c.teacherIdeas,/Sin pedir compras/);assert.ok(c.contextItems.some(item=>item.source_turn===3&&item.text.includes('compras')));
   const oldId=c.id;snapshot.source_fingerprint="changed";await assert.rejects(conversation("GET"));c=await conversation("POST");assert.notEqual(c.id,oldId);
  });
  await t.test("app-only and mixed replies preserve the transcript without turning commands into planning context",async()=>{
   await db.query(`update ai_pending_generations set expires_at=now() where workflow='annual_journey_conversation'`);
   let c=await conversation("POST");
   const operation='Descarga el informe y continúa.';
   nextAnswer={status:'ready',message:'Puedes continuar.',question:'',chips:[],context_items:[],non_context_turns:[0]};
   c=await conversation('POST',{id:c.id,expectedRevision:c.revision,text:operation});
   assert.deepEqual(c.contextItems,[]);assert.equal(c.teacherIdeas,operation);
   assert.equal(c.messages.filter(m=>m.role==='teacher').length,1);
   const decision='Quiero un proyecto llamado Mi año donde los niños elijan qué contar de sí.';
   nextAnswer={status:'ready',message:'Conservo esa propuesta.',question:'',chips:[],context_items:[{text:decision,source_turn:1,support_text:decision}],non_context_turns:[0]};
   c=await conversation('POST',{id:c.id,expectedRevision:c.revision,text:decision+' Después guarda el documento.'});
   assert.deepEqual(c.contextItems.map(item=>item.text),[decision]);
   const before=calls;assert.deepEqual((await conversation('GET')).contextItems,c.contextItems);assert.equal(calls,before);
   const revision=c.revision;
   nextAnswer={status:'ready',message:'No debe guardarse.',question:'',chips:[],context_items:[{text:decision,source_turn:1,support_text:decision}],non_context_turns:[1]};
   await assert.rejects(conversation('POST',{id:c.id,expectedRevision:c.revision,text:'Hay papel disponible.'}),/decisiones pedagógicas/);
   const kept=await conversation('GET');assert.equal(kept.revision,revision);assert.deepEqual(kept.contextItems,c.contextItems);
   assert.equal(kept.messages.at(-1).text,'Hay papel disponible.','a rejected classification does not lose the teacher reply');
  });
 }finally{await db.close();}
});
