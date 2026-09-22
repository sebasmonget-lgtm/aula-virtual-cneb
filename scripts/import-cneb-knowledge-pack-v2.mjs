import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd());
const sourceArgument = process.argv[2];
if (!sourceArgument) throw new Error("Uso: node scripts/import-cneb-knowledge-pack-v2.mjs <directorio-del-paquete-extraído>");
const source = path.resolve(root, sourceArgument);
const semanticPath = path.join(root, "curriculum/semantic/master/initial_cycle_ii.ai.json");
const incoming = JSON.parse(await readFile(path.join(source, "03_semantic_master/initial_cycle_ii.semantic.v2.json"), "utf8"));
const current = JSON.parse(await readFile(semanticPath, "utf8"));

const enrichableFields = [
  "pedagogical_intent", "when_to_use", "do_not_use_when", "examples", "not_examples",
  "common_confusions", "possible_evidence", "semantic_source", "official_text_mapping",
];
const byId = new Map(incoming.competencies.map((competency) => [competency.id, competency]));
const competencies = current.competencies.map((competency) => {
  const addition = byId.get(competency.id);
  if (!addition) throw new Error(`El paquete no contiene la competencia existente ${competency.id}`);
  const enriched = { ...competency };
  for (const field of enrichableFields) enriched[field] = addition[field];
  // El paquete es semántico: nunca eleva estados oficiales o semánticos por sí solo.
  enriched.official_review_status = "pending";
  enriched.semantic_review_status = "pending";
  return enriched;
});

if (competencies.length !== incoming.competencies.length || byId.size !== current.competencies.length) {
  throw new Error("El conjunto de competencias del paquete no coincide con el catálogo actual");
}

await writeFile(semanticPath, JSON.stringify({
  ...current,
  knowledge_pack: {
    id: "CNEB_Inicial_AI_KnowledgePack_v2",
    version: incoming.catalog_version,
    authority: "semantic_subordinate_to_verified_official",
    imported_fields: enrichableFields,
  },
  competencies,
}, null, 2) + "\n");

await mkdir(path.join(root, "curriculum/semantic/candidates"), { recursive: true });
await cp(
  path.join(source, "03_semantic_master/performance_semantic_candidates.v2.json"),
  path.join(root, "curriculum/semantic/candidates/performance-semantic-candidates-v2.json"),
);
