// Presentation-only selections. No pedagogical content belongs in navigation.
export function calendarLocationDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value ? value : undefined;
}

export function restoreTeacherIdea(ideas, removed) {
  if (!removed || ideas.length >= 10 || ideas.some((idea) => idea.id === removed.idea.id)) return ideas;
  const next = [...ideas];
  next.splice(Math.min(removed.index, next.length), 0, removed.idea);
  return next;
}
