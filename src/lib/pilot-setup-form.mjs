// Read the visible form at submission time as well as React's draft: browser
// restoration and autofill do not always dispatch React input/change events.
export function readPilotSetupForm(formData, draft) {
  const result = { ...draft };
  for (const key of ['teacherName', 'institutionName', 'section', 'institutionCode', 'district', 'ugel', 'directorName']) {
    result[key] = String(formData.get(key) ?? '');
  }
  const age = Number(formData.get('age'));
  result.age = [3, 4, 5].includes(age) ? age : null;
  result.year = Number(formData.get('year'));
  return result;
}
