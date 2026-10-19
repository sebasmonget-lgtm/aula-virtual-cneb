import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
import { createAIProviderForPlan } from "./ai-provider-factory.mjs";

export function buildClassifierOptions(cards, age, applicableIds) {
  const allowed = new Set(applicableIds);
  return cards.filter((card) => allowed.has(card.id)).map((card) => {
    const ageData = card.ages?.[String(age)] ?? {};
    return { id: card.id, name: card.official_name,
      applies_when: [card.ai_meaning, ageData.ai_focus, ...(ageData.observable_patterns ?? []).slice(0, 3)].filter(Boolean),
      avoid_when: (card.do_not_use_when ?? card.avoid_when ?? []).slice(0, 2) };
  });
}

/** A small, closed-set copy of the Jev experiment's decision boundary. */
export function createOpenAICompetencyClassifier({ provider = null, resolvePlan = resolveAIExecutionPlan,
  createProvider = createAIProviderForPlan } = {}) {
  return {
    async classify({ observation, context, age, options }) {
      const allowed = new Set(options.map((item) => item.id));
      if (!allowed.size || typeof observation !== "string" || !observation.trim()) return { candidate_ids: [] };
      const plan = resolvePlan({ workflow: "observation_competency_suggestion", task: "generation" });
      const executor = provider ?? createProvider(plan, { timeoutMs: 30_000 });
      const { output } = await executor.generate({
        execution_plan: plan,
        skill_instructions: [
          "Clasifica una observación factual en cero o varias competencias CNEB de la lista permitida.",
          "Usa solo acciones observables del texto. No infieras capacidades, dificultades ni niveles de logro.",
          "Puede haber más de una competencia, pero no añadas una por mera relación temática.",
          "Distingue diseñar, construir, ubicar o ajustar formas y recorridos (relaciones espaciales) de indagar: probar que una construcción funciona no demuestra por sí solo una investigación. Indagación requiere acciones que busquen responder una pregunta sobre fenómenos mediante observación, comparación o registro.",
          "Reconocer o expresar la propia emoción y buscar apoyo puede sustentar identidad; hablar no basta para reducirlo a comunicación oral. Distingue emociones propias de interpretar las de un personaje.",
          "Una meta elegida, una estrategia y la revisión de cómo resultó pueden sustentar aprendizaje autónomo; cumplir una instrucción o hacer algo solo no basta. Considera cada actuación explícita y admite varias competencias cuando cada una tenga sustento.",
          "Si falta sustento, devuelve candidate_ids vacío. La docente revisará y elegirá; esto no confirma la clasificación.",
        ].join(" "),
        ai_context_bundle: { age, context, observation, allowed_competencies: options },
        output_schema: { id: "diagnostic_competency_candidates_v1", type: "object", additionalProperties: false,
          required: ["candidate_ids"], properties: { candidate_ids: { type: "array", items: { type: "string", enum: [...allowed] } } } },
      });
      if (!Array.isArray(output?.candidate_ids) || output.candidate_ids.some((id) => !allowed.has(id)))
        throw new Error("El clasificador devolvió una competencia no permitida.");
      return { candidate_ids: [...new Set(output.candidate_ids)].slice(0, 4) };
    },
  };
}
