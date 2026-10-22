import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareRecoverableFamilyReport,conclusionSourceSnapshot,buildFamilyReportFallback } from './family-report-v4-service.mjs';
const conclusions=[{id:'c1',competency_v4_id:'COM_ORAL',period_start:'2026-03-16',period_end:'2026-05-15',version:1,
  teacher_confirmed_at:'2026-05-15T12:00:00Z',updated_at:'2026-05-15T12:00:00Z',details:{information_status:'sufficient',
    conclusion_text:'Explica una idea del juego y escucha a sus compañeros.',progress_examples:['Explicó por dónde podría pasar el grupo.'],
    support_or_conditions:['Respondió a una pregunta abierta.'],next_steps:['Conversar en grupos pequeños.'],insufficiency_reason:null}}];
const scope={competencyIds:['COM_ORAL'],conclusions,snapshot:conclusionSourceSnapshot(conclusions)};

test('provider failure or invalid family wording recovers an editable report from confirmed sources, without another AI request',async()=>{
  for(const generate of [async()=>{throw Error('Provider unavailable');},async()=>({output:{sections:[]},metadata:{}})]){
    const result=await prepareRecoverableFamilyReport({...scope,generate});
    assert.equal(result.usesConfirmedConclusions,true);
    assert.equal(result.proposal.sections[0].progress_summary,conclusions[0].details.conclusion_text);
    assert.deepEqual(result.proposal.sections[0].examples,conclusions[0].details.progress_examples);
    assert.deepEqual(result.proposal.sections[0].family_suggestions,[]);
    assert.equal(result.proposal.sections[0].family_wording,undefined);
  }
});

test('valid simplified wording stays separate from the confirmed text, and missing sources never become a fabricated report',async()=>{
  const output=buildFamilyReportFallback(scope.competencyIds,conclusions);
  output.sections[0].progress_summary='Cuenta sus ideas durante el juego.';
  const result=await prepareRecoverableFamilyReport({...scope,generate:async()=>({output,metadata:{model:'mock'}})});
  assert.equal(result.usesConfirmedConclusions,false);
  assert.equal(result.proposal.sections[0].progress_summary,conclusions[0].details.conclusion_text);
  assert.equal(result.proposal.sections[0].family_wording.progress_summary,output.sections[0].progress_summary);
  await assert.rejects(prepareRecoverableFamilyReport({...scope,conclusions:[],generate:async()=>({output})}),/Faltan conclusiones/);
});
