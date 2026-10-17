import test from 'node:test';
import assert from 'node:assert/strict';
import { readPilotSetupForm } from './pilot-setup-form.mjs';
import { validatePilotSetup } from './pilot-onboarding-service.mjs';
import { pilotSchoolYearDefaults } from './pilot-school-year-defaults.mjs';

const visible = (patch = {}) => {
  const form = new FormData();
  for (const [key, value] of Object.entries({ teacherName: 'Elena QA', institutionName: 'Colegio QA', section: 'Celeste', age: '5', year: '2026', ...patch })) form.set(key, value);
  return form;
};
test('restored visible values override a stale draft and produce a valid setup request', () => {
  const stale = { teacherName: '', institutionName: '', section: '', age: null, year: 2025 };
  const input = readPilotSetupForm(visible(), stale);
  assert.equal(validatePilotSetup({ ...input, ...pilotSchoolYearDefaults(input.year) }).teacherName, 'Elena QA');
  assert.equal(input.section, 'Celeste'); assert.equal(input.age, 5); assert.equal(input.year, 2026);
  assert.equal(stale.teacherName, ''); assert.equal(stale.age, null);
});
test('submission keeps the existing logo while using visible optional fields and intentional clears', () => {
  const logoUpload = { mimeType: 'image/png', base64: 'YWJj' };
  const result = readPilotSetupForm(visible({ ugel: 'UGEL QA', district: '', institutionCode: 'QA-123', directorName: 'Directora QA' }), { district: 'Anterior', logoUpload, createLogo: false });
  assert.deepEqual(result.logoUpload, logoUpload); assert.equal(result.createLogo, false);
  assert.equal(result.ugel, 'UGEL QA'); assert.equal(result.district, ''); assert.equal(result.institutionCode, 'QA-123'); assert.equal(result.directorName, 'Directora QA');
});
test('a clickable submission never makes incomplete, blank or unsupported fields valid', () => {
  for (const patch of [{ teacherName: ' ' }, { institutionName: ' ' }, { section: ' ' }, { age: '' }, { age: '2' }]) {
    const input = readPilotSetupForm(visible(patch), {});
    assert.throws(() => validatePilotSetup({ ...input, ...pilotSchoolYearDefaults(2026) }), /Completa/);
  }
  assert.equal(pilotSchoolYearDefaults(readPilotSetupForm(visible({ year: '2027' }), {}).year), null);
});
