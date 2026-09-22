import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readJson = (relativePath) => readFile(new URL(relativePath, import.meta.url), "utf8").then(JSON.parse);

test("Knowledge Pack v2 enriquece semántica sin elevar autoridad oficial", async () => {
  const semantic = await readJson("../../curriculum/semantic/master/initial_cycle_ii.ai.json");
  const candidates = await readJson("../../curriculum/semantic/candidates/performance-semantic-candidates-v2.json");
  assert.equal(semantic.knowledge_pack.id, "CNEB_Inicial_AI_KnowledgePack_v2");
  assert.equal(semantic.competencies.length, 14);
  assert.equal(candidates.length, 140);
  for (const competency of semantic.competencies) {
    assert.equal(competency.official_review_status, "pending");
    assert.equal(competency.semantic_review_status, "pending");
    assert.ok(competency.examples.length && competency.not_examples.length && competency.common_confusions.length);
  }
  for (const candidate of candidates) {
    assert.equal(candidate.official_performance_id, null);
    assert.equal(candidate.official_mapping_status, "pending");
  }
});
