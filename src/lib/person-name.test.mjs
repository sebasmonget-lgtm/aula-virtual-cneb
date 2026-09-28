import test from "node:test";
import assert from "node:assert/strict";
import { displayPersonName } from "./person-name.mjs";

test("presenta nombres de alumnos con caja legible sin perder tildes", () => {
  assert.equal(displayPersonName("  ANA   MARÍA DE LA CRUZ "), "Ana María de la Cruz");
  assert.equal(displayPersonName("luis-josé o'NEILL"), "Luis-José O'Neill");
  assert.equal(displayPersonName("DEL ROSARIO"), "Del Rosario");
});
