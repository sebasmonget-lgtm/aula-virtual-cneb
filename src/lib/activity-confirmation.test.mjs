import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { confirmActivityWithCriterion } from "./activity-confirmation.mjs";

test("la confirmación y el criterio heredado se guardan juntos o se revierten juntos", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table activities(id text primary key,status text not null,teacher_confirmed_at timestamptz,updated_at timestamptz);
      create table activity_criteria(id text primary key,activity_id text references activities(id),competency_id text,
        competency_v4_id text,performance_id text,criterion_text text,details jsonb,status text,teacher_confirmed_at timestamptz);`);
    await db.query("insert into activities(id,status) values('ok','draft'),('rollback','draft')");
    const criterion = { competency_id: "PS_CONVIVE", criterion_text: "Explica un acuerdo" };
    const confirmed = await confirmActivityWithCriterion(db, "ok", criterion, "criterion-ok");
    assert.equal(confirmed.status, "active");
    assert.equal((await db.query("select details from activity_criteria where id='criterion-ok'")).rows[0].details.criterion_text, "Explica un acuerdo");
    await assert.rejects(confirmActivityWithCriterion(db, "rollback", criterion, "criterion-ok"));
    assert.equal((await db.query("select status from activities where id='rollback'")).rows[0].status, "draft");
    assert.equal((await db.query("select count(*)::int as n from activity_criteria")).rows[0].n, 1);
  } finally {
    await db.close();
  }
});
