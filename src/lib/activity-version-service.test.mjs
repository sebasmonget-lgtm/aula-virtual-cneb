import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom } from "./pilot-onboarding-service.mjs";
import { copyConfirmedActivity } from "./activity-version-service.mjs";
import { confirmActivityWithCriterion } from "./activity-confirmation.mjs";
import { loadSavedDocument } from "./document-library-service.mjs";

const teacher="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
async function database() {
  const db=await PGlite.create();
  const migrations=new URL("../../local-db/migrations/",import.meta.url);
  for(const file of (await readdir(migrations)).filter((name)=>name.endsWith(".sql")).sort())
    await db.exec(await readFile(new URL(file,migrations),"utf8"));
  return db;
}

test("Actividad V2 copia V1 sin reasignar registros y la archiva solo al confirmar",async()=>{
  const db=await database();
  try {
    const {classroomId}=await createPilotClassroom(db,teacher,{teacherName:"Docente",institutionName:"Jardín",section:"A",age:5,year:2026,
      startsOn:"2026-03-01",endsOn:"2026-12-18",castellanoL2Applicable:false,religionApplicable:false});
    const experienceId=randomUUID(),sourceId=randomUUID(),studentId=randomUUID(),scheduleId=randomUUID();
    await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details)
      values($1,$2,'project','Huerto','Explorar','2026-04-01','2026-04-24','active','{"starting_point":"Huerto"}'::jsonb)`,[experienceId,classroomId]);
    const details={title:"Semillas",purpose:"Explorar semillas",meaningful_situation:"Encontramos semillas",competency_status:"unconfirmed",competency_id:null};
    await db.query(`insert into activities(id,experience_id,occurs_on,title,purpose,status,details,teacher_confirmed_at)
      values($1,$2,'2026-04-08','Semillas','Explorar semillas','active',$3::jsonb,now())`,[sourceId,experienceId,JSON.stringify(details)]);
    await db.query(`insert into students(id,classroom_id,first_name,last_name) values($1,$2,'Ana','Pérez')`,[studentId,classroomId]);
    await db.query(`insert into evidences(id,student_id,activity_id,type,observation_text,created_by)
      values($1,$2,$3,'observation','Observó la semilla',$4)`,[randomUUID(),studentId,sourceId,teacher]);
    await db.query(`insert into class_schedule_entries(id,classroom_id,scheduled_on,start_time,end_time,block_type,activity_id,title)
      values($1,$2,'2026-10-15','09:00','09:30','activity',$3,'Semillas')`,[scheduleId,classroomId,sourceId]);
    const copy=await copyConfirmedActivity(db,teacher,classroomId,sourceId);
    assert.equal(copy.version,2);
    assert.equal((await db.query(`select status from activities where id=$1`,[sourceId])).rows[0].status,"active");
    await assert.rejects(copyConfirmedActivity(db,teacher,classroomId,sourceId),{reason:"draft_exists"});
    await assert.rejects(copyConfirmedActivity(db,randomUUID(),classroomId,sourceId),{reason:"source_unavailable"});
    await db.query(`update activities set title='Semillas nuevas' where id=$1`,[copy.id]);
    await confirmActivityWithCriterion(db,copy.id,null);
    const rows=(await db.query(`select id,title,status,version from activities where id in ($1,$2) order by version`,[sourceId,copy.id])).rows;
    assert.deepEqual(rows.map((row)=>[row.status,row.version]),[["archived",1],["active",2]]);
    assert.equal(rows[0].title,"Semillas");
    assert.equal((await db.query(`select activity_id from evidences where student_id=$1`,[studentId])).rows[0].activity_id,sourceId);
    assert.equal((await db.query(`select activity_id from class_schedule_entries where id=$1`,[scheduleId])).rows[0].activity_id,sourceId);
    await assert.rejects(db.query(`update activities set title='Otro' where id=$1`,[sourceId]),/inmutable/);
    await assert.rejects(db.query(`delete from activities where id=$1`,[sourceId]),/inmutable/);
    assert.equal((await loadSavedDocument(db,teacher,"activity",sourceId)).title,"Semillas");
    const next=await copyConfirmedActivity(db,teacher,classroomId,copy.id);
    assert.equal(next.version,3);
  } finally {await db.close();}
});
