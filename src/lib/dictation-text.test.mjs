import test from "node:test";
import assert from "node:assert/strict";
import { mergeDictationText } from "./dictation-text.mjs";

test("el dictado añade texto sin reemplazar la nota escrita ni cambiar las palabras", () => {
  assert.equal(mergeDictationText("  Comparó dos hojas.  ", "  Dijo: «Esta es más grande». "), "Comparó dos hojas.\nDijo: «Esta es más grande».");
  assert.equal(mergeDictationText("", "Probó otro recorrido."), "Probó otro recorrido.");
});
test("observaciones admiten 4000 caracteres y entrevistas mantienen su límite de 2000", () => {
  assert.equal(mergeDictationText("", "x".repeat(4000)).length, 4000);
  assert.throws(() => mergeDictationText("x".repeat(3999), "y"), /4000/);
  assert.equal(mergeDictationText("", "x".repeat(2000), 2000).length, 2000);
  assert.throws(() => mergeDictationText("", "x".repeat(2001), 2000), /2000/);
});
test("silencio o datos inválidos no se aceptan como una nueva nota", () => {
  assert.throws(() => mergeDictationText("Nota existente", " \n "), /No se encontró texto/);
  assert.throws(() => mergeDictationText(null, "Texto"), TypeError);
  assert.throws(() => mergeDictationText("", "Texto", -1), TypeError);
});
