import test from 'node:test';
import assert from 'node:assert/strict';
import { annualFollowupForSnapshot,currentAnnualObservationCount } from './annual-current-context.mjs';

test('a refreshed plan retires only the global no-observations claim and preserves cautions and child-specific gaps', () => {
  const snapshot={facts:[{key:'a',kind:'observed'},{key:'a',kind:'observed'},{key:'b',kind:'observed'},
    {key:'old',kind:'observed',uncertainty:'historical_source_preserved_for_trace'},{key:'family',kind:'family_report'}]};
  const original=['Aún no hay actuaciones observadas. No se atribuyen niveles.', 'Aún no hay observaciones de otro niño.'];
  const next=annualFollowupForSnapshot(original,snapshot);
  assert.equal(currentAnnualObservationCount(snapshot),2);
  assert.equal(next[0],'Esta versión incorpora 2 registros de observación. No se atribuyen niveles.');
  assert.equal(next[1],original[1]);
  assert.equal(original[0],'Aún no hay actuaciones observadas. No se atribuyen niveles.');
  assert.deepEqual(annualFollowupForSnapshot(original,{facts:[]}),original);
});
