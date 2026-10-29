import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import { makeMultiAgePeriodFixture } from '../../scripts/fixtures/multi-age-period-fixture.mjs';
import { documentFixtureRequest as confirm } from '../../scripts/fixtures/multi-age-document-fixture.mjs';
import { multiAgePeriodOverview, closeMultiAgePeriod, reopenMultiAgePeriod, loadMultiAgePeriodClosure, multiAgePeriodExcel, filterMultiAgePeriodRows } from './multi-age-period.mjs';
import { observeMultiAgeStudent, multiAgeAssessmentContext, confirmMultiAgeGrade, confirmMultiAgeConclusion, confirmMultiAgeFamilyReport, multiAgeLocalWorkspace, confirmMultiAgeActivity, multiAgeFamilyDocument } from './multi-age-local-service.mjs';
import { renderFamilyReportWord } from './family-report-word.mjs';
import { loadKnowledgeBaseV4 } from './knowledge-base-v4.mjs';
import { officialPerformances } from './official-performance-references.mjs';
import { enqueueMultiAgeGeneration,runMultiAgeGenerationStep,loadMultiAgeGeneration } from './multi-age-generation-jobs.mjs';
import { multiAgeProviderForJob } from '../../scripts/multi-age-ai-runtime.mjs';

const scope=f=>({classroomId:f.classroom.classroomId,periodId:f.period.id});
const closeInput=(f,o)=>({...confirm(),...scope(f),expectedCurrentVersionId:o.closure.currentVersionId,expectedSourceFingerprint:o.sourceFingerprint,pendingAcknowledged:true});
const xml=async(bytes,part='xl/worksheets/sheet1.xml')=>(await JSZip.loadAsync(bytes)).file(part).async('string');

test('Consolidado V2 → Excel → cierre → reapertura → corrección → recierre conserva las tres edades y toda versión anterior',{timeout:90000},async t=>{
  const f=await makeMultiAgePeriodFixture(),{db,teacher}=f;try{
    const o=await multiAgePeriodOverview(db,teacher,scope(f));assert.equal(o.rows.length,3);assert.equal(o.progress.confirmed,3);assert.equal(o.ready,true);
    assert.deepEqual(o.rows.map(r=>r.curricular_age),[3,4,5]);assert.deepEqual(o.rows.map(r=>r.achievement_level),['B','A','AD']);
    const originalExcel=await xml(await multiAgePeriodExcel(db,teacher,scope(f))),originalReports=[];
    const cards=(await loadKnowledgeBaseV4()).competencyCards;
    for(const child of f.children)originalReports.push(await xml(await renderFamilyReportWord(await multiAgeFamilyDocument(db,teacher,child.report.reportId),cards),'word/document.xml'));
    await t.test('Excel conserva edad, notas y textos literales; filtrar no escribe ni mezcla grupos',async()=>{
      assert.match(originalExcel,/Grupo curricular/);assert.match(originalExcel,/autoFilter ref="A1:G4"/);assert.doesNotMatch(originalExcel,/<f[ >]/);
      for(const age of [3,4,5]){assert.ok(originalExcel.includes(`${age} años`));assert.ok(originalExcel.includes(`Conclusión ficticia de ${age} años`));}
      const filtered=await xml(await multiAgePeriodExcel(db,teacher,scope(f),{age:'4'}));assert.match(filtered,/4 años/);assert.doesNotMatch(filtered,/3 años|5 años/);
      await assert.rejects(multiAgePeriodExcel(db,f.other,scope(f)),/no está disponible/);
      await assert.rejects(multiAgePeriodExcel(db,teacher,scope(f),{studentId:randomUUID()}),/no está disponible/);
      assert.throws(()=>filterMultiAgePeriodRows(o.rows,{age:'04'}),/Elige un grupo/);
      assert.throws(()=>filterMultiAgePeriodRows(o.rows,{status:'inventado'}),/filtro/);
      assert.equal((await db.query('select count(*)::int n from period_closure_versions')).rows[0].n,0);
    });
    const input=closeInput(f,o);await assert.rejects(closeMultiAgePeriod(db,teacher,{...input,expectedSourceFingerprint:'obsoleto'}),/Cambió/);
    const closed=await closeMultiAgePeriod(db,teacher,input);assert.equal(closed.version,1);assert.equal((await closeMultiAgePeriod(db,teacher,input)).replayed,true);
    const historical=await loadMultiAgePeriodClosure(db,teacher,closed.closureVersionId),historicalXml=await xml(await multiAgePeriodExcel(db,teacher,{closureVersionId:closed.closureVersionId}));
    await t.test('cerrar bloquea escrituras y preparación en sus fechas, pero permite lectura y recibos ya guardados',async()=>{
      const after=await multiAgePeriodOverview(db,teacher,scope(f));assert.equal(after.closure.closed,true);assert.equal(after.closure.current,true);
      assert.equal((await multiAgeLocalWorkspace(db,teacher,f.classroom.classroomId)).periods.find(p=>p.id===f.period.id).closed,true);
      const child=f.children[0];assert.equal((await multiAgeAssessmentContext(db,teacher,child.input)).scope.age,3);
      assert.equal((await observeMultiAgeStudent(db,teacher,child.observationInput)).created,false);
      await assert.rejects(observeMultiAgeStudent(db,teacher,{...child.observationInput,clientRequestId:randomUUID()}),/Reabre/);
      await assert.rejects(confirmMultiAgeGrade(db,teacher,{...confirm(),...child.input,sourceFingerprint:child.context.sourceFingerprint,achievementLevel:'A'}),/Reabre/);
      await assert.rejects(confirmMultiAgeConclusion(db,teacher,{...confirm(),...child.input,assessmentId:child.grade.assessmentId,sourceFingerprint:child.context.sourceFingerprint,conclusionText:'Otra conclusión ficticia.'}),/Reabre/);
      await assert.rejects(confirmMultiAgeFamilyReport(db,teacher,{...confirm(),studentId:child.studentId,periodId:f.period.id}),/Reabre/);
      await assert.rejects(db.query("update competency_assessments set details=details where id=$1",[child.grade.assessmentId]),/Reabre/);
      await assert.rejects(db.query("update family_reports set status='archived' where id=$1",[child.report.reportId]),/Reabre/);
      await assert.rejects(confirmMultiAgeActivity(db,teacher,{...confirm(),classroomId:f.classroom.classroomId,expectedRevision:1,blueprint:f.activity.blueprint}),/Reabre/);
      await assert.rejects(db.query('update period_closure_versions set manifest=manifest where id=$1',[closed.closureVersionId]),/inmutable/);
      await assert.rejects(loadMultiAgePeriodClosure(db,f.other,closed.closureVersionId),/no está disponible/);
    });
    await t.test('reapertura exige versión, motivo y docente; deja un evento durable',async()=>{
      const input={...confirm(),...scope(f),expectedCurrentVersionId:closed.closureVersionId,reason:'Revisar el registro literal del niño de tres años.'};
      await assert.rejects(reopenMultiAgePeriod(db,teacher,{...input,expectedCurrentVersionId:randomUUID()}));
      await assert.rejects(reopenMultiAgePeriod(db,teacher,{...input,reason:''}),/motivo/);
      await assert.rejects(reopenMultiAgePeriod(db,f.other,input),/no está disponible/);
      await reopenMultiAgePeriod(db,teacher,input);assert.equal((await reopenMultiAgePeriod(db,teacher,input)).replayed,true);
      const opened=await multiAgePeriodOverview(db,teacher,scope(f));assert.equal(opened.closure.closed,false);assert.equal(opened.closure.events.at(-1).reason,input.reason);
    });
    await t.test('nueva evidencia vuelve obsoleta solo su nota; corregir crea versiones y archiva derivados sin destruirlos',async()=>{
      const child=f.children[0];await observeMultiAgeStudent(db,teacher,{...child.observationInput,clientRequestId:randomUUID(),rawText:'Nuevo registro ficticio propio de tres años para revisar la lectura.'});
      let current=await multiAgePeriodOverview(db,teacher,scope(f));assert.equal(current.rows.find(r=>r.student_id===child.studentId).state,'needs_review');assert.equal(current.ready,false);
      assert.equal(current.rows.find(r=>r.curricular_age===4).state,'confirmed');
      await assert.rejects(closeMultiAgePeriod(db,teacher,closeInput(f,current)),/Revisa/);
      const context=await multiAgeAssessmentContext(db,teacher,child.input),revision={...confirm(),...child.input,sourceFingerprint:context.sourceFingerprint,expectedAssessmentId:child.grade.assessmentId,achievementLevel:'A',reason:'Nueva revisión docente de sus fuentes.'};
      await assert.rejects(confirmMultiAgeGrade(db,teacher,{...revision,reason:''}),/motivo/);
      const grade=await confirmMultiAgeGrade(db,teacher,revision);assert.equal((await confirmMultiAgeGrade(db,teacher,revision)).replayed,true);
      current=await multiAgePeriodOverview(db,teacher,scope(f));assert.equal(current.rows.find(r=>r.curricular_age===3).state,'conclusion_pending');
      const withGrade=await xml(await multiAgePeriodExcel(db,teacher,scope(f),{age:'3'}));assert.match(withGrade,/>A<\/t>/);assert.match(withGrade,/Falta conclusión/);assert.doesNotMatch(withGrade,/Conclusión ficticia/);
      await confirmMultiAgeConclusion(db,teacher,{...confirm(),...child.input,assessmentId:grade.assessmentId,sourceFingerprint:context.sourceFingerprint,conclusionText:'Nueva conclusión ficticia de tres años con las dos fuentes revisadas.'});
      const report=await confirmMultiAgeFamilyReport(db,teacher,{...confirm(),studentId:child.studentId,periodId:f.period.id});assert.notEqual(report.reportId,child.report.reportId);
      assert.equal((await db.query('select version from competency_assessments where id=$1',[grade.assessmentId])).rows[0].version,2);
      assert.equal((await db.query('select version from family_reports where id=$1',[report.reportId])).rows[0].version,2);
      for(const [i,c]of f.children.entries())assert.equal(await xml(await renderFamilyReportWord(await multiAgeFamilyDocument(db,teacher,c.report.reportId),cards),'word/document.xml'),originalReports[i]);
    });
    const after=await multiAgePeriodOverview(db,teacher,scope(f)),second=await closeMultiAgePeriod(db,teacher,closeInput(f,after));assert.equal(second.version,2);
    assert.deepEqual(await loadMultiAgePeriodClosure(db,teacher,closed.closureVersionId),historical);assert.equal(await xml(await multiAgePeriodExcel(db,teacher,{closureVersionId:closed.closureVersionId})),historicalXml);
    assert.equal((await multiAgePeriodOverview(db,teacher,scope(f))).closure.current,true);
    await t.test('corregir solo la conclusión conserva la nota y genera otro cierre histórico',async()=>{
      await reopenMultiAgePeriod(db,teacher,{...confirm(),...scope(f),expectedCurrentVersionId:second.closureVersionId,reason:'Precisar la conclusión con su registro.'});
      const child=f.children[1],input={...confirm(),...child.input,assessmentId:child.grade.assessmentId,expectedConclusionId:child.conclusion.conclusionId,sourceFingerprint:child.context.sourceFingerprint,reason:'Precisar el texto confirmado.',conclusionText:'Conclusión ficticia revisada de cuatro años, sin cambiar la valoración.'};
      await confirmMultiAgeConclusion(db,teacher,input);const model=await multiAgePeriodOverview(db,teacher,scope(f));assert.equal(model.rows.find(r=>r.curricular_age===4).achievement_level,'A');
      const third=await closeMultiAgePeriod(db,teacher,closeInput(f,model));assert.equal(third.version,3);
      assert.deepEqual(await loadMultiAgePeriodClosure(db,teacher,closed.closureVersionId),historical);
      assert.equal((await db.query('select count(*)::int n from multi_age_generation_jobs')).rows[0].n,0);
    });
  }finally{await db.close();}
});

test('los pendientes se reconocen sin notas inventadas y el cierre anual no omite competencias aplicables',{timeout:90000},async()=>{
  const f=await makeMultiAgePeriodFixture({evaluated:false});try{
    const o=await multiAgePeriodOverview(f.db,f.teacher,scope(f));assert.equal(o.progress.pending,3);assert.ok(o.rows.every(r=>!r.achievement_level&&!r.conclusion));
    await assert.rejects(closeMultiAgePeriod(f.db,f.teacher,{...closeInput(f,o),pendingAcknowledged:false}),/pendientes/);
    const saved=await closeMultiAgePeriod(f.db,f.teacher,closeInput(f,o)),document=await loadMultiAgePeriodClosure(f.db,f.teacher,saved.closureVersionId);
    assert.equal(document.manifest.pending_acknowledged,true);assert.ok(document.manifest.rows.every(r=>r.state==='observation_pending'&&!r.assessment));
    await reopenMultiAgePeriod(f.db,f.teacher,{...confirm(),...scope(f),expectedCurrentVersionId:saved.closureVersionId,reason:'Registrar una valoración docente sin forzar conclusión opcional.'});
    const child=f.children[2];await observeMultiAgeStudent(f.db,f.teacher,child.observationInput);
    const source=await multiAgeAssessmentContext(f.db,f.teacher,child.input);
    await confirmMultiAgeGrade(f.db,f.teacher,{...confirm(),...child.input,sourceFingerprint:source.sourceFingerprint,achievementLevel:'AD'});
    const optional=await multiAgePeriodOverview(f.db,f.teacher,scope(f));assert.equal(optional.rows.find(r=>r.curricular_age===5).state,'confirmed');
    assert.equal(optional.rows.find(r=>r.curricular_age===5).conclusion,'');assert.equal(optional.progress.concluded,0);
    assert.equal((await closeMultiAgePeriod(f.db,f.teacher,closeInput(f,optional))).version,2);
    const w=await multiAgeLocalWorkspace(f.db,f.teacher,f.classroom.classroomId),last=w.periods.at(-1),annual=await multiAgePeriodOverview(f.db,f.teacher,{...scope(f),periodId:last.id});
    assert.ok(annual.progress.annualUnvalued>3);assert.equal(annual.ready,false);
    await assert.rejects(closeMultiAgePeriod(f.db,f.teacher,{...closeInput(f,annual),periodId:last.id}),/cierre anual/);
  }finally{await f.db.close();}
});

test('cierres V2: RLS oculta otra aula y permite consultar el historial propio sin escribirlo',{timeout:90000},async()=>{
  const f=await makeMultiAgePeriodFixture({schema:'supabase'});try{
    const o=await multiAgePeriodOverview(f.db,f.teacher,scope(f)),saved=await closeMultiAgePeriod(f.db,f.teacher,closeInput(f,o));
    await f.db.exec('set role authenticated');await f.db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.other]);
    await assert.rejects(multiAgePeriodOverview(f.db,f.teacher,scope(f)),/no está disponible/);
    await assert.rejects(loadMultiAgePeriodClosure(f.db,f.teacher,saved.closureVersionId),/no está disponible/);
    await f.db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.teacher]);
    assert.equal((await multiAgePeriodOverview(f.db,f.teacher,scope(f))).closure.closed,true);
    assert.equal((await loadMultiAgePeriodClosure(f.db,f.teacher,saved.closureVersionId)).version,1);
    await assert.rejects(f.db.query('update period_closure_versions set manifest=manifest where id=$1',[saved.closureVersionId]));await f.db.exec('reset role');
    await reopenMultiAgePeriod(f.db,f.teacher,{...confirm(),...scope(f),expectedCurrentVersionId:saved.closureVersionId,reason:'Revisar la lectura docente en el esquema Supabase temporal.'});
    const child=f.children[0],grade=await confirmMultiAgeGrade(f.db,f.teacher,{...confirm(),...child.input,expectedAssessmentId:child.grade.assessmentId,sourceFingerprint:child.context.sourceFingerprint,achievementLevel:'A',reason:'Nueva revisión docente conservando la nota previa.'});
    await confirmMultiAgeConclusion(f.db,f.teacher,{...confirm(),...child.input,assessmentId:grade.assessmentId,sourceFingerprint:child.context.sourceFingerprint,conclusionText:'Conclusión ficticia revisada después de reabrir.'});
    await confirmMultiAgeFamilyReport(f.db,f.teacher,{...confirm(),studentId:child.studentId,periodId:f.period.id});
    const reviewed=await multiAgePeriodOverview(f.db,f.teacher,scope(f));assert.equal(reviewed.ready,true);
    assert.equal((await closeMultiAgePeriod(f.db,f.teacher,closeInput(f,reviewed))).version,2);
  }finally{await f.db.close();}
});

test('el alcance por edad no obliga a otro grupo a valorar una competencia ni copia desempeños inexistentes',{timeout:90000},async()=>{
  const f=await makeMultiAgePeriodFixture({evaluated:false});try{
    const variant=(id,age)=>({curricular_age:age,criterion_text:`Criterio ficticio ${id} propio de ${age} años.`,expected_evidence:'Actuación posible de esta experiencia, todavía no observada.',observation_moments:['development'],official_performance_refs:officialPerformances(id,age).slice(0,1).map(p=>p.id)});
    await confirmMultiAgeActivity(f.db,f.teacher,{...confirm(),classroomId:f.classroom.classroomId,expectedRevision:1,blueprint:{...f.activity.blueprint,title:'Oportunidades distintas por edad',criteriaFamilies:[
      {competency_id:'COM_ESCRITURA',variants:[variant('COM_ESCRITURA',3)]},{competency_id:'MAT_CANTIDAD',variants:[variant('MAT_CANTIDAD',4),variant('MAT_CANTIDAD',5)]}]}});
    const o=await multiAgePeriodOverview(f.db,f.teacher,scope(f));assert.equal(o.rows.length,6);
    assert.deepEqual(o.rows.filter(r=>r.competency_id==='MAT_CANTIDAD').map(r=>r.curricular_age),[4,5]);
    assert.deepEqual(o.rows.filter(r=>r.competency_id==='COM_ESCRITURA').map(r=>r.curricular_age),[3]);
    const saved=await closeMultiAgePeriod(f.db,f.teacher,closeInput(f,o)),document=await loadMultiAgePeriodClosure(f.db,f.teacher,saved.closureVersionId);
    assert.deepEqual(document.manifest.planned_criteria.find(c=>c.competency_v4_id==='COM_ESCRITURA').details.official_performance_refs,[]);
    assert.ok(document.manifest.rows.every(r=>r.curricular_age===r.curriculum_snapshot.age&&r.assignment_id===r.curriculum_snapshot.assignment_id));
  }finally{await f.db.close();}
});

test('cierre y cola IA: no iniciar en fechas cerradas, invalidar propuestas anteriores y conservar una respuesta que termina durante el cierre',{timeout:90000},async()=>{
  const f=await makeMultiAgePeriodFixture();try{
    const w=await multiAgeLocalWorkspace(f.db,f.teacher,f.classroom.classroomId),project=w.projects[0];
    const input={kind:'activity',classroomId:f.classroom.classroomId,annualPlanId:project.annual_plan_id,annualSlotId:project.annual_slot_id,projectId:project.id,expectedProjectFingerprint:project.fingerprint,activityPosition:2,occursOn:f.activity.blueprint.occursOn,competencyIds:['COM_ORAL']};
    const queued=await enqueueMultiAgeGeneration(f.db,f.teacher,input,{mode:'fixture'}),o=await multiAgePeriodOverview(f.db,f.teacher,scope(f)),closed=await closeMultiAgePeriod(f.db,f.teacher,closeInput(f,o));
    let calls=0;await runMultiAgeGenerationStep(f.db,{mode:'fixture',providerForJob:async()=>{calls++;throw new Error('No debería llamar a IA.');}});
    assert.equal(calls,0);assert.equal((await loadMultiAgeGeneration(f.db,f.teacher,queued.id)).status,'stale');
    await assert.rejects(enqueueMultiAgeGeneration(f.db,f.teacher,input,{mode:'fixture'}),/Reabre/);
    const batchInput={...input,kind:'activity_batch',activityDates:['2026-03-31','2026-04-01']};delete batchInput.occursOn;
    await assert.rejects(enqueueMultiAgeGeneration(f.db,f.teacher,batchInput,{mode:'fixture'}),/Reabre/);
    await reopenMultiAgePeriod(f.db,f.teacher,{...confirm(),...scope(f),expectedCurrentVersionId:closed.closureVersionId,reason:'Continuar la preparación después de revisar el bimestre.'});
    const next=await enqueueMultiAgeGeneration(f.db,f.teacher,input,{mode:'fixture'});assert.notEqual(next.id,queued.id);
    const providerForJob=multiAgeProviderForJob(f.db,{AYNI_MULTI_AGE_AI_MODE:'fixture'});
    await runMultiAgeGenerationStep(f.db,{mode:'fixture',providerForJob:async job=>{
      const provider=await providerForJob(job);return {generate:async request=>{calls++;const result=await provider.generate(request);
        const current=await multiAgePeriodOverview(f.db,f.teacher,scope(f));await closeMultiAgePeriod(f.db,f.teacher,closeInput(f,current));return result;}};
    }});
    assert.equal(calls,1);assert.equal((await loadMultiAgeGeneration(f.db,f.teacher,next.id)).status,'stale');
    const original=(await f.db.query('select result from multi_age_generation_jobs where id=$1',[next.id])).rows[0].result;
    assert.deepEqual(original.proposal.participantAges,[3,4,5]);assert.equal((await multiAgeLocalWorkspace(f.db,f.teacher,f.classroom.classroomId)).activities.length,1);
  }finally{await f.db.close();}
});
