import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import {documentSpanishProseSchema} from './document-generator-spanish-schema.mjs';
import {documentActivitySchemaForProject} from './document-generator-activity-schema.mjs';
import {documentProjectSchemaForContext,documentCriteriaFromWire} from './document-generator-generation-guards.mjs';
import {DOCUMENT_GENERATOR_ACTIVITY_SCHEMA,DOCUMENT_GENERATOR_PROJECT_SCHEMA} from './multi-age-generation.mjs';
import {DOCUMENT_GENERATOR_BATCH_SCHEMA} from './multi-age-activity-batch.mjs';
import {validateMultiAgeProjectCriteria} from './multi-age-projects.mjs';
import {DOCUMENT_GENERATOR_SITUATION_RULES} from './document-generator-prompts.mjs';

const compile=s=>{s=structuredClone(s);delete s.id;return new Ajv().compile(s);};
const families=[{competency_id:'CYT_INDAGA',variants:[{curricular_age:5,official_performance_refs:['PCI2016.CYT_INDAGA.5.01']}]}];
test('política V2 permite comparación/comunicación oficial fuera de la selección del maestro, conservando competencia y edad',()=>{
 const project={details:{criteria_families:families,document_reference_selection_version:2}};
 const daily={criteriaFamilies:[{competency_id:'CYT_INDAGA',variants:[{curricular_age:5,official_performance_refs:['PCI2016.CYT_INDAGA.5.04','PCI2016.CYT_INDAGA.5.05']}]}]};
 const original=JSON.stringify(project);
 assert.doesNotThrow(()=>validateMultiAgeProjectCriteria(project,daily));
 assert.equal(JSON.stringify(project),original);
 assert.throws(()=>validateMultiAgeProjectCriteria({details:{criteria_families:families}},daily),/heredar/);
 for(const ref of ['PCI2016.CYT_INDAGA.4.04','PCI2016.COM_ORAL.5.01','NO_EXISTE']){
  const wrong=structuredClone(daily);wrong.criteriaFamilies[0].variants[0].official_performance_refs=[ref];assert.throws(()=>validateMultiAgeProjectCriteria(project,wrong));
 }
 const wrong=structuredClone(daily);wrong.criteriaFamilies[0].competency_id='COM_ORAL';assert.throws(()=>validateMultiAgeProjectCriteria(project,wrong));
});
test('esquemas de actividad individual y lote V2 permiten selección propia, históricos conservan herencia exacta',()=>{
 for(const base of [DOCUMENT_GENERATOR_ACTIVITY_SCHEMA,DOCUMENT_GENERATOR_BATCH_SCHEMA]){
  const context={confirmed_project:{criteria_families:families,document_reference_selection_version:2}};
  const schema=documentActivitySchemaForProject(base,context),activity=schema.properties.proposals?.items??schema;
  const refs=activity.properties.criteriaFamilies.properties.CYT_INDAGA.properties.variants.properties['5'].properties.official_performance_refs;
  const valid=compile(refs);assert.equal(valid(['PCI2016.CYT_INDAGA.5.04']),true);assert.equal(valid(['PCI2016.CYT_INDAGA.5.04','PCI2016.CYT_INDAGA.5.05']),true);
  assert.equal(valid(['PCI2016.CYT_INDAGA.4.04']),false);assert.equal(valid(['PCI2016.COM_ORAL.5.01']),false);
  delete context.confirmed_project.document_reference_selection_version;
  const old=documentActivitySchemaForProject(base,context),oldActivity=old.properties.proposals?.items??old;
  assert.deepEqual(oldActivity.properties.criteriaFamilies.items.anyOf[0].properties.variants.items.anyOf[0].properties.official_performance_refs.items.enum,['PCI2016.CYT_INDAGA.5.01']);
 }
 const schema=documentProjectSchemaForContext(DOCUMENT_GENERATOR_PROJECT_SCHEMA,{ages:[5],competencyIds:['CYT_INDAGA'],occursOn:'2026-04-13',independentActivityReferences:true});
 assert.ok(schema.properties.criteriaFamilies.properties.CYT_INDAGA.properties.variants.properties['5'].required.includes('official_performance_refs'));
});
test('prosa española previene letras residuales de otro alfabeto sin modificar fuentes, enums, acentos ni reglas de oración',()=>{
 const source={type:'object',properties:{material:{type:'string',minLength:1,maxLength:140},sentence:{type:'string',maxLength:100,pattern:'[.!?]$'},sourceTitle:{type:'string',maxLength:100,enum:['Título 東京']}},required:['material','sentence','sourceTitle'],additionalProperties:false};
 const original=JSON.stringify(source),schema=documentSpanishProseSchema(source),valid=compile(schema);
 const ok={material:'Papel, lápices y crayones · 3–5 años',sentence:'Exploramos las plantas.',sourceTitle:'Título 東京'};
 assert.equal(valid(ok),true);assert.equal(valid({...ok,material:ok.material.normalize('NFD')}),true);assert.equal(valid({...ok,material:'animales elegید'}),false);assert.equal(valid({...ok,material:'papеl'}),false,'Letra cirílica visualmente similar.');
 assert.equal(valid({...ok,sentence:'Una frase sin terminar'}),false);assert.equal(JSON.stringify(source),original);
 const repeated={type:'string',maxLength:100};
 const shared=documentSpanishProseSchema({type:'object',properties:{opening:repeated,development:repeated,closure:repeated}});
 assert.equal(shared.properties.opening.pattern.match(/\^/g).length,1);
 assert.deepEqual(documentSpanishProseSchema(shared),shared,'Aplicar dos veces no duplica anclas ni aumenta la complejidad.');
});
test('situación inferida es una escena propuesta y adaptable, separada de registros reales',()=>{
 assert.match(DOCUMENT_GENERATOR_SITUATION_RULES,/Situación de partida propuesta/);
 assert.match(DOCUMENT_GENERATOR_SITUATION_RULES,/desarrolla la escena en pasado/);
 assert.match(DOCUMENT_GENERATOR_SITUATION_RULES,/separada de observaciones y resultados reales/);
});

test('esquema completo de diez días no duplica anclas al recorrer campos compartidos',()=>{
 const source=documentProjectSchemaForContext(DOCUMENT_GENERATOR_PROJECT_SCHEMA,{ages:[3,4,5],competencyIds:['CYT_INDAGA','COM_LECTURA','MAT_CANTIDAD'],occursOn:'2026-04-13',dailyDates:Array.from({length:10},(_,i)=>'2026-04-'+String(13+i)),planningVersion:4,independentActivityReferences:true});
 const before=JSON.stringify(source),schema=documentSpanishProseSchema(source);let checked=0;
 const inspect=value=>{if(!value||typeof value!=='object')return;if(value.pattern){checked++;assert.equal((value.pattern.match(/\^/g)??[]).length,1);assert.ok(new RegExp(value.pattern,'u').test('Registran lo que pasó.'));}for(const child of Object.values(value))if(Array.isArray(child))child.forEach(inspect);else inspect(child);};
 inspect(schema);assert.ok(checked>100);assert.equal(JSON.stringify(source),before);assert.deepEqual(documentSpanishProseSchema(schema),schema);
});

test('maestro exige cada competencia y edad una vez; el adaptador no fusiona ni inventa identidades',()=>{
 const ids=['CYT_INDAGA','COM_LECTURA','MAT_CANTIDAD'],ages=[3,4,5];
 const schema=documentProjectSchemaForContext(DOCUMENT_GENERATOR_PROJECT_SCHEMA,{ages,competencyIds:ids,occursOn:'2026-04-13',independentActivityReferences:true}).properties.projectCriteriaFamilies;
 const data=Object.fromEntries(ids.map(id=>[id,{competency_id:id,variants:Object.fromEntries(ages.map(age=>[String(age),{curricular_age:age,criterion_text:'Una actuación prevista.',expected_evidence:'Un registro posible.',observation_moments:['development'],official_performance_refs:[schema.properties[id].properties.variants.properties[String(age)].properties.official_performance_refs.items.enum[0]]}]))}]));
 const valid=compile(schema);assert.equal(valid(data),true);
 const missing=structuredClone(data);delete missing.MAT_CANTIDAD;assert.equal(valid(missing),false);
 const wrong=structuredClone(data);wrong.CYT_INDAGA.variants['4'].curricular_age=5;assert.equal(valid(wrong),false);assert.throws(()=>documentCriteriaFromWire({projectCriteriaFamilies:wrong}),/edad/);
 const before=JSON.stringify(data),canonical=documentCriteriaFromWire({projectCriteriaFamilies:data});assert.equal(canonical.projectCriteriaFamilies.length,3);assert.ok(canonical.projectCriteriaFamilies.every(f=>f.variants.length===3));assert.equal(JSON.stringify(data),before);
 const changed=structuredClone(data);changed.CYT_INDAGA.competency_id='MAT_CANTIDAD';assert.throws(()=>documentCriteriaFromWire({projectCriteriaFamilies:changed}),/competencia/);
 const scoped=documentProjectSchemaForContext(DOCUMENT_GENERATOR_PROJECT_SCHEMA,{ages,competencyIds:['CYT_INDAGA','COM_ESCRITURA'],occursOn:'2026-04-13',independentActivityReferences:true,annualContext:{proposal:{opportunities:[...ages.map(age=>({competency_id:'CYT_INDAGA',age})),...ages.slice(1).map(age=>({competency_id:'COM_ESCRITURA',age}))]}}});
 assert.deepEqual(scoped.properties.projectCriteriaFamilies.properties.COM_ESCRITURA.properties.variants.required,['4','5'],'Las claves no amplían las edades autorizadas para una competencia.');
});
