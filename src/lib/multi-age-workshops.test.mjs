import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {makeMultiAgePeriodFixture} from '../../scripts/fixtures/multi-age-period-fixture.mjs';
import {multiAgeWorkshopLibrary,confirmMultiAgeWorkshop,loadMultiAgeWorkshopDocument} from './multi-age-workshops.mjs';
import {multiAgeLocalWorkspace,observeMultiAgeStudent,multiAgeAssessmentContext,confirmMultiAgeGrade,confirmMultiAgeConclusion} from './multi-age-local-service.mjs';
import {listMultiAgeDocuments,loadMultiAgeDocument} from './multi-age-document-service.mjs';
import {multiAgePlanningDocumentSections} from './multi-age-planning-word.mjs';
import {closeMultiAgePeriod,multiAgePeriodOverview} from './multi-age-period.mjs';

export function workshopInput(f,library,{day=f.activity.blueprint.occursOn}={}){
 const w=library.workshops.find(w=>w.competencyId==='COM_ORAL');assert.ok(w);
 return {teacherConfirmed:true,clientRequestId:randomUUID(),classroomId:f.classroom.classroomId,expectedRevision:1,sourceFingerprint:library.sourceFingerprint,workshopId:w.id,
  blueprint:{title:w.title,purpose:'Conversar sobre objetos cercanos con oportunidades propias para cada edad.',occursOn:day,participantAges:[3,4,5],commonSequence:w.commonSequence,criteriaFamilies:[{competency_id:w.competencyId,variants:w.variants.map(v=>({curricular_age:v.curricular_age,criterion_text:v.criterion_text,expected_evidence:v.expected_evidence,observation_moments:v.observation_moments,official_performance_refs:v.performances.slice(0,1).map(p=>p.id)}))}]}};
}
for(const schema of ['local','supabase'])test(`Talleres V2 ${schema}: biblioteca → criterios 3/4/5 → Hoy → observaciones → documento conservado`,{timeout:90000},async t=>{
 const f=await makeMultiAgePeriodFixture({schema}),{db,teacher}=f;try{
  const before=await multiAgeLocalWorkspace(db,teacher,f.classroom.classroomId),docs=await listMultiAgeDocuments(db,teacher,{classroomId:f.classroom.classroomId}),saved=await Promise.all(docs.map(d=>loadMultiAgeDocument(db,teacher,d.kind,d.id)));
  const library=await multiAgeWorkshopLibrary(db,teacher,f.classroom.classroomId);assert.ok(library.workshops.length>=8);assert.ok(library.workshops.every(w=>w.variants.length===3));
  const input=workshopInput(f,library);input.expectedRevision=before.classroom.curriculum_revision;
  await t.test('fecha, propiedad, catálogo, edades y referencias se validan antes de guardar',async()=>{
   await assert.rejects(multiAgeWorkshopLibrary(db,f.other,input.classroomId),/no está disponible/);
   await assert.rejects(confirmMultiAgeWorkshop(db,teacher,{...input,teacherConfirmed:false}),/Revisa/);
   await assert.rejects(confirmMultiAgeWorkshop(db,teacher,{...input,sourceFingerprint:'obsoleto'}),/cambió/);
   await assert.rejects(confirmMultiAgeWorkshop(db,teacher,{...input,blueprint:{...input.blueprint,occursOn:'2026-05-01'}}),/lectivo/);
   const missing=structuredClone(input);missing.blueprint.criteriaFamilies[0].variants.pop();await assert.rejects(confirmMultiAgeWorkshop(db,teacher,missing),/Falta|cada edad/);
   const wrong=structuredClone(input);wrong.blueprint.criteriaFamilies[0].variants[0].official_performance_refs=wrong.blueprint.criteriaFamilies[0].variants[1].official_performance_refs;await assert.rejects(confirmMultiAgeWorkshop(db,teacher,wrong),/edad/);
  });
  const result=await confirmMultiAgeWorkshop(db,teacher,input);assert.equal((await confirmMultiAgeWorkshop(db,teacher,input)).replayed,true);
  await assert.rejects(confirmMultiAgeWorkshop(db,teacher,{...input,clientRequestId:randomUUID()}),/Ya hay/);
  const after=await multiAgeLocalWorkspace(db,teacher,input.classroomId);assert.deepEqual(after.projects,before.projects);assert.equal(after.activities.length,before.activities.length+1);
  assert.equal(after.activities.find(a=>a.id===result.activityId).experience_type,'workshop');
  await t.test('cada niño observa con su criterio y el taller entra en su evaluación individual',async()=>{
   for(const child of f.children){const criterion=after.criteria.find(c=>c.activity_id===result.activityId&&c.curricular_age===child.age);assert.ok(criterion);
    const observe={clientRequestId:randomUUID(),studentId:child.studentId,activityId:result.activityId,criterionId:criterion.id,periodId:f.period.id,observedOn:input.blueprint.occursOn,rawText:`Registro ficticio del taller de ${child.age} años: comentó su elección de un objeto.`};
    const foreign=after.criteria.find(c=>c.activity_id===result.activityId&&c.curricular_age!==child.age);await assert.rejects(observeMultiAgeStudent(db,teacher,{...observe,criterionId:foreign.id}),/edad|grupo|curricular/);
    await observeMultiAgeStudent(db,teacher,observe);const context=await multiAgeAssessmentContext(db,teacher,child.input);assert.ok(context.sourceRows.some(r=>r.activity_id===result.activityId));assert.equal(context.scope.age,child.age);
   }
  });
  const document=await loadMultiAgeWorkshopDocument(db,teacher,result.activityId),sections=JSON.stringify(multiAgePlanningDocumentSections(document));for(const age of [3,4,5])assert.ok(sections.includes(`Qué observar en ${age} años`));
  await t.test('el servidor y RLS conservan identidad, variantes y snapshot incluso si intentan retirar su marcador',async()=>{
   await assert.rejects(db.query("update activities set details=details-'contract_version' where id=$1",[result.activityId]),/Conserva|inmutable/);
   await assert.rejects(db.query("update learning_experiences set type='project',details='{}'::jsonb where id=$1",[result.workshopId]),/Conserva|inmutable/);
   await assert.rejects(db.query("update activity_criteria set criterion_text='Texto cambiado' where activity_id=$1",[result.activityId]),/Conserva|inmutable/);
   if(schema==='supabase'){
    await db.query('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.other]);
    assert.equal((await listMultiAgeDocuments(db,teacher,{classroomId:input.classroomId})).length,0);await assert.rejects(loadMultiAgeWorkshopDocument(db,teacher,result.activityId),/no está disponible/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[teacher]);assert.equal((await loadMultiAgeWorkshopDocument(db,teacher,result.activityId)).kind,'workshop');
    await assert.rejects(db.query("update activities set title='Intento directo' where id=$1",[result.activityId]),error=>error.code==='42501');await db.query('reset role');
   }
  });
  assert.equal((await listMultiAgeDocuments(db,teacher,{classroomId:input.classroomId})).filter(d=>d.kind==='workshop').length,1);
  await assert.rejects(loadMultiAgeWorkshopDocument(db,f.other,result.activityId),/no está disponible/);
  await db.query("update profiles set display_name='Nombre posterior ficticio' where user_id=$1",[teacher]);assert.deepEqual(await loadMultiAgeWorkshopDocument(db,teacher,result.activityId),document);
  for(const [i,d]of docs.entries())assert.deepEqual(await loadMultiAgeDocument(db,teacher,d.kind,d.id),saved[i]);
  const updated=[];for(const child of f.children){const context=await multiAgeAssessmentContext(db,teacher,child.input);const grade=await confirmMultiAgeGrade(db,teacher,{teacherConfirmed:true,clientRequestId:randomUUID(),...child.input,sourceFingerprint:context.sourceFingerprint,achievementLevel:'A',expectedAssessmentId:child.grade.assessmentId,reason:'Revisar los nuevos registros del taller.'});updated.push({child,context,grade});}
  for(const {child,context,grade}of updated)await confirmMultiAgeConclusion(db,teacher,{teacherConfirmed:true,clientRequestId:randomUUID(),...child.input,assessmentId:grade.assessmentId,sourceFingerprint:context.sourceFingerprint,conclusionText:`Lectura ficticia revisada con los registros del taller de ${child.age} años.`});
  const overview=await multiAgePeriodOverview(db,teacher,{classroomId:input.classroomId,periodId:f.period.id});
  await closeMultiAgePeriod(db,teacher,{teacherConfirmed:true,clientRequestId:randomUUID(),classroomId:input.classroomId,periodId:f.period.id,expectedCurrentVersionId:overview.closure.currentVersionId,expectedSourceFingerprint:overview.sourceFingerprint,pendingAcknowledged:true});
  await assert.rejects(confirmMultiAgeWorkshop(db,teacher,{...input,clientRequestId:randomUUID(),blueprint:{...input.blueprint,occursOn:'2026-04-15'}}),/Reabre/);
 }finally{await db.close();}
});
