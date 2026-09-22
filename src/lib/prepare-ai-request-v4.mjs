import { buildAIContext } from "./ai-context-builder-v4.mjs";

/**
 * Sole neutral entry point for a future AI provider integration.
 * It only prepares the versioned, workflow-scoped bundle.
 */
export async function prepareAIRequestV4(input, knowledgeBase) {
  const aiContextBundle = await buildAIContext(input, knowledgeBase);
  return {
    aiContextBundle,
    metadata: {
      workflow: aiContextBundle.workflow,
      knowledge_base_version: aiContextBundle.provenance.knowledge_base_version,
      knowledge_unit_count: aiContextBundle.provenance.knowledge_unit_ids.length,
      source_claim_count: aiContextBundle.provenance.source_claim_ids.length,
    },
  };
}
