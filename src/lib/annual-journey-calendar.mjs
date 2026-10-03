import { createHash } from "node:crypto";
import { AnnualCalendarError, calendarDay, defaultInitialStage } from "./annual-plan-calendar.mjs";

const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);
const date = (d) => new Date(`${calendarDay(d)}T00:00:00Z`);
export const effectiveCalendarFingerprint = (calendar) => createHash("sha256").update(JSON.stringify({
  version: calendar.version?.id ?? calendar.effective_version?.id,
  initial_stage: calendar.initial_stage ?? defaultInitialStage(),
  days: calendar.days.map((d) => [calendarDay(d.date), d.is_instructional, d.calendar_type, d.override_id ?? null]),
})).digest("hex");

/** Global dynamic program over all teaching weeks. An impossible boundary never skips days. */
export function solveAnnualJourneyCalendar(calendar, rows = Array.from({ length: 12 }, (_, i) => ({ proposal_id: `slot_${i}` }))) {
  if (rows.length !== 12 || !Array.isArray(calendar.days)) throw new AnnualCalendarError("invalid", { field: "effective_calendar" });
  const eligible = calendar.days.filter((d) => d.is_instructional).map((d) => calendarDay(d.date)).sort();
  if (!eligible.length || new Set(eligible).size !== eligible.length) throw new AnnualCalendarError("invalid", { field: "instructional_dates" });
  const weeks = new Map();
  for (const day of eligible) {
    const d = date(day), weekday = d.getUTCDay();
    if (!weekday || weekday === 6) throw new AnnualCalendarError("invalid", { field: "weekend_instructional", date: day });
    const monday = new Date(d.getTime() - (weekday - 1) * DAY), key = iso(monday);
    const week = weeks.get(key) ?? { starts_on: key, ends_on: iso(new Date(monday.getTime() + 4 * DAY)), dates: [] };
    week.dates.push(day); weeks.set(key, week);
  }
  const ordered = [...weeks.values()];
  const days = new Set(eligible);
  const fits = (start, duration) => {
    const part = ordered.slice(start, start + duration);
    return part.length === duration && days.has(part[0].starts_on) && days.has(part.at(-1).ends_on)
      && part.every((w, i) => !i || date(w.starts_on) - date(part[i - 1].starts_on) === 7 * DAY);
  };
  const stage = calendar.initial_stage ?? defaultInitialStage(), stageWeeks = Number(stage.duration_weeks);
  if (!Number.isInteger(stageWeeks) || stageWeeks < 1 || stageWeeks > 4 || !fits(0, stageWeeks))
    throw new AnnualCalendarError("stage_does_not_fit", { first_date: eligible[0] });
  const memo = new Map();
  const search = (cursor, index) => {
    if (index === 12) return cursor === ordered.length ? { cost: 0, slots: [] } : null;
    const key = `${cursor}:${index}`;
    if (memo.has(key)) return memo.get(key);
    let best = null;
    for (const duration of [2, 3]) {
      if (!fits(cursor, duration)) continue;
      const tail = search(cursor + duration, index + 1);
      if (!tail) continue;
      const selected = ordered.slice(cursor, cursor + duration), row = rows[index];
      const cost = tail.cost + (row.planned_start_date && row.planned_start_date !== selected[0].starts_on ? 100 : 0)
        + Math.abs(selected.flatMap((w) => w.dates).length - (eligible.length - stageWeeks * 5) / 12);
      if (!best || cost < best.cost) best = { cost, slots: [{ index: index + 1, proposal_id: row.proposal_id,
        starts_on: selected[0].starts_on, ends_on: selected.at(-1).ends_on, duration_weeks: duration,
        calendar_block_id: null, period: (calendar.blocks ?? []).filter((b) => b.type === "instructional").findIndex((b) => calendarDay(b.start_date) <= selected[0].starts_on && selected[0].starts_on <= calendarDay(b.end_date)) + 1, instructional_dates: selected.flatMap((w) => w.dates) }, ...tail.slots] };
    }
    memo.set(key, best); return best;
  };
  const result = search(stageWeeks, 0);
  if (!result) throw new AnnualCalendarError("incompatible_constraints", { eligible_days: eligible.length,
    available_weeks: ordered.length - stageWeeks, proposals: 12, duration_weeks: [2, 3], boundaries: "Monday-Friday" });
  result.slots.forEach((slot) => { slot.period = slot.period ? `Bimestre ${slot.period}` : "Año"; });
  const fingerprint = effectiveCalendarFingerprint(calendar);
  const initial_stage = { ...stage, starts_on: ordered[0].starts_on, ends_on: ordered[stageWeeks - 1].ends_on,
    instructional_dates: ordered.slice(0, stageWeeks).flatMap((w) => w.dates) };
  const assignments = [...initial_stage.instructional_dates.map((day) => ({ date: day, owner: "initial_stage" })),
    ...result.slots.flatMap((slot) => slot.instructional_dates.map((day) => ({ date: day, owner: slot.proposal_id })))];
  if (assignments.length !== eligible.length || new Set(assignments.map((x) => x.date)).size !== eligible.length)
    throw new AnnualCalendarError("incompatible_constraints", { field: "assignment_integrity" });
  return { version: 2, calendar_version: calendar.version ?? calendar.effective_version,
    calendar_fingerprint: fingerprint, initial_stage, projects: result.slots, assignments,
    integrity: { eligible: eligible.length, assigned: assignments.length, gaps: 0, overlaps: 0 } };
}
