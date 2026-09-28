import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { loadConfirmedOrdinaryEvaluationRows } from "./ordinary-evaluation-adapter.mjs";
import { loadPeriodEvaluationRows, periodClosureFingerprint } from "./period-evaluation-service.mjs";

const ids = Array.from({ length: 12 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`);
const period = { id: ids[0], starts_on: "2026-08-10", ends_on: "2026-10-09" };

test("solo decisión docente vigente alimenta evaluación; espontánea, guiada, multi y corrección", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table students(id uuid primary key,classroom_id uuid,status text);
      create table activities(id uuid primary key,title text);
      create table activity_criteria(id uuid primary key,competency_v4_id text,criterion_text text,
        performance_id uuid,display_order integer);
      create table ordinary_observations(id uuid primary key,classroom_id uuid,student_id uuid,
        occurred_at timestamptz,raw_text text,media_path text,activity_id uuid,
        captured_criterion_id uuid,context_snapshot jsonb,source_kind text,status text,source_revision integer);
      create table ordinary_observation_revisions(observation_id uuid,revision integer,corrected_text text);
      create table ordinary_observation_attributions(id uuid,observation_id uuid,version integer,
        state text,source text,confirmed_competency_ids text[],confirmed_criterion_ids uuid[],raw_revision integer);`);
    await db.query("insert into students values($1,$2,'active')", [ids[1], ids[2]]);
    await db.query("insert into students values($1,$2,'active')", [ids[3], ids[4]]);
    await db.query("insert into activities values($1,'Juego de colecciones')", [ids[5]]);
    await db.query("insert into activity_criteria values($1,'MAT_CANTIDAD','Cuenta objetos',null,1)", [ids[6]]);
    const add = async (id, classroom, student, activity = null, criterion = null) => db.query(`insert into ordinary_observations
      values($1,$2,$3,'2026-09-28T16:00:00Z','Contó cuatro objetos.',null,$4,$5,$6::jsonb,
      $7,'saved',1)`, [id, classroom, student, activity, criterion,
      JSON.stringify({ evaluation_period_id: period.id }), activity ? "guided" : "spontaneous"]);
    await add(ids[7], ids[2], ids[1]);
    await add(ids[8], ids[2], ids[1]);
    await add(ids[9], ids[2], ids[1], ids[5], ids[6]);
    await add(ids[10], ids[4], ids[3]);
    let rows = await loadConfirmedOrdinaryEvaluationRows(db, { classroomId: ids[2], period });
    assert.deepEqual(rows.map(row => row.id), [ids[9]]);
    await db.query(`insert into ordinary_observation_attributions values($1,$2,1,'suggested','jev',array[]::text[],array[]::uuid[],1)`, [ids[11], ids[7]]);
    rows = await loadConfirmedOrdinaryEvaluationRows(db, { classroomId: ids[2], period });
    assert.equal(rows.length, 1);
    await db.query(`insert into ordinary_observation_attributions values($1,$2,2,'confirmed','teacher',array['MAT_CANTIDAD','COM_ORAL'],array[]::uuid[],1)`, [ids[0], ids[7]]);
    rows = await loadConfirmedOrdinaryEvaluationRows(db, { classroomId: ids[2], period });
    assert.deepEqual(rows.map(row => row.competency_v4_id).sort(), ["COM_ORAL", "MAT_CANTIDAD", "MAT_CANTIDAD"]);
    assert.equal(rows.find(row => row.id === ids[7]).observation_status, null);
    await db.query("update ordinary_observations set status='corrected',source_revision=2 where id=$1", [ids[7]]);
    await db.query("insert into ordinary_observation_revisions values($1,2,'Corrigió el conteo.')", [ids[7]]);
    rows = await loadConfirmedOrdinaryEvaluationRows(db, { classroomId: ids[2], period });
    assert.deepEqual(rows.map(row => row.id), [ids[9]]);
    await db.query(`insert into ordinary_observation_attributions values($1,$2,3,'confirmed','teacher',array['MAT_CANTIDAD'],array[]::uuid[],2)`, [ids[11], ids[7]]);
    rows = await loadConfirmedOrdinaryEvaluationRows(db, { classroomId: ids[2], period });
    assert.equal(rows.length, 2);
    assert.equal(rows.find(row => row.id === ids[7]).observation_text, "Corrigió el conteo.");
    await db.query(`insert into ordinary_observation_attributions values($1,$2,1,'unclassified','teacher',array[]::text[],array[]::uuid[],1)`, [ids[8], ids[9]]);
    rows = await loadConfirmedOrdinaryEvaluationRows(db, { classroomId: ids[2], period });
    assert.deepEqual(rows.map(row => row.id), [ids[7]]);
    await db.query(`update ordinary_observations set occurred_at='2026-10-20T16:00:00Z' where id=$1`, [ids[7]]);
    rows = await loadConfirmedOrdinaryEvaluationRows(db, { classroomId: ids[2], period });
    assert.equal(rows.length, 0, "el día canónico, no el snapshot de contexto, decide el período");
  } finally { await db.close(); }
});

test("F8 integra solo observaciones confirmadas al scope y a la huella sin asignar nivel", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table students(id uuid primary key,classroom_id uuid,status text,first_name text,last_name text,preferred_name text);
      create table activities(id uuid primary key,title text);
      create table activity_criteria(id uuid primary key,competency_v4_id text,criterion_text text,
        performance_id uuid,display_order integer,details jsonb);
      create table evidences(id uuid primary key,student_id uuid,observed_at timestamptz,observed_on date,
        observation_status text,observation_text text,media_path text,activity_id uuid,criterion_id uuid);
      create table period_competency_scope(classroom_id uuid,evaluation_period_id uuid,competency_v4_id text,included boolean);
      create table competency_assessments(id uuid,student_id uuid,competency_v4_id text,status text,
        evaluation_period_id uuid,period_start date,period_end date,source_evidence_snapshot jsonb,achievement_level text);
      create table competency_descriptive_conclusions(id uuid,student_id uuid,competency_v4_id text,status text,
        evaluation_period_id uuid,period_start date,period_end date);
      create table ordinary_observations(id uuid primary key,classroom_id uuid,student_id uuid,
        occurred_at timestamptz,raw_text text,media_path text,activity_id uuid,
        captured_criterion_id uuid,context_snapshot jsonb,source_kind text,status text,source_revision integer);
      create table ordinary_observation_revisions(observation_id uuid,revision integer,corrected_text text);
      create table ordinary_observation_attributions(id uuid,observation_id uuid,version integer,
        state text,source text,confirmed_competency_ids text[],confirmed_criterion_ids uuid[],raw_revision integer);`);
    await db.query("insert into students values($1,$2,'active','Ana','Prueba',null)", [ids[1], ids[2]]);
    await db.query(`insert into ordinary_observations values($1,$2,$3,'2026-09-28T16:00:00Z',
      'Agrupó objetos.',null,null,null,'{}'::jsonb,'spontaneous','saved',1)`, [ids[7],ids[2],ids[1]]);
    const args = { classroomId: ids[2], period, applicableIds: new Set(["MAT_CANTIDAD","COM_ORAL"]), includeOrdinary: true };
    const initial = await loadPeriodEvaluationRows(db,args);
    assert.deepEqual(initial.scope, []);
    await db.query(`insert into ordinary_observation_attributions values($1,$2,1,'suggested','jev',
      array['MAT_CANTIDAD'],array[]::uuid[],1)`, [ids[8],ids[7]]);
    assert.deepEqual((await loadPeriodEvaluationRows(db,args)).scope, []);
    await db.query(`insert into ordinary_observation_attributions values($1,$2,2,'confirmed','teacher',
      array['MAT_CANTIDAD','COM_ORAL'],array[]::uuid[],1)`, [ids[9],ids[7]]);
    const confirmed = await loadPeriodEvaluationRows(db,args);
    assert.deepEqual(confirmed.scope.sort(), ["COM_ORAL","MAT_CANTIDAD"]);
    assert.ok(confirmed.rows.every(row => row.state === "pending" && row.assessment === null));
    assert.ok(confirmed.rows.every(row => row.sourceRows.length === 1));
    const fingerprint = periodClosureFingerprint(confirmed.rows);
    await db.query(`update ordinary_observations set source_revision=2,status='corrected' where id=$1`,[ids[7]]);
    const corrected = await loadPeriodEvaluationRows(db,args);
    assert.deepEqual(corrected.scope, []);
    assert.notEqual(periodClosureFingerprint(corrected.rows),fingerprint);
    await db.query(`insert into ordinary_observation_revisions values($1,2,'Agrupó por color.')`,[ids[7]]);
    await db.query(`insert into ordinary_observation_attributions values($1,$2,3,'confirmed','teacher',
      array['MAT_CANTIDAD'],array[]::uuid[],2)`, [ids[10],ids[7]]);
    const reconfirmed = await loadPeriodEvaluationRows(db,args);
    assert.deepEqual(reconfirmed.scope,["MAT_CANTIDAD"]);
    assert.equal(reconfirmed.rows[0].sourceRows[0].observation_text,"Agrupó por color.");
    assert.notEqual(periodClosureFingerprint(reconfirmed.rows),fingerprint);
    assert.deepEqual((await loadPeriodEvaluationRows(db,{...args,includeOrdinary:false})).scope,[]);
  } finally { await db.close(); }
});
