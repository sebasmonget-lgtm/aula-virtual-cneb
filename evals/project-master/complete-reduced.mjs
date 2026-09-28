import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { join } from "node:path";
import OpenAI from "openai";
import { OpenAIProvider } from "../../src/lib/openai-provider.mjs";
import { generateProjectPreview, generateProjectDependents, generateProjectMaster } from "../../src/lib/project-flow-service.mjs";
import { loadKnowledgeBaseV4 } from "../../src/lib/knowledge-base-v4.mjs";
import { focusedKnowledgeForDirectWorkflow } from "../../src/lib/ai-focused-knowledge.mjs";
import { normalizeProjectOutput } from "./contract.mjs";
import { sha256 } from "./cases.mjs";

const allowed = { "base-5-p4-baseline": 2, "hard-holiday": 3 };
const caseId = process.argv[2];
if (!Object.hasOwn(allowed, caseId)) throw new Error("Only the two explicitly authorized A completions may run.");
if (process.env.AYNI_F2_TWO_COMPLETIONS !== "1" || !process.env.OPENAI_API_KEY) throw new Error("Explicit live opt-in and key required.");
const dir = join(".local", "test-results", "project-master-f2", "reduced");
await mkdir(dir, { recursive: true });
const sourcePath = join(".local", "test-results", "project-master-f2", "full", "results.json");
const original = await readFile(sourcePath, "utf8"), sourceState = JSON.parse(original);
const item = sourceState.cases.find((row) => row.id === caseId), repetition = allowed[caseId];
if (!sourceState.runs.some((row) => row.case_id === caseId && row.repetition === repetition && row.arm === "B" && row.status === "valid")) throw new Error("Existing B is required.");
if (sourceState.runs.some((row) => row.case_id === caseId && row.repetition === repetition && row.arm === "A" && row.status === "valid")) throw new Error("Never repeat an existing valid A.");
const ledgerPath = join(dir, "paid-completion-ledger.json");
let ledger;
try { ledger = JSON.parse(await readFile(ledgerPath, "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw error; ledger = { budget_usd: 3, source_hash: sha256(sourceState), calls: [], steps: {}, runs: [] }; }
if (ledger.source_hash !== sha256(sourceState)) throw new Error("Source checkpoint changed.");
const save = async () => { await writeFile(`${ledgerPath}.tmp`, `${JSON.stringify(ledger, null, 2)}\n`); await rename(`${ledgerPath}.tmp`, ledgerPath); };
if (ledger.runs.some((row) => row.case_id === caseId && row.status === "valid")) { console.log("Authorized A already complete; no calls."); process.exit(0); }
const kb = await loadKnowledgeBaseV4();
if (sha256(kb) !== sourceState.frozen.kb_hash) throw new Error("KB differs from the frozen experiment.");
const didactic = await focusedKnowledgeForDirectWorkflow({ workflow: "project", age: item.age,
  competencyIds: item.teacher_decisions.competency_ids, request: item.teacher_decisions.purpose,
  castellanoL2Applicable: item.classroom_context.castellano_l2_applicable }, kb);
if (sha256(didactic) !== item.retrieval_hash) throw new Error("Retrieved context differs from existing B.");
const context = { age: item.age, annual_proposal: item.annual_proposal,
  teacher_request: item.teacher_decisions.additional_context || item.annual_proposal.purpose,
  group_context: item.classroom_context.group_context, classroom_context: item.classroom_context,
  available_resources: item.classroom_context.available_resources, competency_ids: item.teacher_decisions.competency_ids,
  castellano_l2_applicable: item.classroom_context.castellano_l2_applicable, religion_applicable: false, project_type: "project" };
const sdk = new OpenAI({ maxRetries: 0, timeout: 180_000 });
let currentStep;
const cost = (usage) => ((usage.input_tokens - (usage.input_tokens_details?.cached_tokens ?? 0)) * 2 +
  (usage.input_tokens_details?.cached_tokens ?? 0) * 0.2 + usage.output_tokens * 10) / 1_000_000;
const createProvider = (plan, options) => {
  if (plan.model !== "gpt-6-sol" || plan.reasoning_effort !== "medium") throw new Error("Frozen model changed.");
  const client = { responses: { create: async (payload, settings) => {
    const stepKey = `${caseId}:${currentStep}`;
    if (ledger.calls.some((row) => row.step_key === stepKey)) throw new Error("This paid step was already attempted; no automatic retry.");
    const max = { preview: 2048, dependents: 4096, master: 12000 }[currentStep];
    const bounded = { ...payload, max_output_tokens: max, service_tier: "default" };
    // Conservative byte bound plus framing/schema allowance; reserve unknown attempts at this full bound.
    const reserve = (Buffer.byteLength(JSON.stringify(bounded), "utf8") + 4096) * 2 / 1_000_000 + max * 10 / 1_000_000;
    const committed = ledger.calls.reduce((sum, row) => sum + (row.cost_usd ?? row.reserve_usd), 0);
    if (committed + reserve > ledger.budget_usd) throw new Error("USD 3 cumulative ceiling would be exceeded; no call made.");
    const call = { step_key: stepKey, reserve_usd: reserve, status: "attempted", max_output_tokens: max, started_at: new Date().toISOString() };
    ledger.calls.push(call); await save();
    const response = await sdk.responses.create(bounded, { ...settings, maxRetries: 0 });
    call.usage = response.usage; call.cost_usd = cost(response.usage); call.status = response.status;
    call.response_id = response.id; await save();
    return response;
  } } };
  const provider = new OpenAIProvider({ model: plan.model, client, ...options });
  return { generate: (request) => provider.generate({ ...request,
    ai_context_bundle: { ...request.ai_context_bundle, didactic_knowledge: didactic } }) };
};
const started = performance.now();
for (const step of ["preview", "dependents", "master"]) {
  const key = `${caseId}:${step}`; if (ledger.steps[key]) continue;
  currentStep = step;
  const result = step === "preview" ? await generateProjectPreview({ context, createProvider }) :
    step === "dependents" ? await generateProjectDependents({ context, decisions: item.teacher_decisions, createProvider }) :
      await generateProjectMaster({ context, decisions: item.teacher_decisions,
        dependents: ledger.steps[`${caseId}:dependents`].output, availableDates: item.dates, createProvider });
  ledger.steps[key] = result; await save(); console.log(`${caseId} ${step} checkpoint saved`);
}
const generated = Object.fromEntries(["preview", "dependents", "master"].map((step) => [step, ledger.steps[`${caseId}:${step}`].output]));
const normalized = normalizeProjectOutput(item, generated, { kbVersion: kb.version, calendarHash: item.calendar_hash, inputHash: item.source_hash });
const calls = ledger.calls.filter((row) => row.step_key.startsWith(`${caseId}:`));
ledger.runs.push({ case_id: caseId, repetition, arm: "A", status: "valid", latency_ms: Math.round(performance.now() - started),
  input_tokens: calls.reduce((sum, row) => sum + row.usage.input_tokens, 0),
  output_tokens: calls.reduce((sum, row) => sum + row.usage.output_tokens, 0),
  cost_usd: calls.reduce((sum, row) => sum + row.cost_usd, 0), retries: 0, unknown_billed_attempts: 0,
  provider_version: sourceState.frozen.model, price_version: sourceState.frozen.price.version,
  prompt_hash: sourceState.runs.find((row) => row.arm === "A").prompt_hash,
  output_schema_hash: sourceState.frozen.schema_hash, input_hash: item.source_hash,
  kb_hash: item.kb_hash, calendar_hash: item.calendar_hash, retrieval_hash: item.retrieval_hash,
  output_hash: normalized.output_hash, draft: normalized.output,
  protocol_amendment: "Two authorized A completions with output-token cap; original successes unchanged." });
await save();
if (await readFile(sourcePath, "utf8") !== original) throw new Error("Original results changed; investigate before proceeding.");
console.log(JSON.stringify({ case_id: caseId, valid: true, paid_calls: calls.length,
  cost_usd: calls.reduce((sum, row) => sum + row.cost_usd, 0), cumulative_usd: ledger.calls.reduce((sum, row) => sum + (row.cost_usd ?? row.reserve_usd), 0) }));
