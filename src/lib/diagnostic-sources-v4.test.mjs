import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { loadDiagnosticCatalog, validateDiagnosticCatalog } from "./diagnostic-catalog-v4.mjs";
import { loadDiagnosticExperienceWorkspace, recordDiagnosticExperienceObservation } from "./diagnostic-experiences-v4.mjs";
import { buildStudentPedagogicalContext, buildSafeDiagnosticStudentContext } from "./student-context-service.mjs";
import { loadDiagnosticAssessmentWorkspace, prepareDiagnosticSynthesis, saveDiagnosticSynthesis, confirmDiagnosticSynthesis,
  prepareDiagnosticGroupReview, saveDiagnosticGroupReview, confirmDiagnosticGroupReview } from "./diagnostic-assessment-v4.mjs";
import { createLocalPrivateInterviewStorage } from "./private-interview-storage.mjs";
import { buildFamilyInterviewPrintHtml } from "./family-interview-print.mjs";
import { familyInterviewCategories, familyInterviewQuestionGroups } from "./family-interview-contract.mjs";
import { createDiagnosticJevAdapter } from "./diagnostic-jev-adapter.mjs";
import { attachFamilyInterview, classifySpontaneousObservation, confirmFamilyInterview,
  correctSpontaneousClassification, familyInterviewAttachmentPath, loadFamilyInterview,
  listFamilyInterviewStatuses, loadSpontaneousObservations, markSpontaneousNeedsReview, recordSpontaneousObservation, recordMatrixDiagnosticObservation, safeFamilyContext, saveFamilyInterview,
  validateClassifierDecision, validateFamilyInterviewDetails } from "./diagnostic-sources-v4.mjs";

const teacher = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
async function database() {
  const db = await PGlite.create();
  const migrations = new URL("../../local-db/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(file, migrations), "utf8"));
  return db;
}
async function setup(db, user, section) {
  await createPilotClassroom(db, user, { teacherName: "Docente", institutionName: "Escuela", section, age: 5, year: 2026,
    startsOn: "2026-03-01", endsOn: "2026-12-18", castellanoL2Applicable: false, religionApplicable: false });
  await importStudentsForTeacher(db, user, [{ firstName: "Camila", lastName: "Prueba" }, { firstName: "Luis", lastName: "Prueba" }]);
  return loadDiagnosticExperienceWorkspace(db, user);
}

test("catálogo JSON versionado valida IDs, edad y mapping v4 sin IA", async () => {
  const kb = await loadKnowledgeBaseV4();
  const catalog = await loadDiagnosticCatalog(kb.competencyCards);
  assert.equal(catalog.status, "development_fixture");
  assert.ok(catalog.experiences.every((item) => item.ages.includes(5)));
  assert.throws(() => validateDiagnosticCatalog({ ...catalog, experiences: [...catalog.experiences, catalog.experiences[0]] }, kb.competencyCards), /inválida/);
  assert.throws(() => validateDiagnosticCatalog({ ...catalog, experiences: [{ ...catalog.experiences[0], aspects: [{ ...catalog.experiences[0].aspects[0], competencyId: "FAKE" }] }] }, kb.competencyCards), /inválido/);
  assert.throws(() => validateDiagnosticCatalog({ ...catalog, experiences: [{ ...catalog.experiences[0], ages: [5, 5] }] }, kb.competencyCards), /inválida/);
  assert.throws(() => validateDiagnosticCatalog({ ...catalog, experiences: [{ ...catalog.experiences[0], aspects: [{ ...catalog.experiences[0].aspects[0], patternIndex: 999 }] }] }, kb.competencyCards), /Referente ausente/);
});

test("adapter Jev es opt-in y solo recibe decisión cerrada sin proveedor real en tests", async () => {
  assert.equal(createDiagnosticJevAdapter(), null);
  let calls = 0;
  const adapter = createDiagnosticJevAdapter({ endpoint: "https://example.invalid/classify", fetchImpl: async (_url, init) => {
    calls++;
    const body = JSON.parse(init.body);
    assert.equal(body.task, "diagnostic_competency_classification");
    assert.deepEqual(body.options, [{ id: "MAT_CANTIDAD", name: "Cantidad" }]);
    assert.equal("studentId" in body, false);
    return { ok: true, json: async () => ({ primary_competency: "MAT_CANTIDAD", confidence: 0.9, optional_secondary_candidate: null, needs_review: false }) };
  } });
  const output = await adapter.classify({ plan: { provider: "typesafe", capability: "decision" }, observation: "Contó vasos.", context: "Lonchera", age: 5, options: [{ id: "MAT_CANTIDAD", name: "Cantidad" }] });
  assert.equal(output.primary_competency, "MAT_CANTIDAD");
  assert.equal(calls, 1);
});

test("runtime mantiene Jev desconectado y prepara Storage privado en Supabase", async () => {
  const server = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(server, /AYNI_JEV_|createDiagnosticJevAdapter|classifySpontaneousObservation/);
  const migration = await readFile(new URL("../../supabase/migrations/202609230004_diagnostic_sources.sql", import.meta.url), "utf8");
  assert.match(migration, /'family-interviews', 'family-interviews', false/);
  assert.match(migration, /family_interview_storage_read_own/);
  assert.doesNotMatch(migration, /family_interview_storage_insert_own/);
});

test("entrevista parcial, reload, confirmación, impresión y adjunto privado sin OCR", async () => {
  const db = await database();
  const temp = await mkdtemp(path.join(tmpdir(), "ayni-interview-"));
  try {
    const a = await setup(db, teacher, "A");
    const b = await setup(db, other, "B");
    const studentId = a.students[0].id;
    assert.equal((await loadFamilyInterview(db, teacher, studentId)).draft, null);
    const first = await saveFamilyInterview(db, teacher, studentId, { interests: "Le gustan los bloques." });
    const loaded = await loadFamilyInterview(db, teacher, studentId);
    assert.equal(loaded.draft.id, first.id);
    const second = await saveFamilyInterview(db, teacher, studentId, { interests: "Le gustan los bloques.", language_context: "Quechua y castellano.", family_expectations: "Dato privado de la familia." });
    assert.equal(second.id, first.id);
    await assert.rejects(db.query(`insert into student_family_interview_attachments
      (id,classroom_id,student_id,interview_id,storage_path,mime_type,created_by)
      values($1,$2,$3,$4,$5,$6,$7)`, [randomUUID(), a.classroom.id, a.students[1].id, first.id,
      `family-interview/${teacher}/${a.students[1].id}/00000000-0000-4000-8000-000000000099.pdf`, "application/pdf", teacher]), /foreign key/i);
    const store = createLocalPrivateInterviewStorage(temp);
    const key = await store.save({ teacherId: teacher, studentId, mimeType: "application/pdf", bytes: Buffer.from("%PDF-1.4\nfixture") });
    const attached = await attachFamilyInterview(db, teacher, studentId, key, "application/pdf");
    assert.equal(attached.has_attachment, true);
    assert.equal(await familyInterviewAttachmentPath(db, teacher, studentId), key);
    assert.equal((await store.read(key, teacher, studentId)).mimeType, "application/pdf");
    const replacement = await store.save({ teacherId: teacher, studentId, mimeType: "image/png", bytes: Buffer.from([137,80,78,71,13,10,26,10,0]) });
    const replaced = await attachFamilyInterview(db, teacher, studentId, replacement, "image/png");
    assert.deepEqual(replaced.replaced_storage_paths, [key]);
    await store.remove(key, teacher, studentId);
    await assert.rejects(store.read(key, teacher, studentId));
    assert.equal(await familyInterviewAttachmentPath(db, teacher, studentId), replacement);
    assert.equal((await db.query(`select count(*)::int as n from student_family_interview_attachments where interview_id=$1`, [first.id])).rows[0].n, 1);
    await assert.rejects(store.save({ teacherId: teacher, studentId, mimeType: "application/pdf", bytes: Buffer.from("not a pdf") }), /formato/);
    await assert.rejects(store.read(key, other, studentId), /no autorizado/);
    await assert.rejects(loadFamilyInterview(db, other, studentId), { reason: "invalid_student" });
    await assert.rejects(loadFamilyInterview(db, teacher, b.students[0].id), { reason: "invalid_student" });
    const confirmed = await confirmFamilyInterview(db, teacher, studentId);
    assert.equal(confirmed.status, "confirmed");
    const later = await store.save({ teacherId: teacher, studentId, mimeType: "image/png", bytes: Buffer.from([137,80,78,71,13,10,26,10,0]) });
    const afterPaper = await attachFamilyInterview(db, teacher, studentId, later, "image/png");
    assert.equal(afterPaper.id, confirmed.id);
    assert.equal(afterPaper.has_attachment, true);
    await assert.rejects(db.query(`update student_family_interviews set details='{}'::jsonb where id=$1`, [confirmed.id]), /inmutable/);
    const safe = safeFamilyContext(confirmed.details);
    assert.equal(safe.language_context, "Quechua y castellano.");
    assert.equal(JSON.stringify(safe).includes("Dato privado"), false);
    const context = await buildStudentPedagogicalContext(db, studentId);
    assert.equal(context.family_interview_context.interests, safe.interests);
    assert.equal(JSON.stringify(context).includes("Dato privado"), false);
    const forAI = await buildSafeDiagnosticStudentContext(db, teacher, studentId);
    assert.equal(forAI.id, "current_student");
    assert.equal(forAI.family_context_source, "antecedente_informado_por_la_familia");
    assert.equal(forAI.family_context.language_context, "Quechua y castellano.");
    assert.equal(JSON.stringify(forAI).includes("Dato privado"), false);
    assert.equal(JSON.stringify(forAI).includes(studentId), false);
    assert.equal(await buildSafeDiagnosticStudentContext(db, other, studentId), null);
    const next = await saveFamilyInterview(db, teacher, studentId, { interests: "Ahora también dibuja." });
    assert.equal(next.version, 2);
    assert.equal((await loadFamilyInterview(db, teacher, studentId)).confirmed.id, confirmed.id);
    const ui = await readFile(new URL("../features/dashboard/components/family-interview-v4.tsx", import.meta.url), "utf8");
    assert.match(ui, /Imprimir para papel/);
    const print = buildFamilyInterviewPrintHtml("Camila <Prueba>", { interests: "Bloques & dibujo" }, familyInterviewQuestionGroups("Camila <Prueba>"), { institution: "Escuela", classroom: "A" });
    assert.match(print, /window\.print/);
    assert.match(print, /Camila &lt;Prueba&gt;/);
    assert.match(print, /Bloques &amp; dibujo/);
    assert.match(print, /Institución: Escuela/);
    assert.match(print, /min-height:60px/);
    assert.doesNotMatch(print, /api\/diagnostics|attachment_path/);
    const profileUI = await readFile(new URL("../features/dashboard/components/students-screen.tsx", import.meta.url), "utf8");
    assert.match(profileUI, /FamilyInformationPanel/);
    assert.doesNotMatch(profileUI, /<FamilyInterviewEditor/);
  } finally { await db.close(); await rm(temp, { recursive: true, force: true }); }
});

test("diez preguntas opcionales por categoría; la familia aporta contexto sin cobertura ni evidencia", async () => {
  const groups = familyInterviewQuestionGroups("Camila");
  assert.deepEqual(groups.map((group) => group.title), ["Su entorno y día a día", "Cómo se siente y relaciona", "Lo que sería útil conocer"]);
  assert.deepEqual(groups.flatMap((group) => group.questions.map((question) => question.key)), familyInterviewCategories);
  assert.equal(groups.flatMap((group) => group.questions).length, 10);
  assert.ok(groups.flatMap((group) => group.questions).every((question) => question.placeholder.startsWith("Por ejemplo:")));
  assert.deepEqual(validateFamilyInterviewDetails({}), {});
  assert.deepEqual(validateFamilyInterviewDetails({ home_languages: "Quechua" }), { language_context: "Quechua" });
  const db = await database();
  try {
    const workspace = await setup(db, teacher, "A");
    const studentId = workspace.students[0].id;
    const before = await loadDiagnosticExperienceWorkspace(db, teacher);
    const draft = await saveFamilyInterview(db, teacher, studentId, {});
    assert.deepEqual((await loadFamilyInterview(db, teacher, studentId)).draft.details, {});
    const confirmed = await confirmFamilyInterview(db, teacher, studentId);
    assert.equal(confirmed.id, draft.id);
    assert.deepEqual((await loadFamilyInterview(db, teacher, studentId)).confirmed.details, {});
    const after = await loadDiagnosticExperienceWorkspace(db, teacher);
    assert.deepEqual(after.experience_coverage, before.experience_coverage);
    assert.equal((await db.query("select count(*)::int as n from evidences")).rows[0].n, 0);
    assert.equal((await db.query("select count(*)::int as n from diagnostic_experience_observations")).rows[0].n, 0);
    const raw = (await db.query("select details from student_family_interviews where id=$1", [draft.id])).rows[0];
    assert.deepEqual(raw.details, {});
  } finally { await db.close(); }
});

test("lista marca respuestas parciales y confirmadas; corregir conserva versiones y aísla el aula", async () => {
  const db = await database();
  try {
    const own = await setup(db, teacher, "A");
    await setup(db, other, "B");
    const first = own.students[0].id;
    const second = own.students[1].id;
    const statuses = async () => Object.fromEntries((await listFamilyInterviewStatuses(db, teacher)).students.map((item) => [item.student_id, item.status]));
    assert.equal((await statuses())[first], "not_started");
    await saveFamilyInterview(db, teacher, first, {});
    assert.equal((await statuses())[first], "not_started");
    const draft = await saveFamilyInterview(db, teacher, first, { interests: "Le gustan los bloques." });
    assert.equal((await statuses())[first], "partial");
    const confirmed = await confirmFamilyInterview(db, teacher, first);
    assert.equal(confirmed.id, draft.id);
    assert.equal((await statuses())[first], "confirmed");
    assert.equal((await statuses())[second], "not_started");
    const correction = await saveFamilyInterview(db, teacher, first, { interests: "Ahora también le gusta dibujar." });
    assert.notEqual(correction.id, confirmed.id);
    assert.equal(correction.version, confirmed.version + 1);
    assert.equal((await statuses())[first], "partial");
    assert.equal((await loadFamilyInterview(db, teacher, first)).confirmed.details.interests, "Le gustan los bloques.");
    await confirmFamilyInterview(db, teacher, first);
    assert.equal((await statuses())[first], "confirmed");
    assert.equal((await db.query("select count(*)::int as n from student_family_interviews where student_id=$1 and status='confirmed'", [first])).rows[0].n, 2);
    const otherStatuses = (await listFamilyInterviewStatuses(db, other)).students;
    assert.equal(otherStatuses.length, 2);
    assert.ok(otherStatuses.every((item) => item.student_id !== first));
    const server = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
    assert.match(server, /\/api\/diagnostics\/family-interview-status/);
    const editor = await readFile(new URL("../features/dashboard/components/family-interview-v4.tsx", import.meta.url), "utf8");
    assert.match(editor, /Corregir entrevista/);
    assert.match(editor, /FamilyInterviewStatusBadge/);
  } finally { await db.close(); }
});

test("observación espontánea guarda primero; Jev mock clasifica, abstiene y respeta corrección docente", async () => {
  const db = await database();
  try {
    const a = await setup(db, teacher, "A");
    const studentId = a.students[0].id;
    const saved = await recordSpontaneousObservation(db, teacher, { studentId, contextLabel: "Lonchera",
      observationText: "Camila contó los vasos y dijo que faltaba uno.", supportStatus: "no" });
    assert.equal(saved.classification_status, "pending");
    assert.equal((await loadSpontaneousObservations(db, teacher)).observations[0].competency_v4_id, null);
    const mock = { classify: async ({ plan, options, observation }) => {
      assert.equal(plan.provider, "typesafe");
      assert.equal(plan.model, null);
      assert.ok(options.some((item) => item.id === "MAT_CANTIDAD"));
      assert.match(observation, /vasos/);
      assert.doesNotMatch(observation, /Camila/);
      return { primary_competency: "MAT_CANTIDAD", confidence: 0.93,
        optional_secondary_candidate: null, needs_review: false };
    } };
    assert.equal((await classifySpontaneousObservation(db, teacher, saved.id, mock)).status, "needs_review");
    await correctSpontaneousClassification(db, teacher, saved.id, "MAT_CANTIDAD");
    const review = await loadDiagnosticAssessmentWorkspace(db, teacher);
    assert.ok(review.observations.some((row) => row.id === saved.id && row.competency_v4_id === "MAT_CANTIDAD"));
    const prepared = await prepareDiagnosticSynthesis(db, teacher, { studentId, competencyId: "MAT_CANTIDAD" });
    assert.equal(prepared.details.summary_text, "");
    assert.ok(review.observations.some((row) => row.id === saved.id && /vasos/.test(row.observation_text)));
    await saveDiagnosticSynthesis(db, teacher, prepared.id, { ...prepared.details,
      summary_text: "Camila contó los vasos y advirtió que faltaba uno durante el juego." });
    const corrected = await correctSpontaneousClassification(db, teacher, saved.id, "COM_ORAL");
    assert.equal(corrected.competency_v4_id, "COM_ORAL");
    assert.equal((await classifySpontaneousObservation(db, teacher, saved.id, mock)).status, "teacher_preserved");
    const after = (await loadSpontaneousObservations(db, teacher)).observations[0];
    assert.equal(after.observation_text, "Camila contó los vasos y dijo que faltaba uno.");
    assert.equal(after.classification_source, "teacher");
    await assert.rejects(db.query(`update diagnostic_spontaneous_observations set observation_text='cambiado' where id=$1`, [saved.id]), /inmutable/);
    await assert.rejects(confirmDiagnosticSynthesis(db, teacher, prepared.id), { reason: "no_observations" });
    const uncertain = await recordSpontaneousObservation(db, teacher, { studentId, contextLabel: "Recreo", observationText: "Se acercó al grupo." });
    const abstain = { classify: async () => ({ primary_competency: null, confidence: 0.2, optional_secondary_candidate: null, needs_review: true }) };
    assert.equal((await classifySpontaneousObservation(db, teacher, uncertain.id, abstain)).status, "needs_review");
    const unavailable = await recordSpontaneousObservation(db, teacher, { studentId, contextLabel: "Juego libre", observationText: "Eligió un libro." });
    await markSpontaneousNeedsReview(db, teacher, unavailable.id);
    assert.equal((await loadSpontaneousObservations(db, teacher)).observations.find((item) => item.id === unavailable.id).classification_status, "needs_review");
    assert.equal((await loadDiagnosticAssessmentWorkspace(db, teacher)).observations.some((row) => row.id === uncertain.id), false);
    assert.throws(() => validateClassifierDecision({ primary_competency: "FAKE", confidence: 0.99, optional_secondary_candidate: null, needs_review: false }, ["MAT_CANTIDAD"]), { reason: "invalid_classification" });
    await assert.rejects(correctSpontaneousClassification(db, teacher, uncertain.id, "PS_RELIGION"), { reason: "invalid_competency" });
    await assert.rejects(recordSpontaneousObservation(db, other, { studentId, contextLabel: "Recreo", observationText: "X" }), { reason: "no_classroom" });
  } finally { await db.close(); }
});

test("una celda del mapa añade una nota docente a la competencia aplicable sin clasificador", async () => {
  const db = await database();
  try {
    const workspace = await setup(db, teacher, "A");
    const studentId = workspace.students[0].id;
    const input = { studentId, competencyId: "MAT_CANTIDAD", contextLabel: "Juego libre",
      observationText: "Contó cuatro vasos y dijo que faltaba uno." };
    const first = await recordMatrixDiagnosticObservation(db, teacher, input);
    assert.equal(first.competency_v4_id, "MAT_CANTIDAD");
    assert.equal(first.observation_text, input.observationText);
    const second = await recordMatrixDiagnosticObservation(db, teacher, { ...input,
      observationText: "Repartió un vaso a cada compañero." });
    assert.notEqual(first.id, second.id);
    const records = (await loadSpontaneousObservations(db, teacher)).observations;
    assert.deepEqual(records.filter((row) => [first.id, second.id].includes(row.id))
      .map((row) => [row.classification_status, row.classification_source, row.competency_v4_id]),
      [["classified", "teacher", "MAT_CANTIDAD"], ["classified", "teacher", "MAT_CANTIDAD"]]);
    const review = await loadDiagnosticAssessmentWorkspace(db, teacher);
    assert.equal(review.observations.filter((row) => row.student_id === studentId && row.competency_v4_id === "MAT_CANTIDAD").length, 2);
    await assert.rejects(db.query(`update diagnostic_spontaneous_observations set observation_text='cambiado' where id=$1`, [first.id]), /inmutable/);
    await assert.rejects(recordMatrixDiagnosticObservation(db, teacher, { ...input, competencyId: "PS_RELIGION" }), { reason: "invalid_competency" });
    await assert.rejects(recordMatrixDiagnosticObservation(db, teacher, { ...input, competencyId: "NO_EXISTE" }), { reason: "invalid_competency" });
    await assert.rejects(recordMatrixDiagnosticObservation(db, teacher, { ...input, studentId: randomUUID() }), { reason: "invalid_student" });
    await assert.rejects(recordMatrixDiagnosticObservation(db, teacher, { ...input, observationText: " " }), { reason: "invalid_observation" });
    await assert.rejects(recordMatrixDiagnosticObservation(db, other, input), { reason: "no_classroom" });
    assert.equal((await loadSpontaneousObservations(db, teacher)).observations.length, 2);
  } finally { await db.close(); }
});

test("observaciones guiadas y espontáneas alimentan una revisión confirmada y vista grupal sin crear evidencia formativa", async () => {
  const db = await database();
  try {
    const workspace = await setup(db, teacher, "A");
    const studentId = workspace.students[0].id;
    const aspect = workspace.experiences[0].aspects[0];
    await recordDiagnosticExperienceObservation(db, teacher, { studentId, experienceId: workspace.experiences[0].id,
      aspectId: aspect.id, observationStatus: "demonstrated", observationText: "Eligió bloques." });
    await recordDiagnosticExperienceObservation(db, teacher, { studentId, experienceId: workspace.experiences[0].id,
      aspectId: aspect.id, observationStatus: "observed_without_judgment", observationText: "Eligió piezas azules." });
    await assert.rejects(recordDiagnosticExperienceObservation(db, teacher, { studentId, experienceId: workspace.experiences[0].id,
      aspectId: aspect.id, observationStatus: "observed_without_judgment" }), { reason: "missing_note" });
    const spontaneous = await recordSpontaneousObservation(db, teacher, { studentId, contextLabel: "Juego libre", observationText: "Explicó su elección." });
    await correctSpontaneousClassification(db, teacher, spontaneous.id, aspect.competency_id);
    const review = await loadDiagnosticAssessmentWorkspace(db, teacher);
    assert.equal(review.observations.filter((row) => row.student_id === studentId && row.competency_v4_id === aspect.competency_id).length, 3);
    assert.equal(review.group_coverage.find((row) => row.competency_id === aspect.competency_id).children_with_observations, 1);
    const draft = await prepareDiagnosticSynthesis(db, teacher, { studentId, competencyId: aspect.competency_id });
    await saveDiagnosticSynthesis(db, teacher, draft.id, { information_status: "information_available", summary_text: "Participó al elegir y explicar.", next_observation: "Seguir observando." });
    await confirmDiagnosticSynthesis(db, teacher, draft.id);
    const group = await prepareDiagnosticGroupReview(db, teacher);
    await saveDiagnosticGroupReview(db, teacher, group.id, { strengths: "Interés por elegir juegos.", needs: "Seguir observando acuerdos.", planning_priorities: "Ofrecer juego compartido." });
    await confirmDiagnosticGroupReview(db, teacher, group.id);
    const context = await buildStudentPedagogicalContext(db, studentId);
    assert.equal(context.confirmed_diagnostic_reviews.length, 1);
    assert.equal(context.confirmed_period_assessments.length, 0);
    const forAI = await buildSafeDiagnosticStudentContext(db, teacher, studentId);
    assert.equal(forAI.observations.length, 3);
    assert.equal(JSON.stringify(forAI).includes(studentId), false);
    assert.equal((await db.query(`select count(*)::int as count from evidences`)).rows[0].count, 0);
  } finally { await db.close(); }
});
