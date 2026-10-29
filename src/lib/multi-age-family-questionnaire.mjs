import {randomUUID} from 'node:crypto';
import {assertMultiAgeLocalDb} from '../../scripts/multi-age-local-db.mjs';
import {curriculumHash,curriculumRequest,CurriculumPermissionError} from './classroom-curriculum-scope.mjs';
import {studentCurriculumScope} from './student-curriculum-service.mjs';
import {studentCurriculumSnapshot} from './multi-age-diagnostic.mjs';
import {familyInterviewQuestionGroups,interviewInterestOptions,interviewLanguageOptions} from './family-interview-contract.mjs';
import {countFamilyInterviewAnswers,familyInterviewAnswerFieldsFor} from './family-interview-progress.mjs';
import {VersionConflictError} from './version-integrity.mjs';
import {correctionReason} from './multi-age-corrections.mjs';
import {assertPeriodDatesOpen} from './period-edit-guard.mjs';

const questions=familyInterviewQuestionGroups('',3)[0].questions,keys=questions.map(q=>q.key);
export function validateMultiAgeFamilyAnswers(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>![...keys,'interest_tags','language_tags','other_interest_text','other_language_text'].includes(k)))throw new TypeError('Revisa las ocho respuestas del cuestionario familiar.');
 const answers={};
 for(const key of [...keys,'other_interest_text','other_language_text']){const text=value[key]??'';if(typeof text!=='string'||text.length>1500)throw new TypeError('Cada respuesta familiar admite hasta 1500 caracteres.');answers[key]=text.trim();}
 for(const [key,options]of [['interest_tags',interviewInterestOptions],['language_tags',interviewLanguageOptions]]){
  const tags=value[key]??[];if(!Array.isArray(tags)||tags.length>options.length||new Set(tags).size!==tags.length||tags.some(t=>!options.some(o=>o.id===t)))throw new TypeError('Selecciona las opciones familiares disponibles.');answers[key]=[...tags].sort();
 }
 for(const [tags,text]of [['interest_tags','other_interest_text'],['language_tags','other_language_text']])if(answers[text]&&!answers[tags].includes('other'))throw new TypeError('Selecciona Otra u Otro para conservar su texto.');
 return answers;
}
export function multiAgeFamilyQuestionnaireText(answers){
 const lines=questions.filter(q=>answers[q.key]).map(q=>`${q.title}: ${answers[q.key]}`);
 for(const [key,options,label,other]of [['interest_tags',interviewInterestOptions,'Intereses mencionados','other_interest_text'],['language_tags',interviewLanguageOptions,'Lenguas que escucha o usa en casa','other_language_text']]){
  if(answers[key]?.length)lines.push(`${label}: ${answers[key].map(id=>id==='other'&&answers[other]?answers[other]:options.find(o=>o.id===id).label).join(', ')}.`);
 }
 return lines.join('\n')||'La familia no ha proporcionado respuestas. Información pendiente, sin atribuir logros o dificultades.';
}
export async function multiAgeFamilyQuestionnaireWorkspace(db,teacherId,studentId){
 // Also called inside the transaction of the factory-guarded writers below.
 const scope=await studentCurriculumScope(db,teacherId,studentId);if(scope.classroom.contract!==2)throw new CurriculumPermissionError();
 const history=(await db.query('select id,version,status,details,teacher_confirmed_at from student_family_interviews where student_id=$1 and classroom_id=$2 and curriculum_contract_version=2 order by version desc',[studentId,scope.classroom.id])).rows;
 const draft=history.find(r=>r.status==='draft')??null,confirmed=history.find(r=>r.status==='confirmed')??null;
 return {studentId,age:scope.age,assignmentId:scope.assignment.id,history,draft,confirmed,
  draftFingerprint:draft?curriculumHash(draft):null,answered:countFamilyInterviewAnswers(draft?.details??confirmed?.details??{},3),questions};
}
export async function saveMultiAgeFamilyQuestionnaire(db,teacherId,input){
 assertMultiAgeLocalDb(db);const answers=validateMultiAgeFamilyAnswers(input.answers);
 return curriculumRequest(db,teacherId,input.clientRequestId,'family_questionnaire_draft',input,async tx=>{
  const state=await multiAgeFamilyQuestionnaireWorkspace(tx,teacherId,input.studentId),scope=await studentCurriculumScope(tx,teacherId,input.studentId);
  if(input.expectedAssignmentId!==state.assignmentId||(input.expectedDraftId??null)!==(state.draft?.id??null)||(input.expectedDraftFingerprint??null)!==state.draftFingerprint||(input.expectedInterviewId??null)!==(state.confirmed?.id??null))throw new VersionConflictError('La matrícula o la entrevista cambió. Revisa el cuestionario antes de guardar.');
  const id=state.draft?.id??randomUUID(),version=state.draft?.version??Number((await tx.query('select coalesce(max(version),0)+1 n from student_family_interviews where student_id=$1',[input.studentId])).rows[0].n);
  const details={...answers,contract:'multi-age-family-questionnaire-v1',questionnaire_version:3,structured_options_version:2,curriculum_snapshot:studentCurriculumSnapshot(scope),supersedes_id:state.confirmed?.id??null,draft_revision:Number(state.draft?.details.draft_revision??0)+1};
  if(state.draft)await tx.query('update student_family_interviews set details=$2::jsonb,updated_at=now() where id=$1',[id,JSON.stringify(details)]);
  else await tx.query(`insert into student_family_interviews(id,classroom_id,student_id,version,status,details,created_by,curriculum_contract_version) values($1,$2,$3,$4,'draft',$5::jsonb,$6,2)`,[id,scope.classroom.id,input.studentId,version,JSON.stringify(details),teacherId]);
  return {classroomId:scope.classroom.id,studentId:input.studentId,interviewId:id,version};
 });
}
export async function confirmMultiAgeFamilyQuestionnaire(db,teacherId,input){
 assertMultiAgeLocalDb(db);if(input.teacherConfirmed!==true||input.pendingInformationAcknowledged!==true)throw new TypeError('Confirma las respuestas familiares y que lo no respondido queda pendiente.');
 return curriculumRequest(db,teacherId,input.clientRequestId,'family_questionnaire_confirm',input,async tx=>{
  const state=await multiAgeFamilyQuestionnaireWorkspace(tx,teacherId,input.studentId),scope=await studentCurriculumScope(tx,teacherId,input.studentId),draft=state.draft;
  if(!draft||input.expectedAssignmentId!==state.assignmentId||input.expectedDraftId!==draft.id||input.expectedDraftFingerprint!==state.draftFingerprint||(input.expectedInterviewId??null)!==(state.confirmed?.id??null)||draft.details.supersedes_id!==(state.confirmed?.id??null))throw new VersionConflictError('Guarda y revisa el cuestionario vigente antes de confirmarlo.');
  if(draft.details.curriculum_snapshot.assignment_id!==state.assignmentId)throw new VersionConflictError('La edad curricular cambió. Guarda el avance revisado para el grupo actual.');
  const answers=Object.fromEntries([...keys,'interest_tags','language_tags','other_interest_text','other_language_text'].map(k=>[k,draft.details[k]]));validateMultiAgeFamilyAnswers(answers);
  if(state.confirmed)await assertPeriodDatesOpen(tx,scope.classroom.id,scope.student.enrolled_on??scope.classroom.starts_on,scope.classroom.ends_on);
  const pending=keys.filter(k=>!familyInterviewAnswerFieldsFor(3)[k].some(field=>typeof answers[field]==='string'?Boolean(answers[field].trim()):Array.isArray(answers[field])&&answers[field].length));
  const details={...draft.details,family_text:multiAgeFamilyQuestionnaireText(answers),source_kind:'family_report',role:'context_only',pending_question_keys:pending,...(state.confirmed?{correction_reason:correctionReason(input)}:{})};
  await tx.query("update student_family_interviews set status='confirmed',details=$2::jsonb,teacher_confirmed_at=now(),updated_at=now() where id=$1",[draft.id,JSON.stringify(details)]);
  return {classroomId:scope.classroom.id,studentId:input.studentId,interviewId:draft.id,version:draft.version};
 });
}
