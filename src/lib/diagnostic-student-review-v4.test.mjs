import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { loadDiagnosticExperienceWorkspace, recordDiagnosticExperienceObservation } from "./diagnostic-experiences-v4.mjs";
import { saveFamilyInterview, confirmFamilyInterview } from "./diagnostic-sources-v4.mjs";
import { confirmDiagnosticStudentReview, loadDiagnosticAssessmentWorkspace, prepareDiagnosticGroupReview,
  prepareDiagnosticStudentReview, saveDiagnosticStudentReview, saveDiagnosticGroupReview, confirmDiagnosticGroupReview } from "./diagnostic-assessment-v4.mjs";
import { buildStudentPedagogicalContext, buildSafeDiagnosticStudentContext } from "./student-context-service.mjs";
import { getCurrentClassroomContext, publicClassroomContext } from "./classroom-context-service.mjs";
import { buildAnnualPlanGenerationInput } from "./ai-annual-plan-ui-service.mjs";

const teacher = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
async function database() {
  const db = await PGlite.create();
  const migrations = new URL("../../local-db/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort())
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  return db;
}
async function classroom(db, user, section) {
  await createPilotClassroom(db, user, { teacherName: "Docente", institutionName: "Escuela", section, age: 5, year: 2026,
    startsOn: "2026-03-01", endsOn: "2026-12-18", castellanoL2Applicable: false, religionApplicable: false });
  await importStudentsForTeacher(db, user, [{ firstName: "Ana", lastName: "Prueba" }, { firstName: "Bruno", lastName: "Prueba" }]);
  return loadDiagnosticExperienceWorkspace(db, user);
}

test("un comentario por niño requiere palabras docentes, conserva fuentes y permite insuficiencia", async () => {
  const db = await database();
  try {
    const workspace = await classroom(db, teacher, "A");
    const studentId = workspace.students[0].id;
    const prepared = await prepareDiagnosticStudentReview(db, teacher, studentId);
    assert.equal(prepared.details.comment_text, "");
    assert.equal(prepared.details.information_status, "insufficient_information");
    await assert.rejects(confirmDiagnosticStudentReview(db, teacher, prepared.id), { reason: "invalid_details" });
    await assert.rejects(saveDiagnosticStudentReview(db, teacher, prepared.id,
      { information_status: "information_available", comment_text: "" }), { reason: "invalid_details" });
    await saveDiagnosticStudentReview(db, teacher, prepared.id, { information_status: "insufficient_information",
      comment_text: "Todavía necesito observar a Ana en el aula antes de interpretar su participación." });
    const confirmed = await confirmDiagnosticStudentReview(db, teacher, prepared.id);
    assert.equal(confirmed.status, "confirmed");
    assert.equal(confirmed.version, 1);
    await assert.rejects(saveDiagnosticStudentReview(db, teacher, prepared.id,
      { information_status: "insufficient_information", comment_text: "Otra idea" }), { reason: "not_editable" });
    await assert.rejects(db.query(`update diagnostic_student_reviews set details='{}'::jsonb where id=$1`, [prepared.id]), /inmutable/);
    const loaded = await loadDiagnosticAssessmentWorkspace(db, teacher);
    assert.equal(loaded.student_reviews.find((row) => row.id === prepared.id).is_current, true);
    const context = await buildStudentPedagogicalContext(db, studentId);
    assert.equal(context.confirmed_student_diagnostic_review.comment_text, confirmed.details.comment_text);
    assert.equal(context.confirmed_student_diagnostic_review.is_current, true);
    assert.equal((await buildSafeDiagnosticStudentContext(db, teacher, studentId)).teacher_confirmed_student_comment.comment_text,
      "Todavía necesito observar a [estudiante] en el aula antes de interpretar su participación.");
    assert.ok(context.source_provenance.some((row) => row.source_type === "diagnostic_student_review" && row.source_id === prepared.id));
  } finally { await db.close(); }
});

test("entrevista y observaciones nuevas invalidan el borrador o comentario; aula espera a todos", async () => {
  const db = await database();
  try {
    const workspace = await classroom(db, teacher, "A");
    const [ana, bruno] = workspace.students;
    await saveFamilyInterview(db, teacher, ana.id, { interests: "Le gusta construir." });
    await confirmFamilyInterview(db, teacher, ana.id);
    const draft = await prepareDiagnosticStudentReview(db, teacher, ana.id);
    await saveDiagnosticStudentReview(db, teacher, draft.id, { information_status: "insufficient_information",
      comment_text: "Su familia cuenta que le gusta construir; aún debo observarlo en el aula." });
    await recordDiagnosticExperienceObservation(db, teacher, { studentId: ana.id,
      experienceId: workspace.experiences[0].id, aspectId: workspace.experiences[0].aspects[0].id,
      observationStatus: "observed_without_judgment", observationText: "Eligió bloques y explicó su elección." });
    await assert.rejects(confirmDiagnosticStudentReview(db, teacher, draft.id), { reason: "stale_sources" });
    const refreshed = await prepareDiagnosticStudentReview(db, teacher, ana.id);
    assert.equal(refreshed.id, draft.id);
    await saveDiagnosticStudentReview(db, teacher, draft.id, { information_status: "information_available",
      comment_text: "En el aula eligió bloques y explicó su elección. La familia cuenta que también disfruta construir." });
    await confirmDiagnosticStudentReview(db, teacher, draft.id);
    await assert.rejects(prepareDiagnosticGroupReview(db, teacher), { reason: "incomplete_children" });
    const otherDraft = await prepareDiagnosticStudentReview(db, teacher, bruno.id);
    await saveDiagnosticStudentReview(db, teacher, otherDraft.id, { information_status: "insufficient_information",
      comment_text: "Aún necesito observar a Bruno en una experiencia de juego." });
    await confirmDiagnosticStudentReview(db, teacher, otherDraft.id);
    const groupDraft = await prepareDiagnosticGroupReview(db, teacher);
    assert.equal(groupDraft.status, "draft");
    assert.equal((await loadDiagnosticAssessmentWorkspace(db, teacher)).group_reviews.find((row) => row.id === groupDraft.id).is_current, true);
    await saveFamilyInterview(db, teacher, ana.id, { interests: "Ahora le interesan los cuentos." });
    await confirmFamilyInterview(db, teacher, ana.id);
    const loaded = await loadDiagnosticAssessmentWorkspace(db, teacher);
    assert.equal(loaded.student_reviews.find((row) => row.id === draft.id).is_current, false);
    assert.equal(loaded.group_reviews.find((row) => row.id === groupDraft.id).is_current, false);
    assert.equal((await buildStudentPedagogicalContext(db, ana.id)).confirmed_student_diagnostic_review.is_current, false);
    assert.equal((await buildSafeDiagnosticStudentContext(db, teacher, ana.id)).teacher_confirmed_student_comment, null);
    await assert.rejects(prepareDiagnosticGroupReview(db, teacher), { reason: "stale_sources" });
  } finally { await db.close(); }
});

test("panorama grupal deriva intereses y vacíos; el plan usa solo fuentes vigentes y grupales", async () => {
  const db = await database();
  try {
    const initial = await classroom(db, teacher, "A");
    const [ana, bruno] = initial.students;
    await saveFamilyInterview(db, teacher, ana.id, { interests: "Le gusta construir.", interest_tags: ["construction"] });
    await confirmFamilyInterview(db, teacher, ana.id);
    await saveFamilyInterview(db, teacher, bruno.id, { interests: "Le gusta construir.", interest_tags: ["construction"] });
    await confirmFamilyInterview(db, teacher, bruno.id);
    await saveFamilyInterview(db, teacher, bruno.id, { interests: "Le gusta dibujar.", interest_tags: ["drawing"] }); // borrador excluido
    const aspect = initial.experiences[0].aspects[0];
    await recordDiagnosticExperienceObservation(db, teacher, { studentId: ana.id,
      experienceId: initial.experiences[0].id, aspectId: aspect.id,
      observationStatus: "observed_without_judgment", observationText: "Eligió bloques para jugar." });
    for (const [student, information_status, comment_text] of [
      [ana, "information_available", "En el aula eligió bloques; su familia contó que le gusta construir."],
      [bruno, "insufficient_information", "Todavía necesito observar más a Bruno durante el juego."],
    ]) {
      const draft = await prepareDiagnosticStudentReview(db, teacher, student.id);
      await saveDiagnosticStudentReview(db, teacher, draft.id, { information_status, comment_text });
      await confirmDiagnosticStudentReview(db, teacher, draft.id);
    }
    const before = await loadDiagnosticAssessmentWorkspace(db, teacher);
    assert.deepEqual(before.derived_group_information.interests.map((item) => [item.key, item.count]), [["construction", 2]]);
    assert.equal(before.group_coverage.find((item) => item.competency_id === aspect.competency_id).children_without_observations, 1);
    assert.ok(before.group_coverage.some((item) => item.children_without_observations === 2));
    const draft = await prepareDiagnosticGroupReview(db, teacher);
    await saveDiagnosticGroupReview(db, teacher, draft.id, { strengths: "Ana explica sus elecciones y otros niños también participan.", needs: "Conviene recoger más observaciones.", planning_priorities: "Proponer juegos para conversar." });
    await confirmDiagnosticGroupReview(db, teacher, draft.id);
    const current = publicClassroomContext(await getCurrentClassroomContext(db, teacher, initial.classroom.id));
    assert.equal(current.diagnostic_review_current, true);
    assert.match(current.confirmed_diagnostic_summary, /Proponer juegos/);
    assert.doesNotMatch(current.confirmed_diagnostic_summary, /\bAna\b/);
    const input = buildAnnualPlanGenerationInput({ classroom: { id: initial.classroom.id, age: 5,
      group_context: "Aula de 5 años", diagnostic_summary: current.confirmed_diagnostic_summary,
      context_v4: current, calendar: { school_year: 2026, starts_on: "2026-03-01", ends_on: "2026-12-18" } } });
    const serialized = JSON.stringify(input);
    assert.equal(input.calendar_context.project_slots.length, 12);
    assert.doesNotMatch(serialized, /\bAna\b|\bBruno\b|Le gusta construir|Eligió bloques|student_id|student_context|adjunto|foto/i);
    assert.equal(input.context_snapshot.observation_gaps.some((item) => item.competency_id === aspect.competency_id), false); // celda pequeña suprimida
    await recordDiagnosticExperienceObservation(db, teacher, { studentId: bruno.id,
      experienceId: initial.experiences[0].id, aspectId: aspect.id,
      observationStatus: "observed_without_judgment", observationText: "Comentó su juego." });
    const stale = publicClassroomContext(await getCurrentClassroomContext(db, teacher, initial.classroom.id));
    assert.equal(stale.diagnostic_review_current, false);
    assert.equal(stale.confirmed_diagnostic_summary, null);
    assert.throws(() => buildAnnualPlanGenerationInput({ classroom: { id: initial.classroom.id, age: 5,
      context_v4: stale, calendar: input.calendar_context } }), { reason: "diagnostic_review_required" });
  } finally { await db.close(); }
});

test("los registros diagnósticos anteriores también aparecen y actualizan la huella del niño", async () => {
  const db = await database();
  try {
    const workspace = await classroom(db, teacher, "A");
    const studentId = workspace.students[0].id;
    const classroomId = workspace.classroom.id;
    const sessionId = "aaaaaaaa-aaaa-4aaa-8aaa-000000000001";
    const entryId = "aaaaaaaa-aaaa-4aaa-8aaa-000000000002";
    const observationId = "aaaaaaaa-aaaa-4aaa-8aaa-000000000003";
    await db.query(`insert into diagnostic_sessions(id,classroom_id,title,created_by)
      values($1,$2,'Registro anterior',$3)`, [sessionId,classroomId,teacher]);
    await db.query(`insert into diagnostic_entries(id,session_id,student_id,competency_id,observation_context,observation_text)
      values($1,$2,$3,$4,'Juego libre','Eligió semillas y comentó su color.')`,
      [entryId,sessionId,studentId,"50000000-0000-4000-8000-000000000001"]);
    await db.query(`insert into student_observations(id,diagnostic_entry_id,reference_id,status,note,author_id)
      values($1,$2,$3,'observed','Eligió semillas y comentó su color.',$4)`,
      [observationId,entryId,"d1000000-0000-4000-8000-000000000001",teacher]);
    const loaded = await loadDiagnosticAssessmentWorkspace(db, teacher);
    assert.equal(loaded.observations.find((row) => row.id === `legacy:${observationId}`).observation_text,
      "Eligió semillas y comentó su color.");
    const draft = await prepareDiagnosticStudentReview(db, teacher, studentId);
    await saveDiagnosticStudentReview(db, teacher, draft.id, { information_status: "information_available",
      comment_text: "En el juego eligió semillas y comentó su color." });
    await confirmDiagnosticStudentReview(db, teacher, draft.id);
    await db.query(`update student_observations set note='Describió el color de las semillas.' where id=$1`, [observationId]);
    const stale = await loadDiagnosticAssessmentWorkspace(db, teacher);
    assert.equal(stale.student_reviews.find((row) => row.id === draft.id).is_current, false);
  } finally { await db.close(); }
});

test("comentarios individuales son privados por docente y la UI no llama directamente al proveedor", async () => {
  const db = await database();
  try {
    const first = await classroom(db, teacher, "A");
    await classroom(db, other, "B");
    await assert.rejects(prepareDiagnosticStudentReview(db, other, first.students[0].id), { reason: "invalid_student" });
    const prepared = await prepareDiagnosticStudentReview(db, teacher, first.students[0].id);
    await assert.rejects(saveDiagnosticStudentReview(db, other, prepared.id, { information_status: "insufficient_information",
      comment_text: "Aún necesito observar." }), { reason: "not_editable" });
    assert.deepEqual((await loadDiagnosticAssessmentWorkspace(db, other)).student_reviews, []);
    const ui = await readFile(new URL("../features/dashboard/components/diagnostic-review-v4.tsx", import.meta.url), "utf8");
    const remote = await readFile(new URL("../../supabase/migrations/202609230005_diagnostic_student_reviews.sql", import.meta.url), "utf8");
    assert.match(ui, /Lo que contó la familia/);
    assert.match(ui, /Lo que observaste/);
    assert.match(ui, /Tu comentario sobre/);
    assert.doesNotMatch(ui, /OpenAIProvider|generateAIWorkflowV4/);
    assert.match(remote, /enable row level security/);
    assert.match(remote, /revoke insert, update, delete/);
  } finally { await db.close(); }
});
