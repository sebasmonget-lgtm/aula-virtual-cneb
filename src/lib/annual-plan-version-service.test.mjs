import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom } from "./pilot-onboarding-service.mjs";
import { copyConfirmedAnnualPlan } from "./annual-plan-version-service.mjs";
import { ANNUAL_PLAN_TEMPLATE_FORMAT } from "./annual-plan-contract.mjs";
import { loadPlanningJourney } from "./planning-journey.mjs";
import { listSavedDocuments, loadSavedDocument } from "./document-library-service.mjs";

const teacher = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
async function database() {
  const db = await PGlite.create();
  const migrations = new URL("../../local-db/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort())
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  return db;
}
const project = (index) => ({ title: `Proyecto ${index + 1}`, experience_type: "project",
  period: `Bimestre ${Math.floor(index / 3) + 1}`, primary_competency_ids: [`competencia-${index + 1}`] });

test("V2 copia las doce propuestas y sus slots, conserva V1 y sus descendientes, y exige diagnóstico vigente", async () => {
  const db = await database();
  try {
    const { classroomId, schoolYearId } = await createPilotClassroom(db, teacher, { teacherName: "Docente", institutionName: "Jardín", section: "A", age: 5, year: 2026,
      startsOn: "2026-03-01", endsOn: "2026-12-18", castellanoL2Applicable: false, religionApplicable: false });
    const curriculumId = (await db.query(`select id from curriculum_versions where active=true limit 1`)).rows[0].id;
    const diagnosisId = randomUUID(), v1 = randomUUID(), projectId = randomUUID(), draftProjectId = randomUUID();
    await db.query(`insert into diagnostic_group_reviews(id,classroom_id,version,status,details,source_snapshot,created_by,teacher_confirmed_at)
      values($1,$2,1,'confirmed','{}'::jsonb,'[]'::jsonb,$3,now())`, [diagnosisId,classroomId,teacher]);
    const proposal = { plan_format: ANNUAL_PLAN_TEMPLATE_FORMAT, title: "Plan V1", proposed_experiences: Array.from({ length: 12 }, (_, index) => project(index)) };
    await db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,document_context,teacher_confirmed_at)
      values($1,$2,$3,$4,1,'active',$5::jsonb,'{}'::jsonb,now())`, [v1,classroomId,schoolYearId,curriculumId,JSON.stringify(proposal)]);
    for (let index=1; index<=12; index++) await db.query(`insert into project_slots(id,annual_plan_id,slot_index,duration_weeks,starts_on,ends_on)
      values($1,$2,$3,2,'2026-03-30','2026-04-10')`, [randomUUID(),v1,index]);
    for (const [id,status,index] of [[projectId,"active",0],[draftProjectId,"draft",1]]) await db.query(`insert into learning_experiences
      (id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,origin,source_proposal_index)
      values($1,$2,'project','Los animales','Explorar','2026-03-30','2026-04-10',$3,$4::jsonb,$5,'planned',$6)`,
    [id,classroomId,status,JSON.stringify({ starting_point: "Interés", primary_competency_ids: [], possible_pathways: [] }),v1,index]);
    const context = { id: classroomId, school_year_id: schoolYearId, source_diagnostic_review_id: diagnosisId,
      context_v4: { diagnostic_review_current: true, source_fingerprint: "huella-actual" } };
    const copied = await copyConfirmedAnnualPlan(db,teacher,context,v1,{ template_version: "annual-unified-v1", source_diagnostic_review_id: diagnosisId, source_context_fingerprint: "huella-actual" });
    const plans = (await db.query(`select id,status,version,proposal,supersedes_plan_id,source_diagnostic_review_id,source_context_fingerprint
      from annual_plans where school_year_id=$1 order by version`, [schoolYearId])).rows;
    assert.deepEqual(plans.map((row) => [row.id,row.status,row.version]), [[v1,"active",1],[copied.id,"draft",2]]);
    assert.deepEqual(plans[1].proposal, proposal);
    assert.equal(plans[1].supersedes_plan_id,v1);
    assert.equal(plans[1].source_diagnostic_review_id,diagnosisId);
    assert.equal(plans[1].source_context_fingerprint,"huella-actual");
    assert.equal((await db.query(`select count(*)::int as total from project_slots where annual_plan_id=$1`, [copied.id])).rows[0].total,12);
    await assert.rejects(copyConfirmedAnnualPlan(db,teacher,context,v1,{}), { reason: "draft_exists" });
    await assert.rejects(copyConfirmedAnnualPlan(db,"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",context,v1,{}), { reason: "source_unavailable" });
    await assert.rejects(db.query(`update annual_plans set proposal='{}'::jsonb where id=$1`,[v1]), /inmutable/);
    await db.query(`update annual_plans set status='archived',updated_at=now() where id=$1`,[v1]);
    await db.query(`update annual_plans set status='active',teacher_confirmed_at=now() where id=$1`,[copied.id]);
    await assert.rejects(db.query(`update annual_plans set proposal='{}'::jsonb where id=$1`,[v1]), /inmutable/);
    await assert.rejects(db.query(`delete from annual_plans where id=$1`,[v1]), /inmutable/);
    const descendants = (await db.query(`select id,annual_plan_id,source_proposal_index,status from learning_experiences
      where id in ($1,$2) order by source_proposal_index`,[projectId,draftProjectId])).rows;
    assert.deepEqual(descendants.map((row) => [row.annual_plan_id,row.source_proposal_index,row.status]),[[v1,0,"active"],[v1,1,"draft"]]);
    const documents=await listSavedDocuments(db,teacher);
    assert.ok(documents.some((item)=>item.id===v1 && item.status==="archived"));
    assert.ok(documents.some((item)=>item.id===copied.id && item.status==="active"));
    assert.deepEqual((await loadSavedDocument(db,teacher,"annual_plan",v1)).content,proposal);
    const base = "http://test";
    const journey = await loadPlanningJourney(base, async (url) => ({ ok: true, json: async () => {
      if (url.endsWith("/api/annual-plans/current")) return { active: { id: copied.id }, archived: [{ id: v1 }] };
      if (url.endsWith("/api/diagnostics/progress")) return { reviewed: true, student_count: 2 };
      if (url.endsWith("/api/learning-experiences")) return { experiences: descendants.map((row) => ({ ...row, type: "project", details: { starting_point: "Interés" } })) };
      return { activities: [] };
    } }));
    assert.equal(journey.experience,"draft");
    assert.equal(journey.hasConfirmedExperience,true);
    await assert.rejects(copyConfirmedAnnualPlan(db,teacher,{ ...context, source_diagnostic_review_id: null },copied.id,{}), { reason: "diagnostic_review_required" });
  } finally { await db.close(); }
});

test("migraciones local y Supabase enlazan solo relaciones históricas comprobables", async () => {
  for (const migration of [
    new URL("../../local-db/migrations/0037_annual_plan_versions.sql", import.meta.url),
    new URL("../../supabase/migrations/202609240002_annual_plan_versions.sql", import.meta.url),
  ]) {
    const db = await PGlite.create();
    try {
      await db.exec(`create table public.diagnostic_group_reviews(id uuid primary key,classroom_id uuid,status text);
        create table public.annual_plans(id uuid primary key,classroom_id uuid,school_year_id uuid,version integer,status text,
          proposal jsonb,document_context jsonb,updated_at timestamptz default now());`);
      const classroomId=randomUUID(), otherClassroomId=randomUUID(), yearId=randomUUID(), reviewId=randomUUID();
      const v1=randomUUID(), v2=randomUUID(), uncertain=randomUUID();
      await db.query(`insert into public.diagnostic_group_reviews values($1,$2,'confirmed')`,[reviewId,classroomId]);
      await db.query(`insert into public.annual_plans(id,classroom_id,school_year_id,version,status,proposal,document_context)
        values($1,$2,$3,1,'active',$4::jsonb,$5::jsonb)`,[v1,classroomId,yearId,JSON.stringify({ title: "Anterior" }),
        JSON.stringify({ source_diagnostic_review_id: reviewId, source_context_fingerprint: "huella" })]);
      await db.query(`insert into public.annual_plans(id,classroom_id,school_year_id,version,status,proposal,document_context)
        values($1,$2,$3,2,'draft',$4::jsonb,'{}'::jsonb)`,[v2,classroomId,yearId,JSON.stringify({ plan_format: ANNUAL_PLAN_TEMPLATE_FORMAT })]);
      await db.query(`insert into public.annual_plans(id,classroom_id,school_year_id,version,status,proposal,document_context)
        values($1,$2,$3,1,'archived',$4::jsonb,$5::jsonb)`,[uncertain,otherClassroomId,yearId,JSON.stringify({ title: "Otro" }),
        JSON.stringify({ source_diagnostic_review_id: reviewId })]);
      await db.exec(await readFile(migration,"utf8"));
      const rows=(await db.query(`select id,supersedes_plan_id,source_diagnostic_review_id,source_context_fingerprint
        from public.annual_plans`)).rows;
      const byId=new Map(rows.map((row)=>[row.id,row]));
      assert.equal(byId.get(v1).source_diagnostic_review_id,reviewId);
      assert.equal(byId.get(v1).source_context_fingerprint,"huella");
      assert.equal(byId.get(v2).supersedes_plan_id,v1);
      assert.equal(byId.get(uncertain).source_diagnostic_review_id,null);
      assert.equal(byId.get(uncertain).supersedes_plan_id,null);
    } finally { await db.close(); }
  }
});
