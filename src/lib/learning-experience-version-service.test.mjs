import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom } from "./pilot-onboarding-service.mjs";
import { copyConfirmedLearningExperience, confirmLearningExperienceVersion } from "./learning-experience-version-service.mjs";
import { listSavedDocuments, loadSavedDocument } from "./document-library-service.mjs";

const teacher = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
async function database() {
  const db = await PGlite.create();
  const migrations = new URL("../../local-db/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort())
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  return db;
}

test("Proyecto V2 copia V1, archiva solo al confirmar y no reasigna actividades", async () => {
  const db = await database();
  try {
    const { classroomId, schoolYearId } = await createPilotClassroom(db, teacher, { teacherName: "Docente", institutionName: "Jardín", section: "A", age: 5, year: 2026,
      startsOn: "2026-03-01", endsOn: "2026-12-18", castellanoL2Applicable: false, religionApplicable: false });
    const curriculumId = (await db.query(`select id from curriculum_versions where active=true limit 1`)).rows[0].id;
    const annualId=randomUUID(), v1=randomUUID(), activityId=randomUUID();
    await db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal)
      values($1,$2,$3,$4,1,'active','{}'::jsonb)`,[annualId,classroomId,schoolYearId,curriculumId]);
    const details={ title:"El huerto",purpose:"Explorar plantas",starting_point:"Curiosidad del grupo",primary_competency_ids:[],activity_route:[] };
    await db.query(`insert into learning_experiences
      (id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,origin,source_proposal_index,teacher_confirmed_at)
      values($1,$2,'project','El huerto','Explorar plantas','2026-04-01','2026-04-24','active',$3::jsonb,$4,'planned',0,now())`,
    [v1,classroomId,JSON.stringify(details),annualId]);
    await db.query(`insert into activities(id,experience_id,occurs_on,title,purpose,status)
      values($1,$2,'2026-04-02','Semillas','Explorar','draft')`,[activityId,v1]);
    await db.query(`insert into project_calendar_selections(id,learning_experience_id,starts_on,ends_on,status,confirmed_at,confirmed_by)
      values($1,$2,'2026-04-01','2026-04-24','confirmed',now(),$3)`,[randomUUID(),v1,teacher]);
    await db.query(`update annual_plans set status='archived',updated_at=now() where id=$1`,[annualId]);
    const copy=await copyConfirmedLearningExperience(db,teacher,classroomId,v1);
    const draft=(await db.query(`select * from learning_experiences where id=$1`,[copy.id])).rows[0];
    assert.equal(copy.version,2);
    assert.equal(draft.status,"draft");
    assert.equal(draft.supersedes_experience_id,v1);
    assert.equal(draft.annual_plan_id,annualId);
    assert.equal(draft.source_proposal_index,0);
    assert.deepEqual(draft.details,details);
    assert.equal((await db.query(`select status from project_calendar_selections where learning_experience_id=$1`,[copy.id])).rows[0].status,"confirmed");
    assert.equal((await db.query(`select status from learning_experiences where id=$1`,[v1])).rows[0].status,"active");
    await assert.rejects(copyConfirmedLearningExperience(db,teacher,classroomId,v1),{reason:"draft_exists"});
    await assert.rejects(copyConfirmedLearningExperience(db,"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",classroomId,v1),{reason:"source_unavailable"});
    await assert.rejects(db.query(`update learning_experiences set title='Cambiado' where id=$1`,[v1]),/inmutable/);
    await db.query(`update learning_experiences set title='El huerto renovado',details=$1::jsonb where id=$2`,
      [JSON.stringify({...details,title:"El huerto renovado"}),copy.id]);
    const confirmed=await confirmLearningExperienceVersion(db,classroomId,copy.id);
    assert.equal(confirmed.status,"active");
    const rows=(await db.query(`select id,status,title,version from learning_experiences where id in ($1,$2) order by version`,[v1,copy.id])).rows;
    assert.deepEqual(rows.map((row)=>[row.id,row.status,row.version]),[[v1,"archived",1],[copy.id,"active",2]]);
    assert.equal(rows[0].title,"El huerto");
    assert.equal((await db.query(`select experience_id from activities where id=$1`,[activityId])).rows[0].experience_id,v1);
    await assert.rejects(db.query(`update learning_experiences set title='Otro' where id=$1`,[v1]),/inmutable/);
    await assert.rejects(db.query(`delete from learning_experiences where id=$1`,[v1]),/inmutable/);
    const documents=await listSavedDocuments(db,teacher);
    assert.ok(documents.some((item)=>item.id===v1 && item.status==="archived"));
    assert.ok(documents.some((item)=>item.id===copy.id && item.status==="active"));
    assert.equal((await loadSavedDocument(db,teacher,"experience",v1)).content.starting_point,details.starting_point);
    const next=await copyConfirmedLearningExperience(db,teacher,classroomId,copy.id);
    assert.equal(next.version,3);
    assert.equal((await db.query(`select status from learning_experiences where id=$1`,[copy.id])).rows[0].status,"active");
  } finally { await db.close(); }
});

test("Unidad emergente conserva origen sin plan y la migración remota admite versiones de una propuesta", async () => {
  const db=await database();
  try {
    const {classroomId}=await createPilotClassroom(db,teacher,{teacherName:"Docente",institutionName:"Jardín",section:"A",age:4,year:2026,
      startsOn:"2026-03-01",endsOn:"2026-12-18",castellanoL2Applicable:false,religionApplicable:false});
    const source=randomUUID();
    await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,origin,planning_reason)
      values($1,$2,'unit','Convivimos','Jugar juntos','2026-05-04','2026-05-22','active',$3::jsonb,'emergent','Interés observado')`,
    [source,classroomId,JSON.stringify({starting_point:"Juego compartido"})]);
    const draft=await copyConfirmedLearningExperience(db,teacher,classroomId,source);
    await confirmLearningExperienceVersion(db,classroomId,draft.id);
    const current=(await db.query(`select type,origin,annual_plan_id,source_proposal_index,planning_reason from learning_experiences where id=$1`,[draft.id])).rows[0];
    assert.equal(current.type,"unit"); assert.equal(current.origin,"emergent");
    assert.equal(current.annual_plan_id,null); assert.equal(current.source_proposal_index,null);
    assert.equal(current.planning_reason,"Interés observado");
  } finally { await db.close(); }
  const remote=await PGlite.create();
  try {
    await remote.exec(`create table public.learning_experiences(id uuid primary key,classroom_id uuid,type text,title text,purpose text,
      starts_on date,ends_on date,status text,details jsonb,annual_plan_id uuid,origin text,source_proposal_index integer,
      updated_at timestamptz default now());
      create unique index learning_experiences_planned_proposal_once on public.learning_experiences(annual_plan_id,source_proposal_index)
      where origin='planned';`);
    await remote.exec(await readFile(new URL("../../supabase/migrations/202609240003_learning_experience_versions.sql",import.meta.url),"utf8"));
    const classroom=randomUUID(),plan=randomUUID(),root=randomUUID(),copy=randomUUID();
    await remote.query(`insert into public.learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,origin,source_proposal_index)
      values($1,$2,'project','Raíz','Propósito','2026-04-01','2026-04-20','active','{}'::jsonb,$3,'planned',0)`,[root,classroom,plan]);
    await remote.query(`insert into public.learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,origin,source_proposal_index,supersedes_experience_id,version)
      values($1,$2,'project','Copia','Propósito','2026-04-01','2026-04-20','draft','{}'::jsonb,$3,'planned',0,$4,2)`,[copy,classroom,plan,root]);
    assert.equal((await remote.query(`select count(*)::int as count from public.learning_experiences where annual_plan_id=$1`,[plan])).rows[0].count,2);
  } finally { await remote.close(); }
});
