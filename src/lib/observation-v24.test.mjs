import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { sanitizeObservationV24 } from "./observation-v24-privacy.mjs";
import { createObservationV24Classifier, observationV24Enabled } from "./observation-v24-classifier.mjs";
import { correctSpontaneousClassification, loadSpontaneousObservations, loadSpontaneousV24Metrics,
  recordSpontaneousObservation, suggestSpontaneousV24 } from "./diagnostic-sources-v4.mjs";
import { loadDiagnosticAssessmentWorkspace } from "./diagnostic-assessment-v4.mjs";

const teacher = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

async function fixture() {
  const db = await PGlite.create();
  const migrations = new URL("../../local-db/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort())
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  await createPilotClassroom(db, teacher, { teacherName: "Docente", institutionName: "Escuela", section: "V24",
    age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18",
    castellanoL2Applicable: false, religionApplicable: false });
  await importStudentsForTeacher(db, teacher, [{ firstName: "Camila", lastName: "Prueba" }]);
  const studentId = (await db.query(`select s.id from students s join classrooms c on c.id=s.classroom_id
    where c.teacher_id=$1 and c.status='active' and s.status='active' limit 1`, [teacher])).rows[0].id;
  const competencies = (await loadSpontaneousObservations(db, teacher)).competencies;
  const save = (observationText, classifierEnabled = true) => recordSpontaneousObservation(db, teacher,
    { studentId, contextLabel: "Juego", observationText, classifierEnabled });
  return { db, save, competencies };
}

test("privacidad V2.4 conserva verbos, conectores y familia; bloquea identificadores", () => {
  const input = "Agarró una caja. Encontró tres bloques. Con mamá también contó en casa.";
  assert.equal(sanitizeObservationV24(input).text, input);
  assert.equal(sanitizeObservationV24("También explicó cómo jugó con su hermano.").status, "ok");
  assert.equal(sanitizeObservationV24("Camila contó dos vasos.", ["Camila"]).text, "[estudiante] contó dos vasos.");
  assert.equal(sanitizeObservationV24("Mariana contó dos vasos.").status, "blocked");
  assert.equal(sanitizeObservationV24("Contó dos vasos. Contacto: profe@escuela.pe").status, "blocked");
  assert.equal(sanitizeObservationV24("Vive en calle Lima 123. Dibujó una casa.").status, "blocked");
  assert.equal(sanitizeObservationV24("Mi teléfono es 999 123 456. Dibujó una casa.").status, "blocked");
  assert.equal(sanitizeObservationV24("Se llama lucía y contó dos vasos.").text, "[persona] y contó dos vasos.");
});

test("flag explícito y wrapper congelado no requieren Luna", async () => {
  assert.equal(observationV24Enabled({}), false);
  assert.equal(observationV24Enabled({ AYNI_OBSERVATION_CLASSIFIER_V24: "1" }), true);
  const classifier = await createObservationV24Classifier({ apiKey: "test", fetchImpl: async () => { throw new Error("no network"); } });
  assert.equal(typeof classifier.classify, "function");
});

test("sugerencia V2.4 nunca confirma; docente confirma, cambia, rechaza y abstiene", async () => {
  const { db, save, competencies } = await fixture();
  try {
    const [primary, alternative] = competencies;
    const classifier = { classify: async ({ observation }) => {
      assert.match(observation, /mamá/u);
      return { status: "review", primary: primary.id, additional: [alternative.id], latency_ms: 357 };
    } };
    const first = await save("Contó vasos con mamá.");
    await suggestSpontaneousV24(db, teacher, first.id, classifier);
    let row = (await loadSpontaneousObservations(db, teacher)).observations.find((item) => item.id === first.id);
    assert.deepEqual(row.suggested_competency_v4_ids, [primary.id, alternative.id]);
    assert.deepEqual(row.competency_v4_ids, []);
    assert.equal(row.classification_status, "needs_review");
    assert.equal((await loadDiagnosticAssessmentWorkspace(db, teacher)).observations.some((item) => item.id === first.id), false);
    await correctSpontaneousClassification(db, teacher, first.id, [primary.id]);
    assert.equal((await db.query("select teacher_action from diagnostic_spontaneous_observations where id=$1", [first.id])).rows[0].teacher_action, "confirmed");
    const second = await save("Contó vasos con mamá.");
    await suggestSpontaneousV24(db, teacher, second.id, classifier);
    await correctSpontaneousClassification(db, teacher, second.id, [alternative.id]);
    const third = await save("Contó vasos con mamá.");
    await suggestSpontaneousV24(db, teacher, third.id, classifier);
    await correctSpontaneousClassification(db, teacher, third.id, []);
    const fourth = await save("Contó vasos con mamá.");
    await suggestSpontaneousV24(db, teacher, fourth.id, { classify: async () =>
      ({ status: "unclassified", primary: null, additional: [], latency_ms: 260 }) });
    await correctSpontaneousClassification(db, teacher, fourth.id, []);
    const metrics = await loadSpontaneousV24Metrics(db, teacher);
    assert.equal(metrics.teacher_actions.confirmed, 1);
    assert.equal(metrics.teacher_actions.changed, 1);
    assert.equal(metrics.teacher_actions.rejected, 1);
    assert.equal(metrics.teacher_actions.saved_without_competency, 1);
    assert.equal(metrics.classifier_status.abstained, 1);
    assert.equal(metrics.direct_confirmation_rate, 1 / 3);
    assert.equal(metrics.average_latency_ms, (357 * 3 + 260) / 4);
    assert.equal((await loadDiagnosticAssessmentWorkspace(db, teacher)).observations.some((item) => item.id === third.id), false);
  } finally { await db.close(); }
});

test("fallo, privacidad y flag apagado preservan la nota y la elección manual", async () => {
  const { db, save, competencies } = await fixture();
  try {
    const failed = await save("Dibujó una casa.");
    await suggestSpontaneousV24(db, teacher, failed.id, { classify: async () => { throw Object.assign(new Error("offline"), { code: "network" }); } });
    const blocked = await save("Dibujó una casa. contacto@ejemplo.pe");
    await suggestSpontaneousV24(db, teacher, blocked.id, { classify: async () => { throw new Error("must not call provider"); } });
    const disabled = await save("Dibujó una casa.", false);
    const malformed = await save("Dibujó una casa.");
    await suggestSpontaneousV24(db, teacher, malformed.id, { classify: async () =>
      ({ status: "unclassified", primary: null, additional: [competencies[0].id], latency_ms: 10 }) });
    const rows = (await loadSpontaneousObservations(db, teacher)).observations;
    assert.equal(rows.find((item) => item.id === failed.id).classifier_status, "failed");
    assert.equal(rows.find((item) => item.id === blocked.id).classifier_status, "privacy_blocked");
    assert.equal(rows.find((item) => item.id === disabled.id).classifier_status, "disabled");
    assert.equal(rows.find((item) => item.id === malformed.id).classifier_status, "failed");
    assert.deepEqual(rows.find((item) => item.id === malformed.id).suggested_competency_v4_ids, []);
    assert.equal(rows.find((item) => item.id === disabled.id).observation_text, "Dibujó una casa.");
    await correctSpontaneousClassification(db, teacher, failed.id, [competencies[0].id]);
    await correctSpontaneousClassification(db, teacher, blocked.id, []);
    await correctSpontaneousClassification(db, teacher, disabled.id, [competencies[0].id]);
    assert.equal((await loadSpontaneousObservations(db, teacher)).observations.find((item) => item.id === failed.id).competency_v4_id, competencies[0].id);
  } finally { await db.close(); }
});
