// Family wording is a reviewed reading version; the confirmed source fields stay intact.
export const familyWordingFields = ['progress_summary', 'examples', 'support_or_conditions', 'next_steps'];

export function familyReportSectionForReader(section) {
  const wording = section?.family_wording;
  return wording?.version === 1 ? { ...section, ...Object.fromEntries(familyWordingFields.map(field => [field, wording[field]])) } : section;
}
