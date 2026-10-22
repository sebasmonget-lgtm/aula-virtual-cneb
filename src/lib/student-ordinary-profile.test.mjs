import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeStudentOrdinaryProfile } from './student-ordinary-profile.mjs';

test('profile retains corrected and unattributed observations without inventing competencies or grades', () => {
  const raw = [{id:'a',status:'corrected',occurred_at:'2026-03-30T12:00:00Z',raw_text:'Original',corrected_text:'Precisó el acuerdo.',source_kind:'spontaneous'},
    {id:'b',status:'active',occurred_at:'2026-04-01T12:00:00Z',raw_text:'Eligió el juego.',source_kind:'spontaneous'},
    {id:'void',status:'voided',occurred_at:'2026-04-02T12:00:00Z',raw_text:'Anulado'}];
  const confirmed = [{id:'a',competency_v4_id:'PS_CONVIVE',observed_at:raw[0].occurred_at},
    {id:'a',competency_v4_id:'MAT_CANTIDAD',observed_at:raw[0].occurred_at},
    {id:'a',competency_v4_id:'MAT_CANTIDAD',observed_at:raw[0].occurred_at},
    {id:'void',competency_v4_id:'COM_ORAL',observed_at:raw[2].occurred_at}];
  const result = mergeStudentOrdinaryProfile([],[],raw,confirmed,new Map());
  assert.equal(result.recentEvidence.length,2);
  assert.equal(result.recentEvidence.find(row=>row.id==='a').observation_text,'Precisó el acuerdo.');
  assert.deepEqual(result.recentEvidence.find(row=>row.id==='b').competency_ids,[]);
  assert.equal(result.competencies.length,2);
  assert.ok(result.competencies.every(row=>row.evidence_count===1&&row.demonstrated===0&&row.with_support===0));
});

test('legacy and modern observations are combined without changing the input or duplicating multi-competency records', () => {
  const legacy=[{competency_key:'v4:COM_ORAL',competency_v4_id:'COM_ORAL',evidence_count:3,last_observed_at:'2026-03-01T12:00:00Z'}];
  const result=mergeStudentOrdinaryProfile(legacy,[{id:'old',observed_at:'2026-03-01T12:00:00Z'}],
    [{id:'new',status:'active',occurred_at:'2026-04-01T12:00:00Z',source_kind:'guided'}],
    [{id:'new',competency_v4_id:'COM_ORAL',observed_at:'2026-04-01T12:00:00Z'}],new Map());
  assert.equal(legacy[0].evidence_count,3);
  assert.equal(result.competencies[0].evidence_count,4);
  assert.equal(result.recentEvidence[0].id,'new');
  assert.equal(result.recentEvidence[1].id,'old');
});
