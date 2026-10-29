import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { openMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { createPilotClassroom, importStudentsForTeacher } from './pilot-onboarding-service.mjs';
import { classroomCurriculumScope } from './classroom-curriculum-scope.mjs';
import { studentCurriculumScope } from './student-curriculum-service.mjs';
import { createMultiAgeClassroom,enrollMultiAgeStudent,confirmMultiAgeActivity,observeMultiAgeStudent,multiAgeAssessmentContext,
  confirmMultiAgeGrade,confirmMultiAgeConclusion,confirmMultiAgeFamilyReport,multiAgeFamilyDocument,multiAgeLocalWorkspace } from './multi-age-local-service.mjs';
import { renderFamilyReportWord } from './family-report-word.mjs';
import { loadKnowledgeBaseV4 } from './knowledge-base-v4.mjs';
import { sampleMultiAgeBlueprint } from '../../scripts/fixtures/multi-age-local-fixture.mjs';
import { multiAgePlanningContext } from './age-scoped-criteria.mjs';

test('subconjuntos de edades, nacimiento opcional y referencias de ciclo se conservan',{timeout:90000},async t=>{
  const db=await openMultiAgeLocalDb();
  try{
    for(const ages of [[3,4],[3,5],[4,5]])await t.test(`aula ${ages.join('-')}`,async()=>{
      const teacher=randomUUID();await db.query("insert into profiles(user_id,display_name) values($1,'Docente ficticia')",[teacher]);
      const c=await createMultiAgeClassroom(db,teacher,{clientRequestId:randomUUID(),teacherConfirmed:true,ages,section:'Grupo local',institutionName:'Jardín ficticio',year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'});
      const student=await enrollMultiAgeStudent(db,teacher,{clientRequestId:randomUUID(),teacherConfirmed:true,classroomId:c.classroomId,expectedRevision:1,firstName:'Niño',lastName:'Ficticio',age:ages[0],birthDate:'2022-11-01'});
      assert.equal((await studentCurriculumScope(db,teacher,student.studentId)).age,ages[0]);
      const blueprint=sampleMultiAgeBlueprint();blueprint.participantAges=ages;blueprint.criteriaFamilies[0].variants=blueprint.criteriaFamilies[0].variants.filter(v=>ages.includes(v.curricular_age));
      await confirmMultiAgeActivity(db,teacher,{clientRequestId:randomUUID(),teacherConfirmed:true,classroomId:c.classroomId,expectedRevision:1,blueprint});
      const workspace=await multiAgeLocalWorkspace(db,teacher,c.classroomId);assert.deepEqual(workspace.criteria.map(c=>c.curricular_age),ages);
      const planning=await multiAgePlanningContext(workspace.classroom,['COM_ESCRITURA']);
      const three=planning.curriculum.find(r=>r.age===3);if(three)assert.equal(three.official_performance_catalog.competencies[0].performances.length,0);
    });
  }finally{await db.close();}
});

test('multiedad local completa: upgrade sin backfill, tres edades, evidencia, valoración docente e informe', {timeout:90000},async t=>{
  const legacyTeacher=randomUUID(),teacher=randomUUID(),other=randomUUID();let legacyId,legacyStudent,before,legacyObservation,legacyCriterion;
  const db=await openMultiAgeLocalDb({beforeMultiAge:async old=>{
    const result=await createPilotClassroom(old,legacyTeacher,{teacherName:'Control ficticio',institutionName:'Control V1',section:'Control',age:4,year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'});legacyId=result.classroomId;
    await importStudentsForTeacher(old,legacyTeacher,[{firstName:'Control',lastName:'Ficticio'}]);
    legacyStudent=(await old.query('select * from students where classroom_id=$1',[legacyId])).rows[0];before=JSON.stringify(legacyStudent);
    const project=randomUUID(),activity=randomUUID(),criterion=randomUUID();
    await old.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status) values($1,$2,'project','Control V1','Conservar fuentes','2026-10-22','2026-10-22','active')`,[project,legacyId]);
    await old.query(`insert into activities(id,experience_id,title,purpose,occurs_on,status) values($1,$2,'Control V1','Conservar fuentes','2026-10-22','active')`,[activity,project]);
    await old.query(`insert into activity_criteria(id,activity_id,competency_v4_id,criterion_text,status,teacher_confirmed_at) values($1,$2,'COM_ORAL','Criterio histórico de control','active',now())`,[criterion,activity]);
    legacyCriterion=(await old.query('select * from activity_criteria where id=$1',[criterion])).rows[0];
    const {saveOrdinaryObservation}=await import('./ordinary-observation-service.mjs');
    legacyObservation=(await saveOrdinaryObservation(old,legacyTeacher,{studentId:legacyStudent.id,activityId:activity,criterionId:criterion,sourceKind:'guided',clientRequestId:randomUUID(),rawText:'Texto original V1, con su puntuación.'},{occurredAt:new Date('2026-10-22T12:00:00-05:00')})).observation;
  }});
  try{
    await db.query("insert into profiles(user_id,display_name) values($1,'Docente ficticia'),($2,'Otra docente ficticia')",[teacher,other]);
    const setup={clientRequestId:randomUUID(),teacherConfirmed:true,ages:[3,4,5],section:'Semillas',institutionName:'Jardín ficticio local',year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'};
    const classroom=await createMultiAgeClassroom(db,teacher,setup),students=[];
    await t.test('V1 conserva estudiante y grupo heredado sin asignaciones inventadas',async()=>{
      assert.equal(JSON.stringify((await db.query('select * from students where id=$1',[legacyStudent.id])).rows[0]),before);
      assert.equal((await classroomCurriculumScope(db,legacyTeacher,legacyId)).contract,1);
      assert.equal((await studentCurriculumScope(db,legacyTeacher,legacyStudent.id)).age,4);
      assert.equal((await db.query('select count(*)::int n from student_curriculum_assignments where classroom_id=$1',[legacyId])).rows[0].n,0);
      for(const [table,old] of [['ordinary_observations',legacyObservation],['activity_criteria',legacyCriterion]]){
        const current=(await db.query(`select * from ${table} where id=$1`,[old.id])).rows[0];
        for(const key of Object.keys(old))assert.deepEqual(current[key],old[key],`${table}.${key} conservado`);
      }
      assert.equal((await createMultiAgeClassroom(db,teacher,setup)).classroomId,classroom.classroomId);
      await assert.rejects(createMultiAgeClassroom(db,teacher,{...setup,ages:[3,5]}),/otro contenido/);
      await assert.rejects(classroomCurriculumScope(db,other,classroom.classroomId),/no está disponible/);
      await assert.rejects(createMultiAgeClassroom({},teacher,setup),/base local aislada/);
    });
    for(const age of [3,4,5])students.push(await enrollMultiAgeStudent(db,teacher,{classroomId:classroom.classroomId,clientRequestId:randomUUID(),teacherConfirmed:true,expectedRevision:1,firstName:`Niño${age}`,lastName:'Ficticio',age}));
    await t.test('la matrícula necesita grupo, no nacimiento, y rechaza otra edad o docente',async()=>{
      const person=await studentCurriculumScope(db,teacher,students[0].studentId);assert.equal(person.age,3);assert.equal(person.student.birth_date,null);
      await assert.rejects(enrollMultiAgeStudent(db,teacher,{classroomId:classroom.classroomId,clientRequestId:randomUUID(),teacherConfirmed:true,expectedRevision:1,firstName:'Niña',lastName:'Ficticia',age:6}),/grupos/);
      await assert.rejects(enrollMultiAgeStudent(db,other,{classroomId:classroom.classroomId,clientRequestId:randomUUID(),teacherConfirmed:true,expectedRevision:1,firstName:'Niña',lastName:'Ficticia',age:3}),/no está disponible/);
    });
    const activityInput={classroomId:classroom.classroomId,clientRequestId:randomUUID(),teacherConfirmed:true,expectedRevision:1,blueprint:sampleMultiAgeBlueprint()};
    const activity=await confirmMultiAgeActivity(db,teacher,activityInput);
    const workspace=await multiAgeLocalWorkspace(db,teacher,classroom.classroomId),periodId=workspace.periods[0].id;
    await t.test('una actividad conserva tres variantes y referencias por ID; el retry no duplica',async()=>{
      assert.equal(workspace.activities.length,1);assert.equal(workspace.criteria.length,3);assert.equal(new Set(workspace.criteria.map(c=>c.id)).size,3);
      assert.equal((await confirmMultiAgeActivity(db,teacher,activityInput)).activityId,activity.activityId);
      for(const age of [3,4,5])assert.deepEqual(workspace.criteria.find(c=>c.curricular_age===age).details.official_performance_refs,[`PCI2016.COM_ORAL.${age}.03`]);
      assert.deepEqual(workspace.planningContext.curriculum.map(c=>c.age),[3,4,5]);assert.equal('target_age' in workspace.planningContext,false);
      const wrong=sampleMultiAgeBlueprint();wrong.criteriaFamilies[0].variants[0].official_performance_refs=['PCI2016.COM_ORAL.5.03'];
      await assert.rejects(confirmMultiAgeActivity(db,teacher,{...activityInput,clientRequestId:randomUUID(),blueprint:wrong}),/edad/);
      const count=(await db.query('select count(*)::int n from activities a join learning_experiences e on e.id=a.experience_id where e.classroom_id=$1',[classroom.classroomId])).rows[0].n;assert.equal(count,1);
    });
    const captures=[];
    for(const [i,person] of students.entries()){
      const age=i+3,criterion=workspace.criteria.find(c=>c.curricular_age===age);
      const request={studentId:person.studentId,activityId:activity.activityId,criterionId:criterion.id,periodId,observedOn:'2026-10-22',clientRequestId:randomUUID(),rawText:`Registro ficticio ${age}: contó con sus palabras una parte del relato.`};
      captures.push(request);await observeMultiAgeStudent(db,teacher,request);
    }
    await t.test('captura y SQL rechazan cruces de edad, conservan texto y asignación',async()=>{
      const first=captures[0];const repeated=await observeMultiAgeStudent(db,teacher,first);assert.equal(repeated.created,false);
      assert.equal(repeated.observation.raw_text,first.rawText);assert.equal(repeated.observation.curriculum_assignment_id,students[0].assignmentId);
      await assert.rejects(observeMultiAgeStudent(db,teacher,{...first,clientRequestId:randomUUID(),criterionId:workspace.criteria.find(c=>c.curricular_age===5).id}),/grupo curricular/);
      await assert.rejects(observeMultiAgeStudent(db,other,{...first,clientRequestId:randomUUID()}),/no está disponible/);
      await assert.rejects(db.query(`insert into ordinary_observations(id,classroom_id,student_id,created_by,client_request_id,request_fingerprint,occurred_at,raw_text,source_kind,activity_id,captured_criterion_id,curriculum_assignment_id)
        values($1,$2,$3,$4,$5,$6,now(),'Cruce inválido','guided',$7,$8,$9)`,[randomUUID(),classroom.classroomId,students[0].studentId,teacher,randomUUID(),'a'.repeat(64),activity.activityId,workspace.criteria.find(c=>c.curricular_age===5).id,students[0].assignmentId]),/criterio/);
      assert.equal((await db.query('select count(*)::int n from ordinary_observations where classroom_id=$1',[classroom.classroomId])).rows[0].n,3);
    });
    const gradeInputs=[];
    for(const [i,person] of students.entries()){
      const input={studentId:person.studentId,competencyId:'COM_ORAL',periodId};const data=await multiAgeAssessmentContext(db,teacher,input);
      assert.equal(data.assessmentContext.curriculum.target_age,i+3);assert.equal(data.sourceRows.length,1);
      assert.ok(data.assessmentContext.curriculum.age_performances.every(p=>p.id.includes(`.${i+3}.`)));
      assert.equal(JSON.stringify(data.assessmentContext).includes('birth_date'),false);
      gradeInputs.push({...input,clientRequestId:randomUUID(),teacherConfirmed:true,achievementLevel:['B','A','AD'][i],sourceFingerprint:data.sourceFingerprint});
    }
    const grades=[];
    await t.test('valoraciones son explícitas, con fuentes vigentes; conclusiones esperan todas las notas',async()=>{
      await assert.rejects(confirmMultiAgeGrade(db,teacher,{...gradeInputs[0],teacherConfirmed:false}),/profesora/);
      await assert.rejects(confirmMultiAgeGrade(db,teacher,{...gradeInputs[0],sourceFingerprint:'obsoleto'}),/Cambió/);
      grades.push(await confirmMultiAgeGrade(db,teacher,gradeInputs[0]));
      await assert.rejects(confirmMultiAgeConclusion(db,teacher,{...gradeInputs[0],clientRequestId:randomUUID(),assessmentId:grades[0].assessmentId,conclusionText:'Texto docente de prueba.'}),/Primero completa/);
      for(const input of gradeInputs.slice(1))grades.push(await confirmMultiAgeGrade(db,teacher,input));
      await assert.rejects(confirmMultiAgeFamilyReport(db,teacher,{clientRequestId:randomUUID(),teacherConfirmed:true,studentId:students[0].studentId,periodId}),/conclusiones/);
    });
    for(const [i,input] of gradeInputs.entries())await confirmMultiAgeConclusion(db,teacher,{...input,clientRequestId:randomUUID(),assessmentId:grades[i].assessmentId,conclusionText:`Conclusión docente ficticia del grupo de ${i+3} años basada en el registro.`});
    const reportIds=[];
    for(const person of students){const result=await confirmMultiAgeFamilyReport(db,teacher,{clientRequestId:randomUUID(),teacherConfirmed:true,studentId:person.studentId,periodId});reportIds.push(result.reportId);}
    await t.test('informe y Word usan grupo y texto confirmados; historia y V1 permanecen intactos',async()=>{
      const kb=await loadKnowledgeBaseV4();
      for(const [i,id] of reportIds.entries()){
        const document=await multiAgeFamilyDocument(db,teacher,id);assert.equal(document.age,i+3);
        assert.equal(document.content.sections[0].progress_summary,`Conclusión docente ficticia del grupo de ${i+3} años basada en el registro.`);
        const buffer=await renderFamilyReportWord(document,kb.competencyCards),zip=await JSZip.loadAsync(buffer),xml=await zip.file('word/document.xml').async('string');
        assert.ok(xml.includes(`${i+3} años`));assert.ok(xml.includes(document.content.sections[0].progress_summary));
      }
      await assert.rejects(multiAgeFamilyDocument(db,other,reportIds[0]),/no está disponible/);
      assert.equal(JSON.stringify((await db.query('select * from students where id=$1',[legacyStudent.id])).rows[0]),before);
      assert.equal((await db.query('select count(*)::int n from daily_execution_logs')).rows[0].n,0);
      const supers=await readFile('supabase/migrations/202610220001_multi_age_foundation.sql','utf8');assert.ok(supers.includes('enable row level security'));
    });
  }finally{await db.close();}
});
