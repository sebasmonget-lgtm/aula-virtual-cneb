const PROJECT_COUNT = 20;
const DAYS_PER_PROJECT = 10;
const MONTHS = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

/** PGlite returns SQL dates as Date objects; keep their UTC calendar day. */
export const annualCalendarDay = (value) => value instanceof Date ? value.toISOString().slice(0, 10)
  : typeof value === "string" ? value.slice(0, 10) : "";

export class AnnualPlanScheduleError extends Error {
  constructor(reason) {
    super(reason === "calendar_too_short"
      ? "El calendario no alcanza para veinte proyectos de diez días. Revisa las fechas del año escolar."
      : "Las fechas del año escolar no son válidas para organizar el plan anual.");
    this.name = "AnnualPlanScheduleError";
    this.reason = reason;
  }
}

function parseDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const day = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== value ? null : day;
}

const isoDay = (day) => day.toISOString().slice(0, 10);

/** Twenty chronological ten-weekday blocks, with unused weekdays spread across the year. */
export function buildAnnualProjectSchedule(calendar) {
  const year = Number(calendar?.school_year);
  const start = parseDay(annualCalendarDay(calendar?.starts_on));
  const end = parseDay(annualCalendarDay(calendar?.ends_on));
  if (!Number.isInteger(year) || !start || !end || start > end || start.getUTCFullYear() !== year || end.getUTCFullYear() !== year) {
    throw new AnnualPlanScheduleError("calendar_invalid");
  }
  const first = new Date(Math.max(start.getTime(), Date.UTC(year, 2, 1)));
  const last = new Date(Math.min(end.getTime(), Date.UTC(year, 11, 31)));
  const weekdays = [];
  for (let time = first.getTime(); time <= last.getTime(); time += 86_400_000) {
    const day = new Date(time);
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) weekdays.push(day);
  }
  if (weekdays.length < PROJECT_COUNT * DAYS_PER_PROJECT) throw new AnnualPlanScheduleError("calendar_too_short");
  return Array.from({ length: PROJECT_COUNT }, (_, index) => {
    const startIndex = Math.round(index * (weekdays.length - DAYS_PER_PROJECT) / (PROJECT_COUNT - 1));
    const from = weekdays[startIndex];
    return {
      index: index + 1,
      code: `P${String(index + 1).padStart(2, "0")}`,
      starts_on: isoDay(from),
      ends_on: isoDay(weekdays[startIndex + DAYS_PER_PROJECT - 1]),
      duration_days: DAYS_PER_PROJECT,
      month: MONTHS[from.getUTCMonth()],
      period: `Bimestre ${Math.floor(index / 5) + 1}`,
    };
  });
}

export const ANNUAL_PROJECT_COUNT = PROJECT_COUNT;
export const ANNUAL_PROJECT_DAYS = DAYS_PER_PROJECT;
