import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { confirmActivityWithCriterion } from "./activity-confirmation.mjs";

test("la confirmación y el criterio heredado se guardan juntos o se revierten juntos", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table learning_experiences(id text primary key,classroom_id text); insert into learning_experiences values('experience','classroom');
      create table activities(id text primary key,experience_id text default 'experience',supersedes_activity_id text,lineage_id text not null default 'test-lineage',revision bigint not null default 1,status text not null,occurs_on date default '2026-04-13',title text default 'Actividad',teacher_confirmed_at timestamptz,updated_at timestamptz,superseded_at timestamptz);
      create table class_schedule_entries(id text primary key,classroom_id text,scheduled_on date,start_time time,end_time time,block_type text,activity_id text,title text,is_instructional boolean,sort_order integer);
      create table activity_criteria(id text primary key,activity_id text references activities(id),competency_id text,
        competency_v4_id text,performance_id text,criterion_text text,details jsonb,status text,teacher_confirmed_at timestamptz);`);
    await db.query("insert into activities(id,status) values('ok','draft'),('rollback','draft')");
    const criterion = { competency_id: "PS_CONVIVE", criterion_text: "Explica un acuerdo" };
    const confirmed = await confirmActivityWithCriterion(db, "ok", criterion, "criterion-ok");
    assert.equal(confirmed.status, "active");
    assert.equal((await db.query("select scheduled_on::text from class_schedule_entries where activity_id='ok'")).rows[0].scheduled_on,"2026-04-13");
    assert.equal((await db.query("select details from activity_criteria where id='criterion-ok'")).rows[0].details.criterion_text, "Explica un acuerdo");
    await assert.rejects(confirmActivityWithCriterion(db, "rollback", criterion, "criterion-ok"));
    assert.equal((await db.query("select status from activities where id='rollback'")).rows[0].status, "draft");
    assert.equal((await db.query("select count(*)::int as n from activity_criteria")).rows[0].n, 1);
    await db.query("insert into activities(id,status) values('multi','draft'),('multi-rollback','draft')");
    const secondary = { competency_id: "COM_ORAL", criterion_text: "Explica su propuesta" };
    await confirmActivityWithCriterion(db, "multi", [criterion, secondary], ["multi-one", "multi-two"], 1);
    assert.equal((await db.query("select count(*)::int as n from activity_criteria where activity_id='multi'")).rows[0].n, 2);
    await assert.rejects(confirmActivityWithCriterion(db, "multi-rollback", [criterion, secondary], ["new-one", "multi-two"], 1));
    assert.equal((await db.query("select status from activities where id='multi-rollback'")).rows[0].status, "draft");
    assert.equal((await db.query("select count(*)::int as n from activity_criteria where activity_id='multi-rollback'")).rows[0].n, 0);
    assert.equal((await db.query("select count(*)::int as n from class_schedule_entries where activity_id='multi-rollback'")).rows[0].n, 0);
  } finally {
    await db.close();
  }
});
