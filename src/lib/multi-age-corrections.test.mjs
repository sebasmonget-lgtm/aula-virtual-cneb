import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import JSZip from 'jszip';
import {makeMultiAgePeriodFixture} from '../../scripts/fixtures/multi-age-period-fixture.mjs';
import {documentFixtureRequest as confirm} from '../../scripts/fixtures/multi-age-document-fixture.mjs';
import {correctMultiAgeStudent,correctMultiAgeOrdinaryObservation,correctMultiAgeDiagnosticObservation,multiAgeCorrectionHistory} from './multi-age-corrections.mjs';
import {multiAgeLocalWorkspace,multiAgeAssessmentContext,multiAgeFamilyDocument,observeMultiAgeStudent,confirmMultiAgeGrade,confirmMultiAgeConclusion,confirmMultiAgeFamilyReport} from './multi-age-local-service.mjs';
import {multiAgeDiagnosticContext,multiAgeDiagnosticWorkspace,recordMultiAgeDiagnosticObservation,confirmMultiAgeDiagnosticReview,confirmMultiAgeFamilyContext} from './multi-age-diagnostic.mjs';
import {multiAgeAnnualWorkspace} from './multi-age-annual.mjs';
import {multiAgePeriodOverview,closeMultiAgePeriod,reopenMultiAgePeriod,multiAgePeriodExcel,loadMultiAgePeriodClosure} from './multi-age-period.mjs';
import {loadMultiAgeDocument} from './multi-age-document-service.mjs';
import {renderFamilyReportWord} from './family-report-word.mjs';
import {renderMultiAgePlanningWord} from './multi-age-planning-word.mjs';
import {loadKnowledgeBaseV4} from './knowledge-base-v4.mjs';
import {enqueueMultiAgeGeneration,runMultiAgeGenerationStep,loadMultiAgeGeneration} from './multi-age-generation-jobs.mjs';

const scope=f=>({classroomId:f.classroom.classroomId,periodId:f.period.id});
const close=async f=>{const o=await multiAgePeriodOverview(f.db,f.teacher,scope(f));return closeMultiAgePeriod(f.db,f.teacher,{...confirm(),...scope(f),expectedCurrentVersionId:o.closure.currentVersionId,expectedSourceFingerprint:o.sourceFingerprint,pendingAcknowledged:true});};
const xml=async(bytes,part='word/document.xml')=>(await JSZip.loadAsync(bytes)).file(part).async('string');
const family=async(f,id)=>xml(await renderFamilyReportWord(await multiAgeFamilyDocument(f.db,f.teacher,id),(await loadKnowledgeBaseV4()).competencyCards));
async function studentInput(f,child,changes={}){const w=await multiAgeLocalWorkspace(f.db,f.teacher,f.classroom.classroomId),s=w.students.find(s=>s.id===child.studentId);return {...confirm(),studentId:s.id,expectedAssignmentId:s.assignment_id,expectedStudentFingerprint:s.correction_fingerprint,firstName:s.first_name,lastName:s.last_name,preferredName:s.preferred_name,birthDate:s.birth_date,age:s.age,reason:'Corregir datos ficticios tras contrastarlos con la matrícula.',impactsAcknowledged:true,...changes};}

for(const schema of ['local','supabase'])test(`correcciones de matrícula ${schema}: nombre y grupo con historia, fuentes separadas y documentos intactos`,{timeout:100000},async t=>{
  const f=await makeMultiAgePeriodFixture({schema}),{db,teacher,children}=f,child=children[0];try{
    const first=await close(f),oldManifest=await loadMultiAgePeriodClosure(db,teacher,first.closureVersionId),oldExcel=await xml(await multiAgePeriodExcel(db,teacher,{closureVersionId:first.closureVersionId}),'xl/worksheets/sheet1.xml'),oldWord=await family(f,child.report.reportId);
    const oldDiagnostic=await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'diagnostic_student_review',child.reviewId)));
    const originalReport=(await multiAgeLocalWorkspace(db,teacher,f.classroom.classroomId)).reportHistory.find(r=>r.id===child.report.reportId);
    assert.equal(originalReport.age,3);assert.equal(originalReport.version,1);assert.equal(originalReport.status,'active');
    const nameInput=await studentInput(f,child,{firstName:'Nombre Corregido',birthDate:'2023-02-28'});
    await t.test('cerrado exige reapertura y otra docente no puede consultar ni corregir',async()=>{
      await assert.rejects(correctMultiAgeStudent(db,teacher,nameInput),/Reabre/);
      await assert.rejects(correctMultiAgeStudent(db,f.other,nameInput),/no está disponible/);
      await assert.rejects(correctMultiAgeStudent(db,teacher,{...nameInput,classroomId:randomUUID()}),/no está disponible/);
      await assert.rejects(multiAgeCorrectionHistory(db,f.other,child.studentId),/no está disponible/);
      await assert.rejects(multiAgeLocalWorkspace(db,f.other,f.classroom.classroomId),/no está disponible/);
      assert.equal((await multiAgeCorrectionHistory(db,teacher,child.studentId)).events.length,0);
    });
    await reopenMultiAgePeriod(db,teacher,{...confirm(),...scope(f),expectedCurrentVersionId:first.closureVersionId,reason:'Revisar la matrícula ficticia manteniendo el cierre anterior.'});
    const renamed=await correctMultiAgeStudent(db,teacher,nameInput);
    assert.equal((await correctMultiAgeStudent(db,teacher,nameInput)).replayed,true);
    assert.equal(renamed.assignmentId,child.assignmentId,'el nombre no cambia el grupo');
    assert.equal(await family(f,child.report.reportId),oldWord);
    const archivedReport=(await multiAgeLocalWorkspace(db,teacher,f.classroom.classroomId)).reportHistory.find(r=>r.id===child.report.reportId);
    assert.deepEqual(archivedReport,{...originalReport,status:'archived'},'Documentos conserva la identidad y el contenido del informe anterior');
    assert.equal((await multiAgeAssessmentContext(db,teacher,child.input)).sourceFingerprint,child.context.sourceFingerprint,'el nombre no modifica evidencia ni nota');
    assert.equal((await multiAgeDiagnosticWorkspace(db,teacher,f.classroom.classroomId)).students.find(s=>s.id===child.studentId).current,false);
    await assert.rejects(correctMultiAgeStudent(db,teacher,{...nameInput,clientRequestId:randomUUID()}),/matrícula cambió/);
    const ageInput=await studentInput(f,child,{age:4}),changed=await correctMultiAgeStudent(db,teacher,ageInput);
    assert.notEqual(changed.assignmentId,child.assignmentId);
    const history=await multiAgeCorrectionHistory(db,teacher,child.studentId);assert.deepEqual(history.assignments.map(a=>[a.age,a.status]),[[3,'archived'],[4,'active']]);assert.equal(history.events.length,2);
    assert.equal(history.ordinary[0].currentAssignment,false);assert.equal(history.diagnostic[0].currentAssignment,false);
    assert.equal((await multiAgeAssessmentContext(db,teacher,child.input)).sourceRows.length,0);
    assert.equal((await multiAgeDiagnosticContext(db,teacher,child.studentId)).sources.observations.length,0);
    assert.equal((await multiAgeAnnualWorkspace(db,teacher,f.classroom.classroomId)).plans.find(p=>p.id===f.plan.planId).current,false);
    assert.ok((await multiAgeLocalWorkspace(db,teacher,f.classroom.classroomId)).pairs.every(p=>p.studentId!==child.studentId));
    await assert.rejects(observeMultiAgeStudent(db,teacher,{...child.observationInput,clientRequestId:randomUUID()}),/criterio/);
    const w=await multiAgeLocalWorkspace(db,teacher,f.classroom.classroomId),own=w.criteria.find(c=>c.activity_id===f.activity.activityId&&c.curricular_age===4);
    await observeMultiAgeStudent(db,teacher,{...child.observationInput,clientRequestId:randomUUID(),criterionId:own.id,rawText:'Registro nuevo ficticio revisado para cuatro años, sin trasladar el anterior.'});
    const ctx=await multiAgeAssessmentContext(db,teacher,child.input);assert.equal(ctx.sourceRows.length,1);assert.equal(ctx.scope.age,4);
    const grade=await confirmMultiAgeGrade(db,teacher,{...confirm(),...child.input,sourceFingerprint:ctx.sourceFingerprint,achievementLevel:'A'});
    await confirmMultiAgeConclusion(db,teacher,{...confirm(),...child.input,assessmentId:grade.assessmentId,sourceFingerprint:ctx.sourceFingerprint,conclusionText:'Lectura nueva ficticia de cuatro años basada en la nueva observación.'});
    const report=await confirmMultiAgeFamilyReport(db,teacher,{...confirm(),studentId:child.studentId,periodId:f.period.id});assert.match(await family(f,report.reportId),/Nombre Corregido/);
    const reportWorkspace=await multiAgeLocalWorkspace(db,teacher,f.classroom.classroomId),versions=reportWorkspace.reportHistory.filter(r=>r.student_id===child.studentId);
    assert.deepEqual(versions.map(r=>[r.version,r.status,r.age]),[[2,'active',4],[1,'archived',3]]);
    assert.match(versions[0].title,/Nombre Corregido/);assert.equal(versions[1].title,originalReport.title);
    assert.equal(reportWorkspace.reports.filter(r=>r.student_id===child.studentId).length,1,'solo el informe vigente participa en Evaluar');
    const diagnostic=await multiAgeDiagnosticContext(db,teacher,child.studentId),experience=diagnostic.catalog.find(e=>e.aspects.some(a=>a.competency_id==='COM_ORAL')),aspect=experience.aspects.find(a=>a.competency_id==='COM_ORAL');
    const observation=await recordMultiAgeDiagnosticObservation(db,teacher,{...confirm(),studentId:child.studentId,expectedAssignmentId:changed.assignmentId,experienceId:experience.id,aspectId:aspect.id,observationText:'Registro diagnóstico nuevo para cuatro años.',observationStatus:'observed_without_judgment',observedOn:f.activity.blueprint.occursOn});
    const current=await multiAgeDiagnosticContext(db,teacher,child.studentId);
    await confirmMultiAgeDiagnosticReview(db,teacher,{...confirm(),studentId:child.studentId,expectedReviewId:child.reviewId,reason:'Revisar diagnóstico con la matrícula y la fuente corregidas.',sourceFingerprint:current.sourceFingerprint,pendingInformationAcknowledged:true,findings:[{competency_id:'COM_ORAL',observation_ids:[observation.observationId],teacher_reading:'Lectura ficticia nueva propia de cuatro años.',planning_priority:'consider'}]});
    const second=await close(f);assert.equal(second.version,2);
    assert.deepEqual(await loadMultiAgePeriodClosure(db,teacher,first.closureVersionId),oldManifest);
    assert.equal(await xml(await multiAgePeriodExcel(db,teacher,{closureVersionId:first.closureVersionId}),'xl/worksheets/sheet1.xml'),oldExcel);
    assert.equal(await family(f,child.report.reportId),oldWord);
    assert.equal(await xml(await renderMultiAgePlanningWord(await loadMultiAgeDocument(db,teacher,'diagnostic_student_review',child.reviewId))),oldDiagnostic);
    await assert.rejects(db.query("update multi_age_correction_events set reason='sobrescribir' where id=$1",[renamed.eventId]),/inmutable/);
    if(schema==='supabase'){
      await db.query('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.other]);
      assert.equal((await db.query('select * from multi_age_correction_events')).rows.length,0);assert.equal((await db.query('select * from multi_age_family_document_snapshots')).rows.length,0);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[teacher]);assert.equal((await db.query('select * from multi_age_correction_events')).rows.length,2);
      await assert.rejects(db.query('update students set first_name=$2 where id=$1',[child.studentId,'Cambio directo']),/servidor|Reabre|permission denied/);
      await db.query('reset role');
    }
  }finally{await db.close();}
});

for(const schema of ['local','supabase'])test(`observaciones cotidianas 3/4/5 ${schema}: corregir y retirar archiva solo derivados pertinentes, no pierde originales ni inventa notas`,{timeout:100000},async()=>{
  const f=await makeMultiAgePeriodFixture({schema}),{db,teacher}=f;try{
    for(const child of f.children){
      const history=await multiAgeCorrectionHistory(db,teacher,child.studentId),row=history.ordinary[0],beforeWord=await family(f,child.report.reportId);
      const input={...confirm(),studentId:child.studentId,observationId:row.id,expectedAssignmentId:child.assignmentId,expectedRevision:1,action:'correct',reason:'Corregir la transcripción ficticia conservando el registro original.',correctedText:`Texto ficticio corregido de ${child.age} años: eligió una pieza y lo expresó.`,criterionConfirmed:true,impactsAcknowledged:true};
      await correctMultiAgeOrdinaryObservation(db,teacher,input);assert.equal((await correctMultiAgeOrdinaryObservation(db,teacher,input)).replayed,true);
      await assert.rejects(correctMultiAgeOrdinaryObservation(db,teacher,{...input,clientRequestId:randomUUID()}),/versión|Recarga|cambió/);
      const ctx=await multiAgeAssessmentContext(db,teacher,child.input);assert.equal(ctx.sourceRows[0].observation_text,input.correctedText);assert.equal(ctx.sourceRows[0].criterion_id,child.criterionId);assert.equal(ctx.scope.age,child.age);
      const original=(await db.query('select raw_text,source_revision from ordinary_observations where id=$1',[row.id])).rows[0];assert.equal(original.raw_text,child.observationInput.rawText);assert.equal(original.source_revision,2);
      assert.equal((await db.query('select status from competency_assessments where id=$1',[child.grade.assessmentId])).rows[0].status,'archived');assert.equal(await family(f,child.report.reportId),beforeWord);
      const next=await confirmMultiAgeGrade(db,teacher,{...confirm(),...child.input,sourceFingerprint:ctx.sourceFingerprint,achievementLevel:'A'});
      await confirmMultiAgeConclusion(db,teacher,{...confirm(),...child.input,assessmentId:next.assessmentId,sourceFingerprint:ctx.sourceFingerprint,conclusionText:`Conclusión corregida ficticia de ${child.age} años.`});
    }
    const child=f.children[2],row=(await multiAgeCorrectionHistory(db,teacher,child.studentId)).ordinary[0];
    await correctMultiAgeOrdinaryObservation(db,teacher,{...confirm(),studentId:child.studentId,observationId:row.id,expectedAssignmentId:child.assignmentId,expectedRevision:2,action:'void',reason:'Registro ficticio duplicado: retirarlo del uso pedagógico.',impactsAcknowledged:true});
    assert.equal((await multiAgeAssessmentContext(db,teacher,child.input)).sourceRows.length,0);
    const o=await multiAgePeriodOverview(db,teacher,scope(f));assert.equal(o.progress.pending,1);assert.equal(o.progress.blockers,0);assert.equal(o.rows.find(r=>r.student_id===child.studentId).achievement_level,null);
    await close(f);assert.equal((await multiAgeCorrectionHistory(db,teacher,child.studentId)).ordinary[0].revisions.length,2);
    const other=f.children[0],otherRow=(await multiAgeCorrectionHistory(db,teacher,other.studentId)).ordinary[0];
    await assert.rejects(correctMultiAgeOrdinaryObservation(db,teacher,{...confirm(),studentId:other.studentId,observationId:otherRow.id,expectedAssignmentId:other.assignmentId,expectedRevision:2,action:'void',reason:'Prueba de cierre.',impactsAcknowledged:true}),/Reabre/);
  }finally{await db.close();}
});

for(const schema of ['local','supabase'])test(`diagnóstico 3/4/5 ${schema}: fuentes corregidas/retiradas invalidan lectura, año y propuesta IA; reconfirmación guarda motivo y versión`,{timeout:100000},async()=>{
  const f=await makeMultiAgePeriodFixture({schema}),{db,teacher}=f;try{
    const queued=await enqueueMultiAgeGeneration(db,teacher,{classroomId:f.classroom.classroomId,kind:'diagnostic',studentId:f.children[0].studentId},{mode:'fixture'});
    for(const child of f.children){
      const before=await multiAgeDiagnosticContext(db,teacher,child.studentId),input={...confirm(),studentId:child.studentId,observationId:child.observationId,expectedAssignmentId:child.assignmentId,expectedRevision:0,action:'correct',reason:'Rectificar la transcripción diagnóstica ficticia.',observationText:`Fuente corregida propia de ${child.age} años: pidió repetir el juego.`};
      await correctMultiAgeDiagnosticObservation(db,teacher,input);assert.equal((await correctMultiAgeDiagnosticObservation(db,teacher,input)).replayed,true);
      const current=await multiAgeDiagnosticContext(db,teacher,child.studentId);assert.notEqual(current.sourceFingerprint,before.sourceFingerprint);assert.equal(current.context.teacher_observations[0].text,input.observationText);
      assert.notEqual((await db.query('select observation_text from diagnostic_experience_observations where id=$1',[child.observationId])).rows[0].observation_text,input.observationText);
      const review={...confirm(),studentId:child.studentId,expectedReviewId:child.reviewId,reason:'Revisar la lectura diagnóstica tras corregir su fuente.',sourceFingerprint:current.sourceFingerprint,pendingInformationAcknowledged:true,findings:[{competency_id:'COM_ORAL',observation_ids:[child.observationId],teacher_reading:`Nueva lectura ficticia de ${child.age} años.`,planning_priority:'consider'}]};
      await assert.rejects(confirmMultiAgeDiagnosticReview(db,teacher,{...review,expectedReviewId:randomUUID()}),/versión/);
      await assert.rejects(confirmMultiAgeDiagnosticReview(db,teacher,{...review,reason:''}),/motivo/);
      const confirmed=await confirmMultiAgeDiagnosticReview(db,teacher,review);const history=await multiAgeCorrectionHistory(db,teacher,child.studentId);assert.equal(history.reviews.length,2);assert.equal(history.reviews[0].details.supersedes_id,child.reviewId);
      await correctMultiAgeDiagnosticObservation(db,teacher,{...input,clientRequestId:randomUUID(),expectedRevision:1,action:'void',reason:'Retirar fuente ficticia duplicada, conservando versiones.'});
      const withdrawn=await multiAgeDiagnosticContext(db,teacher,child.studentId);assert.equal(withdrawn.sources.observations.length,0);
      await assert.rejects(confirmMultiAgeDiagnosticReview(db,teacher,{...review,clientRequestId:randomUUID(),expectedReviewId:confirmed.reviewId,sourceFingerprint:withdrawn.sourceFingerprint}),/observaciones propias/);
      await confirmMultiAgeDiagnosticReview(db,teacher,{...confirm(),studentId:child.studentId,expectedReviewId:confirmed.reviewId,reason:'Dejar pendiente lo que no tiene evidencia vigente.',sourceFingerprint:withdrawn.sourceFingerprint,pendingInformationAcknowledged:true,findings:[]});
      assert.equal((await multiAgeCorrectionHistory(db,teacher,child.studentId)).diagnostic[0].action,'void');
    }
    assert.equal((await multiAgeAnnualWorkspace(db,teacher,f.classroom.classroomId)).plans.find(p=>p.id===f.plan.planId).current,false);
    let calls=0;await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:async()=>{calls++;throw new Error('No debe invocar IA con fuentes obsoletas.');}});
    assert.equal(calls,0);assert.equal((await loadMultiAgeGeneration(db,teacher,queued.id)).status,'stale');
    const child=f.children[0],context=await multiAgeDiagnosticContext(db,teacher,child.studentId);
    await assert.rejects(confirmMultiAgeFamilyContext(db,teacher,{...confirm(),studentId:child.studentId,expectedAssignmentId:child.assignmentId,familyText:'Texto familiar nuevo ficticio.'}),/contexto familiar/);
    await confirmMultiAgeFamilyContext(db,teacher,{...confirm(),studentId:child.studentId,expectedAssignmentId:child.assignmentId,expectedInterviewId:context.sources.family.id,reason:'Corregir un dato del relato familiar, sin tratarlo como evidencia.',familyText:'La familia rectifica un dato ficticio de su relato.'});
    assert.equal((await multiAgeDiagnosticContext(db,teacher,child.studentId)).context.teacher_observations.length,0);
  }finally{await db.close();}
});
