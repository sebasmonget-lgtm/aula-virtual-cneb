import test from 'node:test';
import assert from 'node:assert/strict';
import {documentConversationReady} from './document-generator-chat-readiness.mjs';
import {documentActivitySchemaForProject} from './document-generator-activity-schema.mjs';
import {DOCUMENT_GENERATOR_ACTIVITY_SCHEMA} from './multi-age-generation.mjs';
import {DOCUMENT_GENERATOR_BATCH_SCHEMA} from './multi-age-activity-batch.mjs';
import {validateMultiAgeProjectCriteria} from './multi-age-projects.mjs';
import {multiAgeGenerationTimeout} from '../../scripts/multi-age-ai-runtime.mjs';

test('readiness comes from the completed reply, remains available, and supports old invitations without rewriting chat',()=>{
 assert.equal(documentConversationReady(null),false);
 const complete={status:'ready',readyToGenerate:true,assistantText:'Podemos generar o seguir conversando.',suggestions:[]};
 assert.equal(documentConversationReady(complete),true);
 assert.equal(documentConversationReady({...complete,status:'running'}),false);
 assert.equal(documentConversationReady({...complete,readyToGenerate:false,assistantText:'Luego podrás crear Mi año.'}),false);
 assert.equal(documentConversationReady({...complete,readyToGenerate:null,assistantText:'Puedes pulsar el botón «Elegir días».'}),true);
 assert.equal(documentConversationReady({...complete,readyToGenerate:null,assistantText:'¿Qué quieres preparar?',suggestions:['Crear un huerto']}),false);
 assert.equal(documentConversationReady({...complete,readyToGenerate:null,assistantText:'Conozcamos los recursos.'}),false);
});

test('each generated daily activity is constrained to its own saved competency, age and official references; foreign references remain rejected',()=>{
 const families=[{competency_id:'CYT_INDAGA',variants:[{curricular_age:3,official_performance_refs:['PCI2016.CYT_INDAGA.3.01']},{curricular_age:5,official_performance_refs:['PCI2016.CYT_INDAGA.5.04']}]},
 {competency_id:'COM_ORAL',variants:[{curricular_age:3,official_performance_refs:['PCI2016.COM_ORAL.3.01']},{curricular_age:5,official_performance_refs:['PCI2016.COM_ORAL.5.01']}]}];
 const context={confirmed_project:{criteria_families:families}},before=JSON.stringify(DOCUMENT_GENERATOR_BATCH_SCHEMA);
 for(const base of [DOCUMENT_GENERATOR_ACTIVITY_SCHEMA,DOCUMENT_GENERATOR_BATCH_SCHEMA]){
  const schema=documentActivitySchemaForProject(base,context),activity=schema.properties.proposals?.items??schema;
  const choices=activity.properties.criteriaFamilies.items.anyOf;
  assert.equal(choices.length,2);
  for(const [i,choice]of choices.entries()){
   assert.deepEqual(choice.properties.competency_id.enum,[families[i].competency_id]);
   for(const [j,variant]of choice.properties.variants.items.anyOf.entries()){
    assert.deepEqual(variant.properties.curricular_age.enum,[families[i].variants[j].curricular_age]);
    assert.deepEqual(variant.properties.official_performance_refs.items.enum,families[i].variants[j].official_performance_refs);
   }
  }
 }
 assert.equal(JSON.stringify(DOCUMENT_GENERATOR_BATCH_SCHEMA),before);
 assert.equal(documentActivitySchemaForProject(DOCUMENT_GENERATOR_ACTIVITY_SCHEMA,null),DOCUMENT_GENERATOR_ACTIVITY_SCHEMA);
 const blueprint={criteriaFamilies:structuredClone(families)};
 validateMultiAgeProjectCriteria({details:{criteria_families:families}},blueprint);
 blueprint.criteriaFamilies[0].variants[1].official_performance_refs=['PCI2016.CYT_INDAGA.5.03'];
 assert.throws(()=>validateMultiAgeProjectCriteria({details:{criteria_families:families}},blueprint),/heredar los referentes/);
});

test('long document activity and batch calls share the existing bounded budget, daily mode is unchanged',()=>{
 assert.equal(multiAgeGenerationTimeout('activity',{documentsOnly:true}),300000);
 assert.equal(multiAgeGenerationTimeout('activity_batch',{documentsOnly:true}),300000);
 assert.equal(multiAgeGenerationTimeout('annual',{documentsOnly:true}),600000);
 assert.equal(multiAgeGenerationTimeout('activity'),90000);
});
