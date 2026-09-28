import { availableSheets, rankWorkshopSheets, selectWorkshopSheet } from "./workshop-sheet-catalog.mjs";
import { anonymousDecisionText } from "./jev-competency-suggestion.mjs";
import { createJevOpenRouterDecision } from "./jev-openrouter-decision.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";

export const NO_SHEET = "SIN_FICHA";

/** The catalog has already checked source, review status, age, competency and PDF bytes. */
export async function eligibleWorkshopSheets({ age, competencyId, intention, topic = "",
  loadSheets = availableSheets, limit = 6 }) {
  const available = await loadSheets({ age, competencyId });
  return rankWorkshopSheets(available, { age, competencyId, intention, topic }).slice(0, limit);
}

export async function suggestWorkshopSheet({ age, competencyId, intention, topic = "", candidates = null,
  knownNames = [],
  client = createJevOpenRouterDecision(), loadKb = loadKnowledgeBaseV4 }) {
  const eligible = candidates ?? await eligibleWorkshopSheets({ age, competencyId, intention, topic });
  if (!eligible.length) return { sheet: null, reason: "no_eligible_sheets" };
  const state = anonymousDecisionText([intention, topic].filter(Boolean).join(". "), knownNames);
  if (!state) return { sheet: null, reason: "private_or_empty_context" };
  const criteria = Object.fromEntries(eligible.map((item) => [item.id,
    `${item.title}. Intención: ${item.intention}. Acciones: ${item.actions.slice(0, 4).join("; ")}. ${item.description}`]));
  criteria[NO_SHEET] = "Ninguna ficha aporta de forma pertinente al propósito y actuación observable del taller.";
  const kb = await loadKb();
  const decision = await client.decide({ workflow: "workshop_sheet", state,
    questions: { sheet: { type: "choice", instructions: "Selecciona una ficha solo si complementa el taller después del juego o exploración. Usa SIN_FICHA si ninguna corresponde. Solo conoces metadatos textuales; no has visto el PDF.", criteria } },
    kbVersion: kb.version, candidateIds: eligible.map((item) => item.id) });
  const choice = decision.answers.sheet.choice;
  const sheet = choice === NO_SHEET ? null : eligible.find((item) => item.id === choice);
  if (choice !== NO_SHEET && !sheet) throw new Error("Jev returned an ineligible workshop sheet.");
  return { sheet: sheet ?? null, reason: "metadata_choice", metadata: decision.metadata };
}

/** Preserve the existing deterministic selector whenever Jev cannot decide. */
export async function attachWorkshopSheetsWithJev(master, route, age, { topic = "",
  knownNames = [],
  suggest = suggestWorkshopSheet, fallback = selectWorkshopSheet } = {}) {
  const items = [];
  for (const [index, item] of master.items.entries()) {
    const intention = [item.purpose, item.observation_focus, item.brief_outline, route[index]?.title].join(" ");
    let sheet = null, sheetReason = null;
    try {
      const decision = await suggest({ age, competencyId: item.competency_id, intention, topic, knownNames });
      sheet = decision.sheet;
      sheetReason = sheet ? "Sugerida por similitud de metadatos; revisa si complementa el taller." : null;
    } catch {
      try { sheet = await fallback({ age, competencyId: item.competency_id, intention, topic }); }
      catch { sheet = null; }
      sheetReason = sheet ? "Sugerida por el catálogo; revisa si complementa el taller." : null;
    }
    items.push({ ...item, day_decision: "suggested", sheet_id: sheet?.id ?? null, sheet_reason: sheetReason });
  }
  return { items };
}
