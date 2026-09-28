import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { reassignEvidenceStudent } from "./evidence-student-correction.mjs";

const ids = Array.from({ length: 8 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`);
const [teacher, otherTeacher, room, otherRoom, oldStudent, newStudent, outsider, evidence] = ids;
async function fixture() {
  const db = await PGlite.create();
  await db.exec(`create table classrooms(id uuid primary key,teacher_id uuid,school_year_id uuid);
    create table students(id uuid primary key,classroom_id uuid,status text);
    create table evaluation_periods(id uuid,school_year_id uuid,starts_on date,ends_on date);
    create table period_closures(classroom_id uuid,evaluation_period_id uuid);
    create table activity_criteria(id uuid primary key,competency_v4_id text);
    create table competency_assessments(student_id uuid,competency_v4_id text,status text,teacher_confirmed_at timestamptz,period_start date,period_end date);
    create table evidences(id uuid primary key,student_id uuid,criterion_id uuid,created_by uuid,media_path text,observation_text text,observed_on date,student_reassignment_history jsonb not null default '[]');
    insert into classrooms values('${room}','${teacher}','${room}'),('${otherRoom}','${otherTeacher}','${otherRoom}');
    insert into students values('${oldStudent}','${room}','active'),('${newStudent}','${room}','active'),('${outsider}','${otherRoom}','active');
    insert into activity_criteria values('${room}','PS_CONVIVE');
    insert into evaluation_periods values('${room}','${room}','2026-05-25','2026-07-24');
    insert into evidences(id,student_id,criterion_id,created_by,observation_text,observed_on) values('${evidence}','${oldStudent}','${room}','${teacher}','Propuso alternar la cesta.','2026-06-08');`);
  return db;
}
const payload = () => ({ evidenceId: evidence, teacherId: teacher, expectedStudentId: oldStudent, studentId: newStudent, expectedRevision: 0, reason: "Seleccioné al alumno equivocado al registrar." });

test("reasociación conserva texto/fecha e historial y refresca ambos alumnos", async () => {
  const db = await fixture();
  try {
    const refreshed = [];
    const result = await reassignEvidenceStudent(db, payload(), async (_db, id) => refreshed.push(id));
    assert.equal(result.student_id, newStudent);
    const row = (await db.query('select * from evidences')).rows[0];
    assert.equal(row.observation_text, 'Propuso alternar la cesta.');
    assert.equal(row.observed_on.toISOString().slice(0, 10), '2026-06-08');
    assert.equal(row.student_reassignment_history.length, 1);
    assert.equal(row.student_reassignment_history[0].from_student_id, oldStudent);
    assert.equal(row.student_reassignment_history[0].to_student_id, newStudent);
    assert.equal(row.student_reassignment_history[0].teacher_id, teacher);
    assert.deepEqual(refreshed, [oldStudent, newStudent]);
    await assert.rejects(reassignEvidenceStudent(db, payload()), /cambió/);
  } finally { await db.close(); }
});

test("no admite otra docente, otro aula, adjuntos ni cambio sin motivo", async () => {
  const db = await fixture();
  try {
    await assert.rejects(reassignEvidenceStudent(db, { ...payload(), teacherId: otherTeacher }), /no encontrada/);
    await assert.rejects(reassignEvidenceStudent(db, { ...payload(), studentId: outsider }), /misma aula/);
    await assert.rejects(reassignEvidenceStudent(db, { ...payload(), reason: '' }), /motivo/);
    await db.query("update evidences set media_path='privado/audio' where id=$1", [evidence]);
    await assert.rejects(reassignEvidenceStudent(db, payload()), /adjunto/);
    assert.equal((await db.query('select student_id from evidences')).rows[0].student_id, oldStudent);
  } finally { await db.close(); }
});

test("bloquea período cerrado o valoración confirmada afectada, no otro período", async () => {
  const db = await fixture();
  try {
    await db.exec(`insert into period_closures values('${room}','${room}')`);
    await assert.rejects(reassignEvidenceStudent(db, payload()), /cerrado/);
    await db.exec(`delete from period_closures;
      insert into competency_assessments values('${oldStudent}','PS_CONVIVE','active',now(),'2026-05-25','2026-07-24')`);
    await assert.rejects(reassignEvidenceStudent(db, payload()), /valoración confirmada/);
    await db.exec("update competency_assessments set period_start='2026-03-16',period_end='2026-05-15'");
    assert.equal((await reassignEvidenceStudent(db, payload())).student_id, newStudent);
  } finally { await db.close(); }
});

test("ruta y UI usan corrección autorizada y revisión de asignación, no reescritura de notas", async () => {
  const server = await readFile(new URL('../../scripts/local-db-server.mjs', import.meta.url), 'utf8');
  const ui = await readFile(new URL('../features/dashboard/components/evidence-student-correction.tsx', import.meta.url), 'utf8');
  const auth = await readFile(new URL('../../scripts/request-authorization.mjs', import.meta.url), 'utf8');
  assert.match(server, /reassignEvidenceStudent\(db, \{ \.\.\.body, evidenceId: url.pathname.split\('\/'\)\[3\], teacherId \}, refreshStudentContextSnapshot\)/);
  assert.match(auth, /evidences: "evidence"/);
  assert.match(ui, /expectedStudentId: profile.student.id, expectedRevision: note.assignment_revision/);
  assert.match(ui, /apiFetch\(/);
});
