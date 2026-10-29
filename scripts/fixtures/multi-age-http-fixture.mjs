import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { multiAgeAppDevEnv } from '../dev-multi-age-app.mjs';

export async function startMultiAgeHttpFixture(storeName){
  const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const origin=`http://127.0.0.1:${port}`,child=spawn(process.execPath,['scripts/local-db-server.mjs'],{stdio:['ignore','pipe','pipe'],env:{...multiAgeAppDevEnv({}),NODE_ENV:'test',AYNI_LOCAL_DB_PORT:String(port),AYNI_ALLOWED_ORIGIN:origin,AYNI_MULTI_AGE_STORAGE:'persistent',AYNI_MULTI_AGE_STORE_NAME:storeName,AYNI_MULTI_AGE_AI_MODE:'off'}});
  let failed=false;child.once('error',()=>{failed=true;});child.stdout.resume();child.stderr.resume();
  for(let n=0;n<200;n++){
    if(failed||child.exitCode!==null)throw new Error('La API de prueba terminó antes de iniciar.');
    try{const response=await fetch(origin+'/health');if(response.ok){assert.equal((await response.json()).storage,'persistent-multi-age');return {child,origin};}}catch{/* Startup. */}
    await new Promise(r=>setTimeout(r,100));
  }
  child.kill('SIGTERM');throw new Error('La API de prueba no inició.');
}
export async function stopMultiAgeHttpFixture(app){if(!app||app.child.exitCode!==null||app.child.signalCode!==null)return;await new Promise(r=>{app.child.once('exit',r);app.child.kill('SIGTERM');});}
export function multiAgeHttpFixtureClient(app){
  const get=async path=>{const response=await fetch(app.origin+path);assert.equal(response.status,200,await response.clone().text());return response.json();};
  const raw=(path,input)=>fetch(app.origin+path,{method:'POST',headers:{'content-type':'application/json',origin:app.origin},body:JSON.stringify(input)});
  const post=async(path,input)=>{const response=await raw(path,input),value=await response.json();assert.equal(response.status,200,JSON.stringify(value));return value;};
  return {get,post,raw};
}
