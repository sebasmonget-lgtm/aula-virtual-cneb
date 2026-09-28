import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { loadKnowledgeBase } from "../src/kb-loader.mjs";

const source = process.argv[2];
if (!source) throw new Error("Indica la ruta del JSON recibido para preparar el conjunto anonimizado.");
const raw = await readFile(source);
const records = JSON.parse(raw.toString("utf8"));
if (!Array.isArray(records) || records.length !== 30) throw new Error("Se esperaban exactamente 30 casos.");

const knowledgeBase = await loadKnowledgeBase();
const byName = new Map(knowledgeBase.cards.map((card) => [card.official_name, card.id]));
byName.set("Se desenvuelve en entornos virtuales generados por las TIC", "TRANS_TIC");
const substitutions = new Map([
  ["hard_001", [["con Ana", "con una compañera"]]],
  ["hard_002", [["A Mateo", "A un compañero"]]],
  ["hard_003", [["como Sofía", "como el nombre de una compañera que empieza con S"]]],
  ["hard_021", [["Diego", "un compañero"], ["María", "una compañera"]]],
  ["hard_025", [["que Samuel", "que el nombre de un compañero que empieza con S"]]],
]);
const names = /\b(?:Ana|Mateo|Sofía|Diego|María|Samuel)\b/u;
const ids = new Set();
const sanitized = records.map((record) => {
  if (ids.has(record.id)) throw new Error(`ID duplicado: ${record.id}`);
  ids.add(record.id);
  let observation = record.observation;
  for (const [before, after] of substitutions.get(record.id) ?? []) {
    if (!observation.includes(before)) throw new Error(`Falta el texto previsto para anonimizar ${record.id}.`);
    observation = observation.replace(before, after);
  }
  if (names.test(observation)) throw new Error(`Quedó un nombre propio en ${record.id}.`);
  const expected = record.expected_primary == null ? null : byName.get(record.expected_primary);
  if (record.expected_primary != null && !expected) throw new Error(`Etiqueta principal desconocida en ${record.id}.`);
  const secondary = record.acceptable_secondary.map((name) => {
    const id = byName.get(name);
    if (!id) throw new Error(`Etiqueta secundaria desconocida en ${record.id}.`);
    return id;
  });
  if (Boolean(record.should_abstain) !== (expected == null)) throw new Error(`Abstención contradictoria en ${record.id}.`);
  return {
    id: record.id,
    age: record.age,
    observation,
    applicability: {},
    expected_competency_id: expected,
    acceptable_secondary_ids: secondary,
    should_abstain: Boolean(record.should_abstain),
    difficulty: record.difficulty,
    label_status: "user_supplied_unreviewed",
  };
});
const destination = path.join(EXPERIMENT_ROOT, "datasets", "user-hard-30-v1.jsonl");
await writeFile(destination, `${sanitized.map((item) => JSON.stringify(item)).join("\n")}\n`, "utf8");
console.log(`Conjunto anonimizado: ${sanitized.length} casos; fuente SHA-256 ${createHash("sha256").update(raw).digest("hex")}; destino ${destination}`);
