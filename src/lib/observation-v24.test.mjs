import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { createObservationV24Classifier, observationV24Enabled } from "./observation-v24-classifier.mjs";
import { correctSpontaneousClassification, applicableDiagnosticCompetencies, loadSpontaneousObservations, loadSpontaneousV24Metrics,
  recordSpontaneousObservation, suggestSpontaneousV24 } from "./diagnostic-sources-v4.mjs";
import { loadDiagnosticAssessmentWorkspace } from "./diagnostic-assessment-v4.mjs";

const teacher = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const otherTeacher = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const decisionEvents = (db, id) => db.query(`select decision_number,classifier_version,
  suggested_competency_v4_ids_snapshot,suggested_primary_competency_id,action,
  selected_competency_v4_ids_snapshot,selected_primary_competency_id
  from diagnostic_spontaneous_observation_decision_events where observation_id=$1 order by decision_number`, [id]);

async function fixture({ beforeMigration = null } = {}) {
  const db = await PGlite.create();
  const migrations = new URL("../../local-db/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql") &&
    (!beforeMigration || name < beforeMigration)).sort())
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  await createPilotClassroom(db, teacher, { teacherName: "Docente", institutionName: "Escuela", section: "V24",
    age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18",
    castellanoL2Applicable: false, religionApplicable: false });
  await importStudentsForTeacher(db, teacher, [{ firstName: "Camila", lastName: "Prueba" }]);
  const studentId = (await db.query(`select s.id from students s join classrooms c on c.id=s.classroom_id
    where c.teacher_id=$1 and c.status='active' and s.status='active' limit 1`, [teacher])).rows[0].id;
  const competencies = beforeMigration ? await applicableDiagnosticCompetencies((await db.query(
    'select c.*,ag.age_years from classrooms c join age_grades ag on ag.id=c.age_grade_id where c.teacher_id=$1',[teacher])).rows[0]) : (await loadSpontaneousObservations(db, teacher)).competencies;
  const save = (observationText, classifierEnabled = true) => recordSpontaneousObservation(db, teacher,
    { studentId, contextLabel: "Juego", observationText, classifierEnabled });
  return { db, save, competencies };
}

test("V2.4 envía exactamente el RAW aunque contenga nombres, mayúsculas o identificadores", async () => {
  const { db, save, competencies } = await fixture();
  try {
    const texts = [
      "Estaba repartiendo una galleta a cada muñeco.",
      "Tomó un cuento conocido y contó la historia.",
      "Camila y Mariana contaron dos vasos.",
      "Contó dos vasos. Contacto: profe@escuela.pe",
      "Vive en calle Lima 123. Dibujó una casa.",
      "Mi teléfono es 999 123 456. Dibujó una casa.",
      "  Contó tres fichas.\nDespués las repartió.  ",
    ];
    const received = [];
    for (const text of texts) {
      const note = await save(text);
      await suggestSpontaneousV24(db, teacher, note.id, { classify: async ({ observation }) => {
        received.push(observation);
        return { status: "review", primary: competencies[0].id, additional: [], latency_ms: 1 };
      } });
      const row = (await db.query(`select observation_text,classifier_status,competency_v4_ids
        from diagnostic_spontaneous_observations where id=$1`, [note.id])).rows[0];
      assert.equal(row.observation_text, text);
      assert.equal(row.classifier_status, "suggested");
      assert.deepEqual(row.competency_v4_ids, []);
    }
    assert.deepEqual(received, texts);
  } finally { await db.close(); }
});

test("migración retira estados históricos de bloqueo sin perder RAW ni decisiones docentes", async () => {
  const migration = "0068_v24_raw_without_privacy_filter.sql";
  const { db, save, competencies } = await fixture({ beforeMigration: migration });
  try {
    const pendingText = "Estaba repartiendo una galleta a cada muñeco.";
    const reviewedText = "Tomó un cuento conocido y contó la historia.";
    const pending = await save(pendingText);
    const reviewed = await save(reviewedText);
    await db.query(`update diagnostic_spontaneous_observations
      set classifier_status='privacy_blocked',classification_status='needs_review',
        classification_reason='privacy_blocked' where id=any($1::uuid[])`, [[pending.id,reviewed.id]]);
    await correctSpontaneousClassification(db,teacher,reviewed.id,[competencies[0].id]);
    const decisionBefore = (await decisionEvents(db,reviewed.id)).rows;
    await db.exec(await readFile(new URL(migration,new URL("../../local-db/migrations/",import.meta.url)),"utf8"));
    const rows = (await db.query(`select id,observation_text,classifier_status,classification_status,
      teacher_action,competency_v4_ids from diagnostic_spontaneous_observations where id=any($1::uuid[])`,
    [[pending.id,reviewed.id]])).rows;
    const pendingAfter = rows.find((row) => row.id === pending.id);
    const reviewedAfter = rows.find((row) => row.id === reviewed.id);
    assert.equal(pendingAfter.observation_text,pendingText);
    assert.equal(pendingAfter.classifier_status,"pending");
    assert.equal(pendingAfter.classification_status,"pending");
    assert.equal(reviewedAfter.observation_text,reviewedText);
    assert.equal(reviewedAfter.classifier_status,"disabled");
    assert.deepEqual(reviewedAfter.competency_v4_ids,[competencies[0].id]);
    assert.deepEqual((await decisionEvents(db,reviewed.id)).rows,decisionBefore);
    await assert.rejects(db.query(`update diagnostic_spontaneous_observations
      set classifier_status='privacy_blocked' where id=$1`, [pending.id]));
  } finally { await db.close(); }
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
    assert.deepEqual((await decisionEvents(db,first.id)).rows.map((event) => ({ action: event.action,
      suggested: event.suggested_primary_competency_id,selected: event.selected_primary_competency_id })),
    [{ action: "confirmed",suggested: primary.id,selected: primary.id }]);
    const second = await save("Contó vasos con mamá.");
    await suggestSpontaneousV24(db, teacher, second.id, classifier);
    await correctSpontaneousClassification(db, teacher, second.id, [alternative.id]);
    assert.equal((await decisionEvents(db,second.id)).rows[0].action, "changed");
    assert.deepEqual((await decisionEvents(db,second.id)).rows[0].selected_competency_v4_ids_snapshot,[alternative.id]);
    const third = await save("Contó vasos con mamá.");
    await suggestSpontaneousV24(db, teacher, third.id, classifier);
    await correctSpontaneousClassification(db, teacher, third.id, []);
    assert.equal((await decisionEvents(db,third.id)).rows[0].action, "rejected");
    assert.deepEqual((await decisionEvents(db,third.id)).rows[0].suggested_competency_v4_ids_snapshot,[primary.id,alternative.id]);
    const fourth = await save("Contó vasos con mamá.");
    await suggestSpontaneousV24(db, teacher, fourth.id, { classify: async () =>
      ({ status: "unclassified", primary: null, additional: [], latency_ms: 260 }) });
    await correctSpontaneousClassification(db, teacher, fourth.id, []);
    assert.equal((await decisionEvents(db,fourth.id)).rows[0].action, "saved_without_competency");
    const fifth = await save("Contó vasos con mamá.");
    await suggestSpontaneousV24(db, teacher, fifth.id, classifier);
    await save("Contó vasos con mamá."); // classifier pending, not a model error
    const metrics = await loadSpontaneousV24Metrics(db, teacher);
    assert.equal(metrics.classifier.attempted, 5);
    assert.equal(metrics.classifier.attempt_calls, 5);
    assert.equal(metrics.classifier.suggested, 4);
    assert.equal(metrics.classifier.abstained, 1);
    assert.equal(metrics.classifier.pending_classifier, 1);
    assert.equal(metrics.review.suggestions_reviewed, 3);
    assert.equal(metrics.review.suggestions_pending_review, 1);
    assert.equal(metrics.review.direct_confirmations, 1);
    assert.equal(metrics.review.changed, 1);
    assert.equal(metrics.review.rejected, 1);
    assert.equal(metrics.review.saved_without_competency, 1);
    assert.equal(metrics.review.decision_events_recorded, 4);
    assert.equal(metrics.rates.direct_confirmation_rate_reviewed, 1 / 3);
    assert.equal(metrics.rates.review_completion_rate, 3 / 4);
    assert.equal(metrics.rates.changed_rate_reviewed, 1 / 3);
    assert.equal(metrics.rates.rejected_rate_reviewed, 1 / 3);
    assert.equal(metrics.rates.abstention_rate, 1 / 5);
    assert.equal(metrics.rates.direct_confirmation_rate_all_suggestions, 1 / 4);
    assert.equal(metrics.latency_ms.mean, (357 * 4 + 260) / 5);
    assert.equal(metrics.latency_ms.p50, 357);
    assert.equal(metrics.latency_ms.p95, 357);
    assert.equal(metrics.pilot.remaining_to_target, 25);
    assert.equal(metrics.correction_matrix.find((item) => item.suggested_competency === primary.id &&
      item.confirmed_competency === primary.id)?.count,1);
    assert.equal(metrics.correction_matrix.find((item) => item.suggested_competency === primary.id &&
      item.confirmed_competency === alternative.id)?.count,1);
    assert.ok(!JSON.stringify(metrics).includes("Camila"));
    assert.ok(!JSON.stringify(metrics).includes("mamá"));
    assert.equal((await loadDiagnosticAssessmentWorkspace(db, teacher)).observations.some((item) => item.id === third.id), false);
  } finally { await db.close(); }
});

test("fallo y flag apagado preservan la nota y la elección manual", async () => {
  const { db, save, competencies } = await fixture();
  try {
    const failed = await save("Dibujó una casa.");
    await suggestSpontaneousV24(db, teacher, failed.id, { classify: async () => { throw Object.assign(new Error("offline"), { code: "network" }); } });
    const unfiltered = await save("Dibujó una casa. contacto@ejemplo.pe");
    await suggestSpontaneousV24(db, teacher, unfiltered.id, { classify: async ({ observation }) => {
      assert.equal(observation, "Dibujó una casa. contacto@ejemplo.pe");
      return { status: "review", primary: competencies[0].id, additional: [], latency_ms: 100 };
    } });
    const disabled = await save("Dibujó una casa.", false);
    const malformed = await save("Dibujó una casa.");
    await suggestSpontaneousV24(db, teacher, malformed.id, { classify: async () =>
      ({ status: "unclassified", primary: null, additional: [competencies[0].id], latency_ms: 10 }) });
    const recovered = await save("Dibujó una casa.");
    await suggestSpontaneousV24(db,teacher,recovered.id,{ classify: async () => { throw new Error("temporary failure"); } });
    await suggestSpontaneousV24(db,teacher,recovered.id,{ classify: async () =>
      ({ status: "review", primary: competencies[0].id, additional: [], latency_ms: 200 }) },{ allowRetry: true });
    const rows = (await loadSpontaneousObservations(db, teacher)).observations;
    assert.equal(rows.find((item) => item.id === failed.id).classifier_status, "failed");
    assert.equal(rows.find((item) => item.id === unfiltered.id).classifier_status, "suggested");
    assert.equal(rows.find((item) => item.id === disabled.id).classifier_status, "disabled");
    assert.equal(rows.find((item) => item.id === malformed.id).classifier_status, "failed");
    assert.equal(rows.find((item) => item.id === recovered.id).classifier_status, "suggested");
    assert.deepEqual(rows.find((item) => item.id === malformed.id).suggested_competency_v4_ids, []);
    assert.equal(rows.find((item) => item.id === disabled.id).observation_text, "Dibujó una casa.");
    await correctSpontaneousClassification(db, teacher, failed.id, [competencies[0].id]);
    await correctSpontaneousClassification(db, teacher, unfiltered.id, []);
    await correctSpontaneousClassification(db, teacher, disabled.id, [competencies[0].id]);
    assert.equal((await loadSpontaneousObservations(db, teacher)).observations.find((item) => item.id === failed.id).competency_v4_id, competencies[0].id);
    assert.equal((await decisionEvents(db,failed.id)).rows[0].action, "changed");
    assert.equal((await decisionEvents(db,unfiltered.id)).rows[0].action, "rejected");
    assert.equal((await decisionEvents(db,disabled.id)).rows[0].classifier_version, null);
    const metrics = await loadSpontaneousV24Metrics(db,teacher);
    assert.equal(metrics.classifier.attempted,4);
    assert.equal(metrics.classifier.attempt_calls,5);
    assert.equal(metrics.classifier.technical_failed,3);
    assert.equal(metrics.classifier.technical_failure_attempts,3);
    assert.equal(Object.hasOwn(metrics.classifier,"privacy_blocked"),false);
    const legacy = await recordSpontaneousObservation(db,teacher,{ studentId: (await db.query(`select student_id from diagnostic_spontaneous_observations where id=$1`, [failed.id])).rows[0].student_id,
      contextLabel: "Juego", observationText: "Dibujó una casa." });
    assert.equal((await suggestSpontaneousV24(db,teacher,legacy.id,{ classify: async () => {
      throw new Error("historic row must not be classified");
    } })).status,"teacher_preserved");
    assert.equal((await db.query(`select classifier_version,classification_status from diagnostic_spontaneous_observations where id=$1`, [legacy.id])).rows[0].classifier_version,null);
  } finally { await db.close(); }
});

test("cada revisión añade un evento inmutable y la decisión vigente puede cambiar", async () => {
  const { db, save, competencies } = await fixture();
  try {
    const [primary, alternative] = competencies;
    const note = await save("Contó vasos con mamá.");
    await suggestSpontaneousV24(db, teacher, note.id, { classify: async () =>
      ({ status: "review", primary: primary.id, additional: [], latency_ms: 300 }) });
    await correctSpontaneousClassification(db, teacher, note.id, [primary.id]);
    await correctSpontaneousClassification(db, teacher, note.id, [alternative.id]);
    const rows = (await decisionEvents(db,note.id)).rows;
    assert.deepEqual(rows.map((row) => row.decision_number), [1,2]);
    assert.deepEqual(rows.map((row) => row.action), ["confirmed","changed"]);
    assert.deepEqual(rows.map((row) => row.selected_primary_competency_id), [primary.id,alternative.id]);
    assert.ok(rows.every((row) => row.suggested_primary_competency_id === primary.id));
    assert.equal((await db.query("select teacher_action from diagnostic_spontaneous_observations where id=$1", [note.id])).rows[0].teacher_action, "changed");
    assert.equal((await loadSpontaneousV24Metrics(db,teacher)).review.observations_with_multiple_decisions, 1);
    assert.deepEqual((await loadSpontaneousV24Metrics(db,teacher)).correction_matrix,
      [{ suggested_competency: primary.id, confirmed_competency: alternative.id, count: 1 }]);
    const firstEventId = (await db.query(`select id from diagnostic_spontaneous_observation_decision_events
      where observation_id=$1 and decision_number=1`, [note.id])).rows[0].id;
    await assert.rejects(db.query(`update diagnostic_spontaneous_observation_decision_events set action='changed' where id=$1`, [firstEventId]), /inmutable/);
    await assert.rejects(db.query(`delete from diagnostic_spontaneous_observation_decision_events where id=$1`, [firstEventId]), /inmutable/);
    assert.deepEqual((await decisionEvents(db,note.id)).rows.map((row) => row.action), ["confirmed","changed"]);
  } finally { await db.close(); }
});

test("eventos y métricas se aíslan por aula; historial remoto es solo lectura autenticada", async () => {
  const { db, save, competencies } = await fixture();
  try {
    await createPilotClassroom(db, otherTeacher, { teacherName: "Otra docente", institutionName: "Escuela", section: "OTRA",
      age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18",
      castellanoL2Applicable: false, religionApplicable: false });
    const note = await save("Dibujó una casa.");
    await suggestSpontaneousV24(db,teacher,note.id,{ classify: async () =>
      ({ status: "review", primary: competencies[0].id, additional: [], latency_ms: 100 }) });
    await correctSpontaneousClassification(db,teacher,note.id,[competencies[0].id]);
    assert.equal((await loadSpontaneousV24Metrics(db,otherTeacher)).observations, 0);
    await assert.rejects(correctSpontaneousClassification(db,otherTeacher,note.id,[competencies[0].id]), /no encontrada/);
    await assert.rejects(db.query(`insert into diagnostic_spontaneous_observation_decision_events
      (id,observation_id,classroom_id,actor_id,decision_number,classifier_version,
        suggested_competency_v4_ids_snapshot,suggested_primary_competency_id,action,
        selected_competency_v4_ids_snapshot,selected_primary_competency_id)
      select 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',o.id,o.classroom_id,$2,2,o.classifier_version,
        o.suggested_competency_v4_ids,o.suggested_competency_v4_ids[1],'confirmed',
        o.competency_v4_ids,o.competency_v4_id
      from diagnostic_spontaneous_observations o where o.id=$1`, [note.id,otherTeacher]), /no coincide/);
    assert.equal((await decisionEvents(db,note.id)).rows.length, 1);
    const remote = await readFile(new URL("../../supabase/migrations/202609290002_spontaneous_decision_events.sql", import.meta.url),"utf8");
    assert.match(remote,/enable row level security/u);
    assert.match(remote,/grant select on public\.diagnostic_spontaneous_observation_decision_events to authenticated/u);
    assert.match(remote,/revoke all on public\.diagnostic_spontaneous_observation_decision_events from anon, authenticated/u);
    assert.match(remote,/private\.owns_classroom/u);
  } finally { await db.close(); }
});

test("si no se puede registrar el evento, la confirmación tampoco se guarda", async () => {
  const { db, save, competencies } = await fixture();
  try {
    const note = await save("Dibujó una casa.");
    await suggestSpontaneousV24(db,teacher,note.id,{ classify: async () =>
      ({ status: "review", primary: competencies[0].id, additional: [], latency_ms: 100 }) });
    const sabotaged = { query: (...args) => db.query(...args), transaction: (work) => db.transaction((tx) =>
      work({ ...tx, query: (sql,params) => sql.includes("insert into diagnostic_spontaneous_observation_decision_events")
        ? Promise.reject(new Error("simulated event storage failure")) : tx.query(sql,params) })) };
    await assert.rejects(correctSpontaneousClassification(sabotaged,teacher,note.id,[competencies[0].id]), /simulated event/);
    const row = (await loadSpontaneousObservations(db,teacher)).observations.find((item) => item.id === note.id);
    assert.deepEqual(row.competency_v4_ids,[]);
    assert.equal(row.classification_source,"jev");
    assert.equal((await decisionEvents(db,note.id)).rows.length,0);
  } finally { await db.close(); }
});
