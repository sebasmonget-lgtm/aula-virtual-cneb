import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { anonymousDecisionText } from "../../../src/lib/jev-competency-suggestion.mjs";
import { buildCriteria } from "./criteria-builder.mjs";
import { assertNoBenchmarkLabels } from "./luna-inference-boundary.mjs";

// Gold label aliases are normalized locally; they never enter provider inputs.
const ALIASES = { INDAGA: "CYT_INDAGA", INDAGACION: "CYT_INDAGA", COMUNICACION_ORAL: "COM_ORAL",
  LEE_TEXTOS: "COM_LECTURA", CANTIDAD: "MAT_CANTIDAD", ARTE: "COM_ARTE", CONVIVENCIA: "PS_CONVIVE",
  ESCRITURA: "COM_ESCRITURA", FORMA_LOCALIZACION: "MAT_FORMA", MOTRICIDAD: "PSICO_MOTRICIDAD" };
const canonical = (id) => ALIASES[id] ?? id;

function ids(value, label) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id))
    throw new Error(`${label} debe ser un arreglo de IDs.`);
  return [...new Set(value.map(canonical))];
}

export function normalizeBenchmarkCase(record, index, { knowledgeBase, config }) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error(`Caso ${index + 1} inválido.`);
  if (typeof record.id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/u.test(record.id)) throw new Error(`Caso ${index + 1}: ID inválido.`);
  if (![3, 4, 5].includes(Number(record.age))) throw new Error(`${record.id}: Jev exige edad de 3, 4 o 5 años.`);
  if (!["spontaneous", "guided"].includes(record.type)) throw new Error(`${record.id}: type debe ser spontaneous o guided.`);
  if (typeof record.observation !== "string" || !record.observation.trim() || record.observation.length > 2000)
    throw new Error(`${record.id}: observación ausente o demasiado larga.`);
  if (record.context != null && (typeof record.context !== "string" || record.context.length > 500))
    throw new Error(`${record.id}: contexto inválido.`);
  if (record.known_names != null && (!Array.isArray(record.known_names) || record.known_names.some((name) => typeof name !== "string")))
    throw new Error(`${record.id}: known_names debe ser un arreglo de textos.`);
  if (!Object.hasOwn(record, "expected") && !Object.hasOwn(record, "expected_competency_id"))
    throw new Error(`${record.id}: falta gold explícito (expected).`);
  const expected = record.expected ?? {};
  if (!expected || typeof expected !== "object" || Array.isArray(expected)) throw new Error(`${record.id}: expected inválido.`);
  const primary = canonical(expected.primary ?? record.expected_primary ?? record.expected_competency_id ?? null);
  const acceptablePrimary = ids(expected.acceptable_primary ?? record.acceptable_primary, "acceptable_primary");
  const acceptableSecondary = ids(expected.acceptable_secondary ?? record.acceptable_secondary_ids, "acceptable_secondary");
  const shouldAbstain = expected.should_abstain ?? (primary == null && !acceptablePrimary.length);
  const shouldPrivacyBlock = expected.should_privacy_block ?? false;
  if (typeof shouldAbstain !== "boolean" || typeof shouldPrivacyBlock !== "boolean") throw new Error(`${record.id}: banderas expected inválidas.`);
  if (!shouldAbstain && !shouldPrivacyBlock && !primary && !acceptablePrimary.length)
    throw new Error(`${record.id}: falta primaria o alternativas aceptables.`);
  if (shouldAbstain && (primary || acceptablePrimary.length)) throw new Error(`${record.id}: abstención y primaria se contradicen.`);
  const applicability = {
    castellano_as_second_language: Boolean(record.applicability?.castellano_as_second_language ?? record.applicability?.castellano_l2),
    religion_applicable: Boolean(record.applicability?.religion_applicable ?? record.applicability?.religion),
  };
  const plan = buildCriteria(knowledgeBase, { age: Number(record.age), observation: "validación", applicability }, config);
  for (const id of [primary, ...acceptablePrimary, ...acceptableSecondary].filter(Boolean))
    if (!plan.optionIds.has(id) || id === "NO_CLASIFICABLE") throw new Error(`${record.id}: ${id} no es aplicable para esta edad.`);
  return {
    id: record.id, age: Number(record.age), type: record.type, context: record.context ?? null,
    raw_observation: record.observation, applicability,
    known_names: [...new Set([record.name, ...(record.known_names ?? [])].filter((name) => typeof name === "string" && name.trim()))],
    expected: { primary, acceptable_primary: acceptablePrimary, acceptable_secondary: acceptableSecondary,
      should_abstain: shouldAbstain, should_privacy_block: shouldPrivacyBlock,
      discussable: expected.discussable === true || acceptablePrimary.length > 1 },
  };
}

export async function loadLunaBenchmarkDataset(filename, dependencies) {
  const contents = await readFile(filename, "utf8");
  const ext = path.extname(filename).toLowerCase();
  let records;
  if (ext === ".jsonl") records = contents.split(/\r?\n/u).filter((line) => line.trim()).map((line, index) => {
    try { return JSON.parse(line); } catch { throw new Error(`JSONL inválido en línea ${index + 1}.`); }
  });
  else if (ext === ".json") { const parsed = JSON.parse(contents); records = Array.isArray(parsed) ? parsed : parsed.cases; }
  else throw new Error("Usa un dataset .json o .jsonl.");
  if (!Array.isArray(records) || !records.length) throw new Error("El dataset está vacío.");
  const cases = records.map((record, index) => normalizeBenchmarkCase(record, index, dependencies));
  if (new Set(cases.map((item) => item.id)).size !== cases.length) throw new Error("Hay IDs duplicados.");
  return { filename, fingerprint: createHash("sha256").update(contents).digest("hex"), cases };
}

// This is the complete inference boundary. Gold labels and metadata cannot cross it.
export function inferenceInput(item) {
  const sanitized = anonymousDecisionText(item.raw_observation, item.known_names);
  const context = item.context ? anonymousDecisionText(item.context, item.known_names) : null;
  return assertNoBenchmarkLabels({ age: item.age, type: item.type, context,
    observation: sanitized, applicability: { ...item.applicability },
    privacy_blocked: sanitized == null || Boolean(item.context && context == null) });
}
