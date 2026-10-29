import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import {validateDocumentProjectRoute,validateActivityAgainstProjectRoute,inheritProjectSequenceLinks} from './document-generator-project-route.mjs';
import {validateDocumentProjectPlanning,DOCUMENT_ACTIVITY_PLANNING_SCHEMA} from './document-generator-project-planning.mjs';
import {documentProjectPlanningFixture,documentProjectPlanningV3Fixture,documentProjectPlanningV4Fixture,documentActivityPlanningFixture} from '../../scripts/fixtures/document-generator-planning.mjs';
import {DOCUMENT_GENERATOR_PROJECT_SCHEMA,DOCUMENT_GENERATOR_ACTIVITY_SCHEMA} from './multi-age-generation.mjs';
import {DOCUMENT_GENERATOR_BATCH_SCHEMA} from './multi-age-activity-batch.mjs';
import {documentProjectSchemaForContext} from './document-generator-generation-guards.mjs';
import {documentActivitySchemaForProject} from './document-generator-activity-schema.mjs';
import {officialPerformances} from './official-performance-references.mjs';

const ages=[3,4,5],ids=['PS_IDENTIDAD','PS_CONVIVE'],dates=['2026-04-13','2026-04-14','2026-04-15','2026-04-16','2026-04-17','2026-04-20','2026-04-21','2026-04-22'];
const planning=()=>documentProjectPlanningV3Fixture(ages,dates,ids);
const master=()=>ids.map(competency_id=>({competency_id,variants:ages.map(curricular_age=>({curricular_age,criterion_text:'Expresa una elección propia durante la propuesta.',expected_evidence:'Una palabra o acción vinculada con su elección.',observation_moments:['development'],official_performance_refs:officialPerformances(competency_id,curricular_age).slice(0,1).map(p=>p.id)}))}));
const compile=schema=>{schema=structuredClone(schema);delete schema.id;return new Ajv().compile(schema);};
const activity=day=>({title:day.title,purpose:day.purpose,occursOn:day.occursOn,participantAges:ages,commonSequence:{opening:'Recuperar una idea.',development:day.mainAction,closure:'Revisar lo que pasó.'},criteriaFamilies:master().filter(f=>day.competencyIds.includes(f.competency_id)),activityPlanning:documentActivityPlanningFixture(ages,{version:3,final:day.occursOn===dates.at(-1)})});

test('indagación puede culminar comunicando sin exigir fabricar un producto',()=>{
 const p=planning();for(const day of p.dailyRoute)if(day.stage==='create_or_try')day.stage='communicate';
 assert.doesNotThrow(()=>validateDocumentProjectRoute(p.dailyRoute,{dates,competencyIds:ids}));
 for(const day of p.dailyRoute)if(day.stage==='communicate')day.stage='investigate';
 assert.throws(()=>validateDocumentProjectRoute(p.dailyRoute,{dates,competencyIds:ids}),/comunicar/);
});

test('maestro V3 contiene todos los días; V2 y fuentes históricas conservan lectura sin backfill',()=>{
 assert.deepEqual(validateDocumentProjectPlanning(planning(),{complete:true,ages,dates,competencyIds:ids,dailyRouteRequired:true}),planning());
 const old=documentProjectPlanningFixture(ages);assert.deepEqual(validateDocumentProjectPlanning(old,{complete:true,ages}),old);
 assert.throws(()=>validateDocumentProjectPlanning(old,{complete:true,ages,dailyRouteRequired:true}));
 const original=JSON.stringify(old);assert.throws(()=>validateDocumentProjectPlanning({...planning(),dailyRoute:[]},{complete:true,ages}));assert.equal(JSON.stringify(old),original);
});

test('ruta rechaza días ausentes o repetidos, cambio de posición, acciones duplicadas y competencias sin oportunidades',()=>{
 for(const mutate of [r=>r.pop(),r=>{r[1].occursOn=dates[0];},r=>{r[2].position=2;},r=>{r[2].title=r[1].title;},r=>{r[2].mainAction=r[1].mainAction;},r=>{r[3].competencyIds=['FUERA_DEL_PROYECTO'];},r=>{for(const d of r)d.competencyIds=['PS_CONVIVE'];},r=>{for(const d of r)if(['create_or_try','communicate'].includes(d.stage))d.stage='investigate';}]){
  const route=planning().dailyRoute;mutate(route);assert.throws(()=>validateDocumentProjectRoute(route,{dates,competencyIds:ids}));
 }
});

test('contrato inicial fija fechas de todo el maestro y una única selección para planificar con los niños',()=>{
 const schema=documentProjectSchemaForContext(DOCUMENT_GENERATOR_PROJECT_SCHEMA,{ages,competencyIds:ids,occursOn:dates[0],dailyDates:dates});
 assert.deepEqual(schema.properties.projectPlanning.properties.version.enum,[3]);assert.equal(schema.properties.projectPlanning.properties.dailyRoute.maxItems,dates.length);
 const first=activity(planning().dailyRoute[0]);for(const f of first.criteriaFamilies)for(const v of f.variants)delete v.official_performance_refs;
 const result={...first,projectPlanning:planning(),projectCriteriaFamilies:master()},valid=compile(schema);assert.equal(valid(result),true,JSON.stringify(valid.errors));
 result.projectPlanning.dailyRoute[0].competencyIds=['PS_IDENTIDAD'];assert.equal(valid(result),false);
});

test('actividad y lote quedan ligados a la acción diaria guardada; cambiar título o foco no pasa ni esquema ni servidor',()=>{
 const p=planning(),context={confirmed_project:{criteria_families:master(),document_planning:p}};
 const one=activity(p.dailyRoute[1]),schema=documentActivitySchemaForProject(DOCUMENT_GENERATOR_ACTIVITY_SCHEMA,context,{competencyIds:ids,dates:[dates[1]],ages}),valid=compile(schema);assert.equal(valid(one),true);
 validateActivityAgainstProjectRoute(p,one);one.title='Otra actividad que no estaba en el maestro';assert.equal(valid(one),false);assert.throws(()=>validateActivityAgainstProjectRoute(p,one),/maestro/);
 const batchSchema=documentActivitySchemaForProject(DOCUMENT_GENERATOR_BATCH_SCHEMA,context,{competencyIds:ids,dates:dates.slice(1,4),ages}),batch={proposals:p.dailyRoute.slice(1,4).map(activity)},batchValid=compile(batchSchema);assert.equal(batchValid(batch),true);
 batch.proposals[0].criteriaFamilies=master();assert.equal(batchValid(batch),false);assert.throws(()=>validateActivityAgainstProjectRoute(p,batch.proposals[0]),/maestro/);
});

test('materiales básicos se prevén sin fingir confirmación docente ni bloquear las restricciones explícitas',()=>{
 const p=documentActivityPlanningFixture(ages,{version:3});p.materials=[{name:'Papel y crayones habituales del aula',availability:'assumed_basic'}];
 const valid=compile(DOCUMENT_ACTIVITY_PLANNING_SCHEMA);assert.equal(valid(p),true);p.materials[0].availability='inventado';assert.equal(valid(p),false);
});

test('la fecha final exige revisión y los días intermedios no la repiten',()=>{
 assert.equal(DOCUMENT_GENERATOR_ACTIVITY_SCHEMA.properties.commonSequence.properties.opening.maxLength+DOCUMENT_ACTIVITY_PLANNING_SCHEMA.properties.organization.maxLength+1,2400,'La organización reservada no puede desbordar el Inicio guardado.');
 assert.equal(DOCUMENT_GENERATOR_ACTIVITY_SCHEMA.properties.commonSequence.properties.closure.maxLength+DOCUMENT_ACTIVITY_PLANNING_SCHEMA.properties.projectReview.maxLength+1,2400,'La revisión final reservada no puede desbordar el Cierre guardado.');
 const p=planning(),context={confirmed_project:{criteria_families:master(),document_planning:p}};
 for(const index of [1,dates.length-1]){
  const a=activity(p.dailyRoute[index]),valid=compile(documentActivitySchemaForProject(DOCUMENT_GENERATOR_ACTIVITY_SCHEMA,context,{dates:[dates[index]],ages,competencyIds:ids}));
  assert.equal(valid(a),true,JSON.stringify(valid.errors));
  a.activityPlanning.projectReview=index===1?'Una revisión fuera de fecha.':null;
  assert.equal(valid(a),false);
 }
});

test('maestro V4 enlaza cada aporte una sola vez en servidor y guarda un reto común sin alterar V3',()=>{
 const p=documentProjectPlanningV4Fixture(ages,dates,ids),wire=structuredClone(p);
 for(const day of wire.dailyRoute)delete day.startingPoint;
 const original=JSON.stringify(wire),linked=inheritProjectSequenceLinks(wire);
 assert.equal(JSON.stringify(wire),original);assert.deepEqual(linked,p);
 assert.deepEqual(validateDocumentProjectPlanning(linked,{complete:true,ages,dates,competencyIds:ids,dailyRouteRequired:true}),p);
 for(const mutate of [r=>{r.dailyRoute[2].previousActivityPosition=0;},r=>{r.dailyRoute[2].startingPoint='Otro aporte que no corresponde.';},r=>{r.dailyRoute[2].expectedContribution=r.dailyRoute[1].expectedContribution;},r=>{r.dailyRoute[2].mainAction='Una acción que acaba antes de la';},r=>{r.dailyRoute[2].expectedContribution='Una frase que quedó cortada';},r=>{r.dailyRoute[0].startingPoint='Otro reto.';}]){
  const invalid=structuredClone(p);mutate(invalid);assert.throws(()=>validateDocumentProjectPlanning(invalid,{complete:true,ages,dates,competencyIds:ids}));
 }
 const old=planning();old.dailyRoute[2].mainAction='Una frase histórica inconclusa';assert.deepEqual(inheritProjectSequenceLinks(old),old);validateDocumentProjectPlanning(old,{complete:true,ages,dates,competencyIds:ids});
});

test('esquema V4 no pide copiar el aporte anterior; posteriores actividades reciben el maestro V4 válido',()=>{
 const p=documentProjectPlanningV4Fixture(ages,dates,ids),schema=documentProjectSchemaForContext(DOCUMENT_GENERATOR_PROJECT_SCHEMA,{ages,competencyIds:ids,occursOn:dates[0],dailyDates:dates,planningVersion:4});
 assert.deepEqual(schema.properties.projectPlanning.properties.version.enum,[4]);
 const root=activity(p.dailyRoute[0]);for(const f of root.criteriaFamilies)for(const v of f.variants)delete v.official_performance_refs;
 const output={...root,projectPlanning:structuredClone(p),projectCriteriaFamilies:master()},valid=compile(schema);
 assert.equal(valid(output),false,'El campo derivado no pertenece a la respuesta privada.');
 for(const day of output.projectPlanning.dailyRoute)delete day.startingPoint;
 assert.equal(valid(output),true,JSON.stringify(valid.errors));
 output.projectPlanning.dailyRoute[2].previousActivityPosition=0;assert.equal(valid(output),false);
 const daily=activity(p.dailyRoute[2]),dailySchema=documentActivitySchemaForProject(DOCUMENT_GENERATOR_ACTIVITY_SCHEMA,{confirmed_project:{criteria_families:master(),document_planning:p}},{dates:[dates[2]],ages,competencyIds:ids});
 assert.equal(compile(dailySchema)(daily),true);validateActivityAgainstProjectRoute(p,daily);
});
