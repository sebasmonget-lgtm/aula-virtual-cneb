import {DOCUMENT_GENERATOR_IDENTITY_RULES} from './document-generator-prompts.mjs';
import {DOCUMENT_GENERATOR_REFERENCE_SELECTION_RULES} from './document-generator-prompts.mjs';
import {documentCriteriaFromWire} from './document-generator-generation-guards.mjs';
import {documentSpanishProseSchema} from './document-generator-spanish-schema.mjs';
import {projectRouteDay} from './document-generator-project-route.mjs';
import {isDocumentGenerator} from './ayni-product-mode.mjs';
import {DOCUMENT_GENERATOR_PROJECT_RULES,DOCUMENT_GENERATOR_DAILY_ROUTE_RULES,DOCUMENT_GENERATOR_PROMPT_VERSION,DOCUMENT_GENERATOR_PROJECT_PROMPT_VERSION} from './document-generator-prompts.mjs';
import { assertMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { classroomCurriculumScope, curriculumRequest } from './classroom-curriculum-scope.mjs';
import { multiAgePlanningContext, validateMultiAgeBlueprint, MULTI_AGE_PLANNING_INSTRUCTIONS } from './age-scoped-criteria.mjs';
import { validateMultiAgeAnnualActivity } from './multi-age-annual.mjs';
import { MULTI_AGE_BLUEPRINT_SCHEMA,DOCUMENT_GENERATOR_ACTIVITY_SCHEMA } from './multi-age-generation.mjs';
import {validateDocumentActivityPlanning,documentProjectLastActivityDate,composeDocumentActivityGuide} from './document-generator-project-planning.mjs';
import {resolveDocumentGeneratorExecutionPlan} from './document-generator-ai-routing.mjs';
import { buildProviderRequest } from './ai-generation-v4.mjs';
import {documentActivitySchemaForProject} from './document-generator-activity-schema.mjs';

const blueprintSchema=Object.fromEntries(Object.entries(MULTI_AGE_BLUEPRINT_SCHEMA).filter(([key])=>key!=='id'));
export const MULTI_AGE_BATCH_SCHEMA={id:'multi-age-activity-batch-local-v1',type:'object',additionalProperties:false,required:['proposals'],properties:{proposals:{type:'array',minItems:2,maxItems:5,items:blueprintSchema}}};
export const DOCUMENT_GENERATOR_BATCH_SCHEMA={...MULTI_AGE_BATCH_SCHEMA,id:'ayni-documents-activity-batch-v12',properties:{proposals:{...MULTI_AGE_BATCH_SCHEMA.properties.proposals,items:Object.fromEntries(Object.entries(DOCUMENT_GENERATOR_ACTIVITY_SCHEMA).filter(([key])=>key!=='id'))}}};
export const MULTI_AGE_BATCH_INSTRUCTIONS=`${MULTI_AGE_PLANNING_INSTRUCTIONS}
Prepara un lote de actividades sucesivas del MISMO proyecto confirmado, en el orden y fechas exactos de task.activity_dates. Devuelve proposals, una por fecha. Conserva competencias, grupos y referentes de cada edad del maestro. Cada actividad tiene su propia intención y secuencia: continuidad, variación y profundización sin copiar la actividad anterior ni repetir entre sí títulos o secuencias. La progresión es una oportunidad, nunca presupone logros o que todos participan igual. Usa únicamente materiales disponibles indicados; conserva la organización viable para una profesora y las indicaciones docentes seleccionadas. No asignes a niños mayores el cuidado de los menores. No inventes observaciones, notas ni recursos existentes. Todo es propuesta pendiente de revisión docente.
La variedad debe cambiar la situación o necesidad pedagógica, no solo el título o sustituir torre por camino mientras se repite explorar y compartir. Formula en el desarrollo una invitación o problema concreto que dé sentido a comunicar, agrupar o contar, según las competencias seleccionadas. No presupongas logros de una actividad previa para poder participar en la siguiente.
El propósito, desarrollo y criterio deben permanecer en las competencias y referentes seleccionados. Una construcción puede ser contexto, pero no cambies el objetivo a altura, longitud, formas o desplazamientos si esos referentes no pertenecen a la competencia recibida. En comunicación puedes variar el propósito del intercambio, por ejemplo pedir información o materiales, compartir un relato propuesto o acordar una decisión; no exijas que todos produzcan un relato extenso. En cantidad, plantea una necesidad comprensible para organizar o averiguar cuántos objetos usar; no agregues fichas, numerales escritos ni metas de conteo iguales para todas las edades.
Cada expected_evidence debe describir qué actuación específica de ESA edad en ESA actividad podría registrar la docente, y cómo se vincula con el criterio. No repitas una indicación vacía como anotar literalmente lo que comunica en todas las variantes. Puedes añadir cómo registrar palabras, gestos o acciones, distinguiendo siempre previsión de hecho observado. Conserva los rangos, formas de contar y demandas expresivas de los referentes de cada edad; los máximos curriculares no son cuotas obligatorias. Un criterio puede focalizar una parte pertinente del maestro, sin exigir todos sus aspectos a la vez. Hereda exactamente sus IDs oficiales, sin inventar otros.`;

export function validateMultiAgeBatchDates(input){
  const dates=input.activityDates;
  if(!input.projectId||!Number.isSafeInteger(input.activityPosition)||input.activityPosition<2||!Array.isArray(dates)||dates.length<2||dates.length>5||input.activityPosition+dates.length-1>30
    ||dates.some(d=>typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))||dates.some((d,i)=>i>0&&d<=dates[i-1]))throw new TypeError('Selecciona de 2 a 5 fechas lectivas distintas y ordenadas del proyecto confirmado, hasta la actividad 30.');
  return dates;
}
export async function validateMultiAgeActivityBatch(db,teacherId,input,proposals){
  const dates=validateMultiAgeBatchDates(input),scope=await classroomCurriculumScope(db,teacherId,input.classroomId),documentsOnly=await isDocumentGenerator(db,teacherId);
  if(!Array.isArray(proposals)||proposals.length!==dates.length)throw new TypeError('El lote debe conservar todas las actividades solicitadas.');
  const clean=[],titles=new Set(),sequences=new Set();
  for(const [i,p] of proposals.entries()){
    const b=await validateMultiAgeBlueprint(p,scope);
    if(b.occursOn!==dates[i]||JSON.stringify(b.participantAges)!==JSON.stringify(scope.ages)||b.criteriaFamilies.some(f=>!input.competencyIds.includes(f.competency_id))||!documentsOnly&&input.competencyIds.some(id=>!b.criteriaFamilies.some(f=>f.competency_id===id)))throw new TypeError('El lote cambió fechas, grupos o competencias solicitados.');
    const title=b.title.trim().toLocaleLowerCase('es'),sequence=JSON.stringify(b.commonSequence).toLocaleLowerCase('es');
    if(titles.has(title)||sequences.has(sequence))throw new TypeError('Cada actividad del lote necesita título y secuencia propios.');
    titles.add(title);sequences.add(sequence);
    await validateMultiAgeAnnualActivity(db,teacherId,{...input,activityPosition:input.activityPosition+i,blueprint:b},{projectPositionOffset:i});
    clean.push(b);
  }
  return clean;
}
export async function proposeMultiAgeActivityBatch(db,teacherId,input,annualContext,{provider}){
  const scope=await classroomCurriculumScope(db,teacherId,input.classroomId),context=await multiAgePlanningContext(scope,input.competencyIds);
  const documentsOnly=await isDocumentGenerator(db,teacherId);
  const plan=resolveDocumentGeneratorExecutionPlan({workflow:'activity',documentsOnly});
  const schema=documentsOnly?documentActivitySchemaForProject(DOCUMENT_GENERATOR_BATCH_SCHEMA,annualContext,{competencyIds:input.competencyIds,dates:input.activityDates,ages:scope.ages}):MULTI_AGE_BATCH_SCHEMA;
  const request=buildProviderRequest('activity',{...context,...(documentsOnly?{document_generation_mode:true}:{}),confirmed_annual_position:annualContext,task:{activity_dates:input.activityDates,first_activity_position:input.activityPosition,participant_age_groups:scope.ages,confirmed_competency_ids:input.competencyIds,...(documentsOnly?{activity_competency_policy:'relevant_subset',...([3,4].includes(annualContext?.confirmed_project?.document_planning?.version)?{project_daily_plans:input.activityDates.map(date=>projectRouteDay(annualContext.confirmed_project.document_planning,date))}:{})}:{})}},plan,documentsOnly?documentSpanishProseSchema(schema):schema,documentsOnly?`${MULTI_AGE_BATCH_INSTRUCTIONS.replace('Hereda exactamente sus IDs oficiales, sin inventar otros.','Aplica la política de selección de referentes recibida; nunca inventes IDs.')}\n${DOCUMENT_GENERATOR_PROJECT_RULES}\n${DOCUMENT_GENERATOR_DAILY_ROUTE_RULES}\n${DOCUMENT_GENERATOR_REFERENCE_SELECTION_RULES}\n${DOCUMENT_GENERATOR_IDENTITY_RULES}`:MULTI_AGE_BATCH_INSTRUCTIONS);
  const response=await provider.generate(request),raw=response?.output??response,output=typeof raw==='string'?JSON.parse(raw):raw;
  if(!output||Object.keys(output).length!==1||!Object.hasOwn(output,'proposals'))throw new TypeError('Respuesta de lote fuera del contrato.');
  const activityPlanning=[];
  const rawProposals=documentsOnly&&Array.isArray(output.proposals)?output.proposals.map(value=>{
    const {activityPlanning:planning,...proposal}=documentCriteriaFromWire(value);
    const annotation=validateDocumentActivityPlanning(planning,scope.ages,{requireCurrent:true,isLastActivity:proposal.occursOn===documentProjectLastActivityDate(annualContext)});
    activityPlanning.push({occursOn:proposal.occursOn,planning:annotation});return composeDocumentActivityGuide(proposal,annotation);
  }):output.proposals;
  const proposals=await validateMultiAgeActivityBatch(db,teacherId,input,rawProposals);
  return {proposals,...(documentsOnly?{activityPlanning}:{}),promptVersion:documentsOnly?(annualContext?.confirmed_project?.document_planning?.version===4?DOCUMENT_GENERATOR_PROJECT_PROMPT_VERSION:annualContext?.confirmed_project?.document_planning?.version===3?'ayni-documents-project-v27':DOCUMENT_GENERATOR_PROMPT_VERSION):'multi-age-batch-local-v2',teacherConfirmed:false,metadata:{routing_policy_version:plan.routing_policy_version,model:plan.model,reasoning_effort:plan.reasoning_effort,provider_metadata:response?.provider_metadata??null}};
}
export async function confirmMultiAgeActivityBatch(db,teacherId,input){
  assertMultiAgeLocalDb(db);
  if(input.teacherConfirmed!==true||!input.generationJobId)throw new TypeError('Revisa el lote y confirma sus actividades y criterios por edad.');
  return curriculumRequest(db,teacherId,input.clientRequestId,'activity_batch',input,async tx=>{
    const {assertMultiAgeGenerationUse}=await import('./multi-age-generation-jobs.mjs');
    await assertMultiAgeGenerationUse(tx,teacherId,input.generationJobId,'activity_batch',input);
    const proposals=await validateMultiAgeActivityBatch(tx,teacherId,input,input.proposals);
    const {writeConfirmedMultiAgeActivity}=await import('./multi-age-local-service.mjs');
    const activities=[];
    for(const [i,blueprint] of proposals.entries())activities.push(await writeConfirmedMultiAgeActivity(tx,teacherId,{...input,activityPosition:input.activityPosition+i,blueprint}));
    return {classroomId:input.classroomId,projectId:input.projectId,activities};
  });
}
