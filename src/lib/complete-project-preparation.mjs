import {assertSavedSlotReplacement,savedLibraryRestoration} from "./project-slot-replacement.mjs";
import {randomUUID} from "node:crypto";
import {preparationFingerprint,ownedPreparationJob} from "./preparation-jobs.mjs";
import {versionTransaction,VersionConflictError} from "./version-integrity.mjs";
import {lockClassroomSchedule,assertActivityScheduleMutable,activityHasRecordedWork,limaToday} from "./activity-schedule-integrity.mjs";

export const COMPLETE_PROJECT_POLICY="accepted-project-complete-v1";
export async function publishAcceptedProjectBlock(db,job,request){
  return versionTransaction(db,`accepted-project:${job.id}`,async tx=>{
    const stored=await ownedPreparationJob(tx,job.teacher_id,job.id),p=stored.payload;
    if(stored.legacy)throw new VersionConflictError("Esta preparación anterior se conserva para consulta.");
    if(stored.approved_at)return;
    if(p.acceptance?.policy!==COMPLETE_PROJECT_POLICY||p.acceptance.teacher_id!==job.teacher_id)throw new VersionConflictError("Falta la aceptación del proyecto.");
    await lockClassroomSchedule(tx,job.classroom_id);
    const project=(await tx.query("select * from learning_experiences where id=$1 and classroom_id=$2 and status='active' for update",[p.project_id,job.classroom_id])).rows[0];
    if(!project||Number(project.revision)!==p.project_revision||preparationFingerprint(project.details)!==p.project_fingerprint)throw new VersionConflictError("El proyecto cambió. Conservamos las actividades preparadas.");
    const route=project.details.activity_route.filter(item=>p.expected_dates.includes(item.date??item.planned_date));
    if(route.length!==p.expected_dates.length||p.items.length!==route.length||p.items.some(item=>!item.activity_id))throw new VersionConflictError("Primero deben estar listas todas las actividades del proyecto.");
    const rows=(await tx.query("select *,occurs_on::text as occurs_on from activities where experience_id=$1 and id=any($2::uuid[]) for update",[project.id,p.items.map(item=>item.activity_id)])).rows;
    if(rows.length!==route.length)throw new VersionConflictError("Falta una actividad del bloque.");
    const year=(await tx.query('select * from annual_plans where id=$1 and classroom_id=$2',[project.annual_plan_id,job.classroom_id])).rows[0];
    const slot=year?.proposal.resolved_calendar?.projects.find(item=>item.proposal_id===project.source_proposal_id);
    const retired=[];
    if(slot){
      const candidates=(await tx.query(`select a.*,a.occurs_on::text as occurs_on,e.source_proposal_id,e.annual_plan_id,se.id as schedule_id from class_schedule_entries se
        join activities a on a.id=se.activity_id join learning_experiences e on e.id=a.experience_id
        where se.classroom_id=$1 and se.scheduled_on between $2::date and $3::date and se.block_type='activity'
          and a.status='active' and a.schedule_status not in ('cancelled','not_worked') and e.source_proposal_id<>$4`,[job.classroom_id,slot.starts_on,slot.ends_on,project.source_proposal_id])).rows;
      for(const prior of candidates){
        const previous=(await tx.query('select * from annual_plans where id=$1 and classroom_id=$2 and school_year_id=$3',[prior.annual_plan_id,job.classroom_id,year.school_year_id])).rows[0];
        if(!previous)throw new VersionConflictError('La programación pertenece a otro año.');
        assertSavedSlotReplacement(year.proposal,previous.proposal,project.source_proposal_id,prior.source_proposal_id);
        if((prior.occurs_on<limaToday()||await activityHasRecordedWork(tx,prior))&&savedLibraryRestoration(year.proposal,previous.proposal,prior.source_proposal_id,limaToday()))continue;
        await assertActivityScheduleMutable(tx,prior);retired.push(prior);
      }
    }
    const schedules=[];
    for(const item of p.items){
      const row=rows.find(row=>row.id===item.activity_id),blueprint=route.find(row=>row.id===item.route_item_id);
      if(!row||!blueprint||row.details.route_item_id!==blueprint.id||String(row.occurs_on).slice(0,10)!==item.date||item.date<limaToday())throw new VersionConflictError("Revisa las fechas y la secuencia; no publicamos actividades del pasado.");
      const existing=(await tx.query(`select a.*,se.id as schedule_id,se.activity_id,e.source_proposal_id from class_schedule_entries se join activities a on a.id=se.activity_id
        join learning_experiences e on e.id=a.experience_id where se.classroom_id=$1 and se.scheduled_on=$2::date and se.block_type='activity' and a.schedule_status not in ('cancelled','not_worked')`,[job.classroom_id,item.date])).rows;
      if(existing.length>1)throw new VersionConflictError("Hay dos actividades previstas para el mismo día. Revisa el calendario.");
      const prior=existing[0];
      if(prior&&prior.activity_id!==row.id){
        if(prior.source_proposal_id!==project.source_proposal_id&&!retired.some(item=>item.id===prior.id))throw new VersionConflictError("Este día pertenece a otro proyecto. Conservamos su programación.");
        await assertActivityScheduleMutable(tx,{...prior,id:prior.activity_id,occurs_on:item.date});
      }
      schedules.push({item,row,prior});
    }
    for(const prior of retired){
      await tx.query("update activities set schedule_status='cancelled',updated_at=now() where id=$1 and status='active'",[prior.id]);
      await tx.query(`insert into activity_schedule_changes(id,activity_id,previous_date,new_date,change_type,reason,changed_by)
        values($1,$2,$3::date,null,'cancelled',$4,$5)`,[randomUUID(),prior.id,prior.occurs_on,`Proyecto reemplazado por decisión docente · preparación ${job.id}`,job.teacher_id]);
      await tx.query("update activities set status='archived',superseded_at=now(),updated_at=now() where id=$1 and status='active'",[prior.id]);
    }
    const transactionalDb={...tx,transaction:work=>work(tx)};
    for(const {row,item,prior}of schedules){
      if(row.status==='draft'){
        const marked=(await tx.query("update activities set generation_metadata=$1::jsonb where id=$2 and status='draft' and revision=$3 returning revision",[JSON.stringify({...row.generation_metadata,publication_authorization:{...p.acceptance,job_id:job.id,scope:"project_activities",reviewed_individually:false}}),row.id,row.revision])).rows[0];
        if(!marked)throw new VersionConflictError();
        await request({...job,db:transactionalDb},`/api/activities/${row.id}/confirm`,{expectedRevision:Number(marked.revision)},"POST",{acceptedBlock:true});
      }else if(row.status!=='active')throw new VersionConflictError("Una actividad fue reemplazada.");
      if(prior){
        if(prior.activity_id!==row.id){await tx.query("update activities set status='archived',superseded_at=now(),updated_at=now() where id=$1 and status='active'",[prior.activity_id]);}
        await tx.query("update class_schedule_entries set activity_id=$1,title=$2 where id=$3",[row.id,row.title,prior.schedule_id]);
      }else await tx.query(`insert into class_schedule_entries(id,classroom_id,scheduled_on,start_time,end_time,block_type,activity_id,title,is_instructional,sort_order)
        values($1,$2,$3::date,'09:00','09:45','activity',$4,$5,true,50)`,[randomUUID(),job.classroom_id,item.date,row.id,row.title]);
    }
    await tx.query("update preparation_jobs_v2 set approved_at=now(),updated_at=now() where id=$1",[job.id]);
  });
}

export async function prepareAcceptedProjectActivities({db,job,p,call,checkpoint,pending,generatedCall}){
  let {experience:project}=await call(`/api/project-flow/${p.project_id}`);
  if(project.status==='draft'){
    await call(`/api/project-flow/${project.id}/confirm`,{expectedRevision:project.revision});
    project=(await call(`/api/project-flow/${project.id}`)).experience;
  }
  if(!p.items?.length){
    const route=project.details.activity_route.filter(item=>p.expected_dates.includes(item.date??item.planned_date));
    if(route.length!==p.expected_dates.length)throw new VersionConflictError("El Plan Maestro no cubre todos los días aceptados.");
    p.project_revision=Number(project.revision);p.project_fingerprint=preparationFingerprint(project.details);
    p.items=route.map(item=>({id:randomUUID(),route_item_id:item.id,date:item.date??item.planned_date,stage:"generate"}));p.stage="activities";p.attempt_pending=false;await checkpoint(p);return false;
  }
  if(Number(project.revision)!==p.project_revision||preparationFingerprint(project.details)!==p.project_fingerprint)throw new VersionConflictError("El proyecto cambió. Conservamos el trabajo preparado.");
  const remaining=p.items.filter(item=>!item.activity_id);
  if(!remaining.length){p.stage="publishing";await checkpoint(p);await publishAcceptedProjectBlock(db,job,(j,path,body,method,extra)=>call(path,body,method,{...extra,db:j.db}));p.stage="ready";await checkpoint(p);return true;}
  // Each item owns its provider checkpoint. All successful siblings are durable before an error escapes.
  // Saving is deliberately a later step; the complete sequence is still published in one transaction.
  const toSave=remaining.filter(item=>item.generated);
  const batch=(toSave.length?toSave:remaining).slice(0,3);
  const results=await Promise.allSettled(batch.map(async item=>{
    const existing=(await db.query(`select id from activities where experience_id=$1 and (preparation_item_id=$2 or details->>'route_item_id'=$3)
      and status in ('draft','active') order by version desc limit 1`,[project.id,item.id,item.route_item_id])).rows[0];
    if(existing){item.activity_id=existing.id;item.stage="ready";item.attempt_pending=false;await checkpoint(p);return;}
    if(p.attempt_pending)throw Object.assign(new Error("Uncertain legacy call"),{uncertain:true});
    if(!item.generated){
      const started=Date.now();
      const generated=await generatedCall("/api/ai/activities/generate",{experienceId:project.id,routeItemId:item.route_item_id,includeWorkshop:false},item);
      item.generated=generated;item.pending=await pending.get(generated.generation_id);item.stage="save";item.generation_ms=Date.now()-started;
      if(!item.pending)throw Object.assign(new Error("Missing result checkpoint"),{uncertain:true});await checkpoint(p);return;
    }
    await pending.set(item.generated.generation_id,{...item.pending,createdAt:Date.now()});
    const started=Date.now();
    const saved=await call("/api/activities",{experienceId:project.id,generationId:item.generated.generation_id,proposal:item.generated.proposal,occursOn:item.date},"POST",{preparationItemId:item.id});
    item.activity_id=saved.id;item.stage="ready";item.save_ms=Date.now()-started;delete item.generated;delete item.pending;await checkpoint(p);
  }));
  const failure=results.find(result=>result.status==='rejected');
  if(failure)throw failure.reason;
  return false;
}
