// Regression against an explicitly isolated synthetic local API, never cloud data.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const at=arg.indexOf('=');return [arg.slice(0,at),arg.slice(at+1)];}));
if(process.env.AYNI_QA_SYNTHETIC!=='1')throw Error('Requires explicit synthetic QA');
const base=args.base??'http://127.0.0.1:3352',url=new URL(base);
if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname))throw Error('Local QA API only');
const health=await(await fetch(base+'/health')).json();assert.equal(health.engine,'local');
const origin=args.origin;assert.ok(origin,'Pass the isolated UI origin');
const originUrl=new URL(origin);assert.equal(originUrl.protocol,'http:');assert.ok(['127.0.0.1','localhost'].includes(originUrl.hostname));
const activity=args.activity,criterion=args.criterion,draft=args.draft;
for(const id of [activity,criterion,draft])assert.match(id??'',/^[0-9a-f-]{36}$/i);
const clock=await fetch(base+'/api/qa/clock',{method:'PUT',headers:{'content-type':'application/json',origin},body:JSON.stringify({date:args.day??'2026-03-16',time:'08:00'})});assert.equal(clock.status,200);
const cookie=clock.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
const headers={'content-type':'application/json',origin,cookie};
const load=async()=>{const r=await fetch(base+'/api/documents/activity/'+activity,{headers});assert.equal(r.status,200);return (await r.json()).document;};
const before=await load();assert.equal(before.status,'active');
const checks=[];
for(const [path,method,body]of[
 ['/api/activities/'+activity+'/copy','POST',{expectedRevision:1}],
 ['/api/activity-criteria/'+criterion+'/copy','POST',{expectedRevision:1}],
 ['/api/ai/activity-criteria/generate','POST',{activityId:activity,changeKind:'purpose',note:'Intento individual QA'}],
 ['/api/activity-criteria','POST',{activityId:activity,generationId:'qa-rejected'}],
 ['/api/activity-criteria/'+draft,'PUT',{expectedRevision:2,proposal:{criterion_text:'Cambio individual rechazado'}}],
 ['/api/activity-criteria/'+draft+'/confirm','POST',{expectedRevision:2}],
]){
 const r=await fetch(base+path,{method,headers,body:JSON.stringify(body)}),data=await r.json();checks.push({path,method,status:r.status,error:data.error});assert.equal(r.status,409,path);
}
const after=await load();assert.deepEqual(after.content,before.content);assert.deepEqual(after.active_criterion,before.active_criterion);
const result={pass:true,checks,canonicalActivityUnchanged:true};if(args.out)await writeFile(args.out,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
