import { buildEditableAnnualSchedule, calendarDay } from "./annual-plan-calendar.mjs";

const day = (value) => new Date(`${calendarDay(value)}T00:00:00Z`).getTime();
const iso = (value) => new Date(value).toISOString().slice(0, 10);

export function annualMapWindow(calendar) {
  const year = Number(calendar.school_year);
  return { start: `${year}-03-01`, end: `${year}-12-31` };
}

export function annualMapPercent(value, window) {
  const span = day(window.end) - day(window.start) + 86_400_000;
  return Math.max(0, Math.min(100, ((day(value) - day(window.start)) / span) * 100));
}

export function annualMapWidth(start, end, window) {
  return annualMapPercent(iso(day(end) + 86_400_000), window) - annualMapPercent(start, window);
}

export function annualMapHolidays(days = []) {
  const holidays = days.filter((item) => item.calendar_type === "national_holiday")
    .map((item) => ({ ...item, date: calendarDay(item.date) })).sort((a, b) => a.date.localeCompare(b.date));
  const groups = [];
  for (const holiday of holidays) {
    const previous = groups.at(-1);
    if (previous && day(holiday.date) - day(previous.end) <= 86_400_000) {
      previous.end = holiday.date;
      if (!previous.labels.includes(holiday.reason)) previous.labels.push(holiday.reason);
    } else groups.push({ start: holiday.date, end: holiday.date, labels: [holiday.reason] });
  }
  return groups.map((item) => ({ ...item, label: item.start === item.end
    ? item.labels[0] : `${new Date(`${item.start}T00:00:00Z`).getUTCDate()}–${new Date(`${item.end}T00:00:00Z`).getUTCDate()} ${new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" }).format(new Date(`${item.end}T00:00:00Z`))}` }));
}

export function scheduledAnnualRows(calendar, rows, storedSlots = [], usePlannedDates = false) {
  const slots = storedSlots.length === rows.length ? storedSlots.map((slot) => ({
    starts_on: calendarDay(slot.starts_on), ends_on: calendarDay(slot.ends_on),
    duration_weeks: Number(slot.duration_weeks), index: Number(slot.slot_index), proposal_id: slot.proposal_id,
  })) : usePlannedDates && rows.every((row) => row.planned_start_date && row.planned_end_date)
    ? rows.map((row) => ({ starts_on: calendarDay(row.planned_start_date), ends_on: calendarDay(row.planned_end_date) }))
    : buildEditableAnnualSchedule(calendar, rows).projects;
  const result = rows.map((row, index) => ({ ...row, start: slots[index]?.starts_on,
    end: slots[index]?.ends_on, days: row.planned_instructional_days ?? null }));
  for (let index = 0; index < result.length; index += 1) {
    if (!result[index].start || !result[index].end || (index && result[index].start <= result[index - 1].end))
      throw new Error("Las propuestas se superponen o carecen de fechas. Revisa la organización del año.");
  }
  return result;
}

// V2 already resolved its calendar. Opening the map must never run the legacy scheduler.
export function savedJourneyAnnualRows(proposal) {
  const rows = proposal?.proposed_experiences ?? [];
  if (proposal?.journey_version !== 2 || !rows.length || rows.some((row) =>
    !/^\d{4}-\d{2}-\d{2}$/.test(row.planned_start_date ?? "") ||
    !/^\d{4}-\d{2}-\d{2}$/.test(row.planned_end_date ?? "") ||
    row.planned_start_date > row.planned_end_date))
    throw new Error("Esta versión no tiene fechas guardadas válidas. Puedes consultar las propuestas en la lista.");
  const slots = proposal.resolved_calendar?.projects ?? [];
  for (const row of rows) {
    const slot = slots.find((item) => item.proposal_id === row.proposal_id);
    if (slot && (slot.starts_on !== row.planned_start_date || slot.ends_on !== row.planned_end_date))
      throw new Error("Las fechas de esta versión no coinciden con su calendario guardado. Puedes consultar las propuestas en la lista.");
  }
  return scheduledAnnualRows(null, rows, [], true);
}

export function moveAnnualRow(rows, from, to) {
  if (from < 0 || to < 0 || from >= rows.length || to >= rows.length || from === to) return rows;
  const result = [...rows];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result.map((row, index) => ({ ...row, period: rows[index].period, month: rows[index].month,
    duration_weeks: rows[index].duration_weeks, planned_start_date: undefined,
    planned_end_date: undefined, planned_instructional_days: undefined }));
}

export function insertAvailableAnnualRow(calendar, rows, row) {
  const availablePeriod = Number(String(row.period).match(/^Bimestre ([1-4])$/)?.[1]);
  const restored = { ...row, planned_start_date: undefined, planned_end_date: undefined,
    planned_instructional_days: undefined };
  let lastError;
  for (let index = 0; index <= rows.length; index += 1) {
    const before = Number(String(rows[index - 1]?.period).match(/^Bimestre ([1-4])$/)?.[1] ?? 0);
    const after = Number(String(rows[index]?.period).match(/^Bimestre ([1-4])$/)?.[1] ?? 5);
    if (availablePeriod < before || availablePeriod > after) continue;
    const candidate = [...rows.slice(0, index), restored, ...rows.slice(index)];
    try { buildEditableAnnualSchedule(calendar, candidate); return candidate; }
    catch (error) { lastError = error; }
  }
  throw lastError ?? new Error("No hay un tramo lectivo disponible para esta propuesta.");
}
