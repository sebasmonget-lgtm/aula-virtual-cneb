import test from "node:test";
import assert from "node:assert/strict";
import { loadKnowledgeBase } from "../src/kb-loader.mjs";
import { buildCriteria, buildParallelNoulQuestions, buildSufficiencyQuestion } from "../src/criteria-builder.mjs";
import { validateInput } from "../src/validation.mjs";

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

test("el perfil enfocado conserva patrones por edad y no confunde la coexistencia con una negación", async () => {
  const kb = await loadKnowledgeBase();
  const plan = buildCriteria(kb, { age: 3, observation: "Dijo que estaba triste y pidió ayuda." }, config, "focused");
  assert.ok(plan.criteria.PS_IDENTIDAD.aplica_cuando.some((text) => text.includes("Expresa emociones")));
  assert.equal(plan.criteria.PS_IDENTIDAD.ejemplos, undefined);
  assert.ok(plan.criteria.COM_ORAL.distinciones.some((text) => text.includes("INDAGA")));
  const questions = buildParallelNoulQuestions(plan).questions;
  assert.ok(questions.COM_ORAL.criteria.false.includes("que también exista otra competencia no decide esta respuesta"));
  assert.ok(!questions.COM_ORAL.criteria.false.includes("o corresponde a otra competencia"));
  assert.equal(buildSufficiencyQuestion().type, "noul");
});

test("el límite de longitud usa la clave real del archivo de configuración", () => {
  assert.throws(() => validateInput({ age: 5, observation: "123456" }, { maximum_observation_characters: 5 }), /supera 5 caracteres/);
});

test("el perfil enriquecido conserva todos los observables de edad y añade límites de confusión", async () => {
  const kb = await loadKnowledgeBase();
  const input = { age: 3, observation: "Dijo que estaba triste y pidió ayuda.", applicability: {} };
  const compact = buildCriteria(kb, input, config);
  const enriched = buildCriteria(kb, input, config, "enriched");
  assert.notEqual(compact.criteriaFingerprint, enriched.criteriaFingerprint);
  assert.equal(compact.criteria.PS_IDENTIDAD.aplica_cuando.some((text) => text.includes("Expresa emociones")), false);
  assert.equal(enriched.criteria.PS_IDENTIDAD.aplica_cuando.some((text) => text.includes("Expresa emociones")), true);
  assert.ok(enriched.criteria.COM_ORAL.distinciones.some((text) => text.includes("INDAGA")));
  assert.ok(enriched.criteria.PS_IDENTIDAD.ejemplos.length > 0);
  assert.ok(enriched.criteria.PS_IDENTIDAD.contraejemplos.length > 0);
  assert.equal(enriched.criteria.PS_RELIGION, undefined);
  const questions = buildParallelNoulQuestions(enriched).questions;
  assert.ok(questions.PS_IDENTIDAD.criteria.true.includes("Expresa emociones"));
  assert.ok(questions.COM_ORAL.instructions.includes("Distinciones pertinentes"));
  assert.ok(questions.PS_IDENTIDAD.criteria.false.includes("Contraejemplo"));
});
