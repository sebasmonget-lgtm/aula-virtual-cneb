import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { VersionConflictError, versionTransaction } from "./version-integrity.mjs";
import { currentPedagogicalClock } from "./pedagogical-clock.mjs";

export const preparationFingerprint = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const LEASE_SECONDS=360;
export const needsAcceptedProjectContinuation=row=>row.kind==='project'&&row.status==='succeeded'&&!row.approved_at&&
  row.payload.acceptance?.policy==='accepted-project-complete-v1'&&row.payload.acceptance.teacher_id===row.teacher_id;
export function publicPreparationJob(row) {
  const items=row.payload.items ?? [];
  return {id:row.id,kind:row.kind,status:needsAcceptedProjectContinuation(row)?'incomplete':row.status,parts:row.kind==="document_export"?row.payload.parts??[]:undefined,project_id:row.payload.project_id ?? (row.kind==="activity_block"?row.source_id:null),
    stage:row.payload.stage,updated_at:row.updated_at,created_at:row.created_at,responding:row.payload.attempt_pending===true,proposal_id:row.payload.proposal_id??null,annual_plan_id:row.kind==="project"?row.source_id:null,complete_project:!!row.payload.acceptance,completed:items.filter(item=>item.activity_id||item.artifact_id).length,total:items.length||row.payload.expected_dates?.length||0,
    approved_at:row.approved_at,error:row.payload.error ?? null,
    activities:items.filter(item=>item.activity_id).map(item=>({id:item.activity_id,route_item_id:item.route_item_id}))};
}
export async function ownedPreparationJob(db,teacherId,id) {
  const row=(await db.query(`select j.* from preparation_jobs j join classrooms c on c.id=j.classroom_id
    join school_years y on y.id=c.school_year_id where j.id=$1 and j.teacher_id=$2 and c.teacher_id=$2 and y.owner_id=$2`,[id,teacherId])).rows[0];
  if(!row)throw new VersionConflictError("Esta preparación no está disponible.");
  return row;
}
/** Resolve a lost reply only from a canonical result already saved by that step.
 * Never reset an unknown model call or change a confirmed activity. */
export async function recoverSavedPreparationResult(db,teacherId,id){
  return versionTransaction(db,`preparation:${id}`,async tx=>{
    const row=await ownedPreparationJob(tx,teacherId,id),p=row.payload;
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
    return (await tx.query(`update preparation_jobs set status='queued',payload=$1::jsonb,lease_token=null,lease_until=null,updated_at=now()
      where id=$2 and status='uncertain' returning *`,[JSON.stringify(payload),id])).rows[0]??row;
  });
}
/** Older executors stopped at the master. Continue only the already accepted, unchanged source. */
export async function recoverAcceptedProjectContinuation(db,teacherId,id){
  return versionTransaction(db,`preparation:${id}`,async tx=>{
    const row=await ownedPreparationJob(tx,teacherId,id);
    if(!needsAcceptedProjectContinuation(row))return row;
    const p=row.payload;
    const source=(await tx.query(`select 1 from annual_plans ap join learning_experiences e on e.annual_plan_id=ap.id
      where ap.id=$1 and ap.classroom_id=$2 and ap.revision=$3 and (ap.status='active' or $6::boolean and ap.status='archived')
      and e.id=$4 and e.classroom_id=$2 and e.source_proposal_id=$5 and e.status in ('draft','active')
      and e.details->'project_master' is not null and (e.status='active' or e.details->>'stage'='map_review')`,
    [row.source_id,row.classroom_id,row.source_revision,p.project_id,p.proposal_id,p.future_version===true])).rows[0];
    if(!source)return row;
    const uncertain=p.attempt_pending===true;
    const payload={...p,stage:'activities',error:uncertain?'No pudimos comprobar si la última llamada terminó. El trabajo guardado se conserva.':null,
      recovery:{kind:'accepted_master_without_publication',recovered_at:new Date().toISOString()}};
    return (await tx.query(`update preparation_jobs set status=$1,payload=$2::jsonb,lease_until=null,updated_at=now()
      where id=$3 and status='succeeded' and approved_at is null returning *`,[uncertain?'uncertain':'queued',JSON.stringify(payload),id])).rows[0]??row;
  });
}
export async function enqueuePreparation(db,{teacherId,classroomId,kind,sourceId,sourceRevision,input,payload}) {
  if(!(await db.query(`select 1 from classrooms c join school_years y on y.id=c.school_year_id
    where c.id=$1 and c.teacher_id=$2 and y.owner_id=$2 and c.status='active'`,[classroomId,teacherId])).rows.length)
    throw new VersionConflictError("El aula no está disponible.");
  return (await db.query(`insert into preparation_jobs(id,teacher_id,classroom_id,kind,source_id,source_revision,input_fingerprint,status,payload)
    values($1,$2,$3,$4,$5,$6,$7,'queued',$8::jsonb)
    on conflict(kind,source_id,source_revision,input_fingerprint) do update set updated_at=preparation_jobs.updated_at returning *`,
    [randomUUID(),teacherId,classroomId,kind,sourceId,sourceRevision,preparationFingerprint(input),JSON.stringify({ ...payload,
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
    if(row.status==="running" && new Date(row.lease_until).getTime()>Date.now())throw new VersionConflictError("La preparación sigue en curso.");
    if(row.status==="succeeded"&&!needsAcceptedProjectContinuation(row))return row;
    if((row.status==="uncertain"||needsAcceptedProjectContinuation(row)&&row.payload.attempt_pending===true) && acceptPotentialRepeat!==true)throw new VersionConflictError("No se pudo comprobar si la última llamada terminó. Confirma el reintento; podría repetir esa llamada.");
    const payload={...row.payload,error:null,attempt_pending:false};
    if(acceptPotentialRepeat===true){delete payload.project_provider_checkpoint;delete payload.provider_poll_after;}
    return (await tx.query(`update preparation_jobs set status='queued',lease_token=null,lease_until=null,
      payload=$2::jsonb,updated_at=now() where id=$1 returning *`,[id,JSON.stringify(payload)])).rows[0];
  });
}

/** One bounded domain step per invocation. No provider IO occurs in the claim transaction. */
export async function runPreparationStep(db,execute) {
  const job=await versionTransaction(db,"preparation:dispatch",async tx=>{
    if(Number((await tx.query(`select count(*) as n from preparation_jobs where status='running' and lease_until>now()`)).rows[0].n)>=2)return null;
    const candidate=(await tx.query(`select * from preparation_jobs where status='queued' or status='running' and lease_until<=now()
      order by created_at limit 1 for update skip locked`)).rows[0];
    if(!candidate)return null;
    const token=randomUUID();
    return (await tx.query(`update preparation_jobs set status='running',lease_token=$2,lease_until=now()+$3*interval '1 second',updated_at=now()
      where id=$1 returning *`,[candidate.id,token,LEASE_SECONDS])).rows[0];
  });
  if(!job)return null;
  const checkpoint=async payload=>{
    const saved=(await db.query(`update preparation_jobs set payload=$1::jsonb,lease_until=now()+$4*interval '1 second',updated_at=now()
      where id=$2 and lease_token=$3 and status='running' returning id`,[JSON.stringify(payload),job.id,job.lease_token,LEASE_SECONDS])).rows;
    if(!saved.length)throw new VersionConflictError("Otra operación retomó esta preparación.");
    job.payload=payload;
  };
  try {
    await ownedPreparationJob(db,job.teacher_id,job.id);
    const complete=await execute(job,checkpoint);
    if(complete&&needsAcceptedProjectContinuation({...job,status:'succeeded',approved_at:(await ownedPreparationJob(db,job.teacher_id,job.id)).approved_at}))
      throw new VersionConflictError('Falta publicar las actividades del proyecto aceptado. Conservamos el avance.');
    await db.query(`update preparation_jobs set status=$1,lease_until=null,updated_at=now()
      where id=$2 and lease_token=$3 and status='running'`,[complete?"succeeded":"queued",job.id,job.lease_token]);
  }catch(error){
    const uncertain=error.uncertain===true;
    job.payload.error=uncertain?"No pudimos comprobar si la última llamada terminó. El trabajo guardado se conserva.":"No pudimos completar lo pendiente. El trabajo guardado se conserva; puedes reintentar.";
    await db.query(`update preparation_jobs set status=$1,payload=$2::jsonb,lease_until=null,updated_at=now()
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
