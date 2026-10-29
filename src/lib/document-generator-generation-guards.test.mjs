import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import {documentAnnualSchemaForContext,orderGeneratedAnnualSlots,documentProjectSchemaForContext,inheritFirstActivityReferences,documentProjectAnnualIntentContext} from './document-generator-generation-guards.mjs';
import {DOCUMENT_GENERATOR_ANNUAL_SCHEMA} from './multi-age-planning-generation.mjs';
import {DOCUMENT_GENERATOR_PROJECT_SCHEMA,DOCUMENT_GENERATOR_ACTIVITY_SCHEMA} from './multi-age-generation.mjs';
import {DOCUMENT_GENERATOR_BATCH_SCHEMA} from './multi-age-activity-batch.mjs';
import {documentActivitySchemaForProject} from './document-generator-activity-schema.mjs';
import {officialPerformances} from './official-performance-references.mjs';
import {validateMultiAgeProjectCriteria} from './multi-age-projects.mjs';
import {validateMultiAgeAnnualProposal} from './multi-age-annual.mjs';
import {loadKnowledgeBaseV4} from './knowledge-base-v4.mjs';
import {applicableCompetencyCards} from './competency-applicability.mjs';
import {documentProjectPlanningFixture,documentActivityPlanningFixture} from '../../scripts/fixtures/document-generator-planning.mjs';
import {randomUUID} from 'node:crypto';
import {openMultiAgeLocalDb} from '../../scripts/multi-age-local-db.mjs';
import {chooseAyniProductMode} from './ayni-product-mode.mjs';
import {multiAgeProviderForJob} from '../../scripts/multi-age-ai-runtime.mjs';

test('un maestro V4 conserva intención y chat sin anclarse a referentes provisionales del anual',()=>{
 const annual={project_schedule:{planning_version:4,selected_dates:['2026-04-13']},proposal:{title:'Investigamos una pregunta',opportunities:[{age:4,competency_id:'CYT_INDAGA',child_action:'Comparar información para revisar una idea.',official_performance_refs:['PCI2016.CYT_INDAGA.4.01']}]},project_conversation:{messages:[{text:'No hay pantalla.'}]}};
 const before=structuredClone(annual),alternative=structuredClone(annual);
 alternative.proposal.opportunities[0].official_performance_refs=['PCI2016.CYT_INDAGA.4.04'];
 const projected=documentProjectAnnualIntentContext(annual);
 assert.deepEqual(projected,documentProjectAnnualIntentContext(alternative),'La selección provisional no sesga dos peticiones nuevas equivalentes.');
 assert.deepEqual(projected.project_conversation,annual.project_conversation);
 assert.equal(projected.proposal.opportunities[0].child_action,annual.proposal.opportunities[0].child_action);
 assert.deepEqual(annual,before,'El documento anual guardado mantiene su referencia original.');
 const legacy={...annual,project_schedule:{planning_version:3}};
 assert.deepEqual(documentProjectAnnualIntentContext(legacy),legacy,'No cambia la captura de preparaciones anteriores.');
});

const ages=[3,4,5],ids=['PS_IDENTIDAD','COM_ORAL'];
const data={documentsOnly:true,eligible:ages.map(age=>({age,cards:ids.map(id=>({id}))})),calendar:{projects:Array.from({length:15},(_,i)=>({slot_id:`tramo_${i+1}`}))}};
const refs=(id,age)=>officialPerformances(id,age).slice(0,1).map(row=>row.id);
const opportunity=(age,id)=>({age,competency_id:id,child_action:'Comunica una idea.',mediation:'Dar tiempo para responder.',observation:'Cómo comunica su idea.',official_performance_refs:refs(id,age),supports:'Aceptar gestos.'});
const annual=()=>({title:'Previsión anual de prueba',organization:'Una profesora acompaña a los grupos en un espacio visible.',proposals:data.calendar.projects.map((slot,i)=>({...slot,title:`Propuesta ${i+1}`,purpose:'Explorar juntos.',summary:'Una propuesta de juego.',rationale:'Una posibilidad en el aula.',common_invitation:'¿Cómo podemos jugar juntos?',one_teacher_organization:'Compartir un espacio visible.',opportunities:ages.flatMap(age=>ids.map(id=>opportunity(age,id)))})),everyday_opportunities:[]});
const families=()=>ids.map(competency_id=>({competency_id,variants:ages.map(curricular_age=>({curricular_age,criterion_text:'Comunica una elección en el juego.',expected_evidence:'Un gesto o expresión sobre su elección.',observation_moments:['development'],official_performance_refs:refs(competency_id,curricular_age)}))}));
const compile=schema=>{const value=structuredClone(schema);delete value.id;return new Ajv({allErrors:true}).compile(value);};
const change=(source,action)=>{const value=structuredClone(source);action(value);return value;};
const blueprint=()=>({title:'Planificamos el proyecto con los niños',purpose:'Compartir posibilidades de juego.',occursOn:'2026-04-13',participantAges:ages,commonSequence:{opening:'Encontrarse.',development:'Probar una propuesta.',closure:'Compartir una idea.'},criteriaFamilies:families(),activityPlanning:documentActivityPlanningFixture(ages,{version:3})});

test('año restringe competencia, edad, referentes oficiales y tramos antes de generar; sigue validando cobertura y duplicados',()=>{
 const before=JSON.stringify(DOCUMENT_GENERATOR_ANNUAL_SCHEMA),schema=documentAnnualSchemaForContext(DOCUMENT_GENERATOR_ANNUAL_SCHEMA,data),valid=compile(schema),value=annual();
 assert.equal(valid(value),true,JSON.stringify(valid.errors));validateMultiAgeAnnualProposal(value,data);
 for(const mutate of [
  v=>{v.proposals[0].slot_id='otro_tramo';},
  v=>{v.proposals[0].opportunities[0].age=2;},
  v=>{v.proposals[0].opportunities[0].competency_id='COMPETENCIA_INVENTADA';},
  v=>{v.proposals[0].opportunities[0].official_performance_refs=refs('COM_ORAL',3);},
  v=>{v.proposals[0].opportunities[0].official_performance_refs=refs('PS_IDENTIDAD',5);},
  v=>{v.proposals[0].opportunities[0].official_performance_refs=[];},
 ])assert.equal(valid(change(value,mutate)),false);
 const duplicate=change(value,v=>{v.proposals[0].opportunities[1]=v.proposals[0].opportunities[0];});
 assert.throws(()=>validateMultiAgeAnnualProposal(duplicate,data),/duplicada/);
 assert.equal(JSON.stringify(DOCUMENT_GENERATOR_ANNUAL_SCHEMA),before);
 const reversed=change(value,v=>v.proposals.reverse());assert.deepEqual(orderGeneratedAnnualSlots(reversed,data.calendar),value);assert.equal(reversed.proposals[0].slot_id,'tramo_15');
 const missing=change(value,v=>{v.proposals[0].slot_id=v.proposals[1].slot_id;});assert.equal(orderGeneratedAnnualSlots(missing,data.calendar),missing);assert.throws(()=>validateMultiAgeAnnualProposal(missing,data),/posiciones/);
});

test('cambio anual restringe su único tramo y mantiene el catálogo; edades sin desempeño usan []',()=>{
 const base={id:'change',type:'object',additionalProperties:false,required:['replacement'],properties:{replacement:DOCUMENT_GENERATOR_ANNUAL_SCHEMA.properties.proposals.items}};
 const schema=documentAnnualSchemaForContext(base,data,{slotId:'tramo_2'}),valid=compile(schema),value={replacement:annual().proposals[1]};assert.equal(valid(value),true);
 assert.equal(valid(change(value,v=>{v.replacement.slot_id='tramo_3';})),false);
 const noSpecific=structuredClone(data);noSpecific.eligible=[{age:3,cards:[{id:'COM_ESCRIBE'}]}];
 const generated=documentAnnualSchemaForContext(DOCUMENT_GENERATOR_ANNUAL_SCHEMA,noSpecific);
 const branch=generated.$defs.project_opportunity.anyOf[0].properties.official_performance_refs;
 assert.equal(officialPerformances('COM_ESCRIBE',3).length,0);assert.equal(branch.maxItems,0);
});

test('maestro de proyecto restringe referentes y primera actividad hereda desde servidor sin reescribir textos ni reparar IDs explícitos',()=>{
 const schema=documentProjectSchemaForContext(DOCUMENT_GENERATOR_PROJECT_SCHEMA,{ages,competencyIds:ids,occursOn:'2026-04-13',annualContext:{proposal:annual().proposals[0]}}),valid=compile(schema);
 const first=blueprint(),master=families();for(const f of first.criteriaFamilies)for(const v of f.variants)delete v.official_performance_refs;
 const output={...first,projectPlanning:documentProjectPlanningFixture(ages),projectCriteriaFamilies:master};assert.equal(valid(output),true,JSON.stringify(valid.errors));
 assert.equal(valid(change(output,v=>{v.projectCriteriaFamilies[0].variants[0].official_performance_refs=refs('COM_ORAL',3);})),false);
 assert.equal(valid(change(output,v=>{v.title='Otro comienzo';})),false);
 assert.equal(valid(change(output,v=>{v.occursOn='2026-04-14';})),false);
 const before=JSON.stringify(first),canonical=inheritFirstActivityReferences(first,master);validateMultiAgeProjectCriteria({details:{criteria_families:master}},canonical);
 assert.equal(JSON.stringify(first),before);assert.equal(canonical.criteriaFamilies[0].variants[0].criterion_text,first.criteriaFamilies[0].variants[0].criterion_text);
 const foreign=change(canonical,v=>{v.criteriaFamilies[0].variants[0].official_performance_refs=refs('PS_IDENTIDAD',5);});
 assert.deepEqual(inheritFirstActivityReferences(foreign,master),foreign);assert.throws(()=>validateMultiAgeProjectCriteria({details:{criteria_families:master}},foreign),/heredar/);
 assert.throws(()=>inheritFirstActivityReferences(first,[]),/maestro/);
});

test('actividad y lote restringen también fechas, cantidad de días y competencias solicitadas',()=>{
 const context={confirmed_project:{criteria_families:families()}},dates=['2026-04-14','2026-04-15'];
 const a=blueprint();a.title='Una experiencia de juego';a.occursOn=dates[0];a.criteriaFamilies=[a.criteriaFamilies[0]];
 const schema=documentActivitySchemaForProject(DOCUMENT_GENERATOR_ACTIVITY_SCHEMA,context,{competencyIds:[ids[0]],dates:[dates[0]],ages}),valid=compile(schema);assert.equal(valid(a),true);
 assert.equal(valid(change(a,v=>{v.occursOn=dates[1];})),false);
 assert.equal(valid(change(a,v=>{v.criteriaFamilies=families().slice(1);})),false);
 const batchSchema=documentActivitySchemaForProject(DOCUMENT_GENERATOR_BATCH_SCHEMA,context,{competencyIds:ids,dates,ages}),batchValid=compile(batchSchema),batch={proposals:dates.map(occursOn=>({...blueprint(),occursOn}))};assert.equal(batchValid(batch),true);
 assert.equal(batchValid(change(batch,v=>{v.proposals.pop();})),false);assert.equal(batchValid(change(batch,v=>{v.proposals[0].occursOn='2026-05-01';})),false);
});

test('catálogo completo cabe en los límites de Structured Outputs; no crea esquemas por alumno',async()=>{
 const kb=await loadKnowledgeBaseV4(),full={...data,eligible:ages.map(age=>({age,cards:applicableCompetencyCards(kb.competencyCards,age,{castellanoL2Applicable:true,religionApplicable:true})}))};
 const schema=documentAnnualSchemaForContext(DOCUMENT_GENERATOR_ANNUAL_SCHEMA,full);let enums=0,characters=0;
 const inspect=value=>{if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){if(key==='enum'){enums+=item.length;characters+=item.filter(v=>typeof v==='string').join('').length;}if(key==='properties')characters+=Object.keys(item).join('').length;inspect(item);}};inspect(schema);
 assert.ok(enums<=1000,`enum values: ${enums}`);assert.ok(characters<=120000,`schema strings: ${characters}`);assert.equal(schema.$defs.project_opportunity.anyOf.length,full.eligible.reduce((n,g)=>n+g.cards.length,0));
 compile(schema);
});

test('año, maestro, actividad y lote documentales usan respuestas recuperables; modo diario conserva su configuración',{timeout:90000},async()=>{
 const db=await openMultiAgeLocalDb();try{
  const teacher=randomUUID(),dailyTeacher=randomUUID();await chooseAyniProductMode(db,teacher,{mode:'documents'});
  const providerForJob=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:'synthetic-test-placeholder'});
  for(const [kind,input]of [['annual',{}],['activity',{}],['activity',{projectId:randomUUID()}],['activity_batch',{projectId:randomUUID()}]]){
   const provider=await providerForJob({kind,input,teacher_id:teacher,provider_mode:'openai'});
   assert.equal(provider.background,true);assert.equal(provider.streamResponse,false);assert.equal(provider.store,false);assert.equal(provider.timeoutMs,60000);
   const original=await providerForJob({kind,input,teacher_id:dailyTeacher,provider_mode:'openai'});assert.equal(original.streamResponse,false);assert.equal(original.timeoutMs,kind==='activity'?90000:300000);
  }
 }finally{await db.close();}
});
