import { readFile } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_DIAGNOSTIC_CATALOG_PATH = path.join(process.cwd(), "knowledge/diagnostic-experiences/catalog.json");

export function validateDiagnosticCatalog(document, competencyCards) {
  if (!document || typeof document.version !== "string" || !/^[a-z0-9.-]+$/i.test(document.version)
    || !["development_fixture", "reviewed", "active"].includes(document.status)
    || !Array.isArray(document.experiences) || document.experiences.length === 0)
    throw new Error("Catálogo diagnóstico inválido: versión, estado o experiencias.");
  const cards = new Map(competencyCards.map((card) => [card.id, card]));
  const ids = new Set();
  const sortOrders = new Set();
  for (const experience of document.experiences) {
    if (!/^[a-z0-9_]+$/.test(experience.id ?? "") || ids.has(experience.id)
      || !experience.title?.trim() || !experience.explanation?.trim() || !experience.teacher_instructions?.trim()
      || !Number.isInteger(experience.sort_order) || experience.sort_order < 1 || sortOrders.has(experience.sort_order) || typeof experience.active !== "boolean"
      || !Array.isArray(experience.examples) || experience.examples.some((item) => typeof item !== "string" || !item.trim())
      || !Array.isArray(experience.ages) || !experience.ages.length
      || experience.ages.some((age) => ![3,4,5].includes(age)) || new Set(experience.ages).size !== experience.ages.length
      || !Array.isArray(experience.aspects) || !experience.aspects.length || experience.aspects.length > 5)
      throw new Error(`Experiencia diagnóstica inválida: ${experience.id ?? "sin ID"}.`);
    ids.add(experience.id);
    sortOrders.add(experience.sort_order);
    const aspects = new Set();
    for (const aspect of experience.aspects) {
      if (!/^[a-z0-9_]+$/.test(aspect.id ?? "") || aspects.has(aspect.id)
        || !aspect.label?.trim() || aspect.label.length > 55
        || !aspect.prompt?.trim() || aspect.prompt.length > 120 || /^\s*[¿?]/.test(aspect.prompt)
        || !Array.isArray(aspect.examples) || aspect.examples.length < 2 || aspect.examples.length > 3
        || aspect.examples.some((example) => typeof example !== "string" || !example.trim() || example.length > 150)
        || !cards.has(aspect.competencyId)
        || !Number.isInteger(aspect.patternIndex) || aspect.patternIndex < 0)
        throw new Error(`Aspecto diagnóstico inválido: ${experience.id}/${aspect.id ?? "sin ID"}.`);
      for (const age of experience.ages) {
        const card = cards.get(aspect.competencyId);
        if (card.runtime_selectable_by_age?.[String(age)] && !card.ages?.[String(age)]?.observable_patterns?.[aspect.patternIndex])
          throw new Error(`Referente ausente: ${experience.id}/${aspect.id}/${age}.`);
      }
      aspects.add(aspect.id);
    }
  }
  return document;
}

/** Import format is a versioned JSON file reviewed before activating it. No teacher-facing CMS. */
export async function loadDiagnosticCatalog(competencyCards, path = DEFAULT_DIAGNOSTIC_CATALOG_PATH) {
  return validateDiagnosticCatalog(JSON.parse(await readFile(path, "utf8")), competencyCards);
}
