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
    for (const field of ['age_support', 'teacher_instructions_by_age']) {
      if (experience[field] !== undefined && (!experience[field] || Array.isArray(experience[field])
        || Object.entries(experience[field]).some(([age, text]) => !experience.ages.includes(Number(age)) || typeof text !== 'string' || !text.trim() || text.length > 400)))
        throw new Error(`Adecuación por edad inválida: ${experience.id}/${field}.`);
    }
    const aspects = new Set();
    for (const aspect of experience.aspects) {
      if (!/^[a-z0-9_]+$/.test(aspect.id ?? "") || aspects.has(aspect.id)
        || !aspect.label?.trim() || aspect.label.length > 100
        || !aspect.prompt?.trim() || aspect.prompt.length > 120 || /^\s*[¿?]/.test(aspect.prompt)
        || !Array.isArray(aspect.examples) || aspect.examples.length < 2 || aspect.examples.length > 3
        || aspect.examples.some((example) => typeof example !== "string" || !example.trim() || example.length > 150)
        || !cards.has(aspect.competencyId)
        || !Number.isInteger(aspect.patternIndex) || aspect.patternIndex < 0)
        throw new Error(`Aspecto diagnóstico inválido: ${experience.id}/${aspect.id ?? "sin ID"}.`);
      if (aspect.teacher_steps !== undefined && (!Array.isArray(aspect.teacher_steps) || aspect.teacher_steps.length < 2 || aspect.teacher_steps.length > 3
        || aspect.teacher_steps.some(step => typeof step !== 'string' || !step.trim() || step.length > 200)
        || new Set(aspect.teacher_steps).size !== aspect.teacher_steps.length
        || typeof aspect.look_for !== 'string' || !aspect.look_for.trim() || aspect.look_for.length > 350
        || typeof aspect.moment_title !== 'string' || !aspect.moment_title.trim() || aspect.moment_title.length > 100))
        throw new Error(`Guía editorial inválida: ${experience.id}/${aspect.id}.`);
      if (aspect.patternIndexByAge !== undefined && (!aspect.patternIndexByAge || Array.isArray(aspect.patternIndexByAge)
        || Object.entries(aspect.patternIndexByAge).some(([age, index]) => !experience.ages.includes(Number(age)) || !Number.isInteger(index) || index < 0)))
        throw new Error(`Referente por edad inválido: ${experience.id}/${aspect.id}.`);
      for (const age of experience.ages) {
        const card = cards.get(aspect.competencyId);
        const index = aspect.patternIndexByAge?.[String(age)] ?? aspect.patternIndex;
        if (card.runtime_selectable_by_age?.[String(age)] && !card.ages?.[String(age)]?.observable_patterns?.[index])
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
