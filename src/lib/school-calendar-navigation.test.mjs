import test from "node:test";
import assert from "node:assert/strict";
import { calendarWeekDays, calendarWeekLabel, navigateCalendarPeriod } from "./school-calendar-navigation.mjs";

for (const [selected, direction, expected, monday, sunday] of [
  ["2026-10-01", 1, "2026-10-08", "2026-10-05", "2026-10-11"],
  ["2026-10-08", -1, "2026-10-01", "2026-09-28", "2026-10-04"],
  ["2026-10-29", 1, "2026-11-05", "2026-11-02", "2026-11-08"],
  ["2026-12-31", 1, "2027-01-07", "2027-01-04", "2027-01-10"],
  ["2027-01-01", -1, "2026-12-25", "2026-12-21", "2026-12-27"],
]) test(`Semana ${selected} ${direction > 0 ? "+7" : "-7"} sincroniza selección, intervalo y mes`, () => {
  const result = navigateCalendarPeriod("week", selected, new Date(`${selected}T00:00:00Z`), direction);
  assert.equal(result.selected, expected);
  const days = calendarWeekDays(result.selected);
  assert.equal(days.length, 7); assert.equal(days[0], monday); assert.equal(days[6], sunday);
  assert.equal(result.cursor.toISOString().slice(0, 7), expected.slice(0, 7));
  assert.match(calendarWeekLabel(result.selected), new RegExp(expected.slice(0, 4)));
});
test("Mes y Año conservan selección y desplazan su período", () => {
  const cursor = new Date("2026-12-01T00:00:00Z");
  assert.equal(navigateCalendarPeriod("month", "2026-12-15", cursor, 1).cursor.toISOString().slice(0, 10), "2027-01-01");
  assert.equal(navigateCalendarPeriod("year", "2026-12-15", cursor, -1).cursor.toISOString().slice(0, 10), "2025-12-01");
  assert.equal(navigateCalendarPeriod("month", "2026-12-15", cursor, 1).selected, "2026-12-15");
});
