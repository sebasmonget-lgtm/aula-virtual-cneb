import test from "node:test";
import assert from "node:assert/strict";
import { selectEvaluationPeriod } from "./evaluation-period-selection.mjs";
const periods = [
  { id: "b1", starts_on: "2026-03-16", ends_on: "2026-05-15" },
  { id: "b2", starts_on: "2026-05-25", ends_on: "2026-07-24" },
  { id: "b3", starts_on: "2026-08-10", ends_on: "2026-10-09" },
  { id: "b4", starts_on: "2026-10-19", ends_on: "2026-12-18" },
];
test("intervalo de octubre selecciona el último terminado, no bimestre 1", () => {
  assert.equal(selectEvaluationPeriod(periods, "2026-10-11").id, "b3");
});
test("respeta período explícito y fecha vigente, incluso con lista desordenada", () => {
  assert.equal(selectEvaluationPeriod([...periods].reverse(), "2026-11-02").id, "b4");
  assert.equal(selectEvaluationPeriod(periods, "2026-11-02", "b1").id, "b1");
  assert.equal(selectEvaluationPeriod(periods, "2026-11-02", "otra-aula").id, "b4");
});
test("antes/después del año, límites y ausencia de períodos no inventan fechas", () => {
  assert.equal(selectEvaluationPeriod(periods, "2026-01-01").id, "b1");
  assert.equal(selectEvaluationPeriod(periods, "2027-01-01").id, "b4");
  assert.equal(selectEvaluationPeriod(periods, "2026-10-09").id, "b3");
  assert.equal(selectEvaluationPeriod(periods, "2026-10-19").id, "b4");
  assert.equal(selectEvaluationPeriod([], "2026-10-11"), null);
  assert.equal(periods[0].id, "b1");
});

test("cada bimestre se abre en sus fechas de inicio y cierre; cambiarlo sigue permitido", () => {
  for(const period of periods){
    assert.equal(selectEvaluationPeriod(periods,period.starts_on).id,period.id);
    assert.equal(selectEvaluationPeriod(periods,period.ends_on).id,period.id);
  }
  assert.equal(selectEvaluationPeriod(periods,'2026-12-18').id,'b4');
  assert.equal(selectEvaluationPeriod(periods,'2026-12-18','b1').id,'b1');
  assert.equal(selectEvaluationPeriod(periods,'2026-12-18').id,'b4');
});
