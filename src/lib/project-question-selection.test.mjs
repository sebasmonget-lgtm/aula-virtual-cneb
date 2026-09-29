import test from "node:test";
import assert from "node:assert/strict";
import { selectedProjectQuestions } from "./project-question-selection.mjs";

test("an unchecked middle question stays out of the confirmed Project Master input", () => {
  assert.deepEqual(selectedProjectQuestions(["Inicio", "Pregunta descartada", "Cierre", "Nueva pregunta"], [1]),
    ["Inicio", "Cierre", "Nueva pregunta"]);
  assert.deepEqual(selectedProjectQuestions(["Inicio", "  "], []), ["Inicio"]);
});
