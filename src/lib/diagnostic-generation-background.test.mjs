import test from 'node:test';
import assert from 'node:assert/strict';
import {drainDiagnosticWork} from './diagnostic-generation-background.mjs';
import {providerRetryAfterMs} from './openai-provider.mjs';
import {preparationLimits} from './preparation-limits.mjs';
test('polling termina al guardar y no mantiene activa una función sin trabajo',async()=>{
 let calls=0,continuations=0,time=0;
 const n=await drainDiagnosticWork({step:async()=>++calls===1?{status:'processing'}:null,hasPending:async()=>false,
 continueWork:async()=>{continuations++;},now:()=>time,pause:async ms=>{time+=ms;}});
 assert.equal(n,1);assert.equal(calls,2);assert.equal(time,0);assert.equal(continuations,0);
});
test('espera de forma acotada y continúa después del presupuesto sin reenviar la generación',async()=>{
 let time=0,calls=0,continuations=0;
 await drainDiagnosticWork({step:async()=>{calls++;return null;},hasPending:async()=>true,continueWork:async()=>{continuations++;},
 now:()=>time,pause:async ms=>{time+=ms;},budgetMs:12000});
 assert.equal(time,12000);assert.equal(calls,3);assert.equal(continuations,1);
});
test('Retry-After respeta segundos y fecha; no convierte cabeceras inválidas en reintentos inmediatos',()=>{
 const now=Date.parse('2026-10-21T12:00:00Z');
 assert.equal(providerRetryAfterMs(new Headers({'retry-after':'90'}),now),90000);
 assert.equal(providerRetryAfterMs({'retry-after':'Wed, 21 Oct 2026 12:02:00 GMT'},now),120000);
 assert.equal(providerRetryAfterMs({'retry-after':'no'},now),null);
 assert.equal(providerRetryAfterMs({'retry-after':'-1'},now),null);
});
test('límites conservan dos por defecto, son acotados y no se elevan por configuración inválida',()=>{
 assert.deepEqual(preparationLimits({}),{concurrent:2,perTeacher:2});
 assert.deepEqual(preparationLimits({AYNI_PREPARATION_CONCURRENCY:'6',AYNI_PREPARATION_PER_TEACHER_CONCURRENCY:'1'}),{concurrent:6,perTeacher:1});
 for(const value of ['0','10','-1','2.5','Infinity','50','4x'])assert.equal(preparationLimits({AYNI_PREPARATION_CONCURRENCY:value}).concurrent,2);
});
