export const EVIDENCE_CAPTURE_WORKFLOW = "evidence_capture";
export const OBSERVATION_STATUSES = Object.freeze(["demonstrated", "with_support", "not_yet_demonstrated", "insufficient_information"]);

export class EvidenceCaptureValidationError extends Error {
  constructor(message) { super(message); this.name = "EvidenceCaptureValidationError"; }
}

export function validateEvidenceCaptureV4({ studentId, activityId, criterionId, observationStatus = null, observationText, photo } = {}) {
  if (![studentId, activityId, criterionId].every((value) => typeof value === "string" && value.trim())) throw new EvidenceCaptureValidationError("Selecciona estudiante, actividad y criterio.");
  if (observationStatus != null && !OBSERVATION_STATUSES.includes(observationStatus)) throw new EvidenceCaptureValidationError("Selecciona una marca observacional válida.");
  if (observationText != null && (typeof observationText !== "string" || observationText.trim().length > 4000)) throw new EvidenceCaptureValidationError("La observación no puede superar 4000 caracteres.");
  const note = typeof observationText === "string" ? observationText.trim() : "";
  if (!note && !photo) throw new EvidenceCaptureValidationError("Describe lo que observaste o adjunta una foto.");
  return { studentId: studentId.trim(), activityId: activityId.trim(), criterionId: criterionId.trim(), observationStatus, observationText: note };
}

export function buildEvidenceCaptureContext({ activity, criterion, student }) {
  return Object.freeze({ workflow: EVIDENCE_CAPTURE_WORKFLOW, activity: { id: activity.id, title: activity.title }, criterion: { id: criterion.id, criterion_text: criterion.criterion_text, competency_id: criterion.competency_id ?? null, competency_v4_id: criterion.competency_v4_id ?? null, expected_evidence: criterion.details?.expected_evidence ?? null, observation_focus: criterion.details?.observation_focus ?? [], acceptable_evidence_variations: criterion.details?.acceptable_evidence_variations ?? [], evidence_scope: criterion.details?.evidence_scope ?? null, teacher_caution: criterion.details?.teacher_caution ?? null }, student: { id: student.id } });
}
