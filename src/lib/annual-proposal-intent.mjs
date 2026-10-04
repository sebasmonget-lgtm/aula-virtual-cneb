import { competencyLabels } from "./competency-labels.mjs";
import { journeyFail } from "./annual-journey-contract.mjs";

export const MAX_PROPOSAL_COMPETENCIES = 5;
const normalized = value => String(value).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Suggestions from explicit curricular language only. The teacher can correct these before generation.
export function namedProposalCompetencies(texts, curriculum) {
  const chosen = new Set();
  for (const text of texts ?? []) for (const sentence of normalized(text).split(/[.;\n]/u)) {
    if (!/\b(?:competencias?|prioriz\w*|trabaj\w*|fortalec\w*|desarroll\w*|enfoc\w*)\b/u.test(sentence)) continue;
    for (const card of curriculum) {
      const names = [card.id, card.name, competencyLabels[card.id]].filter(Boolean);
      for (const name of names) {
        const match = new RegExp(`(?:^|[^a-z0-9_])(${escaped(normalized(name))})(?=$|[^a-z0-9_])`, "u").exec(sentence);
        if (!match) continue;
        const before = sentence.slice(0, match.index + match[0].length - match[1].length);
        if (/\b(?:no|sin|evita\w*|exclu\w*)\s+(?:\w+\s+){0,5}$/u.test(before)) chosen.delete(card.id);
        else chosen.add(card.id);
        break;
      }
    }
  }
  return [...chosen];
}

export function validateProposalCompetencies(ids, curriculum) {
  const allowed = new Set(curriculum.map(card => card.id));
  if (!Array.isArray(ids) || ids.length > MAX_PROPOSAL_COMPETENCIES || ids.some(id => typeof id !== "string" || !allowed.has(id)))
    journeyFail("invalid_competency", "Elige hasta cinco competencias del currículo de tu aula.");
  return [...new Set(ids)];
}

export const proposalTeacherTexts = payload => payload.messages?.some(m => m.role === "teacher") ? payload.messages.filter(m => m.role === "teacher").map(m => m.text) : payload.safe_texts;
export const proposalRequestedCompetencies = (payload, curriculum) => payload.required_competency_ids ?? namedProposalCompetencies(proposalTeacherTexts(payload), curriculum);
export function missingProposalCompetencies(row, required) {
  return required.filter(id => !(row.primary_competency_ids ?? []).includes(id) || !(row.opportunities ?? []).some(opportunity => opportunity.competency_id === id));
}
export function proposalIntentIssues(row, required, curriculum) {
  return missingProposalCompetencies(row, required).map(id => ({proposal_id: row.proposal_id,
    reason: `Falta la competencia elegida por la docente: ${curriculum.find(card => card.id === id)?.name ?? id}. Incluye una oportunidad real con acciones, capacidades, condiciones, mediación, observación y apoyos; no basta agregar el ID.`}));
}
