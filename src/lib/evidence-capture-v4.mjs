export const EVIDENCE_CAPTURE_WORKFLOW = "evidence_capture";
export const OBSERVATION_STATUSES = Object.freeze(["demonstrated", "with_support", "not_yet_demonstrated", "insufficient_information"]);

export class EvidenceCaptureValidationError extends Error {
  constructor(message) { super(message); this.name = "EvidenceCaptureValidationError"; }
}

// Input must come from the authorized activity/criterion join, never the request body.
// Workshop-v1 has no competency_status: its teacher confirmation is atomic with its criterion.
export function criterionMatchesConfirmedActivity(criterion) {
  if (!criterion.competency_v4_id) return true;
  const details = criterion.activity_details;
  if (details?.competency_id !== criterion.competency_v4_id) return false;
  if (details.competency_status === "confirmed") return true;
  return details.competency_status == null && criterion.experience_type === "workshop"
    && Boolean(criterion.activity_confirmed_at) && Boolean(criterion.linked_main_activity_id)
    && Number.isInteger(criterion.workshop_item_index) && criterion.workshop_item_index > 0;
}

export function validateEvidenceCaptureV4({ studentId, activityId, criterionId, observationStatus = null, observationText, photo, media } = {}) {
  if (![studentId, activityId, criterionId].every((value) => typeof value === "string" && value.trim())) throw new EvidenceCaptureValidationError("Selecciona estudiante, actividad y criterio.");
  if (observationStatus != null && !OBSERVATION_STATUSES.includes(observationStatus)) throw new EvidenceCaptureValidationError("Selecciona una marca observacional válida.");
  if (observationText != null && (typeof observationText !== "string" || observationText.trim().length > 4000)) throw new EvidenceCaptureValidationError("La observación no puede superar 4000 caracteres.");
  const note = typeof observationText === "string" ? observationText.trim() : "";
  if (!note && !photo && !media) throw new EvidenceCaptureValidationError("Describe lo que observaste o adjunta una foto o audio.");
  return { studentId: studentId.trim(), activityId: activityId.trim(), criterionId: criterionId.trim(), observationStatus, observationText: note };
}

export function buildEvidenceCaptureContext({ activity, criterion, student }) {
  return Object.freeze({ workflow: EVIDENCE_CAPTURE_WORKFLOW, activity: { id: activity.id, title: activity.title }, criterion: { id: criterion.id, criterion_text: criterion.criterion_text, competency_id: criterion.competency_id ?? null, competency_v4_id: criterion.competency_v4_id ?? null, expected_evidence: criterion.details?.expected_evidence ?? null, observation_focus: criterion.details?.observation_focus ?? [], acceptable_evidence_variations: criterion.details?.acceptable_evidence_variations ?? [], evidence_scope: criterion.details?.evidence_scope ?? null, teacher_caution: criterion.details?.teacher_caution ?? null }, student: { id: student.id } });
}
