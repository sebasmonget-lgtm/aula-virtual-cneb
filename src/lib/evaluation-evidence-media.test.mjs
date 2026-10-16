import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluationEvidenceMediaPath} from './evaluation-evidence-media.mjs';
test('evidence uses its existing private storage route, never a public file path',()=>{
  const id='3733544f-3373-4ad6-93e3-df9c62162512';
  assert.equal(evaluationEvidenceMediaPath({id,media_available:true,details:{source:'ordinary_observation'}}),`/api/ordinary-observations/${id}/media`);
  assert.equal(evaluationEvidenceMediaPath({id,media_available:true}),`/api/period-evaluations/evidence/${id}/media`);
  assert.equal(evaluationEvidenceMediaPath({id,media_available:false}),null);
  assert.equal(evaluationEvidenceMediaPath({id:'https://foreign.test',media_available:true}),null);
});
