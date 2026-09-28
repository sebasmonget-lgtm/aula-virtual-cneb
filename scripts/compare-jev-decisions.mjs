import { readFile } from "node:fs/promises";
import { applicableCompetencyCards } from "../src/lib/competency-applicability.mjs";
import { buildClassifierOptions, createOpenAICompetencyClassifier } from "../src/lib/openai-competency-classifier.mjs";
import { anonymousDecisionText, createJevCompetencySuggester } from "../src/lib/jev-competency-suggestion.mjs";
import { validateExpertDecisionCase, summarizeDecisionComparison } from "../src/lib/jev-expert-evaluation.mjs";
import { loadKnowledgeBaseV4 } from "../src/lib/knowledge-base-v4.mjs";
import { resolveAIExecutionPlan } from "../src/lib/ai-execution-router-v4.mjs";

const filename = process.argv[2];
if (!filename) throw new Error("Uso: node --env-file-if-exists=.env.local scripts/compare-jev-decisions.mjs <casos-expertos.jsonl>");
if (!process.env.OPENROUTER_API_KEY || !process.env.OPENAI_API_KEY)
  throw new Error("La comparación requiere OPENROUTER_API_KEY y OPENAI_API_KEY solo en el backend.");

const kb = await loadKnowledgeBaseV4();
const cases = (await readFile(filename, "utf8")).split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
if (!cases.length) throw new Error("No hay casos expertos para comparar.");
const baseline = createOpenAICompetencyClassifier();
const jev = createJevCompetencySuggester();
const results = [], effectiveModels = new Set();
let currentMs = 0, jevMs = 0, jevCost = 0, costMissing = false;
for (const item of cases) {
  const cards = applicableCompetencyCards(kb.competencyCards, item.age, {
    castellanoL2Applicable: item.applicability?.castellano_l2 === true,
    religionApplicable: item.applicability?.religion === true });
  const options = buildClassifierOptions(kb.competencyCards, item.age, cards.map((card) => card.id));
  validateExpertDecisionCase(item, options.map((option) => option.id));
  const anonymous = anonymousDecisionText(item.observation);
  if (!anonymous) throw new Error(`El caso ${item.id} necesita anonimización antes de comparar.`);
  const startCurrent = performance.now();
  const current = await baseline.classify({ observation: anonymous, context: "", age: item.age, options });
  currentMs += performance.now() - startCurrent;
  const startJev = performance.now();
  const suggested = await jev.classify({ observation: anonymous, age: item.age, options });
  jevMs += performance.now() - startJev;
  const metadata = suggested.decision_metadata;
  if (metadata?.model_effective) effectiveModels.add(metadata.model_effective);
  if (metadata?.usage?.cost_usd == null) costMissing = true;
  else jevCost += metadata.usage.cost_usd;
  results.push({ expected: item.adjudicated_competency_ids, current: current.candidate_ids, jev: suggested.candidate_ids });
}
const report = { kb_version: kb.version, jev_models_effective: [...effectiveModels],
  current_model: resolveAIExecutionPlan({ workflow: "observation_competency_suggestion", task: "generation" }).model,
  ...summarizeDecisionComparison(results), current_mean_latency_ms: Math.round(currentMs / cases.length),
  jev_mean_latency_ms: Math.round(jevMs / cases.length), jev_total_cost_usd: costMissing ? null : jevCost };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
