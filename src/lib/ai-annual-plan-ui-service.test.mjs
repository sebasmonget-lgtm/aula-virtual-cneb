import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AnnualPlanGenerationUIError,
  buildAnnualPlanGenerationInput,
  generateTeacherAnnualPlan,
  teacherMessageForAnnualPlanGenerationError,
} from "./ai-annual-plan-ui-service.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { defaultInitialStage, nationalCalendarBlocks2026 } from "./annual-plan-calendar.mjs";

const classroom = {
  id: "classroom-test",
  age: 5,
  group_context: "Grupo ficticio de cinco años",
  school_context: "Jardín ficticio",
  institution_name: "Jardín ficticio", teacher_name: "Docente ficticia",
  available_resources: ["papel", "semillas"],
  diagnostic_summary: "El grupo observa plantas y necesita más oportunidades de conversar.",
  calendar: { school_year: 2026, starts_on: "2026-03-01", ends_on: "2026-12-18" },
};
const themes = ["Acuerdos para jugar", "Relatos de casa", "Sonidos cercanos", "Plantas del patio", "Puentes y caminos", "Formas del aula", "Animales que conocemos", "Juegos de movimiento", "Tienda de juego", "Cuentos con imágenes", "Luces y sombras", "Taller de arte", "Historias de la comunidad", "Medimos jugando", "Cuidamos el agua", "Música con objetos", "Soluciones en equipo", "Semillas y frutos", "Compartimos aprendizajes", "Celebramos ideas"];

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

test("la indicación docente permanece separada de la metodología de la Skill", async () => {
  const input = buildAnnualPlanGenerationInput({ classroom, request: { teacherRequest: "Explorar el patio" } });
  assert.equal(input.teacher_request, "Explorar el patio Preparar el Plan Maestro anual.");
  assert.deepEqual(input.available_resources, ["papel", "semillas"]);
  assert.equal(input.calendar_context.starts_on, "2026-03-01");
  assert.equal(input.calendar_context.project_slots.length, 12);
  assert.deepEqual(input.calendar_context.project_slots[0], { code: "P01", period: "Bimestre 1", starts_on: "2026-03-30", ends_on: "2026-04-10" });
  assert.match(input.diagnostic_summary, /necesita más oportunidades/);
  assert.equal(JSON.stringify(input).includes("nombre de un niño"), false);
  const screen = await readFile(new URL("../features/dashboard/components/annual-plan-generator.tsx", import.meta.url), "utf8");
  assert.match(screen, /period: "Bimestre 1"/);
  assert.match(screen, /<option key=\{number\} value=\{`Bimestre \$\{number\}`\}>/);
  assert.doesNotMatch(screen, /period: "Por definir"/);
});

test("el contexto anual reduce a dos semanas un proyecto si una interrupción ocupa la última semana", () => {
  const blocks = nationalCalendarBlocks2026();
  blocks.push({ type: "institutional", label: "Suspensión semanal", start_date: "2026-05-11", end_date: "2026-05-15", editable: true, sort_order: 9 });
  const input = buildAnnualPlanGenerationInput({ classroom: { ...classroom, calendar: { ...classroom.calendar, blocks } } });
  assert.deepEqual(input.calendar_context.project_duration_weeks.slice(0, 3), [2, 2, 2]);
});

test("las notas privadas de la etapa inicial no entran al contexto del modelo", () => {
  const input = buildAnnualPlanGenerationInput({ classroom: { ...classroom, calendar: { ...classroom.calendar,
    initial_stage: { ...defaultInitialStage(), teacher_notes: "NOTA PRIVADA DE LA DOCENTE" } } } });
  assert.equal(input.calendar_context.initial_stage.teacher_notes, "");
  assert.doesNotMatch(JSON.stringify(input), /NOTA PRIVADA DE LA DOCENTE/);
});

test("plan maestro y desarrollo usan dos providers mock, Sol y Terra, sin llamada real", async () => {
  const calls = [];
  const masterPlan = { workflow: "annual_plan", provider: "openai", model: "gpt-5.6-sol", reasoning_effort: "high" };
  const developmentPlan = { workflow: "annual_plan", provider: "openai", model: "gpt-5.6-terra", reasoning_effort: "low" };
  const master = {
    title: "Plan ficticio", school_year: "2026", general_context_summary: "Grupo ficticio", planning_priorities: ["Observar"],
    competency_overview: ["Participar"], review_checkpoints: ["Cada bimestre"], flexibility_notes: "Ajustar según el grupo",
    annual_purposes: ["Jugar"], teaching_strategies: ["Juego"], assessment_followup: ["Observar"],
    family_collaboration: [], inclusive_supports: [],
    proposed_experiences: Array.from({ length: 12 }, (_, index) => ({
      period: `Bimestre ${Math.floor(index / 3) + 1}`, experience_type: "project", title: themes[index],
      rationale: `Ofrecer oportunidades para ${themes[index]}`, primary_competency_ids: ["COMP-1"], possible_secondary_competency_ids: [],
      context_or_trigger: `Juego sobre ${themes[index]}`, expected_evidence_categories: ["Preguntas"], flexibility_notes: "Ajustar",
    })),
  };
  const development = { organization_criteria: ["Uno", "Dos", "Tres", "Cuatro"], transversal_approaches: ["Convivencia"],
    project_details: Array.from({ length: 12 }, (_, index) => ({ index: index + 1, purpose: `Jugar y conversar sobre ${themes[index]}`, final_product: `Muestra de ${themes[index]}`, materials: ["Papel"] })) };
  const result = await generateTeacherAnnualPlan({
    classroom,
    request: {},
    resolvePlan: ({ task }) => task === "document_development" ? developmentPlan : masterPlan,
    createProvider: (executionPlan, options) => { calls.push({ executionPlan, options }); return { id: "mock" }; },
    generate: async (input, options) => {
      assert.equal(input.workflow, "annual_plan");
      assert.equal(options.provider.id, "mock");
      if (input.annual_stage === "development") {
        assert.equal(options.executionPlan, developmentPlan);
        assert.equal(options.skillInstructions, undefined);
        assert.equal(input.master_plan.proposed_experiences.length, 12);
        assert.equal(input.master_plan.proposed_experiences[0].primary_competency_ids[0], "COMP-1");
        return { output: development, metadata: { workflow: "annual_plan", model: developmentPlan.model, response_id: "detail-test", usage: { input_tokens: 20, output_tokens: 30, total_tokens: 50 } }, provenance: {} };
      }
      assert.equal(input.annual_stage, "master");
      assert.equal(options.executionPlan, masterPlan);
      assert.match(options.skillInstructions, /Skill crear-plan-anual/);
      assert.match(options.skillInstructions, /PLAN-01/);
      assert.match(options.skillInstructions, /exactamente \*\*12 proyectos/);
      for (const milestone of ["Día del Niño Peruano", "Día de la Educación Inicial", "Fiestas Patrias", "Navidad y cierre de año"]) {
        assert.match(options.skillInstructions, new RegExp(milestone));
      }
      return { output: master, metadata: { workflow: "annual_plan", model: masterPlan.model, response_id: "master-test", usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300 } }, provenance: {} };
    },
  });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((item) => item.executionPlan.model), ["gpt-5.6-sol", "gpt-5.6-terra"]);
  assert.ok(calls.every((item) => item.options.timeoutMs === 180_000));
  assert.equal(result.proposal.title, "Plan ficticio");
  assert.equal(result.proposal.plan_format, "twelve_projects_flexible_weeks");
  assert.equal(result.proposal.proposed_experiences[2].duration_weeks, 3);
  assert.equal(result.proposal.proposed_experiences[11].final_product, "Muestra de Taller de arte");
  assert.deepEqual(result.internalMetadata.stages.map((stage) => stage.model), ["gpt-5.6-sol", "gpt-5.6-terra"]);
  assert.equal(result.internalMetadata.usage.total_tokens, 350);
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

test("el pipeline real de contexto entrega solo el bundle a los dos providers mock", async () => {
  const knowledgeBase = await loadKnowledgeBaseV4();
  const competencyId = knowledgeBase.competencyCards.find((card) => card.runtime_selectable_by_age?.["5"] && !["CAST_L2_ORAL", "PS_RELIGION"].includes(card.id)).id;
  const master = {
    title: "Plan de prueba", school_year: "2026", general_context_summary: "El grupo explora el entorno.",
    planning_priorities: ["Conversar"], competency_overview: ["Explorar"], review_checkpoints: ["Cada bimestre"],
    flexibility_notes: "Ajustar según las observaciones.", annual_purposes: ["Jugar juntos"], teaching_strategies: ["Juego"],
    assessment_followup: ["Observar"], family_collaboration: [], inclusive_supports: [],
    proposed_experiences: Array.from({ length: 12 }, (_, index) => ({ period: `Bimestre ${Math.floor(index / 3) + 1}`,
      experience_type: "project", title: themes[index], rationale: `Oportunidad para ${themes[index]}.`,
      primary_competency_ids: [competencyId], possible_secondary_competency_ids: [],
      context_or_trigger: `Juego sobre ${themes[index]}.`, expected_evidence_categories: ["Preguntas"], flexibility_notes: "Ajustar." })),
  };
  const development = { organization_criteria: ["Uno", "Dos", "Tres", "Cuatro"], transversal_approaches: [],
    project_details: Array.from({ length: 12 }, (_, index) => ({ index: index + 1, purpose: `Explorar ${themes[index]}.`,
      final_product: `Registro sobre ${themes[index]}`, materials: ["Papel"] })) };
  const requests = [];
  const result = await generateTeacherAnnualPlan({ classroom, request: { teacherRequest: "Usar el patio." },
    createProvider: (plan) => ({ id: "mock", model: plan.model, generate: async (providerRequest) => {
      requests.push(providerRequest);
      return { output: requests.length === 1 ? master : development,
        provider_metadata: { provider: "mock", model: plan.model, response_id: `mock-${requests.length}`, usage: null } };
    } }),
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].output_schema.id, "annual-plan-v2");
  assert.equal(requests[0].ai_context_bundle.context.classroom.calendar_context.project_slots.length, 12);
  assert.equal(requests[1].output_schema.id, "annual-plan-development-v1");
  assert.match(requests[0].skill_instructions, /Skill crear-plan-anual/);
  assert.equal(requests[1].skill_instructions, undefined);
  assert.equal(JSON.stringify(requests[0].ai_context_bundle).includes("Skill crear-plan-anual"), false);
  assert.equal(requests[0].ai_context_bundle.context.workflow_inputs.master_plan, undefined);
  assert.equal(requests[1].ai_context_bundle.context.workflow_inputs.master_plan.proposed_experiences.length, 12);
  assert.equal(JSON.stringify(requests).includes("private_path"), false);
  assert.equal(result.proposal.proposed_experiences[0].primary_competency_ids[0], competencyId);
});

test("servidor y pantalla conservan motivo seguro y espera visible sin llamar al modelo", async () => {
  const server = await readFile(new URL("../../scripts/local-db-server.mjs", import.meta.url), "utf8");
  const screen = await readFile(new URL("../features/dashboard/components/annual-plan-generator.tsx", import.meta.url), "utf8");
  const route = server.slice(server.indexOf('url.pathname === "/api/ai/annual-plan/generate"'), server.indexOf('url.pathname === "/api/annual-plans"'));
  assert.match(route, /reason: error\?\.reason \?\? "unknown"/);
  assert.match(screen, /Puede tardar varios minutos/);
  assert.match(screen, /No se pudo conectar con el servidor local/);
});
