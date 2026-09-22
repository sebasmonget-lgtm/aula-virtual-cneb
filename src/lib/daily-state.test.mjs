import test from "node:test";
import assert from "node:assert/strict";
import { resolveDailyState } from "./daily-state.mjs";

const blocks = [
  { id: "routine", start_time: "08:00", end_time: "08:30", block_type: "routine", status: "planned" },
  { id: "activity", start_time: "09:00", end_time: "09:45", block_type: "activity", status: "planned" },
  { id: "workshop", start_time: "11:20", end_time: "12:00", block_type: "workshop", status: "planned" },
];

test("prioriza asistencia antes del primer bloque", () => {
  const state = resolveDailyState({ now: "07:50", scheduleEntries: blocks, attendanceRecorded: false, calendarException: null });
  assert.equal(state.primaryAction, "attendance");
});

test("identifica la actividad actual si la docente entra tarde", () => {
  const state = resolveDailyState({ now: "09:20", scheduleEntries: blocks, attendanceRecorded: true, calendarException: null });
  assert.equal(state.currentBlock?.id, "activity");
  assert.equal(state.primaryAction, "start_block");
});

test("respeta una actividad extendida manualmente", () => {
  const entries = blocks.map((block) => block.id === "activity" ? { ...block, status: "active", current_override: true } : block);
  const state = resolveDailyState({ now: "11:30", scheduleEntries: entries, attendanceRecorded: true, calendarException: null });
  assert.equal(state.currentBlock?.id, "activity");
});

test("no sugiere actividades en un feriado", () => {
  const state = resolveDailyState({ now: "09:20", scheduleEntries: blocks, attendanceRecorded: false, calendarException: { is_instructional: false } });
  assert.equal(state.mode, "no_classes");
  assert.equal(state.primaryAction, "none");
});

test("expone configuración cuando no existe horario", () => {
  const state = resolveDailyState({ now: "09:20", scheduleEntries: [], attendanceRecorded: true, calendarException: null });
  assert.equal(state.primaryAction, "configure_schedule");
});

test("solicita cierre cuando una actividad terminó sin registro", () => {
  const state = resolveDailyState({ now: "10:00", scheduleEntries: blocks, attendanceRecorded: true, calendarException: null });
  assert.equal(state.mode, "closure");
  assert.equal(state.currentBlock?.id, "activity");
  assert.equal(state.primaryAction, "close_block");
});
