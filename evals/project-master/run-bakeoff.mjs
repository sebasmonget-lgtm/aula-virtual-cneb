import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { projectMasterCases, sha256 } from "./cases.mjs";
import { INTEGRAL_PROJECT_SCHEMA, normalizeProjectOutput } from "./contract.mjs";
import { decideBakeoff } from "./gate.mjs";
import { generateProjectPreview, generateProjectDependents, generateProjectMaster } from "../../src/lib/project-flow-service.mjs";
import { resolveAIExecutionPlan } from "../../src/lib/ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "../../src/lib/ai-provider-factory.mjs";
import { buildProviderRequest } from "../../src/lib/ai-generation-v4.mjs";
import { focusedKnowledgeForDirectWorkflow } from "../../src/lib/ai-focused-knowledge.mjs";
import { loadLearningExperienceSkill } from "../../src/lib/learning-experience-skill.mjs";
import { loadKnowledgeBaseV4 } from "../../src/lib/knowledge-base-v4.mjs";

const PRICE = Object.freeze({ version: "openai-gpt-6-sol-standard-2026-09-28", input: 2, cached: 0.2, output: 10 });
const MODEL = "gpt-6-sol";
const plan = resolveAIExecutionPlan({ workflow: "project", task: "generation" });
if (plan.model !== MODEL || plan.reasoning_effort !== "medium") throw new Error("F2 routing changed; freeze a new experiment.");
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required; no key value is logged.");
if (process.env.AYNI_F2_LIVE_EVAL !== "1") throw new Error("Set AYNI_F2_LIVE_EVAL=1 to permit billable calls.");

const args = new Set(process.argv.slice(2));
const smoke = args.has("--smoke");
const outputDir = join(".local", "test-results", "project-master-f2", smoke ? "smoke" : "full");
await mkdir(outputDir, { recursive: true });
const outputPath = join(outputDir, "results.json");
const kb = await loadKnowledgeBaseV4();
const kbHash = sha256(kb);
const skill = await loadLearningExperienceSkill();
const schemaHash = sha256(INTEGRAL_PROJECT_SCHEMA);
const didacticByCase = new Map();
const fixtureCases = await Promise.all(projectMasterCases().map(async (item) => {
  const didactic = await focusedKnowledgeForDirectWorkflow({ workflow: "project", age: item.age,
    competencyIds: item.teacher_decisions.competency_ids, request: item.teacher_decisions.purpose,
    castellanoL2Applicable: item.classroom_context.castellano_l2_applicable }, kb);
  didacticByCase.set(item.id, didactic);
  return { ...item,
    source_hash: sha256({ proposal: item.annual_proposal, decisions: item.teacher_decisions,
      classroom: item.classroom_context, dates: item.dates, source: item.source }),
    expected_contract_hash: schemaHash,
    calendar_hash: sha256({ instructional_dates: item.dates, exception_date: item.exception_date }),
    kb_hash: kbHash, retrieval_hash: sha256(didactic) };
}));
const cases = smoke ? fixtureCases.slice(0, 1) : fixtureCases;
const frozen = { git_baseline: "f19db41", model: MODEL, reasoning_effort: "medium",
  router_version: plan.routing_policy_version, price: PRICE, schema_hash: schemaHash,
  skill_hash: sha256(skill), kb_hash: kbHash, cases_hash: sha256(cases),
  runner_hash: sha256(await readFile(new URL("./run-bakeoff.mjs", import.meta.url), "utf8")),
  contract_hash: sha256(await readFile(new URL("./contract.mjs", import.meta.url), "utf8")),
  case_generator_hash: sha256(await readFile(new URL("./cases.mjs", import.meta.url), "utf8")),
  normalizer_version: "f2-normalizer-v1", order: "case/repetition parity counterbalance" };

let state;
try { state = JSON.parse(await readFile(outputPath, "utf8")); }
catch { state = { validation_mode: "provisional_independent", frozen, cases, runs: [], reviews: [],
  adjudications: [], risk_defects: { A: 0, B: 0 } }; }
if (sha256(state.frozen) !== sha256(frozen)) throw new Error("Frozen F2 manifest changed; start a separately named experiment.");
let writeQueue = Promise.resolve();
const persist = () => {
  const snapshot = `${JSON.stringify(state, null, 2)}\n`;
  writeQueue = writeQueue.then(() => writeFile(outputPath, snapshot));
  return writeQueue;
};
await persist();

const usageCost = (usage = {}) => {
  const input = usage.input_tokens ?? 0, cached = usage.cached_input_tokens ?? 0;
  return ((input - cached) * PRICE.input + cached * PRICE.cached + (usage.output_tokens ?? 0) * PRICE.output) / 1_000_000;
};
function metadataTotals(responses) {
  return responses.reduce((total, response) => {
    const usage = response.metadata?.usage ?? response.provider_metadata?.usage ?? {};
    total.input_tokens += usage.input_tokens ?? 0;
    total.output_tokens += usage.output_tokens ?? 0;
    total.cost_usd += usageCost(usage);
    return total;
  }, { input_tokens: 0, output_tokens: 0, cost_usd: 0 });
}
function commonContext(item) {
  return { age: item.age, annual_proposal: item.annual_proposal,
    teacher_request: item.teacher_decisions.additional_context || item.annual_proposal.purpose,
    group_context: item.classroom_context.group_context,
    classroom_context: item.classroom_context, available_resources: item.classroom_context.available_resources,
    competency_ids: item.teacher_decisions.competency_ids, castellano_l2_applicable: item.classroom_context.castellano_l2_applicable,
    religion_applicable: false, project_type: "project" };
}

async function armA(item, responses) {
  const context = commonContext(item);
  const createFrozenProvider = (executionPlan, options) => {
    const provider = createAIProviderForPlan(executionPlan, options);
    return { generate: (request) => provider.generate({ ...request,
      ai_context_bundle: { ...request.ai_context_bundle,
        didactic_knowledge: didacticByCase.get(item.id) } }) };
  };
  const preview = await generateProjectPreview({ context, createProvider: createFrozenProvider }); responses.push(preview);
  const dependents = await generateProjectDependents({ context, decisions: item.teacher_decisions,
    createProvider: createFrozenProvider }); responses.push(dependents);
  const master = await generateProjectMaster({ context, decisions: item.teacher_decisions,
    dependents: dependents.output, availableDates: item.dates,
    createProvider: createFrozenProvider }); responses.push(master);
  return { preview: preview.output, dependents: dependents.output, master: master.output };
}

async function armB(item, responses) {
  const context = commonContext(item);
  const didactic = didacticByCase.get(item.id);
  const task = `En UNA respuesta prepara preview, dependents y master del mismo proyecto. Las decisiones docentes confirmadas no cambian. Incluye un criterio general para CADA competencia confirmada y exactamente una actividad por cada una de las ${item.dates.length} fechas lectivas. No inventes observaciones ni niveles. Respeta recursos, contexto, secuencia, mediación y la propuesta anual. Devuelve solo el objeto del esquema.`;
  const response = await createAIProviderForPlan(plan, { timeoutMs: 180_000 }).generate(buildProviderRequest("project",
    { ...context, task, confirmed_decisions: item.teacher_decisions,
      available_instructional_dates: item.dates, instructional_dates: item.dates,
      total_activities: item.dates.length, didactic_knowledge: didactic }, plan, INTEGRAL_PROJECT_SCHEMA, skill));
  responses.push(response);
  return response.output;
}

async function runOne(item, repetition, arm) {
  const runKey = `${item.id}:${repetition}:${arm}`;
  if (state.runs.some((row) => `${row.case_id}:${row.repetition}:${row.arm}` === runKey)) return;
  const started = performance.now();
  let responses = [], generated = null, normalized = null, errorCode = null, retries = 0;
  let unknownBilledAttempts = 0;
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      generated = arm === "A" ? await armA(item, responses) : await armB(item, responses);
      normalized = normalizeProjectOutput(item, generated, { kbVersion: kb.version,
        calendarHash: item.calendar_hash, inputHash: item.source_hash });
      break;
    } catch (error) {
      errorCode = error?.reason ?? error?.code ?? error?.name ?? "unknown";
      if (error?.code === "OPENAI_PROVIDER_ERROR") unknownBilledAttempts += 1;
      if (attempt === 0) { retries = 1; continue; }
    }
  }
  const totals = metadataTotals(responses);
  state.runs.push({ case_id: item.id, repetition, arm, status: normalized ? "valid" : "invalid",
    latency_ms: Math.round(performance.now() - started), ...totals, retries,
    unknown_billed_attempts: unknownBilledAttempts,
    safe_error: normalized ? null : String(errorCode).slice(0, 100),
    provider_version: MODEL, price_version: PRICE.version,
    prompt_hash: sha256({ arm, skill, version: "f2-prompts-v1" }), output_schema_hash: schemaHash,
    input_hash: item.source_hash, kb_hash: item.kb_hash, calendar_hash: item.calendar_hash,
    retrieval_hash: item.retrieval_hash,
    output_hash: normalized?.output_hash ?? null,
    draft: normalized?.output ?? null });
  await persist();
  process.stdout.write(`${runKey} ${normalized ? "valid" : "invalid"}\n`);
}

const jobs = cases.flatMap((item, index) => [1, 2, 3].map((repetition) => ({ item, index, repetition })));
let nextJob = 0;
const workerCount = smoke ? 1 : 12;
await Promise.all(Array.from({ length: workerCount }, async () => {
  while (nextJob < jobs.length) {
    const { item, index, repetition } = jobs[nextJob++];
    const arms = (index + repetition) % 2 ? ["A", "B"] : ["B", "A"];
    for (const arm of arms) await runOne(item, repetition, arm);
  }
}));

if (!smoke) {
  // A separate blinded review job reads this file without exposing arm labels to evaluators.
  process.stdout.write(`Generation complete: ${state.runs.length} runs; review still required.\n`);
} else process.stdout.write(`Smoke complete: ${state.runs.length} runs; no winner selected.\n`);

// Reference the gate here so changes to its export are caught before a costly run.
void decideBakeoff;
