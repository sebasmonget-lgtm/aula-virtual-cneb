import test from "node:test";
import assert from "node:assert/strict";
import {appendConversationTurn,conversationStatus} from "./conversation-turn.mjs";
test("a new Christmas intent invalidates the prior seed candidate, draft and provenance before IO",()=>{
 const previous={messages:[{role:"teacher",text:"Semillas"}],safe_texts:["Semillas"],candidate:{title:"Semillas"},draft:{title:"Semillas"},created_fact:{key:"old"},review:{status:"passed"},answer:{status:"ready"},required_competency_ids:["CYT_INDAGA"]};
 const next=appendConversationTurn(previous,"Ahora quiero Navidad","Ahora quiero Navidad",{proposal:true});
 assert.equal(previous.candidate.title,"Semillas");assert.equal(next.candidate,null);assert.equal(next.draft,null);assert.equal(next.created_fact,null);assert.equal(next.review,null);assert.equal(next.messages.at(-1).text,"Ahora quiero Navidad");assert.equal(conversationStatus(next),"interrupted");
 assert.equal(conversationStatus({...next,lease_until:new Date(Date.now()+60000).toISOString()}),"responding");
 assert.equal(appendConversationTurn(next,undefined,undefined,{proposal:true}),next);
});
test("annual teacher decisions survive interruption without masquerading as readiness",()=>{
 const next=appendConversationTurn({messages:[],safe_texts:[],teacher_texts:[],answer:{status:"ready"}},"Material reciclado","Material reciclado");
 assert.deepEqual(next.teacher_texts,["Material reciclado"]);assert.equal(conversationStatus(next),"interrupted");assert.equal(conversationStatus({...next,pending_turn:false}),"ready");
});
