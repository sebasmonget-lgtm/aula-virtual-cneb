import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { retrieveKnowledgeV4 } from "./knowledge-retrieval-v4.mjs";

const DIRECT_WORKFLOWS = new Set(["annual_plan", "project", "unit", "workshop"]);

function roundRobin(results, field, limit) {
  const selected = [], seen = new Set();
  for (let position = 0; selected.length < limit && results.some((result) => position < result[field].length); position += 1) {
    for (const result of results) {
      const unit = result[field][position];
      if (unit && !seen.has(unit.id)) {
        selected.push(unit);
        seen.add(unit.id);
      }
      if (selected.length === limit) break;
    }
  }
  return selected;
}

/** A small didactic supplement for direct-generation workflows; official cards stay in curriculum. */
export async function focusedKnowledgeForDirectWorkflow({ workflow, age, competencyIds = [], request = "",
  castellanoL2Applicable = false, religionApplicable = false, applicabilityContext = {} }, knowledgeBase = null) {
  if (!DIRECT_WORKFLOWS.has(workflow)) throw new RangeError(`Workflow directo no admitido: ${workflow}`);
  const kb = knowledgeBase ?? await loadKnowledgeBaseV4();
  const ids = [...new Set(competencyIds.filter(Boolean))];
  const searches = await Promise.all((ids.length ? ids : [null]).map((id) => retrieveKnowledgeV4({
    workflow, age, confirmedCompetencyId: id, teacherRequest: String(request).slice(0, 500),
    castellanoL2Applicable, religionApplicable, applicabilityContext,
  }, kb)));
  const requirements = kb.workflows[workflow];
  const semantic = roundRobin(searches, "semanticUnits", requirements.max_semantic_units);
  const claims = roundRobin(searches, "sourceClaims", requirements.max_source_claims);
  const compact = (unit) => ({ id: unit.id, domain: unit.domain, content: unit.content,
    source_refs: unit.source_refs });
  return {
    knowledge_base_version: kb.version,
    semantic_units: semantic.map(compact),
    source_claims: claims.map(compact),
    provenance: { knowledge_unit_ids: [...semantic, ...claims].map((unit) => unit.id),
      source_refs: [...new Set([...semantic, ...claims].flatMap((unit) => unit.source_refs))].sort(),
      competency_ids: ids },
  };
}
