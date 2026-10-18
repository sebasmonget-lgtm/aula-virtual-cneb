import { enqueuePreparation, enqueueActivityBlock, ownedPreparationJob, publicPreparationJob, retryPreparation, preparationFingerprint,needsAcceptedProjectContinuation,recoverAcceptedProjectContinuation,recoverSavedPreparationResult } from "../src/lib/preparation-jobs.mjs";
import { versionTransaction, VersionConflictError, httpStatusForError, publicErrorMessage } from "../src/lib/version-integrity.mjs";
import { lockClassroomSchedule, limaToday } from "../src/lib/activity-schedule-integrity.mjs";
import {COMPLETE_PROJECT_POLICY} from "../src/lib/complete-project-preparation.mjs";
import {assertSingleProjectPreparationRevision} from "../src/lib/annual-proposal-preview.mjs";
import {loadProjectChat} from "../src/lib/annual-project-chat.mjs";
import {proposalIntentIssues} from '../src/lib/annual-proposal-intent.mjs';
import {protectedSlotDates} from '../src/lib/project-slot-replacement.mjs';
import {isDeepStrictEqual} from 'node:util';

async function futureDates(db,project){
  const recorded=(await db.query(`select distinct a.occurs_on::text as date from activities a join learning_experiences e on e.id=a.experience_id
    where e.lineage_id=$1 and (exists(select 1 from evidences ev where ev.activity_id=a.id)
      or exists(select 1 from ordinary_observations o where o.activity_id=a.id)
      or exists(select 1 from class_schedule_entries se join daily_execution_logs d on d.schedule_entry_id=se.id
        where se.activity_id=a.id and (d.status<>'planned' or d.actual_started_at is not null or d.actual_ended_at is not null)))`,[project.lineage_id])).rows;
  return project.details.activity_route.filter(item=>(item.date??item.planned_date)>limaToday()&&!recorded.some(row=>row.date===(item.date??item.planned_date))).map(item=>item.date??item.planned_date);
}
function futurePreview(project,proposal,chat){
  const dates=project.generation_metadata.future_change_preview.expected_dates;
  const route=project.details.activity_route.filter(item=>dates.includes(item.date));
  return {planId:project.id,revision:Number(project.revision),preview:{id:project.id,proposalId:project.source_proposal_id,conversationId:chat.id,conversationRevision:chat.payload.revision,
    request:chat.payload.messages.filter(m=>m.role==='teacher').map(m=>m.text).join('\n'),changes:['Desarrollo de los días futuros'],
    proposal:{...proposal,title:project.title,purpose:project.purpose,primary_competency_ids:project.details.decisions.competency_ids,
      children_actions:route.slice(0,3).map(item=>item.specific_purpose),materials:project.details.project_master.resources??[],planned_instructional_days:dates.length}}};
}

export async function handlePreparationRoutes({request,response,url,db,teacherId,origin,send,readJson,annualPlanningContext,projectFlowSource,projectFlowRow,domainRequest}) {
  if(!url.pathname.startsWith("/api/preparation/"))return false;
  try {
    const proposalActivities=/^\/api\/preparation\/proposals\/([0-9a-f-]{36})\/activities$/i.exec(url.pathname);
    if(proposalActivities&&request.method==='GET'){
      const context=await annualPlanningContext();if(!context)throw new VersionConflictError('Aula no disponible.');
      const source=(await db.query(`select 1 from annual_plans p join school_years y on y.id=p.school_year_id
        where p.classroom_id=$1 and p.school_year_id=$2 and y.owner_id=$3 and exists(select 1 from jsonb_array_elements(p.proposal->'proposed_experiences') r where r->>'proposal_id'=$4)`,[context.id,context.school_year_id,teacherId,proposalActivities[1]])).rows;
      if(!source.length)throw new VersionConflictError('El proyecto no pertenece a tu año.');
      const activities=(await db.query(`select a.id,a.title,a.experience_id,se.scheduled_on::text as date,
        coalesce((select jsonb_agg(distinct ac.competency_v4_id) filter(where ac.competency_v4_id is not null) from activity_criteria ac where ac.activity_id=a.id and ac.status='active'),'[]'::jsonb) as competency_ids,
        coalesce(d.status,'planned') as execution_status from class_schedule_entries se join activities a on a.id=se.activity_id
        join learning_experiences e on e.id=a.experience_id join annual_plans p on p.id=e.annual_plan_id
        left join daily_execution_logs d on d.schedule_entry_id=se.id
        where se.classroom_id=$1 and p.school_year_id=$2 and e.source_proposal_id=$3 and se.block_type='activity' and a.status='active' and a.schedule_status not in ('cancelled','not_worked')
        order by se.scheduled_on,a.id`,[context.id,context.school_year_id,proposalActivities[1]])).rows;
      const project=(await db.query(`select e.id,e.annual_plan_id,e.title,e.purpose,e.details->'decisions'->'competency_ids' as competency_ids from learning_experiences e join annual_plans p on p.id=e.annual_plan_id
        where e.classroom_id=$1 and p.school_year_id=$2 and e.source_proposal_id=$3 and e.status='active'
        and exists(select 1 from activities a where a.experience_id=e.id and a.status='active' and a.schedule_status not in ('cancelled','not_worked'))
        order by p.version desc,e.version desc,e.teacher_confirmed_at desc limit 1`,[context.id,context.school_year_id,proposalActivities[1]])).rows[0]??null;
      const protectedProject=(await db.query(`select exists(select 1 from learning_experiences e
        join annual_plans p on p.id=e.annual_plan_id where e.classroom_id=$1 and p.school_year_id=$2 and e.source_proposal_id=$3
        and (e.starts_on<$4::date or exists(select 1 from activities a where a.experience_id=e.id and (
          exists(select 1 from evidences ev where ev.activity_id=a.id) or exists(select 1 from ordinary_observations o where o.activity_id=a.id)
          or exists(select 1 from class_schedule_entries se join daily_execution_logs d on d.schedule_entry_id=se.id where se.activity_id=a.id
            and (d.status<>'planned' or d.actual_started_at is not null or d.actual_ended_at is not null)))))) as protected`,[context.id,context.school_year_id,proposalActivities[1],limaToday()])).rows[0]?.protected;
      const plan=(await db.query(`select id,proposal,generation_metadata,supersedes_plan_id from annual_plans where classroom_id=$1 and school_year_id=$2 and status in ('draft','active')
        and exists(select 1 from jsonb_array_elements(proposal->'proposed_experiences') r where r->>'proposal_id'=$3) order by version desc limit 1`,[context.id,context.school_year_id,proposalActivities[1]])).rows[0];
      const row=plan?.proposal.proposed_experiences.find(row=>row.proposal_id===proposalActivities[1]);
      const blocked_dates=row?await protectedSlotDates(db,context.id,row.planned_start_date,row.planned_end_date):[];
      const can_restore=!!row&&!row.teacher_protected&&(row.instructional_dates??[]).some(date=>date>=limaToday()&&!blocked_dates.includes(date));
      const baseline=plan?.generation_metadata?.scoped_base_proposal??(plan?.supersedes_plan_id?(await db.query('select proposal from annual_plans where id=$1 and classroom_id=$2',[plan.supersedes_plan_id,context.id])).rows[0]?.proposal:null);
      const prepared_current=!!project&&(project.annual_plan_id===plan?.id||isDeepStrictEqual(row,baseline?.proposed_experiences?.find(item=>item.proposal_id===proposalActivities[1])));
      send(response,200,{today:limaToday(),project,prepared_current,can_replace:!protectedProject,can_restore,blocked_dates,activities:activities.map(row=>({...row,state:row.execution_status==='completed'?'Realizada':['active','in_progress'].includes(row.execution_status)?'En curso':row.date<limaToday()?'Sin realizar':'Lista'}))},origin);return true;
    }
    if(url.pathname==='/api/preparation/projects/future-preview'&&['GET','POST'].includes(request.method)){
      const body=request.method==='POST'?await readJson(request):Object.fromEntries(url.searchParams),{row:project}=await projectFlowRow(body.projectId);
      if(!project||project.status!=='active'||project.details.experience_contract!==1)throw new VersionConflictError('Abre el proyecto confirmado para revisar sus días futuros.');
      const source=await projectFlowSource(project.annual_plan_id,project.source_proposal_id,true,project.source_proposal_index);
      const chat=await loadProjectChat(db,project.classroom_id,project.source_proposal_id,body.conversationId);
      const draft=(await db.query("select * from learning_experiences where lineage_id=$1 and status='draft'",[project.lineage_id])).rows[0];
      const cached=draft?.generation_metadata.future_change_preview;
      const dates=await futureDates(db,project);
      const valid=cached&&chat&&!chat.payload.pending_turn&&cached.chat_id===chat.id&&cached.chat_revision===chat.payload.revision&&cached.source_revision===Number(project.revision)&&JSON.stringify(cached.expected_dates)===JSON.stringify(dates);
      if(request.method==='GET'){send(response,200,valid?futurePreview(draft,source.source,chat):null,origin);return true;}
      if(new Set(project.details.decisions?.competency_ids??[]).size<2)throw new VersionConflictError('Revisa la propuesta con Ayni para incluir dos competencias antes de preparar otra versión.');
      if(!chat||chat.payload.pending_turn||chat.payload.revision!==body.conversationRevision||!chat.payload.messages.some(m=>m.role==='teacher'))throw new VersionConflictError('Revisa las decisiones actuales de la conversación.');
      if(valid){send(response,200,futurePreview(draft,source.source,chat),origin);return true;}
      if(!dates.length)throw new VersionConflictError('Este proyecto ya no tiene días futuros sin registros. Conservamos su historia.');
      const job={id:project.id,teacher_id:teacherId,classroom_id:project.classroom_id,payload:{}};
      const copied=draft??await domainRequest(job,`/api/learning-experiences/${project.id}/new-version`,{expectedRevision:Number(project.revision)});
      if(draft?.supersedes_experience_id!==undefined&&draft.supersedes_experience_id!==project.id)throw new VersionConflictError('Hay otra versión en revisión. Ábrela antes de continuar.');
      let row=(await projectFlowRow(copied.id)).row;
      const contextText=chat.payload.answer.message;
      await domainRequest(job,`/api/project-flow/${row.id}/dependents`,{expectedRevision:Number(row.revision),decisions:{...project.details.decisions,additional_context:contextText}});
      row=(await projectFlowRow(row.id)).row;
      row=(await db.query("update learning_experiences set details=$1::jsonb where id=$2 and status='draft' and revision=$3 returning *",[JSON.stringify({...row.details,project_context:{ready:true,messages:chat.payload.messages.map((message,index)=>({...message,source_turn:index,support_text:message.text}))}}),row.id,row.revision])).rows[0];
      if(!row)throw new VersionConflictError();
      await domainRequest(job,`/api/project-flow/${row.id}/master`,{expectedRevision:Number(row.revision),dependents:row.details.dependents});
      row=(await projectFlowRow(row.id)).row;
      const saved=(await db.query(`update learning_experiences set generation_metadata=$1::jsonb where id=$2 and status='draft' and revision=$3 returning *`,[JSON.stringify({...row.generation_metadata,future_change_preview:{chat_id:chat.id,chat_revision:chat.payload.revision,source_revision:Number(project.revision),expected_dates:dates}}),row.id,row.revision])).rows[0];
      if(!saved)throw new VersionConflictError();send(response,200,futurePreview(saved,source.source,chat),origin);return true;
    }
    if(url.pathname==='/api/preparation/projects/future-complete'&&request.method==='POST'){
      const body=await readJson(request),{row:project}=await projectFlowRow(body.projectId);
      if(project&&body.accepted===true){
        const previous=(await db.query(`select * from preparation_jobs where teacher_id=$1 and classroom_id=$2
          and payload->>'project_id'=$3 and payload->>'future_version'='true' and payload->'acceptance'->>'policy'=$4
          and payload->>'accepted_preview_revision'=$5 order by created_at desc limit 1`,
        [teacherId,project.classroom_id,project.id,COMPLETE_PROJECT_POLICY,String(body.expectedRevision)])).rows[0];
        if(previous){send(response,202,publicPreparationJob(previous),origin);return true;}
      }
      if(!project||project.status!=='draft'||Number(project.revision)!==body.expectedRevision||body.accepted!==true)throw new VersionConflictError('Revisa y acepta la nueva versión del proyecto.');
      if(new Set(project.details.decisions?.competency_ids??[]).size<2)throw new VersionConflictError('La nueva versión necesita dos competencias con oportunidades completas.');
      const preview=project.generation_metadata.future_change_preview,chat=preview&&await loadProjectChat(db,project.classroom_id,project.source_proposal_id,preview.chat_id);
      const original=(await db.query("select * from learning_experiences where id=$1 and classroom_id=$2 and status='active'",[project.supersedes_experience_id,project.classroom_id])).rows[0];
      if(!chat||chat.payload.pending_turn||chat.payload.revision!==preview.chat_revision||!original||Number(original.revision)!==preview.source_revision)throw new VersionConflictError('Hay decisiones nuevas. Revisa otra vez la propuesta de los días futuros.');
      const dates=await futureDates(db,original);if(!dates.length||JSON.stringify(dates)!==JSON.stringify(preview.expected_dates))throw new VersionConflictError('El trabajo registrado cambió. Revisa los días que todavía podemos ajustar.');
      const source=await projectFlowSource(project.annual_plan_id,project.source_proposal_id,true,project.source_proposal_index);
      const job=await enqueuePreparation(db,{teacherId,classroomId:project.classroom_id,kind:'project',sourceId:project.annual_plan_id,sourceRevision:source.plan.revision,
        input:{policy:COMPLETE_PROJECT_POLICY,projectId:project.id,projectRevision:project.revision,chatRevision:chat.payload.revision},
        payload:{stage:'activities',future_version:true,accepted_preview_revision:Number(project.revision),proposal_id:project.source_proposal_id,project_id:project.id,additional_context:project.details.decisions.additional_context,
          expected_dates:dates,acceptance:{policy:COMPLETE_PROJECT_POLICY,teacher_id:teacherId,accepted_at:new Date().toISOString(),scope:'future_project_activities',reviewed_individually:false}}});
      send(response,202,publicPreparationJob(job),origin);return true;
    }
    if(url.pathname==="/api/preparation/projects/complete"&&request.method==="POST"){
      const body=await readJson(request),context=await annualPlanningContext();
      if(body.accepted!==true||!context)throw new VersionConflictError("Acepta el proyecto antes de preparar sus actividades.");
      let plan=(await db.query(`select ap.* from annual_plans ap join school_years y on y.id=ap.school_year_id where ap.id=$1 and ap.classroom_id=$2 and y.owner_id=$3`,[body.annualPlanId,context.id,teacherId])).rows[0];
      if(!plan||Number(plan.revision)!==body.expectedRevision||!['active','draft'].includes(plan.status))throw new VersionConflictError("Mi año cambió. Abre la versión actual antes de preparar.");
      // Replay preserves the calendar already accepted, including jobs created by older clients.
      const previous=(await db.query(`select * from preparation_jobs where teacher_id=$1 and classroom_id=$2 and source_id=$3 and source_revision=$4
        and payload->>'proposal_id'=$5 and payload->'acceptance'->>'policy'=$6 order by created_at desc limit 1`,[teacherId,context.id,plan.id,plan.revision,body.proposalId,COMPLETE_PROJECT_POLICY])).rows[0];
      if(previous){send(response,202,publicPreparationJob(await recoverAcceptedProjectContinuation(db,teacherId,previous.id)),origin);return true;}
      const dates=body.selectedDates;
      if(!Array.isArray(dates)||!dates.length||new Set(dates).size!==dates.length||dates.some(date=>typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<limaToday()))
        throw new VersionConflictError('Confirma en el calendario los días que trabajarás antes de preparar el proyecto.');
      const candidate=plan.proposal.proposed_experiences.find(row=>row.proposal_id===body.proposalId);
      if(!candidate||proposalIntentIssues(candidate,[],plan.proposal.curriculum_reference??[]).length)
        throw new VersionConflictError('Antes de preparar, completa con Ayni las dos competencias y los materiales concretos de este proyecto. Conservamos lo que ya está guardado.');
      // Reject an invalid calendar before confirming a scoped annual revision.
      // The authoritative saved proposal already excludes holidays and weekends.
      if(!Array.isArray(candidate.instructional_dates)||dates.some(date=>!candidate.instructional_dates.includes(date)))
        throw new VersionConflictError('Selecciona días de clase disponibles dentro de este proyecto.');
      if(candidate.planned_end_date<limaToday())throw new VersionConflictError('Este proyecto es solo para consulta: sus fechas ya terminaron. Usa su propuesta en un tramo futuro para prepararlo.');
      const blockedDates=await protectedSlotDates(db,context.id,candidate.planned_start_date,candidate.planned_end_date);
      if(dates.some(date=>blockedDates.includes(date)))throw new VersionConflictError('Estos días ya tienen trabajo registrado. Confirma solo los días disponibles; conservamos las actividades y observaciones anteriores.');
      if(plan.status==='draft'){
        const current=(await db.query("select * from annual_plans where classroom_id=$1 and status='active'",[context.id])).rows[0];
        if(!current||plan.supersedes_plan_id!==current.id||plan.proposal.pending_changes?.length)throw new VersionConflictError("Confirma primero Mi año. Conservamos el borrador.");
        // Project acceptance may confirm a scoped revision, never unrelated changes to the year.
        const copied=plan.generation_metadata?.scoped_base_proposal;
        if(copied&&Number(plan.generation_metadata.scoped_source_revision)!==Number(current.revision))throw new VersionConflictError('Mi año cambió. Revisa la propuesta actual antes de preparar.');
        assertSingleProjectPreparationRevision(copied??current.proposal,plan.proposal,body.proposalId);
        // Recover scoped copies created before inherited validation was retained.
        // A new card must have its own persisted successful review; all other content passed the scope check above.
        if(copied&&plan.proposal.pedagogical_review?.status==='pending'&&current.proposal.pedagogical_review?.status==='passed'&&
          plan.proposal.change_history?.some(change=>change.kind==='library_creation'&&change.proposal_id===body.proposalId&&change.review?.status==='passed')){
          plan=(await db.query("update annual_plans set proposal=$1::jsonb where id=$2 and status='draft' and revision=$3 returning *",
            [JSON.stringify({...plan.proposal,pedagogical_review:{...current.proposal.pedagogical_review,scope:'inherited_and_scoped_card_review',source_plan_id:current.id}}),plan.id,plan.revision])).rows[0];
          if(!plan)throw new VersionConflictError();
        }
        await domainRequest({id:plan.id,teacher_id:teacherId,classroom_id:context.id,payload:{}},`/api/annual-journey/${plan.id}/confirm`,{expectedRevision:Number(plan.revision),confirmationScope:'planning',interpretationsReviewed:false,futureCoverageAcknowledged:true});
        plan=(await db.query("select * from annual_plans where id=$1",[plan.id])).rows[0];
      }
      const source=await projectFlowSource(plan.id,body.proposalId);
      if(!source.plan.proposal.experience_context||source.slot.ends_on<limaToday()||!Array.isArray(dates)||!dates.length||new Set(dates).size!==dates.length||dates.some(date=>typeof date!=='string'||date<limaToday()||!source.dates?.includes(date)))throw new VersionConflictError("Selecciona días de clase disponibles dentro de este proyecto.");
      const started=await domainRequest({id:plan.id,teacher_id:teacherId,classroom_id:context.id,payload:{}},"/api/project-flow/start",{annualPlanId:plan.id,proposalId:body.proposalId});
      if(started.experience.status==='draft'&&!started.experience.details.project_master)await domainRequest({id:plan.id,teacher_id:teacherId,classroom_id:context.id,payload:{}},`/api/project-flow/${started.experience.id}/calendar`,{
        selectedDates:[...dates].sort(),exclusions:Object.fromEntries(source.dates.filter(date=>!dates.includes(date)).map(date=>[date,'Día excluido por la docente del proyecto'])),confirm:true},'PUT');
      const contextText=started.experience.details.decisions?.additional_context??"";
      const job=await enqueuePreparation(db,{teacherId,classroomId:context.id,kind:'project',sourceId:plan.id,sourceRevision:plan.revision,
        input:{policy:COMPLETE_PROJECT_POLICY,proposalId:body.proposalId,dates},payload:{stage:'structure',proposal_id:body.proposalId,project_id:started.experience.id,
          additional_context:contextText,expected_dates:[...dates].sort(),acceptance:{policy:COMPLETE_PROJECT_POLICY,teacher_id:teacherId,accepted_at:new Date().toISOString(),scope:'project_and_daily_activities',reviewed_individually:false}}});
      send(response,202,publicPreparationJob(job),origin);return true;
    }
    if(url.pathname==="/api/preparation/projects" && request.method==="POST"){
      const body=await readJson(request),source=await projectFlowSource(body.annualPlanId,body.proposalId);
      if(!source.plan.proposal.experience_context || source.plan.status!=="active")throw new VersionConflictError("Confirma Mi año antes de preparar el proyecto.");
      if(source.slot.ends_on<limaToday())throw new VersionConflictError("Este proyecto pertenece al pasado. Consúltalo o elige un proyecto futuro; no se prepara retrospectivamente.");
      if(typeof body.additionalContext!=="string" || body.additionalContext.length>1000)throw new TypeError("Resume el contexto en un máximo de 1000 caracteres.");
      let revisedProject=null;
      if(body.projectId!==undefined || body.expectedProjectRevision!==undefined){
        const {row}=await projectFlowRow(body.projectId);
        if(!row || row.status!=="draft" || row.annual_plan_id!==source.plan.id || row.source_proposal_id!==body.proposalId ||
          row.revision!==body.expectedProjectRevision || row.details.stage!=="dependents" || row.details.project_master ||
          row.details.decisions?.additional_context!==body.additionalContext)
          throw new VersionConflictError("La preparación cambió. Abre el proyecto guardado antes de volver a prepararlo.");
        revisedProject=row;
      }
      const job=await enqueuePreparation(db,{teacherId,classroomId:source.classroom.id,kind:"project",sourceId:source.plan.id,sourceRevision:source.plan.revision,
        input:{proposalId:body.proposalId,additionalContext:body.additionalContext,...(revisedProject?{projectId:revisedProject.id,projectRevision:revisedProject.revision}:{})},
        payload:{stage:"structure",proposal_id:body.proposalId,additional_context:body.additionalContext,...(revisedProject?{project_id:revisedProject.id}:{})}});
      send(response,202,publicPreparationJob(job),origin);return true;
    }
    if(url.pathname==="/api/preparation/activities" && request.method==="POST"){
      const {row}=await projectFlowRow((await readJson(request)).experienceId);
      if(!row)throw new VersionConflictError("Proyecto no disponible.");
      const complete=(await db.query(`select * from preparation_jobs where teacher_id=$1 and classroom_id=$2
        and payload->>'project_id'=$3 and payload->'acceptance'->>'policy'=$4 order by created_at desc limit 1`,[teacherId,row.classroom_id,row.id,COMPLETE_PROJECT_POLICY])).rows[0];
      if(complete){send(response,202,publicPreparationJob(complete),origin);return true;}
      send(response,202,publicPreparationJob(await enqueueActivityBlock(db,teacherId,row)),origin);return true;
    }
    if(url.pathname==="/api/preparation/current" && request.method==="GET"){
      const context=await annualPlanningContext();
      const rows=context?(await db.query(`select * from preparation_jobs where classroom_id=$1 and teacher_id=$2 order by created_at desc`,[context.id,teacherId])).rows:[];
      for(let index=0;index<rows.length;index++){
        if(rows[index].status==='uncertain')rows[index]=await recoverSavedPreparationResult(db,teacherId,rows[index].id);
        if(needsAcceptedProjectContinuation(rows[index]))rows[index]=await recoverAcceptedProjectContinuation(db,teacherId,rows[index].id);
      }
      send(response,200,{jobs:rows.map(publicPreparationJob)},origin);return true;
    }
    const match=/^\/api\/preparation\/([0-9a-f-]{36})(?:\/(retry|review|approve))?$/i.exec(url.pathname);
    if(!match)return false;
    const [,id,action]=match,row=await ownedPreparationJob(db,teacherId,id);
    if(!action && request.method==="GET"){
      const recovered=row.status==='uncertain'?await recoverSavedPreparationResult(db,teacherId,id):row;
      send(response,200,publicPreparationJob(needsAcceptedProjectContinuation(recovered)?await recoverAcceptedProjectContinuation(db,teacherId,id):recovered),origin);return true;
    }
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
