import catalog from "../../public/project-illustrations/index.json" with { type: "json" };

export const projectPictogramCatalog = catalog;
const byId = new Map(catalog.images.map(image => [image.id, image]));
const normalize = text => String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/gu, "")
  .toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim();
const words = text => normalize(text).split(" ").map(word => word.length > 4 && word.endsWith("es") ? word.slice(0, -2)
  : word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word).join(" ");
const generic = new Set(["juego", "juegos", "crear", "formas", "representar", "cuidar", "cuidado", "explorar", "conocer", "aprender", "participar", "juntos", "juntas"].map(words));
const hasPhrase = (text, phrase) => ` ${words(text)} `.includes(` ${words(phrase)} `);
function score(image, text) {
  // A multiword concept must match as a phrase: «cuerpo» alone is not «cuidado del cuerpo».
  const terms = [...new Set([...image.concepts, ...image.objects].map(words))]
    .filter(term => term && !generic.has(term));
  const matched = terms.filter(term => hasPhrase(text, term));
  const specific = (image.match_phrases ?? []).filter(term => hasPhrase(text, term));
  return matched.length * 4 + specific.length * 20;
}

/** Match complete topics and meaningful phrases; title takes precedence over supporting prose. */
export function searchProjectPictograms(project) {
  const value = typeof project === "string" ? { title: project } : project ?? {};
  const primary = new Set(value.primary_competency_ids ?? []);
  const projectCompetencies = new Set([...primary, ...(value.opportunities ?? []).map(item => item.competency_id)]);
  const candidates = catalog.images.filter(image => image.category !== "general").map(image => {
    const titleScore = score(image, value.title);
    // Actions and invitation help resolve metaphorical titles; materials/curricular labels do not.
    const context = [value.purpose, value.situation, value.invitation,
      ...(Array.isArray(value.children_actions) ? value.children_actions : [])].filter(Boolean).join(" ");
    const supportingTopic = normalize(context).replace(/\b(ninos?|ninas?|aula|grupo|proyectos?|aprendizaje|educacion|inicial)\b/gu, " ");
    const contextScore = score(image, supportingTopic);
    const competencyScore = (image.competency_ids ?? []).reduce((sum, id) => sum + (primary.has(id) ? 6 : projectCompetencies.has(id) ? 3 : 0), 0)
      + (image.fallback_competency_ids ?? []).filter(id => projectCompetencies.has(id)).length * 4;
    // Generic curricular fallback is allowed only for an illustration expressly assigned that role.
    const curriculumFallback = (image.fallback_competency_ids ?? []).some(id => projectCompetencies.has(id));
    return { image, titleScore, contextScore, competencyScore, curriculumFallback };
  });
  const meaningful = candidates.filter(item => item.titleScore > 0 || item.contextScore > 0);
  return (meaningful.length ? meaningful : candidates.filter(item => item.curriculumFallback))
    .sort((a, b) => b.titleScore - a.titleScore || (b.contextScore + b.competencyScore) - (a.contextScore + a.competencyScore)
      || b.image.priority - a.image.priority || a.image.id.localeCompare(b.image.id));
}

/** Allow only catalog IDs; missing/unknown topics use a neutral idea, never a repeated leaf. */
export function selectProjectPictogram(project) {
  const explicit = typeof project === "object" && project && byId.get(project.pictogram_id);
  if (explicit) return { ...explicit, selection: "explicit" };
  const candidate = searchProjectPictograms(project)[0];
  return { ...(candidate?.image ?? byId.get("ideas")), selection: candidate ? "metadata" : "fallback" };
}
