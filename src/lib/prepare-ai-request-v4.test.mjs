import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { MissingWorkflowContextError } from "./ai-context-builder-v4.mjs";
import { prepareAIRequestV4 } from "./prepare-ai-request-v4.mjs";

test("prepareAIRequestV4 prepara un bundle v4 mediante buildAIContext", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const prepared = await prepareAIRequestV4({
    workflow: "activity",
    age: 5,
    teacher_request: "Preparar una actividad.",
    activity_purpose: "Explorar sombras.",
  }, knowledgeBase);

  assert.equal(prepared.aiContextBundle.workflow, "activity");
  assert.equal(prepared.aiContextBundle.provenance.knowledge_base_version, "4.0.0");
  assert.deepEqual(prepared.metadata, {
    workflow: "activity",
    knowledge_base_version: "4.0.0",
    knowledge_unit_count: prepared.aiContextBundle.provenance.knowledge_unit_ids.length,
    source_claim_count: prepared.aiContextBundle.provenance.source_claim_ids.length,
  });
});

test("prepareAIRequestV4 propaga MissingWorkflowContextError", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  await assert.rejects(
    () => prepareAIRequestV4({ workflow: "activity", age: 5, teacher_request: "Preparar una actividad." }, knowledgeBase),
    MissingWorkflowContextError,
  );
});

test("el punto de entrada v4 no depende de Jev, PDFs ni proveedores", async () => {
  const source = await readFile(new URL("./prepare-ai-request-v4.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /jev-decision|\.pdf|fetch\(|https?:|openai|gpt|anthropic/i);
  assert.match(source, /buildAIContext/);
});
