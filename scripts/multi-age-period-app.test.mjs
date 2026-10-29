import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { startMultiAgeHttpFixture as start,stopMultiAgeHttpFixture as stop,multiAgeHttpFixtureClient as client } from './fixtures/multi-age-http-fixture.mjs';

const confirm=()=>({teacherConfirmed:true,clientRequestId:randomUUID()}),p='/api/multi-age';
const xml=async(bytes,part='xl/worksheets/sheet1.xml')=>(await JSZip.loadAsync(bytes)).file(part).async('string');
test('API principal persistente: Consolidado 3/4/5, Excel filtrado, cerrar/reiniciar/reabrir/corregir/recerrar con historia intacta',{timeout:150000},async t=>{
  const storeName=process.env.AYNI_MULTI_AGE_PERIOD_QA_STORE??'period-'+randomUUID();let app=await start(storeName),c=client(app);
  const bytes=async path=>{const response=await fetch(app.origin+p+path);assert.equal(response.status,200,await response.clone().text());assert.equal(response.headers.get('cache-control'),'private, no-store');return Buffer.from(await response.arrayBuffer());};
  try{
    assert.equal((await c.get('/api/curriculum/entry')).contract,null,'solo puede sembrar una base nueva, nunca un aula actual');
    const classroom=await c.post(p+'/classroom',{...confirm(),teachingMode:'single_teacher_multi_age',teacherName:'Docente ficticia de cierres',ages:[3,4,5],section:'Unidocencia QA 3 4 5',institutionName:'Jardín ficticio local',year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'}),children=[];
    for(const age of [3,4,5]){const child={...await c.post(p+'/enroll',{...confirm(),classroomId:classroom.classroomId,expectedRevision:1,age,firstName:`Prueba ${age}`,lastName:'Cierres ficticios'}),age};children.push(child);
      const state=await c.get(p+'/state'),source=state.diagnostic.students.find(s=>s.id===child.studentId);
      await c.post(p+'/diagnostic/review',{...confirm(),studentId:child.studentId,sourceFingerprint:source.sourceFingerprint,pendingInformationAcknowledged:true,findings:[]});}
    let state=await c.get(p+'/state');
    const plan=await c.post(p+'/annual/draft',{...confirm(),classroomId:classroom.classroomId,sourceFingerprint:state.planning.sourceFingerprint,proposal:state.planning.exampleProposal});
    await c.post(p+'/annual/confirm',{...confirm(),classroomId:classroom.classroomId,planId:plan.planId,expectedRevision:plan.revision});
    state=await c.get(p+'/state');const savedPlan=state.planning.plans[0],slot=savedPlan.document_context.calendar.projects[0],proposal=savedPlan.proposal.proposals[0];
    const blueprint={title:'Elegimos y conversamos con bloques',purpose:proposal.purpose,occursOn:slot.instructional_dates[0],participantAges:[3,4,5],commonSequence:{opening:proposal.common_invitation,development:proposal.one_teacher_organization,closure:'Compartimos elecciones y escuchamos sin exigir una respuesta.'},criteriaFamilies:[{competency_id:'COM_ORAL',variants:proposal.opportunities.filter(o=>o.competency_id==='COM_ORAL').map(o=>({curricular_age:o.age,criterion_text:o.child_action,expected_evidence:o.observation,observation_moments:['development'],official_performance_refs:o.official_performance_refs}))}]};
    const activity=await c.post(p+'/activity',{...confirm(),classroomId:classroom.classroomId,expectedRevision:1,annualPlanId:plan.planId,annualSlotId:slot.slot_id,blueprint});
    state=await c.get(p+'/state');const period=state.workspace.periods.find(period=>period.starts_on<=blueprint.occursOn&&period.ends_on>=blueprint.occursOn),scope={classroomId:classroom.classroomId,periodId:period.id};
    for(const child of children){const criterion=state.workspace.criteria.find(r=>r.curricular_age===child.age);child.input={studentId:child.studentId,competencyId:'COM_ORAL',periodId:period.id};
      child.observation={clientRequestId:randomUUID(),studentId:child.studentId,activityId:activity.activityId,criterionId:criterion.id,periodId:period.id,observedOn:blueprint.occursOn,rawText:`Registro literal ficticio de ${child.age} años: expresó su elección.`};
      await c.post(p+'/observe',child.observation);child.context=await c.get(p+`/context?studentId=${child.studentId}&competencyId=COM_ORAL&periodId=${period.id}`);
      child.grade=await c.post(p+'/grade',{...confirm(),...child.input,sourceFingerprint:child.context.sourceFingerprint,achievementLevel:'B'});}
    for(const child of children)await c.post(p+'/conclusion',{...confirm(),...child.input,assessmentId:child.grade.assessmentId,sourceFingerprint:child.context.sourceFingerprint,conclusionText:`Conclusión ficticia propia de ${child.age} años para su familia.`});
    for(const child of children)child.report=await c.post(p+'/family',{...confirm(),studentId:child.studentId,periodId:period.id});
    const overviewPath=`/periods/overview?classroomId=${scope.classroomId}&periodId=${scope.periodId}`,o=await c.get(p+overviewPath);
    assert.equal(o.ready,true);assert.equal(o.progress.confirmed,3);assert.deepEqual(o.rows.map(r=>r.curricular_age),[3,4,5]);
    const all=await bytes(`/periods/consolidated.xlsx?classroomId=${scope.classroomId}&periodId=${scope.periodId}`),filtered=await xml(await bytes(`/periods/consolidated.xlsx?classroomId=${scope.classroomId}&periodId=${scope.periodId}&age=4`));
    assert.match(filtered,/4 años/);assert.doesNotMatch(filtered,/3 años|5 años/);
    const closeInput={...confirm(),...scope,expectedCurrentVersionId:null,expectedSourceFingerprint:o.sourceFingerprint,pendingAcknowledged:true};
    const first=await c.post(p+'/periods/close',closeInput);assert.equal((await c.post(p+'/periods/close',closeInput)).replayed,true);
    const oldDocument=await c.get(p+'/periods/closures/'+first.closureVersionId),oldExcel=await bytes(`/periods/closures/${first.closureVersionId}.xlsx`),oldReport=await bytes(`/reports/${children[0].report.reportId}.docx`);
    await t.test('cerrado: lecturas disponibles, mutaciones bloqueadas y sin llamadas a IA',async()=>{
      assert.equal((await c.get(p+overviewPath)).closure.current,true);assert.equal((await c.get(p+'/state')).workspace.periods.find(v=>v.id===period.id).closed,true);
      assert.equal((await c.raw(p+'/observe',{...children[0].observation,clientRequestId:randomUUID()})).status,409);
      assert.equal((await c.raw(p+'/grade',{...confirm(),...children[0].input,sourceFingerprint:children[0].context.sourceFingerprint,achievementLevel:'A'})).status,409);
      assert.equal((await c.get(p+'/generation?classroomId='+scope.classroomId)).jobs.length,0);
    });
    await stop(app);app=await start(storeName);c=client(app);assert.equal((await c.get(p+overviewPath)).closure.closed,true);
    assert.deepEqual(await c.get(p+'/periods/closures/'+first.closureVersionId),oldDocument);
    const reopen={...confirm(),...scope,expectedCurrentVersionId:first.closureVersionId,reason:'Revisar la lectura de la profesora con el registro original.'};
    assert.equal((await c.raw(p+'/periods/reopen',{...reopen,expectedCurrentVersionId:randomUUID()})).status,409);
    assert.equal((await c.raw(p+'/periods/reopen',{...reopen,reason:''})).status,422);
    await c.post(p+'/periods/reopen',reopen);await stop(app);app=await start(storeName);c=client(app);assert.equal((await c.get(p+overviewPath)).closure.closed,false);
    assert.equal((await c.post(p+'/periods/reopen',reopen)).replayed,true);
    const child=children[0],newGrade=await c.post(p+'/grade',{...confirm(),...child.input,sourceFingerprint:child.context.sourceFingerprint,expectedAssessmentId:child.grade.assessmentId,achievementLevel:'A',reason:'Nueva revisión docente del mismo registro literal.'});
    let next=await c.get(p+overviewPath);assert.equal(next.ready,false);assert.equal(next.rows[0].state,'conclusion_pending');
    assert.equal((await c.raw(p+'/periods/close',{...confirm(),...scope,expectedCurrentVersionId:first.closureVersionId,expectedSourceFingerprint:next.sourceFingerprint})).status,409);
    await c.post(p+'/conclusion',{...confirm(),...child.input,assessmentId:newGrade.assessmentId,sourceFingerprint:child.context.sourceFingerprint,conclusionText:'Conclusión ficticia revisada de tres años basada en su registro original.'});
    await c.post(p+'/family',{...confirm(),studentId:child.studentId,periodId:period.id});next=await c.get(p+overviewPath);
    const second=await c.post(p+'/periods/close',{...confirm(),...scope,expectedCurrentVersionId:first.closureVersionId,expectedSourceFingerprint:next.sourceFingerprint});assert.equal(second.version,2);
    await stop(app);app=await start(storeName);c=client(app);const final=await c.get(p+overviewPath);assert.equal(final.closure.closed,true);assert.equal(final.closure.current,true);assert.equal(final.closure.versions.length,2);
    assert.equal(final.rows[0].achievement_level,'A');assert.ok(final.rows.slice(1).every(r=>r.achievement_level==='B'));
    assert.deepEqual(await c.get(p+'/periods/closures/'+first.closureVersionId),oldDocument);
    assert.equal(await xml(await bytes(`/periods/closures/${first.closureVersionId}.xlsx`)),await xml(oldExcel));
    assert.equal(await xml(await bytes(`/reports/${child.report.reportId}.docx`),'word/document.xml'),await xml(oldReport,'word/document.xml'));
    const directory=new URL('../.local/multi-age-main-20261023/cierres/',import.meta.url);await mkdir(directory,{recursive:true});
    await writeFile(new URL('consolidado-cierre-v1.xlsx',directory),oldExcel);await writeFile(new URL('consolidado-cierre-v2.xlsx',directory),await bytes(`/periods/closures/${second.closureVersionId}.xlsx`));
    await writeFile(new URL('overview.json',directory),JSON.stringify(final,null,2));
    await writeFile(new URL('receipt.json',directory),JSON.stringify({status:'passed',storeName,classroomId:scope.classroomId,periodId:scope.periodId,versions:[first.closureVersionId,second.closureVersionId],ages:[3,4,5],aiCalls:0,manualFixture:true,excelOriginalUnchanged:true,originalFamilyWordUnchanged:true},null,2));
    assert.match(await xml(all),/Grupo curricular/);
  }finally{await stop(app);}
});
