import {multiAgeGenerationFailureMessage} from './multi-age-generation-failure.mjs';
import {curriculumHash,curriculumRequest,classroomCurriculumScope,CurriculumPermissionError} from './classroom-curriculum-scope.mjs';
import {isDocumentGenerator} from './ayni-product-mode.mjs';
import {multiAgeLocalWorkspace,confirmMultiAgeActivity} from './multi-age-local-service.mjs';
import {confirmMultiAgeActivityBatch} from './multi-age-activity-batch.mjs';
import {enqueueMultiAgeGeneration,loadMultiAgeGeneration,retryMultiAgeGeneration} from './multi-age-generation-jobs.mjs';
import {VersionConflictError} from './version-integrity.mjs';
import {documentProjectConversationSnapshot} from './document-generator-project-conversation.mjs';

const uuid=hash=>`${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
async function scope(db,teacherId,classroomId){
 const s=await classroomCurriculumScope(db,teacherId,classroomId);
 if(s.contract!==2||!await isDocumentGenerator(db,teacherId))throw new CurriculumPermissionError();return s;
}
async function roots(db,teacherId,classroomId){return (await db.query(`select * from multi_age_generation_jobs where teacher_id=$1 and classroom_id=$2 and input->'documentPreparation'->>'root'='true' order by created_at desc,id`,[teacherId,classroomId])).rows;}
async function snapshot(db,teacherId,root){
 await scope(db,teacherId,root.classroom_id);
 const jobs=(await db.query(`select * from multi_age_generation_jobs where teacher_id=$1 and classroom_id=$2 and input->'documentPreparation'->>'preparationId'=$3 order by coalesce((input->>'activityPosition')::int,1),created_at,id`,[teacherId,root.classroom_id,root.input.documentPreparation.preparationId])).rows;
 const w=await multiAgeLocalWorkspace(db,teacherId,root.classroom_id),project=w.projects.find(p=>p.annual_plan_id===root.input.annualPlanId&&p.annual_slot_id===root.input.annualSlotId);
 const jobIds=jobs.map(j=>j.id),activities=w.activities.filter(a=>jobIds.includes(a.details.generation_job_id));
 const dates=root.input.documentPreparation.dates,last=jobs.at(-1)??root;
 const complete=dates.every(d=>activities.some(a=>a.occurs_on===d));
 return {root,jobs,last,w,project,activities,dates,complete};
}
const publicState=s=>({id:s.root.id,kind:'project',complete_project:true,legacy:s.root.error_code==='document_project_sources_changed',project_id:s.project?.id??null,
 status:s.complete?'succeeded':s.root.error_code==='document_project_sources_changed'||['stale','failed'].includes(s.last.status)?'failed':s.last.status==='interrupted'?'uncertain':'running',
 stage:s.project?'activities':'master',completed:s.activities.length,total:s.dates.length,created_at:s.root.created_at,approved_at:s.complete?s.last.updated_at:null,
 error:s.root.error_code==='document_project_sources_changed'?'Mi año o sus fuentes cambiaron. Conservamos las actividades preparadas; revisa el año antes de continuar.':['failed','stale','interrupted'].includes(s.last.status)?multiAgeGenerationFailureMessage(s.last.error_code):null,
 activities:s.activities.map(a=>({id:a.id,title:a.title,date:a.occurs_on}))});

/** GET is read-only. Teacher, classroom, annual lineage and private jobs are checked server-side. */
export async function readDocumentGeneratorProjectPreparation(db,teacherId,{classroomId,annualPlanId,annualSlotId}){
 await scope(db,teacherId,classroomId);
 const root=(await roots(db,teacherId,classroomId)).find(r=>r.input.annualPlanId===annualPlanId&&r.input.annualSlotId===annualSlotId);
 return root?publicState(await snapshot(db,teacherId,root)):null;
}
export async function startDocumentGeneratorProjectPreparation(db,teacherId,input,{mode='off'}={}){
 await scope(db,teacherId,input.classroomId);
 if(input.teacherConfirmed!==true)throw new TypeError('Acepta la propuesta y los días para preparar el proyecto.');
 const plan=(await db.query("select * from annual_plans where id=$1 and classroom_id=$2 and status='active' and curriculum_contract_version=2",[input.annualPlanId,input.classroomId])).rows[0];
 if(!plan)throw new CurriculumPermissionError();
 // node-postgres returns bigint revisions as strings; older open clients may
 // echo that representation. Keep the optimistic lock, accepting integers only.
 const rawRevision=input.expectedPlanRevision,expectedRevision=typeof rawRevision==='number'||typeof rawRevision==='string'&&/^[1-9]\d*$/u.test(rawRevision)?Number(rawRevision):NaN;
 if(!Number.isSafeInteger(expectedRevision)||Number(plan.revision)!==expectedRevision)throw new VersionConflictError('Mi año cambió. Recupera la propuesta antes de prepararla.');
 const slot=plan.document_context.calendar.projects.find(s=>s.slot_id===input.annualSlotId),row=plan.proposal.proposals.find(p=>p.slot_id===input.annualSlotId),dates=input.selectedDates;
 if(!slot||!row||!Array.isArray(dates)||!dates.length||dates.length>30||dates.some((d,i)=>!slot.instructional_dates.includes(d)||i>0&&d<=dates[i-1]))throw new TypeError('Elige días lectivos distintos y ordenados de este proyecto.');
 const previous=(await roots(db,teacherId,input.classroomId)).find(r=>r.input.annualPlanId===plan.id&&r.input.annualSlotId===input.annualSlotId);
 if(previous){if(JSON.stringify(previous.input.documentPreparation.dates)!==JSON.stringify(dates))throw new VersionConflictError('Este proyecto ya tiene una preparación con otros días. Conservamos sus actividades y su avance.');return publicState(await snapshot(db,teacherId,previous));}
 const w=await multiAgeLocalWorkspace(db,teacherId,input.classroomId),project=w.projects.find(p=>p.annual_plan_id===plan.id&&p.annual_slot_id===input.annualSlotId);
 if(!project&&dates.length<2)throw new TypeError('Elige al menos dos días para planificar el proyecto con los niños y desarrollar su recorrido.');
 if(project?.activities.some(a=>dates.includes(a.occurs_on)))throw new VersionConflictError('Estos días ya tienen actividades. Conservamos lo preparado.');
 const projectConversation=await documentProjectConversationSnapshot(db,teacherId,input,{includeFullConversation:!project});
 const competencyIds=[...new Set(row.opportunities.map(o=>o.competency_id))];
 if(competencyIds.length<2)throw new TypeError('El proyecto necesita dos competencias. Revisa Mi año con Ayni.');
 const preparationId=uuid(curriculumHash({teacherId,planId:plan.id,revision:plan.revision,slot:slot.slot_id,dates,mode}));
 const job=await enqueueMultiAgeGeneration(db,teacherId,{kind:'activity',classroomId:input.classroomId,annualPlanId:plan.id,annualSlotId:slot.slot_id,occursOn:dates[0],competencyIds,activityPosition:project?.nextPosition??1,...(project?{projectId:project.id,expectedProjectFingerprint:project.fingerprint}:{})},
  {mode,documentPreparation:{root:true,preparationId,dates,projectConversation,...(!project?{planningVersion:4}:{})}});
 return readDocumentGeneratorProjectPreparation(db,teacherId,{classroomId:input.classroomId,annualPlanId:plan.id,annualSlotId:slot.slot_id}).then(value=>({...value,id:job.id}));
}
/** A single accepted preparation advances on the server even if the browser closes. No automatic retries. */
export async function advanceDocumentGeneratorProjects(db,{mode='off'}={}){
 if(!['fixture','openai'].includes(mode))return;
 const accepted=(await db.query(`select j.* from multi_age_generation_jobs j where provider_mode=$1 and input->'documentPreparation'->>'root'='true' and status in ('ready','stale') and error_code is distinct from 'document_project_sources_changed'
 and not exists(select 1 from multi_age_requests r where r.teacher_id=j.teacher_id and r.client_request_id=(j.input->'documentPreparation'->>'preparationId')::uuid and r.kind='document_project_complete') order by created_at limit 30`,[mode])).rows;
 for(const root of accepted){
  try{
   let s=await snapshot(db,root.teacher_id,root);
   const applied=s.w.activities.some(a=>a.details.generation_job_id===s.last.id);
   if(s.complete){await completeReceipt(db,s);continue;}
   if(['queued','running','failed','interrupted'].includes(s.last.status)||s.last.status==='stale'&&!applied)continue;
   if(!applied){
    const last=await loadMultiAgeGeneration(db,root.teacher_id,s.last.id);
    if(last.status!=='ready')throw new VersionConflictError();
    const {documentPreparation,...input}=s.last.input;void documentPreparation;
    const common={...input,clientRequestId:s.last.id,teacherConfirmed:true,expectedRevision:s.w.classroom.curriculum_revision,generationJobId:s.last.id};
    if(s.last.kind==='activity_batch')await confirmMultiAgeActivityBatch(db,root.teacher_id,{...common,proposals:last.result.proposals});
    else await confirmMultiAgeActivity(db,root.teacher_id,{...common,blueprint:last.result.proposal});
    s=await snapshot(db,root.teacher_id,root);
   }
   if(s.complete){await completeReceipt(db,s);continue;}
   const remaining=s.dates.filter(d=>!s.activities.some(a=>a.occurs_on===d)),batch=remaining.slice(0,5),p=s.project;
   if(!p)throw new VersionConflictError();
   await enqueueMultiAgeGeneration(db,root.teacher_id,{kind:batch.length>=2?'activity_batch':'activity',classroomId:root.classroom_id,annualPlanId:root.input.annualPlanId,annualSlotId:root.input.annualSlotId,competencyIds:root.input.competencyIds,projectId:p.id,expectedProjectFingerprint:p.fingerprint,activityPosition:p.nextPosition,...(batch.length>=2?{activityDates:batch}:{occursOn:batch[0]})},
    {mode,documentPreparation:{root:false,preparationId:root.input.documentPreparation.preparationId,dates:root.input.documentPreparation.dates,...(root.input.documentPreparation.planningVersion?{planningVersion:root.input.documentPreparation.planningVersion}:{}),...(root.input.documentPreparation.projectConversation?{projectConversation:root.input.documentPreparation.projectConversation}:{})}});
  }catch(error){
   if(error instanceof TypeError||error instanceof VersionConflictError||error instanceof CurriculumPermissionError)await db.query("update multi_age_generation_jobs set error_code='document_project_sources_changed' where id=$1",[root.id]);
   else throw error;
  }
 }
}
async function completeReceipt(db,s){
 return curriculumRequest(db,s.root.teacher_id,s.root.input.documentPreparation.preparationId,'document_project_complete',{classroomId:s.root.classroom_id,rootId:s.root.id},async()=>({classroomId:s.root.classroom_id,projectId:s.project.id,activityIds:s.activities.map(a=>a.id)}));
}
export async function retryDocumentGeneratorProjectPreparation(db,teacherId,input,options){
 await scope(db,teacherId,input.classroomId);
 const root=(await roots(db,teacherId,input.classroomId)).find(r=>r.id===input.preparationId);if(!root)throw new CurriculumPermissionError();
 const s=await snapshot(db,teacherId,root);
 if(s.last.status==='interrupted'&&input.acceptPotentialRepeat!==true)throw new TypeError('Confirma el posible consumo del intento interrumpido.');
 if(root.error_code==='document_project_sources_changed')throw new VersionConflictError('Revisa Mi año; sus fuentes cambiaron.');
 await retryMultiAgeGeneration(db,teacherId,s.last.id,options);return publicState(await snapshot(db,teacherId,root));
}
