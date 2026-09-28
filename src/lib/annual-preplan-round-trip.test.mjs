import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createPilotClassroom } from "./pilot-onboarding-service.mjs";
import { ensureSchoolCalendar } from "./school-calendar-service.mjs";
import { defaultInitialStage, nationalCalendarBlocks2026, buildEditableAnnualSchedule } from "./annual-plan-calendar.mjs";
import { generateAnnualPreplan, validateAnnualPreplan, validateGeneratedPreplan } from "./annual-preplan-service.mjs";
import { persistAnnualProjectSlots } from "./annual-project-slots.mjs";
import { confirmAnnualPlanVersion } from "./annual-plan-version-service.mjs";
import { assertRevision, versionTransaction } from "./version-integrity.mjs";

const teacher = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
async function fixture() {
  const db = await PGlite.create();
  const directory = new URL("../../local-db/migrations/", import.meta.url);
  for (const name of (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort())
    await db.exec(await readFile(new URL(name, directory), "utf8"));
  const { classroomId, schoolYearId } = await createPilotClassroom(db, teacher, { teacherName: "Docente de prueba",
    institutionName: "Jardín de prueba", section: "A", age: 5, year: 2026, startsOn: "2026-03-02", endsOn: "2026-12-31" });
  await ensureSchoolCalendar(db, schoolYearId);
  const context = { id: classroomId, school_year_id: schoolYearId, year: 2026, age: 5,
    calendar: { school_year: 2026, blocks: nationalCalendarBlocks2026(), initial_stage: defaultInitialStage() },
    source_diagnostic_review_id: "confirmed-group", source_priority_review_id: "confirmed-priorities" };
  let output;
  const generated = await generateAnnualPreplan({ context, curriculum: [{ id: "COM_ORAL", name: "Comunicación oral" }],
    loadSkill: async () => "Skill de prueba",
    createProvider: () => ({ generate: async (request) => {
      output = { proposals: request.ai_context_bundle.initial_slots.map((slot) => ({ experience_type: "project",
        title: `Propuesta propia ${slot.index}`, period: slot.period, month: slot.month, duration_weeks: slot.duration_weeks,
        rationale: "Compartir ideas durante el juego.", purpose: "Explicar lo que queremos jugar.", primary_competency_ids: ["COM_ORAL"] })) };
      return { output };
    } }),
  });
  const id = randomUUID();
  const curriculumId = (await db.query(`select id from curriculum_versions where active=true limit 1`)).rows[0].id;
  await versionTransaction(db, `annual:${schoolYearId}`, async (tx) => {
    await tx.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal)
      values($1,$2,$3,$4,1,'draft',$5::jsonb)`, [id, classroomId, schoolYearId, curriculumId, JSON.stringify(generated.proposal)]);
    await persistAnnualProjectSlots(tx, id, buildEditableAnnualSchedule(context.calendar, generated.proposal.proposed_experiences));
  });
  const reload = async () => (await db.query(`select * from annual_plans where id=$1`, [id])).rows[0];
  const confirm = async (revision) => confirmAnnualPlanVersion(db, context, id, revision, async (draft, tx) => {
    const clean = validateAnnualPreplan(draft.proposal, ["COM_ORAL"], 2026);
    await persistAnnualProjectSlots(tx, id, buildEditableAnnualSchedule(context.calendar, clean.proposed_experiences));
  });
  return { db, id, context, generated, output, reload, confirm };
}

test("generar → persistir calendario → recargar → confirmar sin editar conserva el contrato", async () => {
  const f = await fixture();
  try {
    const draft = await f.reload();
    assert.equal(draft.proposal.proposed_experiences[0].planned_start_date, "2026-03-30");
    assert.equal(draft.proposal.proposed_experiences[0].planned_instructional_days, 8);
    assert.deepEqual(validateAnnualPreplan(draft.proposal, ["COM_ORAL"], 2026), f.generated.proposal);
    await f.confirm(Number(draft.revision));
    const active = await f.reload();
    assert.equal(active.status, "active");
    assert.ok(active.preplan_confirmed_at);
    assert.deepEqual(active.proposal, draft.proposal);
    assert.equal((await f.db.query(`select count(*)::int as n from project_slots where annual_plan_id=$1`, [f.id])).rows[0].n, 12);
    await assert.rejects(f.db.query(`update annual_plans set proposal='{}'::jsonb where id=$1`, [f.id]), /inmutable/);
  } finally { await f.db.close(); }
});

test("editar la fila recargada → guardar → recargar → confirmar recalcula metadatos no confiables", async () => {
  const f = await fixture();
  try {
    const before = await f.reload();
    const edited = structuredClone(before.proposal);
    edited.proposed_experiences[1].purpose = "Explicar y escuchar propuestas en parejas.";
    Object.assign(edited.proposed_experiences[1], { planned_start_date: "1900-01-01", planned_end_date: "2099-12-31",
      planned_instructional_days: 999, period_label: "Bimestre inventado" });
    const clean = validateAnnualPreplan(edited, ["COM_ORAL"], 2026);
    const schedule = buildEditableAnnualSchedule(f.context.calendar, clean.proposed_experiences);
    await versionTransaction(f.db, `annual:${f.context.school_year_id}`, async (tx) => {
      const current = (await tx.query(`select revision from annual_plans where id=$1 for update`, [f.id])).rows[0];
      assertRevision(current, Number(before.revision));
      await tx.query(`update annual_plans set proposal=$1::jsonb where id=$2`, [JSON.stringify(clean), f.id]);
      await persistAnnualProjectSlots(tx, f.id, schedule);
    });
    const saved = await f.reload();
    assert.equal(saved.proposal.proposed_experiences[1].purpose, edited.proposed_experiences[1].purpose);
    assert.equal(saved.proposal.proposed_experiences[1].planned_start_date, schedule.projects[1].starts_on);
    assert.equal(saved.proposal.proposed_experiences[1].planned_instructional_days, 10);
    assert.equal(saved.proposal.proposed_experiences[1].period_label, "Bimestre 1");
    await assert.rejects(f.confirm(Number(before.revision)), { reason: "version_conflict" });
    await f.confirm(Number(saved.revision));
    assert.equal((await f.reload()).status, "active");
    const invalid = structuredClone(edited);
    invalid.proposed_experiences[0].unexpected_field = true;
    assert.throws(() => validateAnnualPreplan(invalid, ["COM_ORAL"], 2026), { reason: "invalid_row" });
    invalid.proposed_experiences[0] = { ...edited.proposed_experiences[0], primary_competency_ids: ["PS_RELIGION"] };
    assert.throws(() => validateAnnualPreplan(invalid, ["COM_ORAL"], 2026), { reason: "invalid_row" });
    const modelOutput = structuredClone(f.output);
    modelOutput.proposals[0].planned_start_date = "2026-03-30";
    assert.throws(() => validateGeneratedPreplan(modelOutput, ["COM_ORAL"], 2026), { reason: "invalid_row" });
  } finally { await f.db.close(); }
});

test("recalcular slots conserva sus IDs y el ID de propuesta aunque cambien fechas u orden", async () => {
  const f = await fixture();
  try {
    const before = (await f.db.query(`select id,slot_index,proposal_id from project_slots where annual_plan_id=$1 order by slot_index`, [f.id])).rows;
    const draft = await f.reload();
    const edited = structuredClone(draft.proposal);
    [edited.proposed_experiences[0].proposal_id, edited.proposed_experiences[1].proposal_id] =
      [edited.proposed_experiences[1].proposal_id, edited.proposed_experiences[0].proposal_id];
    edited.proposed_experiences[0].title = "Primera propuesta reordenada";
    edited.proposed_experiences[1].title = "Segunda propuesta reordenada";
    const clean = validateAnnualPreplan(edited, ["COM_ORAL"], 2026);
    await versionTransaction(f.db, `annual:${f.context.school_year_id}`, async (tx) => {
      await tx.query(`update annual_plans set proposal=$1::jsonb where id=$2`, [JSON.stringify(clean), f.id]);
      await persistAnnualProjectSlots(tx, f.id, buildEditableAnnualSchedule(f.context.calendar, clean.proposed_experiences));
      await persistAnnualProjectSlots(tx, f.id, buildEditableAnnualSchedule(f.context.calendar, clean.proposed_experiences));
    });
    const after = (await f.db.query(`select id,slot_index,proposal_id from project_slots where annual_plan_id=$1 order by slot_index`, [f.id])).rows;
    assert.deepEqual(after.map((item) => item.id), before.map((item) => item.id));
    assert.equal(after[0].proposal_id, before[1].proposal_id);
    assert.equal(after[1].proposal_id, before[0].proposal_id);
  } finally { await f.db.close(); }
});
