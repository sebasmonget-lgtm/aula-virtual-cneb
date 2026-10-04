import test from "node:test";
import assert from "node:assert/strict";
import {createApiTransport} from "./api-transport.mjs";
test("reads recover transient network and gateway failures, retaining credentials",async()=>{
 let n=0;const request=createApiTransport({sleep:async()=>{},fetchImpl:async(_,options)=>{assert.equal(options.credentials,"include");n++;if(n===1)throw new TypeError("Failed to fetch");return new Response("ok",{status:n===2?503:200});}});
 assert.equal((await request("/api/context")).status,200);assert.equal(n,3);
});
test("writes never replay, authorization errors never retry and abort stays an abort",async()=>{
 let n=0;const request=createApiTransport({sleep:async()=>{},fetchImpl:async()=>{n++;throw new TypeError("Failed to fetch");}});
 await assert.rejects(request("/api/save",{method:"POST"}),{name:"ConnectionError"});assert.equal(n,1);
 n=0;const denied=createApiTransport({fetchImpl:async()=>{n++;return new Response(null,{status:401});}});
 assert.equal((await denied("/api/read")).status,401);assert.equal(n,1);
 const controller=new AbortController();controller.abort();await assert.rejects(createApiTransport({fetchImpl:async()=>{throw new DOMException("Cancelled","AbortError");}})("/api/read",{signal:controller.signal}),{name:"AbortError"});
});
