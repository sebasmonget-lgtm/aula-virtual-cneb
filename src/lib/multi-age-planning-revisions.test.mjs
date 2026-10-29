import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import JSZip from 'jszip';
import {makeMultiAgePeriodFixture} from '../../scripts/fixtures/multi-age-period-fixture.mjs';
import {documentFixtureRequest as confirm} from '../../scripts/fixtures/multi-age-document-fixture.mjs';
import {multiAgeProjectEditContext,confirmMultiAgeProjectEdit} from './multi-age-project-edit.mjs';
import {multiAgeProjectContext} from './multi-age-projects.mjs';
import {multiAgeAnnualWorkspace,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan} from './multi-age-annual.mjs';
import {multiAgeLocalWorkspace,confirmMultiAgeActivity,multiAgeAssessmentContext,multiAgeFamilyDocument} from './multi-age-local-service.mjs';
import {loadMultiAgeDocument} from './multi-age-document-service.mjs';
import {renderMultiAgePlanningWord} from './multi-age-planning-word.mjs';
import {renderFamilyReportWord} from './family-report-word.mjs';
import {loadKnowledgeBaseV4} from './knowledge-base-v4.mjs';
import {enqueueMultiAgeGeneration,runMultiAgeGenerationStep,loadMultiAgeGeneration} from './multi-age-generation-jobs.mjs';
import {multiAgeProviderForJob} from '../../scripts/multi-age-ai-runtime.mjs';
import {multiAgePeriodOverview,closeMultiAgePeriod,reopenMultiAgePeriod,loadMultiAgePeriodClosure} from './multi-age-period.mjs';

const xml=async(bytes)=>(await JSZip.loadAsync(bytes)).file('word/document.xml').async('string');
const cleanFamilies=families=>families.map(f=>({competency_id:f.competency_id,variants:f.variants.map(v=>({curricular_age:v.curricular_age,criterion_text:v.criterion_text,expected_evidence:v.expected_evidence,observation_moments:v.observation_moments,official_performance_refs:v.official_performance_refs}))}));
async function rawSources(db){return (await db.query(`select 'activity' as kind,id,to_jsonb(a) as data from activities a union all select 'criterion',id,to_jsonb(c) from activity_criteria c
 union all select 'observation',id,to_jsonb(o) from ordinary_observations o union all select 'grade',id,to_jsonb(g) from competency_assessments g
 union all select 'conclusion',id,to_jsonb(d) from competency_descriptive_conclusions d union all select 'report',id,to_jsonb(r) from family_reports r order by kind,id`)).rows;}

for(const schema of ['local','supabase'])test(`proyecto editable y Mi año reorganizado ${schema}: versiones, actividades preservadas, fechas y edades`,{timeout:110000},async t=>{
 const f=await makeMultiAgePeriodFixture({schema}),{db,teacher}=f,input={classroomId:f.classroom.classroomId,projectId:f.activity.projectId};
 try{
  const original=await multiAgeProjectEditContext(db,teacher,input),sources=await rawSources(db),oldActivity=await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'activity',f.activity.activityId))),oldAnnual=await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'annual_plan',f.plan.planId)));
  const cards=(await loadKnowledgeBaseV4()).competencyCards,oldReport=await xml(await renderFamilyReportWord(await multiAgeFamilyDocument(db,teacher,f.children[0].report.reportId),cards));
  let planning=await multiAgeAnnualWorkspace(db,teacher,input.classroomId),active=planning.plans.find(p=>p.status==='active'),slot=active.document_context.calendar.projects[0];
  const queueInput={...input,kind:'activity_batch',annualPlanId:active.id,annualSlotId:slot.slot_id,expectedProjectFingerprint:original.fingerprint,activityPosition:2,activityDates:slot.instructional_dates.slice(1,3),competencyIds:['COM_ORAL']};
  const queued=await enqueueMultiAgeGeneration(db,teacher,queueInput,{mode:'fixture'});
  const edited=structuredClone(f.activity.blueprint);edited.title='Proyecto ficticio revisado: escuchamos y elegimos';edited.purpose='Compartir elecciones de juego con acompañamiento propio de cada edad.';edited.commonSequence.development='Escuchar las elecciones por turnos y ofrecer tiempo para responder.';edited.criteriaFamilies[0].variants[0].criterion_text='Expresa su elección con palabras o gestos durante el juego propuesto.';
  const edit={...confirm(),...input,expectedSourceFingerprint:original.sourceFingerprint,expectedProjectFingerprint:original.fingerprint,blueprint:edited,reason:'Revisar la propuesta para las próximas actividades sin reemplazar las preparadas.',preservedActivitiesAcknowledged:true};
  await assert.rejects(confirmMultiAgeProjectEdit(db,f.other,edit),/no está disponible/);
  const bad=structuredClone(edit);bad.blueprint.criteriaFamilies[0].variants[1].official_performance_refs=bad.blueprint.criteriaFamilies[0].variants[0].official_performance_refs;await assert.rejects(confirmMultiAgeProjectEdit(db,teacher,bad),/edad|referente/);
  const saved=await confirmMultiAgeProjectEdit(db,teacher,edit);assert.equal(saved.version,2);assert.equal((await confirmMultiAgeProjectEdit(db,teacher,edit)).replayed,true);
  assert.deepEqual(await rawSources(db),sources);const current=await multiAgeProjectContext(db,teacher,input.classroomId,input.projectId);assert.equal(current.project.title,edited.title);
  assert.notEqual(current.project.details.criteria_families[0].variants[0].criterion_id,original.project.details.criteria_families[0].variants[0].criterion_id);
  assert.equal(current.project.details.criteria_families[0].variants[1].criterion_id,original.project.details.criteria_families[0].variants[1].criterion_id);
  await assert.rejects(confirmMultiAgeProjectEdit(db,teacher,{...edit,clientRequestId:randomUUID()}),/cambiaron/);
  for(const child of f.children)assert.equal((await multiAgeAssessmentContext(db,teacher,child.input)).sourceFingerprint,child.context.sourceFingerprint);
  assert.equal(await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'activity',f.activity.activityId))),oldActivity);
  const provider=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'fixture'});let calls=0;await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:async job=>{calls++;return provider(job);}});assert.equal(calls,0);assert.equal((await loadMultiAgeGeneration(db,teacher,queued.id)).status,'stale');
  let revisedJob;
  await t.test('la preparación simulada recibe el proyecto editado y conserva criterios propios de 3/4/5',async()=>{
   revisedJob=await enqueueMultiAgeGeneration(db,teacher,{...queueInput,expectedProjectFingerprint:current.fingerprint},{mode:'fixture'});let simulatedCalls=0;
   await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:async job=>{const fixture=await provider(job);return {generate:async request=>{
    simulatedCalls++;const context=request.ai_context_bundle.confirmed_annual_position;assert.equal(context.confirmed_project.version,2);assert.equal(context.proposal.purpose,edited.purpose);assert.equal(context.proposal.title,edited.title);return fixture.generate(request);
   }};}});
   const ready=await loadMultiAgeGeneration(db,teacher,revisedJob.id);assert.equal(ready.status,'ready');assert.equal(simulatedCalls,1);
   for(const proposal of ready.result.proposals){assert.deepEqual(proposal.criteriaFamilies[0].variants.map(v=>v.curricular_age),[3,4,5]);assert.equal(proposal.criteriaFamilies[0].variants[0].criterion_text,edited.criteriaFamilies[0].variants[0].criterion_text);}
  });
  await t.test('reorganización conserva el tramo preparado y enlaza el mismo proyecto en otra versión anual',async()=>{
   await assert.rejects(saveMultiAgeAnnualDraft(db,teacher,{...confirm(),classroomId:input.classroomId,sourceFingerprint:planning.sourceFingerprint,expectedBasePlanId:active.id,expectedBaseRevision:active.revision,reorder:{fromSlotId:slot.slot_id,toSlotId:active.proposal.proposals[1].slot_id}}),/actividades preparadas/);
   const reorder={...confirm(),classroomId:input.classroomId,sourceFingerprint:planning.sourceFingerprint,expectedBasePlanId:active.id,expectedBaseRevision:active.revision,reorder:{fromSlotId:active.proposal.proposals[13].slot_id,toSlotId:active.proposal.proposals[14].slot_id}};
   const draft=await saveMultiAgeAnnualDraft(db,teacher,reorder);
   await confirmMultiAgeAnnualPlan(db,teacher,{...confirm(),classroomId:input.classroomId,planId:draft.planId,expectedRevision:draft.revision,reason:'Intercambiar dos tramos libres conservando el proyecto y sus fuentes.'});
   planning=await multiAgeAnnualWorkspace(db,teacher,input.classroomId);const next=planning.plans.find(p=>p.status==='active');assert.notEqual(next.id,active.id);assert.equal(next.proposal.proposals[13].title,active.proposal.proposals[14].title);
   const w=await multiAgeLocalWorkspace(db,teacher,input.classroomId);assert.equal(w.projects[0].id,input.projectId);assert.equal(w.projects[0].annual_plan_id,next.id);assert.equal(w.projects[0].nextPosition,2);
   assert.deepEqual(await rawSources(db),sources);active=next;
  });
  assert.equal((await loadMultiAgeGeneration(db,teacher,revisedJob.id)).status,'stale');assert.ok((await db.query('select result from multi_age_generation_jobs where id=$1',[revisedJob.id])).rows[0].result,'el cambio anual conserva el resultado anterior');
  const blueprint={...edited,title:'Actividad nueva con el proyecto revisado',occursOn:slot.instructional_dates[1],criteriaFamilies:cleanFamilies(current.project.details.criteria_families)};
  const second=await confirmMultiAgeActivity(db,teacher,{...confirm(),...input,expectedRevision:1,annualPlanId:active.id,annualSlotId:slot.slot_id,activityPosition:2,expectedProjectFingerprint:current.fingerprint,blueprint});
  assert.equal(second.projectId,input.projectId);const secondDoc=await loadMultiAgeDocument(db,teacher,'activity',second.activityId);assert.equal(secondDoc.sourceSnapshot.annualPlanId,active.id);assert.equal(secondDoc.content.projectTitle,edited.title);assert.match(secondDoc.content.criteriaFamilies[0].variants[0].criterion_text,/palabras o gestos/);
  const activity2Xml=await xml(await renderMultiAgePlanningWord(secondDoc));
  await t.test('un borrador anterior a otra actividad no puede confirmarse y se puede actualizar sin perder cambios',async()=>{
   const draft=await saveMultiAgeAnnualDraft(db,teacher,{...confirm(),classroomId:input.classroomId,sourceFingerprint:planning.sourceFingerprint,proposal:active.proposal});
   const third=await confirmMultiAgeActivity(db,teacher,{...confirm(),...input,expectedRevision:1,annualPlanId:active.id,annualSlotId:slot.slot_id,activityPosition:3,expectedProjectFingerprint:current.fingerprint,blueprint:{...blueprint,title:'Tercera actividad preparada y conservada',occursOn:slot.instructional_dates[2]}});
   await assert.rejects(confirmMultiAgeAnnualPlan(db,teacher,{...confirm(),classroomId:input.classroomId,planId:draft.planId,expectedRevision:draft.revision,reason:'Prueba de vigencia de las actividades.'}),/Actualiza el borrador/);
   const refreshed=await saveMultiAgeAnnualDraft(db,teacher,{...confirm(),classroomId:input.classroomId,sourceFingerprint:planning.sourceFingerprint,planId:draft.planId,expectedRevision:draft.revision,proposal:active.proposal});
   await confirmMultiAgeAnnualPlan(db,teacher,{...confirm(),classroomId:input.classroomId,planId:draft.planId,expectedRevision:refreshed.revision,reason:'Actualizar las fuentes conservando tres actividades.'});assert.ok(third.activityId);
  });
  assert.equal(await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'activity',f.activity.activityId))),oldActivity);assert.equal(await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'activity',second.activityId))),activity2Xml);
  assert.equal(await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'annual_plan',f.plan.planId))),oldAnnual);assert.equal(await xml(await renderFamilyReportWord(await multiAgeFamilyDocument(db,teacher,f.children[0].report.reportId),cards)),oldReport);
  const periodScope={classroomId:input.classroomId,periodId:f.period.id},overview=await multiAgePeriodOverview(db,teacher,periodScope),closed=await closeMultiAgePeriod(db,teacher,{...confirm(),...periodScope,expectedSourceFingerprint:overview.sourceFingerprint,expectedCurrentVersionId:null,pendingAcknowledged:true}),manifest=await loadMultiAgePeriodClosure(db,teacher,closed.closureVersionId);
  const latest=await multiAgeProjectEditContext(db,teacher,input);await assert.rejects(confirmMultiAgeProjectEdit(db,teacher,{...edit,clientRequestId:randomUUID(),expectedSourceFingerprint:latest.sourceFingerprint,expectedProjectFingerprint:latest.fingerprint,blueprint:{...edited,title:'Intento en período cerrado'}}),/Reabre/);
  planning=await multiAgeAnnualWorkspace(db,teacher,input.classroomId);const finalPlan=planning.plans.find(p=>p.status==='active');
  await assert.rejects(saveMultiAgeAnnualDraft(db,teacher,{...confirm(),classroomId:input.classroomId,sourceFingerprint:planning.sourceFingerprint,expectedBasePlanId:finalPlan.id,expectedBaseRevision:finalPlan.revision,reorder:{fromSlotId:finalPlan.proposal.proposals[1].slot_id,toSlotId:finalPlan.proposal.proposals[2].slot_id}}),/Reabre/);
  await reopenMultiAgePeriod(db,teacher,{...confirm(),...periodScope,expectedCurrentVersionId:closed.closureVersionId,reason:'Editar solo propuestas futuras conservando el cierre.'});
  await confirmMultiAgeProjectEdit(db,teacher,{...edit,clientRequestId:randomUUID(),expectedSourceFingerprint:latest.sourceFingerprint,expectedProjectFingerprint:latest.fingerprint,blueprint:{...edited,title:'Tercera versión futura del proyecto'}});
  assert.deepEqual(await loadMultiAgePeriodClosure(db,teacher,closed.closureVersionId),manifest);
  await assert.rejects(db.query('delete from multi_age_project_versions'),/inmutable/);await assert.rejects(db.query('delete from multi_age_annual_project_links'),/inmutable/);
  if(schema==='supabase'){
   await db.query('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.other]);assert.equal((await db.query('select * from multi_age_project_versions')).rows.length,0);assert.equal((await db.query('select * from multi_age_annual_project_links')).rows.length,0);
   await db.query("select set_config('request.jwt.claim.sub',$1,false)",[teacher]);assert.equal((await db.query('select * from multi_age_project_versions')).rows.length,2);await assert.rejects(db.query('delete from multi_age_project_versions'),/permission denied/);await db.query('reset role');
  }
 }finally{await db.close();}
});
