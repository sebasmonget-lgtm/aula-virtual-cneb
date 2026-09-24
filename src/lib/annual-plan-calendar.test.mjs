import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { AnnualCalendarError, buildFlexibleAnnualSchedule, defaultInitialStage, nationalCalendarBlocks2026,
  suggestAnnualProjectDurations, validateAnnualCalendar } from "./annual-plan-calendar.mjs";

const durations = [2, 2, 2, 2, 2, 3, 2, 2, 3, 2, 2, 3];
const projects = durations.map((duration_weeks) => ({ duration_weeks }));
const calendar = () => ({ school_year: 2026, blocks: nationalCalendarBlocks2026(), initial_stage: defaultInitialStage() });

test("la plantilla nacional 2026 ubica la etapa inicial fuera de P01 y solo doce proyectos lectivos", () => {
  const plan = buildFlexibleAnnualSchedule(calendar(), projects);
  assert.equal(plan.initial_stage.starts_on, "2026-03-16");
  assert.equal(plan.initial_stage.ends_on, "2026-03-27");
  assert.equal(plan.projects.length, 12);
  assert.equal(plan.projects[0].starts_on, "2026-03-30");
  assert.ok(plan.projects.every((slot, index) => slot.index === index + 1 && [2, 3].includes(slot.duration_weeks)));
  assert.ok(plan.projects.every((slot) => new Date(`${slot.starts_on}T00:00:00Z`).getUTCDay() === 1 &&
    new Date(`${slot.ends_on}T00:00:00Z`).getUTCDay() === 5));
  assert.ok(plan.projects.every((slot) => !plan.blocks.some((block) => block.type === "management" &&
    slot.starts_on <= block.end_date && slot.ends_on >= block.start_date)));
  assert.equal(plan.projects.at(-1).ends_on, "2026-12-04");
});

test("feriados y suspensiones bloquean la semana completa sin atravesar gestión", () => {
  const custom = calendar();
  custom.blocks.push({ type: "holiday", label: "Feriado institucional", start_date: "2026-05-25", end_date: "2026-05-25", editable: true, sort_order: 9 });
  const shifted = buildFlexibleAnnualSchedule(custom, projects);
  assert.equal(shifted.projects[3].starts_on, "2026-06-01");
  assert.equal(shifted.projects[3].ends_on, "2026-06-12");
  custom.blocks.push({ type: "institutional", label: "Suspensión", start_date: "2026-06-01", end_date: "2026-06-12", editable: true, sort_order: 10 });
  assert.throws(() => buildFlexibleAnnualSchedule(custom, projects),
    (error) => error instanceof AnnualCalendarError && error.reason === "project_does_not_fit" && error.details.block === 2);
});

test("un feriado de un día conserva la semana lectiva si el proyecto empieza y termina en clases", () => {
  const custom = calendar();
  custom.blocks.push({ type: "holiday", label: "Feriado", start_date: "2026-04-03", end_date: "2026-04-03", editable: true, sort_order: 9 });
  const scheduled = buildFlexibleAnnualSchedule(custom, projects);
  assert.equal(scheduled.projects[0].starts_on, "2026-03-30");
  assert.equal(scheduled.projects[0].ends_on, "2026-04-10");
  custom.blocks[custom.blocks.length - 1].start_date = "2026-04-10";
  custom.blocks[custom.blocks.length - 1].end_date = "2026-04-10";
  const adjusted = suggestAnnualProjectDurations(custom);
  const rescheduled = buildFlexibleAnnualSchedule(custom, adjusted.map((duration_weeks) => ({ duration_weeks })));
  assert.notEqual(rescheduled.projects[0].ends_on, "2026-04-10");
  assert.equal(rescheduled.projects[0].ends_on, "2026-04-17");
});

test("adaptación editable de tres semanas y validación de bloques", () => {
  const custom = calendar();
  custom.initial_stage.duration_weeks = 3;
  const result = buildFlexibleAnnualSchedule(custom, projects);
  assert.equal(result.initial_stage.ends_on, "2026-04-03");
  assert.equal(result.projects[0].starts_on, "2026-04-06");
  assert.throws(() => buildFlexibleAnnualSchedule(custom, projects.map(() => ({ duration_weeks: 10 }))),
    (error) => error instanceof AnnualCalendarError && error.reason === "invalid");
  assert.throws(() => validateAnnualCalendar({ ...custom, blocks: custom.blocks.filter((block) => block.type !== "instructional") }),
    (error) => error instanceof AnnualCalendarError && error.details.field === "instructional_blocks");
});

test("una interrupción reduce la propuesta a dos semanas cuando tres no caben", () => {
  const custom = calendar();
  custom.blocks.push({ type: "institutional", label: "Suspensión semanal", start_date: "2026-05-11", end_date: "2026-05-15", editable: true, sort_order: 9 });
  const suggested = suggestAnnualProjectDurations(custom);
  assert.deepEqual(suggested.slice(0, 3), [2, 2, 2]);
  const scheduled = buildFlexibleAnnualSchedule(custom, suggested.map((duration_weeks) => ({ duration_weeks })));
  assert.equal(scheduled.projects[2].ends_on, "2026-05-08");
  custom.initial_stage.duration_weeks = 3;
  assert.throws(() => suggestAnnualProjectDurations(custom),
    (error) => error instanceof AnnualCalendarError && error.reason === "project_does_not_fit");
});

test("migración local crea cuatro bloques lectivos, gestión, etapa inicial y doce espacios", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`create table school_years(id uuid primary key,year int);
      create table annual_plans(id uuid primary key);
      insert into school_years values ('00000000-0000-4000-8000-000000000001',2026);`);
    await db.exec(await readFile(new URL("../../local-db/migrations/0034_annual_calendar_and_project_slots.sql", import.meta.url), "utf8"));
    const rows = (await db.query("select type,count(*)::int as n from calendar_blocks group by type order by type")).rows;
    assert.deepEqual(rows, [{ type: "instructional", n: 4 }, { type: "management", n: 5 }]);
    assert.equal((await db.query("select duration_weeks from initial_stages")).rows[0].duration_weeks, 2);
    const yearId = "00000000-0000-4000-8000-000000000001";
    const planId = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into annual_plans(id) values($1)", [planId]);
    const seededBlocks = (await db.query("select * from calendar_blocks where school_year_id=$1 order by sort_order", [yearId])).rows;
    const schedule = buildFlexibleAnnualSchedule({ school_year: 2026, blocks: seededBlocks, initial_stage: defaultInitialStage() }, projects);
    for (const slot of schedule.projects) {
      await db.query(`insert into project_slots(id,annual_plan_id,slot_index,calendar_block_id,duration_weeks,starts_on,ends_on)
        values(gen_random_uuid(),$1,$2,$3,$4,$5::date,$6::date)`,
      [planId, slot.index, slot.calendar_block_id, slot.duration_weeks, slot.starts_on, slot.ends_on]);
    }
    assert.equal((await db.query("select count(*)::int as n from project_slots where annual_plan_id=$1", [planId])).rows[0].n, 12);
    await assert.rejects(db.query(`insert into project_slots(id,annual_plan_id,slot_index,duration_weeks,starts_on,ends_on)
      values(gen_random_uuid(),$1,1,2,'2026-03-30','2026-04-10')`, [planId]), /duplicate key/);
    const remote = await readFile(new URL("../../supabase/migrations/202609230007_annual_calendar_and_project_slots.sql", import.meta.url), "utf8");
    for (const name of ["calendar_blocks", "initial_stages", "project_slots"]) {
      assert.match(remote, new RegExp(`create table public\\.${name}`));
      assert.match(remote, new RegExp(`alter table public\\.${name} enable row level security`));
    }
  } finally { await db.close(); }
});
