import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { openMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { createPilotClassroom, importStudentsForTeacher } from './pilot-onboarding-service.mjs';
import { createMultiAgeClassroom, enrollMultiAgeStudent, confirmMultiAgeActivity } from './multi-age-local-service.mjs';
import { loadAyniProductMode, chooseAyniProductMode } from './ayni-product-mode.mjs';
import { loadDocumentGeneratorContext, generatorDocumentSelection, generatorWorkshops, GENERATOR_FORMATS } from './document-generator-service.mjs';
import { renderGeneratorFormat, renderGeneratorWorkshop } from './document-generator-word.mjs';
import { multiAgeAnnualContext, saveMultiAgeAnnualDraft,validateMultiAgeAnnualProposal } from './multi-age-annual.mjs';
import { enqueueMultiAgeGeneration, loadMultiAgeGeneration, runMultiAgeGenerationStep } from './multi-age-generation-jobs.mjs';
import { multiAgeProviderForJob } from '../../scripts/multi-age-ai-runtime.mjs';
import { loadMultiAgeDocument } from './multi-age-document-service.mjs';
import { renderMultiAgePlanningWord } from './multi-age-planning-word.mjs';
import {useDocumentGeneratorYear} from './document-generator-year.mjs';
import {proposeLocalMultiAgeAnnual} from './multi-age-planning-generation.mjs';
import {prepareDocumentGeneratorConversation} from './multi-age-planning-decisions.mjs';

const id=()=>randomUUID();
const request=()=>({clientRequestId:id(),teacherConfirmed:true});
const sample={teacherName:'Profesora ficticia',institutionName:'Jardín de prueba',section:'Exploradores',age:4,year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18',castellanoL2Applicable:false,religionApplicable:false};

test('modalidad durable, aislamiento y siete formatos sin resultados inventados', {timeout:90000}, async t=>{
  const db=await openMultiAgeLocalDb(),teacher=id(),other=id();
  try {
    assert.deepEqual(await loadAyniProductMode(db,teacher),{mode:null,chosen:false});
    await chooseAyniProductMode(db,teacher,{mode:'documents'});
    await db.query("update profiles set preferences=preferences||'{\"unrelated\":true}'::jsonb where user_id=$1",[teacher]);
    await chooseAyniProductMode(db,teacher,{mode:'documents'});
    assert.equal((await db.query('select preferences from profiles where user_id=$1',[teacher])).rows[0].preferences.unrelated,true);
    await assert.rejects(()=>chooseAyniProductMode(db,teacher,{mode:'daily'}),/modalidad/);
    await assert.rejects(()=>chooseAyniProductMode(db,teacher,{mode:'documents',teacherId:other}),/Elige/);
    await createPilotClassroom(db,teacher,sample);
    await importStudentsForTeacher(db,teacher,[{firstName:'Ana',lastName:'Prueba',birthDate:null},{firstName:'Lucía',lastName:'Ejemplo',birthDate:null}]);
    await createPilotClassroom(db,other,{...sample,institutionName:'Otra institución'});
    assert.deepEqual(await loadAyniProductMode(db,other),{mode:'daily',chosen:true});
    await assert.rejects(()=>loadDocumentGeneratorContext(db,other),/no usa/);
    await assert.rejects(()=>chooseAyniProductMode(db,other,{mode:'documents'}),/modalidad/);
    const ownClass=(await db.query("select id from classrooms where teacher_id=$1 and status='active'",[teacher])).rows[0];
    await db.query(`insert into ai_pending_generations(id,classroom_id,workflow,payload,created_at,expires_at)
      values($1,$2,'annual_journey_conversation',$3::jsonb,now(),now()+interval '1 day')`,[id(),ownClass.id,
      JSON.stringify({teacher_id:teacher,teacher_texts:['Una idea que luego retiré.'],context_draft:{value:{contextItems:[{text:'El aula dispone de patio.'}]}}})]);
    const c=await loadDocumentGeneratorContext(db,teacher);
    assert.deepEqual(c.planningContext,['El aula dispone de patio.']);
    assert.deepEqual(c.ages,[4]);assert.equal(c.students.length,2);assert.equal(c.institution,sample.institutionName);
    assert.throws(()=>generatorDocumentSelection(c,{studentId:id()}),/no pertenece/);
    assert.throws(()=>generatorDocumentSelection(c,{period:'5'}),/bimestre/);
    assert.throws(()=>generatorDocumentSelection(c,{month:'13'}),/mes/);
    const selected=generatorDocumentSelection(c,{studentId:c.students.find(s=>s.name==='Ana Prueba').id,period:'2',month:'4'});
    const dir=process.env.AYNI_GENERATOR_QA_OUTPUT;
    if(dir)await mkdir(dir,{recursive:true});
    for(const f of GENERATOR_FORMATS)await t.test(f.id,async()=>{
      const bytes=await renderGeneratorFormat(f.id,selected),zip=await JSZip.loadAsync(bytes),xml=await zip.file('word/document.xml').async('string');
      assert.ok(xml.includes('Ana Prueba'));assert.ok(!xml.includes('Lucía Ejemplo'));assert.ok(xml.includes('Jardín de prueba'));
      assert.ok(!xml.includes('[object Object]'));assert.ok(!xml.includes('undefined'));
      assert.ok(!xml.includes('{{'));assert.ok(!xml.includes('Otra institución'));
      assert.ok(!xml.includes('Una idea que luego retiré.'));
      if(f.id==='diagnostic')assert.ok(!xml.includes('El aula dispone de patio.'),'La conversación para planificar no se copia como hallazgo diagnóstico.');
      if(f.id==='attendance'){const geometry=/<w:pgSz[^>]*w:w="(\d+)"[^>]*w:h="(\d+)"/.exec(xml);assert.ok(geometry);assert.ok(Number(geometry[1])>Number(geometry[2]),'Asistencia debe tener una página horizontal real.');}
      if(['family','conclusions'].includes(f.id)){const headers=(await Promise.all(Object.keys(zip.files).filter(name=>/^word\/header\d+\.xml$/.test(name)).map(name=>zip.file(name).async('string')))).join('');assert.ok(headers.includes('Ana Prueba')&&headers.includes('4 años'),'La cabecera repetida identifica al estudiante y su edad.');}
      if(dir)await writeFile(`${dir}/${f.id}.docx`,bytes);
    });
    const w=generatorWorkshops(c,4)[0],bytes=await renderGeneratorWorkshop(w,selected),xml=await (await JSZip.loadAsync(bytes)).file('word/document.xml').async('string');
    assert.ok(xml.includes(w.opening.children));assert.ok(xml.includes(w.development.teacher));assert.ok(xml.includes('Ana Prueba'));
    assert.throws(()=>generatorWorkshops(c,3),/edad de tu aula/);
    if(dir)await writeFile(`${dir}/workshop.docx`,bytes);
    assert.equal((await db.query('select count(*)::int n from ordinary_observations')).rows[0].n,0);
    assert.equal((await db.query('select count(*)::int n from diagnostic_experience_observations')).rows[0].n,0);
  } finally {await db.close();}
});

test('multiedad prepara y confirma el año sin diagnóstico solo en documentos', {timeout:90000}, async()=>{
  const db=await openMultiAgeLocalDb(),teacher=id(),daily=id();
  try {
    await chooseAyniProductMode(db,teacher,{mode:'documents'});
    const create=async owner=>createMultiAgeClassroom(db,owner,{...request(),teacherName:'Profesora de prueba',ages:[3,4,5],section:'Multiedad',institutionName:'Jardín ficticio',year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'});
    const c=await create(teacher);
    await assert.rejects(()=>enqueueMultiAgeGeneration(db,teacher,{clientRequestId:id(),kind:'annual',classroomId:c.classroomId},{mode:'fixture'}),/Agrega/);
    for(const age of [3,4,5])await enrollMultiAgeStudent(db,teacher,{...request(),classroomId:c.classroomId,expectedRevision:1,firstName:`Niño ${age}`,lastName:'Ficticio',age});
    const context=await loadDocumentGeneratorContext(db,teacher);
    assert.deepEqual(context.students.map(s=>s.age),[3,4,5]);
    const childSelection=generatorDocumentSelection(context,{studentId:context.students[0].id});
    assert.deepEqual(childSelection.ages,[3]);assert.deepEqual(childSelection.competencies.map(group=>group.age),[3]);
    const childDiagnostic=await JSZip.loadAsync(await renderGeneratorFormat('diagnostic',childSelection));
    const childXml=await childDiagnostic.file('word/document.xml').async('string');
    assert.ok(childXml.includes('Grupo de 3 años'));assert.ok(!childXml.includes('Grupo de 4 años'));assert.ok(!childXml.includes('Grupo de 5 años'));
    assert.ok((await multiAgeAnnualContext(db,teacher,c.classroomId)).context.document_generation_mode);
    const job=await enqueueMultiAgeGeneration(db,teacher,{clientRequestId:id(),kind:'annual',classroomId:c.classroomId},{mode:'fixture'});
    const annualFixture=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'fixture'});
    await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:async queued=>{const remaining=Number((await db.query('select extract(epoch from lease_until-now()) seconds from multi_age_generation_jobs where id=$1',[queued.id])).rows[0].seconds);assert.ok(remaining>650&&remaining<=660,'La reserva del año documental debe cubrir el timeout de diez minutos.');return annualFixture(queued);}});
    const prepared=await loadMultiAgeGeneration(db,teacher,job.id);assert.equal(prepared.status,'ready',prepared.errorCode??'Propuesta pendiente');
    assert.equal(new Set(prepared.result.output.proposals.map(p=>p.title)).size,15,'La muestra debe tener quince temas distintos.');
    assert.ok(prepared.result.output.proposals.every(p=>!/^Invitación compartida \d+$/.test(p.title)),'La muestra del generador no debe mostrar los títulos técnicos del fixture.');
    assert.equal(new Set(prepared.result.output.proposals.map(p=>p.purpose)).size,15,'Cada tema debe tener un propósito propio.');
    const data=await multiAgeAnnualContext(db,teacher,c.classroomId);
    assert.ok(prepared.result.output.proposals.every(p=>[3,4,5].every(age=>new Set(p.opportunities.filter(o=>o.age===age).map(o=>o.competency_id)).size>=2)));
    const incomplete=structuredClone(prepared.result.output);incomplete.proposals[0].opportunities=incomplete.proposals[0].opportunities.filter(o=>o.competency_id==='COM_ORAL');
    assert.throws(()=>validateMultiAgeAnnualProposal(incomplete,data),/al menos dos competencias/);
    const draft=await saveMultiAgeAnnualDraft(db,teacher,{...request(),classroomId:c.classroomId,proposal:prepared.result.output,sourceFingerprint:data.sourceFingerprint,generationJobId:job.id});
    await useDocumentGeneratorYear(db,teacher,{...request(),classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision});
    const again=await useDocumentGeneratorYear(db,teacher,{...request(),classroomId:c.classroomId,generationJobId:job.id});assert.equal(again.planId,draft.planId);
    const annual=await loadMultiAgeDocument(db,teacher,'annual_plan',draft.planId);
    assert.ok((await renderMultiAgePlanningWord(annual)).length>1000);
    const position=prepared.result.output.proposals[0],activityInput={classroomId:c.classroomId,annualPlanId:draft.planId,annualSlotId:position.slot_id,
      occursOn:data.calendar.projects[0].instructional_dates[0],competencyIds:[...new Set(position.opportunities.map(o=>o.competency_id))]};
    const activityJob=await enqueueMultiAgeGeneration(db,teacher,{clientRequestId:id(),kind:'activity',...activityInput},{mode:'fixture'});
    const projectFixture=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'fixture'});
    await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:async queued=>{
      const provider=await projectFixture(queued);
      return {generate:async request=>{const response=await provider.generate(request);
        // Narrow only the first day's focus in the current keyed wire format;
        // the master retains every competency and the daily route stays aligned.
        const [focus,family]=Object.entries(response.output.criteriaFamilies)[0];
        response.output.criteriaFamilies={[focus]:family};
        if(response.output.projectPlanning.dailyRoute)response.output.projectPlanning.dailyRoute[0].competencyIds=[focus];
        return response;}};
    }});
    const activity=await loadMultiAgeGeneration(db,teacher,activityJob.id);assert.equal(activity.status,'ready',activity.errorCode??'Actividad pendiente');
    const saved=await confirmMultiAgeActivity(db,teacher,{...request(),...activityInput,expectedRevision:1,blueprint:activity.result.proposal,generationJobId:activityJob.id});
    const activityDocument=await loadMultiAgeDocument(db,teacher,'activity',saved.activityId);
    const projectDocument=await loadMultiAgeDocument(db,teacher,'project',saved.projectId);
    assert.equal(projectDocument.content.title,position.title,'El proyecto conserva el título anual, aunque su primera actividad tenga otro.');
    assert.equal(activityDocument.content.title,activity.result.proposal.title);
    assert.notEqual(projectDocument.content.title,activityDocument.content.title);
    assert.ok(projectDocument.content.criteriaFamilies.length>=2,'El proyecto conserva dos competencias aunque la primera actividad solo desarrolle una.');
    assert.equal(activityDocument.content.criteriaFamilies.length,1);
    assert.ok((await renderMultiAgePlanningWord(activityDocument)).length>1000);
    const beforeEditorial=(await db.query('select proposal,document_context,revision,status from annual_plans where id=$1',[draft.planId])).rows[0];
    const enriched=structuredClone(prepared.result.output);
    for(const row of enriched.proposals){row.summary='Sinopsis para una propuesta nueva.';row.rationale='Relación con el contexto disponible.';for(const opportunity of row.opportunities)opportunity.supports='Ofrecer dos maneras de participar.';}
    const editorial=await proposeLocalMultiAgeAnnual(db,teacher,c.classroomId,{provider:{generate:async request=>{assert.equal(request.ai_context_bundle.protected_annual_positions[0].slot_id,position.slot_id);return {output:enriched};}}});
    assert.deepEqual(editorial.output.proposals[0],prepared.result.output.proposals[0],'La nueva política conserva exactamente el tramo cuyo proyecto ya se preparó.');
    assert.ok(editorial.output.proposals[1].summary,'Los tramos nuevos sí tienen campos editoriales.');
    assert.deepEqual((await db.query('select proposal,document_context,revision,status from annual_plans where id=$1',[draft.planId])).rows[0],beforeEditorial,'Proponer no escribe sobre el año guardado.');
    await enqueueMultiAgeGeneration(db,teacher,{clientRequestId:id(),kind:'conversation',classroomId:c.classroomId,expectedRevision:0,text:'Ahora prioriza cuentos y juegos de convivencia en los proyectos futuros.'},{mode:'fixture'});
    await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'fixture'})});
    await prepareDocumentGeneratorConversation(db,teacher,{...request(),classroomId:c.classroomId});
    const nextJob=await enqueueMultiAgeGeneration(db,teacher,{clientRequestId:id(),kind:'annual',classroomId:c.classroomId},{mode:'fixture'});
    await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'fixture'})});
    const next=await loadMultiAgeGeneration(db,teacher,nextJob.id);assert.equal(next.status,'ready');
    assert.deepEqual(next.result.output.proposals[0],prepared.result.output.proposals[0],'Regenerar la muestra conserva el tramo con actividad preparada.');
    await assert.rejects(()=>useDocumentGeneratorYear(db,daily,{...request(),classroomId:c.classroomId,generationJobId:nextJob.id}));
    const updated=await useDocumentGeneratorYear(db,teacher,{...request(),classroomId:c.classroomId,generationJobId:nextJob.id});
    assert.notEqual(updated.planId,draft.planId);
    assert.equal((await useDocumentGeneratorYear(db,teacher,{...request(),classroomId:c.classroomId,generationJobId:nextJob.id})).planId,updated.planId);
    const versions=(await db.query('select id,status from annual_plans where classroom_id=$1',[c.classroomId])).rows;
    assert.equal(versions.length,2);assert.equal(versions.find(p=>p.id===draft.planId).status,'archived');assert.ok(!versions.some(p=>p.status==='draft'));
    await db.query("insert into profiles(user_id,display_name) values($1,'Docente diaria')",[daily]);
    const d=await create(daily);
    await enrollMultiAgeStudent(db,daily,{...request(),classroomId:d.classroomId,expectedRevision:1,firstName:'Otro',lastName:'Ficticio',age:3});
    await assert.rejects(()=>enqueueMultiAgeGeneration(db,daily,{clientRequestId:id(),kind:'annual',classroomId:d.classroomId},{mode:'fixture'}),/Revisa las fuentes/);
    assert.equal((await db.query('select count(*)::int n from diagnostic_experience_observations')).rows[0].n,0);
  } finally {await db.close();}
});
