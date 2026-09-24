import test from "node:test";
import assert from "node:assert/strict";
import { loadKnowledgeBase } from "../src/kb-loader.mjs";
import { buildCriteria } from "../src/criteria-builder.mjs";

const config = { maximum_observation_characters: 2000 };
test("la KB v4 habilita opciones por edad y reglas especiales", async () => {
  const kb = await loadKnowledgeBase();
  const input = (age, applicability = {}) => ({ age, observation: "Observación ficticia.", applicability });
  assert.equal(buildCriteria(kb, input(3), config).options.length, 9);
  assert.equal(buildCriteria(kb, input(3, { religion_applicable: true }), config).options.length, 10);
  assert.equal(buildCriteria(kb, input(4), config).options.length, 10);
  assert.equal(buildCriteria(kb, input(5), config).options.length, 12);
  assert.equal(buildCriteria(kb, input(5, { religion_applicable: true, castellano_as_second_language: true }), config).options.length, 14);
  assert.equal(buildCriteria(kb, input(3), config).optionIds.has("COM_ESCRITURA"), false);
});
