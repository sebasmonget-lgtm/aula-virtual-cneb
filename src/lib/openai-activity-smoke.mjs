import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { generateAIWorkflowV4 } from "./ai-generation-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";

export const OPENAI_ACTIVITY_SMOKE_INPUT = Object.freeze({
  workflow: "activity",
  age: 5,
  teacher_request: "Crear una actividad de exploración sobre sombras.",
  activity_purpose: "Explorar cómo cambia una sombra cuando cambia la posición de la luz.",
  classroom_context: Object.freeze({
    group_context: "Grupo de niños de 5 años",
    materials: Object.freeze(["linternas", "objetos", "papel"]),
  }),
});

function line(label, value) {
  return `${label}: ${value ?? "no disponible"}`;
}

export function formatOpenAIActivitySmokeResult({ plan, result, elapsedMs }) {
  const output = result.output;
  const usage = result.metadata.usage ?? {};
  return [
    "Smoke test OpenAI activity completado.",
    line("Modelo decidido", plan.model),
    line("Reasoning effort", plan.reasoning_effort),
    line("Título", output.title),
    line("Propósito", output.purpose),
    line("Situación significativa", output.meaningful_situation),
    line("Preparación docente", output.teacher_preparation),
    line("Acciones de los niños", output.child_actions),
    line("Mediación", output.mediation),
    line("Oportunidades de evidencia", output.evidence_opportunities),
    line("Cierre o continuidad", output.closure_or_continuity),
    line("Competency status", output.competency_status),
    line("Competency ID", output.competency_id),
    line("Response ID", result.metadata.response_id),
    line("Input tokens", usage.input_tokens),
    line("Cached input tokens", usage.cached_input_tokens),
    line("Output tokens", usage.output_tokens),
    line("Total tokens", usage.total_tokens),
    line("Tiempo total (ms)", Math.round(elapsedMs)),
  ].join("\n");
}

/** Runs a deliberately minimal, fictional OpenAI activity smoke test. */
export async function runOpenAIActivitySmoke({
  environment = process.env,
  createProvider = createAIProviderForPlan,
  generate = generateAIWorkflowV4,
  log = console.log,
  now = () => performance.now(),
} = {}) {
  if (!environment.OPENAI_API_KEY) {
    const message = "OPENAI_API_KEY no configurada. Smoke test no ejecutado.";
    log(message);
    return { status: "not_configured", message };
  }
  const executionPlan = resolveAIExecutionPlan({ workflow: "activity", task: "generation" });
  const provider = createProvider(executionPlan, { apiKey: environment.OPENAI_API_KEY });
  const startedAt = now();
  const result = await generate(OPENAI_ACTIVITY_SMOKE_INPUT, { provider });
  const elapsedMs = now() - startedAt;
  const output = formatOpenAIActivitySmokeResult({ plan: executionPlan, result, elapsedMs });
  log(output);
  return { status: "completed", executionPlan, result, elapsedMs, output };
}
