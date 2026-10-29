import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {createDocumentPlanningDatabase} from '../src/lib/document-planning-database.mjs';
import {isDocumentGenerator} from '../src/lib/ayni-product-mode.mjs';
import {runMultiAgeGenerationStep} from '../src/lib/multi-age-generation-jobs.mjs';
import {advanceDocumentGeneratorProjects} from '../src/lib/document-generator-project-preparation.mjs';
import {multiAgeProviderForJob} from './multi-age-ai-runtime.mjs';

export function documentGeneratorCloudEnabled(env=process.env){
 if(env.AYNI_DOCUMENT_GENERATOR_CLOUD!=='1')return false;
 if(env.AYNI_AUTH_MODE!=='supabase'||(env.AYNI_DB_MODE??'postgres')!=='postgres'||env.AYNI_MULTI_AGE_LOCAL==='1')throw new Error('El generador cloud requiere Auth Supabase y PostgreSQL.');
 return true;
}
export function documentCloudAIEnvironment(env=process.env){
 return {...env,AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:env.AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY??env.OPENAI_API_KEY};
}
export function documentCloudScope(db,teacherId){return createDocumentPlanningDatabase(db,{teacherId,authMode:'supabase',role:'teacher',enabled:true});}

export function documentDispatchHeaders(secret,teacherId,now=Date.now(),nonce=randomUUID()){
 const time=String(Math.floor(now/1000));
 return {'x-ayni-document-teacher':teacherId,'x-ayni-dispatch-time':time,'x-ayni-dispatch-nonce':nonce,
  'x-ayni-dispatch-signature':createHmac('sha256',secret).update(`documents-v1.${time}.${nonce}.${teacherId}`).digest('hex')};
}
/** The signed identity cannot be swapped, and each dispatch is consumed once. */
export async function acceptDocumentDispatch(db,headers,secret,now=Date.now()){
 const teacher=headers['x-ayni-document-teacher'],time=headers['x-ayni-dispatch-time'],nonce=headers['x-ayni-dispatch-nonce'],signature=headers['x-ayni-dispatch-signature'];
 if(typeof secret!=='string'||secret.length<32||!/^\d{10}$/u.test(time??'')||Math.abs(now/1000-Number(time))>120
  ||!(/^[0-9a-f-]{36}$/iu).test(teacher??'')||!(/^[0-9a-f-]{36}$/iu).test(nonce??'')||!(/^[0-9a-f]{64}$/u).test(signature??''))return null;
 const expected=Buffer.from(documentDispatchHeaders(secret,teacher,Number(time)*1000,nonce)['x-ayni-dispatch-signature'],'hex');
 if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))return null;
 const accepted=await db.query(`insert into document_generator_dispatch_receipts(nonce,teacher_id) select $1,$2
  where exists(select 1 from profiles where user_id=$2 and preferences->>'ayni_product_mode'='documents')
  on conflict(nonce) do nothing returning teacher_id`,[nonce,teacher]);
 return accepted.rows[0]?.teacher_id??null;
}

export function documentCloudLegacyRouteAllowed(method,pathname){
 return pathname==='/api/pilot/setup'&&['GET','PUT'].includes(method)
  ||method==='GET'&&/^\/api\/(?:assets\/[0-9a-f-]{36}|students\/inactive)$/iu.test(pathname)
  ||['GET','PUT'].includes(method)&&/^\/api\/students\/[0-9a-f-]{36}\/photo$/iu.test(pathname);
}
export function documentCloudOperationAllowed(method,pathname){
 if(!pathname.startsWith('/api/multi-age/'))return true;
 const suffix=pathname.slice('/api/multi-age'.length);
 if(method==='GET')return /^\/(?:state|conversation|generation(?:\/[0-9a-f-]{36})?|document-project|years\/history|workshops|documents\/(?:annual_plan|project|activity)\/[0-9a-f-]{36}(?:\.docx|\/bundle\.zip)?)$/iu.test(suffix);
 return method==='POST'&&(/^\/(?:roster\/(?:import|enrollment)|corrections\/student|generation(?:\/[0-9a-f-]{36}\/retry)?|document-year\/use|conversation\/prepare|document-project\/(?:start|retry))$/iu.test(suffix));
}

export async function documentCloudPending(db){
 return (await db.query(`select 1 from multi_age_generation_jobs j where status in ('queued','running')
  or (status='ready' and input->'documentPreparation'->>'root'='true' and not exists(
   select 1 from multi_age_requests r where r.teacher_id=j.teacher_id and r.client_request_id=(j.input->'documentPreparation'->>'preparationId')::uuid and r.kind='document_project_complete')) limit 1`)).rows.length>0;
}

/** A tenant lease and provider checkpoints survive cold starts. No open DB
 * transaction surrounds an AI call. Continuations run on the same deployment. */
export async function drainDocumentCloud({db,teacherId,continueWork,env=process.env,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),budgetMs=75000,providerForJob}){
 if(!await isDocumentGenerator(db,teacherId))return {processed:0,pending:false};
 const token=randomUUID(),claimed=await db.query(`insert into document_generator_worker_state(teacher_id,lease_token,lease_until) values($1,$2,now()+interval '240 seconds')
  on conflict(teacher_id) do update set lease_token=excluded.lease_token,lease_until=excluded.lease_until where document_generator_worker_state.lease_until<now() returning teacher_id`,[teacherId,token]);
 if(!claimed.rows.length)return {processed:0,pending:true,leased:true};
 let pending=false,processed=0;
 try{
  const options={mode:'openai',providerForJob:providerForJob??multiAgeProviderForJob(db,documentCloudAIEnvironment(env))},began=now();
  while(now()-began<budgetMs){
   await advanceDocumentGeneratorProjects(db,options);
   const job=await runMultiAgeGenerationStep(db,options);if(job)processed++;
   await advanceDocumentGeneratorProjects(db,options);
   if(!await documentCloudPending(db))break;
   if(!job||job.status==='queued')await sleep(2000);
  }
  pending=await documentCloudPending(db);
 }finally{await db.query('delete from document_generator_worker_state where teacher_id=$1 and lease_token=$2',[teacherId,token]);}
 if(pending)await continueWork();
 return {processed,pending};
}
