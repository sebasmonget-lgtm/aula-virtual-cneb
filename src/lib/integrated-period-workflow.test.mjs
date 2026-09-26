import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom } from "./pilot-onboarding-service.mjs";
import { ANNUAL_PLAN_TEMPLATE_FORMAT } from "./annual-plan-contract.mjs";
import { copyConfirmedAnnualPlan } from "./annual-plan-version-service.mjs";
import { copyConfirmedLearningExperience, confirmLearningExperienceVersion } from "./learning-experience-version-service.mjs";
import { copyConfirmedActivity } from "./activity-version-service.mjs";
import { confirmActivityWithCriterion } from "./activity-confirmation.mjs";
import { copyConfirmedCriterion, confirmCriterionVersion } from "./criterion-version-service.mjs";
import { createPeriodEvaluationRouteHandler } from "../../scripts/period-evaluation-routes.mjs";
import { createFamilyReportRouteHandler } from "../../scripts/family-report-routes.mjs";
import { loadPlanningFeedback } from "./planning-feedback.mjs";
import { listSavedDocuments, loadSavedDocument } from "./document-library-service.mjs";

const teacherA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const teacherB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

async function database() {
  const db = await PGlite.create();
  const migrations = new URL("../../local-db/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort())
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  return db;
}

test("recorrido integrado conserva versiones y aísla aulas, años y documentos", async () => {
  const db = await database();
  try {
    const a = await createPilotClassroom(db, teacherA, { teacherName: "Docente A", institutionName: "Jardín A", section: "A", age: 5, year: 2026,
      startsOn: "2026-03-01", endsOn: "2026-12-18", castellanoL2Applicable: false, religionApplicable: false });
    const b = await createPilotClassroom(db, teacherB, { teacherName: "Docente B", institutionName: "Jardín B", section: "B", age: 4, year: 2027,
      startsOn: "2027-03-01", endsOn: "2027-12-17", castellanoL2Applicable: false, religionApplicable: false });
    const students = [randomUUID(), randomUUID(), randomUUID()];
    for (const [index, classroomId, name] of [[0, a.classroomId, "Ana"], [1, a.classroomId, "Luis"], [2, b.classroomId, "Rosa"]])
      await db.query(`insert into students(id,classroom_id,first_name,last_name,status) values($1,$2,$3,'Prueba','active')`, [students[index], classroomId, name]);
    const diagnosis = randomUUID(), planV1 = randomUUID(), projectV1 = randomUUID(), activityV1 = randomUUID(), criterionV1 = randomUUID();
    await db.query(`insert into diagnostic_group_reviews(id,classroom_id,version,status,details,source_snapshot,created_by,teacher_confirmed_at)
      values($1,$2,1,'confirmed','{}'::jsonb,'[]'::jsonb,$3,now())`, [diagnosis, a.classroomId, teacherA]);
    const curriculum = (await db.query(`select id from curriculum_versions where active=true limit 1`)).rows[0].id;
    const proposals = Array.from({ length: 12 }, (_, index) => ({ title: `Propuesta ${index + 1}`, experience_type: "project", period: `Bimestre ${Math.floor(index / 3) + 1}`, primary_competency_ids: ["COM_ORAL"] }));
    await db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,document_context,teacher_confirmed_at)
      values($1,$2,$3,$4,1,'active',$5::jsonb,'{}'::jsonb,now())`, [planV1, a.classroomId, a.schoolYearId, curriculum, JSON.stringify({ plan_format: ANNUAL_PLAN_TEMPLATE_FORMAT, proposed_experiences: proposals })]);
    for (let index = 1; index <= 12; index++) await db.query(`insert into project_slots(id,annual_plan_id,slot_index,duration_weeks,starts_on,ends_on)
      values($1,$2,$3,2,'2026-03-30','2026-04-10')`, [randomUUID(), planV1, index]);
    const planV2 = await copyConfirmedAnnualPlan(db, teacherA, { id: a.classroomId, school_year_id: a.schoolYearId,
      source_diagnostic_review_id: diagnosis, context_v4: { diagnostic_review_current: true, source_fingerprint: "diagnosis-1" } }, planV1, {});
    await assert.rejects(copyConfirmedAnnualPlan(db, teacherB, { id: a.classroomId, school_year_id: a.schoolYearId,
      source_diagnostic_review_id: diagnosis, context_v4: { diagnostic_review_current: true } }, planV1, {}));
    await db.query(`update annual_plans set status='archived',updated_at=now() where id=$1`, [planV1]);
    await db.query(`update annual_plans set status='active',teacher_confirmed_at=now() where id=$1`, [planV2.id]);
    assert.equal((await db.query(`select count(*)::int as n from project_slots where annual_plan_id=$1`, [planV2.id])).rows[0].n, 12);

    await db.query(`insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,origin,source_proposal_index,teacher_confirmed_at)
      values($1,$2,'project','Conversamos','Dialogar','2026-04-01','2026-04-24','active',$3::jsonb,$4,'planned',0,now())`,
    [projectV1, a.classroomId, JSON.stringify({ starting_point: "El juego", primary_competency_ids: ["COM_ORAL"], activity_route: [] }), planV1]);
    await db.query(`insert into activities(id,experience_id,occurs_on,title,purpose,status,details,teacher_confirmed_at)
      values($1,$2,'2026-04-08','Jugamos y conversamos','Explicar ideas','active',$3::jsonb,now())`,
    [activityV1, projectV1, JSON.stringify({ meaningful_situation: "Elegimos juegos", competency_status: "confirmed", competency_id: "COM_ORAL" })]);
    const criterionDetails = { competency_id: "COM_ORAL", criterion_text: "Explica una idea", expected_evidence: "Explicación", acceptable_evidence_variations: [], observation_focus: ["Ideas"], evidence_scope: "individual", teacher_caution: "Escuchar" };
    await db.query(`insert into activity_criteria(id,activity_id,competency_v4_id,criterion_text,details,status,teacher_confirmed_at)
      values($1,$2,'COM_ORAL',$3,$4::jsonb,'active',now())`, [criterionV1, activityV1, criterionDetails.criterion_text, JSON.stringify(criterionDetails)]);
    async function addEvidence(studentId, note, day = "2026-04-08") {
      const id = randomUUID();
      await db.query(`insert into evidences(id,student_id,activity_id,criterion_id,type,observed_at,observed_on,observation_text,created_by)
        values($1,$2,$3,$4,'observation',$5::timestamptz,$6::date,$7,$8)`, [id, studentId, activityV1, criterionV1, `${day}T12:00:00Z`, day, note, teacherA]);
      return id;
    }
    const oldEvidence = await addEvidence(students[0], "Explicó su juego favorito.");
    await addEvidence(students[0], "Escuchó una idea y respondió.", "2026-04-09");
    await addEvidence(students[1], "Propuso un juego al grupo.");
    await addEvidence(students[1], "Contó cómo se juega.", "2026-04-09");
    const criterionV2 = await copyConfirmedCriterion(db, teacherA, a.classroomId, criterionV1);
    await db.query(`update activity_criteria set criterion_text='Compara propuestas',details=$1::jsonb where id=$2`, [JSON.stringify({ ...criterionDetails, criterion_text: "Compara propuestas" }), criterionV2.id]);
    await confirmCriterionVersion(db, criterionV2.id, activityV1);
    const activityV2 = await copyConfirmedActivity(db, teacherA, a.classroomId, activityV1);
    await confirmActivityWithCriterion(db, activityV2.id, null);
    const projectV2 = await copyConfirmedLearningExperience(db, teacherA, a.classroomId, projectV1);
    await confirmLearningExperienceVersion(db, a.classroomId, projectV2.id);
    const old = (await db.query(`select e.activity_id,e.criterion_id,a.experience_id from evidences e join activities a on a.id=e.activity_id where e.id=$1`, [oldEvidence])).rows[0];
    assert.deepEqual(old, { activity_id: activityV1, criterion_id: criterionV1, experience_id: projectV1 });
    assert.equal((await loadSavedDocument(db, teacherA, "activity", activityV1)).registered_evidence.length, 4);
    assert.equal(await loadSavedDocument(db, teacherB, "activity", activityV1), null);

    const pending = new Map();
    const calls = [];
    const rawA = createPeriodEvaluationRouteHandler({ db, teacherId: teacherA, readJson: async (request) => request.body,
      send: (_response, status, body) => calls.push({ status, body }), pending, metadataForAudit: (value) => value,
      refreshStudentContext: async () => {}, evidenceStorage: { read: async () => ({ data: Buffer.from(""), mimeType: "image/png" }) },
      createProvider: () => ({}), generate: async () => ({ output: { competency_id: "COM_ORAL",
        information_status: "sufficient", conclusion_text: "Explica sus ideas durante el juego y continúa escuchando al grupo.",
        progress_examples: ["Explicó cómo organizar el juego."], support_or_conditions: ["Participación en grupos pequeños."],
        next_steps: ["Conversar en nuevas situaciones."], insufficiency_reason: null,
        caution: "Conclusión revisada por la docente." }, metadata: { model: "mock" } }) });
    const rawB = createPeriodEvaluationRouteHandler({ db, teacherId: teacherB, readJson: async (request) => request.body,
      send: (_response, status, body) => calls.push({ status, body }), pending, metadataForAudit: (value) => value,
      refreshStudentContext: async () => {}, evidenceStorage: { read: async () => ({ data: Buffer.from(""), mimeType: "image/png" }) } });
    async function call(handler, method, path, body) { calls.length = 0; await handler({ request: { method, body }, url: new URL(`http://localhost${path}`), response: {}, origin: null }); return calls[0]; }
    async function confirmConclusion(studentId, periodId) {
      const selection = { classroomId: a.classroomId, periodId, studentId, competencyId: "COM_ORAL" };
      const suggested = await call(rawA, "POST", "/api/period-evaluations/conclusion/suggest", selection);
      assert.equal(suggested.status, 200, JSON.stringify(suggested.body));
      const confirmed = await call(rawA, "POST", "/api/period-evaluations/conclusion/confirm", {
        ...selection, generationId: suggested.body.generation_id, proposal: suggested.body.proposal });
      assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
    }
    const periodsA = await call(rawA, "GET", "/api/period-evaluations/workspace");
    const periodsB = await call(rawB, "GET", "/api/period-evaluations/workspace");
    const period = periodsA.body.periods.find((item) => item.school_year_id === a.schoolYearId && item.ordinal === 1);
    const foreignPeriod = periodsB.body.periods.find((item) => item.school_year_id === b.schoolYearId && item.ordinal === 1);
    assert.ok(period && foreignPeriod);
    const query = `classroomId=${a.classroomId}&periodId=${period.id}`;
    assert.equal((await call(rawB, "GET", `/api/period-evaluations/overview?${query}`)).status, 422);
    assert.equal((await call(rawA, "GET", `/api/period-evaluations/overview?classroomId=${a.classroomId}&periodId=${foreignPeriod.id}`)).status, 422);
    const before = await call(rawA, "GET", `/api/period-evaluations/coverage?${query}`);
    assert.equal(before.status, 200);
    assert.equal(before.body.rows.filter((row) => row.competency_id === "COM_ORAL").length, 2);
    assert.equal(before.body.rows.find((row) => row.student_id === students[0] && row.competency_id === "COM_ORAL").evidence_count, 2);
    assert.equal(before.body.rows.some((row) => row.student_id === students[2]), false);
    for (const studentId of students.slice(0, 2)) {
      const key = `${query}&studentId=${studentId}&competencyId=COM_ORAL`;
      const detail = await call(rawA, "GET", `/api/period-evaluations/detail?${key}`);
      assert.equal(detail.status, 200);
      const body = { classroomId: a.classroomId, periodId: period.id, studentId, competencyId: "COM_ORAL",
        evidenceFingerprint: detail.body.evidence_fingerprint, expectedDraftRevision:detail.body.draft?.revision??null, teacherAnalysis: "En juegos compartidos explicó ideas.",
        conclusionText: "", provisionalLevel: "A", achievementLevel: "A", teacherJustification: "Registros revisados por la docente." };
      const savedDraft=await call(rawA, "POST", "/api/period-evaluations/save-draft", body);
      assert.equal(savedDraft.status, 200, JSON.stringify(savedDraft.body));
      assert.equal((await call(rawA, "POST", "/api/period-evaluations/confirm", {...body,expectedDraftRevision:savedDraft.body.draft_revision})).status, 200);
      await confirmConclusion(studentId, period.id);
    }
    const beforeClose1=await call(rawA,"GET",`/api/period-evaluations/overview?${query}`);
    const close1 = await call(rawA, "POST", "/api/period-evaluations/close", { classroomId: a.classroomId, periodId: period.id,
      expectedCurrentVersionId:beforeClose1.body.closure.current_version_id,expectedSourceFingerprint:beforeClose1.body.closure.source_fingerprint });
    assert.equal(close1.status, 200, JSON.stringify(close1.body));
    assert.equal(close1.body.version, 1);
    const oldClosure = await loadSavedDocument(db, teacherA, "period_closure", close1.body.id);
    assert.equal(oldClosure.content.entries.length, 2);
    await addEvidence(students[0], "Comentó otra forma de organizar el juego.", "2026-04-10");
    const changed = await call(rawA, "GET", `/api/period-evaluations/detail?${query}&studentId=${students[0]}&competencyId=COM_ORAL`);
    assert.equal(changed.body.state, "needs_review");
    const revised = { classroomId: a.classroomId, periodId: period.id, studentId: students[0], competencyId: "COM_ORAL",
      evidenceFingerprint: changed.body.evidence_fingerprint,expectedDraftRevision:changed.body.draft?.revision??null, teacherAnalysis: "En tres juegos explicó ideas.",
      conclusionText: "", provisionalLevel: "A", achievementLevel: "A", teacherJustification: "Tres registros revisados." };
    const savedRevised=await call(rawA, "POST", "/api/period-evaluations/save-draft", revised);
    assert.equal(savedRevised.status, 200,JSON.stringify(savedRevised.body));
    assert.equal((await call(rawA, "POST", "/api/period-evaluations/confirm", {...revised,expectedDraftRevision:savedRevised.body.draft_revision})).status, 200);
    await confirmConclusion(students[0], period.id);
    const beforeClose2=await call(rawA,"GET",`/api/period-evaluations/overview?${query}`);
    const close2 = await call(rawA, "POST", "/api/period-evaluations/close", { classroomId: a.classroomId, periodId: period.id,
      expectedCurrentVersionId:beforeClose2.body.closure.current_version_id,expectedSourceFingerprint:beforeClose2.body.closure.source_fingerprint });
    assert.equal(close2.body.version, 2);
    assert.equal((await loadSavedDocument(db, teacherA, "period_closure", close1.body.id)).content.entries[0].source_evidence_ids.length, 2);
    assert.equal(await loadSavedDocument(db, teacherB, "period_closure", close1.body.id), null);

    const reportProposal = { introduction: "Compartimos avances del período.", sections: [{ competency_id: "COM_ORAL", information_status: "sufficient",
      progress_summary: "Comparte ideas durante el juego.", examples: ["Explicó cómo jugar."], support_or_conditions: ["Escucha del grupo."],
      next_steps: ["Conversar en pequeños grupos."], family_suggestions: ["Conversar sobre sus juegos."], insufficiency_note: null }], closing_note: "Seguiremos acompañando sus avances." };
    const reports = [];
    const reportHandler = createFamilyReportRouteHandler({ db, teacherId: teacherA, annualPlanningContext: async () => ({ id: a.classroomId,
      school_year_id: a.schoolYearId, age: 5, castellano_l2_applicable: false, religion_applicable: false,
      calendar: { starts_on: "2026-03-01", ends_on: "2026-12-18" } }), readJson: async (request) => request.body,
      send: (_response, status, body) => reports.push({ status, body }), pending: new Map(), metadataForAudit: (value) => value,
      createProvider: () => ({}), generate: async () => ({ output: reportProposal, metadata: { model: "mock" } }) });
    async function reportCall(method, path, body) { reports.length = 0; await reportHandler({ request: { method, body }, url: new URL(`http://localhost${path}`), response: {}, origin: null }); return reports[0]; }
    const dates = { classroomId: a.classroomId, studentId: students[0], periodId: period.id,
      periodStart: period.starts_on, periodEnd: period.ends_on, competencyIds: ["COM_ORAL"] };
    const generated = await reportCall("POST", "/api/ai/family-reports/generate", dates);
    assert.equal(generated.status, 200, JSON.stringify(generated.body));
    const saved = await reportCall("POST", "/api/family-reports", { ...dates, proposal: generated.body.proposal, generationId: generated.body.generation_id });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal((await reportCall("POST", `/api/family-reports/${saved.body.id}/confirm?classroomId=${a.classroomId}`)).status, 200);
    assert.equal((await loadSavedDocument(db, teacherA, "family_report", saved.body.id)).evaluation_period_id, period.id);
    assert.equal(await loadSavedDocument(db, teacherB, "family_report", saved.body.id), null);
    const foreignReports = [];
    const foreignReportHandler = createFamilyReportRouteHandler({ db, teacherId: teacherB, annualPlanningContext: async () => null,
      readJson: async (request) => request.body, send: (_response, status, body) => foreignReports.push({ status, body }), pending: new Map(),
      metadataForAudit: (value) => value });
    await foreignReportHandler({ request: { method: "GET" }, url: new URL(`http://localhost/api/family-reports/options?classroomId=${a.classroomId}&studentId=${students[0]}&periodId=${period.id}`), response: {}, origin: null });
    assert.equal(foreignReports[0].status, 422);
    const feedback = await loadPlanningFeedback(db, { teacherId: teacherA, classroomId: a.classroomId, periodId: period.id });
    assert.equal(feedback.confirmed_assessments, 2);
    assert.doesNotMatch(JSON.stringify(feedback), /Ana|Luis|Rosa|Explicó su juego favorito/);
    await assert.rejects(loadPlanningFeedback(db, { teacherId: teacherB, classroomId: a.classroomId, periodId: period.id }), /Aula no disponible/);
    const docsA = await listSavedDocuments(db, teacherA), docsB = await listSavedDocuments(db, teacherB);
    assert.ok(docsA.some((item) => item.id === saved.body.id));
    assert.equal(docsB.some((item) => [planV1, planV2.id, close1.body.id, saved.body.id].includes(item.id)), false);
  } finally { await db.close(); }
});
