import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {makeMultiAgePeriodFixture} from './fixtures/multi-age-period-fixture.mjs';
import {startMultiAgeHttpFixture as start,stopMultiAgeHttpFixture as stop,multiAgeHttpFixtureClient as client} from './fixtures/multi-age-http-fixture.mjs';
const p='/api/multi-age',xml=async bytes=>(await JSZip.loadAsync(bytes)).file('word/document.xml').async('string');
test('API talleres: confirma edades 3/4/5, reinicia, observa sin mezclar y conserva documentos anteriores',{timeout:120000},async()=>{
 const storeName='workshops-'+randomUUID(),f=await makeMultiAgePeriodFixture({storeName});await f.db.close();let app=await start(storeName),c=client(app);
 const download=async path=>{const response=await fetch(app.origin+p+path);assert.equal(response.status,200,await response.clone().text());assert.equal(response.headers.get('cache-control'),'private, no-store');return Buffer.from(await response.arrayBuffer());};
 try{
  const before=await c.get(p+'/state'),old=[];for(const d of before.documents)old.push({path:`/documents/${d.kind}/${d.id}.docx`,xml:await xml(await download(`/documents/${d.kind}/${d.id}.docx`))});
  const library=await c.get(p+'/workshops?classroomId='+f.classroom.classroomId),w=library.workshops.find(w=>w.competencyId==='COM_ORAL');assert.ok(w);
  const input={teacherConfirmed:true,clientRequestId:randomUUID(),classroomId:f.classroom.classroomId,expectedRevision:before.workspace.classroom.curriculum_revision,sourceFingerprint:library.sourceFingerprint,workshopId:w.id,
   blueprint:{title:w.title,purpose:'Compartir ideas sobre objetos cercanos con criterios propios para 3, 4 y 5 años.',occursOn:f.activity.blueprint.occursOn,participantAges:[3,4,5],commonSequence:w.commonSequence,criteriaFamilies:[{competency_id:w.competencyId,variants:w.variants.map(v=>({curricular_age:v.curricular_age,criterion_text:v.criterion_text,expected_evidence:v.expected_evidence,observation_moments:v.observation_moments,official_performance_refs:v.performances.slice(0,1).map(p=>p.id)}))}]}};
  const result=await c.post(p+'/workshops/confirm',input),word=await download(`/documents/workshop/${result.activityId}.docx`),body=await xml(word);assert.doesNotMatch(body,/undefined|Proyecto /);for(const age of [3,4,5])assert.match(body,new RegExp(`Qué observar en ${age} años`));
  await stop(app);app=await start(storeName);c=client(app);assert.equal((await c.post(p+'/workshops/confirm',input)).replayed,true);
  const after=await c.get(p+'/state');assert.deepEqual(after.workspace.projects,before.workspace.projects);assert.equal(after.documents.filter(d=>d.kind==='workshop').length,1);
  for(const child of f.children){const criterion=after.workspace.criteria.find(k=>k.activity_id===result.activityId&&k.curricular_age===child.age);
   await c.post(p+'/observe',{clientRequestId:randomUUID(),studentId:child.studentId,criterionId:criterion.id,activityId:result.activityId,periodId:f.period.id,observedOn:input.blueprint.occursOn,rawText:`Registro ficticio del taller para ${child.age} años: comunicó su elección al explorar.`});}
  for(const d of old)assert.equal(await xml(await download(d.path)),d.xml);assert.equal(await xml(await download(`/documents/workshop/${result.activityId}.docx`)),body);
  assert.equal((await c.get(p+'/generation?classroomId='+f.classroom.classroomId)).jobs.length,0);
  const dir=new URL('../.local/multi-age-main-20261023/talleres/',import.meta.url);await mkdir(dir,{recursive:true});await writeFile(new URL('taller-3-4-5.docx',dir),word);await writeFile(new URL('state.json',dir),JSON.stringify(after,null,2));await writeFile(new URL('receipt.json',dir),JSON.stringify({status:'passed',storeName,ages:[3,4,5],activityId:result.activityId,restart:true,originalDocumentsUnchanged:old.length,aiCalls:0,remoteWrites:0},null,2));
 }finally{await stop(app);}
});
