import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { reducedExperiment } from "./reduced.mjs";
import { loadKnowledgeBaseV4 } from "../../src/lib/knowledge-base-v4.mjs";
const source = join(".local", "test-results", "project-master-f2", "full", "results.json");
const original = await readFile(source, "utf8");
const state = JSON.parse(original);
let completions = [];
try { completions = JSON.parse(await readFile(join(".local", "test-results", "project-master-f2", "reduced", "paid-completion-ledger.json"), "utf8")).runs; }
catch (error) { if (error.code !== "ENOENT") throw error; }
const { report, bundles } = reducedExperiment({ ...state, runs: [...state.runs, ...completions] });
report.original_valid_preserved = state.runs.filter((row) => row.status === "valid").length;
report.authorized_new_completions = completions.length;
report.additional_spent_usd = completions.reduce((sum, row) => sum + row.cost_usd, 0);
report.reviews_status = "pending_two_masked_current_agent_passes_not_independent";
const kb = await loadKnowledgeBaseV4();
for (const bundle of bundles) bundle.curriculum_reference = kb.competencyCards
  .filter((card) => bundle.case.decisions.competency_ids.includes(card.id))
  .map((card) => ({ id: card.id, name: card.official_name, ai_meaning: card.ai_meaning,
    age_reference: card.ages?.[String(bundle.case.age)], avoid_when: card.avoid_when }));
const dir = join(".local", "test-results", "project-master-f2", "reduced");
await mkdir(dir, { recursive: true });
await writeFile(join(dir, "protocol-and-metrics.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(join(dir, "blind-bundles.json"), `${JSON.stringify(bundles, null, 2)}\n`);
if (await readFile(source, "utf8") !== original) throw new Error("Source changed during read-only selection.");
console.log(JSON.stringify(report, null, 2));
