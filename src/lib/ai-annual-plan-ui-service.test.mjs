import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AnnualPlanGenerationUIError,
  buildAnnualPlanGenerationInput,
  generateTeacherAnnualPlan,
  teacherMessageForAnnualPlanGenerationError,
} from "./ai-annual-plan-ui-service.mjs";

const classroom = {
  id: "classroom-test",
  age: 5,
  group_context: "Grupo ficticio de cinco años",
  school_context: "Jardín ficticio",
  calendar: { school_year: 2026, starts_on: "2026-03-01", ends_on: "2026-12-15" },
};

test("el plan anual usa su propio mensaje y clasifica contexto faltante", () => {
  assert.throws(
    () => buildAnnualPlanGenerationInput({ classroom: { ...classroom, calendar: null } }),
    (error) => error instanceof AnnualPlanGenerationUIError && error.reason === "missing_annual_context",
  );
  for (const reason of ["timeout", "proposal_invalid", "provider_error", "unknown"]) {
    const message = teacherMessageForAnnualPlanGenerationError(reason);
    assert.match(message, /plan anual|propuesta anual/i);
    assert.doesNotMatch(message, /actividad/i);
  }
});

test("una generación anual usa un solo provider mock con plazo explícito", async () => {
  const calls = [];
  const plan = { workflow: "annual_plan", provider: "openai", model: "modelo-de-prueba", reasoning_effort: "medium" };
  const result = await generateTeacherAnnualPlan({
    classroom,
    request: {},
    resolvePlan: () => plan,
    createProvider: (executionPlan, options) => { calls.push({ executionPlan, options }); return { id: "mock" }; },
    generate: async (input, options) => {
      assert.equal(input.workflow, "annual_plan");
      assert.equal(options.executionPlan, plan);
      assert.equal(options.provider.id, "mock");
      return { output: { title: "Plan ficticio" }, metadata: { workflow: "annual_plan", model: plan.model, response_id: "test", usage: null }, provenance: {} };
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.timeoutMs, 90_000);
  assert.equal(result.proposal.title, "Plan ficticio");
});

test("un error de modelo conserva una categoría segura sin filtrar mensajes técnicos", async () => {
  for (const [reason, expected] of [["timeout", "timeout"], ["annual_plan_competency_outside_bundle", "proposal_invalid"], ["unexpected_secret_detail", "unknown"]]) {
    await assert.rejects(
      generateTeacherAnnualPlan({
        classroom,
        request: {},
        resolvePlan: () => ({ workflow: "annual_plan" }),
        createProvider: () => ({ id: "mock" }),
        generate: async () => { throw Object.assign(new Error("detalle técnico privado"), { reason }); },
      }),
      (error) => error instanceof AnnualPlanGenerationUIError && error.reason === expected && !error.message.includes("detalle técnico privado"),
    );
  }
});

test("servidor y pantalla conservan motivo seguro y espera visible sin llamar al modelo", async () => {
  const server = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  const screen = await readFile(new URL("../features/dashboard/components/annual-plan-generator.tsx", import.meta.url), "utf8");
  const route = server.slice(server.indexOf('url.pathname === "/api/ai/annual-plan/generate"'), server.indexOf('url.pathname === "/api/annual-plans"'));
  assert.match(route, /reason: error\?\.reason \?\? "unknown"/);
  assert.match(screen, /Puede tardar hasta un minuto y medio/);
  assert.match(screen, /No se pudo conectar con el servidor local/);
});
