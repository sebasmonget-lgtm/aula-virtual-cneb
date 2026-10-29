import {classroomCurriculumScope,CurriculumPermissionError} from './classroom-curriculum-scope.mjs';
import {isDocumentGenerator} from './ayni-product-mode.mjs';
import {VersionConflictError} from './version-integrity.mjs';

export const documentProjectConversationKey=(planId,slotId)=>`document-project:${planId}:${slotId}`;
/** A conversation can precede the project. Its scope is an owned active annual slot. */
export async function documentProjectConversationContext(db,teacherId,input){
 const scope=await classroomCurriculumScope(db,teacherId,input.classroomId);
 if(scope.contract!==2||input.projectId||!input.annualPlanId||!input.annualSlotId||!await isDocumentGenerator(db,teacherId))throw new CurriculumPermissionError();
 const plan=(await db.query("select * from annual_plans where id=$1 and classroom_id=$2 and status='active' and curriculum_contract_version=2",[input.annualPlanId,scope.id])).rows[0];
 const proposal=plan?.proposal.proposals.find(p=>p.slot_id===input.annualSlotId),slot=plan?.document_context.calendar.projects.find(s=>s.slot_id===input.annualSlotId);
 if(!proposal||!slot)throw new CurriculumPermissionError();
 const identity=(await db.query('select c.institution_name,c.section,ip.district from classrooms c left join institution_profiles ip on ip.owner_user_id=c.teacher_id where c.id=$1',[scope.id])).rows[0];
 return {scopeKey:documentProjectConversationKey(plan.id,slot.slot_id),planning:{scope:'project',annual_plan_id:plan.id,annual_revision:Number(plan.revision),classroom:{...identity,ages:scope.ages},proposal,calendar:slot}};
}

/** Teacher facts and optional reply references have separate provenance. */
export async function documentProjectConversationSnapshot(db,teacherId,input,{includeReplyContext=false,includeFullConversation=false}={}){
 const {scopeKey,planning}=await documentProjectConversationContext(db,teacherId,input);
 const turns=(await db.query("select id,status,input,result from multi_age_generation_jobs where teacher_id=$1 and classroom_id=$2 and kind='conversation' and input->>'scopeKey'=$3 order by (input->>'turnNumber')::int",[teacherId,input.classroomId,scopeKey])).rows;
 if(turns.some(t=>['queued','running'].includes(t.status)))throw new VersionConflictError('Ayni está respondiendo. Espera su respuesta antes de preparar el proyecto.');
 const revision=Math.max(0,...turns.map(t=>t.input.turnNumber));
 if(input.projectConversationRevision!==undefined&&input.projectConversationRevision!==revision)throw new VersionConflictError('La conversación del proyecto cambió. Recupera sus últimos mensajes.');
 const replyContext=includeReplyContext?turns.flatMap((turn,i)=>{
  const previous=turns[i-1],assistantText=previous?.result?.output?.assistant_text;
  return turn.status==='ready'&&previous?.status==='ready'&&typeof assistantText==='string'&&assistantText.trim()
   ?[{teacherTurnId:turn.id,assistantTurnId:previous.id,sourceKind:'assistant_proposal_for_reply_context',assistantText,teacherReply:turn.input.text}]:[];
 }):null;
 const transcript=includeFullConversation?turns.filter(t=>t.status==='ready').flatMap(turn=>[
  {role:'teacher',sourceKind:'teacher_context',turnId:turn.id,text:turn.input.text},
  ...(typeof turn.result?.output?.assistant_text==='string'&&turn.result.output.assistant_text.trim()
   ?[{role:'assistant',sourceKind:'proposal_not_fact',turnId:turn.id,text:turn.result.output.assistant_text,suggestions:turn.result.output.suggestions??[]}]:[])
 ]):null;
 return {revision,classroom:planning.classroom,messages:turns.filter(t=>t.status==='ready').map(t=>({turnId:t.id,text:t.input.text})),
  ...(includeReplyContext?{replyContext}: {}),...(includeFullConversation?{transcript}: {})};
}
