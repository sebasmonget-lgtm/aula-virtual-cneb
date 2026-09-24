import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { KB_ROOT, SPECIAL_COMPETENCIES } from "./constants.mjs";
import { assert } from "./validation.mjs";

const FILES = { cards: "03_semantic/competency_cards.jsonl", matrix: "02_official_reference/age_competency_matrix.json", applicability: "02_official_reference/special_applicability.json" };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
async function readChecked(rootDir, manifest, relativePath) {
  const contents = await readFile(path.join(rootDir, relativePath));
  assert(manifest.integrity?.files?.[relativePath] === sha256(contents), `La huella de KB no coincide: ${relativePath}.`);
  return contents;
}
function parseJsonl(buffer, label) {
  return buffer.toString("utf8").split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); } catch { throw new Error(`JSONL inválido en ${label}:${index + 1}.`); }
  });
}
export async function loadKnowledgeBase({ rootDir = KB_ROOT } = {}) {
  const manifestBuffer = await readFile(path.join(rootDir, "manifest.json"));
  const manifest = JSON.parse(manifestBuffer.toString("utf8"));
  assert(manifest.version === "4.0.0", `Versión KB inesperada: ${manifest.version}.`);
  assert(JSON.stringify(manifest.scope?.ages) === "[3,4,5]", "La KB no declara las edades 3, 4 y 5.");
  const [cardsBuffer, matrixBuffer, applicabilityBuffer] = await Promise.all([readChecked(rootDir, manifest, FILES.cards), readChecked(rootDir, manifest, FILES.matrix), readChecked(rootDir, manifest, FILES.applicability)]);
  const cards = parseJsonl(cardsBuffer, FILES.cards);
  const matrix = JSON.parse(matrixBuffer.toString("utf8"));
  const specialApplicability = JSON.parse(applicabilityBuffer.toString("utf8"));
  assert(cards.length === 14 && manifest.counts?.competencies === 14, "La KB debe contener 14 tarjetas de competencia.");
  const ids = new Set();
  for (const card of cards) {
    assert(typeof card.id === "string" && card.id === card.canonical_id && !ids.has(card.id), "La KB contiene un ID de competencia inválido o duplicado.");
    ids.add(card.id); assert(typeof card.official_name === "string" && typeof card.ai_meaning === "string", `Tarjeta incompleta: ${card.id}.`);
    for (const age of [3, 4, 5]) assert(typeof card.runtime_selectable_by_age?.[age] === "boolean" && card.ages?.[age], `Edad incompleta en ${card.id}.`);
  }
  for (const age of [3, 4, 5]) {
    const expected = [...matrix.specified_performance_competencies_by_age?.[age] ?? []].sort();
    const selectable = cards.filter((card) => card.runtime_selectable_by_age[age]).map((card) => card.id).sort();
    assert(JSON.stringify(expected) === JSON.stringify(selectable), `La matriz por edad no coincide con las tarjetas para ${age} años.`);
  }
  for (const id of Object.keys(SPECIAL_COMPETENCIES)) assert(specialApplicability.rules?.some((rule) => rule.competency_id === id), `Falta aplicabilidad especial para ${id}.`);
  return { version: manifest.version, cards, matrix, specialApplicability, fingerprint: sha256(JSON.stringify({ version: manifest.version, files: Object.fromEntries(Object.values(FILES).map((file) => [file, manifest.integrity.files[file]])) })) };
}
