import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";
import { competencyLabels } from "./competency-labels.mjs";

export const annualJourneyCurriculumTerms = curriculum => curriculum.flatMap(card => [card.name, competencyLabels[card.id]].filter(Boolean));

// Compatibility entry point. Teacher prose is no longer anonymized or filtered by vocabulary.
export function annualJourneySafeText(value) {
  if (typeof value !== "string" || value.length > 8000) return "";
  return neutralizeAssessmentText(value).trim();
}
