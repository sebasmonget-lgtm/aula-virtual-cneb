import { createHash } from "node:crypto";
import catalog from "../../curriculum/official/initial-performances-v1.json" with { type: "json" };

export const OFFICIAL_PERFORMANCE_VERSION = catalog.version;
export const OFFICIAL_PERFORMANCE_SOURCE = Object.freeze({ ...catalog.source });
const byId = new Map();
for (const row of catalog.performances) {
  if (byId.has(row.id) || ![3, 4, 5].includes(row.age) ||
      createHash("sha256").update(row.text).digest("hex") !== row.content_sha256)
    throw new Error("Catálogo de desempeños oficiales inconsistente.");
  byId.set(row.id, Object.freeze({ ...row }));
}

export function officialPerformances(competencyId, age) {
  if (![3, 4, 5].includes(age)) throw new RangeError("La edad curricular debe ser 3, 4 o 5.");
  return [...byId.values()].filter(row => row.competency_id === competencyId && row.age === age);
}

/** Missing refs are allowed only for historical content. Never guess from words. */
export function validateOfficialPerformanceRefs(refs, competencyId, age, { required = false } = {}) {
  if (refs === undefined && !required) return [];
  if (!Array.isArray(refs) || refs.length > 3 || new Set(refs).size !== refs.length)
    throw new Error("Referentes curriculares inválidos.");
  const rows = refs.map(id => byId.get(id));
  if (rows.some(row => !row || row.competency_id !== competencyId || (age != null && row.age !== age)))
    throw new Error("El desempeño debe corresponder a la competencia y edad del aula.");
  if (required && officialPerformances(competencyId, age).length && !rows.length)
    throw new Error("Selecciona al menos un desempeño pertinente del catálogo recibido.");
  return rows;
}

export function officialPerformanceContext(competencyIds, age) {
  return { version: catalog.version, source: OFFICIAL_PERFORMANCE_SOURCE,
    selection_rule: "Selecciona IDs por el sentido completo de la actuación y el criterio. No por palabras coincidentes. No copies el desempeño como consigna, no exijas todo su alcance en un día y no atribuyas logros. Si no hay desempeño para esa edad, usa [] y el referente de ciclo, sin copiar otra edad.",
    competencies: [...new Set(competencyIds)].map(competency_id => ({ competency_id, age,
      performances: officialPerformances(competency_id, age),
      status: officialPerformances(competency_id, age).length ? "source_mapped" : "no_age_specific_performance" })) };
}

/** Read-only enrichment; the immutable KB source and semantic review status stay intact. */
export function withOfficialPerformanceMapping(card) {
  return { ...card, official_text_mapping: { ...card.official_text_mapping,
    performance_catalog_version: catalog.version,
    official_performance_refs_by_age: Object.fromEntries([3, 4, 5].map(age => [age, officialPerformances(card.id, age).map(row => row.id)])),
    performance_mapping_status: "source_mapped" },
    ages: Object.fromEntries(Object.entries(card.ages).map(([age, reference]) => [age, { ...reference,
      official_performance_ids: officialPerformances(card.id, Number(age)).map(row => row.id) }])) };
}
