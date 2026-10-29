import { randomUUID } from 'node:crypto';
import { assertMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { classroomCurriculumScope, curriculumRequest, CurriculumPermissionError } from './classroom-curriculum-scope.mjs';
import { multiAgeProjectContext } from './multi-age-projects.mjs';
import { VersionConflictError } from './version-integrity.mjs';
import { isDocumentGenerator } from './ayni-product-mode.mjs';

export const multiAgeConversationKey=projectId=>projectId?'project:'+projectId:'annual';
export async function multiAgeDecisionContext(db,teacherId,classroomId,projectId=null){
  const row=(await db.query('select * from multi_age_planning_decisions where teacher_id=$1 and classroom_id=$2 and scope_key=$3 order by revision desc limit 1',[teacherId,classroomId,multiAgeConversationKey(projectId)])).rows[0];
  return {revision:row?.revision??0,messages:row?.messages??[]};
}
export async function confirmMultiAgePlanningDecision(db,teacherId,input){
  assertMultiAgeLocalDb(db);
  if(input.teacherConfirmed!==true||!['include','remove'].includes(input.action))throw new TypeError('Confirma expresamente qué indicación quieres usar.');
  return curriculumRequest(db,teacherId,input.clientRequestId,'planning_decision',input,async tx=>{
    const scope=await classroomCurriculumScope(tx,teacherId,input.classroomId);if(scope.contract!==2)throw new CurriculumPermissionError();
    if(input.projectId)await multiAgeProjectContext(tx,teacherId,scope.id,input.projectId);
    const scopeKey=multiAgeConversationKey(input.projectId),old=await multiAgeDecisionContext(tx,teacherId,scope.id,input.projectId);
    if(input.expectedRevision!==old.revision)throw new VersionConflictError();
    const turn=(await tx.query("select * from multi_age_generation_jobs where id=$1 and teacher_id=$2 and classroom_id=$3 and kind='conversation' and input->>'scopeKey'=$4",[input.turnId,teacherId,scope.id,scopeKey])).rows[0];
    if(!turn)throw new CurriculumPermissionError();
    let messages=old.messages.filter(m=>m.turnId!==turn.id);
    if(input.action==='include')messages=[...messages,{turnId:turn.id,text:turn.input.text}];
    await tx.query('insert into multi_age_planning_decisions(id,teacher_id,classroom_id,scope_key,revision,messages) values($1,$2,$3,$4,$5,$6::jsonb)',[randomUUID(),teacherId,scope.id,scopeKey,old.revision+1,JSON.stringify(messages)]);
    return {classroomId:scope.id,revision:old.revision+1};
  });
}

/** Clicking Prepare is the teacher's explicit consent to use her chat answers. */
export async function prepareDocumentGeneratorConversation(db,teacherId,input){
  assertMultiAgeLocalDb(db);
  if(input.teacherConfirmed!==true||!await isDocumentGenerator(db,teacherId))throw new CurriculumPermissionError();
  return curriculumRequest(db,teacherId,input.clientRequestId,'documents_conversation_prepare',input,async tx=>{
    const scope=await classroomCurriculumScope(tx,teacherId,input.classroomId);if(scope.contract!==2)throw new CurriculumPermissionError();
    if(input.projectId)await multiAgeProjectContext(tx,teacherId,scope.id,input.projectId);
    const key=multiAgeConversationKey(input.projectId);
    const turns=(await tx.query("select id,status,input from multi_age_generation_jobs where teacher_id=$1 and classroom_id=$2 and kind='conversation' and input->>'scopeKey'=$3 order by (input->>'turnNumber')::int",[teacherId,scope.id,key])).rows;
    if(turns.some(t=>['queued','running'].includes(t.status)))throw new VersionConflictError('Ayni está respondiendo. Espera su respuesta antes de crear el documento.');
    const history=(await tx.query('select revision,messages from multi_age_planning_decisions where teacher_id=$1 and classroom_id=$2 and scope_key=$3 order by revision',[teacherId,scope.id,key])).rows;
    const old=history.at(-1)??{revision:0,messages:[]},everSelected=new Set(history.flatMap(h=>h.messages.map(m=>m.turnId)));
    // An explicitly removed old indication stays removed. New answers are teacher context,
    // never observations; the prompt distinguishes questions and application commands.
    const additions=turns.filter(t=>t.status==='ready'&&!everSelected.has(t.id)).map(t=>({turnId:t.id,text:t.input.text}));
    if(additions.length)await tx.query('insert into multi_age_planning_decisions(id,teacher_id,classroom_id,scope_key,revision,messages) values($1,$2,$3,$4,$5,$6::jsonb)',[randomUUID(),teacherId,scope.id,key,old.revision+1,JSON.stringify([...old.messages,...additions])]);
    return {classroomId:scope.id,revision:old.revision+(additions.length?1:0)};
  });
}
