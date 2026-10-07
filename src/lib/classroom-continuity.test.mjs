import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { changeStudentEnrollment, inactiveStudents } from "./student-enrollment.mjs";
import { pendingPastActivities, reviewPastActivity } from "./past-activity-review.mjs";

test("matrícula reversible y revisión por fecha conservan historia y permisos",{timeout:60000},async t=>{
  const db=new PGlite();
  try{
    for(const file of (await readdir('local-db/migrations')).filter(file=>file.endsWith('.sql')).sort())await db.exec(await readFile('local-db/migrations/'+file,'utf8'));
    const teacher=randomUUID(),other=randomUUID();
    await createPilotClassroom(db,teacher,{teacherName:'Docente ficticia',institutionName:'Jardín ficticio',section:'QA',age:5,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
    await importStudentsForTeacher(db,teacher,[{firstName:'Ana',lastName:'Ficticia'}]);
    const student=(await db.query('select s.* from students s join classrooms c on c.id=s.classroom_id where c.teacher_id=$1 limit 1',[teacher])).rows[0];
    await t.test('retirar no elimina y CAS/otra docente bloquean cambios',async()=>{
      await assert.rejects(changeStudentEnrollment(db,other,student.id,{status:'inactive',expectedStatus:'active'}));
      await changeStudentEnrollment(db,teacher,student.id,{status:'inactive',expectedStatus:'active'});
      assert.equal((await inactiveStudents(db,teacher)).length,1);assert.equal((await inactiveStudents(db,other)).length,0);
      await assert.rejects(changeStudentEnrollment(db,teacher,student.id,{status:'inactive',expectedStatus:'active'}));
      await changeStudentEnrollment(db,teacher,student.id,{status:'active',expectedStatus:'inactive'});
      assert.equal((await db.query('select count(*)::int n from students where classroom_id=$1',[student.classroom_id])).rows[0].n,1);
    });
    const project=randomUUID(),activity=randomUUID(),entry=randomUUID();
    await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status) values($1,$2,'project','QA','QA','2026-10-01','2026-10-09','active')`,[project,student.classroom_id]);
    await db.query(`insert into activities(id,experience_id,title,purpose,occurs_on,status) values($1,$2,'Actividad ficticia','Explorar','2026-10-05','active')`,[activity,project]);
    await db.query(`insert into class_schedule_entries(id,classroom_id,scheduled_on,start_time,end_time,block_type,title,activity_id) values($1,$2,'2026-10-05','09:00','09:45','activity','Actividad ficticia',$3)`,[entry,student.classroom_id,activity]);
    await db.query(`insert into daily_execution_logs(id,schedule_entry_id,execution_date,status) values($1,$2,'2026-10-05','active')`,[randomUUID(),entry]);
    await t.test('fecha transcurrida no inventa realización, nota, hora ni evidencia',async()=>{
      assert.equal((await pendingPastActivities(db,teacher,'2026-10-06'))[0].display_status,'date_elapsed_pending_review');
      assert.equal((await pendingPastActivities(db,other,'2026-10-06')).length,0);
      assert.equal((await db.query('select status,teacher_closure_note from daily_execution_logs')).rows[0].status,'active');
      await assert.rejects(reviewPastActivity(db,other,{scheduleEntryId:entry,action:'complete',closureNote:''},'2026-10-06'));
      await reviewPastActivity(db,teacher,{scheduleEntryId:entry,action:'skip',closureNote:'No se realizó por lluvia'},'2026-10-06');
      assert.equal((await pendingPastActivities(db,teacher,'2026-10-06')).length,0);
      const row=(await db.query('select * from daily_execution_logs')).rows[0];assert.equal(row.status,'skipped');assert.equal(row.teacher_closure_note,'No se realizó por lluvia');assert.equal(row.actual_ended_at,null);
      await assert.rejects(reviewPastActivity(db,teacher,{scheduleEntryId:entry,action:'complete',closureNote:''},'2026-10-06'));
      assert.equal((await db.query('select count(*)::int n from evidences where student_id=$1',[student.id])).rows[0].n,0);
    });
  }finally{await db.close();}
});
