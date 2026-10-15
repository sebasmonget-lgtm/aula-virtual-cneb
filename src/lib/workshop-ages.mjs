// Shared by the browser and server; no catalogue or server-only imports.
export function workshopAges(workshop) {
  return workshop.ages ?? [workshop.age];
}

export function workshopForAge(workshop, age) {
  if (!workshopAges(workshop).includes(age)) return null;
  const adaptation = workshop.adaptations?.[age];
  // A multi-age label never authorizes a missing pedagogical adaptation.
  if (workshop.ages && !adaptation) return null;
  return {...workshop, ...adaptation, age};
}

export function workshopAgeLabel(workshop) {
  return workshopAges(workshop).join(', ').replace(/, ([^,]*)$/, ' y $1') + ' años';
}
