import { isDeepStrictEqual } from "node:util";

const dateOnly = (value) => String(value ?? "").slice(0, 10);
const generatedFields = new Set(["number", "position", "planned_date"]);

function authoredFields(item) {
  return Object.fromEntries(Object.entries(item ?? {}).filter(([key]) => !generatedFields.has(key)));
}

/** Keep past days and days with real records exactly as the confirmed source version. */
export function assertFutureProjectMapEdits(sourceRoute, nextRoute, { today, recordedRouteIds = [] }) {
  const recorded = new Set(recordedRouteIds);
  const nextById = new Map((nextRoute ?? []).map((item) => [item.id, item]));
  for (const previous of sourceRoute ?? []) {
    if (dateOnly(previous.date) > today && !recorded.has(previous.id)) continue;
    const next = nextById.get(previous.id);
    if (!next || !isDeepStrictEqual(authoredFields(previous), authoredFields(next)))
      throw new Error(`El día ${dateOnly(previous.date)} ya forma parte del historial. Solo puedes cambiar actividades futuras sin registros.`);
  }
}

export function assertProtectedCalendarDates(sourceRoute, selectedDates, { today, recordedRouteIds = [] }) {
  const recorded = new Set(recordedRouteIds);
  const selected = new Set(selectedDates);
  for (const item of sourceRoute ?? []) {
    if ((dateOnly(item.date) <= today || recorded.has(item.id)) && !selected.has(dateOnly(item.date)))
      throw new Error(`El día ${dateOnly(item.date)} ya forma parte del historial y debe mantenerse en el calendario.`);
  }
}
