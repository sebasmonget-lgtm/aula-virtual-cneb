/** Select the dated plan proposal to show first; the teacher may choose any other. */
export function recommendAnnualProjectSlot(slots, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || !Array.isArray(slots)) return null;
  const dated = slots.filter((slot) => Number.isInteger(slot.slot_index) && slot.slot_index > 0
    && /^\d{4}-\d{2}-\d{2}$/.test(slot.starts_on) && /^\d{4}-\d{2}-\d{2}$/.test(slot.ends_on))
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on) || a.slot_index - b.slot_index);
  if (!dated.length) return null;
  const current = dated.find((slot) => slot.starts_on <= today && today <= slot.ends_on);
  if (current) return { ...current, reason: "current" };
  const upcoming = dated.find((slot) => slot.starts_on > today);
  if (upcoming) return { ...upcoming, reason: "upcoming" };
  return { ...dated[dated.length - 1], reason: "latest" };
}
