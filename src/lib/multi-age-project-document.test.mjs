import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import JSZip from 'jszip';
import {makeMultiAgeDocumentFixture,documentFixtureRequest as confirm} from '../../scripts/fixtures/multi-age-document-fixture.mjs';
import {addActivityDocumentFixture} from '../../scripts/fixtures/multi-age-activity-document-fixture.mjs';
import {loadMultiAgeDocument,listMultiAgeDocuments,loadDocumentGeneratorProjectExport} from './multi-age-document-service.mjs';
import {renderMultiAgePlanningWord} from './multi-age-planning-word.mjs';
import {documentGeneratorSavedFilename} from './document-generator-downloads.mjs';
import {buildDocumentGeneratorProjectZip} from './document-generator-project-zip.mjs';
import {multiAgeProjectEditContext,confirmMultiAgeProjectEdit} from './multi-age-project-edit.mjs';
import {confirmMultiAgeActivity} from './multi-age-local-service.mjs';
import {multiAgeAnnualWorkspace,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan} from './multi-age-annual.mjs';

const xml=async bytes=>(await JSZip.loadAsync(bytes)).file('word/document.xml').async('string');
const sources=async db=>(await db.query(`select 'project' as kind,id,to_jsonb(p) as data from learning_experiences p
 union all select 'activity',id,to_jsonb(a) from activities a union all select 'criterion',id,to_jsonb(c) from activity_criteria c
 union all select 'observation',id,to_jsonb(o) from ordinary_observations o union all select 'jobs',id,to_jsonb(j) from multi_age_generation_jobs j order by kind,id`)).rows;

for(const schema of ['local','supabase'])test(`Word del proyecto e índice ${schema}: versiones exactas, edades, historial y lectura privada`,{timeout:100000},async t=>{
 const f=await makeMultiAgeDocumentFixture({schema}),{db,teacher}=f;
 try{
  const a=await addActivityDocumentFixture(f),scope={classroomId:f.classroom.classroomId,projectId:a.projectId};
  const original=await loadMultiAgeDocument(db,teacher,'project',a.projectId),oldXml=await xml(await renderMultiAgePlanningWord(original)),oldActivity=await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'activity',a.activityId)));
  const zip=await JSZip.loadAsync(await renderMultiAgePlanningWord(original));assert.match((await Promise.all(Object.keys(zip.files).filter(p=>/^word\/header\d+\.xml$/.test(p)).map(p=>zip.file(p).async('string')))).join(''),/PROYECTO/);
  for(const age of [3,4,5]){assert.match(oldXml,new RegExp(`${age} años`));const ref=original.curriculumReference.find(r=>r.age===age);assert.equal(ref.official_performances.length,2);assert.ok(ref.official_performances.every(p=>p.age===age&&p.competency_id==='COM_ORAL'));}
  assert.doesNotMatch(oldXml,/undefined|\[object Object\]|Registro ficticio|La familia del niño|Ana Ficticio|Bruno Ficticio|Clara Ficticio/);
  const context=await multiAgeProjectEditContext(db,teacher,scope),blueprint=structuredClone(a.blueprint);blueprint.title='Proyecto revisado para compartir elecciones';blueprint.criteriaFamilies[0].variants[0].criterion_text='Comunica lo que desea jugar con palabras y gestos.';
  const revision=await confirmMultiAgeProjectEdit(db,teacher,{...confirm(),...scope,expectedSourceFingerprint:context.sourceFingerprint,expectedProjectFingerprint:context.fingerprint,blueprint,preservedActivitiesAcknowledged:true,reason:'Afinar el proyecto para actividades futuras conservando las preparadas.'});
  const current=await loadMultiAgeDocument(db,teacher,'project',revision.projectVersionId),newXml=await xml(await renderMultiAgePlanningWord(current));
  assert.equal(current.version,2);assert.equal(current.content.title,blueprint.title);assert.match(newXml,/Comunica lo que desea jugar/);assert.notEqual(oldXml,newXml);
  assert.deepEqual((await loadDocumentGeneratorProjectExport(db,teacher,revision.projectVersionId)).activityRoute,[],'una edición nueva no copia actividades de la anterior');
  const planning=await multiAgeAnnualWorkspace(db,teacher,scope.classroomId),plan=planning.plans.find(p=>p.status==='active'),slot=plan.document_context.calendar.projects[0];
  const second=await confirmMultiAgeActivity(db,teacher,{...confirm(),...scope,expectedRevision:1,annualPlanId:plan.id,annualSlotId:slot.slot_id,expectedProjectFingerprint:revision.projectFingerprint,activityPosition:2,blueprint:{...blueprint,title:'Otra actividad conservada',occursOn:slot.instructional_dates[1]}});
  await t.test('ZIP privado reúne solo el maestro y las actividades de esa edición sin escribir fuentes',async()=>{
   await assert.rejects(buildDocumentGeneratorProjectZip(db,teacher,a.projectId),/no está disponible/,'el modo diario conserva su alcance');
   const preferences=(await db.query('select preferences from profiles where user_id=$1',[teacher])).rows[0].preferences;
   await db.query("update profiles set preferences=jsonb_set(coalesce(preferences,'{}'::jsonb),'{ayni_product_mode}','\"documents\"'::jsonb) where user_id=$1",[teacher]);
   try{
    const before=await sources(db);
    for(const [id,activityId,prefix]of [[a.projectId,a.activityId,'P01'],[revision.projectVersionId,second.activityId,'P01-v02']]){
     const result=await buildDocumentGeneratorProjectZip(db,teacher,id),zip=await JSZip.loadAsync(result.bytes),files=Object.keys(zip.files).filter(name=>!zip.files[name].dir);
     assert.equal(result.activityCount,1);assert.equal(files.length,2);assert.ok(result.filename.startsWith(prefix+' - '));assert.ok(result.filename.endsWith('.zip'));
     assert.ok(files[0].startsWith(`01 Proyecto/${prefix} - `));assert.ok(files[1].startsWith(`02 Actividades/${prefix} - A0`));
     const activity=await loadMultiAgeDocument(db,teacher,'activity',activityId);
     assert.equal(await xml(await zip.file(files[1]).async('nodebuffer')),await xml(await renderMultiAgePlanningWord(activity,{practical:true})));
     assert.match(await xml(await zip.file(files[0]).async('nodebuffer')),/Ruta breve de actividades/);
     assert.ok(!files.some(name=>name.includes('..')||name.includes('\\')));
    }
    assert.deepEqual(await sources(db),before);
    await assert.rejects(buildDocumentGeneratorProjectZip(db,f.other,a.projectId),/no está disponible/);
    await assert.rejects(buildDocumentGeneratorProjectZip(db,teacher,randomUUID()),/no está disponible/);
   }finally{await db.query('update profiles set preferences=$1::jsonb where user_id=$2',[JSON.stringify(preferences),teacher]);}
  });
  await t.test('ruta breve usa solo actividades propias de cada edición y no modifica las fuentes',async()=>{
   const before=await sources(db);
   for(const [id,activityId,baseXml]of [[a.projectId,a.activityId,oldXml],[revision.projectVersionId,second.activityId,newXml]]){
    const prepared=await loadDocumentGeneratorProjectExport(db,teacher,id);
    assert.equal(prepared.activityRoute.length,1);assert.equal(prepared.activityRoute[0].id,activityId);
    const activity=await loadMultiAgeDocument(db,teacher,'activity',activityId),item=prepared.activityRoute[0];
    assert.match(await documentGeneratorSavedFilename(db,teacher,prepared.document),id===a.projectId?/^P01 - /:/^P01-v02 - /);
    assert.match(await documentGeneratorSavedFilename(db,teacher,activity),id===a.projectId?/^P01 - A01 - /:/^P01-v02 - A02 - /);
    assert.equal(item.title,activity.content.title);assert.equal(item.purpose,activity.content.purpose);assert.equal(item.date,activity.content.occursOn);
    assert.deepEqual(Object.keys(item).sort(),['id','position','date','title','purpose','materials','competencies'].sort());
    assert.deepEqual(item.materials,[],'Una actividad histórica sin materiales propios no inventa recursos para la ruta.');
    assert.equal(item.competencies.length,new Set(activity.curriculumReference.map(r=>r.competency_id)).size);
    const routeXml=await xml(await renderMultiAgePlanningWord(prepared.document,{activityRoute:prepared.activityRoute}));
    assert.match(routeXml,/Ruta breve de actividades/);assert.match(routeXml,/Actividad y propósito/);assert.ok(routeXml.includes(item.title));
    assert.equal(await xml(await renderMultiAgePlanningWord(prepared.document)),baseXml,'la opción no altera el maestro por defecto');
   }
   assert.deepEqual(await sources(db),before);
   await assert.rejects(loadDocumentGeneratorProjectExport(db,f.other,a.projectId),/no está disponible/);
  });
  await t.test('índice agrupa por edición utilizada sin duplicar ni reparentar actividades',async()=>{
   const before=await sources(db),index=await listMultiAgeDocuments(db,teacher,{classroomId:scope.classroomId});assert.deepEqual(await sources(db),before);
   assert.equal(index.filter(d=>d.kind==='project').length,2);assert.equal(index.filter(d=>d.kind==='activity').length,2);assert.equal(index.find(d=>d.id===a.projectId).historical,true);
   assert.equal(index.find(d=>d.id===a.activityId).projectDocumentId,a.projectId);assert.equal(index.find(d=>d.id===a.activityId).projectVersion,1);
   assert.equal(index.find(d=>d.id===second.activityId).projectDocumentId,revision.projectVersionId);assert.equal(index.find(d=>d.id===second.activityId).projectVersion,2);assert.equal(index.find(d=>d.id===second.activityId).position,2);
   assert.ok(index.filter(d=>['project','activity'].includes(d.kind)).every(d=>d.exportReady&&d.ages.join(',')==='3,4,5'));
   assert.equal(await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'project',revision.projectVersionId))),newXml,'el índice nuevo no reescribe el Word');
  });
  await t.test('reorganizar Mi año, cambiar nombres y archivar aula conserva ambos Word',async()=>{
   const draft=await saveMultiAgeAnnualDraft(db,teacher,{...confirm(),classroomId:scope.classroomId,sourceFingerprint:planning.sourceFingerprint,expectedBasePlanId:plan.id,expectedBaseRevision:plan.revision,reorder:{fromSlotId:plan.proposal.proposals[13].slot_id,toSlotId:plan.proposal.proposals[14].slot_id}});
   await confirmMultiAgeAnnualPlan(db,teacher,{...confirm(),classroomId:scope.classroomId,planId:draft.planId,expectedRevision:draft.revision,reason:'Reorganizar tramos libres sin alterar sus documentos.'});
   await db.query("update profiles set display_name='Nombre posterior' where user_id=$1",[teacher]);await db.query("update classrooms set section='Nombre posterior',institution_name='Institución posterior',status='archived' where id=$1",[scope.classroomId]);
   const before=await sources(db);for(const [id,body]of [[a.projectId,oldXml],[revision.projectVersionId,newXml]])assert.equal(await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'project',id))),body);
   assert.equal(await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'activity',a.activityId))),oldActivity);assert.deepEqual(await sources(db),before);
   const docs=await listMultiAgeDocuments(db,teacher);assert.ok(docs.filter(d=>['project','activity'].includes(d.kind)).every(d=>d.historical));
  });
  await t.test('autorización en servidor y RLS no expone proyectos de otra docente o contratos V1',async()=>{
   await assert.rejects(loadMultiAgeDocument(db,f.other,'project',revision.projectVersionId),/no está disponible/);assert.equal((await listMultiAgeDocuments(db,f.other)).length,0);
   for(const id of ['invalido',randomUUID(),f.plan.planId,a.activityId])await assert.rejects(loadMultiAgeDocument(db,teacher,'project',id),/no está disponible/);
   if(schema==='supabase'){
    await db.query('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.other]);assert.equal((await listMultiAgeDocuments(db,teacher)).length,0);await assert.rejects(loadMultiAgeDocument(db,teacher,'project',revision.projectVersionId),/no está disponible/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[teacher]);assert.equal((await loadMultiAgeDocument(db,teacher,'project',revision.projectVersionId)).version,2);await db.query('reset role');
   }
  });
 }finally{await db.close();}
});
