import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {makeMultiAgePeriodFixture} from './fixtures/multi-age-period-fixture.mjs';
import {startMultiAgeHttpFixture as start,stopMultiAgeHttpFixture as stop,multiAgeHttpFixtureClient as client} from './fixtures/multi-age-http-fixture.mjs';
import {openMultiAgePersistentDb} from './multi-age-local-db.mjs';
const p='/api/multi-age',confirm=()=>({teacherConfirmed:true,clientRequestId:randomUUID()});
const xml=async bytes=>(await JSZip.loadAsync(bytes)).file('word/document.xml').async('string');
const sources=async db=>(await db.query(`select 'observation' as kind,id,to_jsonb(o) as data from ordinary_observations o
 union all select 'diagnostic_observation',id,to_jsonb(o) from diagnostic_experience_observations o
 union all select 'grade',id,to_jsonb(g) from competency_assessments g union all select 'conclusion',id,to_jsonb(c) from competency_descriptive_conclusions c
 union all select 'report',id,to_jsonb(r) from family_reports r union all select 'activity',id,to_jsonb(a) from activities a order by kind,id`)).rows;

test('API grupal/familias: avances 3/4/5, reinicios, dos diagnósticos grupales e históricos intactos',{timeout:150000},async()=>{
 const storeName='group-family-'+randomUUID(),f=await makeMultiAgePeriodFixture({storeName}),originalSources=await sources(f.db);await f.db.close();
 let app=await start(storeName),c=client(app);const directory=new URL('../.local/multi-age-main-20261023/diagnostico-grupal/',import.meta.url);
 const download=async path=>{const response=await fetch(app.origin+p+path);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');return Buffer.from(await response.arrayBuffer());};
 const state=()=>c.get(p+'/state');
 const group=()=>c.get(p+'/diagnostic/group?classroomId='+f.classroom.classroomId);
 const questionnaire=child=>c.get(p+'/diagnostic/questionnaire?studentId='+child.studentId);
 const saveGroup=async()=>{const g=await group();await c.post(p+'/diagnostic/group/draft',{...confirm(),classroomId:f.classroom.classroomId,sourceFingerprint:g.sourceFingerprint,expectedDraftId:g.draft?.id??null,expectedDraftFingerprint:g.draftFingerprint,expectedReviewId:g.confirmed?.id??null,
  readings:g.eligibleReadings.map(r=>({age:r.age,competency_id:r.competency_id,review_ids:[r.reviewId],teacher_reading:`En la situación de juego registrada para ${r.age} años comunicó una elección. Se necesitan otras oportunidades para ampliar esta lectura.`,planning_priority:'consider'})),organization:'Conservar una experiencia compartida, dar tiempo para elegir y acompañar brevemente a cada grupo de edad.'});};
 const confirmGroup=async()=>{const g=await group();return c.post(p+'/diagnostic/group/confirm',{...confirm(),classroomId:f.classroom.classroomId,expectedDraftId:g.draft.id,expectedDraftFingerprint:g.draftFingerprint,expectedReviewId:g.confirmed?.id??null,pendingInformationAcknowledged:true,reason:'Revisar la síntesis con nuevas fuentes sin reemplazar el documento anterior.'});};
 try{
  const initial=await state(),oldWords=[];
  for(const d of initial.documents)oldWords.push({path:`/documents/${d.kind}/${d.id}.docx`,xml:await xml(await download(`/documents/${d.kind}/${d.id}.docx`))});
  for(const r of initial.workspace.reports)oldWords.push({path:`/reports/${r.id}.docx`,xml:await xml(await download(`/reports/${r.id}.docx`))});assert.equal(oldWords.length,9);
  await saveGroup();const firstDraft=(await group()).draft;await stop(app);app=await start(storeName);c=client(app);assert.deepEqual((await group()).draft,firstDraft);
  const first=await confirmGroup(),firstWord=await download(`/documents/diagnostic_group_review/${first.reviewId}.docx`),firstXml=await xml(firstWord);
  for(const age of [3,4,5])assert.match(firstXml,new RegExp(`Grupo de ${age} años`));
  for(const child of f.children){
   const q=await questionnaire(child);await c.post(p+'/diagnostic/questionnaire/draft',{...confirm(),studentId:child.studentId,expectedAssignmentId:q.assignmentId,expectedDraftId:null,expectedDraftFingerprint:null,expectedInterviewId:q.confirmed.id,
    answers:{interests:`Según la familia de ${child.age} años, disfruta construir y escuchar cuentos.`,communication_context:`En casa expresa sus preferencias en castellano y escucha quechua. Relato exclusivo de ${child.age} años.`,interest_tags:['construction','stories'],language_tags:['es','qu']}});
  }
  const withDrafts=await state();assert.equal(withDrafts.diagnostic.groupReview.current,true);await stop(app);app=await start(storeName);c=client(app);
  for(const child of f.children){const q=await questionnaire(child);assert.equal(q.draft.details.questionnaire_version,3);assert.equal(q.answered,2);assert.equal(q.draft.details.curriculum_snapshot.age,child.age);
   await c.post(p+'/diagnostic/questionnaire/confirm',{...confirm(),studentId:child.studentId,expectedAssignmentId:q.assignmentId,expectedDraftId:q.draft.id,expectedDraftFingerprint:q.draftFingerprint,expectedInterviewId:q.confirmed.id,pendingInformationAcknowledged:true,reason:'Ampliar la entrevista familiar conservando el relato anterior.'});
  }
  assert.equal((await group()).current,false);assert.equal((await group()).ready,false);
  await saveGroup();const stale=await group();assert.equal((await c.raw(p+'/diagnostic/group/confirm',{...confirm(),classroomId:f.classroom.classroomId,expectedDraftId:stale.draft.id,expectedDraftFingerprint:stale.draftFingerprint,expectedReviewId:first.reviewId,pendingInformationAcknowledged:true,reason:'Intento anterior a la revisión individual.'})).status,409);
  for(const child of f.children){const context=await c.get(p+'/diagnostic/context?studentId='+child.studentId),observation=context.context.teacher_observations[0];
   await c.post(p+'/diagnostic/review',{...confirm(),studentId:child.studentId,expectedReviewId:child.reviewId,sourceFingerprint:context.sourceFingerprint,pendingInformationAcknowledged:true,reason:'Revisar las fuentes con la entrevista ampliada.',findings:[{competency_id:'COM_ORAL',observation_ids:[observation.id],teacher_reading:`Lectura individual confirmada para ${child.age} años: expresó una elección en la situación observada.`,planning_priority:'consider'}]});
  }
  await saveGroup();const second=await confirmGroup();assert.equal(second.version,2);const secondWord=await download(`/documents/diagnostic_group_review/${second.reviewId}.docx`);
  await stop(app);app=await start(storeName);c=client(app);const final=await state();assert.equal(final.diagnostic.groupReview.current,true);assert.equal(final.diagnostic.groupReview.confirmed.version,2);assert.equal(final.documents.filter(d=>d.kind==='diagnostic_group_review'&&d.exportReady).length,2);assert.equal(final.documents.find(d=>d.id===first.reviewId).historical,true);
  assert.ok(final.workspace.pairs.every(p=>p.current));for(const child of f.children)assert.equal((await questionnaire(child)).history.filter(r=>r.status==='confirmed').length,2);
  for(const d of oldWords)assert.equal(await xml(await download(d.path)),d.xml);assert.equal(await xml(await download(`/documents/diagnostic_group_review/${first.reviewId}.docx`)),firstXml);
  assert.equal((await c.get(p+'/generation?classroomId='+f.classroom.classroomId)).jobs.length,0);
  const foreignOrigin=await fetch(app.origin+p+'/diagnostic/group/draft',{method:'POST',headers:{origin:'https://ajeno.invalid','content-type':'application/json'},body:'{}'});assert.equal(foreignOrigin.status,403);
  await stop(app);const db=await openMultiAgePersistentDb({storeName});try{assert.deepEqual(await sources(db),originalSources);}finally{await db.close();}
  await mkdir(directory,{recursive:true});await writeFile(new URL('diagnostico-grupal-3-4-5.docx',directory),secondWord);await writeFile(new URL('state.json',directory),JSON.stringify(final,null,2));
  await writeFile(new URL('receipt.json',directory),JSON.stringify({status:'passed',storeName,classroomId:f.classroom.classroomId,ages:[3,4,5],groupVersion:2,familyConfirmedVersionsPerChild:2,originalWordsUnchanged:9,originalSourcesUnchanged:true,aiCalls:0,remoteWrites:0},null,2));
 }finally{await stop(app);}
});
