import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";

const schema = { id: "project-conversation-v1", type: "object", additionalProperties: false,
  required: ["question", "ready"], properties: { question: { type: "string" }, ready: { type: "boolean" } } };

export async function projectConversation({ card, knownContext, messages, names = [], createProvider = createAIProviderForPlan }) {
  const turns = messages.filter(message => message.role === "teacher");
  if (turns.length >= 3 || /hazlo con lo que|continuar|preparar proyecto/i.test(turns.at(-1)?.text ?? ""))
    return { question: "Con estas decisiones podemos preparar el proyecto.", ready: true, metadata: { execution: "code" } };
  const clean = value => neutralizeAssessmentText(String(value ?? ""), names);
  const plan = resolveAIExecutionPlan({ workflow: "project_conversation" });
  const result = await createProvider(plan).generate(buildProviderRequest("project_conversation", {
    card: { title: clean(card.title), purpose: clean(card.purpose), competency_ids: card.primary_competency_ids },
    known_context: clean(knownContext), messages: messages.map(message => ({ role: message.role, text: clean(message.text),
      ...(message.source_turn ? { source_turn: message.source_turn, support_text: clean(message.support_text ?? message.text) } : {}) })),
    task: "Haz una sola pregunta breve sobre decisiones que cambien cómo desarrollar este proyecto: espacios, materiales, participación familiar o cierre. No vuelvas a preguntar título, propósito, competencias, edad, fechas ni datos ya conocidos. Incluye un ejemplo cotidiano. Normalmente bastan una o dos respuestas, máximo tres. Si ya hay información suficiente, termina. No generes preguntas orientadoras, criterios ni actividades." }, plan, schema));
  const output = result.output;
  if (typeof output?.question !== "string" || output.question.length > 500 || typeof output.ready !== "boolean"
      || clean(output.question) !== output.question || (!output.ready && !output.question.trim()))
    throw new Error("No pudimos preparar la pregunta. Puedes continuar con lo que ya conoces.");
  return { ...output, metadata: { model: plan.model, reasoning_effort: plan.reasoning_effort, usage: result.provider_metadata?.usage } };
}
