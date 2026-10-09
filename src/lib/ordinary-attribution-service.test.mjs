import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { saveOrdinaryObservation, reviseOrdinaryObservation } from "./ordinary-observation-service.mjs";
import { confirmOrdinaryAttribution, ordinaryAttributionHistory, ordinaryReviewQueue,
  recordOrdinarySuggestion } from "./ordinary-attribution-service.mjs";

const COM = "COM_ORAL", MAT = "MAT_CANTIDAD";
async function fixture() {
  const db = await PGlite.create();
  await db.exec(`create table profiles(user_id uuid primary key);
    create table age_grades(id uuid primary key,age_years smallint not null);
    create table classrooms(id uuid primary key,teacher_id uuid not null references profiles(user_id),
      school_year_id uuid not null,age_grade_id uuid not null references age_grades(id),
      castellano_l2_applicable boolean not null default false,religion_applicable boolean not null default false,
      status text not null);
    create table students(id uuid primary key,classroom_id uuid not null references classrooms(id),status text not null);
    create table learning_experiences(id uuid primary key,classroom_id uuid not null references classrooms(id),title text not null);
    create table activities(id uuid primary key,experience_id uuid not null references learning_experiences(id),
      title text not null,occurs_on date not null,status text not null,details jsonb not null default '{}'::jsonb, preparation jsonb not null default '{}'::jsonb);
    create table activity_criteria(id uuid primary key,activity_id uuid not null references activities(id),
      competency_id uuid,competency_v4_id text,criterion_text text,status text not null,teacher_confirmed_at timestamptz);
    create table evaluation_periods(id uuid primary key,school_year_id uuid not null,starts_on date not null,ends_on date not null);`);
  for (const name of ["0062_ordinary_observations.sql", "0063_ordinary_observation_delete_guard.sql",
    "0064_ordinary_observation_attributions.sql"])
    await db.exec(await readFile(new URL(`../../local-db/migrations/${name}`, import.meta.url), "utf8"));
  const teacher = randomUUID(), other = randomUUID(), age = randomUUID(), classroom = randomUUID(),
    student = randomUUID(), project = randomUUID(), activity = randomUUID(), criterion = randomUUID(), year = randomUUID();
  await db.query("insert into profiles(user_id) values($1),($2)", [teacher,other]);
  await db.query("insert into age_grades(id,age_years) values($1,4)", [age]);
  await db.query("insert into classrooms(id,teacher_id,school_year_id,age_grade_id,status) values($1,$2,$3,$4,'active')",
    [classroom,teacher,year,age]);
  await db.query("insert into students(id,classroom_id,status) values($1,$2,'active')", [student,classroom]);
  await db.query("insert into learning_experiences(id,classroom_id,title) values($1,$2,'Proyecto')", [project,classroom]);
  await db.query("insert into activities(id,experience_id,title,occurs_on,status) values($1,$2,'Actividad','2026-09-28','active')",
    [activity,project]);
  await db.query("insert into activity_criteria(id,activity_id,competency_v4_id,status,teacher_confirmed_at) values($1,$2,$3,'active',now())",
    [criterion,activity,COM]);
  const raw = async ({ guided = false, text = "  Dijo Ana; observé a Beatriz.  " } = {}) =>
    (await saveOrdinaryObservation(db,teacher,{ studentId: student,clientRequestId: randomUUID(),
      sourceKind: guided ? "guided" : "spontaneous",activityId: guided ? activity : null,
      criterionId: guided ? criterion : null,rawText: text })).observation;
  return { db,teacher,other,student,activity,criterion,raw };
}

test("Jev propone varias, la profesora confirma y el texto/alumno no se alteran", async () => {
  const f = await fixture();
  try {
    const observation = await f.raw();
    assert.equal((await ordinaryReviewQueue(f.db,f.teacher)).length,1);
    const proposed = await recordOrdinarySuggestion(f.db,f.teacher,observation.id,{ expectedVersion:0,
      candidateIds:[COM,MAT],allowedIds:[COM,MAT],provenance:{source:"mock"} });
    assert.equal(proposed.state,"suggested");
    assert.deepEqual(proposed.candidate_competency_ids,[COM,MAT]);
    const confirmed = await confirmOrdinaryAttribution(f.db,f.teacher,observation.id,{ expectedVersion:1,
      competencyIds:[COM,MAT],criterionIds:[],allowedIds:[COM,MAT] });
    assert.equal(confirmed.state,"confirmed");
    assert.deepEqual(confirmed.confirmed_competency_ids,[COM,MAT]);
    assert.equal((await ordinaryReviewQueue(f.db,f.teacher)).length,0);
    const history = await ordinaryAttributionHistory(f.db,f.teacher,observation.id);
    assert.equal(history.observation.student_id,f.student);
    assert.equal(history.observation.raw_text,observation.raw_text);
    assert.equal(history.history.length,2);
    await assert.rejects(recordOrdinarySuggestion(f.db,f.teacher,observation.id,{ expectedVersion:2,
      candidateIds:[MAT],allowedIds:[COM,MAT] }), /decisión docente/);
    await assert.rejects(ordinaryAttributionHistory(f.db,f.other,observation.id), /no pertenecen/);
    await assert.rejects(f.db.query("update ordinary_observation_attributions set state='unclassified' where id=$1",[proposed.id]), /inmutable/);
  } finally { await f.db.close(); }
});

test("criterio elegido en captura es procedencia docente; adicionales solo cuentan tras revisión", async () => {
  const f = await fixture();
  try {
    const observation = await f.raw({guided:true});
    assert.equal(observation.captured_criterion_id,f.criterion);
    assert.equal(observation.context_snapshot.captured_competency_id,COM);
    assert.equal((await ordinaryReviewQueue(f.db,f.teacher)).length,0);
    await recordOrdinarySuggestion(f.db,f.teacher,observation.id,{ expectedVersion:0,
      candidateIds:[COM,MAT],allowedIds:[COM,MAT] });
    assert.equal((await ordinaryReviewQueue(f.db,f.teacher)).length,1);
    const confirmed = await confirmOrdinaryAttribution(f.db,f.teacher,observation.id,{ expectedVersion:1,
      competencyIds:[COM,MAT],criterionIds:[f.criterion],allowedIds:[COM,MAT] });
    assert.equal(confirmed.state,"confirmed");
    const links = (await f.db.query("select * from ordinary_observation_criterion_links where observation_id=$1",[observation.id])).rows;
    assert.equal(links.length,1);
    assert.equal(links[0].criterion_id,f.criterion);
    await assert.rejects(confirmOrdinaryAttribution(f.db,f.teacher,observation.id,{ expectedVersion:1,
      competencyIds:[COM,MAT],criterionIds:[f.criterion],allowedIds:[COM,MAT] }), /recarga/i);
    assert.equal((await f.db.query("select count(*)::int as n from ordinary_observation_criterion_links where observation_id=$1",
      [observation.id])).rows[0].n,1);
    await assert.rejects(confirmOrdinaryAttribution(f.db,f.teacher,observation.id,{ expectedVersion:2,
      competencyIds:[MAT],criterionIds:[f.criterion],allowedIds:[COM,MAT] }), /criterio no corresponde/);
    await assert.rejects(f.db.query("delete from ordinary_observation_criterion_links where id=$1",[links[0].id]), /inmutable/);
  } finally { await f.db.close(); }
});

test("la guiada corregida vuelve a la cola hasta confirmar su atribución vigente", async () => {
  const f = await fixture();
  try {
    const observation = await f.raw({ guided: true, text: "Dijo que vio dos objetos." });
    assert.equal((await ordinaryReviewQueue(f.db, f.teacher)).length, 0);
    await reviseOrdinaryObservation(f.db, f.teacher, observation.id, { action: "correct",
      correctedText: "Señaló dos objetos; no escuché su respuesta.", reason: "Preciso lo observado", expectedRevision: 1 });
    const pending = await ordinaryReviewQueue(f.db, f.teacher);
    assert.deepEqual(pending.map(row => row.id), [observation.id]);
    assert.equal(pending[0].source_revision, 2);
    assert.equal((await ordinaryReviewQueue(f.db, f.other)).length, 0);
    await confirmOrdinaryAttribution(f.db, f.teacher, observation.id, { expectedVersion: 0,
      competencyIds: [COM], criterionIds: [f.criterion], allowedIds: [COM, MAT] });
    assert.equal((await ordinaryReviewQueue(f.db, f.teacher)).length, 0);
    const history = await ordinaryAttributionHistory(f.db, f.teacher, observation.id);
    assert.equal(history.latest.raw_revision, 2);
    assert.equal(history.observation.raw_text, observation.raw_text);
  } finally { await f.db.close(); }
});

test("abstención, fallo y corrección raw nunca inventan una clasificación", async () => {
  const f = await fixture();
  try {
    const observation = await f.raw();
    await assert.rejects(recordOrdinarySuggestion(f.db,f.teacher,observation.id,{ expectedVersion:0,
      candidateIds:["NO_EXISTE"],allowedIds:[COM,MAT] }), /aplicables/);
    assert.equal((await ordinaryReviewQueue(f.db,f.teacher)).length,1);
    const unavailable = await recordOrdinarySuggestion(f.db,f.teacher,observation.id,{ expectedVersion:0,
      allowedIds:[COM,MAT],unavailable:true,provenance:{reason:"mock_402"} });
    assert.equal(unavailable.state,"unavailable");
    const unclassified = await confirmOrdinaryAttribution(f.db,f.teacher,observation.id,{ expectedVersion:1,
      competencyIds:[],criterionIds:[],allowedIds:[COM,MAT] });
    assert.equal(unclassified.state,"unclassified");
    assert.equal((await ordinaryReviewQueue(f.db,f.teacher)).length,0);
    await reviseOrdinaryObservation(f.db,f.teacher,observation.id,{action:"correct",correctedText:"Aclaración docente.",
      reason:"Revisé el audio",expectedRevision:1});
    assert.equal((await ordinaryReviewQueue(f.db,f.teacher)).length,1);
    const read = (await ordinaryAttributionHistory(f.db,f.teacher,observation.id)).observation;
    assert.equal(read.raw_text,observation.raw_text);
    assert.equal(read.effective_text,"Aclaración docente.");
    const reconsidered = await recordOrdinarySuggestion(f.db,f.teacher,observation.id,{ expectedVersion:2,
      candidateIds:[COM],allowedIds:[COM,MAT] });
    assert.equal(reconsidered.raw_revision,2);
    assert.equal(reconsidered.state,"suggested");
  } finally { await f.db.close(); }
});
