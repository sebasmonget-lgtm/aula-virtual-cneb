import { CONTEXTS } from "./constants.mjs";

export function assert(condition, message) { if (!condition) throw new Error(message); }
export function isFiniteProbability(value) { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1; }

export function validateInput(input, config = {}) {
  const maximumObservationCharacters = config.maximum_observation_characters ?? config.maximumObservationCharacters ?? 2000;
  assert(input && typeof input === "object", "La clasificación requiere un objeto de entrada.");
  assert([3, 4, 5].includes(input.age), "La edad CNEB debe ser 3, 4 o 5 años.");
  assert(typeof input.observation === "string" && input.observation.trim(), "La observación no puede estar vacía.");
  assert(input.observation.length <= maximumObservationCharacters, `La observación supera ${maximumObservationCharacters} caracteres.`);
  if (input.context != null) assert(CONTEXTS.has(input.context), "El contexto no es válido.");
  if (input.applicability != null) {
    assert(typeof input.applicability === "object" && !Array.isArray(input.applicability), "La aplicabilidad debe ser un objeto.");
    for (const key of ["castellano_as_second_language", "religion_applicable"]) if (input.applicability[key] != null) assert(typeof input.applicability[key] === "boolean", `${key} debe ser booleano.`);
  }
  return { age: input.age, observation: input.observation, ...(input.context ? { context: input.context } : {}), applicability: {
    castellano_as_second_language: Boolean(input.applicability?.castellano_as_second_language),
    religion_applicable: Boolean(input.applicability?.religion_applicable),
  } };
}
