import {randomUUID} from 'node:crypto';
import {assertMultiAgeLocalDb} from '../../scripts/multi-age-local-db.mjs';
import {curriculumHash,curriculumRequest,curriculumDocumentIdentity,CurriculumPermissionError} from './classroom-curriculum-scope.mjs';
import {multiAgeDiagnosticWorkspace} from './multi-age-diagnostic.mjs';
import {loadKnowledgeBaseV4} from './knowledge-base-v4.mjs';
import {officialPerformanceContext} from './official-performance-references.mjs';
import {applicableCompetencyCards} from './competency-applicability.mjs';
import {VersionConflictError} from './version-integrity.mjs';
import {correctionReason} from './multi-age-corrections.mjs';
import {assertPeriodDatesOpen} from './period-edit-guard.mjs';

export async function multiAgeGroupDiagnosticWorkspace(db,teacherId,classroomId,diagnosis=null){
 // Also called with the transaction already opened by a factory-guarded writer.
 const data=diagnosis??await multiAgeDiagnosticWorkspace(db,teacherId,classroomId);
 if(data.classroom.id!==classroomId||data.classroom.teacher_id!==teacherId||data.classroom.contract!==2)throw new CurriculumPermissionError();
 const eligibleReadings=data.students.filter(s=>s.current).flatMap(s=>s.review.details.findings.map(f=>({age:s.age,studentId:s.id,studentName:[s.first_name,s.last_name].join(' '),reviewId:s.review.id,reviewVersion:s.review.version,...f})));
 const sourceSnapshot={contract:'multi-age-group-sources-v1',classroom_id:classroomId,school_year_id:data.classroom.school_year_id,ages:data.classroom.ages,
  diagnostic:data.sourceSnapshot,groups:data.groups,eligibleReadings,
  familyContexts:data.students.filter(s=>s.family).map(s=>({studentId:s.id,studentName:[s.first_name,s.last_name].join(' '),age:s.age,interviewId:s.family.id,version:s.family.version,recordedAge:s.family.details.curriculum_snapshot.age,text:s.family.details.family_text,role:'context_only'}))};
 const sourceFingerprint=curriculumHash(sourceSnapshot),history=(await db.query('select * from diagnostic_group_reviews where classroom_id=$1 and curriculum_contract_version=2 order by version desc',[classroomId])).rows;
 const draft=history.find(r=>r.status==='draft')??null,confirmed=history.find(r=>r.status==='confirmed')??null;
 return {classroomId,ages:data.classroom.ages,groups:data.groups,eligibleReadings,sourceSnapshot,sourceFingerprint,ready:data.ready,
  history,draft,confirmed,draftFingerprint:draft?curriculumHash(draft):null,current:Boolean(confirmed&&confirmed.details.source_fingerprint===sourceFingerprint)};
}
export function validateMultiAgeGroupReadings(readings,state){
 if(!Array.isArray(readings)||readings.length>60)throw new TypeError('Revisa las lecturas del grupo por edad.');
 const seen=new Set();
 for(const r of readings){const key=`${r.age}:${r.competency_id}`;
  if(!r||Object.keys(r).some(k=>!['age','competency_id','review_ids','teacher_reading','planning_priority'].includes(k))||seen.has(key)||!state.ages.includes(r.age)
   ||typeof r.teacher_reading!=='string'||!r.teacher_reading.trim()||r.teacher_reading.length>1500||!['usual','consider','prioritize'].includes(r.planning_priority)
   ||!Array.isArray(r.review_ids)||!r.review_ids.length||new Set(r.review_ids).size!==r.review_ids.length
   ||r.review_ids.some(id=>!state.eligibleReadings.some(f=>f.reviewId===id&&f.age===r.age&&f.competency_id===r.competency_id)))throw new TypeError('Cada lectura grupal necesita revisiones vigentes de la misma edad y competencia. La familia no acredita logros.');
  seen.add(key);
 }
 return readings.map(r=>({...r,teacher_reading:r.teacher_reading.trim(),review_ids:[...r.review_ids].sort()}));
}
export async function saveMultiAgeGroupDiagnostic(db,teacherId,input){
 assertMultiAgeLocalDb(db);
 return curriculumRequest(db,teacherId,input.clientRequestId,'group_diagnostic_draft',input,async tx=>{
  const diagnosis=await multiAgeDiagnosticWorkspace(tx,teacherId,input.classroomId),state=await multiAgeGroupDiagnosticWorkspace(tx,teacherId,input.classroomId,diagnosis);
  if(input.sourceFingerprint!==state.sourceFingerprint||(input.expectedDraftId??null)!==(state.draft?.id??null)||(input.expectedDraftFingerprint??null)!==state.draftFingerprint||(input.expectedReviewId??null)!==(state.confirmed?.id??null))throw new VersionConflictError('El grupo o sus fuentes cambió. Revisa el borrador antes de guardarlo.');
  const readings=validateMultiAgeGroupReadings(input.readings,state),organization=input.organization??'';
  if(typeof organization!=='string'||organization.length>2400)throw new TypeError('La organización compartida admite hasta 2400 caracteres.');
  const id=state.draft?.id??randomUUID(),version=state.draft?.version??Number((await tx.query('select coalesce(max(version),0)+1 n from diagnostic_group_reviews where classroom_id=$1',[input.classroomId])).rows[0].n);
  const details={contract:'multi-age-group-diagnostic-v1',curriculum_snapshot:{contract:2,classroom_id:input.classroomId,school_year_id:diagnosis.classroom.school_year_id,ages:state.ages},readings,organization:organization.trim(),
   supersedes_id:state.confirmed?.id??null,source_fingerprint:state.sourceFingerprint,draft_revision:Number(state.draft?.details.draft_revision??0)+1};
  if(state.draft)await tx.query('update diagnostic_group_reviews set details=$2::jsonb,source_snapshot=$3::jsonb,updated_at=now() where id=$1',[id,JSON.stringify(details),JSON.stringify(state.sourceSnapshot)]);
  else await tx.query(`insert into diagnostic_group_reviews(id,classroom_id,version,status,details,source_snapshot,created_by,curriculum_contract_version) values($1,$2,$3,'draft',$4::jsonb,$5::jsonb,$6,2)`,[id,input.classroomId,version,JSON.stringify(details),JSON.stringify(state.sourceSnapshot),teacherId]);
  return {classroomId:input.classroomId,reviewId:id,version};
 });
}
export async function confirmMultiAgeGroupDiagnostic(db,teacherId,input){
 assertMultiAgeLocalDb(db);if(input.teacherConfirmed!==true||input.pendingInformationAcknowledged!==true)throw new TypeError('Confirma la revisión y que la información ausente queda pendiente, sin notas.');
 return curriculumRequest(db,teacherId,input.clientRequestId,'group_diagnostic_confirm',input,async tx=>{
  const diagnosis=await multiAgeDiagnosticWorkspace(tx,teacherId,input.classroomId),state=await multiAgeGroupDiagnosticWorkspace(tx,teacherId,input.classroomId,diagnosis),draft=state.draft;
  if(!draft||!state.ready||input.expectedDraftId!==draft.id||input.expectedDraftFingerprint!==state.draftFingerprint||(input.expectedReviewId??null)!==(state.confirmed?.id??null)||draft.details.supersedes_id!==(state.confirmed?.id??null)||draft.details.source_fingerprint!==state.sourceFingerprint)throw new VersionConflictError('Revisa los diagnósticos individuales y guarda el borrador con las fuentes vigentes antes de confirmar el grupo.');
  validateMultiAgeGroupReadings(draft.details.readings,state);
  if(state.confirmed)await assertPeriodDatesOpen(tx,input.classroomId,diagnosis.classroom.starts_on,diagnosis.classroom.ends_on);
  const kb=await loadKnowledgeBaseV4(),curriculumReference=state.ages.map(age=>{const cards=applicableCompetencyCards(kb.competencyCards,age,{castellanoL2Applicable:diagnosis.classroom.castellano_l2_applicable,religionApplicable:diagnosis.classroom.religion_applicable});return {age,competencies:cards.map(c=>({id:c.id,name:c.official_name,age_reference:c.ages[String(age)]})),official_performance_catalog:officialPerformanceContext(cards.map(c=>c.id),age)};});
  const details={...draft.details,document_identity:await curriculumDocumentIdentity(tx,teacherId,diagnosis.classroom),curriculum_reference:curriculumReference,
   ...(state.confirmed?{correction_reason:correctionReason(input)}:{})};
  await tx.query("update diagnostic_group_reviews set status='confirmed',details=$2::jsonb,teacher_confirmed_at=now(),updated_at=now() where id=$1",[draft.id,JSON.stringify(details)]);
  return {classroomId:input.classroomId,reviewId:draft.id,version:draft.version};
 });
}
