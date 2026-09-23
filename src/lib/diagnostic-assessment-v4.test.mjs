import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { loadDiagnosticExperienceWorkspace, recordDiagnosticExperienceObservation } from "./diagnostic-experiences-v4.mjs";
import {
  confirmDiagnosticGroupReview, confirmDiagnosticSynthesis, loadDiagnosticAssessmentWorkspace,
  prepareDiagnosticGroupReview, prepareDiagnosticSynthesis, saveDiagnosticGroupReview,
  saveDiagnosticSynthesis, saveStudentInitialContext, sameDiagnosticSources, summarizeDiagnosticGroup, diagnosticPlanningSummary,
} from "./diagnostic-assessment-v4.mjs";
import { buildStudentPedagogicalContext } from "./student-context-service.mjs";
import { diagnosticProgressForTeacher } from "./diagnostic-review-service.mjs";

const teacher = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
async function database() {
  const db = await PGlite.create();
  const migrations = new URL("../../local-db/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(file, migrations), "utf8"));
  return db;
}
async function classroom(db, user, section) {
  await createPilotClassroom(db, user, { teacherName: "Docente", institutionName: "Escuela", section, age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18", castellanoL2Applicable: false, religionApplicable: false });
  await importStudentsForTeacher(db, user, [{ firstName: "Ana", lastName: "Prueba" }, { firstName: "Bruno", lastName: "Prueba" }]);
  return loadDiagnosticExperienceWorkspace(db, user);
}
async function observe(db, user, workspace, studentId, aspectIndex = 0, status = "demonstrated", note = "Eligió bloques y explicó su idea.") {
  return recordDiagnosticExperienceObservation(db, user, {
    studentId, experienceId: workspace.experiences[0].id,
    aspectId: workspace.experiences[0].aspects[aspectIndex].id,
    observationStatus: status, observationText: note,
  });
}

test("síntesis individual conserva fuentes reales, versiones e inmutabilidad", async () => {
  const db = await database();
  try {
    const workspace = await classroom(db, teacher, "A");
    const studentId = workspace.students[0].id;
    const competencyId = workspace.experiences[0].aspects[0].competency_id;
    await assert.rejects(prepareDiagnosticSynthesis(db, teacher, { studentId, competencyId }), { reason: "no_observations" });
    const firstObservation = await observe(db, teacher, workspace, studentId);
    const prepared = await prepareDiagnosticSynthesis(db, teacher, { studentId, competencyId });
    assert.match(prepared.details.summary_text, /1 observaciones diagnósticas/);
    const original = (await db.query(`select source_snapshot from diagnostic_competency_reviews where id=$1`, [prepared.id])).rows[0].source_snapshot;
    assert.deepEqual(original.map((item) => item.id), [firstObservation.id]);
    assert.equal(sameDiagnosticSources(original, [{ fingerprint: original[0].fingerprint, id: original[0].id }]), true);
    await saveDiagnosticSynthesis(db, teacher, prepared.id, { information_status: "information_available", summary_text: "En el juego eligió bloques y explicó su idea.", next_observation: "Observar acuerdos de juego." });
    await observe(db, teacher, workspace, studentId, 0, "with_support", "Pidió apoyo para continuar.");
    await assert.rejects(confirmDiagnosticSynthesis(db, teacher, prepared.id), { reason: "stale_sources" });
    const regenerated = await prepareDiagnosticSynthesis(db, teacher, { studentId, competencyId });
    assert.equal(regenerated.id, prepared.id);
    await saveDiagnosticSynthesis(db, teacher, prepared.id, { information_status: "information_available", summary_text: "Eligió bloques y luego pidió apoyo para continuar.", next_observation: "" });
    const confirmed = await confirmDiagnosticSynthesis(db, teacher, prepared.id);
    assert.equal(confirmed.status, "confirmed");
    assert.equal(confirmed.version, 1);
    await assert.rejects(saveDiagnosticSynthesis(db, teacher, prepared.id, confirmed.details), { reason: "not_editable" });
    await assert.rejects(db.query(`update diagnostic_competency_reviews set details='{}'::jsonb where id=$1`, [prepared.id]), /inmutable/);
    const next = await prepareDiagnosticSynthesis(db, teacher, { studentId, competencyId });
    assert.notEqual(next.id, prepared.id);
    const rows = (await db.query(`select version,status from diagnostic_competency_reviews where student_id=$1 order by version`, [studentId])).rows;
    assert.deepEqual(rows.map((item) => item.version), [1, 2]);
    assert.deepEqual(rows.map((item) => item.status), ["confirmed", "draft"]);
    const context = await buildStudentPedagogicalContext(db, studentId);
    assert.equal(context.confirmed_diagnostic_reviews.length, 1);
    assert.equal(context.confirmed_diagnostic_reviews[0].source, "diagnostic");
    assert.equal(context.confirmed_diagnostic_reviews[0].summary_text, confirmed.details.summary_text);
    assert.equal(context.recent_relevant_observations.length, 0); // No formative evidence was created.
  } finally { await db.close(); }
});

test("información insuficiente es explícita y la ausencia de registro no crea resultado", async () => {
  const db = await database();
  try {
    const workspace = await classroom(db, teacher, "A");
    const studentId = workspace.students[0].id;
    const otherStudent = workspace.students[1].id;
    const competencyId = workspace.experiences[0].aspects[0].competency_id;
    await observe(db, teacher, workspace, studentId, 0, "insufficient_information", "Solo lo vi un momento.");
    const prepared = await prepareDiagnosticSynthesis(db, teacher, { studentId, competencyId });
    assert.equal(prepared.details.information_status, "insufficient_information");
    await saveDiagnosticSynthesis(db, teacher, prepared.id, prepared.details);
    const confirmed = await confirmDiagnosticSynthesis(db, teacher, prepared.id);
    assert.equal(confirmed.details.information_status, "insufficient_information");
    const review = await loadDiagnosticAssessmentWorkspace(db, teacher);
    assert.equal(review.observations.filter((item) => item.student_id === otherStudent).length, 0);
    assert.equal(review.reviews.filter((item) => item.student_id === otherStudent).length, 0);
    assert.equal(review.group_coverage.find((item) => item.competency_id === competencyId).children_without_observations, 1);
  } finally { await db.close(); }
});

test("vista grupal usa solo síntesis confirmadas; prioridades docentes llegan al plan", async () => {
  const db = await database();
  try {
    const workspace = await classroom(db, teacher, "A");
    const studentId = workspace.students[0].id;
    const competencyId = workspace.experiences[0].aspects[0].competency_id;
    await observe(db, teacher, workspace, studentId);
    await assert.rejects(prepareDiagnosticGroupReview(db, teacher), { reason: "no_confirmations" });
    const individual = await prepareDiagnosticSynthesis(db, teacher, { studentId, competencyId });
    await saveDiagnosticSynthesis(db, teacher, individual.id, { information_status: "information_available", summary_text: "Eligió y explicó el juego.", next_observation: "" });
    await confirmDiagnosticSynthesis(db, teacher, individual.id);
    const group = await prepareDiagnosticGroupReview(db, teacher);
    await saveDiagnosticGroupReview(db, teacher, group.id, { strengths: "Interés por el juego.", needs: "Ofrecer más oportunidades de conversación.", planning_priorities: "Proponer juego compartido." });
    const secondStudent = workspace.students[1].id;
    const secondCompetency = workspace.experiences[0].aspects[1].competency_id;
    await observe(db, teacher, workspace, secondStudent, 1, "with_support", "Conversó con apoyo.");
    const secondReview = await prepareDiagnosticSynthesis(db, teacher, { studentId: secondStudent, competencyId: secondCompetency });
    await saveDiagnosticSynthesis(db, teacher, secondReview.id, { information_status: "information_available", summary_text: "Conversó con apoyo durante el juego.", next_observation: "" });
    await confirmDiagnosticSynthesis(db, teacher, secondReview.id);
    await assert.rejects(confirmDiagnosticGroupReview(db, teacher, group.id), { reason: "stale_sources" });
    assert.equal((await prepareDiagnosticGroupReview(db, teacher)).id, group.id);
    const confirmed = await confirmDiagnosticGroupReview(db, teacher, group.id);
    assert.equal(confirmed.status, "confirmed");
    assert.equal((await diagnosticProgressForTeacher(db, teacher)).reviewed, true);
    await assert.rejects(saveDiagnosticGroupReview(db, teacher, group.id, confirmed.details), { reason: "not_editable" });
    const review = await loadDiagnosticAssessmentWorkspace(db, teacher);
    const coverage = review.group_coverage.find((item) => item.competency_id === competencyId);
    assert.equal(coverage.children_with_observations, 1);
    assert.equal(coverage.confirmed_with_information, 1);
    assert.equal(coverage.children_without_observations, 1);
    assert.equal(review.group_reviews[0].details.planning_priorities, "Proponer juego compartido.");
    assert.equal(summarizeDiagnosticGroup(workspace.students, [], [], workspace.experiences).every((item) => item.confirmed_with_information === 0), true);
    const server = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
    assert.match(server, /diagnostic_group_reviews where classroom_id=\$1 and status='confirmed'/);
    assert.match(server, /diagnostic_summary: groupSummary/);
    assert.equal(diagnosticPlanningSummary({ strengths: "Ana conversó.", needs: "", planning_priorities: "Jugar juntos." }, ["Ana"]), "[estudiante] conversó. Jugar juntos.");
    assert.equal(diagnosticPlanningSummary(null), undefined);
  } finally { await db.close(); }
});

test("docentes y aulas quedan aislados; no se aceptan fuentes ni competencias fabricadas", async () => {
  const db = await database();
  try {
    const first = await classroom(db, teacher, "A");
    const second = await classroom(db, other, "B");
    const studentId = first.students[0].id;
    const competencyId = first.experiences[0].aspects[0].competency_id;
    await observe(db, teacher, first, studentId);
    await saveStudentInitialContext(db, teacher, studentId, "Le interesan las construcciones.");
    assert.equal((await loadDiagnosticAssessmentWorkspace(db, teacher)).students[0].initial_context, "Le interesan las construcciones.");
    await assert.rejects(saveStudentInitialContext(db, other, studentId, "Texto ajeno"), { reason: "invalid_student" });
    assert.equal((await loadDiagnosticAssessmentWorkspace(db, other)).students[0].initial_context, null);
    await assert.rejects(prepareDiagnosticSynthesis(db, other, { studentId, competencyId }), { reason: "invalid_student" });
    await assert.rejects(prepareDiagnosticSynthesis(db, teacher, { studentId, competencyId: "fake" }), { reason: "invalid_competency" });
    const prepared = await prepareDiagnosticSynthesis(db, teacher, { studentId, competencyId, sourceIds: [second.students[0].id] });
    const snapshot = (await db.query(`select source_snapshot from diagnostic_competency_reviews where id=$1`, [prepared.id])).rows[0].source_snapshot;
    assert.equal(snapshot.length, 1);
    assert.notEqual(snapshot[0].id, second.students[0].id);
    await assert.rejects(saveDiagnosticSynthesis(db, other, prepared.id, prepared.details), { reason: "not_editable" });
    assert.deepEqual((await loadDiagnosticAssessmentWorkspace(db, other)).observations, []);
  } finally { await db.close(); }
});

test("migración remota protege lectura y exige servidor para escritura; la UI no llama a un modelo", async () => {
  const [sql, hardening, ui, service] = await Promise.all([
    readFile(new URL("../../supabase/migrations/202609230001_diagnostic_review_v4.sql", import.meta.url), "utf8"),
    readFile(new URL("../../supabase/migrations/202609230003_diagnostic_server_authority.sql", import.meta.url), "utf8"),
    readFile(new URL("../features/dashboard/components/diagnostic-review-v4.tsx", import.meta.url), "utf8"),
    readFile(new URL("./diagnostic-assessment-v4.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(sql, /enable row level security/g);
  assert.match(sql, /diagnostic_review_insert_own/);
  assert.match(sql, /diagnostic_group_update_draft/);
  assert.match(sql, /prevent_confirmed_diagnostic_change/);
  assert.match(hardening, /drop policy if exists diagnostic_experience_insert_own/);
  assert.match(hardening, /revoke insert, update, delete on public\.diagnostic_competency_reviews from authenticated/);
  assert.match(hardening, /revoke insert, update, delete on public\.diagnostic_group_reviews from authenticated/);
  assert.match(ui, /Revisar diagnóstico/);
  assert.match(ui, /Información insuficiente/);
  assert.doesNotMatch(service, /OpenAIProvider|fetch\(|generateAIWorkflowV4/);
});
