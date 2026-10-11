export function currentObservationText(observation) {
  return observation?.corrected_text ?? observation?.raw_text ?? "";
}

export function pendingObservationWork({ saved, rawText, photo, editMode, correctedText, reason }) {
  if (!saved) return Boolean(rawText.trim() || photo);
  return Boolean(editMode && (correctedText !== currentObservationText(saved) || reason.trim()));
}
