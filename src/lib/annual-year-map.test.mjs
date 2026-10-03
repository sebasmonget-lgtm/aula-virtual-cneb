import test from "node:test";
import assert from "node:assert/strict";
import { annualMapHolidays, annualMapPercent, annualMapWidth, insertAvailableAnnualRow, moveAnnualRow, savedJourneyAnnualRows, scheduledAnnualRows } from "./annual-year-map.mjs";
import { nationalCalendarBlocks2026, nationalSchoolHolidays2026 } from "./annual-plan-calendar.mjs";
import { validateAnnualPreplan } from "./annual-preplan-service.mjs";

const uuid = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const calendar = { school_year: 2026, blocks: nationalCalendarBlocks2026(), initial_stage: { duration_weeks: 2 },
  exceptions: nationalSchoolHolidays2026() };
const months = [3, 4, 4, 5, 6, 6, 8, 9, 9, 10, 11, 11];
const rows = Array.from({ length: 12 }, (_, index) => ({ proposal_id: uuid(index + 1), title: `Proyecto ${index + 1}`,
  experience_type: "project", period: `Bimestre ${Math.floor(index / 3) + 1}`, month: months[index],
  duration_weeks: 2, rationale: "Decisión de la docente.", purpose: "Explorar y participar.", primary_competency_ids: ["CYT_INDAGA"] }));

test("doce propuestas caben en el año sin superposición ni semana de gestión encima", () => {
  const scheduled = scheduledAnnualRows(calendar, rows);
  assert.equal(scheduled.length, 12);
  for (let index = 0; index < scheduled.length; index += 1) {
    const row = scheduled[index];
    assert.ok(row.start < row.end);
    if (index) assert.ok(scheduled[index - 1].end < row.start);
    assert.equal(calendar.blocks.filter((block) => block.type === "management")
      .some((block) => row.start <= block.end_date && row.end >= block.start_date), false);
  }
});

test("mover cambia la propuesta y conserva la ubicación temporal, sin modificar el origen", () => {
  const moved = moveAnnualRow(rows, 0, 1);
  assert.equal(moved[0].proposal_id, rows[1].proposal_id);
  assert.equal(moved[0].month, rows[0].month);
  assert.equal(moved[1].proposal_id, rows[0].proposal_id);
  assert.equal(rows[0].proposal_id, uuid(1));
  assert.equal(scheduledAnnualRows(calendar, moved).length, 12);
});

test("feriados consecutivos se agrupan en marcador compacto y son accesibles por fecha", () => {
  const groups = annualMapHolidays([
    { date: "2026-04-02", calendar_type: "national_holiday", reason: "Jueves Santo" },
    { date: "2026-04-03", calendar_type: "national_holiday", reason: "Viernes Santo" },
    { date: "2026-05-01", calendar_type: "national_holiday", reason: "Día del Trabajo" },
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].labels.length, 2);
  assert.ok(groups[0].label.includes("2–3"));
  const window = { start: "2026-03-01", end: "2026-12-31" };
  assert.ok(annualMapPercent("2026-04-02", window) > 0);
  assert.ok(annualMapWidth("2026-04-02", "2026-04-03", window) < 1);
});

test("retirar conserva propuesta disponible en el contrato y una versión histórica sigue legible", () => {
  const proposal = { plan_format: "annual_preplan_v1", school_year: "2026", proposed_experiences: rows.slice(1),
    available_experiences: [rows[0]] };
  const valid = validateAnnualPreplan(proposal, ["CYT_INDAGA"], 2026);
  assert.equal(valid.proposed_experiences.length, 11);
  assert.equal(valid.available_experiences[0].proposal_id, rows[0].proposal_id);
  const legacy = validateAnnualPreplan({ ...proposal, proposed_experiences: rows, available_experiences: undefined }, ["CYT_INDAGA"], 2026);
  assert.equal("available_experiences" in legacy, false);
});

test("reincorporar usa el tramo libre del bimestre aunque el final del año esté lleno", () => {
  const restored = insertAvailableAnnualRow(calendar, rows.slice(1), rows[0]);
  assert.equal(restored.length, 12);
  assert.equal(restored[0].proposal_id, rows[0].proposal_id);
  assert.equal(scheduledAnnualRows(calendar, restored).length, 12);
});

test("el mapa V2 conserva las fechas resueltas incluso sin calendario para recalcular", () => {
  const proposal = { journey_version: 2, proposed_experiences: rows.slice(0, 2).map((row, i) => ({ ...row,
    planned_start_date: `2026-04-${i ? "20" : "06"}`, planned_end_date: `2026-04-${i ? "30" : "17"}`,
    planned_instructional_days: i ? 9 : 10 })), resolved_calendar: { projects: [
      { proposal_id: uuid(1), starts_on: "2026-04-06", ends_on: "2026-04-17" },
      { proposal_id: uuid(2), starts_on: "2026-04-20", ends_on: "2026-04-30" },
    ] } };
  const original = structuredClone(proposal);
  const mapped = savedJourneyAnnualRows(proposal);
  assert.deepEqual(mapped.map(row => [row.proposal_id, row.start, row.end, row.days]), [
    [uuid(1), "2026-04-06", "2026-04-17", 10], [uuid(2), "2026-04-20", "2026-04-30", 9],
  ]);
  assert.deepEqual(proposal, original);
  const mismatched = structuredClone(proposal);
  mismatched.resolved_calendar.projects[0].starts_on = "2026-04-07";
  assert.throws(() => savedJourneyAnnualRows(mismatched), /no coinciden/);
});

test("el mapa V2 no inventa fechas ausentes, invertidas o superpuestas", () => {
  assert.throws(() => savedJourneyAnnualRows({ journey_version: 2, proposed_experiences: rows }), /fechas guardadas/);
  const dated = rows.slice(0, 2).map(row => ({ ...row, planned_start_date: "2026-04-06", planned_end_date: "2026-04-17" }));
  assert.throws(() => savedJourneyAnnualRows({ journey_version: 2, proposed_experiences: dated }), /superponen/);
  assert.throws(() => savedJourneyAnnualRows({ journey_version: 2, proposed_experiences: [
    { ...dated[0], planned_start_date: "2026-04-18" },
  ] }), /fechas guardadas/);
});
