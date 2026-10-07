import { readFile, writeFile } from "node:fs/promises";
import { projectConversation } from "../../src/lib/project-conversation.mjs";
import { withAIQATrace, recordAIQAResult } from "../../src/lib/ai-qa-trace.mjs";

if (!process.argv.includes("--real") || process.env.VERCEL_ENV === "production") throw new Error("Explicit fictional nonproduction QA only");
process.env.AYNI_AI_QA_TRACE = "1";
const outputDir = ".local/modern-ai-qa";
const results = JSON.parse(await readFile(`${outputDir}/results.json`, "utf8"));
await withAIQATrace({ fixtureId: "six_children_project_conversation", synthetic: true, outputDir }, async traces => {
  const result = await projectConversation({ card: results.annual.proposed_experiences[2],
    knownContext: "Tenemos semillas, papel, bloques y lupas del aula. No pediremos compras.", names: ["Alba", "Bruno"],
    messages: [{ role: "teacher", text: "Alba usará una mesa con sus compañeros; podemos organizar grupos pequeños.",
      source_turn: "fictional_turn_1", support_text: "Alba usará una mesa con sus compañeros; podemos organizar grupos pequeños." }] });
  await recordAIQAResult("project_conversation", result, { validators: ["privacy", "single_question", "turn_limit"], downstream: ["project_master"] });
  await writeFile(`${outputDir}/project-conversation-results.json`, JSON.stringify(result, null, 2));
  console.info(JSON.stringify({ status: "PASS", synthetic: true, calls: traces.length, model: result.metadata.model,
    effort: result.metadata.reasoning_effort, cost_usd: traces[0].cost_usd, latency_ms: traces[0].latency_ms }));
});
