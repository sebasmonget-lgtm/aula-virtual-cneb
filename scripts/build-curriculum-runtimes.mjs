import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd());
const master = JSON.parse(await readFile(path.join(root, "curriculum/official/initial-cycle-ii-master.json"), "utf8"));
const semanticCatalog = JSON.parse(await readFile(path.join(root, "curriculum/semantic/master/initial_cycle_ii.ai.json"), "utf8"));
await mkdir(path.join(root, "curriculum/runtime"), { recursive: true });
for (const age of master.ages) {
  const competencies = semanticCatalog.competencies.map((competency) => ({
    id: competency.id, official_name: competency.official_name, review_status: "pending",
    meaning: competency.ai_meaning, pedagogical_intent: competency.ai_meaning,
    capacities: competency.capacities.map((capacity, index) => ({ id: `${competency.id}.CAP${index + 1}`, official_name: capacity.official_name, meaning: capacity.ai_meaning })),
    cycle_standard_meaning: competency.cycle_ii_standard_ai,
    when_to_use: competency.ai_selection_hints ?? [], do_not_use_when: competency.avoid_when ?? [],
    typical_contexts: competency.ai_selection_hints ?? [], observable_actions: competency.ages[String(age)]?.observable_patterns ?? [],
    possible_evidence: [], examples: [], not_examples: [], key_signals: competency.ai_selection_hints ?? [], common_confusions: [],
    age_profile: competency.ages[String(age)], performances: []
  }));
  await writeFile(path.join(root, `curriculum/runtime/initial-${age}.ai.json`), JSON.stringify({ schema_version: 1, generated_from: ["official/initial-cycle-ii-master.json", "semantic/master/initial_cycle_ii.ai.json"], source_status: master.status, age, competencies }, null, 2) + "\n");
}
