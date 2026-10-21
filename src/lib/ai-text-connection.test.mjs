import test from "node:test";
import assert from "node:assert/strict";
import { resolveTextConnection } from "./ai-text-connection.mjs";
import { OpenAIProvider } from "./openai-provider.mjs";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";
const environment={OPENAI_API_KEY:"original-key",AYNI_TEXT_API_PROFILE:"mirai",AYNI_TEXT_API_KEY:"gateway-key",AYNI_TEXT_API_BASE_URL:"https://api.miraiapi.com/v1"};
test("Sol uses the selected gateway; Luna keeps its original credential and model",()=>{
 for(const model of ["gpt-6.1-sol","gpt-6-sol","gpt-6-astra"]) assert.deepEqual(resolveTextConnection(environment,model),{apiKey:"gateway-key",baseURL:environment.AYNI_TEXT_API_BASE_URL,custom:true});
 for(const model of ["gpt-6-luna","gpt-transcribe"]) assert.deepEqual(resolveTextConnection(environment,model),{apiKey:"original-key",baseURL:undefined,custom:false});
 assert.equal(resolveAIExecutionPlan({workflow:"annual_plan"}).model,"gpt-6.1-sol");
 assert.equal(resolveAIExecutionPlan({workflow:"activity"}).model,"gpt-6-luna");
});
test("gateway requires its own credential and exact HTTPS endpoint",()=>{
 for(const change of [{AYNI_TEXT_API_KEY:""},{AYNI_TEXT_API_BASE_URL:""},{AYNI_TEXT_API_BASE_URL:"http://api.miraiapi.com/v1"},{AYNI_TEXT_API_BASE_URL:"https://other.example/v1"},{AYNI_TEXT_API_PROFILE:"unknown"}]) assert.throws(()=>resolveTextConnection({...environment,...change},"gpt-6.1-sol"),/Configuración incompleta/);
 assert.deepEqual(resolveTextConnection({OPENAI_API_KEY:"original-key"},"gpt-6.1-sol"),{apiKey:"original-key",baseURL:undefined,custom:false});
});
test('selección explícita de la conexión original conserva inactivas las claves del gateway',()=>{
 assert.deepEqual(resolveTextConnection({...environment,AYNI_TEXT_API_PROFILE:'openai'},'gpt-6.1-sol'),{apiKey:'original-key',baseURL:undefined,custom:false});
 const partial={...environment};delete partial.AYNI_TEXT_API_PROFILE;
 assert.throws(()=>resolveTextConnection(partial,'gpt-6.1-sol'),/Configuración incompleta/);
});
test("SDK receives the custom endpoint without changing the resolved model",()=>{
 const client=new OpenAIProvider({apiKey:"gateway-key",baseURL:environment.AYNI_TEXT_API_BASE_URL,model:"gpt-6.1-sol"}).getClient();
 assert.equal(client.baseURL,environment.AYNI_TEXT_API_BASE_URL);
 assert.equal(client.apiKey,"gateway-key");
});
test("a gateway response with zero usage is unknown, never free usage",async()=>{
 const provider=new OpenAIProvider({apiKey:"gateway-key",baseURL:environment.AYNI_TEXT_API_BASE_URL,client:{responses:{create:async()=>({model:"gpt-6.1-sol",status:"completed",output_text:'{"ok":true}',usage:{input_tokens:0,output_tokens:0,total_tokens:0}})}}});
 const result=await provider.generate({workflow:"annual_plan",execution_plan:{provider:"openai",model:"gpt-6.1-sol",reasoning_effort:"high"},ai_context_bundle:{},output_schema:{id:"connection",type:"object",properties:{ok:{type:"boolean"}},required:["ok"],additionalProperties:false}});
 assert.equal(result.provider_metadata.model,"gpt-6.1-sol");
 assert.equal(result.provider_metadata.usage.input_tokens,null);
 assert.equal(result.provider_metadata.usage.output_tokens,null);
 assert.deepEqual(result.output,{ok:true});
});
