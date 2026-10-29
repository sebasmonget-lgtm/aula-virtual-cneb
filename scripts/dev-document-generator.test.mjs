import test from 'node:test';
import assert from 'node:assert/strict';
import {documentGeneratorDevEnv} from './dev-document-generator.mjs';

test('la prueba desde cero usa otra identidad persistente sin heredar servicios remotos',()=>{
 const source={PATH:'runtime',SUPABASE_SERVICE_ROLE_KEY:'test-cloud',OPENAI_API_KEY:'unapproved-main-key',AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY:'test-generator-key'};
 const regular=documentGeneratorDevEnv({source}),fresh=documentGeneratorDevEnv({source,fromZero:true});
 assert.equal(regular.AYNI_MULTI_AGE_STORE_NAME,'generador-documentos');
 assert.equal(fresh.AYNI_MULTI_AGE_STORE_NAME,'generador-desde-cero');
 assert.equal(documentGeneratorDevEnv({source,cleanStart:true}).AYNI_MULTI_AGE_STORE_NAME,'generador-prueba-limpia');
 assert.equal(fresh.AYNI_MULTI_AGE_AI_MODE,'openai');assert.equal(fresh.OPENAI_API_KEY,'test-generator-key');
 assert.equal(fresh.SUPABASE_SERVICE_ROLE_KEY,undefined);assert.equal(fresh.AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY,undefined);
 assert.equal(documentGeneratorDevEnv({source:{OPENAI_API_KEY:'unapproved-main-key'}}).AYNI_MULTI_AGE_AI_MODE,'off');
});
test('la simulación no recibe claves y la selección explícita de una clave sirve para ambos motores',()=>{
 const real=documentGeneratorDevEnv({source:{},key:'test-explicit-key'}),simulated=documentGeneratorDevEnv({source:{},key:'test-explicit-key',simulated:true});
 assert.equal(real.OPENAI_API_KEY,'test-explicit-key');assert.equal(real.AYNI_MULTI_AGE_OPENAI_API_KEY,'test-explicit-key');
 assert.equal(simulated.AYNI_MULTI_AGE_AI_MODE,'fixture');assert.equal(simulated.OPENAI_API_KEY,undefined);assert.equal(simulated.AYNI_MULTI_AGE_OPENAI_API_KEY,undefined);
 const qa=documentGeneratorDevEnv({source:{},key:'test-explicit-key',simulated:true,qaStore:'generador-qa-recorrido'});
 assert.equal(qa.AYNI_MULTI_AGE_STORE_NAME,'generador-qa-recorrido');assert.equal(qa.OPENAI_API_KEY,undefined);
 assert.throws(()=>documentGeneratorDevEnv({qaStore:'generador-desde-cero',simulated:true}));
 assert.throws(()=>documentGeneratorDevEnv({qaStore:'generador-qa-recorrido',simulated:false}));
});
test('una nueva prueba de chat conserva los otros almacenes y admite IA real solo en servidor',()=>{
 const fresh=documentGeneratorDevEnv({source:{SUPABASE_SERVICE_ROLE_KEY:'remote'},trialStore:'generador-prueba-chat-20261025',key:'test-explicit-key'});
 assert.equal(fresh.AYNI_MULTI_AGE_STORE_NAME,'generador-prueba-chat-20261025');
 assert.equal(fresh.AYNI_MULTI_AGE_AI_MODE,'openai');
 assert.equal(fresh.SUPABASE_SERVICE_ROLE_KEY,undefined);
 assert.throws(()=>documentGeneratorDevEnv({trialStore:'../original'}));
 assert.throws(()=>documentGeneratorDevEnv({trialStore:'generador-desde-cero'}));
 assert.throws(()=>documentGeneratorDevEnv({trialStore:'generador-prueba-chat-nueva',qaStore:'generador-qa-ejemplo',simulated:true}));
});
