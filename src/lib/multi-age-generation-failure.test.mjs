import test from 'node:test';
import assert from 'node:assert/strict';
import {multiAgeGenerationFailureCode,multiAgeGenerationFailureMessage} from './multi-age-generation-failure.mjs';
import {recordOperationalEvent} from './operational-events.mjs';

test('fallos de IA conservan causas controladas sin exponer texto privado ni reintentar',()=>{
 const cases={timeout:'provider_uncertain',response_pending:'provider_uncertain',api_key_missing:'provider_unavailable',authentication_failed:'provider_unavailable',insufficient_quota:'provider_quota_exhausted',rate_limited:'provider_busy',provider_error:'provider_failed',response_failed:'provider_failed',response_incomplete:'provider_invalid_response',structured_output_invalid:'provider_invalid_response'};
 for(const [reason,code]of Object.entries(cases))assert.equal(multiAgeGenerationFailureCode({reason,message:'secreto privado'}),code);
 assert.equal(multiAgeGenerationFailureCode({reason:'provider_error',details:{status:null,cause_name:'TypeError'}}),'provider_uncertain','Una conexión cortada puede haber generado consumo y necesita recuperación explícita.');
 assert.equal(multiAgeGenerationFailureCode({reason:'provider_error',details:{status:500,cause_name:null}}),'provider_failed');
 for(const reason of ['secreto privado','toString','__proto__',null]){
  const code=multiAgeGenerationFailureCode({reason,message:'secreto privado'});
  assert.equal(code,'generation_failed');assert.doesNotMatch(multiAgeGenerationFailureMessage(code),/secreto/);
 }
 const logs=[];
 recordOperationalEvent('multi_age_generation_failed',{requestId:'00000000-0000-4000-8000-000000000000',workflow:'annual',status:502,reason:'provider_failed',privateText:'secreto'},s=>logs.push(JSON.parse(s)));
 assert.equal(logs[0].reason,'provider_failed');assert.doesNotMatch(JSON.stringify(logs),/secreto/);
 recordOperationalEvent('multi_age_generation_failed',{reason:'secreto privado'},s=>logs.push(JSON.parse(s)));
 assert.equal(logs[1].reason,undefined);
});
