import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {drainPreparation,preparationDispatchSecret,preparationDispatchHeaders} from './preparation-background.mjs';
test('worker serverless continúa después de responder con autorización del servidor y limpieza de conexión',async()=>{
  const route=await readFile(new URL('../../app/api/[...path]/route.js',import.meta.url),'utf8'),bridge=await readFile(new URL('../../scripts/serverless-bridge.mjs',import.meta.url),'utf8');
  assert.match(route,/handleServerlessRequest\(request, \{ after \}\)/);assert.match(bridge,/options\.after\(async/);
  let time=0,calls=0,continuations=0;
  await drainPreparation({step:async()=>{time+=60;calls++;return{};},hasPending:async()=>true,continueWork:async()=>continuations++,now:()=>time,budgetMs:100});
  assert.equal(calls,2);assert.equal(continuations,1);
  await drainPreparation({step:async()=>null,hasPending:async()=>true,continueWork:async()=>continuations++});assert.equal(continuations,1,'no loop when another worker holds the leases');
  await drainPreparation({step:async()=>null,hasPending:async()=>false,continueWork:async()=>continuations++});assert.equal(continuations,1);
});
test('continuación firmada no expone la clave de sesión y mantiene nonce/timestamp',()=>{
  assert.equal(preparationDispatchSecret({}),null);const key='fixture-only-signing-key-32-characters';const secret=preparationDispatchSecret({AYNI_SESSION_SIGNING_KEY:key});assert.notEqual(secret,key);
  const headers=preparationDispatchHeaders(secret,1700000000000);assert.equal(headers['x-ayni-dispatch-time'],'1700000000');
  assert.equal(headers['x-ayni-dispatch-signature'],createHmac('sha256',secret).update(headers['x-ayni-dispatch-time']+'.'+headers['x-ayni-dispatch-nonce']).digest('hex'));
});
