import { nationalCalendarBlocks2026, nationalSchoolHolidays2026 } from "./annual-plan-calendar.mjs";
import { classifyCalendarDay } from "./school-calendar-service.mjs";
import { resolveDailyState } from "./daily-state.mjs";

/** Snapshot valid at the successful commit of a NEW classroom, never for a replay. */
export function initialClassroomDashboard(saved, clock, logoOrigin) {
  if (!saved.initialProfile || saved.replayed) throw new TypeError("Se requiere el alta recién confirmada.");
  const { date, time } = clock;
  const block = Number(saved.initialProfile.school_year) === 2026
    ? nationalCalendarBlocks2026().find(item => item.start_date <= date && date <= item.end_date) : null;
  const holiday = block ? nationalSchoolHolidays2026().find(item => item.exception_date === date) : null;
  const day = block ? classifyCalendarDay({ date, block, holiday: holiday ? { name: holiday.label } : null }) : null;
  const calendarException = day && !day.is_instructional
    ? { type: day.calendar_type, label: day.reason, is_instructional: false } : null;
  const journey = resolveDailyState({ now: time, scheduleEntries: [], attendanceRecorded: false, calendarException });
  return {
    classroom_id: saved.classroomId, activity: null, students: [],
    metrics: { students_total: 0, evidences_week: 0, students_observed: 0 },
    profile: { ...saved.initialProfile, classroom_id:saved.classroomId, logo_url: saved.initialProfile.logo_asset_id
      ? `${logoOrigin}/api/assets/${saved.initialProfile.logo_asset_id}` : null },
    today: { date, now: time, past_pending: [], blocks: [],
      attendance: { recorded: false, recorded_count: 0 }, calendar_exception: calendarException,
      journey: { mode: journey.mode, current_block_id: null, next_block_id: null, primary_action: journey.primaryAction, pending_items: journey.pendingItems } },
  };
}
