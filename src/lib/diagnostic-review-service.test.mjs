import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { completeDiagnosticReviewForTeacher, diagnosticProgressForTeacher } from "./diagnostic-review-service.mjs";
import { loadDiagnosticExperienceWorkspace, recordDiagnosticExperienceObservation } from "./diagnostic-experiences-v4.mjs";
import { prepareDiagnosticSynthesis, saveDiagnosticSynthesis, confirmDiagnosticSynthesis, prepareDiagnosticGroupReview, saveDiagnosticGroupReview, confirmDiagnosticGroupReview } from "./diagnostic-assessment-v4.mjs";

const teacher = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherTeacher = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

async function database() {
  const db = await PGlite.create();
  const migrations = new URL("../../local-db/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  }
  return db;
}

test("la revisión diagnóstica requiere un aula propia y al menos un niño", async () => {
  const db = await database();
  try {
    await assert.rejects(completeDiagnosticReviewForTeacher(db, teacher), { reason: "no_classroom" });
    await assert.rejects(diagnosticProgressForTeacher(db, teacher), { reason: "no_classroom" });
    await createPilotClassroom(db, teacher, { teacherName: "Docente", institutionName: "Escuela", section: "A", age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18", castellanoL2Applicable: false, religionApplicable: false });
    await assert.rejects(completeDiagnosticReviewForTeacher(db, teacher), { reason: "no_students" });
    assert.deepEqual(await diagnosticProgressForTeacher(db, teacher), { student_count: 0, observation_count: 0, reviewed: false });
    await assert.rejects(completeDiagnosticReviewForTeacher(db, otherTeacher), { reason: "no_classroom" });
  } finally { await db.close(); }
});

test("la revisión grupal confirmada cierra el diagnóstico y permite continuar observando después", async () => {
  const db = await database();
  try {
    const { classroomId } = await createPilotClassroom(db, teacher, { teacherName: "Docente", institutionName: "Escuela", section: "A", age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18", castellanoL2Applicable: false, religionApplicable: false });
    await importStudentsForTeacher(db, teacher, [{ firstName: "Niña", lastName: "Ficticia" }]);
    assert.deepEqual(await diagnosticProgressForTeacher(db, teacher), { student_count: 1, observation_count: 0, reviewed: false });
    await assert.rejects(completeDiagnosticReviewForTeacher(db, teacher), { reason: "no_confirmed_diagnosis" });
    const workspace = await loadDiagnosticExperienceWorkspace(db, teacher);
    const experience = workspace.experiences[0];
    await recordDiagnosticExperienceObservation(db, teacher, { studentId: workspace.students[0].id,
      experienceId: experience.id, aspectId: experience.aspects[0].id,
      observationStatus: "insufficient_information", observationText: "Solo lo vi un momento." });
    const synthesis = await prepareDiagnosticSynthesis(db, teacher, { studentId: workspace.students[0].id, competencyId: experience.aspects[0].competency_id });
    await saveDiagnosticSynthesis(db, teacher, synthesis.id, synthesis.details);
    await confirmDiagnosticSynthesis(db, teacher, synthesis.id);
    const group = await prepareDiagnosticGroupReview(db, teacher);
    await saveDiagnosticGroupReview(db, teacher, group.id, { strengths: "", needs: "Seguir observando.", planning_priorities: "" });
    await confirmDiagnosticGroupReview(db, teacher, group.id);
    const first = await completeDiagnosticReviewForTeacher(db, teacher);
    assert.deepEqual(await diagnosticProgressForTeacher(db, teacher), { student_count: 1, observation_count: 1, reviewed: true });
    const second = await completeDiagnosticReviewForTeacher(db, teacher);
    assert.equal(first.sessionId, second.sessionId);
    const sessions = (await db.query(`select id,status,completed_at from diagnostic_sessions where classroom_id=$1`, [classroomId])).rows;
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].status, "completed");
    assert.ok(sessions[0].completed_at);
    const activeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    await db.query(`insert into diagnostic_sessions(id,classroom_id,title,created_by) values($1,$2,'Observaciones posteriores',$3)`, [activeId, classroomId, teacher]);
    const third = await completeDiagnosticReviewForTeacher(db, teacher);
    assert.equal(third.sessionId, activeId);
    assert.equal((await db.query(`select count(*)::int as total from diagnostic_sessions where classroom_id=$1 and status='completed'`, [classroomId])).rows[0].total, 2);
  } finally { await db.close(); }
});
