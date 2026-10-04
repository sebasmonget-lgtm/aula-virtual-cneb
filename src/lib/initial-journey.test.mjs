import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readdir,readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createPilotClassroom,importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { recordConfirmedSpontaneousObservation,reviseSpontaneousObservation,correctSpontaneousClassification,loadSpontaneousObservations,applicableDiagnosticCompetencies } from "./diagnostic-sources-v4.mjs";
import { previewSpontaneous,handleFamilyShare,handleStudentPhoto } from "../../scripts/initial-journey-routes.mjs";
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
   let calls=0;const classifier={classify:async request=>{calls++;assert.equal(request.observation.includes("Camila"),false);assert.equal(request.media,undefined);await db.query('select 1');return {candidate_ids:[ids[0]]};}};
   const data={...input,observationText:"Camila contó los vasos y dijo que faltaba uno."};const a=await previewSpontaneous({db,teacherId:teacher,input:data,classifier});const b=await previewSpontaneous({db,teacherId:teacher,input:data,classifier});assert.deepEqual(a.competency_ids,[ids[0]]);assert.equal(b.cached,true);assert.equal(calls,1);
   await recordConfirmedSpontaneousObservation(db,teacher,{...data,clientRequestId:randomUUID(),competencyIds:a.competency_ids});assert.equal(calls,1);
   await assert.rejects(previewSpontaneous({db,teacherId:other,input:data,classifier}));
   const empty=await previewSpontaneous({db,teacherId:teacher,input:{...data,observationText:"Se sentó en una silla."},classifier:{classify:async()=>({candidate_ids:[]})}});assert.deepEqual(empty.competency_ids,[]);
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
  await t.test("invitation exposes only own answers; replacement/expiry invalidate token and teacher review stays separate",async()=>{
   const teacherUrl=new URL(`http://localhost/api/diagnostics/students/${student.id}/family-share`),base={response,db,teacherId:teacher,send,readJson:async()=>({})};
   await handleFamilyShare({...base,url:teacherUrl,request:{method:"POST"}});const token=sent.value.token;
   const url=new URL('http://localhost/api/family-share'),request={method:"GET",headers:{"x-ayni-family-token":token}};
   await handleFamilyShare({response,db,send,url,request});assert.deepEqual(Object.keys(sent.value).sort(),["details","name"]);assert.deepEqual(sent.value.details,{});
   await handleFamilyShare({response,db,send,url,request:{...request,method:"PUT"},readJson:async()=>({details:{interests:"No le interesa el agua.",structured_options_version:2}})});assert.equal(sent.status,200);
   assert.equal(Number((await db.query('select count(*) n from student_family_interviews')).rows[0].n),0);
   await handleFamilyShare({...base,url:teacherUrl,request:{method:"GET"}});assert.equal(sent.value.details.interests,"No le interesa el agua.");
   await assert.rejects(handleFamilyShare({...base,teacherId:other,url:teacherUrl,request:{method:"POST"}}));
   await handleFamilyShare({...base,url:teacherUrl,request:{method:"POST"}});await handleFamilyShare({response,db,send,url,request});assert.equal(sent.status,404);
  });
  await t.test("private photo operations authorize student before touching storage",async()=>{
   let touched=false;const storage={read:async()=>{touched=true;}};await assert.rejects(handleStudentPhoto({request:{method:"GET"},response,url:new URL(`http://localhost/api/students/${foreign.id}/photo`),db,teacherId:teacher,send,storage}));assert.equal(touched,false);
  });
  await t.test("profile photo is normalized, privately read, replaced and removed without changing interviews",async()=>{
   const sharp=(await import('sharp')).default,bytes=await sharp({create:{width:24,height:24,channels:3,background:'#087d96'}}).png().toBuffer();
   const assets=new Map();let sequence=0,assetResponse;
   const storage={save:async({teacherId,studentId,mimeType,bytes})=>{assert.equal(teacherId,teacher);assert.equal(studentId,student.id);const path=`private/${++sequence}`;assets.set(path,{mimeType,data:bytes});return path;},read:async path=>assets.get(path),delete:async path=>assets.delete(path)};
   const base={response,db,teacherId:teacher,send,storage,url:new URL(`http://localhost/api/students/${student.id}/photo`),readJson:async()=>({media:{base64:bytes.toString('base64'),mimeType:'image/png'}}),sendAsset:(_,status,data,mime,origin,cache)=>{assetResponse={status,mime,cache,bytes:data.length};}};
   await handleStudentPhoto({...base,request:{method:'PUT'}});assert.equal(sent.status,200);
   await handleStudentPhoto({...base,request:{method:'GET'}});assert.equal(assetResponse.status,200);assert.equal(assetResponse.mime,'image/jpeg');assert.equal(assetResponse.cache,'private, no-store');
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
  let calls=0,lastBundle,failNext=false;
  const createProvider=plan=>({generate:async request=>{assert.equal(plan.model,"gpt-6-luna");calls++;lastBundle=request.ai_context_bundle;if(failNext){failNext=false;throw new Error('provider interrupted');}const decisions=lastBundle.teacher_decisions;return {output:{status:decisions.length&&decisions[0]!=="Quiero comunidad"?"ready":"needs_clarification",message:"Ya revisé los registros disponibles.",question:"¿Hay alguna experiencia que quieras realizar?",chips:["No tengo una idea todavía"]}};}});
  async function conversation(method,body={}){sent=null;await handlePlanningConversation({request:{method},response,url:new URL('http://localhost/api/annual-journey/conversation'),db,context,teacherId:teacher,snapshot,curriculum,calendar,sources:{names:["Camila"]},send,readJson:async()=>body,createProvider});return sent.value;}
  await t.test("no ideas / one / several ideas reach ready, refresh costs zero, CAS rejects repeated turn",async()=>{
   for(const text of ["No tengo una idea todavía","Proyecto con agua","Agua y una actividad con las familias"]){await db.query(`update ai_pending_generations set expires_at=now() where workflow='annual_journey_conversation'`);const before=calls,start=await conversation("POST");assert.equal(start.status,"needs_clarification");assert.equal((await conversation("GET")).id,start.id);assert.equal((await conversation("POST")).id,start.id);assert.equal(calls,before+1);const end=await conversation("POST",{id:start.id,expectedRevision:start.revision,text});assert.equal(end.status,"ready");assert.equal(end.teacherIdeas,text);assert.equal(end.chips.length,0);assert.equal(calls,before+2);await assert.rejects(conversation("POST",{id:start.id,expectedRevision:start.revision,text}));}
  });
  await t.test("la conversación conserva Indaga y Crea y oculta nombres privados",async()=>{
   await db.query(`update ai_pending_generations set expires_at=now() where workflow='annual_journey_conversation'`);
   const c=await conversation("POST");
   await conversation("POST",{id:c.id,expectedRevision:c.revision,text:"Quiero priorizar Indaga y Crea. Camila y Aurelio participarán."});
   assert.match(lastBundle.teacher_decisions[0],/Indaga y Crea/);
   assert.ok(!lastBundle.teacher_decisions[0].includes("Camila"));assert.ok(!lastBundle.teacher_decisions[0].includes("Aurelio"));
  });
  await t.test("one material clarification, provider failure recovery, literal preferences never become observations",async()=>{
   await db.query(`update ai_pending_generations set expires_at=now() where workflow='annual_journey_conversation'`);let c=await conversation("POST");failNext=true;await assert.rejects(conversation("POST",{id:c.id,expectedRevision:c.revision,text:"Quiero comunidad"}));assert.equal((await conversation("GET")).revision,c.revision);
   c=await conversation("POST",{id:c.id,expectedRevision:c.revision,text:"Quiero comunidad"});assert.equal(c.status,"needs_clarification");c=await conversation("POST",{id:c.id,expectedRevision:c.revision,text:"Invitar a las familias a construir juguetes"});assert.equal(c.status,"ready");const before=calls;c=await conversation("POST",{id:c.id,expectedRevision:c.revision,text:"Solo con materiales reciclados"});assert.equal(calls,before);assert.equal(c.status,"ready");assert.equal(snapshot.facts.length,1);assert.equal(lastBundle.AnnualPlanningBrief.sources[0].kind,"family_report");
   const oldId=c.id;snapshot.source_fingerprint="changed";await assert.rejects(conversation("GET"));c=await conversation("POST");assert.notEqual(c.id,oldId);
  });
 }finally{await db.close();}
});
