const date = key => new Date(`${key}T00:00:00Z`);
const key = value => value.toISOString().slice(0, 10);
export function calendarWeekDays(selected) {
  const start = date(selected);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, offset) => key(new Date(start.getTime() + offset * 86400000)));
}
export function navigateCalendarPeriod(view, selected, cursor, direction) {
  if (view === "week") {
    const next = date(selected); next.setUTCDate(next.getUTCDate() + 7 * direction);
    return { selected: key(next), cursor: new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), 1)) };
  }
  return { selected, cursor: new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + direction * (view === "year" ? 12 : 1), 1)) };
}
export function calendarWeekLabel(selected) {
  const days = calendarWeekDays(selected);
  const format = value => new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date(value));
  return `${format(days[0])} – ${format(days[6])}`;
}
