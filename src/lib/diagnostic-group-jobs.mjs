import {randomUUID} from 'node:crypto';
import {versionTransaction} from './version-integrity.mjs';
import {diagnosticGroupProposalSources,sameDiagnosticSources} from './diagnostic-assessment-v4.mjs';
import {diagnosticGroupProviderRequest,validateDiagnosticSuggestion} from './ai-diagnostic-evaluation-service.mjs';
import {loadDiagnosticEvaluationSkill} from './diagnostic-evaluation-skill.mjs';
import {resolveAIExecutionPlan} from './ai-execution-router-v4.mjs';
import {createAIProviderForPlan} from './ai-provider-factory.mjs';
import {withAiUsageContext} from './ai-usage-service.mjs';

const VERSION='diagnostic-recoverable-v1',CONTRACT='diagnostic-reading-v3';
const WORKER_MS=30_000,MAX_ELAPSED_MS=9*60_000,MAX_POLLS=60;
const active=['queued','processing'];
const DISPATCH_LEASE='c37d607b-6099-4fb9-a6e9-cd9c523c0e21';
const messages={queued:'Tu resumen está en espera. Puedes continuar en otra pantalla.',processing:'Ayni está preparando tu resumen. Puedes salir y volver para revisarlo.',
  ready:'La propuesta está lista. Revísala antes de confirmar.',uncertain:'No pudimos comprobar si el servicio recibió la solicitud. Conservamos tu borrador; volver a generar podría repetir el consumo.',
  stale_sources:'La información del aula cambió. Actualiza el borrador antes de generar otra propuesta.',
  insufficient_quota:'El servicio de IA no tiene saldo disponible. Tu borrador está guardado.',
  authentication_failed:'No se pudo acceder al servicio de IA. Tu borrador está guardado.',
  rate_limited:'El servicio de IA está ocupado. Conservamos tu solicitud y respetamos su tiempo de espera.',
  response_expired:'El resultado ya no está disponible en el servicio. Tu borrador está guardado.',
  proposal_invalid:'La propuesta no pasó la revisión automática. Conservamos tu borrador.',
  connection_changed:'La conexión de IA cambió. Conservamos el identificador anterior para evitar repetir la solicitud.',
  provider_error:'No se pudo completar la propuesta. Tu borrador está guardado.'};
export class DiagnosticGenerationError extends Error {
  constructor(reason){super(messages[reason]??messages.provider_error);this.name='DiagnosticGenerationError';this.reason=reason;}
}
async function owned(db,teacherId,id){
  const row=(await db.query(`select r.* from diagnostic_group_reviews r join classrooms c on c.id=r.classroom_id
    join school_years y on y.id=c.school_year_id where r.id=$1 and r.created_by=$2 and r.status='draft'
    and c.teacher_id=$2 and y.owner_id=$2 and c.status='active'`,[id,teacherId])).rows[0];
  if(!row)throw new DiagnosticGenerationError('not_found');return row;
}
export function publicDiagnosticGeneration(row,now=Date.now()){
  const job=row.ai_snapshot??{},status=job.output?'ready':job.status??'idle';
  return {draftId:row.id,status,message:messages[job.error_reason]??messages[status]??'',
    retryAfterMs:Math.max(1000,Date.parse(job.next_poll_at??'')-now||5000),
    requiresRepeatConsent:status==='uncertain',canRetry:['failed','uncertain'].includes(status),
    ...(status==='ready'?{details:job.output}:{} )};
}
export async function readDiagnosticGeneration(db,teacherId,id,{loadSources=diagnosticGroupProposalSources,now=Date.now}={}){
  const row=await owned(db,teacherId,id);
  if(row.ai_snapshot?.status==='processing'&&row.ai_snapshot.job_version!==VERSION&&Date.parse(row.ai_snapshot.expires_at)<=now())
    return publicDiagnosticGeneration({...row,ai_snapshot:{...row.ai_snapshot,status:'uncertain'}},now());
  if(row.ai_snapshot?.output){
    const sources=await loadSources(db,teacherId,id);
    if(!sameDiagnosticSources(row.ai_snapshot.source_snapshot,sources.source_snapshot))throw new DiagnosticGenerationError('stale_sources');
  }
  return publicDiagnosticGeneration(row,now());
}
/** Starting/reopening never repeats an in-flight creation. Provider IO is outside transactions. */
export async function startDiagnosticGeneration(db,teacherId,id,{acceptPotentialRepeat=false}={},
  {loadSources=diagnosticGroupProposalSources,resolvePlan=resolveAIExecutionPlan,now=Date.now}={}){
  const sources=await loadSources(db,teacherId,id);
  if(!sources.comments.length&&!sources.observed_records?.length)throw new DiagnosticGenerationError('insufficient_information');
  const row=await versionTransaction(db,`diagnostic-start:${id}`,async tx=>{
    const row=await owned(tx,teacherId,id),old=row.ai_snapshot??{};
    if(old.output&&old.contract_version===CONTRACT&&sameDiagnosticSources(old.source_snapshot,sources.source_snapshot))return row;
    if(active.includes(old.status)){
      if(old.job_version===VERSION||Date.parse(old.expires_at)>now())return row;
      // A legacy request without a response ID may have been received remotely.
      old.status='uncertain';row.ai_snapshot=old;
    }
    if(old.status==='uncertain'&&!acceptPotentialRepeat)return row;
    if(acceptPotentialRepeat!==true&&old.job_version===VERSION&&old.error_reason==='connection_changed')return row;
    const job={job_version:VERSION,job_id:randomUUID(),contract_version:CONTRACT,status:'queued',phase:'queued',
      source_snapshot:sources.source_snapshot,created_at:new Date(now()).toISOString(),next_poll_at:new Date(now()).toISOString(),
      execution_plan:resolvePlan({workflow:'diagnostic_group_synthesis',task:'generation'}),
      connection_profile:process.env.AYNI_TEXT_API_PROFILE??'openai',creation_attempts:0,poll_count:0,
      previous_attempt:old.job_id?{job_id:old.job_id,status:old.status,error_reason:old.error_reason??null,
        creation_attempts:old.creation_attempts??null,provider_response_id:old.provider_response_id??null}:null};
    return (await tx.query(`update diagnostic_group_reviews set ai_snapshot=$1::jsonb,updated_at=now()
      where id=$2 and created_by=$3 and status='draft' returning *`,[JSON.stringify(job),id,teacherId])).rows[0];
  });
  return publicDiagnosticGeneration(row,now());
}
async function saveJob(db,row,job){
  const saved=(await db.query(`update diagnostic_group_reviews set ai_snapshot=$1::jsonb,updated_at=now()
    where id=$2 and created_by=$3 and status='draft' and ai_snapshot->>'job_id'=$4
    and ai_snapshot->>'worker_token'=$5 returning *`,[JSON.stringify(job),row.id,row.created_by,job.job_id,row.ai_snapshot.worker_token])).rows[0];
  if(!saved)throw new DiagnosticGenerationError('stale_sources');return saved;
}
/** Two diagnostic creations at once by default. Polls share those slots; they never create a new response. */
export async function runDiagnosticGenerationStep(db,{loadSources=diagnosticGroupProposalSources,loadSkill=loadDiagnosticEvaluationSkill,
  createProvider=createAIProviderForPlan,now=Date.now,random=Math.random,concurrency=2}={}){
  const stamp=now(),limit=Number.isInteger(concurrency)&&concurrency>=1&&concurrency<=6?concurrency:2;
  const row=await versionTransaction(db,'diagnostic:dispatch',async tx=>{
    // A worker that died while creating without saving an ID is uncertain, never replayed.
    const instant=new Date(stamp).toISOString();
    await tx.query(`update diagnostic_group_reviews r set ai_snapshot=jsonb_set(ai_snapshot,'{status}','"uncertain"'::jsonb)
      from classrooms c where c.id=r.classroom_id and c.teacher_id=r.created_by and c.status='active' and r.status='draft'
      and r.ai_snapshot->>'job_version'=$1 and r.ai_snapshot->>'phase'='creating'
      and r.ai_snapshot->>'status'='processing' and r.ai_snapshot->>'provider_response_id' is null
      and (r.ai_snapshot->>'worker_until')::timestamptz<=$2::timestamptz`,[VERSION,instant]);
    const from=`from diagnostic_group_reviews r join classrooms c on c.id=r.classroom_id
      join school_years y on y.id=c.school_year_id where r.status='draft' and r.created_by=c.teacher_id and y.owner_id=c.teacher_id
      and c.status='active' and r.ai_snapshot->>'job_version'=$1 and r.ai_snapshot->>'status' in ('queued','processing')`;
    const counts=(await tx.query(`select count(*) filter(where r.ai_snapshot->>'status'='processing')::int as running,
      max((r.ai_snapshot->>'provider_retry_after')::timestamptz) as cooldown ${from}`,[VERSION])).rows[0];
    const canCreate=counts.running<limit&&(!counts.cooldown||new Date(counts.cooldown).getTime()<=stamp);
    // Select just one row; do not load every queued teacher's snapshot into the worker.
    const candidate=(await tx.query(`select r.* ${from}
      and coalesce((r.ai_snapshot->>'worker_until')::timestamptz,'epoch')<=$2::timestamptz
      and (r.ai_snapshot->>'next_poll_at')::timestamptz<=$2::timestamptz
      and (r.ai_snapshot->>'provider_response_id' is not null or $3::boolean and r.ai_snapshot->>'status'='queued')
      order by r.updated_at,r.id limit 1`,[VERSION,instant,canCreate])).rows[0];
    if(!candidate)return null;
    const job={...candidate.ai_snapshot,status:'processing',phase:candidate.ai_snapshot.provider_response_id?'polling':'creating',
      worker_token:randomUUID(),worker_until:new Date(stamp+WORKER_MS).toISOString(),
      started_at:candidate.ai_snapshot.started_at??new Date(stamp).toISOString()};
    return (await tx.query(`update diagnostic_group_reviews set ai_snapshot=$1::jsonb,updated_at=now() where id=$2 returning *`,[JSON.stringify(job),candidate.id])).rows[0];
  });
  if(!row)return null;
  let job={...row.ai_snapshot};const began=performance.now();
  try{
    const sources=await loadSources(db,row.created_by,row.id);
    if(!sameDiagnosticSources(job.source_snapshot,sources.source_snapshot))throw new DiagnosticGenerationError('stale_sources');
    if(job.connection_profile!==(process.env.AYNI_TEXT_API_PROFILE??'openai'))throw new DiagnosticGenerationError('connection_changed');
    if(stamp-Date.parse(job.started_at)>MAX_ELAPSED_MS||job.poll_count>=MAX_POLLS)throw new DiagnosticGenerationError('response_expired');
    const resuming=!!job.provider_response_id;
    job={...job,poll_count:job.poll_count+(resuming?1:0),creation_attempts:job.creation_attempts+(resuming?0:1)};
    await saveJob(db,row,job);
    const provider=createProvider(job.execution_plan,{background:true,timeoutMs:15_000,resumeResponseId:job.provider_response_id??null,
      onResponseStarted:async id=>{
        if(!/^resp_[a-zA-Z0-9_-]{1,240}$/.test(id))throw new DiagnosticGenerationError('provider_error');
        job.provider_response_id=id;
        // Save even if this worker lease just expired; a later worker must recover this ID.
        const saved=await db.query(`update diagnostic_group_reviews set ai_snapshot=jsonb_set(
          jsonb_set(ai_snapshot,'{provider_response_id}',to_jsonb($1::text)),'{status}','"processing"'::jsonb)
          where id=$2 and status='draft' and ai_snapshot->>'job_id'=$3
          and ai_snapshot->>'status' in ('processing','uncertain') returning id`,[id,row.id,job.job_id]);
        if(!saved.rows.length)throw new DiagnosticGenerationError('stale_sources');
      }});
    const request=diagnosticGroupProviderRequest(sources,job.execution_plan,await loadSkill());
    const response=await withAiUsageContext({teacherId:row.created_by,db},()=>provider.generate(request));
    const details=validateDiagnosticSuggestion(response.output,sources);
    const current=await loadSources(db,row.created_by,row.id);
    if(!sameDiagnosticSources(job.source_snapshot,current.source_snapshot))throw new DiagnosticGenerationError('stale_sources');
    job={...job,status:'ready',phase:'ready',output:details,worker_token:null,worker_until:null,
      finished_at:new Date(now()).toISOString(),elapsed_ms:now()-Date.parse(job.started_at),last_step_ms:performance.now()-began,
      model:job.execution_plan.model,reasoning_effort:job.execution_plan.reasoning_effort,
      usage:response.provider_metadata?.usage??null,error_reason:null};
  }catch(error){
    const reason=error.reason??'provider_error',id=job.provider_response_id;
    const retryAfter=error.details?.retry_after_ms;
    const transient=id&&['response_pending','timeout','rate_limited','provider_error'].includes(reason);
    const rejectedCreate=!id&&reason==='rate_limited'&&job.creation_attempts<2;
    const delay=Math.max(5000,Number.isFinite(retryAfter)?retryAfter:5000)+Math.floor(random()*1000);
    if((transient||rejectedCreate)&&now()+delay-Date.parse(job.started_at)<MAX_ELAPSED_MS){
      job={...job,status:id?'processing':'queued',phase:id?'waiting':'queued',next_poll_at:new Date(now()+delay).toISOString(),
        ...(reason==='rate_limited'?{provider_retry_after:new Date(now()+delay).toISOString()}:{}),error_reason:reason==='response_pending'?null:reason};
    }else{
      const uncertain=!id&&['timeout','provider_error'].includes(reason);
      job={...job,status:uncertain?'uncertain':'failed',phase:'stopped',error_reason:reason,
        finished_at:new Date(now()).toISOString(),elapsed_ms:now()-Date.parse(job.started_at)};
    }
    job={...job,worker_token:null,worker_until:null,last_step_ms:performance.now()-began};
  }
  const saved=await saveJob(db,row,job);
  return publicDiagnosticGeneration(saved,now());
}

export async function diagnosticGenerationPending(db){
  return !!(await db.query(`select 1 from diagnostic_group_reviews r join classrooms c on c.id=r.classroom_id
    where r.status='draft' and c.status='active' and r.ai_snapshot->>'job_version'=$1
    and r.ai_snapshot->>'status' in ('queued','processing') limit 1`,[VERSION])).rows.length;
}

/** One bounded drain across serverless instances; reuse the private dispatch lease table. */
export async function claimDiagnosticDrain(db){
  return (await db.query(`insert into preparation_dispatch_receipts(nonce,expires_at)
    values($1,now()+interval '90 seconds') on conflict(nonce) do update set expires_at=excluded.expires_at
    where preparation_dispatch_receipts.expires_at<=now() returning expires_at::text as lease_until`,[DISPATCH_LEASE])).rows[0]?.lease_until??null;
}
export async function releaseDiagnosticDrain(db,leaseUntil){
  await db.query('delete from preparation_dispatch_receipts where nonce=$1 and expires_at=$2::timestamptz',[DISPATCH_LEASE,leaseUntil]);
}
