import test from "node:test";
import assert from "node:assert/strict";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { generateAIWorkflowV4 } from "./ai-generation-v4.mjs";
import { OpenAIProvider, OpenAIProviderError,openAISchemaName } from "./openai-provider.mjs";
import OpenAI from 'openai';

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

test('nombres largos de esquema respetan 64 caracteres y conservan distinción estable',()=>{
 assert.equal(openAISchemaName('activity-v1'),'activity_v1');
 const id='ayni-documents-project-and-first-activity-v20-protected-v30-keyed-v35';
 const name=openAISchemaName(id);assert.equal(name.length,64);assert.match(name,/^[A-Za-z0-9_]+$/);assert.equal(openAISchemaName(id),name);assert.notEqual(openAISchemaName(id+'-otro'),name);
});

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
    model: "gpt-6-luna",
    output_text: JSON.stringify(activityOutput),
    usage: {
      input_tokens: 110,
      input_tokens_details: { cached_tokens: 12, cache_write_tokens: 80 },
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
  assert.equal(request.model, "gpt-6-luna");
  assert.deepEqual(request.reasoning, { effort: "medium" });
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.strict, true);
  assert.equal(request.text.format.name, "activity_v1");
  assert.equal(request.text.format.schema.additionalProperties, false);
  assert.deepEqual(request.text.format.schema.required, Object.keys(activityOutput));
  assert.equal(options.timeout, 30_000);
  assert.equal(options.maxRetries, 0);
  assert.equal(result.metadata.provider, "openai");
  assert.equal(result.metadata.model, "gpt-6-luna");
  assert.equal(result.metadata.response_id, "resp_123");
  assert.deepEqual(result.metadata.usage, { input_tokens: 110, cached_input_tokens: 12, cache_write_tokens: 80, output_tokens: 55, total_tokens: 165 });
});

test("OpenAIProvider coloca la Skill en instrucciones y conserva el bundle como dato", async () => {
  const client = fakeClient(validResponse({ model: "gpt-6-sol" }));
  const provider = new OpenAIProvider({ apiKey: "test-key", client });
  const generated=await provider.generate({
    execution_plan: { provider: "openai", model: "gpt-6-sol", reasoning_effort: "high" },
    output_schema: { id: "annual-plan-v2", type: "object", properties: {}, required: [], additionalProperties: false },
    ai_context_bundle: { context: { classroom: "Grupo de prueba" } },
    skill_instructions: "Skill crear-plan-anual: usa las fuentes confirmadas.",
  });
  const request = client.calls[0][0];
  assert.ok(Number.isFinite(generated.provider_metadata.duration_ms)&&generated.provider_metadata.duration_ms>=0);
  assert.deepEqual(request.reasoning, { effort: "high" });
  assert.match(request.instructions, /Skill crear-plan-anual/);
  assert.doesNotMatch(request.input[0].content[0].text, /Skill crear-plan-anual/);
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
    [validResponse({ model: "gpt-6-sol" }), "model_mismatch"],
    [Object.assign(new Error("límite"), { status: 429 }), "rate_limited"],
    [Object.assign(new Error("credenciales"), { status: 401 }), "authentication_failed"],
    [Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }), "timeout"],
    [Object.assign(new Error("request aborted"), { cause: Object.assign(new Error("aborted"), { name: "AbortError" }) }), "timeout"],
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
  const provider = new OpenAIProvider({ apiKey: "test-key", client, model: "gpt-6-sol" });
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
  assert.match(source, /resolveTextConnection/);
  const connection = await readFile(new URL("./ai-text-connection.mjs", import.meta.url), "utf8");
  assert.match(connection, /OPENAI_API_KEY/);
  assert.doesNotMatch(connection, /NEXT_PUBLIC_|console\.|fetch\(/);
});


test("background guarda el ID y polling recupera sin crear otra generación",async()=>{
 let created=0,retrieved=0,savedId;
 const client={responses:{create:async payload=>{created++;assert.equal(payload.background,true);assert.equal(payload.store,false);return{id:"resp_fictional_background",status:"queued"};},retrieve:async id=>{retrieved++;assert.equal(id,savedId);return validResponse();}}};
 const pending=new OpenAIProvider({apiKey:"test-key",client,background:true,onResponseStarted:async id=>{savedId=id;}});
 const kb=await loadKnowledgeBaseV4();
 await assert.rejects(()=>generateAIWorkflowV4(activityInput,{provider:pending,knowledgeBase:kb}),error=>error.reason==="response_pending");
 const resumed=new OpenAIProvider({apiKey:"test-key",client,background:true,resumeResponseId:savedId});
 const result=await generateAIWorkflowV4(activityInput,{provider:resumed,knowledgeBase:kb});
 assert.equal(result.output.title,activityOutput.title);assert.equal(created,1);assert.equal(retrieved,1);
});

test("una respuesta background expirada no genera automáticamente",async()=>{
 let created=0;
 const provider=new OpenAIProvider({apiKey:"test-key",background:true,resumeResponseId:"resp_fictional_expired",client:{responses:{create:async()=>{created++;},retrieve:async()=>{throw Object.assign(new Error("Missing"),{status:404});}}}});
 await assert.rejects(async()=>generateAIWorkflowV4(activityInput,{provider,knowledgeBase:await loadKnowledgeBaseV4()}),error=>error.reason==="response_expired");assert.equal(created,0);
});

test("known exhausted balance is a terminal cause, including background responses",async()=>{
 const kb=await loadKnowledgeBaseV4();
 for(const background of [false,true]){
   const responses=background?{retrieve:async()=>({id:'resp_known_quota',status:'failed',error:{code:'credit_balance_exhausted'}})}:{create:async()=>{throw Object.assign(new Error('Quota'),{status:429,code:'insufficient_quota'});}};
   const provider=new OpenAIProvider({apiKey:'test-key',background,resumeResponseId:background?'resp_known_quota':null,client:{responses}});
   await assert.rejects(()=>generateAIWorkflowV4(activityInput,{provider,knowledgeBase:kb}),error=>error.reason==='insufficient_quota');
 }
});

test('streaming interno espera la respuesta final y mantiene esquema, privacidad y cero reintentos',async()=>{
 const kb=await loadKnowledgeBaseV4();let streams=0,created=0;
 const client={responses:{create:async()=>{created++;throw new Error('No debe generar otra respuesta.');},stream:(payload,options)=>{
  streams++;assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);
  assert.equal(options.maxRetries,0);assert.equal(options.timeout,600000);assert.ok(options.signal instanceof AbortSignal);
  return {finalResponse:async()=>validResponse({status:'completed'})};
 }}};
 const provider=new OpenAIProvider({apiKey:'synthetic-key',client,store:false,streamResponse:true,timeoutMs:600000});
 const result=await generateAIWorkflowV4(activityInput,{provider,knowledgeBase:kb});
 assert.equal(result.output.title,activityOutput.title);assert.equal(streams,1);assert.equal(created,0);
});

test('un stream cortado o incompleto no se presenta como propuesta válida ni vuelve a generar',async()=>{
 const kb=await loadKnowledgeBaseV4();let calls=0;
 for(const [response,reason]of [[validResponse({status:'in_progress'}),'response_pending'],[validResponse({status:'incomplete'}),'response_incomplete'],[Object.assign(new Error('Private connection failure'),{code:'ETIMEDOUT'}),'timeout']]){
  const provider=new OpenAIProvider({apiKey:'synthetic-key',store:false,streamResponse:true,client:{responses:{stream:()=>{calls++;return{finalResponse:async()=>{if(response instanceof Error)throw response;return response;}};}}}});
  await assert.rejects(generateAIWorkflowV4(activityInput,{provider,knowledgeBase:kb}),error=>error.reason===reason);
 }
 assert.equal(calls,3,'Un intento por caso; no hay reintentos ni cambio a otra generación.');
});

test('el SDK instalado reconstruye una respuesta SSE completa antes de validar el JSON',async()=>{
 let requests=0;
 const full={...validResponse({status:'completed'}),object:'response',output:[{type:'message',id:'msg_synthetic',status:'completed',role:'assistant',content:[{type:'output_text',text:JSON.stringify(activityOutput),annotations:[]}]}]};
 const events=[{type:'response.created',sequence_number:0,response:{...full,status:'in_progress',output:[],output_text:''}},{type:'response.completed',sequence_number:1,response:full}];
 const client=new OpenAI({apiKey:'synthetic-key',maxRetries:0,fetch:async(_url,options)=>{
  requests++;const body=JSON.parse(options.body);assert.equal(body.stream,true);assert.equal(body.store,false);
  return new Response(events.map(event=>`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(''),{headers:{'content-type':'text/event-stream'}});
 }});
 const provider=new OpenAIProvider({apiKey:'synthetic-key',client,store:false,streamResponse:true});
 const result=await generateAIWorkflowV4(activityInput,{provider,knowledgeBase:await loadKnowledgeBaseV4()});
 assert.equal(result.output.title,activityOutput.title);assert.equal(requests,1);
});
