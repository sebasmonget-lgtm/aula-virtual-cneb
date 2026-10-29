import {documentProjectLastActivityDate} from './document-generator-project-planning.mjs';
import {documentPerformanceReferenceSchema,documentKeyedCriteriaSchema} from './document-generator-generation-guards.mjs';
/** Constrain generation to the saved master; never repair curricular IDs after generation. */
export function documentActivitySchemaForProject(schema,annualContext,{competencyIds,dates,ages,routeBound=true}={}) {
 const route=annualContext?.confirmed_project?.document_planning;
 if(routeBound&&[3,4].includes(route?.version)&&dates?.length){
  const result=structuredClone(schema),activity=schema.properties.proposals?.items??schema;
  const choices=dates.map(date=>{
   const day=route.dailyRoute.find(d=>d.occursOn===date);if(!day)throw new TypeError('Falta ese día en el maestro del proyecto.');
   const own=documentActivitySchemaForProject(activity,annualContext,{competencyIds:day.competencyIds,dates:[date],ages,routeBound:false});
   own.properties.title={type:'string',enum:[day.title]};return own;
  });
  if(result.properties.proposals){result.properties.proposals.minItems=result.properties.proposals.maxItems=dates.length;result.properties.proposals.items={anyOf:choices};return result;}
  return choices[0];
 }
 const families=annualContext?.confirmed_project?.criteria_families?.filter(f=>!competencyIds||competencyIds.includes(f.competency_id));
 if(!families?.length)return schema;
 const result=structuredClone(schema),activity=result.properties.proposals?.items??result;
 if(activity.properties.activityPlanning?.properties.version.enum.includes(3)&&dates?.length===1){activity.properties.activityPlanning.properties.projectReview=dates[0]===documentProjectLastActivityDate(annualContext)?{type:'string',minLength:1,maxLength:460}:{type:'null'};}
 if(dates?.length){activity.properties.occursOn={type:'string',enum:[...dates]};if(result.properties.proposals){result.properties.proposals.minItems=dates.length;result.properties.proposals.maxItems=dates.length;}}
 if(ages?.length)activity.properties.participantAges={type:'array',minItems:ages.length,maxItems:ages.length,items:{type:'integer',enum:[...ages]}};
 const field=activity.properties.criteriaFamilies,base=field.items,variant=base.properties.variants.items;
 if(annualContext.confirmed_project.document_reference_selection_version===2){
  activity.properties.criteriaFamilies=documentKeyedCriteriaSchema(field,families.map(f=>({id:f.competency_id,ages:f.variants.map(v=>v.curricular_age)})));
  return result;
 }
 field.maxItems=families.length;
 field.items={anyOf:families.map(f=>({...structuredClone(base),properties:{
  competency_id:{type:'string',enum:[f.competency_id]},
  variants:{type:'array',minItems:f.variants.length,maxItems:f.variants.length,items:{anyOf:f.variants.map(v=>({...structuredClone(variant),properties:{...structuredClone(variant.properties),
   curricular_age:{type:'integer',enum:[v.curricular_age]},
   official_performance_refs:annualContext.confirmed_project.document_reference_selection_version===2?documentPerformanceReferenceSchema(f.competency_id,v.curricular_age):{type:'array',minItems:v.official_performance_refs.length,maxItems:v.official_performance_refs.length,items:{type:'string',...(v.official_performance_refs.length?{enum:[...v.official_performance_refs]}:{})}}
  }}))}}
 }}))};
 return result;
}
