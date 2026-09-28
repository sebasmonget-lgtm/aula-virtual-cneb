import test from "node:test";
import assert from "node:assert/strict";
import { destinationFromHash, hashForDestination, primaryDestination } from "./teacher-navigation.mjs";

test("cuatro destinos y rutas antiguas conservan enlace directo", () => {
  for (const [hash, destination] of [["#hoy", "Hoy"], ["#planificar", "Planificar"],
    ["#aula", "Aula"], ["#documentos", "Documentos"], ["#calendario", "Calendario"],
    ["#biblioteca", "Biblioteca"], ["#diagnostico", "Diagnóstico"], ["#evaluar", "Evaluar"]]) {
    assert.equal(destinationFromHash(hash), destination);
    assert.equal(hashForDestination(destination), hash);
  }
  assert.equal(primaryDestination("Calendario"), "Planificar");
  assert.equal(primaryDestination("Evaluar"), "Aula");
  assert.equal(destinationFromHash("#otro"), null);
});
