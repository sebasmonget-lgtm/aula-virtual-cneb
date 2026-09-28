import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { listOrdinaryObservations, reviseOrdinaryObservation, saveOrdinaryObservation, validateOrdinaryObservation } from "./ordinary-observation-service.mjs";

async function fixture() {
  const db = await PGlite.create();
  await db.exec(`create table profiles(user_id uuid primary key);
    create table age_grades(id uuid primary key,age_years smallint not null);
    create table classrooms(id uuid primary key,teacher_id uuid not null references profiles(user_id),school_year_id uuid not null,
      age_grade_id uuid references age_grades(id),castellano_l2_applicable boolean not null default false,
      religion_applicable boolean not null default false,status text not null);
    create table students(id uuid primary key,classroom_id uuid not null references classrooms(id),status text not null);
    create table learning_experiences(id uuid primary key,classroom_id uuid not null references classrooms(id),title text not null);
    create table activities(id uuid primary key,experience_id uuid not null references learning_experiences(id),
      title text not null,occurs_on date not null,status text not null,details jsonb not null default '{}'::jsonb);
    create table activity_criteria(id uuid primary key,activity_id uuid not null references activities(id),
      competency_id uuid,competency_v4_id text,criterion_text text,status text not null,teacher_confirmed_at timestamptz);
    create table evaluation_periods(id uuid primary key,school_year_id uuid not null,starts_on date not null,ends_on date not null);`);
  await db.exec(await readFile(new URL("../../local-db/migrations/0062_ordinary_observations.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../../local-db/migrations/0063_ordinary_observation_delete_guard.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../../local-db/migrations/0064_ordinary_observation_attributions.sql", import.meta.url), "utf8"));
  const teacher = randomUUID(), otherTeacher = randomUUID(), classroom = randomUUID(), otherClassroom = randomUUID();
  const yearId = randomUUID(), periodId = randomUUID();
  const student = randomUUID(), secondStudent = randomUUID(), foreignStudent = randomUUID();
  const project = randomUUID(), activity = randomUUID(), blueprint = randomUUID();
  const ageGrade = randomUUID();
  await db.query("insert into profiles(user_id) values($1),($2)", [teacher, otherTeacher]);
  await db.query("insert into age_grades(id,age_years) values($1,4)", [ageGrade]);
  await db.query("insert into classrooms(id,teacher_id,school_year_id,age_grade_id,status) values($1,$2,$3,$7,'active'),($4,$5,$6,$7,'active')", [classroom,teacher,yearId,otherClassroom,otherTeacher,randomUUID(),ageGrade]);
  await db.query("insert into evaluation_periods(id,school_year_id,starts_on,ends_on) values($1,$2,'2026-09-01','2026-12-31')", [periodId,yearId]);
  await db.query("insert into students(id,classroom_id,status) values($1,$2,'active'),($3,$2,'active'),($4,$5,'active')", [student,classroom,secondStudent,foreignStudent,otherClassroom]);
  await db.query("insert into learning_experiences(id,classroom_id,title) values($1,$2,'Proyecto')", [project,classroom]);
  await db.query("insert into activities(id,experience_id,title,occurs_on,status,details) values($1,$2,'Actividad','2026-10-19','active',$3::jsonb)",
    [activity,project,JSON.stringify({ activity_contract: { blueprint_id: blueprint } })]);
  return { db, teacher, otherTeacher, classroom, student, secondStudent, foreignStudent, project, activity, blueprint, periodId };
}

test("selección obligatoria, identidad explícita y raw exacto aunque nombre contradiga al alumno", async () => {
  const f = await fixture();
  try {
    assert.throws(() => validateOrdinaryObservation({ clientRequestId: randomUUID(), sourceKind: 'spontaneous', rawText: 'Ana' }), /Selecciona/);
    const rawText = "  Bruno dijo: 'soy Ana'\n[transcripción: Anha]  ";
    const result = await saveOrdinaryObservation(f.db, f.teacher, { studentId: f.student, clientRequestId: randomUUID(),
      sourceKind: 'guided', activityId: f.activity, rawText });
    assert.equal(result.created, true);
    assert.equal(result.observation.student_id, f.student);
    assert.equal(result.observation.raw_text, rawText);
    assert.equal(result.observation.activity_id, f.activity);
    assert.equal(result.observation.project_id, f.project);
    assert.equal(result.observation.blueprint_id, f.blueprint);
    assert.equal(result.observation.context_snapshot.evaluation_period_id, f.periodId);
    assert.equal((await listOrdinaryObservations(f.db, f.teacher, f.student))[0].raw_text, rawText);
    assert.equal((await listOrdinaryObservations(f.db, f.otherTeacher)).length, 0);
  } finally { await f.db.close(); }
});

test("sin actividad y sin IA guarda raw; doble envío es idempotente y conflicto no cambia niño", async () => {
  const f = await fixture();
  try {
    const input = { studentId: f.student, clientRequestId: randomUUID(), sourceKind: 'spontaneous', rawText: 'El nombre oído fue Lucía.' };
    const first = await saveOrdinaryObservation(f.db, f.teacher, input);
    const again = await saveOrdinaryObservation(f.db, f.teacher, input);
    assert.equal(again.created, false);
    assert.equal(again.observation.id, first.observation.id);
    await assert.rejects(saveOrdinaryObservation(f.db, f.teacher, { ...input, studentId: f.secondStudent }), /otro contenido/);
    assert.equal((await listOrdinaryObservations(f.db, f.teacher)).length, 1);
    assert.equal(first.observation.student_id, f.student);
    assert.equal(first.observation.context_snapshot.activity_id, undefined);
  } finally { await f.db.close(); }
});

test("aula ajena y actividad ajena no permiten guardar", async () => {
  const f = await fixture();
  try {
    const base = { studentId: f.foreignStudent, clientRequestId: randomUUID(), sourceKind: 'spontaneous', rawText: 'Hecho.' };
    await assert.rejects(saveOrdinaryObservation(f.db, f.teacher, base), /no pertenecen/);
    await assert.rejects(saveOrdinaryObservation(f.db, f.otherTeacher, { ...base, studentId: f.student }), /no pertenecen/);
    assert.equal((await f.db.query('select count(*)::int as count from ordinary_observations')).rows[0].count, 0);
  } finally { await f.db.close(); }
});

test("corrección CAS append-only conserva original, alumno y media; revisión previa no se reescribe", async () => {
  const f = await fixture();
  try {
    const original = '  María dijo Ana  ';
    const { observation } = await saveOrdinaryObservation(f.db, f.teacher,
      { studentId: f.student, clientRequestId: randomUUID(), sourceKind: 'spontaneous', rawText: original });
    const revised = await reviseOrdinaryObservation(f.db, f.teacher, observation.id,
      { action: 'correct', correctedText: 'La profesora aclara: dijo Anha.', reason: 'Corregí la transcripción', expectedRevision: 1 });
    assert.equal(revised.status, 'corrected'); assert.equal(revised.source_revision, 2);
    assert.equal(revised.raw_text, original); assert.equal(revised.student_id, f.student);
    await assert.rejects(reviseOrdinaryObservation(f.db, f.teacher, observation.id,
      { action: 'void', reason: 'No corresponde', expectedRevision: 1 }), /versión|Recarga/i);
    await assert.rejects(f.db.query('update ordinary_observations set student_id=$1 where id=$2', [f.secondStudent, observation.id]), /inmutable/);
    await assert.rejects(f.db.query('update ordinary_observation_revisions set corrected_text=$1 where observation_id=$2', ['cambiado', observation.id]), /inmutable/);
    await assert.rejects(f.db.query('delete from ordinary_observations where id=$1', [observation.id]), /no se elimina/);
    assert.equal((await listOrdinaryObservations(f.db, f.teacher))[0].corrected_text, 'La profesora aclara: dijo Anha.');
  } finally { await f.db.close(); }
});

test("foto privada sin texto queda ligada al alumno y no exige competencia", async () => {
  const f = await fixture();
  try {
    const mediaPath = `student-evidence/${f.teacher}/${f.student}/${randomUUID()}.png`;
    const input = { studentId: f.student, clientRequestId: randomUUID(), sourceKind: 'spontaneous', rawText: null };
    const { observation } = await saveOrdinaryObservation(f.db, f.teacher, input,
      { mediaPath, mediaMimeType: 'image/png', mediaFingerprint: 'a'.repeat(64) });
    assert.equal(observation.student_id, f.student);
    assert.equal(observation.media_path, mediaPath);
    assert.equal(observation.raw_text, null);
    assert.equal(observation.activity_id, null);
    const retry = await saveOrdinaryObservation(f.db, f.teacher, input,
      { mediaPath: `student-evidence/${f.teacher}/${f.student}/${randomUUID()}.png`,
        mediaMimeType: 'image/png', mediaFingerprint: 'a'.repeat(64) });
    assert.equal(retry.created, false);
    assert.equal(retry.observation.media_path, mediaPath);
    await assert.rejects(f.db.query('update ordinary_observations set media_path=$1 where id=$2', ['otro',observation.id]), /inmutable/);
  } finally { await f.db.close(); }
});

test("un criterio elegido expresamente queda ligado al alumno y no se infiere del texto", async () => {
  const f = await fixture();
  try {
    const criterionId = randomUUID();
    await f.db.query(`insert into activity_criteria(id,activity_id,competency_v4_id,status,teacher_confirmed_at)
      values($1,$2,'COM_ORAL','active',now())`, [criterionId,f.activity]);
    const { observation } = await saveOrdinaryObservation(f.db, f.teacher, {
      studentId: f.student, clientRequestId: randomUUID(), sourceKind: 'guided', activityId: f.activity,
      criterionId, rawText: 'El audio dijo el nombre de otro niño.' });
    assert.equal(observation.student_id, f.student);
    assert.equal(observation.captured_criterion_id, criterionId);
    assert.equal(observation.context_snapshot.captured_competency_id, 'COM_ORAL');
    await assert.rejects(f.db.query(`update ordinary_observations set captured_criterion_id=null where id=$1`,
      [observation.id]), /inmutable/);
    await assert.rejects(saveOrdinaryObservation(f.db, f.teacher, {
      studentId: f.student, clientRequestId: randomUUID(), sourceKind: 'guided', activityId: f.activity,
      criterionId: randomUUID(), rawText: 'Prueba.' }), /no pertenecen/);
  } finally { await f.db.close(); }
});

test("criterio histórico activo sigue siendo decisión docente sin inventar ID V4", async () => {
  const f = await fixture();
  try {
    const criterionId = randomUUID(), legacyId = randomUUID();
    await f.db.query(`insert into activity_criteria(id,activity_id,competency_id,criterion_text,status)
      values($1,$2,$3,'Describe lo que observó','active')`, [criterionId,f.activity,legacyId]);
    const { observation } = await saveOrdinaryObservation(f.db,f.teacher,{
      studentId:f.student,clientRequestId:randomUUID(),sourceKind:'guided',activityId:f.activity,
      criterionId,rawText:'Describió lo que vio.' });
    assert.equal(observation.captured_criterion_id,criterionId);
    assert.equal(observation.context_snapshot.captured_legacy_competency_id,legacyId);
    assert.equal(observation.context_snapshot.captured_competency_id,null);
    assert.equal(observation.context_snapshot.captured_criterion_text,'Describe lo que observó');
  } finally { await f.db.close(); }
});
