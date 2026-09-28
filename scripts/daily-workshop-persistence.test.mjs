import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { insertDailyPair, pairedWorkshop } from "./daily-workshop-persistence.mjs";
import { confirmActivityWithCriterion } from "../src/lib/activity-confirmation.mjs";
import { criterionMatchesConfirmedActivity } from "../src/lib/evidence-capture-v4.mjs";

const classroom = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const masterId = "33333333-3333-4333-8333-333333333333";
const activityId = "44444444-4444-4444-8444-444444444444";
const workshop = { title: "Comparamos objetos", workshop_type: "matemática", competency_id: "MAT_CANTIDAD",
  purpose: "Comparar colecciones", criterion_or_observation_focus: "Explica cómo compara",
  opening: "Juego libre", development: "Compara objetos y conversa", closure: "Comenta hallazgos",
  evidence_expected: "Explicación oral", materials: ["objetos"], sheet_id: null };
const item = { index: 1, linked_activity_index: 1, title: "Comparamos objetos", workshop_type: "matemática",
  competency_id: "MAT_CANTIDAD", purpose: "Comparar colecciones", rationale: "Complementa la indagación",
  observation_focus: "Explica cómo compara", materials: ["objetos"], brief_outline: "Juego y diálogo",
  sheet_id: null, sheet_reason: null };

test("actividad y taller se guardan y confirman juntos; Hoy recibe ambos bloques", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table learning_experiences(id uuid primary key,classroom_id uuid not null,
      type text not null,title text,purpose text,starts_on date,ends_on date,status text,details jsonb);
      create table activities(id uuid primary key,experience_id uuid references learning_experiences(id),
      occurs_on date,planned_date date,title text,purpose text,sequence jsonb,preparation jsonb,adaptations jsonb,
      status text,details jsonb,generation_metadata jsonb,lineage_id uuid,revision integer default 1,
      teacher_confirmed_at timestamptz,updated_at timestamptz,supersedes_activity_id uuid,superseded_at timestamptz);
      create table activity_criteria(id uuid primary key,activity_id uuid,competency_id uuid,
      competency_v4_id text,performance_id uuid,criterion_text text,details jsonb,status text,teacher_confirmed_at timestamptz);
      create table class_schedule_entries(id uuid primary key,classroom_id uuid,scheduled_on date,start_time time,
      end_time time,block_type text,activity_id uuid,title text,is_instructional boolean,sort_order integer);`);
    await db.exec(await readFile(new URL("../local-db/migrations/0058_daily_workshop_master.sql", import.meta.url), "utf8"));
    await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details)
      values($1,$2,'project','Sombras','Explorar','2026-04-13','2026-04-17','active','{}'::jsonb)`, [projectId, classroom]);
    await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,
      status,details,parent_project_id) values($1,$2,'workshop','Talleres','Complementar',
      '2026-04-13','2026-04-17','active',$3::jsonb,$4)`, [masterId, classroom,
      JSON.stringify({ schema: "workshop-master-v1", items: [item] }), projectId]);
    const experience = { id: projectId };
    const master = { id: masterId, details: { items: [item] } };
    await assert.rejects(insertDailyPair(db, { experience, occursOn: "2026-04-13", mainId: activityId,
      mainDetails: { title: "Exploramos", purpose: "Observar" }, materials: [], mainMetadata: {},
      master, workshopIndex: 1, workshopProposal: { ...workshop, competency_id: "OTRA" } }));
    assert.equal((await db.query("select count(*)::int as n from activities")).rows[0].n, 0);
    const saved = await insertDailyPair(db, { experience, occursOn: "2026-04-13", mainId: activityId,
      mainDetails: { title: "Exploramos", purpose: "Observar" }, materials: ["linterna"], mainMetadata: {},
      master, workshopIndex: 1, workshopProposal: workshop });
    assert.ok(saved.workshopId);
    assert.equal((await db.query("select count(*)::int as n from activities")).rows[0].n, 2);
    const standaloneId = "66666666-6666-4666-8666-666666666666";
    const standalone = await insertDailyPair(db, { experience, occursOn: "2026-04-14",
      mainId: standaloneId, mainDetails: { title: "Seguimos explorando", purpose: "Comparar" },
      materials: [], mainMetadata: {}, master: null, workshopProposal: null });
    assert.equal(standalone.workshopId, null);
    assert.equal((await db.query("select count(*)::int as n from activities")).rows[0].n, 3);
    await confirmActivityWithCriterion(db, activityId,
      { competency_id: "CYT_INDAGA", criterion_text: "Explica el cambio" },
      "55555555-5555-4555-8555-555555555555", 1,
      { id: saved.workshopId, competencyId: "MAT_CANTIDAD", expectedRevision: 1 });
    const blocks = (await db.query(`select block_type from class_schedule_entries order by sort_order`)).rows;
    assert.deepEqual(blocks.map((row) => row.block_type), ["activity", "workshop"]);
    assert.equal((await db.query("select count(*)::int as n from activity_criteria")).rows[0].n, 2);
    const confirmedWorkshop = (await db.query(`select ac.competency_v4_id,
      a.details as activity_details,a.teacher_confirmed_at as activity_confirmed_at,
      a.linked_main_activity_id,a.workshop_item_index,le.type as experience_type
      from activity_criteria ac join activities a on a.id=ac.activity_id
      join learning_experiences le on le.id=a.experience_id
      where a.id=$1 and a.status='active' and ac.status='active'`, [saved.workshopId])).rows[0];
    assert.equal(criterionMatchesConfirmedActivity(confirmedWorkshop), true,
      "un taller confirmado debe poder registrar su propia evidencia");
  } finally { await db.close(); }
});

test("el taller sugerido o marcado sin taller no bloquea la actividad principal", () => {
  assert.equal(pairedWorkshop(null, 1, null), null);
  assert.equal(pairedWorkshop({ details: { items: [{ ...item, day_decision: "suggested" }] } }, 1, null), null);
  assert.throws(() => pairedWorkshop({ details: { items: [{ ...item, day_decision: "none" }] } }, 1, workshop));
  assert.ok(pairedWorkshop({ details: { items: [{ ...item, day_decision: "accepted" }] } }, 1, workshop));
});
