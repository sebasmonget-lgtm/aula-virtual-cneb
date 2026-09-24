import { createHash } from "node:crypto";
import { NO_CLASSIFIABLE_ID, SPECIAL_COMPETENCIES } from "./constants.mjs";
import { validateInput } from "./validation.mjs";

const fingerprint = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const isApplicable = (card, input) => !SPECIAL_COMPETENCIES[card.id] || input.applicability[SPECIAL_COMPETENCIES[card.id]] === true;
function compactCriteria(card, age) {
  const ageData = card.ages[String(age)];
  return { competencia: card.official_name, aplica_cuando: [card.ai_meaning, ageData.ai_focus, ...(ageData.observable_patterns ?? []).slice(0, 3)], no_aplica_cuando: (card.do_not_use_when ?? card.avoid_when ?? []).slice(0, 2) };
}
export function buildCriteria(knowledgeBase, rawInput, config = {}) {
  const input = validateInput(rawInput, config);
  const options = knowledgeBase.cards.filter((card) => card.runtime_selectable_by_age[input.age] && isApplicable(card, input)).map((card) => ({ id: card.id, name: card.official_name, criteria: compactCriteria(card, input.age) }));
  if (!options.length) throw new Error("No hay competencias aplicables para esta entrada.");
  const criteria = Object.fromEntries(options.map((option) => [option.id, option.criteria]));
  criteria[NO_CLASSIFIABLE_ID] = { aplica_cuando: "La observación es insuficiente, irrelevante o no describe una actuación que permita asociar una competencia.", no_aplica_cuando: "No elegir esta opción si la observación describe con claridad una actuación vinculada a una competencia disponible." };
  return { input, options, optionIds: new Set([...options.map((option) => option.id), NO_CLASSIFIABLE_ID]), criteria, criteriaFingerprint: fingerprint(criteria), instructions: "Selecciona una sola opción para la competencia CNEB más directamente sustentada por la observación. No evalúes logro, no inventes actuaciones y no deduzcas un propósito docente que no está escrito. Selecciona NO_CLASIFICABLE cuando la nota no permita una asociación suficiente." };
}
