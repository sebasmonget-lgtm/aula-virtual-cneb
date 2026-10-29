import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import JSZip from 'jszip';
import {makeMultiAgeDocumentFixture,documentFixtureRequest as confirm} from '../../scripts/fixtures/multi-age-document-fixture.mjs';
import {multiAgeFamilyQuestionnaireWorkspace,saveMultiAgeFamilyQuestionnaire,confirmMultiAgeFamilyQuestionnaire} from './multi-age-family-questionnaire.mjs';
import {multiAgeGroupDiagnosticWorkspace,saveMultiAgeGroupDiagnostic,confirmMultiAgeGroupDiagnostic} from './multi-age-group-diagnostic.mjs';
import {multiAgeDiagnosticContext,confirmMultiAgeDiagnosticReview,confirmMultiAgeFamilyContext} from './multi-age-diagnostic.mjs';
import {multiAgeAnnualContext} from './multi-age-annual.mjs';
import {listMultiAgeDocuments,loadMultiAgeDocument} from './multi-age-document-service.mjs';
import {renderMultiAgePlanningWord} from './multi-age-planning-word.mjs';
import {enqueueMultiAgeGeneration,runMultiAgeGenerationStep,loadMultiAgeGeneration} from './multi-age-generation-jobs.mjs';
import {makeMultiAgePeriodFixture} from '../../scripts/fixtures/multi-age-period-fixture.mjs';
import {multiAgePeriodOverview,closeMultiAgePeriod} from './multi-age-period.mjs';

const xml=async bytes=>(await JSZip.loadAsync(bytes)).file('word/document.xml').async('string');
const groupReadings=s=>s.eligibleReadings.map(r=>({age:r.age,competency_id:r.competency_id,review_ids:[r.reviewId],teacher_reading:`Lectura grupal ficticia exclusiva de ${r.age} años sustentada en la revisión citada.`,planning_priority:'consider'}));
const groupDraft=(f,s,readings=groupReadings(s))=>({...confirm(),classroomId:f.classroom.classroomId,sourceFingerprint:s.sourceFingerprint,expectedDraftId:s.draft?.id??null,expectedDraftFingerprint:s.draftFingerprint,expectedReviewId:s.confirmed?.id??null,readings,organization:'Ofrecer juegos compartidos en un espacio visible y acompañar brevemente a cada grupo.'});
const groupConfirm=(f,s)=>({...confirm(),classroomId:f.classroom.classroomId,expectedDraftId:s.draft.id,expectedDraftFingerprint:s.draftFingerprint,expectedReviewId:s.confirmed?.id??null,pendingInformationAcknowledged:true,reason:'Actualizar la síntesis con las fuentes revisadas conservando la anterior.'});
const familyDraft=(child,s)=>({...confirm(),studentId:child.studentId,expectedAssignmentId:s.assignmentId,expectedDraftId:s.draft?.id??null,expectedDraftFingerprint:s.draftFingerprint,expectedInterviewId:s.confirmed?.id??null,answers:{interests:'La familia cuenta que disfruta jugar con bloques.',communication_context:'Cuenta lo que construye en casa, según su familia.',language_tags:['qu'],interest_tags:['construction']}});
const familyConfirm=(child,s)=>({...confirm(),studentId:child.studentId,expectedAssignmentId:s.assignmentId,expectedDraftId:s.draft.id,expectedDraftFingerprint:s.draftFingerprint,expectedInterviewId:s.confirmed?.id??null,pendingInformationAcknowledged:true,reason:'Ampliar la entrevista con las respuestas del cuestionario.'});

for(const schema of ['local','supabase'])test(`diagnóstico grupal y cuestionario ${schema}: fuentes propias, avances, vigencia e historia`,{timeout:110000},async t=>{
 const f=await makeMultiAgeDocumentFixture({schema}),{db,teacher}=f,classroomId=f.classroom.classroomId;
 try{
  const oldWords=[];for(const d of await listMultiAgeDocuments(db,teacher))oldWords.push({id:d.id,kind:d.kind,xml:await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,d.kind,d.id)))});
  let group=await multiAgeGroupDiagnosticWorkspace(db,teacher,classroomId);assert.equal(group.ready,true);assert.equal(group.eligibleReadings.length,3);
  const annualBefore=(await multiAgeAnnualContext(db,teacher,classroomId)).sourceFingerprint;
  const queued=await enqueueMultiAgeGeneration(db,teacher,{kind:'annual',classroomId},{mode:'fixture'});
  await t.test('borrador no modifica fuentes y las lecturas no aceptan otra edad, competencia o relato familiar',async()=>{
   const bad=groupReadings(group);bad[0].review_ids=[bad[1].review_ids[0]];await assert.rejects(saveMultiAgeGroupDiagnostic(db,teacher,groupDraft(f,group,bad)),/misma edad/);
   bad[0].review_ids=[f.children[0].interviewId??randomUUID()];await assert.rejects(saveMultiAgeGroupDiagnostic(db,teacher,groupDraft(f,group,bad)),/misma edad/);
   await assert.rejects(saveMultiAgeGroupDiagnostic(db,f.other,groupDraft(f,group)),/no está disponible/);
   const saved=await saveMultiAgeGroupDiagnostic(db,teacher,groupDraft(f,group));assert.ok(saved.reviewId);assert.equal((await multiAgeAnnualContext(db,teacher,classroomId)).sourceFingerprint,annualBefore);
   group=await multiAgeGroupDiagnosticWorkspace(db,teacher,classroomId);await assert.rejects(confirmMultiAgeGroupDiagnostic(db,teacher,{...groupConfirm(f,group),teacherConfirmed:false}),/Confirma/);
   await confirmMultiAgeGroupDiagnostic(db,teacher,groupConfirm(f,group));group=await multiAgeGroupDiagnosticWorkspace(db,teacher,classroomId);assert.equal(group.current,true);
   let providerCalls=0;await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:async()=>{providerCalls++;throw new Error('No debe invocarse una propuesta obsoleta.');}});assert.equal(providerCalls,0);assert.equal((await loadMultiAgeGeneration(db,teacher,queued.id)).status,'stale');
  });
  const initialGroupId=group.confirmed.id,groupWord=await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'diagnostic_group_review',initialGroupId)));
  for(const age of [3,4,5])assert.match(groupWord,new RegExp(`Grupo de ${age} años`));assert.match(groupWord,/Información|información/);assert.doesNotMatch(groupWord,/undefined|\[object Object\]/);
  const initialAnnual=await multiAgeAnnualContext(db,teacher,classroomId);assert.equal(initialAnnual.context.diagnostic_group_review.current,true);assert.equal(initialAnnual.context.diagnostic_group_review.readings.length,3);
  const child=f.children[0];let questionnaire=await multiAgeFamilyQuestionnaireWorkspace(db,teacher,child.studentId),initialSource=(await multiAgeDiagnosticContext(db,teacher,child.studentId)).sourceFingerprint;
  await t.test('cuestionario parcial durable, confirmación explícita y relato separado de observaciones',async()=>{
   assert.equal(questionnaire.questions.length,8);const request=familyDraft(child,questionnaire),saved=await saveMultiAgeFamilyQuestionnaire(db,teacher,request);assert.equal((await saveMultiAgeFamilyQuestionnaire(db,teacher,request)).replayed,true);
   questionnaire=await multiAgeFamilyQuestionnaireWorkspace(db,teacher,child.studentId);assert.equal(questionnaire.draft.id,saved.interviewId);assert.equal(questionnaire.answered,2);
   assert.equal((await multiAgeDiagnosticContext(db,teacher,child.studentId)).sourceFingerprint,initialSource,'el avance no reemplaza una entrevista confirmada');assert.equal((await multiAgeGroupDiagnosticWorkspace(db,teacher,classroomId)).current,true);
   await assert.rejects(confirmMultiAgeFamilyContext(db,teacher,{...confirm(),studentId:child.studentId,expectedAssignmentId:child.assignmentId,expectedInterviewId:questionnaire.confirmed.id,familyText:'Otro relato que intentaría saltarse el borrador.'}),/cuestionario/);
   await assert.rejects(saveMultiAgeFamilyQuestionnaire(db,teacher,{...request,clientRequestId:randomUUID()}),/cambió/);
   await assert.rejects(saveMultiAgeFamilyQuestionnaire(db,teacher,{...familyDraft(child,questionnaire),answers:{achievement_level:'AD'}}),/ocho respuestas/);
   await assert.rejects(confirmMultiAgeFamilyQuestionnaire(db,teacher,{...familyConfirm(child,questionnaire),expectedAssignmentId:randomUUID()}),/vigente/);
   await confirmMultiAgeFamilyQuestionnaire(db,teacher,familyConfirm(child,questionnaire));questionnaire=await multiAgeFamilyQuestionnaireWorkspace(db,teacher,child.studentId);assert.equal(questionnaire.history.filter(r=>r.status==='confirmed').length,2);
   const context=await multiAgeDiagnosticContext(db,teacher,child.studentId);assert.match(context.sources.family.details.family_text,/Comunicación oral/);assert.equal(context.context.teacher_observations.length,1);assert.equal(context.context.family_reports.length,1);assert.equal(context.sources.family.details.role,'context_only');
   group=await multiAgeGroupDiagnosticWorkspace(db,teacher,classroomId);assert.equal(group.current,false);assert.equal(group.ready,false);
   const annual=await multiAgeAnnualContext(db,teacher,classroomId);assert.equal(annual.context.diagnostic_group_review.current,false);assert.deepEqual(annual.context.diagnostic_group_review.readings,[]);
  });
  await t.test('nueva revisión del niño y del grupo conservan sus documentos confirmados y rechazan borradores obsoletos',async()=>{
   const stale=await saveMultiAgeGroupDiagnostic(db,teacher,groupDraft(f,group,[])),staleState=await multiAgeGroupDiagnosticWorkspace(db,teacher,classroomId);
   const context=await multiAgeDiagnosticContext(db,teacher,child.studentId),o=context.context.teacher_observations[0];
   await confirmMultiAgeDiagnosticReview(db,teacher,{...confirm(),studentId:child.studentId,expectedReviewId:child.reviewId,reason:'Revisar el diagnóstico con la entrevista ampliada.',sourceFingerprint:context.sourceFingerprint,pendingInformationAcknowledged:true,findings:[{competency_id:o.competency_id,observation_ids:[o.id],teacher_reading:'Lectura individual revisada de 3 años, sustentada en su observación.',planning_priority:'consider'}]});
   await assert.rejects(confirmMultiAgeGroupDiagnostic(db,teacher,groupConfirm(f,staleState)),/fuentes vigentes/);assert.ok(stale.reviewId);
   group=await multiAgeGroupDiagnosticWorkspace(db,teacher,classroomId);await saveMultiAgeGroupDiagnostic(db,teacher,groupDraft(f,group));group=await multiAgeGroupDiagnosticWorkspace(db,teacher,classroomId);await confirmMultiAgeGroupDiagnostic(db,teacher,groupConfirm(f,group));group=await multiAgeGroupDiagnosticWorkspace(db,teacher,classroomId);assert.equal(group.current,true);assert.equal(group.confirmed.version,2);
   assert.equal(await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'diagnostic_group_review',initialGroupId))),groupWord);
   for(const d of oldWords)assert.equal(await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,d.kind,d.id))),d.xml);
   assert.equal((await listMultiAgeDocuments(db,teacher)).find(d=>d.id===initialGroupId).historical,true);
   await assert.rejects(db.query("update diagnostic_group_reviews set details='{}' where id=$1",[initialGroupId]),/inmutable/);await assert.rejects(db.query('delete from student_family_interviews where id=$1',[questionnaire.confirmed.id]),/inmutable/);
  });
  await t.test('las preguntas sin responder quedan pendientes y nunca se convierten en evidencia',async()=>{
   const q=await multiAgeFamilyQuestionnaireWorkspace(db,teacher,child.studentId);
   await saveMultiAgeFamilyQuestionnaire(db,teacher,{...familyDraft(child,q),answers:{}});
   const saved=await multiAgeFamilyQuestionnaireWorkspace(db,teacher,child.studentId);assert.equal(saved.answered,0);
   await assert.rejects(confirmMultiAgeFamilyQuestionnaire(db,teacher,{...familyConfirm(child,saved),pendingInformationAcknowledged:false}),/Confirma/);
   await confirmMultiAgeFamilyQuestionnaire(db,teacher,familyConfirm(child,saved));
   const current=await multiAgeDiagnosticContext(db,teacher,child.studentId);assert.equal(current.sources.family.details.pending_question_keys.length,8);assert.match(current.sources.family.details.family_text,/Información pendiente/);assert.equal(current.context.teacher_observations.length,1);
   assert.equal(await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'diagnostic_group_review',initialGroupId))),groupWord);
  });
  await t.test('RLS temporal y consulta histórica del aula archivada',async()=>{
   if(schema==='supabase'){
    await db.query('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.other]);assert.equal((await listMultiAgeDocuments(db,teacher)).length,0);await assert.rejects(loadMultiAgeDocument(db,teacher,'diagnostic_group_review',initialGroupId),/no está disponible/);await assert.rejects(multiAgeFamilyQuestionnaireWorkspace(db,teacher,child.studentId),/no está disponible/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[teacher]);assert.equal((await loadMultiAgeDocument(db,teacher,'diagnostic_group_review',initialGroupId)).version,1);
    await assert.rejects(db.query(`insert into diagnostic_group_reviews(id,classroom_id,version,status,details,source_snapshot,created_by,curriculum_contract_version)
     select $2,classroom_id,99,'draft',details,source_snapshot,created_by,2 from diagnostic_group_reviews where id=$1`,[initialGroupId,randomUUID()]),error=>error.code==='42501');await db.query('reset role');
   }
   await db.query("update classrooms set status='archived',section='Nombre posterior' where id=$1",[classroomId]);assert.equal(await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'diagnostic_group_review',initialGroupId))),groupWord);
  });
 }finally{await db.close();}
});

test('un bimestre cerrado conserva avances y bloquea confirmar correcciones familiares o grupales',{timeout:90000},async()=>{
 const f=await makeMultiAgePeriodFixture(),{db,teacher}=f,classroomId=f.classroom.classroomId;
 try{
  let group=await multiAgeGroupDiagnosticWorkspace(db,teacher,classroomId);await saveMultiAgeGroupDiagnostic(db,teacher,groupDraft(f,group));group=await multiAgeGroupDiagnosticWorkspace(db,teacher,classroomId);await confirmMultiAgeGroupDiagnostic(db,teacher,groupConfirm(f,group));
  group=await multiAgeGroupDiagnosticWorkspace(db,teacher,classroomId);const originalId=group.confirmed.id,oldWord=await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'diagnostic_group_review',originalId)));
  const overview=await multiAgePeriodOverview(db,teacher,{classroomId,periodId:f.period.id});await closeMultiAgePeriod(db,teacher,{...confirm(),classroomId,periodId:f.period.id,expectedCurrentVersionId:null,expectedSourceFingerprint:overview.sourceFingerprint,pendingAcknowledged:true});
  const child=f.children[0],q=await multiAgeFamilyQuestionnaireWorkspace(db,teacher,child.studentId);await saveMultiAgeFamilyQuestionnaire(db,teacher,familyDraft(child,q));const pending=await multiAgeFamilyQuestionnaireWorkspace(db,teacher,child.studentId);await assert.rejects(confirmMultiAgeFamilyQuestionnaire(db,teacher,familyConfirm(child,pending)),/Reabre/);assert.equal((await multiAgeFamilyQuestionnaireWorkspace(db,teacher,child.studentId)).confirmed.id,q.confirmed.id);
  await saveMultiAgeGroupDiagnostic(db,teacher,groupDraft(f,group));group=await multiAgeGroupDiagnosticWorkspace(db,teacher,classroomId);await assert.rejects(confirmMultiAgeGroupDiagnostic(db,teacher,groupConfirm(f,group)),/Reabre/);assert.equal((await multiAgeGroupDiagnosticWorkspace(db,teacher,classroomId)).confirmed.id,originalId);
  assert.equal(await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'diagnostic_group_review',originalId))),oldWord);
 }finally{await db.close();}
});
