/**
 * Dates come from the workspace server; selecting a period never changes it.
 * @template {{id:string, starts_on:string, ends_on:string}} T
 * @param {T[]} periods
 * @param {string} today
 * @param {string|null} requestedId
 * @returns {T|null}
 */
export function selectEvaluationPeriod(periods, today, requestedId = null) {
  const explicit = periods.find(period => period.id === requestedId);
  if (explicit) return explicit;
  const ordered = [...periods].sort((a, b) => a.starts_on.localeCompare(b.starts_on));
  return ordered.find(period => period.starts_on <= today && period.ends_on >= today)
    ?? ordered.filter(period => period.ends_on < today).at(-1)
    ?? ordered[0]
    ?? null;
}
