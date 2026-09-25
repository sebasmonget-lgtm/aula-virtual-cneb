import { diagnosticStudentProposalSources, sameDiagnosticSources } from "./diagnostic-assessment-v4.mjs";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { loadDiagnosticEvaluationSkill } from "./diagnostic-evaluation-skill.mjs";

const schema = { id: "diagnostic-student-suggestion-v1", type: "object", additionalProperties: false,
  required: ["information_status", "comment_text", "supporting_observation_ids"], properties: {
    information_status: { enum: ["information_available", "insufficient_information"] },
    comment_text: { type: "string" },
    supporting_observation_ids: { type: "array", items: { type: "string" } },
  } };

export async function suggestDiagnosticStudentReview(db, teacherId, draftId, {
  loadSources = diagnosticStudentProposalSources, resolvePlan = resolveAIExecutionPlan,
  createProvider = createAIProviderForPlan, loadSkill = loadDiagnosticEvaluationSkill,
} = {}) {
  const source = await loadSources(db, teacherId, draftId);
  if (!source.observations.length) return { details: { information_status: "insufficient_information",
    comment_text: "Todavía necesito observar más situaciones de juego y aprendizaje para conocer mejor cómo participa este niño." },
    supporting_observation_ids: [] };
  const plan = resolvePlan({ workflow: "diagnostic", task: "generation" });
  const provider = createProvider(plan, { timeoutMs: 120_000 });
  const response = await provider.generate(buildProviderRequest("diagnostic", {
    workflow: "diagnostic", stage: "student_review", context: { age: source.age,
      observations: source.observations, family_context_not_performance_evidence: source.family_context },
    curriculum: { competency_cards: source.competency_cards },
    constraints: { must: ["Cita solo IDs de observaciones recibidas.",
      "Distingue expresamente información familiar de observación docente.",
      "Si las observaciones son limitadas, indica información insuficiente y qué conviene observar."],
    must_not: ["Inventar hechos, niveles A/B/C/AD, diagnósticos clínicos o desempeños oficiales.",
      "Tratar lo narrado por la familia como evidencia de desempeño."] },
  }, plan, schema, await loadSkill()));
  const output = response.output;
  const allowed = new Set(source.observations.map((row) => row.id));
  if (!output || !["information_available", "insufficient_information"].includes(output.information_status) ||
    typeof output.comment_text !== "string" || !output.comment_text.trim() || output.comment_text.length > 3000 ||
    /\b(?:nivel\s*(?:AD|A|B|C)|calificaci[oó]n\s*(?:AD|A|B|C))\b/i.test(output.comment_text) ||
    !Array.isArray(output.supporting_observation_ids) ||
    (output.information_status === "information_available" && !output.supporting_observation_ids.length) ||
    output.supporting_observation_ids.some((id) => !allowed.has(id))) {
    throw new Error("La propuesta individual no coincide con las observaciones registradas.");
  }
  const current = await loadSources(db, teacherId, draftId);
  if (!sameDiagnosticSources(source.source_snapshot, current.source_snapshot)) throw new Error("Las observaciones cambiaron durante el análisis.");
  const details = { information_status: output.information_status, comment_text: output.comment_text.trim() };
  await db.query(`update diagnostic_student_reviews set ai_snapshot=$1::jsonb,updated_at=now()
    where id=$2 and status='draft'`, [JSON.stringify({ output, model: plan.model,
      usage: response.provider_metadata?.usage ?? null, source_snapshot: source.source_snapshot }), draftId]);
  return { details, supporting_observation_ids: output.supporting_observation_ids };
}
