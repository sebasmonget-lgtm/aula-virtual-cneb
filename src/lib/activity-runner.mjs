export function normalizeStepIndex(stepIndex, totalSteps) {
  if (!Number.isInteger(totalSteps) || totalSteps <= 0) return 0;
  if (!Number.isInteger(stepIndex)) return 0;
  return Math.min(Math.max(stepIndex, 0), totalSteps - 1);
}

export function isValidStepIndex(stepIndex, totalSteps) {
  return Number.isInteger(stepIndex) && Number.isInteger(totalSteps) && totalSteps > 0 && stepIndex >= 0 && stepIndex < totalSteps;
}
