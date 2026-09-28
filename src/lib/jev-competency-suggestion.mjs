import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";
import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";
import { createJevOpenRouterDecision } from "./jev-openrouter-decision.mjs";

const FAMILY = /(?<!\p{L})(?:mam[aá]|pap[aá]|madre|padre|abuela?|abuelo|t[ií]a|t[ií]o|hermana?|hermano|familia|domicilio|direcci[oó]n|tel[eé]fono|vivienda)(?!\p{L})/iu;
const IDENTIFIER = /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{7,}\b)/iu;
// Keep a deliberately closed list: unknown capitalized words remain redacted as possible names.
const SAFE_OBSERVATION_WORDS = new Set([
  "Agrupó", "Comparó", "Contó", "Construyó", "Dibujó", "Dijo", "Eligió", "Explicó",
  "Exploró", "Hizo", "Jugó", "Miró", "Mostró", "Observó", "Ordenó", "Participó",
  "Preguntó", "Repartió", "Respondió", "Señaló", "Separó", "Terminó", "Trabajó", "Usó",
  "Construye", "Dibuja", "Escucha", "Escribe", "Lleva", "Mueve", "Ordena", "Propone",
  "Reparte", "Puso", "Toma", "Dice", "Creo", "Será", "Estuvo",
  "Acá", "Ahí", "Ahora", "Antes", "Aquí", "Así", "Cómo", "Después", "Durante",
  "Esta", "Este", "Hoy", "Luego", "Mientras", "Primero",
]);

/** Conservatively remove identifiable material before any external decision call. */
export function anonymousDecisionText(value, knownNames = []) {
  if (typeof value !== "string" || value.length > 4_000) return null;
  // Remove only our visible test annotation, never identifiers within the observation itself.
  value = value.replace(/^\[PRUEBA FICTICIA(?: · OBS-\d{8})?\]\s*/u, "");
  if (!value.trim() || FAMILY.test(value) || IDENTIFIER.test(value)) return null;
  let text = neutralizeAssessmentText(value, knownNames);
  text = text.replace(/\b(?:se llama|llamad[oa]|nombre de)\s+\p{L}+/giu, "[persona]");
  text = text.replace(/(?<!\p{L})\p{Lu}\p{Ll}{2,}(?!\p{L})/gu,
    (word) => SAFE_OBSERVATION_WORDS.has(word) ? word : "[persona]");
  if (FAMILY.test(text) || IDENTIFIER.test(text) || !/[\p{L}]{3}/u.test(text)) return null;
  return text.trim();
}

function competencyQuestions(options, planning = false) {
  const questions = {};
  for (const option of options) {
    questions[option.id] = { type: "noul",
      instructions: planning
        ? `¿La situación descrita justifica planificar la competencia «${option.name}»? Evalúa solo esta competencia. Puede haber varias o ninguna. No la elijas solo por el tema.`
        : `¿La nota describe una actuación observable propia de «${option.name}»? Evalúa esta competencia de forma independiente. Puede haber varias o ninguna. No infieras logro ni hechos ausentes.`,
      criteria: { true: option.applies_when.filter(Boolean).join("; ") || option.name,
        false: `No hay sustento específico para esta competencia. ${option.avoid_when.filter(Boolean).join("; ")}`.trim() } };
  }
  questions.evidence_sufficient = { type: "noul",
    instructions: planning ? "¿La situación contiene información suficiente para sugerir alguna competencia sin inventar un propósito?"
      : "¿La nota contiene una actuación concreta del niño que permita relacionarla con una competencia sin suponer hechos?",
    criteria: { true: planning ? "Hay una situación o necesidad concreta para planificar." : "Describe lo que hizo o dijo el niño en una situación reconocible.",
      false: planning ? "El interés es vago o no describe una situación planificable." : "Solo hay presencia, una valoración vaga o un dato aislado." } };
  return questions;
}

function rankedPositiveIds(allowed, answers, threshold, limit) {
  return [...allowed].filter((id) => answers[id].noul >= threshold)
    .sort((left, right) => answers[right].noul - answers[left].noul || left.localeCompare(right))
    .slice(0, limit);
}

const NO_CLASSIFIABLE = "NO_CLASIFICABLE";

function observationChoiceQuestion(cards, age) {
  const names = new Map(cards.map((card) => [card.id, card.official_name]));
  const criteria = Object.fromEntries(cards.map((card) => {
    const ageData = card.ages?.[String(age)] ?? {};
    const applies = [card.ai_meaning, ageData.ai_focus, ...(ageData.observable_patterns ?? [])].filter(Boolean);
    const avoids = [...new Set([...(card.do_not_use_when ?? []), ...(card.avoid_when ?? [])])].filter(Boolean);
    const distinctions = (card.common_confusions ?? []).filter((item) => names.has(item.competency_id))
      .map((item) => `Frente a ${names.get(item.competency_id)}: ${item.difference}`);
    return [card.id, `Competencia: ${card.official_name}. Aplica cuando: ${applies.join("; ")}. ` +
      `No aplica cuando: ${avoids.join("; ") || "No hay una actuación específica observable"}. ` +
      (distinctions.length ? `Distinciones: ${distinctions.join("; ")}.` : "")];
  }));
  criteria[NO_CLASSIFIABLE] = "La nota solo informa presencia, un resultado aislado o una valoración vaga; " +
    "no describe una actuación observable y específica. No completar hechos ausentes.";
  return { type: "choice", instructions: "Selecciona una sola competencia CNEB cuya actuación específica esté " +
    "más directamente observada. Hablar, usar materiales o estar con otros puede ser solo un medio de otra " +
    "actuación; no lo conviertas automáticamente en otra competencia. No evalúes logro ni inventes hechos " +
    "o propósito docente. Elige NO_CLASIFICABLE si falta una actuación concreta y suficiente.", criteria };
}

/** Teacher-facing observation: Choice ranks the primary, independent noul suggests optional additions. */
export function createJevCompetencySuggester({ client = createJevOpenRouterDecision(),
  loadKb = loadKnowledgeBaseV4, positiveThreshold = 0.8, sufficiencyThreshold = 0.7,
  choiceReviewThreshold = 0.5 } = {}) {
  return {
    async classify({ observation, age, options }) {
      if (![3, 4, 5].includes(Number(age)) || typeof observation !== "string" || !observation.trim() ||
          !Array.isArray(options) || !options.length ||
          options.some((item) => !/^[A-Z0-9_]+$/u.test(item.id) || !item.name ||
            !Array.isArray(item.applies_when) || !Array.isArray(item.avoid_when)))
        throw new TypeError("Invalid Jev competency options.");
      const kb = await loadKb();
      const allowed = new Set(options.map((item) => item.id));
      if (allowed.size !== options.length || options.some((item) => !kb.competencyCards.some((card) => card.id === item.id)))
        throw new TypeError("Jev competency IDs must belong to the current KB.");
      const cards = kb.competencyCards.filter((card) => allowed.has(card.id));
      const state = `Edad: ${age}. Observación: ${observation}`;
      const choiceRequest = { workflow: "observation_competency_primary", state,
        questions: { competency: observationChoiceQuestion(cards, age),
          evidence_sufficient: competencyQuestions(options).evidence_sufficient },
        kbVersion: kb.version, candidateIds: [...allowed] };
      const parallelRequest = { workflow: "observation_competency_additional", state,
        questions: competencyQuestions(options), kbVersion: kb.version, candidateIds: [...allowed] };
      const [choiceOutcome, parallelOutcome] = await Promise.allSettled([
        client.decide(choiceRequest), client.decide(parallelRequest),
      ]);
      if (choiceOutcome.status === "rejected") throw choiceOutcome.reason;
      const primaryResult = choiceOutcome.value;
      const primaryAnswer = primaryResult.answers.competency;
      const primary = primaryAnswer.choice;
      if (primaryResult.answers.evidence_sufficient.noul < sufficiencyThreshold ||
          primary === NO_CLASSIFIABLE || !allowed.has(primary) ||
          primaryAnswer.confidence < choiceReviewThreshold)
        return { candidate_ids: [], source: "jev", decision_metadata: primaryResult.metadata };
      const additionalResult = parallelOutcome.status === "fulfilled" ? parallelOutcome.value : null;
      const additional = additionalResult?.answers.evidence_sufficient.noul >= sufficiencyThreshold
        ? rankedPositiveIds(allowed, additionalResult.answers, positiveThreshold, 4) : [];
      return { candidate_ids: [primary, ...additional.filter((id) => id !== primary)].slice(0, 4),
        source: "jev", decision_metadata: primaryResult.metadata };
    },
    async suggestPlanning({ situation, age, options }) {
      if (![3, 4, 5].includes(Number(age)) || typeof situation !== "string" || !situation.trim() ||
          !Array.isArray(options) || !options.length || options.some((item) => !/^[A-Z0-9_]+$/u.test(item.id)))
        throw new TypeError("Invalid Jev planning options.");
      const kb = await loadKb();
      const allowed = new Set(options.map((item) => item.id));
      if (allowed.size !== options.length || options.some((item) => !kb.competencyCards.some((card) => card.id === item.id)))
        throw new TypeError("Jev planning IDs must belong to the current KB.");
      const result = await client.decide({ workflow: "emergent_planning_competency",
        state: `Edad: ${age}. Situación: ${situation}`,
        questions: competencyQuestions(options, true), kbVersion: kb.version, candidateIds: [...allowed] });
      const candidate_ids = result.answers.evidence_sufficient.noul >= sufficiencyThreshold
        ? rankedPositiveIds(allowed, result.answers, positiveThreshold, 3) : [];
      return { candidate_ids, source: "jev", decision_metadata: result.metadata };
    },
  };
}
