import test from "node:test";
import assert from "node:assert/strict";
import { createOpenAICompetencyClassifier } from "./openai-competency-classifier.mjs";

test("Luna propone varios IDs permitidos y elimina duplicados", async () => {
  const options = [{ id: "MAT_CANTIDAD", name: "Cantidad" }, { id: "COM_ORAL", name: "Comunicación oral" }];
  const classifier = createOpenAICompetencyClassifier({ provider: { generate: async (request) => {
    assert.equal(request.execution_plan.model, "gpt-6-luna");
    assert.deepEqual(request.output_schema.properties.candidate_ids.items.enum, options.map((item) => item.id));
    assert.equal(request.ai_context_bundle.age, 5);
    return { output: { candidate_ids: ["MAT_CANTIDAD", "COM_ORAL", "MAT_CANTIDAD"] } };
  } } });
  assert.deepEqual(await classifier.classify({ observation: "Contó y explicó.", context: "Juego", age: 5, options }),
    { candidate_ids: ["MAT_CANTIDAD", "COM_ORAL"] });
});

test("un ID inventado por el modelo se rechaza", async () => {
  const classifier = createOpenAICompetencyClassifier({ provider: { generate: async () => ({ output: { candidate_ids: ["NO_EXISTE"] } }) } });
  await assert.rejects(classifier.classify({ observation: "Algo", context: "Juego", age: 5,
    options: [{ id: "MAT_CANTIDAD", name: "Cantidad" }] }), /no permitida/);
});
