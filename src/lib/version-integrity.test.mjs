import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom } from "./pilot-onboarding-service.mjs";
import { ANNUAL_PLAN_TEMPLATE_FORMAT } from "./annual-plan-contract.mjs";
import { copyConfirmedAnnualPlan, confirmAnnualPlanVersion } from "./annual-plan-version-service.mjs";
import { copyConfirmedLearningExperience } from "./learning-experience-version-service.mjs";
import { copyConfirmedActivity } from "./activity-version-service.mjs";
import { confirmActivityWithCriterion } from "./activity-confirmation.mjs";
import { copyConfirmedCriterion } from "./criterion-version-service.mjs";
import { VersionConflictError, expectedRevision, httpStatusForError, publicErrorMessage, versionTransaction } from "./version-integrity.mjs";

test("acepta revisiones bigint serializadas sin admitir valores ambiguos o inseguros", () => {
  assert.equal(expectedRevision("1"), 1);
  assert.equal(expectedRevision("42"), 42);
  assert.equal(expectedRevision(2), 2);
  for (const value of ["0", "01", "2.0", " 2", "2 ", "1e3", "9007199254740992", 0, 1.5, null])
    assert.throws(() => expectedRevision(value), VersionConflictError);
});

test("errores SQL no exponen nombres de tablas ni valores al cliente",()=>{
  assert.equal(publicErrorMessage({code:"23503",message:"Key (student_id)=(private-id) is not present in table students"}),
    "El registro relacionado cambió o ya no está disponible.");
  for (const [code,status] of [["23505",409],["23503",409],["40001",409],["40P01",409],["42501",403],["22P02",400],["23514",400],["57014",500]])
    assert.equal(httpStatusForError({code}),status);
});

const teacherA="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const teacherB="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

async function fixture({beforeIntegrityMigration=false}={}) {
  const db=await PGlite.create();
  const migrations=new URL("../../local-db/migrations/",import.meta.url);
  for(const file of (await readdir(migrations)).filter((name)=>name.endsWith(".sql")&&(!beforeIntegrityMigration||name!=="0044_version_integrity.sql")).sort())
    await db.exec(await readFile(new URL(file,migrations),"utf8"));
  const a=await createPilotClassroom(db,teacherA,{teacherName:"Docente A",institutionName:"Jardín A",section:"A",age:5,year:2026,
    startsOn:"2026-03-01",endsOn:"2026-12-18",castellanoL2Applicable:false,religionApplicable:false});
  const b=await createPilotClassroom(db,teacherB,{teacherName:"Docente B",institutionName:"Jardín B",section:"B",age:4,year:2027,
    startsOn:"2027-03-01",endsOn:"2027-12-17",castellanoL2Applicable:false,religionApplicable:false});
  const curriculum=(await db.query("select id from curriculum_versions where active=true limit 1")).rows[0].id;
  const diagnosis=randomUUID(),plan=randomUUID(),experience=randomUUID(),activity=randomUUID(),criterion=randomUUID(),studentA=randomUUID(),studentB=randomUUID(),evidence=randomUUID(),schedule=randomUUID();
  await db.query(`insert into diagnostic_group_reviews(id,classroom_id,version,status,details,source_snapshot,created_by,teacher_confirmed_at)
    values($1,$2,1,'confirmed','{}'::jsonb,'[]'::jsonb,$3,now())`,[diagnosis,a.classroomId,teacherA]);
  const proposal={plan_format:ANNUAL_PLAN_TEMPLATE_FORMAT,title:"Plan de prueba",proposed_experiences:Array.from({length:12},(_,i)=>({title:`Proyecto ${i+1}`,experience_type:"project",period:"Bimestre 1"}))};
  await db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,document_context,teacher_confirmed_at)
    values($1,$2,$3,$4,1,'active',$5::jsonb,'{}'::jsonb,now())`,[plan,a.classroomId,a.schoolYearId,curriculum,JSON.stringify(proposal)]);
  for(let i=1;i<=12;i++) await db.query(`insert into project_slots(id,annual_plan_id,slot_index,duration_weeks,starts_on,ends_on)
    values($1,$2,$3,2,'2026-03-30','2026-04-10')`,[randomUUID(),plan,i]);
  await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details)
    values($1,$2,'project','Huerto','Explorar','2026-04-01','2026-04-24','active','{"starting_point":"Huerto"}'::jsonb)`,[experience,a.classroomId]);
  await db.query(`insert into activities(id,experience_id,occurs_on,title,purpose,status,details,teacher_confirmed_at)
    values($1,$2,'2026-04-08','Semillas','Explorar','active','{"meaningful_situation":"Semillas"}'::jsonb,now())`,[activity,experience]);
  await db.query(`insert into activity_criteria(id,activity_id,competency_v4_id,criterion_text,details,status,teacher_confirmed_at)
    values($1,$2,'COM_ORAL','Expresa ideas','{"criterion_text":"Expresa ideas"}'::jsonb,'active',now())`,[criterion,activity]);
  await db.query(`insert into students(id,classroom_id,first_name,last_name) values($1,$2,'Ana','Pérez'),($3,$4,'Luis','Rojas')`,
    [studentA,a.classroomId,studentB,b.classroomId]);
  await db.query(`insert into evidences(id,student_id,activity_id,criterion_id,type,observation_text,created_by)
    values($1,$2,$3,$4,'observation','Expresó una idea',$5)`,[evidence,studentA,activity,criterion,teacherA]);
  await db.query(`insert into class_schedule_entries(id,classroom_id,scheduled_on,start_time,end_time,block_type,activity_id,title)
    values($1,$2,'2026-10-15','09:00','09:30','activity',$3,'Semillas')`,[schedule,a.classroomId,activity]);
  return {db,a,b,diagnosis,plan,experience,activity,criterion,studentA,studentB,evidence,schedule};
}

test("migración eleva cadenas históricas y rechaza árboles inconsistentes sin borrar datos",async()=>{
  const migrations=new URL("../../local-db/migrations/",import.meta.url);
  const sql=await readFile(new URL("0044_version_integrity.sql",migrations),"utf8");
  const valid=await fixture({beforeIntegrityMigration:true});
  try {
    await valid.db.exec("begin");await valid.db.exec(sql);await valid.db.exec("commit");
    const row=(await valid.db.query(`select lineage_id,revision from activities where id=$1`,[valid.activity])).rows[0];
    assert.equal(row.lineage_id,valid.activity);assert.equal(Number(row.revision),1);
    assert.equal((await valid.db.query(`select count(*)::int as n from evidences where id=$1`,[valid.evidence])).rows[0].n,1);
  } finally {await valid.db.close();}
  const bad=await fixture({beforeIntegrityMigration:true});
  try {
    const curriculum=(await bad.db.query("select id from curriculum_versions where active=true limit 1")).rows[0].id;
    await bad.db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal)
      values($1,$2,$3,$4,1,'draft','{}'::jsonb)`,[randomUUID(),bad.a.classroomId,bad.b.schoolYearId,curriculum]);
    await bad.db.exec("begin");
    await assert.rejects(bad.db.exec(sql),/annual_plans contains a classroom\/year mismatch/);
    await bad.db.exec("rollback");
    assert.equal((await bad.db.query(`select count(*)::int as n from annual_plans where classroom_id=$1`,[bad.a.classroomId])).rows[0].n,2);
    assert.equal((await bad.db.query(`select count(*)::int as n from information_schema.columns where table_name='annual_plans' and column_name='revision'`)).rows[0].n,0);
  } finally {await bad.db.close();}
});

function oneWinner(results) {
  assert.equal(results.filter((r)=>r.status==="fulfilled").length,1);
  assert.equal(results.filter((r)=>r.status==="rejected").length,1);
  assert.ok(results.find((r)=>r.status==="rejected").reason instanceof VersionConflictError);
  return results.find((r)=>r.status==="fulfilled").value;
}

test("copias y confirmaciones simultáneas conservan un vigente y devuelven conflicto",async()=>{
  const f=await fixture();const {db}=f;
  try {
    const context={id:f.a.classroomId,school_year_id:f.a.schoolYearId,source_diagnostic_review_id:f.diagnosis,
      context_v4:{diagnostic_review_current:true,source_fingerprint:"huella"}};
    const planV2=oneWinner(await Promise.allSettled([
      copyConfirmedAnnualPlan(db,teacherA,context,f.plan,{},1),copyConfirmedAnnualPlan(db,teacherA,context,f.plan,{},1)]));
    assert.equal((await db.query(`select count(*)::int as n from annual_plans where school_year_id=$1 and status='draft'`,[f.a.schoolYearId])).rows[0].n,1);
    oneWinner(await Promise.allSettled([
      confirmAnnualPlanVersion(db,context,planV2.id,1),confirmAnnualPlanVersion(db,context,planV2.id,1)]));
    assert.equal((await db.query(`select count(*)::int as n from annual_plans where school_year_id=$1 and status='active'`,[f.a.schoolYearId])).rows[0].n,1);
    const planV3=await copyConfirmedAnnualPlan(db,teacherA,context,planV2.id,{},2);
    const edits=await Promise.allSettled(["Primera edición","Segunda edición"].map((title)=>versionTransaction(db,`annual:${f.a.schoolYearId}`,async(tx)=>{
      const result=(await tx.query(`update annual_plans set proposal=jsonb_set(proposal,'{title}',$1::jsonb) where id=$2 and revision=1 and status='draft' returning revision`,[JSON.stringify(title),planV3.id])).rows[0];
      if(!result) throw new VersionConflictError();return result;
    })));
    oneWinner(edits);
    assert.equal((await db.query(`select revision from annual_plans where id=$1`,[planV3.id])).rows[0].revision,2);

    const projectV2=oneWinner(await Promise.allSettled([
      copyConfirmedLearningExperience(db,teacherA,f.a.classroomId,f.experience,1),
      copyConfirmedLearningExperience(db,teacherA,f.a.classroomId,f.experience,1)]));
    const activityV2=oneWinner(await Promise.allSettled([
      copyConfirmedActivity(db,teacherA,f.a.classroomId,f.activity,1),
      copyConfirmedActivity(db,teacherA,f.a.classroomId,f.activity,1)]));
    const criterionV2=oneWinner(await Promise.allSettled([
      copyConfirmedCriterion(db,teacherA,f.a.classroomId,f.criterion,1),
      copyConfirmedCriterion(db,teacherA,f.a.classroomId,f.criterion,1)]));
    assert.equal((await db.query(`select count(*)::int as n from learning_experiences where lineage_id=$1 and status='draft'`,[projectV2.lineage_id])).rows[0].n,1);
    assert.equal((await db.query(`select count(*)::int as n from activities where lineage_id=$1 and status='draft'`,[activityV2.lineage_id])).rows[0].n,1);
    assert.equal((await db.query(`select count(*)::int as n from activity_criteria where lineage_id=$1 and status='draft'`,[criterionV2.lineage_id])).rows[0].n,1);
    await confirmActivityWithCriterion(db,activityV2.id,null,randomUUID(),1);
    assert.equal((await db.query(`select activity_id,criterion_id from evidences where id=$1`,[f.evidence])).rows[0].activity_id,f.activity);
    assert.equal((await db.query(`select activity_id from class_schedule_entries where id=$1`,[f.schedule])).rows[0].activity_id,f.activity);
    assert.equal((await db.query(`select status from activity_criteria where id=$1`,[f.criterion])).rows[0].status,"active");
  } finally {await db.close();}
});

test("constraints rechazan referencias válidas de árboles distintos",async()=>{
  const f=await fixture();const {db}=f;
  try {
    const curriculum=(await db.query("select id from curriculum_versions where active=true limit 1")).rows[0].id;
    await assert.rejects(db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal)
      values($1,$2,$3,$4,2,'draft','{}'::jsonb)`,[randomUUID(),f.a.classroomId,f.b.schoolYearId,curriculum]),/foreign key/);
    await assert.rejects(db.query(`insert into evidences(id,student_id,activity_id,type,observation_text,created_by)
      values($1,$2,$3,'observation','No corresponde',$4)`,[randomUUID(),f.studentB,f.activity,teacherB]),/aula del estudiante/);
    const period=randomUUID();
    await db.query(`insert into evaluation_periods(id,school_year_id,kind,ordinal,label,starts_on,ends_on)
      values($1,$2,'bimester',1,'Bimestre 1','2026-03-16','2026-05-15')`,[period,f.a.schoolYearId]);
    await assert.rejects(db.query(`insert into period_closures(id,classroom_id,evaluation_period_id,source_fingerprint,confirmed_by)
      values($1,$2,$3,'x',$4)`,[randomUUID(),f.b.classroomId,period,teacherB]),/año escolar del aula/);
    await assert.rejects(db.query(`insert into competency_assessments(id,student_id,competency_v4_id,evaluation_period_id,period_start,period_end,version,source_evidence_ids,source_evidence_snapshot,details,status)
      values($1,$2,'COM_ORAL',$3,'2026-03-16','2026-05-15',1,'[]'::jsonb,'[]'::jsonb,'{}'::jsonb,'draft')`,
      [randomUUID(),f.studentB,period]),/año escolar del estudiante/);
  } finally {await db.close();}
});
