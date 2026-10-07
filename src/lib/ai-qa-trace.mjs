import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { estimateTextCost } from "./ai-usage-service.mjs";

const scope = new AsyncLocalStorage();
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** The flag alone never traces a teacher request. Only an explicit synthetic harness can opt in. */
export async function withAIQATrace({ fixtureId, synthetic, outputDir }, action) {
  if (process.env.AYNI_AI_QA_TRACE !== "1") return action([]);
  if (synthetic !== true || !/^[a-z0-9_-]{1,80}$/i.test(fixtureId ?? "") || process.env.VERCEL_ENV === "production")
    throw new Error("La traza de QA requiere una fixture ficticia fuera de Production.");
  const state = { fixtureId, outputDir, traces: [] };
  return scope.run(state, () => action(state.traces));
}

async function save(state, trace) {
  if (!state.outputDir) return;
  await mkdir(state.outputDir, { recursive: true });
  await writeFile(`${state.outputDir}/${state.fixtureId}-${trace.index}.json`, JSON.stringify(trace, null, 2));
}

export async function beginAIQATrace(request, effectivePayload, resumeResponseId = null) {
  const state = scope.getStore();
  if (!state) return null;
  const prior = resumeResponseId && state.traces.find(trace => trace.openai_response_id === resumeResponseId);
  if (prior) { prior.poll_count = (prior.poll_count ?? 0) + 1; return prior; }
  const trace = { index: state.traces.length + 1, fixture_id: state.fixtureId, workflow: request.workflow,
    stage: request.ai_context_bundle?.task ?? request.workflow,
    sources: request.ai_context_bundle?.provenance ?? request.ai_context_bundle?.classroom?.facts ?? [],
    effective_input: structuredClone(effectivePayload ?? request.ai_context_bundle),
    prompt: { hash: hash(effectivePayload?.instructions ?? request.skill_instructions), version: "ayni-corrected-20261007" },
    model: request.execution_plan.model, reasoning_effort: request.execution_plan.reasoning_effort,
    validation: [], teacher_visible_result: null, downstream: [], started_at: Date.now() };
  state.traces.push(trace); await save(state, trace); return trace;
}

export async function endAIQATrace(trace, result, error = null) {
  const state = scope.getStore(); if (!state || !trace) return;
  const usage = result?.provider_metadata?.usage;
  Object.assign(trace, { raw_structured_output: result?.output ?? null, error: error ? error.reason ?? error.name : null,
    latency_ms: Date.now() - trace.started_at, usage: usage ?? null,
    cost_usd: estimateTextCost({ model: result?.provider_metadata?.model ?? trace.model,
      inputTokens: usage?.input_tokens, cachedInputTokens: usage?.cached_input_tokens ?? 0, outputTokens: usage?.output_tokens }),
    fallback: result?.provider_metadata?.fallback_used ?? false });
  await save(state, trace);
}

export async function recordAIQAResult(workflow, result, { validators = [], passed = true, downstream = [] } = {}) {
  const state = scope.getStore(); if (!state) return;
  const trace = state.traces.findLast(item => item.workflow === workflow); if (!trace) return;
  trace.validation = validators.map(name => ({ name, result: passed ? "PASS" : "FAIL" }));
  trace.teacher_visible_result = structuredClone(result); trace.downstream = downstream;
  await save(state, trace);
}

/** Also supports providers simulated by the QA harness. */
export function traceQAProvider(provider) {
  return { generate: async request => {
    const trace = await beginAIQATrace(request);
    try { const result = await provider.generate(request); await endAIQATrace(trace, result); return result; }
    catch (error) { await endAIQATrace(trace, null, error); throw error; }
  } };
}
