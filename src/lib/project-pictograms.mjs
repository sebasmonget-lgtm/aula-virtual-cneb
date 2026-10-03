import catalog from "../../public/project-pictograms/index.json" with { type: "json" };
import { scoreImage } from "./image-library-score.mjs";

export const projectPictogramCatalog = catalog;
const byId = new Map(catalog.images.map(image => [image.id, image]));
const topicText = text => String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/gu, "")
  .replace(/\b(cuidamos|cuidar|cuidado|cuidando|cuida|cuidan|explorar|exploramos|explorando|descubrimos|descubrir|conocer|conocemos|aprender|aprendemos|participar)\b/giu, " ");
const supportingTopic = text => topicText(text)
  .replace(/\b(ninos?|ninas?|aula|grupo|proyecto|proyectos|aprendizaje|educacion|inicial)\b/giu, " ");

/** Same metadata vocabulary as the Word library, with title relevance ahead of supporting prose. */
export function searchProjectPictograms(project) {
  const value = typeof project === "string" ? { title: project } : project ?? {};
  return catalog.images.filter(image => image.category !== "general").map(image => {
    // General actions/context do not make an illustration relevant (e.g. every project explores).
    const topic = { ...image, actions: [], contexts: [], category: "", subcategory: "" };
    const titleScore = scoreImage(topic, topicText(value.title));
    const contextScore = scoreImage(topic, { purpose: supportingTopic(value.purpose), situation: supportingTopic(value.situation) });
    return { image, titleScore, contextScore };
  }).filter(item => item.titleScore > 0 || item.contextScore > 0)
    .sort((a, b) => b.titleScore - a.titleScore || b.contextScore - a.contextScore || b.image.priority - a.image.priority || a.image.id.localeCompare(b.image.id));
}

/** Allow only catalog IDs; missing/unknown topics use a neutral idea, never a repeated leaf. */
export function selectProjectPictogram(project) {
  const explicit = typeof project === "object" && project && byId.get(project.pictogram_id);
  if (explicit) return { ...explicit, selection: "explicit" };
  const candidate = searchProjectPictograms(project)[0];
  return { ...(candidate?.image ?? byId.get("ideas")), selection: candidate ? "metadata" : "fallback" };
}
