export const GOLD_FIELDS = new Set(["expected", "expected_primary", "expected_competency_id",
  "acceptable_primary", "acceptable_secondary", "acceptable_secondary_ids", "gold", "correct_answer"]);

export function assertNoBenchmarkLabels(payload) {
  function walk(value) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (GOLD_FIELDS.has(key)) throw new Error(`Data leakage: campo ${key} en inferencia.`);
      walk(child);
    }
  }
  walk(payload);
  // Also reject a serialized gold object embedded inside state or user content.
  const text = JSON.stringify(payload).replaceAll('\\"', '"');
  for (const key of GOLD_FIELDS) if (new RegExp(`"${key}"\\s*:`).test(text))
    throw new Error(`Data leakage: campo serializado ${key} en inferencia.`);
  return payload;
}
