import test from "node:test";
import assert from "node:assert/strict";
import { isValidStepIndex, normalizeStepIndex } from "./activity-runner.mjs";

test("normaliza un paso persistido si la planificación ahora tiene menos pasos", () => {
  assert.equal(normalizeStepIndex(4, 2), 1);
  assert.equal(normalizeStepIndex(-1, 3), 0);
  assert.equal(normalizeStepIndex(0, 0), 0);
});

test("solo acepta índices dentro de los pasos de la actividad", () => {
  assert.equal(isValidStepIndex(1, 2), true);
  assert.equal(isValidStepIndex(2, 2), false);
  assert.equal(isValidStepIndex(-1, 2), false);
});
