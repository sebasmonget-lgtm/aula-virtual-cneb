import {documentAnnualSchemaForContext,orderGeneratedAnnualSlots} from './document-generator-generation-guards.mjs';
import { assertMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { multiAgeDiagnosticContext, validateMultiAgeDiagnosticFindings, MULTI_AGE_DIAGNOSTIC_INSTRUCTIONS, MULTI_AGE_DIAGNOSTIC_PROMPT_VERSION } from './multi-age-diagnostic.mjs';
import { multiAgeAnnualContext, validateMultiAgeAnnualProposal, MULTI_AGE_ANNUAL_PROMPT_VERSION } from './multi-age-annual.mjs';
import {annualPreservation} from './multi-age-planning-history.mjs';
import { resolveAIExecutionPlan } from './ai-execution-router-v4.mjs';
import { buildProviderRequest } from './ai-generation-v4.mjs';
import { VersionConflictError } from './version-integrity.mjs';
import {documentAnnualDistributionBrief,reviewDocumentAnnualDistribution} from './document-generator-annual-distribution.mjs';
import {DOCUMENT_ANNUAL_ORGANIZATION_SCHEMA,validateDocumentAnnualOrganization} from './document-generator-annual-organization.mjs';

const text={type:'string',minLength:1,maxLength:1500};
const object=properties=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const list=(items,minItems,maxItems)=>({type:'array',items,minItems,maxItems});
const finding=object({competency_id:text,observation_ids:list({type:'string'},1,100),teacher_reading:text,planning_priority:{type:'string',enum:['usual','consider','prioritize']}});
export const MULTI_AGE_DIAGNOSTIC_SCHEMA={id:'multi-age-diagnostic-local-v1',...object({findings:list(finding,0,30)})};
const opportunity=object({age:{type:'integer',enum:[3,4,5]},competency_id:text,child_action:text,mediation:text,observation:text,official_performance_refs:list({type:'string'},0,3)});
export const MULTI_AGE_ANNUAL_SCHEMA={id:'multi-age-annual-local-v1',...object({title:{...text,maxLength:180},organization:{...text,maxLength:2400},
  proposals:list(object({slot_id:text,title:{...text,maxLength:180},purpose:text,common_invitation:text,one_teacher_organization:{...text,maxLength:2400},opportunities:list(opportunity,1,18)}),15,15),everyday_opportunities:list(opportunity,0,90)})};
// New documents carry their own editorial fields. Saved legacy proposals remain valid.
export const DOCUMENT_GENERATOR_ANNUAL_SCHEMA={id:'ayni-documents-annual-v12',...object({...MULTI_AGE_ANNUAL_SCHEMA.properties,organization:DOCUMENT_ANNUAL_ORGANIZATION_SCHEMA,
  proposals:list(object({...MULTI_AGE_ANNUAL_SCHEMA.properties.proposals.items.properties,
    purpose:{...text,maxLength:550},summary:{...text,maxLength:240},rationale:{...text,maxLength:1000},one_teacher_organization:{...text,maxLength:600},
    opportunities:list(object({...opportunity.properties,child_action:{...text,maxLength:240},mediation:{...text,maxLength:180},observation:{...text,maxLength:140},supports:{...text,maxLength:160}}),1,18)}),15,15),
  everyday_opportunities:list(object({...opportunity.properties,child_action:{...text,maxLength:240},mediation:{...text,maxLength:180},observation:{...text,maxLength:140}}),0,90)})};
async function generate(provider,workflow,context,schema,instructions,promptVersion){
  if(!provider||typeof provider.generate!=='function')throw new Error('La prueba requiere un proveedor simulado explícito; no existe conexión IA por defecto.');
  const routing=resolveAIExecutionPlan({workflow,task:'generation'}),request=buildProviderRequest(workflow,context,routing,schema,instructions),response=await provider.generate(request),raw=response?.output??response;
  return {output:typeof raw==='string'?JSON.parse(raw):raw,promptVersion,teacherConfirmed:false,metadata:{routing_policy_version:routing.routing_policy_version,model:routing.model,reasoning_effort:routing.reasoning_effort,provider_metadata:response?.provider_metadata??null}};
}
export async function proposeLocalMultiAgeDiagnostic(db,teacherId,studentId,{provider}={}){
  assertMultiAgeLocalDb(db);const data=await multiAgeDiagnosticContext(db,teacherId,studentId);
  const result=await generate(provider,'diagnostic_individual_assist',data.context,MULTI_AGE_DIAGNOSTIC_SCHEMA,MULTI_AGE_DIAGNOSTIC_INSTRUCTIONS,MULTI_AGE_DIAGNOSTIC_PROMPT_VERSION);
  if(!result.output||Object.keys(result.output).length!==1||!Object.hasOwn(result.output,'findings'))throw new TypeError('Contrato diagnóstico inválido.');
  validateMultiAgeDiagnosticFindings(result.output.findings,data.context);return {...result,sourceFingerprint:data.sourceFingerprint};
}
export async function proposeLocalMultiAgeAnnual(db,teacherId,classroomId,{provider}={}){
  assertMultiAgeLocalDb(db);const data=await multiAgeAnnualContext(db,teacherId,classroomId);
  if(!data.diagnosis.ready&&!data.documentsOnly)throw new Error('Revisa las fuentes de cada niño antes de solicitar una propuesta anual.');
  let protectedRows=[],previousPlan=null;
  if(data.documentsOnly){
    const active=(await db.query("select * from annual_plans where classroom_id=$1 and curriculum_contract_version=2 and status='active' order by version desc limit 1",[classroomId])).rows[0];
    if(active){previousPlan=active.proposal;const preservation=await annualPreservation(db,data.diagnosis.classroom,active,active.proposal);protectedRows=active.proposal.proposals.filter(row=>preservation.protectedSlots.some(s=>s.slotId===row.slot_id));}
  }
  const context={...data.context};
  if(data.documentsOnly){delete context.instructions;delete context.source_policy;context.annual_distribution_brief=documentAnnualDistributionBrief(data,previousPlan,protectedRows.map(r=>r.slot_id));}
  const result=await generate(provider,'annual_plan',protectedRows.length?{...context,protected_annual_positions:protectedRows}:context,data.documentsOnly?documentAnnualSchemaForContext(DOCUMENT_GENERATOR_ANNUAL_SCHEMA,data):MULTI_AGE_ANNUAL_SCHEMA,data.context.instructions,data.context.prompt_version);
  if(data.documentsOnly){result.output=orderGeneratedAnnualSlots(result.output,data.calendar);validateDocumentAnnualOrganization(result.output.organization);}
  // Editorial enrichment must never rewrite a slot whose project or period is protected.
  if(protectedRows.length&&Array.isArray(result.output?.proposals))result.output={...result.output,proposals:result.output.proposals.map(row=>structuredClone(protectedRows.find(saved=>saved.slot_id===row.slot_id)??row))};
  validateMultiAgeAnnualProposal(result.output,data);return {...result,sourceFingerprint:data.sourceFingerprint,...(data.documentsOnly?{distributionReview:reviewDocumentAnnualDistribution(result.output,data)}:{})};
}

/** A scoped conversation proposal never edits other positions or writes over a confirmed plan. */
export async function proposeLocalMultiAgeAnnualChange(db,teacherId,{classroomId,planId,expectedRevision,slotId,instruction},{provider}={}){
  assertMultiAgeLocalDb(db);
  if(typeof instruction!=='string'||!instruction.trim()||instruction.length>2000)throw new TypeError('Escribe la indicación docente para esta posición.');
  const data=await multiAgeAnnualContext(db,teacherId,classroomId),plan=(await db.query(`select * from annual_plans where id=$1 and classroom_id=$2 and curriculum_contract_version=2 and status in ('draft','active')`,[planId,classroomId])).rows[0];
  if(!plan||Number(plan.revision)!==Number(expectedRevision)||plan.source_context_fingerprint!==data.sourceFingerprint)throw new VersionConflictError();
  const index=plan.proposal.proposals.findIndex(p=>p.slot_id===slotId);if(index<0)throw new TypeError('Selecciona una posición de este plan.');
  if((await db.query(`select 1 from learning_experiences where annual_plan_id=$1 and details->>'annual_slot_id'=$2 limit 1`,[plan.id,slotId])).rows.length)throw new VersionConflictError('La posición ya tiene un proyecto preparado; conserva ese vínculo antes de reorganizarla.');
  const schema={id:data.documentsOnly?'ayni-documents-slot-change-v11':'multi-age-annual-slot-change-local-v1',...object({replacement:(data.documentsOnly?DOCUMENT_GENERATOR_ANNUAL_SCHEMA:MULTI_AGE_ANNUAL_SCHEMA).properties.proposals.items})};
  const context={contract:'AyniAnnualSlotChange/v2',prompt_version:MULTI_AGE_ANNUAL_PROMPT_VERSION,scope:'annual_slot',participant_age_groups:data.diagnosis.classroom.ages,
    curriculum:data.context.curriculum,eligible_competencies_by_age:data.context.eligible_competencies_by_age,slot:data.calendar.projects[index],proposal:plan.proposal.proposals[index],teacher_instruction:instruction};
  const result=await generate(provider,'annual_journey_repair',context,data.documentsOnly?documentAnnualSchemaForContext(schema,data,{slotId}):schema,`${data.context.instructions} Cambia solamente la posición recibida. Conserva su slot_id. No devuelvas otras posiciones, organización general ni oportunidades cotidianas.`,data.context.prompt_version);
  if(!result.output||Object.keys(result.output).length!==1||!Object.hasOwn(result.output,'replacement')||result.output.replacement?.slot_id!==slotId)throw new TypeError('El cambio excede la posición autorizada.');
  const proposal=structuredClone(plan.proposal);proposal.proposals[index]=result.output.replacement;validateMultiAgeAnnualProposal(proposal,data);
  return {...result,proposal,planId:plan.id,expectedRevision:Number(plan.revision),sourceFingerprint:data.sourceFingerprint};
}
