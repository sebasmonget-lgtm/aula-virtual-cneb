// JSONB preserves values, not object-key insertion order. Array order remains meaningful.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonical(value[key])]),
  );
  return value;
}
const differs = (saved, edited) => JSON.stringify(canonical(saved)) !== JSON.stringify(canonical(edited));
export { differs as jsonValuesDiffer };

export function projectDraftChanges(details, decisions, dependents, route) {
  return {
    decisionsChanged: Boolean(details?.decisions && decisions && differs(details.decisions, decisions)),
    depChanged: Boolean(details?.dependents && dependents && differs(details.dependents, dependents)),
    mapChanged: Boolean(details?.activity_route && differs(details.activity_route, route)),
  };
}
