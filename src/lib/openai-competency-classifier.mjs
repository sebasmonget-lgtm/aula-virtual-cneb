import { OpenAIProvider } from "./openai-provider.mjs";

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
export function createOpenAICompetencyClassifier({ provider = new OpenAIProvider({ timeoutMs: 30_000 }) } = {}) {
  return {
    async classify({ observation, context, age, options }) {
      const allowed = new Set(options.map((item) => item.id));
      if (!allowed.size || typeof observation !== "string" || !observation.trim()) return { candidate_ids: [] };
      const { output } = await provider.generate({
        execution_plan: { execution: "generation", provider: "openai", model: "gpt-6-luna", reasoning_effort: "low" },
        skill_instructions: [
          "Clasifica una observación factual en cero o varias competencias CNEB de la lista permitida.",
          "Usa solo acciones observables del texto. No infieras capacidades, dificultades ni niveles de logro.",
          "Puede haber más de una competencia, pero no añadas una por mera relación temática.",
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
