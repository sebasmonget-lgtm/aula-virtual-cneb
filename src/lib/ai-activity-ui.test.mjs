import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("la UI de activity muestra propuesta editable, revisión y descarte sin detalles técnicos", async () => {
  const source = await readFile(new URL("../features/dashboard/components/ai-activity-generator.tsx", import.meta.url), "utf8");
  for (const label of ["Generar actividad con IA", "Preparando tu actividad...", "Propuesta generada con IA", "Revisar y guardar", "Descartar", "Regenerar posteriormente"]) assert.match(source, new RegExp(label));
  for (const field of ["meaningful_situation", "teacher_preparation", "child_actions", "mediation", "evidence_opportunities", "closure_or_continuity"]) assert.match(source, new RegExp(field));
  assert.doesNotMatch(source, /OPENAI_API_KEY|OpenAIProvider|api\.openai\.com|input_tokens|response_id|reasoning_effort/);
});

test("el cliente solo llama al backend local y el backend mantiene la generación en servidor", async () => {
  const client = await readFile(new URL("./ai-activity-client.ts", import.meta.url), "utf8");
  const server = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  assert.match(client, /\/api\/ai\/activity\/generate/);
  assert.doesNotMatch(client, /OPENAI_API_KEY|OpenAIProvider|api\.openai\.com/);
  assert.match(server, /generateTeacherActivity/);
  assert.match(server, /generated\.proposal/);
  assert.doesNotMatch(server.match(/send\(response, 200, \{ proposal: generated\.proposal \}, origin\)/)?.[0] ?? "", /metadata|provenance|usage/);
});

test("la pantalla Planificar usa Activities parent-aware y no el prototipo aislado", async () => {
  const source = await readFile(new URL("../features/dashboard/components/teacher-workspace.tsx", import.meta.url), "utf8");
  const activityScreen = await readFile(new URL("../features/dashboard/components/parent-activity-generator.tsx", import.meta.url), "utf8");
  assert.match(source, /active === "Planificar"/);
  assert.match(source, /ParentActivityGenerator/);
  assert.match(activityScreen, /¿En qué experiencia trabajarás\?/);
  assert.match(activityScreen, /Prepara la próxima actividad/);
  assert.match(activityScreen, /\/api\/activities\?experienceId=/);
});

test("reabrir y regenerar un draft conserva el ID y reinicia el estado de edición", async () => {
  const source = await readFile(new URL("../features/dashboard/components/parent-activity-generator.tsx", import.meta.url), "utf8");
  assert.match(source, /setPurpose\(activity\.details\.purpose\)/);
  assert.match(source, /setCompetencyId\(activity\.details\.competency_id \?\? ""\)/);
  assert.match(source, /setContext\(""\)/);
  assert.match(source, /generationId, materials/);
  assert.match(source, /setGenerationId\(data\.generation_id \?\? null\)/);
  assert.match(source, /setGenerationId\(null\)/);
});
