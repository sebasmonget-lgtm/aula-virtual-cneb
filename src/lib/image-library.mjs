import index from "../../assets/project-images/index.json" with { type: "json" };
import { imageIndexSchema } from "./image-library-schema.mjs";

const images = imageIndexSchema.parse(index).images;
import { matches, queryTokens, scoreImage } from "./image-library-score.mjs";
export { scoreImage } from "./image-library-score.mjs";

export function searchProjectImages(project, options = {}) {
  return images.map((image) => ({ image, score: scoreImage(image, project, options) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.image.priority - a.image.priority || a.image.id.localeCompare(b.image.id));
}

/** Returns null when the library has no relevant illustration. */
export function selectProjectImage(project, options = {}) {
  const ranking = searchProjectImages(project, options);
  const minimum = options.minScore ?? 5;
  let selected = ranking.find(({ score }) => score >= minimum);
  if (!selected) {
    const query = queryTokens(project);
    selected = ranking.find(({ image }) => matches(query, [image.category]) > 0)
      ?? ranking.find(({ image }) => image.category === "general");
  }
  if (!selected) return null;
  return { id: selected.image.id, path: `assets/project-images/${selected.image.file}`, score: selected.score };
}
