import test from "node:test";
import assert from "node:assert/strict";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { generateAIWorkflowV4 } from "./ai-generation-v4.mjs";
import { OpenAIProvider, OpenAIProviderError } from "./openai-provider.mjs";

const activityOutput = {
  title: "Sombras que cambian",
  purpose: "Explorar cómo cambia una sombra.",
  meaningful_situation: "El grupo quiere entender sus sombras.",
  teacher_preparation: "Prepara linternas y un espacio seguro.",
  child_actions: "Prueban, observan y comparten hallazgos.",
  mediation: "La docente pregunta según lo que observan.",
  evidence_opportunities: "Explican qué cambió y cómo lo probaron.",
  closure_or_continuity: "Comparan hallazgos y continúan otro día.",
  competency_status: "confirmed",
  competency_id: "COM_ORAL",
};

const activityInput = {
  workflow: "activity",
  age: 5,
  teacher_request: "Preparar exploración de sombras.",
  activity_purpose: "Explorar cambios de sombra.",
  competency_ids: ["COM_ORAL"],
  classroom_context: { id: "class-5", materials: ["linternas"], private_path: "/private/class" },
  evidence: { criterion_id: "criterion-1", photo_path: "/private/photo.jpg", media: "binary" },
};

function fakeClient(result) {
  const calls = [];
  return {
    calls,
    responses: {
      async create(...args) {
        calls.push(args);
        if (result instanceof Error) throw result;
        return typeof result === "function" ? result(...args) : result;
      },
    },
  };
}

function validResponse(overrides = {}) {
  return {
    id: "resp_123",
    model: "gpt-5.6-terra",
    output_text: JSON.stringify(activityOutput),
    usage: {
      input_tokens: 110,
      input_tokens_details: { cached_tokens: 12 },
      output_tokens: 55,
      total_tokens: 165,
    },
    ...overrides,
  };
}

async function generateWith(response, providerOptions = {}) {
  const client = fakeClient(response);
  const provider = new OpenAIProvider({ apiKey: "test-key", client, ...providerOptions });
  const knowledgeBase = await loadKnowledgeBaseV4();
  const result = await generateAIWorkflowV4(activityInput, { provider, knowledgeBase });
  return { client, result };
}

test("OpenAIProvider usa Responses API, el plan central y Structured Outputs strict", async () => {
  const { client, result } = await generateWith(validResponse());
  assert.equal(client.calls.length, 1);
  const [request, options] = client.calls[0];
  assert.equal(request.model, "gpt-5.6-terra");
  assert.deepEqual(request.reasoning, { effort: "low" });
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.strict, true);
  assert.equal(request.text.format.name, "activity_v1");
  assert.equal(request.text.format.schema.additionalProperties, false);
  assert.deepEqual(request.text.format.schema.required, Object.keys(activityOutput));
  assert.equal(options.timeout, 30_000);
  assert.equal(options.maxRetries, 0);
  assert.equal(result.metadata.provider, "openai");
  assert.equal(result.metadata.model, "gpt-5.6-terra");
  assert.equal(result.metadata.response_id, "resp_123");
  assert.deepEqual(result.metadata.usage, { input_tokens: 110, cached_input_tokens: 12, output_tokens: 55, total_tokens: 165 });
});

test("el cliente real queda configurado sin reintentos automáticos", () => {
  const provider = new OpenAIProvider({ apiKey: "test-key" });
  assert.equal(provider.getClient().maxRetries, 0);
});

test("OpenAIProvider envía solamente el bundle filtrado e inmutable", async () => {
  const { client } = await generateWith(validResponse());
  const requestText = client.calls[0][0].input[0].content[0].text;
  assert.doesNotMatch(requestText, /private_path|photo_path|private\/photo|binary/);
  assert.match(requestText, /AIContextBundle|activity_purpose/i);
  assert.ok(Object.isFrozen(JSON.parse(requestText)) === false);
});

test("OpenAIProvider falla antes de HTTP sin OPENAI_API_KEY", async () => {
  const client = fakeClient(validResponse());
  const provider = new OpenAIProvider({ apiKey: "", client });
  const knowledgeBase = await loadKnowledgeBaseV4();
  await assert.rejects(
    () => generateAIWorkflowV4(activityInput, { provider, knowledgeBase }),
    (error) => error instanceof OpenAIProviderError && error.reason === "api_key_missing",
  );
  assert.equal(client.calls.length, 0);
});

test("OpenAIProvider clasifica respuestas y errores controlados", async () => {
  const cases = [
    [validResponse({ output_text: "", status: "incomplete" }), "response_incomplete"],
    [validResponse({ output_text: "", output: [{ content: [{ type: "refusal", refusal: "No puedo." }] }] }), "response_refusal"],
    [validResponse({ output_text: "no es JSON" }), "structured_output_invalid"],
    [validResponse({ model: "gpt-5.6-sol" }), "model_mismatch"],
    [Object.assign(new Error("límite"), { status: 429 }), "rate_limited"],
    [Object.assign(new Error("credenciales"), { status: 401 }), "authentication_failed"],
    [Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }), "timeout"],
    [new Error("fallo desconocido"), "provider_error"],
  ];
  for (const [response, reason] of cases) {
    const client = fakeClient(response);
    const provider = new OpenAIProvider({ apiKey: "test-key", client });
    const knowledgeBase = await loadKnowledgeBaseV4();
    await assert.rejects(
      () => generateAIWorkflowV4(activityInput, { provider, knowledgeBase }),
      (error) => error instanceof OpenAIProviderError && error.reason === reason,
    );
  }
});

test("OpenAIProvider rechaza un modelo configurado que no coincide con el plan sin llamar HTTP", async () => {
  const client = fakeClient(validResponse());
  const provider = new OpenAIProvider({ apiKey: "test-key", client, model: "gpt-5.6-sol" });
  const knowledgeBase = await loadKnowledgeBaseV4();
  await assert.rejects(
    () => generateAIWorkflowV4(activityInput, { provider, knowledgeBase }),
    (error) => error instanceof OpenAIProviderError && error.reason === "model_mismatch",
  );
  assert.equal(client.calls.length, 0);
});

test("el provider no contiene modelos fijos, logs, PDFs ni llamadas externas fuera del SDK", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("./openai-provider.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /gpt-5\.6|console\.|\.pdf|fetch\(/i);
  assert.match(source, /client\.responses\.create/);
  assert.match(source, /OPENAI_API_KEY/);
});
