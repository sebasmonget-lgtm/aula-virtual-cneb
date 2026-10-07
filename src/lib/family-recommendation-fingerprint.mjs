import { stableFingerprint } from "./source-fingerprint-v4.mjs";
import { loadConfirmedFamilyContext } from "./family-interview-projection.mjs";

/** This source invalidates recommendations only, never evidence or teacher grades. */
export const familyRecommendationFingerprint = interview => stableFingerprint(interview ? {
  source_type: "family_reported_context", version: interview.version, details: interview.details,
} : { source_type: "family_reported_context", version: null });

export async function currentFamilyRecommendationFingerprint(db, classroomId, studentId) {
  return familyRecommendationFingerprint(await loadConfirmedFamilyContext(db, classroomId, studentId));
}
