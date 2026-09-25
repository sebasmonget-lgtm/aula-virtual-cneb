import test from "node:test";
import assert from "node:assert/strict";
import { recommendAnnualProjectSlot } from "./annual-project-recommendation.mjs";

const slots = [
  { slot_index: 1, starts_on: "2026-03-30", ends_on: "2026-04-10" },
  { slot_index: 2, starts_on: "2026-04-13", ends_on: "2026-04-24" },
  { slot_index: 3, starts_on: "2026-04-27", ends_on: "2026-05-08" },
];

test("recomienda la propuesta vigente y conserva su índice estable", () => {
  assert.deepEqual(recommendAnnualProjectSlot([...slots].reverse(), "2026-04-16"), { ...slots[1], reason: "current" });
});

test("en una interrupción o antes del año propone el siguiente proyecto", () => {
  assert.equal(recommendAnnualProjectSlot(slots, "2026-04-11")?.slot_index, 2);
  assert.equal(recommendAnnualProjectSlot(slots, "2026-03-01")?.slot_index, 1);
});

test("después del último proyecto muestra el más reciente y tolera un plan antiguo sin fechas", () => {
  assert.deepEqual(recommendAnnualProjectSlot(slots, "2026-12-01"), { ...slots[2], reason: "latest" });
  assert.equal(recommendAnnualProjectSlot([], "2026-04-16"), null);
});
