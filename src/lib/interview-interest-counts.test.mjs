import test from 'node:test';
import assert from 'node:assert/strict';
import {countInterviewInterests} from './interview-interest-counts.mjs';
import {interviewInterestOptions} from './family-interview-contract.mjs';
import {derivedDiagnosticGroupInformation} from './diagnostic-assessment-v4.mjs';
test('historical nature and plants are one interest and one count per family',()=>{
  const rows=[{details:{interest_tags:['nature','plants']}},{details:{interest_tags:['nature']}},{details:{interest_tags:['plants','animals']}}];
  const original=structuredClone(rows),result=countInterviewInterests(rows,interviewInterestOptions);
  assert.equal(result.find(item=>item.key==='plants').count,3);
  assert.equal(result.find(item=>item.key==='animals').count,1);
  assert.equal(result.some(item=>item.key==='nature'),false);assert.deepEqual(rows,original);
  assert.equal(derivedDiagnosticGroupInformation(rows,[]).interests.find(item=>item.key==='plants').count,3);
  assert.equal(derivedDiagnosticGroupInformation(rows,[]).interests.find(item=>item.key==='animals').count,1);
});
