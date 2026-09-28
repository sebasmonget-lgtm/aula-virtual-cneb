import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("captura conserva cabecera y acciones visibles con criterio extenso", async () => {
  const source = await readFile(new URL("../features/dashboard/components/teacher-workspace.tsx", import.meta.url), "utf8");
  const dialog = source.slice(source.indexOf("function EvidenceDialog("), source.indexOf("function EvaluationArea("));
  assert.match(dialog, /<DialogContent className="[^"]*flex[^"]*max-h-\[90dvh\][^"]*flex-col[^"]*overflow-hidden/);
  assert.match(dialog, /<DialogHeader className="[^"]*shrink-0/);
  assert.match(dialog, /<div className="[^"]*min-h-0[^"]*overflow-y-auto/);
  assert.match(dialog, /<DialogFooter className="[^"]*shrink-0/);
  assert.match(dialog, /saveEvidence\(true\)/);
  assert.match(dialog, /saveEvidence\(\)/);
});
