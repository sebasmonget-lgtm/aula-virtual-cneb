const DAY_MS = 86_400_000;
export const ANNUAL_PROJECT_COUNT = 12;
export const DEFAULT_ANNUAL_PROJECT_WEEKS = Object.freeze([2, 2, 3, 2, 2, 3, 2, 2, 3, 2, 2, 3]);
const BLOCK_TYPES = new Set(["instructional", "management", "holiday", "institutional", "vacation"]);
export const calendarDay = (value) => value instanceof Date ? value.toISOString().slice(0, 10)
  : typeof value === "string" ? value.slice(0, 10) : "";
const date = (value) => {
  const text = calendarDay(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const result = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== text ? null : result;
};
const iso = (value) => value.toISOString().slice(0, 10);
const after = (value, days) => new Date(value.getTime() + days * DAY_MS);

export class AnnualCalendarError extends Error {
  constructor(reason, details = {}) {
    const messages = {
      invalid: "Revisa los bloques y las fechas del calendario escolar.",
      stage_does_not_fit: "La acogida y el diagnóstico no caben al inicio del primer periodo lectivo.",
      project_does_not_fit: "Un proyecto no cabe en su periodo lectivo. Muévelo o cambia su duración entre dos y tres semanas.",
    };
    super(messages[reason] ?? messages.invalid);
    this.name = "AnnualCalendarError";
    this.reason = reason;
    this.details = details;
  }
}

export function nationalCalendarBlocks2026() {
  return [
    ["management", "2026-03-02", "2026-03-13", "Gestión inicial"],
    ["instructional", "2026-03-16", "2026-05-15", "Periodo lectivo 1"],
    ["management", "2026-05-18", "2026-05-22", "Semana de gestión"],
    ["instructional", "2026-05-25", "2026-07-24", "Periodo lectivo 2"],
    ["management", "2026-07-27", "2026-08-07", "Semanas de gestión"],
    ["instructional", "2026-08-10", "2026-10-09", "Periodo lectivo 3"],
    ["management", "2026-10-12", "2026-10-16", "Semana de gestión"],
    ["instructional", "2026-10-19", "2026-12-18", "Periodo lectivo 4"],
    ["management", "2026-12-21", "2026-12-31", "Gestión final"],
  ].map(([type, start_date, end_date, label], sort_order) => ({ type, start_date, end_date, label, editable: true, sort_order }));
}

export function defaultInitialStage() {
  return { name: "Acogida, adaptación y evaluación diagnóstica", duration_weeks: 2,
    purpose: "Conocer a los niños, acompañar su adaptación y preparar un ambiente seguro para jugar y aprender.",
    suggested_experiences: ["Juego libre en sectores", "Recorrido por los espacios del jardín", "Conversaciones y juegos para conocernos"],
    what_to_observe: ["Cómo se incorpora al juego", "Cómo se comunica y se relaciona", "Qué despierta su curiosidad"],
    family_actions: ["Conversar con las familias sobre rutinas y necesidades de adaptación"],
    diagnostic_focus: ["Registrar lo que cada niño hace y dice, sin asignar niveles por una sola observación"],
    teacher_notes: "" };
}

export function validateAnnualCalendar(calendar) {
  const year = Number(calendar?.school_year);
  if (!Number.isInteger(year) || !Array.isArray(calendar?.blocks) || !calendar.blocks.length) throw new AnnualCalendarError("invalid");
  const blocks = calendar.blocks.map((block, index) => {
    const first = date(block.start_date);
    const last = date(block.end_date);
    if (!BLOCK_TYPES.has(block.type) || !first || !last || first > last || first.getUTCFullYear() !== year || last.getUTCFullYear() !== year) {
      throw new AnnualCalendarError("invalid", { index });
    }
    if (block.type === "instructional" && (first.getUTCDay() !== 1 || last.getUTCDay() !== 5)) {
      throw new AnnualCalendarError("invalid", { index, field: "instructional_week_alignment" });
    }
    return { ...block, start_date: iso(first), end_date: iso(last), editable: block.editable !== false };
  }).sort((a, b) => a.start_date.localeCompare(b.start_date));
  if (blocks.filter((block) => block.type === "instructional").length !== 4) throw new AnnualCalendarError("invalid", { field: "instructional_blocks" });
  const instructional = blocks.filter((block) => block.type === "instructional");
  for (let index = 1; index < instructional.length; index += 1) {
    if (instructional[index - 1].end_date >= instructional[index].start_date) throw new AnnualCalendarError("invalid", { field: "overlapping_instructional_blocks" });
  }
  return { ...calendar, school_year: year, blocks };
}

function blocked(day, exceptions) {
  return exceptions.some((item) => item.is_instructional !== true &&
    calendarDay(item.start_date ?? item.exception_date) <= iso(day) &&
    calendarDay(item.end_date ?? item.exception_date) >= iso(day));
}
function weeksIn(block, exceptions) {
  const weeks = [];
  const last = date(block.end_date);
  for (let monday = date(block.start_date); monday <= last; monday = after(monday, 7)) {
    const friday = after(monday, 4);
    if (friday > last) break;
    const instructionalDays = Array.from({ length: 5 }, (_, offset) => after(monday, offset))
      .filter((day) => !blocked(day, exceptions));
    if (instructionalDays.length) weeks.push({ monday, friday,
      canStart: !blocked(monday, exceptions), canEnd: !blocked(friday, exceptions) });
  }
  return weeks;
}
const consecutive = (weeks) => weeks.every((week, index) => !index || week.monday.getTime() - weeks[index - 1].monday.getTime() === 7 * DAY_MS);
const fits = (weeks, duration) => weeks.length === duration && consecutive(weeks) && weeks[0].canStart && weeks.at(-1).canEnd;

/** Schedule twelve proposals in complete teaching weeks; never bridge a blocked week. */
export function buildFlexibleAnnualSchedule(calendar, projects) {
  const valid = validateAnnualCalendar(calendar);
  if (!Array.isArray(projects) || projects.length !== ANNUAL_PROJECT_COUNT) throw new AnnualCalendarError("invalid", { field: "project_count" });
  const blocks = valid.blocks.filter((block) => block.type === "instructional");
  const exceptions = [...(valid.exceptions ?? []), ...valid.blocks.filter((block) => block.type !== "instructional")];
  const stage = calendar.initial_stage ?? defaultInitialStage();
  const stageWeeks = Number(stage.duration_weeks);
  if (!Number.isInteger(stageWeeks) || stageWeeks < 1 || stageWeeks > 4) throw new AnnualCalendarError("invalid", { field: "initial_stage" });
  const firstWeeks = weeksIn(blocks[0], exceptions);
  let stageStart = 0;
  while (stageStart + stageWeeks <= firstWeeks.length && !fits(firstWeeks.slice(stageStart, stageStart + stageWeeks), stageWeeks)) stageStart += 1;
  const selectedStage = firstWeeks.slice(stageStart, stageStart + stageWeeks);
  if (!fits(selectedStage, stageWeeks)) throw new AnnualCalendarError("stage_does_not_fit");
  const initial_stage = { ...stage, starts_on: iso(selectedStage[0].monday), ends_on: iso(selectedStage.at(-1).friday) };
  const schedule = [];
  for (let blockIndex = 0; blockIndex < 4; blockIndex += 1) {
    const block = blocks[blockIndex];
    const available = weeksIn(block, exceptions).filter((week) => blockIndex !== 0 || week.monday > selectedStage.at(-1).friday);
    let cursor = 0;
    for (let position = 0; position < 3; position += 1) {
      const index = blockIndex * 3 + position;
      const duration = Number(projects[index]?.duration_weeks);
      if (![2, 3].includes(duration)) throw new AnnualCalendarError("invalid", { field: "duration_weeks", index });
      while (cursor + duration <= available.length && !fits(available.slice(cursor, cursor + duration), duration)) cursor += 1;
      const weeks = available.slice(cursor, cursor + duration);
      if (!fits(weeks, duration)) throw new AnnualCalendarError("project_does_not_fit", { index, block: blockIndex + 1, duration_weeks: duration });
      schedule.push({ index: index + 1, code: `P${String(index + 1).padStart(2, "0")}`,
        starts_on: iso(weeks[0].monday), ends_on: iso(weeks.at(-1).friday), duration_weeks: duration,
        period: `Bimestre ${blockIndex + 1}`, calendar_block_id: block.id ?? null });
      cursor += duration;
    }
  }
  return { initial_stage, projects: schedule, blocks: valid.blocks };
}

/** Prefer three weeks for the last proposal in a period when the real calendar allows it. */
export function suggestAnnualProjectDurations(calendar) {
  const durations = Array(ANNUAL_PROJECT_COUNT).fill(2);
  buildFlexibleAnnualSchedule(calendar, durations.map((duration_weeks) => ({ duration_weeks })));
  for (let period = 0; period < 4; period += 1) {
    for (const position of [2, 1, 0]) {
      const index = period * 3 + position;
      const candidate = [...durations];
      candidate[index] = 3;
      try {
        buildFlexibleAnnualSchedule(calendar, candidate.map((duration_weeks) => ({ duration_weeks })));
        durations[index] = 3;
        break;
      } catch (error) {
        if (!(error instanceof AnnualCalendarError) || error.reason !== "project_does_not_fit") throw error;
      }
    }
  }
  return durations;
}
