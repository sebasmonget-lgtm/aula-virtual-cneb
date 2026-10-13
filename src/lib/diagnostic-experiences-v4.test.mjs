import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { buildStudentPedagogicalContext } from "./student-context-service.mjs";
import { diagnosticProgressForTeacher } from "./diagnostic-review-service.mjs";
import { loadDiagnosticAssessmentWorkspace } from "./diagnostic-assessment-v4.mjs";
import {
  buildDiagnosticExperienceCatalog, loadDiagnosticExperienceWorkspace,
  recordDiagnosticExperienceObservation, summarizeDiagnosticExperience, reviseGuidedObservation,
} from "./diagnostic-experiences-v4.mjs";

const teacher = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherTeacher = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("guardado guiado idempotente conserva foto privada, criterio y hechos sin evaluación",async()=>{
  const db=await database();
  try{
    await createPilotClassroom(db,teacher,{teacherName:"Docente",institutionName:"Escuela",section:"A",age:5,year:2026,startsOn:"2026-03-01",endsOn:"2026-12-18",castellanoL2Applicable:false,religionApplicable:false});
    await importStudentsForTeacher(db,teacher,[{firstName:"Ana",lastName:"Prueba"}]);
    const workspace=await loadDiagnosticExperienceWorkspace(db,teacher),experience=workspace.experiences[0],studentId=workspace.students[0].id;
    const input={studentId,experienceId:experience.id,aspectId:experience.aspects[0].id,observationStatus:"observed_without_judgment",observationText:"Eligió bloques y dijo que haría una casa.",clientRequestId:"cccccccc-cccc-4ccc-8ccc-cccccccccccc",mediaPath:`student-evidence/${teacher}/${studentId}/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg`,mediaMimeType:"image/jpeg",mediaSha256:"a".repeat(64)};
    const first=await recordDiagnosticExperienceObservation(db,teacher,input),retry=await recordDiagnosticExperienceObservation(db,teacher,input);
    assert.equal(first.id,retry.id);assert.equal(retry.replayed,true);assert.equal(first.competencyId,experience.aspects[0].competency_id);assert.equal(first.observation.observation_status,"observed_without_judgment");
    assert.equal((await loadDiagnosticExperienceWorkspace(db,teacher)).experience_observations.length,1);assert.equal(first.observation.has_media,true);assert.equal(first.observation.media_path,undefined);
    const history=await loadDiagnosticAssessmentWorkspace(db,teacher);
    assert.equal(history.observations.find(row=>row.id===first.id).has_media,true);
    assert.equal(history.observations.find(row=>row.id===first.id).media_path,undefined);
    const revised=await reviseGuidedObservation(db,teacher,first.id,{expectedText:input.observationText,observationText:'Eligió bloques y explicó cómo haría una casa con dos puertas.'});
    assert.equal(revised.id,first.id);
    const corrected=(await db.query('select observation_text,media_path,competency_v4_id from diagnostic_experience_observations where id=$1',[first.id])).rows[0];
    assert.equal(corrected.media_path,input.mediaPath);assert.equal(corrected.competency_v4_id,first.competencyId);
    const audit=(await db.query("select preferences->'guided_observation_revisions' as audit from profiles where user_id=$1",[teacher])).rows[0].audit;
    assert.equal(audit[first.id][0].previous_text,input.observationText);
    assert.equal((await reviseGuidedObservation(db,teacher,first.id,{expectedText:input.observationText,observationText:corrected.observation_text})).replayed,true);
    await assert.rejects(reviseGuidedObservation(db,otherTeacher,first.id,{expectedText:corrected.observation_text,observationText:'Otro texto.'}));
    await assert.rejects(reviseGuidedObservation(db,teacher,first.id,{expectedText:input.observationText,observationText:'Texto diferente.'}),{reason:'conflict'});
    await assert.rejects(db.query('update diagnostic_experience_observations set media_sha256=null where id=$1',[first.id]), /diagnostic_guided_photo_check/);
    await assert.rejects(recordDiagnosticExperienceObservation(db,teacher,{...input,mediaSha256:"b".repeat(64)}),{reason:"request_conflict"});
    await assert.rejects(recordDiagnosticExperienceObservation(db,teacher,{...input,observationText:"Texto distinto"}),{reason:"request_conflict"});
    await recordDiagnosticExperienceObservation(db,teacher,{...input,clientRequestId:"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"});
    assert.equal((await loadDiagnosticExperienceWorkspace(db,teacher)).experience_observations.length,2);
    assert.equal((await db.query('select count(*)::int as n from evidences')).rows[0].n,0);
  }finally{await db.close();}
});

async function database() {
  const db = await PGlite.create();
  const migrations = new URL("../../local-db/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  }
  return db;
}

test("guías por edad usan tarjetas v4 y solo muestran competencias especiales aplicables", async () => {
  const kb = await loadKnowledgeBaseV4();
  for (const age of [3, 4, 5]) {
    const experiences = buildDiagnosticExperienceCatalog(kb, { age });
    assert.equal(experiences.length, 5);
    assert.equal(experiences[0].catalog_version, "diagnostic-v4.4");
    assert.match(experiences[0].teacher_instructions, /Prepara dos o tres opciones sencillas/);
    assert.ok(experiences.every((item) => item.aspects.length >= 2 && item.aspects.length <= 4));
    if (age === 3) assert.equal(experiences.find((item) => item.id === "stories_and_marks").aspects.length, 2);
    for (const experience of experiences) for (const aspect of experience.aspects) {
      const card = kb.competencyCards.find((item) => item.id === aspect.competency_id);
      assert.equal(aspect.competency_name, card.official_name);
      assert.ok(card.ages[String(age)].observable_patterns.includes(aspect.age_reference));
      assert.ok(aspect.label.length <= 100 && aspect.prompt.length <= 120);
      assert.ok(aspect.examples.length >= 2 && aspect.examples.length <= 3);
      assert.doesNotMatch(aspect.prompt, /^\s*¿/);
    }
    assert.ok(experiences.every((item) => !item.aspects.some((aspect) => ["CAST_L2_ORAL", "PS_RELIGION"].includes(aspect.competency_id))));
  }
  const special = buildDiagnosticExperienceCatalog(kb, { age: 5, castellanoL2Applicable: true, religionApplicable: true });
  assert.ok(special.some((item) => item.id === "spanish_second_language"));
  assert.ok(special.some((item) => item.id === "beliefs_and_care"));
  assert.ok(!buildDiagnosticExperienceCatalog(kb, { age: 4, castellanoL2Applicable: true }).some((item) => item.id === "spanish_second_language"));
});

test("la cobertura cuenta niños distintos y separa registros de información observada", async () => {
  const experience = buildDiagnosticExperienceCatalog(await loadKnowledgeBaseV4(), { age: 5 })[0];
  const students = [{ id: "one" }, { id: "two" }, { id: "three" }];
  const observations = [
    { student_id: "one", experience_id: experience.id, competency_v4_id: experience.aspects[0].competency_id, observation_status: "demonstrated" },
    { student_id: "one", experience_id: experience.id, competency_v4_id: experience.aspects[1].competency_id, observation_status: "with_support" },
    { student_id: "two", experience_id: experience.id, competency_v4_id: experience.aspects[0].competency_id, observation_status: "insufficient_information" },
  ];
  const summary = summarizeDiagnosticExperience(students, observations, experience);
  assert.equal(summary.students_with_records, 2);
  assert.equal(summary.students_with_information, 1);
  assert.equal(summary.competency_coverage.find((item) => item.competency_id === experience.aspects[0].competency_id).students_with_information, 1);
});

test("la docente ve a todos, registra varias veces al mismo niño y continúa otro día", async () => {
  const db = await database();
  try {
    await createPilotClassroom(db, teacher, { teacherName: "Docente", institutionName: "Escuela", section: "A", age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18", castellanoL2Applicable: false, religionApplicable: false });
    await importStudentsForTeacher(db, teacher, [
      { firstName: "Ana", lastName: "Prueba" }, { firstName: "Bruno", lastName: "Prueba" }, { firstName: "Celia", lastName: "Prueba" },
    ]);
    const initial = await loadDiagnosticExperienceWorkspace(db, teacher);
    assert.deepEqual(initial.students.map((student) => student.name), ["Ana Prueba", "Bruno Prueba", "Celia Prueba"]);
    assert.equal(initial.students.length, 3);
    assert.equal(initial.experience_observations.length, 0);
    const experience = initial.experiences[0];
    const studentId = initial.students[0].id;
    const input = { studentId, experienceId: experience.id, aspectId: experience.aspects[0].id,
      observationStatus: "demonstrated", observationText: "Eligió construir una casa y explicó por qué." };
    const first = await recordDiagnosticExperienceObservation(db, teacher, input);
    await db.query(`update diagnostic_experience_observations set observed_at = now() - interval '1 day' where id = $1`, [first.id]);
    await recordDiagnosticExperienceObservation(db, teacher, { ...input, observationStatus: "with_support", observationText: "Volvió al juego y pidió ayuda." });
    await recordDiagnosticExperienceObservation(db, teacher, { ...input, aspectId: experience.aspects[1].id, observationStatus: "insufficient_information", observationText: "" });
    const reopened = await loadDiagnosticExperienceWorkspace(db, teacher);
    assert.equal(reopened.students.length, 3);
    assert.equal(reopened.experience_observations.length, 3);
    assert.equal(new Set(reopened.experience_observations.map((item) => item.id)).size, 3);
    assert.ok(reopened.experience_observations.every((item) => item.student_id === studentId));
    assert.equal(reopened.experience_coverage[0].students_with_records, 1);
    assert.equal(reopened.experience_coverage[0].students_with_information, 1);
    assert.equal((await diagnosticProgressForTeacher(db, teacher)).observation_count, 3);
    const context = await buildStudentPedagogicalContext(db, studentId);
    assert.equal(context.diagnostic_observations.length, 3);
    assert.ok(context.diagnostic_observations.every((item) => item.competency_v4_id));
  } finally { await db.close(); }
});

test("el servidor rechaza niños ajenos, aspectos inventados y estados inválidos", async () => {
  const db = await database();
  try {
    await createPilotClassroom(db, teacher, { teacherName: "Docente", institutionName: "Escuela", section: "A", age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18", castellanoL2Applicable: false, religionApplicable: false });
    await importStudentsForTeacher(db, teacher, [{ firstName: "Ana", lastName: "Prueba" }]);
    const workspace = await loadDiagnosticExperienceWorkspace(db, teacher);
    const input = { studentId: workspace.students[0].id, experienceId: workspace.experiences[0].id,
      aspectId: workspace.experiences[0].aspects[0].id, observationStatus: "demonstrated" };
    await assert.rejects(recordDiagnosticExperienceObservation(db, otherTeacher, input), { reason: "no_classroom" });
    await assert.rejects(recordDiagnosticExperienceObservation(db, teacher, { ...input, studentId: otherTeacher }), { reason: "invalid_student" });
    await assert.rejects(recordDiagnosticExperienceObservation(db, teacher, { ...input, aspectId: "invented" }), { reason: "invalid_aspect" });
    await assert.rejects(recordDiagnosticExperienceObservation(db, teacher, { ...input, observationStatus: "C" }), { reason: "invalid_status" });
    await assert.rejects(recordDiagnosticExperienceObservation(db, teacher, { ...input, observationText: "x".repeat(4001) }), { reason: "invalid_note" });
    assert.equal((await loadDiagnosticExperienceWorkspace(db, teacher)).experience_observations.length, 0);
  } finally { await db.close(); }
});

test("UI selecciona dentro del modal, sin lista inferior; RLS remota exige escritura por servidor", async () => {
  const [ui, server, sql, hardening] = await Promise.all([
    readFile(new URL("../features/dashboard/components/guided-diagnostic-v4.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../supabase/migrations/202609220025_diagnostic_experience_observations.sql", import.meta.url), "utf8"),
    readFile(new URL("../../supabase/migrations/202609230003_diagnostic_server_authority.sql", import.meta.url), "utf8"),
  ]);
  assert.match(ui, /GuidedObservationDialog/);
  assert.doesNotMatch(ui, /scrollIntoView|Elige a un niño y anota lo que viste|Observados hoy/);
  assert.match(ui, /Relación curricular/);
  assert.match(server, /recordDiagnosticExperienceObservation/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /for select to authenticated/);
  assert.match(sql, /for insert to authenticated/);
  assert.match(hardening, /drop policy if exists diagnostic_experience_insert_own/);
});
