import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { VersionConflictError, versionTransaction } from "./version-integrity.mjs";
import { currentPedagogicalClock } from "./pedagogical-clock.mjs";
import {preparationLimits} from './preparation-limits.mjs';

export const preparationFingerprint = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const LEASE_SECONDS=360;
export const needsAcceptedProjectContinuation=row=>row.kind==='project'&&row.status==='succeeded'&&!row.approved_at&&
  row.payload.acceptance?.policy==='accepted-project-complete-v1'&&row.payload.acceptance.teacher_id===row.teacher_id;
export function publicPreparationJob(row) {
  const items=row.payload.items ?? [];
  const legacyPending=row.legacy===true&&!(row.status==='succeeded'&&row.approved_at);
  return {id:row.id,kind:row.kind,status:legacyPending?'legacy_pending':needsAcceptedProjectContinuation(row)?'incomplete':row.status,parts:row.kind==="document_export"?row.payload.parts??[]:undefined,project_id:row.payload.project_id ?? (row.kind==="activity_block"?row.source_id:null),
    stage:row.payload.stage,updated_at:row.updated_at,created_at:row.created_at,responding:row.payload.attempt_pending===true||items.some(item=>item.attempt_pending),proposal_id:row.payload.proposal_id??null,annual_plan_id:row.kind==="project"?row.source_id:null,legacy:row.legacy===true,complete_project:!!row.payload.acceptance,completed:items.filter(item=>item.activity_id||item.artifact_id).length,total:items.length||row.payload.expected_dates?.length||0,
    approved_at:row.approved_at,error:legacyPending?'Esta preparación pertenece al ejecutor anterior. Conservamos su avance; requiere revisar el aislamiento antes de retomarla.':row.payload.error ?? null,
    activities:items.filter(item=>item.activity_id).map(item=>({id:item.activity_id,route_item_id:item.route_item_id}))};
}
export async function ownedPreparationJob(db,teacherId,id) {
  let row=(await db.query(`select j.* from preparation_jobs_v2 j join classrooms c on c.id=j.classroom_id
    join school_years y on y.id=c.school_year_id where j.id=$1 and j.teacher_id=$2 and c.teacher_id=$2 and y.owner_id=$2`,[id,teacherId])).rows[0];
  if(!row)row=(await db.query(`select j.*,true as legacy from preparation_jobs j join classrooms c on c.id=j.classroom_id
    join school_years y on y.id=c.school_year_id where j.id=$1 and j.teacher_id=$2 and c.teacher_id=$2 and y.owner_id=$2`,[id,teacherId])).rows[0];
  if(!row)throw new VersionConflictError("Esta preparación no está disponible.");
  return row;
}
/** Resolve a lost reply only from a canonical result already saved by that step.
 * Never reset an unknown model call or change a confirmed activity. */
export async function recoverSavedPreparationResult(db,teacherId,id){
  return versionTransaction(db,`preparation:${id}`,async tx=>{
    const row=await ownedPreparationJob(tx,teacherId,id),p=row.payload;
    if(row.legacy)return row;
    if(row.status!=='uncertain'||row.approved_at||row.kind!=='project'||
      p.acceptance?.policy!=='accepted-project-complete-v1'||p.acceptance.teacher_id!==teacherId)return row;
    const project=(await tx.query(`select e.*,ap.proposal as annual_proposal from learning_experiences e join annual_plans ap on ap.id=e.annual_plan_id
      where e.id=$1 and e.classroom_id=$2 and e.source_proposal_id=$3 and ap.id=$4 and ap.revision=$5
      and (ap.status='active' or $6::boolean and ap.status='archived') and e.status in ('draft','active')`,
    [p.project_id,row.classroom_id,p.proposal_id,row.source_id,row.source_revision,p.future_version===true])).rows[0];
    if(!project||(project.details.decisions?.additional_context??'')!==(p.additional_context??''))return row;
    const source=project.annual_proposal?.proposed_experiences?.find(item=>item.proposal_id===p.proposal_id),decisions=project.details.decisions;
    const sameDecisions=source&&decisions&&source.purpose===decisions.purpose&&source.rationale===decisions.context_summary&&
      JSON.stringify([...(source.primary_competency_ids??[])].sort())===JSON.stringify([...(decisions.competency_ids??[])].sort());
    let saved=!!sameDecisions&&(p.stage==='criteria'&&!!project.details.dependents ||
      p.stage==='master'&&!!project.details.project_master&&!!project.details.activity_route?.length);
    if(p.stage==='activities'&&Number(project.revision)===p.project_revision&&preparationFingerprint(project.details)===p.project_fingerprint){
      const item=p.items?.find(item=>!item.activity_id);
      if(item)saved=!!(await tx.query(`select 1 from activities where experience_id=$1 and status in ('draft','active')
        and (preparation_item_id=$2 or details->>'route_item_id'=$3)`,[project.id,item.id,item.route_item_id])).rows.length;
    }
    if(!saved)return row;
    const payload={...p,error:null,attempt_pending:false,recovery:{kind:'persisted_result_after_lost_reply',recovered_at:new Date().toISOString()}};
    return (await tx.query(`update preparation_jobs_v2 set status='queued',payload=$1::jsonb,lease_token=null,lease_until=null,updated_at=now()
      where id=$2 and status='uncertain' returning *`,[JSON.stringify(payload),id])).rows[0]??row;
  });
}
/** Older executors stopped at the master. Continue only the already accepted, unchanged source. */
export async function recoverAcceptedProjectContinuation(db,teacherId,id){
  return versionTransaction(db,`preparation:${id}`,async tx=>{
    const row=await ownedPreparationJob(tx,teacherId,id);
    if(row.legacy)return row;
    if(!needsAcceptedProjectContinuation(row))return row;
    const p=row.payload;
    const source=(await tx.query(`select 1 from annual_plans ap join learning_experiences e on e.annual_plan_id=ap.id
      where ap.id=$1 and ap.classroom_id=$2 and ap.revision=$3 and (ap.status='active' or $6::boolean and ap.status='archived')
      and e.id=$4 and e.classroom_id=$2 and e.source_proposal_id=$5 and e.status in ('draft','active')
      and e.details->'project_master' is not null and (e.status='active' or e.details->>'stage'='map_review')`,
    [row.source_id,row.classroom_id,row.source_revision,p.project_id,p.proposal_id,p.future_version===true])).rows[0];
    if(!source)return row;
    const uncertain=p.attempt_pending===true;
    const payload={...p,stage:'activities',error:uncertain?'Tu avance está guardado. Necesitamos confirmar el último paso antes de continuar.':null,
      recovery:{kind:'accepted_master_without_publication',recovered_at:new Date().toISOString()}};
    return (await tx.query(`update preparation_jobs_v2 set status=$1,payload=$2::jsonb,lease_until=null,updated_at=now()
      where id=$3 and status='succeeded' and approved_at is null returning *`,[uncertain?'uncertain':'queued',JSON.stringify(payload),id])).rows[0]??row;
  });
}
export async function enqueuePreparation(db,{teacherId,classroomId,kind,sourceId,sourceRevision,input,payload}) {
  if(!(await db.query(`select 1 from classrooms c join school_years y on y.id=c.school_year_id
    where c.id=$1 and c.teacher_id=$2 and y.owner_id=$2 and c.status='active'`,[classroomId,teacherId])).rows.length)
    throw new VersionConflictError("El aula no está disponible.");
  if((await db.query(`select 1 from preparation_jobs where classroom_id=$1 and teacher_id=$2 and source_id=$3
    and status in ('queued','running','uncertain') limit 1`,[classroomId,teacherId,sourceId])).rows.length)
    throw new VersionConflictError("Hay una preparación anterior pendiente. Debe revisarse antes de iniciar otra versión para conservar su trabajo.");
  return (await db.query(`insert into preparation_jobs_v2(id,teacher_id,classroom_id,kind,source_id,source_revision,input_fingerprint,status,payload)
    values($1,$2,$3,$4,$5,$6,$7,'queued',$8::jsonb)
    on conflict(kind,source_id,source_revision,input_fingerprint) do update set updated_at=preparation_jobs_v2.updated_at returning *`,
    [randomUUID(),teacherId,classroomId,kind,sourceId,sourceRevision,preparationFingerprint(input),JSON.stringify({ ...payload, executor_version:2,
      ...(currentPedagogicalClock() ? { qa_clock: currentPedagogicalClock() } : {}) })])).rows[0];
}
export async function enqueueActivityBlock(db,teacherId,project) {
  if(project.status!=="active" || !project.details.activity_route?.length)throw new VersionConflictError("Confirma primero el proyecto completo.");
  return enqueuePreparation(db,{teacherId,classroomId:project.classroom_id,kind:"activity_block",sourceId:project.id,sourceRevision:project.revision,
    input:project.details,payload:{stage:"activities",items:project.details.activity_route.map(item=>({id:randomUUID(),route_item_id:item.id,date:item.date ?? item.planned_date,stage:"generate"}))}});
}
export async function retryPreparation(db,teacherId,id,acceptPotentialRepeat=false) {
  return versionTransaction(db,`preparation:${id}`,async tx=>{
    const row=await ownedPreparationJob(tx,teacherId,id);
    if(row.legacy)throw new VersionConflictError("Esta preparación pertenece al ejecutor anterior. Conservamos su historial; requiere revisar el aislamiento antes de retomarla.");
    if(row.status==="running" && new Date(row.lease_until).getTime()>Date.now())throw new VersionConflictError("La preparación sigue en curso.");
    if(row.status==="succeeded"&&!needsAcceptedProjectContinuation(row))return row;
    if((row.status==="uncertain"||needsAcceptedProjectContinuation(row)&&row.payload.attempt_pending===true) && acceptPotentialRepeat!==true)throw new VersionConflictError("No se pudo comprobar si la última llamada terminó. Confirma el reintento; podría repetir esa llamada.");
    const payload={...row.payload,error:null,failure_reason:null,failure_diagnostic:null,attempt_pending:false,resumption_attempts:0};
    if(row.payload.failure_reason==='insufficient_quota'){
      const provider=payload.project_provider_checkpoint;
      if(provider)provider.provider_responses=Object.fromEntries(Object.entries(provider.provider_responses??{}).filter(([key])=>provider.completed_calls?.[key]));
      delete payload.provider_poll_after;
    }
    if(acceptPotentialRepeat===true)for(const item of payload.items??[])if(!item.generated&&!item.activity_id)item.attempt_pending=false;
    if(acceptPotentialRepeat===true){delete payload.project_provider_checkpoint;delete payload.provider_poll_after;}
    return (await tx.query(`update preparation_jobs_v2 set status='queued',lease_token=null,lease_until=null,
      payload=$2::jsonb,updated_at=now() where id=$1 returning *`,[id,JSON.stringify(payload)])).rows[0];
  });
}

/** One bounded domain step per invocation. No provider IO occurs in the claim transaction. */
export async function runPreparationStep(db,execute,{limits=preparationLimits()}={}) {
  const concurrent=Number.isInteger(limits.concurrent)&&limits.concurrent>=1&&limits.concurrent<=6?limits.concurrent:2;
  const perTeacher=Number.isInteger(limits.perTeacher)&&limits.perTeacher>=1&&limits.perTeacher<=concurrent?limits.perTeacher:Math.min(2,concurrent);
  const job=await versionTransaction(db,"preparation:dispatch",async tx=>{
    if(Number((await tx.query(`select count(*) as n from preparation_jobs_v2 where status='running' and lease_until>now()`)).rows[0].n)>=concurrent)return null;
    const candidate=(await tx.query(`select j.* from preparation_jobs_v2 j where (j.status='queued' or j.status='running' and j.lease_until<=now())
      and (select count(*) from preparation_jobs_v2 active where active.teacher_id=j.teacher_id and active.status='running' and active.lease_until>now())<$1
      order by j.created_at limit 1 for update of j skip locked`,[perTeacher])).rows[0];
    if(!candidate)return null;
    const token=randomUUID();
    return (await tx.query(`update preparation_jobs_v2 set status='running',lease_token=$2,lease_until=now()+$3*interval '1 second',updated_at=now()
      where id=$1 returning *`,[candidate.id,token,LEASE_SECONDS])).rows[0];
  });
  if(!job)return null;
  const checkpoint=async payload=>{
    const saved=(await db.query(`update preparation_jobs_v2 set payload=$1::jsonb,lease_until=now()+$4*interval '1 second',updated_at=now()
      where id=$2 and lease_token=$3 and status='running' returning id`,[JSON.stringify(payload),job.id,job.lease_token,LEASE_SECONDS])).rows;
    if(!saved.length)throw new VersionConflictError("Otra operación retomó esta preparación.");
    job.payload=payload;
  };
  try {
    await ownedPreparationJob(db,job.teacher_id,job.id);
    const started=Date.now();
    await checkpoint({...job.payload,worker:{version:2,revision:process.env.VERCEL_GIT_COMMIT_SHA??'local',deployment:process.env.VERCEL_URL??'local',started_at:new Date(started).toISOString()}});
    const complete=await execute(job,checkpoint);
    await checkpoint({...job.payload,last_step_ms:Date.now()-started,resumption_attempts:0});
    if(complete&&needsAcceptedProjectContinuation({...job,status:'succeeded',approved_at:(await ownedPreparationJob(db,job.teacher_id,job.id)).approved_at}))
      throw new VersionConflictError('Falta publicar las actividades del proyecto aceptado. Conservamos el avance.');
    await db.query(`update preparation_jobs_v2 set status=$1,lease_until=null,updated_at=now()
      where id=$2 and lease_token=$3 and status='running'`,[complete?"succeeded":"queued",job.id,job.lease_token]);
  }catch(error){
    const quota=error.reason==='insufficient_quota'||error.provider_reason==='insufficient_quota';
    const uncertain=!quota&&error.uncertain===true;
    const pendingResponses=Object.entries(job.payload.project_provider_checkpoint?.provider_responses??{})
      .filter(([key,id])=>typeof id==='string'&&id.startsWith('resp_')&&!job.payload.project_provider_checkpoint?.completed_calls?.[key]);
    const canResume=!quota&&uncertain&&job.kind==='project'&&job.payload.stage==='master'&&pendingResponses.length>0&&
      [502,503,504].includes(Number(error.status))&&Number(job.payload.resumption_attempts??0)<3;
    if(canResume){
      // Consult the same identified response. An unknown creation/repair without
      // its own ID is never automatically repeated (nor charged a second time).
      job.payload.resumption_attempts=Number(job.payload.resumption_attempts??0)+1;
      job.payload.provider_poll_after=new Date(Date.now()+5000*job.payload.resumption_attempts).toISOString();
      job.payload.error=null;
      await db.query(`update preparation_jobs_v2 set status='queued',payload=$1::jsonb,lease_until=null,updated_at=now()
        where id=$2 and lease_token=$3 and status='running'`,[JSON.stringify(job.payload),job.id,job.lease_token]);
      return publicPreparationJob(await ownedPreparationJob(db,job.teacher_id,job.id));
    }
    job.payload.failure_reason=quota?'insufficient_quota':error.name==='VersionConflictError'?'source_conflict':error.name==='ReferenceError'?'internal_reference':error.reason==='resources_confirmation_missing'?'resources_confirmation_missing':'preparation_step_failed';
    job.payload.failure_stage=job.payload.stage;
    // Private, bounded machine codes only; never store exception text, prompts or credentials.
    const safeCode=value=>typeof value==='string'&&/^[a-z][a-z0-9_]{0,79}$/.test(value)?value:null;
    job.payload.failure_diagnostic={code:safeCode(error.reason),provider_code:safeCode(error.provider_reason),
      http_status:Number.isInteger(error.status)&&error.status>=400&&error.status<=599?error.status:null};
    job.payload.error=quota?"El servicio de IA no tiene saldo disponible. El avance está guardado. Después de recargar el saldo puedes retomar lo pendiente.":uncertain?"Tu avance está guardado. Necesitamos confirmar el último paso antes de continuar.":"La preparación está guardada y necesita una revisión para continuar.";
    await db.query(`update preparation_jobs_v2 set status=$1,payload=$2::jsonb,lease_until=null,updated_at=now()
      where id=$3 and lease_token=$4 and status='running'`,[uncertain?"uncertain":"failed",JSON.stringify(job.payload),job.id,job.lease_token]);
  }
  return publicPreparationJob(await ownedPreparationJob(db,job.teacher_id,job.id));
}

/** Private scheduler command, bound to a short-lived timestamp and a unique persisted nonce. */
export async function acceptPreparationDispatch(db,headers,secret,now=Date.now()) {
  const timestamp=headers["x-ayni-dispatch-time"],nonce=headers["x-ayni-dispatch-nonce"],signature=headers["x-ayni-dispatch-signature"];
  if(typeof secret!=="string" || secret.length<32 || !/^\d{10}$/.test(timestamp??"") ||
    Math.abs(now-Number(timestamp)*1000)>60000 || !/^[0-9a-f-]{36}$/i.test(nonce??"") || !/^[0-9a-f]{64}$/.test(signature??""))return false;
  const expected=createHmac("sha256",secret).update(`${timestamp}.${nonce}`).digest();
  if(!timingSafeEqual(expected,Buffer.from(signature,"hex")))return false;
  await db.query(`delete from preparation_dispatch_receipts where expires_at<now()`);
  return (await db.query(`insert into preparation_dispatch_receipts(nonce,expires_at) values($1,now()+interval '2 minutes') on conflict do nothing returning nonce`,[nonce])).rows.length===1;
}
