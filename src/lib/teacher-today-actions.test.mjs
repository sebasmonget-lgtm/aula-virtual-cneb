import test from "node:test";
import assert from "node:assert/strict";
import { teacherTodayActions } from "./teacher-today-actions.mjs";

test("Hoy prioriza revisión y próxima actividad sin etiquetar déficits", () => {
  const actions = teacherTodayActions({ pendingObservations: 2,
    nextActivity: { date: "2026-10-02", title: "Colecciones" }, periodReview: { ready: true, closed: false } });
  assert.deepEqual(actions.map(action => action.id), ["review_observations", "review_period", "prepare_activity"]);
  assert.equal(actions[0].label, "2 observaciones por revisar");
  assert.equal(actions[2].date, "2026-10-02");
  assert.ok(actions.every(action => !/déficit|rezago|falta de logro/i.test(action.label)));
});

test("Hoy no inventa tareas cuando no hay fuentes", () => {
  assert.deepEqual(teacherTodayActions(), []);
});
