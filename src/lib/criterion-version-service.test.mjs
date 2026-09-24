import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom } from "./pilot-onboarding-service.mjs";
import { copyConfirmedCriterion, confirmCriterionVersion } from "./criterion-version-service.mjs";
import { loadSavedDocument } from "./document-library-service.mjs";

const teacher="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
async function database() {
  const db=await PGlite.create(),migrations=new URL("../../local-db/migrations/",import.meta.url);
  for(const file of (await readdir(migrations)).filter((name)=>name.endsWith(".sql")).sort())
    await db.exec(await readFile(new URL(file,migrations),"utf8"));
  return db;
}

test("Criterio V2 conserva evidencia V1 y el Word histórico lee el criterio de origen",async()=>{
  const db=await database();
  try {
    const {classroomId}=await createPilotClassroom(db,teacher,{teacherName:"Docente",institutionName:"Jardín",section:"A",age:5,year:2026,
      startsOn:"2026-03-01",endsOn:"2026-12-18",castellanoL2Applicable:false,religionApplicable:false});
    const experienceId=randomUUID(),activityId=randomUUID(),studentId=randomUUID(),criterionId=randomUUID();
    await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details)
      values($1,$2,'project','Huerto','Explorar','2026-04-01','2026-04-24','active','{"starting_point":"Huerto"}'::jsonb)`,[experienceId,classroomId]);
    await db.query(`insert into activities(id,experience_id,occurs_on,title,purpose,status,details)
      values($1,$2,'2026-04-08','Semillas','Explorar semillas','active','{"meaningful_situation":"Encontramos semillas"}'::jsonb)`,[activityId,experienceId]);
    const details={competency_id:"SCI_INDAGA",criterion_text:"V1: pregunta sobre semillas",expected_evidence:"Pregunta",acceptable_evidence_variations:[],observation_focus:["Preguntas"],evidence_scope:"individual",teacher_caution:"Escuchar"};
    await db.query(`insert into activity_criteria(id,activity_id,competency_id,competency_v4_id,criterion_text,details,status,teacher_confirmed_at)
      values($1,$2,null,'SCI_INDAGA',$3,$4::jsonb,'active',now())`,[criterionId,activityId,details.criterion_text,JSON.stringify(details)]);
    await db.query(`insert into students(id,classroom_id,first_name,last_name) values($1,$2,'Ana','Pérez')`,[studentId,classroomId]);
    await db.query(`insert into evidences(id,student_id,activity_id,criterion_id,type,observation_text,created_by)
      values($1,$2,$3,$4,'observation','Preguntó por el agua',$5)`,[randomUUID(),studentId,activityId,criterionId,teacher]);
    const copy=await copyConfirmedCriterion(db,teacher,classroomId,criterionId);
    assert.equal(copy.version,2);
    await assert.rejects(copyConfirmedCriterion(db,teacher,classroomId,criterionId),{reason:"draft_exists"});
    await assert.rejects(copyConfirmedCriterion(db,randomUUID(),classroomId,criterionId),{reason:"source_unavailable"});
    await db.query(`update activity_criteria set criterion_text='V2: compara semillas',details=$1::jsonb where id=$2`,
      [JSON.stringify({...details,criterion_text:"V2: compara semillas"}),copy.id]);
    await confirmCriterionVersion(db,copy.id,activityId);
    assert.equal((await db.query(`select criterion_id from evidences where student_id=$1`,[studentId])).rows[0].criterion_id,criterionId);
    assert.equal((await db.query(`select status from activity_criteria where id=$1`,[criterionId])).rows[0].status,"archived");
    assert.equal((await loadSavedDocument(db,teacher,"activity",activityId)).active_criterion.criterion_text,"V2: compara semillas");
    await db.query(`update activities set status='archived' where id=$1`,[activityId]);
    const historical=await loadSavedDocument(db,teacher,"activity",activityId);
    assert.equal(historical.active_criterion.criterion_text,"V1: pregunta sobre semillas");
    assert.equal(historical.registered_evidence[0].criterion_text,"V1: pregunta sobre semillas");
    await assert.rejects(db.query(`update activity_criteria set criterion_text='Otro' where id=$1`,[criterionId]),/inmutable/);
    await assert.rejects(db.query(`delete from activity_criteria where id=$1`,[criterionId]),/inmutable/);
  } finally {await db.close();}
});

test("la migración Supabase cambia el índice único sin perder criterios existentes",async()=>{
  const db=await PGlite.create();
  try {
    await db.exec(`create table public.activities(id uuid primary key);
      create table public.activity_criteria(id uuid primary key,activity_id uuid references public.activities(id),
        competency_v4_id text,criterion_text text,status text,updated_at timestamptz default now());
      create unique index activity_criteria_v4_activity_competency_unique
        on public.activity_criteria(activity_id,competency_v4_id) where competency_v4_id is not null;`);
    const activity=randomUUID(),first=randomUUID(),second=randomUUID();
    await db.query(`insert into public.activities(id) values($1)`,[activity]);
    await db.query(`insert into public.activity_criteria(id,activity_id,competency_v4_id,criterion_text,status)
      values($1,$2,'SCI_INDAGA','Primero','active')`,[first,activity]);
    await db.exec(await readFile(new URL("../../supabase/migrations/202609240005_criterion_versions.sql",import.meta.url),"utf8"));
    await db.query(`insert into public.activity_criteria(id,activity_id,competency_v4_id,criterion_text,status,version,supersedes_criterion_id)
      values($1,$2,'SCI_INDAGA','Segundo','draft',2,$3)`,[second,activity,first]);
    await assert.rejects(db.query(`insert into public.activity_criteria(id,activity_id,competency_v4_id,criterion_text,status)
      values($1,$2,'SCI_INDAGA','Duplicado','active')`,[randomUUID(),activity]));
    assert.equal((await db.query(`select count(*)::int as n from public.activity_criteria where activity_id=$1`,[activity])).rows[0].n,2);
  } finally {await db.close();}
});
