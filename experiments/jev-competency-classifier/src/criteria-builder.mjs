import { createHash } from "node:crypto";
import { NO_CLASSIFIABLE_ID, SPECIAL_COMPETENCIES } from "./constants.mjs";
import { validateInput } from "./validation.mjs";

const fingerprint = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const isApplicable = (card, input) => !SPECIAL_COMPETENCIES[card.id] || input.applicability[SPECIAL_COMPETENCIES[card.id]] === true;
function compactCriteria(card, age) {
  const ageData = card.ages[String(age)] ?? {};
  return { competencia: card.official_name, aplica_cuando: [card.ai_meaning, ageData.ai_focus, ...(ageData.observable_patterns ?? []).slice(0, 3)], no_aplica_cuando: (card.do_not_use_when ?? card.avoid_when ?? []).slice(0, 2) };
}
function enrichedCriteria(card, age, applicableIds, names) {
  const ageData = card.ages[String(age)] ?? {};
  return {
    competencia: card.official_name,
    aplica_cuando: [card.ai_meaning, ageData.ai_focus, ...(ageData.observable_patterns ?? [])].filter(Boolean),
    no_aplica_cuando: [...new Set([...(card.do_not_use_when ?? []), ...(card.avoid_when ?? [])])].filter(Boolean),
    ejemplos: (card.examples ?? []).slice(0, 2),
    contraejemplos: (card.not_examples ?? []).slice(0, 2),
    distinciones: (card.common_confusions ?? []).filter((entry) => applicableIds.has(entry.competency_id)).map((entry) => `Frente a ${names.get(entry.competency_id)}: ${entry.difference}`),
  };
}
function focusedCriteria(card, age, applicableIds, names) {
  const ageData = card.ages[String(age)] ?? {};
  return {
    competencia: card.official_name,
    aplica_cuando: [card.ai_meaning, ageData.ai_focus, ...(ageData.observable_patterns ?? [])].filter(Boolean),
    no_aplica_cuando: [...new Set([...(card.do_not_use_when ?? []), ...(card.avoid_when ?? [])])].filter(Boolean),
    distinciones: (card.common_confusions ?? []).filter((entry) => applicableIds.has(entry.competency_id)).map((entry) => `Frente a ${names.get(entry.competency_id)}: ${entry.difference}`),
  };
}
export function buildCriteria(knowledgeBase, rawInput, config = {}, profile = "compact") {
  if (!["compact", "enriched", "focused"].includes(profile)) throw new Error("El perfil de criterios debe ser compact, enriched o focused.");
  const input = validateInput(rawInput, config);
  const applicable = knowledgeBase.cards.filter((card) => (input.age == null && config.benchmark_allow_missing_age === true ?
    Object.values(card.runtime_selectable_by_age).some(Boolean) : card.runtime_selectable_by_age[input.age]) && isApplicable(card, input));
  const applicableIds = new Set(applicable.map((card) => card.id));
  const names = new Map(applicable.map((card) => [card.id, card.official_name]));
  const options = applicable.map((card) => ({ id: card.id, name: card.official_name, criteria: profile === "enriched" ? enrichedCriteria(card, input.age, applicableIds, names) : profile === "focused" ? focusedCriteria(card, input.age, applicableIds, names) : compactCriteria(card, input.age) }));
  if (!options.length) throw new Error("No hay competencias aplicables para esta entrada.");
  const criteria = Object.fromEntries(options.map((option) => [option.id, option.criteria]));
  criteria[NO_CLASSIFIABLE_ID] = profile === "focused" ? { aplica_cuando: "La nota no describe una actuación observable y específica del niño; solo informa presencia, resultado aislado o valoración vaga. No completar hechos ausentes.", no_aplica_cuando: "Hay una actuación concreta vinculada con al menos una competencia aplicable." } : { aplica_cuando: "La observación es insuficiente, irrelevante o no describe una actuación que permita asociar una competencia.", no_aplica_cuando: "No elegir esta opción si la observación describe con claridad una actuación vinculada a una competencia disponible." };
  const instructions = profile === "focused" ? "Selecciona una sola competencia CNEB cuya actuación específica esté más directamente observada. Hablar, usar materiales o estar con otros puede ser solo un medio de otra actuación; no lo conviertas automáticamente en una segunda competencia. No evalúes logro ni inventes hechos o propósito docente. Elige NO_CLASIFICABLE si falta una actuación concreta y suficiente." : "Selecciona una sola opción para la competencia CNEB más directamente sustentada por la observación. No evalúes logro, no inventes actuaciones y no deduzcas un propósito docente que no está escrito. Selecciona NO_CLASIFICABLE cuando la nota no permita una asociación suficiente.";
  return { input, profile, options, optionIds: new Set([...options.map((option) => option.id), NO_CLASSIFIABLE_ID]), criteria, criteriaFingerprint: fingerprint(criteria), instructions };
}

export function buildParallelNoulQuestions(plan) {
  const questions = Object.fromEntries(plan.options.map(({ id, criteria }) => [id, {
    type: "noul",
    instructions: plan.profile === "focused" ? `¿Se observa una actuación propia de la competencia CNEB «${criteria.competencia}»? Puede coexistir con otras competencias. No marques sí solo porque la actuación mencione un tema, material o medio de comunicación; busca evidencia específica sin inventar hechos.${criteria.distinciones?.length ? ` Distinciones: ${criteria.distinciones.join(" ")}` : ""}` : `¿La actuación observada aporta evidencia directa de la competencia CNEB «${criteria.competencia}»? Evalúa solo esta competencia; pueden corresponder varias. No infieras logros, intenciones ni hechos ausentes.${criteria.distinciones?.length ? ` Distinciones pertinentes: ${criteria.distinciones.join(" ")}` : ""}`,
    criteria: {
      true: [...criteria.aplica_cuando, ...(criteria.ejemplos ?? []).map((example) => `Ejemplo: ${example}`)].filter(Boolean).join("; "),
      false: `${plan.profile === "focused" ? "No hay evidencia específica de esta competencia; que también exista otra competencia no decide esta respuesta. Una mención incidental no basta." : "No hay actuación observable suficiente para esta competencia, su mención es incidental o corresponde a otra competencia."} ${[...criteria.no_aplica_cuando, ...(criteria.contraejemplos ?? []).map((example) => `Contraejemplo: ${example}`)].filter(Boolean).join("; ")}`,
    },
  }]));
  return { questions, questionIds: new Set(Object.keys(questions)), fingerprint: fingerprint(questions) };
}

export function buildSufficiencyQuestion() {
  return {
    type: "noul",
    instructions: "¿La nota describe una actuación concreta del niño con detalles suficientes para considerar su relación con alguna competencia CNEB, sin suponer información ausente?",
    criteria: {
      true: "Describe qué hizo o dijo el niño y un referente, objeto, interacción o resultado observable que permita interpretar la actuación.",
      false: "Solo comunica presencia, un juicio vago, un dato aislado o una acción sin referente ni resultado interpretable.",
    },
  };
}
