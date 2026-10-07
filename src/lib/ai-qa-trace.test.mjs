import test from "node:test";
import assert from "node:assert/strict";
import { withAIQATrace, traceQAProvider, recordAIQAResult } from "./ai-qa-trace.mjs";
import { buildProviderRequest } from "./ai-generation-v4.mjs";
import { resolveAIExecutionPlan } from "./ai-execution-router-v4.mjs";

test("trazas requieren fixture ficticia explícita y bloquean Production; el flag no registra peticiones ordinarias",async()=>{
  const flag=process.env.AYNI_AI_QA_TRACE,environment=process.env.VERCEL_ENV;
  try {
    process.env.AYNI_AI_QA_TRACE="1";
    await assert.rejects(withAIQATrace({fixtureId:"classroom",synthetic:false},async()=>{}));
    process.env.VERCEL_ENV="production";
    await assert.rejects(withAIQATrace({fixtureId:"classroom",synthetic:true},async()=>{}));
    process.env.VERCEL_ENV="preview";
    const request=buildProviderRequest("project_master",{provenance:[{source_type:"teacher_decision",source_turn:"turn_1"}]},resolveAIExecutionPlan({workflow:"project_master"}),{id:"fixture-schema",type:"object"});
    await withAIQATrace({fixtureId:"classroom",synthetic:true},async traces=>{
      const output={purpose:"Explorar"};
      await traceQAProvider({generate:async()=>({output,provider_metadata:{model:"gpt-6.1-sol",usage:{input_tokens:1000,cached_input_tokens:0,output_tokens:200}}})}).generate(request);
      await recordAIQAResult("project_master",output,{validators:["dates"],downstream:["activity"]});
      assert.equal(traces.length,1);assert.deepEqual(traces[0].effective_input,request.ai_context_bundle);
      assert.equal(traces[0].prompt.hash.length,64);assert.equal(traces[0].reasoning_effort,"high");
      assert.deepEqual(traces[0].validation,[{name:"dates",result:"PASS"}]);
      assert.deepEqual(traces[0].teacher_visible_result,output);assert.equal(traces[0].cost_usd,0.004);
      assert.deepEqual(traces[0].downstream,["activity"]);
    });
    await traceQAProvider({generate:async()=>({output:{ordinary:true}})}).generate(request);
  } finally {
    if(flag===undefined)delete process.env.AYNI_AI_QA_TRACE;else process.env.AYNI_AI_QA_TRACE=flag;
    if(environment===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=environment;
  }
});
