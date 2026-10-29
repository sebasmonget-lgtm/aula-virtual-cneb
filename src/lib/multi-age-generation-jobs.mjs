import { isDocumentGenerator } from './ayni-product-mode.mjs';
import { DOCUMENT_GENERATOR_PROMPT_VERSION } from './document-generator-prompts.mjs';
import {documentProjectConversationKey} from './document-generator-project-conversation.mjs';
import { randomUUID } from 'node:crypto';
import { periodEditState } from './period-edit-guard.mjs';
import { assertMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { classroomCurriculumScope, curriculumHash, curriculumRequest, CurriculumPermissionError } from './classroom-curriculum-scope.mjs';
import { multiAgeProjectContext } from './multi-age-projects.mjs';
import { multiAgeDecisionContext, multiAgeConversationKey } from './multi-age-planning-decisions.mjs';
import { multiAgeConversationSource, proposeMultiAgeConversation, MULTI_AGE_CONVERSATION_INSTRUCTIONS, MULTI_AGE_CONVERSATION_SCHEMA } from './multi-age-conversation.mjs';
import { multiAgeDiagnosticContext } from './multi-age-diagnostic.mjs';
import { multiAgeAnnualContext, validateMultiAgeAnnualActivity } from './multi-age-annual.mjs';
import { multiAgePlanningContext, MULTI_AGE_PLANNING_INSTRUCTIONS } from './age-scoped-criteria.mjs';
import { MULTI_AGE_DIAGNOSTIC_INSTRUCTIONS } from './multi-age-diagnostic.mjs';
import { MULTI_AGE_ANNUAL_INSTRUCTIONS } from './multi-age-annual.mjs';
import { proposeLocalMultiAgeDiagnostic, proposeLocalMultiAgeAnnual, MULTI_AGE_DIAGNOSTIC_SCHEMA, MULTI_AGE_ANNUAL_SCHEMA } from './multi-age-planning-generation.mjs';
import { proposeLocalMultiAgeBlueprint, MULTI_AGE_BLUEPRINT_SCHEMA } from './multi-age-generation.mjs';
import { VersionConflictError } from './version-integrity.mjs';
import { withAiUsageContext } from './ai-usage-service.mjs';
import {multiAgeGenerationFailureCode} from './multi-age-generation-failure.mjs';
import {recordOperationalEvent} from './operational-events.mjs';
import {documentProviderState,documentProviderPollDelay,DOCUMENT_PROVIDER_MAX_POLLS,DOCUMENT_PROVIDER_MAX_ELAPSED_MS} from './multi-age-generation-provider-state.mjs';
import { validateMultiAgeBatchDates, proposeMultiAgeActivityBatch, MULTI_AGE_BATCH_INSTRUCTIONS, MULTI_AGE_BATCH_SCHEMA } from './multi-age-activity-batch.mjs';

const kinds=['diagnostic','annual','activity','conversation','activity_batch'];
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
function generationFingerprint(kind,input,source,mode,promptPolicy){return curriculumHash(canonical({kind,input,source,mode,...(promptPolicy?{prompt_policy:promptPolicy}:{}),contract:'multi-age-generation-jobs/v1',
  instructions:{diagnostic:MULTI_AGE_DIAGNOSTIC_INSTRUCTIONS,annual:MULTI_AGE_ANNUAL_INSTRUCTIONS,activity:MULTI_AGE_PLANNING_INSTRUCTIONS,conversation:MULTI_AGE_CONVERSATION_INSTRUCTIONS,activity_batch:MULTI_AGE_BATCH_INSTRUCTIONS}[kind],
  schema:{diagnostic:MULTI_AGE_DIAGNOSTIC_SCHEMA,annual:MULTI_AGE_ANNUAL_SCHEMA,activity:MULTI_AGE_BLUEPRINT_SCHEMA,conversation:MULTI_AGE_CONVERSATION_SCHEMA,activity_batch:MULTI_AGE_BATCH_SCHEMA}[kind]}));}
function sameGeneration(job,data){return job.source_fingerprint===data.sourceFingerprint&&job.input_fingerprint===generationFingerprint(job.kind,job.input,data.sourceFingerprint,job.provider_mode,data.promptPolicy);}
async function claimedJobSource(db,job){
  try{return await multiAgeGenerationSource(db,job.teacher_id,job.kind,job.input);}
  catch(error){
    // Sources that were valid at enqueue can later be withdrawn or change age.
    if(error instanceof TypeError||error instanceof CurriculumPermissionError||error instanceof VersionConflictError)throw new VersionConflictError('Las fuentes de esta propuesta cambiaron.');
    throw error;
  }
}
export async function multiAgeGenerationSource(db,teacherId,kind,input) {
  const data=await multiAgeGenerationSourceInternal(db,teacherId,kind,input);
  return await isDocumentGenerator(db,teacherId)?{...data,promptPolicy:DOCUMENT_GENERATOR_PROMPT_VERSION}:data;
}
async function multiAgeGenerationSourceInternal(db,teacherId,kind,input) {
  const scope=await classroomCurriculumScope(db,teacherId,input.classroomId);
  if(scope.contract!==2)throw new CurriculumPermissionError();
  if(kind==='activity_batch'){
    const dates=validateMultiAgeBatchDates(input);
    const periodState=await activityPeriodState(db,scope,dates);
    const data=await multiAgeGenerationSource(db,teacherId,'activity',{...input,occursOn:dates[0]});
    const plan=(await db.query('select document_context from annual_plans where id=$1 and classroom_id=$2',[input.annualPlanId,scope.id])).rows[0];
    const slot=plan.document_context.calendar.projects.find(s=>s.slot_id===input.annualSlotId);
    if(dates.some(d=>!slot.instructional_dates.includes(d)))throw new TypeError('Todas las fechas del lote deben ser lectivas del tramo elegido.');
    return {sourceFingerprint:curriculumHash({base:data.sourceFingerprint,activityDates:dates,...(periodState?{periodState}:{})}),annualContext:data.annualContext};
  }
  if(kind==='conversation')return multiAgeConversationSource(db,teacherId,input);
  if(kind==='diagnostic') {
    if(await isDocumentGenerator(db,teacherId))throw new TypeError('El generador prepara documentos sin diagnóstico. Conversa con Ayni para preparar Mi año.');
    const data=await multiAgeDiagnosticContext(db,teacherId,input.studentId);
    if(data.scope.classroom.id!==scope.id)throw new CurriculumPermissionError();
    if(!data.context.teacher_observations.some(o=>o.status!=='insufficient_information'))throw new TypeError('Registra primero una observación propia de este niño.');
    return {sourceFingerprint:data.sourceFingerprint};
  }
  if(kind==='annual') {
    const data=await multiAgeAnnualContext(db,teacherId,scope.id);
    if(data.documentsOnly&&!data.diagnosis.students.length)throw new TypeError('Agrega a tus alumnos antes de preparar Mi año.');
    if(!data.diagnosis.ready&&!data.documentsOnly)throw new TypeError('Revisa las fuentes de cada niño antes de preparar Mi año.');
    return {sourceFingerprint:data.sourceFingerprint};
  }
  if(kind!=='activity'||!Array.isArray(input.competencyIds)||!input.competencyIds.length||input.competencyIds.length>6
    ||new Set(input.competencyIds).size!==input.competencyIds.length)throw new TypeError('Selecciona competencias distintas para la actividad.');
  const plan=(await db.query("select * from annual_plans where id=$1 and classroom_id=$2 and curriculum_contract_version=2 and status='active'",[input.annualPlanId,scope.id])).rows[0];
  if(!plan)throw new CurriculumPermissionError();
  const row=plan.proposal.proposals.find(r=>r.slot_id===input.annualSlotId);
  if(!row)throw new CurriculumPermissionError();
  const project=input.projectId?await multiAgeProjectContext(db,teacherId,scope.id,input.projectId):null;
  const variants=input.competencyIds.map(id=>({competency_id:id,variants:scope.ages.filter(age=>row.opportunities.some(o=>o.age===age&&o.competency_id===id)).map(age=>({curricular_age:age,official_performance_refs:project?.project.details.criteria_families.find(f=>f.competency_id===id)?.variants.find(v=>v.curricular_age===age)?.official_performance_refs??[]}))}));
  if(variants.some(f=>!f.variants.length)||scope.ages.some(age=>!variants.some(f=>f.variants.some(v=>v.curricular_age===age))))throw new TypeError('La actividad debe conservar oportunidades para las tres edades atendidas.');
  const lineage=await validateMultiAgeAnnualActivity(db,teacherId,{...input,blueprint:{occursOn:input.occursOn,participantAges:scope.ages,criteriaFamilies:variants}});
  const periodState=await activityPeriodState(db,scope,[input.occursOn]);
  const curriculum=await multiAgePlanningContext(scope,input.competencyIds);
  const documentsOnly=await isDocumentGenerator(db,teacherId);
  const decisions=project?await multiAgeDecisionContext(db,teacherId,scope.id,project.project.id):documentsOnly?await multiAgeDecisionContext(db,teacherId,scope.id):{revision:0,messages:[]};
  const proposal=project?.revisionId?{...row,title:project.project.title,purpose:project.project.purpose,common_invitation:project.commonSequence.opening,one_teacher_organization:project.commonSequence.development}:row;
  const annualContext={plan_id:plan.id,plan_revision:Number(plan.revision),proposal,...(documentsOnly?{organization:plan.proposal.organization,teacher_confirmed_indications:decisions}:{}),...(input.documentPreparation?.projectConversation?{project_conversation:input.documentPreparation.projectConversation,classroom:input.documentPreparation.projectConversation.classroom}:{}),...(project?{confirmed_project:{id:project.project.id,...(documentsOnly&&project.project.details.document_reference_selection_version===2?{document_reference_selection_version:2}:{}),criteria_families:project.project.details.criteria_families,...(project.revisionId?{version:project.version,title:project.project.title,purpose:project.project.purpose,common_sequence:project.commonSequence}: {}),...(project.project.details.document_planning_version>=1?{meaningful_situation:project.project.details.meaningful_situation,common_sequence:project.commonSequence,...(project.project.details.document_planning?{document_planning:project.project.details.document_planning}:{})}:{})},activity_position:input.activityPosition,previous_activities:project.activities.map(a=>({title:a.title,date:a.occurs_on,position:a.position})),teacher_confirmed_indications:decisions}:{})};
  if(annualContext.project_conversation){annualContext.project_conversation=canonical(annualContext.project_conversation);annualContext.classroom=canonical(annualContext.classroom);}
  if(input.documentPreparation?.dates)annualContext.project_schedule={selected_dates:input.documentPreparation.dates,last_activity_date:input.documentPreparation.dates.at(-1),...(input.documentPreparation.planningVersion?{planning_version:input.documentPreparation.planningVersion}:{})};
  const lineageFingerprint={...lineage};
  if(lineage.project)lineageFingerprint.project=Object.fromEntries(Object.entries(lineage.project).filter(([key])=>!['version','revisionId','commonSequence'].includes(key)));
  return {sourceFingerprint:curriculumHash({lineage:lineageFingerprint,curriculum,annualContext,...(periodState?{periodState}:{})}),annualContext};
}

async function activityPeriodState(db,scope,dates){
  const periods=(await db.query(`select id from evaluation_periods where school_year_id=$1
    and exists(select 1 from unnest($2::date[]) d where d between starts_on and ends_on) order by id`,[scope.school_year_id,dates])).rows,states=[];
  for(const period of periods){const edit=await periodEditState(db,scope.id,period.id);
    if(edit.closed)throw new VersionConflictError('Reabre el bimestre antes de preparar actividades para sus fechas.');
    if(edit.state.events?.length)states.push({periodId:period.id,currentVersionId:edit.closure?.current_version_id,events:edit.state.events});
  }
  return states.length?states:null;
}

function cleanInput(value) {
  const allowed=value.kind==='diagnostic'?['classroomId','studentId']:value.kind==='annual'?['classroomId']:['classroomId','annualPlanId','annualSlotId',...(value.kind==='activity_batch'?['activityDates']:['occursOn']),'competencyIds','projectId','expectedProjectFingerprint','activityPosition'];
  if(!kinds.includes(value.kind)||Object.keys(value).some(k=>!['kind','clientRequestId',...allowed].includes(k)))throw new TypeError('Solicitud de preparación inválida.');
  return Object.fromEntries(allowed.map(k=>[k,value[k]]));
}
function summary(row){return {id:row.id,kind:row.kind,input:row.input,status:row.status,attempts:row.attempts,providerMode:row.provider_mode,errorCode:row.error_code,updatedAt:row.updated_at,...(row.kind==='annual'?{createdAt:row.created_at}:{})};}
async function ownedJob(db,teacherId,id) {
  const job=(await db.query('select * from multi_age_generation_jobs where id=$1 and teacher_id=$2',[id,teacherId])).rows[0];
  if(!job)throw new CurriculumPermissionError();
  const scope=await classroomCurriculumScope(db,teacherId,job.classroom_id);if(scope.contract!==2)throw new CurriculumPermissionError();return job;
}
export async function listMultiAgeGenerationJobs(db,teacherId,classroomId) {
  assertMultiAgeLocalDb(db);const scope=await classroomCurriculumScope(db,teacherId,classroomId);if(scope.contract!==2)throw new CurriculumPermissionError();
  return (await db.query('select * from multi_age_generation_jobs where teacher_id=$1 and classroom_id=$2 order by created_at desc,id',[teacherId,classroomId])).rows.map(summary);
}
export async function enqueueMultiAgeGeneration(db,teacherId,value,{mode='off',documentPreparation}={}) {
  assertMultiAgeLocalDb(db);if(!['fixture','openai'].includes(mode))throw new TypeError('La asistencia de IA está desactivada en esta prueba local.');
  if(value.kind==='conversation'){
    if(Object.keys(value).some(k=>!['kind','classroomId','projectId','annualPlanId','annualSlotId','text','expectedRevision','clientRequestId'].includes(k))||typeof value.text!=='string'||!value.text.trim()||value.text.length>2000||!Number.isSafeInteger(value.expectedRevision)||value.expectedRevision<0)throw new TypeError('Escribe un mensaje y recupera la versión de la conversación.');
    return curriculumRequest(db,teacherId,value.clientRequestId,'conversation_turn',value,async tx=>{
      const key=value.annualPlanId||value.annualSlotId?documentProjectConversationKey(value.annualPlanId,value.annualSlotId):multiAgeConversationKey(value.projectId),last=(await tx.query("select status,(input->>'turnNumber')::int as n from multi_age_generation_jobs where teacher_id=$1 and classroom_id=$2 and kind='conversation' and input->>'scopeKey'=$3 order by (input->>'turnNumber')::int desc limit 1",[teacherId,value.classroomId,key])).rows[0];
      if((last?.n??0)!==value.expectedRevision||last&&['queued','running'].includes(last.status))throw new VersionConflictError('Recupera el último turno antes de continuar.');
      if((last?.n??0)>=30)throw new TypeError('Esta conversación llegó a treinta turnos. Puedes conservar las indicaciones y continuar con la preparación.');
      const input={classroomId:value.classroomId,projectId:value.projectId??null,...(value.annualPlanId||value.annualSlotId?{annualPlanId:value.annualPlanId,annualSlotId:value.annualSlotId}:{}),scopeKey:key,turnNumber:(last?.n??0)+1,text:value.text.trim()};
      const data=await multiAgeGenerationSource(tx,teacherId,'conversation',input);
      return {...await insertGeneration(tx,teacherId,'conversation',input,data,mode),classroomId:value.classroomId};
    });
  }
  const input=cleanInput(value);
  // Internal orchestration metadata. Public JSON is still rejected by cleanInput.
  if(documentPreparation){if(!await isDocumentGenerator(db,teacherId)||!['activity','activity_batch'].includes(value.kind))throw new CurriculumPermissionError();input.documentPreparation=documentPreparation;}
  const data=await multiAgeGenerationSource(db,teacherId,value.kind,input);
  return insertGeneration(db,teacherId,value.kind,input,data,mode);
}
async function insertGeneration(db,teacherId,kind,input,data,mode){
  const fingerprint=generationFingerprint(kind,input,data.sourceFingerprint,mode,data.promptPolicy);
  const row=(await db.query(`insert into multi_age_generation_jobs(id,teacher_id,classroom_id,kind,input,input_fingerprint,source_fingerprint,provider_mode,status)
    values($1,$2,$3,$4,$5::jsonb,$6,$7,$8,'queued') on conflict(teacher_id,input_fingerprint) do update set updated_at=multi_age_generation_jobs.updated_at returning *`,
  [randomUUID(),teacherId,input.classroomId,kind,JSON.stringify(input),fingerprint,data.sourceFingerprint,mode])).rows[0];
  return summary(row);
}
export async function loadMultiAgeGeneration(db,teacherId,id) {
  assertMultiAgeLocalDb(db);let job=await ownedJob(db,teacherId,id);
  if(job.status==='ready') {
    let current=false;try{current=sameGeneration(job,await multiAgeGenerationSource(db,teacherId,job.kind,job.input));}catch{/* A prepared slot, changed assignment or removed source makes this result unusable. */}
    if(!current){job=(await db.query("update multi_age_generation_jobs set status='stale',error_code='sources_changed',updated_at=now() where id=$1 returning *",[id])).rows[0];}
  }
  return {...summary(job),sourceFingerprint:job.source_fingerprint,result:job.status==='ready'?job.result:null};
}
export async function retryMultiAgeGeneration(db,teacherId,id,{mode='off'}={}) {
  assertMultiAgeLocalDb(db);const job=await ownedJob(db,teacherId,id);
  if(mode!==job.provider_mode||!['fixture','openai'].includes(mode))throw new TypeError('Conserva el proveedor de la tarea original para reintentar.');
  if(!['failed','interrupted'].includes(job.status)||job.attempts>=3)throw new VersionConflictError('La tarea no admite otro intento. Revisa el estado y sus fuentes.');
  if(!sameGeneration(job,await multiAgeGenerationSource(db,teacherId,job.kind,job.input)))throw new VersionConflictError('Las fuentes cambiaron. Solicita una propuesta nueva.');
  return db.transaction(async tx=>{
    const row=(await tx.query("update multi_age_generation_jobs set status='queued',error_code=null,updated_at=now() where id=$1 and status=$2 and attempts=$3 returning *",[id,job.status,job.attempts])).rows[0];
    if(!row)throw new VersionConflictError();
    await tx.query('delete from multi_age_generation_provider_state where job_id=$1',[id]);
    return summary(row);
  });
}
export async function assertMultiAgeGenerationUse(db,teacherId,id,kind,input) {
  const row=await ownedJob(db,teacherId,id),job={...summary(row),sourceFingerprint:row.source_fingerprint};
  if(job.status!=='ready'||job.kind!==kind||job.input.classroomId!==input.classroomId
    ||kind==='diagnostic'&&job.input.studentId!==input.studentId
    ||['activity','activity_batch'].includes(kind)&&(job.input.annualPlanId!==input.annualPlanId||job.input.annualSlotId!==input.annualSlotId||(job.input.projectId??null)!==(input.projectId??null)||(job.input.activityPosition??1)!==(input.activityPosition??1)))throw new VersionConflictError('Revisa una propuesta vigente para este destinatario.');
  if(kind==='activity_batch'&&(JSON.stringify(job.input.activityDates)!==JSON.stringify(input.activityDates)||JSON.stringify(job.input.competencyIds)!==JSON.stringify(input.competencyIds)||job.input.expectedProjectFingerprint!==input.expectedProjectFingerprint))throw new VersionConflictError('Conserva las fechas, competencias y proyecto del lote revisado.');
  if(!['activity','activity_batch'].includes(kind)&&job.sourceFingerprint!==input.sourceFingerprint)throw new VersionConflictError();
  if(!sameGeneration(row,await multiAgeGenerationSource(db,teacherId,job.kind,job.input)))throw new VersionConflictError('Las fuentes de la propuesta cambiaron.');
}
/** Expired calls are uncertain, never silently retried or billed twice by a restart. */
export async function interruptExpiredMultiAgeGenerations(db,{restarted=false}={}) {
  assertMultiAgeLocalDb(db);
  await db.query(`update multi_age_generation_jobs j set
    status=case when exists(select 1 from multi_age_generation_provider_state p where p.job_id=j.id) then 'queued' else 'interrupted' end,
    error_code=case when exists(select 1 from multi_age_generation_provider_state p where p.job_id=j.id) then null else 'execution_interrupted' end,
    lease_token=null,lease_until=null,updated_at=now() where status='running' and ($1 or lease_until<now())`,[restarted]);
}
function safeMetadata(result) {
  const m=result.metadata??{},p=m.provider_metadata??{},usage=p.usage??{};
  return {routing_policy_version:m.routing_policy_version,model:m.model,reasoning_effort:m.reasoning_effort,
    provider_metadata:{provider:p.provider==='openai'?'openai':'fixture',duration_ms:Number.isFinite(p.duration_ms)?p.duration_ms:null,
      usage:Object.fromEntries(['input_tokens','output_tokens','total_tokens','cached_input_tokens'].map(k=>[k,Number.isFinite(usage[k])?usage[k]:null]))}};
}
export async function runMultiAgeGenerationStep(db,{mode='off',providerForJob}={}) {
  assertMultiAgeLocalDb(db);await interruptExpiredMultiAgeGenerations(db);
  if(!['fixture','openai'].includes(mode)||typeof providerForJob!=='function')return null;
  const token=randomUUID();
  const job=await db.transaction(async tx=>{
    const candidate=(await tx.query(`select j.id,j.kind,j.teacher_id from multi_age_generation_jobs j
      left join multi_age_generation_provider_state p on p.job_id=j.id
      where j.status='queued' and j.provider_mode=$1 and (p.next_poll_at is null or p.next_poll_at<=now())
      order by j.created_at,j.id for update of j skip locked limit 1`,[mode])).rows[0];
    if(!candidate)return null;
    const leaseSeconds=candidate.kind==='annual'&&await isDocumentGenerator(tx,candidate.teacher_id)?660:360;
    return (await tx.query(`update multi_age_generation_jobs j set status='running',
      attempts=attempts+case when exists(select 1 from multi_age_generation_provider_state p where p.job_id=j.id) then 0 else 1 end,
      lease_token=$2,lease_until=now()+($3::int*interval '1 second'),updated_at=now() where id=$1 and status='queued' returning *`,[candidate.id,token,leaseSeconds])).rows[0];
  });
  if(!job)return null;
  let completedResult=null;
  try {
    const before=await claimedJobSource(db,job);
    if(!sameGeneration(job,before))throw new VersionConflictError();
    const provider=await providerForJob(job);
    const result=await withAiUsageContext({teacherId:job.teacher_id,db},()=>job.kind==='activity_batch'?proposeMultiAgeActivityBatch(db,job.teacher_id,job.input,before.annualContext,{provider}):job.kind==='conversation'?proposeMultiAgeConversation(db,job.teacher_id,job.input,{provider}):job.kind==='diagnostic'
      ?proposeLocalMultiAgeDiagnostic(db,job.teacher_id,job.input.studentId,{provider})
      :job.kind==='annual'?proposeLocalMultiAgeAnnual(db,job.teacher_id,job.classroom_id,{provider})
        :proposeLocalMultiAgeBlueprint(db,job.teacher_id,{...job.input,annualContext:before.annualContext},{provider}));
    completedResult={...result,sourceFingerprint:job.source_fingerprint,metadata:safeMetadata(result)};
    if(job.kind==='activity')await validateMultiAgeAnnualActivity(db,job.teacher_id,{...job.input,blueprint:result.proposal});
    const after=await claimedJobSource(db,job);
    if(!sameGeneration(job,after))throw new VersionConflictError();
    const saved=completedResult;
    await db.query("update multi_age_generation_jobs set status='ready',result=$3::jsonb,lease_token=null,lease_until=null,updated_at=now() where id=$1 and lease_token=$2 and status='running'",[job.id,token,JSON.stringify(saved)]);
  }catch(error){
    const checkpoint=await documentProviderState(db,job.id),delay=documentProviderPollDelay(error);
    if(checkpoint&&delay!==null&&checkpoint.poll_count<DOCUMENT_PROVIDER_MAX_POLLS&&Date.now()-Date.parse(checkpoint.started_at)<DOCUMENT_PROVIDER_MAX_ELAPSED_MS){
      await db.transaction(async tx=>{
        const saved=await tx.query("update multi_age_generation_jobs set status='queued',error_code=null,lease_token=null,lease_until=null,updated_at=now() where id=$1 and lease_token=$2 and status='running' returning id",[job.id,token]);
        if(saved.rows.length)await tx.query("update multi_age_generation_provider_state set next_poll_at=now()+($2::int*interval '1 millisecond'),last_reason=$3 where job_id=$1",[job.id,delay,error.reason]);
      });
      return summary(await ownedJob(db,job.teacher_id,job.id));
    }
    const expired=checkpoint&&delay!==null&&(checkpoint.poll_count>=DOCUMENT_PROVIDER_MAX_POLLS||Date.now()-Date.parse(checkpoint.started_at)>=DOCUMENT_PROVIDER_MAX_ELAPSED_MS);
    const stale=error instanceof VersionConflictError,code=stale?'sources_changed':expired?'provider_response_expired':multiAgeGenerationFailureCode(error);
    recordOperationalEvent('multi_age_generation_failed',{requestId:job.id,workflow:job.kind,status:502,reason:code});
    await db.query("update multi_age_generation_jobs set status=$3,error_code=$4,result=coalesce(result,$5::jsonb),lease_token=null,lease_until=null,updated_at=now() where id=$1 and lease_token=$2 and status='running'",[job.id,token,stale?'stale':code==='provider_uncertain'?'interrupted':'failed',code,stale&&completedResult?JSON.stringify(completedResult):null]);
  }
  return summary(await ownedJob(db,job.teacher_id,job.id));
}
