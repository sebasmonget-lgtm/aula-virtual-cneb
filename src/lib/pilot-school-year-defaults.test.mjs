import test from "node:test";
import assert from "node:assert/strict";
import { pilotSchoolYearDefaults } from "./pilot-school-year-defaults.mjs";

test("alta docente usa el año escolar Minedu 2026 completo, incluidas semanas de gestión", () => {
  assert.deepEqual(pilotSchoolYearDefaults(2026), {
    startsOn: "2026-03-02", endsOn: "2026-12-31",
    classesStartOn: "2026-03-16", classesEndOn: "2026-12-18",
  });
  assert.equal(pilotSchoolYearDefaults(2027), null);
  assert.equal(pilotSchoolYearDefaults(2025), null);
});
