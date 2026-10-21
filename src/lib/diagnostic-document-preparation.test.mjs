import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareDiagnosticDocumentDraft} from './diagnostic-document-preparation.mjs';
const empty={strengths:'',needs:'',planning_priorities:''},written={...empty,strengths:'Eligió una base y explicó su decisión.'};
function fixture(status,details=empty){const calls=[];return {calls,api:{prepare:async()=>({id:'draft',details}),load:async()=>{calls.push('load');return {status,requiresRepeatConsent:status==='uncertain',...(status==='ready'?{details:written}:{})};},start:async(id,consent)=>{calls.push(['start',id,consent]);return {status:'queued'};}}};}
test('saved teacher wording is returned without consulting or generating AI',async()=>{const f=fixture('idle',written);assert.deepEqual((await prepareDiagnosticDocumentDraft(f.api)).details,written);assert.deepEqual(f.calls,[]);});
for(const status of ['queued','processing','ready'])test(`recover ${status} without another generation`,async()=>{const f=fixture(status),result=await prepareDiagnosticDocumentDraft(f.api);assert.equal(result.job.status,status);assert.deepEqual(f.calls,['load']);if(status==='ready')assert.deepEqual(result.details,written);});
test('an idle draft starts once after the explicit preparation action',async()=>{const f=fixture('idle');assert.equal((await prepareDiagnosticDocumentDraft(f.api)).job.status,'queued');assert.deepEqual(f.calls,['load',['start','draft',false]]);});
for(const status of ['failed','uncertain'])test(`${status} does not retry just by reopening`,async()=>{const f=fixture(status);await prepareDiagnosticDocumentDraft(f.api);assert.deepEqual(f.calls,['load']);});
test('uncertain work requires the explicit repeat action',async()=>{const f=fixture('uncertain');await prepareDiagnosticDocumentDraft(f.api,{allowRetry:true});assert.deepEqual(f.calls,['load']);await prepareDiagnosticDocumentDraft(f.api,{allowRetry:true,acceptPotentialRepeat:true});assert.deepEqual(f.calls.at(-1),['start','draft',true]);});
test('a failed call can be retried explicitly',async()=>{const f=fixture('failed');await prepareDiagnosticDocumentDraft(f.api,{allowRetry:true});assert.deepEqual(f.calls.at(-1),['start','draft',false]);});
