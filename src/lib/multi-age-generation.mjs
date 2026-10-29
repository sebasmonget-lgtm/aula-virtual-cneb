import {DOCUMENT_GENERATOR_IDENTITY_RULES} from './document-generator-prompts.mjs';
import {DOCUMENT_GENERATOR_REFERENCE_SELECTION_RULES} from './document-generator-prompts.mjs';
import {documentSpanishProseSchema} from './document-generator-spanish-schema.mjs';
import {validateActivityAgainstProjectRoute,projectRouteDay,inheritProjectSequenceLinks} from './document-generator-project-route.mjs';
import {documentProjectSchemaForContext,inheritFirstActivityReferences,documentProjectAnnualIntentContext,documentCriteriaFromWire} from './document-generator-generation-guards.mjs';
import { isDocumentGenerator } from './ayni-product-mode.mjs';
import { DOCUMENT_GENERATOR_PROJECT_RULES, DOCUMENT_GENERATOR_DAILY_ROUTE_RULES, DOCUMENT_GENERATOR_PROMPT_VERSION, DOCUMENT_GENERATOR_PROJECT_PROMPT_VERSION } from './document-generator-prompts.mjs';
import { assertMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { classroomCurriculumScope } from './classroom-curriculum-scope.mjs';
import { multiAgePlanningContext, validateMultiAgeBlueprint, MULTI_AGE_PLANNING_INSTRUCTIONS, MULTI_AGE_PROMPT_VERSION } from './age-scoped-criteria.mjs';
import {resolveDocumentGeneratorExecutionPlan} from './document-generator-ai-routing.mjs';
import {adultCenteredSituation} from './ayni-planning-policy.mjs';
import { buildProviderRequest } from './ai-generation-v4.mjs';
import {documentActivitySchemaForProject} from './document-generator-activity-schema.mjs';
import {DOCUMENT_PROJECT_PLANNING_SCHEMA,DOCUMENT_ACTIVITY_PLANNING_SCHEMA,validateDocumentProjectPlanning,validateDocumentActivityPlanning,documentProjectLastActivityDate,composeDocumentActivityGuide} from './document-generator-project-planning.mjs';

const text={type:'string',minLength:1,maxLength:1000};
const object=properties=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const ages={type:'array',minItems:1,maxItems:3,items:{type:'integer',enum:[3,4,5]}};
export const MULTI_AGE_BLUEPRINT_SCHEMA={id:'multi-age-blueprint-local-v1',...object({
  title:{...text,maxLength:180},purpose:text,occursOn:{type:'string'},participantAges:ages,
  commonSequence:object({opening:{...text,maxLength:2400},development:{...text,maxLength:2400},closure:{...text,maxLength:2400}}),
  criteriaFamilies:{type:'array',minItems:1,maxItems:6,items:object({competency_id:text,variants:{type:'array',minItems:1,maxItems:3,items:object({
    curricular_age:{type:'integer',enum:[3,4,5]},criterion_text:text,expected_evidence:text,
    observation_moments:{type:'array',minItems:1,maxItems:3,items:{type:'string',enum:['opening','development','closure']}},
    official_performance_refs:{type:'array',maxItems:3,items:{type:'string'}}
  })}})}
})};
export const DOCUMENT_GENERATOR_ACTIVITY_SCHEMA={...MULTI_AGE_BLUEPRINT_SCHEMA,id:'ayni-documents-activity-v12',required:[...MULTI_AGE_BLUEPRINT_SCHEMA.required,'activityPlanning'],properties:{...MULTI_AGE_BLUEPRINT_SCHEMA.properties,
 commonSequence:object({opening:{...text,maxLength:2039},development:{...text,maxLength:2400},closure:{...text,maxLength:1939}}),
 activityPlanning:DOCUMENT_ACTIVITY_PLANNING_SCHEMA}};
export const DOCUMENT_GENERATOR_PROJECT_SCHEMA={...DOCUMENT_GENERATOR_ACTIVITY_SCHEMA,id:'ayni-documents-project-and-first-activity-v20',
 required:[...DOCUMENT_GENERATOR_ACTIVITY_SCHEMA.required,'projectPlanning','projectCriteriaFamilies'],properties:{...DOCUMENT_GENERATOR_ACTIVITY_SCHEMA.properties,projectPlanning:DOCUMENT_PROJECT_PLANNING_SCHEMA,projectCriteriaFamilies:MULTI_AGE_BLUEPRINT_SCHEMA.properties.criteriaFamilies}};

/** Injected provider only: no credentials, factory, network defaults, retries or persistence. */
export async function proposeLocalMultiAgeBlueprint(db,teacherId,{classroomId,competencyIds,occursOn,annualContext=null},{provider}={}){
  assertMultiAgeLocalDb(db);
  if(!provider||typeof provider.generate!=='function')throw new Error('La propuesta local requiere un proveedor de prueba explícito.');
  if(!Array.isArray(competencyIds)||!competencyIds.length||competencyIds.length>6||new Set(competencyIds).size!==competencyIds.length)throw new TypeError('Selecciona competencias distintas.');
  const scope=await classroomCurriculumScope(db,teacherId,classroomId);
  if(scope.contract!==2)throw new Error('La propuesta requiere contrato curricular 2.');
  const context=await multiAgePlanningContext(scope,competencyIds);
  const documentsOnly=await isDocumentGenerator(db,teacherId);
  const workflow=annualContext?.confirmed_project?'activity':'project_master';
  const projectPlanningRequired=documentsOnly&&Boolean(annualContext)&&workflow==='project_master';
  const plan=resolveDocumentGeneratorExecutionPlan({workflow,documentsOnly});
  const activityPlanningRequired=documentsOnly&&Boolean(annualContext);
  const dailyDates=projectPlanningRequired&&[3,4].includes(annualContext?.project_schedule?.planning_version)?annualContext.project_schedule.selected_dates:undefined;
  const scheduled=projectRouteDay(annualContext?.confirmed_project?.document_planning,occursOn);
  const generationAnnualContext=projectPlanningRequired?documentProjectAnnualIntentContext(annualContext):annualContext;
  const outputSchema=projectPlanningRequired?documentProjectSchemaForContext(DOCUMENT_GENERATOR_PROJECT_SCHEMA,{ages:scope.ages,competencyIds,occursOn,annualContext,dailyDates,planningVersion:annualContext?.project_schedule?.planning_version,independentActivityReferences:true}):activityPlanningRequired?documentActivitySchemaForProject(DOCUMENT_GENERATOR_ACTIVITY_SCHEMA,annualContext,{competencyIds,dates:[occursOn],ages:scope.ages}):MULTI_AGE_BLUEPRINT_SCHEMA;
  const request=buildProviderRequest(workflow,{...context,...(documentsOnly?{document_generation_mode:true}:{}),...(annualContext?{confirmed_annual_position:generationAnnualContext}:{}),task:{occurs_on:occursOn,participant_age_groups:scope.ages,confirmed_competency_ids:competencyIds,...(activityPlanningRequired?{activity_competency_policy:'relevant_subset',...(scheduled?{project_daily_plan:scheduled}:{})}:{})}},plan,documentsOnly?documentSpanishProseSchema(outputSchema):outputSchema,documentsOnly?`${MULTI_AGE_PLANNING_INSTRUCTIONS.replace('hereda exactamente sus referentes por competencia y edad','conserva las competencias y edades autorizadas y aplica la política de selección de referentes recibida')}\n${DOCUMENT_GENERATOR_PROJECT_RULES}\n${DOCUMENT_GENERATOR_DAILY_ROUTE_RULES}\n${DOCUMENT_GENERATOR_REFERENCE_SELECTION_RULES}\n${DOCUMENT_GENERATOR_IDENTITY_RULES}${projectPlanningRequired?' En esta respuesta selecciona official_performance_refs para projectCriteriaFamilies por el recorrido completo y para criteriaFamilies por lo que harán al planificar el primer día. Las selecciones pueden ser diferentes dentro de la misma competencia y edad del catálogo oficial.':''}`:MULTI_AGE_PLANNING_INSTRUCTIONS);
  const response=await provider.generate(request),output=response?.output??response;
  let raw=typeof output==='string'?JSON.parse(output):output,projectPlanning,activityPlanning,projectCriteriaFamilies;
  if(documentsOnly)raw=documentCriteriaFromWire(raw);
  if(projectPlanningRequired){const {projectPlanning:planning,projectCriteriaFamilies:families,...firstActivity}=raw??{};let activity=firstActivity;projectPlanning=validateDocumentProjectPlanning(inheritProjectSequenceLinks(planning),{complete:true,ages:scope.ages,...(dailyDates?{dates:dailyDates,competencyIds,dailyRouteRequired:true}:{})});
    if(adultCenteredSituation(projectPlanning.meaningfulSituation)||/\b(?:la profesora|la docente)\s+(?:señala|indica|dice|cuenta|reporta|menciona)\b/iu.test(projectPlanning.meaningfulSituation))throw new TypeError('La situación significativa debe describir a los niños y su aula, sin atribuciones al chat.');
    const {activityPlanning:annotation,...base}=activity;void annotation;
    projectCriteriaFamilies=(await validateMultiAgeBlueprint({...base,criteriaFamilies:families},scope)).criteriaFamilies;
    if(projectCriteriaFamilies.length!==competencyIds.length||projectCriteriaFamilies.some(f=>!competencyIds.includes(f.competency_id)))throw new TypeError('El maestro necesita criterios propios para todas las competencias del proyecto.');
    activity=inheritFirstActivityReferences(activity,projectCriteriaFamilies);
    for(const family of activity.criteriaFamilies??[])for(const variant of family.variants??[]){const parent=projectCriteriaFamilies.find(f=>f.competency_id===family.competency_id)?.variants.find(v=>v.curricular_age===variant.curricular_age);if(!parent)throw new TypeError('El primer día necesita una competencia y edad del maestro.');}
    raw=activity;}
  if(activityPlanningRequired){const {activityPlanning:planning,...activity}=raw??{};activityPlanning=validateDocumentActivityPlanning(planning,scope.ages,{requireCurrent:true,isLastActivity:occursOn===documentProjectLastActivityDate(annualContext)});raw=composeDocumentActivityGuide(activity,activityPlanning);}
  const proposal=await validateMultiAgeBlueprint(raw,scope);
  if([3,4].includes(projectPlanning?.version))validateActivityAgainstProjectRoute(projectPlanning,proposal);
  if(scheduled)validateActivityAgainstProjectRoute(annualContext.confirmed_project.document_planning,proposal);
  if(projectPlanningRequired&&proposal.title!=='Planificamos el proyecto con los niños')throw new TypeError('La primera actividad debe ser Planificamos el proyecto con los niños.');
  if(proposal.occursOn!==occursOn||JSON.stringify(proposal.participantAges)!==JSON.stringify(scope.ages)||proposal.criteriaFamilies.some(f=>!competencyIds.includes(f.competency_id))
    ||!activityPlanningRequired&&competencyIds.some(id=>!proposal.criteriaFamilies.some(f=>f.competency_id===id)))throw new Error('La propuesta cambió fechas, grupos o competencias confirmados.');
  return {proposal,...(projectPlanning?{projectPlanning,projectCriteriaFamilies,documentReferenceSelectionVersion:2}:{}),...(activityPlanning?{activityPlanning}:{}),promptVersion:documentsOnly?(projectPlanning?.version===4||annualContext?.confirmed_project?.document_planning?.version===4?DOCUMENT_GENERATOR_PROJECT_PROMPT_VERSION:dailyDates||scheduled?'ayni-documents-project-v27':DOCUMENT_GENERATOR_PROMPT_VERSION):MULTI_AGE_PROMPT_VERSION,metadata:{routing_policy_version:plan.routing_policy_version,model:plan.model,reasoning_effort:plan.reasoning_effort,
    provider_metadata:response?.provider_metadata??null},teacherConfirmed:false};
}
