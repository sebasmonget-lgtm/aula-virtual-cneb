import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { createMultiAgeClassroom,enrollMultiAgeStudent,confirmMultiAgeActivity } from './multi-age-local-service.mjs';
import { sampleMultiAgeBlueprint } from '../../scripts/fixtures/multi-age-local-fixture.mjs';

test('esquema Supabase en SQL temporal: RLS de dos docentes, FK e historia inmutable',{timeout:90000},async t=>{
  const db=await openMultiAgeLocalDb({schema:'supabase'}),teacher=randomUUID(),other=randomUUID();
  try{
    await db.query('insert into auth.users(id) values($1),($2)',[teacher,other]);
    await db.query("insert into profiles(user_id,display_name) values($1,'Docente ficticia'),($2,'Otra docente ficticia') on conflict(user_id) do nothing",[teacher,other]);
    const setup=id=>({clientRequestId:randomUUID(),teacherConfirmed:true,ages:[3,4,5],section:id,institutionName:'Institución ficticia',year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'});
    const a=await createMultiAgeClassroom(db,teacher,setup('Propia')),b=await createMultiAgeClassroom(db,other,setup('Otra'));
    const child=await enrollMultiAgeStudent(db,teacher,{clientRequestId:randomUUID(),teacherConfirmed:true,classroomId:a.classroomId,expectedRevision:1,firstName:'Prueba',lastName:'Ficticia',age:3});
    await t.test('la docente solo lee sus grupos y matrículas; no escribe tablas de servidor',async()=>{
      await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[teacher]);
      assert.equal((await db.query('select count(*)::int n from classroom_age_groups')).rows[0].n,3);
      assert.equal((await db.query('select count(*)::int n from student_curriculum_assignments')).rows[0].n,1);
      assert.equal((await db.query('select count(*)::int n from classroom_age_groups where classroom_id=$1',[b.classroomId])).rows[0].n,0);
      await assert.rejects(db.query('delete from student_curriculum_assignments where id=$1',[child.assignmentId]),/permission denied/);
      await assert.rejects(db.query('insert into classroom_age_groups(id,classroom_id,age_grade_id) select $1,$2,age_grade_id from classroom_age_groups limit 1',[randomUUID(),b.classroomId]),/permission denied/);
      await db.exec('reset role');
    });
    await t.test('el backend tampoco puede cruzar aula, docente o año de una matrícula',async()=>{
      const own=(await db.query('select * from student_curriculum_assignments where id=$1',[child.assignmentId])).rows[0];
      await assert.rejects(db.query(`insert into student_curriculum_assignments(id,student_id,classroom_id,school_year_id,classroom_group_id,age_grade_id,revision,source,confirmed_by)
        values($1,$2,$3,$4,$5,$6,2,'teacher_confirmed',$7)`,[randomUUID(),child.studentId,b.classroomId,own.school_year_id,own.classroom_group_id,own.age_grade_id,teacher]),/no corresponde/);
      await assert.rejects(db.query('update student_curriculum_assignments set age_grade_id=$1 where id=$2',[randomUUID(),child.assignmentId]),/inmutable/);
      await assert.rejects(db.query("update classroom_curriculum_versions set snapshot='{}'::jsonb where classroom_id=$1",[a.classroomId]),/inmutable/);
      await assert.rejects(db.query('delete from classroom_curriculum_versions where classroom_id=$1',[a.classroomId]),/inmutable/);
    });
    await t.test('unicidad por edad, contrato y linaje mantiene tres criterios de una competencia',async()=>{
      const result=await confirmMultiAgeActivity(db,teacher,{clientRequestId:randomUUID(),teacherConfirmed:true,classroomId:a.classroomId,expectedRevision:1,blueprint:sampleMultiAgeBlueprint()});
      const criteria=(await db.query('select * from activity_criteria where activity_id=$1',[result.activityId])).rows;assert.equal(criteria.length,3);
      const cr=criteria[0];
      await assert.rejects(db.query(`insert into activity_criteria(id,activity_id,competency_v4_id,criterion_text,details,status,teacher_confirmed_at,curriculum_contract_version,curricular_age,criterion_family_id)
        values($1,$2,'COM_ORAL','Duplicado','{}','active',now(),2,$3,$4)`,[randomUUID(),cr.activity_id,cr.curricular_age,cr.criterion_family_id]),/duplicate key/);
      await assert.rejects(db.query(`insert into activity_criteria(id,activity_id,competency_v4_id,criterion_text,status) values($1,$2,'COM_ORAL','Contrato erróneo','draft')`,[randomUUID(),cr.activity_id]),/mezclan contratos/);
    });
  }finally{await db.close();}
});
