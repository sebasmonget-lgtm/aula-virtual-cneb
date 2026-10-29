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
const sources=async db=>(await db.query(`select 'project' as kind,id,to_jsonb(p) as data from learning_experiences p
 union all select 'activity',id,to_jsonb(a) from activities a union all select 'criterion',id,to_jsonb(c) from activity_criteria c
 union all select 'observation',id,to_jsonb(o) from ordinary_observations o union all select 'grade',id,to_jsonb(g) from competency_assessments g
 union all select 'conclusion',id,to_jsonb(d) from competency_descriptive_conclusions d union all select 'report',id,to_jsonb(r) from family_reports r order by kind,id`)).rows;

test('API Documentos: Word de cada edición, índice con varias actividades, reinicios y fuentes originales conservadas',{timeout:150000},async()=>{
 const storeName='project-documents-'+randomUUID(),f=await makeMultiAgePeriodFixture({storeName,activityOptions:{performanceOrdersByAge:{3:[1,5],4:[1,2,5],5:[1,2,5]}}}),before=await sources(f.db);await f.db.close();
 let app=await start(storeName),c=client(app);const directory=new URL('../.local/multi-age-main-20261023/proyecto-word/',import.meta.url);
 const download=async path=>{const response=await fetch(app.origin+p+path);assert.equal(response.status,200,await response.clone().text());assert.equal(response.headers.get('cache-control'),'private, no-store');assert.match(response.headers.get('content-type'),/wordprocessingml/);return Buffer.from(await response.arrayBuffer());};
 try{
  let state=await c.get(p+'/state');assert.equal(state.documents.filter(d=>d.kind==='project').length,1);assert.equal(state.documents.filter(d=>d.kind==='activity').length,1);
  const oldWords=[];
  for(const doc of state.documents)oldWords.push({path:`/documents/${doc.kind}/${doc.id}.docx`,xml:await xml(await download(`/documents/${doc.kind}/${doc.id}.docx`))});
  for(const report of state.workspace.reports)oldWords.push({path:`/reports/${report.id}.docx`,xml:await xml(await download(`/reports/${report.id}.docx`))});
  assert.equal(oldWords.length,9);
  const context=await c.get(p+`/projects/edit?classroomId=${f.classroom.classroomId}&projectId=${f.activity.projectId}`),blueprint=structuredClone(f.activity.blueprint);
  blueprint.title='Compartimos y elegimos nuestros juegos';blueprint.purpose='Comunicar preferencias y escuchar a los compañeros durante una experiencia compartida de juego.';
  const variants=blueprint.criteriaFamilies[0].variants;
  const criteria={3:['Comunica su elección de juego con palabras, gestos o movimientos al conversar con la profesora.','Al elegir un juego, dice una palabra o acompaña su elección con un gesto.'],4:['Expresa su preferencia de juego y escucha a un compañero durante el intercambio.','Nombra el juego que prefiere y atiende a lo que cuenta un compañero.'],5:['Expresa su preferencia de juego, explica una razón y participa respetando los turnos.','Dice qué juego elige y por qué, y espera su turno para intervenir.']};
  for(const v of variants){v.criterion_text=criteria[v.curricular_age][0];v.expected_evidence=criteria[v.curricular_age][1];}
  const revision=await c.post(p+'/projects/edit',{...confirm(),classroomId:f.classroom.classroomId,projectId:f.activity.projectId,expectedSourceFingerprint:context.sourceFingerprint,expectedProjectFingerprint:context.fingerprint,blueprint,preservedActivitiesAcknowledged:true,reason:'Precisar los criterios por edad para futuras actividades.'});
  const projectWord=await download(`/documents/project/${revision.projectVersionId}.docx`),projectXml=await xml(projectWord);
  for(const age of [3,4,5])assert.ok(projectXml.includes(criteria[age][0]));
  assert.equal((await fetch(app.origin+p+`/documents/project/${f.children[0].studentId}.docx`)).status,403);
  const plan=state.planning.plans.find(p=>p.status==='active'),slot=plan.document_context.calendar.projects[0],newActivities=[];
  for(const position of [2,3])newActivities.push(await c.post(p+'/activity',{...confirm(),classroomId:f.classroom.classroomId,projectId:f.activity.projectId,annualPlanId:plan.id,annualSlotId:slot.slot_id,expectedRevision:1,expectedProjectFingerprint:revision.projectFingerprint,activityPosition:position,
   blueprint:{...blueprint,title:position===2?'Conversamos sobre nuestros juegos':'Elegimos qué jugar juntos',occursOn:slot.instructional_dates[position-1]}}));
  await stop(app);app=await start(storeName);c=client(app);state=await c.get(p+'/state');
  assert.equal(state.documents.filter(d=>d.kind==='project').length,2);assert.equal(state.documents.filter(d=>d.kind==='activity').length,3);
  assert.deepEqual(state.documents.filter(d=>d.projectDocumentId===revision.projectVersionId).map(d=>d.position).sort(),[2,3]);assert.equal(state.documents.find(d=>d.id===f.activity.activityId).projectDocumentId,f.activity.projectId);
  for(const a of newActivities){const doc=await c.get(p+`/documents/activity/${a.activityId}`);assert.equal(doc.content.projectTitle,blueprint.title);assert.deepEqual(doc.content.criteriaFamilies[0].variants.map(v=>v.curricular_age),[3,4,5]);}
  const libraryBefore=structuredClone(state.documents);for(const word of oldWords)assert.equal(await xml(await download(word.path)),word.xml);
  assert.equal(await xml(await download(`/documents/project/${revision.projectVersionId}.docx`)),projectXml);assert.deepEqual((await c.get(p+'/state')).documents,libraryBefore);assert.equal((await c.get(p+'/generation?classroomId='+f.classroom.classroomId)).jobs.length,0);
  await mkdir(directory,{recursive:true});await writeFile(new URL('proyecto-3-4-5.docx',directory),projectWord);await writeFile(new URL('actividad-3-4-5.docx',directory),await download(`/documents/activity/${newActivities[0].activityId}.docx`));await writeFile(new URL('state.json',directory),JSON.stringify(state,null,2));
  await stop(app);const db=await openMultiAgePersistentDb({storeName});try{const after=new Map((await sources(db)).map(r=>[r.kind+':'+r.id,r]));for(const old of before)assert.deepEqual(after.get(old.kind+':'+old.id),old);}finally{await db.close();}
  await writeFile(new URL('receipt.json',directory),JSON.stringify({status:'passed',storeName,classroomId:f.classroom.classroomId,projectVersionId:revision.projectVersionId,projectVersions:2,activities:3,ages:[3,4,5],originalWordsUnchanged:9,originalSourcesUnchanged:true,aiCalls:0,remoteWrites:0},null,2));
 }finally{await stop(app);}
});
