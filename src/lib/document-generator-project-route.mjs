const text=maxLength=>({type:'string',minLength:1,maxLength});
const fields={position:{type:'integer',minimum:1,maximum:30},occursOn:{type:'string'},title:text(110),purpose:text(220),
 stage:{type:'string',enum:['planning','explore','investigate','create_or_try','communicate','review']},mainAction:text(320),
 evidenceFocus:text(200),childDecision:text(180),competencyIds:{type:'array',minItems:1,maxItems:3,items:{type:'string'}}};
export const DOCUMENT_PROJECT_DAILY_ROUTE_SCHEMA={type:'array',minItems:1,maxItems:30,items:{type:'object',additionalProperties:false,required:Object.keys(fields),properties:fields}};
const sentence=maxLength=>({...text(maxLength),pattern:'[.!?][»”"\u0027)]*$'});
const sequentialFields={...fields,mainAction:sentence(420),previousActivityPosition:{type:'integer',minimum:0,maximum:29},
 startingPoint:text(260),expectedContribution:sentence(240),newChallenge:sentence(260)};
export const DOCUMENT_PROJECT_SEQUENTIAL_ROUTE_SCHEMA={type:'array',minItems:2,maxItems:30,items:{type:'object',additionalProperties:false,required:Object.keys(sequentialFields),properties:sequentialFields}};
/** The previous contribution is linked once on the server, never copied twice by AI. */
export function inheritProjectSequenceLinks(planning){
 const result=structuredClone(planning);if(result?.version!==4||!Array.isArray(result.dailyRoute))return result;
 for(const [i,day]of result.dailyRoute.entries())if(day&& !Object.hasOwn(day,'startingPoint'))day.startingPoint=i===0?result.sequence?.sharedChallenge:result.dailyRoute[i-1]?.expectedContribution;
 return result;
}
const normalized=value=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const firstProjectActivityCompetencies=ids=>[['PS_CONVIVE','COM_ORAL'].find(id=>ids.includes(id))??ids[0]];
export function validateDocumentProjectRoute(route,{dates,competencyIds,sequential=false}={}){
 if(!Array.isArray(route)||!route.length||route.length>30||dates&&route.length!==dates.length)throw new TypeError('El maestro necesita una previsión por cada día elegido.');
 const titles=new Set(),actions=new Set(),covered=new Set(),contributions=new Set(),definition=sequential?sequentialFields:fields;
 for(const [i,day]of route.entries()){
  if(!day||Object.keys(day).length!==Object.keys(definition).length||Object.keys(day).some(k=>!Object.hasOwn(definition,k))||day.position!==i+1||!/^\d{4}-\d{2}-\d{2}$/.test(day.occursOn)||dates&&day.occursOn!==dates[i]
   ||!fields.stage.enum.includes(day.stage)||Object.entries(definition).filter(([,s])=>s.type==='string'&&s.maxLength).some(([key,s])=>typeof day[key]!=='string'||!day[key].trim()||day[key].length>s.maxLength||s.pattern&&!new RegExp(s.pattern,'u').test(day[key].trim()))
   ||!Array.isArray(day.competencyIds)||!day.competencyIds.length||day.competencyIds.length>3||new Set(day.competencyIds).size!==day.competencyIds.length||day.competencyIds.some(id=>typeof id!=='string'||competencyIds&&!competencyIds.includes(id)))throw new TypeError('Revisa fechas, competencias y acciones de la ruta diaria del proyecto.');
  const title=normalized(day.title),action=normalized(day.mainAction);if(titles.has(title)||actions.has(action))throw new TypeError('Cada día necesita una acción y un título propios en el maestro.');
  titles.add(title);actions.add(action);day.competencyIds.forEach(id=>covered.add(id));
  if(sequential){
   if(day.previousActivityPosition!==i||i>0&&day.startingPoint!==route[i-1].expectedContribution)throw new TypeError('Cada actividad debe retomar el aporte previsto de la anterior, sin saltos ni referencias futuras.');
   const contribution=normalized(day.expectedContribution);if(contributions.has(contribution))throw new TypeError('Cada día necesita un avance propio que haga progresar el proyecto.');contributions.add(contribution);
  }
 }
 if(route[0].stage!=='planning'||route[0].title!=='Planificamos el proyecto con los niños'||route.length>1&&route.at(-1).stage!=='review')throw new TypeError('La ruta comienza planificando con los niños y termina revisando el proyecto.');
 if(competencyIds?.some(id=>!covered.has(id)))throw new TypeError('La ruta necesita oportunidades para todas las competencias del proyecto.');
 if(route.length>=4&&(!route.some(d=>['explore','investigate'].includes(d.stage))||!route.some(d=>['create_or_try','communicate'].includes(d.stage))))throw new TypeError('La ruta necesita explorar y probar, crear o comunicar, además de planificar y cerrar.');
 return structuredClone(route);
}
export function projectRouteDay(planning,date){return [3,4].includes(planning?.version)?planning.dailyRoute.find(day=>day.occursOn===date):null;}
export function validateActivityAgainstProjectRoute(planning,activity){
 if(![3,4].includes(planning?.version))return;
 const day=projectRouteDay(planning,activity.occursOn);
 if(!day||activity.title!==day.title||JSON.stringify(activity.criteriaFamilies.map(f=>f.competency_id).sort())!==JSON.stringify([...day.competencyIds].sort()))throw Object.assign(new TypeError('La actividad debe desarrollar el día y las competencias previstos en el maestro.'),{reason:'activity_route_mismatch'});
}
