import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {startMultiAgeHttpFixture as start,stopMultiAgeHttpFixture as stop,multiAgeHttpFixtureClient as client} from './fixtures/multi-age-http-fixture.mjs';
const confirm=()=>({teacherConfirmed:true,clientRequestId:randomUUID()}),p='/api/multi-age';
const xml=async(bytes,part)=>(await JSZip.loadAsync(bytes)).file(part).async('string');

test('API persistente: corregir matrícula, registros y diagnóstico 3/4/5; reiniciar, revisar, recerrar y descargar originales',{timeout:150000},async()=>{
  const storeName='corrections-'+randomUUID();let app=await start(storeName),c=client(app);
  const download=async path=>{const response=await fetch(app.origin+p+path);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');return Buffer.from(await response.arrayBuffer());};
  try{
    assert.equal((await c.get('/api/curriculum/entry')).contract,null,'solo una base nueva ficticia');
    const classroom=await c.post(p+'/classroom',{...confirm(),teachingMode:'single_teacher_multi_age',teacherName:'Docente ficticia de correcciones',ages:[3,4,5],section:'Unidocencia correcciones 3 4 5',institutionName:'Jardín ficticio aislado',year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'}),children=[];
    for(const age of [3,4,5]){
      const child={...await c.post(p+'/enroll',{...confirm(),classroomId:classroom.classroomId,expectedRevision:1,age,firstName:`Prueba ${age}`,lastName:'Correcciones ficticias'}),age};children.push(child);
      const source=(await c.get(p+'/state')).diagnostic.students.find(s=>s.id===child.studentId),experience=source.catalog.find(e=>e.aspects.some(a=>a.competency_id==='COM_ORAL')),aspect=experience.aspects.find(a=>a.competency_id==='COM_ORAL');
      child.diagnostic=await c.post(p+'/diagnostic/observe',{...confirm(),studentId:child.studentId,expectedAssignmentId:child.assignmentId,experienceId:experience.id,aspectId:aspect.id,observedOn:'2026-03-16',observationStatus:'observed_without_judgment',observationText:`Fuente diagnóstica ficticia de ${age} años: pidió un cuento.`});
      const current=await c.get(p+`/diagnostic/context?studentId=${child.studentId}`);
      child.review=await c.post(p+'/diagnostic/review',{...confirm(),studentId:child.studentId,sourceFingerprint:current.sourceFingerprint,pendingInformationAcknowledged:true,findings:[{competency_id:'COM_ORAL',observation_ids:[child.diagnostic.observationId],teacher_reading:`Lectura original ficticia de ${age} años.`,planning_priority:'consider'}]});
    }
    let state=await c.get(p+'/state');const plan=await c.post(p+'/annual/draft',{...confirm(),classroomId:classroom.classroomId,sourceFingerprint:state.planning.sourceFingerprint,proposal:state.planning.exampleProposal});
    await c.post(p+'/annual/confirm',{...confirm(),classroomId:classroom.classroomId,planId:plan.planId,expectedRevision:plan.revision});
    state=await c.get(p+'/state');const saved=state.planning.plans[0],slot=saved.document_context.calendar.projects[0],proposal=saved.proposal.proposals[0];
    const blueprint={title:'Elegimos un cuento y conversamos',purpose:proposal.purpose,occursOn:slot.instructional_dates[0],participantAges:[3,4,5],commonSequence:{opening:proposal.common_invitation,development:proposal.one_teacher_organization,closure:'Compartir elecciones sin exigir respuestas.'},criteriaFamilies:[{competency_id:'COM_ORAL',variants:proposal.opportunities.filter(o=>o.competency_id==='COM_ORAL').map(o=>({curricular_age:o.age,criterion_text:o.child_action,expected_evidence:o.observation,observation_moments:['development'],official_performance_refs:o.official_performance_refs}))}]};
    const activity=await c.post(p+'/activity',{...confirm(),classroomId:classroom.classroomId,expectedRevision:1,annualPlanId:plan.planId,annualSlotId:slot.slot_id,blueprint});
    state=await c.get(p+'/state');const period=state.workspace.periods.find(v=>v.starts_on<=blueprint.occursOn&&v.ends_on>=blueprint.occursOn),scope={classroomId:classroom.classroomId,periodId:period.id};
    const overview=()=>c.get(p+`/periods/overview?classroomId=${scope.classroomId}&periodId=${scope.periodId}`);
    const context=child=>c.get(p+`/context?studentId=${child.studentId}&competencyId=COM_ORAL&periodId=${period.id}`);
    const history=child=>c.get(p+`/corrections/history?studentId=${child.studentId}`);
    for(const child of children){const criterion=state.workspace.criteria.find(v=>v.curricular_age===child.age);child.input={studentId:child.studentId,periodId:period.id,competencyId:'COM_ORAL'};
      await c.post(p+'/observe',{clientRequestId:randomUUID(),studentId:child.studentId,activityId:activity.activityId,criterionId:criterion.id,periodId:period.id,observedOn:blueprint.occursOn,rawText:`Registro cotidiano original ficticio de ${child.age} años.`});
      child.context=await context(child);child.grade=await c.post(p+'/grade',{...confirm(),...child.input,sourceFingerprint:child.context.sourceFingerprint,achievementLevel:'A'});}
    for(const child of children)await c.post(p+'/conclusion',{...confirm(),...child.input,assessmentId:child.grade.assessmentId,sourceFingerprint:child.context.sourceFingerprint,conclusionText:`Conclusión original ficticia propia de ${child.age} años.`});
    for(const child of children){child.report=await c.post(p+'/family',{...confirm(),studentId:child.studentId,periodId:period.id});child.word=await xml(await download(`/reports/${child.report.reportId}.docx`),'word/document.xml');child.diagnosticWord=await xml(await download(`/documents/diagnostic_student_review/${child.review.reviewId}.docx`),'word/document.xml');}
    let o=await overview();const first=await c.post(p+'/periods/close',{...confirm(),...scope,expectedCurrentVersionId:null,expectedSourceFingerprint:o.sourceFingerprint});
    const oldManifest=await c.get(p+'/periods/closures/'+first.closureVersionId),oldExcel=await xml(await download(`/periods/closures/${first.closureVersionId}.xlsx`),'xl/worksheets/sheet1.xml');
    assert.equal((await c.raw(p+'/corrections/history?studentId='+children[0].studentId,{})).status,404);
    let h=await history(children[0]);assert.equal((await c.raw(p+'/corrections/ordinary',{...confirm(),studentId:children[0].studentId,observationId:h.ordinary[0].id,expectedAssignmentId:h.assignmentId,expectedRevision:1,action:'void',reason:'Prueba ficticia en bimestre cerrado.',impactsAcknowledged:true})).status,409);
    await c.post(p+'/periods/reopen',{...confirm(),...scope,expectedCurrentVersionId:first.closureVersionId,reason:'Corregir registros ficticios antes de guardar una nueva versión.'});
    state=await c.get(p+'/state');const s=state.workspace.students.find(s=>s.id===children[0].studentId);
    const rename={...confirm(),studentId:s.id,expectedAssignmentId:s.assignment_id,expectedStudentFingerprint:s.correction_fingerprint,firstName:'Nombre Corregido',lastName:s.last_name,age:s.age,birthDate:'2023-02-28',reason:'Rectificar nombre y fecha de nacimiento ficticios.',impactsAcknowledged:true};
    await c.post(p+'/corrections/student',rename);assert.equal((await c.post(p+'/corrections/student',rename)).replayed,true);
    for(const child of children){
      h=await history(child);const row=h.ordinary[0],ordinary={...confirm(),studentId:child.studentId,observationId:row.id,expectedAssignmentId:h.assignmentId,expectedRevision:row.source_revision,action:'correct',correctedText:`Texto cotidiano corregido de ${child.age} años: eligió un cuento y pidió escucharlo.`,reason:'Corregir la transcripción ficticia manteniendo el criterio mostrado.',criterionConfirmed:true,impactsAcknowledged:true};
      const bad=await c.raw(p+'/corrections/ordinary',{...ordinary,criterionConfirmed:false});assert.equal(bad.status,422);assert.equal((await history(child)).ordinary[0].source_revision,1,'fallo posterior al writer revierte toda la transacción');
      await c.post(p+'/corrections/ordinary',ordinary);assert.equal((await c.post(p+'/corrections/ordinary',ordinary)).replayed,true);
      assert.equal((await c.raw(p+'/corrections/ordinary',{...ordinary,clientRequestId:randomUUID()})).status,409);
      await c.post(p+'/corrections/diagnostic',{...confirm(),studentId:child.studentId,observationId:child.diagnostic.observationId,expectedAssignmentId:h.assignmentId,expectedRevision:0,action:'correct',observationText:`Fuente diagnóstica corregida de ${child.age} años: pidió repetir un relato.`,reason:'Rectificar un detalle ficticio sin alterar la fuente original.'});
    }
    await stop(app);app=await start(storeName);c=client(app);
    state=await c.get(p+'/state');assert.equal(state.diagnostic.ready,false);assert.equal(state.planning.plans.find(v=>v.id===plan.planId).current,false);assert.equal(state.workspace.periods.find(v=>v.id===period.id).closed,false);
    for(const child of children){h=await history(child);assert.equal(h.ordinary[0].source_revision,2);assert.equal(h.ordinary[0].revisions.length,1);assert.equal(h.diagnostic[0].revision,1);assert.equal(h.reviews.length,1);
      const d=await c.get(p+`/diagnostic/context?studentId=${child.studentId}`);
      await c.post(p+'/diagnostic/review',{...confirm(),studentId:child.studentId,expectedReviewId:child.review.reviewId,reason:'Reconfirmar la lectura con las fuentes ficticias corregidas.',sourceFingerprint:d.sourceFingerprint,pendingInformationAcknowledged:true,findings:[{competency_id:'COM_ORAL',observation_ids:[child.diagnostic.observationId],teacher_reading:`Lectura corregida ficticia propia de ${child.age} años.`,planning_priority:'consider'}]});
      child.context=await context(child);child.grade=await c.post(p+'/grade',{...confirm(),...child.input,sourceFingerprint:child.context.sourceFingerprint,achievementLevel:'A'});
    }
    for(const child of children)await c.post(p+'/conclusion',{...confirm(),...child.input,assessmentId:child.grade.assessmentId,sourceFingerprint:child.context.sourceFingerprint,conclusionText:`Conclusión nueva ficticia de ${child.age} años con la transcripción revisada.`});
    for(const child of children)await c.post(p+'/family',{...confirm(),studentId:child.studentId,periodId:period.id});
    o=await overview();assert.equal(o.progress.confirmed,3);assert.deepEqual(o.rows.map(r=>r.curricular_age),[3,4,5]);const second=await c.post(p+'/periods/close',{...confirm(),...scope,expectedCurrentVersionId:first.closureVersionId,expectedSourceFingerprint:o.sourceFingerprint});assert.equal(second.version,2);
    await stop(app);app=await start(storeName);c=client(app);o=await overview();assert.equal(o.closure.closed,true);assert.equal(o.closure.current,true);
    const documentState=await c.get(p+'/state');
    assert.equal(documentState.workspace.reportHistory.length,6,'las tres versiones anteriores siguen navegables después del reinicio');
    assert.equal(documentState.workspace.reports.length,3,'el historial no sustituye los informes vigentes');
    for(const child of children){
      const versions=documentState.workspace.reportHistory.filter(r=>r.student_id===child.studentId);
      assert.deepEqual(versions.map(r=>[r.version,r.status,r.age]),[[2,'active',child.age],[1,'archived',child.age]]);
      assert.equal(versions[1].id,child.report.reportId);
      if(child===children[0]){assert.match(versions[0].title,/Nombre Corregido/);assert.doesNotMatch(versions[1].title,/Nombre Corregido/);}
    }
    for(const child of children){assert.equal(await xml(await download(`/reports/${child.report.reportId}.docx`),'word/document.xml'),child.word);assert.equal(await xml(await download(`/documents/diagnostic_student_review/${child.review.reviewId}.docx`),'word/document.xml'),child.diagnosticWord);assert.equal((await history(child)).reviews.length,2);}
    assert.deepEqual(await c.get(p+'/periods/closures/'+first.closureVersionId),oldManifest);assert.equal(await xml(await download(`/periods/closures/${first.closureVersionId}.xlsx`),'xl/worksheets/sheet1.xml'),oldExcel);
    assert.equal((await c.get(p+'/generation?classroomId='+scope.classroomId)).jobs.length,0);
    const directory=new URL('../.local/multi-age-main-20261023/correcciones/',import.meta.url);await mkdir(directory,{recursive:true});
    const histories=await Promise.all(children.map(history));await writeFile(new URL('histories.json',directory),JSON.stringify(histories,null,2));await writeFile(new URL('overview.json',directory),JSON.stringify(o,null,2));
    await writeFile(new URL('receipt.json',directory),JSON.stringify({status:'passed',storeName,...scope,ages:[3,4,5],manualFixture:true,aiCalls:0,historyPreserved:true,originalDocumentsUnchanged:true,versions:[first.closureVersionId,second.closureVersionId]},null,2));
  }finally{await stop(app);}
});
