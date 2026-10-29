import {VersionConflictError} from './version-integrity.mjs';

export const DOCUMENT_PROVIDER_MAX_POLLS=240;
export const DOCUMENT_PROVIDER_MAX_ELAPSED_MS=20*60_000;
export const usesDocumentBackground=(kind,documentsOnly)=>documentsOnly&&['annual','activity','activity_batch'].includes(kind);

export async function documentProviderState(db,jobId){
 return (await db.query('select * from multi_age_generation_provider_state where job_id=$1',[jobId])).rows[0]??null;
}

/** Only the claimed server worker can attach a private response to its job. */
export async function saveDocumentProviderResponse(db,job,responseId){
 if(typeof responseId!=='string'||!/^resp_[a-zA-Z0-9_-]{1,240}$/.test(responseId))throw new TypeError('Identificador de respuesta no válido.');
 const saved=await db.query(`insert into multi_age_generation_provider_state(job_id,response_id)
  select id,$4 from multi_age_generation_jobs where id=$1 and teacher_id=$2 and lease_token=$3 and status='running' and provider_mode='openai'
  on conflict(job_id) do update set response_id=multi_age_generation_provider_state.response_id
  where multi_age_generation_provider_state.response_id=excluded.response_id returning job_id`,[job.id,job.teacher_id,job.lease_token,responseId]);
 if(!saved.rows.length)throw new VersionConflictError();
}

export async function documentBackgroundProviderOptions(db,job){
 const state=await documentProviderState(db,job.id);
 if(state&&(state.poll_count>=DOCUMENT_PROVIDER_MAX_POLLS||Date.now()-Date.parse(state.started_at)>DOCUMENT_PROVIDER_MAX_ELAPSED_MS)){
  const error=new Error('La respuesta de IA excedió su plazo de recuperación.');error.reason='response_expired';throw error;
 }
 if(state)await db.query('update multi_age_generation_provider_state set poll_count=poll_count+1 where job_id=$1',[job.id]);
 return {background:true,store:false,streamResponse:false,timeoutMs:state?15_000:60_000,
  resumeResponseId:state?.response_id??null,onResponseStarted:id=>saveDocumentProviderResponse(db,job,id)};
}

/** Safe retrieval failures retry GET only; a missing checkpoint never repeats POST. */
export function documentProviderPollDelay(error){
 if(!['response_pending','timeout','rate_limited','provider_error'].includes(error?.reason))return null;
 if(error.reason==='provider_error'&&error.details?.status&&error.details.status<500)return null;
 const retry=error.details?.retry_after_ms;
 return Math.min(60_000,Math.max(5_000,Number.isFinite(retry)?retry:5_000));
}
