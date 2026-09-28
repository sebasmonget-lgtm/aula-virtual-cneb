import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { loadDiagnosticExperienceWorkspace, recordDiagnosticExperienceObservation } from "./diagnostic-experiences-v4.mjs";
import { prepareDiagnosticStudentReview, saveDiagnosticStudentReview, confirmDiagnosticStudentReview,
  prepareDiagnosticGroupReview, diagnosticGroupProposalSources } from "./diagnostic-assessment-v4.mjs";
import { DiagnosticSuggestionError, suggestDiagnosticGroupReview } from "./ai-diagnostic-evaluation-service.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";

const teacher = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherTeacher = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

async function database() {
  const db = await PGlite.create();
  const migrations = new URL("../../local-db/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort())
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  return db;
}

test("Skill diagnóstica sugiere un borrador editable sin enviar nombres, entrevista ni observaciones crudas", async () => {
  const db = await database();
  try {
    await createPilotClassroom(db, teacher, { teacherName: "Docente", institutionName: "Escuela", section: "A",
      age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18",
      castellanoL2Applicable: false, religionApplicable: false });
    await importStudentsForTeacher(db, teacher, [{ firstName: "Ana", lastName: "Prueba" }, { firstName: "Bruno", lastName: "Prueba" }]);
    const students = (await db.query(`select s.id,s.first_name from students s join classrooms c on c.id=s.classroom_id
      where s.status='active' and c.teacher_id=$1 and c.status='active' order by s.first_name`, [teacher])).rows;
    const workspace = await loadDiagnosticExperienceWorkspace(db, teacher);
    await recordDiagnosticExperienceObservation(db, teacher, { studentId: students[0].id,
      experienceId: workspace.experiences[0].id, aspectId: workspace.experiences[0].aspects[0].id,
      observationStatus: "demonstrated", observationText: "OBSERVACION_PRIVADA_DE_PRUEBA" });
    for (const student of students) {
      const draft = await prepareDiagnosticStudentReview(db, teacher, student.id);
      await saveDiagnosticStudentReview(db, teacher, draft.id, { information_status: "insufficient_information",
        comment_text: `${student.first_name} participó en el juego; seguiré observando cómo conversa con otros.` });
      await confirmDiagnosticStudentReview(db, teacher, draft.id);
    }
    const group = await prepareDiagnosticGroupReview(db, teacher);
    const requests = [];
    const output = { strengths: "En el juego surgieron intentos de participar.",
      needs: "Conviene ofrecer más momentos para conversar y seguir observando al grupo.",
      planning_priorities: "Organizar juegos en pequeños grupos y escuchar sus ideas." };
    const suggestion = await suggestDiagnosticGroupReview(db, teacher, group.id, {
      createProvider: (plan) => ({ generate: async (request) => { requests.push({ plan, request }); return { output }; } }),
    });
    assert.deepEqual(suggestion.details, { ...output, competency_priorities: [] });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].request.output_schema.id, "diagnostic-group-suggestion-v2");
    assert.match(requests[0].request.skill_instructions, /Skill crear-evaluacion-diagnostica/);
    const bundle = requests[0].request.ai_context_bundle;
    assert.equal(bundle.context.confirmed_teacher_comments.length, 2);
    assert.doesNotMatch(JSON.stringify(bundle), /Ana|Bruno|Prueba|student_id|interview|observation_text|OBSERVACION_PRIVADA_DE_PRUEBA/);
    assert.equal((await db.query("select details from diagnostic_group_reviews where id=$1", [group.id])).rows[0].details.strengths, "");
    assert.deepEqual((await diagnosticGroupProposalSources(db, teacher, group.id)).comments.length, 2);
    await assert.rejects(diagnosticGroupProposalSources(db, otherTeacher, group.id), { reason: "no_classroom" });
  } finally { await db.close(); }
});

test("rechaza salida incompleta, niveles y fuentes que cambian durante la llamada", async () => {
  assert.equal(neutralizeAssessmentText("Ana llegó en la mañana y Anabel miró.", ["Ana"]),
    "[estudiante] llegó en la mañana y Anabel miró.");
  const source = { age: 5, student_count: 1, comments: [{ information_status: "information_available", comment: "Jugó y conversó." }],
    competency_options: [{ id: "COM_ORAL", name: "Se comunica oralmente" }],
    source_snapshot: [{ id: "a", fingerprint: "uno" }] };
  const run = (output, loadSources = async () => source) => suggestDiagnosticGroupReview({ query: async () => ({ rows: [] }) }, teacher, "draft", {
    loadSources, createProvider: () => ({ generate: async () => ({ output }) }),
  });
  await assert.rejects(run({ strengths: "Algo." }), (error) => error instanceof DiagnosticSuggestionError && error.reason === "proposal_invalid");
  await assert.rejects(run({ strengths: "Nivel A", needs: "Más juego.", planning_priorities: "Observar." }), { reason: "proposal_invalid" });
  await assert.rejects(run({ strengths: "Ana juega.", needs: "Conversar.", planning_priorities: "Juegos." },
    async () => ({ ...source, known_names: ["Ana"] })), { reason: "proposal_invalid" });
  let calls = 0;
  await assert.rejects(run({ strengths: "Jugó.", needs: "Conversar.", planning_priorities: "Juegos." },
    async () => ++calls === 1 ? source : { ...source, source_snapshot: [{ id: "a", fingerprint: "dos" }] }), { reason: "stale_sources" });
});

test("Ayni puede proponer el resumen desde hechos anónimos sin comentarios individuales", async () => {
  const db = await database();
  try {
    await createPilotClassroom(db, teacher, { teacherName: "Docente", institutionName: "Escuela", section: "A",
      age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18", castellanoL2Applicable: false, religionApplicable: false });
    await importStudentsForTeacher(db, teacher, [{ firstName: "Ana", lastName: "Prueba" }]);
    const workspace = await loadDiagnosticExperienceWorkspace(db, teacher);
    const group = await prepareDiagnosticGroupReview(db, teacher);
    let calls = 0;
    const createProvider = () => ({ generate: async (request) => {
      calls++;
      const bundle = request.ai_context_bundle;
      assert.deepEqual(bundle.context.confirmed_teacher_comments, []);
      assert.equal(bundle.context.observed_records.length, 1);
      assert.equal(bundle.context.observed_records[0].child, "niño_1");
      assert.equal(bundle.context.observed_records[0].notes.length, 1);
      assert.match(bundle.context.observed_records[0].notes[0].text, /eligió bloques/i);
      assert.doesNotMatch(JSON.stringify(bundle), /\bAna\b|Prueba|student_id|teacher_id|domicilio|77777777/);
      return { output: { strengths: "Hay un registro de elección de materiales.", needs: "Seguir recogiendo observaciones.", planning_priorities: "Ofrecer juegos con materiales variados." } };
    } });
    await assert.rejects(suggestDiagnosticGroupReview(db, teacher, group.id, { createProvider }), { reason: "insufficient_information" });
    assert.equal(calls, 0);
    await recordDiagnosticExperienceObservation(db, teacher, { studentId: workspace.students[0].id,
      experienceId: workspace.experiences[0].id, aspectId: workspace.experiences[0].aspects[0].id,
      observationStatus: "observed_without_judgment", observationText: "Ana eligió bloques y explicó su elección." });
    await recordDiagnosticExperienceObservation(db, teacher, { studentId: workspace.students[0].id,
      experienceId: workspace.experiences[0].id, aspectId: workspace.experiences[0].aspects[1].id,
      observationStatus: "observed_without_judgment", observationText: "Su familia contó su domicilio y teléfono 77777777." });
    await prepareDiagnosticGroupReview(db, teacher);
    const result = await suggestDiagnosticGroupReview(db, teacher, group.id, { createProvider });
    assert.equal(calls, 1);
    assert.equal(result.details.strengths, "Hay un registro de elección de materiales.");
    assert.equal((await db.query("select count(*)::int as n from diagnostic_student_reviews")).rows[0].n, 0);
    const saved = (await db.query("select status,details from diagnostic_group_reviews where id=$1", [group.id])).rows[0];
    assert.equal(saved.status, "draft");
    assert.equal(saved.details.strengths, "");
  } finally { await db.close(); }
});
