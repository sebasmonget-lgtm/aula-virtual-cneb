import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildCriteria } from "./criteria-builder.mjs";
import { validateInput } from "./validation.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");

function parseCsvRow(line) {
  const values = []; let value = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { values.push(value); value = ""; }
    else value += character;
  }
  if (quoted) throw new Error("CSV inválido: comillas sin cerrar.");
  values.push(value); return values;
}

function parseCsv(contents) {
  const [header, ...lines] = contents.trim().split(/\r?\n/).filter(Boolean);
  const fields = parseCsvRow(header);
  return lines.map((line) => Object.fromEntries(parseCsvRow(line).map((value, index) => [fields[index], value])));
}

function normalizeCase(record, index, knowledgeBase, config) {
  if (!record || typeof record !== "object") throw new Error(`Caso inválido en posición ${index + 1}.`);
  if (typeof record.applicability === "string") record.applicability = record.applicability ? JSON.parse(record.applicability) : {};
  if (typeof record.acceptable_secondary_ids === "string") record.acceptable_secondary_ids = record.acceptable_secondary_ids ? record.acceptable_secondary_ids.split("|").filter(Boolean) : [];
  const input = validateInput({ age: Number(record.age), observation: record.observation, context: record.context || undefined, applicability: record.applicability ?? {} }, config);
  if (typeof record.id !== "string" || !record.id) throw new Error(`El caso ${index + 1} no tiene ID.`);
  const plan = buildCriteria(knowledgeBase, input, config);
  const expected = record.expected_competency_id === "" || record.expected_competency_id == null ? null : record.expected_competency_id;
  if (expected != null && !plan.optionIds.has(expected)) throw new Error(`La etiqueta ${expected} no es aplicable en ${record.id}.`);
  const acceptable = record.acceptable_secondary_ids ?? [];
  if (!Array.isArray(acceptable) || acceptable.some((id) => !plan.optionIds.has(id))) throw new Error(`Las alternativas aceptables no son válidas en ${record.id}.`);
  return { id: record.id, ...input, expected_competency_id: expected, acceptable_secondary_ids: acceptable, case_type: record.case_type ?? "unspecified", label_status: record.label_status ?? "provisional" };
}

export async function loadDataset(filename, { knowledgeBase, config }) {
  const contents = await readFile(filename, "utf8");
  const extension = path.extname(filename).toLowerCase();
  let records;
  if (extension === ".jsonl") records = contents.split(/\r?\n/).filter(Boolean).map((line, index) => { try { return JSON.parse(line); } catch { throw new Error(`JSONL inválido en línea ${index + 1}.`); } });
  else if (extension === ".json") { const parsed = JSON.parse(contents); records = Array.isArray(parsed) ? parsed : parsed.cases; }
  else if (extension === ".csv") records = parseCsv(contents);
  else throw new Error("El dataset debe ser .json, .jsonl o .csv.");
  if (!Array.isArray(records) || !records.length) throw new Error("El dataset no contiene casos.");
  const cases = records.map((record, index) => normalizeCase(record, index, knowledgeBase, config));
  if (new Set(cases.map((item) => item.id)).size !== cases.length) throw new Error("El dataset contiene IDs duplicados.");
  return { filename, cases, fingerprint: hash(contents) };
}
