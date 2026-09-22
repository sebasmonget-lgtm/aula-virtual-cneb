import test from "node:test";
import assert from "node:assert/strict";
import { resolveSourceUpdatedAt } from "./student-context-service.mjs";

test("la frescura del contexto usa el cambio pedagógico más reciente", () => {
  assert.equal(resolveSourceUpdatedAt("2026-09-20T08:00:00.000Z", "2026-09-22T10:00:00.000Z"), "2026-09-22T10:00:00.000Z");
});
test("un diagnóstico posterior actualiza la frescura aunque no haya nueva evidencia", () => {
  assert.equal(resolveSourceUpdatedAt(["2026-09-20T08:00:00.000Z"], ["2026-09-23T10:00:00.000Z"]), "2026-09-23T10:00:00.000Z");
});
