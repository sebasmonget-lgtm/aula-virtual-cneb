import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { createMultiAgeClassroom,enrollMultiAgeStudent,confirmMultiAgeActivity,observeMultiAgeStudent,multiAgeAssessmentContext } from './multi-age-local-service.mjs';
import { recordMultiAgeDiagnosticObservation,confirmMultiAgeFamilyContext,confirmMultiAgeDiagnosticReview,multiAgeDiagnosticContext,multiAgeDiagnosticWorkspace,validateMultiAgeDiagnosticFindings } from './multi-age-diagnostic.mjs';
import { multiAgeAnnualContext,multiAgeAnnualWorkspace,sampleMultiAgeAnnualProposal,validateMultiAgeAnnualProposal,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan } from './multi-age-annual.mjs';
import { proposeLocalMultiAgeDiagnostic,proposeLocalMultiAgeAnnual,proposeLocalMultiAgeAnnualChange } from './multi-age-planning-generation.mjs';
import { sampleMultiAgeBlueprint } from '../../scripts/fixtures/multi-age-local-fixture.mjs';
import { createPilotClassroom, importStudentsForTeacher } from './pilot-onboarding-service.mjs';

const request=()=>({clientRequestId:randomUUID(),teacherConfirmed:true});
async function fixture(schema='local',ages=[3,4,5]){
  const db=await openMultiAgeLocalDb({schema}),teacher=randomUUID(),other=randomUUID();
  if(schema==='supabase')await db.query('insert into auth.users(id) values($1),($2)',[teacher,other]);
  await db.query("insert into profiles(user_id,display_name) values($1,'Docente ficticia'),($2,'Otra docente ficticia') on conflict(user_id) do nothing",[teacher,other]);
  const c=await createMultiAgeClassroom(db,teacher,{...request(),ages,section:'Multiedad local',institutionName:'Institución ficticia',year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'}),children=[];
  for(const age of ages)children.push({...await enrollMultiAgeStudent(db,teacher,{...request(),classroomId:c.classroomId,expectedRevision:1,firstName:`Niño${age}`,lastName:'PrivadoNoEnviar',age}),age});
  return {db,teacher,other,c,children};
}
async function observe(db,teacher,child,overrides={}){
  const ctx=await multiAgeDiagnosticContext(db,teacher,child.studentId),experience=ctx.catalog.find(e=>e.aspects.some(a=>a.competency_id==='COM_ORAL')),aspect=experience.aspects.find(a=>a.competency_id==='COM_ORAL');
  const input={...request(),studentId:child.studentId,expectedAssignmentId:child.assignmentId,experienceId:experience.id,aspectId:aspect.id,observationStatus:'observed_without_judgment',observationText:`Actuación literal ficticia del grupo ${child.age}.`,observedOn:'2026-03-16',...overrides};
  return {result:await recordMultiAgeDiagnosticObservation(db,teacher,input),input};
}
async function review(db,teacher,child,findings=null){const data=await multiAgeDiagnosticContext(db,teacher,child.studentId),previous=(await db.query("select id from diagnostic_student_reviews where student_id=$1 and status='confirmed' order by version desc limit 1",[child.studentId])).rows[0];return confirmMultiAgeDiagnosticReview(db,teacher,{...request(),studentId:child.studentId,...(previous?{expectedReviewId:previous.id,reason:'Revisar fuentes diagnósticas ficticias actualizadas.'}:{}),sourceFingerprint:data.sourceFingerprint,pendingInformationAcknowledged:true,findings:findings??data.sources.observations.filter(o=>o.competency_v4_id==='COM_ORAL').slice(0,1).map(o=>({competency_id:'COM_ORAL',observation_ids:[o.id],teacher_reading:`Lectura docente ficticia de ${child.age} años.`,planning_priority:'consider'}))});}

test('diagnóstico y Mi año: recorrido 3/4/5, fuentes distintas, borrador recuperable, confirmación y actividad vinculada',{timeout:90000},async t=>{
  const {db,teacher,other,c,children}=await fixture();
  try{
    await t.test('referentes y fuentes pertenecen a cada niño y matrícula; reintentos no duplican',async()=>{
      for(const child of children){
        const {result,input}=await observe(db,teacher,child);assert.equal((await recordMultiAgeDiagnosticObservation(db,teacher,input)).observationId,result.observationId);
        await assert.rejects(recordMultiAgeDiagnosticObservation(db,teacher,{...input,observationText:'Texto cambiado'}),/otro contenido/);
        const context=await multiAgeDiagnosticContext(db,teacher,child.studentId);assert.equal(context.context.curricular_age,child.age);assert.equal(context.sources.observations[0].curriculum_snapshot.age,child.age);
        assert.ok(context.context.official_performance_catalog.competencies.every(p=>p.age===child.age));
        assert.equal(context.sources.observations[0].curriculum_snapshot.age_reference,context.catalog.find(e=>e.id===input.experienceId).aspects.find(a=>a.id===input.aspectId).age_reference);
        await assert.rejects(recordMultiAgeDiagnosticObservation(db,teacher,{...input,...request(),expectedAssignmentId:children.find(s=>s.age!==child.age).assignmentId}),/matrícula/);
        await assert.rejects(recordMultiAgeDiagnosticObservation(db,teacher,{...input,...request(),observedOn:'2026-02-30'}),/fecha/);
      }
      await assert.rejects(multiAgeDiagnosticContext(db,other,children[0].studentId),/no está disponible/);
    });
    await t.test('la familia no se convierte en actuación observada ni sustento de notas',async()=>{
      const child=children[0],before=await multiAgeDiagnosticContext(db,teacher,child.studentId);
      const family=await confirmMultiAgeFamilyContext(db,teacher,{...request(),studentId:child.studentId,expectedAssignmentId:child.assignmentId,familyText:'La familia cuenta que disfruta los cuentos en casa.'});
      const after=await multiAgeDiagnosticContext(db,teacher,child.studentId);assert.equal(after.sources.observations.length,before.sources.observations.length);assert.notEqual(after.sourceFingerprint,before.sourceFingerprint);
      assert.equal(after.context.family_reports[0].source_kind,'family_report');
      assert.throws(()=>validateMultiAgeDiagnosticFindings([{competency_id:'COM_ORAL',observation_ids:[family.interviewId],teacher_reading:'Suposición',planning_priority:'prioritize'}],after.context),/relatos familiares/);
      assert.throws(()=>validateMultiAgeDiagnosticFindings([{competency_id:'COM_ORAL',observation_ids:[after.sources.observations[0].id],teacher_reading:'Lectura',planning_priority:'usual',grade:'A'}],after.context),/Cada lectura/);
      const foreign=await multiAgeDiagnosticContext(db,teacher,children[1].studentId);
      assert.throws(()=>validateMultiAgeDiagnosticFindings([{competency_id:'COM_ORAL',observation_ids:[foreign.sources.observations[0].id],teacher_reading:'Cruce',planning_priority:'consider'}],after.context),/propias/);
      await assert.rejects(confirmMultiAgeDiagnosticReview(db,teacher,{...request(),studentId:child.studentId,sourceFingerprint:before.sourceFingerprint,pendingInformationAcknowledged:true,findings:[]}),/fuentes/);
    });
    const annualData=await multiAgeAnnualContext(db,teacher,c.classroomId),proposal=sampleMultiAgeAnnualProposal(annualData);
    let draft;
    await t.test('calendario único de 15 posiciones; cobertura y refs por edad verificadas',async()=>{
      assert.equal(annualData.calendar.projects.length,15);assert.equal(annualData.calendar.integrity.gaps,0);assert.equal(annualData.calendar.integrity.overlaps,0);
      assert.equal(annualData.calendar.projects.filter(p=>p.duration_weeks===2).length,11);assert.equal(annualData.calendar.projects.filter(p=>p.duration_weeks===3).length,4);
      assert.ok(annualData.calendar.projects.every(p=>!p.instructional_dates.includes('2026-12-08')));
      validateMultiAgeAnnualProposal(proposal,annualData);
      assert.equal(new Set(proposal.proposals[0].opportunities.map(o=>o.child_action)).size,3);
      const missing=structuredClone(proposal);missing.proposals[0].opportunities.pop();assert.throws(()=>validateMultiAgeAnnualProposal(missing,annualData),/todos los grupos/);
      const cross=structuredClone(proposal);cross.proposals[0].opportunities[0].official_performance_refs=cross.proposals[0].opportunities[1].official_performance_refs;assert.throws(()=>validateMultiAgeAnnualProposal(cross,annualData),/edad/);
      const uncovered=structuredClone(proposal);uncovered.everyday_opportunities=uncovered.everyday_opportunities.filter(o=>o.competency_id!=='COM_ESCRITURA');for(const row of uncovered.proposals)row.opportunities=row.opportunities.map(o=>o.competency_id==='COM_ESCRITURA'?structuredClone(proposal.proposals[0].opportunities.find(p=>p.age===o.age)):o);assert.throws(()=>validateMultiAgeAnnualProposal(uncovered,annualData),/cobertura/);
      const three=proposal.everyday_opportunities.find(o=>o.age===3&&o.competency_id==='COM_ESCRITURA');assert.deepEqual(three.official_performance_refs,[]);
      const fake=structuredClone(proposal);fake.proposals[0].starts_on='2026-01-01';assert.throws(()=>validateMultiAgeAnnualProposal(fake,annualData),/posiciones/);
    });
    await t.test('guardar no confirma; fuentes cambiadas y revisiones obsoletas bloquean',async()=>{
      draft=await saveMultiAgeAnnualDraft(db,teacher,{...request(),classroomId:c.classroomId,sourceFingerprint:annualData.sourceFingerprint,proposal});
      await assert.rejects(confirmMultiAgeAnnualPlan(db,teacher,{...request(),classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision}),/cada niño/);
      for(const child of children)await review(db,teacher,child);
      await assert.rejects(confirmMultiAgeAnnualPlan(db,teacher,{...request(),classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision}),/fuentes cambiaron/);
      const current=await multiAgeAnnualContext(db,teacher,c.classroomId);
      draft=await saveMultiAgeAnnualDraft(db,teacher,{...request(),classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision,sourceFingerprint:current.sourceFingerprint,proposal});
      const change=await proposeLocalMultiAgeAnnualChange(db,teacher,{classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision,slotId:'tramo_1',instruction:'Dar más tiempo para conversar.'},{provider:{generate:async req=>{assert.equal(req.workflow,'annual_journey_repair');assert.equal(req.ai_context_bundle.scope,'annual_slot');assert.equal(req.ai_context_bundle.proposals,undefined);return {output:{replacement:{...proposal.proposals[0],title:'Conversamos y jugamos'}}};}}});
      assert.deepEqual(change.proposal.proposals.slice(1),proposal.proposals.slice(1));assert.deepEqual(change.proposal.everyday_opportunities,proposal.everyday_opportunities);assert.equal(change.teacherConfirmed,false);
      await assert.rejects(proposeLocalMultiAgeAnnualChange(db,teacher,{classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision,slotId:'tramo_1',instruction:'Cambio acotado.'},{provider:{generate:async()=>({output:{replacement:{...proposal.proposals[0],slot_id:'tramo_2'}}})}}),/posición autorizada/);
      const ws=await multiAgeAnnualWorkspace(db,teacher,c.classroomId);assert.equal(ws.plans[0].status,'draft');assert.deepEqual(ws.plans[0].proposal,proposal);assert.ok(ws.plans[0].current);
      await assert.rejects(saveMultiAgeAnnualDraft(db,teacher,{...request(),classroomId:c.classroomId,planId:draft.planId,expectedRevision:1,sourceFingerprint:current.sourceFingerprint,proposal}),/otra pestaña/);
      await confirmMultiAgeAnnualPlan(db,teacher,{...request(),classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision});
      await assert.rejects(db.query("update annual_plans set proposal='{}'::jsonb where id=$1",[draft.planId]),/inmutable/);
    });
    await t.test('Mi año → proyecto → actividad → observación mantiene edades y fechas',async()=>{
      const slot=annualData.calendar.projects[0],blueprint=sampleMultiAgeBlueprint();blueprint.occursOn=slot.instructional_dates[0];
      const input={...request(),classroomId:c.classroomId,expectedRevision:1,blueprint,annualPlanId:draft.planId,annualSlotId:slot.slot_id};
      await assert.rejects(confirmMultiAgeActivity(db,teacher,{...input,...request(),blueprint:{...blueprint,occursOn:'2026-04-04'}}),/fecha lectiva/);
      const created=await confirmMultiAgeActivity(db,teacher,input),project=(await db.query('select * from learning_experiences where id=$1',[created.projectId])).rows[0];
      assert.equal(project.annual_plan_id,draft.planId);assert.equal(project.details.annual_slot_id,slot.slot_id);assert.equal(project.ends_on.toISOString().slice(0,10),slot.ends_on);
      assert.equal((await confirmMultiAgeActivity(db,teacher,input)).activityId,created.activityId);
      await assert.rejects(confirmMultiAgeActivity(db,teacher,{...input,...request()}),/ya tiene un proyecto/);
      for(const child of children){const criterion=(await db.query('select * from activity_criteria where activity_id=$1 and curricular_age=$2',[created.activityId,child.age])).rows[0];
        await observeMultiAgeStudent(db,teacher,{...request(),studentId:child.studentId,activityId:created.activityId,criterionId:criterion.id,periodId:c.periodId,observedOn:blueprint.occursOn,rawText:`Observación ordinaria ficticia de ${child.age} años.`});
        const assessment=await multiAgeAssessmentContext(db,teacher,{studentId:child.studentId,competencyId:'COM_ORAL',periodId:c.periodId});assert.equal(assessment.scope.age,child.age);assert.equal(assessment.sourceRows.length,1);
      }
      const before=await multiAgeDiagnosticWorkspace(db,teacher,c.classroomId);await observe(db,teacher,children[0],{observationText:'Nueva fuente literal ficticia.'});
      const changed=await multiAgeDiagnosticWorkspace(db,teacher,c.classroomId);assert.notEqual(before.sourceFingerprint,changed.sourceFingerprint);assert.equal(changed.ready,false);assert.equal(changed.students.filter(s=>s.current).length,2);
      assert.equal((await multiAgeAnnualWorkspace(db,teacher,c.classroomId)).plans[0].current,false);
      await assert.rejects(confirmMultiAgeActivity(db,teacher,{...input,...request(),annualSlotId:annualData.calendar.projects[1].slot_id,blueprint:{...blueprint,occursOn:annualData.calendar.projects[1].instructional_dates[0]}}),/revisar sus fuentes/);
    });
    await t.test('prompts nuevos preservan scope y router, sin escritura ni red por defecto',async()=>{
      await review(db,teacher,children[0]);let calls=0;
      const data=await multiAgeDiagnosticContext(db,teacher,children[0].studentId);
      const result=await proposeLocalMultiAgeDiagnostic(db,teacher,children[0].studentId,{provider:{generate:async req=>{calls++;assert.equal(req.workflow,'diagnostic_individual_assist');assert.equal(req.ai_context_bundle.curricular_age,3);assert.ok(!JSON.stringify(req).includes('PrivadoNoEnviar'));return {output:{findings:[]}};}}});
      assert.equal(calls,1);assert.equal(result.teacherConfirmed,false);
      await assert.rejects(proposeLocalMultiAgeDiagnostic(db,teacher,children[0].studentId),/proveedor simulado/);
      await assert.rejects(proposeLocalMultiAgeDiagnostic(db,teacher,children[0].studentId,{provider:{generate:async()=>({output:{findings:[{competency_id:'COM_ORAL',observation_ids:['inventado'],teacher_reading:'Falso',planning_priority:'usual'}]}})}}),/observaciones propias/);
      const annual=await multiAgeAnnualContext(db,teacher,c.classroomId),count=(await db.query('select count(*)::int n from annual_plans')).rows[0].n;
      const annualResult=await proposeLocalMultiAgeAnnual(db,teacher,c.classroomId,{provider:{generate:async req=>{assert.equal(req.workflow,'annual_plan');assert.equal(req.ai_context_bundle.scope,'classroom');assert.deepEqual(req.ai_context_bundle.classroom.participant_age_groups,[3,4,5]);assert.ok(!JSON.stringify(req).includes('PrivadoNoEnviar'));return {output:sampleMultiAgeAnnualProposal(annual)};}}});assert.equal(annualResult.teacherConfirmed,false);assert.equal((await db.query('select count(*)::int n from annual_plans')).rows[0].n,count);
      assert.equal((await multiAgeDiagnosticContext(db,teacher,children[0].studentId)).sourceFingerprint,data.sourceFingerprint);
    });
    await t.test('cambios de aplicabilidad invalidan fuentes; un plan con proyectos no se archiva al fallar',async()=>{
      const before=await multiAgeDiagnosticWorkspace(db,teacher,c.classroomId);assert.ok(before.ready);
      await db.query('update classrooms set religion_applicable=true where id=$1',[c.classroomId]);const changed=await multiAgeDiagnosticWorkspace(db,teacher,c.classroomId);assert.notEqual(changed.sourceFingerprint,before.sourceFingerprint);assert.equal(changed.ready,false);
      await db.query('update classrooms set religion_applicable=false where id=$1',[c.classroomId]);assert.ok((await multiAgeDiagnosticWorkspace(db,teacher,c.classroomId)).ready);
      const data=await multiAgeAnnualContext(db,teacher,c.classroomId),replacement=await saveMultiAgeAnnualDraft(db,teacher,{...request(),classroomId:c.classroomId,sourceFingerprint:data.sourceFingerprint,proposal});
      await assert.rejects(confirmMultiAgeAnnualPlan(db,teacher,{...request(),classroomId:c.classroomId,planId:replacement.planId,expectedRevision:replacement.revision}),/motivo/);
      assert.equal((await db.query('select status from annual_plans where id=$1',[draft.planId])).rows[0].status,'active');assert.equal((await db.query('select status from annual_plans where id=$1',[replacement.planId])).rows[0].status,'draft');
      assert.equal((await db.query('select count(*)::int n from learning_experiences where annual_plan_id=$1',[draft.planId])).rows[0].n,1);
      await confirmMultiAgeAnnualPlan(db,teacher,{...request(),classroomId:c.classroomId,planId:replacement.planId,expectedRevision:replacement.revision,reason:'Confirmar la nueva versión conservando el proyecto preparado.'});
      assert.equal((await db.query('select status from annual_plans where id=$1',[draft.planId])).rows[0].status,'archived');
      assert.equal((await db.query('select count(*)::int n from multi_age_annual_project_links where annual_plan_id=$1',[replacement.planId])).rows[0].n,1);
    });
  }finally{await db.close();}
});

test('grupos de dos edades e información ausente explícita; matrícula nueva invalida Mi año',{timeout:90000},async()=>{
  for(const ages of [[3,4],[3,5],[4,5]]){
    const {db,teacher,c,children}=await fixture('local',ages);
    try{
      for(const child of children)await review(db,teacher,child,[]);
      const data=await multiAgeAnnualContext(db,teacher,c.classroomId);assert.ok(data.diagnosis.ready);assert.ok(data.diagnosis.groups.every(g=>g.withObservations===0));
      const proposal=sampleMultiAgeAnnualProposal(data);validateMultiAgeAnnualProposal(proposal,data);
      const draft=await saveMultiAgeAnnualDraft(db,teacher,{...request(),classroomId:c.classroomId,sourceFingerprint:data.sourceFingerprint,proposal});await confirmMultiAgeAnnualPlan(db,teacher,{...request(),classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision});
      await enrollMultiAgeStudent(db,teacher,{...request(),classroomId:c.classroomId,expectedRevision:1,firstName:'Nuevo',lastName:'Ficticio',age:ages[0]});
      assert.equal((await multiAgeAnnualWorkspace(db,teacher,c.classroomId)).plans[0].current,false);
    }finally{await db.close();}
  }
});

test('Supabase temporal: RLS y guardas SQL de documentos diagnósticos y anuales V2',{timeout:90000},async()=>{
  const {db,teacher,other,c,children}=await fixture('supabase');
  try{
    await observe(db,teacher,children[0]);for(const child of children)await review(db,teacher,child);
    await confirmMultiAgeFamilyContext(db,teacher,{...request(),studentId:children[0].studentId,expectedAssignmentId:children[0].assignmentId,familyText:'Contexto familiar ficticio.'});await review(db,teacher,children[0]);
    const data=await multiAgeAnnualContext(db,teacher,c.classroomId),draft=await saveMultiAgeAnnualDraft(db,teacher,{...request(),classroomId:c.classroomId,sourceFingerprint:data.sourceFingerprint,proposal:sampleMultiAgeAnnualProposal(data)});
    await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
    for(const table of ['diagnostic_experience_observations','diagnostic_student_reviews','student_family_interviews','annual_plans'])assert.equal((await db.query(`select count(*)::int n from ${table} where classroom_id=$1`,[c.classroomId])).rows[0].n,0);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[teacher]);
    assert.equal((await db.query('select count(*)::int n from diagnostic_student_reviews where classroom_id=$1',[c.classroomId])).rows[0].n,4);
    await assert.rejects(db.query("update annual_plans set proposal='{}' where id=$1",[draft.planId]),/servidor|permission denied/);await db.exec('reset role');
    await assert.rejects(db.query("update annual_plans set document_context='{}' where id=$1",[draft.planId]),/contexto curricular/);
    const reviewRow=(await db.query('select * from diagnostic_student_reviews where student_id=$1 order by version desc limit 1',[children[0].studentId])).rows[0],details=structuredClone(reviewRow.details);details.curriculum_snapshot.age=5;
    await assert.rejects(db.query(`insert into diagnostic_student_reviews(id,classroom_id,student_id,version,status,details,source_snapshot,created_by,curriculum_contract_version) values($1,$2,$3,99,'confirmed',$4::jsonb,'{}',$5,2)`,[randomUUID(),c.classroomId,children[0].studentId,JSON.stringify(details),teacher]),/matrícula curricular/);
    await assert.rejects(db.query("update diagnostic_experience_observations set observation_text='Cambio directo' where student_id=$1",[children[0].studentId]),/corrección requiere/);
  }finally{await db.close();}
});

test('upgrade conserva fuentes, entrevistas, diagnóstico y Mi año V1 sin backfill curricular',{timeout:90000},async()=>{
  const teacher=randomUUID(),ids={},before={};let studentId,classroomId;
  const db=await openMultiAgeLocalDb({beforeMultiAge:async old=>{
    const c=await createPilotClassroom(old,teacher,{teacherName:'Docente V1',institutionName:'Control V1',section:'Control',age:4,year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'});classroomId=c.classroomId;
    await importStudentsForTeacher(old,teacher,[{firstName:'Histórico',lastName:'Ficticio'}]);studentId=(await old.query('select id from students where classroom_id=$1',[classroomId])).rows[0].id;
    for(const table of ['diagnostic_experience_observations','student_family_interviews','diagnostic_student_reviews','annual_plans'])ids[table]=randomUUID();
    await old.query(`insert into diagnostic_experience_observations(id,classroom_id,student_id,experience_id,aspect_id,competency_v4_id,observation_status,observation_text,created_by) values($1,$2,$3,'historical','oral','COM_ORAL','observed_without_judgment','Literal V1: conserva acentos y puntuación.',$4)`,[ids.diagnostic_experience_observations,classroomId,studentId,teacher]);
    for(const table of ['student_family_interviews','diagnostic_student_reviews']){
      await old.query(`insert into ${table}(id,classroom_id,student_id,version,status,details,created_by,teacher_confirmed_at${table==='diagnostic_student_reviews'?',source_snapshot':''}) values($1,$2,$3,1,'confirmed',$4::jsonb,$5,now()${table==='diagnostic_student_reviews'?',\'{}\'::jsonb':''})`,[ids[table],classroomId,studentId,JSON.stringify({literal:'Contenido V1 sin reescribir.'}),teacher]);
    }
    const curriculum=(await old.query('select id from curriculum_versions order by created_at desc,id limit 1')).rows[0].id;
    await old.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,teacher_confirmed_at) values($1,$2,$3,$4,1,'active',$5::jsonb,now())`,[ids.annual_plans,classroomId,c.schoolYearId??(await old.query('select school_year_id from classrooms where id=$1',[classroomId])).rows[0].school_year_id,curriculum,JSON.stringify({title:'Mi año V1 literal, sin conversión.'})]);
    for(const table of Object.keys(ids))before[table]=(await old.query(`select * from ${table} where id=$1`,[ids[table]])).rows[0];
  }});
  try{
    for(const table of Object.keys(ids)){
      const after=(await db.query(`select * from ${table} where id=$1`,[ids[table]])).rows[0];for(const key of Object.keys(before[table]))assert.deepEqual(after[key],before[table][key],`${table}.${key}`);
      if(table!=='diagnostic_experience_observations')assert.equal(after.curriculum_contract_version,1);else{assert.equal(after.curriculum_assignment_id,null);assert.deepEqual(after.curriculum_snapshot,{});}
    }
    assert.equal((await db.query('select count(*)::int n from student_curriculum_assignments where student_id=$1',[studentId])).rows[0].n,0);
    await assert.rejects(multiAgeDiagnosticContext(db,teacher,studentId),/no está disponible/);
    await assert.rejects(multiAgeAnnualWorkspace(db,teacher,classroomId),/no está disponible/);
  }finally{await db.close();}
});
