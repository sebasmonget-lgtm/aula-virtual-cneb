/** Counts records, never performance or sufficiency. Automatic suggestions do not count as teacher attribution. */
export function observationCoverage(guided = [], spontaneous = []) {
  const cells = new Map();
  const add = (student, competency, record) => {
    if (!student || !competency) return;
    const key = `${student}:${competency}`, records = cells.get(key) ?? new Set();
    records.add(record); cells.set(key,records);
  };
  for (const record of guided) if (record.observation_text?.trim()) add(record.student_id,record.competency_v4_id,record.id);
  for (const record of spontaneous) if (record.classification_source === "teacher" && record.observation_text?.trim())
    for (const id of record.competency_v4_ids ?? []) add(record.student_id,id,record.id);
  return Object.fromEntries([...cells].map(([key,records])=>[key,records.size]));
}
export function coverageLabel(count) { return count === 0 ? "Sin registros" : count === 1 ? "Pocos registros · 1" : `Hay registros · ${count}`; }
