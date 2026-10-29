import {createHash} from 'node:crypto';
import {classroomCurriculumScope,CurriculumPermissionError} from './classroom-curriculum-scope.mjs';
import {isDocumentGenerator} from './ayni-product-mode.mjs';
import {loadMultiAgeGeneration} from './multi-age-generation-jobs.mjs';
import {saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan} from './multi-age-annual.mjs';
import {VersionConflictError} from './version-integrity.mjs';

const receipt=value=>{const h=createHash('sha256').update(value).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;};

/** Creating a year (or continuing an existing draft) is the document-mode save action. */
export async function useDocumentGeneratorYear(db,teacherId,input){
 const scope=await classroomCurriculumScope(db,teacherId,input.classroomId);
 if(scope.contract!==2||!await isDocumentGenerator(db,teacherId))throw new CurriculumPermissionError();
 if(input.teacherConfirmed!==true)throw new TypeError('Crea Mi año desde el generador.');
 let plans=(await db.query('select * from annual_plans where classroom_id=$1 and curriculum_contract_version=2 order by version desc',[scope.id])).rows;
 let active=plans.find(p=>p.status==='active'),draft=plans.find(p=>p.status==='draft');
 if(input.generationJobId){
  // A lost response/reload must not create another version or call the provider again.
  if(active?.document_context.generation_job_id===input.generationJobId)return {classroomId:scope.id,planId:active.id,revision:Number(active.revision)};
  if(draft?.document_context.generation_job_id!==input.generationJobId){
   const job=await loadMultiAgeGeneration(db,teacherId,input.generationJobId);
   if(job.kind!=='annual'||job.input.classroomId!==scope.id)throw new CurriculumPermissionError();
   if(job.status!=='ready'||!job.result?.output)throw new VersionConflictError('Mi año todavía no está listo o cambió su contexto.');
   await saveMultiAgeAnnualDraft(db,teacherId,{clientRequestId:receipt(`document-year-save:${job.id}`),teacherConfirmed:true,classroomId:scope.id,proposal:job.result.output,sourceFingerprint:job.sourceFingerprint,generationJobId:job.id,
    ...(active?{expectedBasePlanId:active.id,expectedBaseRevision:Number(active.revision)}:{}),...(draft?{planId:draft.id,expectedRevision:Number(draft.revision)}:{})});
   plans=(await db.query('select * from annual_plans where classroom_id=$1 and curriculum_contract_version=2 order by version desc',[scope.id])).rows;
   active=plans.find(p=>p.status==='active');draft=plans.find(p=>p.status==='draft');
  }
 }else{
  if(active?.id===input.planId)return {classroomId:scope.id,planId:active.id,revision:Number(active.revision)};
  if(!draft||draft.id!==input.planId||Number(draft.revision)!==input.expectedRevision)throw new VersionConflictError('Mi año cambió. Vuelve a abrirlo para continuar.');
 }
 if(!draft)throw new VersionConflictError();
 return confirmMultiAgeAnnualPlan(db,teacherId,{clientRequestId:receipt(`document-year-use:${draft.id}:${draft.revision}`),teacherConfirmed:true,classroomId:scope.id,planId:draft.id,expectedRevision:Number(draft.revision),
  ...(active?{reason:'Actualización de Mi año solicitada desde el generador de documentos; se conserva la versión anterior.'}:{})});
}
