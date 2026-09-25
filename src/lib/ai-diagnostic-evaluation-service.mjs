import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { diagnosticGroupProposalSources, sameDiagnosticSources } from "./diagnostic-assessment-v4.mjs";
import { loadDiagnosticEvaluationSkill } from "./diagnostic-evaluation-skill.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";

const fields = ["strengths", "needs", "planning_priorities"];
const OUTPUT_SCHEMA = { id: "diagnostic-group-suggestion-v2", type: "object", additionalProperties: false,
  required: fields, properties: {
    ...Object.fromEntries(fields.map((field) => [field, { type: "string" }])),
  } };
const forbiddenJudgment = /\b(?:nivel\s*(?:AD|A|B|C)|calificaci[oó]n\s*(?:AD|A|B|C)|ranking)\b/i;

export class DiagnosticSuggestionError extends Error {
  constructor(reason) {
    super(reason === "stale_sources" ? "La información del aula cambió. Actualiza el borrador antes de pedir una propuesta." :
      reason === "proposal_invalid" ? "La propuesta llegó incompleta. Puedes escribir el resumen con tus palabras." :
      reason === "api_key_missing" || reason === "authentication_failed" ? "No se pudo acceder al servicio de IA. Puedes escribir el resumen con tus palabras." :
      reason === "timeout" ? "La propuesta tardó demasiado. Puedes escribir el resumen con tus palabras." :
      "No pudimos preparar la propuesta. Puedes escribir el resumen con tus palabras.");
    this.name = "DiagnosticSuggestionError";
    this.reason = reason;
  }
}

function validateSuggestion(output, knownNames = []) {
  if (!output || typeof output !== "object" || Array.isArray(output) ||
      Object.keys(output).length !== fields.length || fields.some((field) =>
        typeof output[field] !== "string" || !output[field].trim() || output[field].length > 3000 ||
        forbiddenJudgment.test(output[field]) || neutralizeAssessmentText(output[field], knownNames) !== output[field]))
    throw new DiagnosticSuggestionError("proposal_invalid");
  return { ...Object.fromEntries(fields.map((field) => [field, output[field].trim()])),
    competency_priorities: [] };
}

function safeFailure(error) {
  if (error instanceof DiagnosticSuggestionError) return error;
  if (error?.reason === "stale_sources") return new DiagnosticSuggestionError("stale_sources");
  if (["api_key_missing", "authentication_failed", "timeout"].includes(error?.reason)) return new DiagnosticSuggestionError(error.reason);
  return new DiagnosticSuggestionError("provider_error");
}

/** Returns editable text only. Confirmation and DOCX creation remain separate teacher actions. */
export async function suggestDiagnosticGroupReview(db, teacherId, draftId, {
  resolvePlan = resolveAIExecutionPlan, createProvider = createAIProviderForPlan,
  loadSkill = loadDiagnosticEvaluationSkill, loadSources = diagnosticGroupProposalSources,
} = {}) {
  const sources = await loadSources(db, teacherId, draftId);
  try {
    const plan = resolvePlan({ workflow: "diagnostic", task: "generation" });
    const provider = createProvider(plan, { timeoutMs: 120_000 });
    const bundle = { workflow: "diagnostic", context: { age: sources.age, student_count: sources.student_count,
      confirmed_teacher_comments: sources.comments }, curriculum: { competency_cards: sources.competency_options ?? [] },
      constraints: { must: ["Basar cada afirmación en comentarios docentes confirmados.", "Expresar necesidades como oportunidades pedagógicas.",
        "Redactar una visión breve del grupo, sin priorizar competencias todavía.", "No convertir ausencia de registro en dificultad."],
        must_not: ["Inventar observaciones o niveles de logro.", "Nombrar o identificar a niños y familias.",
          "Concluir que todos los niños necesitan el mismo apoyo por una prioridad grupal."] },
      provenance: { source_type: "confirmed_diagnostic_student_reviews", source_count: sources.comments.length } };
    const request = buildProviderRequest("diagnostic", bundle, plan, OUTPUT_SCHEMA, await loadSkill());
    const response = await provider.generate(request);
    const details = validateSuggestion(response.output, sources.known_names);
    const current = await loadSources(db, teacherId, draftId);
    if (!sameDiagnosticSources(sources.source_snapshot, current.source_snapshot)) throw new DiagnosticSuggestionError("stale_sources");
    await db.query(`update diagnostic_group_reviews set ai_snapshot=$1::jsonb,updated_at=now()
      where id=$2 and status='draft'`, [JSON.stringify({ output: details, model: plan.model,
      usage: response.provider_metadata?.usage ?? null, source_snapshot: sources.source_snapshot }), draftId]);
    return { details };
  } catch (error) { throw safeFailure(error); }
}
