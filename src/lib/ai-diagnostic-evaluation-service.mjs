import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { diagnosticGroupProposalSources, sameDiagnosticSources } from "./diagnostic-assessment-v4.mjs";
import { loadDiagnosticEvaluationSkill } from "./diagnostic-evaluation-skill.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";
import { recordAIQAResult } from "./ai-qa-trace.mjs";

const fields = ["strengths", "needs", "planning_priorities"];
const OUTPUT_SCHEMA = { id: "diagnostic-group-suggestion-v3", type: "object", additionalProperties: false,
  required: [...fields, "claims"], properties: {
    ...Object.fromEntries(fields.map((field) => [field, { type: "string" }])),
    claims: { type: "array", minItems: 3, items: { type: "object", additionalProperties: false,
      required: ["field", "text", "scope", "source_refs"], properties: {
        field: { type: "string", enum: fields }, text: { type: "string", minLength: 1 },
        scope: { type: "string", enum: ["individual", "subgroup", "information_gap", "planning_decision"] },
        source_refs: { type: "array", items: { type: "string" } },
      } } },
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

export function validateDiagnosticSuggestion(output, sources) {
  const knownNames = sources.known_names ?? [];
  if (!output || typeof output !== "object" || Array.isArray(output) ||
      Object.keys(output).length !== fields.length + 1 || fields.some((field) =>
        typeof output[field] !== "string" || !output[field].trim() || output[field].length > 3000 ||
        forbiddenJudgment.test(output[field]) || neutralizeAssessmentText(output[field], knownNames) !== output[field]))
    throw new DiagnosticSuggestionError("proposal_invalid");
  const references = [ ...(sources.comments ?? []), ...(sources.family_reported_context ?? []),
    ...(sources.observed_records ?? []).flatMap(child => child.notes.map(note => ({ ...note, child: child.child }))) ];
  const byId = new Map(references.map(ref => [ref.source_id, ref]));
  if (!Array.isArray(output.claims) || output.claims.length < 3) throw new DiagnosticSuggestionError("proposal_invalid");
  for (const claim of output.claims) {
    if (!fields.includes(claim.field) || typeof claim.text !== "string" || !output[claim.field].includes(claim.text) ||
        !["individual", "subgroup", "information_gap", "planning_decision"].includes(claim.scope) ||
        !Array.isArray(claim.source_refs) || claim.source_refs.some(id => !byId.has(id)) ||
        (claim.scope === "individual" && new Set(claim.source_refs.map(id => byId.get(id).child)).size !== 1) ||
        (claim.scope === "subgroup" && new Set(claim.source_refs.map(id => byId.get(id).child)).size < 2))
      throw new DiagnosticSuggestionError("proposal_invalid");
  }
  for (const field of fields) if (output.claims.filter(claim => claim.field === field).map(claim => claim.text).join(" ") !== output[field])
    throw new DiagnosticSuggestionError("proposal_invalid");
  return { ...Object.fromEntries(fields.map((field) => [field, output[field].trim()])),
    claims: output.claims.map(claim => ({ ...claim, sources: claim.source_refs.map(id => ({ source_id: id, child: byId.get(id).child, source_type: byId.get(id).source_type })) })), competency_priorities: [] };
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
    const plan = resolvePlan({ workflow: "diagnostic_group_synthesis", task: "generation" });
    const provider = createProvider(plan, { timeoutMs: 120_000 });
    const bundle = { workflow: "diagnostic_group_synthesis", context: { age: sources.age, student_count: sources.student_count,
      confirmed_teacher_comments: sources.comments, observed_records: sources.observed_records ?? [], family_reported_context: sources.family_reported_context ?? [] }, curriculum: { competency_cards: sources.competency_options ?? [] },
      constraints: { must: ["Distinguir explícitamente lo observado, lo reportado por la familia y la interpretación docente. Una entrevista familiar no acredita un aprendizaje observado. Si hay contradicciones, conservar quién reportó qué y expresar lo que falta observar. Cada afirmación cita el alias y tipo de fuente que la sostiene.", "Los comentarios individuales son opcionales; no suponer que su ausencia indica dificultad.", "Expresar necesidades como oportunidades pedagógicas.",
        "Redactar una visión breve del grupo, sin priorizar competencias todavía.", "No convertir ausencia de registro en dificultad.",
        "En needs, distinguir necesidad de acompañamiento observada de falta de información. Solo plantear una necesidad grupal con un patrón comparable en varios niños o comentarios docentes confirmados que la sustenten; si no hay ese sustento, formular qué conviene seguir observando.",
        "No generalizar a todo el grupo una conducta o necesidad presente en un solo alias.",
        "En planning_priorities, vincular cada decisión concreta de juego, organización, materiales o interacción con registros disponibles o con una dimensión que se necesita seguir observando; evitar recomendaciones genéricas.",
        "Cada alias child_N representa a un niño distinto; sus comentarios y notas no son niños adicionales. Divide cada campo en afirmaciones claims cuya concatenación con un espacio reproduce exactamente el texto del campo. En cada claim cita solo source_id entregados. individual requiere un solo niño; subgroup exige al menos dos niños distintos. information_gap y planning_decision conservan explícitamente lo desconocido o propuesto.",
        "Los registros son una selección reciente y pueden estar truncados. No completar lo que falte ni afirmar cobertura de todo el aula."],
        must_not: ["Inventar observaciones o niveles de logro.", "Nombrar o identificar a niños y familias.",
          "Concluir que todos los niños necesitan el mismo apoyo por una prioridad grupal."] },
      provenance: { source_type: "diagnostic_facts_and_optional_confirmed_comments", source_count: sources.comments.length + (sources.observed_records?.length ?? 0) } };
    const request = buildProviderRequest("diagnostic_group_synthesis", bundle, plan, OUTPUT_SCHEMA, await loadSkill());
    const response = await provider.generate(request);
    const details = validateDiagnosticSuggestion(response.output, sources);
    const current = await loadSources(db, teacherId, draftId);
    if (!sameDiagnosticSources(sources.source_snapshot, current.source_snapshot)) throw new DiagnosticSuggestionError("stale_sources");
    await db.query(`update diagnostic_group_reviews set ai_snapshot=$1::jsonb,updated_at=now()
      where id=$2 and status='draft'`, [JSON.stringify({ output: details,
      provider: response.provider_metadata?.provider ?? plan.provider, model: plan.model,
      reasoning_effort: plan.reasoning_effort, routing_policy_version: plan.routing_policy_version,
      response_id: response.provider_metadata?.response_id ?? null,
      usage: response.provider_metadata?.usage ?? null, source_snapshot: sources.source_snapshot }), draftId]);
    await recordAIQAResult("diagnostic_group_synthesis", details, { validators: ["source_refs", "distinct_children_scope", "privacy", "source_fingerprint"], downstream: ["annual_plan"] });
    return { details };
  } catch (error) { throw safeFailure(error); }
}
