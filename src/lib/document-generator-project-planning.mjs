import {DOCUMENT_PROJECT_DAILY_ROUTE_SCHEMA,DOCUMENT_PROJECT_SEQUENTIAL_ROUTE_SCHEMA,validateDocumentProjectRoute} from './document-generator-project-route.mjs';
const paragraph={type:'string',minLength:1,maxLength:1000};
const object=properties=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const list=(items,min,max)=>({type:'array',minItems:min,maxItems:max,items});
export {AYNI_TRANSVERSAL_APPROACHES as DOCUMENT_TRANSVERSAL_APPROACHES} from './ayni-planning-policy.mjs';
import {AYNI_TRANSVERSAL_APPROACHES as DOCUMENT_TRANSVERSAL_APPROACHES} from './ayni-planning-policy.mjs';
const materials=list(object({name:{...paragraph,maxLength:140},availability:{type:'string',enum:['confirmed','assumed_basic','to_verify']}}),1,6);
const ageSupports=list(object({age:{type:'integer',enum:[3,4,5]},mediation:{...paragraph,maxLength:260},support:{...paragraph,maxLength:220}}),1,3);
export const DOCUMENT_ACTIVITY_PLANNING_V2_SCHEMA=object({version:{type:'integer',enum:[2]},materials,ageSupports,
 childParticipation:{...paragraph,maxLength:360},progression:{...paragraph,maxLength:420}});
export const DOCUMENT_ACTIVITY_PLANNING_SCHEMA=object({...DOCUMENT_ACTIVITY_PLANNING_V2_SCHEMA.properties,version:{type:'integer',enum:[3]},
 organization:{...paragraph,maxLength:360},projectReview:{type:['string','null'],minLength:1,maxLength:460}});
export const DOCUMENT_PROJECT_PLANNING_SCHEMA=object({version:{type:'integer',enum:[2]},meaningfulSituation:{...paragraph,maxLength:1400},
 commonSequence:object({opening:paragraph,development:paragraph,closure:paragraph}),materials,ageSupports,
 transversalApproaches:list(object({name:{type:'string',enum:DOCUMENT_TRANSVERSAL_APPROACHES},attitude:{...paragraph,maxLength:220},teacherAction:{...paragraph,maxLength:260}}),1,2),
 learningJourney:list(object({phase:{...paragraph,maxLength:90},proposal:{...paragraph,maxLength:380},childDecision:{...paragraph,maxLength:220}}),3,5)});
export const DOCUMENT_PROJECT_PLANNING_V3_SCHEMA=object({...DOCUMENT_PROJECT_PLANNING_SCHEMA.properties,version:{type:'integer',enum:[3]},dailyRoute:DOCUMENT_PROJECT_DAILY_ROUTE_SCHEMA});
export const DOCUMENT_PROJECT_PLANNING_V4_SCHEMA=object({...DOCUMENT_PROJECT_PLANNING_SCHEMA.properties,version:{type:'integer',enum:[4]},
 sequence:object({sharedChallenge:{...paragraph,maxLength:260},intendedOutcome:{...paragraph,maxLength:400}}),dailyRoute:DOCUMENT_PROJECT_SEQUENTIAL_ROUTE_SCHEMA});

const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
const text=(v,max)=>typeof v==='string'&&Boolean(v.trim())&&v.length<=max;
function conditions(value,ages){
 if(!Array.isArray(value.materials)||value.materials.length<1||value.materials.length>6||value.materials.some(m=>!exact(m,['name','availability'])||!text(m.name,140)||!['confirmed','assumed_basic','to_verify'].includes(m.availability)))throw new TypeError('Completa los materiales y distingue disponibilidad de verificación.');
 if(!Array.isArray(value.ageSupports)||!value.ageSupports.length||value.ageSupports.length>3||new Set(value.ageSupports.map(s=>s.age)).size!==value.ageSupports.length
  ||value.ageSupports.some(s=>!exact(s,['age','mediation','support'])||![3,4,5].includes(s.age)||!text(s.mediation,260)||!text(s.support,220))
  ||ages&&JSON.stringify(value.ageSupports.map(s=>s.age).sort())!==JSON.stringify([...ages].sort()))throw new TypeError('Cada edad atendida necesita acompañamiento y apoyos concretos.');
}

export function validateDocumentActivityPlanning(value,ages,{requireCurrent=false,isLastActivity}={}){
 const schema=value?.version===3?DOCUMENT_ACTIVITY_PLANNING_SCHEMA:DOCUMENT_ACTIVITY_PLANNING_V2_SCHEMA;
 if(!exact(value,Object.keys(schema.properties))||![2,3].includes(value.version)||requireCurrent&&value.version!==3||!text(value.childParticipation,360)||!text(value.progression,420))throw new TypeError('La actividad necesita participación infantil y continuidad dentro del proyecto.');
 if(value.version===3&&(!text(value.organization,360)||value.projectReview!==null&&!text(value.projectReview,460)
  ||isLastActivity===true&&value.projectReview===null||isLastActivity===false&&value.projectReview!==null))throw new TypeError('Completa la organización y la revisión del proyecto en su último día.');
 conditions(value,ages);return structuredClone(value);
}

export const documentProjectLastActivityDate=context=>context?.project_schedule?.last_activity_date??context?.confirmed_project?.document_planning?.dailyRoute?.at(-1)?.occursOn??context?.project_schedule?.selected_dates?.at(-1);

/** These server-checked fields enter the saved guide once, shared by UI and Word. */
export function composeDocumentActivityGuide(activity,planning){
 if(planning.version!==3)return activity;
 return {...activity,commonSequence:{...activity.commonSequence,
  opening:[planning.organization,activity.commonSequence.opening].join('\n'),
  closure:[planning.projectReview,activity.commonSequence.closure].filter(Boolean).join('\n')}};
}

/** A project-wide forecast is separate from the first day's activity. Never assessment data. */
export function validateDocumentProjectPlanning(value,{complete=false,ages=null,dates,competencyIds,dailyRouteRequired=false}={}){
 const current=[2,3,4].includes(value?.version),schema=value?.version===4?DOCUMENT_PROJECT_PLANNING_V4_SCHEMA:value?.version===3?DOCUMENT_PROJECT_PLANNING_V3_SCHEMA:DOCUMENT_PROJECT_PLANNING_SCHEMA;
 if(!exact(value,current?Object.keys(schema.properties):['meaningfulSituation','commonSequence'])||complete&&!current||dailyRouteRequired&&![3,4].includes(value?.version)||!text(value.meaningfulSituation,1400)
  ||!exact(value.commonSequence,['opening','development','closure'])||Object.values(value.commonSequence).some(v=>!text(v,current?1000:1800)))throw new TypeError('El proyecto necesita situación significativa y un recorrido general completo.');
 if(current){
  conditions(value,ages);
  if(!Array.isArray(value.transversalApproaches)||!value.transversalApproaches.length||value.transversalApproaches.length>2
   ||new Set(value.transversalApproaches.map(a=>a.name)).size!==value.transversalApproaches.length
   ||value.transversalApproaches.some(a=>!exact(a,['name','attitude','teacherAction'])||!DOCUMENT_TRANSVERSAL_APPROACHES.includes(a.name)||!text(a.attitude,220)||!text(a.teacherAction,260)))throw new TypeError('Selecciona enfoques pertinentes con actitudes e intervenciones concretas.');
  if(!Array.isArray(value.learningJourney)||value.learningJourney.length<3||value.learningJourney.length>5
   ||value.learningJourney.some(s=>!exact(s,['phase','proposal','childDecision'])||!text(s.phase,90)||!text(s.proposal,380)||!text(s.childDecision,220)))throw new TypeError('El recorrido necesita una progresión y decisiones infantiles.');
 }
 if(value.version===4&&(!exact(value.sequence,['sharedChallenge','intendedOutcome'])||!text(value.sequence.sharedChallenge,260)||!text(value.sequence.intendedOutcome,400)||value.dailyRoute?.[0]?.startingPoint!==value.sequence.sharedChallenge))throw new TypeError('El maestro necesita un reto compartido y una intención que conecten todo el recorrido.');
 if([3,4].includes(value.version))validateDocumentProjectRoute(value.dailyRoute,{dates,competencyIds,sequential:value.version===4});
 return structuredClone(value);
}
