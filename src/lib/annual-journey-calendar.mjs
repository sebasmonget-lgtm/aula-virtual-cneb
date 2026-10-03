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
function solveLegacyAnnualJourneyCalendar(calendar, rows) {
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

export const ANNUAL_SLOT_COUNT = 15;
export const ANNUAL_SLOT_PATTERN = [[2, 2, 3], [2, 2, 2, 3], [2, 2, 2, 3], [2, 2, 2, 3]];

/** Calendar weeks define positions; holidays change instructional dates, never duration. */
export function solveAnnualJourneyCalendar(calendar, rows = Array.from({ length: ANNUAL_SLOT_COUNT }, (_, i) => ({ proposal_id: `slot_${i + 1}` }))) {
  if (rows.length === 12) return solveLegacyAnnualJourneyCalendar(calendar, rows);
  if (rows.length !== ANNUAL_SLOT_COUNT || !Array.isArray(calendar.days)) throw new AnnualCalendarError("invalid", { field: "effective_calendar" });
  const eligible = calendar.days.filter(day => day.is_instructional).map(day => calendarDay(day.date)).sort();
  if (!eligible.length || new Set(eligible).size !== eligible.length) throw new AnnualCalendarError("invalid", { field: "instructional_dates" });
  const blocks = (calendar.blocks ?? []).filter(block => block.type === "instructional").sort((a,b) => calendarDay(a.start_date).localeCompare(calendarDay(b.start_date)));
  if (blocks.length !== 4) throw new AnnualCalendarError("incompatible_constraints", { field: "instructional_blocks", proposals: ANNUAL_SLOT_COUNT });
  const stage = calendar.initial_stage ?? defaultInitialStage();
  if (Number(stage.duration_weeks) !== 2) throw new AnnualCalendarError("stage_does_not_fit", { duration_weeks: stage.duration_weeks });
  const byDate = new Map(calendar.days.map(day => [calendarDay(day.date), day]));
  const weeksByBlock = blocks.map(block => {
    const weeks = [];
    for (let monday = date(block.start_date); monday <= date(block.end_date); monday = new Date(monday.getTime() + 7 * DAY)) {
      const friday = new Date(monday.getTime() + 4 * DAY);
      if (monday.getUTCDay() !== 1 || iso(friday) > calendarDay(block.end_date)) throw new AnnualCalendarError("incompatible_constraints", { field: "whole_calendar_weeks" });
      const dates = [];
      for (let offset=0; offset<5; offset++) {
        const key=iso(new Date(monday.getTime()+offset*DAY)), day=byDate.get(key);
        if (!day) throw new AnnualCalendarError("incompatible_constraints", { field: "missing_calendar_day", date: key, proposals:15 });
        if (day.calendar_type === "management_week" && day.is_instructional) throw new AnnualCalendarError("invalid", { field: "management_instructional", date: key });
        if (day.is_instructional) dates.push(key);
      }
      weeks.push({ starts_on: iso(monday), ends_on: iso(friday), dates });
    }
    return weeks;
  });
  if (weeksByBlock.some(weeks=>weeks.length!==9)) throw new AnnualCalendarError("incompatible_constraints", { proposals: ANNUAL_SLOT_COUNT, available_weeks: weeksByBlock.reduce((n,w)=>n+w.length,0)-2, required_weeks:34 });
  const initialWeeks=weeksByBlock[0].slice(0,2), projects=[];
  for (let period=0;period<4;period++) {
    let cursor=period===0?2:0;
    for (const duration_weeks of ANNUAL_SLOT_PATTERN[period]) {
      const weeks=weeksByBlock[period].slice(cursor,cursor+duration_weeks), index=projects.length;
      projects.push({ index:index+1, slot_id:`tramo_${index+1}`, proposal_id:rows[index]?.proposal_id ?? null,
        calendar_block_id:blocks[period].id ?? null, period:`Bimestre ${period+1}`, duration_weeks,
        starts_on:weeks[0].starts_on, ends_on:weeks.at(-1).ends_on, instructional_dates:weeks.flatMap(w=>w.dates) });
      cursor+=duration_weeks;
    }
  }
  const initial_stage={...stage,starts_on:initialWeeks[0].starts_on,ends_on:initialWeeks.at(-1).ends_on,instructional_dates:initialWeeks.flatMap(w=>w.dates)};
  const assignments=[...initial_stage.instructional_dates.map(day=>({date:day,owner:"initial_stage"})),...projects.flatMap(slot=>slot.instructional_dates.map(day=>({date:day,owner:slot.proposal_id ?? slot.slot_id})))];
  if (assignments.length!==eligible.length || new Set(assignments.map(a=>a.date)).size!==eligible.length || eligible.some(day=>!assignments.some(a=>a.date===day)))
    throw new AnnualCalendarError("incompatible_constraints",{field:"assignment_integrity"});
  return {version:3,calendar_version:calendar.version ?? calendar.effective_version,calendar_fingerprint:effectiveCalendarFingerprint(calendar),
    initial_stage,projects,assignments,integrity:{eligible:eligible.length,assigned:assignments.length,gaps:0,overlaps:0}};
}
