import test from "node:test";
import assert from "node:assert/strict";
import { assertFutureProjectMapEdits, assertProtectedCalendarDates, retainProtectedProjectRows } from "./project-map-version-guard.mjs";

const source = [
  { id: "past", date: "2026-04-13", title: "Exploramos el jardín", specific_purpose: "Observar", competency_ids: ["CYT_INDAGA"] },
  { id: "recorded", date: "2026-10-01", title: "Conversamos", specific_purpose: "Escuchar", competency_ids: ["COM_ORAL"] },
  { id: "future", date: "2026-10-02", title: "Seguimos conversando", specific_purpose: "Explicar", competency_ids: ["COM_ORAL"] },
];
const boundary = { today: "2026-09-27", recordedRouteIds: ["recorded"] };

test("regenerar futuro restaura blueprints pasados/registrados completos sin alterar la fuente", () => {
  const before = JSON.stringify(source);
  const generated = source.map(row => ({ ...row, id: `${row.id}-new`, title: "Otra actividad" }));
  const retained = retainProtectedProjectRows(source, generated, boundary);
  assert.deepEqual(retained.slice(0,2), source.slice(0,2));
  assert.equal(retained[2].id, "future-new");
  assert.doesNotThrow(() => assertFutureProjectMapEdits(source, retained, boundary));
  assert.equal(JSON.stringify(source), before);
});

test("la nueva versión conserva días pasados y días con registros, pero permite revisar el futuro", () => {
  const futureEdit = source.map((item) => item.id === "future" ? { ...item, title: "Comparamos nuestras ideas" } : item);
  assert.doesNotThrow(() => assertFutureProjectMapEdits(source, futureEdit, boundary));
  assert.throws(() => assertFutureProjectMapEdits(source,
    source.map((item) => item.id === "past" ? { ...item, title: "Reescrito" } : item), boundary), /historial/);
  assert.throws(() => assertFutureProjectMapEdits(source,
    source.map((item) => item.id === "recorded" ? { ...item, specific_purpose: "Otro propósito" } : item), boundary), /historial/);
  assert.throws(() => assertFutureProjectMapEdits(source, source.filter((item) => item.id !== "past"), boundary), /historial/);
});

test("el calendario conserva fechas históricas y permite cambiar una fecha futura", () => {
  assert.doesNotThrow(() => assertProtectedCalendarDates(source, ["2026-04-13", "2026-10-01", "2026-10-05"], boundary));
  assert.throws(() => assertProtectedCalendarDates(source, ["2026-10-01", "2026-10-02"], boundary), /historial/);
  assert.throws(() => assertProtectedCalendarDates(source, ["2026-04-13", "2026-10-02"], boundary), /historial/);
});
