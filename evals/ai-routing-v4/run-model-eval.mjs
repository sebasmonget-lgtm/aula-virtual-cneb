import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { generateAIWorkflowV4 } from "../../src/lib/ai-generation-v4.mjs";
import { resolveAIExecutionPlan } from "../../src/lib/ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "../../src/lib/ai-provider-factory.mjs";
import { modelEvalFixtures } from "./fixtures.mjs";
import { assertModelEvalOptIn, buildBlindReview, evaluateAutomatedMetrics, loadPriceTable } from "./suite.mjs";

assertModelEvalOptIn();
const fixtures = await modelEvalFixtures();
const prices = await loadPriceTable();
const results = [];
for (const fixture of fixtures) {
  const plan = resolveAIExecutionPlan({ workflow: fixture.workflow, task: "generation" });
  const started = performance.now();
  try {
    const result = await generateAIWorkflowV4(fixture.input, { executionPlan: plan,
      providerFactory: (executionPlan) => createAIProviderForPlan(executionPlan, { timeoutMs: 180_000 }),
      skillInstructions: fixture.skillInstructions });
    results.push({ fixture_id: fixture.id, workflow: fixture.workflow, status: "completed", output: result.output,
      metrics: evaluateAutomatedMetrics(fixture, result, Math.round(performance.now() - started), prices) });
  } catch (error) {
    results.push({ fixture_id: fixture.id, workflow: fixture.workflow, status: "failed",
      safe_error: error?.reason ?? error?.code ?? error?.name ?? "unknown",
      metrics: { latency_ms: Math.round(performance.now() - started) } });
  }
}
const stamp = new Date().toISOString().replaceAll(":", "-");
const outputDir = join("evals", "ai-routing-v4", "results", stamp);
await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, "results.json"), `${JSON.stringify({ suite: "ai-routing-v4", created_at: new Date().toISOString(),
  price_table_version: prices?.version ?? null, results }, null, 2)}\n`);
await writeFile(join(outputDir, "blind-review.json"), `${JSON.stringify(buildBlindReview(results.filter((item) => item.status === "completed")), null, 2)}\n`);
console.log(JSON.stringify({ output_dir: outputDir, completed: results.filter((item) => item.status === "completed").length,
  failed: results.filter((item) => item.status === "failed").length }));
