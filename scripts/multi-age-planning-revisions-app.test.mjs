import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {makeMultiAgePeriodFixture} from './fixtures/multi-age-period-fixture.mjs';
import {startMultiAgeHttpFixture as start,stopMultiAgeHttpFixture as stop,multiAgeHttpFixtureClient as client} from './fixtures/multi-age-http-fixture.mjs';
import {openMultiAgePersistentDb} from './multi-age-local-db.mjs';
const confirm=()=>({teacherConfirmed:true,clientRequestId:randomUUID()}),p='/api/multi-age';
const xml=async bytes=>(await JSZip.loadAsync(bytes)).file('word/document.xml').async('string');
const sources=async db=>(await db.query(`select 'activity' as kind,id,to_jsonb(a) as data from activities a union all select 'criterion',id,to_jsonb(c) from activity_criteria c
 union all select 'observation',id,to_jsonb(o) from ordinary_observations o union all select 'grade',id,to_jsonb(g) from competency_assessments g
 union all select 'conclusion',id,to_jsonb(d) from competency_descriptive_conclusions d union all select 'report',id,to_jsonb(r) from family_reports r order by kind,id`)).rows;
const families=value=>value.map(f=>({competency_id:f.competency_id,variants:f.variants.map(v=>({curricular_age:v.curricular_age,criterion_text:v.criterion_text,expected_evidence:v.expected_evidence,observation_moments:v.observation_moments,official_performance_refs:v.official_performance_refs}))}));

test('API principal persistente: editar proyecto, reorganizar dos veces, conservar dos proyectos/actividades/documentos y continuar tras reiniciar',{timeout:150000},async()=>{
 const storeName='planning-'+randomUUID(),f=await makeMultiAgePeriodFixture({storeName}),oldSources=await sources(f.db);await f.db.close();
 let app=await start(storeName),c=client(app);
 const download=async path=>{const response=await fetch(app.origin+p+path);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');return Buffer.from(await response.arrayBuffer());};
 const projectContext=()=>c.get(p+`/projects/edit?classroomId=${f.classroom.classroomId}&projectId=${f.activity.projectId}`);
 try{
  const originalWords=await Promise.all([`/documents/activity/${f.activity.activityId}.docx`,`/documents/annual_plan/${f.plan.planId}.docx`,...f.children.map(child=>`/reports/${child.report.reportId}.docx`)].map(async path=>({path,xml:await xml(await download(path))})));
  let state=await c.get(p+'/state'),active=state.planning.plans.find(p=>p.status==='active'),project=state.workspace.projects[0],context=await projectContext();assert.equal(context.history.length,1);
  const blueprint=structuredClone(f.activity.blueprint);blueprint.title='Proyecto revisado ficticio: elegimos y escuchamos';blueprint.purpose='Compartir elecciones de juego con los referentes de cada grupo.';
  for(const variant of blueprint.criteriaFamilies[0].variants)variant.expected_evidence=`Actuación prevista ficticia de ${variant.curricular_age} años que la profesora registrará si ocurre.`;
  const edit={...confirm(),classroomId:f.classroom.classroomId,projectId:project.id,expectedSourceFingerprint:context.sourceFingerprint,expectedProjectFingerprint:context.fingerprint,reason:'Ajustar las próximas actividades sin reescribir las preparadas.',preservedActivitiesAcknowledged:true,blueprint};
  const saved=await c.post(p+'/projects/edit',edit);assert.equal(saved.version,2);assert.equal((await c.post(p+'/projects/edit',edit)).replayed,true);
  assert.equal((await c.raw(p+'/projects/edit',{...edit,clientRequestId:randomUUID()})).status,409);
  const badOrigin=await fetch(app.origin+p+'/projects/edit',{method:'POST',headers:{origin:'https://ajeno.invalid','content-type':'application/json'},body:JSON.stringify(edit)});assert.equal(badOrigin.status,403);
  const reorder=async(a,b)=>{
   state=await c.get(p+'/state');active=state.planning.plans.find(p=>p.status==='active');
   const draft=await c.post(p+'/annual/reorder',{clientRequestId:randomUUID(),classroomId:f.classroom.classroomId,sourceFingerprint:state.planning.sourceFingerprint,expectedBasePlanId:active.id,expectedBaseRevision:active.revision,reorder:{fromSlotId:active.proposal.proposals[a].slot_id,toSlotId:active.proposal.proposals[b].slot_id}});
   assert.equal((await c.raw(p+'/annual/confirm',{...confirm(),classroomId:f.classroom.classroomId,planId:draft.planId,expectedRevision:draft.revision,reason:''})).status,422);
   return c.post(p+'/annual/confirm',{...confirm(),classroomId:f.classroom.classroomId,planId:draft.planId,expectedRevision:draft.revision,reason:'Intercambiar tramos libres conservando todos los proyectos preparados.'});
  };
  const annual2=await reorder(13,14);
  state=await c.get(p+'/state');active=state.planning.plans.find(p=>p.status==='active');project=state.workspace.projects.find(p=>p.id===f.activity.projectId);assert.equal(project.annual_plan_id,annual2.planId);assert.equal(project.version,2);
  const slot=active.document_context.calendar.projects[0];
  const second=await c.post(p+'/activity',{...confirm(),classroomId:f.classroom.classroomId,expectedRevision:1,annualPlanId:active.id,annualSlotId:slot.slot_id,projectId:project.id,expectedProjectFingerprint:project.fingerprint,activityPosition:2,blueprint:{...blueprint,title:'Segunda actividad con criterios revisados',occursOn:slot.instructional_dates[1],criteriaFamilies:families(project.criteriaFamilies)}});
  const secondWord=await xml(await download(`/documents/activity/${second.activityId}.docx`));assert.match(secondWord,/criterios revisados/);
  // Prepare a second independent project; later annual revisions must carry BOTH roots.
  const row=active.proposal.proposals[1],slot2=active.document_context.calendar.projects[1],ids=[...new Set(row.opportunities.map(o=>o.competency_id))];
  const secondProject=await c.post(p+'/activity',{...confirm(),classroomId:f.classroom.classroomId,expectedRevision:1,annualPlanId:active.id,annualSlotId:slot2.slot_id,blueprint:{title:'Segundo proyecto ficticio que debe conservarse',purpose:row.purpose,occursOn:slot2.instructional_dates[0],participantAges:[3,4,5],commonSequence:{opening:row.common_invitation,development:row.one_teacher_organization,closure:'Compartir voluntariamente lo explorado.'},criteriaFamilies:ids.map(id=>({competency_id:id,variants:row.opportunities.filter(o=>o.competency_id===id).map(o=>({curricular_age:o.age,criterion_text:o.child_action,expected_evidence:o.observation,observation_moments:['development'],official_performance_refs:o.official_performance_refs}))}))}});
  const secondProjectWord=await xml(await download(`/documents/activity/${secondProject.activityId}.docx`));
  const annual3=await reorder(12,14);
  await stop(app);app=await start(storeName);c=client(app);state=await c.get(p+'/state');active=state.planning.plans.find(p=>p.status==='active');assert.equal(active.id,annual3.planId);assert.equal(active.version,3);assert.equal(state.workspace.projects.length,2);assert.ok(state.workspace.projects.every(p=>p.annual_plan_id===active.id));
  assert.equal(state.workspace.pairs.length,3);assert.ok(state.workspace.pairs.every(p=>p.current));
  context=await projectContext();assert.equal(context.history.length,2);assert.equal(context.project.title,blueprint.title);
  const thirdEdit=await c.post(p+'/projects/edit',{...confirm(),classroomId:f.classroom.classroomId,projectId:project.id,expectedSourceFingerprint:context.sourceFingerprint,expectedProjectFingerprint:context.fingerprint,reason:'Precisar la organización para actividades futuras.',preservedActivitiesAcknowledged:true,blueprint:{...blueprint,title:'Tercera versión futura del proyecto ficticio'}});assert.equal(thirdEdit.version,3);
  state=await c.get(p+'/state');project=state.workspace.projects.find(p=>p.id===project.id);
  const third=await c.post(p+'/activity',{...confirm(),classroomId:f.classroom.classroomId,expectedRevision:1,annualPlanId:active.id,annualSlotId:slot.slot_id,projectId:project.id,expectedProjectFingerprint:project.fingerprint,activityPosition:3,blueprint:{...blueprint,title:'Tercera actividad conserva su edición',occursOn:slot.instructional_dates[2],criteriaFamilies:families(project.criteriaFamilies)}});
  await stop(app);app=await start(storeName);c=client(app);state=await c.get(p+'/state');
  assert.equal(state.workspace.activities.length,4);assert.equal((await projectContext()).history.length,3);assert.equal(state.capabilities.ai,'off');assert.equal((await c.get(p+'/generation?classroomId='+f.classroom.classroomId)).jobs.length,0);
  for(const word of originalWords)assert.equal(await xml(await download(word.path)),word.xml);
  assert.equal(await xml(await download(`/documents/activity/${second.activityId}.docx`)),secondWord);assert.equal(await xml(await download(`/documents/activity/${secondProject.activityId}.docx`)),secondProjectWord);
  const thirdDoc=await c.get(p+`/documents/activity/${third.activityId}`);assert.equal(thirdDoc.content.projectTitle,'Tercera versión futura del proyecto ficticio');assert.equal(thirdDoc.sourceSnapshot.annualPlanId,annual3.planId);
  await stop(app);const db=await openMultiAgePersistentDb({storeName});try{const after=await sources(db),index=new Map(after.map(r=>[r.kind+':'+r.id,r]));for(const original of oldSources)assert.deepEqual(index.get(original.kind+':'+original.id),original);}finally{await db.close();}
  const directory=new URL('../.local/multi-age-main-20261023/proyectos/',import.meta.url);await mkdir(directory,{recursive:true});await writeFile(new URL('state.json',directory),JSON.stringify(state,null,2));
  await writeFile(new URL('receipt.json',directory),JSON.stringify({status:'passed',storeName,classroomId:f.classroom.classroomId,annualVersion:3,projectVersion:3,projects:2,activities:4,ages:[3,4,5],canonicalSourcesUnchanged:true,originalWordCount:7,manualFixture:true,aiCalls:0},null,2));
 }finally{await stop(app);}
});
