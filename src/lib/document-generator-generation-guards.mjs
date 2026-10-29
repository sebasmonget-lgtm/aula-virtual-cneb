import {officialPerformances} from './official-performance-references.mjs';
import {DOCUMENT_PROJECT_PLANNING_V3_SCHEMA,DOCUMENT_PROJECT_PLANNING_V4_SCHEMA} from './document-generator-project-planning.mjs';
import {firstProjectActivityCompetencies} from './document-generator-project-route.mjs';

const copy=value=>structuredClone(value);
/** The annual is a forecast; a fresh master selects its own official references.
 * Keep the saved source intact and leave the complete age catalog in curriculum. */
export function documentProjectAnnualIntentContext(annualContext){
 const result=copy(annualContext);
 if(result?.project_schedule?.planning_version!==4||!Array.isArray(result.proposal?.opportunities))return result;
 result.proposal.opportunities=result.proposal.opportunities.map(opportunity=>Object.fromEntries(Object.entries(opportunity).filter(([key])=>key!=='official_performance_refs')));
 result.annual_reference_policy='Las oportunidades del anual orientan la intención. Para el maestro selecciona referentes propios desde official_performance_catalog por competencia y edad, según su recorrido completo; no heredes una selección provisional del anual.';
 return result;
}
export function documentPerformanceReferenceSchema(competencyId,age){
 const ids=officialPerformances(competencyId,age).map(row=>row.id);
 return {type:'array',minItems:ids.length?1:0,maxItems:Math.min(3,ids.length),items:{type:'string',...(ids.length?{enum:ids}:{})}};
}
const referenceSchema=documentPerformanceReferenceSchema;

/** Wire identities are object keys: array anyOf cannot enforce one row per age/id. */
export function documentKeyedCriteriaSchema(base,definitions){
 const properties=Object.fromEntries(definitions.map(({id,ages,references=age=>referenceSchema(id,age)})=>{
  const family=copy(base.items),variant=family.properties.variants.items;
  const variants=Object.fromEntries(ages.map(age=>{const own=copy(variant);own.properties.curricular_age={type:'integer',enum:[age]};own.properties.official_performance_refs=references(age);return [String(age),own];}));
  family.properties.competency_id={type:'string',enum:[id]};
  family.properties.variants={type:'object',additionalProperties:false,required:Object.keys(variants),properties:variants};
  return [id,family];
 }));
 return {type:'object',additionalProperties:false,required:Object.keys(properties),properties};
}

/** Translate only the private wire shape; never merge duplicates or infer missing IDs. */
export function documentCriteriaFromWire(value){
 const result=copy(value);
 for(const field of ['criteriaFamilies','projectCriteriaFamilies']){
  const families=result?.[field];if(!families||Array.isArray(families))continue;
  result[field]=Object.entries(families).map(([id,family])=>{
   if(family.competency_id!==id||!family.variants||Array.isArray(family.variants))throw new TypeError('La competencia y sus edades deben conservar sus identidades del esquema.');
   return {...family,variants:Object.entries(family.variants).map(([age,variant])=>{if(String(variant.curricular_age)!==age)throw new TypeError('La variante debe conservar la edad recibida.');return variant;})};
  });
 }
 return result;
}

/** The official, versioned catalog is the authority before and after generation. */
export function documentAnnualSchemaForContext(schema,data,{slotId}={}){
 const result=copy(schema),row=result.properties.proposals?.items??result.properties.replacement;
 result.id+='-protected-v26';result.$defs??={};
 function opportunities(base,name){
  result.$defs[name]={anyOf:data.eligible.flatMap(group=>group.cards.map(card=>({...copy(base),properties:{...copy(base.properties),
   age:{type:'integer',enum:[group.age]},competency_id:{type:'string',enum:[card.id]},official_performance_refs:referenceSchema(card.id,group.age)
  }})))};
  return {$ref:`#/$defs/${name}`};
 }
 row.properties.slot_id={type:'string',enum:slotId?[slotId]:data.calendar.projects.map(slot=>slot.slot_id)};
 row.properties.opportunities.items=opportunities(row.properties.opportunities.items,'project_opportunity');
 row.properties.opportunities.minItems=Math.max(row.properties.opportunities.minItems,2*data.eligible.length);
 if(result.properties.everyday_opportunities)result.properties.everyday_opportunities.items=opportunities(result.properties.everyday_opportunities.items,'everyday_opportunity');
 return result;
}

/** Reorder known, unique slots only. Missing or foreign identities remain validation failures. */
export function orderGeneratedAnnualSlots(value,calendar){
 if(!Array.isArray(value?.proposals)||value.proposals.length!==calendar.projects.length)return value;
 const rows=new Map(value.proposals.map(row=>[row?.slot_id,row]));
 if(rows.size!==calendar.projects.length||calendar.projects.some(slot=>!rows.has(slot.slot_id)))return value;
 return {...value,proposals:calendar.projects.map(slot=>rows.get(slot.slot_id))};
}

function familySchema(base,competencyIds,ages,annualContext,{references=true}={}){
 return {...copy(base),maxItems:competencyIds.length,items:{anyOf:competencyIds.map(id=>{
  const known=annualContext?.proposal?.opportunities?.filter(o=>o.competency_id===id).map(o=>o.age);
  const participants=known?.length?ages.filter(age=>known.includes(age)):ages;
  const family=copy(base.items),variant=family.properties.variants.items;
  return {...family,properties:{competency_id:{type:'string',enum:[id]},variants:{type:'array',minItems:participants.length,maxItems:participants.length,items:{anyOf:participants.map(age=>{
   const own=copy(variant);own.properties.curricular_age={type:'integer',enum:[age]};
   if(references)own.properties.official_performance_refs=referenceSchema(id,age);
   else {delete own.properties.official_performance_refs;own.required=own.required.filter(key=>key!=='official_performance_refs');}
   return own;
  })}}}};
 })}};
}

/** First-day references are server-owned metadata, generated once in the project master. */
export function documentProjectSchemaForContext(schema,{ages,competencyIds,occursOn,annualContext,dailyDates,planningVersion=3,independentActivityReferences=false}){
 const result=copy(schema);result.id+=dailyDates?(planningVersion===4?'-protected-v30':'-protected-v27'):'-protected-v26';
 if(dailyDates){
  result.properties.projectPlanning=copy(planningVersion===4?DOCUMENT_PROJECT_PLANNING_V4_SCHEMA:DOCUMENT_PROJECT_PLANNING_V3_SCHEMA);
  const route=result.properties.projectPlanning.properties.dailyRoute,entry=route.items;
  if(planningVersion===4){delete entry.properties.startingPoint;entry.required=entry.required.filter(key=>key!=='startingPoint');}
  route.minItems=route.maxItems=dailyDates.length;
  route.items={anyOf:dailyDates.map((date,i)=>({...copy(entry),properties:{...copy(entry.properties),position:{type:'integer',enum:[i+1]},occursOn:{type:'string',enum:[date]},
   ...(i===0?{title:{type:'string',enum:['Planificamos el proyecto con los niños']},stage:{type:'string',enum:['planning']}}:i===dailyDates.length-1?{stage:{type:'string',enum:['review']}}:{stage:{type:'string',enum:['explore','investigate','create_or_try','communicate']}}),
   competencyIds:{type:'array',minItems:1,maxItems:i===0?1:Math.min(3,competencyIds.length),items:{type:'string',enum:i===0?firstProjectActivityCompetencies(competencyIds):[...competencyIds]}},
   ...(planningVersion===4?{previousActivityPosition:{type:'integer',enum:[i]}}:{})
  }}))};
 }
 result.properties.projectCriteriaFamilies=familySchema(result.properties.projectCriteriaFamilies,competencyIds,ages,annualContext);
 result.properties.projectCriteriaFamilies.minItems=competencyIds.length;
 result.properties.criteriaFamilies=familySchema(result.properties.criteriaFamilies,dailyDates?firstProjectActivityCompetencies(competencyIds):competencyIds,ages,annualContext,{references:independentActivityReferences});
 if(independentActivityReferences){
  result.id+='-keyed-v35';
  const definition=id=>{const known=annualContext?.proposal?.opportunities?.filter(o=>o.competency_id===id).map(o=>o.age);return {id,ages:known?.length?ages.filter(age=>known.includes(age)):ages};};
  result.properties.projectCriteriaFamilies=documentKeyedCriteriaSchema(schema.properties.projectCriteriaFamilies,competencyIds.map(definition));
  result.properties.criteriaFamilies=documentKeyedCriteriaSchema(schema.properties.criteriaFamilies,(dailyDates?firstProjectActivityCompetencies(competencyIds):competencyIds).map(definition));
 }
 result.properties.title={type:'string',enum:['Planificamos el proyecto con los niños']};
 result.properties.occursOn={type:'string',enum:[occursOn]};
 result.properties.participantAges={type:'array',minItems:ages.length,maxItems:ages.length,items:{type:'integer',enum:[...ages]}};
 return result;
}

/** Supply only metadata deliberately omitted from the new private output contract.
 * Explicit legacy references are preserved, so an invalid result is never silently repaired. */
export function inheritFirstActivityReferences(activity,master){
 const result=copy(activity);
 for(const family of result.criteriaFamilies??[])for(const variant of family.variants??[]){
  if(Object.hasOwn(variant,'official_performance_refs'))continue;
  const parent=master.find(f=>f.competency_id===family.competency_id)?.variants.find(v=>v.curricular_age===variant.curricular_age);
  if(!parent)throw new TypeError('La actividad necesita una competencia y edad del maestro del proyecto.');
  variant.official_performance_refs=[...parent.official_performance_refs];
 }
 return result;
}
