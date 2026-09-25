import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom, importStudentsForTeacher } from "./pilot-onboarding-service.mjs";
import { prepareDiagnosticStudentReview, saveDiagnosticStudentReview, confirmDiagnosticStudentReview,
  prepareDiagnosticGroupReview, saveDiagnosticGroupReview, confirmDiagnosticGroupReview } from "./diagnostic-assessment-v4.mjs";
import { prepareDiagnosticPriorities, saveDiagnosticPriorities, confirmDiagnosticPriorities } from "./diagnostic-priority-service.mjs";
import { ageFilteredAnnualCurriculum } from "./annual-preplan-service.mjs";
import { developConfirmedAnnualPlan } from "./annual-formal-service.mjs";
import { copyConfirmedAnnualPlan, confirmAnnualPlanVersion } from "./annual-plan-version-service.mjs";
import { defaultInitialStage, nationalCalendarBlocks2026, buildFlexibleAnnualSchedule,
  suggestAnnualProjectDurations } from "./annual-plan-calendar.mjs";

const teacherA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const teacherB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const calendar = { school_year: 2026, blocks: nationalCalendarBlocks2026(), initial_stage: defaultInitialStage() };

test("Luna desarrolla solo el preplan confirmado de su docente, respetando las doce decisiones", async () => {
  const db = await PGlite.create();
  try {
    const dir = new URL("../../local-db/migrations/", import.meta.url);
    for (const name of (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort())
      await db.exec(await readFile(new URL(name, dir), "utf8"));
    await createPilotClassroom(db, teacherA, { teacherName: "Docente A", institutionName: "Escuela A", section: "A",
      age: 5, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18" });
    await createPilotClassroom(db, teacherB, { teacherName: "Docente B", institutionName: "Escuela B", section: "B",
      age: 4, year: 2026, startsOn: "2026-03-01", endsOn: "2026-12-18" });
    await importStudentsForTeacher(db, teacherA, [{ firstName: "Ana", lastName: "Pérez" }]);
    const student = (await db.query(`select s.id from students s join classrooms c on c.id=s.classroom_id where c.teacher_id=$1`, [teacherA])).rows[0];
    const individual = await prepareDiagnosticStudentReview(db, teacherA, student.id);
    await saveDiagnosticStudentReview(db, teacherA, individual.id, { information_status: "insufficient_information",
      comment_text: "Conviene observarla en nuevas conversaciones." });
    await confirmDiagnosticStudentReview(db, teacherA, individual.id);
    const group = await prepareDiagnosticGroupReview(db, teacherA);
    await saveDiagnosticGroupReview(db, teacherA, group.id, { strengths: "Participan en juegos.", needs: "Ampliar conversaciones.",
      planning_priorities: "Invitar a explicar ideas.", competency_priorities: [] });
    await confirmDiagnosticGroupReview(db, teacherA, group.id);
    const priority = await prepareDiagnosticPriorities(db, teacherA);
    await saveDiagnosticPriorities(db, teacherA, priority.id, { priorities: [{ title: "Conversar en el juego", reason: "Hace falta escuchar más explicaciones.",
      related_competency_ids: ["COM_ORAL"], importance: "higher" }] });
    await confirmDiagnosticPriorities(db, teacherA, priority.id);
    const row = (await db.query(`select c.id as classroom_id,sy.id as school_year_id,cv.id as curriculum_version_id
      from classrooms c join school_years sy on sy.id=c.school_year_id join curriculum_versions cv on cv.active=true
      where c.teacher_id=$1`, [teacherA])).rows[0];
    const dates = buildFlexibleAnnualSchedule(calendar, suggestAnnualProjectDurations(calendar).map((duration_weeks) => ({ duration_weeks }))).projects;
    const proposal = { plan_format: "annual_preplan_v1", title: "Mi año", school_year: "2026",
      proposed_experiences: dates.map((slot) => ({ proposal_id: `10000000-0000-4000-8000-${String(slot.index).padStart(12, "0")}`,
        experience_type: "project", title: `Propuesta pedagógica ${slot.index}`, period: slot.period,
        month: Number(slot.starts_on.slice(5, 7)), duration_weeks: slot.duration_weeks,
        rationale: `Razón ${slot.index}`, purpose: `Propósito ${slot.index}`, primary_competency_ids: ["COM_ORAL"] })) };
    const planId = "10000000-0000-4000-8000-000000000099";
    await db.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,
      document_context,source_diagnostic_review_id,source_priority_review_id)
      values($1,$2,$3,$4,1,'active',$5::jsonb,$6::jsonb,$7,$8)`, [planId,row.classroom_id,row.school_year_id,
      row.curriculum_version_id,JSON.stringify(proposal),JSON.stringify({ calendar }),group.id,priority.id]);
    const context = { id: row.classroom_id, school_year_id: row.school_year_id, age: 5, year: 2026,
      institution_name: "Escuela A", teacher_name: "Docente A", section: "A", calendar: { ...calendar, changed_after_confirmation: true } };
    await assert.rejects(developConfirmedAnnualPlan(db, teacherB, planId, context, {}), /no está disponible/);
    let calls = 0; let request;
    const formal = { organization_criteria: ["Juego", "Escucha", "Exploración", "Revisión"],
      transversal_approaches: ["Convivencia"], teaching_strategies: ["Jugar"], assessment_followup: ["Registrar"],
      family_collaboration: [], inclusive_supports: [],
      project_details: dates.map((slot) => ({ index: slot.index, context_or_trigger: `Situación ${slot.index}`,
        final_product: `Producto ${slot.index}`, materials: ["Papel"], what_to_observe: ["Explica ideas"] })) };
    const result = await developConfirmedAnnualPlan(db, teacherA, planId, context, {
      createProvider: () => ({ generate: async (value) => { calls += 1; request = value; return { output: formal }; } }),
      loadSkill: async () => "Skill de prueba",
    });
    assert.equal(request.execution_plan.model, "gpt-6-luna");
    assert.equal(request.ai_context_bundle.confirmed_group.strengths, "Participan en juegos.");
    assert.equal(request.ai_context_bundle.confirmed_priorities.priorities[0].title, "Conversar en el juego");
    assert.equal(request.ai_context_bundle.curriculum.age, 5);
    assert.equal(request.ai_context_bundle.calendar.changed_after_confirmation, undefined);
    assert.ok(request.ai_context_bundle.template_structure.placeholders.includes("PROYECTO_01_TITULO"));
    assert.deepEqual(result.content.proposed_experiences.map((item) => item.proposal_id), proposal.proposed_experiences.map((item) => item.proposal_id));
    assert.equal((await ageFilteredAnnualCurriculum(context)).every((card) => card.age_reference), true);
    const repeat = await developConfirmedAnnualPlan(db, teacherA, planId, context, {});
    assert.equal(repeat.already_ready, true);
    assert.equal(calls, 1);
    assert.equal((await db.query(`select count(*)::int as n from annual_plan_formal_content where annual_plan_id=$1`, [planId])).rows[0].n, 1);
    const copyContext = { ...context, source_diagnostic_review_id: group.id, source_priority_review_id: priority.id,
      context_v4: { source_fingerprint: "qa-fingerprint" } };
    const next = await copyConfirmedAnnualPlan(db, teacherA, copyContext, planId, { calendar: copyContext.calendar });
    const edited = structuredClone(proposal);
    edited.proposed_experiences[0].title = "Nueva propuesta revisada por la docente";
    await db.query(`update annual_plans set proposal=$1::jsonb where id=$2`, [JSON.stringify(edited), next.id]);
    await confirmAnnualPlanVersion(db, copyContext, next.id, 2);
    const versions = (await db.query(`select id,status,version,proposal from annual_plans where classroom_id=$1 order by version`,
      [row.classroom_id])).rows;
    assert.deepEqual(versions.map((item) => item.status), ["archived", "active"]);
    assert.equal(versions[0].proposal.proposed_experiences[0].title, proposal.proposed_experiences[0].title);
    assert.equal(versions[1].proposal.proposed_experiences[0].title, edited.proposed_experiences[0].title);
    assert.equal((await db.query(`select count(*)::int as n from annual_plan_formal_content where annual_plan_id=$1`, [planId])).rows[0].n, 1);
  } finally { await db.close(); }
});
