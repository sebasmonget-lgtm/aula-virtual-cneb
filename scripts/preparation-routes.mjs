import { enqueuePreparation, enqueueActivityBlock, ownedPreparationJob, publicPreparationJob, retryPreparation, preparationFingerprint } from "../src/lib/preparation-jobs.mjs";
import { versionTransaction, VersionConflictError, httpStatusForError, publicErrorMessage } from "../src/lib/version-integrity.mjs";
import { lockClassroomSchedule } from "../src/lib/activity-schedule-integrity.mjs";

export async function handlePreparationRoutes({request,response,url,db,teacherId,origin,send,readJson,annualPlanningContext,projectFlowSource,projectFlowRow,domainRequest}) {
  if(!url.pathname.startsWith("/api/preparation/"))return false;
  try {
    if(url.pathname==="/api/preparation/projects" && request.method==="POST"){
      const body=await readJson(request),source=await projectFlowSource(body.annualPlanId,body.proposalId);
      if(!source.plan.proposal.experience_context || source.plan.status!=="active")throw new VersionConflictError("Confirma Mi año antes de preparar el proyecto.");
      if(source.slot.ends_on<new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima"}).format(new Date()))throw new VersionConflictError("Este proyecto pertenece al pasado. Consúltalo o elige un proyecto futuro; no se prepara retrospectivamente.");
      if(typeof body.additionalContext!=="string" || body.additionalContext.length>1000)throw new TypeError("Resume el contexto en un máximo de 1000 caracteres.");
      const job=await enqueuePreparation(db,{teacherId,classroomId:source.classroom.id,kind:"project",sourceId:source.plan.id,sourceRevision:source.plan.revision,
        input:{proposalId:body.proposalId,additionalContext:body.additionalContext},payload:{stage:"structure",proposal_id:body.proposalId,additional_context:body.additionalContext}});
      send(response,202,publicPreparationJob(job),origin);return true;
    }
    if(url.pathname==="/api/preparation/activities" && request.method==="POST"){
      const {row}=await projectFlowRow((await readJson(request)).experienceId);
      if(!row)throw new VersionConflictError("Proyecto no disponible.");
      send(response,202,publicPreparationJob(await enqueueActivityBlock(db,teacherId,row)),origin);return true;
    }
    if(url.pathname==="/api/preparation/current" && request.method==="GET"){
      const context=await annualPlanningContext();
      const rows=context?(await db.query(`select * from preparation_jobs where classroom_id=$1 and teacher_id=$2 order by created_at desc`,[context.id,teacherId])).rows:[];
      send(response,200,{jobs:rows.map(publicPreparationJob)},origin);return true;
    }
    const match=/^\/api\/preparation\/([0-9a-f-]{36})(?:\/(retry|review|approve))?$/i.exec(url.pathname);
    if(!match)return false;
    const [,id,action]=match,row=await ownedPreparationJob(db,teacherId,id);
    if(!action && request.method==="GET"){send(response,200,publicPreparationJob(row),origin);return true;}
    if(action==="retry" && request.method==="POST"){
      send(response,202,publicPreparationJob(await retryPreparation(db,teacherId,id,(await readJson(request)).acceptPotentialRepeat)),origin);return true;
    }
    const activities=async(tx,job)=>(await tx.query(`select a.id,a.revision,a.status,a.details,a.preparation,a.occurs_on::text,
      (select jsonb_build_object('details',w.details) from activities w where w.linked_main_activity_id=a.id and w.status in ('draft','active') order by w.version desc limit 1) as workshop
      from activities a where a.experience_id=$1 and a.id=any($2::uuid[]) order by a.occurs_on,a.id`,[job.source_id,job.payload.items.map(item=>item.activity_id).filter(Boolean)])).rows;
    if(action==="review" && request.method==="GET" && row.kind==="activity_block"){
      send(response,200,{job:publicPreparationJob(row),activities:await activities(db,row)},origin);return true;
    }
    if(action==="approve" && request.method==="POST" && row.kind==="activity_block"){
      const body=await readJson(request);
      const result=await versionTransaction(db,`preparation:${id}`,async tx=>{
        const job=await ownedPreparationJob(tx,teacherId,id);
        await lockClassroomSchedule(tx,job.classroom_id);
        if(job.approved_at)return publicPreparationJob(job);
        if(job.status!=="succeeded")throw new VersionConflictError("Termina de preparar todas las actividades antes de confirmar el bloque.");
        const project=(await tx.query(`select * from learning_experiences where id=$1 and classroom_id=$2 and status='active' for update`,[job.source_id,job.classroom_id])).rows[0];
        if(!project || Number(project.revision)!==Number(job.source_revision) || preparationFingerprint(project.details)!==job.input_fingerprint)
          throw new VersionConflictError("El proyecto cambió. Revisa el bloque antes de confirmar.");
        const rows=await activities(tx,job);
        if(body.reviewed!==true || !Array.isArray(body.activities) || body.activities.length!==rows.length || rows.length!==job.payload.items.length || new Set(body.activities.map(item=>item.id)).size!==rows.length)
          throw new VersionConflictError("Revisa y confirma el bloque completo.");
        // All revisions are checked before the first write. The domain confirms criteria and schedule inside this transaction.
        for(const activity of rows){if(!body.activities.some(item=>item.id===activity.id && Number(item.expectedRevision)===Number(activity.revision)))throw new VersionConflictError("Una actividad cambió durante la revisión.");}
        const transactionalDb={...tx,transaction:work=>work(tx)};
        for(const activity of rows){if(activity.status==="draft"){
          const workshop=(await tx.query(`select id,revision from activities where linked_main_activity_id=$1 and status='draft'`,[activity.id])).rows[0];
          await domainRequest({...job,db:transactionalDb},`/api/activities/${activity.id}/confirm`,{expectedRevision:activity.revision,workshopRevision:workshop?.revision},"POST");
        }else if(activity.status!=="active")throw new VersionConflictError("Una actividad fue reemplazada. Revisa el bloque.");}
        const approved=(await tx.query(`update preparation_jobs set approved_at=now(),updated_at=now() where id=$1 returning *`,[id])).rows[0];
        return publicPreparationJob(approved);
      });
      send(response,200,result,origin);return true;
    }
    send(response,404,{error:"Acción no disponible."},origin);return true;
  }catch(error){send(response,httpStatusForError(error,422),{error:publicErrorMessage(error)},origin);return true;}
}
