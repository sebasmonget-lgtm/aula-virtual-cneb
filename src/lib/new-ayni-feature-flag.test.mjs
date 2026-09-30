import test from "node:test";
import assert from "node:assert/strict";
import { newAyniFeatureEnabled } from "./new-ayni-feature-flag.mjs";
import { planningV3ReadEnabled } from "./planning-contract-v3.mjs";
import { simpleProjectEnabled } from "./project-v3-snapshot.mjs";
import { inheritedActivityEnabled } from "./activity-v3-snapshot.mjs";

test("Nuevo Ayni is the default and legacy requires an explicit zero", () => {
  assert.equal(newAyniFeatureEnabled(undefined), true);
  assert.equal(newAyniFeatureEnabled("1"), true);
  assert.equal(newAyniFeatureEnabled("0"), false);
});

test("server F1, F3 and F4 contracts default on and permit explicit rollback", () => {
  const gates = [
    ["AYNI_PLANNING_V3_READ", planningV3ReadEnabled],
    ["AYNI_PROJECT_SIMPLE", simpleProjectEnabled],
    ["AYNI_ACTIVITY_INHERITED", inheritedActivityEnabled],
  ];
  const previous = gates.map(([key]) => process.env[key]);
  try {
    for (const [key, enabled] of gates) {
      delete process.env[key];
      assert.equal(enabled(), true, `${key} must be on when absent`);
      process.env[key] = "0";
      assert.equal(enabled(), false, `${key}=0 must restore legacy behavior`);
    }
  } finally {
    gates.forEach(([key], index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});
