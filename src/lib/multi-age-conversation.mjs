import { isDocumentGenerator } from './ayni-product-mode.mjs';
import { DOCUMENT_GENERATOR_CONVERSATION_RULES, DOCUMENT_GENERATOR_PROJECT_CONVERSATION_RULES, DOCUMENT_GENERATOR_PROJECT_CONVERSATION_VERSION, DOCUMENT_GENERATOR_PROMPT_VERSION, documentGeneratorConversationBrief } from './document-generator-prompts.mjs';
import {documentProjectConversationContext} from './document-generator-project-conversation.mjs';
import { assertMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { classroomCurriculumScope, CurriculumPermissionError } from './classroom-curriculum-scope.mjs';
import { multiAgeStableHash, multiAgeProjectContext } from './multi-age-projects.mjs';
import { multiAgeAnnualContext } from './multi-age-annual.mjs';
import { multiAgeConversationKey, multiAgeDecisionContext } from './multi-age-planning-decisions.mjs';
import { VersionConflictError } from './version-integrity.mjs';
import { resolveAIExecutionPlan } from './ai-execution-router-v4.mjs';
import { buildProviderRequest } from './ai-generation-v4.mjs';

import {DOCUMENT_CONVERSATION_VERSION} from './document-generator-chat-readiness.mjs';

export const MULTI_AGE_CONVERSATION_INSTRUCTIONS=`Conversa en español claro con una profesora que acompaña a los grupos de 3, 4 y 5 años recibidos. Usa solo su contexto autorizado. Distingue actuaciones observadas, relatos familiares, indicaciones docentes y sugerencias tuyas. No inventes materiales disponibles, intereses, dificultades, diagnósticos o notas. No conviertas preguntas, saludos u órdenes de aplicación en hechos pedagógicos. Una orden como guardar, continuar o preparar no significa que ese sea el tema del proyecto. Conserva la parte pedagógica de un mensaje mixto. Ofrece una pregunta o sugerencia breve y viable para una sola profesora, sin encargar a los mayores cuidar a los pequeños. Explica diferencias por edad cuando sea pertinente, sin exigir que todos hagan lo mismo ni comparar niveles entre edades. No afirmes haber cambiado el año, proyecto o actividad: conversar solo orienta. Las indicaciones se incorporan únicamente cuando la docente las confirma, y las propuestas requieren revisión. No uses una respuesta tuya como evidencia de un niño. Devuelve assistant_text y hasta tres suggestions.`;
export const MULTI_AGE_CONVERSATION_SCHEMA={id:'multi-age-conversation-v1',type:'object',additionalProperties:false,required:['assistant_text','suggestions'],properties:{
  assistant_text:{type:'string',minLength:1,maxLength:2400},suggestions:{type:'array',minItems:0,maxItems:3,items:{type:'string',minLength:1,maxLength:180}}}};
export const DOCUMENT_CONVERSATION_SCHEMA={...MULTI_AGE_CONVERSATION_SCHEMA,id:DOCUMENT_CONVERSATION_VERSION,required:['assistant_text','suggestions','ready_to_generate'],properties:{...MULTI_AGE_CONVERSATION_SCHEMA.properties,ready_to_generate:{type:'boolean'}}};
export async function multiAgeConversationSource(db,teacherId,input){
  const scope=await classroomCurriculumScope(db,teacherId,input.classroomId);if(scope.contract!==2)throw new CurriculumPermissionError();
  const slotContext=input.annualPlanId||input.annualSlotId?await documentProjectConversationContext(db,teacherId,input):null;
  const scopeKey=slotContext?.scopeKey??multiAgeConversationKey(input.projectId);
  if(input.scopeKey!==scopeKey)throw new CurriculumPermissionError();
  const turns=(await db.query("select * from multi_age_generation_jobs where teacher_id=$1 and classroom_id=$2 and kind='conversation' and input->>'scopeKey'=$3 order by (input->>'turnNumber')::int",[teacherId,scope.id,scopeKey])).rows;
  if(turns.some(t=>t.input.turnNumber>input.turnNumber))throw new VersionConflictError('Esta respuesta pertenece a un turno anterior. Continúa desde el último mensaje.');
  const previous=turns.filter(t=>t.input.turnNumber<input.turnNumber);
  const documentsOnly=await isDocumentGenerator(db,teacherId);
  let planning;
  if(slotContext){const annual=await multiAgeAnnualContext(db,teacherId,scope.id);planning={...slotContext.planning,annual_context:documentGeneratorConversationBrief(annual)};}
  else if(input.projectId){const p=await multiAgeProjectContext(db,teacherId,scope.id,input.projectId);planning={scope:'project',ages:scope.ages,project:{id:p.project.id,title:p.project.title,purpose:p.project.purpose,criteria_families:p.project.details.criteria_families},activities:p.activities.map(a=>({title:a.title,date:a.occurs_on,position:a.position})),decisions:await multiAgeDecisionContext(db,teacherId,scope.id,input.projectId)};}
  else {const annual=await multiAgeAnnualContext(db,teacherId,scope.id);planning={scope:'annual',context:documentsOnly?documentGeneratorConversationBrief(annual):annual.context,source_fingerprint:annual.sourceFingerprint};}
  const context={contract:'AyniMultiAgeConversation/v1',...(documentsOnly?{document_generation_mode:true,prompt_version:DOCUMENT_GENERATOR_PROMPT_VERSION}:{}),scope:planning.scope,planning,
    messages:previous.flatMap(t=>[{role:'teacher',text:t.input.text},...(t.result?.output?.assistant_text?[{role:'assistant',text:t.result.output.assistant_text,source_kind:'suggestion_not_evidence'}]:[])]),teacher_message:input.text};
  return {documentsOnly,sourceFingerprint:multiAgeStableHash(context),context};
}
export async function proposeMultiAgeConversation(db,teacherId,input,{provider}={}){
  assertMultiAgeLocalDb(db);if(!provider?.generate)throw new TypeError('Selecciona el proveedor de la conversación.');
  const data=await multiAgeConversationSource(db,teacherId,input),workflow=input.projectId||input.annualSlotId?'project_conversation':'annual_journey_conversation',plan=resolveAIExecutionPlan({workflow,task:'generation'});
  const rules=input.annualSlotId?DOCUMENT_GENERATOR_PROJECT_CONVERSATION_RULES:DOCUMENT_GENERATOR_CONVERSATION_RULES;
  const response=await provider.generate(buildProviderRequest(workflow,data.context,plan,data.documentsOnly?DOCUMENT_CONVERSATION_SCHEMA:MULTI_AGE_CONVERSATION_SCHEMA,data.documentsOnly?`${rules} Devuelve assistant_text, suggestions y ready_to_generate. Evalúa TODO el contexto: ready_to_generate=true cuando ya conoces lo necesario según estas reglas, o la docente pide continuar con lo disponible. No exige un número fijo de turnos. Cuando sea true, resume brevemente lo acordado y ofrece el botón ${input.annualSlotId?'Generar proyecto':'Generar Mi año'}; aclara que puede seguir conversando para afinarlo, sin hacer obligatorio cerrar el chat ni iniciar la generación. Mantén true si los siguientes mensajes no dejan una decisión esencial pendiente. Si falta contexto esencial y no pidió continuar, usa false y pregunta una sola cosa útil. No incluyas preguntas de diagnóstico.`:MULTI_AGE_CONVERSATION_INSTRUCTIONS)),value=response?.output??response;
  const output=typeof value==='string'?JSON.parse(value):value;
  if(!output||Object.keys(output).some(k=>!['assistant_text','suggestions',...(data.documentsOnly?['ready_to_generate']:[])].includes(k))||Object.keys(output).length!==(data.documentsOnly?3:2)||(data.documentsOnly&&typeof output.ready_to_generate!=='boolean')||typeof output.assistant_text!=='string'||!output.assistant_text.trim()||output.assistant_text.length>2400||!Array.isArray(output.suggestions)||output.suggestions.length>3||output.suggestions.some(s=>typeof s!=='string'||!s.trim()||s.length>180))throw new TypeError('Respuesta conversacional inválida.');
  return {output,teacherConfirmed:false,promptVersion:data.documentsOnly?(input.annualSlotId?DOCUMENT_GENERATOR_PROJECT_CONVERSATION_VERSION:DOCUMENT_CONVERSATION_VERSION):'multi-age-conversation-v1',metadata:{model:plan.model,routing_policy_version:plan.routing_policy_version,reasoning_effort:plan.reasoning_effort,provider_metadata:response?.provider_metadata??null}};
}
export async function readMultiAgeConversation(db,teacherId,{classroomId,projectId=null,annualPlanId=null,annualSlotId=null}){
  assertMultiAgeLocalDb(db);const scope=await classroomCurriculumScope(db,teacherId,classroomId);if(scope.contract!==2)throw new CurriculumPermissionError();
  if(projectId)await multiAgeProjectContext(db,teacherId,scope.id,projectId);
  const slot=annualPlanId||annualSlotId?await documentProjectConversationContext(db,teacherId,{classroomId,projectId,annualPlanId,annualSlotId}):null;
  const turns=(await db.query("select * from multi_age_generation_jobs where teacher_id=$1 and classroom_id=$2 and kind='conversation' and input->>'scopeKey'=$3 order by (input->>'turnNumber')::int",[teacherId,classroomId,slot?.scopeKey??multiAgeConversationKey(projectId)])).rows;
  return {revision:Math.max(0,...turns.map(t=>t.input.turnNumber)),decisions:slot?{revision:0,messages:[]}:await multiAgeDecisionContext(db,teacherId,classroomId,projectId),turns:turns.map(t=>({id:t.id,teacherText:t.input.text,status:t.status,attempts:t.attempts,providerMode:t.provider_mode,promptVersion:t.result?.promptVersion??null,readyToGenerate:t.result?.output?.ready_to_generate??null,assistantText:t.result?.output?.assistant_text??null,suggestions:t.result?.output?.suggestions??[]}))};
}
