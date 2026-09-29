import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { claimFinalTest, validateClosedCandidate } from "../src/current-final-test.mjs";
test("test final requiere cierre DEV y lock exclusivo antes de leer gold; no se toca test real", async () => {
  assert.throws(() => validateClosedCandidate({}), /no cerrado/);
  const candidate = { phase: "dev_closed_before_test", optimization_closed: true, final_test_runs: 1,
    arm: "CURRENT_V2_RAW", dev_gold_sha256: "test-only", source_sha256: {}, model_jev: "typesafe/jev-1.13",
    model_luna: "gpt-6-luna", dev_result_directories: ["synthetic-only"] };
  const directory = await mkdtemp(path.join(tmpdir(), "current-final-gate-")), file = path.join(directory, "lock.json");
  await claimFinalTest(file, candidate);
  await assert.rejects(claimFinalTest(file, candidate), /ya reclamado/);
  assert.throws(() => validateClosedCandidate({ ...candidate, final_test_runs: 3 }), /no cerrado/);
});
