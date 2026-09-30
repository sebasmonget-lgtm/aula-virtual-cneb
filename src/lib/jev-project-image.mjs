import { stat } from "node:fs/promises";
import path from "node:path";
import { searchProjectImages } from "./image-library.mjs";
import { anonymousDecisionText } from "./jev-competency-suggestion.mjs";
import { createJevOpenRouterDecision } from "./jev-openrouter-decision.mjs";
import { loadKnowledgeBaseV4 } from "./knowledge-base-v4.mjs";

const libraryRoot = path.join(process.cwd(), "assets/project-images");
export const NO_IMAGE = "SIN_COINCIDENCIA";

export async function eligibleProjectImages(project, age, { usedIds = [], search = searchProjectImages,
  imageRoot = libraryRoot, limit = 8, minScore = 5 } = {}) {
  if (![3, 4, 5].includes(Number(age))) return [];
  const ranking = search(project, { usedIds }).filter(({ image, score }) => image.age_range.includes(Number(age))
    && score >= minScore).slice(0, limit);
  const result = [];
  for (const { image, score } of ranking) {
    const file = path.resolve(imageRoot, image.file);
    if (!file.startsWith(`${path.resolve(imageRoot)}${path.sep}`)) continue;
    try { if (!(await stat(file)).isFile()) continue; } catch { continue; }
    result.push({ id: image.id, title: image.title, description: [image.category, image.subcategory,
      ...image.concepts.slice(0, 4), ...image.actions.slice(0, 3), ...image.contexts.slice(0, 2)].join("; "),
    score, file });
  }
  return result;
}

export function publicProjectImage(image) {
  return { id: image.id, title: image.title, description: image.description };
}

export async function suggestProjectImage({ project, age, knownNames = [], candidates = null,
  client = createJevOpenRouterDecision(), loadKb = loadKnowledgeBaseV4 }) {
  const eligible = candidates ?? await eligibleProjectImages(project, age);
  if (!eligible.length) return { suggested_id: null, candidates: [], reason: "no_eligible_images" };
  const state = anonymousDecisionText([project.title, project.purpose, project.situation]
    .filter(Boolean).join(". "), knownNames);
  if (!state) return { suggested_id: null, candidates: eligible.map(publicProjectImage), reason: "private_or_empty_context" };
  const criteria = Object.fromEntries(eligible.map((item) => [item.id, `${item.title}. ${item.description}`]));
  criteria[NO_IMAGE] = "Ninguna imagen corresponde de forma clara al tema y propósito del proyecto.";
  const kb = await loadKb();
  const decision = await client.decide({ workflow: "project_image", state,
    questions: { image: { type: "choice", instructions: "Elige la imagen que mejor represente semánticamente el proyecto según las descripciones. Si no hay coincidencia clara, elige SIN_COINCIDENCIA. No has visto los píxeles.", criteria } },
    kbVersion: kb.version, candidateIds: eligible.map((item) => item.id) });
  const choice = decision.answers.image.choice;
  if (choice !== NO_IMAGE && !eligible.some((item) => item.id === choice)) throw new Error("Jev returned an ineligible image.");
  return { suggested_id: choice === NO_IMAGE ? null : choice,
    candidates: eligible.map(publicProjectImage), reason: "metadata_choice", metadata: decision.metadata };
}
