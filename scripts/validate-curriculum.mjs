import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(process.cwd());
const master = JSON.parse(await readFile(path.join(root, "curriculum/official/initial-cycle-ii-master.json"), "utf8"));
const errors = [];
const ids = new Set();
for (const competency of master.competencies) {
  if (ids.has(competency.id)) errors.push(`Competency ID duplicado: ${competency.id}`); ids.add(competency.id);
  if (competency.review_status === "verified" && (!competency.source_document_id || !competency.pdf_page || !competency.content_hash)) errors.push(`Competencia verificada sin trazabilidad: ${competency.id}`);
  for (const performance of competency.performances ?? []) if (!master.ages.includes(performance.age) || performance.competency_id !== competency.id) errors.push(`Desempeño inválido: ${performance.id}`);
}
for (const age of master.ages) {
  const runtime = JSON.parse(await readFile(path.join(root, `curriculum/runtime/initial-${age}.ai.json`), "utf8"));
  if (runtime.age !== age || runtime.competencies.some((c) => c.performances.some((p) => p.age !== age))) errors.push(`Runtime de ${age} inconsistente.`);
  for (const card of runtime.competencies) {
    if (!card.id || !card.official_name || !card.meaning || !card.capacities?.length) errors.push(`Ficha semántica incompleta: ${card.id}`);
    if (card.review_status === "verified" && (!card.examples?.length || !card.not_examples?.length || !card.common_confusions?.length)) errors.push(`Ficha Jev verificada incompleta: ${card.id}`);
  }
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Currículo válido: ${master.competencies.length} competencias verificables; estado ${master.status}.`);
