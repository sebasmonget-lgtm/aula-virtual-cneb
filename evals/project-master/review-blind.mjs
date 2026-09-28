import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { sha256 } from "./cases.mjs";
import { decideBakeoff } from "./gate.mjs";
import { resolveAIExecutionPlan } from "../../src/lib/ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "../../src/lib/ai-provider-factory.mjs";
import { buildProviderRequest } from "../../src/lib/ai-generation-v4.mjs";
import { loadKnowledgeBaseV4 } from "../../src/lib/knowledge-base-v4.mjs";

if (process.env.AYNI_F2_LIVE_EVAL !== "1" || !process.env.OPENAI_API_KEY)
  throw new Error("F2 blind review requires explicit live opt-in and a server-side OpenAI key.");
const smoke = process.argv.includes("--smoke");
const resultPath = join(".local", "test-results", "project-master-f2", smoke ? "smoke" : "full", "results.json");
const state = JSON.parse(await readFile(resultPath, "utf8"));
const kb = await loadKnowledgeBaseV4();
const plan = resolveAIExecutionPlan({ workflow: "project", task: "generation" });
if (plan.model !== "gpt-6-sol" || plan.reasoning_effort !== "medium") throw new Error("Evaluator model changed.");
const score = { type: "integer", minimum: 0, maximum: 4 };
const schema = { id: "project_master_f2_blind_rubric_v1", type: "object", additionalProperties: false,
  required: ["coherence", "curriculum", "evidence_links", "calendar", "mediation", "edit_fidelity",
    "serious_curricular_veto", "teacher_edit_count", "teacher_edit_minutes", "caution"],
  properties: { coherence: score, curriculum: score, evidence_links: score, calendar: score,
    mediation: score, edit_fidelity: score, serious_curricular_veto: { type: "boolean" },
    teacher_edit_count: { type: "integer", minimum: 0 }, teacher_edit_minutes: { type: "integer", minimum: 0 },
    caution: { type: "string" } } };

const provider = createAIProviderForPlan(plan, { timeoutMs: 180_000 });
const cases = new Map(state.cases.map((item) => [item.id, item]));
let writeQueue = Promise.resolve();
const save = () => {
  const snapshot = `${JSON.stringify(state, null, 2)}\n`;
  writeQueue = writeQueue.then(() => writeFile(resultPath, snapshot));
  return writeQueue;
};
const key = (run) => `${run.case_id}:${run.repetition}:${run.arm}`;

const reviewOne = async (run) => {
  const item = cases.get(run.case_id);
  for (const reviewerId of ["independent-1", "independent-2"]) {
    const runKey = key(run);
    if (state.reviews.some((review) => review.run_key === runKey && review.reviewer_id === reviewerId)) continue;
    const blindedId = sha256(`${runKey}:blind`).slice(0, 24);
    const input = { task: "Puntúa de manera independiente este proyecto anónimo, sin conocer el método que lo generó. No inventes datos.",
      rubric: { score_range: "0–4", coherence: "Coherencia situación, propósito y progresión",
        curriculum: "Competencias y criterios CNEB aplicables; veto por ID inaplicable o criterio incompatible",
        evidence_links: "Evidencia observable y vínculos criterio/competencia/actividad; veto si roto",
        calendar: "Un día lectivo por fila, sin omisiones ni duplicados; veto si incorrecto",
        mediation: "Preguntas, mediación, recursos y adaptación al contexto",
        edit_fidelity: "Claridad, fidelidad docente y facilidad de edición" },
      case: { age: item.age, period: item.period, context: item.classroom_context,
        proposal: item.annual_proposal, confirmed_decisions: item.teacher_decisions,
        instructional_dates: item.dates, noninstructional_exception: item.exception_date,
        expected_outcome: item.expected_outcome },
      curriculum_reference: kb.competencyCards.filter((card) => item.teacher_decisions.competency_ids.includes(card.id))
        .map((card) => ({ id: card.id, official_name: card.official_name, ai_meaning: card.ai_meaning,
          age_reference: card.ages?.[String(item.age)], avoid_when: card.avoid_when,
          possible_evidence: card.possible_evidence })),
      project: run.draft,
      caution: "teacher_edit_count y teacher_edit_minutes son estimaciones del evaluador, NO mediciones reales de una docente." };
    try {
      const response = await provider.generate(buildProviderRequest("project", input, plan, schema,
        "Evaluación ciega independiente. No conoces la rama. Usa únicamente los insumos, la rúbrica y las referencias curriculares suministradas. El estimado de edición no sustituye una prueba docente real."));
      const output = response.output;
      state.reviews.push({ run_key: runKey, reviewer_id: reviewerId, reviewer_kind: "independent_ai",
        evaluator_run_id: response.provider_metadata?.response_id ?? randomUUID(), blinded_output_id: blindedId,
        visible_arm: "hidden", scores: Object.fromEntries(
          ["coherence", "curriculum", "evidence_links", "calendar", "mediation", "edit_fidelity"]
            .map((dimension) => [dimension, output[dimension]])),
        serious_curricular_veto: output.serious_curricular_veto,
        teacher_edit_count: output.teacher_edit_count, teacher_edit_minutes: output.teacher_edit_minutes,
        caution: output.caution,
        evaluator_usage: response.provider_metadata?.usage ?? null });
      await save();
      process.stdout.write(`${blindedId} ${reviewerId} reviewed\n`);
    } catch (error) {
      process.stdout.write(`${blindedId} ${reviewerId} failed: ${error?.reason ?? error?.name ?? "unknown"}\n`);
    }
  }
};
const reviewJobs = state.runs.filter((item) => item.status === "valid");
let nextReview = 0;
await Promise.all(Array.from({ length: smoke ? 3 : 12 }, async () => {
  while (nextReview < reviewJobs.length) await reviewOne(reviewJobs[nextReview++]);
}));

for (const run of state.runs.filter((item) => item.status === "valid")) {
  const runKey = key(run);
  if (state.adjudications.some((item) => item.run_key === runKey)) continue;
  const pair = state.reviews.filter((item) => item.run_key === runKey);
  if (pair.length !== 2) continue;
  if (Object.keys(pair[0].scores).some((dimension) => pair[0].scores[dimension] !== pair[1].scores[dimension]) ||
      pair[0].serious_curricular_veto !== pair[1].serious_curricular_veto)
    state.adjudications.push({ run_key: runKey, method: "provisional_arithmetic_mean_and_conservative_veto",
      scores: Object.fromEntries(Object.keys(pair[0].scores).map((dimension) =>
        [dimension, (pair[0].scores[dimension] + pair[1].scores[dimension]) / 2])),
      serious_curricular_veto: pair.some((item) => item.serious_curricular_veto) });
}
await save();
if (!smoke && state.runs.length === 216) {
  try {
    const result = decideBakeoff(state);
    await writeFile(join(".local", "test-results", "project-master-f2", "full", "decision.json"),
      `${JSON.stringify({ ...result, A: { ...result.A, reviewed: undefined },
        B: { ...result.B, reviewed: undefined } }, null, 2)}\n`);
    process.stdout.write(`Provisional decision: ${result.winner ?? "neither"}; human validation pending.\n`);
  } catch (error) { process.stdout.write(`Decision pending: ${error.message}\n`); }
}
