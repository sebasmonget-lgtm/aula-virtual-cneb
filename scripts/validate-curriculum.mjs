import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(process.cwd());
const master = JSON.parse(await readFile(path.join(root, "curriculum/official/initial-cycle-ii-master.json"), "utf8"));
const errors = [];
const ids = new Set();
const summary = { officialVerified: 0, officialPending: 0, semanticVerified: 0, semanticPending: 0, performances: { 3: 0, 4: 0, 5: 0 } };
for (const competency of master.competencies) {
  if (ids.has(competency.id)) errors.push(`Competency ID duplicado: ${competency.id}`); ids.add(competency.id);
  if (competency.official_review_status === "verified") { summary.officialVerified++; if (!competency.source_document_id || !competency.pdf_page || !competency.content_hash) errors.push(`Competencia verificada sin trazabilidad: ${competency.id}`); } else summary.officialPending++;
  if (competency.semantic_review_status === "verified") summary.semanticVerified++; else summary.semanticPending++;
  for (const performance of competency.performances ?? []) { if (!master.ages.includes(performance.age) || performance.competency_id !== competency.id) errors.push(`Desempeño inválido: ${performance.id}`); else summary.performances[performance.age]++; }
}
for (const age of master.ages) {
  const runtime = JSON.parse(await readFile(path.join(root, `curriculum/runtime/initial-${age}.ai.json`), "utf8"));
  if (runtime.age !== age || runtime.competencies.some((c) => c.performances.some((p) => p.age !== age))) errors.push(`Runtime de ${age} inconsistente.`);
  for (const card of runtime.competencies) {
    if (!card.id || !card.official_name || !card.meaning || !card.capacities?.length) errors.push(`Ficha semántica incompleta: ${card.id}`);
    if (card.semantic_review_status === "verified" && (!card.examples?.length || !card.not_examples?.length || !card.common_confusions?.length)) errors.push(`Ficha Jev verificada incompleta: ${card.id}`);
  }
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Official: ${summary.officialVerified}/${master.competencies.length} verified; pending: ${summary.officialPending}.`);
console.log(`Semantic: ${summary.semanticVerified}/${master.competencies.length} verified; pending: ${summary.semanticPending}.`);
console.log(`Performances: 3 años ${summary.performances[3]}; 4 años ${summary.performances[4]}; 5 años ${summary.performances[5]}. Estado: ${master.status}.`);
