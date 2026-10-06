import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { saveFamilyInterview, confirmFamilyInterview, validateFamilyInterviewDetails } from "./diagnostic-sources-v4.mjs";
import { getCurrentClassroomContext, publicClassroomContext } from "./classroom-context-service.mjs";
import { buildStudentPedagogicalContext, buildSafeDiagnosticStudentContext } from "./student-context-service.mjs";
import { buildAnnualPlanContext, buildProjectContext, buildActivityContext, CONTEXT_POLICY_V4 } from "./context-policy-v4.mjs";
import { buildAssessmentInput } from "./assessment-v4-service.mjs";
import { buildAnnualPlanGenerationInput } from "./ai-annual-plan-ui-service.mjs";
import { safeAnnualGenerationMetadata } from "./annual-plan-persistence.mjs";

const teacherA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const teacherB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
async function database() {
  const db = await PGlite.create();
  const migrations = new URL("../../local-db/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort())
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  return db;
}
async function classroom(db, teacher, section) {
  await createPilotClassroom(db, teacher, { teacherName: "Docente", institutionName: "Escuela", section,
    age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18",
    castellanoL2Applicable: false, religionApplicable: false });
  await importStudentsForTeacher(db, teacher, ["Ana", "Beto", "Camila", "Diego", "Elena", "Fabian"].map((name) => ({
    firstName: name, lastName: section === "A" ? "Perez" : "Gomez",
  })));
  const row = (await db.query(`select id from classrooms where teacher_id=$1 and status='active'`, [teacher])).rows[0];
  const students = (await db.query(`select id from students where classroom_id=$1 order by first_name`, [row.id])).rows;
  return { id: row.id, students };
}

test("current ClassroomContext agrega solo etiquetas confirmadas del aula autorizada y oculta celdas pequeñas", async () => {
  const db = await database();
  try {
    const a = await classroom(db, teacherA, "A");
    const b = await classroom(db, teacherB, "B");
    await assert.rejects(getCurrentClassroomContext(db, teacherA, b.id), /no pertenece/);
    for (let index = 0; index < 4; index++) {
      await saveFamilyInterview(db, teacherA, a.students[index].id, {
        interests: "Le gustan los animales.", interest_tags: index < 3 ? ["animals", "drawing"] : ["animals", "construction"],
        language_context: "Habla castellano y quechua.", language_tags: index < 3 ? ["es", "qu"] : ["es"],
        primary_language_tag: "es",
        previous_education: "Asistió al jardín.", previous_education_status: "yes", previous_education_type: "kindergarten",
        family_expectations: "EXPECTATIVA_PRIVADA",
      });
      await confirmFamilyInterview(db, teacherA, a.students[index].id);
    }
    await saveFamilyInterview(db, teacherA, a.students[4].id, {
      interests: "Le gusta la música.", interest_tags: ["music", "other"], other_interest_text: "Tocar el cajón",
      language_tags: ["qu", "other"], primary_language_tag: "qu", other_language_text: "Shipibo",
      previous_education_status: "no",
    });
    await confirmFamilyInterview(db, teacherA, a.students[4].id);
    await saveFamilyInterview(db, teacherA, a.students[5].id, { interests: "Le gustan los animales." });
    await confirmFamilyInterview(db, teacherA, a.students[5].id); // legacy-style free text remains unclassified
    await saveFamilyInterview(db, teacherA, a.students[5].id, { interests: "Le gustan los animales.", interest_tags: ["animals"] }); // draft excluded
    const current = await getCurrentClassroomContext(db, teacherA, a.id);
    const publicView = publicClassroomContext(current);
    assert.equal(current.confirmed_interviews, 6);
    assert.deepEqual(publicView.common_interests.map((item) => [item.key, item.count]), [["animals", 4], ["drawing", 3]]);
    assert.deepEqual(publicView.languages.map((item) => [item.key, item.count]), [["es", 4], ["qu", 4]]);
    assert.deepEqual(publicView.primary_languages.map((item) => [item.key, item.count]), [["es", 4]]);
    assert.deepEqual(current.common_interests.find((item) => item.key === "other")?.count, 1);
    assert.deepEqual(current.common_interests.find((item) => item.key === "drawing")?.count, 3);
    assert.deepEqual(publicView.previous_education, { yes: 4 });
    assert.equal(JSON.stringify(publicView).includes("EXPECTATIVA_PRIVADA"), false);
    assert.equal(JSON.stringify(publicView).includes(a.students[0].id), false);
    assert.equal(JSON.stringify(publicView).includes(b.id), false);
    assert.equal(current.provenance.source_refs.length, 6);
    const student = await buildStudentPedagogicalContext(db, a.students[0].id);
    assert.equal(student.family_interview_context.interests, "Le gustan los animales.");
    assert.equal(student.family_interview_context.interest_tags[0], "animals");
    assert.equal(student.family_interview_context.primary_language_tag, "es");
    assert.equal(student.family_interview_context.previous_education_type, "kindergarten");
    assert.equal((await buildStudentPedagogicalContext(db, a.students[4].id)).family_interview_context.other_interest_text, "Tocar el cajón");
    assert.equal((await buildStudentPedagogicalContext(db, a.students[5].id)).family_interview_context.interest_tags, undefined);
    assert.equal(student.source_provenance.find((item) => item.source_type === "family_interview").source_version, 1);
    assert.equal(student.recent_relevant_observations.length, 0);
    assert.equal(student.confirmed_period_assessments.length, 0);
    assert.equal((await db.query(`select count(*)::int as total from evidences`)).rows[0].total, 0);
    assert.equal((await buildSafeDiagnosticStudentContext(db, teacherA, a.students[0].id)).family_context.interests, "Le gustan los animales.");
    assert.equal(await buildSafeDiagnosticStudentContext(db, teacherA, b.students[0].id), null);
    const planning = buildAnnualPlanContext(publicView);
    assert.match(planning.group_context, /animales/);
    assert.equal(JSON.stringify(planning).includes("EXPECTATIVA_PRIVADA"), false);
    assert.match(buildProjectContext(publicView).group_context, /animales/);
    assert.match(buildActivityContext(publicView).group_context, /animales/);
    const assessment = buildAssessmentInput({ age: 5, competencyId: "COM_ORAL", evidenceHistory: [] });
    assert.equal(assessment.classroom_context, undefined);
    assert.equal(JSON.stringify(assessment).includes("EXPECTATIVA_PRIVADA"), false);
    assert.ok(CONTEXT_POLICY_V4.some((item) => item.source === "family_interview" && item.projection === "classroom_tag_aggregate"));
    assert.equal(publicView.diagnostic_review_current, false);
    assert.throws(() => buildAnnualPlanGenerationInput({ classroom: { id: a.id, age: 5,
      calendar: { school_year: 2026, starts_on: "2026-03-16", ends_on: "2026-12-18" }, group_context: "Aula A", context_v4: publicView } }), { reason: "diagnostic_review_required" });
    const historical = structuredClone(safeAnnualGenerationMetadata({ workflow: "annual_plan", context_snapshot: planning.snapshot }));
    await saveFamilyInterview(db, teacherA, a.students[0].id, { interest_tags: ["construction"], interests: "Ahora prefiere construir." });
    await confirmFamilyInterview(db, teacherA, a.students[0].id);
    const updated = publicClassroomContext(await getCurrentClassroomContext(db, teacherA, a.id));
    assert.equal(updated.common_interests[0].count, 3);
    assert.equal(historical.context_snapshot.common_interests[0].count, 4);
    assert.notEqual(updated.source_fingerprint, publicView.source_fingerprint);
  } finally { await db.close(); }
});

test("opciones de la entrevista se capturan al responder, sin clasificar después", async () => {
  const valid = validateFamilyInterviewDetails({ language_context: "Usa castellano e inglés.", language_tags: ["es", "en"],
    primary_language_tag: "es", interests: "Le gusta dibujar.", interest_tags: ["drawing", "other"],
    other_interest_text: "Origami", previous_education_status: "yes", previous_education_type: "nursery",
    previous_education: "Asistió a cuna." });
  assert.equal(valid.structured_options_version, 1);
  assert.deepEqual(valid.language_tags, ["en", "es"]);
  assert.equal(valid.primary_language_tag, "es");
  assert.equal(valid.other_interest_text, "Origami");
  assert.equal(valid.previous_education_type, "nursery");
  assert.deepEqual(validateFamilyInterviewDetails({ language_context: "En casa habla aimara." }), { language_context: "En casa habla aimara." });
  assert.throws(() => validateFamilyInterviewDetails({ language_tags: ["es"], primary_language_tag: "qu" }), /lengua principal/);
  assert.throws(() => validateFamilyInterviewDetails({ other_interest_text: "Origami" }), /Selecciona «Otro»/);
  assert.throws(() => validateFamilyInterviewDetails({ previous_education_status: "no", previous_education_type: "nursery" }), /requiere la respuesta/);
  const ui = await readFile(new URL("../features/dashboard/components/family-interview-v4.tsx", import.meta.url), "utf8");
  assert.match(ui, /Pregunta \{step \+ 1\} de \{questions\.length\}/);
  assert.match(ui, /saveDraft\(true\)/);
  assert.match(ui, /Avance guardado\. Puedes continuar después\./);
  assert.match(ui, /¿Con quién usa/);
  assert.match(ui, /¿Qué otro interés/);
});
